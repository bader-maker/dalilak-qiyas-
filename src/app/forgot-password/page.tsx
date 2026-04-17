"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("يرجى إدخال البريد الإلكتروني");
      return;
    }

    if (!email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setIsLoading(true);

    const { error } = await resetPassword(email);

    if (error) {
      setError("حدث خطأ أثناء إرسال رابط الاستعادة. حاول مرة أخرى");
      setIsLoading(false);
    } else {
      setIsLoading(false);
      setIsSuccess(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Link href="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-[#006C35] transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">العودة لتسجيل الدخول</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 justify-center">
              <div className="w-12 h-12 bg-[#006C35] rounded-xl flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                </svg>
              </div>
              <span className="text-2xl font-bold text-[#006C35]">دليلك إلى قياس</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {!isSuccess ? (
              <>
                {/* Icon */}
                <div className="w-16 h-16 bg-[#006C35]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-[#006C35]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">نسيت كلمة المرور؟</h1>
                <p className="text-gray-500 text-center mb-8">
                  لا تقلق! أدخل بريدك الإلكتروني وسنرسل لك رابط لإعادة تعيين كلمة المرور
                </p>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      البريد الإلكتروني
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors text-left"
                      dir="ltr"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-4 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>جاري الإرسال...</span>
                      </>
                    ) : (
                      "إرسال رابط الاستعادة"
                    )}
                  </button>
                </form>

                {/* Back to Login */}
                <p className="text-center mt-6 text-gray-600">
                  تذكرت كلمة المرور؟{" "}
                  <Link href="/login" className="text-[#006C35] font-medium hover:underline">
                    تسجيل الدخول
                  </Link>
                </p>
              </>
            ) : (
              /* Success State */
              <>
                <div className="text-center">
                  {/* Success Icon */}
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    </svg>
                  </div>

                  <h1 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال الرابط!</h1>
                  <p className="text-gray-500 mb-2">
                    تم إرسال رابط إعادة تعيين كلمة المرور إلى:
                  </p>
                  <p className="text-[#006C35] font-medium mb-6" dir="ltr">{email}</p>

                  {/* Instructions */}
                  <div className="bg-gray-50 rounded-xl p-4 mb-6 text-right">
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>تعليمات:</strong>
                    </p>
                    <ul className="text-sm text-gray-500 space-y-1">
                      <li>- تحقق من صندوق الوارد</li>
                      <li>- إذا لم تجد الرسالة، تحقق من مجلد الرسائل غير المرغوبة</li>
                      <li>- الرابط صالح لمدة 24 ساعة</li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <Link
                      href="/login"
                      className="w-full py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors flex items-center justify-center"
                    >
                      العودة لتسجيل الدخول
                    </Link>
                    <button
                      onClick={() => {
                        setIsSuccess(false);
                        setEmail("");
                      }}
                      className="w-full py-3 border-2 border-gray-200 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      إرسال رابط جديد
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Help Text */}
          <p className="text-center text-xs text-gray-400 mt-6">
            هل تواجه مشكلة؟{" "}
            <Link href="/contact" className="underline hover:text-gray-600">تواصل مع الدعم</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
