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

export interface Performance {
  /** Overall accuracy across all answered questions, 0–100. */
  accuracy: number;
  /** Accuracy over the most recent `windowSize` answered, 0–100. */
  recentAccuracy: number;
  /** Consecutive correct answers at the tail of the answered list. */
  recentStreak: number;
  /** How many questions the user has answered so far. */
  answeredCount: number;
  /** Difficulty the next batch should favor based on `accuracy`. */
  targetDifficulty: Difficulty;
}

/**
 * Build a performance snapshot from the in-flight session.
 *
 * `answers[i]` is null when the user hasn't answered question `i` yet —
 * those slots are skipped, so the helper works whether the user answered
 * sequentially or jumped around.
 */
export function summarizePerformance(
  answers: (number | null)[],
  questions: { correct: number }[],
  windowSize = 5,
): Performance {
  // Pair each answer with its question to score it. We filter on
  // `a != null` rather than truthy so answer-index 0 (a valid choice)
  // still counts.
  const scored: { isCorrect: boolean }[] = [];
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    const q = questions[i];
    if (a == null || !q) continue;
    scored.push({ isCorrect: a === q.correct });
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

  // Thresholds match the spec exactly. Boundary picks:
  //   accuracy === 50 → MEDIUM (the 50–80 band is inclusive of 50)
  //   accuracy === 80 → MEDIUM (HARD requires strictly > 80)
  // This avoids flapping between MEDIUM and HARD on small windows where the
  // accuracy lands exactly on the boundary.
  let targetDifficulty: Difficulty;
  if (accuracy < 50) targetDifficulty = "easy";
  else if (accuracy <= 80) targetDifficulty = "medium";
  else targetDifficulty = "hard";

  return {
    accuracy,
    recentAccuracy,
    recentStreak,
    answeredCount,
    targetDifficulty,
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
