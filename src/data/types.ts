// ===========================================
// MASTER QUESTION BANK TYPE DEFINITIONS
// ===========================================

// Exam Categories
export type ExamCategory = "qudrat_ar" | "tahsili_ar" | "gat_en" | "saat_en";

// Sections per exam category
export type QudratSection = "verbal_ar" | "quantitative_ar";
export type TahsiliSection = "math_ar" | "physics_ar" | "chemistry_ar" | "biology_ar";
export type GATSection = "verbal_en" | "quantitative_en";
export type SAATSection = "math_en" | "physics_en" | "chemistry_en" | "biology_en";
export type ExamSection = QudratSection | TahsiliSection | GATSection | SAATSection;

// Question types per section
export type VerbalQuestionType =
  | "analogy"
  | "sentence_completion"
  | "reading_comprehension"
  | "contextual_error"
  | "odd_word";

export type QuantitativeQuestionType =
  | "algebra"
  | "geometry"
  | "ratios"
  | "statistics";

export type ScienceQuestionType =
  | "general"
  | "mechanics"
  | "electricity"
  | "waves"
  | "organic"
  | "inorganic"
  | "biochemistry"
  | "cell_biology"
  | "genetics"
  | "ecology"
  | "calculus"
  | "trigonometry"
  | "functions";

export type QuestionType = VerbalQuestionType | QuantitativeQuestionType | ScienceQuestionType;

// Difficulty levels
export type Difficulty = "easy" | "medium" | "hard";

// Language
export type Language = "ar" | "en";

// ===========================================
// SUBSCRIPTION BUNDLES
// ===========================================
// Bundles align 1:1 with the dashboard route taxonomy:
//   "aptitude"    → /qudrat  (Qudrat + GAT)
//   "achievement" → /tahsili (Tahsili + SAAT)
// Keep this canonical so a future entitlement backend can use the
// same identifiers as primary keys without another rename cycle.
export type BundleId = "aptitude" | "achievement";

// ===========================================
// QUESTION INTERFACE WITH FULL METADATA
// ===========================================
export interface Question {
  id: string;
  exam_category: ExamCategory;
  section: ExamSection;
  question_type: QuestionType;
  difficulty: Difficulty;
  language: Language;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  /**
   * OPTIONAL finer-grained slug *under* `question_type` (e.g. for
   * `algebra`: "linear", "quadratic", "logarithm"). Inferred at
   * load-time by `src/lib/subtypeInference.ts` — never set in the
   * raw bank data so authors don't have to maintain it manually.
   * Consumers MUST treat absence as "no subtype" and fall back to
   * topic-level behavior; subtype is purely additive.
   */
  subtype?: string;
}

// Legacy Question interface for backward compatibility
export interface LegacyQuestion {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  section?: string;
}

// ===========================================
// SECTION CONFIGURATIONS
// ===========================================
export interface SectionConfig {
  id: ExamSection;
  name: string;
  nameEn: string;
  icon: string;
  questionCount: number;
  timeMinutes: number;
  color: string;
  questionTypes: QuestionType[];
}

export interface ExamCategoryConfig {
  id: ExamCategory;
  name: string;
  nameEn: string;
  language: Language;
  icon: string;
  totalQuestions: number;
  totalTimeMinutes: number;
  sections: SectionConfig[];
}

// ===========================================
// MAPPINGS
// ===========================================
export const sectionQuestionTypes: Record<ExamSection, QuestionType[]> = {
  verbal_ar: ["analogy", "sentence_completion", "reading_comprehension", "contextual_error", "odd_word"],
  quantitative_ar: ["algebra", "geometry", "ratios", "statistics"],
  math_ar: ["algebra", "geometry", "calculus", "trigonometry", "functions"],
  physics_ar: ["mechanics", "electricity", "waves", "general"],
  chemistry_ar: ["organic", "inorganic", "biochemistry", "general"],
  biology_ar: ["cell_biology", "genetics", "ecology", "general"],
  verbal_en: ["analogy", "sentence_completion", "reading_comprehension", "contextual_error", "odd_word"],
  quantitative_en: ["algebra", "geometry", "ratios", "statistics"],
  math_en: ["algebra", "geometry", "calculus", "trigonometry", "functions"],
  physics_en: ["mechanics", "electricity", "waves", "general"],
  chemistry_en: ["organic", "inorganic", "biochemistry", "general"],
  biology_en: ["cell_biology", "genetics", "ecology", "general"],
};

export const examCategorySections: Record<ExamCategory, ExamSection[]> = {
  qudrat_ar: ["verbal_ar", "quantitative_ar"],
  tahsili_ar: ["math_ar", "physics_ar", "chemistry_ar", "biology_ar"],
  gat_en: ["verbal_en", "quantitative_en"],
  saat_en: ["math_en", "physics_en", "chemistry_en", "biology_en"],
};

// ===========================================
// LABELS
// ===========================================
export const examCategoryLabels: Record<ExamCategory, { ar: string; en: string }> = {
  qudrat_ar: { ar: "القدرات العامة", en: "Qudrat (Arabic GAT)" },
  tahsili_ar: { ar: "التحصيلي", en: "Tahsili (Arabic SAAT)" },
  gat_en: { ar: "GAT", en: "General Aptitude Test (English)" },
  saat_en: { ar: "SAAT", en: "Science Achievement Test (English)" },
};

export const sectionLabels: Record<ExamSection, { ar: string; en: string }> = {
  verbal_ar: { ar: "اللفظي", en: "Verbal" },
  quantitative_ar: { ar: "الكمي", en: "Quantitative" },
  math_ar: { ar: "الرياضيات", en: "Mathematics" },
  physics_ar: { ar: "الفيزياء", en: "Physics" },
  chemistry_ar: { ar: "الكيمياء", en: "Chemistry" },
  biology_ar: { ar: "الأحياء", en: "Biology" },
  verbal_en: { ar: "اللفظي", en: "Verbal" },
  quantitative_en: { ar: "الكمي", en: "Quantitative" },
  math_en: { ar: "الرياضيات", en: "Mathematics" },
  physics_en: { ar: "الفيزياء", en: "Physics" },
  chemistry_en: { ar: "الكيمياء", en: "Chemistry" },
  biology_en: { ar: "الأحياء", en: "Biology" },
};

export const questionTypeLabels: Record<QuestionType, { ar: string; en: string }> = {
  analogy: { ar: "التناظر اللفظي", en: "Analogies" },
  sentence_completion: { ar: "إكمال الجمل", en: "Sentence Completion" },
  reading_comprehension: { ar: "استيعاب المقروء", en: "Reading Comprehension" },
  contextual_error: { ar: "الخطأ السياقي", en: "Contextual Error" },
  odd_word: { ar: "المفردة الشاذة", en: "Odd Word Out" },
  algebra: { ar: "الجبر", en: "Algebra" },
  geometry: { ar: "الهندسة", en: "Geometry" },
  ratios: { ar: "النسب والتناسب", en: "Ratios & Percentages" },
  statistics: { ar: "الإحصاء", en: "Statistics & Probability" },
  general: { ar: "عام", en: "General" },
  mechanics: { ar: "ميكانيكا", en: "Mechanics" },
  electricity: { ar: "كهرباء", en: "Electricity" },
  waves: { ar: "موجات", en: "Waves" },
  organic: { ar: "كيمياء عضوية", en: "Organic Chemistry" },
  inorganic: { ar: "كيمياء غير عضوية", en: "Inorganic Chemistry" },
  biochemistry: { ar: "كيمياء حيوية", en: "Biochemistry" },
  cell_biology: { ar: "أحياء خلوية", en: "Cell Biology" },
  genetics: { ar: "وراثة", en: "Genetics" },
  ecology: { ar: "بيئة", en: "Ecology" },
  calculus: { ar: "تفاضل وتكامل", en: "Calculus" },
  trigonometry: { ar: "مثلثات", en: "Trigonometry" },
  functions: { ar: "دوال", en: "Functions" },
};

export const difficultyLabels: Record<Difficulty, { ar: string; en: string }> = {
  easy: { ar: "سهل", en: "Easy" },
  medium: { ar: "متوسط", en: "Medium" },
  hard: { ar: "صعب", en: "Hard" },
};
