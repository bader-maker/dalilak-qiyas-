"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/contexts/ThemeContext";
import { useTraining } from "@/contexts/TrainingContext";
import {
  AdaptiveQuestionSelector,
  TrainingSession,
  generateQuestionVariation,
  type TrainingQuestion,
  type SelectedQuestion,
  type Bilingual,
  type Localized,
} from "@/lib/trainingEngine";
import {
  summarizePerformance,
  composeUpcomingByDifficulty,
  type ProfileBias,
} from "@/lib/adaptiveDifficulty";
import {
  loadUserProfile,
  saveUserProfile,
  applySessionToProfile,
  getStudyRecommendations,
  reconcileExamHistoryToProfile,
  getTopicImprovement,
  getReinforcementTopics,
  type SessionAnswer,
} from "@/lib/userProfile";
import { loadHistory } from "@/lib/examHistory";
import TrainingAICoachCard from "@/components/TrainingAICoachCard";
import TestPatternIndicator from "@/components/TestPatternIndicator";
import type { AIAnalysisInput } from "@/lib/aiAnalysis";
import { getQuestions } from "@/data/questions";
import type { ExamCategory, ExamSection } from "@/data/exam-config";
import {
  isKnownTopicSlug,
  getTopicForBankQuestionIndex,
  categoryNameToSlug,
  type TopicSlug,
} from "@/lib/topicMap";
import { inferSubtype } from "@/lib/subtypeInference";

// ===== Exam-bank focus support =====
// When the URL contains `?focus=<value>`, the training session is
// sourced from one of the four full-exam question banks instead of the
// in-file legacy `trainingQuestions` array (which is Qudrat-AR only).
// This lets a single page serve all 12 supported sections without any
// UI redesign — the existing rendering, scoring, AI coach card, and
// results screen all work as-is because each exam-bank question is
// shaped into the same `TrainingQuestion` interface.
//
// The legacy Qudrat-AR flow (no `?focus=` param, or `?focus=quantitative_ar`
// / `?focus=verbal_ar`) is not handled here — it stays on the legacy
// in-file pool with full topic/branch/subtype metadata.
type ExamBankMapping = {
  category: ExamCategory;
  section: ExamSection;
  // Display labels used inside each shaped TrainingQuestion. These end
  // up in the AI coach's per-category aggregates and in `q.section` /
  // `q.category` references throughout the engine.
  sectionLabel: string;
  categoryLabel: string;
};

const FOCUS_TO_EXAM_BANK: Record<string, ExamBankMapping> = {
  // GAT (English) — separate bank from Qudrat
  quantitative_en: { category: "gat_en",     section: "quantitative_en", sectionLabel: "GAT",     categoryLabel: "Quantitative" },
  verbal_en:       { category: "gat_en",     section: "verbal_en",       sectionLabel: "GAT",     categoryLabel: "Verbal" },
  // Tahsili (Arabic)
  math_ar:         { category: "tahsili_ar", section: "math_ar",         sectionLabel: "تحصيلي", categoryLabel: "الرياضيات" },
  physics_ar:      { category: "tahsili_ar", section: "physics_ar",      sectionLabel: "تحصيلي", categoryLabel: "الفيزياء" },
  chemistry_ar:    { category: "tahsili_ar", section: "chemistry_ar",    sectionLabel: "تحصيلي", categoryLabel: "الكيمياء" },
  biology_ar:      { category: "tahsili_ar", section: "biology_ar",      sectionLabel: "تحصيلي", categoryLabel: "الأحياء" },
  // SAAT (English)
  math_en:         { category: "saat_en",    section: "math_en",         sectionLabel: "SAAT",    categoryLabel: "Math" },
  physics_en:      { category: "saat_en",    section: "physics_en",      sectionLabel: "SAAT",    categoryLabel: "Physics" },
  chemistry_en:    { category: "saat_en",    section: "chemistry_en",    sectionLabel: "SAAT",    categoryLabel: "Chemistry" },
  biology_en:      { category: "saat_en",    section: "biology_en",      sectionLabel: "SAAT",    categoryLabel: "Biology" },
};

// Convert raw exam-bank questions into the engine's TrainingQuestion
// shape. Difficulty is normalized to "medium" because the four banks
// don't carry a difficulty tag — this keeps the difficulty filter
// well-defined ("all" returns everything; "easy"/"hard" return nothing
// and the loader falls back to the unfiltered set, see below).
//
// Topic tagging:
//   Each question's `topic` field carries the inferred sub-topic slug
//   from the bank's index→topic layout (see src/lib/topicMap.ts) when
//   one exists; otherwise it falls back to the focus value itself
//   (e.g. "physics_ar"). This lets the topic-prioritization tier in the
//   useEffect below compare `q.topic` identically across both Qudrat-AR
//   in-file questions (which already have real topic slugs) and
//   exam-bank questions (which previously had only the focus value).
function loadExamBankQuestions(focus: string): TrainingQuestion[] {
  const mapping = FOCUS_TO_EXAM_BANK[focus];
  if (!mapping) return [];
  const raw = getQuestions(mapping.category, mapping.section);
  return raw.map((q, idx) => {
    const inferred = getTopicForBankQuestionIndex(
      mapping.category,
      mapping.section,
      idx
    );
    const topic = inferred ?? focus;
    // Per-question subtype is *additive*: undefined falls back to topic
    // behavior. Inferred here at load time so the in-session diversifier
    // (`diversifyOrder`) and the profile aggregator both see the same
    // slug for an answer — see `src/lib/subtypeInference.ts`.
    const subtype = inferSubtype(q.question, topic);
    return {
      id: `${focus}-${idx}-${q.id}`,
      section: mapping.sectionLabel,
      category: mapping.categoryLabel,
      // Use the inferred sub-topic slug when the section has a layout
      // (Qudrat AR + GAT EN today). Falls back to the focus value for
      // sections without sub-topic structure (Tahsili AR + SAAT EN).
      topic,
      ...(subtype ? { subtype } : {}),
      question: q.question,
      options: q.options,
      correct: q.correct,
      explanation: q.explanation || "",
      difficulty: "medium" as const,
    };
  });
}

// =============================================================================
// Qudrat-AR in-file source (used when focus=quantitative_ar / verbal_ar)
//
// Maps the Qudrat-AR focus value to the list of in-file `trainingQuestions`
// topic ids that belong to that section. This lets the focus branch below
// pull the entire section's pool from the in-file source (vs the legacy
// branch which pulls a single topic). Topic prioritization then runs on top
// of this whole-section pool.
//
// IMPORTANT: this list must match the topic ids used by the in-file
// `trainingQuestions` array (defined later in this file). When new Qudrat
// topics are added there, mirror them here.
// =============================================================================
const QUDRAT_AR_SECTION_TOPICS: Record<string, string[]> = {
  quantitative_ar: ["algebra", "geometry", "ratios", "statistics"],
  verbal_ar: [
    "analogy",
    "completion",
    "comprehension",
    "contextual",
    "vocabulary",
  ],
};

// All focus values /practice/test recognizes — exam-bank values plus the
// two Qudrat-AR values. Anything outside this set is treated as "no focus"
// and the legacy topic-picker branch runs.
const KNOWN_FOCUS_VALUES = new Set<string>([
  ...Object.keys(FOCUS_TO_EXAM_BANK),
  "quantitative_ar",
  "verbal_ar",
]);

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

  // ===== Seed questions to broaden subtype coverage inside each branch =====
  // ALGEBRA: parentheses, fractions, factorization, abs-value, comparison, patterns, log, system
  { id: "alg-s1", section: "كمي", category: "الجبر", topic: "algebra", subtype: "parentheses-eq", strategy_tag: "expand-then-isolate", question: "حل المعادلة: 2(س + 3) = 14", options: ["2", "3", "4", "5"], correct: 2, explanation: "نوزّع: 2س + 6 = 14\n2س = 8\nس = 4", difficulty: "easy" },
  { id: "alg-s2", section: "كمي", category: "الجبر", topic: "algebra", subtype: "parentheses-eq", strategy_tag: "expand-then-isolate", question: "حل المعادلة: 3(س - 2) = 12", options: ["4", "5", "6", "7"], correct: 2, explanation: "نوزّع: 3س - 6 = 12\n3س = 18\nس = 6", difficulty: "easy" },
  { id: "alg-s3", section: "كمي", category: "الجبر", topic: "algebra", subtype: "fraction-eq", strategy_tag: "multiply-by-denominator", question: "حل المعادلة: س/3 + 2 = 5", options: ["3", "6", "9", "12"], correct: 2, explanation: "س/3 = 3\nس = 9", difficulty: "medium" },
  { id: "alg-s4", section: "كمي", category: "الجبر", topic: "algebra", subtype: "fraction-eq", strategy_tag: "multiply-by-denominator", question: "حل المعادلة: س/4 - 1 = 2", options: ["8", "10", "12", "14"], correct: 2, explanation: "س/4 = 3\nس = 12", difficulty: "medium" },
  { id: "alg-s5", section: "كمي", category: "الجبر", topic: "algebra", subtype: "factored-zero", strategy_tag: "zero-product", question: "إذا كان (س + 2)(س - 5) = 0، فما قيم س؟", options: ["{-5, 2}", "{-2, 5}", "{2, 5}", "{-2, -5}"], correct: 1, explanation: "إما س + 2 = 0 (س = -2) أو س - 5 = 0 (س = 5)", difficulty: "medium" },
  { id: "alg-s6", section: "كمي", category: "الجبر", topic: "algebra", subtype: "factored-zero", strategy_tag: "zero-product", question: "إذا كان (س + 1)(س - 4) = 0، فما قيم س؟", options: ["{-1, 4}", "{1, -4}", "{1, 4}", "{-1, -4}"], correct: 0, explanation: "س = -1 أو س = 4", difficulty: "medium" },
  { id: "alg-s7", section: "كمي", category: "الجبر", topic: "algebra", subtype: "abs-eq", strategy_tag: "abs-two-cases", question: "إذا كان |س - 3| = 7، فما قيم س؟", options: ["{-4, 10}", "{-10, 4}", "{4, 10}", "{3, 7}"], correct: 0, explanation: "إما س - 3 = 7 (س = 10) أو س - 3 = -7 (س = -4)", difficulty: "medium" },
  { id: "alg-s8", section: "كمي", category: "الجبر", topic: "algebra", subtype: "linear-ineq", strategy_tag: "isolate-keep-direction", question: "حل المتباينة: 2س - 4 > 6", options: ["س > 3", "س > 5", "س > 4", "س < 5"], correct: 1, explanation: "2س > 10\nس > 5", difficulty: "medium" },
  { id: "alg-s9", section: "كمي", category: "الجبر", topic: "algebra", subtype: "linear-ineq", strategy_tag: "ineq-flip-on-negative", question: "حل المتباينة: -3س > 12", options: ["س > -4", "س < -4", "س > 4", "س < 4"], correct: 1, explanation: "اقسم على -3 واعكس الإشارة:\nس < -4", difficulty: "medium" },
  { id: "alg-s10", section: "كمي", category: "الجبر", topic: "algebra", subtype: "patterns", strategy_tag: "common-difference", question: "أكمل النمط: 3, 7, 11, 15, ___", options: ["17", "18", "19", "20"], correct: 2, explanation: "الفرق بين كل حدّين هو 4\n15 + 4 = 19", difficulty: "easy" },
  { id: "alg-s11", section: "كمي", category: "الجبر", topic: "algebra", subtype: "patterns", strategy_tag: "common-ratio", question: "أكمل النمط: 2, 6, 18, 54, ___", options: ["108", "150", "162", "216"], correct: 2, explanation: "النسبة بين كل حدّين هي 3\n54 × 3 = 162", difficulty: "medium" },
  { id: "alg-s12", section: "كمي", category: "الجبر", topic: "algebra", subtype: "log", strategy_tag: "rewrite-as-power", question: "ما قيمة لو₂(8)؟", options: ["2", "3", "4", "8"], correct: 1, explanation: "نسأل: 2 لأي قوة = 8؟ الإجابة: 3 لأن 2³ = 8", difficulty: "medium" },
  { id: "alg-s13", section: "كمي", category: "الجبر", topic: "algebra", subtype: "log", strategy_tag: "rewrite-as-power", question: "ما قيمة لو₃(27)؟", options: ["2", "3", "4", "9"], correct: 1, explanation: "3³ = 27، إذاً لو₃(27) = 3", difficulty: "medium" },
  { id: "alg-s14", section: "كمي", category: "الجبر", topic: "algebra", subtype: "cube-eq", strategy_tag: "cube-root", question: "إذا كان س³ = 64، فما قيمة س؟", options: ["2", "3", "4", "8"], correct: 2, explanation: "∛64 = 4 لأن 4³ = 64", difficulty: "medium" },
  { id: "alg-s15", section: "كمي", category: "الجبر", topic: "algebra", subtype: "system", strategy_tag: "elimination", question: "إذا كان س + ص = 10 و س - ص = 4، فما قيمة س؟", options: ["3", "5", "7", "8"], correct: 2, explanation: "اجمع المعادلتين: 2س = 14 → س = 7", difficulty: "hard" },
  { id: "alg-s16", section: "كمي", category: "الجبر", topic: "algebra", subtype: "simplify-frac", strategy_tag: "factor-and-cancel", question: "بسّط: (س² - 9) ÷ (س - 3)", options: ["س + 3", "س - 3", "س² + 3", "9"], correct: 0, explanation: "س² - 9 = (س - 3)(س + 3)\nبعد الاختصار: س + 3", difficulty: "hard" },

  // GEOMETRY: rectangle, triangle area, circle area, cube, trapezoid, pythagoras
  { id: "geo-s1", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "rect-area", strategy_tag: "area-rect", question: "ما مساحة المستطيل الذي طوله 12 سم وعرضه 5 سم؟", options: ["17", "34", "60", "120"], correct: 2, explanation: "مساحة المستطيل = الطول × العرض = 12 × 5 = 60 سم²", difficulty: "easy" },
  { id: "geo-s2", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "rect-perim", strategy_tag: "perim-rect", question: "ما محيط المستطيل الذي طوله 8 سم وعرضه 3 سم؟", options: ["11", "22", "24", "30"], correct: 1, explanation: "محيط المستطيل = 2(الطول + العرض) = 2(8 + 3) = 22 سم", difficulty: "easy" },
  { id: "geo-s3", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "tri-area", strategy_tag: "area-triangle", question: "ما مساحة المثلث الذي قاعدته 10 سم وارتفاعه 6 سم؟", options: ["16", "30", "60", "120"], correct: 1, explanation: "مساحة المثلث = ½ × القاعدة × الارتفاع = ½ × 10 × 6 = 30 سم²", difficulty: "easy" },
  { id: "geo-s4", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "tri-area", strategy_tag: "area-triangle", question: "ما مساحة المثلث الذي قاعدته 14 سم وارتفاعه 5 سم؟", options: ["19", "35", "60", "70"], correct: 1, explanation: "مساحة المثلث = ½ × 14 × 5 = 35 سم²", difficulty: "easy" },
  { id: "geo-s5", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "circle-area", strategy_tag: "area-circle", question: "ما مساحة دائرة نصف قطرها 5 سم؟ (بدلالة π)", options: ["10π", "25π", "50π", "100π"], correct: 1, explanation: "المساحة = π × ر² = π × 25 = 25π سم²", difficulty: "medium" },
  { id: "geo-s6", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "circle-circ", strategy_tag: "perim-circle", question: "ما محيط دائرة نصف قطرها 7 سم؟ (بدلالة π)", options: ["7π", "14π", "21π", "49π"], correct: 1, explanation: "المحيط = 2 × π × ر = 2 × 7 × π = 14π سم", difficulty: "medium" },
  { id: "geo-s7", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "cube-vol", strategy_tag: "volume-cube", question: "ما حجم مكعب طول ضلعه 4 سم؟", options: ["16", "32", "48", "64"], correct: 3, explanation: "حجم المكعب = الضلع³ = 4³ = 64 سم³", difficulty: "easy" },
  { id: "geo-s8", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "cube-vol", strategy_tag: "volume-cube", question: "ما حجم مكعب طول ضلعه 5 سم؟", options: ["15", "25", "75", "125"], correct: 3, explanation: "حجم المكعب = 5³ = 125 سم³", difficulty: "easy" },
  { id: "geo-s9", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "trapezoid-area", strategy_tag: "area-trapezoid", question: "ما مساحة شبه المنحرف الذي قاعدتاه 8 و 12، وارتفاعه 5؟", options: ["40", "50", "60", "100"], correct: 1, explanation: "المساحة = ½ × (8 + 12) × 5 = ½ × 20 × 5 = 50", difficulty: "medium" },
  { id: "geo-s10", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "pythag", strategy_tag: "pythagoras", question: "في مثلث قائم، ضلعا الزاوية القائمة 3 و 4، فما طول الوتر؟", options: ["5", "6", "7", "12"], correct: 0, explanation: "بنظرية فيثاغورس: الوتر² = 3² + 4² = 9 + 16 = 25\nالوتر = 5", difficulty: "medium" },
  { id: "geo-s11", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "pythag", strategy_tag: "pythagoras", question: "في مثلث قائم، ضلعا الزاوية القائمة 6 و 8، فما طول الوتر؟", options: ["10", "12", "14", "48"], correct: 0, explanation: "الوتر² = 36 + 64 = 100 → الوتر = 10", difficulty: "medium" },
  { id: "geo-s12", section: "كمي", category: "الهندسة", topic: "geometry", subtype: "angles", strategy_tag: "angle-sum", question: "في مثلث قياس زاويتين 50° و 60°، فما قياس الزاوية الثالثة؟", options: ["60°", "70°", "80°", "110°"], correct: 1, explanation: "مجموع زوايا المثلث = 180°\n180 - 50 - 60 = 70°", difficulty: "easy" },

  // RATIOS: percent-of, discount, increase, ratio-apply, speed, work
  { id: "rat-s1", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "percent-of", strategy_tag: "percent-multiply", question: "ما قيمة 20% من 150؟", options: ["20", "25", "30", "35"], correct: 2, explanation: "20% × 150 = 0.20 × 150 = 30", difficulty: "easy" },
  { id: "rat-s2", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "percent-of", strategy_tag: "percent-multiply", question: "ما قيمة 35% من 200؟", options: ["50", "60", "70", "80"], correct: 2, explanation: "35% × 200 = 0.35 × 200 = 70", difficulty: "easy" },
  { id: "rat-s3", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "percent-discount", strategy_tag: "percent-discount", question: "قميص سعره 200 ريال، عليه خصم 25%، فما السعر بعد الخصم؟", options: ["125", "150", "160", "175"], correct: 1, explanation: "السعر بعد الخصم = 200 × (1 - 0.25) = 200 × 0.75 = 150", difficulty: "medium" },
  { id: "rat-s4", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "percent-discount", strategy_tag: "percent-discount", question: "حذاء سعره 400 ريال، عليه خصم 30%، فما السعر بعد الخصم؟", options: ["120", "270", "280", "320"], correct: 2, explanation: "400 × (1 - 0.30) = 400 × 0.70 = 280", difficulty: "medium" },
  { id: "rat-s5", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "ratio-apply", strategy_tag: "cross-multiply", question: "إذا كانت نسبة الأولاد إلى البنات 3 : 2، وعدد الأولاد 18، فما عدد البنات؟", options: ["10", "12", "15", "18"], correct: 1, explanation: "ضرب تبادلي: 3/2 = 18/المجهول → المجهول = (2 × 18)/3 = 12", difficulty: "medium" },
  { id: "rat-s6", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "speed", strategy_tag: "speed-formula", question: "قطع سيارة مسافة 240 كم في 3 ساعات، فما سرعتها؟", options: ["60 كم/س", "70 كم/س", "80 كم/س", "120 كم/س"], correct: 2, explanation: "السرعة = المسافة ÷ الزمن = 240 ÷ 3 = 80 كم/س", difficulty: "easy" },
  { id: "rat-s7", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "speed", strategy_tag: "speed-formula", question: "قطار قطع 360 كم في 4 ساعات، فما سرعته؟", options: ["80 كم/س", "90 كم/س", "100 كم/س", "120 كم/س"], correct: 1, explanation: "السرعة = 360 ÷ 4 = 90 كم/س", difficulty: "easy" },
  { id: "rat-s8", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "work-inverse", strategy_tag: "work-inverse", question: "إذا أنجز 6 عمال عملاً في 8 أيام، فكم يحتاج 4 عمال لإنجاز نفس العمل؟", options: ["10 أيام", "12 يوماً", "14 يوماً", "16 يوماً"], correct: 1, explanation: "عمال × أيام = ثابت = 6 × 8 = 48\n48 ÷ 4 = 12 يوماً", difficulty: "medium" },
  { id: "rat-s9", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "percent-increase", strategy_tag: "percent-increase", question: "زاد راتب موظف بنسبة 10%، فإذا كان راتبه السابق 5000، فما راتبه الجديد؟", options: ["5100", "5200", "5400", "5500"], correct: 3, explanation: "الراتب الجديد = 5000 × (1 + 0.10) = 5500", difficulty: "medium" },
  { id: "rat-s10", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "percent-of", strategy_tag: "percent-multiply", question: "ما قيمة 45% من 80؟", options: ["32", "36", "40", "45"], correct: 1, explanation: "45% × 80 = 0.45 × 80 = 36", difficulty: "medium" },

  // STATISTICS: mean, median, mode, range, probability, permutation, stddev
  { id: "stat-s1", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "mean", strategy_tag: "mean-formula", question: "ما المتوسط الحسابي للأعداد: 4، 8، 10، 14 هو؟", options: ["8", "9", "10", "12"], correct: 1, explanation: "المجموع = 4 + 8 + 10 + 14 = 36\nالمتوسط = 36 ÷ 4 = 9", difficulty: "easy" },
  { id: "stat-s2", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "mean", strategy_tag: "mean-formula", question: "ما المتوسط الحسابي للأعداد: 5، 10، 15، 20، 25 هو؟", options: ["10", "12", "15", "20"], correct: 2, explanation: "المجموع = 75\nالمتوسط = 75 ÷ 5 = 15", difficulty: "easy" },
  { id: "stat-s3", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "median", strategy_tag: "sort-then-middle", question: "ما الوسيط للأعداد: 3، 7، 9، 12، 15؟", options: ["7", "9", "10", "12"], correct: 1, explanation: "الأعداد مرتبة، القيمة في المنتصف هي 9", difficulty: "easy" },
  { id: "stat-s4", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "mode", strategy_tag: "most-frequent", question: "ما المنوال للأعداد: 2، 5، 7، 5، 8، 5، 9؟", options: ["2", "5", "7", "9"], correct: 1, explanation: "العدد 5 هو الأكثر تكراراً (3 مرات)", difficulty: "easy" },
  { id: "stat-s5", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "range", strategy_tag: "max-minus-min", question: "ما المدى للأعداد: 12، 5، 18، 7، 22، 10؟", options: ["10", "15", "17", "22"], correct: 2, explanation: "المدى = أكبر قيمة - أصغر قيمة = 22 - 5 = 17", difficulty: "easy" },
  { id: "stat-s6", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "probability", strategy_tag: "favorable-over-total", question: "في كيس به 5 كرات حمراء و 3 خضراء، ما احتمال سحب كرة حمراء؟", options: ["3/8", "5/8", "3/5", "1/2"], correct: 1, explanation: "الاحتمال = 5 ÷ 8 = 5/8", difficulty: "medium" },
  { id: "stat-s7", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "probability", strategy_tag: "favorable-over-total", question: "عند رمي حجر نرد، ما احتمال ظهور عدد زوجي؟", options: ["1/6", "1/3", "1/2", "2/3"], correct: 2, explanation: "الأعداد الزوجية: 2، 4، 6 → الاحتمال = 3/6 = 1/2", difficulty: "easy" },
  { id: "stat-s8", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "permutation", strategy_tag: "factorial-or-combinations", question: "كم طريقة لترتيب 4 كتب مختلفة على رف؟", options: ["12", "16", "24", "48"], correct: 2, explanation: "عدد الترتيبات = 4! = 4 × 3 × 2 × 1 = 24", difficulty: "medium" },
  { id: "stat-s9", section: "كمي", category: "الإحصاء والاحتمالات", topic: "statistics", subtype: "stddev", strategy_tag: "sqrt-of-variance", question: "إذا كان تباين مجموعة بيانات 49، فما الانحراف المعياري؟", options: ["5", "7", "9", "49"], correct: 1, explanation: "الانحراف المعياري = √التباين = √49 = 7", difficulty: "medium" },

  // ANALOGY: vary the relations (function, part-whole, antonym, synonym, agent)
  { id: "ana-s1", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "analogy-pair", strategy_tag: "name-the-relation", question: "قلم : كتابة :: مفتاح : ؟", options: ["باب", "فتح", "قفل", "حديد"], correct: 1, explanation: "العلاقة: الأداة ووظيفتها\nالقلم للكتابة، والمفتاح للفتح", difficulty: "easy" },
  { id: "ana-s2", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "analogy-pair", strategy_tag: "name-the-relation", question: "طبيب : مستشفى :: معلم : ؟", options: ["تلميذ", "كتاب", "مدرسة", "درس"], correct: 2, explanation: "العلاقة: الشخص ومكان عمله", difficulty: "easy" },
  { id: "ana-s3", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "analogy-pair", strategy_tag: "name-the-relation", question: "جناح : طائر :: زعنفة : ؟", options: ["بحر", "سمكة", "ماء", "ريشة"], correct: 1, explanation: "العلاقة: العضو وصاحبه\nالجناح للطائر والزعنفة للسمكة", difficulty: "medium" },
  { id: "ana-s4", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "analogy-pair", strategy_tag: "name-the-relation", question: "ساعة : وقت :: ميزان : ؟", options: ["كيلو", "وزن", "حديد", "ثقل"], correct: 1, explanation: "العلاقة: الأداة وما تقيسه", difficulty: "medium" },
  { id: "ana-s5", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "analogy-pair", strategy_tag: "name-the-relation", question: "ذئب : قطيع :: لص : ؟", options: ["مال", "عصابة", "سرقة", "سجن"], correct: 1, explanation: "العلاقة: مفترس ومجموعته/مجموعته الإجرامية", difficulty: "medium" },

  // VOCABULARY: more synonyms + odd-one-out variety
  { id: "voc-s1", section: "لفظي", category: "المرادفات", topic: "vocabulary", subtype: "synonym", strategy_tag: "synonym-lookup", question: "اختر مرادف كلمة (الفرح):", options: ["الحزن", "السرور", "الغضب", "الخوف"], correct: 1, explanation: "مرادف الفرح = السرور", difficulty: "easy" },
  { id: "voc-s2", section: "لفظي", category: "المرادفات", topic: "vocabulary", subtype: "synonym", strategy_tag: "synonym-lookup", question: "اختر مرادف كلمة (الشجاعة):", options: ["الجبن", "البسالة", "الخوف", "التردد"], correct: 1, explanation: "مرادف الشجاعة = البسالة", difficulty: "medium" },
  { id: "voc-s3", section: "لفظي", category: "المرادفات", topic: "vocabulary", subtype: "synonym", strategy_tag: "synonym-lookup", question: "اختر مرادف كلمة (الحكمة):", options: ["الجهل", "الفطنة", "العجلة", "الغفلة"], correct: 1, explanation: "مرادف الحكمة = الفطنة", difficulty: "medium" },
  { id: "voc-s4", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", subtype: "odd-one-out", strategy_tag: "shared-category", question: "حدد الكلمة المختلفة: عين - أذن - لسان - قلم", options: ["عين", "أذن", "لسان", "قلم"], correct: 3, explanation: "القلم أداة، والباقي حواس/أعضاء", difficulty: "easy" },
  { id: "voc-s5", section: "لفظي", category: "المفردة الشاذة", topic: "vocabulary", subtype: "odd-one-out", strategy_tag: "shared-category", question: "حدد الكلمة المختلفة: كرسي - طاولة - سرير - كتاب", options: ["كرسي", "طاولة", "سرير", "كتاب"], correct: 3, explanation: "الكتاب وسيلة قراءة، والباقي أثاث", difficulty: "easy" },

  // COMPLETION: more variety
  { id: "comp-s1", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "fill-blank", strategy_tag: "context-fit", question: "إن مع العسر _____.", options: ["الفرج", "النصر", "يسراً", "السهولة"], correct: 2, explanation: "إن مع العسر يسراً - من القرآن الكريم", difficulty: "easy" },
  { id: "comp-s2", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "fill-blank", strategy_tag: "context-fit", question: "خير جليس في الزمان _____.", options: ["الصديق", "الكتاب", "العالم", "الأهل"], correct: 1, explanation: "خير جليس في الزمان كتاب - بيت شعر شهير", difficulty: "easy" },
  { id: "comp-s3", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "fill-blank", strategy_tag: "context-fit", question: "رُبَّ كلمة _____ نعمة.", options: ["جلبت", "سلبت", "منعت", "جلبت"], correct: 1, explanation: "ربَّ كلمة سلبت نعمة - مثل عربي", difficulty: "medium" },

  // ============================================================
  // === EXPANSION PACK v2: filling subtype/wording_style gaps ===
  // ============================================================

  // RATIOS — comparison (NEW subtype): which option is the better unit price / faster pace
  { id: "rat-s11", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "comparison", strategy_tag: "unit-rate-compare", wording_style: "story", question: "أيهما أرخص: 6 أقلام بـ 24 ريال أم 4 أقلام بـ 20 ريال؟", options: ["6 أقلام بـ 24 ريال", "4 أقلام بـ 20 ريال", "متساويان", "لا يمكن المقارنة"], correct: 0, explanation: "سعر القلم في الأولى = 24 ÷ 6 = 4 ر، وفي الثانية = 20 ÷ 4 = 5 ر\nالأولى أرخص.", difficulty: "medium" },
  { id: "rat-s12", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "comparison", strategy_tag: "unit-rate-compare", wording_style: "story", question: "أيهما أوفر: عبوة 2 لتر بـ 8 ريال أم عبوة 5 لتر بـ 18 ريال؟", options: ["العبوة الأولى", "العبوة الثانية", "متساويان", "لا يمكن التحديد"], correct: 1, explanation: "سعر اللتر: 8/2 = 4 ر مقابل 18/5 = 3.6 ر\nالعبوة الثانية أوفر.", difficulty: "medium" },
  { id: "rat-s13", section: "كمي", category: "النسب والتناسب", topic: "ratios", subtype: "comparison", strategy_tag: "unit-rate-compare", wording_style: "story", question: "سيارة قطعت 180 كم في 3 ساعات، وأخرى قطعت 240 كم في 4 ساعات. أيهما أسرع؟", options: ["الأولى", "الثانية", "متساويتان", "لا يمكن المقارنة"], correct: 2, explanation: "سرعة الأولى = 180/3 = 60، وسرعة الثانية = 240/4 = 60\nالسرعتان متساويتان.", difficulty: "medium" },

  // ANALOGY — split into 4 distinct relation types (was a single subtype)
  // relation-function: tool ↔ purpose
  { id: "ana-s6",  section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-function", strategy_tag: "name-the-relation", wording_style: "direct", question: "ميزان : وزن :: ساعة : ؟", options: ["زمن", "حركة", "ثوان", "عقرب"], correct: 0, explanation: "العلاقة: الأداة وما تقيسه. الميزان يقيس الوزن، والساعة تقيس الزمن.", difficulty: "easy" },
  { id: "ana-s7",  section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-function", strategy_tag: "name-the-relation", wording_style: "direct", question: "مكنسة : تنظيف :: مقص : ؟", options: ["حديد", "ورق", "قص", "خياطة"], correct: 2, explanation: "العلاقة: الأداة ووظيفتها. المكنسة للتنظيف، والمقص للقص.", difficulty: "easy" },
  { id: "ana-s8",  section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-function", strategy_tag: "name-the-relation", wording_style: "direct", question: "تلسكوب : رؤية :: مجهر : ؟", options: ["تكبير", "علم", "مختبر", "زجاج"], correct: 0, explanation: "كلاهما أداة بصرية، التلسكوب يستخدم لرؤية البعيد، والمجهر للتكبير.", difficulty: "medium" },
  // relation-part-whole: part ↔ whole
  { id: "ana-s9",  section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-part-whole", strategy_tag: "name-the-relation", wording_style: "direct", question: "ورقة : كتاب :: فصل : ؟", options: ["جامعة", "طالب", "رواية", "معلم"], correct: 2, explanation: "العلاقة: الجزء والكل. الورقة جزء من الكتاب، والفصل جزء من الرواية.", difficulty: "medium" },
  { id: "ana-s10", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-part-whole", strategy_tag: "name-the-relation", wording_style: "direct", question: "إصبع : يد :: ورقة : ؟", options: ["شجرة", "كتابة", "خضراء", "حديقة"], correct: 0, explanation: "الإصبع جزء من اليد، والورقة جزء من الشجرة.", difficulty: "easy" },
  { id: "ana-s11", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-part-whole", strategy_tag: "name-the-relation", wording_style: "direct", question: "غرفة : منزل :: نجم : ؟", options: ["ليل", "كوكب", "مجرة", "ضوء"], correct: 2, explanation: "الغرفة جزء من المنزل، والنجم جزء من المجرة.", difficulty: "medium" },
  // relation-antonym: word ↔ opposite
  { id: "ana-s12", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-antonym", strategy_tag: "name-the-relation", wording_style: "direct", question: "نهار : ليل :: صعود : ؟", options: ["جبل", "نزول", "سلم", "تعب"], correct: 1, explanation: "العلاقة: التضاد. النهار ضد الليل، والصعود ضد النزول.", difficulty: "easy" },
  { id: "ana-s13", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-antonym", strategy_tag: "name-the-relation", wording_style: "direct", question: "كرم : بخل :: شجاعة : ؟", options: ["إقدام", "بطولة", "جبن", "قوة"], correct: 2, explanation: "كل ثنائي صفتان متضادتان: الكرم ضد البخل، والشجاعة ضد الجبن.", difficulty: "medium" },
  { id: "ana-s14", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-antonym", strategy_tag: "name-the-relation", wording_style: "direct", question: "حار : بارد :: مبتل : ؟", options: ["ماء", "ثلج", "جاف", "ساخن"], correct: 2, explanation: "العلاقة: التضاد في الصفة. حار ضد بارد، ومبتل ضد جاف.", difficulty: "easy" },
  // relation-synonym: word ↔ near-synonym
  { id: "ana-s15", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-synonym", strategy_tag: "name-the-relation", wording_style: "direct", question: "فرح : سرور :: حزن : ؟", options: ["بكاء", "أسى", "ضحك", "هدوء"], correct: 1, explanation: "العلاقة: الترادف. الفرح يرادف السرور، والحزن يرادف الأسى.", difficulty: "medium" },
  { id: "ana-s16", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-synonym", strategy_tag: "name-the-relation", wording_style: "direct", question: "شجاع : باسل :: كريم : ؟", options: ["غني", "جواد", "بخيل", "صديق"], correct: 1, explanation: "كل ثنائي مترادفان: الشجاع والباسل، والكريم والجواد.", difficulty: "medium" },
  { id: "ana-s17", section: "لفظي", category: "التناظر اللفظي", topic: "analogy", subtype: "relation-synonym", strategy_tag: "name-the-relation", wording_style: "direct", question: "وضوح : جلاء :: غموض : ؟", options: ["نور", "إبهام", "ظلام", "قرب"], correct: 1, explanation: "العلاقة: الترادف. الوضوح يرادف الجلاء، والغموض يرادف الإبهام.", difficulty: "hard" },

  // READING COMPREHENSION — main-idea + inference (new topic, two subtypes × 3 each)
  { id: "rc-s1", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", subtype: "main-idea", strategy_tag: "summarize-passage", wording_style: "passage", question: "اقرأ النص التالي ثم أجب: «العلم نور يضيء طريق الإنسان نحو المعرفة. كلما زاد علم الإنسان اتسعت آفاقه وفهم محيطه واستطاع أن يتخذ قرارات أفضل في حياته». ما الفكرة الرئيسة للنص؟", options: ["أن المعرفة صعبة المنال", "أن العلم يوسّع آفاق الإنسان ويحسّن قراراته", "أن الإنسان يحتاج إلى النور", "أن البيئة تؤثر في الإنسان"], correct: 1, explanation: "النص يدور حول أثر العلم في توسيع الآفاق وتحسين القرارات، وهذا هو المعنى المركزي.", difficulty: "easy" },
  { id: "rc-s2", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", subtype: "main-idea", strategy_tag: "summarize-passage", wording_style: "passage", question: "اقرأ النص التالي ثم أجب: «تتأثر صحة الإنسان بنوعية غذائه وعدد ساعات نومه ومستوى نشاطه البدني. وأي خلل في أحد هذه العوامل قد ينعكس على بقية جوانب حياته». الفكرة الرئيسة للنص هي:", options: ["خطورة الأمراض المزمنة", "أن الصحة نتاج تفاعل عدة عوامل في حياة الإنسان", "أهمية ممارسة الرياضة فقط", "أن النوم أهم من الغذاء"], correct: 1, explanation: "النص يحصر سبب الصحة في تفاعل عدة عوامل لا في عامل واحد، وهذا جوهر فكرته.", difficulty: "medium" },
  { id: "rc-s3", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", subtype: "main-idea", strategy_tag: "summarize-passage", wording_style: "passage", question: "اقرأ النص التالي ثم أجب: «انتشرت مؤخراً تطبيقات التعلم الذاتي عبر الإنترنت، فمكّنت الطلاب من اختيار وقت دراستهم ومواضيعها بحرية، إلا أن نجاحها يبقى مرهوناً بالانضباط الشخصي». الفكرة الرئيسة هي:", options: ["مزايا الإنترنت بشكل عام", "أن التعلم الذاتي مفيد لكن يحتاج إلى انضباط", "أن المدارس التقليدية أفضل", "أن الطلاب يفضلون الراحة على الدراسة"], correct: 1, explanation: "النص يوازن بين فائدة التعلم الذاتي وشرط نجاحه (الانضباط)، وهذا محور الفكرة.", difficulty: "medium" },
  { id: "rc-s4", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", subtype: "inference", strategy_tag: "infer-from-context", wording_style: "passage", question: "اقرأ النص: «وصل أحمد إلى المحاضرة وكان يلهث ويحمل حقيبته بصعوبة، ولم يسلم على زملائه قبل الجلوس». ماذا يمكن أن نستنتج؟", options: ["أن أحمد لا يحب زملاءه", "أن أحمد كان متأخراً ومستعجلاً", "أن المحاضرة ألغيت", "أن الحقيبة فارغة"], correct: 1, explanation: "اللهث وحمل الحقيبة بصعوبة وعدم السلام دلالات سياقية على التأخر والاستعجال، لا الكره.", difficulty: "medium" },
  { id: "rc-s5", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", subtype: "inference", strategy_tag: "infer-from-context", wording_style: "passage", question: "اقرأ النص: «انخفضت أسعار الخضار في السوق هذا الأسبوع بشكل لافت، ولوحظ ازدحام كبير على الباعة منذ الصباح الباكر». أي استنتاج يدعمه النص؟", options: ["أن الخضار رديئة الجودة", "أن السوق سيغلق قريباً", "أن انخفاض الأسعار جذب المزيد من المشترين", "أن الباعة رفعوا الأسعار"], correct: 2, explanation: "الانخفاض + الازدحام دليلان مرتبطان سببياً: السعر الأقل جذب المشترين.", difficulty: "easy" },
  { id: "rc-s6", section: "لفظي", category: "استيعاب المقروء", topic: "comprehension", subtype: "inference", strategy_tag: "infer-from-context", wording_style: "passage", question: "اقرأ النص: «منذ أن بدأت سارة بقراءة كتاب أسبوعياً، صارت أكثر هدوءاً في النقاش، وأصبحت تستخدم مفردات لم تكن تستخدمها من قبل». نستنتج أن:", options: ["القراءة لا تؤثر على الإنسان", "سارة تحب الجدال", "القراءة المنتظمة تنمّي الفكر واللغة", "الكتب الأسبوعية مملة"], correct: 2, explanation: "التغير في أسلوب النقاش وثراء المفردات بعد القراءة يدل على أثر القراءة في تنمية الفكر واللغة.", difficulty: "medium" },

  // COMPLETION — split fill-blank into "proverb" (مثل/حكمة) and "sentence" (سياق منطقي)
  { id: "comp-s4", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "proverb", strategy_tag: "famous-saying", wording_style: "instruction", question: "أكمل المثل: لا يلدغ المؤمن من جحر مرتين، أي أنه لا يقع في _____ مرتين.", options: ["النصر", "الخطأ", "الخير", "الفرح"], correct: 1, explanation: "المثل يدعو إلى الحذر من تكرار نفس الخطأ بعد التجربة الأولى.", difficulty: "easy" },
  { id: "comp-s5", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "proverb", strategy_tag: "famous-saying", wording_style: "instruction", question: "أكمل المثل: في التأني السلامة وفي العجلة _____.", options: ["النجاح", "البركة", "الندامة", "السرعة"], correct: 2, explanation: "مثل عربي شهير يفاضل بين التأني والعجلة، ونتيجة العجلة الندامة.", difficulty: "easy" },
  { id: "comp-s6", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "proverb", strategy_tag: "famous-saying", wording_style: "instruction", question: "أكمل المثل: من شبّ على شيء _____ عليه.", options: ["مرض", "شاب", "ندم", "كبر"], correct: 1, explanation: "من شبّ على شيء شاب عليه — مثل عربي يدل على رسوخ العادات منذ الصغر.", difficulty: "medium" },
  { id: "comp-s7", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "sentence", strategy_tag: "logical-context", wording_style: "story", question: "بعد ساعات طويلة من العمل المتواصل، شعر الموظف بالحاجة إلى _____.", options: ["مزيد من العمل", "الراحة", "الاجتماع", "الجدال"], correct: 1, explanation: "السياق يربط طول العمل بالشعور بالحاجة إلى الراحة، وهو الخيار المنطقي الوحيد.", difficulty: "easy" },
  { id: "comp-s8", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "sentence", strategy_tag: "logical-context", wording_style: "story", question: "قبل عبور الشارع علينا أن _____ يميناً ويساراً للتأكد من خلوّه من السيارات.", options: ["نقفز", "ننظر", "نهرب", "نغمض أعيننا"], correct: 1, explanation: "السلوك المنطقي للسلامة هو النظر يميناً ويساراً، لا القفز ولا الإغماض.", difficulty: "easy" },
  { id: "comp-s9", section: "لفظي", category: "إكمال الجمل", topic: "completion", subtype: "sentence", strategy_tag: "logical-context", wording_style: "story", question: "اشترى محمد دراجة جديدة، لكنه لم يستخدمها في الأيام الممطرة خوفاً من _____.", options: ["السرعة", "الانزلاق", "السعادة", "النور"], correct: 1, explanation: "الخوف على الدراجة في المطر يرتبط منطقياً بخطر الانزلاق على الطرق المبتلة.", difficulty: "medium" },
];

// Explicit Arabic option labels (avoids broken hamza variants from charCode math)
const OPTION_LABELS = ["أ", "ب", "ج", "د", "هـ", "و"] as const;
// English option labels for GAT / SAAT (and any other English-exam focus value).
// Selected at render time based on the resolved exam locale (see `optionLabels`
// inside `PracticeTestContent`). Kept in sync length-wise with `OPTION_LABELS`
// so the same `OPTION_LABELS[idx] ?? String(idx + 1)` fallback applies to both.
const OPTION_LABELS_EN = ["A", "B", "C", "D", "E", "F"] as const;

// ===== Smart training metadata: branch → idea / fast method / why important =====
// All three fields are bilingual ({ ar, en }) so the same enrichment pipeline
// can serve both Qudrat-AR (Arabic chrome) and GAT/SAAT (English chrome).
// Render via `pickLocale(value, isArabicExam)` — it falls back to ar when en
// is missing so additions can ship Arabic-only safely.
type BranchInfo = { idea: Bilingual; fast_method: Bilingual; why: Bilingual };
const branchMeta: Record<string, Record<string, BranchInfo>> = {
  algebra: {
    equations: { idea: { ar: "حل معادلة", en: "Solve an equation" }, fast_method: { ar: "اعزل المتغير في طرف واحد قبل أي خطوة حسابية", en: "Isolate the variable on one side before any arithmetic step" }, why: { ar: "المعادلات تتكرر في كل اختبار قياس تقريباً", en: "Equations appear on virtually every Qiyas exam" } },
    simplify: { idea: { ar: "تبسيط عبارة", en: "Simplify an expression" }, fast_method: { ar: "ابدأ بالحدود ذات الدرجة الأعلى عند التبسيط", en: "Start with the highest-degree terms when simplifying" }, why: { ar: "تبسيط العبارات أساس لحل أسئلة أكبر", en: "Simplifying expressions underpins many longer problems" } },
    patterns: { idea: { ar: "نمط جبري", en: "Algebraic pattern" }, fast_method: { ar: "احسب الفرق بين الحدود لتحديد نوع النمط", en: "Compute the difference between consecutive terms to identify the pattern" }, why: { ar: "أنماط الأرقام شائعة في القسم الكمي", en: "Number patterns appear often in the Quantitative section" } },
    substitution: { idea: { ar: "تعويض", en: "Substitution" }, fast_method: { ar: "عوّض بأرقام بسيطة بدل الحل الجبري الكامل", en: "Substitute small numbers instead of solving algebraically" }, why: { ar: "التعويض يوفر وقتاً كبيراً في الاختبار", en: "Substitution saves significant time on the exam" } },
    comparison: { idea: { ar: "مقارنة", en: "Comparison" }, fast_method: { ar: "وحّد الطرفين قبل المقارنة", en: "Put both sides in the same form before comparing" }, why: { ar: "أسئلة المقارنة تختبر سرعتك في التقدير", en: "Comparison questions test your speed of estimation" } },
  },
  geometry: {
    triangles: { idea: { ar: "مثلث", en: "Triangle" }, fast_method: { ar: "تذكّر مجموع زوايا المثلث 180° واستخدم فيثاغورس عند الحاجة", en: "Remember angles sum to 180° and use Pythagoras when needed" }, why: { ar: "خصائص المثلث تتكرر في معظم الأسئلة الهندسية", en: "Triangle properties appear in most geometry questions" } },
    circles: { idea: { ar: "دائرة", en: "Circle" }, fast_method: { ar: "احفظ صيغة المحيط 2πر والمساحة πر²", en: "Memorize the formulas: circumference = 2πr, area = πr²" }, why: { ar: "أسئلة الدائرة من الأنماط الكلاسيكية", en: "Circle questions are a classic exam pattern" } },
    areas: { idea: { ar: "مساحة/حجم", en: "Area / Volume" }, fast_method: { ar: "اكتب صيغة المساحة قبل الحساب لتجنب الخطأ", en: "Write the area formula before computing to avoid mistakes" }, why: { ar: "حساب المساحات والأحجام مهارة أساسية", en: "Computing area and volume is a foundational skill" } },
    angles: { idea: { ar: "زاوية", en: "Angle" }, fast_method: { ar: "استخدم خصائص الزوايا المتجاورة والمتقابلة", en: "Use the properties of adjacent and vertically opposite angles" }, why: { ar: "الزوايا تظهر في أسئلة هندسية كثيرة", en: "Angles appear in many geometry questions" } },
    symmetry: { idea: { ar: "تشابه/تماثل", en: "Similarity / Symmetry" }, fast_method: { ar: "قارن نسب الأضلاع لتحديد التشابه", en: "Compare side ratios to determine similarity" }, why: { ar: "التشابه يربط بين الأشكال المتعددة", en: "Similarity links related shapes together" } },
  },
  ratios: {
    percent: { idea: { ar: "نسبة مئوية", en: "Percentage" }, fast_method: { ar: "حوّل النسبة لكسر بسيط قبل الضرب", en: "Convert the percent to a simple fraction before multiplying" }, why: { ar: "النسب المئوية من أكثر الأسئلة تكراراً", en: "Percentages are among the most frequent question types" } },
    direct: { idea: { ar: "تناسب", en: "Proportion" }, fast_method: { ar: "للتناسب الطردي: ضرب تبادلي مباشرة", en: "For direct proportion: cross-multiply directly" }, why: { ar: "التناسب يربط بين الكميات المختلفة", en: "Proportions relate one quantity to another" } },
    rates: { idea: { ar: "معدل/سرعة", en: "Rate / Speed" }, fast_method: { ar: "المسافة = السرعة × الزمن — احفظها واستخدمها", en: "Distance = Speed × Time — memorize and use it" }, why: { ar: "أسئلة السرعة من المسائل اللفظية الشائعة", en: "Speed problems are common word-problem patterns" } },
    word: { idea: { ar: "مسألة لفظية", en: "Word problem" }, fast_method: { ar: "استخرج المعطيات أولاً ثم اكتب المعادلة", en: "Extract the given data first, then write the equation" }, why: { ar: "المسائل اللفظية تختبر الفهم والتحليل", en: "Word problems test comprehension and analysis" } },
  },
  statistics: {
    average: { idea: { ar: "متوسط/وسيط/منوال", en: "Mean / Median / Mode" }, fast_method: { ar: "رتّب الأرقام تصاعدياً قبل إيجاد الوسيط", en: "Sort the numbers ascending before finding the median" }, why: { ar: "مقاييس النزعة المركزية أساس الإحصاء", en: "Measures of central tendency are foundational to statistics" } },
    probability: { idea: { ar: "احتمال", en: "Probability" }, fast_method: { ar: "الاحتمال = الحالات المرغوبة ÷ كل الحالات", en: "Probability = favorable outcomes ÷ total outcomes" }, why: { ar: "الاحتمالات تظهر في أسئلة منوعة", en: "Probability appears in a variety of questions" } },
    tables: { idea: { ar: "تحليل جدول", en: "Table analysis" }, fast_method: { ar: "اقرأ عناوين الأعمدة والصفوف أولاً", en: "Read the column and row headers first" }, why: { ar: "قراءة الجداول مهارة عملية مهمة", en: "Reading tables is an important practical skill" } },
    charts: { idea: { ar: "قراءة مخطط", en: "Chart reading" }, fast_method: { ar: "اقرأ عنوان المخطط ووحدات القياس قبل الإجابة", en: "Read the chart title and the units before answering" }, why: { ar: "المخططات تختصر معلومات كثيرة", en: "Charts compress a lot of information" } },
  },
  analogy: {
    relations: { idea: { ar: "علاقة لفظية", en: "Verbal relationship" }, fast_method: { ar: "صُغ العلاقة بجملة واضحة قبل النظر للخيارات", en: "State the relationship in a clear sentence before looking at the options" }, why: { ar: "التناظر اللفظي قسم رئيسي في القدرات", en: "Verbal analogies are a major section of the GAT" } },
    "antonym-rel": { idea: { ar: "علاقة تضاد", en: "Antonym relationship" }, fast_method: { ar: "حدد جذر الكلمة وابحث عن نقيضها مباشرة", en: "Identify the word's root and look for its direct opposite" }, why: { ar: "علاقات التضاد متكررة في التناظر", en: "Antonym relationships recur in analogies" } },
    "synonym-rel": { idea: { ar: "علاقة ترادف", en: "Synonym relationship" }, fast_method: { ar: "ابحث عن الكلمة الأقرب معنىً لا الأقرب لفظاً", en: "Look for the word closest in meaning, not in spelling" }, why: { ar: "الترادف يختبر ثروتك اللغوية", en: "Synonyms test the breadth of your vocabulary" } },
    category: { idea: { ar: "جزء وكل", en: "Part and whole" }, fast_method: { ar: "حدد ما إذا كانت إحدى الكلمتين جزءاً من الأخرى", en: "Determine whether one word is a part of the other" }, why: { ar: "علاقة الجزء بالكل من الأنماط الشائعة", en: "Part-to-whole is a common pattern" } },
  },
  completion: {
    "missing-word": { idea: { ar: "كلمة ناقصة", en: "Missing word" }, fast_method: { ar: "اقرأ الجملة كاملة قبل النظر للخيارات", en: "Read the whole sentence before looking at the options" }, why: { ar: "إكمال الجمل يقيس فهم السياق", en: "Sentence completion measures contextual understanding" } },
    "context-fit": { idea: { ar: "كلمة مناسبة للسياق", en: "Context-appropriate word" }, fast_method: { ar: "حدّد علامات السياق (ولكن، لذلك، رغم...)", en: "Identify context cues (but, therefore, although...)" }, why: { ar: "السياق يحدد الكلمة المناسبة", en: "Context determines the right word" } },
    "verb-choice": { idea: { ar: "فعل مناسب", en: "Verb choice" }, fast_method: { ar: "تأكد من زمن الفعل ومطابقته للفاعل", en: "Check verb tense and subject-verb agreement" }, why: { ar: "اختيار الفعل الصحيح أساسي لمعنى الجملة", en: "Picking the right verb is essential to the sentence's meaning" } },
    joining: { idea: { ar: "ربط الجمل", en: "Joining clauses" }, fast_method: { ar: "حدد العلاقة المنطقية بين الجملتين قبل اختيار الرابط", en: "Identify the logical relation between the two clauses before picking a connector" }, why: { ar: "أدوات الربط تربط الأفكار بدقة", en: "Connectors link ideas precisely" } },
  },
  comprehension: {
    "main-idea": { idea: { ar: "فكرة عامة", en: "Main idea" }, fast_method: { ar: "ابحث عن الجملة الموضوعية في بداية الفقرة", en: "Look for the topic sentence at the start of the paragraph" }, why: { ar: "الفكرة العامة من أهم أسئلة الاستيعاب", en: "Main-idea questions are among the most important in comprehension" } },
    "word-meaning": { idea: { ar: "معنى مفردة", en: "Word meaning" }, fast_method: { ar: "استنتج المعنى من السياق المحيط بالكلمة", en: "Infer the meaning from the context around the word" }, why: { ar: "معاني المفردات تختبر فهم النص", en: "Word-meaning tests measure your understanding of the passage" } },
    inference: { idea: { ar: "استنتاج", en: "Inference" }, fast_method: { ar: "اعتمد على ما يقوله النص لا على رأيك الشخصي", en: "Rely on what the text says, not on your personal opinion" }, why: { ar: "الاستنتاج يقيس فهمك العميق", en: "Inference measures deeper comprehension" } },
    "back-to-text": { idea: { ar: "عودة للنص", en: "Return to the text" }, fast_method: { ar: "ارجع للنص لكل سؤال ولا تعتمد على الذاكرة", en: "Return to the text for every question — don't rely on memory" }, why: { ar: "العودة للنص تجنبك الأخطاء", en: "Going back to the text helps you avoid mistakes" } },
    intent: { idea: { ar: "تحديد المقصود", en: "Identify the intent" }, fast_method: { ar: "ابحث عن كلمات مفتاحية في السؤال داخل النص", en: "Look for the question's keywords inside the text" }, why: { ar: "تحديد المقصود يتطلب دقة في القراءة", en: "Identifying intent requires careful reading" } },
  },
  contextual: {
    morph: { idea: { ar: "خطأ صرفي", en: "Morphological error" }, fast_method: { ar: "تأكد من تصريف الكلمة وموافقتها للقاعدة", en: "Check the word's inflection and that it follows the rule" }, why: { ar: "الأخطاء الصرفية شائعة في الكتابة", en: "Morphological errors are common in writing" } },
    syntax: { idea: { ar: "خطأ نحوي", en: "Syntactic error" }, fast_method: { ar: "تحقق من علامات الإعراب ومطابقة الفاعل والفعل", en: "Check the case markings and subject-verb agreement" }, why: { ar: "النحو أساس صحة الجملة", en: "Syntax is the foundation of a correct sentence" } },
    semantic: { idea: { ar: "خطأ دلالي", en: "Semantic error" }, fast_method: { ar: "اقرأ الجملة بصوت منخفض لاكتشاف الخلل في المعنى", en: "Read the sentence aloud quietly to spot the meaning issue" }, why: { ar: "الأخطاء الدلالية تخفي خللاً في المعنى", en: "Semantic errors hide a flaw in meaning" } },
  },
  vocabulary: {
    antonyms: { idea: { ar: "متضاد", en: "Antonym" }, fast_method: { ar: "حلّل جذر الكلمة لاستنتاج عكسها", en: "Analyze the word's root to deduce its opposite" }, why: { ar: "المتضادات تختبر معرفتك بالمعاني المقابلة", en: "Antonyms test your knowledge of opposite meanings" } },
    synonyms: { idea: { ar: "مرادف", en: "Synonym" }, fast_method: { ar: "ابحث عن الكلمة الأقرب في المعنى لا في اللفظ", en: "Look for the word closest in meaning, not in spelling" }, why: { ar: "المرادفات تثري فهمك اللغوي", en: "Synonyms enrich your linguistic understanding" } },
    meanings: { idea: { ar: "معنى مفردة", en: "Word meaning" }, fast_method: { ar: "استنتج المعنى من السياق إن وُجد", en: "Infer the meaning from context when available" }, why: { ar: "معاني المفردات أساس الفهم اللفظي", en: "Vocabulary meanings are the basis of verbal comprehension" } },
  },
};

// ===== Per-question derivation: extracts numbers / words from the question text
// to produce specific (not generic) idea + fast method, while keeping branchMeta
// as a structured fallback. No external AI — fully deterministic + safe.
// All idea/fast_method/why_important values are bilingual ({ ar, en }) so
// English exams (GAT/SAAT) get English analysis chrome from the same pipeline.
// =====
type Derived = { idea?: Bilingual; fast_method?: Bilingual; why_important?: Bilingual; subtype?: string; strategy_tag?: string };

function num(s: string): number { return Number(s); }

function deriveSmartInfo(q: TrainingQuestion, fallback?: BranchInfo): Derived {
  const t = q.question;
  const why = fallback?.why;
  let m: RegExpMatchArray | null;

  switch (q.topic) {
    case "algebra": {
      if ((m = t.match(/س\s*\+\s*(\d+)\s*=\s*(\d+)/)) || (m = t.match(/x\s*\+\s*(\d+)\s*=\s*(\d+)/i))) {
        const a = num(m[1]), b = num(m[2]);
        return { subtype: "linear-add", strategy_tag: "isolate-x-subtract",
          idea: { ar: `معادلة خطية: س + ${a} = ${b}`, en: `Linear equation: x + ${a} = ${b}` },
          fast_method: { ar: `اطرح ${a} من الطرفين فوراً: س = ${b} − ${a} = ${b - a}`, en: `Subtract ${a} from both sides: x = ${b} − ${a} = ${b - a}` },
          why_important: why };
      }
      if ((m = t.match(/2س\s*-\s*(\d+)\s*=\s*(\d+)/)) || (m = t.match(/2x\s*-\s*(\d+)\s*=\s*(\d+)/i))) {
        const a = num(m[1]), b = num(m[2]); const x = (b + a) / 2;
        return { subtype: "linear-mul-sub", strategy_tag: "balance-then-divide",
          idea: { ar: `معادلة خطية: 2س − ${a} = ${b}`, en: `Linear equation: 2x − ${a} = ${b}` },
          fast_method: { ar: `أضف ${a} للطرفين ثم اقسم على 2: س = (${b} + ${a}) ÷ 2 = ${x}`, en: `Add ${a} to both sides then divide by 2: x = (${b} + ${a}) ÷ 2 = ${x}` },
          why_important: why };
      }
      if ((m = t.match(/(\d+)س\s*=\s*(\d+)/)) || (m = t.match(/(\d+)x\s*=\s*(\d+)/i))) {
        const a = num(m[1]), b = num(m[2]); const x = b / a;
        return { subtype: "linear-mul", strategy_tag: "divide-both-sides",
          idea: { ar: `معادلة ضرب: ${a}س = ${b}`, en: `Multiplication equation: ${a}x = ${b}` },
          fast_method: { ar: `اقسم الطرفين على ${a}: س = ${b} ÷ ${a} = ${x}`, en: `Divide both sides by ${a}: x = ${b} ÷ ${a} = ${x}` },
          why_important: why };
      }
      if ((m = t.match(/س²\s*=\s*(\d+)/)) || (m = t.match(/x²\s*=\s*(\d+)/i)) || (m = t.match(/x\^2\s*=\s*(\d+)/i))) {
        const b = num(m[1]); const r = Math.sqrt(b);
        return { subtype: "square-eq", strategy_tag: "sqrt-both-sides",
          idea: { ar: `معادلة تربيعية بسيطة: س² = ${b}`, en: `Simple quadratic: x² = ${b}` },
          fast_method: { ar: `خذ الجذر التربيعي للطرفين: س = ±√${b} = ±${r}`, en: `Take the square root of both sides: x = ±√${b} = ±${r}` },
          why_important: why };
      }
      if ((m = t.match(/\|س\s*-\s*(\d+)\|\s*=\s*(\d+)/)) || (m = t.match(/\|x\s*-\s*(\d+)\|\s*=\s*(\d+)/i))) {
        const a = num(m[1]), b = num(m[2]);
        return { subtype: "abs-eq", strategy_tag: "abs-two-cases",
          idea: { ar: `معادلة قيمة مطلقة: |س − ${a}| = ${b}`, en: `Absolute-value equation: |x − ${a}| = ${b}` },
          fast_method: { ar: `حلّ حالتين: س − ${a} = ${b} (س = ${a + b}) أو س − ${a} = −${b} (س = ${a - b})`, en: `Solve both cases: x − ${a} = ${b} (x = ${a + b}) or x − ${a} = −${b} (x = ${a - b})` },
          why_important: why };
      }
      if ((m = t.match(/√(\d+)/))) {
        const v = num(m[1]);
        return { subtype: "sqrt", strategy_tag: "memorize-squares",
          idea: { ar: `إيجاد الجذر التربيعي لـ ${v}`, en: `Find the square root of ${v}` },
          fast_method: { ar: `ابحث عن العدد الذي مربعه ${v}: الإجابة ${Math.sqrt(v)} لأن ${Math.sqrt(v)}² = ${v}`, en: `Find the number whose square is ${v}: the answer is ${Math.sqrt(v)} because ${Math.sqrt(v)}² = ${v}` },
          why_important: why };
      }
      if ((m = t.match(/2س\s*-\s*(\d+)\s*>\s*(\d+)/)) || (m = t.match(/2x\s*-\s*(\d+)\s*>\s*(\d+)/i))) {
        const a = num(m[1]), b = num(m[2]);
        return { subtype: "linear-ineq", strategy_tag: "isolate-keep-direction",
          idea: { ar: `حل متباينة: 2س − ${a} > ${b}`, en: `Solve an inequality: 2x − ${a} > ${b}` },
          fast_method: { ar: `أضف ${a} ثم اقسم على 2: س > ${(b + a) / 2}`, en: `Add ${a}, then divide by 2: x > ${(b + a) / 2}` },
          why_important: why };
      }
      if (/متباين|>|</.test(t)) {
        return { subtype: "ineq", strategy_tag: "ineq-flip-on-negative",
          idea: { ar: `حل متباينة جبرية`, en: `Solve an algebraic inequality` },
          fast_method: { ar: `اعزل المتغير، وانتبه: عند الضرب أو القسمة على عدد سالب يُعكس اتجاه المتباينة`, en: `Isolate the variable — and remember: multiplying or dividing by a negative number flips the inequality direction` },
          why_important: why };
      }
      if (/بسّط|تبسيط|simplify/i.test(t)) {
        return { subtype: "simplify", strategy_tag: "factor-and-cancel",
          idea: { ar: `تبسيط عبارة جبرية`, en: `Simplify an algebraic expression` },
          fast_method: { ar: `حلّل البسط والمقام إلى عوامل، ثم اختصر العوامل المشتركة`, en: `Factor the numerator and denominator, then cancel common factors` },
          why_important: why };
      }
      if ((m = t.match(/\(س\s*\+\s*(\d+)\)\(س\s*-\s*(\d+)\)\s*=\s*0/)) || (m = t.match(/\(x\s*\+\s*(\d+)\)\(x\s*-\s*(\d+)\)\s*=\s*0/i))) {
        const a = num(m[1]), b = num(m[2]);
        return { subtype: "factored-zero", strategy_tag: "zero-product",
          idea: { ar: `معادلة مُحلَّلة: (س + ${a})(س − ${b}) = 0`, en: `Factored equation: (x + ${a})(x − ${b}) = 0` },
          fast_method: { ar: `إذا كان حاصل الضرب صفراً فأحد العاملين صفر: س = −${a} أو س = ${b}`, en: `If the product is zero then one factor is zero: x = −${a} or x = ${b}` },
          why_important: why };
      }
      if (/لو\u200c?₂|لو₂|لو\(|\blog\b/i.test(t)) {
        return { subtype: "log", strategy_tag: "rewrite-as-power",
          idea: { ar: `إيجاد قيمة لوغاريتم`, en: `Evaluate a logarithm` },
          fast_method: { ar: `أعد كتابة العدد كقوة لأساس اللوغاريتم، ثم الإجابة هي الأس`, en: `Rewrite the number as a power of the logarithm's base — the answer is the exponent` },
          why_important: why };
      }
      if ((m = t.match(/س³\s*=\s*(\d+)/)) || (m = t.match(/x³\s*=\s*(\d+)/i)) || (m = t.match(/x\^3\s*=\s*(\d+)/i))) {
        const b = num(m[1]);
        return { subtype: "cube-eq", strategy_tag: "cube-root",
          idea: { ar: `معادلة تكعيبية: س³ = ${b}`, en: `Cubic equation: x³ = ${b}` },
          fast_method: { ar: `خذ الجذر التكعيبي: س = ∛${b} = ${Math.round(Math.cbrt(b))}`, en: `Take the cube root: x = ∛${b} = ${Math.round(Math.cbrt(b))}` },
          why_important: why };
      }
      break;
    }

    case "geometry": {
      if ((m = t.match(/مربع طول ضلعه (\d+)/)) || (m = t.match(/square (?:with|of) side (\d+)/i))) {
        const s = num(m[1]);
        if (/محيط|perimeter/i.test(t)) return { subtype: "square-perim", strategy_tag: "perim-square",
          idea: { ar: `محيط مربع ضلعه ${s} سم`, en: `Perimeter of a square with side ${s} cm` },
          fast_method: { ar: `محيط المربع = 4 × الضلع = 4 × ${s} = ${4 * s} سم`, en: `Perimeter of a square = 4 × side = 4 × ${s} = ${4 * s} cm` },
          why_important: why };
        return { subtype: "square-area", strategy_tag: "area-square",
          idea: { ar: `مساحة مربع ضلعه ${s} سم`, en: `Area of a square with side ${s} cm` },
          fast_method: { ar: `مساحة المربع = الضلع² = ${s} × ${s} = ${s * s} سم²`, en: `Area of a square = side² = ${s} × ${s} = ${s * s} cm²` },
          why_important: why };
      }
      if ((m = t.match(/المستطيل الذي طوله (\d+) .*?وعرضه (\d+)/)) || (m = t.match(/rectangle .*?length (\d+).*?width (\d+)/i))) {
        const L = num(m[1]), W = num(m[2]);
        return { subtype: "rect-area", strategy_tag: "area-rect",
          idea: { ar: `مساحة مستطيل (${L}×${W})`, en: `Area of a rectangle (${L}×${W})` },
          fast_method: { ar: `مساحة المستطيل = الطول × العرض = ${L} × ${W} = ${L * W} سم²`, en: `Area of a rectangle = length × width = ${L} × ${W} = ${L * W} cm²` },
          why_important: why };
      }
      if ((m = t.match(/مثلث قاعدته (\d+) .*?وارتفاعه (\d+)/)) || (m = t.match(/triangle .*?base (\d+).*?height (\d+)/i))) {
        const b = num(m[1]), h = num(m[2]);
        return { subtype: "tri-area", strategy_tag: "area-triangle",
          idea: { ar: `مساحة مثلث (قاعدة ${b}، ارتفاع ${h})`, en: `Area of a triangle (base ${b}, height ${h})` },
          fast_method: { ar: `مساحة المثلث = ½ × ${b} × ${h} = ${(b * h) / 2}`, en: `Area of a triangle = ½ × ${b} × ${h} = ${(b * h) / 2}` },
          why_important: why };
      }
      if ((m = t.match(/دائرة نصف قطرها (\d+)/)) || (m = t.match(/circle .*?radius (\d+)/i))) {
        const r = num(m[1]);
        if (/مساحة|area/i.test(t)) return { subtype: "circle-area", strategy_tag: "area-circle",
          idea: { ar: `مساحة دائرة نصف قطرها ${r}`, en: `Area of a circle with radius ${r}` },
          fast_method: { ar: `المساحة = π × ${r}² = π × ${r * r}`, en: `Area = π × ${r}² = π × ${r * r}` },
          why_important: why };
        return { subtype: "circle-circ", strategy_tag: "perim-circle",
          idea: { ar: `محيط دائرة نصف قطرها ${r}`, en: `Circumference of a circle with radius ${r}` },
          fast_method: { ar: `المحيط = 2 × π × ${r} = ${2 * r}π`, en: `Circumference = 2 × π × ${r} = ${2 * r}π` },
          why_important: why };
      }
      if (/فيثاغورس|الوتر|قائم|pythagor|hypoten|right.angled/i.test(t)) {
        return { subtype: "pythag", strategy_tag: "pythagoras",
          idea: { ar: `تطبيق نظرية فيثاغورس`, en: `Apply the Pythagorean theorem` },
          fast_method: { ar: `الوتر² = ضلع₁² + ضلع₂²، ثم خذ الجذر التربيعي للناتج`, en: `Hypotenuse² = leg₁² + leg₂², then take the square root` },
          why_important: why };
      }
      if ((m = t.match(/مكعب طول ضلعه (\d+)/) ?? t.match(/مكعب الذي طول ضلعه (\d+)/) ?? t.match(/cube .*?side (\d+)/i))) {
        const s = num(m[1]);
        return { subtype: "cube-vol", strategy_tag: "volume-cube",
          idea: { ar: `حجم مكعب ضلعه ${s}`, en: `Volume of a cube with side ${s}` },
          fast_method: { ar: `حجم المكعب = الضلع³ = ${s}³ = ${s * s * s} سم³`, en: `Volume of a cube = side³ = ${s}³ = ${s * s * s} cm³` },
          why_important: why };
      }
      if (/زاوي|زوايا|\bangles?\b/i.test(t)) {
        return { subtype: "angles", strategy_tag: "angle-sum",
          idea: { ar: `حساب قياس زاوية`, en: `Compute an angle measure` },
          fast_method: { ar: `استخدم: مجموع زوايا المثلث 180°، الرباعي 360°، الخط المستقيم 180°`, en: `Use: triangle angles sum to 180°, quadrilateral 360°, straight line 180°` },
          why_important: why };
      }
      if (/شبه المنحرف|trapezoid|trapezium/i.test(t)) {
        return { subtype: "trapezoid-area", strategy_tag: "area-trapezoid",
          idea: { ar: `مساحة شبه منحرف`, en: `Area of a trapezoid` },
          fast_method: { ar: `المساحة = ½ × (مجموع القاعدتين) × الارتفاع`, en: `Area = ½ × (sum of the two parallel bases) × height` },
          why_important: why };
      }
      break;
    }

    case "ratios": {
      if ((m = t.match(/(\d+)%\s*من\s*(\d+)/)) || (m = t.match(/(\d+)%\s*of\s*(\d+)/i))) {
        const p = num(m[1]), n = num(m[2]); const r = (p / 100) * n;
        return { subtype: "percent-of", strategy_tag: "percent-multiply",
          idea: { ar: `حساب ${p}% من ${n}`, en: `Compute ${p}% of ${n}` },
          fast_method: { ar: `اضرب ${n} في ${p}/100: ${n} × ${p / 100} = ${r}`, en: `Multiply ${n} by ${p}/100: ${n} × ${p / 100} = ${r}` },
          why_important: why };
      }
      if ((m = t.match(/خصم (\d+)%/)) || (m = t.match(/(\d+)%\s*discount/i))) {
        const p = num(m[1]);
        return { subtype: "percent-discount", strategy_tag: "percent-discount",
          idea: { ar: `سعر بعد خصم ${p}%`, en: `Price after a ${p}% discount` },
          fast_method: { ar: `السعر بعد الخصم = السعر × (100 − ${p})/100 = السعر × ${(100 - p) / 100}`, en: `Discounted price = price × (100 − ${p})/100 = price × ${(100 - p) / 100}` },
          why_important: why };
      }
      if ((m = t.match(/زاد.*?(\d+)%/)) || (m = t.match(/increas\w*\s*(?:by\s*)?(\d+)%/i))) {
        const p = num(m[1]);
        return { subtype: "percent-increase", strategy_tag: "percent-increase",
          idea: { ar: `حساب نسبة زيادة بمقدار ${p}%`, en: `Compute a ${p}% increase` },
          fast_method: { ar: `القيمة الجديدة = القيمة × (1 + ${p}/100) = القيمة × ${1 + p / 100}`, en: `New value = original × (1 + ${p}/100) = original × ${1 + p / 100}` },
          why_important: why };
      }
      if ((m = t.match(/نسبة\s+(?:الأولاد|أ).*?(\d+)\s*:\s*(\d+).*?(\d+)/))) {
        const a = m[1], b = m[2], v = m[3];
        return { subtype: "ratio-apply", strategy_tag: "cross-multiply",
          idea: { ar: `تطبيق نسبة ${a}:${b} على القيمة ${v}`, en: `Apply ratio ${a}:${b} to the value ${v}` },
          fast_method: { ar: `الضرب التبادلي: ${a}/${b} = ${v}/المجهول → المجهول = (${b} × ${v}) ÷ ${a}`, en: `Cross-multiply: ${a}/${b} = ${v}/unknown → unknown = (${b} × ${v}) ÷ ${a}` },
          why_important: why };
      }
      if ((m = t.match(/(\d+)\s*كم\s*في\s*(\d+)\s*ساعات/)) || (m = t.match(/(\d+)\s*km\s*in\s*(\d+)\s*hours?/i))) {
        const d = num(m[1]), h = num(m[2]);
        return { subtype: "speed", strategy_tag: "speed-formula",
          idea: { ar: `سرعة: ${d} كم في ${h} ساعات`, en: `Speed: ${d} km in ${h} hours` },
          fast_method: { ar: `السرعة = المسافة ÷ الزمن = ${d} ÷ ${h} = ${d / h} كم/س`, en: `Speed = distance ÷ time = ${d} ÷ ${h} = ${d / h} km/h` },
          why_important: why };
      }
      if ((m = t.match(/(\d+)\s*عمال.*?(\d+)\s*أيام/)) || (m = t.match(/(\d+)\s*workers?.*?(\d+)\s*days?/i))) {
        const w = num(m[1]), d = num(m[2]);
        return { subtype: "work-inverse", strategy_tag: "work-inverse",
          idea: { ar: `علاقة عكسية بين العمال والأيام (${w} عمال، ${d} أيام)`, en: `Inverse relation between workers and days (${w} workers, ${d} days)` },
          fast_method: { ar: `عدد العمال × عدد الأيام = ثابت = ${w * d}`, en: `Workers × days = constant = ${w * d}` },
          why_important: why };
      }
      break;
    }

    case "statistics": {
      if (/المتوسط الحسابي|arithmetic mean|\bmean\b/i.test(t)) {
        const list = t.match(/:\s*([\d،,\s.]+)\s*هو/) ?? t.match(/:\s*([\d,\s.]+)\s*is/i);
        const numsStr = list ? list[1].replace(/،/g, ",") : "";
        return { subtype: "mean", strategy_tag: "mean-formula",
          idea: numsStr
            ? { ar: `المتوسط الحسابي للأعداد ${numsStr.trim()}`, en: `Arithmetic mean of ${numsStr.trim()}` }
            : { ar: `حساب المتوسط الحسابي`, en: `Compute the arithmetic mean` },
          fast_method: { ar: `اجمع كل القيم ثم اقسم على عددها`, en: `Sum all values, then divide by their count` },
          why_important: why };
      }
      if (/الوسيط|\bmedian\b/i.test(t)) {
        return { subtype: "median", strategy_tag: "sort-then-middle",
          idea: { ar: `إيجاد الوسيط`, en: `Find the median` },
          fast_method: { ar: `رتّب الأعداد تصاعدياً ثم خذ القيمة في المنتصف (أو متوسط القيمتين الوسطيتين)`, en: `Sort the numbers ascending, then take the middle value (or the average of the two middle values)` },
          why_important: why };
      }
      if (/المنوال|\bmode\b/i.test(t)) {
        return { subtype: "mode", strategy_tag: "most-frequent",
          idea: { ar: `إيجاد المنوال`, en: `Find the mode` },
          fast_method: { ar: `ابحث عن العدد الأكثر تكراراً في القائمة`, en: `Find the most frequently occurring number in the list` },
          why_important: why };
      }
      if (/المدى|\brange\b/i.test(t)) {
        return { subtype: "range", strategy_tag: "max-minus-min",
          idea: { ar: `إيجاد المدى`, en: `Find the range` },
          fast_method: { ar: `المدى = أكبر قيمة − أصغر قيمة`, en: `Range = largest value − smallest value` },
          why_important: why };
      }
      if (/التباين|variance|standard deviation/i.test(t)) {
        return { subtype: "stddev", strategy_tag: "sqrt-of-variance",
          idea: { ar: `حساب الانحراف المعياري من التباين`, en: `Compute the standard deviation from the variance` },
          fast_method: { ar: `الانحراف المعياري = √التباين`, en: `Standard deviation = √variance` },
          why_important: why };
      }
      if (/احتمال|probability/i.test(t)) {
        return { subtype: "probability", strategy_tag: "favorable-over-total",
          idea: { ar: `حساب احتمال حدث`, en: `Compute the probability of an event` },
          fast_method: { ar: `الاحتمال = عدد النواتج المرغوبة ÷ كل النواتج الممكنة`, en: `Probability = favorable outcomes ÷ total possible outcomes` },
          why_important: why };
      }
      if (/كم طريقة لترتيب|كم طريقة لاختيار|how many ways to (?:arrange|choose)/i.test(t)) {
        return { subtype: "permutation", strategy_tag: "factorial-or-combinations",
          idea: { ar: `عدّ الترتيبات أو التوافيق`, en: `Count permutations or combinations` },
          fast_method: { ar: `للترتيب: ن!. للاختيار بدون ترتيب: ن! ÷ (ر! × (ن−ر)!)`, en: `For ordered arrangements: n!. For unordered selection: n! ÷ (r! × (n−r)!)` },
          why_important: why };
      }
      break;
    }

    case "analogy": {
      if ((m = t.match(/^(.+?)\s*:\s*(.+?)\s*::\s*(.+?)\s*:\s*[؟?]/))) {
        const a = m[1].trim(), b = m[2].trim(), c = m[3].trim();
        return { subtype: "analogy-pair", strategy_tag: "name-the-relation",
          idea: { ar: `العلاقة بين "${a}" و "${b}" مطبّقة على "${c}"`, en: `The relation between "${a}" and "${b}" applied to "${c}"` },
          fast_method: { ar: `صُغ العلاقة بين "${a}" و "${b}" بجملة، ثم طبّقها على "${c}" للحصول على الإجابة`, en: `State the relation between "${a}" and "${b}" in a sentence, then apply it to "${c}" to find the answer` },
          why_important: why };
      }
      break;
    }

    case "vocabulary": {
      const wm = t.match(/\(([^)]+)\)/);
      if (wm && /عكس|opposite|antonym/i.test(t)) return { subtype: "antonym", strategy_tag: "antonym-lookup",
        idea: { ar: `عكس كلمة "${wm[1]}"`, en: `Opposite of "${wm[1]}"` },
        fast_method: { ar: `فكّر في الجذر اللغوي لـ "${wm[1]}" وابحث عن الكلمة التي تعني نقيضها`, en: `Think about the root of "${wm[1]}" and find a word that means the opposite` },
        why_important: why };
      if (wm && /مرادف|بمعنى|synonym|same meaning/i.test(t)) return { subtype: "synonym", strategy_tag: "synonym-lookup",
        idea: { ar: `مرادف كلمة "${wm[1]}"`, en: `Synonym of "${wm[1]}"` },
        fast_method: { ar: `ابحث عن الكلمة الأقرب لـ "${wm[1]}" في المعنى لا في اللفظ`, en: `Look for the word closest to "${wm[1]}" in meaning, not in spelling` },
        why_important: why };
      if (/المختلفة|الشاذة|odd one out|does not belong/i.test(t)) {
        return { subtype: "odd-one-out", strategy_tag: "shared-category",
          idea: { ar: `تحديد الكلمة الشاذة عن المجموعة`, en: `Identify the word that doesn't belong to the group` },
          fast_method: { ar: `جد الفئة المشتركة بين الكلمات الأخرى — الشاذة هي التي خرجت عن الفئة`, en: `Find the category shared by the other words — the odd one is the one outside that category` },
          why_important: why };
      }
      break;
    }

    case "completion": {
      const before = t.split(/_+/)[0]?.trim();
      if (before) return { subtype: "fill-blank", strategy_tag: "context-fit",
        idea: { ar: `إكمال الجملة: "${before.length > 30 ? before.slice(0, 30) + "…" : before}"`, en: `Complete the sentence: "${before.length > 30 ? before.slice(0, 30) + "…" : before}"` },
        fast_method: { ar: `اقرأ الجملة كاملة، ثم جرّب كل خيار شفهياً واختر الأكثر طبيعية ومنطقية`, en: `Read the whole sentence, then try each option silently and choose the most natural and logical one` },
        why_important: why };
      break;
    }
  }

  // Structured fallback (kept from branchMeta) — never break the flow
  return { idea: fallback?.idea, fast_method: fallback?.fast_method, why_important: fallback?.why };
}

// Infer the branch of a question from its text + topic
function inferBranch(q: TrainingQuestion): string | null {
  const t = q.question;
  switch (q.topic) {
    case "algebra":
      if (/متباين|>|</.test(t)) return "comparison";
      if (/بسّط|تبسيط|بسط:/.test(t)) return "simplify";
      if (/نمط|متتالي/.test(t)) return "patterns";
      if (/فإن\s*س²|فما قيمة\s*2س|فما قيمة\s*س²/.test(t)) return "substitution";
      return "equations";
    case "geometry":
      if (/تشابه|متساوي الأضلاع|تماثل/.test(t)) return "symmetry";
      if (/زاوي|مجموع.*زوايا/.test(t)) return "angles";
      if (/دائرة|نصف قطر|قطر|محيط دائرة/.test(t)) return "circles";
      if (/مثلث|الوتر|فيثاغورس/.test(t)) return "triangles";
      return "areas";
    case "ratios":
      if (/سرعة|كم\/س|يقطع|ساعات|أيام|عمال/.test(t)) return "rates";
      if (/%|نسبة مئوية|خصم|زاد.*نسبة|نقص.*نسبة/.test(t)) return "percent";
      if (/نسبة.*:|أ:ب|ب:ج/.test(t)) return "direct";
      return "word";
    case "statistics":
      if (/احتمال/.test(t)) return "probability";
      if (/جدول/.test(t)) return "tables";
      if (/مخطط/.test(t)) return "charts";
      return "average";
    case "analogy":
      return "relations";
    case "completion":
      return "missing-word";
    case "comprehension":
      // Honor an explicit subtype first (the new rc-s* questions tag this);
      // otherwise infer from the wording — inference questions ask the reader
      // to deduce/conclude rather than summarize.
      if (q.subtype === "inference" || q.subtype === "main-idea") return q.subtype;
      if (/استنتج|نستنتج|يمكن أن نستنتج|يدعمه النص|يدل على/.test(t)) return "inference";
      return "main-idea";
    case "contextual":
      return "semantic";
    case "vocabulary":
      if (/عكس|ضد/.test(t)) return "antonyms";
      if (/مرادف|بمعنى/.test(t)) return "synonyms";
      return "meanings";
    default:
      return null;
  }
}

// Classify the *surface form* of a question (independent of strategy).
// Used to alternate phrasings so two consecutive items don't feel identical
// even when their subtype/strategy must repeat.
function deriveWordingStyle(q: TrainingQuestion): string {
  const t = q.question;
  if (/اقرأ|النص التالي|الفقرة التالية|بناءً على/.test(t)) return "passage";
  if (/سيارة|قطار|عامل|عمال|راتب|موظف|سعر|قميص|حذاء|سلعة|كرة|كيس|صف|ترتيب|خصم|زاد|نقص/.test(t)) return "story";
  if (/^اختر|^أكمل|^حدد|^صل|^صنف/.test(t)) return "instruction";
  if (/إذا كان|إذا كانت|فما|فأوجد|بسّط|أوجد قيمة/.test(t)) return "direct";
  return "direct";
}

// Enrich a question with branch / subtype / strategy_tag / is_common /
// per-question idea / fast_method / why_important (derived from question text)
// --- Lightweight, client-side derivation for hint / common-mistake / reinforcement ---
// These are intentionally short prompts/tips keyed by branch (then topic as fallback).
// Hints MUST nudge the student's thinking without revealing the answer.
const branchHints: Record<string, Bilingual> = {
  equations: { ar: "ابدأ بعزل المتغير في طرف واحد — لا تحسب شيئاً قبل ذلك.", en: "Start by isolating the variable on one side — don't compute anything before that." },
  simplify: { ar: "وحّد الحدود المتشابهة، ثم اختصر العوامل المشتركة.", en: "Combine like terms, then cancel common factors." },
  patterns: { ar: "احسب الفرق (أو النسبة) بين كل حدّين متتاليين أولاً.", en: "Compute the difference (or ratio) between consecutive terms first." },
  substitution: { ar: "جرّب التعويض برقم بسيط بدلاً من الحل الجبري الكامل.", en: "Try substituting a small number instead of solving algebraically." },
  comparison: { ar: "وحّد الوحدات أو المقامات قبل أن تقارن.", en: "Unify the units or denominators before you compare." },
  triangles: { ar: "تذكّر مجموع الزوايا 180° وفيثاغورس قبل أي حساب.", en: "Remember angles sum to 180° and Pythagoras before any calculation." },
  circles: { ar: "اكتب صيغة المحيط 2πر أو المساحة πر² قبل التعويض.", en: "Write the formula (circumference 2πr or area πr²) before substituting." },
  areas: { ar: "اكتب صيغة المساحة المناسبة للشكل أولاً.", en: "Write the area formula for the shape first." },
  angles: { ar: "ابحث عن زوايا متجاورة أو متبادلة أو متقابلة.", en: "Look for adjacent, alternate, or vertically opposite angles." },
  symmetry: { ar: "قارن نسب الأضلاع المتقابلة لتحديد التشابه.", en: "Compare the ratios of corresponding sides to determine similarity." },
  percent: { ar: "حوّل النسبة المئوية إلى كسر بسيط قبل الضرب.", en: "Convert the percent to a simple fraction before multiplying." },
  direct: { ar: "للتناسب الطردي: اضرب تبادلياً مباشرة.", en: "For direct proportion: cross-multiply directly." },
  rates: { ar: "تذكّر: المسافة = السرعة × الزمن.", en: "Remember: distance = speed × time." },
  word: { ar: "استخرج المعطيات أولاً ثم ترجمها إلى معادلة.", en: "Extract the given data first, then translate it into an equation." },
  average: { ar: "للوسيط: رتّب الأرقام تصاعدياً قبل أي شيء.", en: "For the median: sort the numbers ascending first." },
  probability: { ar: "الاحتمال = الحالات المرغوبة ÷ كل الحالات الممكنة.", en: "Probability = favorable outcomes ÷ total possible outcomes." },
  tables: { ar: "اقرأ عناوين الصفوف والأعمدة قبل البحث عن القيمة.", en: "Read the row and column headers before looking up the value." },
  charts: { ar: "اقرأ عنوان المخطط ووحدات المحاور أولاً.", en: "Read the chart title and the axis units first." },
  "relation-function": { ar: "اسأل: الكلمة الأولى تُستخدم لـ ماذا؟", en: "Ask: what is the first word used for?" },
  "relation-part-whole": { ar: "اسأل: هل الأولى جزء من الثانية أم العكس؟", en: "Ask: is the first a part of the second, or the other way around?" },
  "relation-antonym": { ar: "ابحث عن المعنى المعاكس تماماً.", en: "Look for the exactly opposite meaning." },
  "relation-synonym": { ar: "ابحث عن أقرب كلمة في المعنى.", en: "Look for the word closest in meaning." },
  "missing-word": { ar: "اقرأ الجملة كاملة وحدد السياق العام قبل الاختيار.", en: "Read the whole sentence and identify the overall context before choosing." },
  proverb: { ar: "تذكّر المثل الشهير ثم أكمل الكلمة الناقصة.", en: "Recall the well-known proverb, then fill in the missing word." },
  sentence: { ar: "ابحث عن الكلمة التي تتسق مع نبرة الجملة بأكملها.", en: "Look for the word that matches the tone of the whole sentence." },
  "main-idea": { ar: "ابحث عن الفكرة التي تتكرر في النص أو يلخّصها العنوان.", en: "Look for the idea that recurs in the text or that the title summarizes." },
  inference: { ar: "استبعد الخيارات الصريحة في النص — المطلوب ما يُستنتج.", en: "Eliminate options stated explicitly in the text — the question asks what can be inferred." },
  semantic: { ar: "جرّب وضع كل خيار في الجملة واسأل: أيّها يبقى منطقياً؟", en: "Try placing each option into the sentence and ask: which one still makes sense?" },
  antonyms: { ar: "فكّر في المعنى المعاكس تماماً، ليس مجرد مختلف.", en: "Think of the exactly opposite meaning, not merely a different one." },
  synonyms: { ar: "ابحث عن الكلمة الأقرب للمعنى نفسه.", en: "Look for the word closest to the same meaning." },
};
const topicHintFallback: Record<string, Bilingual> = {
  algebra: { ar: "اكتب المعادلة بوضوح ثم اعزل المتغير خطوة خطوة.", en: "Write the equation clearly, then isolate the variable step by step." },
  geometry: { ar: "ارسم الشكل بسرعة على الورق ثم طبّق الصيغة.", en: "Sketch the figure quickly on paper, then apply the formula." },
  ratios: { ar: "استخرج المعطيات وحوّل النسبة إلى كسر قبل الضرب.", en: "Extract the given data and convert the ratio to a fraction before multiplying." },
  statistics: { ar: "حدّد نوع المقياس المطلوب (متوسط/وسيط/منوال) أولاً.", en: "Identify which measure is asked for (mean / median / mode) first." },
  analogy: { ar: "حدّد العلاقة بين الكلمتين الأوليين بدقة قبل البحث.", en: "Pin down the relation between the first two words precisely before searching." },
  completion: { ar: "اقرأ الجملة كاملة وحدّد الكلمة المفقودة سياقياً.", en: "Read the whole sentence and determine the missing word from context." },
  comprehension: { ar: "ارجع للنص وابحث عن الجملة المرتبطة بالسؤال.", en: "Return to the text and find the sentence related to the question." },
  contextual: { ar: "جرّب كل خيار في الجملة واختر الأنسب معنىً.", en: "Try each option in the sentence and pick the one that best fits in meaning." },
  vocabulary: { ar: "فكّر في معنى الكلمة الأصلي قبل النظر للخيارات.", en: "Think about the word's original meaning before looking at the options." },
};

const branchMistakes: Record<string, Bilingual> = {
  equations: { ar: "كثيرون ينسون عكس الإشارة عند نقل الحد للطرف الآخر.", en: "Many forget to flip the sign when moving a term to the other side." },
  simplify: { ar: "خطأ شائع: اختصار حدود غير متشابهة.", en: "Common mistake: combining unlike terms." },
  patterns: { ar: "لا تكتفِ بحدّين — تحقّق من ثلاثة على الأقل قبل الجزم بالنمط.", en: "Don't stop at two terms — verify with at least three before deciding the pattern." },
  substitution: { ar: "احذر تعويض رقم يُسقط حالات (مثل 0 أو 1).", en: "Be careful substituting a number that drops cases (such as 0 or 1)." },
  comparison: { ar: "خطأ شائع: المقارنة قبل توحيد الوحدات أو المقامات.", en: "Common mistake: comparing before unifying units or denominators." },
  triangles: { ar: "لا تطبّق فيثاغورس إلا إذا كان المثلث قائم الزاوية.", en: "Apply Pythagoras only when the triangle is right-angled." },
  circles: { ar: "احذر الخلط بين نصف القطر والقطر في الصيغ.", en: "Watch out for mixing up the radius and the diameter in formulas." },
  areas: { ar: "تأكّد من صيغة الشكل — مساحة المثلث ½ القاعدة × الارتفاع لا حاصل ضربهما فقط.", en: "Verify the shape's formula — triangle area is ½ × base × height, not just base × height." },
  angles: { ar: "خطأ شائع: افتراض أن الزوايا المتجاورة متساوية.", en: "Common mistake: assuming adjacent angles are equal." },
  symmetry: { ar: "التشابه يتطلّب تساوي النسب لا تساوي الأضلاع.", en: "Similarity requires equal ratios — not equal sides." },
  percent: { ar: "‎15% من 60 ≠ 60% من 15؟ بل متساويان — لكن احذر الخلط بين الزيادة والنسبة الجديدة.", en: "15% of 60 = 60% of 15 — but watch out for mixing percent increase with the new percent of the price." },
  direct: { ar: "خطأ شائع: استخدام التناسب العكسي مكان الطردي.", en: "Common mistake: using inverse proportion in place of direct proportion." },
  rates: { ar: "‎احذر خلط الوحدات (دقائق مع ساعات).", en: "Watch out for mixing units (minutes with hours)." },
  word: { ar: "خطأ شائع: الحل دون قراءة المطلوب فعلاً في نهاية السؤال.", en: "Common mistake: solving without reading what's actually asked at the end of the question." },
  average: { ar: "خطأ شائع: حساب الوسيط دون ترتيب الأرقام أولاً.", en: "Common mistake: computing the median without sorting the numbers first." },
  probability: { ar: "احذر عدّ الحالات المرغوبة بدل الحالات الكلية.", en: "Be careful: don't use favorable outcomes in place of total outcomes (or vice versa)." },
  tables: { ar: "تأكّد أنك تقرأ من الصف والعمود الصحيحين.", en: "Make sure you're reading from the right row and column." },
  charts: { ar: "احذر إهمال وحدة القياس على المحور.", en: "Watch out for ignoring the axis unit." },
  "relation-function": { ar: "خطأ شائع: اختيار كلمة مرتبطة بالمعنى لكنها ليست وظيفة.", en: "Common mistake: picking a related word that isn't actually a function/use." },
  "relation-part-whole": { ar: "احذر عكس اتجاه العلاقة (الجزء قبل الكل).", en: "Don't reverse the direction of the relation (part vs. whole)." },
  "relation-antonym": { ar: "كلمة مختلفة ≠ كلمة معاكسة — ابحث عن العكس التام.", en: "A different word ≠ an opposite word — look for the exact opposite." },
  "relation-synonym": { ar: "تشابه جزئي لا يكفي — اختر الأقرب معنىً.", en: "Partial similarity isn't enough — pick the closest in meaning." },
  "missing-word": { ar: "خطأ شائع: اختيار كلمة صحيحة لغوياً لكن تخالف السياق.", en: "Common mistake: picking a grammatically correct word that breaks the context." },
  proverb: { ar: "احذر تغيير صيغة المثل — التزم بنصّه الشائع.", en: "Don't alter the proverb's wording — stick to its well-known form." },
  sentence: { ar: "خطأ شائع: تجاهل أداة الربط في الجملة.", en: "Common mistake: ignoring the connector in the sentence." },
  "main-idea": { ar: "احذر اختيار تفصيل ثانوي بدلاً من الفكرة العامة.", en: "Don't pick a secondary detail instead of the main idea." },
  inference: { ar: "ما يُذكر صراحة ليس استنتاجاً — ابحث عمّا يُفهم ضمنياً.", en: "Anything stated explicitly isn't an inference — look for what is implied." },
  semantic: { ar: "خطأ شائع: الاعتماد على المعنى المعجمي وحده دون السياق.", en: "Common mistake: relying on the dictionary meaning alone without context." },
  antonyms: { ar: "احذر اختيار كلمة من نفس الحقل الدلالي بدل العكس.", en: "Don't pick a word from the same semantic field instead of its opposite." },
  synonyms: { ar: "كلمتان متقاربتان ≠ مترادفتان — اختر الأدق.", en: "Two close words ≠ synonyms — pick the most precise one." },
};
const topicMistakeFallback: Record<string, Bilingual> = {
  algebra: { ar: "قراءة سريعة للمعادلة تؤدي غالباً لخطأ في الإشارة.", en: "Reading the equation too fast usually leads to a sign error." },
  geometry: { ar: "نسيان وحدة القياس أو الخلط بين المساحة والمحيط.", en: "Forgetting the unit, or mixing up area and perimeter." },
  ratios: { ar: "خلط الزيادة المئوية بالنسبة الجديدة من السعر.", en: "Mixing the percent increase with the new percent of the price." },
  statistics: { ar: "قراءة الجدول/المخطط دون الانتباه للوحدات.", en: "Reading the table/chart without paying attention to units." },
  analogy: { ar: "تحديد العلاقة بين الكلمتين بشكل عام بدل الدقيق.", en: "Defining the relation between the two words too broadly instead of precisely." },
  completion: { ar: "اختيار كلمة صحيحة لغوياً لكنها تخالف سياق الجملة.", en: "Picking a grammatically correct word that breaks the sentence's context." },
  comprehension: { ar: "الإجابة من المعرفة العامة بدل ما ورد في النص فعلاً.", en: "Answering from general knowledge instead of what the text actually says." },
  contextual: { ar: "إهمال الكلمات المحيطة عند تحديد المعنى المقصود.", en: "Ignoring surrounding words when pinning down the intended meaning." },
  vocabulary: { ar: "الاعتماد على التشابه اللفظي بدل التحقق من المعنى.", en: "Relying on spelling similarity instead of verifying the meaning." },
};

const branchReinforcement: Record<string, Bilingual> = {
  equations: { ar: "ممتاز — استمر بعزل المتغير قبل الحساب في كل سؤال.", en: "Excellent — keep isolating the variable before computing on every question." },
  simplify: { ar: "أحسنت — التبسيط أولاً يوفّر عليك وقتاً ثميناً.", en: "Well done — simplifying first saves you precious time." },
  patterns: { ar: "ممتاز — تحديد نوع النمط مبكراً يفتح الحل.", en: "Excellent — identifying the pattern type early unlocks the solution." },
  substitution: { ar: "أحسنت — التعويض اختصار قوي في الاختبار.", en: "Well done — substitution is a powerful shortcut on the exam." },
  comparison: { ar: "ممتاز — توحيد الطرفين قبل المقارنة عادة محترفة.", en: "Excellent — unifying both sides before comparing is a pro habit." },
  triangles: { ar: "أحسنت — استخدام خصائص المثلث الصحيحة من المرة الأولى.", en: "Well done — applying the right triangle properties on the first try." },
  circles: { ar: "ممتاز — حفظ صيغ الدائرة يوفّر ثوانٍ في كل سؤال.", en: "Excellent — memorizing the circle formulas saves seconds on every question." },
  areas: { ar: "أحسنت — كتابة الصيغة قبل الحساب يقلّل الأخطاء.", en: "Well done — writing the formula before computing reduces mistakes." },
  angles: { ar: "ممتاز — استخدامك خصائص الزوايا في محله.", en: "Excellent — your use of angle properties is spot on." },
  symmetry: { ar: "أحسنت — مقارنة النسب طريق التشابه الأسرع.", en: "Well done — comparing ratios is the fastest route to similarity." },
  percent: { ar: "ممتاز — تحويل النسبة لكسر يجعل الحساب فورياً.", en: "Excellent — converting the percent to a fraction makes the math instant." },
  direct: { ar: "أحسنت — الضرب التبادلي وفّر عليك خطوات كثيرة.", en: "Well done — cross-multiplying saved you many steps." },
  rates: { ar: "ممتاز — قانون السرعة × الزمن في يدك الآن.", en: "Excellent — the speed × time formula is at your fingertips now." },
  word: { ar: "أحسنت — استخراج المعطيات أولاً نصف الحل.", en: "Well done — extracting the given data first is half the solution." },
  average: { ar: "ممتاز — ترتيب الأرقام قبل الوسيط عادة قوية.", en: "Excellent — sorting before taking the median is a strong habit." },
  probability: { ar: "أحسنت — صيغة الاحتمال واضحة عندك.", en: "Well done — the probability formula is clear to you." },
  tables: { ar: "ممتاز — قراءة العناوين أولاً منهج محترف.", en: "Excellent — reading the headers first is a pro approach." },
  charts: { ar: "أحسنت — انتباهك للوحدات يصنع الفرق.", en: "Well done — your attention to units makes the difference." },
  "relation-function": { ar: "ممتاز — تمييز علاقة الوظيفة من المرة الأولى.", en: "Excellent — spotting the function relation on the first try." },
  "relation-part-whole": { ar: "أحسنت — تحديد اتجاه العلاقة دقيق.", en: "Well done — your direction of the relation is precise." },
  "relation-antonym": { ar: "ممتاز — التقاط العكس التام مهارة قوية.", en: "Excellent — catching the exact opposite is a strong skill." },
  "relation-synonym": { ar: "أحسنت — اختيار الأقرب معنىً صحيح.", en: "Well done — picking the closest in meaning is correct." },
  "missing-word": { ar: "ممتاز — قراءة السياق قبل الاختيار آتت ثمارها.", en: "Excellent — reading the context before choosing paid off." },
  proverb: { ar: "أحسنت — الالتزام بنص المثل الشائع صحيح.", en: "Well done — sticking to the proverb's common form is correct." },
  sentence: { ar: "ممتاز — انتبهت لأدوات الربط في الجملة.", en: "Excellent — you paid attention to the connectors in the sentence." },
  "main-idea": { ar: "أحسنت — ميّزت الفكرة الرئيسية عن التفاصيل.", en: "Well done — you distinguished the main idea from the details." },
  inference: { ar: "ممتاز — الاستنتاج الضمني أصعب أنواع الفهم.", en: "Excellent — implicit inference is the hardest kind of comprehension." },
  semantic: { ar: "أحسنت — السياق هو المفتاح وقد التقطته.", en: "Well done — context is the key, and you caught it." },
  antonyms: { ar: "ممتاز — العكس التام ليس قريباً، وقد ميّزته.", en: "Excellent — the exact opposite isn't merely close, and you spotted it." },
  synonyms: { ar: "أحسنت — اختيار الأدق معنىً مهارة عالية.", en: "Well done — picking the most precise meaning is a high-level skill." },
};
const topicReinforcementFallback: Record<string, Bilingual> = {
  algebra: { ar: "ممتاز — تطبيق صحيح لقواعد الجبر الأساسية.", en: "Excellent — a correct application of the basic algebra rules." },
  geometry: { ar: "أحسنت — تطبيق سليم للصيغ الهندسية.", en: "Well done — a sound application of the geometric formulas." },
  ratios: { ar: "ممتاز — تعاملك مع النسب دقيق.", en: "Excellent — your handling of ratios is precise." },
  statistics: { ar: "أحسنت — قراءتك للبيانات صحيحة.", en: "Well done — your reading of the data is correct." },
  analogy: { ar: "ممتاز — تحديد العلاقة بين الكلمات دقيق.", en: "Excellent — your identification of the relation between the words is precise." },
  completion: { ar: "أحسنت — اختيارك يتسق مع سياق الجملة.", en: "Well done — your choice fits the sentence's context." },
  comprehension: { ar: "ممتاز — فهم سليم للنص.", en: "Excellent — a solid understanding of the text." },
  contextual: { ar: "أحسنت — استخدامك للسياق في محله.", en: "Well done — your use of context is spot on." },
  vocabulary: { ar: "ممتاز — معرفتك بالمفردات قوية.", en: "Excellent — your vocabulary knowledge is strong." },
};

const HINT_FINAL_FALLBACK: Bilingual = { ar: "اقرأ السؤال بتأنٍّ وحدّد المعطيات قبل التفكير في الحل.", en: "Read the question carefully and identify the given data before thinking about the solution." };
const MISTAKE_FINAL_FALLBACK: Bilingual = { ar: "خطأ شائع: التسرّع قبل قراءة جميع الخيارات.", en: "Common mistake: rushing before reading all the options." };
const REINFORCE_FINAL_FALLBACK: Bilingual = { ar: "أحسنت — استمر على هذا الأسلوب.", en: "Well done — keep up this approach." };

function deriveHint(q: TrainingQuestion): Bilingual {
  const key = q.strategy_tag || q.subtype || q.branch;
  return (key && branchHints[key]) || topicHintFallback[q.topic] || HINT_FINAL_FALLBACK;
}
function deriveCommonMistake(q: TrainingQuestion): Bilingual {
  const key = q.strategy_tag || q.subtype || q.branch;
  return (key && branchMistakes[key]) || topicMistakeFallback[q.topic] || MISTAKE_FINAL_FALLBACK;
}
function deriveReinforcement(q: TrainingQuestion): Bilingual {
  const key = q.strategy_tag || q.subtype || q.branch;
  return (key && branchReinforcement[key]) || topicReinforcementFallback[q.topic] || REINFORCE_FINAL_FALLBACK;
}

function enrichQuestion(q: TrainingQuestion): TrainingQuestion {
  const branch = q.branch ?? inferBranch(q) ?? undefined;
  const meta = branch ? branchMeta[q.topic]?.[branch] : undefined;
  const derived = deriveSmartInfo(q, meta);
  const enriched: TrainingQuestion = {
    ...q,
    branch,
    subtype: q.subtype ?? derived.subtype,
    strategy_tag: q.strategy_tag ?? derived.strategy_tag ?? branch,
    is_common: q.is_common ?? (q.difficulty !== "hard"),
    idea: q.idea ?? derived.idea ?? meta?.idea,
    fast_method: q.fast_method ?? derived.fast_method ?? meta?.fast_method,
    why_important: q.why_important ?? derived.why_important ?? meta?.why,
    wording_style: q.wording_style ?? deriveWordingStyle(q),
  };
  // Hint / common_mistake / reinforcement always populated so feedback is consistent.
  enriched.hint = q.hint ?? deriveHint(enriched);
  enriched.common_mistake = q.common_mistake ?? deriveCommonMistake(enriched);
  enriched.reinforcement = q.reinforcement ?? deriveReinforcement(enriched);
  return enriched;
}

// Storage key for recently-shown question IDs (anti-repetition across sessions)
const RECENT_KEY = "practice_recent_ids";
const RECENT_MAX = 30;

function loadRecentIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function saveRecentIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, RECENT_MAX)));
  } catch { /* ignore */ }
}

// Reorder so consecutive questions don't share the same strategy_tag / subtype
// (and prefer alternating wording_style as a tiebreaker). Falls back gracefully
// when the remaining pool can't satisfy a constraint, so the flow never breaks.
//
// IMPORTANT: `strategy_tag` is only populated for the Qudrat-AR in-file
// pool (set by `enrichQuestion` → `deriveSmartInfo`). Exam-bank questions
// (GAT-EN, Tahsili-AR, SAAT-EN) typically have it undefined, which would
// make a `q.strategy_tag !== last.strategy_tag` check trivially false
// (undefined !== undefined). The lower tiers below fall back to `subtype`
// (now populated for all banks via `inferSubtype` at load time) and then
// `topic`, so the no-consecutive-clustering guarantee holds for every
// section regardless of which signals the source pool happens to carry.
function diversifyOrder(arr: TrainingQuestion[]): TrainingQuestion[] {
  const out: TrainingQuestion[] = [];
  const remaining = [...arr];
  while (remaining.length > 0) {
    const last = out[out.length - 1];
    let pickIdx = 0;
    if (last) {
      // 1st choice: different strategy_tag AND subtype AND wording_style
      let altIdx = remaining.findIndex(
        q =>
          q.strategy_tag !== last.strategy_tag &&
          q.subtype !== last.subtype &&
          q.wording_style !== last.wording_style
      );
      // 2nd choice: different strategy_tag AND subtype (the original rule)
      if (altIdx < 0) {
        altIdx = remaining.findIndex(
          q => q.strategy_tag !== last.strategy_tag && q.subtype !== last.subtype
        );
      }
      // 3rd choice: at least a different subtype (works even when
      // strategy_tag is missing on both sides, e.g. for exam-bank pools).
      if (altIdx < 0) {
        altIdx = remaining.findIndex(q => q.subtype !== last.subtype);
      }
      // 4th choice: at least a different strategy_tag.
      if (altIdx < 0) {
        altIdx = remaining.findIndex(q => q.strategy_tag !== last.strategy_tag);
      }
      // 5th choice: at least a different topic — last-resort variety
      // signal that's always populated.
      if (altIdx < 0) {
        altIdx = remaining.findIndex(q => q.topic !== last.topic);
      }
      if (altIdx >= 0) pickIdx = altIdx;
    }
    out.push(remaining.splice(pickIdx, 1)[0]);
  }
  return out;
}

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
  const branch = searchParams.get("branch") || null;
  // `focus` selects either a Qudrat-AR in-file section or one of the
  // exam-bank sections (GAT-EN, Tahsili-AR, SAAT-EN). When set and
  // recognized, the focus branch in the loader below builds the pool
  // from the appropriate source. Unknown values are normalized to null
  // so the legacy topic-picker branch runs (no behavior change).
  const rawFocus = searchParams.get("focus");
  const focus = rawFocus && KNOWN_FOCUS_VALUES.has(rawFocus.toLowerCase())
    ? rawFocus.toLowerCase()
    : null;

  // ---------------------------------------------------------------------------
  // Exam-language localization
  // ---------------------------------------------------------------------------
  // The result/test UI strings (and option labels) follow the exam category,
  // not the app's default Arabic. Without this, GAT/SAAT (English exams) showed
  // Arabic results, Arabic option labels, and an RTL layout that visually
  // reversed the option order.
  //
  // Rule: `_ar` suffix OR no focus → Arabic/RTL (Qudrat-AR & Tahsili-AR).
  //       `_en` suffix → English/LTR (GAT-EN & SAAT-EN).
  // KNOWN_FOCUS_VALUES already validates the suffix, so the endsWith check
  // can't be fooled by an arbitrary URL value.
  const isArabicExam = focus === null || focus.endsWith("_ar");
  const examDir: "rtl" | "ltr" = isArabicExam ? "rtl" : "ltr";
  const examTextAlign = isArabicExam ? "text-right" : "text-left";
  // Tiny inline localizer — keeps the UI strings co-located with their
  // single use-site instead of pulling them into a separate i18n file
  // for what is effectively two-locale, dozen-string surface.
  const tx = (ar: string, en: string) => (isArabicExam ? ar : en);
  // Picks the right locale from a per-question analysis field. Accepts:
  //   - undefined           → returns "" (caller can fall back to a default)
  //   - plain string        → returned as-is (legacy / single-locale data)
  //   - { ar, en? }         → picks the matching locale; falls back to `ar`
  //                           when the requested locale (en) is missing.
  // Why fallback to ar: source data files may carry only Arabic, and we
  // never want a missing English translation to render as a blank panel.
  const pickLocale = (value: Localized | undefined): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return isArabicExam ? value.ar : (value.en ?? value.ar);
  };
  const optionLabels = isArabicExam ? OPTION_LABELS : OPTION_LABELS_EN;

  // ---------------------------------------------------------------------------
  // Back-to-Training destination
  // ---------------------------------------------------------------------------
  // Previously hard-coded to `/practice` (the Qudrat picker), so finishing
  // any non-Qudrat session dumped the user back into the wrong category.
  // Forwarding `?focus=<focus>` lands them on the same picker the dashboard
  // sent them to (the non-Qudrat picker pre-selects the matching subject
  // tab; the Qudrat picker pre-selects the matching section tab via
  // `focusToSection`). Auto-redirect on the practice page only fires for
  // Qudrat-AR + a `?topics=` deep-link, so this URL never re-launches a
  // session — it always lands on the picker.
  const backToTrainingHref = focus
    ? `/practice?focus=${encodeURIComponent(focus)}`
    : "/practice";

  // `topics` carries an optional comma-separated list of sub-topic slugs
  // sent from a result page that identified the user's weakest topics
  // within the focus section. Used purely as a prioritization hint —
  // matching-topic questions surface first, then the rest of the section.
  // Empty / missing / unknown slugs are filtered out gracefully so the
  // session never ends up with an empty pool.
  const rawTopics = searchParams.get("topics");
  const requestedTopics: TopicSlug[] = rawTopics
    ? rawTopics
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(isKnownTopicSlug)
    : [];
  // Stable string for the useEffect dep array — re-renders shouldn't
  // re-run the loader unless the actual list of slugs changes.
  const requestedTopicsKey = requestedTopics.join(",");

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  // Per-question seconds spent (parallel to `answers`). Local to this session
  // only — used by the deterministic test-pattern classifier.
  const [times, setTimes] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState(90);
  const [questions, setQuestions] = useState<TrainingQuestion[]>([]);
  // Per-question hint-usage flags (parallel to `answers` and `times`).
  // True at index `i` means the user revealed the hint while working on
  // question `i`. Used by the adaptive-difficulty engine as a "needs help"
  // signal — heavy hint usage pulls the next batch toward easier questions.
  // Local to this session only; never sent to the server.
  const [hints, setHints] = useState<boolean[]>([]);
  // Lightweight per-question state — cleared on every advance.
  const [showHint, setShowHint] = useState(false);
  // Pool of all enriched questions for the current topic — used by "تدرب على نفس النمط".
  const [topicPool, setTopicPool] = useState<TrainingQuestion[]>([]);

  // ----- Mid-session AI coaching (1 call per session, after Q5) -----
  // The snapshot is captured ONCE (frozen) the first time the student has
  // answered 5 questions. From then on the same `coachInput` reference is
  // passed to the card, so even if `answers`/`questions` change later there is
  // no re-render storm and definitely no second API call.
  const [coachInput, setCoachInput] = useState<AIAnalysisInput | null>(null);
  const coachTriggered = useRef(false);
  // Premium check (matches existing convention used by AIInsightsCard / dev flag).
  const [isPremium, setIsPremium] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsPremium(window.localStorage.getItem("user_is_premium") === "true");
  }, []);

  // Trigger threshold — one call per session, fires the moment we have ≥5
  // answered questions. We rebuild the snapshot from the in-flight session
  // (NOT from global TrainingContext) so the AI sees only what the student
  // just did. The threshold sits inside the spec window of 5–10.
  const COACH_TRIGGER_AT = 5;
  useEffect(() => {
    if (coachTriggered.current) return;
    if (!isPremium) return;
    if (questions.length === 0) return;

    const answeredPairs = answers
      .map((a, i) => ({ a, q: questions[i] }))
      .filter((p): p is { a: number; q: TrainingQuestion } => p.a != null && !!p.q);
    if (answeredPairs.length < COACH_TRIGGER_AT) return;

    // Build per-category aggregates from the answered slice only.
    type Agg = { name: string; section?: string; correct: number; total: number; time: number };
    const byCat = new Map<string, Agg>();
    for (const { a, q } of answeredPairs) {
      const key = q.category;
      const agg = byCat.get(key) || { name: key, section: q.section, correct: 0, total: 0, time: 0 };
      agg.total += 1;
      if (a === q.correct) agg.correct += 1;
      byCat.set(key, agg);
    }
    const categoryPerformance = Array.from(byCat.values()).map((c) => ({
      name: c.name,
      section: c.section,
      percentage: Math.round((c.correct / c.total) * 100),
      correct: c.correct,
      total: c.total,
    }));
    const correctTotal = answeredPairs.filter((p) => p.a === p.q.correct).length;
    const score = Math.round((correctTotal / answeredPairs.length) * 100);
    const level = score >= 80 ? "متقدم" : score >= 50 ? "متوسط" : "مبتدئ";
    const weakTopics = categoryPerformance.filter((c) => c.percentage < 50).map((c) => c.name);
    const strongTopics = categoryPerformance.filter((c) => c.percentage >= 80).map((c) => c.name);

    const snapshot: AIAnalysisInput = {
      score,
      level,
      weakTopics,
      strongTopics,
      slowTopics: [],
      commonMistakes: [],
      categoryPerformance,
    };
    coachTriggered.current = true;
    setCoachInput(snapshot);
  }, [answers, questions, isPremium]);

  useEffect(() => {
    // Shared helpers reused by both the exam-bank branch and the legacy
    // Qudrat-AR branch below. Defined once here so behavior stays
    // identical across both code paths.
    const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
    const recentIds = loadRecentIds();
    const recentSet = new Set(recentIds);
    const fresh = (q: TrainingQuestion) => !recentSet.has(q.id);
    const stale = (q: TrainingQuestion) => recentSet.has(q.id);

    // ===== Focus branch =====
    // Triggered for any of the 12 supported focus values (2 Qudrat-AR +
    // 4 GAT-EN/Tahsili-AR/SAAT-EN exam-bank groups = 10 = 12). Picks the
    // appropriate question source per focus, then runs an optional
    // topic-prioritization pass on top of the same fresh/stale + diversify
    // pipeline used everywhere else. The legacy topic-picker branch below
    // is left untouched (focus-less URLs hit it as before).
    if (focus) {
      let enrichedAll: TrainingQuestion[];

      if (FOCUS_TO_EXAM_BANK[focus]) {
        // (a) Exam-bank source: GAT-EN / Tahsili-AR / SAAT-EN.
        //     Questions come from src/data/questions/{gat-en,tahsili-ar,
        //     saat-en}.ts and carry an inferred sub-topic slug when the
        //     section has a layout in src/lib/topicMap.ts.
        enrichedAll = loadExamBankQuestions(focus).map(enrichQuestion);
      } else {
        // (b) Qudrat-AR source: pull EVERY in-file trainingQuestion that
        //     belongs to the section (multiple topics: algebra+geometry+
        //     ratios+statistics for quantitative, etc.). The legacy branch
        //     would have filtered to a single topic; here we keep the whole
        //     section so the topic-prioritization tier below has room to
        //     surface the user's specific weak topics first while still
        //     letting other-topic questions appear when the weak-topic pool
        //     runs out.
        const sectionTopicIds = QUDRAT_AR_SECTION_TOPICS[focus] ?? [];
        enrichedAll = trainingQuestions
          .filter((q) => sectionTopicIds.includes(q.topic))
          .map(enrichQuestion);
      }

      let filtered = enrichedAll;
      if (difficulty !== "all") {
        const byDiff = enrichedAll.filter((q) => q.difficulty === difficulty);
        // Defensive fallback: exam-bank questions are normalized to
        // "medium", so easy/hard filters can produce zero matches. Fall
        // back to the unfiltered pool rather than show an empty session.
        filtered = byDiff.length > 0 ? byDiff : enrichedAll;
      }

      // ---- Topic prioritization ----
      // Three sources produce the "preferred" topic slug list, applied
      // in order of trust / specificity:
      //   1. Explicit URL `?topics=` — the caller (typically a result page)
      //      already decided what to surface. Highest priority — short-
      //      circuits the rest.
      //   2. Cross-session reinforcement — when the timeline shows a
      //      topic declined in recent sessions OR is stuck weak without
      //      improvement, force it back into priority for this session.
      //      Bounded by `MAX_REINFORCEMENT_STREAK` so a topic that never
      //      improves is eventually dropped from the queue (no infinite
      //      repetition; normal selection then takes over).
      //   3. Diagnostic-driven fallback — when no URL topics were given,
      //      consult the persistent user profile. If the student's most
      //      recent diagnostic / full-exam result identified weak topics,
      //      use those to bias selection.
      // Sources 2 + 3 are merged (reinforcement first, diagnostic second,
      // dedup) and capped at TOP_N. Topics not present in the current
      // section's pool are filtered out so we never try to prioritize a
      // slug the section can't satisfy. When neither source produces
      // anything usable the original 2-tier fresh→stale order applies.
      // In ALL cases, if the prioritized pool can't fill `questionCount`,
      // the rest of the section's questions fill the remaining slots —
      // the session length is preserved (the strict fallback rule).
      let preferredTopics: string[] = requestedTopics;
      if (preferredTopics.length === 0) {
        try {
          // Load profile and reconcile any past full-exam attempts into
          // the per-topic timeline before reading reinforcement /
          // recommendations. This is the "previous exams" leg of the
          // data combine: it lets historical exam data influence today's
          // training even though exam history lives in a separate
          // storage key. The call is idempotent (only genuinely-new
          // (timestamp, topic) pairs grow the series), so doing it on
          // every page load is cheap.
          let profile = loadUserProfile();
          const reconciled = reconcileExamHistoryToProfile(profile, loadHistory());
          if (reconciled !== profile) {
            saveUserProfile(reconciled);
            profile = reconciled;
          }
          const sectionTopicSlugs = new Set(filtered.map((q) => q.topic));

          // (2) Cross-session reinforcement — declining or stuck-weak
          // topics. The helper internally enforces the
          // MAX_REINFORCEMENT_STREAK cap, so topics that have been
          // reinforced too many times without improvement are already
          // absent from this list. Filter to slugs the section can
          // actually satisfy (`reinforcement.topic` is already
          // normalized through the same `categoryNameToSlug` map
          // sessions use, so it should usually match directly).
          const reinforcement = getReinforcementTopics(profile);
          const reinforcedSlugs = reinforcement
            .map((c) => c.topic)
            .filter((slug) => sectionTopicSlugs.has(slug));

          // (3) Diagnostic-driven fallback — pre-existing logic.
          let diagnosticSlugs: string[] = [];
          const rec = getStudyRecommendations(profile);
          if (rec.source === "diagnostic" && rec.recommendedTopics.length > 0) {
            diagnosticSlugs = rec.recommendedTopics
              .map((t) => {
                if (sectionTopicSlugs.has(t)) return t;          // already a slug
                const slug = categoryNameToSlug(t);              // try Arabic/EN label
                return slug && sectionTopicSlugs.has(slug) ? slug : null;
              })
              .filter((s): s is string => s !== null);
          }

          // Merge: reinforcement wins ordering (these are the most
          // urgent, freshest signals), diagnostic fills any remaining
          // headroom up to TOP_N. `seen` dedupes so a topic that
          // appears in BOTH lists isn't duplicated in the priority
          // tier (which would skew tieredOrder weight).
          if (reinforcedSlugs.length > 0 || diagnosticSlugs.length > 0) {
            const merged: string[] = [];
            const seen = new Set<string>();
            for (const t of [...reinforcedSlugs, ...diagnosticSlugs]) {
              if (seen.has(t)) continue;
              seen.add(t);
              merged.push(t);
              if (merged.length >= 3) break; // mirror TOP_N cap from profile layer
            }
            if (merged.length > 0) preferredTopics = merged;
          }
        } catch {
          /* profile unavailable — fall through to default ordering */
        }
      }

      let selected: TrainingQuestion[];
      if (preferredTopics.length > 0) {
        const topicSet = new Set<string>(preferredTopics);
        const matching = filtered.filter((q) => topicSet.has(q.topic));
        const other = filtered.filter((q) => !topicSet.has(q.topic));

        if (matching.length === 0) {
          // No questions for the preferred topics in this section/source —
          // fall back transparently to whole-section selection so the
          // session is still meaningful.
          selected = [
            ...shuffle(filtered.filter(fresh)),
            ...shuffle(filtered.filter(stale)),
          ].slice(0, questionCount);
        } else {
          // Tiered: matching-fresh → matching-stale → other-fresh → other-stale.
          // Ensures weak-topic questions exhaust before any non-matching
          // ones appear, but if the weak-topic pool is too small for
          // questionCount we still hit the requested length using rest of
          // the section. This is the "fallback to full section" requirement.
          selected = [
            ...shuffle(matching.filter(fresh)),
            ...shuffle(matching.filter(stale)),
            ...shuffle(other.filter(fresh)),
            ...shuffle(other.filter(stale)),
          ].slice(0, questionCount);
        }
      } else {
        // No prioritization (no URL topics, no usable diagnostic bias) —
        // original two-tier order, unchanged behavior.
        selected = [
          ...shuffle(filtered.filter(fresh)),
          ...shuffle(filtered.filter(stale)),
        ].slice(0, questionCount);
      }
      selected = diversifyOrder(selected);

      saveRecentIds([...selected.map((q) => q.id), ...recentIds]);
      setQuestions(selected);
      setAnswers(new Array(selected.length).fill(null));
      setTimes(new Array(selected.length).fill(null));
      setHints(new Array(selected.length).fill(false));
      setTopicPool(enrichedAll);
      return;
    }

    // ===== Legacy Qudrat-AR branch (unchanged) =====
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

    // Enrich every question with branch / is_common / idea / fast_method / why_important
    const enrichedAll = trainingQuestions
      .filter(q => q.topic === mappedTopic)
      .map(enrichQuestion);

    let filtered = enrichedAll;
    if (difficulty !== "all") {
      filtered = filtered.filter(q => q.difficulty === difficulty);
    }

    // Smart selection: prioritize matching branch + is_common, then matching branch,
    // then is_common, then the rest. Falls back to topic if branch yields nothing.
    // Anti-repetition: prefer questions NOT in the recent IDs set; if all are recent,
    // recent ones are still allowed so the flow never breaks.
    let selected: TrainingQuestion[];
    if (branch) {
      const inBranch = filtered.filter(q => q.branch === branch);
      const outBranch = filtered.filter(q => q.branch !== branch);
      const tiers = [
        shuffle(inBranch.filter(q => q.is_common && fresh(q))),
        shuffle(inBranch.filter(q => !q.is_common && fresh(q))),
        shuffle(outBranch.filter(q => q.is_common && fresh(q))),
        shuffle(outBranch.filter(q => !q.is_common && fresh(q))),
        shuffle(inBranch.filter(stale)),
        shuffle(outBranch.filter(stale)),
      ];
      selected = tiers.flat().slice(0, questionCount);
    } else {
      const tiers = [
        shuffle(filtered.filter(q => q.is_common && fresh(q))),
        shuffle(filtered.filter(q => !q.is_common && fresh(q))),
        shuffle(filtered.filter(stale)),
      ];
      selected = tiers.flat().slice(0, questionCount);
    }

    // Diversify so consecutive questions don't share the same strategy/subtype
    selected = diversifyOrder(selected);

    // Persist this session's IDs so the next session avoids them
    saveRecentIds([...selected.map(q => q.id), ...recentIds]);

    setQuestions(selected);
    setAnswers(new Array(selected.length).fill(null));
    setTimes(new Array(selected.length).fill(null));
    setHints(new Array(selected.length).fill(false));
    setTopicPool(enrichedAll);
  }, [topic, questionCount, difficulty, branch, focus, requestedTopicsKey]);

  // ===== Adaptive difficulty =====
  // Re-rank the still-upcoming questions every ADAPT_EVERY answers so the
  // next batch skews toward the difficulty that matches the user's current
  // accuracy. Critical rules:
  //   - The current question and any already-answered question are NEVER
  //     touched — only items strictly after `currentIndex` are re-ordered.
  //   - The session length is preserved exactly (`questions.length` is
  //     unchanged) so the progress bar / "Question X of Y" UI doesn't shift.
  //   - Only runs when the user picked difficulty="all". When the user
  //     explicitly chose easy / medium / hard we respect that choice and
  //     skip adaptation entirely.
  //   - Anti-repetition (recentIds) and topic prioritization (weak topics
  //     from URL) are passed through to the composer as inner sort keys,
  //     so the existing 4-tier fresh→stale + topic-priority order survives.
  //   - Guarded by a ref so we don't re-run on the same milestone when
  //     React re-renders (e.g. timer ticks). The ref tracks the answered
  //     count we last adapted at; we only re-adapt when the new milestone
  //     is strictly greater.
  const ADAPT_EVERY = 5;
  const lastAdaptedAtRef = useRef(0);
  // Tracks the questions array reference of the session we last adapted
  // against. When the build effect commits a NEW session (via setQuestions
  // with a fresh array), this ref's value will diverge from the incoming
  // `questions` and we know to reset the milestone. Critically, this also
  // protects against the same-render race where the build effect schedules
  // new state but the adaptive effect runs against pre-rebuild
  // `questions`/`answers` — in that scenario the questions identity is
  // STILL the old one (state hasn't committed yet), so the milestone
  // remains intact and the adaptive effect won't try to mutate the
  // session that's about to be replaced.
  const lastSessionRef = useRef<TrainingQuestion[] | null>(null);
  // Stable shuffle reference — same implementation as the initial-build
  // branch above, declared at component scope so the adaptive effect
  // doesn't drag the whole-page shuffle dependency around.
  const adaptiveShuffle = useCallback(<T,>(arr: T[]): T[] => {
    return [...arr].sort(() => Math.random() - 0.5);
  }, []);
  useEffect(() => {
    if (difficulty !== "all") return;            // user explicitly chose a level
    if (questions.length === 0) return;          // session not built yet
    if (showResults) return;                     // session over
    if (topicPool.length === 0) return;          // nothing to draw extras from

    // Detect a new session via questions-array identity. When the build
    // effect commits, `questions` becomes a brand-new array reference;
    // we reset the milestone so the next session can re-adapt at its own
    // 5/10/... boundaries. Because this check uses the COMMITTED state
    // (the same `questions` value we're operating on below), there's no
    // race — we either see the old session (and the milestone we already
    // adapted at, so the guard below correctly skips), or we see the new
    // session (and reset to 0 here).
    if (questions !== lastSessionRef.current) {
      lastAdaptedAtRef.current = 0;
      lastSessionRef.current = questions;
    }

    // Count how many questions the user has actually answered. We use
    // `answers` (not `currentIndex`) so the trigger is based on real
    // progress rather than scroll position — keeps semantics stable if
    // the user ever skips around.
    const answeredCount = answers.filter((a) => a != null).length;
    if (answeredCount < ADAPT_EVERY) return;
    if (answeredCount % ADAPT_EVERY !== 0) return;
    if (answeredCount <= lastAdaptedAtRef.current) return;

    // Upcoming = strictly after the current question. Slicing from
    // currentIndex + 1 leaves the in-flight question alone even if the
    // user is mid-answer or mid-explanation when this fires.
    const upcomingStart = currentIndex + 1;
    const upcoming = questions.slice(upcomingStart);
    if (upcoming.length < 2) {
      // Nothing meaningful to re-rank (1 or 0 items left).
      lastAdaptedAtRef.current = answeredCount;
      return;
    }

    // ----- Profile bias resolution -----
    // Resolve a single "relevant topic" so we can pull this student's
    // historical level + trend out of the persistent profile and feed
    // them to the adaptive helper as a SOFT bias. The helper still does
    // all of its accuracy / speed / hint math first; the profile only
    // nudges the same shared adjustment sum, which stays clamped to
    // [-2, +2] so the profile can never override a strong session
    // signal — see `summarizePerformance` for the conflict-resolution
    // explanation.
    //
    // Topic-of-interest precedence:
    //   1. If the session is focused on exactly one topic
    //      (`requestedTopics.length === 1`), use that — it's the most
    //      explicit signal of intent.
    //   2. Otherwise compute the modal topic over the recent window of
    //      answered questions, so a mixed-section session is biased by
    //      whatever the student has actually been working on lately
    //      (not by an arbitrary first item).
    //
    // Wrapped in try/catch so a corrupted / unparseable profile blob
    // can NEVER break adaptation — we just fall back to session-only
    // signals, which is the prior behavior.
    let profileBias: ProfileBias | undefined;
    try {
      let topicOfInterest: string | undefined;
      if (requestedTopics.length === 1) {
        topicOfInterest = requestedTopics[0];
      } else {
        // Modal topic over the recent answered slice. We walk
        // backwards from the end so the most recent answers tie-break
        // toward the freshest topic.
        const counts = new Map<string, number>();
        let scanned = 0;
        for (let i = answers.length - 1; i >= 0 && scanned < ADAPT_EVERY; i--) {
          const a = answers[i];
          const q = questions[i];
          if (a == null || !q || !q.topic) continue;
          counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1);
          scanned++;
        }
        let bestCount = 0;
        for (const [t, c] of counts) {
          if (c > bestCount) {
            bestCount = c;
            topicOfInterest = t;
          }
        }
      }

      if (topicOfInterest) {
        const profile = loadUserProfile();
        const level = profile.lastKnownLevel?.[topicOfInterest]?.level;
        // `getTopicImprovement` returns null when the timeline has < 2
        // snapshots — which leaves `trend` undefined and silently
        // disables the directional rule (correct behavior for a
        // brand-new student or a topic with only one measurement).
        const imp = getTopicImprovement(profile, topicOfInterest);
        if (level || imp) {
          profileBias = {
            lastKnownLevel: level,
            trend: imp?.trend,
          };
        }
      }
    } catch {
      // Profile read / parse failure — fall through with no bias.
    }

    // Pass the per-question signal arrays so the helper can apply
    // speed-based and hint-based adjustments on top of the accuracy
    // base. Both arrays are parallel to `answers` (same indexing); the
    // helper safely treats missing entries as "no signal". The optional
    // `profileBias` is applied last and shares the [-2, +2] adjustment
    // budget — see helper for details.
    const perf = summarizePerformance(
      answers,
      questions,
      times,
      hints,
      ADAPT_EVERY,
      profileBias,
    );

    // Build the exclusion set: every question already in front of the
    // upcoming slice (answered or current) must NOT be reintroduced.
    const excludeIds = new Set<string>(
      questions.slice(0, upcomingStart).map((q) => q.id),
    );
    const recentIdSet = new Set<string>(loadRecentIds());
    const topicPriority =
      requestedTopics.length > 0 ? new Set<string>(requestedTopics) : undefined;

    const newUpcoming = composeUpcomingByDifficulty({
      upcoming,
      candidatePool: topicPool,
      excludeIds,
      recentIds: recentIdSet,
      target: perf.targetDifficulty,
      count: upcoming.length,
      topicPriority,
      diversify: diversifyOrder,
      shuffle: adaptiveShuffle,
    });

    // Mark this milestone as handled BEFORE the state update so a
    // re-render triggered by setQuestions can't re-enter the same
    // milestone branch.
    lastAdaptedAtRef.current = answeredCount;

    // Only commit if the composition actually changed — avoids a useless
    // setState that would invalidate React memoization downstream.
    const before = upcoming.map((q) => q.id).join(",");
    const after = newUpcoming.map((q) => q.id).join(",");
    if (before === after) return;

    // Build the new array ONCE and remember its identity in lastSessionRef
    // BEFORE committing it. This is critical: the next render will see
    // `questions === nextQuestions === lastSessionRef.current`, so the
    // identity-based "new session" check at the top of this effect will
    // NOT misclassify our own adaptive update as a session rebuild. (If
    // it did, it would reset lastAdaptedAtRef and we'd re-adapt at the
    // exact same milestone every render, churning the question list.)
    const nextQuestions = [
      ...questions.slice(0, upcomingStart),
      ...newUpcoming,
    ];
    lastSessionRef.current = nextQuestions;
    setQuestions(nextQuestions);

    // Persist any newly-introduced IDs so future sessions see them as
    // recently-used. We unshift the new IDs to the front, dedupe via
    // `loadRecentIds`'s downstream slice.
    const newIds = newUpcoming
      .map((q) => q.id)
      .filter((id) => !recentIdSet.has(id));
    if (newIds.length > 0) {
      saveRecentIds([...newIds, ...Array.from(recentIdSet)]);
    }
  }, [
    answers,
    questions,
    times,
    hints,
    currentIndex,
    topicPool,
    difficulty,
    showResults,
    requestedTopicsKey,
    adaptiveShuffle,
  ]);

  // ===== Persistent user profile (long-running aggregate) =====
  // When a session ends (showResults flips to true) we fold the answered
  // questions into the `user_profile` localStorage entry: per-topic
  // counters, totals, and hint usage. The profile drives strongest/weakest
  // topic detection, average accuracy/speed, and the recommended next
  // difficulty for future sessions.
  //
  // The save MUST run exactly once per completed session — re-renders or
  // user navigation must not double-count. We key the guard to the
  // `questions` array identity so a brand-new session (questions array
  // replaced) re-arms the guard, while in-place re-renders of the same
  // session don't.
  const profileSavedForSessionRef = useRef<TrainingQuestion[] | null>(null);
  useEffect(() => {
    if (!showResults) return;
    if (questions.length === 0) return;
    // Already persisted for this exact session reference — no double-save.
    if (profileSavedForSessionRef.current === questions) return;

    // Build the per-question session payload, skipping unanswered slots.
    // `answers`, `times`, `hints` are kept index-parallel everywhere they
    // mutate, so reading at `i` is safe.
    const payload: SessionAnswer[] = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const a = answers[i];
      // Skip unanswered questions — they shouldn't affect averages.
      if (!q || a == null) continue;
      // Canonical subtype for the persistent profile. Two pools feed
      // this page and their per-question subtype slugs come from
      // different sources:
      //   - exam banks: `loadExamBankQuestions` already calls the
      //     central `inferSubtype` (so q.subtype matches the canonical
      //     vocabulary), and
      //   - Qudrat-AR in-file: `enrichQuestion` → `deriveSmartInfo`
      //     produces older, more granular slugs ("linear-add",
      //     "circle-area") that don't share vocabulary with the
      //     central helper ("linear", "area").
      // To keep `topics[t].subtypes[s]` counters comparable across both
      // pools — and across future sessions — we ALWAYS run the central
      // helper here and only fall back to the in-engine slug when it
      // returns nothing. The in-session diversifier still uses the
      // richer per-question `q.subtype` for variety; only the persisted
      // counter dimension is unified.
      const canonicalSubtype = inferSubtype(q.question, q.topic) ?? q.subtype;
      payload.push({
        topic: q.topic,
        subtype: canonicalSubtype,
        isCorrect: a === q.correct,
        timeSpent: times[i] ?? null,
        hintUsed: hints[i] === true,
      });
    }
    if (payload.length === 0) return;

    // Persist first, then pin the guard ONLY on success. If the write
    // fails (quota, private-mode, etc.), the guard stays clear so a
    // subsequent re-render of the results screen will retry — this is
    // best-effort persistence without losing data on transient failures.
    try {
      const next = applySessionToProfile(loadUserProfile(), payload);
      const ok = saveUserProfile(next);
      if (ok) {
        profileSavedForSessionRef.current = questions;
      }
    } catch {
      // Aggregation/serialization failures shouldn't break the results
      // screen. Leaving the guard unset allows a retry on next render.
    }
  }, [showResults, questions, answers, times, hints]);

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

    const spent = 90 - timeLeft;
    const newTimes = [...times];
    newTimes[currentIndex] = spent;
    setTimes(newTimes);

    const q = questions[currentIndex];
    recordAnswer({
      questionId: q.id,
      topic: q.topic,
      category: q.category,
      difficulty: q.difficulty,
      isCorrect: index === q.correct,
      timeSpent: spent,
    });
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
      setShowHint(false);
      setTimeLeft(90);
    } else {
      setShowResults(true);
    }
  };

  // "تدرب على نفس النمط" — append a fresh same-subtype question right after the
  // current one and advance into it. Prefers an unseen item from the topic pool;
  // falls back to a generated variation of the current question. No network calls.
  const practiceSimilar = () => {
    const cur = questions[currentIndex];
    if (!cur) return;
    const seen = new Set(questions.map(q => q.id));
    const sameSubtype = topicPool.filter(
      q =>
        !seen.has(q.id) &&
        q.id !== cur.id &&
        ((cur.subtype && q.subtype === cur.subtype) ||
          (cur.strategy_tag && q.strategy_tag === cur.strategy_tag) ||
          q.branch === cur.branch)
    );
    let next: TrainingQuestion;
    if (sameSubtype.length > 0) {
      next = sameSubtype[Math.floor(Math.random() * sameSubtype.length)];
    } else {
      next = enrichQuestion(generateQuestionVariation(cur, Date.now()));
    }
    // Insert immediately after the current index, then advance to it.
    const insertAt = currentIndex + 1;
    const newQs = [...questions.slice(0, insertAt), next, ...questions.slice(insertAt)];
    const newAns = [...answers.slice(0, insertAt), null, ...answers.slice(insertAt)];
    const newTimes = [...times.slice(0, insertAt), null, ...times.slice(insertAt)];
    // Keep `hints` parallel to `answers`/`times` after the in-session insert
    // so the adaptive engine can keep reading per-question signals at the
    // correct indices.
    const newHints = [...hints.slice(0, insertAt), false, ...hints.slice(insertAt)];
    // Pin the new array identity into the adaptive-difficulty session ref
    // BEFORE committing it, so the adaptive effect's identity-based
    // session detector treats this in-session insert as the SAME session
    // (not a new one). Otherwise it would reset the milestone, allowing
    // a duplicate adaptation at the same answered boundary right after a
    // "practice similar" tap.
    lastSessionRef.current = newQs;
    setQuestions(newQs);
    setAnswers(newAns);
    setTimes(newTimes);
    setHints(newHints);
    setCurrentIndex(insertAt);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setShowHint(false);
    setTimeLeft(90);
  };

  const calculateScore = () => {
    return questions.reduce((score, q, i) => 
      answers[i] === q.correct ? score + 1 : score, 0);
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" dir={examDir}>
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#006C35] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{tx("جاري تحميل الأسئلة...", "Loading questions...")}</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4" dir={examDir}>
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
              {percentage >= 70
                ? tx('أداء ممتاز!', 'Excellent performance!')
                : percentage >= 50
                ? tx('أداء جيد!', 'Good performance!')
                : tx('تحتاج مزيد من التدريب', 'Needs more practice')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {tx(
                `أجبت على ${score} من ${questions.length} بشكل صحيح`,
                `You answered ${score} out of ${questions.length} correctly`
              )}
            </p>

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => router.push(backToTrainingHref)}
                className="px-6 py-3 bg-[#006C35] text-white rounded-xl font-bold hover:bg-[#004d26]"
              >
                {tx('العودة للتدريب', 'Back to Training')}
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border-2 border-[#006C35] text-[#006C35] rounded-xl font-bold hover:bg-[#006C35]/5"
              >
                {tx('إعادة المحاولة', 'Try Again')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" dir={examDir}>
      <header className="bg-[#006C35] text-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push(backToTrainingHref)}
                aria-label={tx("العودة للتدريب", "Back to Training")}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                {/* Universal left-pointing back chevron — preserved from the
                    original UI in both locales (Material/iOS convention). */}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="font-bold">{tx("وضع التدريب", "Practice Mode")}</span>
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
        <TestPatternIndicator
          answers={answers}
          correctAnswers={questions.map(q => q.correct)}
          times={times}
        />
        <TrainingAICoachCard input={coachInput} isPremium={isPremium} />
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
            }`}>{
              currentQ.difficulty === 'easy'
                ? tx('سهل', 'Easy')
                : currentQ.difficulty === 'medium'
                ? tx('متوسط', 'Medium')
                : tx('صعب', 'Hard')
            }</span>
          </div>

          <h2 dir={examDir} style={{ unicodeBidi: "isolate" }} className="text-xl font-bold text-gray-900 dark:text-white mb-6">{currentQ.question}</h2>

          {!showExplanation && (
            <div className="mb-4">
              {!showHint ? (
                <button
                  onClick={() => {
                    setShowHint(true);
                    // Record that the user revealed the hint for this
                    // question. Functional updater so we don't race with
                    // any other in-flight state changes (e.g. rapid taps).
                    // Index check guards against the unlikely case where
                    // the question array length doesn't yet match `hints`.
                    setHints((prev) => {
                      if (currentIndex < 0 || currentIndex >= prev.length) {
                        return prev;
                      }
                      if (prev[currentIndex]) return prev;
                      const next = prev.slice();
                      next[currentIndex] = true;
                      return next;
                    });
                  }}
                  className="px-4 py-2 rounded-xl border-2 border-dashed border-[#D4AF37] text-[#D4AF37] dark:text-[#fbbf24] text-sm font-bold hover:bg-[#D4AF37]/10 transition"
                >
                  {tx('💡 عرض تلميح', '💡 Show Hint')}
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/40">
                  <div className="flex items-center gap-2 mb-1 text-[#D4AF37] dark:text-[#fbbf24] text-xs font-bold">
                    <span>💡</span> {tx('تلميح للتفكير', 'Thinking Hint')}
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-100 leading-relaxed">
                    {pickLocale(currentQ.hint)}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 mb-6">
            {currentQ.options.map((option, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === currentQ.correct;
              const showResult = showExplanation;
              const label = optionLabels[idx] ?? String(idx + 1);

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={showExplanation}
                  dir={examDir}
                  className={`w-full p-4 rounded-xl border-2 ${examTextAlign} transition-all ${
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
                    <span
                      aria-hidden="true"
                      dir="ltr"
                      style={{ unicodeBidi: "isolate" }}
                      className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                        showResult
                          ? isCorrect ? "bg-green-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
                          : isSelected ? "bg-[#006C35] text-white" : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {label}
                    </span>
                    <span
                      dir={examDir}
                      style={{ unicodeBidi: "isolate" }}
                      className={`text-gray-900 dark:text-white flex-1 ${examTextAlign}`}
                    >
                      {option}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {showExplanation && (
            selectedAnswer === currentQ.correct ? (
              <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 mb-4">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-200 text-sm font-bold">
                  <span>✅</span> {pickLocale(currentQ.reinforcement) || tx("أحسنت — استمر على هذا الأسلوب.", "Well done — keep up this approach.")}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-700 mb-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200 text-sm font-bold">
                  <span>❌</span> {tx("انتبه لهذا النمط من الخطأ", "Watch out for this error pattern")}
                </div>
                <p className="mt-1 text-sm text-red-700 dark:text-red-200 leading-relaxed">
                  {pickLocale(currentQ.common_mistake)}
                </p>
              </div>
            )
          )}

          {showExplanation && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 p-4 mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1 text-gray-500 dark:text-gray-400 text-xs font-bold">
                  <span>🧠</span> {tx("فكرة السؤال", "Question Idea")}
                </div>
                <p className="text-sm text-gray-900 dark:text-white font-medium">
                  {pickLocale(currentQ.idea) || tx("هذا من الأنماط الشائعة في هذا القسم", "This is a common pattern in this section")}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 text-[#006C35] dark:text-[#4ade80] text-xs font-bold">
                  <span>⚡</span> {tx("أسرع طريقة للحل", "Fastest Method")}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {pickLocale(currentQ.fast_method) || tx("اقرأ السؤال بتأنٍّ وحدّد المعطيات قبل الحل", "Read the question carefully and identify the given data before solving")}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1 text-red-600 dark:text-red-400 text-xs font-bold">
                  <span>⚠️</span> {tx("سبب الخطأ الشائع", "Common Mistake")}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">
                  {pickLocale(currentQ.common_mistake) || tx("احذر التسرّع قبل قراءة جميع الخيارات.", "Don't rush before reading all options.")}
                </p>
              </div>
            </div>
          )}

          {showExplanation && (
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 mb-6">
              <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">{tx("الشرح:", "Explanation:")}</h4>
              <p className="text-blue-700 dark:text-blue-200 whitespace-pre-line">{currentQ.explanation}</p>
            </div>
          )}

          {showExplanation && (
            <div className="space-y-2">
              <button
                onClick={practiceSimilar}
                className="w-full py-3 bg-white dark:bg-gray-800 border-2 border-[#D4AF37] text-[#D4AF37] dark:text-[#fbbf24] font-bold rounded-xl hover:bg-[#D4AF37]/10"
              >
                {tx("🔁 تدرب على نفس النمط", "🔁 Practice the Same Pattern")}
              </button>
              <button
                onClick={nextQuestion}
                className="w-full py-3 bg-[#006C35] text-white font-bold rounded-xl hover:bg-[#004d26]"
              >
                {currentIndex < questions.length - 1
                  ? tx('السؤال التالي', 'Next Question')
                  : tx('عرض النتائج', 'Show Results')}
              </button>
            </div>
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
