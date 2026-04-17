"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

// Practice categories with question counts
const practiceCategories = {
  quantitative: {
    title: "القسم الكمي",
    titleEn: "Quantitative",
    icon: "🔢",
    color: "green",
    topics: [
      { id: "algebra", name: "الجبر", nameEn: "Algebra", questionCount: 80, icon: "➕" },
      { id: "geometry", name: "الهندسة", nameEn: "Geometry", questionCount: 60, icon: "📐" },
      { id: "ratios", name: "النسب والتناسب", nameEn: "Ratios & Proportions", questionCount: 80, icon: "⚖️" },
      { id: "statistics", name: "الإحصاء", nameEn: "Statistics", questionCount: 60, icon: "📊" },
    ],
  },
  verbal: {
    title: "القسم اللفظي",
    titleEn: "Verbal",
    icon: "📝",
    color: "amber",
    topics: [
      { id: "analogy", name: "التناظر اللفظي", nameEn: "Analogies", questionCount: 55, icon: "🔄" },
      { id: "completion", name: "إكمال الجمل", nameEn: "Sentence Completion", questionCount: 24, icon: "✍️" },
      { id: "comprehension", name: "استيعاب المقروء", nameEn: "Reading Comprehension", questionCount: 29, icon: "📖" },
      { id: "contextual", name: "الخطأ السياقي", nameEn: "Contextual Error", questionCount: 34, icon: "❌" },
      { id: "vocabulary", name: "المفردات والمتضادات", nameEn: "Vocabulary", questionCount: 48, icon: "📚" },
    ],
  },
};

// Difficulty levels
const difficultyLevels = [
  { id: "easy", name: "سهل", nameEn: "Easy", color: "green", percentage: 30 },
  { id: "medium", name: "متوسط", nameEn: "Medium", color: "yellow", percentage: 50 },
  { id: "hard", name: "صعب", nameEn: "Hard", color: "red", percentage: 20 },
];

export default function PracticePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [selectedSection, setSelectedSection] = useState<"quantitative" | "verbal">("quantitative");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState(10);
  const [showSettings, setShowSettings] = useState(false);

  const currentSection = practiceCategories[selectedSection];
  const selectedTopicData = currentSection.topics.find(t => t.id === selectedTopic);

  const handleStartPractice = () => {
    if (!selectedTopic) {
      alert("يرجى اختيار موضوع للتدريب");
      return;
    }

    // Navigate to practice test with parameters
    const params = new URLSearchParams({
      topic: selectedTopic,
      section: selectedSection,
      count: questionCount.toString(),
      difficulty: selectedDifficulty,
    });

    router.push(`/practice/test?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" dir="rtl">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">وضع التدريب</h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-2 mb-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            {Object.entries(practiceCategories).map(([key, section]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedSection(key as "quantitative" | "verbal");
                  setSelectedTopic(null);
                }}
                className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                  selectedSection === key
                    ? key === "quantitative"
                      ? "bg-[#006C35] text-white shadow-md"
                      : "bg-[#D4AF37] text-white shadow-md"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <span className="text-xl">{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Topics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {currentSection.topics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic.id)}
              className={`p-5 rounded-2xl border-2 transition-all text-right ${
                selectedTopic === topic.id
                  ? selectedSection === "quantitative"
                    ? "border-[#006C35] bg-[#006C35]/5 dark:bg-[#006C35]/20"
                    : "border-[#D4AF37] bg-[#D4AF37]/5 dark:bg-[#D4AF37]/20"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{topic.icon}</span>
                <div className="flex-1">
                  <h3 className={`font-bold text-lg ${
                    selectedTopic === topic.id
                      ? selectedSection === "quantitative"
                        ? "text-[#006C35] dark:text-[#4ade80]"
                        : "text-[#D4AF37] dark:text-[#fbbf24]"
                      : "text-gray-900 dark:text-white"
                  }`}>
                    {topic.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {topic.questionCount} سؤال متاح
                  </p>
                </div>
                {selectedTopic === topic.id && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    selectedSection === "quantitative"
                      ? "bg-[#006C35] text-white"
                      : "bg-[#D4AF37] text-white"
                  }`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Practice Settings */}
        {selectedTopic && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">⚙️</span>
              إعدادات التدريب
            </h3>

            {/* Question Count */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                عدد الأسئلة
              </label>
              <div className="flex gap-3 flex-wrap">
                {[5, 10, 15, 20, 25, 30].map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    disabled={selectedTopicData && count > selectedTopicData.questionCount}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                      questionCount === count
                        ? selectedSection === "quantitative"
                          ? "bg-[#006C35] text-white"
                          : "bg-[#D4AF37] text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                مستوى الصعوبة
              </label>
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => setSelectedDifficulty("all")}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                    selectedDifficulty === "all"
                      ? "bg-gray-800 dark:bg-white text-white dark:text-gray-900"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  الكل
                </button>
                {difficultyLevels.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedDifficulty(level.id)}
                    className={`px-5 py-2.5 rounded-xl font-medium transition-all ${
                      selectedDifficulty === level.id
                        ? level.color === "green"
                          ? "bg-green-500 text-white"
                          : level.color === "yellow"
                          ? "bg-yellow-500 text-white"
                          : "bg-red-500 text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {level.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Timer Option */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">تفعيل المؤقت</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">90 ثانية لكل سؤال</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-[#006C35]"></div>
              </label>
            </div>
          </div>
        )}

        {/* Start Button */}
        <div className="flex justify-center">
          <button
            onClick={handleStartPractice}
            disabled={!selectedTopic}
            className={`px-12 py-4 rounded-xl font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 ${
              selectedSection === "quantitative"
                ? "bg-[#006C35] hover:bg-[#004d26] text-white shadow-lg hover:shadow-xl"
                : "bg-[#D4AF37] hover:bg-[#b8972f] text-white shadow-lg hover:shadow-xl"
            }`}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            ابدأ التدريب
          </button>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">💡</span>
              <h4 className="font-bold text-blue-800 dark:text-blue-300">نصيحة</h4>
            </div>
            <p className="text-sm text-blue-700 dark:text-blue-200">
              ابدأ بالمواضيع الأسهل ثم تدرج للأصعب لبناء ثقتك بنفسك
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">🎯</span>
              <h4 className="font-bold text-green-800 dark:text-green-300">هدف</h4>
            </div>
            <p className="text-sm text-green-700 dark:text-green-200">
              حاول الوصول لنسبة 80% أو أعلى في كل موضوع
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">📈</span>
              <h4 className="font-bold text-amber-800 dark:text-amber-300">تقدم</h4>
            </div>
            <p className="text-sm text-amber-700 dark:text-amber-200">
              راجع أخطاءك بعد كل تدريب لتحسين أدائك
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
