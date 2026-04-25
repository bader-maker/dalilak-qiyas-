// Client-side helper for AI-generated diagnostic analysis.
// - Caches one analysis per exam result in localStorage (keyed by content hash)
// - Falls back gracefully (returns null) so callers can show the existing
//   non-AI analysis when the AI call fails.

export type AIAnalysisInput = {
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
  // ===== Optional full-exam context (additive). When examType is "full",
  // the API switches to a deeper, more structured prompt and — if previous
  // exam data is supplied — explicitly compares progress. Training calls
  // omit these fields and behave exactly as before, including using the
  // same cache entries (since hashKey treats undefined as null).
  examType?: "training" | "full";
  previousScore?: number;
  previousCategoryPerformance?: Array<{
    name: string;
    percentage: number;
  }>;
  mostImprovedTopic?: { name: string; delta: number };
  mostDeclinedTopic?: { name: string; delta: number };
  // Output language for the AI report. Default (undefined) and "ar" both
  // mean Arabic — see hashKey for the back-compat treatment that keeps
  // legacy AR cache entries valid. "en" is used for GAT / SAAT and gets a
  // distinct cache so Arabic responses cannot leak into English exams.
  lang?: "ar" | "en";
};

export type AIAnalysisResult = {
  performance: string;
  strengths: string;
  weaknesses: string;
  mistakeReasons: string;
  fastestImprovement: string;
  plan: string[];
};

const CACHE_PREFIX = "qiyas_ai_analysis_v2:";
// sessionStorage key prefix for "we already attempted this hash this session
// and it failed". Used to honor strict one-call-per-session semantics even
// when the AI provider is misconfigured / returns errors. Cleared when the
// browser tab closes — i.e. a true new session can retry.
const ATTEMPTED_PREFIX = "qiyas_ai_attempted_v2:";

// Module-scope in-flight promise map. Concurrent / StrictMode-remounted
// callers asking for the same hash share a single fetch — preventing
// duplicate /api/ai-analysis POSTs that would each consume an OpenAI slot.
const inflight = new Map<string, Promise<AIAnalysisResult | null>>();

// Stable lightweight hash so the same result reuses the same cache entry.
// Exported so callers (e.g. components) can dedupe requests using the same key.
export function hashKey(input: AIAnalysisInput): string {
  const normalized = JSON.stringify({
    s: input.score,
    l: input.level,
    w: [...input.weakTopics].sort(),
    g: [...input.strongTopics].sort(),
    sl: [...input.slowTopics].sort(),
    m: [...input.commonMistakes].sort(),
    c: [...input.categoryPerformance]
      .map((c) => `${c.name}:${c.percentage}`)
      .sort(),
    t: input.avgTimePerQuestion ?? null,
    // Include the new full-exam fields so a "full" analysis with previous
    // context gets its own cache entry and isn't served a training response.
    et: input.examType ?? null,
    ps: input.previousScore ?? null,
    pc: input.previousCategoryPerformance
      ? [...input.previousCategoryPerformance]
          .map((c) => `${c.name}:${c.percentage}`)
          .sort()
      : null,
    mi: input.mostImprovedTopic
      ? `${input.mostImprovedTopic.name}:${input.mostImprovedTopic.delta}`
      : null,
    md: input.mostDeclinedTopic
      ? `${input.mostDeclinedTopic.name}:${input.mostDeclinedTopic.delta}`
      : null,
    // Lang is back-compat-encoded: undefined and "ar" both hash to null so
    // legacy AR cache entries (created before this field existed) keep
    // matching. Only "en" produces a distinct hash, guaranteeing English
    // responses get their own cache and Arabic responses never leak into
    // English exams.
    lng: input.lang === "en" ? "en" : null,
  });
  let h = 5381;
  for (let i = 0; i < normalized.length; i++) {
    h = ((h << 5) + h + normalized.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function readCache(key: string): AIAnalysisResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AIAnalysisResult;
    if (parsed && typeof parsed.performance === "string") return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: AIAnalysisResult): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  } catch {
    // localStorage full / disabled — ignore, just skip caching
  }
}

function wasAttemptedThisSession(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ATTEMPTED_PREFIX + key) === "1";
  } catch {
    return false;
  }
}

function markAttemptedThisSession(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ATTEMPTED_PREFIX + key, "1");
  } catch {
    /* ignore */
  }
}

export async function generateAIAnalysis(
  input: AIAnalysisInput
): Promise<AIAnalysisResult | null> {
  const key = hashKey(input);

  // 1. Successful prior result for this exact hash → return cached, no network.
  const cached = readCache(key);
  if (cached) return cached;

  // 2. Concurrent / StrictMode-remounted caller waiting on the same fetch →
  //    share their promise so we only ever issue one POST per hash at a time.
  const existing = inflight.get(key);
  if (existing) return existing;

  // 3. We already tried this hash this session and it failed (or was
  //    rate-limited / unconfigured) — do NOT retry. This honors the strict
  //    "1 AI call per session, do not regenerate" contract even when the
  //    provider returns errors. Cleared automatically on tab close.
  if (wasAttemptedThisSession(key)) return null;

  const promise = (async (): Promise<AIAnalysisResult | null> => {
    try {
      const res = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        markAttemptedThisSession(key);
        return null;
      }
      const data = (await res.json()) as { ok?: boolean; analysis?: AIAnalysisResult };
      if (!data?.ok || !data.analysis) {
        markAttemptedThisSession(key);
        return null;
      }
      writeCache(key, data.analysis);
      return data.analysis;
    } catch {
      markAttemptedThisSession(key);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
