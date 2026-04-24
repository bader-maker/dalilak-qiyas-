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
};

const CACHE_PREFIX = "qiyas_ai_hint_v1:";
const ATTEMPTED_PREFIX = "qiyas_ai_hint_attempted_v1:";

const inflight = new Map<string, Promise<string | null>>();

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
 */
export async function generateAIHint(
  input: AIHintInput
): Promise<string | null> {
  const key = hintKey(input);

  const cached = readCache(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  if (wasAttemptedThisSession(key)) return null;

  const promise = (async (): Promise<string | null> => {
    try {
      const res = await fetch("/api/ai-hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        markAttemptedThisSession(key);
        return null;
      }
      const data = (await res.json()) as { ok?: boolean; hint?: string };
      if (!data?.ok || typeof data.hint !== "string" || data.hint.length === 0) {
        markAttemptedThisSession(key);
        return null;
      }
      writeCache(key, data.hint);
      return data.hint;
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
