"use client";

// Behavioral pattern classifier — derived purely from the student's in-session
// answer + timing data. NO AI call, NO network, NO cost.
//
// Returns one of the four spec patterns:
//   - سريع لكنه غير دقيق  / Fast but inaccurate
//   - دقيق لكنه بطيء       / Accurate but slow
//   - متردد                 / Hesitant
//   - يعتمد على التخمين     / Relies on guessing
//
// The component stays silent until the student has answered at least 5
// questions in the current session, mirroring the trigger threshold of the
// mid-session AI coach card so the two surface together.
//
// Bilingualized 2026-04-25: parent passes `isArabic` (true for Qudrat-AR /
// Tahsili-AR exams, false for GAT-EN / SAAT-EN) and the banner picks the
// matching locale from each pattern's `{ ar, en }` label/explanation. The
// container `dir` and surrounding chrome flip too so the punctuation/dash
// reads correctly in either direction.

type Props = {
  // For each question slot in the current session: the student's chosen
  // option index (or null if not yet answered).
  answers: (number | null)[];
  // Parallel array of correct option indexes for the same slots.
  correctAnswers: number[];
  // Parallel array of seconds the student spent on each question (only valid
  // for indexes where `answers[i] != null`).
  times: (number | null)[];
  // True for Arabic exams (Qudrat-AR / Tahsili-AR), false for English
  // exams (GAT-EN / SAAT-EN). Defaults to true so legacy callers that don't
  // yet pass the flag keep their existing Arabic-only behavior.
  isArabic?: boolean;
};

type Bilingual = { ar: string; en: string };

type Pattern = {
  key: "fast-inaccurate" | "accurate-slow" | "hesitant" | "guessing";
  label: Bilingual;
  explanation: Bilingual;
  emoji: string;
  color: string; // Tailwind classes for the inline pill (matches existing palette)
};

const PATTERNS: Record<Pattern["key"], Pattern> = {
  "fast-inaccurate": {
    key: "fast-inaccurate",
    label: { ar: "سريع لكنه غير دقيق", en: "Fast but inaccurate" },
    explanation: {
      ar: "تجيب بسرعة لكن نسبة أخطائك مرتفعة — خذ ثانيتين إضافيتين قبل اختيار الجواب.",
      en: "You answer quickly but your error rate is high — take two extra seconds before picking an option.",
    },
    emoji: "⚡",
    color:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200",
  },
  "accurate-slow": {
    key: "accurate-slow",
    label: { ar: "دقيق لكنه بطيء", en: "Accurate but slow" },
    explanation: {
      ar: "إجاباتك صحيحة في الغالب لكنك تستغرق وقتاً طويلاً — درّب نفسك على الحل السريع.",
      en: "Your answers are mostly correct but take a long time — train yourself to solve faster.",
    },
    emoji: "🎯",
    color:
      "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200",
  },
  hesitant: {
    key: "hesitant",
    label: { ar: "متردد", en: "Hesitant" },
    explanation: {
      ar: "أوقاتك متذبذبة بين السريع جداً والبطيء جداً — التزم بسقف زمني ثابت لكل سؤال.",
      en: "Your timing swings between very fast and very slow — stick to a fixed time cap per question.",
    },
    emoji: "🤔",
    color:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200",
  },
  guessing: {
    key: "guessing",
    label: { ar: "يعتمد على التخمين", en: "Relies on guessing" },
    explanation: {
      ar: "أخطاء كثيرة في زمن قصير جداً — اقرأ السؤال كاملاً قبل اختيار الجواب.",
      en: "Many wrong answers in very short time — read the whole question before picking an option.",
    },
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
  isArabic = true,
}: Props) {
  const pattern = classify(answers, correctAnswers, times);
  if (!pattern) return null;

  const lang: keyof Bilingual = isArabic ? "ar" : "en";
  const heading = isArabic ? "نمطك في الاختبار: " : "Your test pattern: ";

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className={`rounded-2xl border p-3 mb-4 flex items-start gap-3 ${pattern.color}`}
    >
      <span className="text-xl shrink-0">{pattern.emoji}</span>
      <div className="text-sm leading-relaxed">
        <span className="font-bold">{heading}</span>
        <span className="font-bold">{pattern.label[lang]}</span>
        <span className="opacity-80"> — {pattern.explanation[lang]}</span>
      </div>
    </div>
  );
}
