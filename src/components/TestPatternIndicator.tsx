"use client";

// Behavioral pattern classifier — derived purely from the student's in-session
// answer + timing data. NO AI call, NO network, NO cost.
//
// Returns one of the four spec patterns:
//   - سريع لكنه غير دقيق  (fast but inaccurate)
//   - دقيق لكنه بطيء       (accurate but slow)
//   - متردد                 (hesitant)
//   - يعتمد على التخمين     (relies on guessing)
//
// The component stays silent until the student has answered at least 5
// questions in the current session, mirroring the trigger threshold of the
// mid-session AI coach card so the two surface together.

type Props = {
  // For each question slot in the current session: the student's chosen
  // option index (or null if not yet answered).
  answers: (number | null)[];
  // Parallel array of correct option indexes for the same slots.
  correctAnswers: number[];
  // Parallel array of seconds the student spent on each question (only valid
  // for indexes where `answers[i] != null`).
  times: (number | null)[];
};

type Pattern = {
  key: "fast-inaccurate" | "accurate-slow" | "hesitant" | "guessing";
  label: string;       // Arabic title — exactly as specified
  explanation: string; // brief one-sentence rationale
  emoji: string;
  color: string;       // Tailwind classes for the inline pill (matches existing palette)
};

const PATTERNS: Record<Pattern["key"], Pattern> = {
  "fast-inaccurate": {
    key: "fast-inaccurate",
    label: "سريع لكنه غير دقيق",
    explanation: "تجيب بسرعة لكن نسبة أخطائك مرتفعة — خذ ثانيتين إضافيتين قبل اختيار الجواب.",
    emoji: "⚡",
    color:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200",
  },
  "accurate-slow": {
    key: "accurate-slow",
    label: "دقيق لكنه بطيء",
    explanation: "إجاباتك صحيحة في الغالب لكنك تستغرق وقتاً طويلاً — درّب نفسك على الحل السريع.",
    emoji: "🎯",
    color:
      "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
  },
  hesitant: {
    key: "hesitant",
    label: "متردد",
    explanation: "أوقاتك متذبذبة بين السريع جداً والبطيء جداً — التزم بسقف زمني ثابت لكل سؤال.",
    emoji: "🤔",
    color:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200",
  },
  guessing: {
    key: "guessing",
    label: "يعتمد على التخمين",
    explanation: "أخطاء كثيرة في زمن قصير جداً — اقرأ السؤال كاملاً قبل اختيار الجواب.",
    emoji: "🎲",
    color:
      "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
  },
};

function classify(
  answers: (number | null)[],
  correctAnswers: number[],
  times: (number | null)[],
): Pattern | null {
  // Build the set of "answered" slots and pull aligned arrays.
  const answeredTimes: number[] = [];
  let correctCount = 0;
  let answered = 0;
  let fastWrong = 0;     // wrong AND under 12s — likely guessing
  let slowAnswers = 0;   // ≥60s — near-timeout
  for (let i = 0; i < answers.length; i++) {
    const a = answers[i];
    const t = times[i];
    if (a == null || t == null) continue;
    answered += 1;
    answeredTimes.push(t);
    const isCorrect = a === correctAnswers[i];
    if (isCorrect) correctCount += 1;
    if (!isCorrect && t < 12) fastWrong += 1;
    if (t >= 60) slowAnswers += 1;
  }
  if (answered < 5) return null;

  const accuracy = correctCount / answered;
  const avgTime = answeredTimes.reduce((s, x) => s + x, 0) / answered;
  // Population standard deviation — fine for our 5–10 sample window.
  const variance =
    answeredTimes.reduce((s, x) => s + (x - avgTime) ** 2, 0) / answered;
  const std = Math.sqrt(variance);
  const cv = avgTime > 0 ? std / avgTime : 0; // coefficient of variation
  const guessRate = fastWrong / answered;
  const slowRate = slowAnswers / answered;

  // Strict signals first (most distinctive cases).
  if (guessRate >= 0.4 && accuracy <= 0.4) return PATTERNS.guessing;
  if (avgTime < 22 && accuracy < 0.55) return PATTERNS["fast-inaccurate"];
  if (avgTime >= 50 && accuracy >= 0.7) return PATTERNS["accurate-slow"];
  if (cv >= 0.5 || (slowRate >= 0.3 && accuracy < 0.7)) return PATTERNS.hesitant;

  // Soft fallback — pick by dominant tendency so we always classify.
  if (accuracy >= 0.7) return PATTERNS["accurate-slow"];
  if (avgTime < 25) return PATTERNS["fast-inaccurate"];
  return PATTERNS.hesitant;
}

export default function TestPatternIndicator({
  answers,
  correctAnswers,
  times,
}: Props) {
  const pattern = classify(answers, correctAnswers, times);
  if (!pattern) return null;

  return (
    <div
      dir="rtl"
      className={`rounded-2xl border p-3 mb-4 flex items-start gap-3 ${pattern.color}`}
    >
      <span className="text-xl shrink-0">{pattern.emoji}</span>
      <div className="text-sm leading-relaxed">
        <span className="font-bold">نمطك في الاختبار: </span>
        <span className="font-bold">{pattern.label}</span>
        <span className="opacity-80"> — {pattern.explanation}</span>
      </div>
    </div>
  );
}
