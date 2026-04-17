"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useTraining } from "@/contexts/TrainingContext";
import {
  AdaptiveQuestionSelector,
  TrainingSession,
  type TrainingQuestion,
  type SelectedQuestion
} from "@/lib/trainingEngine";

// Complete question bank for training
const trainingQuestions: TrainingQuestion[] = [
  // الجبر - Easy
  { id: "alg-1", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان س + 5 = 12، فما قيمة س؟", options: ["5", "6", "7", "8"], correct: 2, explanation: "لإيجاد قيمة س، نطرح 5 من طرفي المعادلة:\nس + 5 - 5 = 12 - 5\nس = 7", difficulty: "easy" },
  { id: "alg-2", section: "كمي", category: "الجبر", topic: "algebra", question: "ما قيمة س في المعادلة: 2س - 4 = 10؟", options: ["5", "6", "7", "8"], correct: 2, explanation: "نضيف 4 لطرفي المعادلة:\n2س = 14\nثم نقسم على 2:\nس = 7", difficulty: "easy" },
  { id: "alg-3", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان 3س = 27، فما قيمة س؟", options: ["7", "8", "9", "10"], correct: 2, explanation: "3س = 27\nس = 27 ÷ 3 = 9", difficulty: "easy" },
  { id: "alg-4", section: "كمي", category: "الجبر", topic: "algebra", question: "ما ناتج: 4 × 5 - 3؟", options: ["15", "16", "17", "18"], correct: 2, explanation: "نبدأ بالضرب: 4 × 5 = 20\nثم الطرح: 20 - 3 = 17", difficulty: "easy" },
  { id: "alg-5", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان س + 8 = 15، فما قيمة 2س؟", options: ["12", "14", "16", "18"], correct: 1, explanation: "س = 15 - 8 = 7\n2س = 2 × 7 = 14", difficulty: "easy" },

  // الجبر - Medium
  { id: "alg-6", section: "كمي", category: "الجبر", topic: "algebra", question: "حل المعادلة: س² - 9 = 0", options: ["س = 3", "س = -3", "س = ±3", "س = 9"], correct: 2, explanation: "س² - 9 = 0\nس² = 9\nس = ±√9\nس = ±3", difficulty: "medium" },
  { id: "alg-7", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان 3س = 27، فإن س² =", options: ["9", "27", "81", "243"], correct: 2, explanation: "أولاً نجد قيمة س:\n3س = 27\nس = 9\nثم نحسب س²:\nس² = 9² = 81", difficulty: "medium" },
  { id: "alg-8", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان س² - 5س + 6 = 0، فما مجموع جذري المعادلة؟", options: ["3", "4", "5", "6"], correct: 2, explanation: "مجموع الجذور = -ب/أ = 5/1 = 5", difficulty: "medium" },
  { id: "alg-9", section: "كمي", category: "الجبر", topic: "algebra", question: "حل المتباينة: 2س - 3 > 5", options: ["س > 4", "س > 3", "س < 4", "س < 3"], correct: 0, explanation: "2س - 3 > 5\n2س > 8\nس > 4", difficulty: "medium" },
  { id: "alg-10", section: "كمي", category: "الجبر", topic: "algebra", question: "ما قيمة: √144؟", options: ["10", "11", "12", "13"], correct: 2, explanation: "√144 = 12 لأن 12 × 12 = 144", difficulty: "medium" },

  // الجبر - Hard
  { id: "alg-11", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان |س - 2| = 5، فإن س =", options: ["7 أو -3", "7 أو 3", "-7 أو 3", "7 فقط"], correct: 0, explanation: "س - 2 = 5 ← س = 7\nأو س - 2 = -5 ← س = -3", difficulty: "hard" },
  { id: "alg-12", section: "كمي", category: "الجبر", topic: "algebra", question: "ما قيمة لو₂(8)؟", options: ["2", "3", "4", "8"], correct: 1, explanation: "لو₂(8) = لو₂(2³) = 3", difficulty: "hard" },
  { id: "alg-13", section: "كمي", category: "الجبر", topic: "algebra", question: "بسّط: (س² - 4)/(س - 2)", options: ["س + 2", "س - 2", "س² - 2", "2س"], correct: 0, explanation: "(س² - 4)/(س - 2) = (س+2)(س-2)/(س-2) = س + 2", difficulty: "hard" },
  { id: "alg-14", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان (س + 2)(س - 3) = 0، فإن قيم س هي:", options: ["2، 3", "-2، 3", "2، -3", "-2، -3"], correct: 1, explanation: "عندما يكون حاصل ضرب عددين = صفر، فأحدهما على الأقل = صفر\nس + 2 = 0 ← س = -2\nأو س - 3 = 0 ← س = 3", difficulty: "hard" },
  { id: "alg-15", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان س³ = 64، فما قيمة س؟", options: ["2", "3", "4", "8"], correct: 2, explanation: "س³ = 64\nس = ∛64 = 4", difficulty: "hard" },

  // الهندسة - Easy
  { id: "geo-1", section: "كمي", category: "الهندسة", topic: "geometry", question: "مساحة مربع طول ضلعه 5 سم تساوي:", options: ["10 سم²", "20 سم²", "25 سم²", "30 سم²"], correct: 2, explanation: "مساحة المربع = طول الضلع × طول الضلع\nالمساحة = 5 × 5 = 25 سم²", difficulty: "easy" },
  { id: "geo-2", section: "كمي", category: "الهندسة", topic: "geometry", question: "مجموع زوايا المثلث يساوي:", options: ["90°", "180°", "270°", "360°"], correct: 1, explanation: "مجموع زوايا أي مثلث = 180 درجة", difficulty: "easy" },
  { id: "geo-3", section: "كمي", category: "الهندسة", topic: "geometry", question: "مساحة المستطيل الذي طوله 8 سم وعرضه 5 سم:", options: ["13 سم²", "26 سم²", "40 سم²", "80 سم²"], correct: 2, explanation: "مساحة المستطيل = الطول × العرض\nالمساحة = 8 × 5 = 40 سم²", difficulty: "easy" },
  { id: "geo-4", section: "كمي", category: "الهندسة", topic: "geometry", question: "محيط مربع طول ضلعه 6 سم:", options: ["12 سم", "18 سم", "24 سم", "36 سم"], correct: 2, explanation: "محيط المربع = 4 × الضلع = 4 × 6 = 24 سم", difficulty: "easy" },
  { id: "geo-5", section: "كمي", category: "الهندسة", topic: "geometry", question: "مساحة المثلث قاعدته 10 سم وارتفاعه 6 سم:", options: ["16 سم²", "30 سم²", "60 سم²", "80 سم²"], correct: 1, explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع = ½ × 10 × 6 = 30 سم²", difficulty: "easy" },

  // الهندسة - Medium
  { id: "geo-6", section: "كمي", category: "الهندسة", topic: "geometry", question: "محيط دائرة نصف قطرها 7 سم يساوي (π = 22/7):", options: ["22 سم", "44 سم", "154 سم", "88 سم"], correct: 1, explanation: "محيط الدائرة = 2 × π × نصف القطر\nالمحيط = 2 × (22/7) × 7 = 44 سم", difficulty: "medium" },
  { id: "geo-7", section: "كمي", category: "الهندسة", topic: "geometry", question: "في المثلث القائم، إذا كان الضلعان القائمان 3 و 4، فإن الوتر يساوي:", options: ["5", "6", "7", "12"], correct: 0, explanation: "نستخدم نظرية فيثاغورس:\nالوتر² = 3² + 4² = 9 + 16 = 25\nالوتر = 5", difficulty: "medium" },
  { id: "geo-8", section: "كمي", category: "الهندسة", topic: "geometry", question: "مساحة الدائرة التي نصف قطرها 7 سم (π = 22/7):", options: ["44 سم²", "88 سم²", "154 سم²", "308 سم²"], correct: 2, explanation: "مساحة الدائرة = π × ر² = (22/7) × 49 = 154 سم²", difficulty: "medium" },
  { id: "geo-9", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما مساحة شبه المنحرف الذي طولا قاعدتيه 6 و 10 وارتفاعه 4؟", options: ["32", "40", "24", "48"], correct: 0, explanation: "المساحة = ½(أ + ب) × ع = ½(6 + 10) × 4 = 32", difficulty: "medium" },
  { id: "geo-10", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما حجم المكعب الذي طول ضلعه 4 سم؟", options: ["16 سم³", "48 سم³", "64 سم³", "256 سم³"], correct: 2, explanation: "حجم المكعب = الضلع³ = 4³ = 64 سم³", difficulty: "medium" },

  // الهندسة - Hard
  { id: "geo-11", section: "كمي", category: "الهندسة", topic: "geometry", question: "مثلث متساوي الأضلاع طول ضلعه 6، ما ارتفاعه؟", options: ["3", "3√3", "6", "6√3"], correct: 1, explanation: "ارتفاع المثلث المتساوي الأضلاع = (√3/2) × الضلع = 3√3", difficulty: "hard" },
  { id: "geo-12", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما مجموع الزوايا الداخلية لسداسي منتظم؟", options: ["540°", "600°", "720°", "1080°"], correct: 2, explanation: "المجموع = (ن - 2) × 180° = (6 - 2) × 180° = 720°", difficulty: "hard" },
  { id: "geo-13", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما مساحة الدائرة المحاطة بمربع ضلعه 10؟ (ط = π)", options: ["25π", "50π", "100π", "10π"], correct: 0, explanation: "قطر الدائرة = ضلع المربع = 10\nنصف القطر = 5\nالمساحة = π × 5² = 25π", difficulty: "hard" },
  { id: "geo-14", section: "كمي", category: "الهندسة", topic: "geometry", question: "حجم الأسطوانة التي نصف قطرها 3 وارتفاعها 7 (π = 22/7):", options: ["66", "198", "396", "594"], correct: 1, explanation: "حجم الأسطوانة = π × ر² × ع = (22/7) × 9 × 7 = 198", difficulty: "hard" },
  { id: "geo-15", section: "كمي", category: "الهندسة", topic: "geometry", question: "قطر مربع مساحته 50 سم²:", options: ["5√2", "10", "10√2", "25"], correct: 1, explanation: "الضلع = √50 = 5√2\nالقطر = الضلع × √2 = 5√2 × √2 = 10", difficulty: "hard" },

  // النسب والتناسب - Easy
  { id: "rat-1", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا كانت نسبة الأولاد إلى البنات 3:2، وعدد الأولاد 15، فكم عدد البنات؟", options: ["8", "10", "12", "15"], correct: 1, explanation: "النسبة 3:2 تعني لكل 3 أولاد هناك 2 بنات\n3 ← 15 (ضربنا في 5)\nإذن 2 ← 2 × 5 = 10 بنات", difficulty: "easy" },
  { id: "rat-2", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "25% من 200 تساوي:", options: ["25", "50", "75", "100"], correct: 1, explanation: "25% من 200 = (25/100) × 200 = 50", difficulty: "easy" },
  { id: "rat-3", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "ما هي النسبة المئوية لـ 15 من 60؟", options: ["15%", "20%", "25%", "30%"], correct: 2, explanation: "النسبة المئوية = (15/60) × 100 = 25%", difficulty: "easy" },
  { id: "rat-4", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا كان سعر قميص 100 ريال وحصل على خصم 20%، فكم السعر بعد الخصم؟", options: ["70 ريال", "75 ريال", "80 ريال", "85 ريال"], correct: 2, explanation: "قيمة الخصم = 20% × 100 = 20 ريال\nالسعر بعد الخصم = 100 - 20 = 80 ريال", difficulty: "easy" },
  { id: "rat-5", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "30% من 150 تساوي:", options: ["35", "40", "45", "50"], correct: 2, explanation: "30% من 150 = 0.30 × 150 = 45", difficulty: "easy" },

  // النسب والتناسب - Medium
  { id: "rat-6", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا أكمل 5 عمال عملاً في 10 أيام، فكم يوماً يحتاج 10 عمال لإكمال نفس العمل؟", options: ["5", "10", "15", "20"], correct: 0, explanation: "هذه علاقة عكسية\n5 عمال × 10 أيام = 10 عمال × س\n50 = 10س\nس = 5 أيام", difficulty: "medium" },
  { id: "rat-7", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "خُلط 3 لترات ماء مع 2 لتر عصير. ما نسبة العصير في الخليط؟", options: ["40%", "60%", "30%", "50%"], correct: 0, explanation: "نسبة العصير = 2/5 = 40%", difficulty: "medium" },
  { id: "rat-8", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "سيارة تقطع 180 كم في 3 ساعات. كم تقطع في 5 ساعات بنفس السرعة؟", options: ["200 كم", "250 كم", "300 كم", "350 كم"], correct: 2, explanation: "السرعة = 180/3 = 60 كم/س\nالمسافة = 60 × 5 = 300 كم", difficulty: "medium" },
  { id: "rat-9", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "ثمن سلعة بعد خصم 25% هو 75 ريال. ما ثمنها الأصلي؟", options: ["90 ريال", "100 ريال", "110 ريال", "125 ريال"], correct: 1, explanation: "75 = 75% من الأصلي\nالأصلي = 75 ÷ 0.75 = 100 ريال", difficulty: "medium" },
  { id: "rat-10", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "زاد راتب موظف من 5000 إلى 6000 ريال. ما نسبة الزيادة؟", options: ["15%", "17%", "20%", "25%"], correct: 2, explanation: "الزيادة = 1000\nنسبة الزيادة = (1000/5000) × 100 = 20%", difficulty: "medium" },

  // النسب والتناسب - Hard
  { id: "rat-11", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا زاد عدد ما بنسبة 20%، ثم نقص بنسبة 20%، ما النسبة النهائية للتغير؟", options: ["0%", "-4%", "+4%", "-20%"], correct: 1, explanation: "100 × 1.2 = 120\n120 × 0.8 = 96\nالتغير = -4%", difficulty: "hard" },
  { id: "rat-12", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا كان أ:ب = 2:3 و ب:ج = 4:5، فما أ:ج؟", options: ["8:15", "2:5", "6:5", "4:15"], correct: 0, explanation: "أ:ب:ج = 8:12:15\nإذن أ:ج = 8:15", difficulty: "hard" },
  { id: "rat-13", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "مبلغ يُقسم بين 3 أشخاص بنسبة 2:3:5، إذا كان نصيب الأول 1000، فما المبلغ الكلي؟", options: ["4000", "5000", "6000", "7500"], correct: 1, explanation: "2 أجزاء = 1000\nالجزء = 500\nالمجموع = 10 أجزاء = 5000", difficulty: "hard" },
  { id: "rat-14", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "سعر سهم زاد 25% ثم زاد 20%. ما نسبة الزيادة الكلية؟", options: ["45%", "50%", "55%", "60%"], correct: 1, explanation: "100 × 1.25 = 125\n125 × 1.20 = 150\nالزيادة = 50%", difficulty: "hard" },
  { id: "rat-15", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا كانت نسبة أعمار أحمد ومحمد 3:5 الآن، وبعد 5 سنوات ستكون 2:3، فما عمر أحمد الآن؟", options: ["10", "15", "20", "25"], correct: 1, explanation: "لنفرض عمر أحمد = 3س ومحمد = 5س\n(3س+5)/(5س+5) = 2/3\n9س+15 = 10س+10\nس = 5\nعمر أحمد = 15", difficulty: "hard" },

  // الإحصاء - Easy
  { id: "stat-1", section: "كمي", category: "الإحصاء", topic: "statistics", question: "المتوسط الحسابي للأعداد: 4، 6، 8، 10، 12 هو:", options: ["6", "8", "10", "12"], correct: 1, explanation: "المتوسط الحسابي = مجموع القيم ÷ عددها\n= (4+6+8+10+12) ÷ 5 = 40 ÷ 5 = 8", difficulty: "easy" },
  { id: "stat-2", section: "كمي", category: "الإحصاء", topic: "statistics", question: "الوسيط للأعداد: 3، 7، 2، 9، 5 هو:", options: ["3", "5", "7", "9"], correct: 1, explanation: "نرتب الأعداد تصاعدياً: 2، 3، 5، 7، 9\nالوسيط = القيمة في المنتصف = 5", difficulty: "easy" },
  { id: "stat-3", section: "كمي", category: "الإحصاء", topic: "statistics", question: "المنوال للأعداد: 2، 3، 3، 4، 5، 3 هو:", options: ["2", "3", "4", "5"], correct: 1, explanation: "المنوال = القيمة الأكثر تكراراً\nالعدد 3 تكرر 3 مرات", difficulty: "easy" },
  { id: "stat-4", section: "كمي", category: "الإحصاء", topic: "statistics", question: "المدى للأعداد: 5، 10، 15، 20، 25 هو:", options: ["5", "10", "15", "20"], correct: 3, explanation: "المدى = أكبر قيمة - أصغر قيمة = 25 - 5 = 20", difficulty: "easy" },
  { id: "stat-5", section: "كمي", category: "الإحصاء", topic: "statistics", question: "إذا كان متوسط درجات 5 طلاب هو 80، فما مجموع درجاتهم؟", options: ["200", "300", "400", "500"], correct: 2, explanation: "المجموع = المتوسط × العدد = 80 × 5 = 400", difficulty: "easy" },

  // الإحصاء - Medium
  { id: "stat-6", section: "كمي", category: "الإحصاء", topic: "statistics", question: "إذا كان التباين = 16، فما الانحراف المعياري؟", options: ["2", "4", "8", "256"], correct: 1, explanation: "الانحراف المعياري = √التباين = √16 = 4", difficulty: "medium" },
  { id: "stat-7", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما احتمال الحصول على عدد زوجي عند رمي حجر نرد؟", options: ["1/6", "1/3", "1/2", "2/3"], correct: 2, explanation: "الأعداد الزوجية: 2، 4، 6 (3 أعداد من 6)\nالاحتمال = 3/6 = 1/2", difficulty: "medium" },
  { id: "stat-8", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما الوسيط للأعداد: 2، 5، 7، 9، 11، 13؟", options: ["7", "8", "9", "7.5"], correct: 1, explanation: "عدد القيم زوجي (6)\nالوسيط = (7+9)/2 = 8", difficulty: "medium" },
  { id: "stat-9", section: "كمي", category: "الإحصاء", topic: "statistics", question: "احتمال سحب كرة حمراء من كيس فيه 3 حمراء و 5 زرقاء:", options: ["3/8", "5/8", "3/5", "5/3"], correct: 0, explanation: "الاحتمال = عدد الكرات الحمراء / المجموع = 3/8", difficulty: "medium" },
  { id: "stat-10", section: "كمي", category: "الإحصاء", topic: "statistics", question: "إذا أُضيف 5 لكل قيمة في مجموعة بيانات، كيف يتغير المتوسط؟", options: ["لا يتغير", "يزيد 5", "يزيد 25", "يتضاعف"], correct: 1, explanation: "عند إضافة ثابت لكل قيمة، يزيد المتوسط بنفس الثابت", difficulty: "medium" },

  // الإحصاء - Hard
  { id: "stat-11", section: "كمي", category: "الإحصاء", topic: "statistics", question: "في تجربة رمي قطعتين نقديتين، ما احتمال الحصول على صورتين؟", options: ["1/2", "1/3", "1/4", "3/4"], correct: 2, explanation: "النتائج: (ص،ص)، (ص،ك)، (ك،ص)، (ك،ك)\nاحتمال صورتين = 1/4", difficulty: "hard" },
  { id: "stat-12", section: "كمي", category: "الإحصاء", topic: "statistics", question: "كم طريقة لترتيب 4 أشخاص في صف واحد؟", options: ["4", "16", "24", "256"], correct: 2, explanation: "عدد الطرق = 4! = 4×3×2×1 = 24", difficulty: "hard" },
  { id: "stat-13", section: "كمي", category: "الإحصاء", topic: "statistics", question: "كم طريقة لاختيار 2 من 5 أشخاص؟", options: ["5", "10", "15", "20"], correct: 1, explanation: "التوافيق = 5!/(2!×3!) = 10", difficulty: "hard" },
  { id: "stat-14", section: "كمي", category: "الإحصاء", topic: "statistics", question: "احتمال الحصول على 6 مرتين متتاليتين عند رمي نرد:", options: ["1/6", "1/12", "1/36", "2/36"], correct: 2, explanation: "الاحتمال = (1/6) × (1/6) = 1/36", difficulty: "hard" },
  { id: "stat-15", section: "كمي", category: "الإحصاء", topic: "statistics", question: "إذا كان معامل الارتباط = -0.8، فهذا يعني:", options: ["علاقة طردية قوية", "علاقة عكسية قوية", "لا علاقة", "علاقة ضعيفة"], correct: 1, explanation: "القيمة السالبة تعني علاقة عكسية\nوالقيمة القريبة من 1 تعني علاقة قوية", difficulty: "hard" },

  // التناظر اللفظي - Easy
  { id: "ana-1", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "سماء : أزرق :: عشب : ؟", options: ["أصفر", "أخضر", "بني", "أحمر"], correct: 1, explanation: "العلاقة: الشيء ولونه المميز\nالسماء لونها أزرق، والعشب لونه أخضر", difficulty: "easy" },
  { id: "ana-2", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "طبيب : مستشفى :: معلم : ؟", options: ["مكتبة", "مدرسة", "مصنع", "متجر"], correct: 1, explanation: "العلاقة: المهنة ومكان العمل", difficulty: "easy" },
  { id: "ana-3", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "قلم : كتابة :: سكين : ؟", options: ["طبخ", "قطع", "أكل", "رسم"], correct: 1, explanation: "العلاقة: الأداة ووظيفتها", difficulty: "easy" },
  { id: "ana-4", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "شمس : نهار :: قمر : ؟", options: ["ضوء", "ظلام", "ليل", "نجوم"], correct: 2, explanation: "العلاقة: الجسم السماوي والوقت المرتبط به", difficulty: "easy" },
  { id: "ana-5", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "أسد : غابة :: سمكة : ؟", options: ["ماء", "بحر", "نهر", "محيط"], correct: 1, explanation: "العلاقة: الكائن وموطنه الطبيعي", difficulty: "easy" },

  // التناظر اللفظي - Medium
  { id: "ana-6", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "مؤلف : كتاب :: مهندس : ؟", options: ["مبنى", "تصميم", "عمارة", "رسم"], correct: 0, explanation: "المؤلف يُنتج كتاباً، والمهندس يُنتج مبنى", difficulty: "medium" },
  { id: "ana-7", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "نحلة : خلية :: نملة : ؟", options: ["مستعمرة", "غابة", "حفرة", "جبل"], correct: 0, explanation: "النحلة تعيش في خلية، والنملة تعيش في مستعمرة", difficulty: "medium" },
  { id: "ana-8", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "رأس : قبعة :: يد : ؟", options: ["ذراع", "قفاز", "ساعة", "خاتم"], correct: 1, explanation: "القبعة تُلبس على الرأس، والقفاز يُلبس على اليد", difficulty: "medium" },
  { id: "ana-9", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "عين : بصر :: أذن : ؟", options: ["صوت", "سمع", "كلام", "موسيقى"], correct: 1, explanation: "العين للبصر، والأذن للسمع", difficulty: "medium" },
  { id: "ana-10", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "طائرة : مطار :: سفينة : ؟", options: ["بحر", "ميناء", "ماء", "شاطئ"], correct: 1, explanation: "الطائرة ترسو في المطار، والسفينة ترسو في الميناء", difficulty: "medium" },

  // التناظر اللفظي - Hard
  { id: "ana-11", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "كتاب : مكتبة :: مريض : ؟", options: ["طبيب", "علاج", "مستشفى", "مرض"], correct: 2, explanation: "الكتاب يوجد في المكتبة، والمريض يوجد في المستشفى", difficulty: "hard" },
  { id: "ana-12", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "ماء : عطش :: طعام : ؟", options: ["جوع", "شبع", "أكل", "طبخ"], correct: 0, explanation: "الماء يروي العطش، والطعام يُشبع الجوع", difficulty: "hard" },
  { id: "ana-13", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "قانون : محامي :: مرض : ؟", options: ["صحة", "مستشفى", "طبيب", "دواء"], correct: 2, explanation: "المحامي يتعامل مع القانون، والطبيب يتعامل مع المرض", difficulty: "hard" },
  { id: "ana-14", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "شجرة : غصن :: نهر : ؟", options: ["ماء", "بحر", "رافد", "شلال"], correct: 2, explanation: "الغصن جزء من الشجرة، والرافد جزء من النهر", difficulty: "hard" },
  { id: "ana-15", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "سكوت : كلام :: ظلام : ؟", options: ["ليل", "نور", "شمس", "قمر"], correct: 1, explanation: "السكوت نقيض الكلام، والظلام نقيض النور", difficulty: "hard" },

  // إكمال الجمل - All levels
  { id: "comp-1", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "العلم نور و_____ ظلمات.", options: ["الحياة", "الجهل", "الفقر", "المرض"], correct: 1, explanation: "العلم نور والجهل ظلمات - مثل عربي شهير", difficulty: "easy" },
  { id: "comp-2", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "الصبر مفتاح _____.", options: ["النجاح", "الفرج", "السعادة", "الحياة"], correct: 1, explanation: "الصبر مفتاح الفرج - مثل عربي شهير", difficulty: "easy" },
  { id: "comp-3", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "من جد _____.", options: ["نجح", "وجد", "حصد", "فاز"], correct: 1, explanation: "من جد وجد - مثل عربي شهير", difficulty: "easy" },
  { id: "comp-4", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "خير الكلام ما _____ ودل.", options: ["طال", "قصر", "قلّ", "كثر"], correct: 2, explanation: "خير الكلام ما قلّ ودل", difficulty: "medium" },
  { id: "comp-5", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "العقل السليم في الجسم _____.", options: ["القوي", "السليم", "الصحيح", "النظيف"], correct: 1, explanation: "العقل السليم في الجسم السليم", difficulty: "easy" },
  { id: "comp-6", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "لا تؤجل عمل اليوم إلى _____.", options: ["أمس", "الآن", "غد", "البارحة"], correct: 2, explanation: "لا تؤجل عمل اليوم إلى الغد", difficulty: "easy" },
  { id: "comp-7", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "الوقت كالسيف إن لم تقطعه _____.", options: ["ذهب", "فات", "قطعك", "ضاع"], correct: 2, explanation: "الوقت كالسيف إن لم تقطعه قطعك", difficulty: "medium" },
  { id: "comp-8", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "من سار على الدرب _____.", options: ["تعب", "وصل", "ضل", "نجح"], correct: 1, explanation: "من سار على الدرب وصل", difficulty: "easy" },

  // استيعاب المقروء
  { id: "read-1", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"القراءة غذاء العقل، وهي من أهم وسائل اكتساب المعرفة.\" - ما الفكرة الرئيسية؟", options: ["أهمية الغذاء", "أهمية القراءة", "أهمية العقل", "أهمية المعرفة"], correct: 1, explanation: "الفكرة الرئيسية هي أهمية القراءة", difficulty: "easy" },
  { id: "read-2", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"الماء ضروري للحياة، فهو يشكل 70% من جسم الإنسان.\" - ما نسبة الماء في الجسم؟", options: ["50%", "60%", "70%", "80%"], correct: 2, explanation: "النص يذكر أن الماء يشكل 70% من الجسم", difficulty: "easy" },
  { id: "read-3", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"الرياضة تقوي الجسم وتنشط العقل وتحسن المزاج.\" - كم فائدة للرياضة ذُكرت؟", options: ["فائدة واحدة", "فائدتان", "ثلاث فوائد", "أربع فوائد"], correct: 2, explanation: "ذُكرت ثلاث فوائد: تقوية الجسم، تنشيط العقل، تحسين المزاج", difficulty: "medium" },
  { id: "read-4", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"يعد البترول من أهم مصادر الطاقة، ويسمى الذهب الأسود.\" - لماذا سُمي البترول بالذهب الأسود؟", options: ["لونه أسود", "لقيمته العالية ولونه", "لأنه نادر", "لأنه غالي"], correct: 1, explanation: "سُمي الذهب الأسود لقيمته العالية (كالذهب) ولونه الأسود", difficulty: "medium" },

  // الخطأ السياقي
  { id: "ctx-1", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"الشمس تشرق من المغرب كل صباح.\"", options: ["الشمس", "تشرق", "المغرب", "صباح"], correct: 2, explanation: "الخطأ هو كلمة 'المغرب'\nالشمس تشرق من المشرق", difficulty: "easy" },
  { id: "ctx-2", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"الثلج يذوب عند انخفاض درجة الحرارة.\"", options: ["الثلج", "يذوب", "انخفاض", "الحرارة"], correct: 2, explanation: "الخطأ هو كلمة 'انخفاض'\nالثلج يذوب عند ارتفاع الحرارة", difficulty: "easy" },
  { id: "ctx-3", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"الأسد حيوان أليف يعيش في الغابة.\"", options: ["الأسد", "أليف", "يعيش", "الغابة"], correct: 1, explanation: "الخطأ هو كلمة 'أليف'\nالأسد حيوان مفترس", difficulty: "easy" },
  { id: "ctx-4", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"السمكة تطير في الماء بسرعة.\"", options: ["السمكة", "تطير", "الماء", "بسرعة"], correct: 1, explanation: "الخطأ: تطير، الصواب: تسبح", difficulty: "easy" },
  { id: "ctx-5", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"الجمل سفينة البحر.\"", options: ["الجمل", "سفينة", "البحر", "لا يوجد خطأ"], correct: 2, explanation: "الخطأ: البحر، الصواب: الصحراء", difficulty: "medium" },

  // المفردات والمتضادات
  { id: "voc-1", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", question: "حدد الكلمة المختلفة: تفاح - موز - جزر - برتقال", options: ["تفاح", "موز", "جزر", "برتقال"], correct: 2, explanation: "الجزر هو المختلف - خضار والباقي فواكه", difficulty: "easy" },
  { id: "voc-2", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", question: "حدد الكلمة المختلفة: أحمر - أخضر - دائرة - أزرق", options: ["أحمر", "أخضر", "دائرة", "أزرق"], correct: 2, explanation: "الدائرة شكل هندسي والباقي ألوان", difficulty: "easy" },
  { id: "voc-3", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (كبير):", options: ["صغير", "طويل", "عريض", "قريب"], correct: 0, explanation: "عكس كبير = صغير", difficulty: "easy" },
  { id: "voc-4", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (سريع):", options: ["بطيء", "قوي", "خفيف", "قصير"], correct: 0, explanation: "عكس سريع = بطيء", difficulty: "easy" },
  { id: "voc-5", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (ظلم):", options: ["قسوة", "عدل", "جور", "طغيان"], correct: 1, explanation: "عكس الظلم = العدل", difficulty: "medium" },

  // === أسئلة إضافية للجبر ===
  { id: "alg-16", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان 5س - 10 = 25، فما قيمة س؟", options: ["5", "6", "7", "8"], correct: 2, explanation: "5س = 25 + 10 = 35\nس = 35 ÷ 5 = 7", difficulty: "easy" },
  { id: "alg-17", section: "كمي", category: "الجبر", topic: "algebra", question: "ما ناتج: (-4) × (-3)؟", options: ["-12", "-7", "7", "12"], correct: 3, explanation: "سالب × سالب = موجب\n(-4) × (-3) = 12", difficulty: "easy" },
  { id: "alg-18", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان س/5 = 8، فما قيمة س؟", options: ["3", "13", "40", "45"], correct: 2, explanation: "س = 8 × 5 = 40", difficulty: "easy" },
  { id: "alg-19", section: "كمي", category: "الجبر", topic: "algebra", question: "ما قيمة 2⁴؟", options: ["6", "8", "16", "32"], correct: 2, explanation: "2⁴ = 2 × 2 × 2 × 2 = 16", difficulty: "easy" },
  { id: "alg-20", section: "كمي", category: "الجبر", topic: "algebra", question: "ما ناتج: 18 ÷ 3 + 4؟", options: ["6", "10", "11", "22"], correct: 1, explanation: "نبدأ بالقسمة: 18 ÷ 3 = 6\nثم الجمع: 6 + 4 = 10", difficulty: "easy" },
  { id: "alg-21", section: "كمي", category: "الجبر", topic: "algebra", question: "حل المعادلة: 2س² = 50", options: ["س = ±4", "س = ±5", "س = ±6", "س = ±25"], correct: 1, explanation: "س² = 25\nس = ±√25 = ±5", difficulty: "medium" },
  { id: "alg-22", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان 4س + 3 = 2س + 11، فما قيمة س؟", options: ["2", "3", "4", "5"], correct: 2, explanation: "4س - 2س = 11 - 3\n2س = 8\nس = 4", difficulty: "medium" },
  { id: "alg-23", section: "كمي", category: "الجبر", topic: "algebra", question: "ما قيمة: √81 + √49؟", options: ["14", "15", "16", "130"], correct: 2, explanation: "√81 = 9 و √49 = 7\n9 + 7 = 16", difficulty: "medium" },
  { id: "alg-24", section: "كمي", category: "الجبر", topic: "algebra", question: "بسّط: 3س + 5س - 2س", options: ["6س", "8س", "10س", "5س"], correct: 0, explanation: "3س + 5س - 2س = 6س", difficulty: "easy" },
  { id: "alg-25", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان f(x) = x² + 3، فما قيمة f(4)؟", options: ["16", "19", "7", "12"], correct: 1, explanation: "f(4) = 4² + 3 = 16 + 3 = 19", difficulty: "medium" },
  { id: "alg-26", section: "كمي", category: "الجبر", topic: "algebra", question: "ما حل المعادلة: س² - 16 = 0؟", options: ["س = 4", "س = -4", "س = ±4", "س = 8"], correct: 2, explanation: "س² = 16\nس = ±√16 = ±4", difficulty: "medium" },
  { id: "alg-27", section: "كمي", category: "الجبر", topic: "algebra", question: "ما قيمة: 3³ - 2³؟", options: ["1", "5", "19", "27"], correct: 2, explanation: "3³ = 27 و 2³ = 8\n27 - 8 = 19", difficulty: "medium" },
  { id: "alg-28", section: "كمي", category: "الجبر", topic: "algebra", question: "إذا كان |س| = 7، فإن س =", options: ["7 فقط", "-7 فقط", "±7", "49"], correct: 2, explanation: "القيمة المطلقة لـ 7 و -7 كلاهما = 7\nإذن س = ±7", difficulty: "medium" },
  { id: "alg-29", section: "كمي", category: "الجبر", topic: "algebra", question: "ما ناتج: (س + 2)(س + 3) عندما س = 1؟", options: ["6", "8", "10", "12"], correct: 3, explanation: "(1 + 2)(1 + 3) = 3 × 4 = 12", difficulty: "medium" },
  { id: "alg-30", section: "كمي", category: "الجبر", topic: "algebra", question: "حل: 3(س - 2) = 15", options: ["5", "6", "7", "8"], correct: 2, explanation: "3س - 6 = 15\n3س = 21\nس = 7", difficulty: "medium" },

  // === أسئلة إضافية للهندسة ===
  { id: "geo-16", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما مساحة مربع محيطه 20 سم؟", options: ["20 سم²", "25 سم²", "30 سم²", "100 سم²"], correct: 1, explanation: "ضلع المربع = 20 ÷ 4 = 5 سم\nالمساحة = 5² = 25 سم²", difficulty: "easy" },
  { id: "geo-17", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما محيط مستطيل أبعاده 6 سم و 4 سم؟", options: ["10 سم", "20 سم", "24 سم", "48 سم"], correct: 1, explanation: "المحيط = 2(الطول + العرض) = 2(6 + 4) = 20 سم", difficulty: "easy" },
  { id: "geo-18", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما قياس كل زاوية في المربع؟", options: ["45°", "60°", "90°", "180°"], correct: 2, explanation: "جميع زوايا المربع قائمة = 90°", difficulty: "easy" },
  { id: "geo-19", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما عدد أضلاع المثمن؟", options: ["6", "7", "8", "10"], correct: 2, explanation: "المثمن له 8 أضلاع", difficulty: "easy" },
  { id: "geo-20", section: "كمي", category: "الهندسة", topic: "geometry", question: "إذا كانت زاوية في مثلث متساوي الأضلاع، فما قياسها؟", options: ["45°", "60°", "90°", "120°"], correct: 1, explanation: "كل زاوية = 180° ÷ 3 = 60°", difficulty: "easy" },
  { id: "geo-21", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما مساحة دائرة قطرها 10 سم؟ (π = 3.14)", options: ["31.4 سم²", "62.8 سم²", "78.5 سم²", "314 سم²"], correct: 2, explanation: "نصف القطر = 5 سم\nالمساحة = π × 5² = 3.14 × 25 = 78.5 سم²", difficulty: "medium" },
  { id: "geo-22", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما قياس الزاوية المتممة لزاوية 65°؟", options: ["25°", "35°", "115°", "125°"], correct: 0, explanation: "الزاوية المتممة + 65° = 90°\nالزاوية المتممة = 25°", difficulty: "medium" },
  { id: "geo-23", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما قياس الزاوية المكملة لزاوية 110°؟", options: ["60°", "70°", "80°", "90°"], correct: 1, explanation: "الزاوية المكملة + 110° = 180°\nالزاوية المكملة = 70°", difficulty: "medium" },
  { id: "geo-24", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما محيط نصف دائرة قطرها 14 سم؟ (π = 22/7)", options: ["22 سم", "36 سم", "44 سم", "58 سم"], correct: 1, explanation: "المحيط = نصف المحيط + القطر\n= (π × 14)/2 + 14 = 22 + 14 = 36 سم", difficulty: "medium" },
  { id: "geo-25", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما حجم متوازي مستطيلات أبعاده 3 و 4 و 5؟", options: ["12", "35", "47", "60"], correct: 3, explanation: "الحجم = الطول × العرض × الارتفاع\n= 3 × 4 × 5 = 60", difficulty: "medium" },
  { id: "geo-26", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما المساحة الجانبية لأسطوانة نصف قطرها 7 وارتفاعها 10؟ (π = 22/7)", options: ["220", "440", "616", "880"], correct: 1, explanation: "المساحة الجانبية = 2πرع = 2 × (22/7) × 7 × 10 = 440", difficulty: "hard" },
  { id: "geo-27", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما مساحة معين قطراه 6 و 8؟", options: ["14", "24", "48", "96"], correct: 1, explanation: "مساحة المعين = (ق₁ × ق₂)/2 = (6 × 8)/2 = 24", difficulty: "medium" },
  { id: "geo-28", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما عدد أقطار الشكل السداسي؟", options: ["6", "9", "12", "15"], correct: 1, explanation: "عدد الأقطار = ن(ن-3)/2 = 6(6-3)/2 = 9", difficulty: "hard" },
  { id: "geo-29", section: "كمي", category: "الهندسة", topic: "geometry", question: "مثلث قائم الزاوية ضلعاه 5 و 12، ما طول الوتر؟", options: ["13", "17", "60", "169"], correct: 0, explanation: "الوتر² = 5² + 12² = 25 + 144 = 169\nالوتر = 13", difficulty: "medium" },
  { id: "geo-30", section: "كمي", category: "الهندسة", topic: "geometry", question: "ما مساحة قطاع دائري زاويته 90° ونصف قطره 4؟ (π = 3.14)", options: ["3.14", "6.28", "12.56", "50.24"], correct: 2, explanation: "المساحة = (الزاوية/360) × π × ر²\n= (90/360) × 3.14 × 16 = 12.56", difficulty: "hard" },

  // === أسئلة إضافية للنسب والتناسب ===
  { id: "rat-16", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "ما قيمة 75% من 120؟", options: ["75", "80", "90", "95"], correct: 2, explanation: "75% من 120 = 0.75 × 120 = 90", difficulty: "easy" },
  { id: "rat-17", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا كان 8 تفاحات بـ 24 ريال، كم سعر 5 تفاحات؟", options: ["12 ريال", "15 ريال", "18 ريال", "20 ريال"], correct: 1, explanation: "سعر التفاحة = 24 ÷ 8 = 3 ريال\n5 تفاحات = 5 × 3 = 15 ريال", difficulty: "easy" },
  { id: "rat-18", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "ما العدد الذي 20% منه = 16؟", options: ["32", "64", "80", "160"], correct: 2, explanation: "20% × س = 16\nس = 16 ÷ 0.20 = 80", difficulty: "medium" },
  { id: "rat-19", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "نسبة الماء إلى العصير 3:1، إذا كان الماء 9 لترات، كم العصير؟", options: ["1 لتر", "2 لتر", "3 لترات", "6 لترات"], correct: 2, explanation: "3:1 = 9:س\nس = 9 ÷ 3 = 3 لترات", difficulty: "easy" },
  { id: "rat-20", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "سيارة تقطع 150 كم في ساعتين، كم تقطع في 6 ساعات؟", options: ["300 كم", "400 كم", "450 كم", "500 كم"], correct: 2, explanation: "السرعة = 150/2 = 75 كم/س\nالمسافة = 75 × 6 = 450 كم", difficulty: "medium" },
  { id: "rat-21", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "ثمن سلعة زاد 15%، فأصبح 115 ريال. ما الثمن الأصلي؟", options: ["95 ريال", "100 ريال", "105 ريال", "110 ريال"], correct: 1, explanation: "115 = 115% من الأصلي\nالأصلي = 115 ÷ 1.15 = 100 ريال", difficulty: "medium" },
  { id: "rat-22", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "قسم مبلغ 1200 ريال بين شخصين بنسبة 2:3، كم نصيب الأول؟", options: ["400 ريال", "480 ريال", "600 ريال", "720 ريال"], correct: 1, explanation: "مجموع الأجزاء = 5\nنصيب الأول = (2/5) × 1200 = 480 ريال", difficulty: "medium" },
  { id: "rat-23", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا أنجز 6 عمال عملاً في 8 أيام، كم يوماً يلزم 4 عمال؟", options: ["6 أيام", "10 أيام", "12 يوماً", "16 يوماً"], correct: 2, explanation: "تناسب عكسي: 6 × 8 = 4 × س\n48 = 4س\nس = 12 يوماً", difficulty: "medium" },
  { id: "rat-24", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "زاد عدد من 50 إلى 65، ما نسبة الزيادة؟", options: ["15%", "23%", "30%", "35%"], correct: 2, explanation: "الزيادة = 15\nنسبة الزيادة = (15/50) × 100 = 30%", difficulty: "medium" },
  { id: "rat-25", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "خليط من الماء والحليب بنسبة 2:5، إذا كان المجموع 21 لتراً، كم الحليب؟", options: ["6 لترات", "9 لترات", "12 لتراً", "15 لتراً"], correct: 3, explanation: "مجموع الأجزاء = 7\nالحليب = (5/7) × 21 = 15 لتراً", difficulty: "medium" },
  { id: "rat-26", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "سعر سلعة 200 ريال، حصلت على خصم 15% ثم خصم إضافي 10%، ما السعر النهائي؟", options: ["150 ريال", "153 ريال", "155 ريال", "160 ريال"], correct: 1, explanation: "بعد 15%: 200 × 0.85 = 170\nبعد 10%: 170 × 0.90 = 153 ريال", difficulty: "hard" },
  { id: "rat-27", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "نقص عدد ما بنسبة 20%، كم يجب أن تكون نسبة الزيادة لإرجاعه للأصل؟", options: ["20%", "25%", "30%", "40%"], correct: 1, explanation: "إذا أصبح 80، فالزيادة المطلوبة = 20\nالنسبة = (20/80) × 100 = 25%", difficulty: "hard" },
  { id: "rat-28", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "إذا كان أ:ب:ج = 1:2:3 وكان ج = 30، فما مجموع أ + ب؟", options: ["30", "40", "50", "60"], correct: 0, explanation: "3 أجزاء = 30\nالجزء = 10\nأ + ب = 10 + 20 = 30", difficulty: "medium" },
  { id: "rat-29", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "على الخريطة 1 سم = 5 كم، المسافة الحقيقية 35 كم، كم على الخريطة؟", options: ["5 سم", "7 سم", "8 سم", "10 سم"], correct: 1, explanation: "المسافة على الخريطة = 35 ÷ 5 = 7 سم", difficulty: "medium" },
  { id: "rat-30", section: "كمي", category: "النسب والتناسب", topic: "ratios", question: "فائدة بسيطة على 10000 ريال بمعدل 5% سنوياً لمدة 3 سنوات =", options: ["500 ريال", "1000 ريال", "1500 ريال", "2000 ريال"], correct: 2, explanation: "الفائدة = المبلغ × المعدل × الزمن\n= 10000 × 0.05 × 3 = 1500 ريال", difficulty: "hard" },

  // === أسئلة إضافية للإحصاء ===
  { id: "stat-16", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما المتوسط الحسابي لـ: 10، 20، 30؟", options: ["15", "20", "25", "30"], correct: 1, explanation: "المتوسط = (10+20+30)/3 = 60/3 = 20", difficulty: "easy" },
  { id: "stat-17", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما الوسيط لـ: 1، 2، 3، 4، 5، 6، 7؟", options: ["3", "4", "5", "3.5"], correct: 1, explanation: "عدد القيم = 7 (فردي)\nالوسيط = القيمة الوسطى = 4", difficulty: "easy" },
  { id: "stat-18", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما المنوال لـ: 5، 7، 5، 8، 5، 9؟", options: ["5", "7", "8", "9"], correct: 0, explanation: "5 هو الأكثر تكراراً (3 مرات)", difficulty: "easy" },
  { id: "stat-19", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما احتمال الحصول على عدد أكبر من 4 عند رمي نرد؟", options: ["1/6", "1/3", "1/2", "2/3"], correct: 1, explanation: "الأعداد > 4 هي: 5، 6 (2 من 6)\nالاحتمال = 2/6 = 1/3", difficulty: "medium" },
  { id: "stat-20", section: "كمي", category: "الإحصاء", topic: "statistics", question: "كيس فيه 4 كرات حمراء و 6 زرقاء، ما احتمال سحب زرقاء؟", options: ["2/5", "3/5", "4/10", "6/4"], correct: 1, explanation: "الاحتمال = 6/10 = 3/5", difficulty: "medium" },
  { id: "stat-21", section: "كمي", category: "الإحصاء", topic: "statistics", question: "متوسط 4 أعداد = 15، ما مجموعها؟", options: ["30", "45", "60", "75"], correct: 2, explanation: "المجموع = المتوسط × العدد = 15 × 4 = 60", difficulty: "easy" },
  { id: "stat-22", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما الوسيط لـ: 2، 4، 6، 8؟", options: ["4", "5", "6", "7"], correct: 1, explanation: "عدد القيم زوجي\nالوسيط = (4+6)/2 = 5", difficulty: "medium" },
  { id: "stat-23", section: "كمي", category: "الإحصاء", topic: "statistics", question: "إذا ضُرب كل قيمة في مجموعة بـ 3، كيف يتغير المتوسط؟", options: ["يزيد 3", "يُضرب في 3", "لا يتغير", "يُقسم على 3"], correct: 1, explanation: "عند ضرب كل قيمة بثابت، يُضرب المتوسط بنفس الثابت", difficulty: "medium" },
  { id: "stat-24", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما احتمال الحصول على صورة عند رمي عملة نزيهة؟", options: ["0", "1/4", "1/2", "1"], correct: 2, explanation: "النتائج: صورة أو كتابة\nالاحتمال = 1/2", difficulty: "easy" },
  { id: "stat-25", section: "كمي", category: "الإحصاء", topic: "statistics", question: "في رسم بياني دائري، ما زاوية قطاع نسبته 50%؟", options: ["50°", "90°", "180°", "270°"], correct: 2, explanation: "الزاوية = 50% × 360° = 180°", difficulty: "medium" },
  { id: "stat-26", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما عدد طرق اختيار 3 أشخاص من 6؟", options: ["6", "15", "18", "20"], correct: 3, explanation: "C(6,3) = 6!/(3!×3!) = 20", difficulty: "hard" },
  { id: "stat-27", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما احتمال ألا يظهر 6 عند رمي نرد؟", options: ["1/6", "5/6", "1/3", "2/3"], correct: 1, explanation: "احتمال ظهور 6 = 1/6\nاحتمال عدم الظهور = 1 - 1/6 = 5/6", difficulty: "medium" },
  { id: "stat-28", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما عدد الطرق لترتيب 3 أحرف مختلفة؟", options: ["3", "6", "9", "27"], correct: 1, explanation: "3! = 3 × 2 × 1 = 6", difficulty: "medium" },
  { id: "stat-29", section: "كمي", category: "الإحصاء", topic: "statistics", question: "التباين لأعداد متساوية (كلها 5) يساوي:", options: ["0", "1", "5", "25"], correct: 0, explanation: "إذا كانت جميع القيم متساوية، فالتباين = 0", difficulty: "medium" },
  { id: "stat-30", section: "كمي", category: "الإحصاء", topic: "statistics", question: "ما احتمال الحصول على رقم زوجي ثم فردي عند رمي نرد مرتين؟", options: ["1/4", "1/2", "3/4", "1/6"], correct: 0, explanation: "احتمال زوجي = 1/2\nاحتمال فردي = 1/2\nالاحتمال = 1/2 × 1/2 = 1/4", difficulty: "hard" },

  // === أسئلة إضافية للتناظر اللفظي ===
  { id: "ana-16", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "صيف : حر :: شتاء : ؟", options: ["دفء", "برد", "مطر", "ثلج"], correct: 1, explanation: "الصيف يتميز بالحر، والشتاء يتميز بالبرد", difficulty: "easy" },
  { id: "ana-17", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "ورقة : شجرة :: ريشة : ؟", options: ["طائر", "سماء", "عش", "منقار"], correct: 0, explanation: "الورقة جزء من الشجرة، والريشة جزء من الطائر", difficulty: "easy" },
  { id: "ana-18", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "فلاح : زراعة :: صياد : ؟", options: ["سمك", "صيد", "بحر", "شبكة"], correct: 1, explanation: "الفلاح يمارس الزراعة، والصياد يمارس الصيد", difficulty: "easy" },
  { id: "ana-19", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "سعيد : حزين :: غني : ؟", options: ["ثري", "فقير", "محتاج", "كريم"], correct: 1, explanation: "سعيد عكس حزين، وغني عكس فقير", difficulty: "easy" },
  { id: "ana-20", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "دواء : مرض :: طعام : ؟", options: ["شبع", "جوع", "صحة", "معدة"], correct: 1, explanation: "الدواء يعالج المرض، والطعام يعالج الجوع", difficulty: "medium" },
  { id: "ana-21", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "ملعقة : طعام :: كوب : ؟", options: ["ماء", "شراب", "زجاج", "مطبخ"], correct: 1, explanation: "الملعقة أداة لتناول الطعام، والكوب أداة لشرب الشراب", difficulty: "medium" },
  { id: "ana-22", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "نجار : خشب :: خياط : ؟", options: ["ملابس", "قماش", "إبرة", "خيط"], correct: 1, explanation: "النجار يعمل بالخشب، والخياط يعمل بالقماش", difficulty: "medium" },
  { id: "ana-23", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "صحراء : جفاف :: غابة : ؟", options: ["حرارة", "رطوبة", "حيوانات", "أشجار"], correct: 1, explanation: "الصحراء تتميز بالجفاف، والغابة تتميز بالرطوبة", difficulty: "medium" },
  { id: "ana-24", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "قاضي : عدالة :: طبيب : ؟", options: ["مرض", "صحة", "مستشفى", "علاج"], correct: 1, explanation: "القاضي يسعى لتحقيق العدالة، والطبيب يسعى لتحقيق الصحة", difficulty: "medium" },
  { id: "ana-25", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "بخيل : كرم :: جبان : ؟", options: ["خوف", "شجاعة", "ضعف", "هروب"], correct: 1, explanation: "البخيل يفتقر للكرم، والجبان يفتقر للشجاعة", difficulty: "hard" },
  { id: "ana-26", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "سنة : شهور :: شهر : ؟", options: ["أسابيع", "أيام", "ساعات", "دقائق"], correct: 0, explanation: "السنة تتكون من شهور، والشهر يتكون من أسابيع", difficulty: "medium" },
  { id: "ana-27", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "عالم : علم :: فنان : ؟", options: ["رسم", "فن", "لوحة", "ألوان"], correct: 1, explanation: "العالم يتقن العلم، والفنان يتقن الفن", difficulty: "easy" },
  { id: "ana-28", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "لسان : كلام :: قدم : ؟", options: ["حذاء", "مشي", "ركض", "أرض"], correct: 1, explanation: "اللسان أداة الكلام، والقدم أداة المشي", difficulty: "medium" },
  { id: "ana-29", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "ذهب : معدن :: ماس : ؟", options: ["حجر", "كريم", "جوهرة", "صلب"], correct: 0, explanation: "الذهب نوع من المعادن، والماس نوع من الأحجار", difficulty: "hard" },
  { id: "ana-30", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", question: "تعليم : جهل :: علاج : ؟", options: ["صحة", "مرض", "شفاء", "طبيب"], correct: 1, explanation: "التعليم يزيل الجهل، والعلاج يزيل المرض", difficulty: "hard" },

  // === أسئلة إضافية لإكمال الجمل ===
  { id: "comp-9", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "الطيور على _____ تقع.", options: ["أغصانها", "أشكالها", "أوكارها", "ألوانها"], correct: 1, explanation: "الطيور على أشكالها تقع - مثل عربي شهير", difficulty: "easy" },
  { id: "comp-10", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "الجار قبل _____.", options: ["السكن", "الدار", "الشراء", "البناء"], correct: 1, explanation: "الجار قبل الدار - مثل عربي", difficulty: "easy" },
  { id: "comp-11", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "في التأني _____ وفي العجلة _____.", options: ["السلامة - الندامة", "الندامة - السلامة", "الراحة - التعب", "الفوز - الخسارة"], correct: 0, explanation: "في التأني السلامة وفي العجلة الندامة", difficulty: "medium" },
  { id: "comp-12", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "إن الله _____ ولا يُعجزه شيء.", options: ["قدير", "عليم", "حكيم", "رحيم"], correct: 0, explanation: "إن الله قدير - يدل على القدرة المطلقة", difficulty: "medium" },
  { id: "comp-13", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "ما طار طير وارتفع إلا كما طار _____.", options: ["سقط", "وقع", "نزل", "هبط"], correct: 1, explanation: "ما طار طير وارتفع إلا كما طار وقع", difficulty: "hard" },
  { id: "comp-14", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "اطلبوا العلم من المهد إلى _____.", options: ["الكبر", "الموت", "اللحد", "الشيب"], correct: 2, explanation: "اطلبوا العلم من المهد إلى اللحد", difficulty: "medium" },
  { id: "comp-15", section: "لفظي", category: "إكمال الجمل", topic: "completion", question: "رب _____ خير من ألف صديق.", options: ["قريب", "أخ", "جار", "صاحب"], correct: 1, explanation: "رب أخ لك لم تلده أمك", difficulty: "medium" },

  // === أسئلة إضافية لاستيعاب المقروء ===
  { id: "read-5", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"النوم ضروري للصحة، ويحتاج الإنسان البالغ 7-8 ساعات نوم يومياً.\" - كم ساعة نوم يحتاج البالغ؟", options: ["5-6 ساعات", "7-8 ساعات", "9-10 ساعات", "10-12 ساعة"], correct: 1, explanation: "النص يذكر 7-8 ساعات للبالغين", difficulty: "easy" },
  { id: "read-6", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"الشمس أكبر من الأرض بـ 1.3 مليون مرة تقريباً.\" - كم مرة أكبر الشمس من الأرض؟", options: ["مليون", "1.3 مليون", "1.5 مليون", "2 مليون"], correct: 1, explanation: "النص يذكر 1.3 مليون مرة", difficulty: "easy" },
  { id: "read-7", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"المملكة العربية السعودية تأسست عام 1932م على يد الملك عبدالعزيز.\" - من مؤسس المملكة؟", options: ["الملك سعود", "الملك فهد", "الملك عبدالعزيز", "الملك فيصل"], correct: 2, explanation: "الملك عبدالعزيز آل سعود هو المؤسس", difficulty: "easy" },
  { id: "read-8", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"القهوة مشروب منبه يحتوي على الكافيين الذي ينشط الجهاز العصبي.\" - ما المادة المنبهة في القهوة؟", options: ["السكر", "الكافيين", "الحليب", "الماء"], correct: 1, explanation: "الكافيين هو المادة المنبهة", difficulty: "easy" },
  { id: "read-9", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"الجمل يستطيع البقاء بدون ماء أسبوعين في الشتاء وأسبوع في الصيف.\" - كم يبقى الجمل بدون ماء في الصيف؟", options: ["3 أيام", "أسبوع", "أسبوعين", "شهر"], correct: 1, explanation: "أسبوع واحد في الصيف حسب النص", difficulty: "medium" },
  { id: "read-10", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", question: "النص: \"التدخين يضر بالرئتين والقلب ويسبب السرطان.\" - كم عضو ذُكر أنه يتضرر؟", options: ["عضو واحد", "عضوان", "ثلاثة أعضاء", "أربعة أعضاء"], correct: 1, explanation: "الرئتان والقلب = عضوان (السرطان مرض وليس عضواً)", difficulty: "medium" },

  // === أسئلة إضافية للخطأ السياقي ===
  { id: "ctx-6", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"الطائر يسبح في السماء بحرية.\"", options: ["الطائر", "يسبح", "السماء", "بحرية"], correct: 1, explanation: "الخطأ: يسبح، الصواب: يطير", difficulty: "easy" },
  { id: "ctx-7", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"القمر يشرق في النهار وينير الليل.\"", options: ["القمر", "يشرق", "النهار", "الليل"], correct: 2, explanation: "الخطأ: النهار، الصواب: الليل (القمر يظهر ليلاً)", difficulty: "medium" },
  { id: "ctx-8", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"الفيل أصغر الحيوانات البرية.\"", options: ["الفيل", "أصغر", "الحيوانات", "البرية"], correct: 1, explanation: "الخطأ: أصغر، الصواب: أكبر", difficulty: "easy" },
  { id: "ctx-9", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"السيارة تطير على الطريق بسرعة.\"", options: ["السيارة", "تطير", "الطريق", "بسرعة"], correct: 1, explanation: "الخطأ: تطير، الصواب: تسير", difficulty: "easy" },
  { id: "ctx-10", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"يتكون الماء من ذرتي أكسجين وذرة هيدروجين.\"", options: ["يتكون", "ذرتي", "أكسجين", "هيدروجين"], correct: 2, explanation: "الخطأ: التركيب معكوس. H₂O = ذرتي هيدروجين وذرة أكسجين", difficulty: "hard" },
  { id: "ctx-11", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"القلب يهضم الطعام في الجسم.\"", options: ["القلب", "يهضم", "الطعام", "الجسم"], correct: 0, explanation: "الخطأ: القلب، الصواب: المعدة (القلب يضخ الدم)", difficulty: "easy" },
  { id: "ctx-12", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"البحر الأحمر يقع شرق السعودية.\"", options: ["البحر", "الأحمر", "شرق", "السعودية"], correct: 2, explanation: "الخطأ: شرق، الصواب: غرب", difficulty: "medium" },
  { id: "ctx-13", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"يتجمد الماء عند درجة 100 مئوية.\"", options: ["يتجمد", "الماء", "100", "مئوية"], correct: 2, explanation: "الخطأ: 100، الصواب: صفر (الماء يتجمد عند 0°)", difficulty: "medium" },
  { id: "ctx-14", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"العين تسمع الأصوات بوضوح.\"", options: ["العين", "تسمع", "الأصوات", "بوضوح"], correct: 0, explanation: "الخطأ: العين، الصواب: الأذن", difficulty: "easy" },
  { id: "ctx-15", section: "لفظي", category: "الخطأ السياقي", topic: "contextual", question: "حدد الكلمة الخطأ: \"نبات الصبار ينمو في المناطق الرطبة.\"", options: ["نبات", "الصبار", "الرطبة", "ينمو"], correct: 2, explanation: "الخطأ: الرطبة، الصواب: الجافة (الصبار ينمو في الصحراء)", difficulty: "medium" },

  // === أسئلة إضافية للمفردات ===
  { id: "voc-6", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", question: "حدد الكلمة المختلفة: قلم - كتاب - كرسي - دفتر", options: ["قلم", "كتاب", "كرسي", "دفتر"], correct: 2, explanation: "الكرسي أثاث والباقي أدوات مدرسية", difficulty: "easy" },
  { id: "voc-7", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", question: "حدد الكلمة المختلفة: ذئب - أسد - نمر - حصان", options: ["ذئب", "أسد", "نمر", "حصان"], correct: 3, explanation: "الحصان ليس مفترساً، بينما الباقي حيوانات مفترسة", difficulty: "medium" },
  { id: "voc-8", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", question: "حدد الكلمة المختلفة: طبيب - مهندس - معلم - مستشفى", options: ["طبيب", "مهندس", "معلم", "مستشفى"], correct: 3, explanation: "المستشفى مكان والباقي مهن", difficulty: "easy" },
  { id: "voc-9", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (الصدق):", options: ["الأمانة", "الكذب", "الخيانة", "الغدر"], correct: 1, explanation: "عكس الصدق = الكذب", difficulty: "easy" },
  { id: "voc-10", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (البخل):", options: ["الجود", "الفقر", "الغنى", "الحرص"], correct: 0, explanation: "عكس البخل = الجود/الكرم", difficulty: "medium" },
  { id: "voc-11", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (الحرب):", options: ["القتال", "السلام", "النزاع", "الخلاف"], correct: 1, explanation: "عكس الحرب = السلام", difficulty: "easy" },
  { id: "voc-12", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (الظلام):", options: ["الليل", "النور", "الغروب", "السواد"], correct: 1, explanation: "عكس الظلام = النور", difficulty: "easy" },
  { id: "voc-13", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", question: "حدد الكلمة المختلفة: الأحد - الإثنين - يناير - الجمعة", options: ["الأحد", "الإثنين", "يناير", "الجمعة"], correct: 2, explanation: "يناير شهر والباقي أيام الأسبوع", difficulty: "easy" },
  { id: "voc-14", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", question: "حدد الكلمة المختلفة: سعودية - مصر - القاهرة - الأردن", options: ["سعودية", "مصر", "القاهرة", "الأردن"], correct: 2, explanation: "القاهرة مدينة والباقي دول", difficulty: "medium" },
  { id: "voc-15", section: "لفظي", category: "المتضادات", topic: "vocabulary", question: "اختر عكس كلمة (النجاح):", options: ["الرسوب", "الفشل", "الخسارة", "التراجع"], correct: 1, explanation: "عكس النجاح = الفشل", difficulty: "easy" },
];

// Practice Test Component
function PracticeTestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme } = useTheme();
  const { recordAnswer, getWeakTopics, userState } = useTraining();

  const topic = searchParams.get("topic") || "algebra";
  const section = searchParams.get("section") || "quantitative";
  const questionCount = parseInt(searchParams.get("count") || "10");
  const difficulty = searchParams.get("difficulty") || "all";

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);

  useEffect(() => {
    const topicMap: Record<string, string> = {
      algebra: "algebra",
      geometry: "geometry", 
      ratios: "ratios",
      statistics: "statistics",
      analogy: "analogy",
      completion: "completion",
      comprehension: "comprehension",
      contextual: "contextual",
      vocabulary: "vocabulary",
    };

    const mappedTopic = topicMap[topic] || topic;
    let filtered = trainingQuestions.filter(q => q.topic === mappedTopic);
    
    if (difficulty !== "all") {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }

    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(questionCount, shuffled.length));
    
    setQuestions(selected);
    setAnswers(new Array(selected.length).fill(null));
  }, [topic, questionCount, difficulty]);

  useEffect(() => {
    if (timeLeft > 0 && !showExplanation && !showResults && questions.length > 0) {
      const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, showExplanation, showResults, questions.length]);

  const handleAnswer = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
    setShowExplanation(true);
    
    const newAnswers = [...answers];
    newAnswers[currentIndex] = index;
    setAnswers(newAnswers);

    const q = questions[currentIndex];
    recordAnswer({
      questionId: q.id,
      topic: q.topic,
      category: q.category,
      difficulty: q.difficulty,
      isCorrect: index === q.correct,
      timeSpent: 90 - timeLeft,
    });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setTimeLeft(90);
    } else {
      setShowResults(true);
    }
  };

  const calculateScore = () => {
    return questions.reduce((score, q, i) => 
      answers[i] === q.correct ? score + 1 : score, 0);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#006C35] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">جاري تحميل الأسئلة...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg border border-gray-200 dark:border-gray-700 text-center">
            <div className={`w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center ${
              percentage >= 70 ? 'bg-green-100 dark:bg-green-900/40' : 
              percentage >= 50 ? 'bg-yellow-100 dark:bg-yellow-900/40' : 
              'bg-red-100 dark:bg-red-900/40'
            }`}>
              <span className={`text-4xl font-bold ${
                percentage >= 70 ? 'text-green-600' : 
                percentage >= 50 ? 'text-yellow-600' : 
                'text-red-600'
              }`}>{percentage}%</span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {percentage >= 70 ? 'أداء ممتاز!' : percentage >= 50 ? 'أداء جيد!' : 'تحتاج مزيد من التدريب'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              أجبت على {score} من {questions.length} بشكل صحيح
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push("/practice")}
                className="px-6 py-3 bg-[#006C35] text-white rounded-xl font-bold hover:bg-[#004d26]"
              >
                العودة للتدريب
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border-2 border-[#006C35] text-[#006C35] rounded-xl font-bold hover:bg-[#006C35]/5"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir="rtl">
      <header className="bg-[#006C35] text-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push("/practice")} className="p-2 hover:bg-white/10 rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-bold">وضع التدريب</span>
            </div>
            <div className="flex items-center gap-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${timeLeft < 30 ? 'bg-red-500' : 'bg-white/20'}`}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <span className="text-sm">{currentIndex + 1}/{questions.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              currentQ.section === "كمي" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
            }`}>{currentQ.section}</span>
            <span className="text-sm text-gray-500">{currentQ.category}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              currentQ.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
              currentQ.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>{currentQ.difficulty === 'easy' ? 'سهل' : currentQ.difficulty === 'medium' ? 'متوسط' : 'صعب'}</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{currentQ.question}</h2>

          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQ.correct;
              const showResult = showExplanation;

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showExplanation}
                  className={`w-full p-4 rounded-xl border-2 text-right transition-all ${
                    showResult
                      ? isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : isSelected
                        ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                        : "border-gray-200 dark:border-gray-600"
                      : isSelected
                      ? "border-[#006C35] bg-[#006C35]/5"
                      : "border-gray-200 dark:border-gray-600 hover:border-[#006C35]/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      showResult
                        ? isCorrect ? "bg-green-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
                        : isSelected ? "bg-[#006C35] text-white" : "bg-gray-100 text-gray-600"
                    }`}>{String.fromCharCode(1571 + idx)}</span>
                    <span className="text-gray-900 dark:text-white">{option}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-6">
              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">الشرح:</h4>
              <p className="text-blue-700 dark:text-blue-200 whitespace-pre-line">{currentQ.explanation}</p>
            </div>
          )}

          {showExplanation && (
            <button
              onClick={nextQuestion}
              className="w-full py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26]"
            >
              {currentIndex < questions.length - 1 ? 'السؤال التالي' : 'عرض النتائج'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PracticeTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-[#006C35] border-t-transparent rounded-full"></div>
      </div>
    }>
      <PracticeTestContent />
    </Suspense>
  );
}
