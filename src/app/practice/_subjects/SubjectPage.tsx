import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  Shapes,
  Scale,
  BarChart3,
  Link2,
  BookOpen,
  Type,
  Square,
  Sigma,
  Compass,
  Dice5,
  Triangle,
  Atom,
  Zap,
  Waves,
  Thermometer,
  Grid3x3,
  Beaker,
  Hexagon,
  Microscope,
  Dna,
  HeartPulse,
  Leaf,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  GraduationCap,
} from "lucide-react";
import type { Subject, IconKey } from "./data";

const ICONS: Record<IconKey, React.ComponentType<{ className?: string }>> = {
  calc: Calculator,
  shapes: Shapes,
  ratio: Scale,
  stats: BarChart3,
  link: Link2,
  book: BookOpen,
  abc: Type,
  blank: Square,
  equation: Sigma,
  geometry: Compass,
  probability: Dice5,
  trig: Triangle,
  newton: Atom,
  bolt: Zap,
  wave: Waves,
  thermo: Thermometer,
  table: Grid3x3,
  balance: Scale,
  beaker: Beaker,
  molecule: Hexagon,
  cell: Microscope,
  dna: Dna,
  anatomy: HeartPulse,
  leaf: Leaf,
};

function Icon({ name, className }: { name: IconKey; className?: string }) {
  const C = ICONS[name];
  return <C className={className} />;
}

export default function SubjectPage({ subject }: { subject: Subject }) {
  return (
    <div className="min-h-screen bg-white text-gray-900" dir="rtl">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="container mx-auto flex items-center justify-between py-4">
          <Link
            href={subject.parentHref}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-[#006C35] font-medium transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>العودة إلى {subject.parentLabel}</span>
          </Link>
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#006C35] rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-[#006C35] hidden sm:block">دليلك إلى قياس</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto py-10 lg:py-14 max-w-5xl">
        {/* Hero */}
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 lg:p-10 mb-10">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-20 h-20 bg-[#006C35]/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Icon name={subject.iconKey} className="w-10 h-10 text-[#006C35]" />
            </div>
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/15 text-[#8a6d10] rounded-lg text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                قسم {subject.parentLabel}
              </div>
              <h1 className="text-3xl lg:text-4xl font-black text-gray-900 mb-3">{subject.nameAr}</h1>
              <p className="text-lg text-gray-600 leading-relaxed">{subject.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-8 border-t border-gray-100">
            {subject.stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className="text-lg font-bold text-[#006C35]">{s.value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 1: Question types */}
        <section className="mb-12">
          <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2">أنواع الأسئلة الشائعة</h2>
          <p className="text-gray-600 mb-6">أبرز التصنيفات التي ستواجهها في هذا القسم.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {subject.types.map((t) => (
              <div
                key={t.title}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 hover:border-[#006C35] hover:shadow-md transition-all flex items-start gap-4"
              >
                <div className="w-12 h-12 bg-[#006C35]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon name={t.iconKey} className="w-6 h-6 text-[#006C35]" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{t.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Fastest methods */}
        <section className="mb-12">
          <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2">أسرع طرق الحل</h2>
          <p className="text-gray-600 mb-6">تكتيكات عملية تختصر زمن الإجابة وتزيد دقتك.</p>
          <ol className="space-y-3">
            {subject.methods.map((m, i) => (
              <li
                key={m.title}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex items-start gap-4 hover:border-[#006C35] hover:shadow-md transition-all"
              >
                <div className="w-9 h-9 bg-[#006C35] text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{m.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{m.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Section 3: Worked example */}
        <section className="mb-12">
          <h2 className="text-2xl lg:text-3xl font-black text-gray-900 mb-2">مثال محلول</h2>
          <p className="text-gray-600 mb-6">سؤال نموذجي مع خطوات الحل والطريقة الأسرع.</p>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {/* Question */}
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <div className="text-xs font-bold text-gray-500 mb-2">السؤال</div>
              <p className="text-lg text-gray-900 leading-relaxed">{subject.example.question}</p>
              {subject.example.options && (
                <ul className="mt-4 grid sm:grid-cols-2 gap-2">
                  {subject.example.options.map((o) => (
                    <li
                      key={o}
                      className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-800 text-sm"
                    >
                      {o}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Solution */}
            <div className="p-6">
              <div className="text-xs font-bold text-gray-500 mb-3">خطوات الحل</div>
              <ol className="space-y-3">
                {subject.example.solution.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-[#006C35]/10 text-[#006C35] rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-gray-800 leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>

              {/* Method highlight */}
              <div className="mt-6 p-4 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-[#8a6d10] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-[#8a6d10] mb-1">الطريقة الأسرع</div>
                  <p className="text-sm text-gray-800 leading-relaxed">{subject.example.methodHighlight}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: CTA */}
        <section>
          <div className="bg-[#006C35] rounded-2xl p-8 lg:p-10 text-center text-white shadow-lg">
            <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl lg:text-3xl font-black mb-3">جاهز للتدريب؟</h2>
            <p className="text-white/85 mb-7 max-w-xl mx-auto leading-relaxed">
              ابدأ جلسة تدريب على {subject.nameAr} الآن وسنخصص لك الأسئلة المناسبة لمستواك.
            </p>
            <Link
              href={subject.focusHref}
              className="inline-flex items-center gap-2 bg-white text-[#006C35] font-bold rounded-xl px-8 py-4 hover:bg-gray-50 transition-colors shadow-md"
            >
              ابدأ التدريب الآن
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
