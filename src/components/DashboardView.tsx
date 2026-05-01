"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import AIAssistant from "@/components/AIAssistant";
import ProgressCharts from "@/components/ProgressCharts";
import type { BundleId } from "@/data/types";

interface DashboardViewProps {
  /**
   * When set, the dashboard locks to a single exam category and the
   * Aptitude/Achievement group selector is hidden. The variant toggle
   * (Qudrat/GAT or Tahsili/SAAT) inside the locked group is still shown.
   * When omitted, both groups render (legacy unified dashboard behavior).
   */
  lockedExamType?: "qudurat" | "tahsili";
}

export default function DashboardView({ lockedExamType }: DashboardViewProps = {}) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [subscriptionPackage, setSubscriptionPackage] = useState<BundleId>("aptitude");
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");
  const [examType, setExamType] = useState<"qudurat" | "tahsili">(lockedExamType ?? "qudurat");
  const [quduratType, setQuduratType] = useState<"general" | "gat">("general");
  const [tahsiliType, setTahsiliType] = useState<"tahsili" | "saat">("tahsili");
  const [activeTab, setActiveTab] = useState<"comprehensive" | "quantitative" | "verbal">("comprehensive");
  const [dashboardView, setDashboardView] = useState<"overview" | "progress">("overview");
  const [tahsiliTab, setTahsiliTab] = useState<"comprehensive" | "math" | "physics" | "chemistry" | "biology">("comprehensive");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);

  // Sidebar collapsible "تدريب" / "التدريب" group — used by both /qudrat
  // (children: كمي، لفظي) and /tahsili (children: رياضيات، فيزياء، كيمياء،
  // أحياء). Only one of those sidebars renders at a time (driven by
  // lockedExamType) so a single shared open-state is safe. The dropdown is
  // open by default when the user is currently on a /practice deep link that
  // matches any of the recognized focus values, so the active sub-item is
  // visible without an extra click.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const practiceFocus = searchParams?.get("focus") ?? null;
  const PRACTICE_CHILD_FOCUSES = [
    "quantitative_ar",
    "verbal_ar",
    "math_ar",
    "physics_ar",
    "chemistry_ar",
    "biology_ar",
  ] as const;
  // The practice submenu auto-opens when the user is on a recognized child —
  // either the new per-subject page (/practice/<subject>) or the legacy
  // /practice?focus=..._ar URL.
  const PRACTICE_CHILD_PATHS = [
    "/practice/quantitative",
    "/practice/verbal",
    "/practice/math",
    "/practice/physics",
    "/practice/chemistry",
    "/practice/biology",
  ] as const;
  const isOnPracticeChild =
    (pathname !== null && (PRACTICE_CHILD_PATHS as readonly string[]).includes(pathname)) ||
    (pathname === "/practice" &&
      practiceFocus !== null &&
      (PRACTICE_CHILD_FOCUSES as readonly string[]).includes(practiceFocus));
  const [practiceOpen, setPracticeOpen] = useState<boolean>(isOnPracticeChild);

  // Re-open the submenu on client-side navigation onto any recognized child
  // route (useState initializer only runs on mount). We only ever force the
  // dropdown OPEN here — never closed — so the user's manual collapse on
  // unrelated pages is preserved.
  useEffect(() => {
    if (isOnPracticeChild) setPracticeOpen(true);
  }, [isOnPracticeChild]);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [quduratType, tahsiliType]);

  // Keep examType in sync if the route changes (e.g. user navigates
  // /qudrat → /tahsili via the sidebar) while this component instance
  // happens to be reused. No-op when lockedExamType is undefined.
  useEffect(() => {
    if (lockedExamType) setExamType(lockedExamType);
  }, [lockedExamType]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "مستخدم";
  const userInitial = userName.charAt(0).toUpperCase();

  const userProgressData = {
    qudurat: {
      general: { currentScore: 72, targetScore: 95, testsCompleted: 3, hoursStudied: 8 },
      gat: { currentScore: 68, targetScore: 90, testsCompleted: 2, hoursStudied: 5 },
    },
    tahsili: {
      tahsili: { currentScore: 75, targetScore: 95, testsCompleted: 4, hoursStudied: 10 },
      saat: { currentScore: 70, targetScore: 92, testsCompleted: 3, hoursStudied: 7 },
    },
  };

  const getCurrentProgress = () => {
    if (examType === "qudurat") {
      return userProgressData.qudurat[quduratType];
    }
    return userProgressData.tahsili[tahsiliType];
  };

  const userProgress = getCurrentProgress();

  const performanceData = {
    qudurat: {
      general: {
        topics: [
          { name: "الجبر", score: 85, total: 100 },
          { name: "الهندسة", score: 70, total: 100 },
          { name: "النسب والتناسب", score: 90, total: 100 },
          { name: "الإحصاء", score: 65, total: 100 },
          { name: "التناظر اللفظي", score: 80, total: 100 },
          { name: "إكمال الجمل", score: 75, total: 100 },
          { name: "استيعاب المقروء", score: 60, total: 100 },
        ],
        strengths: ["النسب والتناسب", "الجبر", "التناظر اللفظي"],
        weaknesses: ["استيعاب المقروء", "الإحصاء"],
      },
      gat: {
        topics: [
          { name: "Algebra", score: 80, total: 100 },
          { name: "Geometry", score: 65, total: 100 },
          { name: "Ratios & Proportions", score: 85, total: 100 },
          { name: "Statistics", score: 70, total: 100 },
          { name: "Analogies", score: 75, total: 100 },
          { name: "Sentence Completion", score: 80, total: 100 },
          { name: "Reading Comprehension", score: 55, total: 100 },
        ],
        strengths: ["Ratios & Proportions", "Algebra", "Sentence Completion"],
        weaknesses: ["Reading Comprehension", "Geometry"],
      },
    },
    tahsili: {
      tahsili: {
        topics: [
          { name: "الرياضيات", score: 88, total: 100 },
          { name: "الفيزياء", score: 72, total: 100 },
          { name: "الكيمياء", score: 65, total: 100 },
          { name: "الأحياء", score: 80, total: 100 },
        ],
        strengths: ["الرياضيات", "الأحياء"],
        weaknesses: ["الكيمياء", "الفيزياء"],
      },
      saat: {
        topics: [
          { name: "Mathematics", score: 85, total: 100 },
          { name: "Physics", score: 70, total: 100 },
          { name: "Chemistry", score: 62, total: 100 },
          { name: "Biology", score: 78, total: 100 },
        ],
        strengths: ["Mathematics", "Biology"],
        weaknesses: ["Chemistry", "Physics"],
      },
    },
  };

  const getCurrentPerformance = () => {
    if (examType === "qudurat") {
      return performanceData.qudurat[quduratType];
    }
    return performanceData.tahsili[tahsiliType];
  };

  const currentPerformance = getCurrentPerformance();

  const leaderboards = {
    qudurat: {
      general: [
        { rank: 1, name: "محمد العتيبي", score: 98, testsCompleted: 15, badge: "🥇" },
        { rank: 2, name: "سارة القحطاني", score: 96, testsCompleted: 14, badge: "🥈" },
        { rank: 3, name: "عبدالله السعيد", score: 95, testsCompleted: 13, badge: "🥉" },
        { rank: 4, name: "نورة الشمري", score: 94, testsCompleted: 12, badge: "" },
        { rank: 5, name: "خالد المالكي", score: 93, testsCompleted: 11, badge: "" },
        { rank: 6, name: "فاطمة الحربي", score: 92, testsCompleted: 10, badge: "" },
        { rank: 7, name: "أحمد الدوسري", score: 91, testsCompleted: 10, badge: "" },
        { rank: 8, name: "ريم العنزي", score: 90, testsCompleted: 9, badge: "" },
      ],
      gat: [
        { rank: 1, name: "Ahmed Hassan", score: 97, testsCompleted: 12, badge: "🥇" },
        { rank: 2, name: "Sara Ali", score: 95, testsCompleted: 11, badge: "🥈" },
        { rank: 3, name: "Omar Khan", score: 94, testsCompleted: 10, badge: "🥉" },
        { rank: 4, name: "Fatima Noor", score: 92, testsCompleted: 9, badge: "" },
        { rank: 5, name: "Yusuf Ahmed", score: 91, testsCompleted: 9, badge: "" },
        { rank: 6, name: "Layla Hassan", score: 90, testsCompleted: 8, badge: "" },
        { rank: 7, name: "Zain Mohammed", score: 89, testsCompleted: 8, badge: "" },
        { rank: 8, name: "Nadia Saleh", score: 88, testsCompleted: 7, badge: "" },
      ],
    },
    tahsili: {
      tahsili: [
        { rank: 1, name: "عمر الغامدي", score: 99, testsCompleted: 18, badge: "🥇" },
        { rank: 2, name: "لمى البلوي", score: 97, testsCompleted: 16, badge: "🥈" },
        { rank: 3, name: "فهد السبيعي", score: 96, testsCompleted: 15, badge: "🥉" },
        { rank: 4, name: "هند الزهراني", score: 95, testsCompleted: 14, badge: "" },
        { rank: 5, name: "سعود القرني", score: 94, testsCompleted: 13, badge: "" },
        { rank: 6, name: "منى العمري", score: 93, testsCompleted: 12, badge: "" },
        { rank: 7, name: "تركي الشهري", score: 92, testsCompleted: 11, badge: "" },
        { rank: 8, name: "دانة الحارثي", score: 91, testsCompleted: 10, badge: "" },
      ],
      saat: [
        { rank: 1, name: "Khalid Al-Rashid", score: 98, testsCompleted: 14, badge: "🥇" },
        { rank: 2, name: "Noura Al-Fahad", score: 96, testsCompleted: 13, badge: "🥈" },
        { rank: 3, name: "Faisal Al-Dosari", score: 95, testsCompleted: 12, badge: "🥉" },
        { rank: 4, name: "Hala Al-Mutairi", score: 93, testsCompleted: 11, badge: "" },
        { rank: 5, name: "Sultan Al-Harbi", score: 92, testsCompleted: 10, badge: "" },
        { rank: 6, name: "Reem Al-Otaibi", score: 91, testsCompleted: 9, badge: "" },
        { rank: 7, name: "Mansour Al-Qahtani", score: 90, testsCompleted: 9, badge: "" },
        { rank: 8, name: "Lina Al-Shammari", score: 89, testsCompleted: 8, badge: "" },
      ],
    },
  };

  const getCurrentLeaderboard = () => {
    if (examType === "qudurat") {
      return leaderboards.qudurat[quduratType];
    }
    return leaderboards.tahsili[tahsiliType];
  };

  const currentLeaderboard = getCurrentLeaderboard();

  const isEnglish = (examType === "qudurat" && quduratType === "gat") || (examType === "tahsili" && tahsiliType === "saat");

  const openSubscribeModal = () => {
    // Pre-select the bundle that matches the dashboard route the user is on:
    //   /qudrat  → "aptitude"    (Qudrat + GAT)
    //   /tahsili → "achievement" (Tahsili + SAAT)
    // Falls back to the user's currently active examType for the legacy
    // unified dashboard view (when lockedExamType is undefined).
    const bundle = (lockedExamType ?? examType) === "tahsili" ? "achievement" : "aptitude";
    setSubscriptionPackage(bundle);
    setShowSubscribeModal(true);
  };

  // Build the "Start Practice" href so it reflects the currently
  // selected exam category and section. Without this, /practice always
  // received zero focus and defaulted to the Qudrat-AR topic picker —
  // showing كمي/لفظي labels even for GAT / Tahsili / SAAT users.
  //
  // The /practice page already knows what to do with each focus value:
  //   - quantitative_ar / verbal_ar → render the existing Qudrat-AR
  //     topic picker (default tab = matching section). No focus param
  //     stays on Qudrat-AR comprehensive (preserves today's behavior).
  //   - quantitative_en / verbal_en (GAT)
  //   - math_ar / physics_ar / chemistry_ar / biology_ar (Tahsili-AR)
  //   - math_en / physics_en / chemistry_en / biology_en (SAAT)
  //     For all of these the page auto-redirects to
  //     /practice/test?focus=<focus>&count=10&difficulty=all because the
  //     Qudrat topic grid has no matching topics. No new UI is needed.
  //
  // Comprehensive tabs map to a sensible default (quantitative for GAT,
  // math for Tahsili/SAAT) so the user lands in a real session instead
  // of an empty / mismatched picker.
  const practiceHref = (() => {
    if (examType === "qudurat") {
      if (quduratType === "general") {
        // Qudrat-AR: keep today's behavior. activeTab "comprehensive"
        // → bare /practice (full topic picker, exactly as today).
        // activeTab quantitative/verbal → focus the matching section
        // (the picker already supports both via focusToSection).
        if (activeTab === "quantitative") return "/practice?focus=quantitative_ar";
        if (activeTab === "verbal") return "/practice?focus=verbal_ar";
        return "/practice";
      }
      // GAT (English) — never the Arabic Qudrat picker.
      if (activeTab === "verbal") return "/practice?focus=verbal_en";
      return "/practice?focus=quantitative_en";
    }
    // Tahsili family
    const subjectMap: Record<typeof tahsiliTab, string> = {
      comprehensive: "math",
      math: "math",
      physics: "physics",
      chemistry: "chemistry",
      biology: "biology",
    };
    const subject = subjectMap[tahsiliTab];
    const suffix = tahsiliType === "tahsili" ? "ar" : "en"; // tahsili-AR vs SAAT-EN
    return `/practice?focus=${subject}_${suffix}`;
  })();

  // دالة للذهاب مباشرة للاختبار (مجاني مؤقتاً)
  const goToTest = () => {
    if (examType === "qudurat") {
      if (quduratType === "general") {
        router.push("/test/qudrat-ar");
      } else {
        router.push("/test/gat-en");
      }
    } else {
      if (tahsiliType === "tahsili") {
        if (tahsiliTab === "comprehensive") {
          router.push("/test/tahsili-ar");
        } else {
          router.push(`/test/tahsili-ar?subject=${tahsiliTab}_ar`);
        }
      } else {
        router.push("/test/saat-en");
      }
    }
  };

  const quduratGeneralFreeTest = {
    id: "qudurat-general-trial",
    title: "اختبار القدرات العامة التجريبي",
    description: "جرب قبل الاشتراك - 40 سؤال شامل",
    questions: 40,
    duration: 60,
    isFree: true,
    sections: {
      quantitative: ["الجبر", "الهندسة", "النسب والتناسب", "الإحصاء"],
      verbal: ["التناظر اللفظي", "إكمال الجمل", "استيعاب المقروء", "الخطأ السياقي", "المفردة الشاذة"],
    },
  };

  const gatFreeTest = {
    id: "gat-trial",
    title: "GAT Free Trial Test",
    description: "Try before subscribing - 40 comprehensive questions",
    questions: 40,
    duration: 60,
    isFree: true,
    sections: {
      quantitative: ["Algebra", "Geometry", "Ratios", "Statistics"],
      verbal: ["Analogies", "Sentence Completion", "Reading Comprehension"],
    },
  };

  const tahsiliFreeTest = {
    id: "tahsili-trial",
    title: "اختبار التحصيلي التجريبي المجاني",
    description: "جرب قبل الاشتراك - 40 سؤال شامل",
    questions: 40,
    duration: 60,
    isFree: true,
    sections: {
      scientific: ["الرياضيات", "الفيزياء", "الكيمياء", "الأحياء"],
    },
  };

  const saatFreeTest = {
    id: "saat-trial",
    title: "SAAT Free Trial Test",
    description: "Try before subscribing - 40 comprehensive questions",
    questions: 40,
    duration: 60,
    isFree: true,
    sections: {
      scientific: ["Mathematics", "Physics", "Chemistry", "Biology"],
    },
  };

  const quduratComprehensiveTests = Array.from({ length: 20 }, (_, i) => ({
    id: `qudurat-comprehensive-${i + 1}`,
    title: `اختبار القدرات الشامل (${i + 1})`,
    description: "اختبار شامل يغطي جميع الأقسام",
    questions: 120,
    duration: 120,
    number: i + 1,
  }));

  const gatComprehensiveTests = Array.from({ length: 20 }, (_, i) => ({
    id: `gat-comprehensive-${i + 1}`,
    title: `GAT Comprehensive Test (${i + 1})`,
    description: "Full test covering all sections",
    questions: 120,
    duration: 120,
    number: i + 1,
  }));

  const tahsiliComprehensiveTests = Array.from({ length: 20 }, (_, i) => ({
    id: `tahsili-comprehensive-${i + 1}`,
    title: `اختبار التحصيلي الشامل (${i + 1})`,
    description: "اختبار شامل يغطي جميع المواد",
    questions: 100,
    duration: 90,
    number: i + 1,
  }));

  const saatComprehensiveTests = Array.from({ length: 20 }, (_, i) => ({
    id: `saat-comprehensive-${i + 1}`,
    title: `SAAT Comprehensive Test (${i + 1})`,
    description: "Full test covering all subjects",
    questions: 100,
    duration: 90,
    number: i + 1,
  }));

  const quantitativeTopics = [
    { id: "algebra", name: "الجبر", icon: "📐", color: "from-blue-500 to-blue-600" },
    { id: "geometry", name: "الهندسة", icon: "📏", color: "from-purple-500 to-purple-600" },
    { id: "ratios", name: "النسب والتناسب", icon: "⚖️", color: "from-teal-500 to-teal-600" },
    { id: "statistics", name: "الإحصاء", icon: "📊", color: "from-orange-500 to-orange-600" },
  ];

  const gatQuantitativeTopics = [
    { id: "algebra", name: "Algebra", icon: "📐", color: "from-blue-500 to-blue-600" },
    { id: "geometry", name: "Geometry", icon: "📏", color: "from-purple-500 to-purple-600" },
    { id: "ratios", name: "Ratios & Proportions", icon: "⚖️", color: "from-teal-500 to-teal-600" },
    { id: "statistics", name: "Statistics", icon: "📊", color: "from-orange-500 to-orange-600" },
  ];

  const verbalTopics = [
    { id: "analogy", name: "التناظر اللفظي", icon: "🔤", color: "from-pink-500 to-pink-600" },
    { id: "completion", name: "إكمال الجمل", icon: "✍️", color: "from-indigo-500 to-indigo-600" },
    { id: "comprehension", name: "استيعاب المقروء", icon: "📖", color: "from-green-500 to-green-600" },
    { id: "contextual", name: "الخطأ السياقي", icon: "🔍", color: "from-red-500 to-red-600" },
    { id: "odd", name: "المفردة الشاذة", icon: "❌", color: "from-amber-500 to-amber-600" },
  ];

  const gatVerbalTopics = [
    { id: "analogies", name: "Analogies", icon: "🔤", color: "from-pink-500 to-pink-600" },
    { id: "sentence", name: "Sentence Completion", icon: "✍️", color: "from-indigo-500 to-indigo-600" },
    { id: "reading", name: "Reading Comprehension", icon: "📖", color: "from-green-500 to-green-600" },
  ];

  const tahsiliTopics = [
    { id: "math", name: "الرياضيات", icon: "🔢", color: "from-blue-500 to-blue-600", tests: 15 },
    { id: "physics", name: "الفيزياء", icon: "⚡", color: "from-purple-500 to-purple-600", tests: 15 },
    { id: "chemistry", name: "الكيمياء", icon: "🧪", color: "from-green-500 to-green-600", tests: 15 },
    { id: "biology", name: "الأحياء", icon: "🧬", color: "from-pink-500 to-pink-600", tests: 15 },
  ];

  const saatTopics = [
    { id: "math", name: "Mathematics", icon: "🔢", color: "from-blue-500 to-blue-600", tests: 15 },
    { id: "physics", name: "Physics", icon: "⚡", color: "from-purple-500 to-purple-600", tests: 15 },
    { id: "chemistry", name: "Chemistry", icon: "🧪", color: "from-green-500 to-green-600", tests: 15 },
    { id: "biology", name: "Biology", icon: "🧬", color: "from-pink-500 to-pink-600", tests: 15 },
  ];

  const progressPercentage = Math.round((userProgress.currentScore / userProgress.targetScore) * 100);

  return (
    <div className={`min-h-screen bg-[#F8FAF9] dark:bg-gray-900 transition-colors duration-300 ${isEnglish ? 'direction-ltr' : ''}`} dir={isEnglish ? "ltr" : "rtl"}>
      {/* Sidebar — desktop only, right-pinned in RTL / left-pinned in LTR */}
      <aside className={`hidden lg:flex lg:flex-col lg:fixed lg:top-0 lg:bottom-0 lg:w-[260px] lg:bg-white lg:dark:bg-gray-800 lg:z-30 lg:transition-colors lg:duration-300 ${isEnglish ? 'lg:left-0 lg:border-r lg:border-gray-200 lg:dark:border-gray-700' : 'lg:right-0 lg:border-l lg:border-gray-200 lg:dark:border-gray-700'}`}>
        {/* Brand */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#006C35] rounded-xl flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <span className="font-bold text-base text-gray-900 dark:text-white truncate">
              {isEnglish ? "Dalilak Qiyas" : "دليلك إلى قياس"}
            </span>
          </Link>
        </div>

        {/* Nav — route-aware. The sidebar items are derived from `lockedExamType`
            so /qudrat shows the Qudrat product menu (الرئيسية، التقدم، كمي،
            لفظي، تدريب، بنك الاختبارات), /tahsili shows the Tahsili product
            menu (الرئيسية، التقدم، التدريب، بنك الاختبارات), and the legacy
            unlocked /dashboard view keeps its original cross-product items.
            Anchor links (#overview, #progress, #practice, #test-bank) jump to
            section IDs added below. كمي/لفظي/التدريب route to the practice
            picker with the appropriate `?focus=` deep link. */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto flex flex-col">
          <p className="px-3 mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {isEnglish ? "Menu" : "القائمة"}
          </p>
          <div className="space-y-1.5">
            {/* Sidebar nav config. The Qudrat branch now expresses تدريب as a
                collapsible group with `children` (كمي / لفظي) instead of
                listing them as their own top-level items — see the
                `item.children` branch in the renderer below. /tahsili and the
                legacy /dashboard arrays are intentionally unchanged. */}
            {(lockedExamType === "qudurat"
              ? [
                  { href: "#overview",  labelAr: "الرئيسية",       labelEn: "Home",      icon: "home" as const },
                  { href: "#progress",  labelAr: "التقدم",         labelEn: "Progress",  icon: "chart" as const },
                  {
                    href: "/practice",
                    labelAr: "تدريب",
                    labelEn: "Practice",
                    icon: "book" as const,
                    children: [
                      { href: "/practice/quantitative", labelAr: "كمي",  labelEn: "Quantitative", icon: "calc" as const },
                      { href: "/practice/verbal",       labelAr: "لفظي", labelEn: "Verbal",       icon: "pen" as const },
                    ],
                  },
                  { href: "#test-bank", labelAr: "بنك الاختبارات", labelEn: "Test Bank", icon: "stack" as const },
                ]
              : lockedExamType === "tahsili"
              ? [
                  { href: "#overview", labelAr: "الرئيسية", labelEn: "Home",     icon: "home" as const },
                  { href: "#progress", labelAr: "التقدم",   labelEn: "Progress", icon: "chart" as const },
                  {
                    // التدريب is a toggle-only parent — clicking it just
                    // opens/closes the 4-subject submenu beneath it; the
                    // user always picks a specific subject from the children.
                    // The href below is unused for navigation (kept only as
                    // a stable React `key` for the nav list).
                    href: "/practice?focus=math_ar",
                    labelAr: "التدريب",
                    labelEn: "Training",
                    icon: "book" as const,
                    children: [
                      { href: "/practice/math",      labelAr: "رياضيات", labelEn: "Math",      icon: "calc" as const },
                      { href: "/practice/physics",   labelAr: "فيزياء",  labelEn: "Physics",   icon: "atom" as const },
                      { href: "/practice/chemistry", labelAr: "كيمياء",  labelEn: "Chemistry", icon: "flask" as const },
                      { href: "/practice/biology",   labelAr: "أحياء",   labelEn: "Biology",   icon: "leaf" as const },
                    ],
                  },
                  { href: "#test-bank", labelAr: "بنك الاختبارات", labelEn: "Test Bank", icon: "stack" as const },
                ]
              : [
                  // Legacy /dashboard fallback — preserves the original cross-
                  // product items so the unlocked view isn't broken.
                  { href: "/qudrat",        labelAr: "القدرات",       labelEn: "Aptitude",      icon: "brain" as const },
                  { href: "/tahsili",       labelAr: "التحصيلي",       labelEn: "Achievement",   icon: "cap" as const },
                  { href: "/practice",      labelAr: "التدريب",        labelEn: "Practice",      icon: "book" as const },
                  { href: "/profile",       labelAr: "الملف الشخصي", labelEn: "Profile",       icon: "user" as const },
                ]
            ).map((item) => {
              // Inline icon renderer reused for both the parent items and the
              // collapsible group's sub-items. The key union must be widened
              // to include every icon used anywhere in the nav (parents *and*
              // children) — TypeScript narrows `item.icon` based on the
              // top-level array entries, but children may use a wider set
              // (e.g. "calc"/"pen" only appear under the تدريب group).
              type IconKey = "home" | "chart" | "calc" | "pen" | "book" | "stack" | "brain" | "cap" | "user" | "atom" | "flask" | "leaf";
              const renderIcon = (key: IconKey) => (
                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  {key === "home" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" /></svg>
                  )}
                  {key === "chart" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                  )}
                  {key === "calc" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-6 4h2m4 0h2M5 5a2 2 0 012-2h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5z" /></svg>
                  )}
                  {key === "pen" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  )}
                  {key === "book" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                  )}
                  {key === "stack" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  )}
                  {key === "brain" && <span className="text-base">🧠</span>}
                  {key === "cap" && <span className="text-base">🎓</span>}
                  {key === "user" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  )}
                  {/* Subject icons used by the /tahsili تدريب submenu —
                      atom (physics), flask (chemistry), leaf (biology). */}
                  {key === "atom" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="2" strokeWidth={2} /><ellipse cx="12" cy="12" rx="10" ry="4" strokeWidth={2} /><ellipse cx="12" cy="12" rx="10" ry="4" strokeWidth={2} transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" strokeWidth={2} transform="rotate(120 12 12)" /></svg>
                  )}
                  {key === "flask" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3h6M10 3v6L4.5 18a2 2 0 001.73 3h11.54a2 2 0 001.73-3L14 9V3M8 14h8" /></svg>
                  )}
                  {key === "leaf" && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 21c0-9 6-15 15-15 0 9-6 15-15 15zm0 0L15 11" /></svg>
                  )}
                </span>
              );

              // Collapsible group — used by تدريب on /qudrat (children: كمي،
              // لفظي) and التدريب on /tahsili (children: رياضيات، فيزياء،
              // كيمياء، أحياء). Renders a single button row that ONLY toggles
              // the dropdown (the parent label no longer navigates anywhere)
              // plus an indented list of sub-item Links. Sub-items point at
              // the per-subject /practice/<subject> pages (overview + worked
              // example), each of which has its own CTA into /practice?focus=...
              if ("children" in item && item.children) {
                // Highlight the right child both when the user is on the new
                // per-subject pathname (e.g. /practice/math) AND when they're on
                // the legacy /practice?focus=math_ar URL (still used by the
                // Tahsili parent and by every "ابدأ التدريب الآن" CTA on the
                // subject pages). Exact equality on the focus key avoids false
                // positives if focus values ever share substrings.
                const childFocusOf = (href: string): string | null => {
                  // Legacy querystring form — extract focus directly.
                  const m = href.match(/[?&]focus=([^&]+)/);
                  if (m) return decodeURIComponent(m[1]);
                  // New per-subject pathname form — map to its corresponding
                  // legacy focus value so highlighting still works on /practice.
                  const PATH_TO_FOCUS: Record<string, string> = {
                    "/practice/quantitative": "quantitative_ar",
                    "/practice/verbal":       "verbal_ar",
                    "/practice/math":         "math_ar",
                    "/practice/physics":      "physics_ar",
                    "/practice/chemistry":    "chemistry_ar",
                    "/practice/biology":      "biology_ar",
                  };
                  return PATH_TO_FOCUS[href] ?? null;
                };
                const isActiveChild = (href: string): boolean => {
                  // New per-subject pages live at /practice/<subject> — exact pathname match.
                  if (href.startsWith("/practice/") && pathname === href) return true;
                  // Legacy /practice?focus=... — highlight by focus key derived above.
                  return pathname === "/practice" && practiceFocus !== null && childFocusOf(href) === practiceFocus;
                };
                const isActiveParent = item.children.some((c) => isActiveChild(c.href));
                return (
                  <div key={item.href}>
                    {/* Single button row — clicking anywhere on the parent
                        (icon, label, or chevron) only toggles the dropdown.
                        The parent no longer navigates anywhere; the user
                        always picks a specific subject from the submenu. */}
                    <button
                      type="button"
                      onClick={() => setPracticeOpen((v) => !v)}
                      aria-expanded={practiceOpen}
                      aria-controls="practice-submenu"
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActiveParent
                          ? "bg-[#006C35] text-white shadow-sm shadow-[#006C35]/30"
                          : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                      }`}
                    >
                      {renderIcon(item.icon)}
                      <span className="flex-1 text-start">{isEnglish ? item.labelEn : item.labelAr}</span>
                      {/* Chevron — points down, rotates 180° when open. */}
                      <svg
                        className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${practiceOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {practiceOpen && (
                      <div
                        id="practice-submenu"
                        // Indent in RTL via padding-inline-start; keeps layout
                        // mirrored correctly in both directions.
                        className="mt-1 ps-6 space-y-1"
                      >
                        {item.children.map((child) => {
                          const active = isActiveChild(child.href);
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                active
                                  ? "bg-[#006C35] text-white shadow-sm shadow-[#006C35]/30"
                                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
                              }`}
                            >
                              {renderIcon(child.icon)}
                              <span>{isEnglish ? child.labelEn : child.labelAr}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              // Default leaf item — unchanged from before.
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  {renderIcon(item.icon)}
                  <span>{isEnglish ? item.labelEn : item.labelAr}</span>
                </Link>
              );
            })}
          </div>

          {/* Bottom section — الاشتراكات + الدعم الفني. Pinned to the bottom of
              the nav scroll area so it always sits beneath the main items. */}
          <div className="mt-auto pt-6 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
            <Link
              href="/subscriptions"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>{isEnglish ? "Subscriptions" : "الاشتراكات"}</span>
            </Link>
            {/* الدعم الفني — no /support route exists yet, so this is a non-
                breaking placeholder that opens the user's mail client to the
                support address already published in the landing footer. */}
            <a
              href="mailto:support@dalilqiyas.sa"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>{isEnglish ? "Support" : "الدعم الفني"}</span>
            </a>
          </div>
        </nav>

        {/* Bottom: theme toggle (preserves existing toggleTheme handler) */}
        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            )}
            <span>{theme === "light" ? (isEnglish ? "Dark Mode" : "الوضع الليلي") : (isEnglish ? "Light Mode" : "الوضع النهاري")}</span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className={`min-h-screen ${isEnglish ? 'lg:ml-[260px]' : 'lg:mr-[260px]'}`}>
        {/* Top header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-20 transition-colors duration-300">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
            {/* Mobile-only logo (sidebar is hidden on mobile) */}
            <Link href="/" className="lg:hidden flex items-center gap-2">
              <div className="w-8 h-8 bg-[#006C35] rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <span className="font-bold text-sm text-gray-900 dark:text-white">
                {isEnglish ? "Dalilak Qiyas" : "دليلك إلى قياس"}
              </span>
            </Link>

            {/* Page title (desktop) — reflects the locked exam category, falls
                back to "Dashboard" for the legacy unified view. */}
            <h1 className="hidden lg:block text-base font-bold text-gray-900 dark:text-white">
              {lockedExamType === "qudurat"
                ? (isEnglish ? "Aptitude" : "القدرات")
                : lockedExamType === "tahsili"
                ? (isEnglish ? "Achievement" : "التحصيلي")
                : (isEnglish ? "Dashboard" : "لوحة التحكم")
              }
            </h1>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Mobile-only theme toggle (desktop has it in the sidebar bottom) */}
              <button
                onClick={toggleTheme}
                className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
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

              {/* Notification bell (decorative chrome — no behavior added per scope) */}
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label={isEnglish ? "Notifications" : "الإشعارات"}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>

              {/* User Dropdown — preserves existing showUserMenu state and items */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-9 h-9 rounded-full bg-[#006C35] text-white flex items-center justify-center text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  {userInitial}
                </button>

                {showUserMenu && (
                  <div className={`absolute ${isEnglish ? 'right-0' : 'left-0'} mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg py-2 z-50 border border-gray-200 dark:border-gray-700`}>
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{userName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                    </div>
                    <Link
                      href="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      {isEnglish ? "Profile" : "الملف الشخصي"}
                    </Link>
                    <Link
                      href="/subscriptions"
                      className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => setShowUserMenu(false)}
                    >
                      {isEnglish ? "Subscriptions" : "الاشتراكات"}
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className={`w-full ${isEnglish ? 'text-left' : 'text-right'} px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}
                    >
                      {isEnglish ? "Sign Out" : "تسجيل الخروج"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6">
          {/* Mobile category switcher — the desktop sidebar that hosts the
              /qudrat ↔ /tahsili links is `hidden lg:flex`, so on mobile users
              would otherwise have no way to switch categories now that the
              opposite group's card is hidden when locked. Only renders when
              the page is locked to one category (i.e. on /qudrat or /tahsili,
              not on the legacy unified dashboard). */}
          {lockedExamType && (
            <div className="lg:hidden mb-5 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl flex gap-1" role="navigation" aria-label={isEnglish ? "Exam category" : "نوع الاختبار"}>
              <Link
                href="/qudrat"
                aria-current={lockedExamType === "qudurat" ? "page" : undefined}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-all ${
                  lockedExamType === "qudurat"
                    ? "bg-[#006C35] text-white font-semibold shadow-sm"
                    : "text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-700"
                }`}
              >
                <span aria-hidden="true">🧠</span>
                {isEnglish ? "Aptitude" : "القدرات"}
              </Link>
              <Link
                href="/tahsili"
                aria-current={lockedExamType === "tahsili" ? "page" : undefined}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm transition-all ${
                  lockedExamType === "tahsili"
                    ? "bg-[#006C35] text-white font-semibold shadow-sm"
                    : "text-gray-600 dark:text-gray-300 font-medium hover:bg-white dark:hover:bg-gray-700"
                }`}
              >
                <span aria-hidden="true">🎓</span>
                {isEnglish ? "Achievement" : "التحصيلي"}
              </Link>
            </div>
          )}

          {/* Banner — relocates the old top-bar Subscribe CTA into the spec's banner slot */}
          <div className="relative overflow-hidden bg-gradient-to-br from-[#006C35] via-[#007a3d] to-[#00A651] rounded-2xl p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm shadow-[#006C35]/20">
            <div aria-hidden="true" className={`pointer-events-none absolute -top-12 ${isEnglish ? '-right-12' : '-left-12'} w-40 h-40 rounded-full bg-white/10 blur-2xl`} />
            <div aria-hidden="true" className={`pointer-events-none absolute -bottom-16 ${isEnglish ? 'right-1/3' : 'left-1/3'} w-48 h-48 rounded-full bg-[#D4AF37]/10 blur-3xl`} />
            <div className="relative w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/20">
              <svg className="w-6 h-6 text-[#D4AF37]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
              </svg>
            </div>
            <div className="relative flex-1 min-w-0">
              <p className="font-bold text-white text-base sm:text-lg leading-tight">
                {isEnglish ? "Try a free test now" : "جرّب اختباراً مجانياً الآن"}
              </p>
              <p className="text-white/75 text-sm mt-0.5">
                {isEnglish ? "Experience full exam conditions before subscribing" : "جرّب أجواء الاختبار الكامل قبل الاشتراك"}
              </p>
            </div>
            <button
              onClick={goToTest}
              className="relative px-5 py-2.5 bg-[#D4AF37] text-black font-bold rounded-xl hover:bg-[#E8C547] transition-colors text-sm flex-shrink-0 ring-1 ring-[#D4AF37]/30 shadow-sm shadow-black/10"
            >
              {isEnglish ? "Subscribe Now" : "اشترك الآن"}
            </button>
          </div>
        {/* 2. Tabs — Welcome greeting + Overview/Progress dashboard view toggle, wrapped in its own card.
            id="overview" lets the sidebar's الرئيسية anchor scroll users back to the top of the dashboard. */}
        <div id="overview" key={animationKey} className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 mb-6 animate-fade-in transition-colors duration-300 scroll-mt-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {isEnglish ? `Welcome back, ${userName}!` : `مرحباً بعودتك، ${userName}!`}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {isEnglish ? "Continue your preparation journey" : "استمر في رحلة التحضير الخاصة بك"}
              </p>
            </div>
            {/* Dashboard View Toggle */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button
                onClick={() => setDashboardView("overview")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  dashboardView === "overview"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {isEnglish ? "Overview" : "نظرة عامة"}
              </button>
              <button
                onClick={() => setDashboardView("progress")}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                  dashboardView === "progress"
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {isEnglish ? "Progress" : "التقدم"}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Charts View — when toggle is "progress", render only the charts
            inside their own card (preserves the existing dashboardView conditional;
            no logic changed, only the wrapping card / spacing for visual structure). */}
        {dashboardView === "progress" ? (
          // Same id="progress" anchor as the overview-mode Progress section
          // so the sidebar's التقدم link works regardless of which dashboard
          // view (overview/progress) the user is currently in.
          <div id="progress" className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 mb-6 transition-colors duration-300 scroll-mt-20">
            {/* Free Feature Banner */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl p-4 border border-green-200 dark:border-green-800 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                  <span className="text-xl">📊</span>
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-400">
                    {isEnglish ? "Free Feature!" : "ميزة مجانية!"}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {isEnglish
                      ? "Track your progress without any subscription"
                      : "تتبع تقدمك بدون أي اشتراك"
                    }
                  </p>
                </div>
              </div>
            </div>

            <ProgressCharts
              isArabic={!isEnglish}
              examType={examType}
              subType={examType === "qudurat" ? quduratType : tahsiliType}
            />
          </div>
        ) : (
        <>
        {/* 3. Exam Context Card — single white card containing both the
            Aptitude and Achievement chooser groups (originally two
            independent rounded cards). When the page is locked to one exam
            category (/qudrat or /tahsili), only the matching group renders
            so users see a single clear variant toggle instead of
            cross-category navigation. Inner per-group cards keep their
            original border + selected-state styling verbatim — no color,
            handler, or copy changes. */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 mb-6 transition-colors duration-300">
          <div className={`grid ${lockedExamType ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-4`}>
            {/* Aptitude Tests group */}
            {(!lockedExamType || lockedExamType === "qudurat") && (
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 transition-all ${
                examType === "qudurat"
                  ? "border-[#006C35] shadow-sm shadow-[#006C35]/10"
                  : "border-gray-100 dark:border-gray-700/60"
              }`}
            >
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="w-9 h-9 bg-[#006C35]/10 dark:bg-[#006C35]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🧠</span>
                {isEnglish ? "Aptitude Tests" : "اختبارات القدرات"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setExamType("qudurat"); setQuduratType("general"); }}
                  className={`py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                    examType === "qudurat" && quduratType === "general"
                      ? "bg-[#D4AF37] text-black shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isEnglish ? "Qudrat" : "القدرات العامة"}
                </button>
                <button
                  onClick={() => { setExamType("qudurat"); setQuduratType("gat"); }}
                  className={`py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                    examType === "qudurat" && quduratType === "gat"
                      ? "bg-[#D4AF37] text-black shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  GAT
                </button>
              </div>
            </div>
            )}

            {/* Achievement Tests group */}
            {(!lockedExamType || lockedExamType === "tahsili") && (
            <div
              className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border-2 transition-all ${
                examType === "tahsili"
                  ? "border-[#006C35] shadow-sm shadow-[#006C35]/10"
                  : "border-gray-100 dark:border-gray-700/60"
              }`}
            >
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="w-9 h-9 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🎓</span>
                {isEnglish ? "Achievement Tests" : "اختبارات التحصيلي"}
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => { setExamType("tahsili"); setTahsiliType("tahsili"); }}
                  className={`py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                    examType === "tahsili" && tahsiliType === "tahsili"
                      ? "bg-[#D4AF37] text-black shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isEnglish ? "Tahsili" : "التحصيلي"}
                </button>
                <button
                  onClick={() => { setExamType("tahsili"); setTahsiliType("saat"); }}
                  className={`py-2.5 px-3 rounded-lg font-medium text-sm transition-all ${
                    examType === "tahsili" && tahsiliType === "saat"
                      ? "bg-[#D4AF37] text-black shadow-sm"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  SAAT
                </button>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* 4. Hero (AI / Catbot) — Free Trial Test centered hero card.
            Reordered to sit immediately after the Exam Context so the user's
            first action option is front and center. Content is centered per
            the layout spec (text-center, items-center, justify-center). */}
        <div className="bg-gradient-to-r from-[#006C35] to-[#00A651] rounded-2xl p-6 mb-6 text-white text-center">
          <div className="flex flex-col items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
              🎁
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {examType === "qudurat"
                  ? (quduratType === "general" ? quduratGeneralFreeTest.title : gatFreeTest.title)
                  : (tahsiliType === "tahsili" ? tahsiliFreeTest.title : saatFreeTest.title)
                }
              </h2>
              <p className="text-white/80 text-sm">
                {examType === "qudurat"
                  ? (quduratType === "general" ? quduratGeneralFreeTest.description : gatFreeTest.description)
                  : (tahsiliType === "tahsili" ? tahsiliFreeTest.description : saatFreeTest.description)
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-center">
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <span>📝</span>
              <span className="text-sm">
                {examType === "qudurat"
                  ? (quduratType === "general" ? quduratGeneralFreeTest.questions : gatFreeTest.questions)
                  : (tahsiliType === "tahsili" ? tahsiliFreeTest.questions : saatFreeTest.questions)
                } {isEnglish ? "questions" : "سؤال"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-2">
              <span>⏱️</span>
              <span className="text-sm">
                {examType === "qudurat"
                  ? (quduratType === "general" ? quduratGeneralFreeTest.duration : gatFreeTest.duration)
                  : (tahsiliType === "tahsili" ? tahsiliFreeTest.duration : saatFreeTest.duration)
                } {isEnglish ? "minutes" : "دقيقة"}
              </span>
            </div>
            <Link
              href={examType === "qudurat"
                ? (quduratType === "general" ? "/test/qudrat-ar" : "/test/gat-en")
                : (tahsiliType === "tahsili" ? "/test/tahsili-ar" : "/test/saat-en")
              }
              className="bg-[#D4AF37] text-black font-bold py-2 px-6 rounded-lg hover:bg-[#E8C547] transition-colors"
            >
              {isEnglish ? "Start Free Test" : "ابدأ الاختبار المجاني"}
            </Link>
          </div>
        </div>

        {/* 5. Progress — Progress & Leaderboard pair.
            id="progress" is the target of the sidebar's التقدم anchor. */}
        <div id="progress" key={`progress-${animationKey}`} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 animate-fade-in scroll-mt-20">
          {/* Progress Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 transition-colors duration-300">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-3">
              <span className="w-9 h-9 bg-[#006C35]/10 dark:bg-[#006C35]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📊</span>
              {isEnglish ? "Your Progress" : "تقدمك"}
            </h2>

            {/* Score Progress */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isEnglish ? "Current Score" : "الدرجة الحالية"}
                </span>
                <span className="text-lg font-bold text-[#006C35] dark:text-[#00A651]">
                  {userProgress.currentScore}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#006C35] to-[#00A651] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {isEnglish ? "Target:" : "الهدف:"} {userProgress.targetScore}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {progressPercentage}% {isEnglish ? "of target" : "من الهدف"}
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#006C35] dark:text-[#00A651]">
                  {userProgress.testsCompleted}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {isEnglish ? "Tests Completed" : "اختبارات مكتملة"}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-[#D4AF37]">
                  {userProgress.hoursStudied}h
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {isEnglish ? "Hours Studied" : "ساعات الدراسة"}
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 transition-colors duration-300">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-3">
              <span className="w-9 h-9 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">🏆</span>
              {isEnglish ? "Leaderboard" : "لوحة المتصدرين"}
            </h2>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {currentLeaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                    entry.rank <= 3
                      ? "bg-gradient-to-r from-[#D4AF37]/10 to-transparent dark:from-[#D4AF37]/20"
                      : "bg-gray-50 dark:bg-gray-700"
                  }`}
                >
                  <span className="text-lg font-bold w-8 text-center">
                    {entry.badge || entry.rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm">
                      {entry.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {entry.testsCompleted} {isEnglish ? "tests" : "اختبارات"}
                    </p>
                  </div>
                  <span className="font-bold text-[#006C35] dark:text-[#00A651]">
                    {entry.score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 6. Tasks — Practice Mode CTA. Kept as the gold gradient hero
            since it represents the user's next actionable task.
            id="practice" is available as a deep-link anchor for in-page nav. */}
        <div id="practice" className="bg-gradient-to-r from-[#D4AF37] to-[#E8C547] rounded-2xl p-6 mb-6 text-black scroll-mt-20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-black/10 rounded-2xl flex items-center justify-center text-3xl">
              🎯
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isEnglish ? "Practice Mode" : "وضع التدريب"}
              </h2>
              <p className="text-black/70 text-sm">
                {isEnglish
                  ? "Practice specific topics to improve your weak areas"
                  : "تدرب على مواضيع محددة لتحسين نقاط ضعفك"
                }
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2">
              <span>📚</span>
              <span className="text-sm">{isEnglish ? "All Topics" : "جميع المواضيع"}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2">
              <span>⚡</span>
              <span className="text-sm">{isEnglish ? "Instant Feedback" : "ردود فورية"}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/10 rounded-lg px-3 py-2">
              <span>📊</span>
              <span className="text-sm">{isEnglish ? "Track Progress" : "تتبع التقدم"}</span>
            </div>
            <Link
              href={practiceHref}
              className="bg-[#006C35] text-white font-bold py-2 px-6 rounded-lg hover:bg-[#004d26] transition-colors ms-auto"
            >
              {isEnglish ? "Start Practice" : "ابدأ التدريب"}
            </Link>
          </div>
        </div>

        {/* 7. Practice — Test Bank wrapped in its own card.
            id="test-bank" is the target of the sidebar's بنك الاختبارات anchor. */}
        <div id="test-bank" className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 mb-6 transition-colors duration-300 scroll-mt-20">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-3">
            <span className="w-9 h-9 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📚</span>
            {isEnglish ? "Test Bank" : "بنك الاختبارات"}
          </h2>

          {/* Qudurat Tests */}
          {examType === "qudurat" && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveTab("comprehensive")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === "comprehensive"
                      ? "bg-[#006C35] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isEnglish ? "Comprehensive" : "الشاملة"}
                </button>
                <button
                  onClick={() => setActiveTab("quantitative")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === "quantitative"
                      ? "bg-[#006C35] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isEnglish ? "Quantitative" : "الكمي"}
                </button>
                <button
                  onClick={() => setActiveTab("verbal")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === "verbal"
                      ? "bg-[#006C35] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isEnglish ? "Verbal" : "اللفظي"}
                </button>
              </div>

              {/* Comprehensive Tests Grid */}
              {activeTab === "comprehensive" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {(quduratType === "general" ? quduratComprehensiveTests : gatComprehensiveTests).map((test) => (
                    <button
                      key={test.id}
                      onClick={goToTest}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/60 hover:border-[#006C35] dark:hover:border-[#00A651] hover:shadow-md transition-all text-center group"
                    >
                      <div className="text-3xl font-bold text-[#006C35] dark:text-[#00A651] group-hover:scale-110 transition-transform">
                        {test.number}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {test.questions} {isEnglish ? "Q" : "س"} • {test.duration} {isEnglish ? "min" : "د"}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Quantitative Topics */}
              {activeTab === "quantitative" && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {(quduratType === "general" ? quantitativeTopics : gatQuantitativeTopics).map((topic) => (
                    <button
                      key={topic.id}
                      onClick={goToTest}
                      className={`bg-gradient-to-br ${topic.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
                    >
                      <div className="text-4xl mb-2">{topic.icon}</div>
                      <div className="font-bold">{topic.name}</div>
                      <div className="text-sm text-white/80 mt-1">15 {isEnglish ? "tests" : "اختبار"}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Verbal Topics */}
              {activeTab === "verbal" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {(quduratType === "general" ? verbalTopics : gatVerbalTopics).map((topic) => (
                    <button
                      key={topic.id}
                      onClick={goToTest}
                      className={`bg-gradient-to-br ${topic.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
                    >
                      <div className="text-4xl mb-2">{topic.icon}</div>
                      <div className="font-bold text-sm">{topic.name}</div>
                      <div className="text-xs text-white/80 mt-1">15 {isEnglish ? "tests" : "اختبار"}</div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Tahsili Tests */}
          {examType === "tahsili" && (
            <>
              {/* Tabs */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                <button
                  onClick={() => setTahsiliTab("comprehensive")}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                    tahsiliTab === "comprehensive"
                      ? "bg-[#006C35] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {isEnglish ? "Comprehensive" : "الشاملة"}
                </button>
                {(tahsiliType === "tahsili" ? tahsiliTopics : saatTopics).map((topic) => (
                  <button
                    key={topic.id}
                    onClick={() => setTahsiliTab(topic.id as typeof tahsiliTab)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                      tahsiliTab === topic.id
                        ? "bg-[#006C35] text-white"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    {topic.icon} {topic.name}
                  </button>
                ))}
              </div>

              {/* Comprehensive Tests Grid */}
              {tahsiliTab === "comprehensive" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {(tahsiliType === "tahsili" ? tahsiliComprehensiveTests : saatComprehensiveTests).map((test) => (
                    <button
                      key={test.id}
                      onClick={goToTest}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/60 hover:border-[#006C35] dark:hover:border-[#00A651] hover:shadow-md transition-all text-center group"
                    >
                      <div className="text-3xl font-bold text-[#006C35] dark:text-[#00A651] group-hover:scale-110 transition-transform">
                        {test.number}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {test.questions} {isEnglish ? "Q" : "س"} • {test.duration} {isEnglish ? "min" : "د"}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Subject Tests */}
              {tahsiliTab !== "comprehensive" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {Array.from({ length: 15 }, (_, i) => (
                    <button
                      key={i}
                      onClick={goToTest}
                      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700/60 hover:border-[#006C35] dark:hover:border-[#00A651] hover:shadow-md transition-all text-center group"
                    >
                      <div className="text-3xl font-bold text-[#006C35] dark:text-[#00A651] group-hover:scale-110 transition-transform">
                        {i + 1}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        25 {isEnglish ? "Q" : "س"} • 30 {isEnglish ? "min" : "د"}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 8. Reports — Performance Analysis (relocated to the end of the
            overview flow). Already styled as its own card; identical content,
            no logic changes. */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 mb-6 transition-colors duration-300">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-3">
            <span className="w-9 h-9 bg-[#006C35]/10 dark:bg-[#006C35]/20 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📈</span>
            {isEnglish ? "Performance Analysis" : "تحليل الأداء"}
          </h2>

          {/* Topics Performance */}
          <div className="space-y-3 mb-6">
            {currentPerformance.topics.map((topic) => (
              <div key={topic.name}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">{topic.name}</span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{topic.score}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      topic.score >= 80 ? "bg-green-500" : topic.score >= 60 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${topic.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
              <h3 className="font-medium text-green-800 dark:text-green-400 mb-2 flex items-center gap-2">
                <span>💪</span>
                {isEnglish ? "Strengths" : "نقاط القوة"}
              </h3>
              <ul className="space-y-1">
                {currentPerformance.strengths.map((item) => (
                  <li key={item} className="text-sm text-green-700 dark:text-green-300">• {item}</li>
                ))}
              </ul>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <h3 className="font-medium text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                <span>🎯</span>
                {isEnglish ? "Focus Areas" : "مجالات التركيز"}
              </h3>
              <ul className="space-y-1">
                {currentPerformance.weaknesses.map((item) => (
                  <li key={item} className="text-sm text-red-700 dark:text-red-300">• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 text-center transition-colors duration-300">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {isEnglish ? "Real Exam Simulation" : "محاكاة الاختبار الحقيقي"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isEnglish ? "Practice in exam-like conditions" : "تدرب في ظروف مشابهة للاختبار"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 text-center transition-colors duration-300">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {isEnglish ? "Detailed Analytics" : "تحليلات مفصلة"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isEnglish ? "Track your progress over time" : "تتبع تقدمك عبر الوقت"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 text-center transition-colors duration-300">
            <div className="text-4xl mb-3">💡</div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {isEnglish ? "Smart Explanations" : "شروحات ذكية"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isEnglish ? "Learn from every question" : "تعلم من كل سؤال"}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700/60 text-center transition-colors duration-300">
            <div className="text-4xl mb-3">🏆</div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {isEnglish ? "Compete & Win" : "تنافس واربح"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isEnglish ? "Join weekly challenges" : "انضم للتحديات الأسبوعية"}
            </p>
          </div>
        </div>
        </>
        )}
      </main>
      </div>

      {/* Subscribe Modal */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 relative animate-scale-in my-8">
            <button
              onClick={() => setShowSubscribeModal(false)}
              className="absolute top-4 end-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="text-5xl mb-3" aria-hidden="true">🎯</div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {isEnglish ? "Choose your bundle" : "اختر باقتك المناسبة"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {isEnglish
                  ? "Subscribe now and unlock full access to every test"
                  : "اشترك الآن واحصل على وصول كامل لجميع الاختبارات"}
              </p>
            </div>

            {/* Package Selector — bundles match the dashboard's exam categories */}
            <div className="flex gap-2 mb-6 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <button
                onClick={() => setSubscriptionPackage("aptitude")}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                  subscriptionPackage === "aptitude"
                    ? "bg-[#006C35] text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span aria-hidden="true">🧠</span>
                  <span>{isEnglish ? "Aptitude (Qudrat + GAT)" : "باقة القدرات"}</span>
                </div>
              </button>
              <button
                onClick={() => setSubscriptionPackage("achievement")}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all ${
                  subscriptionPackage === "achievement"
                    ? "bg-[#006C35] text-white shadow-lg"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <span aria-hidden="true">🎓</span>
                  <span>{isEnglish ? "Achievement (Tahsili + SAAT)" : "باقة التحصيلي"}</span>
                </div>
              </button>
            </div>

            {/* Package Details — shows the two exams included in the chosen bundle */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                {subscriptionPackage === "aptitude" ? (
                  <>
                    <span className="text-lg" aria-hidden="true">🧠</span>
                    {isEnglish ? "Aptitude Bundle" : "باقة القدرات"}
                  </>
                ) : (
                  <>
                    <span className="text-lg" aria-hidden="true">🎓</span>
                    {isEnglish ? "Achievement Bundle" : "باقة التحصيلي"}
                  </>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {subscriptionPackage === "aptitude" ? (
                  <>
                    <span className="px-3 py-1 bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80] rounded-full text-xs font-medium flex items-center gap-1">
                      <span aria-hidden="true">🇸🇦</span>
                      {isEnglish ? "Qudrat" : "القدرات العامة"}
                    </span>
                    <span className="px-3 py-1 bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80] rounded-full text-xs font-medium flex items-center gap-1">
                      <span aria-hidden="true">🇬🇧</span>
                      GAT
                    </span>
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                      {isEnglish ? "40+ tests" : "+40 اختبار"}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="px-3 py-1 bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80] rounded-full text-xs font-medium flex items-center gap-1">
                      <span aria-hidden="true">🇸🇦</span>
                      {isEnglish ? "Tahsili" : "التحصيلي"}
                    </span>
                    <span className="px-3 py-1 bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80] rounded-full text-xs font-medium flex items-center gap-1">
                      <span aria-hidden="true">🇬🇧</span>
                      SAAT
                    </span>
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs">
                      {isEnglish ? "40+ tests" : "+40 اختبار"}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Pricing Options */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedPlan("annual")}
                className={`w-full rounded-xl p-4 transition-all ${isEnglish ? "text-left" : "text-right"} ${
                  selectedPlan === "annual"
                    ? "border-2 border-[#D4AF37] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20"
                    : "border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === "annual" ? "border-[#D4AF37] bg-[#D4AF37]" : "border-gray-300 dark:border-gray-500"
                    }`}>
                      {selectedPlan === "annual" && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        {isEnglish ? "Annual Plan" : "الخطة السنوية"}
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs rounded-full">
                          {isEnglish ? "Save 66%" : "وفر 66%"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {isEnglish ? "16.5 SAR/month" : "16.5 ريال/شهر"}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-[#006C35] dark:text-[#00A651]">199</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isEnglish ? "SAR/year" : "ريال/سنة"}
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`w-full rounded-xl p-4 transition-all ${isEnglish ? "text-left" : "text-right"} ${
                  selectedPlan === "monthly"
                    ? "border-2 border-[#D4AF37] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20"
                    : "border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === "monthly" ? "border-[#D4AF37] bg-[#D4AF37]" : "border-gray-300 dark:border-gray-500"
                    }`}>
                      {selectedPlan === "monthly" && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        {isEnglish ? "Monthly Plan" : "الخطة الشهرية"}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {isEnglish ? "Flexible payment" : "مرونة في الدفع"}
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">49</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {isEnglish ? "SAR/month" : "ريال/شهر"}
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Features List — copy reflects the two exams in the selected bundle */}
            <ul className="space-y-2 mb-6">
              {(() => {
                const aptitudeFeatures = isEnglish
                  ? [
                      "Full access to Qudrat (Arabic) + GAT (English) tests",
                      "40+ comprehensive aptitude tests",
                      "Detailed explanations for each question",
                      "Advanced performance analytics",
                      "Unlimited practice",
                    ]
                  : [
                      "وصول كامل لاختبارات القدرات (Qudrat) و GAT",
                      "أكثر من 40 اختبار قدرات شامل",
                      "شروحات مفصلة لكل سؤال",
                      "تحليلات أداء متقدمة",
                      "تدريب غير محدود",
                    ];
                const achievementFeatures = isEnglish
                  ? [
                      "Full access to Tahsili (Arabic) + SAAT (English) tests",
                      "40+ comprehensive achievement tests",
                      "Subject-specific banks (math, physics, chemistry, biology)",
                      "Detailed explanations for each question",
                      "Unlimited practice",
                    ]
                  : [
                      "وصول كامل لاختبارات التحصيلي (Tahsili) و SAAT",
                      "أكثر من 40 اختبار تحصيلي شامل",
                      "بنك أسئلة لكل مادة (رياضيات، فيزياء، كيمياء، أحياء)",
                      "شروحات مفصلة لكل سؤال",
                      "تدريب غير محدود",
                    ];
                const features = subscriptionPackage === "aptitude" ? aptitudeFeatures : achievementFeatures;
                return features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-green-500 flex-shrink-0">✓</span>
                    {feature}
                  </li>
                ));
              })()}
            </ul>

            <button className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl hover:bg-[#E8C547] transition-colors flex items-center justify-center gap-2">
              <span>{isEnglish ? "Subscribe Now" : "اشترك الآن"}</span>
              <span className="font-normal">
                ({selectedPlan === "annual" ? "199" : "49"} {isEnglish ? "SAR" : "ريال"})
              </span>
            </button>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              {isEnglish
                ? "You can cancel your subscription at any time"
                : "يمكنك إلغاء الاشتراك في أي وقت"
              }
            </p>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <AIAssistant context="general" isArabic={!isEnglish} />

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
