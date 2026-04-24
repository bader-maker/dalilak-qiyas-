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
