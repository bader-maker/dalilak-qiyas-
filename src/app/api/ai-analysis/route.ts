import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { reserveSlot, releaseSlot } from "@/lib/aiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard cap on incoming JSON to keep the route safe from oversized payloads.
const MAX_BODY_BYTES = 32 * 1024;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) return null;
  return new OpenAI({ apiKey, baseURL });
}

type AnalysisInput = {
  score: number;
  level: string;
  weakTopics: string[];
  strongTopics: string[];
  slowTopics: string[];
  commonMistakes: string[];
  categoryPerformance: Array<{
    name: string;
    section?: string;
    percentage: number;
    correct?: number;
    total?: number;
  }>;
  avgTimePerQuestion?: number;
  // Optional full-exam context. When examType is "full" the system prompt
  // switches to the deeper coaching mode and the user prompt injects the
  // previous-exam comparison block. Older callers (training, diagnostic) omit
  // these fields and behave exactly as before.
  examType?: "training" | "full";
  previousScore?: number;
  previousCategoryPerformance?: Array<{ name: string; percentage: number }>;
  mostImprovedTopic?: { name: string; delta: number };
  mostDeclinedTopic?: { name: string; delta: number };
  // Output language for the model. Default "ar" preserves all legacy behavior
  // for callers (and cached entries) that predate this field. English exams
  // (GAT / SAAT) pass "en" so the model writes the report in English; the
  // returned JSON shape is identical in both languages so the UI never branches.
  lang?: "ar" | "en";
};

// Default coaching prompt — kept verbatim from the previous version so
// training calls return the same shape & tone they did before.
const SYSTEM_PROMPT_TRAINING =
  "You are an expert Qiyas exam coach. " +
  "Your job is to deeply analyze the student's performance and give a realistic, " +
  "personalized, and insightful report.\n\n" +
  "RULES:\n" +
  "- Write in Arabic\n" +
  "- Be specific and concrete (mention actual topics like الجبر، النسب، المفردات)\n" +
  "- Do NOT repeat obvious numbers\n" +
  "- Focus on patterns and reasoning mistakes\n" +
  "- Explain WHY the student is making mistakes\n" +
  "- Give practical advice that can be applied immediately\n" +
  "- Keep it concise but impactful\n\n" +
  "STYLE:\n" +
  "- Speak like a smart coach, not a textbook\n" +
  "- Avoid generic phrases";

// Deeper, more structured coaching prompt for the full exam result. The
// student has invested ~1 hour and expects a meaningful report — not a quick
// tip. Outputs the SAME 6 JSON keys (so the existing UI keeps working) but
// each section is denser and explicitly references progress when available.
const SYSTEM_PROMPT_FULL_EXAM =
  "You are an expert Qiyas exam coach reviewing a FULL mock exam (not a " +
  "short training session). The student spent ~1 hour and deserves a deeper " +
  "report than a normal training analysis.\n\n" +
  "MANDATORY DEPTH RULES:\n" +
  "- Write in Arabic, RTL, exam-coach tone — NEVER textbook tone.\n" +
  "- Each section must add NEW information. Do not repeat the same idea.\n" +
  "- Mention actual topic names (الجبر، النسب، المفردات، التناظر اللفظي…).\n" +
  "- If previous exam data is supplied, EXPLICITLY compare progress " +
  "(improved? declined? plateaued?) and name the responsible topics.\n" +
  "- Diagnose PATTERNS not just stats: time pressure, careless errors in " +
  "easy topics, conceptual gaps in specific subtypes, slow-section drag, etc.\n" +
  "- Give a REALISTIC improvement path — short-term (this week) and " +
  "medium-term (2-3 weeks) — not vague encouragement.\n" +
  "- The plan items MUST be concrete and measurable: include the topic, " +
  "the number of questions, and when to retest. Examples in user message.\n" +
  "- Keep the writing concise and dense — no filler, no praise without basis.";

// English variants — used when lang="en" (GAT / SAAT). Same intent and rules
// as the Arabic prompts, just authored in English so the model produces
// English output. JSON schema returned to the client is identical.
const SYSTEM_PROMPT_TRAINING_EN =
  "You are an expert Saudi standardized-exam coach (Qiyas family: GAT, SAAT, " +
  "Tahsili, Qudrat). " +
  "Your job is to deeply analyze the student's performance and give a realistic, " +
  "personalized, and insightful report.\n\n" +
  "RULES:\n" +
  "- Write ONLY in English. Do not include any Arabic words or phrases.\n" +
  "- Be specific and concrete (mention actual topics like algebra, ratios, " +
  "vocabulary, reading comprehension)\n" +
  "- Do NOT repeat obvious numbers\n" +
  "- Focus on patterns and reasoning mistakes\n" +
  "- Explain WHY the student is making mistakes\n" +
  "- Give practical advice that can be applied immediately\n" +
  "- Keep it concise but impactful\n\n" +
  "STYLE:\n" +
  "- Speak like a smart coach, not a textbook\n" +
  "- Avoid generic phrases";

const SYSTEM_PROMPT_FULL_EXAM_EN =
  "You are an expert Saudi standardized-exam coach reviewing a FULL mock exam " +
  "(not a short training session). The student spent ~1 hour and deserves a " +
  "deeper report than a normal training analysis.\n\n" +
  "MANDATORY DEPTH RULES:\n" +
  "- Write ONLY in English, LTR, exam-coach tone — NEVER textbook tone. " +
  "Do not include any Arabic words.\n" +
  "- Each section must add NEW information. Do not repeat the same idea.\n" +
  "- Mention actual topic names (algebra, ratios, vocabulary, verbal analogies, " +
  "reading comprehension, mechanics, kinematics, etc.).\n" +
  "- If previous exam data is supplied, EXPLICITLY compare progress " +
  "(improved? declined? plateaued?) and name the responsible topics.\n" +
  "- Diagnose PATTERNS not just stats: time pressure, careless errors in " +
  "easy topics, conceptual gaps in specific subtypes, slow-section drag, etc.\n" +
  "- Give a REALISTIC improvement path — short-term (this week) and " +
  "medium-term (2-3 weeks) — not vague encouragement.\n" +
  "- The plan items MUST be concrete and measurable: include the topic, " +
  "the number of questions, and when to retest. Examples in user message.\n" +
  "- Keep the writing concise and dense — no filler, no praise without basis.";

function buildPreviousExamBlock(d: AnalysisInput): string {
  if (typeof d.previousScore !== "number") return "";
  const lines: string[] = [
    "",
    "PREVIOUS FULL EXAM (for progress comparison):",
    `- النتيجة السابقة: ${d.previousScore}%`,
    `- الفرق الحالي: ${d.score - d.previousScore > 0 ? "+" : ""}${
      d.score - d.previousScore
    }%`,
  ];
  if (d.mostImprovedTopic) {
    lines.push(
      `- أكثر موضوع تحسّن: ${d.mostImprovedTopic.name} (+${d.mostImprovedTopic.delta}%)`,
    );
  }
  if (d.mostDeclinedTopic) {
    lines.push(
      `- أكثر موضوع تراجع: ${d.mostDeclinedTopic.name} (${d.mostDeclinedTopic.delta}%)`,
    );
  }
  if (
    Array.isArray(d.previousCategoryPerformance) &&
    d.previousCategoryPerformance.length > 0
  ) {
    lines.push("- الأداء السابق حسب الموضوع:");
    for (const c of d.previousCategoryPerformance.slice(0, 12)) {
      lines.push(`  • ${c.name}: ${c.percentage}%`);
    }
  }
  return lines.join("\n");
}

function buildUserPromptAr(d: AnalysisInput) {
  const isFullExam = d.examType === "full";
  const previousBlock = isFullExam ? buildPreviousExamBlock(d) : "";
  const planExamples = isFullExam
    ? `\nPLAN ITEMS MUST FOLLOW THIS SHAPE (concrete, measurable, with retest timing):
- "حل 15 سؤال نسب خلال يومين، ثم اختبر نفسك بـ 5 أسئلة سريعة"
- "راجع المفردات اللفظية 20 دقيقة يومياً لمدة 5 أيام"
- "أعد اختبار محاكاة كامل بعد أسبوع لقياس التحسن"`
    : "";

  return `DATA:
- نوع الجلسة: ${isFullExam ? "اختبار شامل (full exam)" : "تدريب قصير (training)"}
- النتيجة الكلية: ${d.score}%
- المستوى الحالي: ${d.level}
- نقاط القوة (مواضيع متقنة): ${d.strongTopics.join("، ") || "لا يوجد"}
- نقاط الضعف (مواضيع متعثرة): ${d.weakTopics.join("، ") || "لا يوجد"}
- المواضيع البطيئة (تستهلك وقت أكثر): ${d.slowTopics.join("، ") || "لا يوجد"}
- أنماط الأخطاء الشائعة: ${d.commonMistakes.join("، ") || "لا يوجد"}
- متوسط زمن السؤال: ${d.avgTimePerQuestion ?? "غير متاح"} ثانية
- الأداء حسب الموضوع:
${d.categoryPerformance
  .map(
    (c) =>
      `  • ${c.name}${c.section ? ` (${c.section})` : ""}: ${c.percentage}%${
        c.correct != null && c.total != null ? ` — ${c.correct}/${c.total}` : ""
      }`
  )
  .join("\n")}${previousBlock}${planExamples}

أعد الإجابة بصيغة JSON فقط، تتبع هذا التنسيق:
- تحليل الأداء (performance)
- نقاط القوة (strengths)
- نقاط الضعف (weaknesses)
- سبب الأخطاء (mistakeReasons)
- أسرع طريقة للتحسن (fastestImprovement)
- خطة مقترحة (plan: مصفوفة من 3-5 خطوات محددة${
    isFullExam ? "، كل خطوة تتضمن الموضوع وعدد الأسئلة وموعد إعادة القياس" : ""
  })

JSON schema:
{
  "performance": "string",
  "strengths": "string",
  "weaknesses": "string",
  "mistakeReasons": "string",
  "fastestImprovement": "string",
  "plan": ["string", "string", "string"]
}`;
}

// English variant of buildUserPrompt — translates the labels & footer so the
// model has no Arabic priming, while keeping the same data shape, the same
// previous-exam block (translated), and the same JSON schema.
function buildPreviousExamBlockEn(d: AnalysisInput): string {
  if (typeof d.previousScore !== "number") return "";
  const lines: string[] = [
    "",
    "PREVIOUS FULL EXAM (for progress comparison):",
    `- Previous score: ${d.previousScore}%`,
    `- Current delta: ${d.score - d.previousScore > 0 ? "+" : ""}${
      d.score - d.previousScore
    }%`,
  ];
  if (d.mostImprovedTopic) {
    lines.push(
      `- Most improved topic: ${d.mostImprovedTopic.name} (+${d.mostImprovedTopic.delta}%)`,
    );
  }
  if (d.mostDeclinedTopic) {
    lines.push(
      `- Most declined topic: ${d.mostDeclinedTopic.name} (${d.mostDeclinedTopic.delta}%)`,
    );
  }
  if (
    Array.isArray(d.previousCategoryPerformance) &&
    d.previousCategoryPerformance.length > 0
  ) {
    lines.push("- Previous performance by topic:");
    for (const c of d.previousCategoryPerformance.slice(0, 12)) {
      lines.push(`  • ${c.name}: ${c.percentage}%`);
    }
  }
  return lines.join("\n");
}

function buildUserPromptEn(d: AnalysisInput) {
  const isFullExam = d.examType === "full";
  const previousBlock = isFullExam ? buildPreviousExamBlockEn(d) : "";
  const planExamples = isFullExam
    ? `\nPLAN ITEMS MUST FOLLOW THIS SHAPE (concrete, measurable, with retest timing):
- "Solve 15 ratio questions over two days, then quiz yourself with 5 fast ones"
- "Review verbal vocabulary for 20 minutes daily for 5 days"
- "Retake a full mock exam in one week to measure improvement"`
    : "";

  return `DATA:
- Session type: ${isFullExam ? "full exam" : "short training"}
- Overall score: ${d.score}%
- Current level: ${d.level}
- Strengths (mastered topics): ${d.strongTopics.join(", ") || "none"}
- Weaknesses (struggling topics): ${d.weakTopics.join(", ") || "none"}
- Slow topics (consume more time): ${d.slowTopics.join(", ") || "none"}
- Common mistake patterns: ${d.commonMistakes.join(", ") || "none"}
- Average time per question: ${d.avgTimePerQuestion ?? "n/a"} seconds
- Performance by topic:
${d.categoryPerformance
  .map(
    (c) =>
      `  • ${c.name}${c.section ? ` (${c.section})` : ""}: ${c.percentage}%${
        c.correct != null && c.total != null ? ` — ${c.correct}/${c.total}` : ""
      }`
  )
  .join("\n")}${previousBlock}${planExamples}

Respond with JSON ONLY, following this format:
- Performance analysis (performance)
- Strengths (strengths)
- Weaknesses (weaknesses)
- Reasons for mistakes (mistakeReasons)
- Fastest way to improve (fastestImprovement)
- Suggested plan (plan: array of 3-5 specific steps${
    isFullExam ? ", each step including the topic, number of questions, and retest timing" : ""
  })

JSON schema:
{
  "performance": "string",
  "strengths": "string",
  "weaknesses": "string",
  "mistakeReasons": "string",
  "fastestImprovement": "string",
  "plan": ["string", "string", "string"]
}`;
}

function buildUserPrompt(d: AnalysisInput) {
  return d.lang === "en" ? buildUserPromptEn(d) : buildUserPromptAr(d);
}

function pickSystemPrompt(d: AnalysisInput): string {
  const isFullExam = d.examType === "full";
  const isEnglish = d.lang === "en";
  if (isFullExam) {
    return isEnglish ? SYSTEM_PROMPT_FULL_EXAM_EN : SYSTEM_PROMPT_FULL_EXAM;
  }
  return isEnglish ? SYSTEM_PROMPT_TRAINING_EN : SYSTEM_PROMPT_TRAINING;
}

export async function POST(req: NextRequest) {
  try {
    // 1. Require an authenticated Supabase user. Until a real subscription
    //    source of truth exists, this is the minimum guardrail to prevent
    //    anonymous abuse of the paid AI endpoint. Premium-only enforcement
    //    should be added here once subscriptions are tracked server-side.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Bound the request body size before parsing.
    const lenHeader = req.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let data: AnalysisInput;
    try {
      data = JSON.parse(rawText) as AnalysisInput;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (
      !data ||
      typeof data.score !== "number" ||
      !Array.isArray(data.categoryPerformance) ||
      data.categoryPerformance.length === 0 ||
      data.categoryPerformance.length > 50
    ) {
      return NextResponse.json(
        { error: "Invalid analysis input" },
        { status: 400 }
      );
    }

    // 3. Fail explicitly when the AI provider isn't configured rather than
    //    surfacing a confusing OpenAI SDK error to the client.
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "AI provider not configured" },
        { status: 503 }
      );
    }

    // 4. Global monthly cost cap. Reserve a slot before calling OpenAI; if the
    //    cap is reached we return 429 and the client falls back to the
    //    existing static analysis (AIInsightsCard renders nothing on error).
    const slot = await reserveSlot();
    if (!slot.allowed) {
      return NextResponse.json(
        {
          error: "Monthly AI quota reached",
          month: slot.month,
          limit: slot.limit,
        },
        { status: 429 }
      );
    }

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: pickSystemPrompt(data) },
          { role: "user", content: buildUserPrompt(data) },
        ],
        response_format: { type: "json_object" },
      });
    } catch (err) {
      // The reserved slot wasn't actually consumed — release it so the cap
      // only counts successful generations.
      await releaseSlot();
      throw err;
    }

    const raw = completion.choices?.[0]?.message?.content || "";
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      await releaseSlot();
      return NextResponse.json(
        { error: "AI response was not valid JSON" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      analysis: {
        performance: String(parsed.performance ?? ""),
        strengths: String(parsed.strengths ?? ""),
        weaknesses: String(parsed.weaknesses ?? ""),
        mistakeReasons: String(parsed.mistakeReasons ?? ""),
        fastestImprovement: String(parsed.fastestImprovement ?? ""),
        plan: Array.isArray(parsed.plan)
          ? (parsed.plan as unknown[]).map((x) => String(x)).slice(0, 6)
          : [],
      },
      usage: { count: slot.count, month: slot.month, limit: slot.limit },
    });
  } catch (err) {
    console.error("[ai-analysis] error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI analysis" },
      { status: 500 }
    );
  }
}
