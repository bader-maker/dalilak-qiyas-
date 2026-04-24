// Client-side helper for AI-generated per-question hints.
// - Caches one hint per question in localStorage (keyed by question content)
// - Dedupes concurrent requests via an in-flight promise map
// - Honors a "fail-once-per-session" rule via sessionStorage so a misconfigured
//   provider doesn't repeatedly burn requests
// - Returns null on any failure so callers can hide the hint UI gracefully

export type AIHintInput = {
  question: string;
  options: string[];
  section?: string;
  category?: string;
  language?: "ar" | "en";
  // How many hints the student has requested so far in the current exam
  // session (1 = first request). Sent to the server so it can gradually
  // reduce hint clarity when the student leans on hints repeatedly.
  // NOTE: intentionally NOT included in the cache key — once a question
  // has a stored hint, revisits return that same hint regardless of the
  // current streak, so the on-screen content stays consistent.
  streak?: number;
};

const CACHE_PREFIX = "qiyas_ai_hint_v1:";
const ATTEMPTED_PREFIX = "qiyas_ai_hint_attempted_v1:";

// Result of a hint generation attempt.
// - hint: the text to show (null = failure / nothing usable).
// - fromCache: true when the value came from localStorage (no network request,
//   no cost). The caller uses this to avoid advancing a streak/usage counter
//   for what is effectively a free re-display of an already-served hint.
export type AIHintResult = {
  hint: string | null;
  fromCache: boolean;
};

const inflight = new Map<string, Promise<AIHintResult>>();

// Stable per-question hash (FNV-1a 32-bit on question text). Same key
// across navigation back-and-forth and across sections — guarantees one
// stored hint per unique question.
export function hintKey(input: AIHintInput): string {
  let h = 0x811c9dc5;
  const s = `${input.language ?? "ar"}|${input.question}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function readCache(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + key);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_PREFIX + key, value);
  } catch {
    // Storage full or disabled — skip caching silently.
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

/**
 * Fetch (or return cached) AI hint for a single question.
 * - One successful generation per question for the lifetime of localStorage.
 * - One attempt per session for failures (no retry storms).
 * - Concurrent callers for the same question share one in-flight request.
 *
 * Returns { hint, fromCache } so callers can distinguish a free re-display
 * from a real new generation (used to avoid double-counting toward streak).
 */
export async function generateAIHint(
  input: AIHintInput
): Promise<AIHintResult> {
  const key = hintKey(input);

  const cached = readCache(key);
  if (cached) return { hint: cached, fromCache: true };

  const existing = inflight.get(key);
  if (existing) return existing;

  if (wasAttemptedThisSession(key)) return { hint: null, fromCache: false };

  const promise = (async (): Promise<AIHintResult> => {
    try {
      const res = await fetch("/api/ai-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        markAttemptedThisSession(key);
        return { hint: null, fromCache: false };
      }
      const data = (await res.json()) as { ok?: boolean; hint?: string };
      if (!data?.ok || typeof data.hint !== "string" || data.hint.length === 0) {
        markAttemptedThisSession(key);
        return { hint: null, fromCache: false };
      }
      writeCache(key, data.hint);
      return { hint: data.hint, fromCache: false };
    } catch {
      markAttemptedThisSession(key);
      return { hint: null, fromCache: false };
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
