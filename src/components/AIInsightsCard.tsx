"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateAIAnalysis,
  hashKey,
  type AIAnalysisInput,
  type AIAnalysisResult,
} from "@/lib/aiAnalysis";

type Props = {
  input: AIAnalysisInput;
  isPremium: boolean;
};

export default function AIInsightsCard({ input, isPremium }: Props) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle"
  );
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    // Only premium users actually fetch the AI analysis. For non-premium we
    // render a locked preview without calling the API.
    if (!isPremium) return;

    // Use the same canonical hash as the helper so dedup matches caching.
    const key = hashKey(input);
    if (startedFor.current === key) return;
    startedFor.current = key;

    let cancelled = false;
    setState("loading");
    setAnalysis(null);

    generateAIAnalysis(input)
      .then((res) => {
        if (cancelled) return;
        if (res) {
          setAnalysis(res);
          setState("ready");
        } else {
          setState("error");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setState("error");
      });

    return () => {
      cancelled = true;
    };
  }, [isPremium, input]);

  // If the AI call failed, render nothing — the existing static analysis
  // (already on the page) acts as the fallback.
  if (isPremium && state === "error") return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 mb-4 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <h3 className="font-bold text-gray-900 dark:text-white text-base">
            تحليل ذكي مخصّص لك
          </h3>
          {!isPremium && <span className="text-base">🔒</span>}
        </div>
        <span className="text-[10px] font-bold text-[#006C35] dark:text-[#4ade80] bg-[#006C35]/10 dark:bg-[#006C35]/20 px-2 py-1 rounded-full">
          AI
        </span>
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
        تحليل شخصي مبني على أدائك الفعلي في هذا الاختبار — يشرح أسباب أخطائك
        ويعطيك خطوات محددة للتحسن.
      </p>

      <div
        className={
          isPremium
            ? ""
            : "blur-sm select-none pointer-events-none"
        }
        aria-hidden={!isPremium}
      >
        {isPremium && state === "loading" && (
          <div className="flex items-center gap-3 py-6 text-gray-500 dark:text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-[#006C35] border-t-transparent rounded-full animate-spin" />
            جاري إعداد تحليلك المخصّص…
          </div>
        )}

        {(state === "ready" || !isPremium) && (
          <div className="space-y-3 text-sm leading-relaxed">
            <Section
              label="تحليل الأداء"
              text={
                analysis?.performance ||
                "نتيجتك الحالية تعكس أساساً جيداً، لكن هناك فجوات محددة في مواضيع تستطيع تحسينها بسرعة."
              }
            />
            <Section
              label="نقاط القوة"
              text={
                analysis?.strengths ||
                "أداؤك متماسك في عدة مواضيع — استمر بالحفاظ على هذا المستوى."
              }
            />
            <Section
              label="نقاط الضعف"
              text={
                analysis?.weaknesses ||
                "بعض المواضيع تخفض درجتك بشكل ملحوظ ويجب التركيز عليها أولاً."
              }
            />
            <Section
              label="سبب الأخطاء"
              text={
                analysis?.mistakeReasons ||
                "نمط أخطائك يشير إلى ثغرات مفاهيمية محددة وليس سهواً عابراً."
              }
            />
            <Section
              label="أسرع طريقة للتحسن"
              text={
                analysis?.fastestImprovement ||
                "التركيز على أضعف موضوعين بتمارين موقوتة سيرفع درجتك بشكل ملحوظ."
              }
            />
            {(analysis?.plan?.length ?? 0) > 0 ? (
              <div>
                <div className="text-xs font-bold text-[#006C35] dark:text-[#4ade80] mb-1">
                  خطة مقترحة
                </div>
                <ol className="space-y-1.5 list-none">
                  {analysis!.plan.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-gray-700 dark:text-gray-300"
                    >
                      <span className="text-[#D4AF37] dark:text-[#fbbf24] font-bold text-xs mt-0.5">
                        {i + 1}.
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              <Section
                label="خطة مقترحة"
                text="ابدأ بأسبوع تركيز على المواضيع الأضعف، ثم اختبارات موقوتة قصيرة."
              />
            )}
          </div>
        )}
      </div>

      {!isPremium && (
        <button
          type="button"
          onClick={() => router.push("/subscriptions")}
          className="absolute inset-x-0 bottom-3 mx-auto block w-fit px-4 py-2 rounded-full bg-[#006C35] hover:bg-[#004d26] text-white text-xs font-bold shadow-md"
        >
          🔓 فتح التحليل الذكي
        </button>
      )}
    </div>
  );
}

function Section({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-[#006C35] dark:text-[#4ade80] mb-0.5">
        {label}
      </div>
      <p className="text-gray-700 dark:text-gray-300">{text}</p>
    </div>
  );
}
