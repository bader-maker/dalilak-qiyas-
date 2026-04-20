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

export async function generateAIAnalysis(
  input: AIAnalysisInput
): Promise<AIAnalysisResult | null> {
  const key = hashKey(input);
  const cached = readCache(key);
  if (cached) return cached;

  try {
    const res = await fetch("/api/ai-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; analysis?: AIAnalysisResult };
    if (!data?.ok || !data.analysis) return null;
    writeCache(key, data.analysis);
    return data.analysis;
  } catch {
    return null;
  }
}
