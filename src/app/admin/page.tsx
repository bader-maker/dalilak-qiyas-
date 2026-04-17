"use client";

import { useState } from "react";
import Link from "next/link";

// بيانات المالك - غيّر كلمة المرور لاحقاً
const ADMIN_CREDENTIALS = {
  email: "admin@dalilak.com",
  password: "Admin@2024#Qiyas",
};

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // محاكاة تأخير للتحقق
    await new Promise(resolve => setTimeout(resolve, 500));

    // التحقق من بيانات المالك
    if (email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password) {
      try {
        // حفظ حالة تسجيل الدخول
        localStorage.setItem("adminLoggedIn", "true");
        localStorage.setItem("adminLoginTime", Date.now().toString());
        // استخدام window.location للتنقل
        window.location.href = "/admin/dashboard";
      } catch (err) {
        console.error("Error saving to localStorage:", err);
        setError("حدث خطأ في حفظ الجلسة. حاول مرة أخرى.");
        setLoading(false);
      }
    } else {
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#006C35] to-[#004d26] rounded-2xl mb-4 shadow-2xl">
            <span className="text-3xl">👑</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">لوحة تحكم المالك</h1>
          <p className="text-gray-400">الوصول الكامل لجميع الميزات</p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-2xl p-8 border border-gray-700 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006C35] focus:border-transparent transition-all"
                placeholder="admin@dalilak.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#006C35] focus:border-transparent transition-all"
                placeholder="••••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-[#006C35] to-[#008040] text-white font-bold rounded-xl hover:from-[#005528] hover:to-[#006C35] transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>جاري التحقق...</span>
                </>
              ) : (
                "تسجيل الدخول"
              )}
            </button>
          </form>

          {/* Quick Login Info */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="bg-gray-700/30 rounded-xl p-4">
              <p className="text-gray-400 text-sm mb-2">بيانات الدخول:</p>
              <p className="text-gray-300 text-sm font-mono">admin@dalilak.com</p>
              <p className="text-gray-300 text-sm font-mono">Admin@2024#Qiyas</p>
            </div>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>🔒 هذه الصفحة مخصصة للمالك فقط</p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors text-sm">
            ← العودة للصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
