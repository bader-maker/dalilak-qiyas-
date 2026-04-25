"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import AIAssistant from "@/components/AIAssistant";
import type { ExamCategory, ExamSection } from "@/data/exam-config";
import { examCategories } from "@/data/exam-config";
import {
  getQuestions,
  getAllQuestionsForCategory,
  shuffleQuestions,
  selectBalancedQuestions,
  getSectionLabel
} from "@/data/questions";
import { generateAIHint } from "@/lib/aiHint";
import {
  saveExamResult,
  getPreviousExam,
  summarizeProgress,
  loadHistory,
  type ExamHistoryEntry,
} from "@/lib/examHistory";
import {
  loadUserProfile,
  saveUserProfile,
  applyDiagnosticToProfile,
  reconcileExamHistoryToProfile,
  getMostImproved,
  getMostDeclined,
  type TopicImprovement,
} from "@/lib/userProfile";
import { slugToDisplayLabel } from "@/lib/topicMap";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  section?: string;
}

// --- Per-user used-question tracking (localStorage) ---------------------------
// Stable per-question key derived from question text via FNV-1a 32-bit hash.
// Required because q.id is reassigned by getQuestions/getAllQuestionsForCategory
// on every call and is therefore not a stable identifier across tests.
const usedQuestionsStorageKey = (category: ExamCategory) =>
  `used_questions_${category}`;

function questionKey(q: { question: string }): string {
  let h = 0x811c9dc5;
  const s = q.question;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

function readUsedQuestionIds(category: ExamCategory): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(usedQuestionsStorageKey(category));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : []);
  } catch {
    return new Set();
  }
}

function writeUsedQuestionIds(category: ExamCategory, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      usedQuestionsStorageKey(category),
      JSON.stringify(Array.from(ids))
    );
  } catch {
    // Quota exceeded or storage unavailable — silently fall back (test still runs).
  }
}

// =============================================================================
// ===== TEST ENGINE GLOBAL RULES (DO NOT CHANGE PER EXAM) =====
//
// Single source of truth for test sizing across all four exam categories
// (Qudrat / GAT / Tahsili / SAAT). These are the IMPLICIT defaults; caller-
// supplied `questionLimit` / `timeLimit` props (trial pages /test-saat,
// /test-tahsili pass {40, 60}) still override.
//
// Per-exam values from `examCategories[...].totalQuestions` /
// `totalTimeMinutes` and `getSectionConfig(...)` are intentionally NOT
// consulted here — they were the source of category-by-category drift
// (Qudrat-AR sections were 60/60, GAT-EN sections 25/22, etc.).
// Practice / training does not use TestEngine at all.
// =============================================================================
const TEST_RULES = {
  COMPREHENSIVE: { questions: 120, time: 120 },
  SECTION: { questions: 25, time: 25 },
} as const;

interface TestEngineProps {
  examCategory: ExamCategory;
  testMode: "comprehensive" | "section";
  selectedSection?: ExamSection;
  /**
   * Optional override for the implicit standard count
   * (`TEST_RULES.COMPREHENSIVE.questions` / `TEST_RULES.SECTION.questions`).
   * Used by trial pages that need a custom shorter test; standard test
   * pages leave this unset to inherit the centralized defaults.
   */
  questionLimit?: number;
  /** Optional override for the implicit standard timer (in minutes). */
  timeLimit?: number;
  isTrialTest?: boolean;
}

export default function TestEngine({
  examCategory,
  testMode,
  selectedSection,
  questionLimit,
  timeLimit,
  isTrialTest = false,
}: TestEngineProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const examConfig = examCategories[examCategory];
  const isArabic = examConfig.language === "ar";

  // ---------------------------------------------------------------------------
  // Calculate test parameters based on mode.
  //
  // Behaviour rules (in order):
  //   1. Defaults come from the centralized `TEST_RULES` block — every exam
  //      category resolves to the same numbers (comprehensive 120/120,
  //      section 25/25). Per-exam values from exam-config are NOT consulted.
  //   2. Caller-supplied `questionLimit` / `timeLimit` props win (trial pages
  //      /test-saat, /test-tahsili → 40/60).
  //   3. SAFETY: question count is clipped to the available pool size
  //      (`Math.min`), and the timer is held to a 1-min-per-question floor
  //      (`Math.max`) so a too-short override can't ship a test that's
  //      impossible to finish.
  //   4. DEFENSIVE FALLBACK: a "section" testMode without a selectedSection
  //      is a broken caller state — degrade to a 25/25 comprehensive test
  //      instead of crashing.
  //   5. In development, log the resolved params + override source so
  //      regressions are visible in the browser console.
  // ---------------------------------------------------------------------------
  const getTestParameters = useCallback(() => {
    const isSectionMode = testMode === "section" && !!selectedSection;

    // (4) Broken state: testMode says "section" but no section was supplied.
    if (testMode === "section" && !selectedSection) {
      const fallbackPool = getAllQuestionsForCategory(examCategory);
      const fallbackCount = Math.min(TEST_RULES.SECTION.questions, fallbackPool.length);
      const fallbackTime = Math.max(TEST_RULES.SECTION.time, fallbackCount);
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[TestEngine] testMode=\"section\" without selectedSection — falling back to safe defaults",
          { examCategory, questionCount: fallbackCount, timeMinutes: fallbackTime },
        );
      }
      return {
        questions: fallbackPool,
        questionCount: fallbackCount,
        timeMinutes: fallbackTime,
      };
    }

    // (1) Resolve the rule once.
    const rule = isSectionMode ? TEST_RULES.SECTION : TEST_RULES.COMPREHENSIVE;

    // Pool selection — section pulls from one section, comprehensive from all.
    const pool = isSectionMode
      ? getQuestions(examCategory, selectedSection)
      : getAllQuestionsForCategory(examCategory);

    // (2) + (3) Apply overrides, then clamp.
    const requestedCount = questionLimit ?? rule.questions;
    const safeQuestionCount = Math.min(requestedCount, pool.length);

    const requestedTime = timeLimit ?? rule.time;
    const safeTime = Math.max(requestedTime, safeQuestionCount);

    // (5) Dev-only diagnostic.
    if (process.env.NODE_ENV === "development") {
      console.log("[TestEngine]", {
        examCategory,
        testMode,
        selectedSection,
        questionCount: safeQuestionCount,
        timeMinutes: safeTime,
        poolSize: pool.length,
        source:
          questionLimit !== undefined || timeLimit !== undefined
            ? "override"
            : "default",
      });
    }

    return {
      questions: pool,
      questionCount: safeQuestionCount,
      timeMinutes: safeTime,
    };
  }, [examCategory, testMode, selectedSection, timeLimit, questionLimit]);

  const [testParams, setTestParams] = useState<{
    questions: Question[];
    timeMinutes: number;
    questionCount: number;
  } | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  // Snapshot of the previous attempt of the SAME examKind (category +
  // mode + section). Captured once at finish-time before saving the new
  // entry. Drives the short progress message at the top of the results
  // panel; null = no comparable prior attempt → message simply not shown.
  const [previousEntry, setPreviousEntry] = useState<ExamHistoryEntry | null>(null);
  // Captured at the moment of the diagnostic save effect so the result JSX
  // can render a small "progress over time" card without re-reading
  // localStorage. Top entries from getMostImproved/getMostDeclined applied
  // to the freshly-reconciled profile. Null until the effect has run.
  const [progressInsightsCard, setProgressInsightsCard] = useState<{
    improved: TopicImprovement | null;
    declined: TopicImprovement | null;
  } | null>(null);
  const examHistorySavedRef = useRef(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // AI hint cache: keyed by per-question content hash so the same question
  // never triggers more than one API call, even across navigation back/forth.
  // Value is the hint string; presence in the map = "shown".
  const [hintCache, setHintCache] = useState<Record<string, string>>({});
  // Stable key of the question currently being requested (null when idle).
  const [hintLoadingKey, setHintLoadingKey] = useState<string | null>(null);
  // Per-question error message (transient, shown until the user navigates).
  const [hintErrors, setHintErrors] = useState<Record<string, string>>({});
  // Total NEW (network-generated) hints served in this exam session.
  // Sent to the server as `streak` so the prompt grows vaguer if the student
  // leans on hints repeatedly (encourages them to think instead of relying
  // on AI). A ref — not state — because:
  //   1. We mutate it before/after async work and need synchronous reads.
  //   2. Concurrent requests on different questions must each claim a
  //      distinct streak slot; setState batching would let two requests
  //      read the same value.
  //   3. Nothing in the UI displays this count, so no re-render is needed.
  // Resets when TestEngine remounts for a new test.
  const hintCountRef = useRef<number>(0);

  // Initialize test
  useEffect(() => {
    const params = getTestParameters();
    const pool = params.questions;
    const need = params.questionCount;

    // Filter out previously-used questions for this exam category.
    const used = readUsedQuestionIds(examCategory);

    let testQuestions: Question[];

    if (testMode === "section") {
      // SECTION MODE — single-section pool, no cross-section balancing
      // needed. Existing three-branch flow (happy / fully-exhausted / partial).
      const unused = pool.filter((q) => !used.has(questionKey(q)));
      if (unused.length >= need) {
        testQuestions = shuffleQuestions(unused).slice(0, need);
      } else if (unused.length === 0) {
        // Pool fully exhausted — reset history and start a new cycle.
        writeUsedQuestionIds(examCategory, new Set());
        testQuestions = shuffleQuestions(pool).slice(0, need);
      } else {
        // Partial exhaustion — take all unused first, then fill remainder
        // from previously-used pool (still prioritising unused).
        const usedFromPool = pool.filter((q) => used.has(questionKey(q)));
        testQuestions = [
          ...shuffleQuestions(unused),
          ...shuffleQuestions(usedFromPool).slice(0, need - unused.length),
        ];
      }
    } else {
      // COMPREHENSIVE MODE — multi-section pool. Use the stratified selector
      // so each section gets its intended share of the test (Qudrat 60+60,
      // Tahsili 25+25+25+25), regardless of how many questions the no-repeat
      // filter has consumed in any one section.
      const sectionsConfig = examConfig.sections.map((s) => ({
        id: s.id,
        questionCount: s.questionCount,
      }));
      // If every question in the comprehensive pool has been used, reset
      // history first so the new test draws from a fresh slate (mirrors the
      // section-mode fully-exhausted branch).
      const anyUnused = pool.some((q) => !used.has(questionKey(q)));
      if (!anyUnused) {
        writeUsedQuestionIds(examCategory, new Set());
        testQuestions = selectBalancedQuestions(
          pool,
          sectionsConfig,
          need,
          new Set(),
          questionKey
        );
      } else {
        testQuestions = selectBalancedQuestions(
          pool,
          sectionsConfig,
          need,
          used,
          questionKey
        );
      }
    }

    // Re-index questions for UI display (unchanged behaviour).
    testQuestions = testQuestions.map((q, index) => ({
      ...q,
      id: index + 1,
    }));

    setTestParams(params);
    setQuestions(testQuestions);
    setSelectedAnswers(Array(testQuestions.length).fill(null));
    setTimeLeft(params.timeMinutes * 60);
    setIsLoading(false);
  }, [getTestParameters, examCategory, testMode, examConfig]);

  // Persist used question IDs once the test finishes (works for both the
  // user-clicked finish and the timer-triggered auto-finish).
  useEffect(() => {
    if (!showResults || questions.length === 0) return;
    const used = readUsedQuestionIds(examCategory);
    questions.forEach((q) => used.add(questionKey(q)));
    writeUsedQuestionIds(examCategory, used);
  }, [showResults, questions, examCategory]);

  // Save this attempt to exam history (for next-attempt comparison) and
  // capture the previous comparable attempt into local state. Runs once
  // per finished test — re-renders, theme toggles, and tab focus changes
  // can re-fire this effect, so the ref guard makes the side effect
  // strictly idempotent.
  //
  // ORDER MATTERS: read previous BEFORE writing the new entry, otherwise
  // the freshly-saved entry would itself be returned as "previous" and
  // every comparison would show 0% delta.
  useEffect(() => {
    if (!showResults || questions.length === 0) return;
    if (examHistorySavedRef.current) return;
    examHistorySavedRef.current = true;

    const percentage =
      Math.round(
        (selectedAnswers.filter((a, i) => a === questions[i]?.correct).length /
          questions.length) *
          100,
      );
    const sectionScores = getSectionScores();
    const historyCategories = Object.entries(sectionScores).map(([sid, s]) => ({
      name: getSectionLabel(examCategory, sid, isArabic ? "ar" : "en"),
      section: sid,
      percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));
    const examKind =
      testMode === "section" && selectedSection
        ? `${examCategory}-section-${selectedSection}`
        : `${examCategory}-comprehensive`;

    setPreviousEntry(getPreviousExam(examKind));
    const avgTimePerQuestion =
      questions.length > 0
        ? Math.round(((testParams?.timeMinutes || 60) * 60 - timeLeft) / questions.length)
        : 0;
    saveExamResult({
      examKind,
      score: percentage,
      estimatedScore: Math.round(65 + percentage * 0.35),
      avgTimePerQuestion,
      categoryPerformance: historyCategories,
    });

    // Mirror the result into the persistent user profile as the diagnostic
    // signal. Wrapped in try/catch so any storage failure (quota,
    // private-mode) cannot break the results screen — the existing
    // examHistory write above already succeeded by this point.
    try {
      let next = applyDiagnosticToProfile(loadUserProfile(), {
        examKind,
        score: percentage,
        avgTimePerQuestion,
        categoryPerformance: historyCategories,
      });
      // Backfill the per-topic timeline from any previous full exams the
      // student has taken. Idempotent — only genuinely-new (timestamp,
      // topic) pairs grow the series. This is the "previous exams" leg
      // of the data combine.
      next = reconcileExamHistoryToProfile(next, loadHistory());
      saveUserProfile(next);
      // Capture the top mover in each direction off the freshly-reconciled
      // profile. This is the data the small "progress over time" card on
      // the results screen renders. Cheap (O(topics) over a bounded
      // timeline) and runs at most once per result-screen mount.
      setProgressInsightsCard({
        improved: getMostImproved(next, 1)[0] ?? null,
        declined: getMostDeclined(next, 1)[0] ?? null,
      });
    } catch {
      /* best-effort persistence — profile bias just won't update this round */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showResults]);

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !showResults && !isLoading) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && !showResults && !isLoading) {
      setShowResults(true);
    }
  }, [timeLeft, showResults, isLoading]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestion] = answerIndex;
    setSelectedAnswers(newAnswers);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    setShowExplanation(false);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    }
  };

  const prevQuestion = () => {
    setShowExplanation(false);
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const finishTest = () => {
    setShowResults(true);
  };

  // AI hint request — strictly one network call per question. Subsequent
  // clicks (or revisits of the same question) read from local + persistent
  // cache. Cost cap is enforced server-side via the shared monthly quota.
  const requestHint = async () => {
    const q = questions[currentQuestion];
    if (!q) return;
    const key = questionKey(q);
    if (hintCache[key]) return; // already have it for this question
    if (hintLoadingKey === key) return; // request in flight
    setHintLoadingKey(key);
    setHintErrors((prev) => {
      if (!(key in prev)) return prev;
      const { [key]: _omit, ...rest } = prev;
      return rest;
    });
    // Optimistically claim the next streak slot BEFORE the async call so
    // concurrent requests on different questions get distinct streak values
    // (1, 2, 3 …) instead of all reading the same pre-call count.
    // The slot is rolled back on failure or persistent-cache hit so the
    // count only advances for genuine new AI generations.
    hintCountRef.current += 1;
    const streak = hintCountRef.current;
    let consumedSlot = false;
    try {
      const result = await generateAIHint({
        question: q.question,
        options: q.options,
        section: (q as Question & { section?: string }).section,
        category: examConfig.nameEn,
        language: isArabic ? "ar" : "en",
        streak,
      });
      if (result.hint && !result.fromCache) {
        // Real new generation — keep the streak slot.
        consumedSlot = true;
        setHintCache((prev) => ({ ...prev, [key]: result.hint as string }));
      } else if (result.hint && result.fromCache) {
        // Free re-display from a previous session — show it without
        // counting toward streak (no API call happened).
        setHintCache((prev) => ({ ...prev, [key]: result.hint as string }));
      } else {
        setHintErrors((prev) => ({
          ...prev,
          [key]: isArabic
            ? "تعذّر توليد التلميح حالياً."
            : "Couldn't generate a hint right now.",
        }));
      }
    } finally {
      if (!consumedSlot) {
        // Roll back the optimistic increment — keep the count tied to
        // genuine network generations only.
        hintCountRef.current = Math.max(0, hintCountRef.current - 1);
      }
      setHintLoadingKey((current) => (current === key ? null : current));
    }
  };

  const calculateScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === questions[index]?.correct) correct++;
    });
    return correct;
  };

  const getScorePercentage = () => {
    if (questions.length === 0) return 0;
    return Math.round((calculateScore() / questions.length) * 100);
  };

  const getSectionScores = () => {
    const sections: { [key: string]: { correct: number; total: number } } = {};
    questions.forEach((q, index) => {
      const sectionId = (q as Question & { section?: string }).section || "general";
      if (!sections[sectionId]) {
        sections[sectionId] = { correct: 0, total: 0 };
      }
      sections[sectionId].total++;
      if (selectedAnswers[index] === q.correct) {
        sections[sectionId].correct++;
      }
    });
    return sections;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#006C35] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {isArabic ? "جاري تحميل الاختبار..." : "Loading test..."}
          </p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = getScorePercentage();
    const sectionScores = getSectionScores();
    const timeSpent = (testParams?.timeMinutes || 60) * 60 - timeLeft;
    const avgTimePerQuestion = questions.length > 0 ? Math.round(timeSpent / questions.length) : 0;
    const estimatedScore = Math.round(65 + (percentage * 0.35));

    // ===== Build per-section history payload =====
    // The shared exam-history layer compares attempts by category NAME, not
    // by section id. We translate sectionId → human label HERE (e.g.
    // "physics_ar" → "الفيزياء" / "Physics") so the saved entry matches
    // exactly what the result UI shows AND so the next-attempt comparison
    // produces a phrase the user can read directly: "تحسّنت في الفيزياء…".
    // Locale follows the test's locale so AR exams persist Arabic names
    // and EN exams persist English names — they never get mixed in one
    // examKind because examKind embeds the category (which embeds language).
    const historyCategories = Object.entries(sectionScores).map(([sid, s]) => ({
      name: getSectionLabel(examCategory, sid, isArabic ? "ar" : "en"),
      section: sid,
      percentage: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    }));

    // ===== examKind discriminator =====
    // Comprehensive vs section attempts must NEVER be compared (very
    // different question counts and section coverage → misleading deltas).
    // Section attempts must also be scoped to their section so that doing
    // a Physics test today vs a Chemistry test yesterday doesn't get
    // diffed. examKind embeds all three axes so reads via getPreviousExam
    // only return truly comparable attempts.
    const examKind =
      testMode === "section" && selectedSection
        ? `${examCategory}-section-${selectedSection}`
        : `${examCategory}-comprehensive`;

    // Single-line progress message vs the previous comparable attempt.
    // `previousEntry` is populated by the on-finish save effect (defined
    // earlier in this component). On the very first render after finishing
    // it's still null so progress is null and nothing extra renders; on the
    // next tick the effect fires, sets previousEntry, and the badge appears.
    const progress = previousEntry
      ? summarizeProgress({
          current: historyCategories,
          previous: previousEntry.categoryPerformance,
          currentScore: percentage,
          previousScore: previousEntry.score,
          locale: isArabic ? "ar" : "en",
        })
      : null;

    return (
      <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors duration-300`} dir={isArabic ? "rtl" : "ltr"}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isArabic ? "تقرير الاختبار التفصيلي" : "Detailed Test Report"}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {examConfig.name} {isTrialTest ? (isArabic ? "(تجريبي)" : "(Trial)") : ""}
            </p>
            {/* Progress badge — only visible when a comparable previous
                attempt exists AND the change is non-trivial. Reuses the
                existing semantic palette (green = improvement, red =
                decline) and existing pill shape; no new design tokens. */}
            {progress && (
              <div className="mt-3 flex justify-center">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    progress.direction === "up"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                  }`}
                >
                  <span aria-hidden>{progress.direction === "up" ? "↑" : "↓"}</span>
                  {progress.message}
                </span>
              </div>
            )}
          </div>

          {/* Main Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  percentage >= 80 ? 'bg-green-100 dark:bg-green-900/40' :
                  percentage >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40' :
                  'bg-red-100 dark:bg-red-900/40'
                }`}>
                  <div className="text-center">
                    <span className={`text-4xl font-bold ${
                      percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                      percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {percentage}%
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{score}/{questions.length}</p>
                  </div>
                </div>
                <div className={`absolute -bottom-2 ${isArabic ? 'right-1/2 translate-x-1/2' : 'left-1/2 -translate-x-1/2'} px-3 py-1 rounded-full text-xs font-bold ${
                  percentage >= 80 ? 'bg-green-500 text-white' :
                  percentage >= 60 ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {percentage >= 80
                    ? (isArabic ? 'ممتاز' : 'Excellent')
                    : percentage >= 60
                    ? (isArabic ? 'جيد' : 'Good')
                    : (isArabic ? 'يحتاج تحسين' : 'Needs Work')}
                </div>
              </div>

              <div className={`flex-1 text-center ${isArabic ? 'md:text-right' : 'md:text-left'}`}>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {percentage >= 80
                    ? (isArabic ? 'أداء ممتاز!' : 'Excellent Performance!')
                    : percentage >= 60
                    ? (isArabic ? 'أحسنت، استمر في التحسن!' : 'Good Job, Keep Improving!')
                    : (isArabic ? 'تحتاج المزيد من التدريب' : 'More Practice Needed')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {isArabic ? 'الدرجة التقديرية في قياس:' : 'Estimated Qiyas Score:'}{' '}
                  <span className="font-bold text-[#006C35] dark:text-[#4ade80]">{estimatedScore}</span> / 100
                </p>
                <div className={`flex flex-wrap gap-3 ${isArabic ? 'justify-center md:justify-end' : 'justify-center md:justify-start'}`}>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                    ⏱️ {isArabic ? 'الوقت:' : 'Time:'} {Math.floor(timeSpent / 60)} {isArabic ? 'دقيقة' : 'min'}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                    ⚡ {isArabic ? 'المتوسط:' : 'Avg:'} {avgTimePerQuestion}{isArabic ? 'ث/سؤال' : 's/question'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {Object.entries(sectionScores).map(([sectionId, scores]) => {
              const sectionLabel = getSectionLabel(examCategory, sectionId, isArabic ? "ar" : "en");
              const sectionPercentage = Math.round((scores.correct / scores.total) * 100);

              return (
                <div key={sectionId} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/40">
                      <span className="text-2xl">📚</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{sectionLabel}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {scores.correct}/{scores.total} {isArabic ? 'صحيح' : 'correct'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {sectionPercentage}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        sectionPercentage >= 80 ? 'bg-green-500' :
                        sectionPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${sectionPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== Section-level insights (cause / strength / action) =====
              Built from the same sectionScores data that powers the cards
              above — no new data sources, no chart changes, no layout moves.
              Only rendered for comprehensive exams with 2+ sections (skips
              single-section practice mode where comparisons are meaningless). */}
          {testMode !== "section" && (() => {
            const secList = Object.entries(sectionScores)
              .map(([id, s]) => ({
                id,
                label: getSectionLabel(examCategory, id, isArabic ? "ar" : "en"),
                accuracy: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
                total: s.total,
              }))
              .filter((s) => s.total > 0);
            if (secList.length < 2) return null;
            const sortedAsc = [...secList].sort((a, b) => a.accuracy - b.accuracy);
            const weakestSec = sortedAsc[0];
            const strongestSec = sortedAsc[sortedAsc.length - 1];
            const tied = strongestSec.accuracy - weakestSec.accuracy < 5;
            // Practical action target: 15 questions in 2 days (mirrors
            // the example in the task spec; concise and unambiguous).
            const actionCount = 15;
            return (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>🧭</span>
                  {isArabic ? 'تحليل ذكي وتوصية' : 'Smart Insights & Next Step'}
                </h3>
                <div className="space-y-3">
                  {/* Cause — explains WHY the score landed where it did */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <span className="text-lg shrink-0">📉</span>
                    <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                      {tied
                        ? (isArabic
                            ? 'أداؤك متوازن بين الأقسام — لا يوجد قسم يسحب درجتك للأسفل بشكل واضح.'
                            : 'Your performance is balanced across sections — no single section is dragging your score down.')
                        : (isArabic
                            ? `انخفاض درجتك سببه الرئيسي ضعفك في «${weakestSec.label}» (${weakestSec.accuracy}%).`
                            : `Your score is held back mainly by «${weakestSec.label}» (${weakestSec.accuracy}%).`)}
                    </p>
                  </div>
                  {/* Strength — highlights the strongest section */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                    <span className="text-lg shrink-0">💪</span>
                    <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">
                      {tied
                        ? (isArabic
                            ? 'لا يوجد قسم متفوّق بشكل واضح بعد — استمر بالتدريب لتظهر نقاط قوتك.'
                            : 'No standout section yet — keep training to surface your strengths.')
                        : (isArabic
                            ? `أداؤك في «${strongestSec.label}» هو الأقوى لديك (${strongestSec.accuracy}%).`
                            : `Your strongest section is «${strongestSec.label}» (${strongestSec.accuracy}%).`)}
                    </p>
                  </div>
                  {/* Action — short, practical next step targeting weakest section */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <span className="text-lg shrink-0">⚡</span>
                    <div className="flex-1">
                      <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                        {tied
                          ? (isArabic
                              ? `حافظ على وتيرتك: حل ${actionCount} سؤال متنوّع يومياً مع مراجعة شرح كل خطأ.`
                              : `Maintain your pace: solve ${actionCount} mixed questions daily and review every mistake.`)
                          : (isArabic
                              ? `تدرب على ${actionCount} سؤال في «${weakestSec.label}» خلال يومين، واقرأ شرح كل إجابة خاطئة.`
                              : `Practice ${actionCount} «${weakestSec.label}» questions over the next 2 days and read every wrong-answer explanation.`)}
                      </p>
                      {/* Routes to existing /practice route. The focus query
                          param carries the weakest section's id (e.g.
                          math_ar, physics_ar, quantitative_ar) so the
                          practice page can deep-link later without any
                          training-route or UI changes here. When sections
                          are tied we omit the focus param — generic practice. */}
                      <button
                        onClick={() => {
                          const target = tied ? "/practice" : `/practice?focus=${encodeURIComponent(weakestSec.id)}`;
                          router.push(target);
                        }}
                        className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#006C35] text-white text-xs font-bold hover:bg-[#004d26] transition-colors"
                      >
                        {isArabic ? 'ابدأ التدريب الآن' : 'Start Training Now'}
                        <span aria-hidden>{isArabic ? '←' : '→'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ===== Progress over time (combine of diagnostic + sessions + previous exams) =====
              Renders only when the per-topic timeline has at least one
              topic crossing the ±PROGRESS_TREND_THRESHOLD bar in either
              direction. Same card style as Smart Insights above; uses
              the existing red/green pill treatment. Pure additive — when
              there isn't enough trend data yet, the card is omitted and
              the surrounding layout is unchanged. */}
          {progressInsightsCard && (
            (progressInsightsCard.improved?.trend === "improving" ||
              progressInsightsCard.declined?.trend === "declining") && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <span>📊</span>
                  {isArabic ? 'تطورك عبر الاختبارات' : 'Your Progress Over Time'}
                </h3>
                <div className="space-y-3">
                  {progressInsightsCard.improved?.trend === "improving" && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <span className="text-lg shrink-0">📈</span>
                      <p className="text-sm text-green-800 dark:text-green-300 leading-relaxed">
                        {isArabic
                          ? `تحسنت في ${slugToDisplayLabel(progressInsightsCard.improved.topic, 'ar')} بنسبة ${Math.round(progressInsightsCard.improved.deltaPct)}%`
                          : `You improved in ${slugToDisplayLabel(progressInsightsCard.improved.topic, 'en')} by ${Math.round(progressInsightsCard.improved.deltaPct)}%`}
                      </p>
                    </div>
                  )}
                  {progressInsightsCard.declined?.trend === "declining" && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <span className="text-lg shrink-0">📉</span>
                      <p className="text-sm text-red-800 dark:text-red-300 leading-relaxed">
                        {isArabic
                          ? `تراجع أداؤك في ${slugToDisplayLabel(progressInsightsCard.declined.topic, 'ar')} بنسبة ${Math.round(Math.abs(progressInsightsCard.declined.deltaPct))}%`
                          : `Your performance in ${slugToDisplayLabel(progressInsightsCard.declined.topic, 'en')} declined by ${Math.round(Math.abs(progressInsightsCard.declined.deltaPct))}%`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          )}

          {/* Question Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📋</span>
              {isArabic ? 'ملخص الإجابات' : 'Answer Summary'}
            </h3>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((_, index) => {
                const isCorrect = selectedAnswers[index] === questions[index].correct;
                const isUnanswered = selectedAnswers[index] === null;
                return (
                  <div
                    key={index}
                    className={`aspect-square rounded-lg font-medium text-sm flex items-center justify-center ${
                      isUnanswered
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        : isCorrect
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                    }`}>
                    {index + 1}
                  </div>
                );
              })}
            </div>
            <div className={`flex items-center gap-6 mt-4 text-sm ${isArabic ? 'flex-row-reverse' : ''}`}>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40" />
                <span className="text-gray-600 dark:text-gray-400">
                  {isArabic ? 'صحيح' : 'Correct'} ({score})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/40" />
                <span className="text-gray-600 dark:text-gray-400">
                  {isArabic ? 'خطأ' : 'Wrong'} ({questions.length - score - selectedAnswers.filter(a => a === null).length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                <span className="text-gray-600 dark:text-gray-400">
                  {isArabic ? 'لم يُجب' : 'Skipped'} ({selectedAnswers.filter(a => a === null).length})
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors"
            >
              {isArabic ? 'العودة للرئيسية' : 'Back to Dashboard'}
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 border-2 border-[#006C35] text-[#006C35] dark:text-[#4ade80] font-bold rounded-xl hover:bg-[#006C35]/5 transition-colors"
            >
              {isArabic ? 'إعادة الاختبار' : 'Retry Test'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentQuestion];
  const answeredCount = selectedAnswers.filter((a) => a !== null).length;

  if (!currentQ) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">
            {isArabic ? "لا توجد أسئلة متاحة" : "No questions available"}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 px-6 py-2 bg-[#006C35] text-white rounded-lg hover:bg-[#004d26]"
          >
            {isArabic ? "العودة" : "Go Back"}
          </button>
        </div>
      </div>
    );
  }

  const currentSectionId = (currentQ as Question & { section?: string }).section;
  const currentSectionLabel = currentSectionId
    ? getSectionLabel(examCategory, currentSectionId, isArabic ? "ar" : "en")
    : "";

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300`} dir={isArabic ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-[#006C35] dark:bg-gray-800 text-white sticky top-0 z-10 border-b border-[#004d26] dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-white/10 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <svg className={`w-5 h-5 ${isArabic ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="font-bold">
                  {examConfig.name} {isTrialTest ? (isArabic ? "(تجريبي)" : "(Trial)") : ""}
                </h1>
                <p className="text-xs text-white/70 dark:text-gray-400">{examConfig.nameEn}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/10 dark:bg-gray-700 hover:bg-white/20 dark:hover:bg-gray-600 transition-colors"
              >
                {theme === "light" ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                timeLeft < 300 ? "bg-red-500" : "bg-white/20 dark:bg-gray-700"
              }`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm">
                <span className="font-bold">{answeredCount}</span>
                <span className="text-white/70 dark:text-gray-400">/{questions.length}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto">
          <div className="h-1 bg-gray-100 dark:bg-gray-700">
            <div
              className="h-full bg-[#006C35] transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          {/* Question Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {currentSectionLabel && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                  {currentSectionLabel}
                </span>
              )}
            </div>
            <span className="text-sm text-gray-400 dark:text-gray-500">
              {isArabic ? `السؤال ${currentQuestion + 1} من ${questions.length}` : `Question ${currentQuestion + 1} of ${questions.length}`}
            </span>
          </div>

          {/* Question */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{currentQ.question}</h2>

          {/* Options */}
          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, index) => {
              const isSelected = selectedAnswers[currentQuestion] === index;
              const isCorrect = index === currentQ.correct;
              const showCorrectness = showExplanation && selectedAnswers[currentQuestion] !== null;

              return (
                <button
                  key={index}
                  onClick={() => !showExplanation && handleAnswer(index)}
                  disabled={showExplanation}
                  className={`w-full p-4 rounded-xl border-2 ${isArabic ? 'text-right' : 'text-left'} transition-all ${
                    showCorrectness
                      ? isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : isSelected
                        ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                        : "border-gray-200 dark:border-gray-600"
                      : isSelected
                      ? "border-[#006C35] bg-[#006C35]/5 dark:bg-[#006C35]/20"
                      : "border-gray-200 dark:border-gray-600 hover:border-[#006C35]/50 dark:hover:border-[#006C35]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      showCorrectness
                        ? isCorrect
                          ? "bg-green-500 text-white"
                          : isSelected
                          ? "bg-red-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        : isSelected
                        ? "bg-[#006C35] text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className={`font-medium ${
                      showCorrectness
                        ? isCorrect
                          ? "text-green-700 dark:text-green-300"
                          : isSelected
                          ? "text-red-700 dark:text-red-300"
                          : "text-gray-900 dark:text-gray-200"
                        : "text-gray-900 dark:text-gray-200"
                    }`}>{option}</span>
                    {showCorrectness && isCorrect && (
                      <svg className={`w-5 h-5 text-green-500 dark:text-green-400 ${isArabic ? 'mr-auto' : 'ml-auto'}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* AI Hint — optional, one network call per question, hidden once
              the answer is revealed (the explanation supersedes it). */}
          {!showExplanation && (() => {
            const qKey = questionKey(currentQ);
            const cachedHint = hintCache[qKey];
            const isLoadingHint = hintLoadingKey === qKey;
            const errorMsg = hintErrors[qKey];
            return (
              <div className="mb-6">
                {!cachedHint && (
                  <button
                    type="button"
                    onClick={requestHint}
                    disabled={isLoadingHint}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#D4AF37]/40 dark:border-[#D4AF37]/30 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/10 text-[#8a6d12] dark:text-[#E8C547] text-sm font-medium hover:bg-[#D4AF37]/20 dark:hover:bg-[#D4AF37]/20 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0012 2z" />
                    </svg>
                    {isLoadingHint
                      ? (isArabic ? "جارٍ توليد التلميح…" : "Generating hint…")
                      : (isArabic ? "إظهار تلميح" : "Show Hint")}
                  </button>
                )}
                {cachedHint && (
                  <div className="p-3 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/10">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-[#8a6d12] dark:text-[#E8C547]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 18h6M10 22h4M12 2a7 7 0 00-4 12.7c.6.5 1 1.2 1 2V17h6v-.3c0-.8.4-1.5 1-2A7 7 0 0012 2z" />
                      </svg>
                      <span className="text-sm font-bold text-[#8a6d12] dark:text-[#E8C547]">
                        {isArabic ? "تلميح" : "Hint"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{cachedHint}</p>
                  </div>
                )}
                {errorMsg && !cachedHint && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">{errorMsg}</p>
                )}
              </div>
            );
          })()}

          {/* Explanation */}
          {showExplanation && selectedAnswers[currentQuestion] !== null && (
            <div className={`p-4 rounded-xl mb-6 ${
              selectedAnswers[currentQuestion] === currentQ.correct
                ? "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700"
                : "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-[#006C35] dark:text-[#4ade80]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-gray-900 dark:text-white">
                  {isArabic ? 'الشرح' : 'Explanation'}
                </span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{currentQ.explanation}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevQuestion}
              disabled={currentQuestion === 0}
              className="px-6 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isArabic ? 'السابق' : 'Previous'}
            </button>

            <div className="flex gap-2">
              {currentQuestion === questions.length - 1 ? (
                <button
                  onClick={finishTest}
                  className="px-8 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors"
                >
                  {isArabic ? 'إنهاء الاختبار' : 'Finish Test'}
                </button>
              ) : (
                <button
                  onClick={nextQuestion}
                  className="px-8 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors"
                >
                  {isArabic ? 'التالي' : 'Next'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Question Navigator */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">
            {isArabic ? 'تصفح الأسئلة' : 'Question Navigator'}
          </h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setShowExplanation(false);
                  setCurrentQuestion(index);
                }}
                className={`aspect-square rounded-lg font-medium text-sm transition-all ${
                  index === currentQuestion
                    ? "bg-[#006C35] text-white"
                    : selectedAnswers[index] !== null
                    ? selectedAnswers[index] === questions[index].correct
                      ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                      : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* AI Assistant */}
      <AIAssistant
        context="test"
        isArabic={isArabic}
        currentQuestion={{
          question: currentQ.question,
          options: currentQ.options,
          section: currentSectionLabel,
          category: examConfig.name,
        }}
      />
    </div>
  );
}
