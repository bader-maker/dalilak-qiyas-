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

// =============================================================================
// SECTION-BALANCED (STRATIFIED) QUESTION SELECTION
// =============================================================================
// Pulls a fixed total of questions from a multi-section pool while honoring
// each section's intended quota (e.g. Qudrat: 60 quantitative + 60 verbal,
// Tahsili: 25 math + 25 physics + 25 chemistry + 25 biology).
//
// Why this exists:
//   A pure shuffle-then-slice over the combined pool can drift from the target
//   distribution — especially after the no-repeat filter has emptied parts of
//   one section but not others (e.g. picking 100 from a 145-question Tahsili
//   pool could yield 30 math / 22 physics / 28 chemistry / 20 biology).
//
// What this preserves:
//   - The existing no-repeat filter (callers pass the used-keys set in).
//   - Full randomization within each section, AND a final whole-set shuffle
//     so sections aren't grouped sequentially in the test order.
//   - The exact { id, question, options, correct, explanation, section }
//     shape callers already consume — no question-data changes.
// =============================================================================

type SectionQuota = { id: string; questionCount: number };

// Strict-typed view of a question that may carry an injected section tag
// (added by getAllQuestionsForCategory). The selector reads this tag to
// stratify; the field is preserved on output.
type TaggedQuestion = Question & { section?: string };

/**
 * Stratified, section-balanced selection from a comprehensive question pool.
 *
 * @param pool          All available questions (already tagged with `section`,
 *                      e.g. as returned by getAllQuestionsForCategory).
 * @param sectionsConfig Per-section quotas (use the `sections` array from
 *                      examCategories[cat]). The `questionCount` of each
 *                      section is its target.
 * @param totalNeeded   Final number of questions to return. If the sum of
 *                      section quotas differs from this, quotas are
 *                      proportionally rescaled.
 * @param usedKeys      Set of stable per-question keys already shown to the
 *                      user (no-repeat filter). Pass an empty Set to disable.
 * @param getKey        Stable key function for each question (callers already
 *                      have a content-hash helper for this).
 * @returns             Up to `totalNeeded` questions, balanced across sections,
 *                      with within-section randomization and an outer shuffle.
 *
 * Selection priority (each step only fills remaining shortfalls):
 *   1. Within each section: take UNUSED questions up to that section's quota.
 *   2. Within each section: top up from same-section USED questions.
 *      (Topic coverage takes priority over novelty — better to re-show a
 *      math question than to drop math entirely from a Tahsili exam.)
 *   3. Cross-section overflow: fill remaining shortfall from UNUSED questions
 *      in OTHER sections (closest-available fallback for sections so small
 *      their entire pool can't meet the quota).
 *   4. Cross-section USED overflow: very last-resort fill across sections.
 * After all steps the combined result is shuffled so sections interleave.
 */
export function selectBalancedQuestions(
  pool: TaggedQuestion[],
  sectionsConfig: SectionQuota[],
  totalNeeded: number,
  usedKeys: Set<string>,
  getKey: (q: Question) => string
): Question[] {
  if (totalNeeded <= 0 || sectionsConfig.length === 0 || pool.length === 0) {
    return [];
  }

  // -- Step 1: group pool by section, ignoring questions whose section tag
  //    isn't part of this category's expected sections.
  const bySection = new Map<string, TaggedQuestion[]>();
  for (const s of sectionsConfig) bySection.set(s.id, []);
  for (const q of pool) {
    const tag = q.section;
    if (tag && bySection.has(tag)) {
      bySection.get(tag)!.push(q);
    }
  }

  // -- Step 2: build per-section buckets with unused/used split, both shuffled
  //    so within-section randomization is preserved.
  type Bucket = {
    id: string;
    quota: number;
    unused: TaggedQuestion[];
    used: TaggedQuestion[];
    picked: TaggedQuestion[];
  };
  const buckets: Bucket[] = sectionsConfig.map(({ id, questionCount }) => {
    const all = bySection.get(id) ?? [];
    return {
      id,
      quota: questionCount,
      unused: shuffleQuestions(all.filter((q) => !usedKeys.has(getKey(q)))) as TaggedQuestion[],
      used: shuffleQuestions(all.filter((q) => usedKeys.has(getKey(q)))) as TaggedQuestion[],
      picked: [],
    };
  });

  // -- Step 3: rescale quotas if config quotas don't sum to totalNeeded.
  //    Uses largest-remainder (Hamilton) allocation:
  //      a) Each bucket gets floor(weight / totalWeight * totalNeeded).
  //      b) The remaining slots (totalNeeded - sum of floors) are handed,
  //         one each, to the buckets with the largest fractional remainder
  //         (ties broken by larger original weight, then by index).
  //    Guarantees the resulting quotas sum to EXACTLY totalNeeded for any
  //    input — including small totals like 1, 2, or 3 on a 4-section config
  //    where naive round-then-fill-last can over-allocate.
  const quotaSum = buckets.reduce((a, b) => a + b.quota, 0);
  if (quotaSum !== totalNeeded && quotaSum > 0) {
    // Random per-call rotation so when fractional remainders AND weights
    // are perfectly tied (e.g. 4 equal-weight sections + a small custom
    // questionLimit), ties don't systematically favor the first-listed
    // section across many calls.
    const rotation = Math.floor(Math.random() * buckets.length);
    const fractions = buckets.map((b, i) => {
      const exact = (b.quota / quotaSum) * totalNeeded;
      const floor = Math.floor(exact);
      return {
        i,
        weight: b.quota,
        floor,
        frac: exact - floor,
        rotIdx: (i + rotation) % buckets.length,
      };
    });
    let leftover = totalNeeded - fractions.reduce((a, f) => a + f.floor, 0);
    // Sort by largest fractional remainder, then by original weight, then
    // by rotated index — deterministic within a call, fair across calls.
    const order = [...fractions].sort((a, b) => {
      if (b.frac !== a.frac) return b.frac - a.frac;
      if (b.weight !== a.weight) return b.weight - a.weight;
      return a.rotIdx - b.rotIdx;
    });
    for (const f of order) {
      if (leftover <= 0) break;
      f.floor += 1;
      leftover -= 1;
    }
    fractions.forEach((f) => {
      buckets[f.i].quota = Math.max(0, f.floor);
    });
  }

  // -- Step 4: first pass — take unused up to quota in each section.
  for (const b of buckets) {
    const take = Math.min(b.quota, b.unused.length);
    b.picked.push(...b.unused.splice(0, take));
  }

  const totalShortfall = () =>
    buckets.reduce((acc, b) => acc + Math.max(0, b.quota - b.picked.length), 0);
  const neediestBucket = (): Bucket | null => {
    let best: Bucket | null = null;
    let bestShort = 0;
    for (const b of buckets) {
      const short = b.quota - b.picked.length;
      if (short > bestShort) {
        bestShort = short;
        best = b;
      }
    }
    return best;
  };

  // -- Step 5: same-section used fill — preserve topic coverage.
  //    Re-shows previously-seen questions in the same section before we
  //    consider stealing slots from other sections. Aligned with the
  //    "ensure minimum coverage of each topic" requirement.
  if (totalShortfall() > 0) {
    for (const b of buckets) {
      while (b.picked.length < b.quota && b.used.length > 0) {
        b.picked.push(b.used.shift()!);
      }
    }
  }

  // -- Step 6: cross-section unused overflow (closest available fallback).
  //    Reached only when a section's entire pool (unused + used) is smaller
  //    than its quota. Pulls fresh questions from other sections so the
  //    test still totals `totalNeeded`.
  if (totalShortfall() > 0) {
    const leftoverUnused = shuffleQuestions(
      buckets.flatMap((b) => b.unused)
    ) as TaggedQuestion[];
    while (totalShortfall() > 0 && leftoverUnused.length > 0) {
      const target = neediestBucket();
      if (!target) break;
      target.picked.push(leftoverUnused.shift()!);
    }
  }

  // -- Step 7: cross-section used fill (very last resort).
  if (totalShortfall() > 0) {
    const leftoverUsed = shuffleQuestions(
      buckets.flatMap((b) => b.used)
    ) as TaggedQuestion[];
    while (totalShortfall() > 0 && leftoverUsed.length > 0) {
      const target = neediestBucket();
      if (!target) break;
      target.picked.push(leftoverUsed.shift()!);
    }
  }

  // -- Step 8: combine, shuffle so sections aren't presented sequentially,
  //    and defensively cap at totalNeeded. The cap is belt-and-braces — the
  //    Hamilton allocation above already guarantees the sum exactly equals
  //    totalNeeded — but it makes the contract impossible to violate.
  const combined: TaggedQuestion[] = buckets.flatMap((b) => b.picked);
  return shuffleQuestions(combined).slice(0, totalNeeded);
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
