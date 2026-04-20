"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  Brain,
  Target,
  BarChart3,
  Zap,
  BookOpen,
  GraduationCap,
  Globe,
  FileText,
  Download,
  PlayCircle,
  Star,
  Quote,
  Trophy,
  Users,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Timer,
  PenTool,
  TrendingUp,
  ChevronDown,
  Mail,
  Phone,
  Twitter,
  Instagram,
  Youtube,
  Crown,
} from "lucide-react";

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const featureCards = [
    { icon: Brain, title: "ذكاء اصطناعي متقدم", desc: "يحلّل أخطاءك ويبني خطة تدريب مخصصة لك" },
    { icon: BarChart3, title: "تحليل فوري للأداء", desc: "تقارير مفصّلة بعد كل اختبار وكل جلسة" },
    { icon: Target, title: "خطط واضحة للتحسن", desc: "خارطة طريق أسبوعية لرفع درجتك خطوة بخطوة" },
    { icon: Zap, title: "اختبارات تحاكي الواقع", desc: "نفس نمط أسئلة قياس وتوقيتها الحقيقي" },
  ];

  const categories = [
    { icon: Brain, title: "القدرات", desc: "تدريب شامل على القسمين اللفظي والكمي مع شروحات تفاعلية", count: "+2,500 سؤال" },
    { icon: GraduationCap, title: "التحصيلي", desc: "مراجعة منهجية لمواد الفيزياء والكيمياء والأحياء والرياضيات", count: "+1,800 سؤال" },
    { icon: Target, title: "القدرات العامة", desc: "تأهيل احترافي لاختبارات القدرات للجامعيين", count: "+1,200 سؤال" },
    { icon: Globe, title: "GAT English", desc: "تدريب متخصص على اختبار القدرات باللغة الإنجليزية", count: "+900 سؤال" },
  ];

  const resources = [
    { icon: FileText, title: "ملخصات قياس المجانية", desc: "ملفات PDF منظمة لكل أقسام الاختبار" },
    { icon: Download, title: "نماذج اختبارات سابقة", desc: "تحميل مباشر مع الحلول التفصيلية" },
    { icon: PlayCircle, title: "فيديوهات شرح مختارة", desc: "مكتبة مرئية لأهم القواعد والاستراتيجيات" },
  ];

  const testimonials = [
    {
      name: "نورة العتيبي",
      role: "طالبة ثانوي – الرياض",
      score: "من 72 إلى 91",
      text: "خطة الدراسة الذكية ساعدتني أركّز على نقاط ضعفي بالضبط. خلال شهرين وصلت لدرجتي المستهدفة.",
    },
    {
      name: "عبدالرحمن الشهري",
      role: "طالب جامعي – جدة",
      score: "تحصيلي 94",
      text: "تحليل الأداء بعد كل اختبار غيّر طريقتي بالمذاكرة. حسّيت إنّي أتدرب بذكاء مو بكثرة.",
    },
    {
      name: "ريم القحطاني",
      role: "طالبة ثانوي – الدمام",
      score: "قدرات 89",
      text: "الأسئلة شبيهة جداً بالاختبار الحقيقي والشرح بعد كل سؤال يخلّيك تفهم لا تحفظ.",
    },
  ];

  const steps = [
    { num: "01", icon: PenTool, title: "اختبار تحديد المستوى", desc: "نقيس مستواك الحالي بدقة في أقل من 20 دقيقة" },
    { num: "02", icon: Brain, title: "خطة مخصصة بالذكاء الاصطناعي", desc: "نبني لك مساراً يومياً يركّز على نقاط ضعفك تحديداً" },
    { num: "03", icon: TrendingUp, title: "تدرّب وتابع تطورك", desc: "تقارير مرئية تريك الفرق في كل أسبوع حتى تصل لهدفك" },
  ];

  const moreTools = [
    { icon: Calculator, title: "حاسبة الدرجة المتوقعة", desc: "اعرف توقع درجتك بناءً على أدائك الحالي" },
    { icon: Timer, title: "مؤقّت محاكاة الاختبار", desc: "تدرّب بنفس توقيت الاختبار الرسمي" },
    { icon: BookOpen, title: "بنك أسئلة مفتوح", desc: "آلاف الأسئلة مصنّفة حسب الموضوع والصعوبة" },
    { icon: ShieldCheck, title: "وضع المراجعة الذكية", desc: "يعيد عليك أسئلتك الخاطئة في الوقت الأمثل" },
  ];

  const achievements = [
    { icon: Users, num: "+50,000", label: "طالب وطالبة وثقوا بنا" },
    { icon: Trophy, num: "+10 درجات", label: "متوسط التحسن خلال 30 يوم" },
    { icon: Star, num: "4.9 / 5", label: "تقييم الطلاب على المنصة" },
  ];

  const plans = [
    {
      name: "المجاني",
      price: "0",
      period: "ريال",
      features: ["وصول تجريبي للأسئلة", "اختبار تحديد مستوى واحد", "تقارير أساسية"],
      highlighted: false,
    },
    {
      name: "الاحترافي",
      price: "79",
      period: "ريال / شهر",
      features: ["وصول كامل لكل الأقسام", "خطة AI مخصصة يومياً", "تقارير أداء متقدمة", "محاكاة اختبار غير محدودة"],
      highlighted: true,
      badge: "الأكثر اختياراً",
    },
    {
      name: "الجاد",
      price: "199",
      period: "ريال / 3 شهور",
      features: ["كل مزايا الاحترافي", "جلسات مراجعة مع مختصّين", "ضمان تحسّن الدرجة"],
      highlighted: false,
    },
  ];

  const blogs = [
    { tag: "استراتيجيات", title: "خمس عادات يومية ترفع درجتك في القدرات", read: "5 دقائق قراءة" },
    { tag: "تحصيلي", title: "كيف تذاكر مادة الفيزياء بطريقة فعّالة قبل الاختبار", read: "7 دقائق قراءة" },
    { tag: "إدارة وقت", title: "خطّة الـ 30 يوماً للوصول لدرجتك المستهدفة", read: "6 دقائق قراءة" },
  ];

  const faqs = [
    { q: "هل المنصة مناسبة لمستويات المبتدئين؟", a: "نعم، نبدأ معك من اختبار تحديد المستوى ونبني خطة تتناسب مع مستواك الحالي وهدفك، سواءً كنت مبتدئ أو متقدم." },
    { q: "هل يمكنني التدرب من الجوال؟", a: "بالتأكيد. المنصة مصممة لتعمل بسلاسة على الجوال والتابلت وجهاز الكمبيوتر بنفس التجربة." },
    { q: "كم يستغرق الاشتراك حتى ألاحظ تحسّناً؟", a: "غالبية الطلاب يلاحظون تحسناً واضحاً خلال 2-4 أسابيع من الالتزام بالخطة اليومية المقترحة من الذكاء الاصطناعي." },
    { q: "هل توجد فترة تجريبية مجانية؟", a: "نعم، تستطيع البدء مجاناً بدون بطاقة ائتمان وتجربة اختبار تحديد المستوى وعينة من البنك." },
    { q: "هل الأسئلة مشابهة للاختبار الفعلي؟", a: "أسئلتنا مبنية على نفس نمط ومستوى صعوبة وتوقيت اختبارات قياس الرسمية، ويتم تحديثها باستمرار." },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground" dir="rtl">
      {/* ============ NAVBAR ============ */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#006C35]/10">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#006C35] rounded-xl flex items-center justify-center shadow-md">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-[#006C35]">دليلك إلى قياس</span>
              <span className="text-xs text-muted-foreground">منصة التحضير الأولى</span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-foreground/80">
            <a href="#categories" className="hover:text-[#006C35] transition-colors">الأقسام</a>
            <a href="#how" className="hover:text-[#006C35] transition-colors">كيف تعمل</a>
            <a href="#tools" className="hover:text-[#006C35] transition-colors">الأدوات</a>
            <a href="#pricing" className="hover:text-[#006C35] transition-colors">الأسعار</a>
            <a href="#faq" className="hover:text-[#006C35] transition-colors">الأسئلة الشائعة</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline text-sm font-medium text-foreground/80 hover:text-[#006C35] transition-colors">
              تسجيل الدخول
            </Link>
            <Link
              href="/login?next=/test"
              className="px-5 py-2.5 bg-[#006C35] text-white text-sm font-bold rounded-xl hover:bg-[#004d26] transition-colors flex items-center gap-2 shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              ابدأ مجاناً
            </Link>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto py-16 lg:py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 animate-fade-slide-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#006C35]/10 text-[#006C35] rounded-xl text-sm font-bold">
              <Sparkles className="w-4 h-4" />
              مدعوم بالذكاء الاصطناعي
            </div>
            <h1 className="text-4xl lg:text-6xl font-black leading-tight">
              ابدأ رحلتك نحو
              <span className="text-gradient block mt-2">درجتك المستهدفة</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-loose max-w-xl">
              منصة تحضير ذكية لاختبارات قياس تبني لك خطة مخصصة، تحاكي الاختبار الحقيقي،
              وتعطيك تحليلاً فورياً لأدائك بعد كل جلسة.
            </p>

            <div id="hero-cta" className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/login"
                className="px-6 py-4 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                <Sparkles className="w-5 h-5" />
                ابدأ التجربة المجانية
              </Link>
              <a
                href="#how"
                className="px-6 py-4 border-2 border-gray-200 rounded-xl hover:border-[#006C35]/30 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 font-bold text-foreground"
              >
                <PlayCircle className="w-5 h-5" />
                شاهد كيف تعمل
              </a>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#006C35]" />
                لا حاجة لبطاقة ائتمان
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#006C35]" />
                +50,000 طالب وطالبة
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                تقييم 4.9 / 5
              </div>
            </div>
          </div>

          {/* Hero feature cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {featureCards.map((f, i) => (
              <div
                key={f.title}
                className={`bg-white rounded-2xl shadow-lg p-6 card-hover border border-[#006C35]/5 animate-scale-in animate-delay-${(i + 1) * 100}`}
              >
                <div className="w-12 h-12 bg-[#006C35]/10 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-[#006C35]" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MAIN CATEGORIES ============ */}
      <section id="categories" className="py-20 bg-[#006C35] text-white">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#E8C547] font-bold text-sm">الأقسام الرئيسية</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4 text-white">اختر الاختبار المناسب لك</h2>
            <p className="text-white/80">تغطية كاملة لجميع اختبارات قياس بمحتوى محدّث ومراجَع من مختصّين.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {categories.map((c) => (
              <div key={c.title} className="bg-white rounded-2xl shadow-lg p-6 card-hover border border-[#006C35]/5">
                <div className="w-14 h-14 bg-gradient-to-br from-[#006C35] to-[#008542] rounded-xl flex items-center justify-center mb-5 shadow-md">
                  <c.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{c.desc}</p>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-xs font-bold text-[#006C35]">{c.count}</span>
                  <ArrowLeft className="w-4 h-4 text-[#006C35]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FREE RESOURCES ============ */}
      <section className="py-20">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-4">
            <div className="max-w-xl">
              <span className="text-[#D4AF37] font-bold text-sm">موارد مجانية</span>
              <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4">ابدأ التحضير الآن — بدون اشتراك</h2>
              <p className="text-muted-foreground">ملفات وأدوات وفيديوهات مختارة بعناية لمساعدتك من اليوم الأول.</p>
            </div>
            <a href="#" className="text-[#006C35] font-bold flex items-center gap-2 hover:gap-3 transition-all">
              تصفّح كل الموارد <ArrowLeft className="w-4 h-4" />
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {resources.map((r) => (
              <div key={r.title} className="bg-white rounded-2xl shadow-lg p-6 card-hover border border-[#006C35]/5">
                <div className="w-12 h-12 bg-[#D4AF37]/15 rounded-xl flex items-center justify-center mb-4">
                  <r.icon className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="font-bold text-lg mb-2">{r.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{r.desc}</p>
                <Link href="/login" className="text-sm font-bold text-[#006C35] flex items-center gap-2 hover:gap-3 transition-all">
                  ابدأ الآن <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-20 bg-[#006C35] text-white">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#E8C547] font-bold text-sm">آراء طلابنا</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4 text-white">قصص نجاح حقيقية</h2>
            <p className="text-white/80">طلاب اختاروا منصتنا ووصلوا لدرجاتهم المستهدفة.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl shadow-lg p-6 card-hover border border-[#006C35]/5 flex flex-col">
                <Quote className="w-8 h-8 text-[#006C35]/20 mb-3" />
                <p className="text-foreground/80 leading-loose mb-6 flex-1">{t.text}</p>
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div>
                    <div className="font-bold">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                  <span className="text-xs font-bold text-[#006C35] bg-[#006C35]/10 px-3 py-1.5 rounded-xl">
                    {t.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how" className="py-20">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#006C35] font-bold text-sm">خطوات بسيطة</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4">كيف تعمل المنصة</h2>
            <p className="text-muted-foreground">ثلاث خطوات تفصلك عن خطة تحضير ذكية ومخصصة لك.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s) => (
              <div key={s.num} className="relative bg-white rounded-2xl shadow-lg p-8 card-hover border border-[#006C35]/5">
                <span className="absolute top-6 left-6 text-5xl font-black text-[#006C35]/10">{s.num}</span>
                <div className="w-14 h-14 bg-[#006C35] rounded-xl flex items-center justify-center mb-5 shadow-md">
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-bold text-xl mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ MORE TOOLS ============ */}
      <section id="tools" className="py-20 bg-[#006C35] text-white">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#E8C547] font-bold text-sm">أدوات إضافية</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4 text-white">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-white/80">أدوات ذكية تساعدك تخطّط وتقيس وتتحسّن باستمرار.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {moreTools.map((t) => (
              <div key={t.title} className="bg-white rounded-2xl shadow-lg p-6 card-hover border border-[#006C35]/5">
                <div className="w-12 h-12 bg-[#006C35]/10 rounded-xl flex items-center justify-center mb-4">
                  <t.icon className="w-6 h-6 text-[#006C35]" />
                </div>
                <h3 className="font-bold text-lg mb-2">{t.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SCORE PREVIEW ============ */}
      <section className="py-20">
        <div className="container mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-12 border border-[#006C35]/5 grid lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <span className="text-[#006C35] font-bold text-sm">معاينة لوحة الأداء</span>
              <h2 className="text-3xl lg:text-4xl font-black leading-tight">
                شاهد تطوّرك يتحوّل إلى أرقام
              </h2>
              <p className="text-muted-foreground leading-loose">
                لوحة تحكم تعرض لك متوسط أدائك، نقاط ضعفك، والوقت المتوقع لوصولك لهدفك —
                بعد كل جلسة وبشكل لحظي.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-6 py-4 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors shadow-lg"
              >
                <BarChart3 className="w-5 h-5" />
                جرّب لوحة الأداء
              </Link>
            </div>

            <div className="bg-saudi-gradient rounded-2xl p-8 text-white shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs opacity-80">درجتك التقديرية</div>
                  <div className="text-5xl font-black mt-1">87</div>
                </div>
                <div className="text-left">
                  <div className="text-xs opacity-80">الهدف</div>
                  <div className="text-5xl font-black mt-1 text-[#E8C547]">95</div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  { label: "اللفظي", value: 88 },
                  { label: "الكمي", value: 82 },
                  { label: "محاكاة الاختبار", value: 91 },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-xs mb-2 opacity-90">
                      <span>{m.label}</span>
                      <span className="font-bold">{m.value}%</span>
                    </div>
                    <div className="h-2 bg-white/15 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#E8C547] rounded-full animate-progress"
                        style={{ width: `${m.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-white/15 flex items-center gap-2 text-sm">
                <TrendingUp className="w-4 h-4 text-[#E8C547]" />
                +12 درجة خلال آخر 30 يوم
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ ACHIEVEMENTS (DARK GREEN) ============ */}
      <section className="py-20 bg-saudi-gradient-dark text-white">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#E8C547] font-bold text-sm">إنجازاتنا بالأرقام</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4">منصة موثوقة من آلاف الطلاب</h2>
            <p className="opacity-80">أرقام تعكس التزامنا بمساعدة كل طالب وطالبة على تحقيق هدفه.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {achievements.map((a) => (
              <div key={a.label} className="bg-[#2a4a3a] rounded-2xl p-8 text-center border border-white/5">
                <div className="w-14 h-14 bg-[#1a3a2a] rounded-xl flex items-center justify-center mx-auto mb-4">
                  <a.icon className="w-7 h-7 text-[#E8C547]" />
                </div>
                <div className="text-4xl font-black mb-2">{a.num}</div>
                <div className="text-sm opacity-80">{a.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING TEASER ============ */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-[#006C35] font-bold text-sm">باقات مرنة</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4">اختر الخطة المناسبة لك</h2>
            <p className="text-muted-foreground">ابدأ مجاناً وطوّر اشتراكك متى ما احتجت إمكانيات أكثر.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-8 border card-hover ${
                  p.highlighted
                    ? "bg-saudi-gradient text-white shadow-2xl border-transparent"
                    : "bg-white shadow-lg border-[#006C35]/5"
                }`}
              >
                {p.badge && (
                  <span className="absolute -top-3 right-6 bg-[#D4AF37] text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1">
                    <Crown className="w-3 h-3" /> {p.badge}
                  </span>
                )}
                <div className="font-bold text-lg mb-2">{p.name}</div>
                <div className="flex items-baseline gap-2 mb-6">
                  <span className="text-5xl font-black">{p.price}</span>
                  <span className={p.highlighted ? "opacity-80 text-sm" : "text-muted-foreground text-sm"}>
                    {p.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          p.highlighted ? "text-[#E8C547]" : "text-[#006C35]"
                        }`}
                      />
                      <span className={p.highlighted ? "" : "text-foreground/80"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`block text-center w-full py-3 font-bold rounded-xl transition-colors ${
                    p.highlighted
                      ? "bg-white text-[#006C35] hover:bg-[#E8C547] hover:text-white"
                      : "bg-[#006C35] text-white hover:bg-[#004d26]"
                  }`}
                >
                  {p.highlighted ? "ابدأ الآن" : "اختيار هذه الباقة"}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ BLOG PREVIEW ============ */}
      <section className="py-20 bg-[#006C35] text-white">
        <div className="container mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-4">
            <div className="max-w-xl">
              <span className="text-[#E8C547] font-bold text-sm">من المدوّنة</span>
              <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4 text-white">نصائح ومقالات تساعدك تتقدّم</h2>
              <p className="text-white/80">محتوى مكتوب من مختصّين ومدرّبين قياس.</p>
            </div>
            <a href="#" className="text-[#E8C547] font-bold flex items-center gap-2 hover:gap-3 transition-all">
              تصفّح المدوّنة <ArrowLeft className="w-4 h-4" />
            </a>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {blogs.map((b) => (
              <article key={b.title} className="bg-white rounded-2xl shadow-lg overflow-hidden card-hover border border-[#006C35]/5">
                <div className="h-40 bg-saudi-gradient relative">
                  <span className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-xl">
                    {b.tag}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-bold text-lg leading-snug mb-3">{b.title}</h3>
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-xs text-muted-foreground">{b.read}</span>
                    <a href="#" className="text-sm font-bold text-[#006C35] flex items-center gap-1 hover:gap-2 transition-all">
                      اقرأ المقال <ArrowLeft className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-20">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <span className="text-[#006C35] font-bold text-sm">الأسئلة الشائعة</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2 mb-4">إجابات لأكثر ما يسأله الطلاب</h2>
          </div>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const open = openFaq === i;
              return (
                <div
                  key={f.q}
                  className="bg-white rounded-2xl shadow-lg border border-[#006C35]/5 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between p-6 text-right"
                  >
                    <span className="font-bold text-lg">{f.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-[#006C35] flex-shrink-0 transition-transform ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="px-6 pb-6 text-muted-foreground leading-loose animate-fade-slide-in">
                      {f.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="py-20">
        <div className="container mx-auto">
          <div className="bg-saudi-gradient rounded-2xl p-10 lg:p-16 text-white text-center shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
            <div className="relative max-w-2xl mx-auto space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/15 backdrop-blur rounded-xl text-sm font-bold">
                <Sparkles className="w-4 h-4 text-[#E8C547]" />
                ابدأ خلال أقل من دقيقة
              </div>
              <h2 className="text-3xl lg:text-5xl font-black leading-tight">
                خطوتك التالية نحو
                <span className="block text-[#E8C547] mt-2">درجة تفتخر فيها</span>
              </h2>
              <p className="opacity-90 leading-loose">
                انضم لأكثر من 50,000 طالب وطالبة يستخدمون منصتنا للوصول إلى درجاتهم المستهدفة في قياس.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <Link
                  href="/login?next=/test"
                  className="px-6 py-4 bg-white text-[#006C35] font-bold rounded-xl hover:bg-[#E8C547] hover:text-white transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Sparkles className="w-5 h-5" />
                  ابدأ مجاناً الآن
                </Link>
                <a
                  href="#pricing"
                  className="px-6 py-4 border-2 border-white/30 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center gap-2 font-bold"
                >
                  اطلع على الباقات
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#1a3a2a] text-white pt-16 pb-8">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#006C35] rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold">دليلك إلى قياس</div>
                  <div className="text-xs opacity-70">منصة التحضير الأولى</div>
                </div>
              </div>
              <p className="text-sm opacity-80 leading-relaxed">
                منصة سعودية متخصصة في تحضير الطلاب لاختبارات قياس بأذكى الأدوات وأفضل المحتوى.
              </p>
              <div className="flex items-center gap-3">
                {[Twitter, Instagram, Youtube].map((I, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 bg-[#2a4a3a] rounded-xl flex items-center justify-center hover:bg-[#006C35] transition-colors"
                  >
                    <I className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            <div>
              <div className="font-bold mb-4">الأقسام</div>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">القدرات</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">التحصيلي</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">القدرات العامة</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">GAT English</a></li>
              </ul>
            </div>

            <div>
              <div className="font-bold mb-4">الشركة</div>
              <ul className="space-y-2 text-sm opacity-80">
                <li><a href="#" className="hover:opacity-100 transition-opacity">من نحن</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">المدوّنة</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">الأسعار</a></li>
                <li><a href="#" className="hover:opacity-100 transition-opacity">تواصل معنا</a></li>
              </ul>
            </div>

            <div>
              <div className="font-bold mb-4">تواصل</div>
              <ul className="space-y-3 text-sm opacity-80">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#E8C547]" />
                  support@dalilqiyas.sa
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#E8C547]" />
                  920000000
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs opacity-70">
            <div>© {new Date().getFullYear()} دليلك إلى قياس. جميع الحقوق محفوظة.</div>
            <div className="flex items-center gap-6">
              <a href="#" className="hover:opacity-100 transition-opacity">سياسة الخصوصية</a>
              <a href="#" className="hover:opacity-100 transition-opacity">شروط الاستخدام</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
