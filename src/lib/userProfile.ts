/**
 * Persistent user profile — long-running, cross-session aggregate of the
 * student's practice performance, stored under the `user_profile`
 * localStorage key.
 *
 * Why this exists separately from `TrainingContext`:
 *   - TrainingContext (`dalilak_training_state`) keeps a per-question
 *     history meant for the in-app training engine. It does NOT track
 *     hint usage and isn't a focused, easily-consumable snapshot.
 *   - This module exposes the FIVE specific signals the rest of the app
 *     needs to make smarter training & recommendation decisions:
 *       1. strongest topics
 *       2. weakest topics
 *       3. average accuracy
 *       4. average speed (seconds per question)
 *       5. hint usage rate
 *
 * Storage shape (versioned for safe migrations):
 *   {
 *     version: 1,
 *     updatedAt: <epoch ms of last update>,
 *     sessionsCompleted: <number of finished training sessions>,
 *     totals: {
 *       answered, correct, timeSeconds (sum of timed answers),
 *       timedAnswered (denom for averageSpeed),
 *       hintsUsed
 *     },
 *     topics: {
 *       [topic]: { answered, correct, timeSeconds, timedAnswered, hintsUsed }
 *     }
 *   }
 *
 * The derived snapshot (`summarizeProfile`) computes the five signals from
 * the raw counters. We deliberately store COUNTERS, not pre-computed rates,
 * so future signal changes don't require migrating historical data.
 */

const STORAGE_KEY = "user_profile";
const PROFILE_VERSION = 1;

/**
 * Minimum number of answers a topic needs before it's eligible for the
 * strongest/weakest lists. Without this, the very first answer in a topic
 * would yield 100% (or 0%) accuracy and drown out topics with real data.
 */
const TOPIC_MIN_SAMPLES = 5;

/** Number of topics surfaced in the strongest/weakest lists. */
const TOP_N = 3;

export interface TopicCounters {
  /** Total answered for this topic across all sessions. */
  answered: number;
  /** Correct count. */
  correct: number;
  /**
   * Sum of `timeSpent` (seconds) for answers where a numeric time was
   * recorded. Some sessions may not record times for every question (e.g.
   * legacy data) — those are skipped from the speed average.
   */
  timeSeconds: number;
  /** Denominator that pairs with `timeSeconds`. */
  timedAnswered: number;
  /** Number of times the student revealed the hint. */
  hintsUsed: number;
}

export interface ProfileTotals {
  answered: number;
  correct: number;
  timeSeconds: number;
  timedAnswered: number;
  hintsUsed: number;
}

export interface UserProfile {
  version: number;
  updatedAt: number;
  sessionsCompleted: number;
  totals: ProfileTotals;
  topics: Record<string, TopicCounters>;
}

/**
 * Per-question session record passed by callers when applying a finished
 * session. Indices DO NOT need to align with anything — the aggregator
 * processes each entry independently. Skip questions that weren't answered
 * by simply not including them.
 */
export interface SessionAnswer {
  /** Question topic — used to bucket counters. Unknown topics get bucketed under "unknown". */
  topic: string | undefined | null;
  /** True if the student selected the correct option. */
  isCorrect: boolean;
  /** Seconds spent on the question. `null` when not measured. */
  timeSpent: number | null | undefined;
  /** True if the student revealed the hint for this question. */
  hintUsed: boolean;
}

export interface ProfileSummary {
  /** Top topics by accuracy (with min-sample guard). May be empty. */
  strongestTopics: string[];
  /** Bottom topics by accuracy (with min-sample guard). May be empty. */
  weakestTopics: string[];
  /** 0–100 overall accuracy across all answers, rounded. */
  averageAccuracy: number;
  /** Average seconds per timed answer. 0 when no timed data exists. */
  averageSpeedSeconds: number;
  /** 0–100 fraction of questions where the hint was revealed, rounded. */
  hintUsageRate: number;
  /** Total sessions completed. */
  sessionsCompleted: number;
  /** Total questions answered across all sessions. */
  totalAnswered: number;
}

export interface StudyRecommendations {
  /**
   * Topics the student should prioritize. Drawn from `weakestTopics` so
   * the practice picker / training engine can use them to bias selection.
   */
  recommendedTopics: string[];
  /**
   * Suggested starting difficulty for the next session, derived from
   * overall accuracy. Mirrors the same boundaries as the per-session
   * adaptive engine so the UX stays consistent.
   */
  recommendedDifficulty: "easy" | "medium" | "hard";
  /**
   * True when the profile has enough data to make recommendations
   * (≥ 1 completed session AND ≥ TOPIC_MIN_SAMPLES total answers).
   * Callers should fall back to defaults when this is false.
   */
  hasEnoughData: boolean;
}

/** Build a fresh empty profile. */
export function createEmptyProfile(): UserProfile {
  return {
    version: PROFILE_VERSION,
    updatedAt: 0,
    sessionsCompleted: 0,
    totals: {
      answered: 0,
      correct: 0,
      timeSeconds: 0,
      timedAnswered: 0,
      hintsUsed: 0,
    },
    topics: {},
  };
}

/**
 * Defensive narrow on raw parsed JSON — we never trust localStorage
 * content. Anything that doesn't pass yields a fresh empty profile so a
 * single corrupted entry can't crash the app forever.
 */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function coerceTopicCounters(raw: unknown): TopicCounters | null {
  if (!isPlainObject(raw)) return null;
  const answered = Number(raw.answered);
  const correct = Number(raw.correct);
  const timeSeconds = Number(raw.timeSeconds);
  const timedAnswered = Number(raw.timedAnswered);
  const hintsUsed = Number(raw.hintsUsed);
  if (
    !Number.isFinite(answered) ||
    !Number.isFinite(correct) ||
    !Number.isFinite(timeSeconds) ||
    !Number.isFinite(timedAnswered) ||
    !Number.isFinite(hintsUsed)
  ) {
    return null;
  }
  return {
    answered: Math.max(0, Math.floor(answered)),
    correct: Math.max(0, Math.floor(correct)),
    timeSeconds: Math.max(0, timeSeconds),
    timedAnswered: Math.max(0, Math.floor(timedAnswered)),
    hintsUsed: Math.max(0, Math.floor(hintsUsed)),
  };
}

function coerceProfile(raw: unknown): UserProfile {
  if (!isPlainObject(raw)) return createEmptyProfile();
  const version = Number(raw.version);
  // Future-proofing: any version we don't recognize → start fresh rather
  // than try to interpret unknown fields.
  if (version !== PROFILE_VERSION) return createEmptyProfile();
  const totalsRaw = raw.totals;
  const topicsRaw = raw.topics;
  const totals = coerceTopicCounters(totalsRaw);
  if (!totals) return createEmptyProfile();
  const topics: Record<string, TopicCounters> = {};
  if (isPlainObject(topicsRaw)) {
    for (const [k, v] of Object.entries(topicsRaw)) {
      const c = coerceTopicCounters(v);
      if (c) topics[k] = c;
    }
  }
  const sessionsCompleted = Number.isFinite(Number(raw.sessionsCompleted))
    ? Math.max(0, Math.floor(Number(raw.sessionsCompleted)))
    : 0;
  const updatedAt = Number.isFinite(Number(raw.updatedAt))
    ? Math.max(0, Math.floor(Number(raw.updatedAt)))
    : 0;
  return { version: PROFILE_VERSION, updatedAt, sessionsCompleted, totals, topics };
}

/**
 * Read the profile from localStorage. SSR-safe (returns an empty profile
 * when `window` is undefined). Never throws — corrupt JSON is treated as
 * "no profile yet".
 */
export function loadUserProfile(): UserProfile {
  if (typeof window === "undefined") return createEmptyProfile();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyProfile();
    return coerceProfile(JSON.parse(raw));
  } catch {
    return createEmptyProfile();
  }
}

/**
 * Persist the profile to localStorage. SSR-safe (no-op when `window`
 * is undefined). Returns true on success, false on failure (e.g. quota
 * exceeded or storage disabled). The profile is reasonably small
 * (counters only — no per-question history), so quota is unlikely to be
 * an issue in practice.
 */
export function saveUserProfile(profile: UserProfile): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch {
    return false;
  }
}

/** Clear the profile (for "reset progress" flows). SSR-safe. */
export function clearUserProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * PURE aggregator: take an existing profile and a finished session, return
 * a new profile with counters updated. Does NOT touch localStorage —
 * callers compose `saveUserProfile(applySessionToProfile(loadUserProfile(), session))`.
 *
 * Bumps `sessionsCompleted` by 1 for any non-empty session (≥1 entry).
 * An empty session is a no-op so accidental double-fires don't inflate
 * the counter.
 */
export function applySessionToProfile(
  profile: UserProfile,
  session: SessionAnswer[],
  now: number = Date.now(),
): UserProfile {
  if (session.length === 0) return profile;

  // Deep-copy counters we'll mutate. Topic map gets a fresh object so
  // callers can pass the existing profile without seeing in-place mutation.
  const topics: Record<string, TopicCounters> = { ...profile.topics };
  const totals: ProfileTotals = { ...profile.totals };

  for (const a of session) {
    const topicKey = (a.topic && a.topic.trim()) || "unknown";
    const existing = topics[topicKey] ?? {
      answered: 0,
      correct: 0,
      timeSeconds: 0,
      timedAnswered: 0,
      hintsUsed: 0,
    };
    const next: TopicCounters = { ...existing };
    next.answered += 1;
    totals.answered += 1;
    if (a.isCorrect) {
      next.correct += 1;
      totals.correct += 1;
    }
    if (typeof a.timeSpent === "number" && Number.isFinite(a.timeSpent) && a.timeSpent >= 0) {
      next.timeSeconds += a.timeSpent;
      next.timedAnswered += 1;
      totals.timeSeconds += a.timeSpent;
      totals.timedAnswered += 1;
    }
    if (a.hintUsed) {
      next.hintsUsed += 1;
      totals.hintsUsed += 1;
    }
    topics[topicKey] = next;
  }

  return {
    version: PROFILE_VERSION,
    updatedAt: now,
    sessionsCompleted: profile.sessionsCompleted + 1,
    totals,
    topics,
  };
}

function accuracyOf(c: { answered: number; correct: number }): number {
  if (c.answered === 0) return 0;
  return (c.correct / c.answered) * 100;
}

/**
 * Compute the human-facing snapshot from the raw counters. Pure & cheap —
 * call it whenever you need the five signals.
 */
export function summarizeProfile(profile: UserProfile): ProfileSummary {
  const { totals, topics } = profile;

  const averageAccuracy = totals.answered > 0
    ? Math.round((totals.correct / totals.answered) * 100)
    : 0;

  const averageSpeedSeconds = totals.timedAnswered > 0
    ? totals.timeSeconds / totals.timedAnswered
    : 0;

  const hintUsageRate = totals.answered > 0
    ? Math.round((totals.hintsUsed / totals.answered) * 100)
    : 0;

  // Eligible topics for strongest/weakest: must have ≥ MIN samples so a
  // single lucky/unlucky answer doesn't dominate the lists.
  const eligible = Object.entries(topics)
    .filter(([, c]) => c.answered >= TOPIC_MIN_SAMPLES)
    .map(([topic, c]) => ({ topic, accuracy: accuracyOf(c), answered: c.answered }));

  // Strongest = highest accuracy first; ties broken by larger sample count
  // (more data = more confidence). Stable sort via the answered tiebreaker.
  const byStrongest = [...eligible].sort((a, b) => {
    if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
    return b.answered - a.answered;
  });
  const byWeakest = [...eligible].sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.answered - a.answered;
  });

  return {
    strongestTopics: byStrongest.slice(0, TOP_N).map((t) => t.topic),
    weakestTopics: byWeakest.slice(0, TOP_N).map((t) => t.topic),
    averageAccuracy,
    averageSpeedSeconds,
    hintUsageRate,
    sessionsCompleted: profile.sessionsCompleted,
    totalAnswered: totals.answered,
  };
}

/**
 * Higher-level recommendation helper for the practice picker / training
 * engine. Mirrors the same accuracy boundaries as the per-session adaptive
 * engine (<50 easy, 50–80 medium, >80 hard) so the user experience stays
 * consistent across both surfaces.
 */
export function getStudyRecommendations(profile: UserProfile): StudyRecommendations {
  const summary = summarizeProfile(profile);
  const hasEnoughData =
    profile.sessionsCompleted >= 1 && profile.totals.answered >= TOPIC_MIN_SAMPLES;

  let recommendedDifficulty: "easy" | "medium" | "hard" = "easy";
  if (hasEnoughData) {
    if (summary.averageAccuracy < 50) recommendedDifficulty = "easy";
    else if (summary.averageAccuracy <= 80) recommendedDifficulty = "medium";
    else recommendedDifficulty = "hard";
  }

  return {
    recommendedTopics: summary.weakestTopics,
    recommendedDifficulty,
    hasEnoughData,
  };
}

/** Constants exposed for tests and future tuning. */
export const __profileConstants = {
  STORAGE_KEY,
  PROFILE_VERSION,
  TOPIC_MIN_SAMPLES,
  TOP_N,
};
