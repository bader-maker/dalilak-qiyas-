"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signInWithGoogle, user } = useAuth();
  const nextParam = searchParams.get("next");
  const safeNext = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";

  useEffect(() => {
    if (user) {
      window.location.href = safeNext;
    }
  }, [user, safeNext]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Check for error in URL params (from OAuth callback)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      if (decodedError === "auth_failed") {
        setError("فشل التحقق من الهوية. حاول مرة أخرى.");
      } else if (decodedError === "no_code") {
        setError("لم يتم استلام رمز التحقق. حاول مرة أخرى.");
      } else if (decodedError === "auth_exception" || decodedError === "exchange_failed") {
        setError("حدث خطأ أثناء التحقق. حاول مرة أخرى.");
      } else {
        setError(`خطأ في المصادقة: ${decodedError}`);
      }
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        console.error("Login error:", error);
        if (error.message?.includes("Invalid login credentials")) {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        } else if (error.message?.includes("Email not confirmed")) {
          setError("يرجى تأكيد بريدك الإلكتروني أولاً. تحقق من صندوق الوارد.");
        } else if (error.message?.includes("Invalid email")) {
          setError("البريد الإلكتروني غير صالح");
        } else {
          setError(`حدث خطأ أثناء تسجيل الدخول: ${error.message}`);
        }
        setIsLoading(false);
      } else {
        window.location.href = safeNext;
      }
    } catch (err) {
      console.error("Login exception:", err);
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      const { error } = await signInWithGoogle(safeNext);
      if (error) {
        console.error("Google login error:", error);
        if (error.message?.includes("provider is not enabled")) {
          setError("تسجيل الدخول بـ Google غير مفعل حالياً. يرجى استخدام البريد الإلكتروني.");
        } else {
          setError(`حدث خطأ أثناء الدخول بـ Google: ${error.message}`);
        }
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Google login exception:", err);
      setError("حدث خطأ غير متوقع. حاول مرة أخرى.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Login Form (White) */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-8 lg:p-16 order-2 lg:order-1">
        <div className="w-full max-w-md">
          {/* Main Title */}
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            تسجيل الدخول
          </h1>
          <p className="text-gray-500 mb-8">أهلاً بعودتك! سجل دخولك للمتابعة</p>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {/* Google Login Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-[#006C35]/30 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span className="text-gray-700 font-medium">الدخول باستخدام Google</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">أو</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#006C35] focus:outline-none transition-colors text-left"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Link href="/forgot-password" className="text-sm text-[#006C35] hover:underline">
                نسيت كلمة المرور؟
              </Link>
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
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center mt-8 text-gray-600">
            ليس لديك حساب؟{" "}
            <Link href="/" className="text-[#006C35] font-medium hover:underline">
              إنشاء حساب جديد
            </Link>
          </p>

          {/* Terms */}
          <p className="text-center text-xs text-gray-400 mt-6">
            بتسجيل الدخول، أنت توافق على{" "}
            <Link href="/privacy" className="underline hover:text-gray-600">سياسة الخصوصية</Link>
            {" "}و{" "}
            <Link href="/terms" className="underline hover:text-gray-600">شروط الاستخدام</Link>
          </p>
        </div>
      </div>

      {/* Right Side - Promotional Info (Dark Green) */}
      <div className="w-full lg:w-1/2 bg-[#1a3a2a] text-white flex flex-col justify-center items-center p-8 lg:p-16 order-1 lg:order-2 min-h-[50vh] lg:min-h-screen">
        <div className="w-full max-w-lg">
          {/* Logo */}
          <div className="flex items-center justify-end gap-3 mb-12">
            <div>
              <h2 className="text-xl font-bold text-right">دليلك إلى قياس</h2>
              <p className="text-sm text-gray-300 text-right">منصة التحضير الأولى</p>
            </div>
            <div className="w-12 h-12 bg-[#006C35] rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
            </div>
          </div>

          {/* Main Heading */}
          <h3 className="text-2xl lg:text-3xl font-bold text-right mb-8 leading-relaxed">
            اكتشف لماذا تخسر <span className="text-[#4ADE80]">+10 درجات</span> في
            <br />
            اختبار القدرات والتحصيلي
          </h3>

          {/* Score Comparison */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <div className="text-6xl lg:text-7xl font-bold text-[#4ADE80]">95</div>
              <p className="text-gray-300 text-sm mt-2">درجتك المتوقعة</p>
            </div>
            <div className="flex flex-col items-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-xs text-gray-400 mt-1">30 يوم</span>
            </div>
            <div className="text-center">
              <div className="text-6xl lg:text-7xl font-bold">65</div>
              <p className="text-gray-300 text-sm mt-2">درجتك الحالية</p>
            </div>
          </div>

          {/* Trust Badge */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 bg-[#4ADE80] rounded-full animate-pulse"></span>
              <span className="text-sm text-gray-300">متصل الآن</span>
            </div>
            <span className="text-gray-500">•</span>
            <span className="text-sm">موثوق من <span className="text-[#4ADE80] font-bold">+50,000</span> طالب وطالبة</span>
          </div>

          {/* Feature Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#2a4a3a] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-[#1a3a2a] rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-medium">+5000 سؤال محلول</p>
            </div>
            <div className="bg-[#2a4a3a] rounded-2xl p-6 text-center">
              <div className="w-12 h-12 bg-[#1a3a2a] rounded-xl flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="font-medium">تدريب ذكي بالـ AI</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <svg className="animate-spin w-8 h-8 text-[#006C35]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
