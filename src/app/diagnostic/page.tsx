"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, GraduationCap, ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function DiagnosticPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login?redirect=/diagnostic");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" dir="rtl">
        <svg className="animate-spin w-8 h-8 text-[#006C35]" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  const cards = [
    {
      key: "qudrat",
      icon: Brain,
      title: "اختبار القدرات التجريبي",
      desc: "قياس مهاراتك العامة في الاستدلال والتحليل.",
      includes: ["الكمي", "اللفظي"],
      href: "/test/qudrat-ar",
    },
    {
      key: "tahsili",
      icon: GraduationCap,
      title: "اختبار التحصيلي التجريبي",
      desc: "قياس تحصيلك في المواد العلمية الأساسية.",
      includes: ["الرياضيات", "العلوم"],
      href: "/test/tahsili-ar",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900" dir="rtl">
      {/* Header */}
      <header className="border-b border-gray-100">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#006C35] rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-[#006C35]">دليلك إلى قياس</span>
              <span className="text-xs text-gray-500">منصة التحضير الأولى</span>
            </div>
          </Link>
        </div>
      </header>

      {/* Main */}
      <main className="container mx-auto py-16 lg:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#006C35]/10 text-[#006C35] rounded-xl text-sm font-bold mb-5">
            <Sparkles className="w-4 h-4" />
            مرحباً بك
          </div>
          <h1 className="text-3xl lg:text-5xl font-black mb-4 text-gray-900 leading-tight">
            اختر نوع الاختبار التجريبي
          </h1>
          <p className="text-lg text-gray-600 leading-loose">
            اختبار قصير يحدد مستواك الحالي ويبني لك خطة تدريب مخصصة.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {cards.map((c) => (
            <div
              key={c.key}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 hover:border-[#006C35] hover:shadow-md transition-all flex flex-col"
            >
              <div className="w-14 h-14 bg-[#006C35]/10 rounded-xl flex items-center justify-center mb-5">
                <c.icon className="w-7 h-7 text-[#006C35]" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{c.title}</h2>
              <p className="text-gray-600 leading-relaxed mb-5">{c.desc}</p>

              <div className="mb-6">
                <div className="text-sm font-bold text-gray-900 mb-2">يشمل:</div>
                <ul className="space-y-1.5">
                  {c.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#006C35]" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={c.href}
                className="mt-auto block text-center w-full px-6 py-4 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                ابدأ الاختبار
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="text-center text-sm text-gray-500 mt-10">
          الاختبار التجريبي مجاني تماماً • 30 سؤال • 30 دقيقة
        </p>
      </main>
    </div>
  );
}
