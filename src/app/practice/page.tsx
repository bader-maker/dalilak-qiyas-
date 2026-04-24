"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";

// Maps a `focus` query-param value (sent from full-exam result pages)
// to the practice page's section state.
//   - quantitative_ar / quantitative_en → "quantitative"
//   - verbal_ar / verbal_en → "verbal"
//   - Tahsili values (math_ar, physics_ar, chemistry_ar, biology_ar
//     and their _en variants) have no matching section in this page —
//     return null so the existing default ("quantitative") is used.
function focusToSection(focus: string | null): "quantitative" | "verbal" | null {
  if (!focus) return null;
  const f = focus.toLowerCase();
  if (f === "quantitative_ar" || f === "quantitative_en") return "quantitative";
  if (f === "verbal_ar" || f === "verbal_en") return "verbal";
  return null;
}

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

// Topic detail map: short description, branches, common questions, fastest methods
type TopicDetail = {
  description: string;
  branches: { id: string; name: string; icon: string }[];
  commonQuestions: string[];
  fastestMethods: string[];
};

const topicDetails: Record<string, TopicDetail> = {
  algebra: {
    description: "أساس الكمي. تدرّب على المعادلات والتبسيط والأنماط لتقوي حلّ المسائل بسرعة.",
    branches: [
      { id: "equations", name: "المعادلات", icon: "🟰" },
      { id: "simplify", name: "تبسيط العبارات", icon: "✂️" },
      { id: "patterns", name: "الأنماط الجبرية", icon: "🔢" },
      { id: "substitution", name: "التعويض", icon: "🔁" },
      { id: "comparison", name: "المقارنات الجبرية", icon: "⚖️" },
    ],
    commonQuestions: [
      "حلّ معادلة من الدرجة الأولى بمتغير واحد",
      "إيجاد الحد التالي في نمط جبري",
      "تبسيط عبارة جبرية تحتوي على أقواس",
      "مقارنة قيمتين جبريّتين بدلالة متغير",
    ],
    fastestMethods: [
      "عوّض بأرقام بسيطة بدل الحل الجبري الكامل",
      "ابدأ بالحدود ذات الدرجة الأعلى عند التبسيط",
      "اعزل المتغير في طرف واحد قبل أي خطوة حسابية",
    ],
  },
  geometry: {
    description: "تعرّف على خصائص الأشكال والزوايا والمساحات لحلّ مسائل الهندسة بثقة.",
    branches: [
      { id: "triangles", name: "المثلثات", icon: "🔺" },
      { id: "circles", name: "الدوائر", icon: "⭕" },
      { id: "areas", name: "المساحات والأحجام", icon: "📦" },
      { id: "angles", name: "الزوايا", icon: "📐" },
      { id: "symmetry", name: "التماثل والتشابه", icon: "🪞" },
    ],
    commonQuestions: [
      "إيجاد مساحة مثلث أو شكل مركّب",
      "حساب محيط دائرة أو طول قوس",
      "إيجاد قياس زاوية باستخدام خصائص الأشكال",
      "مقارنة مساحات شكلين متشابهين",
    ],
    fastestMethods: [
      "ارسم الشكل دائماً قبل البدء بالحساب",
      "تذكّر مجموع زوايا المثلث 180° والرباعي 360°",
      "استخدم خاصية فيثاغورس للأشكال القائمة",
    ],
  },
  ratios: {
    description: "النسبة والتناسب من أكثر مهارات الكمي تكراراً. تدرّب عليها لرفع سرعتك.",
    branches: [
      { id: "percent", name: "النسبة المئوية", icon: "٪" },
      { id: "direct", name: "التناسب الطردي والعكسي", icon: "↔️" },
      { id: "rates", name: "المعدلات والسرعات", icon: "🚗" },
      { id: "word", name: "المسائل اللفظية", icon: "📝" },
    ],
    commonQuestions: [
      "زيادة أو نقصان قيمة بنسبة مئوية",
      "تحويل بين كسور ونسب وأعداد عشرية",
      "حساب الزمن أو السرعة أو المسافة",
      "تقسيم مبلغ بنسبة معطاة بين عدّة أطراف",
    ],
    fastestMethods: [
      "حوّل النسبة لكسر بسيط قبل الضرب",
      "للتناسب الطردي: ضرب تبادلي مباشرة",
      "لمسائل السرعة: المسافة = السرعة × الزمن",
    ],
  },
  statistics: {
    description: "تعلّم قراءة الجداول والمخططات وحساب المقاييس الإحصائية بسرعة وذكاء.",
    branches: [
      { id: "average", name: "المتوسط والوسيط والمنوال", icon: "📊" },
      { id: "probability", name: "الاحتمالات", icon: "🎲" },
      { id: "tables", name: "تحليل الجداول", icon: "🧾" },
      { id: "charts", name: "قراءة المخططات", icon: "📈" },
    ],
    commonQuestions: [
      "إيجاد المتوسط الحسابي لمجموعة قيم",
      "حساب احتمال حدث بسيط",
      "استخراج قيمة من جدول أو مخطط أعمدة",
      "إيجاد الوسيط بعد ترتيب القيم",
    ],
    fastestMethods: [
      "رتّب الأرقام تصاعدياً قبل إيجاد الوسيط",
      "اقرأ عنوان المخطط ووحدات القياس أولاً",
      "احفظ: الاحتمال = الحالات المرغوبة ÷ كل الحالات",
    ],
  },
  analogy: {
    description: "اكتشف العلاقة بين الكلمات وطبّقها على الخيارات لاختيار الإجابة الأدق.",
    branches: [
      { id: "relations", name: "العلاقات اللفظية", icon: "🔗" },
      { id: "antonym-rel", name: "علاقة التضاد", icon: "↔️" },
      { id: "synonym-rel", name: "علاقة الترادف", icon: "🟰" },
      { id: "category", name: "علاقة الجزء بالكل", icon: "🧩" },
    ],
    commonQuestions: [
      "إيجاد علاقة بين زوج كلمات معطى",
      "اختيار الزوج الذي يماثل العلاقة الأصلية",
      "تحديد العلاقة الوظيفية بين كلمتين",
    ],
    fastestMethods: [
      "صُغ العلاقة بجملة واضحة قبل النظر للخيارات",
      "استبعد الخيارات المختلفة في نوع العلاقة",
      "انتبه لاتجاه العلاقة (سبب → نتيجة) في كلا الزوجين",
    ],
  },
  completion: {
    description: "اقرأ الجملة كاملة ثم اختر الكلمة التي تحقق المعنى المنطقي للسياق.",
    branches: [
      { id: "missing-word", name: "الكلمة الناقصة", icon: "✏️" },
      { id: "context-fit", name: "الكلمة المناسبة للسياق", icon: "🎯" },
      { id: "verb-choice", name: "تحديد الفعل المناسب", icon: "🔤" },
      { id: "joining", name: "ربط الجمل", icon: "🔗" },
    ],
    commonQuestions: [
      "اختيار الكلمة المناسبة لإكمال الجملة",
      "تحديد الفعل الذي يربط الجملتين منطقياً",
      "إيجاد المرادف الذي يحافظ على المعنى",
    ],
    fastestMethods: [
      "اقرأ الجملة كاملة قبل النظر للخيارات",
      "حدّد علامات السياق (ولكن، لذلك، رغم...)",
      "جرّب كل خيار شفهياً واختر الأكثر طبيعية",
    ],
  },
  comprehension: {
    description: "اقرأ النص بفهم ثم ارجع له عند الإجابة. لا تعتمد على الذاكرة فقط.",
    branches: [
      { id: "main-idea", name: "الفكرة العامة", icon: "💡" },
      { id: "word-meaning", name: "معنى المفردة", icon: "📖" },
      { id: "inference", name: "الاستنتاج", icon: "🧠" },
      { id: "back-to-text", name: "العودة للنص", icon: "🔍" },
      { id: "intent", name: "تحديد المقصود", icon: "🎯" },
    ],
    commonQuestions: [
      "ما الفكرة الرئيسية للنص؟",
      "ماذا يقصد الكاتب بالعبارة …؟",
      "أي العبارات يمكن استنتاجها من النص؟",
      "ما معنى الكلمة … في سياق النص؟",
    ],
    fastestMethods: [
      "اقرأ السؤال أولاً ثم النص",
      "ارجع للنص لكل سؤال ولا تعتمد على الذاكرة",
      "ابحث عن كلمات مفتاحية في السؤال داخل النص",
    ],
  },
  contextual: {
    description: "ابحث عن الكلمة التي لا تنسجم مع بقية الجملة من حيث المعنى أو القاعدة.",
    branches: [
      { id: "morph", name: "الخطأ الصرفي", icon: "🔡" },
      { id: "syntax", name: "الخطأ النحوي", icon: "📚" },
      { id: "semantic", name: "الخطأ الدلالي", icon: "💭" },
    ],
    commonQuestions: [
      "تحديد الكلمة غير المنسجمة في الجملة",
      "كشف خطأ صرفي في تصريف الكلمة",
      "اكتشاف خطأ في المعنى داخل السياق",
    ],
    fastestMethods: [
      "اقرأ الجملة بصوت منخفض لاكتشاف الخلل",
      "تأكد من تطابق المؤنث والمذكر والإفراد والجمع",
      "تحقق أن الكلمة تخدم معنى الجملة فعلاً",
    ],
  },
  vocabulary: {
    description: "اعرف المرادفات والمتضادات الشائعة لتسرع في الإجابة وتقلل التشتت.",
    branches: [
      { id: "antonyms", name: "المتضادات", icon: "↔️" },
      { id: "synonyms", name: "المرادفات", icon: "🟰" },
      { id: "meanings", name: "معاني المفردات", icon: "📖" },
    ],
    commonQuestions: [
      "اختيار مرادف لكلمة معطاة",
      "اختيار ضد كلمة معطاة",
      "تحديد المعنى الأقرب لكلمة في سياق",
    ],
    fastestMethods: [
      "حلّل جذر الكلمة لاستنتاج معناها",
      "استبعد الخيارات البعيدة عن المجال الدلالي",
      "تذكّر السياق الشائع لاستخدام الكلمة",
    ],
  },
};

function PracticePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  // Read `focus` once at mount and use it ONLY as the initial value of
  // `selectedSection`. Because `useState`'s initializer runs exactly
  // once on first render, this:
  //   - applies the deep-link on initial load,
  //   - never re-applies on later renders or URL changes,
  //   - never overrides the user's clicks (clicks call setSelectedSection
  //     normally and that becomes the source of truth from then on).
  // Unsupported / missing focus values fall through to the original
  // default of "quantitative" — no behavior change for direct visits.
  const [selectedSection, setSelectedSection] = useState<"quantitative" | "verbal">(
    () => focusToSection(searchParams.get("focus")) ?? "quantitative"
  );
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState(10);
  const [showSettings, setShowSettings] = useState(false);

  const currentSection = practiceCategories[selectedSection];
  const selectedTopicData = currentSection.topics.find(t => t.id === selectedTopic);
  const currentTopicDetail = selectedTopic ? topicDetails[selectedTopic] : null;
  const accent = selectedSection === "quantitative" ? "#006C35" : "#D4AF37";

  const handleStartPractice = () => {
    if (!selectedTopic) {
      alert("يرجى اختيار موضوع للتدريب");
      return;
    }
    if (currentTopicDetail && !selectedBranch) {
      alert("يرجى اختيار فرع داخل الموضوع");
      return;
    }

    // Navigate to practice test with parameters (includes branch when available)
    const params = new URLSearchParams({
      topic: selectedTopic,
      section: selectedSection,
      count: questionCount.toString(),
      difficulty: selectedDifficulty,
    });
    if (selectedBranch) params.set("branch", selectedBranch);

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
                  setSelectedBranch(null);
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
              onClick={() => {
                setSelectedTopic(topic.id);
                setSelectedBranch(null);
              }}
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

        {/* Topic Detail Step (branches, common questions, fastest methods) */}
        {selectedTopic && currentTopicDetail && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 shadow-sm border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-2 duration-300">
            {/* Title + short description */}
            <div className="flex items-start gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
                style={{ backgroundColor: `${accent}1A` }}
              >
                {selectedTopicData?.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {selectedTopicData?.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {currentTopicDetail.description}
                </p>
              </div>
            </div>

            {/* Branches */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-xl">🧩</span>
                اختر فرعاً داخل الموضوع
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {currentTopicDetail.branches.map((b) => {
                  const active = selectedBranch === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBranch(b.id)}
                      className={`p-4 rounded-xl border-2 text-right transition-all flex items-center gap-3 ${
                        active
                          ? selectedSection === "quantitative"
                            ? "border-[#006C35] bg-[#006C35]/5 dark:bg-[#006C35]/20"
                            : "border-[#D4AF37] bg-[#D4AF37]/5 dark:bg-[#D4AF37]/20"
                          : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <span className="text-2xl">{b.icon}</span>
                      <span
                        className={`font-bold flex-1 ${
                          active
                            ? selectedSection === "quantitative"
                              ? "text-[#006C35] dark:text-[#4ade80]"
                              : "text-[#D4AF37] dark:text-[#fbbf24]"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {b.name}
                      </span>
                      {active && (
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: accent }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Two-column: common questions + fastest methods */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
              <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">❓</span>
                  الأسئلة الأكثر شيوعاً
                </h4>
                <ul className="space-y-2">
                  {currentTopicDetail.commonQuestions.map((q) => (
                    <li
                      key={q}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2 leading-relaxed"
                    >
                      <span
                        className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      {q}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl p-5 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="text-xl">⚡</span>
                  أسرع الطرق
                </h4>
                <ul className="space-y-2">
                  {currentTopicDetail.fastestMethods.map((m) => (
                    <li
                      key={m}
                      className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2 leading-relaxed"
                    >
                      <span
                        className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* "ابدأ التدريب" header (visible once a branch is selected) */}
        {selectedTopic && selectedBranch && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">▶️</span>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">ابدأ التدريب</h3>
          </div>
        )}

        {/* Practice Settings (kept as-is, now gated on branch selection) */}
        {selectedTopic && (!currentTopicDetail || selectedBranch) && (
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
            disabled={!selectedTopic || (!!currentTopicDetail && !selectedBranch)}
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

// `useSearchParams` requires a Suspense boundary in Next 15. We wrap
// the inner page so the build doesn't bail out of static analysis,
// while preserving the full original UI unchanged.
export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticePageInner />
    </Suspense>
  );
}
