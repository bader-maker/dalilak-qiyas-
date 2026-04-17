"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import AIAssistant from "@/components/AIAssistant";
import type { ExamCategory, ExamSection } from "@/data/exam-config";
import { examCategories, getSectionConfig } from "@/data/exam-config";
import {
  getQuestions,
  getAllQuestionsForCategory,
  shuffleQuestions,
  getSectionLabel
} from "@/data/questions";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  section?: string;
}

interface TestEngineProps {
  examCategory: ExamCategory;
  testMode: "comprehensive" | "section";
  selectedSection?: ExamSection;
  questionLimit?: number;
  timeLimit?: number; // in minutes
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

  // Calculate test parameters based on mode
  const getTestParameters = useCallback(() => {
    if (testMode === "section" && selectedSection) {
      const sectionConfig = getSectionConfig(examCategory, selectedSection);
      return {
        questions: getQuestions(examCategory, selectedSection),
        timeMinutes: timeLimit || sectionConfig?.timeMinutes || 30,
        questionCount: questionLimit || sectionConfig?.questionCount || 25,
      };
    } else {
      // Comprehensive test - get all questions from all sections
      const allQuestions = getAllQuestionsForCategory(examCategory);
      return {
        questions: allQuestions,
        timeMinutes: timeLimit || examConfig.totalTimeMinutes,
        questionCount: questionLimit || examConfig.totalQuestions,
      };
    }
  }, [examCategory, testMode, selectedSection, timeLimit, questionLimit, examConfig]);

  const [testParams, setTestParams] = useState<{
    questions: Question[];
    timeMinutes: number;
    questionCount: number;
  } | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize test
  useEffect(() => {
    const params = getTestParameters();

    // Shuffle and limit questions
    let testQuestions = shuffleQuestions(params.questions);
    testQuestions = testQuestions.slice(0, params.questionCount);

    // Re-index questions
    testQuestions = testQuestions.map((q, index) => ({
      ...q,
      id: index + 1,
    }));

    setTestParams(params);
    setQuestions(testQuestions);
    setSelectedAnswers(Array(testQuestions.length).fill(null));
    setTimeLeft(params.timeMinutes * 60);
    setIsLoading(false);
  }, [getTestParameters]);

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
