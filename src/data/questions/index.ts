import type { Question, ExamCategory, ExamSection } from "../exam-config";
import { qudratArQuestions } from "./qudrat-ar";
import { gatEnQuestions } from "./gat-en";
import { tahsiliArQuestions } from "./tahsili-ar";
import { saatEnQuestions } from "./saat-en";

// Master question bank - completely separate datasets for each exam category
export const questionBank: Record<ExamCategory, Record<string, Question[]>> = {
  qudrat_ar: qudratArQuestions,
  gat_en: gatEnQuestions,
  tahsili_ar: tahsiliArQuestions,
  saat_en: saatEnQuestions,
};

// Get questions for a specific exam category and section
export function getQuestions(
  category: ExamCategory,
  section: ExamSection
): Question[] {
  const categoryQuestions = questionBank[category];
  if (!categoryQuestions) {
    console.error(`No questions found for category: ${category}`);
    return [];
  }

  const sectionQuestions = categoryQuestions[section];
  if (!sectionQuestions) {
    console.error(`No questions found for section: ${section} in category: ${category}`);
    return [];
  }

  // Return a copy with unique IDs to prevent any mixing
  return sectionQuestions.map((q, index) => ({
    ...q,
    id: index + 1, // Re-index to ensure unique IDs within section
  }));
}

// Get all questions for an exam category (combines all sections)
export function getAllQuestionsForCategory(category: ExamCategory): Question[] {
  const categoryQuestions = questionBank[category];
  if (!categoryQuestions) {
    console.error(`No questions found for category: ${category}`);
    return [];
  }

  const allQuestions: Question[] = [];
  let idCounter = 1;

  Object.entries(categoryQuestions).forEach(([sectionId, questions]) => {
    questions.forEach((q) => {
      allQuestions.push({
        ...q,
        id: idCounter++,
        // Add section metadata for tracking
        section: sectionId,
      } as Question & { section: string });
    });
  });

  return allQuestions;
}

// Get question count for a specific section
export function getQuestionCount(
  category: ExamCategory,
  section: ExamSection
): number {
  const questions = getQuestions(category, section);
  return questions.length;
}

// Get total question count for a category
export function getTotalQuestionCount(category: ExamCategory): number {
  const categoryQuestions = questionBank[category];
  if (!categoryQuestions) return 0;

  return Object.values(categoryQuestions).reduce(
    (total, questions) => total + questions.length,
    0
  );
}

// Shuffle questions (for randomization)
export function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get a limited number of questions from a section
export function getLimitedQuestions(
  category: ExamCategory,
  section: ExamSection,
  limit: number,
  shuffle: boolean = true
): Question[] {
  let questions = getQuestions(category, section);

  if (shuffle) {
    questions = shuffleQuestions(questions);
  }

  return questions.slice(0, limit);
}

// Validate that a question belongs to the correct category/section
export function validateQuestion(
  question: Question,
  category: ExamCategory,
  section: ExamSection
): boolean {
  const validQuestions = getQuestions(category, section);
  return validQuestions.some(q => q.question === question.question);
}

// Export section mappings for UI
export const sectionLabels: Record<ExamCategory, Record<string, { ar: string; en: string }>> = {
  qudrat_ar: {
    verbal_ar: { ar: "اللفظي", en: "Verbal" },
    quantitative_ar: { ar: "الكمي", en: "Quantitative" },
  },
  gat_en: {
    verbal_en: { ar: "Verbal", en: "Verbal" },
    quantitative_en: { ar: "Quantitative", en: "Quantitative" },
  },
  tahsili_ar: {
    math_ar: { ar: "الرياضيات", en: "Mathematics" },
    physics_ar: { ar: "الفيزياء", en: "Physics" },
    chemistry_ar: { ar: "الكيمياء", en: "Chemistry" },
    biology_ar: { ar: "الأحياء", en: "Biology" },
  },
  saat_en: {
    math_en: { ar: "Mathematics", en: "Mathematics" },
    physics_en: { ar: "Physics", en: "Physics" },
    chemistry_en: { ar: "Chemistry", en: "Chemistry" },
    biology_en: { ar: "Biology", en: "Biology" },
  },
};

// Get section label
export function getSectionLabel(
  category: ExamCategory,
  section: string,
  language: "ar" | "en" = "ar"
): string {
  return sectionLabels[category]?.[section]?.[language] || section;
}
