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
//
// Bilingualized 2026-04-25: parent passes `isArabic` (true for Qudrat-AR /
// Tahsili-AR, false for GAT-EN / SAAT-EN). All chrome — title, loading,
// section labels, and fallback copy when the AI returns an empty field —
// switches via a small tx(ar, en) helper. The dynamic AI-generated body
// text from /api/ai-analysis is intentionally left untouched (per the
// "do not change AI logic" constraint), so English exams will still show
// Arabic AI prose unless/until the route itself is asked to emit English.

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
  // True for Arabic exams (Qudrat-AR / Tahsili-AR), false for English exams
  // (GAT-EN / SAAT-EN). Defaults to true so legacy callers keep their
  // existing Arabic-only behavior.
  isArabic?: boolean;
};

export default function TrainingAICoachCard({
  input,
  isPremium,
  isArabic = true,
}: Props) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [analysis, setAnalysis] = useState<AIAnalysisResult | null>(null);
  const startedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isPremium) return;
    if (!input) return;

    // Merge the locale into the request so the AI route knows which language
    // to write in (and so the cache key separates AR / EN responses). The
    // parent's `coachInput` snapshot is intentionally not mutated — `lang`
    // is purely a per-request concern that belongs to the card's locale,
    // not to the captured session data.
    const requestInput = {
      ...input,
      lang: (isArabic ? "ar" : "en") as "ar" | "en",
    };

    // Stable per-input dedup so a re-render with the same snapshot never
    // re-calls the API. The helper itself also caches in localStorage by
    // hash — this ref is the in-process belt to the storage suspenders.
    // hashKey now also incorporates `lang` (back-compat for AR), so a
    // language flip would correctly produce a different key and re-fetch.
    const key = hashKey(requestInput);
    if (startedFor.current === key) return;
    startedFor.current = key;

    let cancelled = false;
    setState("loading");
    setAnalysis(null);

    generateAIAnalysis(requestInput)
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
  }, [isPremium, input, isArabic]);

  // Per spec: render nothing while still gathering data, on failure, or for
  // non-premium — keeps the normal training flow visually unchanged.
  if (!input || !isPremium || state === "error") return null;

  const tx = (ar: string, en: string) => (isArabic ? ar : en);

  // Match the existing question-card visual language exactly: same radius,
  // same surface, same border tokens. This is intentionally NOT a redesign.
  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🤖</span>
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">
          {tx(
            "نصائح ذكية بناءً على أدائك حتى الآن",
            "Smart tips based on your performance so far",
          )}
        </h3>
        <span
          className={`text-[10px] font-bold text-[#006C35] dark:text-[#4ade80] bg-[#006C35]/10 dark:bg-[#006C35]/20 px-2 py-0.5 rounded-full ${
            isArabic ? "mr-auto" : "ml-auto"
          }`}
        >
          AI
        </span>
      </div>

      {state === "loading" && (
        <div className="flex items-center gap-2 py-2 text-gray-500 dark:text-gray-400 text-xs">
          <div className="w-3 h-3 border-2 border-[#006C35] border-t-transparent rounded-full animate-spin" />
          {tx(
            "جاري إعداد ملاحظات سريعة لك…",
            "Preparing quick feedback for you…",
          )}
        </div>
      )}

      {state === "ready" && analysis && (
        <div className="space-y-1.5 text-sm leading-relaxed">
          <p className="text-gray-800 dark:text-gray-100">
            <span className="font-bold text-[#006C35] dark:text-[#4ade80]">
              {tx("✅ نقاط القوة: ", "✅ Strengths: ")}
            </span>
            {analysis.strengths ||
              tx(
                "أداؤك متماسك في عدة مواضيع — استمر.",
                "Your performance is solid across several topics — keep it up.",
              )}
          </p>
          <p className="text-gray-800 dark:text-gray-100">
            <span className="font-bold text-red-600 dark:text-red-400">
              {tx("⚠️ نقاط الضعف: ", "⚠️ Weaknesses: ")}
            </span>
            {analysis.weaknesses ||
              tx(
                "بعض المواضيع تحتاج مراجعة قصيرة قبل المتابعة.",
                "A few topics need a short review before moving on.",
              )}
          </p>
          <p className="text-gray-800 dark:text-gray-100">
            <span className="font-bold text-[#D4AF37] dark:text-[#fbbf24]">
              {tx("💡 نصيحة للتحسن: ", "💡 Tip to improve: ")}
            </span>
            {analysis.fastestImprovement ||
              (analysis.plan && analysis.plan[0]) ||
              tx(
                "ركّز على الموضوع الأضعف بتمارين قصيرة موقوتة.",
                "Focus on your weakest topic with short, timed practice sets.",
              )}
          </p>
        </div>
      )}
    </div>
  );
}
