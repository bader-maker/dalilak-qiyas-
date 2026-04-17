// Exam Categories Configuration
export type ExamCategory = "qudrat_ar" | "tahsili_ar" | "gat_en" | "saat_en";

export type QudratSection = "verbal_ar" | "quantitative_ar";
export type TahsiliSection = "math_ar" | "physics_ar" | "chemistry_ar" | "biology_ar";
export type GATSection = "verbal_en" | "quantitative_en";
export type SAATSection = "math_en" | "physics_en" | "chemistry_en" | "biology_en";

export type ExamSection = QudratSection | TahsiliSection | GATSection | SAATSection;

export interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface SectionConfig {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  questionCount: number;
  timeMinutes: number;
  color: string;
}

export interface ExamCategoryConfig {
  id: ExamCategory;
  name: string;
  nameEn: string;
  language: "ar" | "en";
  icon: string;
  totalQuestions: number;
  totalTimeMinutes: number;
  sections: SectionConfig[];
}

// Exam Categories Configuration
export const examCategories: Record<ExamCategory, ExamCategoryConfig> = {
  qudrat_ar: {
    id: "qudrat_ar",
    name: "القدرات العامة",
    nameEn: "Qudrat (Arabic)",
    language: "ar",
    icon: "📝",
    totalQuestions: 120,
    totalTimeMinutes: 120,
    sections: [
      {
        id: "quantitative_ar",
        name: "الكمي",
        nameEn: "Quantitative",
        icon: "🔢",
        questionCount: 60,
        timeMinutes: 60,
        color: "from-blue-500 to-blue-600",
      },
      {
        id: "verbal_ar",
        name: "اللفظي",
        nameEn: "Verbal",
        icon: "📖",
        questionCount: 60,
        timeMinutes: 60,
        color: "from-purple-500 to-purple-600",
      },
    ],
  },
  tahsili_ar: {
    id: "tahsili_ar",
    name: "التحصيلي",
    nameEn: "Tahsili (Arabic)",
    language: "ar",
    icon: "🎓",
    totalQuestions: 100,
    totalTimeMinutes: 90,
    sections: [
      {
        id: "math_ar",
        name: "الرياضيات",
        nameEn: "Mathematics",
        icon: "➕",
        questionCount: 25,
        timeMinutes: 22,
        color: "from-blue-500 to-blue-600",
      },
      {
        id: "physics_ar",
        name: "الفيزياء",
        nameEn: "Physics",
        icon: "⚡",
        questionCount: 25,
        timeMinutes: 22,
        color: "from-orange-500 to-orange-600",
      },
      {
        id: "chemistry_ar",
        name: "الكيمياء",
        nameEn: "Chemistry",
        icon: "🧪",
        questionCount: 25,
        timeMinutes: 22,
        color: "from-green-500 to-green-600",
      },
      {
        id: "biology_ar",
        name: "الأحياء",
        nameEn: "Biology",
        icon: "🧬",
        questionCount: 25,
        timeMinutes: 24,
        color: "from-teal-500 to-teal-600",
      },
    ],
  },
  gat_en: {
    id: "gat_en",
    name: "GAT",
    nameEn: "General Aptitude Test",
    language: "en",
    icon: "🇬🇧",
    totalQuestions: 120,
    totalTimeMinutes: 120,
    sections: [
      {
        id: "quantitative_en",
        name: "Quantitative",
        nameEn: "Quantitative",
        icon: "🔢",
        questionCount: 60,
        timeMinutes: 60,
        color: "from-blue-500 to-blue-600",
      },
      {
        id: "verbal_en",
        name: "Verbal",
        nameEn: "Verbal",
        icon: "📖",
        questionCount: 60,
        timeMinutes: 60,
        color: "from-purple-500 to-purple-600",
      },
    ],
  },
  saat_en: {
    id: "saat_en",
    name: "SAAT",
    nameEn: "Science Achievement Test",
    language: "en",
    icon: "🔬",
    totalQuestions: 100,
    totalTimeMinutes: 90,
    sections: [
      {
        id: "math_en",
        name: "Mathematics",
        nameEn: "Mathematics",
        icon: "➕",
        questionCount: 25,
        timeMinutes: 22,
        color: "from-blue-500 to-blue-600",
      },
      {
        id: "physics_en",
        name: "Physics",
        nameEn: "Physics",
        icon: "⚡",
        questionCount: 25,
        timeMinutes: 22,
        color: "from-orange-500 to-orange-600",
      },
      {
        id: "chemistry_en",
        name: "Chemistry",
        nameEn: "Chemistry",
        icon: "🧪",
        questionCount: 25,
        timeMinutes: 22,
        color: "from-green-500 to-green-600",
      },
      {
        id: "biology_en",
        name: "Biology",
        nameEn: "Biology",
        icon: "🧬",
        questionCount: 25,
        timeMinutes: 24,
        color: "from-teal-500 to-teal-600",
      },
    ],
  },
};

// Helper function to get exam config
export function getExamConfig(category: ExamCategory): ExamCategoryConfig {
  return examCategories[category];
}

// Helper function to get section config
export function getSectionConfig(category: ExamCategory, sectionId: string): SectionConfig | undefined {
  const exam = examCategories[category];
  return exam.sections.find(s => s.id === sectionId);
}
