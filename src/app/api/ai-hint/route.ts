import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { reserveSlot, releaseSlot } from "@/lib/aiUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Hard cap on incoming JSON. Hints carry only the question + options, well
// below this limit; the bound prevents oversized payload abuse.
const MAX_BODY_BYTES = 8 * 1024;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (!apiKey || !baseURL) return null;
  return new OpenAI({ apiKey, baseURL });
}

type HintInput = {
  question: string;
  options: string[];
  section?: string;
  category?: string;
  language?: "ar" | "en";
  // Number of hint requests the student has made so far in this exam session
  // (1 = first request). The server uses this to gradually reduce hint
  // clarity when the student leans on hints too often, encouraging them to
  // think rather than abandon the question. Optional; defaults to 1.
  streak?: number;
};

// Hint clarity tiers — each tier keeps the strict no-answer / no-option-letter
// / ≤30-word safety rails, but the level of guidance gradually decreases as
// the student's hint-streak grows.
type HintLevel = "clear" | "vague" | "minimal";

function pickLevel(streak: number | undefined): HintLevel {
  const n = typeof streak === "number" && streak > 0 ? streak : 1;
  if (n >= 5) return "minimal";
  if (n >= 3) return "vague";
  return "clear";
}

const COMMON_RULES_AR =
  "\n- اكتب باللغة العربية فقط." +
  "\n- سطر واحد أو سطران كحد أقصى (≤ 30 كلمة)." +
  "\n- لا تكشف الإجابة الصحيحة ولا تذكر اسم الخيار (أ/ب/ج/د)." +
  "\n- لا تحلّ السؤال بخطوات." +
  "\n- لا مقدمات ولا مجاملات.";

const COMMON_RULES_EN =
  "\n- English only." +
  "\n- Maximum 1–2 lines (≤ 30 words)." +
  "\n- Do NOT reveal the correct answer or name an option (A/B/C/D)." +
  "\n- Do NOT solve the question step by step." +
  "\n- No preamble, no pleasantries.";

const SYSTEM_PROMPTS_AR: Record<HintLevel, string> = {
  clear:
    "أنت مدرّب اختبارات قياس. أعطِ الطالب تلميحاً واضحاً يوجّهه للحل دون كشفه." +
    "\n\nقواعد صارمة:" +
    "\n- وجّه التفكير وأشر إلى المفهوم أو الخطوة الأولى." +
    COMMON_RULES_AR,
  vague:
    "أنت مدرّب اختبارات قياس. الطالب طلب عدة تلميحات متتالية، فقلّل وضوح التلميح قليلاً لتشجيعه على التفكير." +
    "\n\nقواعد صارمة:" +
    "\n- اطرح سؤالاً تأملياً يقوده، أو أشر إلى المفهوم العام دون تحديد الخطوة." +
    "\n- لا تذكر أرقاماً أو معادلات أو خطوات حسابية." +
    COMMON_RULES_AR,
  minimal:
    "أنت مدرّب اختبارات قياس. الطالب يعتمد كثيراً على التلميحات؛ ادفعه للتفكير بنفسه." +
    "\n\nقواعد صارمة:" +
    "\n- اذكر فقط نوع المهارة أو فرع الموضوع المطلوب (مثل: 'هذا اختبار للنسب' أو 'هذا تطبيق على قاعدة كيميائية')." +
    "\n- لا تشرح المفهوم ولا تقترح أي مدخل للحل. اكتفِ بجملة قصيرة جداً." +
    COMMON_RULES_AR,
};

const SYSTEM_PROMPTS_EN: Record<HintLevel, string> = {
  clear:
    "You are a Qiyas exam tutor. Give a clear guiding hint that directs the student without revealing the answer." +
    "\n\nStrict rules:" +
    "\n- Guide the thinking — point at the concept or the first step." +
    COMMON_RULES_EN,
  vague:
    "You are a Qiyas exam tutor. The student has asked for several hints in a row, so deliberately reduce clarity to encourage independent thinking." +
    "\n\nStrict rules:" +
    "\n- Ask a reflective question or point at the general concept without naming a step." +
    "\n- Do NOT mention numbers, formulas, or calculation steps." +
    COMMON_RULES_EN,
  minimal:
    "You are a Qiyas exam tutor. The student is over-relying on hints; nudge them to think for themselves." +
    "\n\nStrict rules:" +
    "\n- Only state the skill area or topic branch involved (e.g. 'this is a ratios question' or 'this applies a chemistry rule')." +
    "\n- Do NOT explain the concept or suggest any approach. One very short sentence." +
    COMMON_RULES_EN,
};

function buildUserPrompt(d: HintInput, isArabic: boolean): string {
  const optionsBlock = d.options
    .map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`)
    .join("\n");
  if (isArabic) {
    return [
      `السؤال: ${d.question}`,
      `الخيارات:\n${optionsBlock}`,
      d.section ? `القسم: ${d.section}` : "",
      d.category ? `الاختبار: ${d.category}` : "",
      "أعط تلميحاً موجِّهاً قصيراً (سطر واحد أو سطران).",
    ]
      .filter(Boolean)
      .join("\n");
  }
  return [
    `Question: ${d.question}`,
    `Options:\n${optionsBlock}`,
    d.section ? `Section: ${d.section}` : "",
    d.category ? `Exam: ${d.category}` : "",
    "Give a short guiding hint (1–2 lines).",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(req: NextRequest) {
  try {
    // 1. Require an authenticated Supabase user, same guardrail as ai-analysis.
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

    let data: HintInput;
    try {
      data = JSON.parse(rawText) as HintInput;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (
      !data ||
      typeof data.question !== "string" ||
      data.question.trim().length === 0 ||
      data.question.length > 4000 ||
      !Array.isArray(data.options) ||
      data.options.length < 2 ||
      data.options.length > 8 ||
      data.options.some((o) => typeof o !== "string" || o.length > 1000) ||
      (data.streak !== undefined &&
        (typeof data.streak !== "number" ||
          !Number.isFinite(data.streak) ||
          data.streak < 0 ||
          data.streak > 1000))
    ) {
      return NextResponse.json(
        { error: "Invalid hint input" },
        { status: 400 }
      );
    }

    // 3. Fail explicitly when the AI provider isn't configured.
    const openai = getOpenAI();
    if (!openai) {
      return NextResponse.json(
        { error: "AI provider not configured" },
        { status: 503 }
      );
    }

    // 4. Share the global monthly cost cap with ai-analysis. Reserve before
    //    calling OpenAI; release on failure so the cap only counts successes.
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

    const isArabic = data.language !== "en";
    const level = pickLevel(data.streak);
    const systemPrompt = isArabic
      ? SYSTEM_PROMPTS_AR[level]
      : SYSTEM_PROMPTS_EN[level];

    let completion;
    try {
      completion = await openai.chat.completions.create({
        model: "gpt-5.2",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: buildUserPrompt(data, isArabic) },
        ],
      });
    } catch (err) {
      await releaseSlot();
      throw err;
    }

    const raw = completion.choices?.[0]?.message?.content || "";
    // Defensive trim/length cap so a misbehaving model can't blow past the
    // "1–2 lines" contract on the client.
    const hint = raw.trim().replace(/\s+/g, " ").slice(0, 280);

    if (!hint) {
      await releaseSlot();
      return NextResponse.json(
        { error: "AI returned an empty hint" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      hint,
      usage: { count: slot.count, month: slot.month, limit: slot.limit },
    });
  } catch (err) {
    console.error("[ai-hint] error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI hint" },
      { status: 500 }
    );
  }
}
