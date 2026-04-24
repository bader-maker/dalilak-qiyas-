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

import { categoryNameToSlug } from "./topicMap";

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

/**
 * Per-topic progress timeline cap. Each completed exam contributes one
 * point per category, each completed practice session contributes one
 * point per touched topic — so 30 points per topic comfortably covers
 * dozens of exams + sessions while keeping the serialized profile small.
 * Oldest points are dropped first when the cap is exceeded.
 */
const MAX_TOPIC_HISTORY = 30;

/**
 * A practice session must include at least this many questions for the
 * given topic before we record a timeline point for it. Without this
 * guard a 1-question topic with 0% / 100% accuracy would flood the
 * timeline with noise that swamps the real exam-derived signal.
 */
const MIN_SESSION_SAMPLES_FOR_SNAPSHOT = 3;

/**
 * Percentage-point delta required to call a trend "improving" or
 * "declining" rather than "stable". Mirrors the threshold already used
 * by `examHistory.summarizeProgress` so the two systems describe the
 * same change consistently.
 */
const PROGRESS_TREND_THRESHOLD = 5;

/**
 * Per-subtype slice of TopicCounters. Subtypes are an OPTIONAL finer
 * grain *inside* a topic (e.g. topic "algebra" → subtype "quadratic").
 * The shape mirrors `TopicCounters` so future code can reuse the same
 * accuracy / speed / hint-rate helpers across both granularities.
 *
 * Storing subtypes as a nested map (rather than a flat `topic.subtype`
 * key on `topics`) keeps topic-level counters intact and lets callers
 * who don't care about subtypes ignore them entirely.
 */
export interface SubtypeCounters {
  answered: number;
  correct: number;
  timeSeconds: number;
  timedAnswered: number;
  hintsUsed: number;
}

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
  /**
   * OPTIONAL per-subtype breakdown. Absent on legacy entries written
   * before subtype tracking shipped — callers MUST treat undefined /
   * empty as "no subtype data" and fall back to the topic totals.
   *
   * Only answers that arrive with a non-empty `subtype` populate this
   * map; topic totals are always updated regardless. This keeps the
   * dimension purely additive: removing the inference helper would
   * leave subtype maps frozen but break nothing else.
   */
  subtypes?: Record<string, SubtypeCounters>;
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

/**
 * One measurement event for a topic, captured from a single source. The
 * timeline is the union of all such events across diagnostic, exam-history,
 * and practice-session sources — that union is what enables "improvement
 * over time" insights.
 *
 * Stored as raw events (not pre-aggregated rates) so future trend formulas
 * can re-derive without losing precision.
 */
export interface TopicProgressPoint {
  /** Epoch ms of the event. */
  at: number;
  /** Where this measurement came from. */
  source: "diagnostic" | "session" | "exam";
  /** Topic-level accuracy at this event, 0–100. */
  accuracy: number;
  /**
   * Number of questions backing this measurement, when known. Set by
   * session events (we count answered questions in the topic). Diagnostic
   * and exam events leave this undefined — those snapshots already
   * represent broad samples and the per-category sample count isn't
   * recorded by the exam pages today.
   */
  sampleSize?: number;
}

/** Coarse "where is this student right now" label per topic. */
export type TopicLevelLabel = "weak" | "developing" | "strong";

/**
 * Latest known level for a topic, derived from the most recent
 * `TopicProgressPoint`. Stored alongside the timeline so consumers
 * (recommendation engine, future insights UI) can read it directly
 * without re-deriving on every call.
 *
 * Always recomputed at write time from the timeline so it can never
 * drift out of sync with the underlying snapshots.
 */
export interface TopicLevel {
  topic: string;
  /** 0–100, copied from the latest snapshot. */
  accuracy: number;
  /** Mirrors the same <50 / 50–80 / >80 boundaries used elsewhere. */
  level: TopicLevelLabel;
  /** The source of the latest snapshot. */
  source: "diagnostic" | "session" | "exam";
  /** Epoch ms of the latest snapshot. */
  at: number;
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
  /**
   * Per-topic timeline of measurement events. Optional — absent on legacy
   * v1 profiles, populated lazily as new events arrive (and via
   * `reconcileExamHistoryToProfile` on demand). Each topic's array is kept
   * sorted ascending by `at` and capped at MAX_TOPIC_HISTORY.
   *
   * Topic keys are normalized via `categoryNameToSlug` when possible so
   * exam categories ("الجبر") and session topics ("algebra") fold into
   * one timeline.
   */
  topicProgress?: Record<string, TopicProgressPoint[]>;
  /**
   * Latest known level per topic, derived from the head of each timeline.
   * Optional and recomputed deterministically from `topicProgress` — never
   * accept it as input on its own; it's always rebuilt to match.
   */
  lastKnownLevel?: Record<string, TopicLevel>;
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
  /**
   * OPTIONAL finer-grained slug under `topic` (e.g. "quadratic" for
   * topic "algebra"). When provided, the aggregator also bumps the
   * matching `topics[topic].subtypes[subtype]` counters; topic totals
   * are always updated regardless. Absent / empty / whitespace-only
   * values leave the per-subtype dimension untouched, so older callers
   * that never set this field continue to work unchanged.
   */
  subtype?: string | undefined | null;
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

function coerceSubtypeCounters(raw: unknown): SubtypeCounters | null {
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

function coerceSubtypeMap(raw: unknown): Record<string, SubtypeCounters> | undefined {
  // Defensive: any non-object (including arrays / null / legacy
  // profiles missing the field) yields undefined, never an empty map,
  // so downstream `subtypes != null` checks stay precise.
  if (!isPlainObject(raw)) return undefined;
  const out: Record<string, SubtypeCounters> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k !== "string" || !k.trim()) continue;
    const c = coerceSubtypeCounters(v);
    if (c) out[k] = c;
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
  const counters: TopicCounters = {
    answered: Math.max(0, Math.floor(answered)),
    correct: Math.max(0, Math.floor(correct)),
    timeSeconds: Math.max(0, timeSeconds),
    timedAnswered: Math.max(0, Math.floor(timedAnswered)),
    hintsUsed: Math.max(0, Math.floor(hintsUsed)),
  };
  const subtypes = coerceSubtypeMap(raw.subtypes);
  if (subtypes) counters.subtypes = subtypes;
  return counters;
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

function coerceProgressPoint(raw: unknown): TopicProgressPoint | null {
  if (!isPlainObject(raw)) return null;
  const at = Number(raw.at);
  const accuracy = Number(raw.accuracy);
  if (!Number.isFinite(at) || at < 0) return null;
  if (!Number.isFinite(accuracy)) return null;
  const source = raw.source;
  if (source !== "diagnostic" && source !== "session" && source !== "exam") {
    return null;
  }
  const sampleSizeRaw = Number(raw.sampleSize);
  const sampleSize = Number.isFinite(sampleSizeRaw) && sampleSizeRaw > 0
    ? Math.floor(sampleSizeRaw)
    : undefined;
  const out: TopicProgressPoint = {
    at: Math.floor(at),
    source,
    accuracy: Math.min(100, Math.max(0, accuracy)),
  };
  if (sampleSize !== undefined) out.sampleSize = sampleSize;
  return out;
}

function coerceTopicProgress(raw: unknown): Record<string, TopicProgressPoint[]> | undefined {
  if (!isPlainObject(raw)) return undefined;
  const out: Record<string, TopicProgressPoint[]> = {};
  for (const [topic, listRaw] of Object.entries(raw)) {
    if (typeof topic !== "string" || !topic.trim()) continue;
    if (!Array.isArray(listRaw)) continue;
    const points = (listRaw as unknown[])
      .map(coerceProgressPoint)
      .filter((p): p is TopicProgressPoint => p !== null);
    if (points.length === 0) continue;
    // Re-normalize on load: sort ascending, dedupe, cap. The writer keeps
    // these invariants too, but coerce makes a corrupted blob safe.
    out[topic.trim()] = capTopicHistory(dedupeAndSort(points));
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
  // `topicProgress` is also additive. `lastKnownLevel` is intentionally
  // NOT read from the raw blob — it's always recomputed from the timeline
  // so the two structures cannot drift out of sync (a freshly-edited
  // localStorage entry can't lie about the level).
  const topicProgress = coerceTopicProgress(raw.topicProgress);
  const out: UserProfile = { version: PROFILE_VERSION, updatedAt, sessionsCompleted, totals, topics };
  if (diagnostic) out.diagnostic = diagnostic;
  if (topicProgress) {
    out.topicProgress = topicProgress;
    out.lastKnownLevel = recomputeLastKnownLevels(topicProgress);
  }
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
    // Shallow-clone the topic record so we can mutate freely without
    // touching the existing subtype map; we rebuild that map below.
    const next: TopicCounters = { ...existing };
    next.answered += 1;
    totals.answered += 1;
    if (a.isCorrect) {
      next.correct += 1;
      totals.correct += 1;
    }
    const hasTime =
      typeof a.timeSpent === "number" && Number.isFinite(a.timeSpent) && a.timeSpent >= 0;
    if (hasTime) {
      next.timeSeconds += a.timeSpent as number;
      next.timedAnswered += 1;
      totals.timeSeconds += a.timeSpent as number;
      totals.timedAnswered += 1;
    }
    if (a.hintUsed) {
      next.hintsUsed += 1;
      totals.hintsUsed += 1;
    }

    // ---- Optional per-subtype bucket ------------------------------
    // Only update the subtype dimension when the caller provided a
    // non-empty slug. Topic totals were already updated above so a
    // missing subtype never leaves the profile inconsistent — it just
    // skips the finer-grained snapshot for this answer.
    //
    // Runtime guard: callers can be untyped (e.g. legacy persisted
    // payloads, future external sources). A non-string subtype would
    // throw on `.trim()` and abort the entire aggregation, which
    // contradicts the additive/fault-tolerant invariant. Treat any
    // non-string as "no subtype" instead.
    const subtypeKey =
      typeof a.subtype === "string" && a.subtype.trim()
        ? a.subtype.trim()
        : null;
    if (subtypeKey) {
      const subMap: Record<string, SubtypeCounters> = { ...(existing.subtypes ?? {}) };
      const subPrev = subMap[subtypeKey] ?? {
        answered: 0,
        correct: 0,
        timeSeconds: 0,
        timedAnswered: 0,
        hintsUsed: 0,
      };
      const subNext: SubtypeCounters = { ...subPrev };
      subNext.answered += 1;
      if (a.isCorrect) subNext.correct += 1;
      if (hasTime) {
        subNext.timeSeconds += a.timeSpent as number;
        subNext.timedAnswered += 1;
      }
      if (a.hintUsed) subNext.hintsUsed += 1;
      subMap[subtypeKey] = subNext;
      next.subtypes = subMap;
    }

    topics[topicKey] = next;
  }

  // CRITICAL: spread the existing profile so the optional `diagnostic`
  // field (and any future optional fields) survives session aggregation.
  // Without this spread, every session save would silently wipe out the
  // diagnostic snapshot the practice page relies on for recommendations.
  const aggregated: UserProfile = {
    ...profile,
    version: PROFILE_VERSION,
    updatedAt: now,
    sessionsCompleted: profile.sessionsCompleted + 1,
    totals,
    topics,
  };
  // Also record a per-topic timeline point so improvement tracking works
  // off the same write. Session snapshots are gated by
  // MIN_SESSION_SAMPLES_FOR_SNAPSHOT — short sessions with 1–2 questions
  // in a topic are skipped to avoid noise.
  return recordSessionSnapshots(aggregated, session, now);
}

function accuracyOf(c: { answered: number; correct: number }): number {
  if (c.answered === 0) return 0;
  return (c.correct / c.answered) * 100;
}

/** Per-subtype performance entry returned by `getTopicSubtypePerformance`. */
export interface SubtypePerformanceEntry {
  /** The subtype slug (as fed to `applySessionToProfile`). */
  subtype: string;
  /** Total questions answered in this subtype. */
  answered: number;
  /** Correct answers in this subtype. */
  correct: number;
  /** 0–100 accuracy, rounded. 0 when no samples exist. */
  accuracy: number;
}

/**
 * Read-only helper exposing the per-subtype counters under one topic.
 * Returns an array sorted by ascending accuracy (weakest first) — the
 * shape future UIs / recommenders need most often. Subtypes below the
 * shared `TOPIC_MIN_SAMPLES` floor are still included with an
 * `answered` count callers can use to gate display; they're never
 * filtered out here so consumers can decide policy.
 *
 * Returns an empty array when the topic doesn't exist or has no
 * subtype data — callers fall back to topic-level signals.
 */
export function getTopicSubtypePerformance(
  profile: UserProfile,
  topic: string,
): SubtypePerformanceEntry[] {
  const t = profile.topics[topic];
  if (!t || !t.subtypes) return [];
  const out: SubtypePerformanceEntry[] = [];
  for (const [subtype, c] of Object.entries(t.subtypes)) {
    out.push({
      subtype,
      answered: c.answered,
      correct: c.correct,
      accuracy: Math.round(accuracyOf(c)),
    });
  }
  // Weakest first; ties broken by larger sample (more confidence).
  out.sort((a, b) => {
    if (a.accuracy !== b.accuracy) return a.accuracy - b.accuracy;
    return b.answered - a.answered;
  });
  return out;
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
  const takenAt = input.takenAt ?? Date.now();
  const withDiagnostic: UserProfile = {
    ...profile,
    version: PROFILE_VERSION,
    updatedAt: takenAt,
    diagnostic: deriveDiagnosticSnapshot(input),
  };
  // Also fan out one timeline point per category so diagnostic events
  // contribute to the same per-topic series that sessions and exam
  // history feed. This is what enables cross-source improvement
  // tracking off a single field on the profile.
  return recordDiagnosticSnapshots(withDiagnostic, input, takenAt);
}

// =============================================================================
// Topic progress timeline — combines diagnostic, exam-history, and session
// signals into a single per-topic series. The series is the substrate that
// makes "improvement over time", "last known level per topic", and stronger
// recommendation decisions possible without relying on any single source.
// =============================================================================

/** Map a 0–100 accuracy to a coarse level label. */
function levelFromAccuracy(accuracy: number): TopicLevelLabel {
  if (accuracy < 50) return "weak";
  if (accuracy <= 80) return "developing";
  return "strong";
}

/**
 * Normalize a topic identifier coming from any source. Sessions already
 * use slugs; diagnostic / exam categoryPerformance entries use display
 * labels that the topic map can resolve to slugs. When neither path
 * yields a slug we fall back to the trimmed raw label so the snapshot is
 * never lost — at worst it lives under its own key until the topic map
 * learns the label.
 */
function normalizeTopicKey(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const slug = categoryNameToSlug(trimmed);
  return slug ?? trimmed;
}

/**
 * Sort ascending by `at`, then dedupe events at the same instant + source.
 * The most recently appended event wins on collision (callers compose
 * "fresh first" by pushing then calling this).
 */
function dedupeAndSort(points: TopicProgressPoint[]): TopicProgressPoint[] {
  const seen = new Map<string, TopicProgressPoint>();
  for (const p of points) {
    seen.set(`${p.at}|${p.source}`, p);
  }
  return Array.from(seen.values()).sort((a, b) => {
    if (a.at !== b.at) return a.at - b.at;
    // Tiebreak by source for deterministic ordering when two sources
    // legitimately fire at the same epoch ms (rare but possible).
    return a.source.localeCompare(b.source);
  });
}

/** Drop oldest points so the series never exceeds MAX_TOPIC_HISTORY. */
function capTopicHistory(points: TopicProgressPoint[]): TopicProgressPoint[] {
  if (points.length <= MAX_TOPIC_HISTORY) return points;
  return points.slice(points.length - MAX_TOPIC_HISTORY);
}

/**
 * Add a single measurement event to the per-topic timeline. Pure — returns
 * a fresh `topicProgress` map with the topic's series updated. Idempotent
 * by `{at, source}` so calling twice with the same event is a no-op.
 */
function appendTopicSnapshot(
  progress: Record<string, TopicProgressPoint[]> | undefined,
  topic: string,
  point: TopicProgressPoint,
): Record<string, TopicProgressPoint[]> {
  const next: Record<string, TopicProgressPoint[]> = { ...(progress ?? {}) };
  const existing = next[topic] ?? [];
  next[topic] = capTopicHistory(dedupeAndSort([...existing, point]));
  return next;
}

/**
 * Recompute `lastKnownLevel` from the full `topicProgress` map. Always run
 * after a write — single source of truth keeps the level table from
 * drifting if a new snapshot lands earlier in time than an existing one
 * (rare, but possible during exam-history backfill).
 */
function recomputeLastKnownLevels(
  progress: Record<string, TopicProgressPoint[]>,
): Record<string, TopicLevel> {
  const out: Record<string, TopicLevel> = {};
  for (const [topic, series] of Object.entries(progress)) {
    if (series.length === 0) continue;
    const latest = series[series.length - 1];
    out[topic] = {
      topic,
      accuracy: latest.accuracy,
      level: levelFromAccuracy(latest.accuracy),
      source: latest.source,
      at: latest.at,
    };
  }
  return out;
}

/**
 * PURE: append diagnostic-derived snapshots (one per category) to the
 * per-topic timeline, then refresh `lastKnownLevel`. Called automatically
 * by `applyDiagnosticToProfile` so callers don't need to invoke it.
 */
export function recordDiagnosticSnapshots(
  profile: UserProfile,
  input: DiagnosticInput,
  takenAt?: number,
): UserProfile {
  if (!input || !Array.isArray(input.categoryPerformance)) return profile;
  const at = takenAt ?? input.takenAt ?? Date.now();
  let progress = profile.topicProgress ? { ...profile.topicProgress } : undefined;
  for (const cat of input.categoryPerformance) {
    if (!cat || typeof cat.name !== "string" || !Number.isFinite(cat.percentage)) continue;
    const key = normalizeTopicKey(cat.name);
    if (!key) continue;
    progress = appendTopicSnapshot(progress, key, {
      at,
      source: "diagnostic",
      accuracy: Math.min(100, Math.max(0, cat.percentage)),
    });
  }
  if (!progress) return profile;
  return {
    ...profile,
    topicProgress: progress,
    lastKnownLevel: recomputeLastKnownLevels(progress),
  };
}

/**
 * PURE: append session-derived snapshots (one per topic that meets the
 * minimum-sample guard) to the per-topic timeline, then refresh
 * `lastKnownLevel`. Called automatically by `applySessionToProfile`.
 */
export function recordSessionSnapshots(
  profile: UserProfile,
  session: SessionAnswer[],
  at: number = Date.now(),
): UserProfile {
  if (!Array.isArray(session) || session.length === 0) return profile;
  // Group session answers by topic — only topics that meet
  // MIN_SESSION_SAMPLES_FOR_SNAPSHOT contribute a point.
  const byTopic = new Map<string, { answered: number; correct: number }>();
  for (const a of session) {
    const key = normalizeTopicKey(a.topic ?? null);
    if (!key) continue;
    const cur = byTopic.get(key) ?? { answered: 0, correct: 0 };
    cur.answered += 1;
    if (a.isCorrect) cur.correct += 1;
    byTopic.set(key, cur);
  }
  let progress = profile.topicProgress ? { ...profile.topicProgress } : undefined;
  let touched = false;
  for (const [topic, { answered, correct }] of byTopic.entries()) {
    if (answered < MIN_SESSION_SAMPLES_FOR_SNAPSHOT) continue;
    progress = appendTopicSnapshot(progress, topic, {
      at,
      source: "session",
      accuracy: (correct / answered) * 100,
      sampleSize: answered,
    });
    touched = true;
  }
  if (!touched || !progress) return profile;
  return {
    ...profile,
    topicProgress: progress,
    lastKnownLevel: recomputeLastKnownLevels(progress),
  };
}

/**
 * Minimal shape needed to ingest one past exam from `examHistory.ts`
 * without importing it (keeps userProfile testable in isolation and
 * avoids a runtime dependency on storage we don't own).
 */
export interface ExamHistoryEntryLike {
  timestamp: number;
  examKind?: string;
  categoryPerformance: DiagnosticCategoryInput[];
}

/**
 * PURE: ingest an array of past exams (newest- or oldest-first; order
 * doesn't matter — the timeline is normalized). Each (topic, timestamp)
 * pair is idempotent so calling this on every page load is safe — only
 * truly new events grow the series.
 *
 * This is the "previous exams" leg of the data combine: it lets
 * historical attempts contribute to improvement tracking even though
 * exam history lives in a separate storage key.
 */
export function reconcileExamHistoryToProfile(
  profile: UserProfile,
  history: ExamHistoryEntryLike[],
): UserProfile {
  if (!Array.isArray(history) || history.length === 0) return profile;
  let progress = profile.topicProgress ? { ...profile.topicProgress } : undefined;
  let touched = false;
  for (const entry of history) {
    if (!entry || !Array.isArray(entry.categoryPerformance)) continue;
    if (!Number.isFinite(entry.timestamp)) continue;
    const at = Math.floor(entry.timestamp);
    for (const cat of entry.categoryPerformance) {
      if (!cat || typeof cat.name !== "string" || !Number.isFinite(cat.percentage)) continue;
      const key = normalizeTopicKey(cat.name);
      if (!key) continue;
      // Pre-check existence by {at, source} — length growth is NOT a
      // reliable novelty signal, because at MAX_TOPIC_HISTORY a genuinely
      // new event displaces the oldest and length stays constant. Cheap
      // because each series is bounded at MAX_TOPIC_HISTORY (30).
      const existing = progress?.[key];
      if (existing) {
        if (existing.some((p) => p.at === at && p.source === "exam")) continue;
        // At cap with an older-than-head incoming event: it would be
        // displaced immediately on append. Treat as a no-op so reconcile
        // stays idempotent across page loads — otherwise a previously-
        // displaced event would be re-added every time, evicting the
        // newest tail and thrashing the series.
        if (existing.length >= MAX_TOPIC_HISTORY && at < existing[0].at) continue;
      }
      progress = appendTopicSnapshot(progress, key, {
        at,
        source: "exam",
        accuracy: Math.min(100, Math.max(0, cat.percentage)),
      });
      touched = true;
    }
  }
  if (!touched || !progress) return profile;
  return {
    ...profile,
    topicProgress: progress,
    lastKnownLevel: recomputeLastKnownLevels(progress),
  };
}

// =============================================================================
// Improvement & insight helpers — read-only views over the timeline.
// =============================================================================

export interface TopicImprovement {
  topic: string;
  /** Earliest snapshot in the series. */
  first: { at: number; accuracy: number; source: TopicProgressPoint["source"] };
  /** Latest snapshot in the series. */
  latest: { at: number; accuracy: number; source: TopicProgressPoint["source"] };
  /** latest.accuracy - first.accuracy. Positive = improving. */
  deltaPct: number;
  /** ±PROGRESS_TREND_THRESHOLD bucketed into one of three labels. */
  trend: "improving" | "declining" | "stable";
  /** Total snapshots backing this calculation. */
  sampleCount: number;
}

/**
 * Compute first-vs-latest improvement for a single topic. Returns null
 * when the topic has fewer than 2 snapshots — a single point can't show
 * a trend.
 */
export function getTopicImprovement(
  profile: UserProfile,
  topic: string,
): TopicImprovement | null {
  const series = profile.topicProgress?.[topic];
  if (!series || series.length < 2) return null;
  const first = series[0];
  const latest = series[series.length - 1];
  const deltaPct = latest.accuracy - first.accuracy;
  let trend: TopicImprovement["trend"];
  if (deltaPct >= PROGRESS_TREND_THRESHOLD) trend = "improving";
  else if (deltaPct <= -PROGRESS_TREND_THRESHOLD) trend = "declining";
  else trend = "stable";
  return {
    topic,
    first: { at: first.at, accuracy: first.accuracy, source: first.source },
    latest: { at: latest.at, accuracy: latest.accuracy, source: latest.source },
    deltaPct,
    trend,
    sampleCount: series.length,
  };
}

/** All topics with ≥2 snapshots, ranked by deltaPct descending (best first). */
export function getMostImproved(profile: UserProfile, n: number = TOP_N): TopicImprovement[] {
  const all = collectImprovements(profile).filter((i) => i.deltaPct > 0);
  all.sort((a, b) => {
    if (b.deltaPct !== a.deltaPct) return b.deltaPct - a.deltaPct;
    return a.topic.localeCompare(b.topic);
  });
  return all.slice(0, n);
}

/** All topics with ≥2 snapshots, ranked by deltaPct ascending (worst first). */
export function getMostDeclined(profile: UserProfile, n: number = TOP_N): TopicImprovement[] {
  const all = collectImprovements(profile).filter((i) => i.deltaPct < 0);
  all.sort((a, b) => {
    if (a.deltaPct !== b.deltaPct) return a.deltaPct - b.deltaPct;
    return a.topic.localeCompare(b.topic);
  });
  return all.slice(0, n);
}

function collectImprovements(profile: UserProfile): TopicImprovement[] {
  const progress = profile.topicProgress;
  if (!progress) return [];
  const out: TopicImprovement[] = [];
  for (const topic of Object.keys(progress)) {
    const imp = getTopicImprovement(profile, topic);
    if (imp) out.push(imp);
  }
  return out;
}

export interface ProgressInsights {
  /** Topics where the student has gained the most ground. */
  mostImproved: TopicImprovement[];
  /** Topics where the student has lost the most ground. */
  mostDeclined: TopicImprovement[];
  /** Latest known level for every tracked topic. */
  lastKnownLevels: Record<string, TopicLevel>;
  /** Number of distinct topics with at least one snapshot. */
  topicsTracked: number;
  /** True when at least one topic has ≥2 snapshots — needed for trend talk. */
  hasTrendData: boolean;
}

/** One-call summary suitable for "insights" surfaces or recommendation logic. */
export function getProgressInsights(profile: UserProfile): ProgressInsights {
  const lastKnownLevels = profile.lastKnownLevel ?? {};
  const all = collectImprovements(profile);
  const mostImproved = all
    .filter((i) => i.deltaPct > 0)
    .sort((a, b) => {
      if (b.deltaPct !== a.deltaPct) return b.deltaPct - a.deltaPct;
      return a.topic.localeCompare(b.topic);
    })
    .slice(0, TOP_N);
  const mostDeclined = all
    .filter((i) => i.deltaPct < 0)
    .sort((a, b) => {
      if (a.deltaPct !== b.deltaPct) return a.deltaPct - b.deltaPct;
      return a.topic.localeCompare(b.topic);
    })
    .slice(0, TOP_N);
  return {
    mostImproved,
    mostDeclined,
    lastKnownLevels,
    topicsTracked: Object.keys(profile.topicProgress ?? {}).length,
    hasTrendData: all.length > 0,
  };
}

// =============================================================================
// Cross-session reinforcement — surfaces topics that should be repeated
// in the next training session because they're declining or stuck weak,
// AND haven't yet shown improvement. The cap prevents infinite repetition.
// =============================================================================

/**
 * Hard cap on consecutive sessions a topic can be a reinforcement
 * candidate without showing improvement. Once a topic's
 * `reinforcementStreak` reaches this value it is dropped from the
 * candidate list and normal selection takes over for the next session.
 *
 * Rationale: 3 reinforced sessions ≈ 30+ targeted questions. If a
 * student still hasn't improved after that, more drills probably won't
 * fix it — they need a different format (lesson, hint, AI coach), so
 * we hand control back to the default flow rather than loop forever.
 */
const MAX_REINFORCEMENT_STREAK = 3;

export interface ReinforcementCandidate {
  /** Topic slug (already normalized through the same map sessions use). */
  topic: string;
  /**
   * Why this topic was picked.
   *   - `declining`             — accuracy is trending down across recent sessions
   *   - `weak-no-improvement`   — latest session level is weak AND no recent session
   *                               showed an improvement step
   */
  reason: "declining" | "weak-no-improvement";
  /**
   * Number of consecutive recent session-source snapshots WITHOUT an
   * improvement step (delta ≥ PROGRESS_TREND_THRESHOLD over the prior
   * snapshot). Used by the cap — when it hits MAX_REINFORCEMENT_STREAK
   * the topic is dropped from candidacy.
   */
  reinforcementStreak: number;
  /** Latest session-derived accuracy, exposed for sort + diagnostics. */
  latestAccuracy: number;
  /** Total session-source snapshots backing the calculation. */
  sessionSampleCount: number;
}

/**
 * Walk the session-source snapshots backwards counting consecutive
 * steps WITHOUT improvement. An "improvement step" is a positive
 * accuracy delta of at least PROGRESS_TREND_THRESHOLD over the prior
 * session snapshot. Returns 0 when the most recent transition was an
 * improvement.
 */
function computeReinforcementStreak(sessionSnapshots: TopicProgressPoint[]): number {
  if (sessionSnapshots.length < 2) return 0;
  let streak = 0;
  for (let i = sessionSnapshots.length - 1; i > 0; i--) {
    const cur = sessionSnapshots[i];
    const prev = sessionSnapshots[i - 1];
    if (cur.accuracy - prev.accuracy >= PROGRESS_TREND_THRESHOLD) break;
    streak++;
  }
  return streak;
}

/**
 * Topics that should be repeated in the next session because they're
 * either trending down or stuck weak, AND haven't yet shown improvement.
 *
 * - "Declined in last 2 sessions" is operationalized as: ≥3 session
 *   snapshots where the last two transitions are both negative
 *   (S3 < S2 AND S2 < S1), OR the net 2-session change is at least
 *   PROGRESS_TREND_THRESHOLD downward (S3 - S1 ≤ -PROGRESS_TREND_THRESHOLD).
 *   With exactly 2 session snapshots, a single significant drop
 *   (S2 - S1 ≤ -PROGRESS_TREND_THRESHOLD) qualifies — we don't wait
 *   another session before reacting.
 * - "Weak with no improvement" picks up topics that aren't actively
 *   declining but are stuck at the weak level (accuracy < 50) for at
 *   least 2 consecutive session snapshots without any improvement step.
 *
 * Reinforcement is gated by the cap: when a topic's streak reaches
 * MAX_REINFORCEMENT_STREAK we stop reinforcing it (no infinite
 * repetition) and the next call returns it only if the streak has
 * since been reset by an improvement step.
 *
 * Sorted by streak DESC (most stuck first), then latestAccuracy ASC
 * (weakest first), then topic for deterministic tie-breaks. Capped at
 * `n` results so callers can compose this with other prioritization
 * sources without flooding the preferred-topic list.
 */
export function getReinforcementTopics(
  profile: UserProfile,
  n: number = TOP_N,
): ReinforcementCandidate[] {
  const progress = profile.topicProgress;
  if (!progress) return [];

  const candidates: ReinforcementCandidate[] = [];
  for (const [topic, series] of Object.entries(progress)) {
    // Practice sessions are the relevant signal for cross-session
    // reinforcement — exam / diagnostic snapshots fire too rarely to
    // drive a per-session decision and would hijack the streak math.
    const sessionSnapshots = series.filter((p) => p.source === "session");
    if (sessionSnapshots.length < 2) continue;

    const latest = sessionSnapshots[sessionSnapshots.length - 1];
    const prior = sessionSnapshots[sessionSnapshots.length - 2];
    const earlier = sessionSnapshots.length >= 3
      ? sessionSnapshots[sessionSnapshots.length - 3]
      : null;

    const streak = computeReinforcementStreak(sessionSnapshots);
    // Cap — once we've been a candidate for MAX_REINFORCEMENT_STREAK
    // sessions in a row without improvement, we step aside so the user
    // gets variety. Normal selection (diagnostic / weakest topics) will
    // still surface the topic if appropriate; we just stop forcing it.
    if (streak >= MAX_REINFORCEMENT_STREAK) continue;

    // Improvement-detected gate. `computeReinforcementStreak` returns 0
    // when the most recent transition was an improvement step
    // (delta ≥ PROGRESS_TREND_THRESHOLD). When that happens, the topic
    // must drop from candidacy — even if a non-monotonic earlier dip
    // would otherwise satisfy the net-drop branch below (e.g.
    // S1=90, S2=20, S3=30 → +10 latest step → streak 0 → drop). This
    // is the "repeat WEAK topics until improvement detected" guarantee.
    if (streak === 0) continue;

    let reason: ReinforcementCandidate["reason"] | null = null;

    // ----- "Declining in last 2 sessions" detection -----
    // The streak === 0 short-circuit above guarantees the most recent
    // transition was NOT an improvement, so any decline rule that
    // matches here describes a real ongoing problem (not a rebound).
    if (earlier) {
      const monotonicDecline =
        latest.accuracy < prior.accuracy && prior.accuracy < earlier.accuracy;
      const netDrop =
        latest.accuracy - earlier.accuracy <= -PROGRESS_TREND_THRESHOLD;
      if (monotonicDecline || netDrop) reason = "declining";
    } else {
      // Only 2 session snapshots — a single significant drop counts so
      // we don't wait another session before reinforcing.
      const singleDrop =
        latest.accuracy - prior.accuracy <= -PROGRESS_TREND_THRESHOLD;
      if (singleDrop) reason = "declining";
    }

    // ----- "Weak with no improvement" detection -----
    // Catches plateaued-low topics that aren't actively declining but
    // are stuck below the weak threshold. The streak >= 1 invariant
    // is already established by the short-circuit above, so the only
    // remaining check is that both recent snapshots are at the weak
    // level — preventing a brand-new weak datapoint from triggering.
    if (
      reason === null &&
      levelFromAccuracy(latest.accuracy) === "weak" &&
      levelFromAccuracy(prior.accuracy) === "weak"
    ) {
      reason = "weak-no-improvement";
    }

    if (reason === null) continue;

    candidates.push({
      topic,
      reason,
      reinforcementStreak: streak,
      latestAccuracy: latest.accuracy,
      sessionSampleCount: sessionSnapshots.length,
    });
  }

  candidates.sort((a, b) => {
    if (b.reinforcementStreak !== a.reinforcementStreak) {
      return b.reinforcementStreak - a.reinforcementStreak;
    }
    if (a.latestAccuracy !== b.latestAccuracy) {
      return a.latestAccuracy - b.latestAccuracy;
    }
    return a.topic.localeCompare(b.topic);
  });

  return candidates.slice(0, n);
}

/** Constants exposed for tests and future tuning. */
export const __profileConstants = {
  STORAGE_KEY,
  PROFILE_VERSION,
  TOPIC_MIN_SAMPLES,
  TOP_N,
  MAX_TOPIC_HISTORY,
  MIN_SESSION_SAMPLES_FOR_SNAPSHOT,
  PROGRESS_TREND_THRESHOLD,
  MAX_REINFORCEMENT_STREAK,
};
