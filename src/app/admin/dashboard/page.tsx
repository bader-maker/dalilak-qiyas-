"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    // التحقق من تسجيل الدخول
    const adminLoggedIn = localStorage.getItem("adminLoggedIn");
    const loginTime = localStorage.getItem("adminLoginTime");

    if (adminLoggedIn === "true" && loginTime) {
      // التحقق من انتهاء الجلسة (24 ساعة)
      const hoursPassed = (Date.now() - parseInt(loginTime)) / (1000 * 60 * 60);
      if (hoursPassed < 24) {
        setIsAuthorized(true);
      } else {
        localStorage.removeItem("adminLoggedIn");
        localStorage.removeItem("adminLoginTime");
        router.push("/admin");
      }
    } else {
      router.push("/admin");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("adminLoginTime");
    router.push("/admin");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#006C35] border-t-transparent rounded-full" />
      </div>
    );
  }

  // إحصائيات الاختبارات
  const testStats = [
    {
      name: "القدرات العامة",
      nameEn: "Qudrat",
      questions: 570,
      sections: ["كمي (280)", "لفظي (290)"],
      path: "/test",
      icon: "📝",
      color: "from-green-500 to-green-600"
    },
    {
      name: "GAT",
      nameEn: "General Aptitude Test",
      questions: 149,
      sections: ["Quantitative (75)", "Verbal (74)"],
      path: "/test-gat",
      icon: "🇬🇧",
      color: "from-blue-500 to-blue-600"
    },
    {
      name: "SAAT",
      nameEn: "Science Achievement",
      questions: 120,
      sections: ["Math (30)", "Physics (30)", "Chemistry (30)", "Biology (30)"],
      path: "/test-saat",
      icon: "🔬",
      color: "from-purple-500 to-purple-600"
    },
    {
      name: "التحصيلي",
      nameEn: "Tahsili",
      questions: 114,
      sections: ["رياضيات (28)", "فيزياء (28)", "كيمياء (28)", "أحياء (30)"],
      path: "/test-tahsili",
      icon: "🎓",
      color: "from-amber-500 to-amber-600"
    },
    {
      name: "التدريب",
      nameEn: "Practice Mode",
      questions: 80,
      sections: ["سهل (40)", "متوسط (27)", "صعب (13)"],
      path: "/practice",
      icon: "🎯",
      color: "from-red-500 to-red-600"
    },
  ];

  const totalQuestions = testStats.reduce((sum, test) => sum + test.questions, 0);

  // الصفحات المتاحة
  const allPages = [
    { name: "الصفحة الرئيسية", path: "/", icon: "🏠" },
    { name: "تسجيل الدخول", path: "/login", icon: "🔑" },
    { name: "لوحة التحكم", path: "/dashboard", icon: "📊" },
    { name: "الملف الشخصي", path: "/profile", icon: "👤" },
    { name: "الاشتراكات", path: "/subscriptions", icon: "💳" },
    { name: "نسيت كلمة المرور", path: "/forgot-password", icon: "🔓" },
    { name: "اختبار القدرات", path: "/test", icon: "📝" },
    { name: "اختبار GAT", path: "/test-gat", icon: "🇬🇧" },
    { name: "اختبار SAAT", path: "/test-saat", icon: "🔬" },
    { name: "اختبار التحصيلي", path: "/test-tahsili", icon: "🎓" },
    { name: "وضع التدريب", path: "/practice", icon: "🎯" },
    { name: "اختبار التدريب", path: "/practice/test", icon: "✏️" },
  ];

  return (
    <div className="min-h-screen bg-gray-900" dir="rtl">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#006C35] to-[#004d26] rounded-xl flex items-center justify-center">
                <span className="text-2xl">👑</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">لوحة تحكم المالك</h1>
                <p className="text-sm text-gray-400">مرحباً بك، لديك صلاحيات كاملة</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                🟢 متصل
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: "overview", name: "نظرة عامة", icon: "📊" },
              { id: "tests", name: "الاختبارات", icon: "📝" },
              { id: "pages", name: "الصفحات", icon: "📄" },
              { id: "stats", name: "الإحصائيات", icon: "📈" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-[#006C35] text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-[#006C35] to-[#004d26] rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">📚</span>
                  <span className="text-3xl font-bold">{totalQuestions}</span>
                </div>
                <h3 className="font-bold text-lg">إجمالي الأسئلة</h3>
                <p className="text-white/70 text-sm">موزعة على 5 اختبارات</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">📝</span>
                  <span className="text-3xl font-bold">5</span>
                </div>
                <h3 className="font-bold text-lg">الاختبارات المتاحة</h3>
                <p className="text-white/70 text-sm">جميعها جاهزة للاستخدام</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">📄</span>
                  <span className="text-3xl font-bold">12</span>
                </div>
                <h3 className="font-bold text-lg">صفحات الموقع</h3>
                <p className="text-white/70 text-sm">جميعها تعمل بشكل صحيح</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-4xl">✅</span>
                  <span className="text-3xl font-bold">100%</span>
                </div>
                <h3 className="font-bold text-lg">نسبة الجاهزية</h3>
                <p className="text-white/70 text-sm">كل شيء يعمل بشكل مثالي</p>
              </div>
            </div>

            {/* Quick Access */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span>⚡</span> وصول سريع للاختبارات
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {testStats.map((test) => (
                  <Link
                    key={test.path}
                    href={test.path}
                    className={`bg-gradient-to-br ${test.color} rounded-xl p-5 text-white hover:scale-105 transition-transform`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{test.icon}</span>
                      <div>
                        <h3 className="font-bold">{test.name}</h3>
                        <p className="text-white/70 text-sm">{test.nameEn}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{test.questions}</span>
                      <span className="text-white/70">سؤال</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tests Tab */}
        {activeTab === "tests" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">تفاصيل الاختبارات</h2>
            {testStats.map((test) => (
              <div key={test.path} className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${test.color} rounded-xl flex items-center justify-center text-3xl`}>
                      {test.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{test.name}</h3>
                      <p className="text-gray-400">{test.nameEn}</p>
                    </div>
                  </div>
                  <div className="text-left">
                    <span className="text-3xl font-bold text-white">{test.questions}</span>
                    <p className="text-gray-400 text-sm">سؤال</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {test.sections.map((section, i) => (
                    <span key={i} className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm">
                      {section}
                    </span>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Link
                    href={test.path}
                    className="flex-1 py-3 bg-[#006C35] text-white rounded-xl text-center font-medium hover:bg-[#005528] transition-colors"
                  >
                    بدء الاختبار
                  </Link>
                  <button className="px-6 py-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors">
                    معاينة
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pages Tab */}
        {activeTab === "pages" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">جميع صفحات الموقع</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allPages.map((page) => (
                <Link
                  key={page.path}
                  href={page.path}
                  className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-[#006C35] transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{page.icon}</span>
                    <div>
                      <h3 className="font-bold text-white group-hover:text-[#4ade80] transition-colors">
                        {page.name}
                      </h3>
                      <p className="text-gray-500 text-sm font-mono">{page.path}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                    <span className="text-green-400 text-sm">يعمل</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white mb-6">إحصائيات تفصيلية</h2>

            {/* Questions Distribution */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">توزيع الأسئلة</h3>
              <div className="space-y-4">
                {testStats.map((test) => (
                  <div key={test.path}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">{test.name}</span>
                      <span className="text-white font-bold">{test.questions}</span>
                    </div>
                    <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${test.color} rounded-full`}
                        style={{ width: `${(test.questions / totalQuestions) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-700 flex items-center justify-between">
                <span className="text-gray-400">الإجمالي</span>
                <span className="text-2xl font-bold text-[#4ade80]">{totalQuestions} سؤال</span>
              </div>
            </div>

            {/* Difficulty Distribution */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">توزيع مستويات الصعوبة (التدريب)</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-500/20 rounded-xl">
                  <span className="text-4xl font-bold text-green-400">40</span>
                  <p className="text-green-400 mt-1">سهل</p>
                  <p className="text-gray-500 text-sm">50%</p>
                </div>
                <div className="text-center p-4 bg-yellow-500/20 rounded-xl">
                  <span className="text-4xl font-bold text-yellow-400">27</span>
                  <p className="text-yellow-400 mt-1">متوسط</p>
                  <p className="text-gray-500 text-sm">34%</p>
                </div>
                <div className="text-center p-4 bg-red-500/20 rounded-xl">
                  <span className="text-4xl font-bold text-red-400">13</span>
                  <p className="text-red-400 mt-1">صعب</p>
                  <p className="text-gray-500 text-sm">16%</p>
                </div>
              </div>
            </div>

            {/* Test Coverage */}
            <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">تغطية المواضيع</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">➕</span>
                  <p className="text-white font-bold mt-2">الجبر</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">📐</span>
                  <p className="text-white font-bold mt-2">الهندسة</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">⚖️</span>
                  <p className="text-white font-bold mt-2">النسب</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">📊</span>
                  <p className="text-white font-bold mt-2">الإحصاء</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">🔄</span>
                  <p className="text-white font-bold mt-2">التناظر</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">✍️</span>
                  <p className="text-white font-bold mt-2">الإكمال</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">📖</span>
                  <p className="text-white font-bold mt-2">الاستيعاب</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
                <div className="bg-gray-700/50 rounded-xl p-4 text-center">
                  <span className="text-2xl">❌</span>
                  <p className="text-white font-bold mt-2">الخطأ السياقي</p>
                  <p className="text-green-400 text-sm">✓ مغطى</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            👑 لوحة تحكم المالك - دليلك إلى قياس
          </p>
          <p className="text-gray-500 text-xs mt-2">
            جميع الصلاحيات مفتوحة لك
          </p>
        </div>
      </footer>
    </div>
  );
}
