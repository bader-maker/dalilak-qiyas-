// Minimal localStorage-backed history of past full exams.
//
// - Stores at most MAX_ENTRIES of the most recent full-exam snapshots.
// - Snapshots are deliberately small (score + per-category percentages + meta)
//   so the cap on localStorage is irrelevant in practice.
// - NEVER fabricates entries; the result page reads what is actually saved
//   and shows an empty-state message if nothing exists yet.
//
// This is the ONLY persistence layer for full-exam history — there is no
// server table for it today, so all reads/writes happen on the client.

export type ExamHistoryCategory = {
  name: string;
  section?: string;
  percentage: number;
};

export type ExamHistoryEntry = {
  // Stable UUID-ish id so React keys are stable across re-reads.
  id: string;
  // Epoch ms when the exam was completed.
  timestamp: number;
  // Free-form discriminator ("qudrat", "tahsili", "saat", "gat", "generic").
  // Only entries with the same examKind are compared — comparing a 530-q GAT
  // to a 100-q Tahsili would be misleading.
  examKind: string;
  // Total percentage score (0-100).
  score: number;
  // Estimated Qiyas-scale score (0-100). Stored so the previous-vs-current
  // comparison can show the same metric the result page already prints.
  estimatedScore?: number;
  // Average seconds per question across the whole exam.
  avgTimePerQuestion?: number;
  // Per-category breakdown — used for "most improved / most declined topic".
  categoryPerformance: ExamHistoryCategory[];
};

const STORAGE_KEY = "qiyas_full_exam_history_v1";
const MAX_ENTRIES = 10;

function safeRead(): ExamHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Trust-but-verify: keep only entries that look structurally valid.
    return parsed.filter(
      (e): e is ExamHistoryEntry =>
        e &&
        typeof e === "object" &&
        typeof e.id === "string" &&
        typeof e.timestamp === "number" &&
        typeof e.examKind === "string" &&
        typeof e.score === "number" &&
        Array.isArray(e.categoryPerformance),
    );
  } catch {
    return [];
  }
}

function safeWrite(entries: ExamHistoryEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* localStorage full/disabled — ignore, history just won't persist */
  }
}

export function loadHistory(): ExamHistoryEntry[] {
  // Newest first.
  return safeRead().sort((a, b) => b.timestamp - a.timestamp);
}

export function saveExamResult(
  entry: Omit<ExamHistoryEntry, "id" | "timestamp"> & {
    id?: string;
    timestamp?: number;
  },
): ExamHistoryEntry {
  const full: ExamHistoryEntry = {
    id:
      entry.id ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: entry.timestamp ?? Date.now(),
    examKind: entry.examKind,
    score: entry.score,
    estimatedScore: entry.estimatedScore,
    avgTimePerQuestion: entry.avgTimePerQuestion,
    categoryPerformance: entry.categoryPerformance,
  };
  const all = [full, ...safeRead()].slice(0, MAX_ENTRIES);
  safeWrite(all);
  return full;
}

// Returns the most recent OTHER entry of the same examKind. Null if none.
// `excludeId` is provided so that immediately after saving the current exam
// we don't accidentally compare it to itself.
export function getPreviousExam(
  examKind: string,
  excludeId?: string,
): ExamHistoryEntry | null {
  const all = loadHistory();
  for (const e of all) {
    if (e.examKind !== examKind) continue;
    if (excludeId && e.id === excludeId) continue;
    return e;
  }
  return null;
}

// Compare two exams (current vs previous) by category. Returns the topic
// where the percentage rose the most ("mostImproved") and where it fell the
// most ("mostDeclined"). Only categories present in BOTH exams are scored.
// If no overlap → both undefined.
export function diffExams(
  current: ExamHistoryCategory[],
  previous: ExamHistoryCategory[],
): {
  scoreDelta?: number;
  mostImproved?: { name: string; delta: number };
  mostDeclined?: { name: string; delta: number };
} {
  const prevMap = new Map(previous.map((p) => [p.name, p.percentage]));
  let bestUp: { name: string; delta: number } | undefined;
  let bestDown: { name: string; delta: number } | undefined;
  for (const c of current) {
    const prev = prevMap.get(c.name);
    if (typeof prev !== "number") continue;
    const delta = c.percentage - prev;
    if (!bestUp || delta > bestUp.delta) bestUp = { name: c.name, delta };
    if (!bestDown || delta < bestDown.delta) bestDown = { name: c.name, delta };
  }
  return {
    mostImproved: bestUp && bestUp.delta > 0 ? bestUp : undefined,
    mostDeclined: bestDown && bestDown.delta < 0 ? bestDown : undefined,
  };
}

// =============================================================================
// summarizeProgress
//
// One-line, user-facing progress sentence comparing the just-finished exam
// against the most recent previous exam of the same examKind. Returns null
// when there's nothing meaningful to say (no prior data, or change is too
// small to be informative).
//
// Why a separate helper (vs reusing diffExams directly):
//   - Result pages get a single Arabic / English string they can drop into a
//     tiny badge without re-deriving the "is it improvement or decline?",
//     "do we have any signal?", or "fall back to overall score?" logic each
//     time. Centralizing it guarantees consistent thresholds and copy across
//     /test-gat, the shared TestEngine (Tahsili + SAAT), and any future page.
//
// Selection rule (single-message constraint per spec — "Keep it short"):
//   1. If no previous entry → null (no comparison possible).
//   2. Compute per-category diff. Pick the category with the LARGEST
//      absolute delta (improvement OR decline). Threshold: |delta| ≥ 5.
//      This avoids reporting a 1–2% wobble that's basically noise on a
//      short test.
//   3. If no per-category signal qualifies (categories don't overlap, or
//      every change is < 5%), fall back to overall score delta. Threshold:
//      |scoreDelta| ≥ 3. Lower because the overall score is averaged over
//      all questions and is statistically more stable.
//   4. If even the score change is below threshold → null. The user
//      maintained roughly the same performance; saying "you went up 1%"
//      is misleading.
// =============================================================================
type ProgressSummaryArgs = {
  current: ExamHistoryCategory[];
  previous: ExamHistoryCategory[];
  currentScore: number;
  previousScore: number;
  locale: "ar" | "en";
};

export function summarizeProgress(args: ProgressSummaryArgs): {
  message: string;
  direction: "up" | "down";
} | null {
  const { current, previous, currentScore, previousScore, locale } = args;

  // Per-category dominant signal — pick the single biggest absolute change.
  const prevMap = new Map(previous.map((p) => [p.name, p.percentage]));
  let dominant: { name: string; delta: number } | null = null;
  for (const c of current) {
    const prev = prevMap.get(c.name);
    if (typeof prev !== "number") continue;
    const delta = c.percentage - prev;
    if (!dominant || Math.abs(delta) > Math.abs(dominant.delta)) {
      dominant = { name: c.name, delta };
    }
  }

  const TOPIC_THRESHOLD = 5;
  const SCORE_THRESHOLD = 3;

  if (dominant && Math.abs(dominant.delta) >= TOPIC_THRESHOLD) {
    const up = dominant.delta > 0;
    // Always render the magnitude in the sentence ("by 15%", not "by -15%").
    // Direction is conveyed by the verb ("Improved" / "Declined" / "تحسّنت" /
    // "تراجعت") and by the up/down arrow added by the consumer using the
    // returned `direction`. This keeps the copy grammatical in both AR and EN.
    const magnitude = `${Math.abs(Math.round(dominant.delta))}%`;
    const msg =
      locale === "ar"
        ? up
          ? `تحسّنت في ${dominant.name} بنسبة ${magnitude} منذ المحاولة السابقة`
          : `تراجعت في ${dominant.name} بنسبة ${magnitude} منذ المحاولة السابقة`
        : up
          ? `Improved in ${dominant.name} by ${magnitude} since your last attempt`
          : `Declined in ${dominant.name} by ${magnitude} since your last attempt`;
    return { message: msg, direction: up ? "up" : "down" };
  }

  // Fallback: overall score change when no per-category signal qualifies.
  const scoreDelta = currentScore - previousScore;
  if (Math.abs(scoreDelta) >= SCORE_THRESHOLD) {
    const up = scoreDelta > 0;
    const magnitude = `${Math.abs(Math.round(scoreDelta))}%`;
    const msg =
      locale === "ar"
        ? up
          ? `تحسّن أداؤك العام بنسبة ${magnitude} منذ المحاولة السابقة`
          : `تراجع أداؤك العام بنسبة ${magnitude} منذ المحاولة السابقة`
        : up
          ? `Overall score improved by ${magnitude} since your last attempt`
          : `Overall score declined by ${magnitude} since your last attempt`;
    return { message: msg, direction: up ? "up" : "down" };
  }

  // Same performance (within thresholds) — surface nothing rather than a
  // misleading "you went up 1%" message.
  return null;
}
