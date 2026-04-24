"use client";

// Mid-session AI coaching card.
//
// - Fires AT MOST one /api/ai-analysis call per session (guarded by a ref).
// - Reuses the existing generateAIAnalysis() helper, which caches by content
//   hash in localStorage — so refresh / remount within the same session is a
//   pure cache hit (zero extra OpenAI calls).
// - Only fetches when the student is premium (server route also requires
//   authenticated Supabase user; this is a client-side cost guard).
// - Renders nothing on failure or for non-premium so the existing training
//   flow is never blocked or modified.
// - Output is intentionally trimmed to 3 short lines (strengths / weaknesses
//   / one improvement tip) per the spec — the heavier `plan` / `performance`
//   fields returned by the API are deliberately discarded for this surface.

import { useEffect, useRef, useState } from "react";
import {
  generateAIAnalysis,
  hashKey,
  type AIAnalysisInput,
  type AIAnalysisResult,
} from "@/lib/aiAnalysis";

type Props = {
  // Null while the parent hasn't yet captured the mid-session snapshot
  // (e.g. <5 questions answered). The card self-gates on this so the parent
  // can render it unconditionally.
  input: AIAnalysisInput | null;
  isPremium: boolean;
};

export default function TrainingAICoachCard({ input, isPremium }: Props) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isPremium) return;
    if (!input) return;

    // Stable per-input dedup so a re-render with the same snapshot never
    // re-calls the API. The helper itself also caches in localStorage by
    // hash — this ref is the in-process belt to the storage suspenders.
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

  // Per spec: render nothing while still gathering data, on failure, or for
  // non-premium — keeps the normal training flow visually unchanged.
  if (!input || !isPremium || state === "error") return null;

  // Match the existing question-card visual language exactly: same radius,
  // same surface, same border tokens. This is intentionally NOT a redesign.
  return (
    <div
      dir="rtl"
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🤖</span>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
          نصائح ذكية بناءً على أدائك حتى الآن
        </h3>
        <span className="text-[10px] font-bold text-[#006C35] dark:text-[#4ade80] bg-[#006C35]/10 dark:bg-[#006C35]/20 px-2 py-0.5 rounded-full mr-auto">
          AI
        </span>
      </div>

      {state === "loading" && (
        <div className="flex items-center gap-2 py-2 text-gray-500 dark:text-gray-400 text-xs">
          <div className="w-3 h-3 border-2 border-[#006C35] border-t-transparent rounded-full animate-spin" />
          جاري إعداد ملاحظات سريعة لك…
        </div>
      )}

      {state === "ready" && analysis && (
        <div className="space-y-1.5 text-sm leading-relaxed">
          <p className="text-gray-800 dark:text-gray-100">
            <span className="font-bold text-[#006C35] dark:text-[#4ade80]">✅ نقاط القوة: </span>
            {analysis.strengths || "أداؤك متماسك في عدة مواضيع — استمر."}
          </p>
          <p className="text-gray-800 dark:text-gray-100">
            <span className="font-bold text-red-600 dark:text-red-400">⚠️ نقاط الضعف: </span>
            {analysis.weaknesses || "بعض المواضيع تحتاج مراجعة قصيرة قبل المتابعة."}
          </p>
          <p className="text-gray-800 dark:text-gray-100">
            <span className="font-bold text-[#D4AF37] dark:text-[#fbbf24]">💡 نصيحة للتحسن: </span>
            {analysis.fastestImprovement ||
              (analysis.plan && analysis.plan[0]) ||
              "ركّز على الموضوع الأضعف بتمارين قصيرة موقوتة."}
          </p>
        </div>
      )}
    </div>
  );
}
