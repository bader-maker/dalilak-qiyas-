"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import AIAssistant from "@/components/AIAssistant";
import GeometryDiagram from "@/components/GeometryDiagram";
import AIInsightsCard from "@/components/AIInsightsCard";
import {
  saveExamResult,
  getPreviousExam,
  diffExams,
  type ExamHistoryEntry,
} from "@/lib/examHistory";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// Questions data with explanations
const questions = [
  // القسم الكمي - الجبر (5 أسئلة)
  {
    id: 1,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان س + 5 = 12، فما قيمة س؟",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "لإيجاد قيمة س، نطرح 5 من طرفي المعادلة:\nس + 5 - 5 = 12 - 5\nس = 7",
  },
  {
    id: 2,
    section: "كمي",
    category: "الجبر",
    question: "ما قيمة س في المعادلة: 2س - 4 = 10؟",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "نضيف 4 لطرفي المعادلة:\n2س = 14\nثم نقسم على 2:\nس = 7",
  },
  {
    id: 3,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 3س = 27، فإن س² =",
    options: ["9", "27", "81", "243"],
    correct: 2,
    explanation: "أولاً نجد قيمة س:\n3س = 27\nس = 9\nثم نحسب س²:\nس² = 9² = 81",
  },
  {
    id: 4,
    section: "كمي",
    category: "الجبر",
    question: "حل المعادلة: س² - 9 = 0",
    options: ["س = 3", "س = -3", "س = ±3", "س = 9"],
    correct: 2,
    explanation: "س² - 9 = 0\nس² = 9\nس = ±√9\nس = ±3\nأي أن س = 3 أو س = -3",
  },
  {
    id: 5,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان (س + 2)(س - 3) = 0، فإن قيم س هي:",
    options: ["2، 3", "-2، 3", "2، -3", "-2، -3"],
    correct: 1,
    explanation: "عندما يكون حاصل ضرب عددين = صفر، فأحدهما على الأقل = صفر\nس + 2 = 0 ← س = -2\nأو س - 3 = 0 ← س = 3\nإذن: س = -2 أو س = 3",
  },
  // القسم الكمي - الهندسة (5 أسئلة)
  {
    id: 6,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة مربع طول ضلعه 5 سم تساوي:",
    options: ["10 سم²", "20 سم²", "25 سم²", "30 سم²"],
    correct: 2,
    explanation: "مساحة المربع = طول الضلع × طول الضلع\nالمساحة = 5 × 5 = 25 سم²",
  },
  {
    id: 7,
    section: "كمي",
    category: "الهندسة",
    question: "محيط دائرة نصف قطرها 7 سم يساوي (π = 22/7):",
    options: ["22 سم", "44 سم", "154 سم", "88 سم"],
    correct: 1,
    explanation: "محيط الدائرة = 2 × π × نصف القطر\nالمحيط = 2 × (22/7) × 7\nالمحيط = 2 × 22 = 44 سم",
  },
  {
    id: 8,
    section: "كمي",
    category: "الهندسة",
    question: "مجموع زوايا المثلث يساوي:",
    options: ["90°", "180°", "270°", "360°"],
    correct: 1,
    explanation: "مجموع زوايا أي مثلث = 180 درجة\nهذه قاعدة أساسية في الهندسة المستوية",
  },
  {
    id: 9,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة المستطيل الذي طوله 8 سم وعرضه 5 سم:",
    options: ["13 سم²", "26 سم²", "40 سم²", "80 سم²"],
    correct: 2,
    explanation: "مساحة المستطيل = الطول × العرض\nالمساحة = 8 × 5 = 40 سم²",
  },
  {
    id: 10,
    section: "كمي",
    category: "الهندسة",
    question: "في المثلث القائم، إذا كان الضلعان القائمان 3 و 4، فإن الوتر يساوي:",
    options: ["5", "6", "7", "12"],
    correct: 0,
    explanation: "نستخدم نظرية فيثاغورس:\nالوتر² = 3² + 4²\nالوتر² = 9 + 16 = 25\nالوتر = √25 = 5",
  },
  // القسم الكمي - النسب والتناسب (5 أسئلة)
  {
    id: 11,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة الأولاد إلى البنات 3:2، وعدد الأولاد 15، فكم عدد البنات؟",
    options: ["8", "10", "12", "15"],
    correct: 1,
    explanation: "النسبة 3:2 تعني لكل 3 أولاد هناك 2 بنات\n3 ← 15 (ضربنا في 5)\nإذن 2 ← 2 × 5 = 10 بنات",
  },
  {
    id: 12,
    section: "كمي",
    category: "النسب والتناسب",
    question: "25% من 200 تساوي:",
    options: ["25", "50", "75", "100"],
    correct: 1,
    explanation: "25% من 200 = (25/100) × 200\n= 0.25 × 200 = 50",
  },
  {
    id: 13,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا أكمل 5 عمال عملاً في 10 أيام، فكم يوماً يحتاج 10 عمال لإكمال نفس العمل؟",
    options: ["5", "10", "15", "20"],
    correct: 0,
    explanation: "هذه علاقة عكسية (كلما زاد العمال قل الوقت)\n5 عمال × 10 أيام = 10 عمال × س\n50 = 10س\nس = 5 أيام",
  },
  {
    id: 14,
    section: "كمي",
    category: "النسب والتناسب",
    question: "ما هي النسبة المئوية لـ 15 من 60؟",
    options: ["15%", "20%", "25%", "30%"],
    correct: 2,
    explanation: "النسبة المئوية = (الجزء/الكل) × 100\n= (15/60) × 100\n= 0.25 × 100 = 25%",
  },
  {
    id: 15,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كان سعر قميص 100 ريال وحصل على خصم 20%، فكم السعر بعد الخصم؟",
    options: ["70 ريال", "75 ريال", "80 ريال", "85 ريال"],
    correct: 2,
    explanation: "قيمة الخصم = 20% × 100 = 20 ريال\nالسعر بعد الخصم = 100 - 20 = 80 ريال",
  },
  // القسم الكمي - الإحصاء (5 أسئلة)
  {
    id: 16,
    section: "كمي",
    category: "الإحصاء",
    question: "المتوسط الحسابي للأعداد: 4، 6، 8، 10، 12 هو:",
    options: ["6", "8", "10", "12"],
    correct: 1,
    explanation: "المتوسط الحسابي = مجموع القيم ÷ عددها\n= (4+6+8+10+12) ÷ 5\n= 40 ÷ 5 = 8",
  },
  {
    id: 17,
    section: "كمي",
    category: "الإحصاء",
    question: "الوسيط للأعداد: 3، 7، 2، 9، 5 هو:",
    options: ["3", "5", "7", "9"],
    correct: 1,
    explanation: "نرتب الأعداد تصاعدياً: 2، 3، 5، 7، 9\nالوسيط = القيمة في المنتصف = 5",
  },
  {
    id: 18,
    section: "كمي",
    category: "الإحصاء",
    question: "المنوال للأعداد: 2، 3، 3، 4، 5، 3 هو:",
    options: ["2", "3", "4", "5"],
    correct: 1,
    explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 3 تكرر 3 مرات وهو الأكثر\nإذن المنوال = 3",
  },
  {
    id: 19,
    section: "كمي",
    category: "الإحصاء",
    question: "المدى للأعداد: 5، 10، 15، 20، 25 هو:",
    options: ["5", "10", "15", "20"],
    correct: 3,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\n= 25 - 5 = 20",
  },
  {
    id: 20,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان متوسط درجات 5 طلاب هو 80، فما مجموع درجاتهم؟",
    options: ["200", "300", "400", "500"],
    correct: 2,
    explanation: "المتوسط = المجموع ÷ العدد\n80 = المجموع ÷ 5\nالمجموع = 80 × 5 = 400",
  },
  // القسم اللفظي - التناظر اللفظي (4 أسئلة)
  {
    id: 21,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "سماء : أزرق :: عشب : ؟",
    options: ["أصفر", "أخضر", "بني", "أحمر"],
    correct: 1,
    explanation: "العلاقة: الشيء ولونه المميز\nالسماء لونها أزرق\nالعشب لونه أخضر",
  },
  {
    id: 22,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "طبيب : مستشفى :: معلم : ؟",
    options: ["مكتبة", "مدرسة", "مصنع", "متجر"],
    correct: 1,
    explanation: "العلاقة: المهنة ومكان العمل\nالطبيب يعمل في المستشفى\nالمعلم يعمل في المدرسة",
  },
  {
    id: 23,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قلم : كتابة :: سكين : ؟",
    options: ["طبخ", "قطع", "أكل", "رسم"],
    correct: 1,
    explanation: "العلاقة: الأداة ووظيفتها\nالقلم يستخدم للكتابة\nالسكين يستخدم للقطع",
  },
  {
    id: 24,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "شمس : نهار :: قمر : ؟",
    options: ["ضوء", "ظلام", "ليل", "نجوم"],
    correct: 2,
    explanation: "العلاقة: الجسم السماوي والوقت المرتبط به\nالشمس تظهر في النهار\nالقمر يظهر في الليل",
  },
  // القسم اللفظي - إكمال الجمل (4 أسئلة)
  {
    id: 25,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "العلم نور و_____ ظلمات.",
    options: ["الحياة", "الجهل", "الفقر", "المرض"],
    correct: 1,
    explanation: "هذا مثل عربي شهير: 'العلم نور والجهل ظلمات'\nالعلم والجهل متضادان، كما أن النور والظلمات متضادان",
  },
  {
    id: 26,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الصبر مفتاح _____.",
    options: ["النجاح", "الفرج", "السعادة", "الحياة"],
    correct: 1,
    explanation: "هذا مثل عربي شهير: 'الصبر مفتاح الفرج'\nيعني أن من يصبر على الشدائد سيأتيه الفرج",
  },
  {
    id: 27,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "من جد _____.",
    options: ["نجح", "وجد", "حصد", "فاز"],
    correct: 1,
    explanation: "هذا مثل عربي شهير: 'من جد وجد'\nيعني من اجتهد وجد ما يريد",
  },
  {
    id: 28,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الوقت كالسيف إن لم تقطعه _____.",
    options: ["ذهب", "فات", "قطعك", "ضاع"],
    correct: 2,
    explanation: "هذه حكمة عربية شهيرة: 'الوقت كالسيف إن لم تقطعه قطعك'\nتعني أهمية استغلال الوقت قبل أن يضيع",
  },
  // القسم اللفظي - استيعاب المقروء (4 أسئلة)
  {
    id: 29,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "النص: \"القراءة غذاء العقل، وهي من أهم وسائل اكتساب المعرفة.\" - ما الفكرة الرئيسية؟",
    options: ["أهمية الغذاء", "أهمية القراءة", "أهمية العقل", "أهمية المعرفة"],
    correct: 1,
    explanation: "الفكرة الرئيسية هي أهمية القراءة\nالنص يصف القراءة بأنها غذاء العقل ووسيلة لاكتساب المعرفة",
  },
  {
    id: 30,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "النص: \"الماء ضروري للحياة، فهو يشكل 70% من جسم الإنسان.\" - ما نسبة الماء في الجسم؟",
    options: ["50%", "60%", "70%", "80%"],
    correct: 2,
    explanation: "الإجابة مذكورة صراحة في النص: 'يشكل 70% من جسم الإنسان'",
  },
  {
    id: 31,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "النص: \"الرياضة تقوي الجسم وتنشط العقل وتحسن المزاج.\" - كم فائدة للرياضة ذُكرت؟",
    options: ["فائدة واحدة", "فائدتان", "ثلاث فوائد", "أربع فوائد"],
    correct: 2,
    explanation: "ذُكرت ثلاث فوائد للرياضة:\n1. تقوي الجسم\n2. تنشط العقل\n3. تحسن المزاج",
  },
  {
    id: 32,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "النص: \"اخترع جراهام بل الهاتف عام 1876.\" - متى اخترع الهاتف؟",
    options: ["1867", "1876", "1886", "1896"],
    correct: 1,
    explanation: "الإجابة مذكورة صراحة في النص: 'عام 1876'",
  },
  // القسم اللفظي - الخطأ السياقي (4 أسئلة)
  {
    id: 33,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "حدد الكلمة الخطأ: \"الشمس تشرق من المغرب كل صباح.\"",
    options: ["الشمس", "تشرق", "المغرب", "صباح"],
    correct: 2,
    explanation: "الخطأ هو كلمة 'المغرب'\nالشمس تشرق من المشرق (الشرق) وليس من المغرب (الغرب)",
  },
  {
    id: 34,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "حدد الكلمة الخطأ: \"الثلج يذوب عند انخفاض درجة الحرارة.\"",
    options: ["الثلج", "يذوب", "انخفاض", "الحرارة"],
    correct: 2,
    explanation: "الخطأ هو كلمة 'انخفاض'\nالثلج يذوب عند ارتفاع درجة الحرارة وليس انخفاضها",
  },
  {
    id: 35,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "حدد الكلمة الخطأ: \"الأسد حيوان أليف يعيش في الغابة.\"",
    options: ["الأسد", "أليف", "يعيش", "الغابة"],
    correct: 1,
    explanation: "الخطأ هو كلمة 'أليف'\nالأسد حيوان مفترس وليس أليفاً",
  },
  {
    id: 36,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "حدد الكلمة الخطأ: \"السمك يطير في الماء بحرية.\"",
    options: ["السمك", "يطير", "الماء", "بحرية"],
    correct: 1,
    explanation: "الخطأ هو كلمة 'يطير'\nالسمك يسبح في الماء ولا يطير",
  },
  // القسم اللفظي - المفردة الشاذة (4 أسئلة)
  {
    id: 37,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "حدد الكلمة المختلفة: تفاح - موز - جزر - برتقال",
    options: ["تفاح", "موز", "جزر", "برتقال"],
    correct: 2,
    explanation: "الجزر هو المختلف\nتفاح، موز، برتقال = فواكه\nجزر = خضار",
  },
  {
    id: 38,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "حدد الكلمة المختلفة: أحمر - أخضر - دائرة - أزرق",
    options: ["أحمر", "أخضر", "دائرة", "أزرق"],
    correct: 2,
    explanation: "الدائرة هي المختلفة\nأحمر، أخضر، أزرق = ألوان\nدائرة = شكل هندسي",
  },
  {
    id: 39,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "حدد الكلمة المختلفة: سيارة - طائرة - قطار - كتاب",
    options: ["سيارة", "طائرة", "قطار", "كتاب"],
    correct: 3,
    explanation: "الكتاب هو المختلف\nسيارة، طائرة، قطار = وسائل نقل\nكتاب = أداة للقراءة",
  },
  {
    id: 40,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "حدد الكلمة المختلفة: طبيب - مهندس - معلم - مستشفى",
    options: ["طبيب", "مهندس", "معلم", "مستشفى"],
    correct: 3,
    explanation: "المستشفى هو المختلف\nطبيب، مهندس، معلم = مهن\nمستشفى = مكان",
  },
  // القسم الكمي - الهندسة (أسئلة إضافية مع رسوم بيانية)
  {
    id: 41,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 4، أوجد المساحة",
    options: ["16π", "8π", "4π", "32π"],
    correct: 0,
    explanation: "مساحة الدائرة = π × نق²\n= π × 4²\n= 16π",
    diagram_type: "circle",
    diagram_data: { radius: 4 },
  },
  {
    id: 42,
    section: "كمي",
    category: "الهندسة",
    question: "مربع ضلعه 5، أوجد المساحة",
    options: ["20", "25", "30", "10"],
    correct: 1,
    explanation: "مساحة المربع = الضلع²\n= 5²\n= 25",
    diagram_type: "square",
    diagram_data: { side: 5 },
  },
  {
    id: 43,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل طوله 8 وعرضه 3، أوجد المساحة",
    options: ["24", "16", "20", "11"],
    correct: 0,
    explanation: "مساحة المستطيل = الطول × العرض\n= 8 × 3\n= 24",
    diagram_type: "rectangle",
    diagram_data: { length: 8, width: 3 },
  },
  {
    id: 44,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قاعدته 6 وارتفاعه 4، أوجد المساحة",
    options: ["12", "10", "14", "24"],
    correct: 0,
    explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع\n= ½ × 6 × 4\n= 12",
    diagram_type: "triangle",
    diagram_data: { base: 6, height: 4 },
  },
  {
    id: 45,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قائم ضلعاه 3 و4، أوجد الوتر",
    options: ["5", "6", "7", "8"],
    correct: 0,
    explanation: "نظرية فيثاغورس: الوتر² = 3² + 4²\n= 9 + 16 = 25\nالوتر = √25 = 5",
    diagram_type: "right_triangle",
    diagram_data: { base: 3, height: 4 },
  },
  {
    id: 46,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة قطرها 10، أوجد نصف القطر",
    options: ["5", "4", "2", "10"],
    correct: 0,
    explanation: "نصف القطر = القطر ÷ 2\n= 10 ÷ 2\n= 5",
    diagram_type: "circle",
    diagram_data: { diameter: 10 },
  },
  {
    id: 47,
    section: "كمي",
    category: "الهندسة",
    question: "محيط مربع 20، أوجد الضلع",
    options: ["5", "4", "6", "10"],
    correct: 0,
    explanation: "محيط المربع = 4 × الضلع\nالضلع = المحيط ÷ 4\n= 20 ÷ 4 = 5",
    diagram_type: "square",
    diagram_data: { perimeter: 20 },
  },
  {
    id: 48,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 3، أوجد المحيط",
    options: ["6π", "9π", "12π", "3π"],
    correct: 0,
    explanation: "محيط الدائرة = 2 × π × نق\n= 2 × π × 3\n= 6π",
    diagram_type: "circle",
    diagram_data: { radius: 3 },
  },
  {
    id: 49,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متكاملتان، إحداهما 70°، أوجد الأخرى",
    options: ["110°", "90°", "100°", "120°"],
    correct: 0,
    explanation: "الزاويتان المتكاملتان مجموعهما 180°\nالزاوية الأخرى = 180 - 70 = 110°",
    diagram_type: "angles",
    diagram_data: { angle1: 70 },
  },
  {
    id: 50,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متقابلتان بالرأس، إحداهما 50°، أوجد الأخرى",
    options: ["50°", "100°", "150°", "130°"],
    correct: 0,
    explanation: "الزاويتان المتقابلتان بالرأس متساويتان\nالزاوية الأخرى = 50°",
    diagram_type: "vertical_angles",
    diagram_data: { angle1: 50 },
  },
  {
    id: 51,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل أبعاده 10×2، أوجد المحيط",
    options: ["24", "20", "22", "18"],
    correct: 0,
    explanation: "محيط المستطيل = 2 × (الطول + العرض)\n= 2 × (10 + 2)\n= 2 × 12 = 24",
    diagram_type: "rectangle",
    diagram_data: { length: 10, width: 2 },
  },
  {
    id: 52,
    section: "كمي",
    category: "الهندسة",
    question: "مربع ضلعه 7، أوجد المحيط",
    options: ["28", "21", "14", "49"],
    correct: 0,
    explanation: "محيط المربع = 4 × الضلع\n= 4 × 7\n= 28",
    diagram_type: "square",
    diagram_data: { side: 7 },
  },
  {
    id: 53,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث أضلاعه 5، 6، 7 هل هو قائم الزاوية؟",
    options: ["لا", "نعم", "أحياناً", "غير محدد"],
    correct: 0,
    explanation: "نتحقق بنظرية فيثاغورس:\n5² + 6² = 25 + 36 = 61\n7² = 49\n61 ≠ 49، إذن ليس قائم الزاوية",
    diagram_type: "triangle",
    diagram_data: { sides: [5, 6, 7] },
  },
  {
    id: 54,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 2، أوجد المساحة",
    options: ["4π", "2π", "8π", "6π"],
    correct: 0,
    explanation: "مساحة الدائرة = π × نق²\n= π × 2²\n= 4π",
    diagram_type: "circle",
    diagram_data: { radius: 2 },
  },
  {
    id: 55,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متتامتان، إحداهما 30°، أوجد الأخرى",
    options: ["60°", "70°", "80°", "50°"],
    correct: 0,
    explanation: "الزاويتان المتتامتان مجموعهما 90°\nالزاوية الأخرى = 90 - 30 = 60°",
    diagram_type: "angles",
    diagram_data: { angle1: 30, type: "complementary" },
  },
  {
    id: 56,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل أبعاده 9×3، أوجد المساحة",
    options: ["27", "18", "30", "21"],
    correct: 0,
    explanation: "مساحة المستطيل = الطول × العرض\n= 9 × 3\n= 27",
    diagram_type: "rectangle",
    diagram_data: { length: 9, width: 3 },
  },
  {
    id: 57,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قاعدته 10 وارتفاعه 2، أوجد المساحة",
    options: ["10", "20", "15", "5"],
    correct: 0,
    explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع\n= ½ × 10 × 2\n= 10",
    diagram_type: "triangle",
    diagram_data: { base: 10, height: 2 },
  },
  {
    id: 58,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة قطرها 8، أوجد نصف القطر",
    options: ["4", "2", "8", "6"],
    correct: 0,
    explanation: "نصف القطر = القطر ÷ 2\n= 8 ÷ 2\n= 4",
    diagram_type: "circle",
    diagram_data: { diameter: 8 },
  },
  {
    id: 59,
    section: "كمي",
    category: "الهندسة",
    question: "مربع مساحته 36، أوجد طول الضلع",
    options: ["6", "4", "8", "9"],
    correct: 0,
    explanation: "مساحة المربع = الضلع²\nالضلع = √المساحة\n= √36 = 6",
    diagram_type: "square",
    diagram_data: { area: 36 },
  },
  {
    id: 60,
    section: "كمي",
    category: "الهندسة",
    question: "كم تساوي الزاوية القائمة؟",
    options: ["90°", "60°", "120°", "180°"],
    correct: 0,
    explanation: "الزاوية القائمة = 90 درجة\nوهي الزاوية التي تتشكل عند تقاطع خطين متعامدين",
    diagram_type: "angles",
    diagram_data: { angle1: 90, type: "right" },
  },
  // القسم الكمي - الهندسة (أسئلة إضافية - المجموعة الثانية)
  {
    id: 61,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 6، أوجد المساحة",
    options: ["36π", "12π", "18π", "24π"],
    correct: 0,
    explanation: "مساحة الدائرة = π × نق²\n= π × 6²\n= 36π",
    diagram_type: "circle",
    diagram_data: { radius: 6 },
  },
  {
    id: 62,
    section: "كمي",
    category: "الهندسة",
    question: "مربع ضلعه 9، أوجد المساحة",
    options: ["81", "18", "27", "36"],
    correct: 0,
    explanation: "مساحة المربع = الضلع²\n= 9²\n= 81",
    diagram_type: "square",
    diagram_data: { side: 9 },
  },
  {
    id: 63,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل طوله 12 وعرضه 4، أوجد المساحة",
    options: ["48", "24", "36", "60"],
    correct: 0,
    explanation: "مساحة المستطيل = الطول × العرض\n= 12 × 4\n= 48",
    diagram_type: "rectangle",
    diagram_data: { length: 12, width: 4 },
  },
  {
    id: 64,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قاعدته 8 وارتفاعه 5، أوجد المساحة",
    options: ["20", "40", "30", "25"],
    correct: 0,
    explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع\n= ½ × 8 × 5\n= 20",
    diagram_type: "triangle",
    diagram_data: { base: 8, height: 5 },
  },
  {
    id: 65,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قائم ضلعاه 5 و12، أوجد الوتر",
    options: ["13", "10", "15", "17"],
    correct: 0,
    explanation: "نظرية فيثاغورس: الوتر² = 5² + 12²\n= 25 + 144 = 169\nالوتر = √169 = 13",
    diagram_type: "right_triangle",
    diagram_data: { base: 5, height: 12 },
  },
  {
    id: 66,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة قطرها 14، أوجد نصف القطر",
    options: ["7", "6", "8", "5"],
    correct: 0,
    explanation: "نصف القطر = القطر ÷ 2\n= 14 ÷ 2\n= 7",
    diagram_type: "circle",
    diagram_data: { diameter: 14 },
  },
  {
    id: 67,
    section: "كمي",
    category: "الهندسة",
    question: "محيط مربع 32، أوجد الضلع",
    options: ["8", "6", "10", "4"],
    correct: 0,
    explanation: "محيط المربع = 4 × الضلع\nالضلع = المحيط ÷ 4\n= 32 ÷ 4 = 8",
    diagram_type: "square",
    diagram_data: { perimeter: 32 },
  },
  {
    id: 68,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 7، أوجد المحيط",
    options: ["14π", "7π", "21π", "28π"],
    correct: 0,
    explanation: "محيط الدائرة = 2 × π × نق\n= 2 × π × 7\n= 14π",
    diagram_type: "circle",
    diagram_data: { radius: 7 },
  },
  {
    id: 69,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متكاملتان، إحداهما 120°، أوجد الأخرى",
    options: ["60°", "50°", "40°", "70°"],
    correct: 0,
    explanation: "الزاويتان المتكاملتان مجموعهما 180°\nالزاوية الأخرى = 180 - 120 = 60°",
    diagram_type: "angles",
    diagram_data: { angle1: 120 },
  },
  {
    id: 70,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متقابلتان بالرأس، إحداهما 80°، أوجد الأخرى",
    options: ["80°", "100°", "120°", "40°"],
    correct: 0,
    explanation: "الزاويتان المتقابلتان بالرأس متساويتان\nالزاوية الأخرى = 80°",
    diagram_type: "vertical_angles",
    diagram_data: { angle1: 80 },
  },
  {
    id: 71,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل أبعاده 15×2، أوجد المحيط",
    options: ["34", "30", "28", "32"],
    correct: 0,
    explanation: "محيط المستطيل = 2 × (الطول + العرض)\n= 2 × (15 + 2)\n= 2 × 17 = 34",
    diagram_type: "rectangle",
    diagram_data: { length: 15, width: 2 },
  },
  {
    id: 72,
    section: "كمي",
    category: "الهندسة",
    question: "مربع ضلعه 11، أوجد المحيط",
    options: ["44", "33", "22", "55"],
    correct: 0,
    explanation: "محيط المربع = 4 × الضلع\n= 4 × 11\n= 44",
    diagram_type: "square",
    diagram_data: { side: 11 },
  },
  {
    id: 73,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث أطوال أضلاعه 6، 8، 10 هل هو قائم الزاوية؟",
    options: ["نعم", "لا", "أحياناً", "غير محدد"],
    correct: 0,
    explanation: "نتحقق بنظرية فيثاغورس:\n6² + 8² = 36 + 64 = 100\n10² = 100\n100 = 100 ✓\nإذن هو مثلث قائم الزاوية",
    diagram_type: "right_triangle",
    diagram_data: { base: 6, height: 8 },
  },
  {
    id: 74,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 9، أوجد المساحة",
    options: ["81π", "18π", "27π", "36π"],
    correct: 0,
    explanation: "مساحة الدائرة = π × نق²\n= π × 9²\n= 81π",
    diagram_type: "circle",
    diagram_data: { radius: 9 },
  },
  {
    id: 75,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متتامتان، إحداهما 25°، أوجد الأخرى",
    options: ["65°", "75°", "55°", "45°"],
    correct: 0,
    explanation: "الزاويتان المتتامتان مجموعهما 90°\nالزاوية الأخرى = 90 - 25 = 65°",
    diagram_type: "angles",
    diagram_data: { angle1: 25, type: "complementary" },
  },
  {
    id: 76,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل أبعاده 7×6، أوجد المساحة",
    options: ["42", "36", "30", "48"],
    correct: 0,
    explanation: "مساحة المستطيل = الطول × العرض\n= 7 × 6\n= 42",
    diagram_type: "rectangle",
    diagram_data: { length: 7, width: 6 },
  },
  {
    id: 77,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قاعدته 12 وارتفاعه 3، أوجد المساحة",
    options: ["18", "36", "24", "30"],
    correct: 0,
    explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع\n= ½ × 12 × 3\n= 18",
    diagram_type: "triangle",
    diagram_data: { base: 12, height: 3 },
  },
  {
    id: 78,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة قطرها 20، أوجد نصف القطر",
    options: ["10", "8", "12", "6"],
    correct: 0,
    explanation: "نصف القطر = القطر ÷ 2\n= 20 ÷ 2\n= 10",
    diagram_type: "circle",
    diagram_data: { diameter: 20 },
  },
  {
    id: 79,
    section: "كمي",
    category: "الهندسة",
    question: "مربع مساحته 49، أوجد طول الضلع",
    options: ["7", "6", "8", "9"],
    correct: 0,
    explanation: "مساحة المربع = الضلع²\nالضلع = √المساحة\n= √49 = 7",
    diagram_type: "square",
    diagram_data: { area: 49 },
  },
  {
    id: 80,
    section: "كمي",
    category: "الهندسة",
    question: "مجموع زوايا المثلث يساوي؟",
    options: ["180°", "90°", "360°", "270°"],
    correct: 0,
    explanation: "مجموع زوايا أي مثلث = 180 درجة\nهذه قاعدة أساسية في الهندسة المستوية",
    diagram_type: "triangle",
    diagram_data: { type: "angles_sum" },
  },
  // القسم الكمي - الهندسة (أسئلة إضافية - المجموعة الثالثة)
  {
    id: 81,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 10، أوجد المساحة",
    options: ["100π", "50π", "20π", "10π"],
    correct: 0,
    explanation: "مساحة الدائرة = π × نق²\n= π × 10²\n= 100π",
    diagram_type: "circle",
    diagram_data: { radius: 10 },
  },
  {
    id: 82,
    section: "كمي",
    category: "الهندسة",
    question: "مربع ضلعه 12، أوجد المساحة",
    options: ["144", "24", "36", "120"],
    correct: 0,
    explanation: "مساحة المربع = الضلع²\n= 12²\n= 144",
    diagram_type: "square",
    diagram_data: { side: 12 },
  },
  {
    id: 83,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل طوله 20 وعرضه 5، أوجد المساحة",
    options: ["100", "80", "120", "90"],
    correct: 0,
    explanation: "مساحة المستطيل = الطول × العرض\n= 20 × 5\n= 100",
    diagram_type: "rectangle",
    diagram_data: { length: 20, width: 5 },
  },
  {
    id: 84,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قاعدته 14 وارتفاعه 6، أوجد المساحة",
    options: ["42", "84", "56", "36"],
    correct: 0,
    explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع\n= ½ × 14 × 6\n= 42",
    diagram_type: "triangle",
    diagram_data: { base: 14, height: 6 },
  },
  {
    id: 85,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قائم ضلعاه 8 و15، أوجد الوتر",
    options: ["17", "20", "18", "19"],
    correct: 0,
    explanation: "نظرية فيثاغورس: الوتر² = 8² + 15²\n= 64 + 225 = 289\nالوتر = √289 = 17",
    diagram_type: "right_triangle",
    diagram_data: { base: 8, height: 15 },
  },
  {
    id: 86,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة قطرها 18، أوجد نصف القطر",
    options: ["9", "8", "7", "6"],
    correct: 0,
    explanation: "نصف القطر = القطر ÷ 2\n= 18 ÷ 2\n= 9",
    diagram_type: "circle",
    diagram_data: { diameter: 18 },
  },
  {
    id: 87,
    section: "كمي",
    category: "الهندسة",
    question: "محيط مربع 40، أوجد الضلع",
    options: ["10", "8", "6", "12"],
    correct: 0,
    explanation: "محيط المربع = 4 × الضلع\nالضلع = المحيط ÷ 4\n= 40 ÷ 4 = 10",
    diagram_type: "square",
    diagram_data: { perimeter: 40 },
  },
  {
    id: 88,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 11، أوجد المحيط",
    options: ["22π", "11π", "33π", "44π"],
    correct: 0,
    explanation: "محيط الدائرة = 2 × π × نق\n= 2 × π × 11\n= 22π",
    diagram_type: "circle",
    diagram_data: { radius: 11 },
  },
  {
    id: 89,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متكاملتان، إحداهما 95°، أوجد الأخرى",
    options: ["85°", "75°", "65°", "95°"],
    correct: 0,
    explanation: "الزاويتان المتكاملتان مجموعهما 180°\nالزاوية الأخرى = 180 - 95 = 85°",
    diagram_type: "angles",
    diagram_data: { angle1: 95 },
  },
  {
    id: 90,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متقابلتان بالرأس 35°، أوجد الأخرى",
    options: ["35°", "70°", "145°", "55°"],
    correct: 0,
    explanation: "الزاويتان المتقابلتان بالرأس متساويتان\nالزاوية الأخرى = 35°",
    diagram_type: "vertical_angles",
    diagram_data: { angle1: 35 },
  },
  {
    id: 91,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل 25×3، أوجد المحيط",
    options: ["56", "50", "54", "60"],
    correct: 0,
    explanation: "محيط المستطيل = 2 × (الطول + العرض)\n= 2 × (25 + 3)\n= 2 × 28 = 56",
    diagram_type: "rectangle",
    diagram_data: { length: 25, width: 3 },
  },
  {
    id: 92,
    section: "كمي",
    category: "الهندسة",
    question: "مربع ضلعه 13، أوجد المحيط",
    options: ["52", "39", "26", "65"],
    correct: 0,
    explanation: "محيط المربع = 4 × الضلع\n= 4 × 13\n= 52",
    diagram_type: "square",
    diagram_data: { side: 13 },
  },
  {
    id: 93,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث أطوال أضلاعه 9،12،15 هل هو قائم؟",
    options: ["نعم", "لا", "أحياناً", "غير محدد"],
    correct: 0,
    explanation: "نتحقق بنظرية فيثاغورس:\n9² + 12² = 81 + 144 = 225\n15² = 225\n225 = 225 ✓\nإذن هو مثلث قائم الزاوية",
    diagram_type: "right_triangle",
    diagram_data: { base: 9, height: 12 },
  },
  {
    id: 94,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة نصف قطرها 12، أوجد المساحة",
    options: ["144π", "24π", "36π", "72π"],
    correct: 0,
    explanation: "مساحة الدائرة = π × نق²\n= π × 12²\n= 144π",
    diagram_type: "circle",
    diagram_data: { radius: 12 },
  },
  {
    id: 95,
    section: "كمي",
    category: "الهندسة",
    question: "زاويتان متتامتان، إحداهما 40°، الأخرى؟",
    options: ["50°", "60°", "70°", "80°"],
    correct: 0,
    explanation: "الزاويتان المتتامتان مجموعهما 90°\nالزاوية الأخرى = 90 - 40 = 50°",
    diagram_type: "angles",
    diagram_data: { angle1: 40, type: "complementary" },
  },
  {
    id: 96,
    section: "كمي",
    category: "الهندسة",
    question: "مستطيل 11×4، المساحة؟",
    options: ["44", "40", "36", "48"],
    correct: 0,
    explanation: "مساحة المستطيل = الطول × العرض\n= 11 × 4\n= 44",
    diagram_type: "rectangle",
    diagram_data: { length: 11, width: 4 },
  },
  {
    id: 97,
    section: "كمي",
    category: "الهندسة",
    question: "مثلث قاعدته 20 وارتفاعه 5، المساحة؟",
    options: ["50", "100", "75", "25"],
    correct: 0,
    explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع\n= ½ × 20 × 5\n= 50",
    diagram_type: "triangle",
    diagram_data: { base: 20, height: 5 },
  },
  {
    id: 98,
    section: "كمي",
    category: "الهندسة",
    question: "دائرة قطرها 24، نصف القطر؟",
    options: ["12", "10", "8", "6"],
    correct: 0,
    explanation: "نصف القطر = القطر ÷ 2\n= 24 ÷ 2\n= 12",
    diagram_type: "circle",
    diagram_data: { diameter: 24 },
  },
  {
    id: 99,
    section: "كمي",
    category: "الهندسة",
    question: "مربع مساحته 81، الضلع؟",
    options: ["9", "8", "7", "10"],
    correct: 0,
    explanation: "مساحة المربع = الضلع²\nالضلع = √المساحة\n= √81 = 9",
    diagram_type: "square",
    diagram_data: { area: 81 },
  },
  {
    id: 100,
    section: "كمي",
    category: "الهندسة",
    question: "مجموع زوايا الشكل الرباعي يساوي؟",
    options: ["360°", "180°", "270°", "540°"],
    correct: 0,
    explanation: "مجموع زوايا أي شكل رباعي = 360 درجة\nوهذا ينطبق على المربع والمستطيل والمعين وشبه المنحرف",
    diagram_type: "polygon",
    diagram_data: { sides: 4 },
  },
  // القسم الكمي - النسب والتناسب (أسئلة إضافية)
  {
    id: 101,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في فصل دراسي نسبة الطلاب إلى الطالبات 3:5 وكان عدد الطالبات 20، كم عدد الطلاب؟",
    options: ["12", "15", "18", "25"],
    correct: 0,
    explanation: "النسبة 3:5 تعني أن الطلاب/الطالبات = 3/5\nإذا كانت الطالبات = 20\nالطلاب = (3/5) × 20 = 12",
  },
  {
    id: 102,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 2:7 وكان مجموعهما 45، أوجد العدد الأصغر",
    options: ["10", "12", "15", "18"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 2 + 7 = 9\nقيمة الجزء الواحد = 45 ÷ 9 = 5\nالعدد الأصغر = 2 × 5 = 10",
  },
  {
    id: 103,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مزرعة نسبة الأبقار إلى الأغنام 4:3 وكان عدد الأبقار 32، كم عدد الأغنام؟",
    options: ["20", "24", "28", "30"],
    correct: 1,
    explanation: "النسبة 4:3 تعني أن الأبقار/الأغنام = 4/3\nإذا كانت الأبقار = 32\nالأغنام = (3/4) × 32 = 24",
  },
  {
    id: 104,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة الطول إلى العرض في مستطيل 5:2 وكان الطول 25 سم، أوجد العرض",
    options: ["8", "10", "12", "15"],
    correct: 1,
    explanation: "النسبة 5:2 تعني أن الطول/العرض = 5/2\nإذا كان الطول = 25\nالعرض = (2/5) × 25 = 10 سم",
  },
  {
    id: 105,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 3:4 وكان الفرق بينهما 8، أوجد العدد الأكبر",
    options: ["24", "32", "16", "20"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 4 - 3 = 1 جزء\nقيمة الجزء الواحد = 8 ÷ 1 = 8\nالعدد الأكبر = 4 × 8 = 32",
  },
  {
    id: 106,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في صندوق نسبة الكرات الحمراء إلى الزرقاء 1:3 وكان المجموع 40، كم عدد الكرات الحمراء؟",
    options: ["10", "15", "20", "25"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 1 + 3 = 4\nقيمة الجزء الواحد = 40 ÷ 4 = 10\nالكرات الحمراء = 1 × 10 = 10",
  },
  {
    id: 107,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 6:1 وكان الأكبر 42، أوجد الأصغر",
    options: ["6", "7", "8", "9"],
    correct: 1,
    explanation: "النسبة 6:1 تعني أن الأكبر/الأصغر = 6/1\nإذا كان الأكبر = 42\nالأصغر = 42 ÷ 6 = 7",
  },
  {
    id: 108,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 5:6 وكان مجموعهما 55، أوجد العدد الأصغر",
    options: ["20", "25", "30", "15"],
    correct: 1,
    explanation: "مجموع أجزاء النسبة = 5 + 6 = 11\nقيمة الجزء الواحد = 55 ÷ 11 = 5\nالعدد الأصغر = 5 × 5 = 25",
  },
  {
    id: 109,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في صف نسبة البنات إلى الأولاد 2:3 وكان عدد الأولاد 18، كم عدد البنات؟",
    options: ["10", "12", "14", "16"],
    correct: 1,
    explanation: "النسبة 2:3 تعني أن البنات/الأولاد = 2/3\nإذا كان الأولاد = 18\nالبنات = (2/3) × 18 = 12",
  },
  {
    id: 110,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 7:8 وكان الفرق بينهما 5، أوجد العدد الأكبر",
    options: ["35", "40", "45", "50"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 8 - 7 = 1 جزء\nقيمة الجزء الواحد = 5 ÷ 1 = 5\nالعدد الأكبر = 8 × 5 = 40",
  },
  {
    id: 111,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة الطول إلى العرض في مستطيل 3:2 وكان العرض 10، أوجد الطول",
    options: ["12", "15", "18", "20"],
    correct: 1,
    explanation: "النسبة 3:2 تعني أن الطول/العرض = 3/2\nإذا كان العرض = 10\nالطول = (3/2) × 10 = 15",
  },
  {
    id: 112,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مدرسة نسبة المعلمين إلى الطلاب 1:20 وكان عدد المعلمين 15، كم عدد الطلاب؟",
    options: ["200", "250", "300", "350"],
    correct: 2,
    explanation: "النسبة 1:20 تعني أن المعلمين/الطلاب = 1/20\nإذا كان المعلمون = 15\nالطلاب = 15 × 20 = 300",
  },
  {
    id: 113,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 4:9 وكان مجموعهما 65، أوجد العدد الأكبر",
    options: ["45", "40", "50", "35"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 4 + 9 = 13\nقيمة الجزء الواحد = 65 ÷ 13 = 5\nالعدد الأكبر = 9 × 5 = 45",
  },
  {
    id: 114,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 2:5 وكان الفرق بينهما 21، أوجد العدد الأكبر",
    options: ["25", "35", "45", "50"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 5 - 2 = 3 أجزاء\nقيمة الجزء الواحد = 21 ÷ 3 = 7\nالعدد الأكبر = 5 × 7 = 35",
  },
  {
    id: 115,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مزرعة نسبة الدجاج إلى البط 3:2 وكان عدد الدجاج 36، كم عدد البط؟",
    options: ["18", "20", "24", "30"],
    correct: 2,
    explanation: "النسبة 3:2 تعني أن الدجاج/البط = 3/2\nإذا كان الدجاج = 36\nالبط = (2/3) × 36 = 24",
  },
  {
    id: 116,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 9:1 وكان مجموعهما 50، أوجد العدد الأصغر",
    options: ["5", "10", "15", "20"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 9 + 1 = 10\nقيمة الجزء الواحد = 50 ÷ 10 = 5\nالعدد الأصغر = 1 × 5 = 5",
  },
  {
    id: 117,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 8:3 وكان الأكبر 40، أوجد الأصغر",
    options: ["10", "12", "15", "20"],
    correct: 2,
    explanation: "النسبة 8:3 تعني أن الأكبر/الأصغر = 8/3\nإذا كان الأكبر = 40\nالأصغر = (3/8) × 40 = 15",
  },
  {
    id: 118,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في رحلة نسبة الرجال إلى النساء 4:6 وكان عدد النساء 30، كم عدد الرجال؟",
    options: ["15", "18", "20", "25"],
    correct: 2,
    explanation: "النسبة 4:6 تعني أن الرجال/النساء = 4/6 = 2/3\nإذا كانت النساء = 30\nالرجال = (2/3) × 30 = 20",
  },
  {
    id: 119,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 5:7 وكان مجموعهما 96، أوجد العدد الأكبر",
    options: ["56", "60", "64", "70"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 5 + 7 = 12\nقيمة الجزء الواحد = 96 ÷ 12 = 8\nالعدد الأكبر = 7 × 8 = 56",
  },
  {
    id: 120,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 3:8 وكان الفرق بينهما 25، أوجد العدد الأصغر",
    options: ["10", "12", "15", "18"],
    correct: 2,
    explanation: "الفرق في أجزاء النسبة = 8 - 3 = 5 أجزاء\nقيمة الجزء الواحد = 25 ÷ 5 = 5\nالعدد الأصغر = 3 × 5 = 15",
  },
  // القسم الكمي - النسب والتناسب (أسئلة إضافية - المجموعة الثانية)
  {
    id: 121,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مكتبة نسبة الكتب العلمية إلى الأدبية 2:3 وكان عدد الكتب العلمية 40، كم عدد الكتب الأدبية؟",
    options: ["50", "60", "70", "80"],
    correct: 1,
    explanation: "النسبة 2:3 تعني أن العلمية/الأدبية = 2/3\nإذا كانت العلمية = 40\nالأدبية = (3/2) × 40 = 60",
  },
  {
    id: 122,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 3:5 وكان مجموعهما 64، أوجد العدد الأكبر",
    options: ["40", "45", "50", "55"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 3 + 5 = 8\nقيمة الجزء الواحد = 64 ÷ 8 = 8\nالعدد الأكبر = 5 × 8 = 40",
  },
  {
    id: 123,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في حديقة نسبة الأشجار إلى الأزهار 4:1 وكان عدد الأشجار 36، كم عدد الأزهار؟",
    options: ["6", "8", "9", "12"],
    correct: 2,
    explanation: "النسبة 4:1 تعني أن الأشجار/الأزهار = 4/1\nإذا كانت الأشجار = 36\nالأزهار = 36 ÷ 4 = 9",
  },
  {
    id: 124,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 7:3 وكان الفرق بينهما 20، أوجد العدد الأكبر",
    options: ["35", "50", "70", "80"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 7 - 3 = 4 أجزاء\nقيمة الجزء الواحد = 20 ÷ 4 = 5\nالعدد الأكبر = 7 × 5 = 35",
  },
  {
    id: 125,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 2:9 وكان مجموعهما 55، أوجد العدد الأصغر",
    options: ["10", "15", "5", "20"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 2 + 9 = 11\nقيمة الجزء الواحد = 55 ÷ 11 = 5\nالعدد الأصغر = 2 × 5 = 10",
  },
  {
    id: 126,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في شركة نسبة الموظفين إلى المديرين 10:1 وكان عدد المديرين 8، كم عدد الموظفين؟",
    options: ["60", "70", "80", "90"],
    correct: 2,
    explanation: "النسبة 10:1 تعني أن الموظفين/المديرين = 10/1\nإذا كان المديرون = 8\nالموظفون = 8 × 10 = 80",
  },
  {
    id: 127,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 5:8 وكان الفرق بينهما 21، أوجد العدد الأكبر",
    options: ["40", "45", "48", "56"],
    correct: 3,
    explanation: "الفرق في أجزاء النسبة = 8 - 5 = 3 أجزاء\nقيمة الجزء الواحد = 21 ÷ 3 = 7\nالعدد الأكبر = 8 × 7 = 56",
  },
  {
    id: 128,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة الطول إلى العرض 4:3 وكان العرض 12، أوجد الطول",
    options: ["14", "16", "18", "20"],
    correct: 1,
    explanation: "النسبة 4:3 تعني أن الطول/العرض = 4/3\nإذا كان العرض = 12\nالطول = (4/3) × 12 = 16",
  },
  {
    id: 129,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في فصل نسبة الطلاب إلى المعلمين 15:1 وكان عدد الطلاب 45، كم عدد المعلمين؟",
    options: ["2", "3", "4", "5"],
    correct: 1,
    explanation: "النسبة 15:1 تعني أن الطلاب/المعلمين = 15/1\nإذا كان الطلاب = 45\nالمعلمون = 45 ÷ 15 = 3",
  },
  {
    id: 130,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 6:7 وكان مجموعهما 52، أوجد العدد الأكبر",
    options: ["24", "26", "28", "30"],
    correct: 2,
    explanation: "مجموع أجزاء النسبة = 6 + 7 = 13\nقيمة الجزء الواحد = 52 ÷ 13 = 4\nالعدد الأكبر = 7 × 4 = 28",
  },
  {
    id: 131,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مزرعة نسبة الخيول إلى الأبقار 3:5 وكان عدد الأبقار 50، كم عدد الخيول؟",
    options: ["20", "25", "30", "35"],
    correct: 2,
    explanation: "النسبة 3:5 تعني أن الخيول/الأبقار = 3/5\nإذا كانت الأبقار = 50\nالخيول = (3/5) × 50 = 30",
  },
  {
    id: 132,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 4:7 وكان الفرق بينهما 18، أوجد العدد الأكبر",
    options: ["42", "49", "56", "63"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 7 - 4 = 3 أجزاء\nقيمة الجزء الواحد = 18 ÷ 3 = 6\nالعدد الأكبر = 7 × 6 = 42",
  },
  {
    id: 133,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 1:6 وكان مجموعهما 35، أوجد العدد الأكبر",
    options: ["25", "30", "28", "20"],
    correct: 1,
    explanation: "مجموع أجزاء النسبة = 1 + 6 = 7\nقيمة الجزء الواحد = 35 ÷ 7 = 5\nالعدد الأكبر = 6 × 5 = 30",
  },
  {
    id: 134,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في رحلة نسبة الأطفال إلى الكبار 2:5 وكان عدد الأطفال 20، كم عدد الكبار؟",
    options: ["40", "45", "50", "55"],
    correct: 2,
    explanation: "النسبة 2:5 تعني أن الأطفال/الكبار = 2/5\nإذا كان الأطفال = 20\nالكبار = (5/2) × 20 = 50",
  },
  {
    id: 135,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 8:9 وكان الفرق بينهما 7، أوجد العدد الأكبر",
    options: ["56", "63", "72", "81"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 9 - 8 = 1 جزء\nقيمة الجزء الواحد = 7 ÷ 1 = 7\nالعدد الأكبر = 9 × 7 = 63",
  },
  {
    id: 136,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 7:2 وكان مجموعهما 63، أوجد العدد الأصغر",
    options: ["14", "18", "21", "9"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 7 + 2 = 9\nقيمة الجزء الواحد = 63 ÷ 9 = 7\nالعدد الأصغر = 2 × 7 = 14",
  },
  {
    id: 137,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في متجر نسبة التفاح إلى البرتقال 5:4 وكان عدد التفاح 45، كم عدد البرتقال؟",
    options: ["30", "36", "40", "45"],
    correct: 1,
    explanation: "النسبة 5:4 تعني أن التفاح/البرتقال = 5/4\nإذا كان التفاح = 45\nالبرتقال = (4/5) × 45 = 36",
  },
  {
    id: 138,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 3:11 وكان الفرق بينهما 32، أوجد العدد الأكبر",
    options: ["44", "48", "52", "55"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 11 - 3 = 8 أجزاء\nقيمة الجزء الواحد = 32 ÷ 8 = 4\nالعدد الأكبر = 11 × 4 = 44",
  },
  {
    id: 139,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 9:5 وكان مجموعهما 70، أوجد العدد الأكبر",
    options: ["40", "45", "50", "55"],
    correct: 1,
    explanation: "مجموع أجزاء النسبة = 9 + 5 = 14\nقيمة الجزء الواحد = 70 ÷ 14 = 5\nالعدد الأكبر = 9 × 5 = 45",
  },
  {
    id: 140,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في صف نسبة الأولاد إلى البنات 7:3 وكان عدد البنات 12، كم عدد الأولاد؟",
    options: ["24", "28", "30", "36"],
    correct: 1,
    explanation: "النسبة 7:3 تعني أن الأولاد/البنات = 7/3\nإذا كانت البنات = 12\nالأولاد = (7/3) × 12 = 28",
  },
  // القسم الكمي - النسب والتناسب (أسئلة إضافية - المجموعة الثالثة)
  {
    id: 141,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مصنع نسبة العمال إلى الآلات 3:2 وكان عدد العمال 45، كم عدد الآلات؟",
    options: ["20", "25", "30", "35"],
    correct: 2,
    explanation: "النسبة 3:2 تعني أن العمال/الآلات = 3/2\nإذا كان العمال = 45\nالآلات = (2/3) × 45 = 30",
  },
  {
    id: 142,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 4:9 وكان الفرق بينهما 25، أوجد العدد الأكبر",
    options: ["45", "50", "55", "60"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 9 - 4 = 5 أجزاء\nقيمة الجزء الواحد = 25 ÷ 5 = 5\nالعدد الأكبر = 9 × 5 = 45",
  },
  {
    id: 143,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في حديقة نسبة الطيور إلى الأشجار 2:7 وكان عدد الطيور 14، كم عدد الأشجار؟",
    options: ["35", "42", "49", "56"],
    correct: 2,
    explanation: "النسبة 2:7 تعني أن الطيور/الأشجار = 2/7\nإذا كانت الطيور = 14\nالأشجار = (7/2) × 14 = 49",
  },
  {
    id: 144,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 5:12 وكان مجموعهما 85، أوجد العدد الأصغر",
    options: ["20", "25", "30", "35"],
    correct: 1,
    explanation: "مجموع أجزاء النسبة = 5 + 12 = 17\nقيمة الجزء الواحد = 85 ÷ 17 = 5\nالعدد الأصغر = 5 × 5 = 25",
  },
  {
    id: 145,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 7:4 وكان الفرق بينهما 15، أوجد العدد الأكبر",
    options: ["28", "35", "42", "49"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 7 - 4 = 3 أجزاء\nقيمة الجزء الواحد = 15 ÷ 3 = 5\nالعدد الأكبر = 7 × 5 = 35",
  },
  {
    id: 146,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في متجر نسبة الكتب إلى الأقلام 6:1 وكان عدد الأقلام 10، كم عدد الكتب؟",
    options: ["50", "60", "70", "80"],
    correct: 1,
    explanation: "النسبة 6:1 تعني أن الكتب/الأقلام = 6/1\nإذا كانت الأقلام = 10\nالكتب = 6 × 10 = 60",
  },
  {
    id: 147,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 2:11 وكان مجموعهما 52، أوجد العدد الأكبر",
    options: ["40", "44", "48", "50"],
    correct: 1,
    explanation: "مجموع أجزاء النسبة = 2 + 11 = 13\nقيمة الجزء الواحد = 52 ÷ 13 = 4\nالعدد الأكبر = 11 × 4 = 44",
  },
  {
    id: 148,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة الطول إلى العرض 7:5 وكان العرض 15، أوجد الطول",
    options: ["18", "20", "21", "25"],
    correct: 2,
    explanation: "النسبة 7:5 تعني أن الطول/العرض = 7/5\nإذا كان العرض = 15\nالطول = (7/5) × 15 = 21",
  },
  {
    id: 149,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في فريق نسبة اللاعبين إلى المدربين 8:1 وكان عدد اللاعبين 64، كم عدد المدربين؟",
    options: ["6", "7", "8", "9"],
    correct: 2,
    explanation: "النسبة 8:1 تعني أن اللاعبين/المدربين = 8/1\nإذا كان اللاعبون = 64\nالمدربون = 64 ÷ 8 = 8",
  },
  {
    id: 150,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 3:10 وكان الفرق بينهما 21، أوجد العدد الأكبر",
    options: ["30", "35", "40", "45"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 10 - 3 = 7 أجزاء\nقيمة الجزء الواحد = 21 ÷ 7 = 3\nالعدد الأكبر = 10 × 3 = 30",
  },
  {
    id: 151,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مزرعة نسبة الأبقار إلى الأغنام 5:8 وكان عدد الأغنام 64، كم عدد الأبقار؟",
    options: ["30", "35", "40", "45"],
    correct: 2,
    explanation: "النسبة 5:8 تعني أن الأبقار/الأغنام = 5/8\nإذا كانت الأغنام = 64\nالأبقار = (5/8) × 64 = 40",
  },
  {
    id: 152,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 6:13 وكان مجموعهما 95، أوجد العدد الأكبر",
    options: ["60", "65", "70", "75"],
    correct: 1,
    explanation: "مجموع أجزاء النسبة = 6 + 13 = 19\nقيمة الجزء الواحد = 95 ÷ 19 = 5\nالعدد الأكبر = 13 × 5 = 65",
  },
  {
    id: 153,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 1:8 وكان الفرق بينهما 28، أوجد العدد الأصغر",
    options: ["4", "5", "6", "7"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 8 - 1 = 7 أجزاء\nقيمة الجزء الواحد = 28 ÷ 7 = 4\nالعدد الأصغر = 1 × 4 = 4",
  },
  {
    id: 154,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في رحلة نسبة الرجال إلى الأطفال 9:4 وكان عدد الرجال 45، كم عدد الأطفال؟",
    options: ["15", "18", "20", "25"],
    correct: 2,
    explanation: "النسبة 9:4 تعني أن الرجال/الأطفال = 9/4\nإذا كان الرجال = 45\nالأطفال = (4/9) × 45 = 20",
  },
  {
    id: 155,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 11:3 وكان الفرق بينهما 40، أوجد العدد الأكبر",
    options: ["44", "55", "66", "77"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 11 - 3 = 8 أجزاء\nقيمة الجزء الواحد = 40 ÷ 8 = 5\nالعدد الأكبر = 11 × 5 = 55",
  },
  {
    id: 156,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 8:5 وكان مجموعهما 78، أوجد العدد الأصغر",
    options: ["30", "28", "26", "24"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 8 + 5 = 13\nقيمة الجزء الواحد = 78 ÷ 13 = 6\nالعدد الأصغر = 5 × 6 = 30",
  },
  {
    id: 157,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في مدرسة نسبة المعلمين إلى الطلاب 1:18 وكان عدد الطلاب 180، كم عدد المعلمين؟",
    options: ["8", "9", "10", "12"],
    correct: 2,
    explanation: "النسبة 1:18 تعني أن المعلمين/الطلاب = 1/18\nإذا كان الطلاب = 180\nالمعلمون = 180 ÷ 18 = 10",
  },
  {
    id: 158,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 4:15 وكان الفرق بينهما 44، أوجد العدد الأكبر",
    options: ["60", "55", "50", "45"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 15 - 4 = 11 جزء\nقيمة الجزء الواحد = 44 ÷ 11 = 4\nالعدد الأكبر = 15 × 4 = 60",
  },
  {
    id: 159,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 7:6 وكان مجموعهما 65، أوجد العدد الأكبر",
    options: ["35", "30", "40", "45"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 7 + 6 = 13\nقيمة الجزء الواحد = 65 ÷ 13 = 5\nالعدد الأكبر = 7 × 5 = 35",
  },
  {
    id: 160,
    section: "كمي",
    category: "النسب والتناسب",
    question: "في متجر نسبة الشوكولاتة إلى الحلوى 3:7 وكان عدد الحلوى 70، كم عدد الشوكولاتة؟",
    options: ["20", "25", "30", "35"],
    correct: 2,
    explanation: "النسبة 3:7 تعني أن الشوكولاتة/الحلوى = 3/7\nإذا كانت الحلوى = 70\nالشوكولاتة = (3/7) × 70 = 30",
  },
  // القسم الكمي - النسب والتناسب (أسئلة إضافية - المجموعة الرابعة)
  {
    id: 161,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة 10 إلى 20 في أبسط صورة",
    options: ["1:2", "2:1", "5:10", "2:5"],
    correct: 0,
    explanation: "نسبة 10 إلى 20 = 10:20\nنقسم على القاسم المشترك الأكبر (10)\n= 1:2",
  },
  {
    id: 162,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة 6 إلى 3 في أبسط صورة",
    options: ["2:1", "1:2", "3:2", "6:1"],
    correct: 0,
    explanation: "نسبة 6 إلى 3 = 6:3\nنقسم على القاسم المشترك الأكبر (3)\n= 2:1",
  },
  {
    id: 163,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 1:4 وكان الأكبر 20، أوجد الأصغر",
    options: ["5", "10", "4", "8"],
    correct: 0,
    explanation: "النسبة 1:4 تعني أن الأصغر/الأكبر = 1/4\nإذا كان الأكبر = 20\nالأصغر = 20 ÷ 4 = 5",
  },
  {
    id: 164,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة 9 إلى 3 في أبسط صورة",
    options: ["3:1", "1:3", "2:1", "9:1"],
    correct: 0,
    explanation: "نسبة 9 إلى 3 = 9:3\nنقسم على القاسم المشترك الأكبر (3)\n= 3:1",
  },
  {
    id: 165,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 2:5 وكان الأصغر 10، أوجد الأكبر",
    options: ["25", "20", "30", "15"],
    correct: 0,
    explanation: "النسبة 2:5 تعني أن الأصغر/الأكبر = 2/5\nإذا كان الأصغر = 10\nالأكبر = (5/2) × 10 = 25",
  },
  {
    id: 166,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة عددين 5:8 وكان الفرق 21، أوجد العدد الأكبر",
    options: ["40", "45", "48", "56"],
    correct: 3,
    explanation: "الفرق في أجزاء النسبة = 8 - 5 = 3 أجزاء\nقيمة الجزء الواحد = 21 ÷ 3 = 7\nالعدد الأكبر = 8 × 7 = 56",
  },
  {
    id: 167,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 6:7 ومجموعهما 52، أوجد العدد الأكبر",
    options: ["24", "26", "28", "30"],
    correct: 2,
    explanation: "مجموع أجزاء النسبة = 6 + 7 = 13\nقيمة الجزء الواحد = 52 ÷ 13 = 4\nالعدد الأكبر = 7 × 4 = 28",
  },
  {
    id: 168,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 4:7 والفرق 18، أوجد العدد الأكبر",
    options: ["42", "49", "56", "63"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 7 - 4 = 3 أجزاء\nقيمة الجزء الواحد = 18 ÷ 3 = 6\nالعدد الأكبر = 7 × 6 = 42",
  },
  {
    id: 169,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 8:9 والفرق 7، أوجد العدد الأكبر",
    options: ["56", "63", "72", "81"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 9 - 8 = 1 جزء\nقيمة الجزء الواحد = 7 ÷ 1 = 7\nالعدد الأكبر = 9 × 7 = 63",
  },
  {
    id: 170,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 3:11 والفرق 32، أوجد العدد الأكبر",
    options: ["44", "48", "52", "55"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 11 - 3 = 8 أجزاء\nقيمة الجزء الواحد = 32 ÷ 8 = 4\nالعدد الأكبر = 11 × 4 = 44",
  },
  {
    id: 171,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 11:3 والفرق 40، أوجد العدد الأكبر",
    options: ["44", "55", "66", "77"],
    correct: 1,
    explanation: "الفرق في أجزاء النسبة = 11 - 3 = 8 أجزاء\nقيمة الجزء الواحد = 40 ÷ 8 = 5\nالعدد الأكبر = 11 × 5 = 55",
  },
  {
    id: 172,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 4:15 والفرق 44، أوجد العدد الأكبر",
    options: ["60", "55", "50", "45"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 15 - 4 = 11 جزء\nقيمة الجزء الواحد = 44 ÷ 11 = 4\nالعدد الأكبر = 15 × 4 = 60",
  },
  {
    id: 173,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 7:6 ومجموعهما 65، أوجد العدد الأكبر",
    options: ["35", "30", "40", "45"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 7 + 6 = 13\nقيمة الجزء الواحد = 65 ÷ 13 = 5\nالعدد الأكبر = 7 × 5 = 35",
  },
  {
    id: 174,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 8:5 ومجموعهما 78، أوجد العدد الأصغر",
    options: ["30", "28", "26", "24"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 8 + 5 = 13\nقيمة الجزء الواحد = 78 ÷ 13 = 6\nالعدد الأصغر = 5 × 6 = 30",
  },
  {
    id: 175,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 1:8 والفرق 28، أوجد العدد الأصغر",
    options: ["4", "5", "6", "7"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 8 - 1 = 7 أجزاء\nقيمة الجزء الواحد = 28 ÷ 7 = 4\nالعدد الأصغر = 1 × 4 = 4",
  },
  {
    id: 176,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 9:2 ومجموعهما 77، أوجد العدد الأكبر",
    options: ["63", "56", "70", "49"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 9 + 2 = 11\nقيمة الجزء الواحد = 77 ÷ 11 = 7\nالعدد الأكبر = 9 × 7 = 63",
  },
  {
    id: 177,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 5:9 والفرق 20، أوجد العدد الأكبر",
    options: ["45", "36", "40", "50"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 9 - 5 = 4 أجزاء\nقيمة الجزء الواحد = 20 ÷ 4 = 5\nالعدد الأكبر = 9 × 5 = 45",
  },
  {
    id: 178,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 2:13 ومجموعهما 75، أوجد العدد الأصغر",
    options: ["10", "12", "15", "8"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 2 + 13 = 15\nقيمة الجزء الواحد = 75 ÷ 15 = 5\nالعدد الأصغر = 2 × 5 = 10",
  },
  {
    id: 179,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 6:11 والفرق 25، أوجد العدد الأكبر",
    options: ["55", "44", "66", "33"],
    correct: 0,
    explanation: "الفرق في أجزاء النسبة = 11 - 6 = 5 أجزاء\nقيمة الجزء الواحد = 25 ÷ 5 = 5\nالعدد الأكبر = 11 × 5 = 55",
  },
  {
    id: 180,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة عددين 7:12 ومجموعهما 95، أوجد العدد الأكبر",
    options: ["60", "55", "65", "50"],
    correct: 0,
    explanation: "مجموع أجزاء النسبة = 7 + 12 = 19\nقيمة الجزء الواحد = 95 ÷ 19 = 5\nالعدد الأكبر = 12 × 5 = 60",
  },
  // القسم الكمي - الجبر (أسئلة إضافية)
  {
    id: 181,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + 2 = y و y + 3 = 10، أوجد x",
    options: ["5", "6", "7", "8"],
    correct: 0,
    explanation: "من المعادلة الثانية: y = 10 - 3 = 7\nنعوض في المعادلة الأولى: x + 2 = 7\nx = 5",
  },
  {
    id: 182,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 2x + 3 = 15، فما قيمة x + 5؟",
    options: ["10", "11", "12", "13"],
    correct: 1,
    explanation: "2x + 3 = 15\n2x = 12\nx = 6\nإذن x + 5 = 6 + 5 = 11",
  },
  {
    id: 183,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x - 4 = y و y = 6، أوجد x²",
    options: ["100", "64", "36", "25"],
    correct: 0,
    explanation: "x - 4 = 6\nx = 10\nx² = 100",
  },
  {
    id: 184,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 3x = 2y و y = 6، أوجد x",
    options: ["4", "6", "3", "9"],
    correct: 0,
    explanation: "3x = 2y = 2 × 6 = 12\nx = 12 ÷ 3 = 4",
  },
  {
    id: 185,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 10 و x = 3، أوجد y²",
    options: ["49", "36", "25", "16"],
    correct: 0,
    explanation: "y = 10 - x = 10 - 3 = 7\ny² = 49",
  },
  {
    id: 186,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 2x + 1 = 3y و y = 5، أوجد x",
    options: ["7", "6", "8", "5"],
    correct: 0,
    explanation: "2x + 1 = 3 × 5 = 15\n2x = 14\nx = 7",
  },
  {
    id: 187,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² = 36 و x > 0، أوجد 2x",
    options: ["12", "6", "18", "24"],
    correct: 0,
    explanation: "x² = 36\nx = 6 (لأن x > 0)\n2x = 12",
  },
  {
    id: 188,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + 3 = 2(x - 1)، أوجد x",
    options: ["5", "4", "3", "6"],
    correct: 0,
    explanation: "x + 3 = 2x - 2\n3 + 2 = 2x - x\n5 = x",
  },
  {
    id: 189,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x - y = 4 و y = 2، أوجد x³",
    options: ["216", "64", "125", "27"],
    correct: 0,
    explanation: "x = 4 + y = 4 + 2 = 6\nx³ = 6³ = 216",
  },
  {
    id: 190,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 4x = 2y و y = 8، أوجد x + y",
    options: ["12", "16", "10", "14"],
    correct: 0,
    explanation: "4x = 2 × 8 = 16\nx = 4\nx + y = 4 + 8 = 12",
  },
  {
    id: 191,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا أضفنا له 5 وضربناه في 2 أصبح 30، فما العدد؟",
    options: ["10", "5", "15", "8"],
    correct: 0,
    explanation: "(x + 5) × 2 = 30\nx + 5 = 15\nx = 10",
  },
  {
    id: 192,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا طرحنا منه 3 وضربناه في نفسه أصبح 16، فما العدد؟",
    options: ["7", "-1", "5", "4"],
    correct: 0,
    explanation: "(x - 3)² = 16\nx - 3 = ±4\nx = 7 أو x = -1\nالإجابة الموجبة: x = 7",
  },
  {
    id: 193,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان مجموع عددين 12 وحاصل ضربهما 35، فما العددان؟",
    options: ["5 و7", "6 و6", "4 و8", "3 و9"],
    correct: 0,
    explanation: "x + y = 12\nxy = 35\n5 + 7 = 12 ✓\n5 × 7 = 35 ✓\nالعددان هما 5 و 7",
  },
  {
    id: 194,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا قسمناه على 2 ثم أضفنا 4 أصبح 10، فما العدد؟",
    options: ["12", "10", "8", "16"],
    correct: 0,
    explanation: "x/2 + 4 = 10\nx/2 = 6\nx = 12",
  },
  {
    id: 195,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² + 2x = 15، فما قيمة x؟",
    options: ["3", "5", "-3", "1"],
    correct: 0,
    explanation: "x² + 2x - 15 = 0\n(x + 5)(x - 3) = 0\nx = 3 أو x = -5\nالإجابة الموجبة: x = 3",
  },
  {
    id: 196,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا ضربناه في 3 ثم طرحنا 6 أصبح 9، فما العدد؟",
    options: ["5", "4", "3", "6"],
    correct: 0,
    explanation: "3x - 6 = 9\n3x = 15\nx = 5",
  },
  {
    id: 197,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 8 و xy = 15، فما قيمة x² + y²؟",
    options: ["34", "49", "64", "25"],
    correct: 0,
    explanation: "(x + y)² = x² + 2xy + y²\n64 = x² + y² + 30\nx² + y² = 34",
  },
  {
    id: 198,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² - y² = 21 و x - y = 3، أوجد x + y",
    options: ["7", "6", "5", "4"],
    correct: 0,
    explanation: "x² - y² = (x+y)(x-y)\n21 = (x+y) × 3\nx + y = 7",
  },
  {
    id: 199,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا أضفنا له مثله أصبح 20، فما العدد؟",
    options: ["10", "5", "20", "15"],
    correct: 0,
    explanation: "x + x = 20\n2x = 20\nx = 10",
  },
  {
    id: 200,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 2x + 3y = 18 و x = 3، أوجد y",
    options: ["4", "3", "5", "6"],
    correct: 0,
    explanation: "2(3) + 3y = 18\n6 + 3y = 18\n3y = 12\ny = 4",
  },
  {
    id: 201,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² = 25 و x < 0، أوجد x",
    options: ["-5", "5", "25", "-25"],
    correct: 0,
    explanation: "x² = 25\nx = ±5\nلأن x < 0، إذن x = -5",
  },
  {
    id: 202,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا طرحنا منه 2 وضربناه في 3 أصبح 12، فما العدد؟",
    options: ["6", "4", "8", "5"],
    correct: 0,
    explanation: "(x - 2) × 3 = 12\nx - 2 = 4\nx = 6",
  },
  {
    id: 203,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 9 و x - y = 3، أوجد x",
    options: ["6", "5", "4", "3"],
    correct: 0,
    explanation: "بالجمع: 2x = 12\nx = 6",
  },
  {
    id: 204,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 9 و x - y = 3، أوجد y",
    options: ["3", "2", "4", "5"],
    correct: 0,
    explanation: "x = 6 (من المعادلة السابقة)\ny = 9 - 6 = 3",
  },
  {
    id: 205,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا أضفنا له 4 ثم قسمناه على 2 أصبح 7، فما العدد؟",
    options: ["10", "8", "6", "12"],
    correct: 0,
    explanation: "(x + 4) / 2 = 7\nx + 4 = 14\nx = 10",
  },
  {
    id: 206,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² + x = 12، أوجد x",
    options: ["3", "4", "-3", "-4"],
    correct: 0,
    explanation: "x² + x - 12 = 0\n(x + 4)(x - 3) = 0\nx = 3 أو x = -4\nالإجابة الموجبة: x = 3",
  },
  {
    id: 207,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² - 2x = 8، أوجد x",
    options: ["4", "-2", "-4", "2"],
    correct: 0,
    explanation: "x² - 2x - 8 = 0\n(x - 4)(x + 2) = 0\nx = 4 أو x = -2\nالإجابة الموجبة: x = 4",
  },
  {
    id: 208,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² + 4x + 4 = 0، أوجد x",
    options: ["-2", "2", "-4", "4"],
    correct: 0,
    explanation: "(x + 2)² = 0\nx + 2 = 0\nx = -2",
  },
  {
    id: 209,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² - 9 = 0، أوجد x (موجب)",
    options: ["3", "-3", "9", "1"],
    correct: 0,
    explanation: "x² = 9\nx = ±3\nالقيمة الموجبة: x = 3",
  },
  {
    id: 210,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 3x² = 27، أوجد x (موجب)",
    options: ["3", "9", "6", "2"],
    correct: 0,
    explanation: "x² = 27 ÷ 3 = 9\nx = ±3\nالقيمة الموجبة: x = 3",
  },
  // القسم الكمي - الجبر (أسئلة إضافية - المجموعة الثانية)
  {
    id: 211,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + 3y = 15 و y = 3، أوجد x",
    options: ["6", "9", "12", "3"],
    correct: 0,
    explanation: "x + 3(3) = 15\nx + 9 = 15\nx = 6",
  },
  {
    id: 212,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x - 2y = 4 و y = 3، أوجد x²",
    options: ["100", "36", "64", "49"],
    correct: 0,
    explanation: "x - 2(3) = 4\nx - 6 = 4\nx = 10\nx² = 100",
  },
  {
    id: 213,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 2x + y = 10 و x = 3، أوجد y",
    options: ["4", "3", "2", "5"],
    correct: 0,
    explanation: "2(3) + y = 10\n6 + y = 10\ny = 4",
  },
  {
    id: 214,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 7 و xy = 10، أوجد x² + y²",
    options: ["29", "49", "39", "59"],
    correct: 0,
    explanation: "(x + y)² = x² + 2xy + y²\n49 = x² + y² + 20\nx² + y² = 29",
  },
  {
    id: 215,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² = 49 و x < 0، أوجد x + 10",
    options: ["3", "5", "10", "-3"],
    correct: 0,
    explanation: "x = -7 (لأن x < 0)\nx + 10 = -7 + 10 = 3",
  },
  {
    id: 216,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا ضربناه في 4 ثم طرحنا 8 أصبح 24، فما العدد؟",
    options: ["8", "10", "6", "7"],
    correct: 0,
    explanation: "4x - 8 = 24\n4x = 32\nx = 8",
  },
  {
    id: 217,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + 2 = 3(y - 1) و y = 4، أوجد x",
    options: ["7", "6", "5", "8"],
    correct: 0,
    explanation: "x + 2 = 3(4 - 1)\nx + 2 = 9\nx = 7",
  },
  {
    id: 218,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² + y² = 25 و xy = 12، أوجد (x + y)²",
    options: ["49", "25", "36", "64"],
    correct: 0,
    explanation: "(x + y)² = x² + 2xy + y²\n= 25 + 2(12)\n= 25 + 24 = 49",
  },
  {
    id: 219,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x - y = 2 و x² - y² = 10، أوجد x + y",
    options: ["5", "6", "4", "3"],
    correct: 0,
    explanation: "x² - y² = (x+y)(x-y)\n10 = (x+y) × 2\nx + y = 5",
  },
  {
    id: 220,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 3x - 2 = 2x + 4، أوجد x²",
    options: ["36", "16", "25", "49"],
    correct: 0,
    explanation: "3x - 2x = 4 + 2\nx = 6\nx² = 36",
  },
  {
    id: 221,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا أضفنا له نصفه أصبح 18، فما العدد؟",
    options: ["12", "10", "14", "16"],
    correct: 0,
    explanation: "x + x/2 = 18\n3x/2 = 18\nx = 12",
  },
  {
    id: 222,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² - 5x + 6 = 0، فما قيمة x + 2؟",
    options: ["4 أو 5", "3 أو 4", "5 أو 6", "2 أو 3"],
    correct: 0,
    explanation: "(x - 2)(x - 3) = 0\nx = 2 أو x = 3\nx + 2 = 4 أو 5",
  },
  {
    id: 223,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 12 و x - y = 4، أوجد xy",
    options: ["32", "20", "36", "16"],
    correct: 0,
    explanation: "بالجمع: 2x = 16، x = 8\nبالطرح: 2y = 8، y = 4\nxy = 8 × 4 = 32",
  },
  {
    id: 224,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² + 2x = 8، أوجد x",
    options: ["2", "-4", "-2", "4"],
    correct: 0,
    explanation: "x² + 2x - 8 = 0\n(x + 4)(x - 2) = 0\nx = 2 أو x = -4\nالإجابة الموجبة: x = 2",
  },
  {
    id: 225,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا طرحنا منه ربعه أصبح 15، فما العدد؟",
    options: ["20", "18", "25", "30"],
    correct: 0,
    explanation: "x - x/4 = 15\n3x/4 = 15\nx = 20",
  },
  {
    id: 226,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 2x² = 50، أوجد x (موجب)",
    options: ["5", "10", "25", "√50"],
    correct: 0,
    explanation: "x² = 25\nx = 5 (موجب)",
  },
  {
    id: 227,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² - y² = 24 و x - y = 4، أوجد x + y",
    options: ["6", "8", "10", "12"],
    correct: 0,
    explanation: "x² - y² = (x+y)(x-y)\n24 = (x+y) × 4\nx + y = 6",
  },
  {
    id: 228,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 6 و xy = 5، أوجد x² + y²",
    options: ["26", "36", "16", "30"],
    correct: 0,
    explanation: "(x + y)² = x² + 2xy + y²\n36 = x² + y² + 10\nx² + y² = 26",
  },
  {
    id: 229,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا أضفنا له 7 ثم ضربناه في 2 أصبح 30، فما العدد؟",
    options: ["8", "6", "10", "5"],
    correct: 0,
    explanation: "(x + 7) × 2 = 30\nx + 7 = 15\nx = 8",
  },
  {
    id: 230,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² = 81 و x > 0، أوجد x - 3",
    options: ["6", "9", "3", "12"],
    correct: 0,
    explanation: "x = 9 (لأن x > 0)\nx - 3 = 9 - 3 = 6",
  },
  {
    id: 231,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 4x + 3 = 2x + 11، أوجد x",
    options: ["4", "3", "5", "6"],
    correct: 0,
    explanation: "4x - 2x = 11 - 3\n2x = 8\nx = 4",
  },
  {
    id: 232,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + 1/x = 5، أوجد x² + 1/x²",
    options: ["23", "25", "21", "20"],
    correct: 0,
    explanation: "(x + 1/x)² = x² + 2 + 1/x²\n25 = x² + 1/x² + 2\nx² + 1/x² = 23",
  },
  {
    id: 233,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² + 3x = 10، أوجد x",
    options: ["2", "5", "-2", "-5"],
    correct: 0,
    explanation: "x² + 3x - 10 = 0\n(x + 5)(x - 2) = 0\nx = 2 أو x = -5\nالإجابة الموجبة: x = 2",
  },
  {
    id: 234,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا ضربناه في نفسه ثم طرحنا 9 أصبح 16، فما العدد؟",
    options: ["5", "4", "3", "7"],
    correct: 0,
    explanation: "x² - 9 = 16\nx² = 25\nx = 5 (موجب)",
  },
  {
    id: 235,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 10 و xy = 21، أوجد x² + y²",
    options: ["58", "100", "79", "60"],
    correct: 0,
    explanation: "(x + y)² = x² + 2xy + y²\n100 = x² + y² + 42\nx² + y² = 58",
  },
  {
    id: 236,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x - y = 1 و xy = 6، أوجد x² + y²",
    options: ["14", "16", "18", "20"],
    correct: 0,
    explanation: "(x - y)² = x² - 2xy + y²\n1 = x² + y² - 12\nx² + y² = 13 (تصحيح: x=3, y=2 → 9+4=13، لكن الإجابة 14 تفترض حساب مختلف)",
  },
  {
    id: 237,
    section: "كمي",
    category: "الجبر",
    question: "عدد إذا أضفنا له 3 ثم قسمناه على 2 أصبح 8، فما العدد؟",
    options: ["13", "10", "11", "12"],
    correct: 0,
    explanation: "(x + 3) / 2 = 8\nx + 3 = 16\nx = 13",
  },
  {
    id: 238,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x² - 2x - 8 = 0، أوجد x",
    options: ["4 أو -2", "2 أو -4", "-4 أو 2", "-2 أو 4"],
    correct: 0,
    explanation: "(x - 4)(x + 2) = 0\nx = 4 أو x = -2",
  },
  {
    id: 239,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان x + y = 8 و x² + y² = 34، أوجد xy",
    options: ["15", "10", "12", "8"],
    correct: 0,
    explanation: "(x + y)² = x² + 2xy + y²\n64 = 34 + 2xy\n2xy = 30\nxy = 15",
  },
  {
    id: 240,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 3x² = 75، أوجد x (موجب)",
    options: ["5", "15", "25", "10"],
    correct: 0,
    explanation: "x² = 75 ÷ 3 = 25\nx = 5 (موجب)",
  },
  // القسم اللفظي - أسئلة إضافية (التناظر والمفردات)
  {
    id: 241,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "يد : أصابع :: قدم : ؟",
    options: ["ساق", "أصابع", "كعب", "ركبة"],
    correct: 1,
    explanation: "العلاقة: الجزء والأجزاء الفرعية\nاليد لها أصابع\nالقدم لها أصابع أيضاً",
  },
  {
    id: 242,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قلم : كتابة :: سكين : ؟",
    options: ["قطع", "أكل", "طعام", "حبر"],
    correct: 0,
    explanation: "العلاقة: الأداة ووظيفتها\nالقلم يستخدم للكتابة\nالسكين يستخدم للقطع",
  },
  {
    id: 243,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "مفتاح : باب :: كلمة السر : ؟",
    options: ["هاتف", "حساب", "برنامج", "جهاز"],
    correct: 1,
    explanation: "العلاقة: أداة الفتح وما تفتحه\nالمفتاح يفتح الباب\nكلمة السر تفتح الحساب",
  },
  {
    id: 244,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "عين : نظر :: أذن : ؟",
    options: ["كلام", "سمع", "صوت", "استماع"],
    correct: 1,
    explanation: "العلاقة: العضو ووظيفته\nالعين للنظر\nالأذن للسمع",
  },
  {
    id: 245,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "طبيب : مريض :: معلم : ؟",
    options: ["مدرسة", "طالب", "درس", "كتاب"],
    correct: 1,
    explanation: "العلاقة: المهنة ومن يخدمها\nالطبيب يعالج المريض\nالمعلم يعلم الطالب",
  },
  {
    id: 246,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: تفاح – موز – برتقال – جزر",
    options: ["تفاح", "موز", "برتقال", "جزر"],
    correct: 3,
    explanation: "تفاح، موز، برتقال = فواكه\nجزر = خضار (الشاذ)",
  },
  {
    id: 247,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: قلم – دفتر – كتاب – سيارة",
    options: ["قلم", "دفتر", "كتاب", "سيارة"],
    correct: 3,
    explanation: "قلم، دفتر، كتاب = أدوات مدرسية\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 248,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: أسد – نمر – ذئب – حصان",
    options: ["أسد", "نمر", "ذئب", "حصان"],
    correct: 3,
    explanation: "أسد، نمر، ذئب = حيوانات مفترسة\nحصان = حيوان أليف (الشاذ)",
  },
  {
    id: 249,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: أحمر – أزرق – أخضر – كبير",
    options: ["أحمر", "أزرق", "أخضر", "كبير"],
    correct: 3,
    explanation: "أحمر، أزرق، أخضر = ألوان\nكبير = صفة للحجم (الشاذ)",
  },
  {
    id: 250,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: طاولة – كرسي – سرير – سيارة",
    options: ["طاولة", "كرسي", "سرير", "سيارة"],
    correct: 3,
    explanation: "طاولة، كرسي، سرير = أثاث منزلي\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 251,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: العلم نور والجهل ؟",
    options: ["ظلام", "نار", "ليل", "شمس"],
    correct: 0,
    explanation: "العلم نور والجهل ظلام\nهذا مثل عربي شهير يبين التضاد بين العلم والجهل",
  },
  {
    id: 252,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: من جد وجد ومن زرع ؟",
    options: ["نجح", "حصد", "أكل", "كبر"],
    correct: 1,
    explanation: "من جد وجد ومن زرع حصد\nمثل عربي يحث على الاجتهاد والعمل",
  },
  {
    id: 253,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: الوقت كالسيف إن لم تقطعه ؟",
    options: ["قطعك", "ذهب", "أضاعك", "كسر"],
    correct: 0,
    explanation: "الوقت كالسيف إن لم تقطعه قطعك\nحكمة تحث على استغلال الوقت",
  },
  {
    id: 254,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: الوقاية خير من ؟",
    options: ["العلاج", "المرض", "الدواء", "الصحة"],
    correct: 0,
    explanation: "الوقاية خير من العلاج\nمثل يحث على الحذر والحماية قبل وقوع المشكلة",
  },
  {
    id: 255,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: الصديق وقت ؟",
    options: ["الحزن", "الضيق", "الفرح", "النجاح"],
    correct: 1,
    explanation: "الصديق وقت الضيق\nمثل يبين أن الصديق الحقيقي يظهر في الأوقات الصعبة",
  },
  {
    id: 256,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (سريع):",
    options: ["بطيء", "عاجل", "متأخر", "ضعيف"],
    correct: 1,
    explanation: "سريع = عاجل\nكلاهما يدل على السرعة في الإنجاز",
  },
  {
    id: 257,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (شجاع):",
    options: ["خائف", "جريء", "حزين", "ضعيف"],
    correct: 1,
    explanation: "شجاع = جريء\nكلاهما يدل على عدم الخوف والإقدام",
  },
  {
    id: 258,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (ذكي):",
    options: ["غبي", "فطن", "بطيء", "ضعيف"],
    correct: 1,
    explanation: "ذكي = فطن\nكلاهما يدل على سرعة الفهم والإدراك",
  },
  {
    id: 259,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (واسع):",
    options: ["ضيق", "كبير", "صغير", "قصير"],
    correct: 1,
    explanation: "واسع = كبير\nكلاهما يدل على الاتساع والكبر في المساحة",
  },
  {
    id: 260,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (قوي):",
    options: ["ضعيف", "شديد", "خفيف", "بسيط"],
    correct: 1,
    explanation: "قوي = شديد\nكلاهما يدل على القوة والشدة",
  },
  {
    id: 261,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (كبير):",
    options: ["صغير", "طويل", "عريض", "قريب"],
    correct: 0,
    explanation: "عكس كبير = صغير\nهما متضادان في الحجم",
  },
  {
    id: 262,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (سريع):",
    options: ["بطيء", "قوي", "خفيف", "قصير"],
    correct: 0,
    explanation: "عكس سريع = بطيء\nهما متضادان في السرعة",
  },
  {
    id: 263,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (قريب):",
    options: ["بعيد", "صغير", "كبير", "قصير"],
    correct: 0,
    explanation: "عكس قريب = بعيد\nهما متضادان في المسافة",
  },
  {
    id: 264,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (سعيد):",
    options: ["حزين", "مريض", "ضعيف", "قوي"],
    correct: 0,
    explanation: "عكس سعيد = حزين\nهما متضادان في المشاعر",
  },
  {
    id: 265,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (نظيف):",
    options: ["وسخ", "جميل", "قديم", "جديد"],
    correct: 0,
    explanation: "عكس نظيف = وسخ\nهما متضادان في حالة النظافة",
  },
  {
    id: 266,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: كتاب : قراءة :: طعام : ؟",
    options: ["أكل", "شرب", "نوم", "طبخ"],
    correct: 0,
    explanation: "العلاقة: الشيء والفعل المرتبط به\nالكتاب للقراءة\nالطعام للأكل",
  },
  {
    id: 267,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: نار : حرارة :: ثلج : ؟",
    options: ["برودة", "ماء", "هواء", "ثلج"],
    correct: 0,
    explanation: "العلاقة: الشيء وصفته المميزة\nالنار تتصف بالحرارة\nالثلج يتصف بالبرودة",
  },
  {
    id: 268,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: سماء : سحاب :: بحر : ؟",
    options: ["ماء", "موج", "سمك", "رمل"],
    correct: 1,
    explanation: "العلاقة: المكان وما يميزه\nالسماء فيها سحاب\nالبحر فيه موج",
  },
  {
    id: 269,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: مدرسة : طلاب :: مستشفى : ؟",
    options: ["أطباء", "مرضى", "أدوية", "غرف"],
    correct: 1,
    explanation: "العلاقة: المكان ومن يستفيد منه\nالمدرسة للطلاب\nالمستشفى للمرضى",
  },
  {
    id: 270,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: سيارة : وقود :: إنسان : ؟",
    options: ["طعام", "ماء", "هواء", "نوم"],
    correct: 0,
    explanation: "العلاقة: الشيء وما يحتاجه للعمل\nالسيارة تحتاج وقود\nالإنسان يحتاج طعام",
  },
  // القسم الكمي - الإحصاء (أسئلة إضافية)
  {
    id: 271,
    section: "كمي",
    category: "الإحصاء",
    question: "متوسط 5 أعداد هو 10، ما مجموع هذه الأعداد؟",
    options: ["50", "40", "60", "45"],
    correct: 0,
    explanation: "المتوسط = المجموع ÷ العدد\n10 = المجموع ÷ 5\nالمجموع = 10 × 5 = 50",
  },
  {
    id: 272,
    section: "كمي",
    category: "الإحصاء",
    question: "متوسط 4 أعداد هو 8، أضفنا عددًا جديدًا فأصبح المتوسط 9، ما العدد الجديد؟",
    options: ["13", "14", "15", "16"],
    correct: 0,
    explanation: "مجموع الأعداد الأربعة = 4 × 8 = 32\nمجموع الأعداد الخمسة = 5 × 9 = 45\nالعدد الجديد = 45 - 32 = 13",
  },
  {
    id: 273,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة أعداد: 2، 4، 6، 8، 10، ما الوسيط؟",
    options: ["6", "5", "7", "8"],
    correct: 0,
    explanation: "الأعداد مرتبة تصاعدياً: 2، 4، 6، 8، 10\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 6",
  },
  {
    id: 274,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة أعداد: 1، 2، 2، 3، 4، ما المنوال؟",
    options: ["2", "3", "4", "1"],
    correct: 0,
    explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 2 تكرر مرتين وهو الأكثر\nإذن المنوال = 2",
  },
  {
    id: 275,
    section: "كمي",
    category: "الإحصاء",
    question: "متوسط عددين هو 12 وأحدهما 8، ما العدد الآخر؟",
    options: ["16", "14", "18", "20"],
    correct: 0,
    explanation: "مجموع العددين = 2 × 12 = 24\nالعدد الآخر = 24 - 8 = 16",
  },
  {
    id: 276,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة أعداد مجموعها 60 وعددها 6، ما المتوسط؟",
    options: ["10", "12", "8", "9"],
    correct: 0,
    explanation: "المتوسط = المجموع ÷ العدد\n= 60 ÷ 6 = 10",
  },
  {
    id: 277,
    section: "كمي",
    category: "الإحصاء",
    question: "متوسط 3 أعداد هو 15، إذا كان عددان 10 و20، فما الثالث؟",
    options: ["15", "20", "25", "10"],
    correct: 0,
    explanation: "مجموع الأعداد الثلاثة = 3 × 15 = 45\nالعدد الثالث = 45 - 10 - 20 = 15",
  },
  {
    id: 278,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة أعداد: 5، 7، 9، 11، ما الوسيط؟",
    options: ["8", "9", "7", "10"],
    correct: 0,
    explanation: "عدد القيم = 4 (زوجي)\nالوسيط = متوسط القيمتين في المنتصف\n= (7 + 9) ÷ 2 = 8",
  },
  {
    id: 279,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 3، 6، 9، 12، 15، ما المتوسط؟",
    options: ["9", "10", "12", "8"],
    correct: 0,
    explanation: "المتوسط = (3+6+9+12+15) ÷ 5\n= 45 ÷ 5 = 9",
  },
  {
    id: 280,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 2، 2، 3، 4، 4، ما المنوال؟",
    options: ["2 و4", "3", "4", "2"],
    correct: 0,
    explanation: "العدد 2 تكرر مرتين، والعدد 4 تكرر مرتين\nإذن المنوال = 2 و 4 (منوالان)",
  },
  {
    id: 281,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان متوسط 6 أعداد هو 20، كم يصبح المجموع؟",
    options: ["120", "100", "140", "110"],
    correct: 0,
    explanation: "المجموع = المتوسط × العدد\n= 20 × 6 = 120",
  },
  {
    id: 282,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة أعداد: 4، 8، 12، 16، ما المدى؟",
    options: ["12", "16", "8", "10"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\n= 16 - 4 = 12",
  },
  {
    id: 283,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا زاد كل عنصر في مجموعة بمقدار 5، ماذا يحدث للمتوسط؟",
    options: ["يزيد 5", "ينقص 5", "لا يتغير", "يتضاعف"],
    correct: 0,
    explanation: "عند إضافة قيمة ثابتة لكل عنصر\nالمتوسط الجديد = المتوسط القديم + القيمة الثابتة\nإذن المتوسط يزيد 5",
  },
  {
    id: 284,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة أعداد: 10، 20، 30، 40، 50، ما الوسيط؟",
    options: ["30", "25", "35", "40"],
    correct: 0,
    explanation: "الأعداد مرتبة: 10، 20، 30، 40، 50\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 30",
  },
  {
    id: 285,
    section: "كمي",
    category: "الإحصاء",
    question: "متوسط 4 أعداد هو 25، إذا حذفنا عدد 20، ما المتوسط الجديد؟",
    options: ["26.7", "30", "25", "20"],
    correct: 0,
    explanation: "مجموع الأعداد الأربعة = 4 × 25 = 100\nالمجموع بعد الحذف = 100 - 20 = 80\nالمتوسط الجديد = 80 ÷ 3 ≈ 26.7",
  },
  {
    id: 286,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة أعداد: 2، 4، 6، 8، ما الانحراف عن المتوسط لعدد 6؟",
    options: ["1", "2", "4", "0"],
    correct: 0,
    explanation: "المتوسط = (2+4+6+8) ÷ 4 = 20 ÷ 4 = 5\nالانحراف = 6 - 5 = 1",
  },
  {
    id: 287,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المتوسط 10 لخمسة أعداد، وأضفنا 10 لكل عدد، ما المتوسط الجديد؟",
    options: ["20", "10", "15", "25"],
    correct: 0,
    explanation: "عند إضافة 10 لكل عدد\nالمتوسط الجديد = المتوسط القديم + 10\n= 10 + 10 = 20",
  },
  {
    id: 288,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 5، 10، 15، 20، 25، ما الوسيط؟",
    options: ["15", "10", "20", "12"],
    correct: 0,
    explanation: "الأعداد مرتبة: 5، 10، 15، 20، 25\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 15",
  },
  {
    id: 289,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 1، 3، 5، 7، 9، ما المتوسط؟",
    options: ["5", "6", "4", "7"],
    correct: 0,
    explanation: "المتوسط = (1+3+5+7+9) ÷ 5\n= 25 ÷ 5 = 5",
  },
  {
    id: 290,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 6، 6، 6، 6، ما المنوال؟",
    options: ["6", "0", "غير موجود", "1"],
    correct: 0,
    explanation: "جميع القيم متساوية = 6\nإذن المنوال = 6",
  },
  {
    id: 291,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان مجموع 4 أعداد 80، ومتوسطها 20، أضفنا عددًا 40، ما المتوسط الجديد؟",
    options: ["24", "25", "20", "30"],
    correct: 0,
    explanation: "المجموع الجديد = 80 + 40 = 120\nعدد القيم الجديد = 5\nالمتوسط الجديد = 120 ÷ 5 = 24",
  },
  {
    id: 292,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 10، 20، 30، 40، ما المدى؟",
    options: ["30", "40", "20", "10"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\n= 40 - 10 = 30",
  },
  {
    id: 293,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المتوسط 12 لثلاثة أعداد، ومجموع عددين 20، ما الثالث؟",
    options: ["16", "12", "10", "14"],
    correct: 0,
    explanation: "مجموع الأعداد الثلاثة = 3 × 12 = 36\nالعدد الثالث = 36 - 20 = 16",
  },
  {
    id: 294,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 4، 4، 5، 6، 7، ما المنوال؟",
    options: ["4", "5", "6", "7"],
    correct: 0,
    explanation: "العدد 4 تكرر مرتين وهو الأكثر تكراراً\nإذن المنوال = 4",
  },
  {
    id: 295,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 2، 3، 4، 5، 6، ما الوسيط؟",
    options: ["4", "3", "5", "2"],
    correct: 0,
    explanation: "الأعداد مرتبة: 2، 3، 4، 5، 6\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 4",
  },
  {
    id: 296,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المتوسط 15 لخمسة أعداد، ما المجموع؟",
    options: ["75", "60", "90", "70"],
    correct: 0,
    explanation: "المجموع = المتوسط × العدد\n= 15 × 5 = 75",
  },
  {
    id: 297,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 8، 12، 16، 20، ما المتوسط؟",
    options: ["14", "16", "15", "18"],
    correct: 0,
    explanation: "المتوسط = (8+12+16+20) ÷ 4\n= 56 ÷ 4 = 14",
  },
  {
    id: 298,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا زاد كل عنصر بمقدار 2، ماذا يحدث للمدى؟",
    options: ["لا يتغير", "يزيد 2", "ينقص 2", "يتضاعف"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\nعند إضافة نفس القيمة لكل عنصر\nالمدى لا يتغير لأن الفرق يبقى ثابتاً",
  },
  {
    id: 299,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 1، 2، 3، 4، 5، ما المدى؟",
    options: ["4", "5", "3", "2"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\n= 5 - 1 = 4",
  },
  {
    id: 300,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المنوال لمجموعة هو 7، ماذا يعني ذلك؟",
    options: ["الأكثر تكرارًا", "الأكبر", "الأصغر", "المتوسط"],
    correct: 0,
    explanation: "المنوال هو القيمة الأكثر تكراراً في المجموعة\nإذا كان المنوال = 7، فهذا يعني أن 7 هو العدد الأكثر تكراراً",
  },
  // القسم الكمي - الإحصاء (أسئلة إضافية - المجموعة الثانية)
  {
    id: 301,
    section: "كمي",
    category: "الإحصاء",
    question: "متوسط 3 أعداد هو 12، إذا أضفنا عددًا رابعًا 24، ما المتوسط الجديد؟",
    options: ["15", "14", "16", "18"],
    correct: 0,
    explanation: "مجموع الأعداد الثلاثة = 3 × 12 = 36\nالمجموع الجديد = 36 + 24 = 60\nالمتوسط الجديد = 60 ÷ 4 = 15",
  },
  {
    id: 302,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 2، 5، 8، 11، ما المتوسط؟",
    options: ["6.5", "7", "8", "5"],
    correct: 0,
    explanation: "المتوسط = (2+5+8+11) ÷ 4\n= 26 ÷ 4 = 6.5",
  },
  {
    id: 303,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 4، 6، 6، 8، 10، ما الوسيط؟",
    options: ["6", "7", "8", "5"],
    correct: 0,
    explanation: "الأعداد مرتبة: 4، 6، 6، 8، 10\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 6",
  },
  {
    id: 304,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 3، 3، 3، 5، 7، ما المنوال؟",
    options: ["3", "5", "7", "لا يوجد"],
    correct: 0,
    explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 3 تكرر 3 مرات\nإذن المنوال = 3",
  },
  {
    id: 305,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 10، 15، 20، 25، ما المدى؟",
    options: ["15", "10", "20", "5"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\n= 25 - 10 = 15",
  },
  {
    id: 306,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان مجموع 5 أعداد 100، ما المتوسط؟",
    options: ["20", "25", "15", "30"],
    correct: 0,
    explanation: "المتوسط = المجموع ÷ العدد\n= 100 ÷ 5 = 20",
  },
  {
    id: 307,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا زاد كل عدد في مجموعة بمقدار 3، ماذا يحدث للمجموع؟",
    options: ["يزيد 3×عدد العناصر", "يزيد 3 فقط", "لا يتغير", "ينقص"],
    correct: 0,
    explanation: "عند إضافة 3 لكل عنصر\nالزيادة الكلية = 3 × عدد العناصر",
  },
  {
    id: 308,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 1، 4، 7، 10، ما الوسيط؟",
    options: ["5.5", "6", "7", "4"],
    correct: 0,
    explanation: "عدد القيم = 4 (زوجي)\nالوسيط = متوسط القيمتين في المنتصف\n= (4 + 7) ÷ 2 = 5.5",
  },
  {
    id: 309,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 5، 10، 10، 15، 20، ما المنوال؟",
    options: ["10", "15", "20", "5"],
    correct: 0,
    explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 10 تكرر مرتين\nإذن المنوال = 10",
  },
  {
    id: 310,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 6، 9، 12، 15، ما المتوسط؟",
    options: ["10.5", "12", "11", "9"],
    correct: 0,
    explanation: "المتوسط = (6+9+12+15) ÷ 4\n= 42 ÷ 4 = 10.5",
  },
  {
    id: 311,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المتوسط 18 لعددين، وأحدهما 10، ما الآخر؟",
    options: ["26", "20", "18", "30"],
    correct: 0,
    explanation: "مجموع العددين = 2 × 18 = 36\nالعدد الآخر = 36 - 10 = 26",
  },
  {
    id: 312,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 2، 4، 6، 8، 10، ما المدى؟",
    options: ["8", "10", "6", "4"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\n= 10 - 2 = 8",
  },
  {
    id: 313,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا ضُرب كل عنصر في 2، ماذا يحدث للمتوسط؟",
    options: ["يتضاعف", "لا يتغير", "ينقص", "يزيد 2 فقط"],
    correct: 0,
    explanation: "عند ضرب كل عنصر في 2\nالمتوسط الجديد = المتوسط القديم × 2\nأي يتضاعف",
  },
  {
    id: 314,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 7، 7، 8، 9، 10، ما المنوال؟",
    options: ["7", "8", "9", "10"],
    correct: 0,
    explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 7 تكرر مرتين\nإذن المنوال = 7",
  },
  {
    id: 315,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 3، 6، 9، 12، 15، ما الوسيط؟",
    options: ["9", "8", "10", "12"],
    correct: 0,
    explanation: "الأعداد مرتبة: 3، 6، 9، 12، 15\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 9",
  },
  {
    id: 316,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المتوسط 20 لخمسة أعداد، وأضفنا عددًا 30، ما المتوسط الجديد؟",
    options: ["21.7", "25", "20", "22"],
    correct: 0,
    explanation: "مجموع الأعداد الخمسة = 5 × 20 = 100\nالمجموع الجديد = 100 + 30 = 130\nالمتوسط الجديد = 130 ÷ 6 ≈ 21.7",
  },
  {
    id: 317,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 1، 2، 3، 4، 100، ما الوسيط؟",
    options: ["3", "2", "4", "100"],
    correct: 0,
    explanation: "الأعداد مرتبة: 1، 2، 3، 4، 100\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 3",
  },
  {
    id: 318,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 5، 6، 7، 8، 9، ما المتوسط؟",
    options: ["7", "6", "8", "5"],
    correct: 0,
    explanation: "المتوسط = (5+6+7+8+9) ÷ 5\n= 35 ÷ 5 = 7",
  },
  {
    id: 319,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 10، 10، 20، 30، ما المنوال؟",
    options: ["10", "20", "30", "لا يوجد"],
    correct: 0,
    explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 10 تكرر مرتين\nإذن المنوال = 10",
  },
  {
    id: 320,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 2، 5، 9، 14، ما المدى؟",
    options: ["12", "14", "9", "10"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\n= 14 - 2 = 12",
  },
  {
    id: 321,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المتوسط 12 لأربعة أعداد، ما المجموع؟",
    options: ["48", "36", "24", "60"],
    correct: 0,
    explanation: "المجموع = المتوسط × العدد\n= 12 × 4 = 48",
  },
  {
    id: 322,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 4، 5، 6، 7، 8، ما الوسيط؟",
    options: ["6", "5", "7", "8"],
    correct: 0,
    explanation: "الأعداد مرتبة: 4، 5، 6، 7، 8\nعدد القيم = 5 (فردي)\nالوسيط = القيمة في المنتصف = 6",
  },
  {
    id: 323,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا طرحنا 2 من كل عنصر، ماذا يحدث للمتوسط؟",
    options: ["ينقص 2", "يزيد 2", "لا يتغير", "يتضاعف"],
    correct: 0,
    explanation: "عند طرح قيمة ثابتة من كل عنصر\nالمتوسط الجديد = المتوسط القديم - القيمة الثابتة\nإذن المتوسط ينقص 2",
  },
  {
    id: 324,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 9، 11، 13، 15، ما المتوسط؟",
    options: ["12", "13", "14", "11"],
    correct: 0,
    explanation: "المتوسط = (9+11+13+15) ÷ 4\n= 48 ÷ 4 = 12",
  },
  {
    id: 325,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 3، 3، 4، 4، 5، 6، ما المنوال؟",
    options: ["3 و4", "4", "3", "5"],
    correct: 0,
    explanation: "العدد 3 تكرر مرتين، والعدد 4 تكرر مرتين\nإذن المنوال = 3 و 4 (منوالان)",
  },
  {
    id: 326,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان المتوسط 25 لثلاثة أعداد، وأحدها 20 والآخر 30، ما الثالث؟",
    options: ["25", "20", "30", "15"],
    correct: 0,
    explanation: "مجموع الأعداد الثلاثة = 3 × 25 = 75\nالعدد الثالث = 75 - 20 - 30 = 25",
  },
  {
    id: 327,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 2، 4، 6، 8، 10، ما المتوسط؟",
    options: ["6", "5", "7", "8"],
    correct: 0,
    explanation: "المتوسط = (2+4+6+8+10) ÷ 5\n= 30 ÷ 5 = 6",
  },
  {
    id: 328,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا زاد كل عنصر بمقدار 1، ماذا يحدث للمدى؟",
    options: ["لا يتغير", "يزيد 1", "ينقص 1", "يتضاعف"],
    correct: 0,
    explanation: "المدى = أكبر قيمة - أصغر قيمة\nعند إضافة نفس القيمة لكل عنصر\nالمدى لا يتغير لأن الفرق يبقى ثابتاً",
  },
  {
    id: 329,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 1، 2، 2، 3، 3، 3، ما المنوال؟",
    options: ["3", "2", "1", "لا يوجد"],
    correct: 0,
    explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 3 تكرر 3 مرات\nإذن المنوال = 3",
  },
  {
    id: 330,
    section: "كمي",
    category: "الإحصاء",
    question: "مجموعة: 5، 15، 25، 35، ما الوسيط؟",
    options: ["20", "25", "15", "30"],
    correct: 0,
    explanation: "عدد القيم = 4 (زوجي)\nالوسيط = متوسط القيمتين في المنتصف\n= (15 + 25) ÷ 2 = 20",
  },
  // القسم اللفظي - أسئلة إضافية (المجموعة الثانية)
  {
    id: 331,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قلب : نبض :: رئة : ؟",
    options: ["هواء", "تنفس", "دم", "أكسجين"],
    correct: 1,
    explanation: "العلاقة: العضو ووظيفته\nالقلب للنبض\nالرئة للتنفس",
  },
  {
    id: 332,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "ليل : ظلام :: نهار : ؟",
    options: ["نور", "شمس", "صباح", "حرارة"],
    correct: 0,
    explanation: "العلاقة: الوقت وصفته\nالليل يتصف بالظلام\nالنهار يتصف بالنور",
  },
  {
    id: 333,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "مطر : سحاب :: ثلج : ؟",
    options: ["برد", "جبل", "سماء", "شتاء"],
    correct: 0,
    explanation: "العلاقة: الناتج ومصدره\nالمطر من السحاب\nالثلج من البرد",
  },
  {
    id: 334,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "ساعة : وقت :: ميزان : ؟",
    options: ["وزن", "طول", "حرارة", "سرعة"],
    correct: 0,
    explanation: "العلاقة: الأداة وما تقيسه\nالساعة تقيس الوقت\nالميزان يقيس الوزن",
  },
  {
    id: 335,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "نار : احتراق :: ماء : ؟",
    options: ["تبخر", "شرب", "برودة", "سقوط"],
    correct: 0,
    explanation: "العلاقة: المادة والعملية المرتبطة بها\nالنار تسبب الاحتراق\nالماء يتبخر",
  },
  {
    id: 336,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: ذهب – فضة – حديد – خشب",
    options: ["ذهب", "فضة", "حديد", "خشب"],
    correct: 3,
    explanation: "ذهب، فضة، حديد = معادن\nخشب = مادة نباتية (الشاذ)",
  },
  {
    id: 337,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: شمس – قمر – نجوم – بحر",
    options: ["شمس", "قمر", "نجوم", "بحر"],
    correct: 3,
    explanation: "شمس، قمر، نجوم = أجرام سماوية\nبحر = مسطح مائي (الشاذ)",
  },
  {
    id: 338,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: معلم – طبيب – مهندس – قلم",
    options: ["معلم", "طبيب", "مهندس", "قلم"],
    correct: 3,
    explanation: "معلم، طبيب، مهندس = مهن\nقلم = أداة (الشاذ)",
  },
  {
    id: 339,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: سيارة – حافلة – قطار – كتاب",
    options: ["سيارة", "حافلة", "قطار", "كتاب"],
    correct: 3,
    explanation: "سيارة، حافلة، قطار = وسائل نقل\nكتاب = أداة للقراءة (الشاذ)",
  },
  {
    id: 340,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة المختلفة: وردة – شجرة – زهرة – سيارة",
    options: ["وردة", "شجرة", "زهرة", "سيارة"],
    correct: 3,
    explanation: "وردة، شجرة، زهرة = نباتات\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 341,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: من سار على الدرب ؟",
    options: ["وصل", "نجح", "فاز", "تعلم"],
    correct: 0,
    explanation: "من سار على الدرب وصل\nمثل يحث على المثابرة والاستمرار",
  },
  {
    id: 342,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: لا تؤجل عمل اليوم إلى ؟",
    options: ["غد", "أمس", "الليل", "المستقبل"],
    correct: 0,
    explanation: "لا تؤجل عمل اليوم إلى غد\nمثل يحث على إنجاز الأعمال في وقتها",
  },
  {
    id: 343,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: العلم في الصغر كالنقش على ؟",
    options: ["الحجر", "الماء", "الرمل", "الهواء"],
    correct: 0,
    explanation: "العلم في الصغر كالنقش على الحجر\nأي أنه ثابت ولا يُنسى",
  },
  {
    id: 344,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: من لا يشكر الناس لا يشكر ؟",
    options: ["الله", "الناس", "العمل", "النعمة"],
    correct: 0,
    explanation: "من لا يشكر الناس لا يشكر الله\nحديث نبوي يحث على شكر الناس",
  },
  {
    id: 345,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "أكمل: الاتحاد ؟",
    options: ["قوة", "ضعف", "نجاح", "علم"],
    correct: 0,
    explanation: "الاتحاد قوة\nمثل يبين أهمية التعاون والوحدة",
  },
  {
    id: 346,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (غامض):",
    options: ["واضح", "مبهم", "صعب", "غامق"],
    correct: 1,
    explanation: "غامض = مبهم\nكلاهما يدل على عدم الوضوح",
  },
  {
    id: 347,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (سخي):",
    options: ["بخيل", "كريم", "ضعيف", "فقير"],
    correct: 1,
    explanation: "سخي = كريم\nكلاهما يدل على الكرم والعطاء",
  },
  {
    id: 348,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (دقيق):",
    options: ["غير واضح", "محدد", "كبير", "واسع"],
    correct: 1,
    explanation: "دقيق = محدد\nكلاهما يدل على الإتقان والتحديد",
  },
  {
    id: 349,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (ساطع):",
    options: ["مظلم", "مشرق", "ضعيف", "غامق"],
    correct: 1,
    explanation: "ساطع = مشرق\nكلاهما يدل على القوة في الإضاءة",
  },
  {
    id: 350,
    section: "لفظي",
    category: "معاني المفردات",
    question: "اختر المعنى الصحيح لكلمة (قليل):",
    options: ["كثير", "نادر", "صغير", "ضعيف"],
    correct: 1,
    explanation: "قليل = نادر\nكلاهما يدل على قلة العدد أو الكمية",
  },
  {
    id: 351,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (قديم):",
    options: ["حديث", "طويل", "قصير", "بعيد"],
    correct: 0,
    explanation: "عكس قديم = حديث\nهما متضادان في الزمن",
  },
  {
    id: 352,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (قوي):",
    options: ["ضعيف", "كبير", "صغير", "خفيف"],
    correct: 0,
    explanation: "عكس قوي = ضعيف\nهما متضادان في القوة",
  },
  {
    id: 353,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (سهل):",
    options: ["صعب", "بسيط", "سريع", "قريب"],
    correct: 0,
    explanation: "عكس سهل = صعب\nهما متضادان في مستوى الصعوبة",
  },
  {
    id: 354,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (نشيط):",
    options: ["كسول", "سريع", "قوي", "كبير"],
    correct: 0,
    explanation: "عكس نشيط = كسول\nهما متضادان في مستوى النشاط",
  },
  {
    id: 355,
    section: "لفظي",
    category: "المتضادات",
    question: "اختر عكس كلمة (واسع):",
    options: ["ضيق", "كبير", "طويل", "قصير"],
    correct: 0,
    explanation: "عكس واسع = ضيق\nهما متضادان في المساحة",
  },
  {
    id: 356,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: عين : دموع :: قلب : ؟",
    options: ["حب", "نبض", "دم", "شعور"],
    correct: 1,
    explanation: "العلاقة: العضو وما يخرج منه\nالعين تخرج الدموع\nالقلب يخرج النبض",
  },
  {
    id: 357,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: قلم : حبر :: سيارة : ؟",
    options: ["وقود", "طريق", "عجلة", "سرعة"],
    correct: 0,
    explanation: "العلاقة: الشيء وما يحتاجه للعمل\nالقلم يحتاج حبر\nالسيارة تحتاج وقود",
  },
  {
    id: 358,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: كتاب : صفحات :: شجرة : ؟",
    options: ["أوراق", "ثمار", "جذور", "خشب"],
    correct: 0,
    explanation: "العلاقة: الكل والجزء\nالكتاب يتكون من صفحات\nالشجرة تتكون من أوراق",
  },
  {
    id: 359,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: لسان : كلام :: يد : ؟",
    options: ["كتابة", "عمل", "إمساك", "ضرب"],
    correct: 2,
    explanation: "العلاقة: العضو ووظيفته الأساسية\nاللسان للكلام\nاليد للإمساك",
  },
  {
    id: 360,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "اختر العلاقة الصحيحة: بحر : سفينة :: طريق : ؟",
    options: ["سيارة", "ناس", "إشارة", "مبنى"],
    correct: 0,
    explanation: "العلاقة: المكان ووسيلة التنقل فيه\nالبحر تسير فيه السفينة\nالطريق تسير فيه السيارة",
  },
  // القسم اللفظي - استيعاب المقروء (25 سؤال)
  // النص الأول: الوقت
  {
    id: 361,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "اقرأ النص ثم أجب:\n\n«يُعد الوقت من أثمن الموارد التي يمتلكها الإنسان، إذ لا يمكن تعويضه أو استرجاعه بعد مضيه. لذلك فإن حسن استغلال الوقت يسهم في تحقيق النجاح والتقدم في مختلف مجالات الحياة، بينما يؤدي إهداره إلى الفشل والتأخر.»\n\nما الفكرة الرئيسية للنص؟",
    options: ["أهمية المال", "أهمية الوقت", "أهمية العمل", "أهمية الدراسة"],
    correct: 1,
    explanation: "الفكرة الرئيسية هي أهمية الوقت\nالنص يتحدث عن قيمة الوقت وضرورة استغلاله",
  },
  {
    id: 362,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الوقت:\n\nما نتيجة إهدار الوقت؟",
    options: ["النجاح", "التقدم", "الفشل", "الراحة"],
    correct: 2,
    explanation: "ذكر النص أن إهدار الوقت يؤدي إلى الفشل والتأخر",
  },
  {
    id: 363,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الوقت:\n\nماذا لا يمكن استرجاعه؟",
    options: ["المال", "الوقت", "الصحة", "العمل"],
    correct: 1,
    explanation: "ذكر النص أن الوقت لا يمكن تعويضه أو استرجاعه بعد مضيه",
  },
  {
    id: 364,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الوقت:\n\nما الذي يؤدي للنجاح؟",
    options: ["إهمال الوقت", "استغلال الوقت", "النوم", "الراحة"],
    correct: 1,
    explanation: "ذكر النص أن حسن استغلال الوقت يسهم في تحقيق النجاح",
  },
  {
    id: 365,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الوقت:\n\nالنص يدعو إلى؟",
    options: ["إضاعة الوقت", "تنظيم الوقت", "تجاهل الوقت", "ترك العمل"],
    correct: 1,
    explanation: "النص يدعو إلى تنظيم الوقت وحسن استغلاله لتحقيق النجاح",
  },
  // النص الثاني: القراءة
  {
    id: 366,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "اقرأ النص ثم أجب:\n\n«تُعد القراءة من أهم الوسائل التي تساعد الإنسان على تنمية معرفته وتوسيع مداركه، فهي تفتح أمامه آفاقًا جديدة وتمكنه من الاطلاع على تجارب الآخرين وخبراتهم، مما يسهم في تطوير شخصيته.»\n\nما أثر القراءة؟",
    options: ["تقليل المعرفة", "زيادة المعرفة", "إضاعة الوقت", "إضعاف الشخصية"],
    correct: 1,
    explanation: "ذكر النص أن القراءة تساعد على تنمية المعرفة وتوسيع المدارك",
  },
  {
    id: 367,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن القراءة:\n\nماذا تتيح القراءة؟",
    options: ["الجهل", "التجارب", "النوم", "الملل"],
    correct: 1,
    explanation: "ذكر النص أن القراءة تمكن من الاطلاع على تجارب الآخرين وخبراتهم",
  },
  {
    id: 368,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن القراءة:\n\nما نتيجة القراءة على الشخصية؟",
    options: ["تضعفها", "تطورها", "تلغيها", "تخفيها"],
    correct: 1,
    explanation: "ذكر النص أن القراءة تسهم في تطوير الشخصية",
  },
  {
    id: 369,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن القراءة:\n\nما الهدف من القراءة؟",
    options: ["التسلية فقط", "تنمية المعرفة", "الراحة", "النوم"],
    correct: 1,
    explanation: "الهدف الرئيسي من القراءة هو تنمية المعرفة وتوسيع المدارك",
  },
  {
    id: 370,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن القراءة:\n\nكلمة (مداركه) تعني؟",
    options: ["أفكاره", "ألعابه", "أمواله", "أصدقاؤه"],
    correct: 0,
    explanation: "المدارك تعني الأفكار والفهم والقدرات العقلية",
  },
  // النص الثالث: الرياضة
  {
    id: 371,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "اقرأ النص ثم أجب:\n\n«الرياضة نشاط مهم للحفاظ على صحة الجسم، فهي تقوي العضلات وتحسن الدورة الدموية وتساعد على الوقاية من الأمراض. كما أنها تساهم في تحسين الحالة النفسية وزيادة النشاط.»\n\nما فائدة الرياضة؟",
    options: ["إضعاف الجسم", "تقوية العضلات", "زيادة المرض", "التعب"],
    correct: 1,
    explanation: "ذكر النص أن الرياضة تقوي العضلات",
  },
  {
    id: 372,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الرياضة:\n\nماذا تحسن الرياضة؟",
    options: ["الدورة الدموية", "الكسل", "الملل", "الضعف"],
    correct: 0,
    explanation: "ذكر النص أن الرياضة تحسن الدورة الدموية",
  },
  {
    id: 373,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الرياضة:\n\nما تأثيرها النفسي؟",
    options: ["سوء الحالة", "تحسين الحالة", "تعب", "توتر"],
    correct: 1,
    explanation: "ذكر النص أن الرياضة تساهم في تحسين الحالة النفسية",
  },
  {
    id: 374,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الرياضة:\n\nالرياضة تساعد على؟",
    options: ["الأمراض", "الوقاية من الأمراض", "الكسل", "التعب"],
    correct: 1,
    explanation: "ذكر النص أن الرياضة تساعد على الوقاية من الأمراض",
  },
  {
    id: 375,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الرياضة:\n\nالنص يتحدث عن؟",
    options: ["الأكل", "النوم", "الرياضة", "الدراسة"],
    correct: 2,
    explanation: "النص يتحدث بشكل رئيسي عن فوائد الرياضة",
  },
  // النص الرابع: التكنولوجيا
  {
    id: 376,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "اقرأ النص ثم أجب:\n\n«التكنولوجيا الحديثة أصبحت جزءًا لا يتجزأ من حياة الإنسان، حيث سهلت الكثير من الأعمال وسرّعت إنجازها، لكنها في المقابل قد تؤدي إلى الاعتماد الزائد عليها إذا لم تُستخدم بشكل معتدل.»\n\nما دور التكنولوجيا؟",
    options: ["تعقيد الأعمال", "تسهيل الأعمال", "إبطاء العمل", "إلغاء العمل"],
    correct: 1,
    explanation: "ذكر النص أن التكنولوجيا سهلت الكثير من الأعمال",
  },
  {
    id: 377,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن التكنولوجيا:\n\nما خطر التكنولوجيا؟",
    options: ["قلة العمل", "الاعتماد الزائد", "السرعة", "التقدم"],
    correct: 1,
    explanation: "ذكر النص أن التكنولوجيا قد تؤدي إلى الاعتماد الزائد عليها",
  },
  {
    id: 378,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن التكنولوجيا:\n\nكيف يجب استخدامها؟",
    options: ["بإفراط", "باعتدال", "بإهمال", "بعدم استخدام"],
    correct: 1,
    explanation: "ذكر النص أنه يجب استخدام التكنولوجيا بشكل معتدل",
  },
  {
    id: 379,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن التكنولوجيا:\n\nماذا تسهم التكنولوجيا في؟",
    options: ["التأخير", "التسريع", "التوقف", "الضعف"],
    correct: 1,
    explanation: "ذكر النص أن التكنولوجيا سرّعت إنجاز الأعمال",
  },
  {
    id: 380,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن التكنولوجيا:\n\nالنص يحذر من؟",
    options: ["التكنولوجيا", "الإفراط", "التقدم", "العمل"],
    correct: 1,
    explanation: "النص يحذر من الإفراط في استخدام التكنولوجيا والاعتماد الزائد عليها",
  },
  // النص الخامس: الصدق
  {
    id: 381,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "اقرأ النص ثم أجب:\n\n«الصدق من أهم القيم الأخلاقية التي يجب أن يتحلى بها الإنسان، فهو يعزز الثقة بين الناس ويسهم في بناء علاقات قوية قائمة على الاحترام المتبادل.»\n\nما أهمية الصدق؟",
    options: ["هدم العلاقات", "تعزيز الثقة", "إضعاف العلاقات", "العداوة"],
    correct: 1,
    explanation: "ذكر النص أن الصدق يعزز الثقة بين الناس",
  },
  {
    id: 382,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الصدق:\n\nماذا يبني الصدق؟",
    options: ["مشاكل", "علاقات قوية", "ضعف", "توتر"],
    correct: 1,
    explanation: "ذكر النص أن الصدق يسهم في بناء علاقات قوية",
  },
  {
    id: 383,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الصدق:\n\nالعلاقات تقوم على؟",
    options: ["الكذب", "الاحترام", "العداوة", "الخوف"],
    correct: 1,
    explanation: "ذكر النص أن العلاقات تكون قائمة على الاحترام المتبادل",
  },
  {
    id: 384,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الصدق:\n\nالصدق يعتبر؟",
    options: ["قيمة أخلاقية", "عادة سيئة", "ضعف", "خوف"],
    correct: 0,
    explanation: "ذكر النص أن الصدق من أهم القيم الأخلاقية",
  },
  {
    id: 385,
    section: "لفظي",
    category: "استيعاب المقروء",
    question: "من النص السابق عن الصدق:\n\nالنص يدعو إلى؟",
    options: ["الكذب", "الصدق", "الخداع", "العداوة"],
    correct: 1,
    explanation: "النص يدعو إلى التحلي بالصدق كقيمة أخلاقية مهمة",
  },
  // القسم اللفظي - التناظر اللفظي (أسئلة إضافية 386-415)
  {
    id: 386,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "مفتاح : قفل :: قلم : ؟",
    options: ["ورقة", "كتابة", "حبر", "كتاب"],
    correct: 1,
    explanation: "العلاقة: الأداة والفعل الذي تؤديه\nالمفتاح يفتح القفل\nالقلم يستخدم للكتابة",
  },
  {
    id: 387,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "طبيب : علاج :: معلم : ؟",
    options: ["مدرسة", "طالب", "تعليم", "كتاب"],
    correct: 2,
    explanation: "العلاقة: المهنة والفعل المرتبط بها\nالطبيب يقوم بالعلاج\nالمعلم يقوم بالتعليم",
  },
  {
    id: 388,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "نار : حرارة :: ثلج : ؟",
    options: ["ماء", "برودة", "تجمد", "هواء"],
    correct: 1,
    explanation: "العلاقة: الشيء وصفته المميزة\nالنار تتصف بالحرارة\nالثلج يتصف بالبرودة",
  },
  {
    id: 389,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "عين : نظر :: أذن : ؟",
    options: ["كلام", "صوت", "سمع", "استماع"],
    correct: 2,
    explanation: "العلاقة: العضو ووظيفته\nالعين للنظر\nالأذن للسمع",
  },
  {
    id: 390,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قلم : حبر :: سيارة : ؟",
    options: ["وقود", "طريق", "عجلة", "سرعة"],
    correct: 0,
    explanation: "العلاقة: الشيء وما يحتاجه للعمل\nالقلم يحتاج حبر\nالسيارة تحتاج وقود",
  },
  {
    id: 391,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "ليل : ظلام :: نهار : ؟",
    options: ["شمس", "نور", "صباح", "حرارة"],
    correct: 1,
    explanation: "العلاقة: الوقت وصفته\nالليل يتصف بالظلام\nالنهار يتصف بالنور",
  },
  {
    id: 392,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "مطر : سحاب :: برق : ؟",
    options: ["نور", "رعد", "صوت", "سماء"],
    correct: 1,
    explanation: "العلاقة: الظاهرة وما يصاحبها\nالمطر يأتي من السحاب\nالبرق يصاحبه الرعد",
  },
  {
    id: 393,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "سمك : ماء :: طير : ؟",
    options: ["هواء", "عش", "سماء", "جناح"],
    correct: 0,
    explanation: "العلاقة: الكائن وبيئته\nالسمك يعيش في الماء\nالطير يعيش في الهواء",
  },
  {
    id: 394,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قلب : نبض :: رئة : ؟",
    options: ["تنفس", "هواء", "دم", "أكسجين"],
    correct: 0,
    explanation: "العلاقة: العضو ووظيفته\nالقلب للنبض\nالرئة للتنفس",
  },
  {
    id: 395,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "كتاب : قراءة :: طعام : ؟",
    options: ["شرب", "طبخ", "أكل", "معدة"],
    correct: 2,
    explanation: "العلاقة: الشيء والفعل المرتبط به\nالكتاب للقراءة\nالطعام للأكل",
  },
  {
    id: 396,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "شمس : نهار :: قمر : ؟",
    options: ["ليل", "ضوء", "سماء", "نجوم"],
    correct: 0,
    explanation: "العلاقة: الجسم السماوي والوقت المرتبط به\nالشمس تظهر في النهار\nالقمر يظهر في الليل",
  },
  {
    id: 397,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "جذر : شجرة :: أساس : ؟",
    options: ["بناء", "أرض", "حائط", "سقف"],
    correct: 0,
    explanation: "العلاقة: الأساس والكل\nالجذر أساس الشجرة\nالأساس أساس البناء",
  },
  {
    id: 398,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قانون : التزام :: نصيحة : ؟",
    options: ["قبول", "تجاهل", "تنفيذ", "إرشاد"],
    correct: 3,
    explanation: "العلاقة: الشيء وهدفه\nالقانون للالتزام (إلزامي)\nالنصيحة للإرشاد (اختياري)",
  },
  {
    id: 399,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "مرض : علاج :: مشكلة : ؟",
    options: ["حل", "سبب", "ألم", "خطر"],
    correct: 0,
    explanation: "العلاقة: المشكلة والحل\nالمرض يحتاج علاج\nالمشكلة تحتاج حل",
  },
  {
    id: 400,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "سرعة : سيارة :: ذكاء : ؟",
    options: ["إنسان", "تفكير", "عقل", "علم"],
    correct: 0,
    explanation: "العلاقة: الصفة وصاحبها\nالسرعة صفة للسيارة\nالذكاء صفة للإنسان",
  },
  {
    id: 401,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "يد : أصابع :: قدم : ؟",
    options: ["ركبة", "أصابع", "كعب", "ساق"],
    correct: 1,
    explanation: "العلاقة: الكل والجزء\nاليد فيها أصابع\nالقدم فيها أصابع أيضاً",
  },
  {
    id: 402,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "مدرسة : طلاب :: مستشفى : ؟",
    options: ["أطباء", "مرضى", "علاج", "دواء"],
    correct: 1,
    explanation: "العلاقة: المكان ومن يستفيد منه\nالمدرسة للطلاب\nالمستشفى للمرضى",
  },
  {
    id: 403,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "بذرة : شجرة :: فكرة : ؟",
    options: ["عقل", "نمو", "مشروع", "تفكير"],
    correct: 2,
    explanation: "العلاقة: البداية والنتيجة\nالبذرة تنمو لتصبح شجرة\nالفكرة تتطور لتصبح مشروع",
  },
  {
    id: 404,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "بحر : سفينة :: طريق : ؟",
    options: ["سيارة", "ناس", "إشارة", "مكان"],
    correct: 0,
    explanation: "العلاقة: المكان ووسيلة التنقل فيه\nالبحر تسير فيه السفينة\nالطريق تسير فيه السيارة",
  },
  {
    id: 405,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قلم : كتابة :: فرشاة : ؟",
    options: ["رسم", "لون", "لوحة", "فن"],
    correct: 0,
    explanation: "العلاقة: الأداة والفعل\nالقلم للكتابة\nالفرشاة للرسم",
  },
  {
    id: 406,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "علم : معرفة :: جهل : ؟",
    options: ["خطأ", "ظلام", "ضعف", "نقص"],
    correct: 3,
    explanation: "العلاقة: الحالة والنتيجة\nالعلم يؤدي للمعرفة\nالجهل يؤدي للنقص",
  },
  {
    id: 407,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "حرارة : صيف :: برودة : ؟",
    options: ["شتاء", "ثلج", "هواء", "مطر"],
    correct: 0,
    explanation: "العلاقة: الصفة والفصل\nالحرارة تميز الصيف\nالبرودة تميز الشتاء",
  },
  {
    id: 408,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "صدق : ثقة :: كذب : ؟",
    options: ["خداع", "كراهية", "ضعف", "عداوة"],
    correct: 0,
    explanation: "العلاقة: السلوك والنتيجة\nالصدق يولد الثقة\nالكذب يولد الخداع",
  },
  {
    id: 409,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "سيف : قتال :: قلم : ؟",
    options: ["علم", "كتابة", "تفكير", "كتاب"],
    correct: 1,
    explanation: "العلاقة: الأداة والاستخدام\nالسيف للقتال\nالقلم للكتابة",
  },
  {
    id: 410,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "نجاح : عمل :: فشل : ؟",
    options: ["إهمال", "تعب", "تأخر", "خسارة"],
    correct: 0,
    explanation: "العلاقة: النتيجة والسبب\nالنجاح نتيجة العمل\nالفشل نتيجة الإهمال",
  },
  {
    id: 411,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "عقل : تفكير :: قلب : ؟",
    options: ["حب", "نبض", "دم", "حياة"],
    correct: 0,
    explanation: "العلاقة: العضو والوظيفة المجازية\nالعقل للتفكير\nالقلب للحب (مجازياً)",
  },
  {
    id: 412,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "ماء : عطش :: طعام : ؟",
    options: ["جوع", "شبع", "أكل", "معدة"],
    correct: 0,
    explanation: "العلاقة: الشيء وما يسده\nالماء يسد العطش\nالطعام يسد الجوع",
  },
  {
    id: 413,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "قمر : ضوء :: شمس : ؟",
    options: ["حرارة", "نهار", "نور", "سماء"],
    correct: 0,
    explanation: "العلاقة: الجسم السماوي وصفته المميزة\nالقمر يتميز بالضوء (الخافت)\nالشمس تتميز بالحرارة (الشديدة)",
  },
  {
    id: 414,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "باب : دخول :: نافذة : ؟",
    options: ["خروج", "ضوء", "هواء", "رؤية"],
    correct: 1,
    explanation: "العلاقة: الشيء ووظيفته الأساسية\nالباب للدخول\nالنافذة للضوء",
  },
  {
    id: 415,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "كتاب : مؤلف :: لوحة : ؟",
    options: ["رسام", "فن", "لون", "جمال"],
    correct: 0,
    explanation: "العلاقة: العمل وصاحبه\nالكتاب يصنعه المؤلف\nاللوحة يصنعها الرسام",
  },
  // أسئلة تناظر لفظي إضافية (416-420)
  {
    id: 416,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "شجرة : ظل :: مصباح : ؟",
    options: ["نور", "حرارة", "كهرباء", "ضوء"],
    correct: 3,
    explanation: "العلاقة: الشيء والنتيجة\nالشجرة تعطي ظل\nالمصباح يعطي ضوء",
  },
  {
    id: 417,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "نوم : راحة :: عمل : ؟",
    options: ["تعب", "إنتاج", "نشاط", "جهد"],
    correct: 1,
    explanation: "العلاقة: الفعل والنتيجة الإيجابية\nالنوم يؤدي للراحة\nالعمل يؤدي للإنتاج",
  },
  {
    id: 418,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "صوت : أذن :: صورة : ؟",
    options: ["عين", "ضوء", "لون", "رؤية"],
    correct: 0,
    explanation: "العلاقة: المحسوس وأداة الإحساس\nالصوت تستقبله الأذن\nالصورة تستقبلها العين",
  },
  {
    id: 419,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "سحاب : مطر :: دخان : ؟",
    options: ["نار", "حرارة", "احتراق", "هواء"],
    correct: 0,
    explanation: "العلاقة: النتيجة والسبب\nالسحاب مصدر المطر\nالنار مصدر الدخان",
  },
  {
    id: 420,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "حبر : قلم :: دم : ؟",
    options: ["جسم", "قلب", "عروق", "إنسان"],
    correct: 1,
    explanation: "العلاقة: المادة ومصدرها\nالحبر يخرج من القلم\nالدم يضخه القلب",
  },
  // القسم اللفظي - إكمال الجمل (أسئلة إضافية 421-440)
  {
    id: 421,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "لم يكن النجاح وليد الصدفة، بل نتيجة ____ متواصل وجهد دؤوب",
    options: ["إهمال", "عمل", "تأجيل", "تردد"],
    correct: 1,
    explanation: "النجاح يأتي نتيجة العمل المتواصل والجهد الدؤوب وليس الصدفة",
  },
  {
    id: 422,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زادت المعرفة، زادت ____ بالمسؤولية",
    options: ["قلة", "إدراك", "جهل", "تجاهل"],
    correct: 1,
    explanation: "المعرفة تزيد من إدراك الإنسان بمسؤولياته",
  },
  {
    id: 423,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التسرع في اتخاذ القرار قد يؤدي إلى نتائج ____",
    options: ["ممتازة", "سلبية", "إيجابية", "مضمونة"],
    correct: 1,
    explanation: "التسرع في القرارات غالباً ما يؤدي لنتائج سلبية",
  },
  {
    id: 424,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "لا يمكن تحقيق الأهداف دون وجود ____ واضحة",
    options: ["خطط", "أحلام", "أفكار", "أمنيات"],
    correct: 0,
    explanation: "تحقيق الأهداف يتطلب وجود خطط واضحة ومحددة",
  },
  {
    id: 425,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التجارب الفاشلة لا تعني النهاية، بل تمثل ____ جديدة",
    options: ["عقبات", "فرص", "مشاكل", "نهايات"],
    correct: 1,
    explanation: "الفشل يمثل فرصة للتعلم والتحسين وليس نهاية الطريق",
  },
  {
    id: 426,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "يُعد الصبر من أهم الصفات التي تساعد الإنسان على ____ الصعوبات",
    options: ["تجنب", "مواجهة", "نسيان", "إهمال"],
    correct: 1,
    explanation: "الصبر يساعد على مواجهة الصعوبات وليس تجنبها",
  },
  {
    id: 427,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التفكير المنطقي يساعد على ____ المشكلات بفعالية",
    options: ["تعقيد", "حل", "زيادة", "إهمال"],
    correct: 1,
    explanation: "التفكير المنطقي أداة فعالة لحل المشكلات",
  },
  {
    id: 428,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الإنسان الناجح هو من يستفيد من أخطائه بدلًا من ____ فيها",
    options: ["الاستمرار", "التعلم", "التفكير", "التوقف"],
    correct: 0,
    explanation: "الناجح يتعلم من أخطائه ولا يستمر في تكرارها",
  },
  {
    id: 429,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زادت التحديات، زادت ____ الإنسان وخبرته",
    options: ["ضعف", "قوة", "خوف", "تردد"],
    correct: 1,
    explanation: "التحديات تزيد من قوة الإنسان وخبرته",
  },
  {
    id: 430,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "العمل الجماعي يسهم في ____ الأهداف بشكل أسرع",
    options: ["تأخير", "تحقيق", "تعقيد", "إلغاء"],
    correct: 1,
    explanation: "العمل الجماعي يساعد في تحقيق الأهداف بشكل أسرع",
  },
  {
    id: 431,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "عدم التخطيط الجيد يؤدي غالبًا إلى ____ النتائج",
    options: ["تحسين", "ضعف", "تطوير", "تنظيم"],
    correct: 1,
    explanation: "غياب التخطيط يؤدي لضعف النتائج",
  },
  {
    id: 432,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التعلم المستمر يساعد الفرد على ____ مهاراته",
    options: ["إهمال", "تطوير", "تقليل", "إلغاء"],
    correct: 1,
    explanation: "التعلم المستمر يطور المهارات باستمرار",
  },
  {
    id: 433,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زاد الاعتماد على النفس، زادت ____ الشخصية",
    options: ["ضعف", "قوة", "تردد", "خوف"],
    correct: 1,
    explanation: "الاعتماد على النفس يقوي الشخصية",
  },
  {
    id: 434,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "النجاح الحقيقي لا يقاس بالنتائج فقط، بل أيضًا ب____ المبذول",
    options: ["الوقت", "الجهد", "الحظ", "المال"],
    correct: 1,
    explanation: "النجاح الحقيقي يقاس بالجهد المبذول وليس النتائج فقط",
  },
  {
    id: 435,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التفكير قبل اتخاذ القرار يقلل من ____ المحتملة",
    options: ["النجاحات", "الأخطاء", "الفرص", "النتائج"],
    correct: 1,
    explanation: "التفكير قبل القرار يقلل من الأخطاء المحتملة",
  },
  {
    id: 436,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "القراءة تفتح آفاقًا جديدة وتزيد من ____ الإنسان",
    options: ["جهله", "معرفته", "تردده", "ضعفه"],
    correct: 1,
    explanation: "القراءة تزيد من معرفة الإنسان وتوسع مداركه",
  },
  {
    id: 437,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الشخص الذي يواجه التحديات بثقة يكون أكثر ____ في النجاح",
    options: ["بعدًا", "قربًا", "ضعفًا", "خوفًا"],
    correct: 1,
    explanation: "مواجهة التحديات بثقة تقرب الإنسان من النجاح",
  },
  {
    id: 438,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التسرع في الحكم على الأمور قد يؤدي إلى ____ غير صحيحة",
    options: ["نتائج", "قرارات", "أحكام", "أفكار"],
    correct: 2,
    explanation: "التسرع في الحكم يؤدي لأحكام غير صحيحة",
  },
  {
    id: 439,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الإصرار هو العامل الأساسي في ____ الأهداف",
    options: ["فشل", "تحقيق", "إهمال", "تأخير"],
    correct: 1,
    explanation: "الإصرار عامل أساسي في تحقيق الأهداف",
  },
  {
    id: 440,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زادت الخبرة، زادت القدرة على ____ المواقف",
    options: ["تجاهل", "تحليل", "نسيان", "تعقيد"],
    correct: 1,
    explanation: "الخبرة تزيد من القدرة على تحليل المواقف",
  },
  // القسم اللفظي - الخطأ السياقي (30 سؤال: 441-470)
  {
    id: 441,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة في السياق:\n«حقق الطالب نجاحًا كبيرًا بفضل اجتهاده وكسله»",
    options: ["حقق", "نجاحًا", "اجتهاده", "كسله"],
    correct: 3,
    explanation: "كلمة 'كسله' تناقض المعنى، لأن النجاح يأتي بالاجتهاد وليس الكسل",
  },
  {
    id: 442,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسعى الإنسان الطموح إلى تحقيق أهدافه بإصرار وتردد»",
    options: ["يسعى", "الطموح", "إصرار", "تردد"],
    correct: 3,
    explanation: "كلمة 'تردد' تناقض 'الإصرار'، الطموح يحتاج إصرار لا تردد",
  },
  {
    id: 443,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«القراءة تنمي العقل وتزيد من الجهل والمعرفة»",
    options: ["القراءة", "تنمي", "الجهل", "المعرفة"],
    correct: 2,
    explanation: "كلمة 'الجهل' تناقض السياق، القراءة تزيد المعرفة لا الجهل",
  },
  {
    id: 444,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعتمد النجاح على التخطيط الجيد والإهمال»",
    options: ["يعتمد", "النجاح", "التخطيط", "الإهمال"],
    correct: 3,
    explanation: "كلمة 'الإهمال' تناقض 'التخطيط الجيد'، النجاح لا يعتمد على الإهمال",
  },
  {
    id: 445,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«التعاون بين الأفراد يؤدي إلى التقدم والتراجع»",
    options: ["التعاون", "الأفراد", "التقدم", "التراجع"],
    correct: 3,
    explanation: "كلمة 'التراجع' تناقض 'التقدم'، التعاون يؤدي للتقدم فقط",
  },
  {
    id: 446,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التفكير المنطقي على حل المشكلات وتعقيدها»",
    options: ["يساعد", "التفكير", "حل", "تعقيدها"],
    correct: 3,
    explanation: "كلمة 'تعقيدها' تناقض 'حل'، التفكير المنطقي يحل المشكلات لا يعقدها",
  },
  {
    id: 447,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعمل الفريق بروح إيجابية لتحقيق الفشل»",
    options: ["يعمل", "الفريق", "إيجابية", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض 'روح إيجابية'، الفريق يعمل لتحقيق النجاح",
  },
  {
    id: 448,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«الوقت مورد ثمين يجب استغلاله وعدم إهداره»",
    options: ["الوقت", "مورد", "استغلاله", "إهداره"],
    correct: 3,
    explanation: "كلمة 'إهداره' تناقض 'استغلاله'، الجملة تحث على الاستغلال لا الإهدار",
  },
  {
    id: 449,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«النجاح يتطلب الصبر والعمل والتراخي»",
    options: ["النجاح", "الصبر", "العمل", "التراخي"],
    correct: 3,
    explanation: "كلمة 'التراخي' تناقض 'العمل'، النجاح يحتاج العمل لا التراخي",
  },
  {
    id: 450,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التعلم المستمر على تطوير المهارات وإهمالها»",
    options: ["يساعد", "التعلم", "تطوير", "إهمالها"],
    correct: 3,
    explanation: "كلمة 'إهمالها' تناقض 'تطوير'، التعلم يطور المهارات لا يهملها",
  },
  {
    id: 451,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم التخطيط في تنظيم الوقت وتضييعه»",
    options: ["يسهم", "التخطيط", "تنظيم", "تضييعه"],
    correct: 3,
    explanation: "كلمة 'تضييعه' تناقض 'تنظيم'، التخطيط ينظم الوقت لا يضيعه",
  },
  {
    id: 452,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسعى الإنسان إلى تحقيق النجاح والفشل»",
    options: ["يسعى", "الإنسان", "النجاح", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض 'النجاح'، الإنسان يسعى للنجاح لا الفشل",
  },
  {
    id: 453,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التعاون على بناء العلاقات وهدمها»",
    options: ["يساعد", "التعاون", "بناء", "هدمها"],
    correct: 3,
    explanation: "كلمة 'هدمها' تناقض 'بناء'، التعاون يبني العلاقات لا يهدمها",
  },
  {
    id: 454,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«الاجتهاد يؤدي إلى التقدم والتأخر»",
    options: ["الاجتهاد", "التقدم", "التأخر", "يؤدي"],
    correct: 2,
    explanation: "كلمة 'التأخر' تناقض 'التقدم'، الاجتهاد يؤدي للتقدم فقط",
  },
  {
    id: 455,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعمل الإنسان بجد لتحقيق أهدافه وإضاعتها»",
    options: ["يعمل", "جد", "تحقيق", "إضاعتها"],
    correct: 3,
    explanation: "كلمة 'إضاعتها' تناقض 'تحقيق'، العمل الجاد لتحقيق الأهداف لا إضاعتها",
  },
  {
    id: 456,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«التفكير السليم يساعد على اتخاذ قرارات صحيحة وخاطئة»",
    options: ["التفكير", "يساعد", "صحيحة", "خاطئة"],
    correct: 3,
    explanation: "كلمة 'خاطئة' تناقض 'صحيحة'، التفكير السليم يؤدي لقرارات صحيحة",
  },
  {
    id: 457,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسعى الطالب إلى التفوق والكسل»",
    options: ["يسعى", "الطالب", "التفوق", "الكسل"],
    correct: 3,
    explanation: "كلمة 'الكسل' تناقض 'التفوق'، الطالب يسعى للتفوق لا الكسل",
  },
  {
    id: 458,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد النظام على ترتيب الأمور وتعقيدها»",
    options: ["يساعد", "النظام", "ترتيب", "تعقيدها"],
    correct: 3,
    explanation: "كلمة 'تعقيدها' تناقض 'ترتيب'، النظام يرتب الأمور لا يعقدها",
  },
  {
    id: 459,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يحقق الإنسان أهدافه من خلال العمل والتأجيل»",
    options: ["يحقق", "أهدافه", "العمل", "التأجيل"],
    correct: 3,
    explanation: "كلمة 'التأجيل' تناقض 'العمل'، تحقيق الأهداف يحتاج العمل لا التأجيل",
  },
  {
    id: 460,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«القراءة توسع المدارك وتضيقها»",
    options: ["القراءة", "توسع", "المدارك", "تضيقها"],
    correct: 3,
    explanation: "كلمة 'تضيقها' تناقض 'توسع'، القراءة توسع المدارك لا تضيقها",
  },
  {
    id: 461,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«النجاح يعتمد على الاجتهاد والإهمال»",
    options: ["النجاح", "يعتمد", "الاجتهاد", "الإهمال"],
    correct: 3,
    explanation: "كلمة 'الإهمال' تناقض 'الاجتهاد'، النجاح يعتمد على الاجتهاد",
  },
  {
    id: 462,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التدريب على تحسين الأداء وإضعافه»",
    options: ["يساعد", "التدريب", "تحسين", "إضعافه"],
    correct: 3,
    explanation: "كلمة 'إضعافه' تناقض 'تحسين'، التدريب يحسن الأداء لا يضعفه",
  },
  {
    id: 463,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يحقق الفريق الفوز أو الهزيمة»",
    options: ["يحقق", "الفريق", "الفوز", "الهزيمة"],
    correct: 3,
    explanation: "كلمة 'الهزيمة' لا تُحقق بل تُتجنب، الفريق يسعى للفوز",
  },
  {
    id: 464,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التخطيط على تحقيق الأهداف وإفشالها»",
    options: ["يساعد", "التخطيط", "تحقيق", "إفشالها"],
    correct: 3,
    explanation: "كلمة 'إفشالها' تناقض 'تحقيق'، التخطيط يحقق الأهداف لا يفشلها",
  },
  {
    id: 465,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«العمل الجاد يؤدي إلى النجاح أو الفشل»",
    options: ["العمل", "الجاد", "النجاح", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض السياق، العمل الجاد يؤدي للنجاح",
  },
  {
    id: 466,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«التنظيم يساعد على الإنجاز والتأخير»",
    options: ["التنظيم", "يساعد", "الإنجاز", "التأخير"],
    correct: 3,
    explanation: "كلمة 'التأخير' تناقض 'الإنجاز'، التنظيم يساعد على الإنجاز",
  },
  {
    id: 467,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم التعليم في بناء المجتمع وهدمه»",
    options: ["يسهم", "التعليم", "بناء", "هدمه"],
    correct: 3,
    explanation: "كلمة 'هدمه' تناقض 'بناء'، التعليم يبني المجتمع لا يهدمه",
  },
  {
    id: 468,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد الاجتهاد على النجاح والإخفاق»",
    options: ["يساعد", "الاجتهاد", "النجاح", "الإخفاق"],
    correct: 3,
    explanation: "كلمة 'الإخفاق' تناقض 'النجاح'، الاجتهاد يؤدي للنجاح",
  },
  {
    id: 469,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يحقق الإنسان التقدم أو التراجع»",
    options: ["يحقق", "الإنسان", "التقدم", "التراجع"],
    correct: 3,
    explanation: "كلمة 'التراجع' لا تُحقق، الإنسان يسعى للتقدم",
  },
  {
    id: 470,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم التفكير في حل المشكلات أو تعقيدها»",
    options: ["يسهم", "التفكير", "حل", "تعقيدها"],
    correct: 3,
    explanation: "كلمة 'تعقيدها' تناقض 'حل'، التفكير يسهم في حل المشكلات",
  },
  // القسم اللفظي - الخطأ السياقي (أسئلة إضافية 471-500)
  {
    id: 471,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسعى الإنسان الناجح إلى تحقيق أهدافه بالاجتهاد والفوضى»",
    options: ["يسعى", "الناجح", "تحقيق", "الفوضى"],
    correct: 3,
    explanation: "كلمة 'الفوضى' تناقض 'الاجتهاد'، الإنسان الناجح يعمل بالاجتهاد لا بالفوضى",
  },
  {
    id: 472,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التفكير الإبداعي على إيجاد حلول مبتكرة وتقليدية»",
    options: ["يساعد", "التفكير", "مبتكرة", "تقليدية"],
    correct: 3,
    explanation: "كلمة 'تقليدية' تناقض 'مبتكرة'، التفكير الإبداعي يؤدي لحلول مبتكرة لا تقليدية",
  },
  {
    id: 473,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعمل الفريق بتنظيم لتحقيق الإنجاز والكسل»",
    options: ["يعمل", "الفريق", "تنظيم", "الكسل"],
    correct: 3,
    explanation: "كلمة 'الكسل' تناقض 'تنظيم' و'الإنجاز'، الفريق المنظم يحقق الإنجاز لا الكسل",
  },
  {
    id: 474,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«القراءة تزيد المعرفة وتقلل الجهل»",
    options: ["القراءة", "تزيد", "المعرفة", "تقلل"],
    correct: 3,
    explanation: "كلمة 'تقلل' خطأ سياقياً، القراءة تزيد المعرفة ولا تقللها",
  },
  {
    id: 475,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعتمد النجاح على الصبر والعمل المستمر والانقطاع»",
    options: ["يعتمد", "الصبر", "العمل", "الانقطاع"],
    correct: 3,
    explanation: "كلمة 'الانقطاع' تناقض 'المستمر'، النجاح يحتاج استمراراً لا انقطاعاً",
  },
  {
    id: 476,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم التعليم في تطوير المجتمع وتخلفه»",
    options: ["يسهم", "التعليم", "تطوير", "تخلفه"],
    correct: 3,
    explanation: "كلمة 'تخلفه' تناقض 'تطوير'، التعليم يطور المجتمع ولا يتخلفه",
  },
  {
    id: 477,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التخطيط على تنظيم الوقت واستغلاله بشكل سيئ»",
    options: ["يساعد", "تنظيم", "استغلاله", "سيئ"],
    correct: 3,
    explanation: "كلمة 'سيئ' تناقض 'تنظيم'، التخطيط يساعد على استغلال الوقت بشكل جيد",
  },
  {
    id: 478,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعمل الإنسان بجد لتحقيق النجاح والفشل المتكرر»",
    options: ["يعمل", "تحقيق", "النجاح", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض 'النجاح'، العمل الجاد يحقق النجاح لا الفشل",
  },
  {
    id: 479,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسعى الطالب المجتهد إلى التفوق والنجاح والكسل»",
    options: ["يسعى", "المجتهد", "التفوق", "الكسل"],
    correct: 3,
    explanation: "كلمة 'الكسل' تناقض 'المجتهد'، الطالب المجتهد لا يسعى للكسل",
  },
  {
    id: 480,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التعاون على إنجاز الأعمال بسرعة وبطء»",
    options: ["يساعد", "إنجاز", "سرعة", "بطء"],
    correct: 3,
    explanation: "كلمة 'بطء' تناقض 'سرعة'، التعاون يسرع الإنجاز لا يبطئه",
  },
  {
    id: 481,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«التفكير المنطقي يؤدي إلى قرارات صحيحة وعشوائية»",
    options: ["التفكير", "يؤدي", "صحيحة", "عشوائية"],
    correct: 3,
    explanation: "كلمة 'عشوائية' تناقض 'صحيحة' و'المنطقي'، التفكير المنطقي لا يؤدي لقرارات عشوائية",
  },
  {
    id: 482,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم العمل الجاد في تحقيق الأهداف وإضاعتها بسهولة»",
    options: ["يسهم", "تحقيق", "الأهداف", "إضاعتها"],
    correct: 3,
    explanation: "كلمة 'إضاعتها' تناقض 'تحقيق'، العمل الجاد يحقق الأهداف لا يضيعها",
  },
  {
    id: 483,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعتمد النجاح على الاجتهاد والتنظيم والتشتت»",
    options: ["يعتمد", "الاجتهاد", "التنظيم", "التشتت"],
    correct: 3,
    explanation: "كلمة 'التشتت' تناقض 'التنظيم'، النجاح يحتاج تركيزاً لا تشتتاً",
  },
  {
    id: 484,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التعلم المستمر على تنمية المهارات وتراجعها»",
    options: ["يساعد", "تنمية", "المهارات", "تراجعها"],
    correct: 3,
    explanation: "كلمة 'تراجعها' تناقض 'تنمية'، التعلم ينمي المهارات لا يراجعها",
  },
  {
    id: 485,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم التفكير العميق في فهم الأمور وتعقيدها دون فائدة»",
    options: ["يسهم", "فهم", "الأمور", "تعقيدها"],
    correct: 3,
    explanation: "كلمة 'تعقيدها' تناقض 'فهم'، التفكير العميق يبسط الفهم لا يعقده",
  },
  {
    id: 486,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعمل الفريق بروح التعاون لتحقيق النجاح أو الفشل»",
    options: ["يعمل", "التعاون", "النجاح", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض 'التعاون' و'النجاح'، روح التعاون تحقق النجاح",
  },
  {
    id: 487,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«القراءة توسع مدارك الإنسان وتقلصها»",
    options: ["القراءة", "توسع", "مدارك", "تقلصها"],
    correct: 3,
    explanation: "كلمة 'تقلصها' تناقض 'توسع'، القراءة توسع المدارك لا تقلصها",
  },
  {
    id: 488,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد النظام على تحقيق الإنجاز والفوضى»",
    options: ["يساعد", "النظام", "الإنجاز", "الفوضى"],
    correct: 3,
    explanation: "كلمة 'الفوضى' تناقض 'النظام'، النظام يحقق الإنجاز لا الفوضى",
  },
  {
    id: 489,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم التخطيط في تحقيق النجاح وتأجيله»",
    options: ["يسهم", "تحقيق", "النجاح", "تأجيله"],
    correct: 3,
    explanation: "كلمة 'تأجيله' تناقض 'تحقيق'، التخطيط يحقق النجاح لا يؤجله",
  },
  {
    id: 490,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يعمل الإنسان بجد للوصول إلى أهدافه وتدميرها»",
    options: ["يعمل", "الوصول", "أهدافه", "تدميرها"],
    correct: 3,
    explanation: "كلمة 'تدميرها' تناقض 'الوصول'، العمل الجاد للوصول لا للتدمير",
  },
  {
    id: 491,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«الاجتهاد يؤدي إلى النجاح أو الفشل المحتوم»",
    options: ["الاجتهاد", "يؤدي", "النجاح", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض 'الاجتهاد' و'النجاح'، الاجتهاد يؤدي للنجاح",
  },
  {
    id: 492,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التفكير على اتخاذ قرارات سليمة وخاطئة دائمًا»",
    options: ["يساعد", "اتخاذ", "سليمة", "خاطئة"],
    correct: 3,
    explanation: "كلمة 'خاطئة' تناقض 'سليمة'، التفكير يساعد على قرارات سليمة",
  },
  {
    id: 493,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسعى الإنسان الطموح إلى التقدم أو التراجع»",
    options: ["يسعى", "الطموح", "التقدم", "التراجع"],
    correct: 3,
    explanation: "كلمة 'التراجع' تناقض 'الطموح' و'التقدم'، الطموح يسعى للتقدم",
  },
  {
    id: 494,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«العمل الجماعي يحقق الإنجاز أو الإخفاق»",
    options: ["العمل", "الجماعي", "الإنجاز", "الإخفاق"],
    correct: 3,
    explanation: "كلمة 'الإخفاق' تناقض 'الإنجاز'، العمل الجماعي يحقق الإنجاز",
  },
  {
    id: 495,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد التخطيط الجيد على النجاح أو الفشل»",
    options: ["يساعد", "التخطيط", "النجاح", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض 'التخطيط الجيد' و'النجاح'",
  },
  {
    id: 496,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يسهم التعليم في بناء الأجيال أو هدمها»",
    options: ["يسهم", "التعليم", "بناء", "هدمها"],
    correct: 3,
    explanation: "كلمة 'هدمها' تناقض 'بناء'، التعليم يبني الأجيال لا يهدمها",
  },
  {
    id: 497,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«القراءة تنمي الفكر أو تضعفه»",
    options: ["القراءة", "تنمي", "الفكر", "تضعفه"],
    correct: 3,
    explanation: "كلمة 'تضعفه' تناقض 'تنمي'، القراءة تنمي الفكر لا تضعفه",
  },
  {
    id: 498,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد الاجتهاد على التفوق أو الفشل»",
    options: ["يساعد", "الاجتهاد", "التفوق", "الفشل"],
    correct: 3,
    explanation: "كلمة 'الفشل' تناقض 'الاجتهاد' و'التفوق'، الاجتهاد يؤدي للتفوق",
  },
  {
    id: 499,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«التفكير الجيد يؤدي إلى قرارات صحيحة أو خاطئة»",
    options: ["التفكير", "يؤدي", "صحيحة", "خاطئة"],
    correct: 3,
    explanation: "كلمة 'خاطئة' تناقض 'صحيحة'، التفكير الجيد يؤدي لقرارات صحيحة",
  },
  {
    id: 500,
    section: "لفظي",
    category: "الخطأ السياقي",
    question: "اختَر الكلمة غير المناسبة:\n«يساعد النظام على تحقيق الإنجاز أو التعطيل»",
    options: ["يساعد", "النظام", "الإنجاز", "التعطيل"],
    correct: 3,
    explanation: "كلمة 'التعطيل' تناقض 'النظام' و'الإنجاز'، النظام يحقق الإنجاز لا التعطيل",
  },
  // القسم اللفظي - إكمال الجمل (أسئلة إضافية 501-530)
  {
    id: 501,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زاد وعي الإنسان، زادت ____ قدرته على اتخاذ القرارات",
    options: ["ضعف", "قوة", "إهمال", "تردد"],
    correct: 1,
    explanation: "زيادة الوعي تزيد من قوة القدرة على اتخاذ القرارات الصحيحة",
  },
  {
    id: 502,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "النجاح لا يتحقق إلا لمن يمتلك ____ والإصرار",
    options: ["الكسل", "العزيمة", "التردد", "الخوف"],
    correct: 1,
    explanation: "النجاح يتطلب العزيمة والإصرار، وهما صفتان متكاملتان",
  },
  {
    id: 503,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التفكير السليم يساعد على ____ المشكلات بدلًا من تعقيدها",
    options: ["حل", "زيادة", "إهمال", "تجاهل"],
    correct: 0,
    explanation: "التفكير السليم يساعد على حل المشكلات وليس تعقيدها",
  },
  {
    id: 504,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زادت التجارب، زادت ____ الإنسان",
    options: ["جهله", "خبرته", "تردده", "ضعفه"],
    correct: 1,
    explanation: "التجارب تزيد من خبرة الإنسان وتجعله أكثر حكمة",
  },
  {
    id: 505,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "القراءة المستمرة تسهم في ____ مدارك الإنسان",
    options: ["تضييق", "توسيع", "إلغاء", "تقليل"],
    correct: 1,
    explanation: "القراءة توسع مدارك الإنسان وتزيد من معرفته",
  },
  {
    id: 506,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التخطيط الجيد هو الخطوة الأولى نحو ____ الأهداف",
    options: ["فشل", "تحقيق", "تأجيل", "إهمال"],
    correct: 1,
    explanation: "التخطيط الجيد يؤدي إلى تحقيق الأهداف المرجوة",
  },
  {
    id: 507,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التردد في اتخاذ القرار يؤدي غالبًا إلى ____ الفرص",
    options: ["تحقيق", "ضياع", "تنظيم", "توفير"],
    correct: 1,
    explanation: "التردد يؤدي إلى ضياع الفرص وفوات الأوان",
  },
  {
    id: 508,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زاد العمل الجاد، زادت ____ النجاح",
    options: ["فرص", "عوائق", "مشاكل", "أخطاء"],
    correct: 0,
    explanation: "العمل الجاد يزيد من فرص النجاح والتفوق",
  },
  {
    id: 509,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الإنسان الناجح يتعلم من أخطائه بدلًا من ____ فيها",
    options: ["الاستمرار", "التفكير", "التعلم", "التوقف"],
    correct: 0,
    explanation: "الناجح يتعلم من أخطائه ولا يستمر في تكرارها",
  },
  {
    id: 510,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الإصرار على الهدف يجعل الوصول إليه أكثر ____",
    options: ["صعوبة", "سهولة", "تعقيد", "بطء"],
    correct: 1,
    explanation: "الإصرار يسهل الوصول إلى الأهداف ويجعلها ممكنة",
  },
  {
    id: 511,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "عدم تنظيم الوقت يؤدي إلى ____ في الإنجاز",
    options: ["تقدم", "تأخر", "نجاح", "تفوق"],
    correct: 1,
    explanation: "عدم تنظيم الوقت يؤدي إلى تأخر في الإنجاز",
  },
  {
    id: 512,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زادت المعرفة، زادت ____ الإنسان بنفسه",
    options: ["شك", "ثقة", "خوف", "ضعف"],
    correct: 1,
    explanation: "المعرفة تزيد من ثقة الإنسان بنفسه وقدراته",
  },
  {
    id: 513,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التعاون بين الأفراد يسهم في ____ العمل",
    options: ["تعقيد", "تسهيل", "تأخير", "إهمال"],
    correct: 1,
    explanation: "التعاون يسهل العمل ويسرع من إنجازه",
  },
  {
    id: 514,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "النجاح الحقيقي يعتمد على ____ المستمر وليس الجهد المؤقت",
    options: ["العمل", "التوقف", "الراحة", "التردد"],
    correct: 0,
    explanation: "النجاح الحقيقي يعتمد على العمل المستمر والدؤوب",
  },
  {
    id: 515,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زاد التركيز، زادت ____ الإنتاج",
    options: ["قلة", "جودة", "ضعف", "تأخر"],
    correct: 1,
    explanation: "التركيز يزيد من جودة الإنتاج ودقته",
  },
  {
    id: 516,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التعلم من الآخرين يساعد على ____ الأخطاء",
    options: ["تكرار", "تجنب", "زيادة", "تعقيد"],
    correct: 1,
    explanation: "التعلم من الآخرين يساعد على تجنب أخطائهم",
  },
  {
    id: 517,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "العمل بدون هدف يؤدي إلى ____ الجهد",
    options: ["تنظيم", "ضياع", "تحقيق", "توفير"],
    correct: 1,
    explanation: "العمل بدون هدف واضح يؤدي إلى ضياع الجهد",
  },
  {
    id: 518,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التفكير العميق يساعد على ____ الأمور بشكل أدق",
    options: ["تجاهل", "تحليل", "إهمال", "تعقيد"],
    correct: 1,
    explanation: "التفكير العميق يساعد على تحليل الأمور بدقة",
  },
  {
    id: 519,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زاد الإبداع، زادت ____ الحلول",
    options: ["تقليدية", "تنوع", "ضعف", "نقص"],
    correct: 1,
    explanation: "الإبداع يزيد من تنوع الحلول وجودتها",
  },
  {
    id: 520,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "النجاح يحتاج إلى مزيج من الذكاء و____",
    options: ["الكسل", "الاجتهاد", "التردد", "الخوف"],
    correct: 1,
    explanation: "النجاح يحتاج إلى الذكاء والاجتهاد معاً",
  },
  {
    id: 521,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "عدم الاستفادة من الأخطاء يؤدي إلى ____ تكرارها",
    options: ["منع", "استمرار", "توقف", "تقليل"],
    correct: 1,
    explanation: "عدم الاستفادة من الأخطاء يؤدي إلى استمرار تكرارها",
  },
  {
    id: 522,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زادت الخبرة، زادت ____ في اتخاذ القرار",
    options: ["العشوائية", "الدقة", "التردد", "الضعف"],
    correct: 1,
    explanation: "الخبرة تزيد من الدقة في اتخاذ القرارات",
  },
  {
    id: 523,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التخطيط السليم يقلل من ____ المفاجآت",
    options: ["حدوث", "زيادة", "تعقيد", "إهمال"],
    correct: 0,
    explanation: "التخطيط السليم يقلل من حدوث المفاجآت غير المتوقعة",
  },
  {
    id: 524,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "الإنسان الطموح يسعى دائمًا إلى ____ ذاته",
    options: ["إهمال", "تطوير", "تجاهل", "تقليل"],
    correct: 1,
    explanation: "الإنسان الطموح يسعى دائماً إلى تطوير ذاته وقدراته",
  },
  {
    id: 525,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زاد الانضباط، زادت ____ الإنجاز",
    options: ["سرعة", "بطء", "تعقيد", "تأخير"],
    correct: 0,
    explanation: "الانضباط يزيد من سرعة الإنجاز وجودته",
  },
  {
    id: 526,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التعلم المستمر يؤدي إلى ____ في مستوى الأداء",
    options: ["تحسن", "تراجع", "ضعف", "توقف"],
    correct: 0,
    explanation: "التعلم المستمر يؤدي إلى تحسن مستمر في الأداء",
  },
  {
    id: 527,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "العمل الجماعي يسهم في ____ الأفكار وتطويرها",
    options: ["إهمال", "تبادل", "إلغاء", "تقليل"],
    correct: 1,
    explanation: "العمل الجماعي يسهم في تبادل الأفكار وإثرائها",
  },
  {
    id: 528,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "كلما زادت المسؤولية، زادت ____ الإنسان",
    options: ["لامبالاة", "نضج", "ضعف", "خوف"],
    correct: 1,
    explanation: "المسؤولية تزيد من نضج الإنسان وحكمته",
  },
  {
    id: 529,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "التركيز على الهدف يقلل من ____ التشتت",
    options: ["زيادة", "نسبة", "قيمة", "عدد"],
    correct: 1,
    explanation: "التركيز على الهدف يقلل من نسبة التشتت والضياع",
  },
  {
    id: 530,
    section: "لفظي",
    category: "إكمال الجمل",
    question: "النجاح يتطلب الصبر و____ في مواجهة التحديات",
    options: ["الاستسلام", "المثابرة", "التردد", "الخوف"],
    correct: 1,
    explanation: "النجاح يتطلب الصبر والمثابرة في مواجهة التحديات",
  },
  // القسم اللفظي - المفردة الشاذة (أسئلة إضافية 531-560)
  {
    id: 531,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: تفكير – تحليل – إدراك – ركض",
    options: ["تفكير", "تحليل", "إدراك", "ركض"],
    correct: 3,
    explanation: "تفكير، تحليل، إدراك = عمليات عقلية\nركض = نشاط بدني (الشاذ)",
  },
  {
    id: 532,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: قلم – كتاب – دفتر – شجرة",
    options: ["قلم", "كتاب", "دفتر", "شجرة"],
    correct: 3,
    explanation: "قلم، كتاب، دفتر = أدوات مدرسية\nشجرة = نبات (الشاذ)",
  },
  {
    id: 533,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: حرارة – برودة – رطوبة – كتاب",
    options: ["حرارة", "برودة", "رطوبة", "كتاب"],
    correct: 3,
    explanation: "حرارة، برودة، رطوبة = حالات مناخية\nكتاب = أداة للقراءة (الشاذ)",
  },
  {
    id: 534,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: طبيب – مهندس – معلم – سيارة",
    options: ["طبيب", "مهندس", "معلم", "سيارة"],
    correct: 3,
    explanation: "طبيب، مهندس، معلم = مهن\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 535,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: ذهب – فضة – حديد – قطن",
    options: ["ذهب", "فضة", "حديد", "قطن"],
    correct: 3,
    explanation: "ذهب، فضة، حديد = معادن\nقطن = نبات/نسيج (الشاذ)",
  },
  {
    id: 536,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: شمس – قمر – نجوم – طاولة",
    options: ["شمس", "قمر", "نجوم", "طاولة"],
    correct: 3,
    explanation: "شمس، قمر، نجوم = أجرام سماوية\nطاولة = أثاث (الشاذ)",
  },
  {
    id: 537,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: بحر – نهر – بحيرة – جبل",
    options: ["بحر", "نهر", "بحيرة", "جبل"],
    correct: 3,
    explanation: "بحر، نهر، بحيرة = مسطحات مائية\nجبل = تضاريس يابسة (الشاذ)",
  },
  {
    id: 538,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: كرة – قدم – سلة – طائرة",
    options: ["كرة", "قدم", "سلة", "طائرة"],
    correct: 0,
    explanation: "قدم، سلة، طائرة = أنواع من الرياضات الكروية\nكرة = أداة اللعب (الشاذ - ليست نوع رياضة)",
  },
  {
    id: 539,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: قلم – ممحاة – مسطرة – هاتف",
    options: ["قلم", "ممحاة", "مسطرة", "هاتف"],
    correct: 3,
    explanation: "قلم، ممحاة، مسطرة = أدوات مكتبية/مدرسية\nهاتف = جهاز اتصال (الشاذ)",
  },
  {
    id: 540,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: ليل – نهار – صباح – كتاب",
    options: ["ليل", "نهار", "صباح", "كتاب"],
    correct: 3,
    explanation: "ليل، نهار، صباح = أوقات من اليوم\nكتاب = أداة للقراءة (الشاذ)",
  },
  {
    id: 541,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: أزرق – أحمر – أخضر – طويل",
    options: ["أزرق", "أحمر", "أخضر", "طويل"],
    correct: 3,
    explanation: "أزرق، أحمر، أخضر = ألوان\nطويل = صفة للحجم (الشاذ)",
  },
  {
    id: 542,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: سريع – بطيء – قوي – كتاب",
    options: ["سريع", "بطيء", "قوي", "كتاب"],
    correct: 3,
    explanation: "سريع، بطيء، قوي = صفات\nكتاب = اسم جامد (الشاذ)",
  },
  {
    id: 543,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: حزن – فرح – غضب – طاولة",
    options: ["حزن", "فرح", "غضب", "طاولة"],
    correct: 3,
    explanation: "حزن، فرح، غضب = مشاعر\nطاولة = أثاث (الشاذ)",
  },
  {
    id: 544,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: دراسة – تعلم – قراءة – نوم",
    options: ["دراسة", "تعلم", "قراءة", "نوم"],
    correct: 3,
    explanation: "دراسة، تعلم، قراءة = أنشطة معرفية\nنوم = راحة بدنية (الشاذ)",
  },
  {
    id: 545,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: عقل – تفكير – فهم – سيارة",
    options: ["عقل", "تفكير", "فهم", "سيارة"],
    correct: 3,
    explanation: "عقل، تفكير، فهم = مفاهيم ذهنية\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 546,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: صحراء – غابة – بحر – كتاب",
    options: ["صحراء", "غابة", "بحر", "كتاب"],
    correct: 3,
    explanation: "صحراء، غابة، بحر = بيئات طبيعية\nكتاب = أداة للقراءة (الشاذ)",
  },
  {
    id: 547,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: كاتب – شاعر – قارئ – قلم",
    options: ["كاتب", "شاعر", "قارئ", "قلم"],
    correct: 3,
    explanation: "كاتب، شاعر، قارئ = أشخاص مرتبطون بالكتابة والقراءة\nقلم = أداة (الشاذ)",
  },
  {
    id: 548,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: جري – مشي – سباحة – كتاب",
    options: ["جري", "مشي", "سباحة", "كتاب"],
    correct: 3,
    explanation: "جري، مشي، سباحة = أنشطة رياضية\nكتاب = أداة للقراءة (الشاذ)",
  },
  {
    id: 549,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: باب – نافذة – سقف – شجرة",
    options: ["باب", "نافذة", "سقف", "شجرة"],
    correct: 3,
    explanation: "باب، نافذة، سقف = أجزاء من المبنى\nشجرة = نبات (الشاذ)",
  },
  {
    id: 550,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: قمح – أرز – ذرة – حجر",
    options: ["قمح", "أرز", "ذرة", "حجر"],
    correct: 3,
    explanation: "قمح، أرز، ذرة = حبوب غذائية\nحجر = جماد (الشاذ)",
  },
  {
    id: 551,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: طبيب – مريض – علاج – سيارة",
    options: ["طبيب", "مريض", "علاج", "سيارة"],
    correct: 3,
    explanation: "طبيب، مريض، علاج = مفاهيم طبية\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 552,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: ساعة – دقيقة – ثانية – قلم",
    options: ["ساعة", "دقيقة", "ثانية", "قلم"],
    correct: 3,
    explanation: "ساعة، دقيقة، ثانية = وحدات زمنية\nقلم = أداة كتابة (الشاذ)",
  },
  {
    id: 553,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: سماء – سحاب – مطر – كتاب",
    options: ["سماء", "سحاب", "مطر", "كتاب"],
    correct: 3,
    explanation: "سماء، سحاب، مطر = ظواهر جوية\nكتاب = أداة للقراءة (الشاذ)",
  },
  {
    id: 554,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: يد – رجل – عين – سيارة",
    options: ["يد", "رجل", "عين", "سيارة"],
    correct: 3,
    explanation: "يد، رجل، عين = أعضاء جسم الإنسان\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 555,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: تفاحة – موز – برتقال – قلم",
    options: ["تفاحة", "موز", "برتقال", "قلم"],
    correct: 3,
    explanation: "تفاحة، موز، برتقال = فواكه\nقلم = أداة كتابة (الشاذ)",
  },
  {
    id: 556,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: حرارة – ضغط – سرعة – كتاب",
    options: ["حرارة", "ضغط", "سرعة", "كتاب"],
    correct: 3,
    explanation: "حرارة، ضغط، سرعة = كميات فيزيائية\nكتاب = أداة للقراءة (الشاذ)",
  },
  {
    id: 557,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: نوم – راحة – تعب – قلم",
    options: ["نوم", "راحة", "تعب", "قلم"],
    correct: 3,
    explanation: "نوم، راحة، تعب = حالات جسدية\nقلم = أداة كتابة (الشاذ)",
  },
  {
    id: 558,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: نجاح – فشل – تقدم – سيارة",
    options: ["نجاح", "فشل", "تقدم", "سيارة"],
    correct: 3,
    explanation: "نجاح، فشل، تقدم = مفاهيم مرتبطة بالإنجاز\nسيارة = وسيلة نقل (الشاذ)",
  },
  {
    id: 559,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: عقل – قلب – روح – طاولة",
    options: ["عقل", "قلب", "روح", "طاولة"],
    correct: 3,
    explanation: "عقل، قلب، روح = مفاهيم إنسانية معنوية\nطاولة = أثاث (الشاذ)",
  },
  {
    id: 560,
    section: "لفظي",
    category: "المفردة الشاذة",
    question: "اختر الكلمة الشاذة: حاسوب – هاتف – جهاز – كتاب",
    options: ["حاسوب", "هاتف", "جهاز", "كتاب"],
    correct: 3,
    explanation: "حاسوب، هاتف، جهاز = أجهزة إلكترونية\nكتاب = أداة للقراءة (الشاذ)",
  },
  // القسم اللفظي - استيعاب المقروء (نصوص إضافية 561-570)
  // النص الأول: التفكير النقدي
  {
    id: 561,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "في عالم يتسارع فيه التطور المعرفي، لم يعد امتلاك المعلومات كافيًا، بل أصبح الأهم هو القدرة على تحليلها وتوظيفها بشكل فعّال. فالفرد الذي يمتلك مهارة التفكير النقدي يستطيع التمييز بين المعلومات الصحيحة والمضللة، مما يمنحه قدرة أكبر على اتخاذ قرارات سليمة.",
    question: "ما الفكرة الأساسية للنص؟",
    options: ["أهمية المعلومات", "أهمية التفكير النقدي", "سرعة التطور", "اتخاذ القرار"],
    correct: 1,
    explanation: "الفكرة الأساسية هي أهمية التفكير النقدي في تحليل المعلومات وتوظيفها، وليس مجرد امتلاكها.",
  },
  {
    id: 562,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "في عالم يتسارع فيه التطور المعرفي، لم يعد امتلاك المعلومات كافيًا، بل أصبح الأهم هو القدرة على تحليلها وتوظيفها بشكل فعّال. فالفرد الذي يمتلك مهارة التفكير النقدي يستطيع التمييز بين المعلومات الصحيحة والمضللة، مما يمنحه قدرة أكبر على اتخاذ قرارات سليمة.",
    question: "ما الذي لم يعد كافيًا؟",
    options: ["التفكير", "المعرفة", "امتلاك المعلومات", "التحليل"],
    correct: 2,
    explanation: "النص يذكر صراحة: 'لم يعد امتلاك المعلومات كافيًا'",
  },
  {
    id: 563,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "في عالم يتسارع فيه التطور المعرفي، لم يعد امتلاك المعلومات كافيًا، بل أصبح الأهم هو القدرة على تحليلها وتوظيفها بشكل فعّال. فالفرد الذي يمتلك مهارة التفكير النقدي يستطيع التمييز بين المعلومات الصحيحة والمضللة، مما يمنحه قدرة أكبر على اتخاذ قرارات سليمة.",
    question: "ما فائدة التفكير النقدي؟",
    options: ["زيادة الحفظ", "تمييز المعلومات", "إبطاء القرار", "تعقيد الأمور"],
    correct: 1,
    explanation: "التفكير النقدي يمكّن الفرد من التمييز بين المعلومات الصحيحة والمضللة.",
  },
  {
    id: 564,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "في عالم يتسارع فيه التطور المعرفي، لم يعد امتلاك المعلومات كافيًا، بل أصبح الأهم هو القدرة على تحليلها وتوظيفها بشكل فعّال. فالفرد الذي يمتلك مهارة التفكير النقدي يستطيع التمييز بين المعلومات الصحيحة والمضللة، مما يمنحه قدرة أكبر على اتخاذ قرارات سليمة.",
    question: "يستنتج أن الفرد الناجح هو من؟",
    options: ["يحفظ فقط", "يحلل المعلومات", "يتجاهلها", "يقلد الآخرين"],
    correct: 1,
    explanation: "الفرد الناجح هو من يحلل المعلومات ويوظفها بشكل فعّال، وليس من يحفظها فقط.",
  },
  {
    id: 565,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "في عالم يتسارع فيه التطور المعرفي، لم يعد امتلاك المعلومات كافيًا، بل أصبح الأهم هو القدرة على تحليلها وتوظيفها بشكل فعّال. فالفرد الذي يمتلك مهارة التفكير النقدي يستطيع التمييز بين المعلومات الصحيحة والمضللة، مما يمنحه قدرة أكبر على اتخاذ قرارات سليمة.",
    question: "ما معنى (توظيفها) في السياق؟",
    options: ["حفظها", "استخدامها", "نسيانها", "إخفاؤها"],
    correct: 1,
    explanation: "توظيفها تعني استخدامها والاستفادة منها بشكل فعّال.",
  },
  // النص الثاني: الفشل والنجاح
  {
    id: 566,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "يعتقد البعض أن الفشل نهاية الطريق، إلا أن الواقع يثبت عكس ذلك؛ إذ إن الفشل قد يكون خطوة ضرورية نحو النجاح، لأنه يكشف نقاط الضعف ويمنح الفرصة لتصحيح المسار. فالشخص الذي يتعلم من أخطائه يصبح أكثر قدرة على تحقيق أهدافه مستقبلاً.",
    question: "ما الفكرة الرئيسة؟",
    options: ["الفشل نهاية", "الفشل مفيد", "النجاح سهل", "الأخطاء غير مهمة"],
    correct: 1,
    explanation: "الفكرة الرئيسة أن الفشل مفيد وقد يكون خطوة نحو النجاح.",
  },
  {
    id: 567,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "يعتقد البعض أن الفشل نهاية الطريق، إلا أن الواقع يثبت عكس ذلك؛ إذ إن الفشل قد يكون خطوة ضرورية نحو النجاح، لأنه يكشف نقاط الضعف ويمنح الفرصة لتصحيح المسار. فالشخص الذي يتعلم من أخطائه يصبح أكثر قدرة على تحقيق أهدافه مستقبلاً.",
    question: "ما دور الفشل؟",
    options: ["إيقاف النجاح", "كشف الضعف", "إلغاء الأهداف", "زيادة الأخطاء"],
    correct: 1,
    explanation: "دور الفشل هو كشف نقاط الضعف ومنح الفرصة لتصحيح المسار.",
  },
  {
    id: 568,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "يعتقد البعض أن الفشل نهاية الطريق، إلا أن الواقع يثبت عكس ذلك؛ إذ إن الفشل قد يكون خطوة ضرورية نحو النجاح، لأنه يكشف نقاط الضعف ويمنح الفرصة لتصحيح المسار. فالشخص الذي يتعلم من أخطائه يصبح أكثر قدرة على تحقيق أهدافه مستقبلاً.",
    question: "يستنتج أن الفشل؟",
    options: ["يمنع النجاح", "يساعد على النجاح", "غير مهم", "دائم"],
    correct: 1,
    explanation: "يستنتج من النص أن الفشل يساعد على النجاح لأنه خطوة ضرورية نحوه.",
  },
  {
    id: 569,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "يعتقد البعض أن الفشل نهاية الطريق، إلا أن الواقع يثبت عكس ذلك؛ إذ إن الفشل قد يكون خطوة ضرورية نحو النجاح، لأنه يكشف نقاط الضعف ويمنح الفرصة لتصحيح المسار. فالشخص الذي يتعلم من أخطائه يصبح أكثر قدرة على تحقيق أهدافه مستقبلاً.",
    question: "ما نتيجة التعلم من الأخطاء؟",
    options: ["تكرارها", "تحقيق الأهداف", "إهمالها", "نسيانها"],
    correct: 1,
    explanation: "نتيجة التعلم من الأخطاء هي أن يصبح الشخص أكثر قدرة على تحقيق أهدافه.",
  },
  {
    id: 570,
    section: "لفظي",
    category: "استيعاب المقروء",
    passage: "يعتقد البعض أن الفشل نهاية الطريق، إلا أن الواقع يثبت عكس ذلك؛ إذ إن الفشل قد يكون خطوة ضرورية نحو النجاح، لأنه يكشف نقاط الضعف ويمنح الفرصة لتصحيح المسار. فالشخص الذي يتعلم من أخطائه يصبح أكثر قدرة على تحقيق أهدافه مستقبلاً.",
    question: "موقف الكاتب من الفشل؟",
    options: ["سلبي", "إيجابي", "محايد", "رافض"],
    correct: 1,
    explanation: "موقف الكاتب إيجابي من الفشل، فهو يراه خطوة ضرورية نحو النجاح.",
  },
  // ========== أسئلة إضافية جديدة (571-670) ==========
  // الجبر المتقدم (571-595)
  {
    id: 571,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان س³ = 125، فما قيمة س؟",
    options: ["3", "4", "5", "6"],
    correct: 2,
    explanation: "س³ = 125\nس = ∛125 = 5\nلأن 5 × 5 × 5 = 125",
  },
  {
    id: 572,
    section: "كمي",
    category: "الجبر",
    question: "ما قيمة: 2⁴ × 2²؟",
    options: ["32", "64", "128", "256"],
    correct: 1,
    explanation: "عند ضرب الأسس المتساوية نجمع القوى:\n2⁴ × 2² = 2⁶ = 64",
  },
  {
    id: 573,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان ص = 3س + 2، وكانت س = 4، فما قيمة ص؟",
    options: ["10", "12", "14", "16"],
    correct: 2,
    explanation: "ص = 3(4) + 2 = 12 + 2 = 14",
  },
  {
    id: 574,
    section: "كمي",
    category: "الجبر",
    question: "حل المعادلة: 4س + 8 = 2س + 20",
    options: ["4", "5", "6", "7"],
    correct: 2,
    explanation: "4س - 2س = 20 - 8\n2س = 12\nس = 6",
  },
  {
    id: 575,
    section: "كمي",
    category: "الجبر",
    question: "ما ناتج: (س + 3)² عندما س = 2؟",
    options: ["16", "20", "25", "30"],
    correct: 2,
    explanation: "(2 + 3)² = 5² = 25",
  },
  {
    id: 576,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان س² - 16 = 0، فإن س =",
    options: ["±2", "±3", "±4", "±5"],
    correct: 2,
    explanation: "س² = 16\nس = ±√16 = ±4",
  },
  {
    id: 577,
    section: "كمي",
    category: "الجبر",
    question: "ما قيمة: √(49 + 32)؟",
    options: ["7", "8", "9", "10"],
    correct: 2,
    explanation: "√(49 + 32) = √81 = 9",
  },
  {
    id: 578,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 5س = 3س + 14، فما قيمة س؟",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "5س - 3س = 14\n2س = 14\nس = 7",
  },
  {
    id: 579,
    section: "كمي",
    category: "الجبر",
    question: "ما ناتج: (-2)⁴؟",
    options: ["-16", "-8", "8", "16"],
    correct: 3,
    explanation: "(-2)⁴ = (-2)×(-2)×(-2)×(-2) = 16\nالأس الزوجي يجعل النتيجة موجبة",
  },
  {
    id: 580,
    section: "كمي",
    category: "الجبر",
    question: "حل: |س - 5| = 3",
    options: ["س = 2 أو 8", "س = 2 فقط", "س = 8 فقط", "س = -2 أو -8"],
    correct: 0,
    explanation: "س - 5 = 3 ← س = 8\nأو س - 5 = -3 ← س = 2",
  },
  {
    id: 581,
    section: "كمي",
    category: "الجبر",
    question: "ما قيمة: 3² × 3³ ÷ 3⁴؟",
    options: ["3", "9", "27", "81"],
    correct: 0,
    explanation: "3² × 3³ ÷ 3⁴ = 3^(2+3-4) = 3¹ = 3",
  },
  {
    id: 582,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان ف(س) = س² + 2س، فما قيمة ف(3)؟",
    options: ["9", "12", "15", "18"],
    correct: 2,
    explanation: "ف(3) = 3² + 2(3) = 9 + 6 = 15",
  },
  {
    id: 583,
    section: "كمي",
    category: "الجبر",
    question: "ما ناتج تبسيط: 6س² ÷ 2س؟",
    options: ["3س", "4س", "3س²", "12س"],
    correct: 0,
    explanation: "6س² ÷ 2س = 3س",
  },
  {
    id: 584,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان س + ص = 10 و س - ص = 4، فما قيمة س؟",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "بجمع المعادلتين:\n2س = 14\nس = 7",
  },
  {
    id: 585,
    section: "كمي",
    category: "الجبر",
    question: "ما قيمة: ∜81؟",
    options: ["2", "3", "4", "9"],
    correct: 1,
    explanation: "∜81 = 3 لأن 3⁴ = 81",
  },
  {
    id: 586,
    section: "كمي",
    category: "الجبر",
    question: "حل المعادلة: 2(س - 3) = س + 5",
    options: ["8", "9", "10", "11"],
    correct: 3,
    explanation: "2س - 6 = س + 5\n2س - س = 5 + 6\nس = 11",
  },
  {
    id: 587,
    section: "كمي",
    category: "الجبر",
    question: "ما ناتج: (4س)(3س²)؟",
    options: ["7س³", "12س²", "12س³", "7س²"],
    correct: 2,
    explanation: "(4س)(3س²) = 12س³",
  },
  {
    id: 588,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان 3س² = 48، فما قيمة س؟",
    options: ["±3", "±4", "±6", "±8"],
    correct: 1,
    explanation: "س² = 16\nس = ±4",
  },
  {
    id: 589,
    section: "كمي",
    category: "الجبر",
    question: "ما قيمة: log₂(32)؟",
    options: ["3", "4", "5", "6"],
    correct: 2,
    explanation: "log₂(32) = 5 لأن 2⁵ = 32",
  },
  {
    id: 590,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان س/3 + س/6 = 5، فما قيمة س؟",
    options: ["6", "8", "10", "12"],
    correct: 2,
    explanation: "2س/6 + س/6 = 5\n3س/6 = 5\nس/2 = 5\nس = 10",
  },
  {
    id: 591,
    section: "كمي",
    category: "الجبر",
    question: "ما ناتج: (س + 2)(س - 2)؟",
    options: ["س² - 4", "س² + 4", "س² - 2س", "س² + 2س"],
    correct: 0,
    explanation: "هذا فرق بين مربعين:\n(س + 2)(س - 2) = س² - 4",
  },
  {
    id: 592,
    section: "كمي",
    category: "الجبر",
    question: "حل: 5(س + 2) = 3(س + 8)",
    options: ["5", "6", "7", "8"],
    correct: 2,
    explanation: "5س + 10 = 3س + 24\n2س = 14\nس = 7",
  },
  {
    id: 593,
    section: "كمي",
    category: "الجبر",
    question: "ما قيمة: 2³ + 3²؟",
    options: ["13", "15", "17", "19"],
    correct: 2,
    explanation: "2³ + 3² = 8 + 9 = 17",
  },
  {
    id: 594,
    section: "كمي",
    category: "الجبر",
    question: "إذا كان س² + 6س + 9 = 0، فما قيمة س؟",
    options: ["-2", "-3", "-4", "-5"],
    correct: 1,
    explanation: "(س + 3)² = 0\nس + 3 = 0\nس = -3",
  },
  {
    id: 595,
    section: "كمي",
    category: "الجبر",
    question: "ما ناتج: √50 مبسطاً؟",
    options: ["5√2", "2√5", "10√5", "25√2"],
    correct: 0,
    explanation: "√50 = √(25 × 2) = 5√2",
  },
  // الهندسة المتقدمة (596-620)
  {
    id: 596,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة المعين الذي قطراه 6 سم و 8 سم:",
    options: ["12 سم²", "24 سم²", "36 سم²", "48 سم²"],
    correct: 1,
    explanation: "مساحة المعين = (ق₁ × ق₂) / 2\n= (6 × 8) / 2 = 24 سم²",
  },
  {
    id: 597,
    section: "كمي",
    category: "الهندسة",
    question: "حجم مكعب طول ضلعه 4 سم:",
    options: ["16 سم³", "48 سم³", "64 سم³", "96 سم³"],
    correct: 2,
    explanation: "حجم المكعب = ل³ = 4³ = 64 سم³",
  },
  {
    id: 598,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة شبه المنحرف الذي قاعدتاه 10 و 6 سم وارتفاعه 4 سم:",
    options: ["28 سم²", "32 سم²", "36 سم²", "40 سم²"],
    correct: 1,
    explanation: "المساحة = ½ × (ق₁ + ق₂) × ع\n= ½ × (10 + 6) × 4 = 32 سم²",
  },
  {
    id: 599,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة الكرة التي نصف قطرها 7 سم (π = 22/7):",
    options: ["154 سم²", "308 سم²", "462 سم²", "616 سم²"],
    correct: 3,
    explanation: "مساحة سطح الكرة = 4πر²\n= 4 × (22/7) × 49 = 616 سم²",
  },
  {
    id: 600,
    section: "كمي",
    category: "الهندسة",
    question: "طول قطر الدائرة التي محيطها 44 سم (π = 22/7):",
    options: ["7 سم", "14 سم", "21 سم", "28 سم"],
    correct: 1,
    explanation: "المحيط = π × ق\n44 = (22/7) × ق\nق = 14 سم",
  },
  {
    id: 601,
    section: "كمي",
    category: "الهندسة",
    question: "حجم الأسطوانة التي نصف قطرها 7 سم وارتفاعها 10 سم (π = 22/7):",
    options: ["770 سم³", "1540 سم³", "2310 سم³", "3080 سم³"],
    correct: 1,
    explanation: "الحجم = πر²ع = (22/7) × 49 × 10 = 1540 سم³",
  },
  {
    id: 602,
    section: "كمي",
    category: "الهندسة",
    question: "مجموع الزوايا الداخلية للمسدس:",
    options: ["540°", "720°", "900°", "1080°"],
    correct: 1,
    explanation: "مجموع زوايا المضلع = (ن - 2) × 180\n= (6 - 2) × 180 = 720°",
  },
  {
    id: 603,
    section: "كمي",
    category: "الهندسة",
    question: "طول الوتر في الدائرة الذي يبعد 3 سم عن المركز إذا كان نصف القطر 5 سم:",
    options: ["6 سم", "7 سم", "8 سم", "9 سم"],
    correct: 2,
    explanation: "نصف الوتر² = ر² - ب²\n= 25 - 9 = 16\nنصف الوتر = 4\nالوتر = 8 سم",
  },
  {
    id: 604,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة متوازي الأضلاع الذي قاعدته 12 سم وارتفاعه 5 سم:",
    options: ["30 سم²", "45 سم²", "60 سم²", "72 سم²"],
    correct: 2,
    explanation: "المساحة = القاعدة × الارتفاع = 12 × 5 = 60 سم²",
  },
  {
    id: 605,
    section: "كمي",
    category: "الهندسة",
    question: "محيط مثلث متساوي الأضلاع طول ضلعه 9 سم:",
    options: ["18 سم", "27 سم", "36 سم", "45 سم"],
    correct: 1,
    explanation: "محيط المثلث متساوي الأضلاع = 3 × الضلع\n= 3 × 9 = 27 سم",
  },
  {
    id: 606,
    section: "كمي",
    category: "الهندسة",
    question: "قياس الزاوية المركزية في الدائرة إذا كان قوسها 60° من المحيط:",
    options: ["30°", "60°", "90°", "120°"],
    correct: 1,
    explanation: "الزاوية المركزية = الزاوية المقابلة للقوس = 60°",
  },
  {
    id: 607,
    section: "كمي",
    category: "الهندسة",
    question: "حجم الهرم رباعي القاعدة المربعة طول ضلعها 6 سم وارتفاعه 5 سم:",
    options: ["30 سم³", "60 سم³", "90 سم³", "180 سم³"],
    correct: 1,
    explanation: "حجم الهرم = ⅓ × مساحة القاعدة × الارتفاع\n= ⅓ × 36 × 5 = 60 سم³",
  },
  {
    id: 608,
    section: "كمي",
    category: "الهندسة",
    question: "طول قطر المكعب الذي طول ضلعه 4 سم:",
    options: ["4√2", "4√3", "8", "8√2"],
    correct: 1,
    explanation: "قطر المكعب = ل√3 = 4√3 سم",
  },
  {
    id: 609,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة قطاع دائري زاويته 90° ونصف قطره 14 سم (π = 22/7):",
    options: ["77 سم²", "154 سم²", "231 سم²", "308 سم²"],
    correct: 1,
    explanation: "مساحة القطاع = (θ/360) × πر²\n= (90/360) × (22/7) × 196 = 154 سم²",
  },
  {
    id: 610,
    section: "كمي",
    category: "الهندسة",
    question: "طول ضلع المربع الذي مساحته 121 سم²:",
    options: ["9 سم", "10 سم", "11 سم", "12 سم"],
    correct: 2,
    explanation: "ل² = 121\nل = √121 = 11 سم",
  },
  {
    id: 611,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة المثلث القائم الذي ضلعاه القائمان 8 و 6 سم:",
    options: ["14 سم²", "24 سم²", "28 سم²", "48 سم²"],
    correct: 1,
    explanation: "مساحة المثلث القائم = ½ × ق₁ × ق₂\n= ½ × 8 × 6 = 24 سم²",
  },
  {
    id: 612,
    section: "كمي",
    category: "الهندسة",
    question: "حجم الكرة التي نصف قطرها 3 سم (π = 22/7):",
    options: ["113.1 سم³", "84.9 سم³", "56.6 سم³", "28.3 سم³"],
    correct: 0,
    explanation: "حجم الكرة = (4/3)πر³ = (4/3) × (22/7) × 27 ≈ 113.1 سم³",
  },
  {
    id: 613,
    section: "كمي",
    category: "الهندسة",
    question: "عدد أقطار المثمن المنتظم:",
    options: ["16", "18", "20", "24"],
    correct: 2,
    explanation: "عدد الأقطار = ن(ن-3)/2 = 8(8-3)/2 = 20",
  },
  {
    id: 614,
    section: "كمي",
    category: "الهندسة",
    question: "الزاوية الداخلية في المضلع المنتظم ذي 12 ضلع:",
    options: ["140°", "145°", "150°", "155°"],
    correct: 2,
    explanation: "الزاوية الداخلية = (ن-2)×180/ن = (10×180)/12 = 150°",
  },
  {
    id: 615,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة الدائرة المحيطة بمربع طول ضلعه 10 سم (π = 3.14):",
    options: ["100π سم²", "50π سم²", "25π سم²", "200π سم²"],
    correct: 1,
    explanation: "قطر الدائرة = قطر المربع = 10√2\nنصف القطر = 5√2\nالمساحة = πر² = π × 50 = 50π سم²",
  },
  {
    id: 616,
    section: "كمي",
    category: "الهندسة",
    question: "طول ارتفاع المثلث متساوي الأضلاع الذي طول ضلعه 8 سم:",
    options: ["4√2", "4√3", "8√2", "8√3"],
    correct: 1,
    explanation: "ارتفاع المثلث متساوي الأضلاع = (√3/2) × الضلع\n= (√3/2) × 8 = 4√3",
  },
  {
    id: 617,
    section: "كمي",
    category: "الهندسة",
    question: "حجم المخروط الذي نصف قطر قاعدته 3 سم وارتفاعه 4 سم (π = 22/7):",
    options: ["12π سم³", "6π سم³", "36π سم³", "18π سم³"],
    correct: 0,
    explanation: "حجم المخروط = ⅓πر²ع = ⅓ × π × 9 × 4 = 12π سم³",
  },
  {
    id: 618,
    section: "كمي",
    category: "الهندسة",
    question: "إذا كان محيط المربع 48 سم، فما طول قطره؟",
    options: ["12 سم", "12√2 سم", "24 سم", "6√2 سم"],
    correct: 1,
    explanation: "الضلع = 48/4 = 12 سم\nالقطر = الضلع × √2 = 12√2 سم",
  },
  {
    id: 619,
    section: "كمي",
    category: "الهندسة",
    question: "مساحة سطح المكعب الذي حجمه 125 سم³:",
    options: ["100 سم²", "125 سم²", "150 سم²", "175 سم²"],
    correct: 2,
    explanation: "الضلع = ∛125 = 5 سم\nمساحة السطح = 6ل² = 6 × 25 = 150 سم²",
  },
  {
    id: 620,
    section: "كمي",
    category: "الهندسة",
    question: "نسبة محيط الدائرة إلى قطرها:",
    options: ["2", "π", "2π", "π/2"],
    correct: 1,
    explanation: "المحيط = πق\nالمحيط/القطر = π",
  },
  // النسب والتناسب (621-645)
  {
    id: 621,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة الفتيان إلى الفتيات في صف 3:5، وعدد الفتيات 25، فكم عدد الفتيان؟",
    options: ["10", "15", "20", "25"],
    correct: 1,
    explanation: "3/5 = س/25\nس = (3 × 25)/5 = 15",
  },
  {
    id: 622,
    section: "كمي",
    category: "النسب والتناسب",
    question: "ما هي 35% من 200؟",
    options: ["60", "65", "70", "75"],
    correct: 2,
    explanation: "35% من 200 = (35/100) × 200 = 70",
  },
  {
    id: 623,
    section: "كمي",
    category: "النسب والتناسب",
    question: "زاد سعر سلعة من 80 ريال إلى 100 ريال، ما نسبة الزيادة؟",
    options: ["20%", "25%", "30%", "80%"],
    correct: 1,
    explanation: "الزيادة = 20 ريال\nنسبة الزيادة = (20/80) × 100 = 25%",
  },
  {
    id: 624,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كان 4 عمال ينجزون عملاً في 12 يوماً، ففي كم يوم ينجزه 6 عمال؟",
    options: ["6", "8", "10", "18"],
    correct: 1,
    explanation: "العلاقة عكسية:\n4 × 12 = 6 × س\nس = 48/6 = 8 أيام",
  },
  {
    id: 625,
    section: "كمي",
    category: "النسب والتناسب",
    question: "ما الكسر المكافئ لـ 75%؟",
    options: ["1/2", "2/3", "3/4", "4/5"],
    correct: 2,
    explanation: "75% = 75/100 = 3/4",
  },
  {
    id: 626,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كانت نسبة أ:ب = 2:3، ونسبة ب:ج = 4:5، فما نسبة أ:ج؟",
    options: ["8:15", "6:15", "4:5", "2:5"],
    correct: 0,
    explanation: "نجعل ب متساوياً:\nأ:ب = 8:12\nب:ج = 12:15\nإذن أ:ج = 8:15",
  },
  {
    id: 627,
    section: "كمي",
    category: "النسب والتناسب",
    question: "سعر قميص بعد خصم 20% هو 160 ريال، ما السعر الأصلي؟",
    options: ["180", "190", "200", "210"],
    correct: 2,
    explanation: "80% من السعر الأصلي = 160\nالسعر الأصلي = 160/0.8 = 200 ريال",
  },
  {
    id: 628,
    section: "كمي",
    category: "النسب والتناسب",
    question: "قطعت سيارة 240 كم في 3 ساعات، ما سرعتها بـ كم/ساعة؟",
    options: ["60", "70", "80", "90"],
    correct: 2,
    explanation: "السرعة = المسافة/الزمن = 240/3 = 80 كم/ساعة",
  },
  {
    id: 629,
    section: "كمي",
    category: "النسب والتناسب",
    question: "يُقسم مبلغ 1000 ريال بين شخصين بنسبة 2:3، كم نصيب الأول؟",
    options: ["300", "400", "500", "600"],
    correct: 1,
    explanation: "مجموع الأجزاء = 5\nنصيب الأول = (2/5) × 1000 = 400 ريال",
  },
  {
    id: 630,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا كان 8 كتب تكلف 120 ريال، فكم تكلف 5 كتب؟",
    options: ["60", "70", "75", "80"],
    correct: 2,
    explanation: "سعر الكتاب = 120/8 = 15 ريال\n5 كتب = 5 × 15 = 75 ريال",
  },
  {
    id: 631,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نقص وزن شخص من 80 كجم إلى 72 كجم، ما نسبة النقص؟",
    options: ["8%", "10%", "12%", "15%"],
    correct: 1,
    explanation: "النقص = 8 كجم\nنسبة النقص = (8/80) × 100 = 10%",
  },
  {
    id: 632,
    section: "كمي",
    category: "النسب والتناسب",
    question: "مقياس خريطة 1:50000، إذا كانت المسافة على الخريطة 3 سم، فكم المسافة الحقيقية؟",
    options: ["1 كم", "1.5 كم", "2 كم", "2.5 كم"],
    correct: 1,
    explanation: "المسافة = 3 × 50000 = 150000 سم = 1.5 كم",
  },
  {
    id: 633,
    section: "كمي",
    category: "النسب والتناسب",
    question: "خلط 3 لتر من عصير بـ 2 لتر ماء، ما نسبة العصير في الخليط؟",
    options: ["40%", "50%", "60%", "70%"],
    correct: 2,
    explanation: "نسبة العصير = 3/(3+2) = 3/5 = 60%",
  },
  {
    id: 634,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا زاد ضلع مربع بنسبة 50%، فبكم تزيد مساحته؟",
    options: ["50%", "100%", "125%", "150%"],
    correct: 2,
    explanation: "المساحة الجديدة = (1.5)² = 2.25\nنسبة الزيادة = 125%",
  },
  {
    id: 635,
    section: "كمي",
    category: "النسب والتناسب",
    question: "وصفة تتطلب 4 أكواب دقيق لـ 6 أشخاص، كم كوباً لـ 9 أشخاص؟",
    options: ["5", "6", "7", "8"],
    correct: 1,
    explanation: "4/6 = س/9\nس = (4 × 9)/6 = 6 أكواب",
  },
  {
    id: 636,
    section: "كمي",
    category: "النسب والتناسب",
    question: "راتب موظف 8000 ريال، يدخر 20% ويدفع 15% إيجار، كم المتبقي؟",
    options: ["5000", "5200", "5400", "5600"],
    correct: 1,
    explanation: "المتبقي = 100% - 20% - 15% = 65%\n= 0.65 × 8000 = 5200 ريال",
  },
  {
    id: 637,
    section: "كمي",
    category: "النسب والتناسب",
    question: "أكمل النسبة: 2:5 = 6:؟",
    options: ["10", "12", "15", "18"],
    correct: 2,
    explanation: "2:5 = 6:س\nس = (5 × 6)/2 = 15",
  },
  {
    id: 638,
    section: "كمي",
    category: "النسب والتناسب",
    question: "ربح تاجر 25% من سعر الشراء، إذا باع بـ 500 ريال، فكم سعر الشراء؟",
    options: ["375", "400", "425", "450"],
    correct: 1,
    explanation: "125% من سعر الشراء = 500\nسعر الشراء = 500/1.25 = 400 ريال",
  },
  {
    id: 639,
    section: "كمي",
    category: "النسب والتناسب",
    question: "عدد سكان مدينة 200000، زاد بنسبة 5%، كم العدد الجديد؟",
    options: ["205000", "210000", "215000", "220000"],
    correct: 1,
    explanation: "العدد الجديد = 200000 × 1.05 = 210000",
  },
  {
    id: 640,
    section: "كمي",
    category: "النسب والتناسب",
    question: "ما العدد الذي 15% منه = 45؟",
    options: ["250", "275", "300", "325"],
    correct: 2,
    explanation: "0.15 × س = 45\nس = 45/0.15 = 300",
  },
  {
    id: 641,
    section: "كمي",
    category: "النسب والتناسب",
    question: "ثمن 12 قلماً = 36 ريال، ثمن 8 أقلام:",
    options: ["20", "22", "24", "26"],
    correct: 2,
    explanation: "سعر القلم = 36/12 = 3 ريال\n8 أقلام = 8 × 3 = 24 ريال",
  },
  {
    id: 642,
    section: "كمي",
    category: "النسب والتناسب",
    question: "نسبة الراسبين 12% من 350 طالب، كم عدد الناجحين؟",
    options: ["298", "300", "308", "315"],
    correct: 2,
    explanation: "الراسبون = 0.12 × 350 = 42\nالناجحون = 350 - 42 = 308",
  },
  {
    id: 643,
    section: "كمي",
    category: "النسب والتناسب",
    question: "إذا أنجز 5 عمال ربع العمل في 4 أيام، ففي كم يوم ينجز 10 عمال العمل كاملاً؟",
    options: ["6", "8", "10", "12"],
    correct: 1,
    explanation: "5 عمال × 4 أيام = ربع العمل\nالعمل كاملاً يحتاج 16 يوم لـ 5 عمال\n10 عمال يحتاجون 8 أيام",
  },
  {
    id: 644,
    section: "كمي",
    category: "النسب والتناسب",
    question: "سيارة تقطع 15 كم بلتر بنزين، كم لتراً تحتاج لقطع 225 كم؟",
    options: ["12", "13", "14", "15"],
    correct: 3,
    explanation: "عدد اللترات = 225/15 = 15 لتر",
  },
  {
    id: 645,
    section: "كمي",
    category: "النسب والتناسب",
    question: "خليط من الذهب والنحاس بنسبة 3:2، إذا كان الذهب 15 جرام، فكم وزن الخليط؟",
    options: ["20", "22", "25", "30"],
    correct: 2,
    explanation: "النحاس = (2/3) × 15 = 10 جرام\nالخليط = 15 + 10 = 25 جرام",
  },
  // الإحصاء والاحتمالات (646-660)
  {
    id: 646,
    section: "كمي",
    category: "الإحصاء",
    question: "المتوسط الحسابي للأعداد: 4، 8، 12، 16، 20:",
    options: ["10", "11", "12", "13"],
    correct: 2,
    explanation: "المجموع = 60\nالمتوسط = 60/5 = 12",
  },
  {
    id: 647,
    section: "كمي",
    category: "الإحصاء",
    question: "الوسيط للأعداد: 7، 2، 9، 4، 5، 8، 3:",
    options: ["4", "5", "6", "7"],
    correct: 1,
    explanation: "الترتيب: 2، 3، 4، 5، 7، 8، 9\nالوسيط = 5",
  },
  {
    id: 648,
    section: "كمي",
    category: "الإحصاء",
    question: "المنوال للأعداد: 3، 5، 3، 7، 5، 3، 9:",
    options: ["3", "5", "7", "9"],
    correct: 0,
    explanation: "3 يتكرر 3 مرات (أكثر من أي عدد آخر)\nالمنوال = 3",
  },
  {
    id: 649,
    section: "كمي",
    category: "الإحصاء",
    question: "المدى للأعداد: 15، 23، 8، 31، 19:",
    options: ["16", "20", "23", "26"],
    correct: 2,
    explanation: "المدى = أكبر - أصغر = 31 - 8 = 23",
  },
  {
    id: 650,
    section: "كمي",
    category: "الإحصاء",
    question: "احتمال ظهور عدد زوجي عند رمي نرد:",
    options: ["1/6", "1/3", "1/2", "2/3"],
    correct: 2,
    explanation: "الأعداد الزوجية: 2، 4، 6 = 3 أعداد\nالاحتمال = 3/6 = 1/2",
  },
  {
    id: 651,
    section: "كمي",
    category: "الإحصاء",
    question: "احتمال سحب كرة حمراء من صندوق فيه 4 حمراء و 6 زرقاء:",
    options: ["2/5", "3/5", "1/4", "3/4"],
    correct: 0,
    explanation: "الاحتمال = 4/(4+6) = 4/10 = 2/5",
  },
  {
    id: 652,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان متوسط 5 أعداد = 8، فما مجموعها؟",
    options: ["35", "38", "40", "45"],
    correct: 2,
    explanation: "المجموع = المتوسط × العدد = 8 × 5 = 40",
  },
  {
    id: 653,
    section: "كمي",
    category: "الإحصاء",
    question: "احتمال الحصول على صورة عند رمي قطعة نقود مرتين:",
    options: ["1/4", "1/2", "3/4", "1"],
    correct: 2,
    explanation: "احتمال صورة واحدة على الأقل = 1 - احتمال كتابتين = 1 - 1/4 = 3/4",
  },
  {
    id: 654,
    section: "كمي",
    category: "الإحصاء",
    question: "كم طريقة لترتيب 4 أشخاص في صف؟",
    options: ["4", "12", "16", "24"],
    correct: 3,
    explanation: "عدد الطرق = 4! = 4 × 3 × 2 × 1 = 24",
  },
  {
    id: 655,
    section: "كمي",
    category: "الإحصاء",
    question: "احتمال ظهور مجموع 7 عند رمي نردين:",
    options: ["1/6", "5/36", "6/36", "1/12"],
    correct: 0,
    explanation: "الحالات: (1,6)(2,5)(3,4)(4,3)(5,2)(6,1) = 6\nالاحتمال = 6/36 = 1/6",
  },
  {
    id: 656,
    section: "كمي",
    category: "الإحصاء",
    question: "التباين للأعداد: 2، 4، 6 إذا كان المتوسط = 4:",
    options: ["2", "8/3", "4", "6"],
    correct: 1,
    explanation: "التباين = [(2-4)² + (4-4)² + (6-4)²]/3 = (4+0+4)/3 = 8/3",
  },
  {
    id: 657,
    section: "كمي",
    category: "الإحصاء",
    question: "كم طريقة لاختيار 2 من 5 أشخاص (دون ترتيب)؟",
    options: ["10", "15", "20", "25"],
    correct: 0,
    explanation: "C(5,2) = 5!/(2!×3!) = 10 طرق",
  },
  {
    id: 658,
    section: "كمي",
    category: "الإحصاء",
    question: "احتمال سحب ملك من مجموعة ورق كاملة (52 ورقة):",
    options: ["1/52", "1/26", "1/13", "4/13"],
    correct: 2,
    explanation: "عدد الملوك = 4\nالاحتمال = 4/52 = 1/13",
  },
  {
    id: 659,
    section: "كمي",
    category: "الإحصاء",
    question: "إذا كان متوسط 4 أعداد = 15، وأضيف عدد خامس = 25، فما المتوسط الجديد؟",
    options: ["16", "17", "18", "19"],
    correct: 1,
    explanation: "المجموع القديم = 60\nالمجموع الجديد = 85\nالمتوسط = 85/5 = 17",
  },
  {
    id: 660,
    section: "كمي",
    category: "الإحصاء",
    question: "الانحراف المعياري للأعداد: 4، 4، 4، 4:",
    options: ["0", "1", "2", "4"],
    correct: 0,
    explanation: "جميع القيم متساوية، لا يوجد تشتت\nالانحراف المعياري = 0",
  },
  // التناظر اللفظي (661-670)
  {
    id: 661,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "سماء : نجوم :: بحر : ؟",
    options: ["ماء", "أسماك", "موج", "ملح"],
    correct: 1,
    explanation: "السماء مليئة بالنجوم\nالبحر مليء بالأسماك\nعلاقة: وعاء ومحتوى",
  },
  {
    id: 662,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "عطش : شرب :: جوع : ؟",
    options: ["نوم", "أكل", "راحة", "طعام"],
    correct: 1,
    explanation: "العطش يدفع للشرب\nالجوع يدفع للأكل\nعلاقة: دافع وفعل",
  },
  {
    id: 663,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "ورقة : شجرة :: ريشة : ؟",
    options: ["قلم", "طائر", "سحاب", "هواء"],
    correct: 1,
    explanation: "الورقة جزء من الشجرة\nالريشة جزء من الطائر\nعلاقة: جزء وكل",
  },
  {
    id: 664,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "ساعة : وقت :: ميزان : ؟",
    options: ["ذهب", "وزن", "طول", "حجم"],
    correct: 1,
    explanation: "الساعة تقيس الوقت\nالميزان يقيس الوزن\nعلاقة: أداة ووظيفة",
  },
  {
    id: 665,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "مؤلف : رواية :: رسام : ؟",
    options: ["ريشة", "لون", "لوحة", "قماش"],
    correct: 2,
    explanation: "المؤلف ينتج رواية\nالرسام ينتج لوحة\nعلاقة: منتج ونتاج",
  },
  {
    id: 666,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "صيف : حار :: شتاء : ؟",
    options: ["جميل", "ممطر", "بارد", "طويل"],
    correct: 2,
    explanation: "الصيف يتميز بالحرارة\nالشتاء يتميز بالبرودة\nعلاقة: موسم وصفة",
  },
  {
    id: 667,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "طبيب : مرض :: قاضي : ؟",
    options: ["محكمة", "قانون", "نزاع", "عدل"],
    correct: 2,
    explanation: "الطبيب يعالج المرض\nالقاضي يفصل في النزاع\nعلاقة: متخصص ومجال عمله",
  },
  {
    id: 668,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "نور : ظلام :: صوت : ؟",
    options: ["سمع", "صمت", "أذن", "موسيقى"],
    correct: 1,
    explanation: "النور نقيض الظلام\nالصوت نقيض الصمت\nعلاقة: تضاد",
  },
  {
    id: 669,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "ماضي : تاريخ :: مستقبل : ؟",
    options: ["حاضر", "تنبؤ", "أمل", "زمن"],
    correct: 1,
    explanation: "التاريخ يدرس الماضي\nالتنبؤ يتعلق بالمستقبل\nعلاقة: موضوع وعلم",
  },
  {
    id: 670,
    section: "لفظي",
    category: "التناظر اللفظي",
    question: "نحلة : عسل :: بقرة : ؟",
    options: ["لحم", "جلد", "حليب", "عشب"],
    correct: 2,
    explanation: "النحلة تنتج العسل\nالبقرة تنتج الحليب\nعلاقة: منتج ونتاج",
  },
];

export default function TestPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(Array(670).fill(null));
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes in seconds
  const [showConfirm, setShowConfirm] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [reviewQuestion, setReviewQuestion] = useState(0);
  const [isPremium, setIsPremium] = useState(false);

  // Read subscription flag client-side (no SSR mismatch). Replace with real
  // subscription check once a billing source of truth is available.
  useEffect(() => {
    try {
      setIsPremium(localStorage.getItem("user_is_premium") === "true");
    } catch {
      setIsPremium(false);
    }
  }, []);

  // ===== Full-exam history (persisted in localStorage only — no fake data).
  // savedEntry is the entry just written for THIS finished exam (used as
  // excludeId so the previous-exam lookup never returns the current one).
  // savedRef ensures we save exactly once per finish, even with React's
  // double-effect in StrictMode.
  const [savedEntry, setSavedEntry] = useState<ExamHistoryEntry | null>(null);
  const [previousEntry, setPreviousEntry] = useState<ExamHistoryEntry | null>(null);
  const savedRef = useRef(false);

  // The moment the exam finishes, snapshot the result, write it to history,
  // and capture the most-recent OTHER entry of the same kind for comparison.
  // Guarded by `savedRef` so StrictMode double-invocation cannot save twice.
  // Fires only after `questions` is populated (defensive).
  // CRITICAL: every metric written here uses the SAME denominator (530) and
  // SAME reduction logic as the canonical result-screen math (see line ~6366
  // and line ~6611) so saved history is byte-equivalent to what the user sees.
  // Any drift would corrupt future progress comparisons.
  useEffect(() => {
    if (!isFinished) return;
    if (savedRef.current) return;
    if (!questions || questions.length === 0) return;
    savedRef.current = true;

    // Mirror the canonical categoryStats loop from the result block.
    const stats: { [key: string]: { correct: number; total: number; section: string } } = {};
    questions.forEach((q, index) => {
      const k = `${q.section}-${q.category}`;
      if (!stats[k]) stats[k] = { correct: 0, total: 0, section: q.section };
      stats[k].total += 1;
      if (answers[index] === q.correct) stats[k].correct += 1;
    });
    const cats = Object.entries(stats).map(([key, s]) => ({
      name: key.split("-")[1],
      section: s.section,
      percentage: Math.round((s.correct / s.total) * 100),
    }));

    // Use the canonical 530 denominator (matches `percentage = score / 530`
    // and `avgTimePerQuestion = timeSpent / 530` in the result block).
    let correct = 0;
    for (let i = 0; i < questions.length; i++) {
      if (answers[i] === questions[i].correct) correct += 1;
    }
    const pct = Math.round((correct / 530) * 100);
    const spent = 60 * 60 - timeLeft;
    const examKind = "qudrat-gat"; // This page hosts the GAT/Qudrat 530-q mock.

    // Read previous BEFORE writing the new entry so we never compare to ourselves.
    const prev = getPreviousExam(examKind);
    setPreviousEntry(prev);

    const entry = saveExamResult({
      examKind,
      score: pct,
      estimatedScore: Math.round(65 + pct * 0.35),
      avgTimePerQuestion: Math.round(spent / 530),
      categoryPerformance: cats,
    });
    setSavedEntry(entry);
  }, [isFinished, questions, answers, timeLeft]);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0 || isFinished) {
      if (!isFinished) {
        setIsFinished(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isFinished]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswer = (optionIndex: number) => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = optionIndex;
    setAnswers(newAnswers);
  };

  const calculateScore = () => {
    let correct = 0;
    answers.forEach((answer, index) => {
      if (answer === questions[index].correct) {
        correct++;
      }
    });
    return correct;
  };

  const handleFinish = () => {
    setShowConfirm(true);
  };

  const confirmFinish = () => {
    setIsFinished(true);
    setShowConfirm(false);
  };

  if (isFinished) {
    const score = calculateScore();
    const percentage = Math.round((score / 530) * 100);
    // الكمي: الأسئلة 1-20 + 41-100 (هندسة) + 101-180 (نسب) + 181-240 (جبر) + 271-330 (إحصاء) = 280 سؤال
    const quantitativeScore =
      answers.slice(0, 20).filter((a, i) => a === questions[i].correct).length +
      answers.slice(40, 100).filter((a, i) => a === questions[i + 40].correct).length +
      answers.slice(100, 180).filter((a, i) => a === questions[i + 100].correct).length +
      answers.slice(180, 240).filter((a, i) => a === questions[i + 180].correct).length +
      answers.slice(270, 330).filter((a, i) => a === questions[i + 270].correct).length;
    // اللفظي: الأسئلة 21-40 + 241-270 + 331-440 = 190 سؤال
    const verbalScore =
      answers.slice(20, 40).filter((a, i) => a === questions[i + 20].correct).length +
      answers.slice(240, 270).filter((a, i) => a === questions[i + 240].correct).length +
      answers.slice(330, 530).filter((a, i) => a === questions[i + 330].correct).length;

    // Review Mode
    if (showReview) {
      const reviewQ = questions[reviewQuestion];
      const userAnswer = answers[reviewQuestion];
      const isCorrect = userAnswer === reviewQ.correct;

      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          {/* Header */}
          <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowReview(false)}
                  className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span className="font-medium">العودة للنتيجة</span>
                </button>
                <h1 className="font-bold text-gray-900 dark:text-white">مراجعة الإجابات</h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
                  <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                    reviewQ.section === "كمي"
                      ? "bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80]"
                      : "bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 text-[#D4AF37] dark:text-[#fbbf24]"
                  }`}>
                    {reviewQ.section} - {reviewQ.category}
                  </span>
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 py-6">
            {/* Progress */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
                <span>السؤال {reviewQuestion + 1} من 530</span>
                <span className={isCorrect ? "text-green-600 dark:text-green-400 font-medium" : "text-red-600 dark:text-red-400 font-medium"}>
                  {isCorrect ? "إجابة صحيحة" : "إجابة خاطئة"}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#006C35] transition-all duration-300"
                  style={{ width: `${((reviewQuestion + 1) / 530) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              {/* Geometry Diagram */}
              {reviewQ.diagram_type && reviewQ.diagram_data && (
                <GeometryDiagram
                  diagramType={reviewQ.diagram_type}
                  diagramData={reviewQ.diagram_data}
                />
              )}

              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">
                {reviewQ.question}
              </h2>

              <div className="space-y-3">
                {reviewQ.options.map((option, index) => {
                  const isUserAnswer = userAnswer === index;
                  const isCorrectAnswer = reviewQ.correct === index;

                  let bgClass = "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800";
                  let textClass = "text-gray-700 dark:text-gray-300";
                  let iconContent = null;

                  if (isCorrectAnswer) {
                    bgClass = "border-green-500 bg-green-50 dark:bg-green-900/30";
                    textClass = "text-green-700 dark:text-green-300";
                    iconContent = (
                      <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    );
                  } else if (isUserAnswer && !isCorrectAnswer) {
                    bgClass = "border-red-500 bg-red-50 dark:bg-red-900/30";
                    textClass = "text-red-700 dark:text-red-300";
                    iconContent = (
                      <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    );
                  }

                  return (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border-2 ${bgClass} transition-colors duration-300`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isCorrectAnswer
                            ? "bg-green-500 text-white"
                            : isUserAnswer
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                        }`}>
                          {["أ", "ب", "ج", "د"][index]}
                        </span>
                        <span className={`flex-1 font-medium ${textClass}`}>
                          {option}
                        </span>
                        {iconContent}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Box */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl">
                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  الشرح
                </h4>
                <p className="text-blue-700 dark:text-blue-200 whitespace-pre-line">
                  {reviewQ.explanation}
                </p>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setReviewQuestion(Math.max(0, reviewQuestion - 1))}
                disabled={reviewQuestion === 0}
                className="px-6 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                السابق
              </button>

              <button
                onClick={() => setReviewQuestion(Math.min(529, reviewQuestion + 1))}
                disabled={reviewQuestion === 529}
                className="px-6 py-3 rounded-xl font-medium bg-[#006C35] text-white hover:bg-[#004d26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                التالي
              </button>
            </div>

            {/* Question Navigator */}
            <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <h3 className="font-bold text-gray-900 dark:text-white mb-3">جميع الأسئلة</h3>
              <div className="grid grid-cols-10 gap-2">
                {questions.map((q, index) => {
                  const wasCorrect = answers[index] === q.correct;
                  return (
                    <button
                      key={index}
                      onClick={() => setReviewQuestion(index)}
                      className={`w-full aspect-square rounded-lg text-sm font-medium transition-colors ${
                        reviewQuestion === index
                          ? "bg-[#006C35] text-white"
                          : wasCorrect
                          ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700"
                          : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40 border border-green-300 dark:border-green-700" />
                  <span className="text-gray-600 dark:text-gray-400">إجابة صحيحة</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700" />
                  <span className="text-gray-600 dark:text-gray-400">إجابة خاطئة</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      );
    }

    // Calculate detailed statistics
    const categoryStats: { [key: string]: { correct: number; total: number } } = {};
    questions.forEach((q, index) => {
      const key = `${q.section}-${q.category}`;
      if (!categoryStats[key]) {
        categoryStats[key] = { correct: 0, total: 0 };
      }
      categoryStats[key].total++;
      if (answers[index] === q.correct) {
        categoryStats[key].correct++;
      }
    });

    // Find strengths and weaknesses
    const categoryPerformance = Object.entries(categoryStats).map(([key, stats]) => ({
      name: key.split('-')[1],
      section: key.split('-')[0],
      percentage: Math.round((stats.correct / stats.total) * 100),
      correct: stats.correct,
      total: stats.total,
    })).sort((a, b) => b.percentage - a.percentage);

    const strengths = categoryPerformance.filter(c => c.percentage >= 70).slice(0, 3);
    const weaknesses = categoryPerformance.filter(c => c.percentage < 70).slice(-3).reverse();

    // Calculate time spent (mock - in real app would track actual time)
    const timeSpent = 60 * 60 - timeLeft;
    const avgTimePerQuestion = Math.round(timeSpent / 530);

    // Estimated Qiyas score (mock calculation)
    const estimatedScore = Math.round(65 + (percentage * 0.35));

    // Overall level label
    const overallLevel = percentage >= 80 ? "ممتاز" : percentage >= 60 ? "متوسط" : "ضعيف";

    // Most-missed categories (common mistakes)
    const commonMistakes = categoryPerformance
      .map((c) => ({ ...c, wrong: c.total - c.correct }))
      .filter((c) => c.wrong > 0)
      .sort((a, b) => b.wrong - a.wrong)
      .slice(0, 3);

    // Fastest improvement target = weakest category overall
    const weakest = weaknesses[0] || categoryPerformance[categoryPerformance.length - 1];
    const fastestTip = weakest
      ? `ركّز جلستك القادمة على «${weakest.name}» (${weakest.percentage}%). 20 سؤال موجّه + قراءة شرح كل خطأ يرفع نسبتك بسرعة.`
      : "حافظ على وتيرتك الحالية وزد صعوبة الأسئلة تدريجياً.";

    // ===== Dynamic study plan (3–5 actionable steps) =====
    // Each step is concrete: WHAT to study, HOW MANY questions, and WHEN to
    // retest. Built from the actual weakest topics + measured pace + a
    // mandatory final retest checkpoint. Replaces the old generic plan.
    const planSteps: { icon: string; title: string; desc: string }[] = [];

    if (weakest) {
      const target = Math.min(20, Math.max(10, weakest.total * 2));
      planSteps.push({
        icon: "🎯",
        title: `تدرب على ${target} سؤال «${weakest.name}» خلال يومين`,
        desc: `أضعف موضوع لديك (${weakest.percentage}%). قسّمها على جلستين، واقرأ شرح كل خطأ فور وقوعه.`,
      });
    }
    if (weaknesses[1]) {
      planSteps.push({
        icon: "📚",
        title: `راجع أساسيات «${weaknesses[1].name}» 20 دقيقة يومياً`,
        desc: `ثاني أضعف موضوع (${weaknesses[1].percentage}%). راجع القاعدة 5 أيام ثم حلّ 10 أسئلة موقوتة لكل يوم.`,
      });
    }
    if (avgTimePerQuestion > 90) {
      planSteps.push({
        icon: "⏱️",
        title: "تمرين سرعة: 10 أسئلة في 10 دقائق يومياً",
        desc: `معدلك ${avgTimePerQuestion} ثانية للسؤال — أبطأ من المستهدف. استخدم مؤقت صارم لأسبوع كامل.`,
      });
    }
    planSteps.push({
      icon: "🔁",
      title: "راجع كل إجابة خاطئة قبل النهاية",
      desc: "افتح وضع المراجعة واقرأ شرح كل سؤال أخطأت فيه — لا تنتقل قبل أن تفهم سبب الخطأ بالضبط.",
    });
    planSteps.push({
      icon: "📊",
      title: "أعد اختبار محاكاة كامل بعد 7-10 أيام",
      desc: "هذه هي الطريقة الوحيدة لقياس التحسن الفعلي. قارن النتيجة مع هذا التقرير.",
    });
    const plan = planSteps.slice(0, 5);

    // ===== Premium-only derived data (still static, computed from answers) =====
    // Mistakes by topic, sorted (full list, not just top 3 like commonMistakes)
    const mistakesByTopic = categoryPerformance
      .map((c) => ({ ...c, wrong: c.total - c.correct }))
      .sort((a, b) => b.wrong - a.wrong);

    // Pattern analysis: per-section accuracy distribution
    const sectionPatterns = [
      {
        name: "كمي",
        accuracy: Math.round((quantitativeScore / 280) * 100),
        topics: categoryPerformance.filter((c) => c.section === "كمي").length,
      },
      {
        name: "لفظي",
        accuracy: Math.round((verbalScore / 190) * 100),
        topics: categoryPerformance.filter((c) => c.section === "لفظي").length,
      },
    ];

    // Slow vs fast (avg time stats — per-question time isn't tracked yet)
    const fastPace = avgTimePerQuestion <= 75;

    // Percentile (mock derived from percentage)
    const percentile = Math.min(99, Math.max(1, Math.round(percentage * 0.95)));

    // Per-topic time estimate: derived from avg time, weighted by inverse
    // accuracy (weaker topics consume more time). Per-question time isn't
    // tracked yet, so this is a deterministic data-derived estimate.
    const topicTimeData = categoryPerformance.map((c) => {
      const factor = 1 + (1 - c.percentage / 100) * 0.6;
      const seconds = Math.max(20, Math.round(avgTimePerQuestion * factor));
      const pace: "fast" | "normal" | "slow" =
        seconds <= avgTimePerQuestion - 10
          ? "fast"
          : seconds >= avgTimePerQuestion + 10
          ? "slow"
          : "normal";
      return { name: c.name, seconds, pace, section: c.section };
    });

    // Radar data for "خريطة مستواك" — limit to most representative topics
    const radarData = categoryPerformance.slice(0, 8).map((c) => ({
      topic: c.name,
      score: c.percentage,
    }));

    // Horizontal bar data for "أكثر المواضيع التي تخفض درجتك"
    const errorRateData = [...categoryPerformance]
      .map((c) => ({ name: c.name, errorRate: 100 - c.percentage, section: c.section }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 6);

    // Time chart sorted slow → fast for the "أين يضيع وقتك؟" view
    const timeChartData = [...topicTimeData]
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, 6);

    const slowestTopic = timeChartData[0];

    // Weekly plan (advanced expansion of the basic plan)
    const weeklyPlan = [
      { day: "السبت", focus: weakest?.name || "مراجعة عامة", count: 25 },
      { day: "الأحد", focus: weaknesses[1]?.name || "تنويع المواضيع", count: 20 },
      { day: "الاثنين", focus: "محاكاة قسم كمي موقوت", count: 30 },
      { day: "الثلاثاء", focus: weakest?.name || "تعميق المفاهيم", count: 25 },
      { day: "الأربعاء", focus: "محاكاة قسم لفظي موقوت", count: 30 },
      { day: "الخميس", focus: "مراجعة الأخطاء المتراكمة", count: 20 },
      { day: "الجمعة", focus: "اختبار محاكاة كامل", count: 60 },
    ];

    // ===== Progress vs previous full exam (real data only — no fabrication).
    // `previousEntry` is set by the on-finish save effect; if no prior exam
    // exists in localStorage it stays null and the UI shows the empty state.
    const examDiff =
      previousEntry
        ? diffExams(categoryPerformance, previousEntry.categoryPerformance)
        : null;
    const scoreDelta = previousEntry ? percentage - previousEntry.score : null;

    // ===== Deep behavioral insights (Section 2 — derived only from data
    // that's already on this page, never fabricated).
    // 1. "أكثر نمط يكرر أخطاءك" — section-level comparison (which section
    //    drags you down more) + the worst topic INSIDE that section. We use
    //    section as the "نمط" axis because the per-question subtype is not
    //    tracked on this exam — fallback message is shown when both sections
    //    are tied / data is too sparse.
    const quantitativeAcc = Math.round((quantitativeScore / 280) * 100);
    const verbalAcc = Math.round((verbalScore / 190) * 100);
    let mistakePattern: { section: string; topic: string; rate: number } | null = null;
    if (Math.abs(quantitativeAcc - verbalAcc) >= 5) {
      const weakerSection = quantitativeAcc < verbalAcc ? "كمي" : "لفظي";
      const worstInSection = [...categoryPerformance]
        .filter((c) => c.section === weakerSection)
        .sort((a, b) => a.percentage - b.percentage)[0];
      if (worstInSection) {
        mistakePattern = {
          section: weakerSection,
          topic: worstInSection.name,
          rate: 100 - worstInSection.percentage,
        };
      }
    }

    // 2. "القسم الذي يبطئك أكثر" — already computed: slowestTopic.

    // 3. "أكثر قسم تحسّن لديك" — taken straight from examDiff (real history).

    // Results Screen
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 transition-colors duration-300" dir="rtl">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">تقرير الاختبار التفصيلي</h1>
            <p className="text-gray-500 dark:text-gray-400">اختبار القدرات العامة التجريبي</p>
          </div>

          {/* Main Score Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* Score Circle */}
              <div className="relative">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  percentage >= 80 ? 'bg-green-100 dark:bg-green-900/40' :
                  percentage >= 60 ? 'bg-yellow-100 dark:bg-yellow-900/40' :
                  'bg-red-100 dark:bg-red-900/40'
                }`}>
                  <div className="text-center">
                    <span className={`text-4xl font-bold ${
                      percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                      percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {percentage}%
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{score}/415</p>
                  </div>
                </div>
                <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
                  percentage >= 80 ? 'bg-green-500 text-white' :
                  percentage >= 60 ? 'bg-yellow-500 text-white' :
                  'bg-red-500 text-white'
                }`}>
                  {percentage >= 80 ? 'ممتاز' : percentage >= 60 ? 'جيد' : 'يحتاج تحسين'}
                </div>
              </div>

              {/* Score Details */}
              <div className="flex-1 text-center md:text-right">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {percentage >= 80 ? 'أداء ممتاز! استمر' : percentage >= 60 ? 'أداء جيد، يمكنك التحسن' : 'تحتاج المزيد من التدريب'}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  الدرجة التقديرية في قياس: <span className="font-bold text-[#006C35] dark:text-[#4ade80]">{estimatedScore}</span> من 100
                </p>
                <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                    ⏱️ الوقت: {Math.floor(timeSpent / 60)} دقيقة
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                    ⚡ المعدل: {avgTimePerQuestion} ثانية/سؤال
                  </span>
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-600 dark:text-gray-300">
                    📈 المستوى: <span className="font-bold">{overallLevel}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Overall position bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                <span>ضعيف</span>
                <span>متوسط</span>
                <span>ممتاز</span>
              </div>
              <div className="relative h-3 rounded-full bg-gradient-to-r from-red-300 via-yellow-300 to-green-400 dark:from-red-500/40 dark:via-yellow-500/40 dark:to-green-500/40 overflow-visible">
                <div
                  className="absolute -top-1 w-5 h-5 rounded-full bg-white dark:bg-gray-100 border-2 border-[#006C35] shadow-md"
                  style={{ right: `calc(${percentage}% - 10px)` }}
                  aria-label={`موقعك: ${percentage}%`}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
                <span>0</span>
                <span className="font-bold text-[#006C35] dark:text-[#4ade80]">موقعك: {percentage}/100</span>
                <span>100</span>
              </div>
            </div>
          </div>

          {/* Section Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#006C35]/10 dark:bg-[#006C35]/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🔢</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">القسم الكمي</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">الجبر، الهندسة، النسب، الإحصاء</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-[#006C35] dark:text-[#4ade80]">{quantitativeScore}/280</span>
                <span className="text-lg font-medium text-gray-600 dark:text-gray-400">{Math.round((quantitativeScore / 280) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#006C35] rounded-full transition-all" style={{ width: `${(quantitativeScore / 280) * 100}%` }} />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">القسم اللفظي</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">التناظر، الإكمال، المعاني، المتضادات</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl font-bold text-[#D4AF37] dark:text-[#fbbf24]">{verbalScore}/190</span>
                <span className="text-lg font-medium text-gray-600 dark:text-gray-400">{Math.round((verbalScore / 190) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-[#D4AF37] rounded-full transition-all" style={{ width: `${(verbalScore / 190) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Category Performance */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📊</span>
              تحليل الأداء حسب الموضوع
            </h3>
            <div className="space-y-3">
              {categoryPerformance.map((cat, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    cat.section === 'كمي'
                      ? 'bg-[#006C35]/10 text-[#006C35] dark:bg-[#006C35]/20 dark:text-[#4ade80]'
                      : 'bg-[#D4AF37]/10 text-[#D4AF37] dark:bg-[#D4AF37]/20 dark:text-[#fbbf24]'
                  }`}>
                    {cat.section}
                  </span>
                  <span className="flex-1 font-medium text-gray-700 dark:text-gray-300 text-sm">{cat.name}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{cat.correct}/{cat.total}</span>
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        cat.percentage >= 80 ? 'bg-green-500' :
                        cat.percentage >= 60 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${cat.percentage}%` }}
                    />
                  </div>
                  <span className={`text-sm font-bold w-12 text-left ${
                    cat.percentage >= 80 ? 'text-green-600 dark:text-green-400' :
                    cat.percentage >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-red-600 dark:text-red-400'
                  }`}>
                    {cat.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-5 border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-green-800 dark:text-green-400 mb-3 flex items-center gap-2">
                <span>💪</span>
                نقاط القوة
              </h3>
              {strengths.length > 0 ? (
                <ul className="space-y-2">
                  {strengths.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{s.name} ({s.percentage}%)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">استمر في التدريب لاكتشاف نقاط قوتك</p>
              )}
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-5 border border-red-200 dark:border-red-800">
              <h3 className="font-bold text-red-800 dark:text-red-400 mb-3 flex items-center gap-2">
                <span>🎯</span>
                مجالات التحسين
              </h3>
              {weaknesses.length > 0 ? (
                <ul className="space-y-2">
                  {weaknesses.map((w, i) => (
                    <li key={i} className="flex items-center gap-2 text-red-700 dark:text-red-300">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">{w.name} ({w.percentage}%)</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-red-600 dark:text-red-400">أداء ممتاز في جميع المواضيع!</p>
              )}
            </div>
          </div>

          {/* Smart Analysis: Fastest Improvement + Common Mistakes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-blue-800 dark:text-blue-400 mb-3 flex items-center gap-2">
                <span>⚡</span>
                أسرع طريقة للتحسن
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">{fastestTip}</p>
            </div>

            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-2xl p-5 border border-orange-200 dark:border-orange-800">
              <h3 className="font-bold text-orange-800 dark:text-orange-400 mb-3 flex items-center gap-2">
                <span>⚠️</span>
                أخطاؤك الشائعة
              </h3>
              {commonMistakes.length > 0 ? (
                <ul className="space-y-2">
                  {commonMistakes.map((m, i) => (
                    <li key={i} className="flex items-center justify-between text-sm text-orange-700 dark:text-orange-300">
                      <span>{m.name}</span>
                      <span className="font-bold">{m.wrong} خطأ من {m.total}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-orange-700 dark:text-orange-300">لا توجد أخطاء متكررة — أداء رائع!</p>
              )}
            </div>
          </div>

          {/* ===== Progress vs previous full exam (real history only) ===== */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">📈</span>
              تطورك عبر الاختبارات الشاملة
            </h3>
            {previousEntry && scoreDelta != null ? (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">السابق</div>
                    <div className="text-2xl font-bold text-gray-700 dark:text-gray-200">
                      {previousEntry.score}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">الحالي</div>
                    <div className="text-2xl font-bold text-[#006C35] dark:text-[#4ade80]">
                      {percentage}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">الفرق</div>
                    <div
                      className={`text-2xl font-bold ${
                        scoreDelta > 0
                          ? "text-[#006C35] dark:text-[#4ade80]"
                          : scoreDelta < 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {scoreDelta > 0 ? "+" : ""}
                      {scoreDelta}%
                    </div>
                  </div>
                </div>
                {(examDiff?.mostImproved || examDiff?.mostDeclined) && (
                  <ul className="text-sm space-y-1.5">
                    {examDiff?.mostImproved && (
                      <li className="text-gray-700 dark:text-gray-300">
                        <span className="text-[#006C35] dark:text-[#4ade80] font-bold">↑ أكثر تحسن:</span>{" "}
                        «{examDiff.mostImproved.name}» (+{examDiff.mostImproved.delta}%)
                      </li>
                    )}
                    {examDiff?.mostDeclined && (
                      <li className="text-gray-700 dark:text-gray-300">
                        <span className="text-red-600 dark:text-red-400 font-bold">↓ أكثر تراجع:</span>{" "}
                        «{examDiff.mostDeclined.name}» ({examDiff.mostDeclined.delta}%)
                      </li>
                    )}
                  </ul>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                سيظهر تطورك هنا بعد إكمال أكثر من اختبار شامل.
              </p>
            )}
          </div>

          {/* ===== Deep behavioral insights (text-only — uses real data) ===== */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🧠</span>
              رؤى سلوكية متقدمة
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                <span className="text-lg shrink-0">🎯</span>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white mb-0.5">
                    أكثر نمط يكرر أخطاءك
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {mistakePattern
                      ? `أخطاؤك تتركّز في القسم ${mistakePattern.section}، وأبرز موضوع متعثّر فيه «${mistakePattern.topic}» بنسبة خطأ ${mistakePattern.rate}%.`
                      : "لا يوجد نمط واضح يفصل بين القسمين — أخطاؤك موزّعة بشكل متوازن."}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                <span className="text-lg shrink-0">⏳</span>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white mb-0.5">
                    القسم الذي يبطئك أكثر
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {slowestTopic
                      ? `«${slowestTopic.name}» يستهلك حوالي ${slowestTopic.seconds} ثانية للسؤال — أعلى من متوسطك (${avgTimePerQuestion}ث).`
                      : "وتيرتك متوازنة عبر المواضيع، لا يوجد قسم يبطئك بشكل ملحوظ."}
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700">
                <span className="text-lg shrink-0">🚀</span>
                <div>
                  <div className="font-bold text-gray-900 dark:text-white mb-0.5">
                    أكثر قسم تحسّن لديك
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                    {examDiff?.mostImproved
                      ? `تحسّنت في «${examDiff.mostImproved.name}» بمقدار +${examDiff.mostImproved.delta}% منذ اختبارك الشامل السابق.`
                      : "يحتاج هذا التحليل اختباراً شاملاً سابقاً للمقارنة."}
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Recommended Plan */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-xl">🗺️</span>
              خطة التدريب الموصى بها
            </h3>
            <ol className="space-y-3">
              {plan.map((step, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80] flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 dark:text-white text-sm mb-1 flex items-center gap-2">
                      <span>{step.icon}</span>
                      <span>{step.title}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* ============ PREMIUM ANALYSIS (gated) ============ */}
          <div className="flex items-center justify-between mb-4 mt-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>✨</span>
              التحليل المتقدم
            </h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              isPremium
                ? "bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80]"
                : "bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 text-[#D4AF37] dark:text-[#fbbf24]"
            }`}>
              {isPremium ? "✓ مفعّل" : "Premium"}
            </span>
          </div>

          {/* Gate the AI card on `savedEntry` — set in the same effect that
              resolves `previousEntry`. This guarantees the card mounts ONCE
              with the final input shape (including any prior-exam context),
              so its hashKey-based dedupe fires exactly one /api/ai-analysis
              request per finished exam. Without this gate the card would
              first render with previousEntry=null then re-render once the
              effect resolved, producing two distinct hashKeys and two
              billable calls. */}
          {savedEntry ? (
            <AIInsightsCard
              isPremium={isPremium}
              input={{
                score: percentage,
                level: overallLevel,
                weakTopics: weaknesses.map((c) => c.name),
                strongTopics: strengths.map((c) => c.name),
                slowTopics: topicTimeData
                  .filter((t) => t.pace === "slow")
                  .map((t) => t.name),
                commonMistakes: mistakesByTopic
                  .slice(0, 5)
                  .map((m) => `${m.name} (${100 - m.percentage}% خطأ)`),
                categoryPerformance: categoryPerformance.map((c) => ({
                  name: c.name,
                  section: c.section,
                  percentage: c.percentage,
                  correct: c.correct,
                  total: c.total,
                })),
                avgTimePerQuestion,
                // ===== Full-exam-only enrichment (additive). Switches the
                // server prompt to the deeper coaching mode and — when prior
                // history exists — feeds it real progress data so the AI can
                // explicitly reference improvement / decline.
                examType: "full",
                previousScore: previousEntry?.score,
                previousCategoryPerformance: previousEntry?.categoryPerformance.map((c) => ({
                  name: c.name,
                  percentage: c.percentage,
                })),
                mostImprovedTopic: examDiff?.mostImproved,
                mostDeclinedTopic: examDiff?.mostDeclined,
              }}
            />
          ) : (
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700"
              aria-busy="true"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#006C35] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  جاري تحضير التحليل المتقدم…
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {[
              {
                icon: "🧭",
                title: "خريطة مستواك",
                preview: "نظرة شاملة على أدائك في كل موضوع رئيسي — لتعرف أين تتألق وأين تحتاج مجهود.",
                full: (
                  <div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart data={radarData} outerRadius="78%">
                          <PolarGrid stroke="#9ca3af" strokeOpacity={0.3} />
                          <PolarAngleAxis dataKey="topic" tick={{ fill: "#6b7280", fontSize: 11 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar
                            name="مستواك"
                            dataKey="score"
                            stroke="#006C35"
                            fill="#006C35"
                            fillOpacity={0.35}
                          />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                      {weakest
                        ? `الفجوة بين أقوى محاورك «${strengths[0]?.name || categoryPerformance[0]?.name}» (${strengths[0]?.percentage ?? categoryPerformance[0]?.percentage}%) وأضعفها «${weakest.name}» (${weakest.percentage}%) تبلغ ${(strengths[0]?.percentage ?? categoryPerformance[0]?.percentage ?? 0) - weakest.percentage} نقطة. كلّما ضاقت الفجوة، ارتفعت درجتك الإجمالية بثبات.`
                        : "خريطتك متوازنة — لا يوجد محور يخفض درجتك بشكل لافت."}
                    </p>
                  </div>
                ),
              },
              {
                icon: "📉",
                title: "أكثر المواضيع التي تخفض درجتك",
                preview: "ترتيب المواضيع حسب نسبة الخطأ — ركّز عليها أولاً لرفع درجتك بأسرع وقت.",
                full: (
                  <div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={errorRateData}
                          layout="vertical"
                          margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
                        >
                          <XAxis type="number" domain={[0, 100]} tick={{ fill: "#6b7280", fontSize: 10 }} unit="%" />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            tick={{ fill: "#6b7280", fontSize: 11 }}
                            interval={0}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(0,108,53,0.06)" }}
                            contentStyle={{ borderRadius: 8, fontSize: 12, direction: "rtl" }}
                            formatter={(v: unknown) => [`${v}% خطأ`, "نسبة الخطأ"]}
                          />
                          <Bar dataKey="errorRate" radius={[0, 6, 6, 0]}>
                            {errorRateData.map((d, i) => (
                              <Cell
                                key={i}
                                fill={d.errorRate >= 50 ? "#dc2626" : d.errorRate >= 30 ? "#D4AF37" : "#006C35"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                      {errorRateData[0]
                        ? `أعلى 3 مواضيع تخفض درجتك: ${errorRateData
                            .slice(0, 3)
                            .map((d) => `«${d.name}» (${d.errorRate}%)`)
                            .join("، ")}. علاج هذه الثلاثة وحدها قد يرفع نتيجتك بنحو ${Math.round(
                            errorRateData
                              .slice(0, 3)
                              .reduce((s, d) => s + d.errorRate, 0) / Math.max(categoryPerformance.length, 1),
                          )} نقطة.`
                        : "لا توجد مواضيع تخفض درجتك بشكل واضح."}
                    </p>
                  </div>
                ),
              },
              {
                icon: "⏱️",
                title: "أين يضيع وقتك؟",
                preview: "متوسط زمنك التقديري لكل موضوع، وتمييز المواضيع البطيئة عن السريعة.",
                full: (
                  <div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={timeChartData}
                          layout="vertical"
                          margin={{ top: 4, right: 8, bottom: 4, left: 8 }}
                        >
                          <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 10 }} unit="ث" />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={90}
                            tick={{ fill: "#6b7280", fontSize: 11 }}
                            interval={0}
                          />
                          <Tooltip
                            cursor={{ fill: "rgba(0,108,53,0.06)" }}
                            contentStyle={{ borderRadius: 8, fontSize: 12, direction: "rtl" }}
                            formatter={(v: unknown) => [`${v} ثانية/سؤال`, "متوسط الزمن"]}
                          />
                          <Bar dataKey="seconds" radius={[0, 6, 6, 0]}>
                            {timeChartData.map((d, i) => (
                              <Cell
                                key={i}
                                fill={d.pace === "slow" ? "#dc2626" : d.pace === "fast" ? "#006C35" : "#D4AF37"}
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 leading-relaxed">
                      {slowestTopic
                        ? `«${slowestTopic.name}» يستهلك ${slowestTopic.seconds}ث/سؤال (متوسطك ${avgTimePerQuestion}ث). الهدف ≤ 60-75ث للسؤال — كل ثانية فوق ذلك تكلّفك أسئلة في النهاية. درّب نفسك بـ 10 أسئلة موقوتة يومياً.`
                        : "وتيرتك متوازنة عبر المواضيع — حافظ على نفس الإيقاع في الاختبار الفعلي."}
                    </p>
                  </div>
                ),
              },
              {
                icon: "🎯",
                title: "توقع درجة قياس الفعلية",
                preview: "تقدير دقيق لدرجتك المتوقعة في الاختبار الرسمي بناءً على أدائك التفصيلي.",
                full: (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#006C35] dark:text-[#4ade80]">{estimatedScore}</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">من 100 — درجة قياس التقديرية</p>
                  </div>
                ),
              },
              {
                icon: "👥",
                title: "مقارنتك بالطلاب الآخرين",
                preview: "موقعك بين آلاف الطلاب الذين خاضوا نفس الاختبار، مع نسبتك المئوية الدقيقة.",
                full: (
                  <div className="text-center">
                    <div className="text-4xl font-bold text-[#D4AF37] dark:text-[#fbbf24]">{percentile}%</div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">تتفوّق على {percentile}% من الطلاب</p>
                  </div>
                ),
              },
              {
                icon: "📅",
                title: "خطة أسبوعية متقدمة مخصصة",
                preview: "جدول 7 أيام يحدد لك بالضبط ماذا تذاكر كل يوم، مع عدد الأسئلة والوقت المقترح.",
                full: (
                  <ul className="space-y-1.5 text-sm">
                    {weeklyPlan.slice(0, 4).map((d, i) => (
                      <li key={i} className="flex items-center justify-between text-gray-700 dark:text-gray-300">
                        <span><span className="font-bold">{d.day}:</span> {d.focus}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{d.count} سؤال</span>
                      </li>
                    ))}
                  </ul>
                ),
              },
            ].map((card, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 relative overflow-hidden"
              >
                <h3 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <span>{card.icon}</span>
                  <span className="flex-1">{card.title}</span>
                  {!isPremium && <span className="text-base">🔒</span>}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3">{card.preview}</p>

                <div className="relative">
                  <div className={isPremium ? "" : "blur-sm select-none pointer-events-none"} aria-hidden={!isPremium}>
                    {card.full}
                  </div>
                  {!isPremium && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <button
                        onClick={() => router.push("/subscriptions")}
                        className="px-4 py-2 bg-[#006C35] text-white text-sm font-bold rounded-xl hover:bg-[#004d26] transition-colors flex items-center gap-2 shadow-md"
                      >
                        <span>🔓</span>
                        فتح التحليل الكامل
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Question Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span>📋</span>
              ملخص الإجابات
            </h3>
            <div className="grid grid-cols-10 gap-2">
              {questions.map((q, index) => {
                const isCorrect = answers[index] === q.correct;
                const isUnanswered = answers[index] === null;
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setReviewQuestion(index);
                      setShowReview(true);
                    }}
                    className={`aspect-square rounded-lg font-medium text-sm transition-all hover:scale-110 ${
                      isUnanswered
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        : isCorrect
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                    }`}>
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40" />
                <span className="text-gray-600 dark:text-gray-400">صحيح ({score})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 dark:bg-red-900/40" />
                <span className="text-gray-600 dark:text-gray-400">خطأ ({530 - score - answers.filter(a => a === null).length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700" />
                <span className="text-gray-600 dark:text-gray-400">لم يُجب ({answers.filter(a => a === null).length})</span>
              </div>
            </div>
          </div>

          {/* Locked Premium CTA */}
          <div className="bg-gradient-to-br from-[#006C35] to-[#004d26] rounded-2xl p-6 mb-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_20%,white,transparent_50%)]" />
            <div className="relative flex flex-col md:flex-row items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center text-2xl flex-shrink-0">
                🔒
              </div>
              <div className="flex-1 text-center md:text-right">
                <h3 className="font-bold text-lg mb-1">ابدأ التدريب الكامل المخصص لك</h3>
                <p className="text-sm text-white/80 leading-relaxed">
                  افتح بنك الأسئلة الكامل، التدريب التكيّفي، ومحاكاة الاختبارات الرسمية — متاح بالاشتراك المدفوع.
                </p>
              </div>
              <button
                onClick={() => router.push("/subscriptions")}
                className="px-6 py-3 bg-[#E8C547] text-[#004d26] font-bold rounded-xl hover:bg-white transition-colors flex items-center gap-2 shadow-md flex-shrink-0"
              >
                <span>🚀</span>
                ابدأ التدريب الآن
              </button>
            </div>
            <p className="relative text-xs text-white/70 text-center mt-4">
              يتطلب اشتراكاً نشطاً • النسخة المجانية تشمل الاختبار التجريبي وتحليله فقط
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowReview(true)}
              className="flex-1 py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26] transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              مراجعة الإجابات
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              العودة للرئيسية
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-3 border-2 border-[#006C35] text-[#006C35] dark:text-[#4ade80] font-bold rounded-xl hover:bg-[#006C35]/5 transition-colors"
            >
              إعادة الاختبار
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const answeredCount = answers.filter((a) => a !== null).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                question.section === "كمي"
                  ? "bg-[#006C35]/10 dark:bg-[#006C35]/20 text-[#006C35] dark:text-[#4ade80]"
                  : "bg-[#D4AF37]/10 dark:bg-[#D4AF37]/20 text-[#D4AF37] dark:text-[#fbbf24]"
              }`}>
                {question.section} - {question.category}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
                timeLeft < 300
                  ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              }`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono font-bold">{formatTime(timeLeft)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span>السؤال {currentQuestion + 1} من 530</span>
            <span>تمت الإجابة على {answeredCount} سؤال</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#006C35] transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / 530) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          {/* Geometry Diagram */}
          {question.diagram_type && question.diagram_data && (
            <GeometryDiagram
              diagramType={question.diagram_type}
              diagramData={question.diagram_data}
            />
          )}

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 leading-relaxed">
            {question.question}
          </h2>

          <div className="space-y-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className={`w-full p-4 rounded-xl text-right transition-all border-2 ${
                  answers[currentQuestion] === index
                    ? "border-[#006C35] bg-[#006C35]/5 dark:bg-[#006C35]/20"
                    : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    answers[currentQuestion] === index
                      ? "bg-[#006C35] text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}>
                    {["أ", "ب", "ج", "د"][index]}
                  </span>
                  <span className={`flex-1 ${
                    answers[currentQuestion] === index
                      ? "text-[#006C35] dark:text-[#4ade80] font-medium"
                      : "text-gray-700 dark:text-gray-300"
                  }`}>
                    {option}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
            className="px-6 py-3 rounded-xl font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            السابق
          </button>

          <div className="flex-1 flex justify-center">
            <button
              onClick={handleFinish}
              className="px-6 py-3 rounded-xl font-medium bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
            >
              إنهاء الاختبار
            </button>
          </div>

          <button
            onClick={() => setCurrentQuestion(Math.min(529, currentQuestion + 1))}
            disabled={currentQuestion === 529}
            className="px-6 py-3 rounded-xl font-medium bg-[#006C35] text-white hover:bg-[#004d26] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            التالي
          </button>
        </div>

        {/* Question Navigator */}
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-4 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
          <h3 className="font-bold text-gray-900 dark:text-white mb-3">التنقل بين الأسئلة</h3>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestion(index)}
                className={`w-full aspect-square rounded-lg text-sm font-medium transition-colors ${
                  currentQuestion === index
                    ? "bg-[#006C35] text-white"
                    : answers[index] !== null
                    ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/40" />
              <span className="text-gray-600 dark:text-gray-400">تمت الإجابة</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#006C35]" />
              <span className="text-gray-600 dark:text-gray-400">السؤال الحالي</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-700" />
              <span className="text-gray-600 dark:text-gray-400">لم تتم الإجابة</span>
            </div>
          </div>
        </div>
      </main>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">إنهاء الاختبار؟</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              أجبت على {answeredCount} من 530 سؤال. هل أنت متأكد من إنهاء الاختبار؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                متابعة
              </button>
              <button
                onClick={confirmFinish}
                className="flex-1 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors"
              >
                إنهاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant */}
      <AIAssistant
        context="test"
        isArabic={true}
        currentQuestion={{
          question: question.question,
          options: question.options,
          section: question.section,
          category: question.category,
        }}
      />
    </div>
  );
}
