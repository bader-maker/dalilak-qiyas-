"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        console.error("Google signup error:", error);
        if (error.message?.includes("provider is not enabled")) {
          setError("تسجيل الدخول بـ Google غير مفعل حالياً. يرجى استخدام البريد الإلكتروني أو التواصل مع الدعم.");
        } else {
          setError(`حدث خطأ أثناء التسجيل بـ Google: ${error.message}`);
        }
        setIsLoading(false);
      }
      // If no error, the user will be redirected by Supabase
    } catch (err) {
      console.error("Google signup exception:", err);
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    if (password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }

    setIsLoading(true);

    try {
      const { error, needsEmailConfirmation } = await signUp(email, password, name);

      if (error) {
        console.error("Signup error:", error);
        if (error.message?.includes("already registered")) {
          setError("هذا البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول.");
        } else if (error.message?.includes("invalid email")) {
          setError("البريد الإلكتروني غير صالح");
        } else if (error.message?.includes("weak password")) {
          setError("كلمة المرور ضعيفة جداً");
        } else {
          setError(`حدث خطأ أثناء إنشاء الحساب: ${error.message}`);
        }
        setIsLoading(false);
        return;
      }

      if (needsEmailConfirmation) {
        setSuccessMessage("تم إنشاء الحساب بنجاح! يرجى تأكيد بريدك الإلكتروني عبر الرابط المرسل إليك.");
        setIsLoading(false);
        // Clear form
        setEmail("");
        setPassword("");
        setName("");
      } else {
        // User is signed in, redirect to dashboard
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Signup exception:", err);
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col md:flex-row">
      {/* Left Side - Green Section */}
      <div className="flex md:w-[45%] relative overflow-hidden flex-col p-6 md:p-10 lg:p-14 bg-[#006C35]">
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent pointer-events-none" />

        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-32 h-32 border-2 border-white/30 rounded-full" />
          <div className="absolute bottom-20 left-10 w-24 h-24 border-2 border-white/20 rounded-full" />
          <div className="absolute top-1/2 right-1/4 w-16 h-16 border border-white/20 rounded-full" />
        </div>

        {/* Logo */}
        <div className="relative z-10">
          <Link href="/" className="flex flex-row items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-white text-xl font-bold">دليلك إلى قياس</span>
              <span className="text-white/70 text-xs font-medium">منصة التحضير الأولى</span>
            </div>
          </Link>
        </div>

        {/* Main Content */}
        <div className="sm:h-[80vh]">
          <div className="h-full z-10 flex-1 flex flex-col justify-center py-12 md:py-0">
            <h2 className="text-xl md:text-2xl lg:text-[28px] font-bold text-white/95 leading-[1.4] tracking-tight mb-10">
              اكتشف لماذا تخسر{" "}
              <span className="text-[#D4AF37]">10+ درجات</span>{" "}
              في اختبار القدرات والتحصيلي
            </h2>

            {/* Score Visualization */}
            <div className="flex items-end justify-center gap-6 select-none">
              <div className="text-center">
                <span className="text-5xl md:text-6xl font-extrabold text-white/90 leading-none tracking-tight">65</span>
                <p className="text-white/50 text-sm mt-2">درجتك الحالية</p>
              </div>
              <div className="flex flex-col items-center gap-1 pb-4">
                <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                <span className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em]">30 يوم</span>
              </div>
              <div className="text-center">
                <span className="text-5xl md:text-6xl font-extrabold text-[#D4AF37] leading-none tracking-tight">95</span>
                <p className="text-[#D4AF37]/70 text-sm mt-2">درجتك المتوقعة</p>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="mt-12 flex items-center gap-3 flex-wrap justify-center md:justify-start">
              <span className="text-white/40 text-sm tracking-wide">موثوق من</span>
              <span className="text-white/80 text-sm tabular-nums font-bold transition-all duration-300">+50,000</span>
              <span className="text-white/40 text-sm tracking-wide">طالب وطالبة</span>
              <span className="relative flex h-2.5 w-2.5 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-400" />
              </span>
              <span className="text-green-400 text-[11px] font-semibold uppercase tracking-[0.15em]">متصل الآن</span>
            </div>

            {/* Features */}
            <div className="mt-10 grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-white/90 text-sm font-medium">+5000 سؤال محلول</p>
              </div>
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <div className="w-8 h-8 bg-[#D4AF37]/20 rounded-lg flex items-center justify-center mb-2">
                  <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-white/90 text-sm font-medium">تدريب ذكي بالـ AI</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - White Section */}
      <div className="flex flex-1 flex-col items-center justify-center p-6 md:p-10 lg:p-16 bg-white">
        <section className="flex w-full max-w-[400px] flex-col">
          <h1 className="text-center text-3xl sm:text-4xl md:text-5xl font-black text-[#006C35] mb-2">
            اكتشف تقريرك المجاني
          </h1>

          <div className="flex gap-2 mt-4 mb-6 items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <p className="text-center text-sm text-gray-500">لا حاجة لبطاقة ائتمان</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold">تم بنجاح!</span>
              </div>
              {successMessage}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Google Sign Up Button */}
          <button
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-[#006C35]/30 hover:bg-gray-50 transition-all duration-200 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-gray-700 font-medium group-hover:text-[#006C35] transition-colors">التسجيل باستخدام Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">أو</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email Sign Up */}
          <button
            onClick={() => setShowEmailForm(!showEmailForm)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 text-gray-700 hover:text-[#006C35] transition-colors"
          >
            <span className="font-medium">التسجيل بالبريد الإلكتروني</span>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showEmailForm ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Email Form */}
          {showEmailForm && (
            <form onSubmit={handleEmailSignUp} className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
              <input
                type="text"
                placeholder="الاسم الكامل (اختياري)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors text-right"
              />
              <input
                type="email"
                placeholder="البريد الإلكتروني"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors text-left"
                dir="ltr"
                required
              />
              <input
                type="password"
                placeholder="كلمة المرور (6 أحرف على الأقل)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors text-left"
                dir="ltr"
                required
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-4 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors text-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>جاري إنشاء الحساب...</span>
                  </>
                ) : (
                  "إنشاء حساب"
                )}
              </button>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6">
            <p className="text-center text-base">
              <span className="text-gray-600">لديك حساب بالفعل؟</span>{" "}
              <Link href="/login" className="text-[#006C35] font-medium hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>

          {/* Terms */}
          <div className="mt-6">
            <p className="text-center text-xs text-gray-400">
              بالتسجيل، أنت توافق على{" "}
              <Link href="/privacy" className="underline hover:text-[#006C35]">سياسة الخصوصية</Link>
              {" "}و{" "}
              <Link href="/terms" className="underline hover:text-[#006C35]">شروط الاستخدام</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
