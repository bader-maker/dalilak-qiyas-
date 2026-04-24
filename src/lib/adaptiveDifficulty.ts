/**
 * Adaptive difficulty for training sessions.
 *
 * Pure helpers — no React, no localStorage, no UI. The practice page calls
 * these every N answered questions to re-rank the *upcoming* slice of an
 * in-flight session so that the next batch skews toward the difficulty that
 * matches the user's current performance:
 *
 *   accuracy < 50%      → favor EASY     (rebuild confidence)
 *   accuracy 50%–80%    → favor MEDIUM   (steady challenge)
 *   accuracy > 80%      → favor HARD     (push the ceiling)
 *
 * The selection always keeps a 30% spread of OTHER difficulties so the user
 * doesn't get locked into a single tier and to avoid pattern-overfitting.
 *
 * Critically:
 *   - Only re-orders questions that haven't been answered yet. The current
 *     question, and every question already answered, are NEVER touched.
 *   - Never expands or shrinks the upcoming length — it's always exactly
 *     `count` items, so the practice page's progress bar / question count
 *     stays stable and the UI doesn't shift.
 *   - Falls back gracefully when the candidate pool can't satisfy the target
 *     mix (e.g. only 2 "hard" questions exist for the topic): missing slots
 *     are backfilled from the other difficulties, and the `count` is always
 *     honored if the union of upcoming + pool can supply it.
 *   - Anti-repetition (recentIds across sessions) and topic prioritization
 *     (weak topics) are preserved as inner sort keys inside each tier — this
 *     module does NOT override the outer pipeline, it composes on top of it.
 */

import type { TrainingQuestion } from "@/lib/trainingEngine";

export type Difficulty = "easy" | "medium" | "hard";

/**
 * Per-question speed bucket derived from `timeSpent` vs the speed
 * thresholds. "fast" = answered well under the allotted time (likely
 * confident or guessing); "slow" = took a long time (likely struggling
 * or thinking carefully); "normal" = anything in between.
 */
export type SpeedBucket = "fast" | "normal" | "slow";

/**
 * Speed thresholds in seconds. Tuned for the practice page's 90-second
 * countdown: ≤15s ≈ ≤17% of the allotted time (very fast), ≥45s ≈ ≥50%
 * (slow / careful). Exposed as constants so future tuning (e.g. per-section
 * thresholds) doesn't require touching the rule logic.
 */
export const FAST_SECONDS = 15;
export const SLOW_SECONDS = 45;

/** Tier order used by the adjustment math. Lower index = easier. */
const TIER_ORDER: Difficulty[] = ["easy", "medium", "hard"];

/** Move `d` by `steps` along TIER_ORDER, clamped to the endpoints. */
function shiftDifficulty(d: Difficulty, steps: number): Difficulty {
  const idx = TIER_ORDER.indexOf(d);
  const next = Math.max(0, Math.min(TIER_ORDER.length - 1, idx + steps));
  return TIER_ORDER[next];
}

export interface Performance {
  /** Overall accuracy across all answered questions, 0–100. */
  accuracy: number;
  /** Accuracy over the most recent `windowSize` answered, 0–100. */
  recentAccuracy: number;
  /** Consecutive correct answers at the tail of the answered list. */
  recentStreak: number;
  /** How many questions the user has answered so far. */
  answeredCount: number;
  /**
   * Difficulty the next batch should favor.
   *
   * Computed by taking the accuracy-derived "base" target and then applying
   * signal-based adjustments (speed and hint usage) when those signals are
   * available. Without `times`/`hints` this collapses to the original
   * accuracy-only behavior, so existing callers see no change.
   */
  targetDifficulty: Difficulty;
  /** The base (accuracy-only) target before signal adjustments were applied. */
  baseDifficulty: Difficulty;
  /** Net adjustment steps applied (positive = harder, negative = easier). */
  difficultyAdjustment: number;
  /** Recent-window aggregates exposed for transparency / future tuning. */
  recentSignals: {
    /** Fraction of the recent window answered fast and correct, 0–1. */
    fastCorrectRate: number;
    /** Fraction answered fast but wrong (likely guessing), 0–1. */
    fastWrongRate: number;
    /** Fraction answered slow but correct (knows it but slow), 0–1. */
    slowCorrectRate: number;
    /** Fraction of the window where the user revealed the hint, 0–1. */
    hintRate: number;
    /** Recent window size actually observed (≤ windowSize). */
    sampleSize: number;
  };
}

/**
 * Build a performance snapshot from the in-flight session.
 *
 * `answers[i]` is null when the user hasn't answered question `i` yet —
 * those slots are skipped, so the helper works whether the user answered
 * sequentially or jumped around.
 *
 * Optional signal arrays (`times`, `hints`) MUST be parallel to `answers`
 * (same indexing) when provided. Missing entries (null/undefined) are
 * treated as "no signal" — they don't crash the calculation and they don't
 * count toward fast/slow/hint rates.
 *
 * Adjustment rules (applied AFTER the base accuracy target is chosen):
 *   - fastWrongRate ≥ 40%  → step EASIER  ("guessing under time pressure")
 *   - hintRate ≥ 40%       → step EASIER  ("relying on hints to get through")
 *   - fastCorrectRate ≥ 60% → step HARDER ("mastering quickly — push faster")
 *   - slowCorrectRate ≥ 50% AND fastCorrectRate < 40% AND base = HARD
 *                          → step EASIER ("understands but slow — back off to medium")
 *
 * The total adjustment is clamped to [-2, +2] so even strong signals can
 * only move the target by at most one full tier away from the accuracy
 * base on any single re-evaluation. This keeps the system responsive
 * without thrashing across tiers.
 */
export function summarizePerformance(
  answers: (number | null)[],
  questions: { correct: number }[],
  times?: (number | null | undefined)[],
  hints?: (boolean | null | undefined)[],
  windowSize = 5,
): Performance {
  // Pair each answer with its question (and optional signals) to score it.
  // We filter on `a != null` rather than truthy so answer-index 0 (a valid
  // choice) still counts.
  type Scored = {
    isCorrect: boolean;
    timeSpent: number | null;
    hintUsed: boolean;
  };
  const scored: Scored[] = [];
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    const q = questions[i];
    if (a == null || !q) continue;
    const t = times?.[i];
    const h = hints?.[i];
    scored.push({
      isCorrect: a === q.correct,
      timeSpent: typeof t === "number" ? t : null,
      hintUsed: h === true,
    });
  }

  const answeredCount = scored.length;
  const totalCorrect = scored.filter((s) => s.isCorrect).length;
  const accuracy =
    answeredCount > 0 ? Math.round((totalCorrect / answeredCount) * 100) : 0;

  // Recent window — last `windowSize` answers. When fewer are available we
  // use what we have so the helper produces something sensible after just
  // 1–2 answers (used by the streak; the practice page only triggers
  // adaptation after answeredCount is a positive multiple of windowSize).
  const window = scored.slice(-windowSize);
  const recentCorrect = window.filter((s) => s.isCorrect).length;
  const recentAccuracy =
    window.length > 0 ? Math.round((recentCorrect / window.length) * 100) : 0;

  // Recent streak counted backwards from the last answered question.
  let recentStreak = 0;
  for (let i = scored.length - 1; i >= 0; i--) {
    if (scored[i].isCorrect) recentStreak++;
    else break;
  }

  // ----- Base target from accuracy alone (original spec rules) -----
  // Boundary picks:
  //   accuracy === 50 → MEDIUM (the 50–80 band is inclusive of 50)
  //   accuracy === 80 → MEDIUM (HARD requires strictly > 80)
  // This avoids flapping between MEDIUM and HARD on small windows where the
  // accuracy lands exactly on the boundary.
  let baseDifficulty: Difficulty;
  if (accuracy < 50) baseDifficulty = "easy";
  else if (accuracy <= 80) baseDifficulty = "medium";
  else baseDifficulty = "hard";

  // ----- Signal-based aggregates over the recent window -----
  // Only entries with a numeric `timeSpent` count toward speed rates;
  // otherwise the user could be artificially slowed by, say, a long
  // explanation modal. Hint rate counts ALL window entries (the absence
  // of a hint signal is "no hint").
  const speedSamples = window.filter((s) => s.timeSpent !== null);
  const fastCorrect = speedSamples.filter(
    (s) => s.isCorrect && (s.timeSpent ?? Infinity) <= FAST_SECONDS,
  ).length;
  const fastWrong = speedSamples.filter(
    (s) => !s.isCorrect && (s.timeSpent ?? Infinity) <= FAST_SECONDS,
  ).length;
  const slowCorrect = speedSamples.filter(
    (s) => s.isCorrect && (s.timeSpent ?? -1) >= SLOW_SECONDS,
  ).length;
  const hintCount = window.filter((s) => s.hintUsed).length;

  const speedDenom = Math.max(1, speedSamples.length);
  const windowDenom = Math.max(1, window.length);

  const recentSignals = {
    fastCorrectRate: speedSamples.length > 0 ? fastCorrect / speedDenom : 0,
    fastWrongRate: speedSamples.length > 0 ? fastWrong / speedDenom : 0,
    slowCorrectRate: speedSamples.length > 0 ? slowCorrect / speedDenom : 0,
    hintRate: window.length > 0 ? hintCount / windowDenom : 0,
    sampleSize: window.length,
  };

  // ----- Adjustment math -----
  // Each rule contributes a small step. We sum the steps and clamp the
  // total to [-2, +2] so a single re-evaluation can move at most one
  // full tier away from the accuracy base. Adjustments only trigger when
  // we have ≥3 samples in the window, otherwise the signals are too
  // noisy to act on.
  let difficultyAdjustment = 0;
  if (window.length >= 3) {
    // Step EASIER when the user looks like they're guessing fast.
    if (recentSignals.fastWrongRate >= 0.4) difficultyAdjustment -= 1;

    // Step EASIER when the user is leaning heavily on hints.
    if (recentSignals.hintRate >= 0.4) difficultyAdjustment -= 1;

    // Step HARDER when the user is fast AND correct most of the time —
    // "increase difficulty faster" per spec. We require a strong rate
    // (≥60%) so a single fast-correct doesn't bump them up.
    if (recentSignals.fastCorrectRate >= 0.6) difficultyAdjustment += 1;

    // Special case: user is mostly slow-but-correct AND base says HARD.
    // They DO know the material (hence high accuracy) but they're not
    // fluent enough yet. Pull back to MEDIUM so they can build speed
    // without getting demoralized by hard problems they can't finish.
    if (
      baseDifficulty === "hard" &&
      recentSignals.slowCorrectRate >= 0.5 &&
      recentSignals.fastCorrectRate < 0.4
    ) {
      difficultyAdjustment -= 1;
    }
  }

  // Clamp the cumulative adjustment so we never skip past medium.
  difficultyAdjustment = Math.max(-2, Math.min(2, difficultyAdjustment));

  const targetDifficulty = shiftDifficulty(baseDifficulty, difficultyAdjustment);

  return {
    accuracy,
    recentAccuracy,
    recentStreak,
    answeredCount,
    targetDifficulty,
    baseDifficulty,
    difficultyAdjustment,
    recentSignals,
  };
}

interface ComposeOptions {
  /** Questions already chosen for the session that the user hasn't answered yet. */
  upcoming: TrainingQuestion[];
  /** Full enriched section pool — used to source extras when `upcoming` lacks the target mix. */
  candidatePool: TrainingQuestion[];
  /**
   * Question IDs we must NEVER include — typically the union of:
   *   - questions already answered (and the current question)
   *   - any IDs the caller wants to keep out
   */
  excludeIds: ReadonlySet<string>;
  /** IDs from previous sessions; preferred-against (fresh > stale), but not excluded. */
  recentIds: ReadonlySet<string>;
  /** Difficulty bucket to favor for ~70% of the slots. */
  target: Difficulty;
  /** Exact number of questions to return. */
  count: number;
  /** Optional weak-topic set; matching items get sorted ahead inside each tier. */
  topicPriority?: ReadonlySet<string>;
  /** Pass-through to the page's `diversifyOrder` so we don't re-implement it. */
  diversify: (qs: TrainingQuestion[]) => TrainingQuestion[];
  /** Pass-through to the page's `shuffle`. Caller controls determinism. */
  shuffle: <T>(arr: T[]) => T[];
  /**
   * Fraction of slots reserved for the target difficulty (rest is mixed).
   * Defaults to 0.7 per spec ("70% target / 30% mixed").
   */
  targetRatio?: number;
}

/**
 * Re-compose the upcoming slice so it skews `target` per `targetRatio`,
 * preserving anti-repetition and topic prioritization as tie-breakers.
 *
 * Algorithm:
 *   1. Build the available pool = (upcoming ∪ candidatePool) − excludeIds,
 *      deduplicated by id. Upcoming items are kept first inside each tier
 *      so we minimize churn (avoid swapping items that were already going
 *      to be shown soon).
 *   2. Decide bucket sizes: targetN = round(count * targetRatio),
 *      otherN = count - targetN.
 *   3. For each bucket (target then other), sort candidates by a 4-tier
 *      key: priority-topic + fresh > priority-topic + stale > other + fresh
 *      > other + stale. Inside each tier the caller's `shuffle` decides
 *      order. Take up to bucket size.
 *   4. Fallback chain when a bucket runs short:
 *      a. Target short → fill remaining with any-difficulty using the same
 *         tier ordering (so we hit `count`).
 *      b. Other short → fill remaining with target-difficulty extras.
 *      c. Both pools combined still short → return whatever we have. The
 *         caller will then keep more of the original upcoming or just run
 *         a shorter session — either way no crash.
 *   5. Concat target + other and pass through `diversify` so two adjacent
 *      questions don't share strategy/subtype.
 */
export function composeUpcomingByDifficulty(
  opts: ComposeOptions,
): TrainingQuestion[] {
  const {
    upcoming,
    candidatePool,
    excludeIds,
    recentIds,
    target,
    count,
    topicPriority,
    diversify,
    shuffle,
    targetRatio = 0.7,
  } = opts;

  if (count <= 0) return [];

  // Step 1 — available pool, deduped, upcoming-first to minimize churn.
  // Map.set won't overwrite an existing key when called with the same id,
  // so iterating upcoming first guarantees an upcoming reference wins.
  const byId = new Map<string, TrainingQuestion>();
  for (const q of upcoming) {
    if (excludeIds.has(q.id)) continue;
    byId.set(q.id, q);
  }
  for (const q of candidatePool) {
    if (excludeIds.has(q.id)) continue;
    if (!byId.has(q.id)) byId.set(q.id, q);
  }
  const available = Array.from(byId.values());

  if (available.length === 0) return [];

  // Helper — sort a slice by the 4-tier key (priority+fresh > priority+stale
  // > other+fresh > other+stale). Inside each tier we shuffle so two runs
  // of the helper don't always produce the same ordering.
  const tieredOrder = (qs: TrainingQuestion[]): TrainingQuestion[] => {
    const isPriority = (q: TrainingQuestion) =>
      !!topicPriority && topicPriority.has(q.topic);
    const isFresh = (q: TrainingQuestion) => !recentIds.has(q.id);

    const tier1 = qs.filter((q) => isPriority(q) && isFresh(q));
    const tier2 = qs.filter((q) => isPriority(q) && !isFresh(q));
    const tier3 = qs.filter((q) => !isPriority(q) && isFresh(q));
    const tier4 = qs.filter((q) => !isPriority(q) && !isFresh(q));
    return [
      ...shuffle(tier1),
      ...shuffle(tier2),
      ...shuffle(tier3),
      ...shuffle(tier4),
    ];
  };

  // Step 2 — bucket sizes. We round the target bucket; the other bucket
  // takes the remainder so target + other always equals count.
  const targetN = Math.round(count * targetRatio);
  const otherN = count - targetN;

  // Step 3 — fill each bucket from its native difficulty pool.
  const targetPool = available.filter((q) => q.difficulty === target);
  const otherPool = available.filter((q) => q.difficulty !== target);

  const targetOrdered = tieredOrder(targetPool);
  const otherOrdered = tieredOrder(otherPool);

  let targetPick = targetOrdered.slice(0, targetN);
  let otherPick = otherOrdered.slice(0, otherN);

  // Step 4 — fallback chain. Track which IDs are already picked so we
  // don't double-include when refilling across difficulty boundaries.
  const pickedIds = new Set<string>([
    ...targetPick.map((q) => q.id),
    ...otherPick.map((q) => q.id),
  ]);

  // 4a: target short → refill from other-difficulty leftovers
  if (targetPick.length < targetN) {
    const need = targetN - targetPick.length;
    const refill = otherOrdered
      .filter((q) => !pickedIds.has(q.id))
      .slice(0, need);
    targetPick = [...targetPick, ...refill];
    refill.forEach((q) => pickedIds.add(q.id));
  }

  // 4b: other short → refill from target-difficulty leftovers
  if (otherPick.length < otherN) {
    const need = otherN - otherPick.length;
    const refill = targetOrdered
      .filter((q) => !pickedIds.has(q.id))
      .slice(0, need);
    otherPick = [...otherPick, ...refill];
    refill.forEach((q) => pickedIds.add(q.id));
  }

  // Step 5 — concat and diversify. We diversify the COMBINED list so the
  // 70/30 mix is interleaved (otherwise all target items would clump at
  // the front and all other items at the end).
  const combined = [...targetPick, ...otherPick];
  return diversify(combined).slice(0, count);
}
