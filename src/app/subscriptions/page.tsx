"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import type { BundleId } from "@/data/types";

/**
 * Subscriptions page.
 *
 * Bundles match the dashboard's route taxonomy (/qudrat and /tahsili);
 * see `BundleId` in `@/data/types` for the canonical identifiers.
 *
 * No backend / payment integration exists yet. `userSubscriptions` is mock
 * UI-only state and `confirmSubscription` opens an alert in lieu of a
 * payment gateway redirect. When a real entitlement backend is wired up
 * the same `BundleId` literals should be used as the entitlement primary
 * keys so this UI does not have to change again.
 */

export default function SubscriptionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [selectedPackage, setSelectedPackage] = useState<BundleId | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "annual">("annual");

  // Mock subscription state — would come from a real entitlement service.
  const userSubscriptions: Record<BundleId, {
    isSubscribed: boolean;
    plan: "monthly" | "annual" | null;
    expiresAt: string | null;
  }> = {
    aptitude: { isSubscribed: false, plan: null, expiresAt: null },
    achievement: { isSubscribed: false, plan: null, expiresAt: null },
  };

  const handleSubscribe = (bundleId: BundleId) => {
    setSelectedPackage(bundleId);
  };

  const confirmSubscription = () => {
    const priceLabel = selectedPlan === "annual" ? "199 ريال/سنة" : "49 ريال/شهر";
    const bundleLabel = selectedPackage === "aptitude" ? "باقة القدرات" : "باقة التحصيلي";
    alert(`جاري التوجيه لصفحة الدفع — ${bundleLabel} (${priceLabel})`);
    setSelectedPackage(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300" dir="rtl">
      {/* Header */}
      <header className="bg-[#006C35] dark:bg-gray-800 text-white border-b border-[#004d26] dark:border-gray-700 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <span className="font-bold text-lg">دليلك إلى قياس</span>
            </Link>

            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                aria-label="تبديل المظهر"
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
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm font-medium"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            الاشتراكات
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            اختر الباقة المناسبة لك واحصل على وصول كامل لجميع الاختبارات
          </p>
        </div>

        {/* Current Subscriptions Status */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-8 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            حالة اشتراكاتك
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Aptitude Bundle Status */}
            <div className={`rounded-xl p-4 border-2 ${
              userSubscriptions.aptitude.isSubscribed
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 bg-[#006C35]/10 dark:bg-[#006C35]/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🧠</span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">باقة القدرات</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">القدرات العامة + GAT</p>
                </div>
              </div>
              {userSubscriptions.aptitude.isSubscribed ? (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    مشترك
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ينتهي في: {userSubscriptions.aptitude.expiresAt}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                    غير مشترك
                  </span>
                </div>
              )}
            </div>

            {/* Achievement Bundle Status */}
            <div className={`rounded-xl p-4 border-2 ${
              userSubscriptions.achievement.isSubscribed
                ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                : "border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
            }`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="w-10 h-10 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🎓</span>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">باقة التحصيلي</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">التحصيلي + SAAT</p>
                </div>
              </div>
              {userSubscriptions.achievement.isSubscribed ? (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    مشترك
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    ينتهي في: {userSubscriptions.achievement.expiresAt}
                  </p>
                </div>
              ) : (
                <div className="mt-3">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                    غير مشترك
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Available Packages */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <span className="text-2xl">🎁</span>
          الباقات المتاحة
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Aptitude Bundle — Qudrat + GAT */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-[#006C35] to-[#00A651] p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ring-1 ring-white/20">🧠</span>
                <div>
                  <h3 className="text-xl font-bold">باقة القدرات</h3>
                  <p className="text-white/80 text-sm">القدرات العامة (Qudrat) + GAT</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">199</span>
                <span className="text-white/80">ريال / سنة</span>
              </div>
              <p className="text-white/60 text-sm mt-1">أو 49 ريال / شهر</p>
            </div>

            <div className="p-6">
              <div className="space-y-5 mb-6">
                {/* Included exams */}
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
                    الاختبارات المشمولة
                  </p>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-base flex-shrink-0" aria-hidden="true">🇸🇦</span>
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      القدرات العامة (Qudrat) — 20+ اختبار شامل
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-base flex-shrink-0" aria-hidden="true">🇬🇧</span>
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      GAT — 20+ comprehensive tests
                    </li>
                  </ul>
                </div>

                {/* Common bundle features */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
                    ميزات إضافية
                  </p>
                  <ul className="space-y-2">
                    {[
                      "بنك أسئلة كمي ولفظي شامل",
                      "شروحات مفصلة لكل سؤال",
                      "تحليلات أداء متقدمة",
                      "تدريب غير محدود",
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-green-500 flex-shrink-0">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe("aptitude")}
                disabled={userSubscriptions.aptitude.isSubscribed}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${
                  userSubscriptions.aptitude.isSubscribed
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-[#D4AF37] text-black hover:bg-[#E8C547]"
                }`}
              >
                {userSubscriptions.aptitude.isSubscribed ? "مشترك بالفعل" : "اشترك الآن"}
              </button>
            </div>
          </div>

          {/* Achievement Bundle — Tahsili + SAAT */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-[#B8941F] to-[#D4AF37] p-6 text-white">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center text-3xl flex-shrink-0 ring-1 ring-white/20">🎓</span>
                <div>
                  <h3 className="text-xl font-bold">باقة التحصيلي</h3>
                  <p className="text-white/80 text-sm">التحصيلي (Tahsili) + SAAT</p>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">199</span>
                <span className="text-white/80">ريال / سنة</span>
              </div>
              <p className="text-white/60 text-sm mt-1">أو 49 ريال / شهر</p>
            </div>

            <div className="p-6">
              <div className="space-y-5 mb-6">
                {/* Included exams */}
                <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
                    الاختبارات المشمولة
                  </p>
                  <ul className="space-y-2.5">
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-base flex-shrink-0" aria-hidden="true">🇸🇦</span>
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      التحصيلي (Tahsili) — 20+ اختبار شامل
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-base flex-shrink-0" aria-hidden="true">🇬🇧</span>
                      <span className="text-green-500 flex-shrink-0">✓</span>
                      SAAT — 20+ comprehensive tests
                    </li>
                  </ul>
                </div>

                {/* Common bundle features */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-3">
                    ميزات إضافية
                  </p>
                  <ul className="space-y-2">
                    {[
                      "بنك أسئلة لكل مادة (رياضيات، فيزياء، كيمياء، أحياء)",
                      "شروحات مفصلة لكل سؤال",
                      "تحليلات أداء متقدمة",
                      "تدريب غير محدود",
                    ].map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="text-green-500 flex-shrink-0">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <button
                onClick={() => handleSubscribe("achievement")}
                disabled={userSubscriptions.achievement.isSubscribed}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${
                  userSubscriptions.achievement.isSubscribed
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                    : "bg-[#D4AF37] text-black hover:bg-[#E8C547]"
                }`}
              >
                {userSubscriptions.achievement.isSubscribed ? "مشترك بالفعل" : "اشترك الآن"}
              </button>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">❓</span>
            أسئلة شائعة
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">هل يمكنني الاشتراك في الباقتين معاً؟</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">نعم، يمكنك الاشتراك في باقة القدرات وباقة التحصيلي بشكل منفصل لتغطية اختبارات قياس بالكامل.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">ما الفرق بين الباقتين؟</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">باقة القدرات تشمل اختبار القدرات العامة (Qudrat) ونسخته الإنجليزية (GAT). باقة التحصيلي تشمل الاختبار التحصيلي (Tahsili) ونسخته الإنجليزية (SAAT).</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">هل يمكنني إلغاء الاشتراك؟</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">نعم، يمكنك إلغاء اشتراكك في أي وقت وستستمر في الوصول حتى نهاية فترة الاشتراك.</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">ما طرق الدفع المتاحة؟</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">نقبل بطاقات الائتمان (Visa, Mastercard)، مدى، Apple Pay، وتحويل بنكي.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Subscription Modal */}
      {selectedPackage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6 relative animate-scale-in">
            <button
              onClick={() => setSelectedPackage(null)}
              className="absolute top-4 left-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              aria-label="إغلاق"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="text-center mb-6">
              <div className="text-5xl mb-3">
                {selectedPackage === "aptitude" ? "🧠" : "🎓"}
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedPackage === "aptitude" ? "باقة القدرات" : "باقة التحصيلي"}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {selectedPackage === "aptitude" ? "القدرات العامة + GAT" : "التحصيلي + SAAT"}
              </p>
            </div>

            {/* Plan Selection */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setSelectedPlan("annual")}
                className={`w-full rounded-xl p-4 transition-all text-right ${
                  selectedPlan === "annual"
                    ? "border-2 border-[#D4AF37] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20"
                    : "border-2 border-gray-200 dark:border-gray-600"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === "annual" ? "border-[#D4AF37] bg-[#D4AF37]" : "border-gray-300"
                    }`}>
                      {selectedPlan === "annual" && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        سنوي
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs rounded-full">
                          وفر 66%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-[#006C35] dark:text-[#00A651]">199</div>
                    <div className="text-xs text-gray-500">ريال/سنة</div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSelectedPlan("monthly")}
                className={`w-full rounded-xl p-4 transition-all text-right ${
                  selectedPlan === "monthly"
                    ? "border-2 border-[#D4AF37] bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20"
                    : "border-2 border-gray-200 dark:border-gray-600"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedPlan === "monthly" ? "border-[#D4AF37] bg-[#D4AF37]" : "border-gray-300"
                    }`}>
                      {selectedPlan === "monthly" && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white">
                        شهري
                      </div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">49</div>
                    <div className="text-xs text-gray-500">ريال/شهر</div>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={confirmSubscription}
              className="w-full bg-[#D4AF37] text-black font-bold py-3 rounded-xl hover:bg-[#E8C547] transition-colors"
            >
              متابعة للدفع
            </button>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
              ستتم إعادة توجيهك لصفحة الدفع الآمنة
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
