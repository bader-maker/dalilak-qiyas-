import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";

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
};

const SYSTEM_PROMPT =
  "You are an expert Qiyas (Saudi GAT) exam coach. " +
  "You analyze a student's diagnostic-test performance and produce a personalized, " +
  "realistic, and actionable report in Arabic. Be specific (use the actual topic names " +
  "from the data), avoid generic advice, explain WHY mistakes are happening, identify " +
  "patterns, and give concrete next steps.";

function buildUserPrompt(d: AnalysisInput) {
  return `حلّل أداء الطالب التالي في اختبار قياس التشخيصي وقدّم تقريراً شخصياً وواقعياً وقابلاً للتنفيذ.

البيانات:
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
  .join("\n")}

تعليمات:
- اكتب التحليل باللغة العربية الفصحى المختصرة.
- كن محدداً واستخدم أسماء المواضيع الفعلية من البيانات، لا تستخدم عبارات عامة.
- اشرح لماذا الطالب يتعثر (السبب الجذري وليس فقط الأعراض).
- حدّد الأنماط في الأخطاء (مثلاً: ضعف في فئة معينة، أو بطء في نوع معين).
- قدّم نصائح تحسين واضحة وقابلة للتطبيق.
- اجعله موجزاً ومركّزاً (ليس طويلاً).

أعد الإجابة بصيغة JSON فقط، بهذا الشكل بالضبط:
{
  "performance": "تحليل الأداء العام بجملة أو جملتين",
  "strengths": "نقاط القوة الفعلية مع توضيح ما يميز الطالب فيها",
  "weaknesses": "نقاط الضعف الفعلية مع توضيح خطورتها على الدرجة الكلية",
  "mistakeReasons": "السبب الجذري للأخطاء — أنماط واضحة مستخلصة من البيانات",
  "fastestImprovement": "أسرع طريقة لرفع الدرجة بناءً على بيانات هذا الطالب تحديداً",
  "plan": ["خطوة 1 محددة وقابلة للتنفيذ", "خطوة 2", "خطوة 3", "خطوة 4"]
}`;
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

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(data) },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content || "";
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
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
    });
  } catch (err) {
    console.error("[ai-analysis] error:", err);
    return NextResponse.json(
      { error: "Failed to generate AI analysis" },
      { status: 500 }
    );
  }
}
