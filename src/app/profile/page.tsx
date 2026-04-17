"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const router = useRouter();
  const { user: authUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<"stats" | "history" | "settings">("stats");
  const [showEditModal, setShowEditModal] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  // User data from auth
  const user = {
    name: authUser?.user_metadata?.full_name || authUser?.email?.split("@")[0] || "مستخدم",
    email: authUser?.email || "غير محدد",
    phone: authUser?.phone || "غير محدد",
    avatar: (authUser?.user_metadata?.full_name || authUser?.email || "م").charAt(0).toUpperCase(),
    joinDate: authUser?.created_at ? new Date(authUser.created_at).toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" }) : "غير محدد",
    subscription: "مجاني",
    subscriptionExpiry: null,
  };

  // Stats data
  const stats = {
    totalTests: 8,
    totalQuestions: 320,
    correctAnswers: 248,
    studyHours: 12,
    currentRank: 47,
    bestScore: 92,
    averageScore: 78,
  };

  // Test history
  const testHistory = [
    { id: 1, name: "الاختبار التجريبي", date: "اليوم", score: 85, questions: 40 },
    { id: 2, name: "اختبار الجبر (3)", date: "أمس", score: 78, questions: 30 },
    { id: 3, name: "اختبار التناظر اللفظي (1)", date: "منذ 3 أيام", score: 92, questions: 30 },
    { id: 4, name: "الاختبار التجريبي", date: "منذ أسبوع", score: 72, questions: 40 },
    { id: 5, name: "اختبار الهندسة (2)", date: "منذ أسبوع", score: 80, questions: 30 },
  ];

  // Progress by category
  const categoryProgress = [
    { name: "الجبر", completed: 3, total: 15, color: "bg-blue-500" },
    { name: "الهندسة", completed: 5, total: 15, color: "bg-violet-500" },
    { name: "النسب والتناسب", completed: 2, total: 15, color: "bg-teal-500" },
    { name: "الإحصاء", completed: 0, total: 15, color: "bg-orange-500" },
    { name: "التناظر اللفظي", completed: 4, total: 15, color: "bg-pink-500" },
    { name: "إكمال الجمل", completed: 1, total: 15, color: "bg-indigo-500" },
    { name: "استيعاب المقروء", completed: 6, total: 15, color: "bg-emerald-500" },
    { name: "الخطأ السياقي", completed: 0, total: 15, color: "bg-rose-500" },
    { name: "المفردة الشاذة", completed: 2, total: 15, color: "bg-amber-500" },
  ];

  const accuracy = Math.round((stats.correctAnswers / stats.totalQuestions) * 100);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#006C35] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-medium">الرجوع</span>
            </Link>
            <h1 className="font-bold text-lg">الملف الشخصي</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#006C35] to-[#004d26] flex items-center justify-center text-white text-4xl font-bold">
                {user.avatar}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{user.name}</h2>
              <p className="text-gray-500 mb-3">{user.email}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  user.subscription === "مجاني"
                    ? "bg-gray-100 text-gray-600"
                    : "bg-[#D4AF37]/20 text-[#D4AF37]"
                }`}>
                  {user.subscription === "مجاني" ? "حساب مجاني" : "مشترك مميز"}
                </span>
                <span className="text-sm text-gray-400">انضم في {user.joinDate}</span>
              </div>
            </div>

            {/* Edit Button */}
            <button
              onClick={() => setShowEditModal(true)}
              className="px-4 py-2 border-2 border-gray-200 rounded-xl text-gray-600 hover:border-[#006C35] hover:text-[#006C35] transition-colors"
            >
              تعديل الملف
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
            <div className="text-center">
              <p className="text-2xl font-bold text-[#006C35]">{stats.totalTests}</p>
              <p className="text-sm text-gray-500">اختبار مكتمل</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#006C35]">{accuracy}%</p>
              <p className="text-sm text-gray-500">نسبة الصحة</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-[#D4AF37]">#{stats.currentRank}</p>
              <p className="text-sm text-gray-500">الترتيب</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.studyHours}h</p>
              <p className="text-sm text-gray-500">ساعات تدريب</p>
            </div>
          </div>
        </div>

        {/* Subscription Banner */}
        {user.subscription === "مجاني" && (
          <div className="bg-gradient-to-l from-[#D4AF37] to-[#E8C547] rounded-2xl p-5 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-black text-lg mb-1">اشترك الآن واحصل على جميع المميزات!</h3>
                <p className="text-black/70 text-sm">155 اختبار • +5000 سؤال • شروحات مفصلة</p>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-6 py-3 bg-black text-white font-bold rounded-xl hover:bg-gray-900 transition-colors whitespace-nowrap"
              >
                اشترك الآن
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("stats")}
            className={`px-5 py-3 rounded-xl font-medium transition-all ${
              activeTab === "stats"
                ? "bg-[#006C35] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            الإحصائيات
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-5 py-3 rounded-xl font-medium transition-all ${
              activeTab === "history"
                ? "bg-[#006C35] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            سجل الاختبارات
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-5 py-3 rounded-xl font-medium transition-all ${
              activeTab === "settings"
                ? "bg-[#006C35] text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            الإعدادات
          </button>
        </div>

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="space-y-6">
            {/* Performance Overview */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">نظرة عامة على الأداء</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-3xl font-bold text-green-600">{stats.correctAnswers}</p>
                  <p className="text-sm text-gray-600">إجابة صحيحة</p>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-3xl font-bold text-red-600">{stats.totalQuestions - stats.correctAnswers}</p>
                  <p className="text-sm text-gray-600">إجابة خاطئة</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <p className="text-3xl font-bold text-blue-600">{stats.bestScore}%</p>
                  <p className="text-sm text-gray-600">أعلى درجة</p>
                </div>
              </div>
            </div>

            {/* Progress by Category */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">التقدم حسب الموضوع</h3>
              <div className="space-y-4">
                {categoryProgress.map((category, index) => (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{category.name}</span>
                      <span className="text-gray-500">{category.completed}/{category.total}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${category.color} rounded-full transition-all`}
                        style={{ width: `${(category.completed / category.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">آخر الاختبارات</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {testHistory.map((test) => (
                <div key={test.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        test.score >= 80 ? 'bg-green-100' : test.score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        <span className={`text-lg font-bold ${
                          test.score >= 80 ? 'text-green-600' : test.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {test.score}%
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{test.name}</p>
                        <p className="text-sm text-gray-500">{test.questions} سؤال • {test.date}</p>
                      </div>
                    </div>
                    <button className="px-4 py-2 text-[#006C35] hover:bg-[#006C35]/10 rounded-lg transition-colors text-sm font-medium">
                      مراجعة
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-gray-50 text-center">
              <button className="text-[#006C35] font-medium hover:underline">
                عرض جميع الاختبارات
              </button>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-4">
            {/* Account Settings */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">إعدادات الحساب</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">تعديل المعلومات الشخصية</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">تغيير كلمة المرور</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">إعدادات الإشعارات</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-900">الدعم والمساعدة</h3>
              </div>
              <div className="divide-y divide-gray-100">
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">الأسئلة الشائعة</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="font-medium text-gray-900">تواصل معنا</span>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleSignOut}
              className="w-full p-4 bg-white rounded-2xl shadow-sm flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="font-medium">تسجيل الخروج</span>
            </button>
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-6">تعديل الملف الشخصي</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                <input
                  type="text"
                  defaultValue={user.name}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  defaultValue={user.email}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الجوال</label>
                <input
                  type="tel"
                  defaultValue={user.phone}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
