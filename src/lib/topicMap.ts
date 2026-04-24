// =============================================================================
// Topic Map — single source of truth for sub-topic identity across the app.
//
// Why this file exists:
//   The post-exam result pages (/test, /test-gat) already compute per-topic
//   accuracy because every in-file Qudrat / GAT question carries a `category`
//   label (e.g. "الجبر", "Algebra"). What was missing was a stable URL-safe
//   slug for those labels and a way to ask "which sub-topic does question N
//   in section X belong to" for exam-bank questions (which have no category
//   field of their own — sub-topics are encoded only in source-file comments
//   like `// Algebra (20 questions)`).
//
//   This module gives both:
//     1. categoryNameToSlug(label) — convert any of the 19 known display
//        labels (Arabic + English) into a stable slug used in URLs.
//     2. getTopicForBankQuestionIndex(category, section, idx) — infer the
//        topic of a question pulled from the exam bank by its 0-based index
//        in the section array. Index ranges mirror the source-file comments.
//
//   Used by:
//     - /test/page.tsx and /test-gat/page.tsx → translate categoryPerformance
//       names into slugs for the `?topics=` URL param.
//     - /practice/test/page.tsx → tag exam-bank questions with their topic
//       so the prioritization tier can match against the requested topics.
//
// Adding a new section's sub-topic layout:
//   1. Edit the source bank file (e.g. src/data/questions/tahsili-ar.ts) and
//      add `// <Topic Name> (<count> questions)` comments before each block.
//   2. Add an entry below in SECTION_TOPIC_LAYOUT keyed `<category>:<section>`
//      with { slug, count } segments matching the order of the bank array.
//   3. If the topic uses a NEW slug, add it to the TOPIC_LABEL_TO_SLUG map
//      (both Arabic and English labels point to the same slug for parity).
//   No code changes needed beyond that — both result pages and the training
//   page consume this module dynamically.
// =============================================================================

// Known topic slugs (URL-safe, stable). Adding a new slug here is the only
// place that needs to change to introduce a new sub-topic surface.
export const TOPIC_SLUGS = [
  // Quantitative
  "algebra",
  "geometry",
  "ratios",
  "statistics",
  // Verbal
  "analogy",
  "completion",
  "comprehension",
  "contextual",
  "vocabulary",
  "antonyms",
  "odd_word",
] as const;

export type TopicSlug = (typeof TOPIC_SLUGS)[number];

const TOPIC_SLUG_SET: Set<string> = new Set(TOPIC_SLUGS);

/**
 * True when `s` is one of the known topic slugs.
 *
 * Used by /practice/test to filter the URL `?topics=` param to a known
 * vocabulary before applying any prioritization (defensive: ignores typos /
 * stale slugs from old links rather than silently producing an empty pool).
 */
export function isKnownTopicSlug(s: string): s is TopicSlug {
  return TOPIC_SLUG_SET.has(s);
}

// =============================================================================
// Display label → slug map
//
// The result pages use these labels as the human-readable category name on
// each question (Arabic for Qudrat AR, English for GAT EN). The mapping is
// many-to-one: both "الجبر" and "Algebra" point to the same slug "algebra"
// so a downstream consumer can match either bank's questions with the same
// `?topics=algebra` URL.
// =============================================================================
const TOPIC_LABEL_TO_SLUG: Record<string, TopicSlug> = {
  // ----- Arabic Qudrat (Quantitative section) -----
  "الجبر": "algebra",
  "الهندسة": "geometry",
  "النسب والتناسب": "ratios",
  "الإحصاء": "statistics",
  // ----- Arabic Qudrat (Verbal section) -----
  "التناظر اللفظي": "analogy",
  "إكمال الجمل": "completion",
  "استيعاب المقروء": "comprehension",
  "الخطأ السياقي": "contextual",
  "معاني المفردات": "vocabulary",
  "المتضادات": "antonyms",
  "المفردة الشاذة": "odd_word",
  // ----- English GAT (Quantitative section) -----
  "Algebra": "algebra",
  "Geometry": "geometry",
  "Ratios": "ratios",
  "Ratios and Proportions": "ratios",
  "Ratios & Proportions": "ratios",
  "Statistics": "statistics",
  // ----- English GAT (Verbal section) -----
  "Analogies": "analogy",
  "Sentence Completion": "completion",
  "Reading Comprehension": "comprehension",
  "Odd Word Out": "odd_word",
};

/**
 * Convert a display category label to a stable slug, or null if unknown.
 *
 * Returning null (rather than throwing or falling back to the label) lets
 * callers gracefully drop unrecognized labels from the `?topics=` URL.
 * That is the desired behavior for forward compatibility — adding a new
 * label tomorrow shouldn't crash today's button click.
 */
export function categoryNameToSlug(label: string | undefined | null): TopicSlug | null {
  if (!label) return null;
  return TOPIC_LABEL_TO_SLUG[label] ?? null;
}

// =============================================================================
// Exam-bank index → topic layout
//
// Each entry describes the order of sub-topic blocks within ONE bank section.
// Indices are 0-based and the segments must sum to (or be a prefix of) the
// section's question count. The training page uses a positional walk to
// answer "which topic does question idx belong to":
//
//   key  "gat_en:quantitative_en" → [
//     { slug: "algebra",    count: 20 }, // indices 0..19
//     { slug: "geometry",   count: 20 }, // indices 20..39
//     { slug: "ratios",     count: 10 }, // indices 40..49
//     { slug: "statistics", count: 10 }, // indices 50..59
//   ]
//
// Sections NOT listed here (Tahsili AR + SAAT EN: math/physics/chemistry/
// biology) have no sub-topic structure in the source data today — comments
// in those files are by-discipline only. For those, getTopicForBankQuestionIndex
// returns null and the training page transparently falls back to whole-section
// behavior. Adding sub-topic comments to those files later (e.g. mechanics /
// electricity / waves inside physics_ar) only requires adding a layout entry
// here; no other code changes.
// =============================================================================
type TopicSegment = { slug: TopicSlug; count: number };

const SECTION_TOPIC_LAYOUT: Record<string, TopicSegment[]> = {
  // qudrat_ar:quantitative_ar — 60 questions, 4 sub-topics × 15 each
  // (mirrors comments in src/data/questions/qudrat-ar.ts).
  "qudrat_ar:quantitative_ar": [
    { slug: "algebra", count: 15 },
    { slug: "geometry", count: 15 },
    { slug: "ratios", count: 15 },
    { slug: "statistics", count: 15 },
  ],
  // qudrat_ar:verbal_ar — 60 questions, 4 sub-topics × 15 each
  "qudrat_ar:verbal_ar": [
    { slug: "analogy", count: 15 },
    { slug: "completion", count: 15 },
    { slug: "comprehension", count: 15 },
    { slug: "contextual", count: 15 },
  ],
  // gat_en:quantitative_en — 60 questions. The source-file *comments* claim
  // 20+20+10+10 but the actual id sequence is 20+10+10+10 followed by 10
  // "Additional questions" without a sub-topic label. Layout below mirrors
  // the real id ranges (verified against src/data/questions/gat-en.ts ids
  // 1-50). The trailing 10 questions intentionally have no segment so
  // getTopicForBankQuestionIndex returns null for them — they get treated
  // as unknown topic and only surface in the non-matching tier of the
  // training pool, which is the right thing to do until they're labeled.
  "gat_en:quantitative_en": [
    { slug: "algebra", count: 20 },     // ids 1-20
    { slug: "geometry", count: 10 },    // ids 21-30
    { slug: "ratios", count: 10 },      // ids 31-40
    { slug: "statistics", count: 10 },  // ids 41-50
    // ids 51-60: "Additional questions (10 more to reach 60)" — uncategorized
  ],
  // gat_en:verbal_en — 60 questions: 20+20+20
  "gat_en:verbal_en": [
    { slug: "analogy", count: 20 },
    { slug: "completion", count: 20 },
    { slug: "comprehension", count: 20 },
  ],
  // Tahsili AR + SAAT EN sections intentionally omitted — see file header.
};

/**
 * Return the topic slug of question at `zeroBasedIndex` in the bank section,
 * or null when the section has no defined sub-topic layout.
 *
 * The walk is O(layout-segment-count) ≤ 4 in practice, so it's fine to call
 * once per question during training-pool construction.
 */
export function getTopicForBankQuestionIndex(
  category: string,
  section: string,
  zeroBasedIndex: number
): TopicSlug | null {
  const layout = SECTION_TOPIC_LAYOUT[`${category}:${section}`];
  if (!layout) return null;
  let cursor = 0;
  for (const seg of layout) {
    if (zeroBasedIndex < cursor + seg.count) return seg.slug;
    cursor += seg.count;
  }
  // Index out of range (more questions than layout describes) — return null
  // so the training page treats the question as "unknown topic" and falls
  // back to non-topic prioritization rather than crashing.
  return null;
}

/**
 * Whether a section has any defined sub-topic layout. Useful for UIs that
 * want to gate "personalize by topic" behavior.
 */
export function hasTopicLayout(category: string, section: string): boolean {
  return SECTION_TOPIC_LAYOUT[`${category}:${section}`] !== undefined;
}
