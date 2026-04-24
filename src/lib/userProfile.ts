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

/**
 * Per-category breakdown produced by the full-exam result effects. Mirrors
 * `ExamHistoryCategory` from `examHistory.ts` so callers can pass the
 * exact same payload they already pass to `saveExamResult`.
 */
export interface DiagnosticCategoryInput {
  name: string;
  section?: string;
  percentage: number;
}

/**
 * Snapshot of the most recent diagnostic / full-exam result. Replaces the
 * previous diagnostic snapshot on every save (we keep only the latest —
 * the per-attempt history lives in `examHistory.ts`).
 *
 * Everything here is DERIVED from `categoryPerformance` so future changes
 * to ranking rules don't require migrating data — the raw breakdown is
 * always preserved.
 */
export interface DiagnosticSnapshot {
  /** Discriminator so consumers know this came from the diagnostic flow. */
  source: "diagnostic";
  /** Epoch ms when the diagnostic exam was completed. */
  takenAt: number;
  /** Free-form discriminator from `saveExamResult` (e.g. "qudrat-gat", "gat"). */
  examKind: string;
  /** Total percentage score (0–100). */
  overallScore: number;
  /** Average seconds per question across the exam. May be missing. */
  avgTimePerQuestion?: number;
  /** Topics with the LOWEST accuracy first (capped at TOP_N). */
  weakestTopics: string[];
  /** Topics with the HIGHEST accuracy first (capped at TOP_N). */
  strongestTopics: string[];
  /** Sections with the LOWEST aggregated accuracy first (capped at TOP_N). */
  weakestSections: string[];
  /** Sections with the HIGHEST aggregated accuracy first (capped at TOP_N). */
  strongestSections: string[];
  /** Raw input preserved so future re-derivation is possible. */
  categoryPerformance: DiagnosticCategoryInput[];
}

export interface UserProfile {
  version: number;
  updatedAt: number;
  sessionsCompleted: number;
  totals: ProfileTotals;
  topics: Record<string, TopicCounters>;
  /**
   * Most recent diagnostic / full-exam result. Optional — absent until the
   * student completes their first full exam. We store ONLY the latest;
   * historical attempts live in `examHistory.ts`.
   */
  diagnostic?: DiagnosticSnapshot;
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
   * Topics the student should prioritize. When a diagnostic snapshot is
   * present its weak topics take precedence (the diagnostic is the user's
   * most reliable initial-level signal); otherwise this falls back to
   * session-derived `weakestTopics`. May be empty.
   */
  recommendedTopics: string[];
  /**
   * Suggested starting difficulty for the next session. Mirrors the same
   * <50 / 50–80 / >80 accuracy boundaries as the per-session adaptive
   * engine. Diagnostic overall score is preferred when available;
   * otherwise the session-derived average accuracy is used.
   */
  recommendedDifficulty: "easy" | "medium" | "hard";
  /**
   * Where the recommendation came from — useful for callers who want to
   * gate behavior or for analytics. "none" means the profile is empty
   * and callers should use product defaults.
   */
  source: "diagnostic" | "sessions" | "none";
  /**
   * True when the profile has enough data to make recommendations.
   * Diagnostic alone is enough; otherwise we require ≥ 1 completed
   * session AND ≥ TOPIC_MIN_SAMPLES total answers.
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

function coerceCategoryInput(raw: unknown): DiagnosticCategoryInput | null {
  if (!isPlainObject(raw)) return null;
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) return null;
  const pct = Number(raw.percentage);
  if (!Number.isFinite(pct)) return null;
  const section = typeof raw.section === "string" && raw.section.trim()
    ? raw.section.trim()
    : undefined;
  return {
    name,
    section,
    percentage: Math.min(100, Math.max(0, pct)),
  };
}

function coerceStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((s): s is string => typeof s === "string" && s.trim().length > 0);
}

function coerceDiagnostic(raw: unknown): DiagnosticSnapshot | undefined {
  if (!isPlainObject(raw)) return undefined;
  // Accept only entries that explicitly mark themselves as diagnostic so we
  // don't accidentally promote arbitrary blobs.
  if (raw.source !== "diagnostic") return undefined;
  const examKind = typeof raw.examKind === "string" && raw.examKind.trim()
    ? raw.examKind.trim()
    : "";
  if (!examKind) return undefined;
  const overall = Number(raw.overallScore);
  if (!Number.isFinite(overall)) return undefined;
  const takenAt = Number(raw.takenAt);
  const cats = Array.isArray(raw.categoryPerformance)
    ? (raw.categoryPerformance as unknown[])
        .map(coerceCategoryInput)
        .filter((c): c is DiagnosticCategoryInput => c !== null)
    : [];
  const avg = Number(raw.avgTimePerQuestion);
  return {
    source: "diagnostic",
    takenAt: Number.isFinite(takenAt) ? Math.max(0, Math.floor(takenAt)) : 0,
    examKind,
    overallScore: Math.min(100, Math.max(0, overall)),
    avgTimePerQuestion: Number.isFinite(avg) && avg >= 0 ? avg : undefined,
    weakestTopics: coerceStringArray(raw.weakestTopics).slice(0, TOP_N),
    strongestTopics: coerceStringArray(raw.strongestTopics).slice(0, TOP_N),
    weakestSections: coerceStringArray(raw.weakestSections).slice(0, TOP_N),
    strongestSections: coerceStringArray(raw.strongestSections).slice(0, TOP_N),
    categoryPerformance: cats,
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
  // `diagnostic` is purely additive — absent on legacy v1 profiles, and we
  // tolerate corruption by simply dropping the field rather than wiping
  // the whole profile.
  const diagnostic = coerceDiagnostic(raw.diagnostic);
  const out: UserProfile = { version: PROFILE_VERSION, updatedAt, sessionsCompleted, totals, topics };
  if (diagnostic) out.diagnostic = diagnostic;
  return out;
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

  // CRITICAL: spread the existing profile so the optional `diagnostic`
  // field (and any future optional fields) survives session aggregation.
  // Without this spread, every session save would silently wipe out the
  // diagnostic snapshot the practice page relies on for recommendations.
  return {
    ...profile,
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
 * Map a 0–100 accuracy score to one of the three difficulty buckets.
 * Centralized so the per-session engine, the diagnostic recommendation,
 * and the session-derived recommendation all agree on the boundaries.
 */
function difficultyFromAccuracy(accuracy: number): "easy" | "medium" | "hard" {
  if (accuracy < 50) return "easy";
  if (accuracy <= 80) return "medium";
  return "hard";
}

/**
 * Higher-level recommendation helper for the practice picker / training
 * engine. Priority order:
 *   1. Diagnostic snapshot — most reliable initial-level signal because
 *      it covers a broad question set under exam conditions. When present
 *      its weakest topics drive `recommendedTopics` and its overall score
 *      drives `recommendedDifficulty`.
 *   2. Session-derived signals — used when no diagnostic exists yet but
 *      the student has built up enough practice data.
 *   3. Empty defaults — used when neither source has signal; callers
 *      should fall back to their own product defaults.
 *
 * The diagnostic path bypasses the `≥ 1 session AND ≥ 5 answers` gate
 * since the diagnostic is itself a much larger sample than that gate
 * was protecting against.
 */
export function getStudyRecommendations(profile: UserProfile): StudyRecommendations {
  // 1) Diagnostic source wins when it has at least one weak topic to
  //    surface. A diagnostic with no categories below others is rare
  //    (only on perfectly uniform performance) but we fall back to the
  //    next layer rather than return an empty list.
  const diag = profile.diagnostic;
  if (diag && diag.weakestTopics.length > 0) {
    return {
      recommendedTopics: diag.weakestTopics,
      recommendedDifficulty: difficultyFromAccuracy(diag.overallScore),
      source: "diagnostic",
      hasEnoughData: true,
    };
  }

  // 2) Fall back to session-derived signals (existing behavior).
  const summary = summarizeProfile(profile);
  const hasEnoughSessionData =
    profile.sessionsCompleted >= 1 && profile.totals.answered >= TOPIC_MIN_SAMPLES;

  if (hasEnoughSessionData) {
    return {
      recommendedTopics: summary.weakestTopics,
      recommendedDifficulty: difficultyFromAccuracy(summary.averageAccuracy),
      source: "sessions",
      hasEnoughData: true,
    };
  }

  // 3) Nothing usable yet — defaults.
  return {
    recommendedTopics: [],
    recommendedDifficulty: "easy",
    source: "none",
    hasEnoughData: false,
  };
}

/** Input shape for {@link applyDiagnosticToProfile}. */
export interface DiagnosticInput {
  /** Free-form discriminator from the full-exam page (e.g. "qudrat-gat"). */
  examKind: string;
  /** Total percentage score (0–100). */
  score: number;
  /** Average seconds per question across the exam. Optional. */
  avgTimePerQuestion?: number;
  /** Per-category breakdown — same shape used by `saveExamResult`. */
  categoryPerformance: DiagnosticCategoryInput[];
  /** Defaults to `Date.now()` — overridable for deterministic tests. */
  takenAt?: number;
}

/**
 * Build a `DiagnosticSnapshot` from raw exam-result input. Pure; no
 * storage side effects. The derivation rules:
 *
 *   - Topic ranking: sort `categoryPerformance` by `percentage` ascending
 *     (weakest first) and descending (strongest first), break ties by
 *     `name` so the order is deterministic across runs.
 *   - Section ranking: aggregate categories by `section`, average their
 *     percentages (unweighted — every category gets equal vote because we
 *     don't have per-category sample counts in the saved data), then rank
 *     the same way.
 *   - Both rankings are capped at TOP_N.
 *   - Categories without a `section` contribute to topic ranking only.
 */
function deriveDiagnosticSnapshot(input: DiagnosticInput): DiagnosticSnapshot {
  const cats = input.categoryPerformance.filter(
    (c) => c && typeof c.name === "string" && Number.isFinite(c.percentage),
  );

  // Topic ranking — deterministic via name tiebreaker.
  const topicsAsc = [...cats].sort((a, b) => {
    if (a.percentage !== b.percentage) return a.percentage - b.percentage;
    return a.name.localeCompare(b.name);
  });
  const topicsDesc = [...cats].sort((a, b) => {
    if (a.percentage !== b.percentage) return b.percentage - a.percentage;
    return a.name.localeCompare(b.name);
  });

  // Section ranking — group then average.
  const bySection = new Map<string, { sum: number; n: number }>();
  for (const c of cats) {
    if (!c.section) continue;
    const cur = bySection.get(c.section) ?? { sum: 0, n: 0 };
    cur.sum += c.percentage;
    cur.n += 1;
    bySection.set(c.section, cur);
  }
  const sectionAvgs = Array.from(bySection.entries()).map(([name, { sum, n }]) => ({
    name,
    avg: n > 0 ? sum / n : 0,
  }));
  const sectionsAsc = [...sectionAvgs].sort((a, b) => {
    if (a.avg !== b.avg) return a.avg - b.avg;
    return a.name.localeCompare(b.name);
  });
  const sectionsDesc = [...sectionAvgs].sort((a, b) => {
    if (a.avg !== b.avg) return b.avg - a.avg;
    return a.name.localeCompare(b.name);
  });

  return {
    source: "diagnostic",
    takenAt: input.takenAt ?? Date.now(),
    examKind: input.examKind,
    overallScore: Math.min(100, Math.max(0, input.score)),
    avgTimePerQuestion: input.avgTimePerQuestion,
    weakestTopics: topicsAsc.slice(0, TOP_N).map((c) => c.name),
    strongestTopics: topicsDesc.slice(0, TOP_N).map((c) => c.name),
    weakestSections: sectionsAsc.slice(0, TOP_N).map((s) => s.name),
    strongestSections: sectionsDesc.slice(0, TOP_N).map((s) => s.name),
    // Preserve the raw input so future re-derivation is possible without
    // re-running the exam. Percentages are clamped 0-100 so the in-memory
    // shape matches what the load coercer enforces — callers see the same
    // numbers whether they read from memory or from a round-tripped load.
    categoryPerformance: cats.map((c) => ({
      name: c.name,
      section: c.section,
      percentage: Math.min(100, Math.max(0, c.percentage)),
    })),
  };
}

/**
 * PURE aggregator: take an existing profile and a freshly-completed
 * diagnostic exam, return a new profile with the `diagnostic` field
 * replaced (we keep only the latest result; per-attempt history lives
 * in `examHistory.ts`).
 *
 * Returns the input profile unchanged when there is no usable category
 * data — we don't want to overwrite a real diagnostic with a placeholder
 * built from missing input.
 */
export function applyDiagnosticToProfile(
  profile: UserProfile,
  input: DiagnosticInput,
): UserProfile {
  if (!input || !Array.isArray(input.categoryPerformance) || input.categoryPerformance.length === 0) {
    return profile;
  }
  if (!input.examKind || typeof input.examKind !== "string") {
    return profile;
  }
  if (!Number.isFinite(input.score)) {
    return profile;
  }
  return {
    ...profile,
    version: PROFILE_VERSION,
    updatedAt: input.takenAt ?? Date.now(),
    diagnostic: deriveDiagnosticSnapshot(input),
  };
}

/** Constants exposed for tests and future tuning. */
export const __profileConstants = {
  STORAGE_KEY,
  PROFILE_VERSION,
  TOPIC_MIN_SAMPLES,
  TOP_N,
};
