/**
 * Centralized subtype inference for practice questions.
 *
 * Subtype is a *finer-grained* slug than topic (e.g. topic "algebra"
 * → subtype "linear" / "quadratic" / "logarithm"). It is OPTIONAL:
 * when this helper returns `undefined` the rest of the system falls
 * back to topic-level behavior, so adding subtypes never breaks an
 * existing flow.
 *
 * Why a single helper:
 *   - The practice page already has rich text→subtype mapping inside
 *     `deriveSmartInfo` (Qudrat-AR Arabic patterns).
 *   - The user profile aggregator needs to bucket per subtype.
 *   - The exam-bank loaders (GAT-EN etc.) need to tag questions
 *     before they reach the diversifier.
 *   All three call sites must agree on the *same* slugs so per-subtype
 *   counters across sessions accumulate correctly. Centralizing here
 *   prevents drift.
 *
 * Slugs are intentionally COARSE (5–8 per topic, not 30+). With a few
 * dozen sessions a student typically only sees a handful of questions
 * in any given subtype; over-splitting would leave every bucket below
 * the min-sample threshold and produce no signal. The patterns below
 * cover Arabic (Qudrat / Tahsili) and English (GAT / SAAT) phrasings
 * for the same underlying skill so both languages bucket together.
 *
 * Design notes:
 *   - Order of `if` branches matters — earlier patterns win. Most
 *     specific patterns (e.g. "quadratic" via `س²` / `x²`) come
 *     before generic ones (e.g. "linear" via any `=`).
 *   - Patterns are deliberately permissive: false positives degrade
 *     gracefully into a sibling subtype within the same topic; the
 *     per-topic bucket totals are unaffected.
 *   - Returns `undefined` when no pattern matches so callers can
 *     decide whether to omit the subtype entirely (preferred — avoids
 *     polluting the counters with a noisy "general" bucket).
 */

export type SubtypeSlug = string;

/** Normalize a topic string into the canonical lowercase slug. */
function normalizeTopic(topic: string | null | undefined): string {
  return (topic ?? "").trim().toLowerCase();
}

function inferAlgebra(t: string): SubtypeSlug | undefined {
  // Quadratic / second-degree first (most specific).
  if (/س\s*²|س\^?2|x\s*²|x\^?2|quadratic/i.test(t)) return "quadratic";
  // Cubic / third-degree.
  if (/س\s*³|س\^?3|x\s*³|x\^?3|cubic/i.test(t)) return "cubic";
  // Logarithms (Arabic لو and English log/ln).
  if (/لو\u200c?₂|لو₂|لو\(|لوغاريتم|\blog\b|\bln\b|logarithm/i.test(t)) return "logarithm";
  // Absolute value.
  if (/\|[^|]+\|.*=|absolute value|\babs\(/i.test(t)) return "absolute-value";
  // Inequalities.
  if (/متباين|>|<|≥|≤|inequalit/i.test(t)) return "inequality";
  // Simplify expressions.
  if (/بسّط|تبسيط|simplify/i.test(t)) return "simplify";
  // Substitution / "if a = X, then …".
  if (/إذا كان.*?=.*?(فإن|فما|ف\s*قيمة)|if .*?=.*?(then|find|what)/i.test(t)) {
    return "substitution";
  }
  // Linear / first-degree equations (catch-all when an `=` is present).
  if (/=/.test(t)) return "linear";
  return undefined;
}

function inferGeometry(t: string): SubtypeSlug | undefined {
  if (/فيثاغورس|الوتر|pythag|hypotenuse/i.test(t)) return "pythagoras";
  if (/حجم|volume/i.test(t)) return "volume";
  if (/زاوي|زوايا|\bangle/i.test(t)) return "angles";
  if (/محيط|perimeter|circumference/i.test(t)) return "perimeter";
  if (/مساحة|\barea\b/i.test(t)) return "area";
  if (/تشابه|similar(ity)?|متطابق|congruen/i.test(t)) return "similarity";
  if (/دائرة|نصف قطر|قطر|circle|radius|diameter/i.test(t)) return "circle";
  if (/مثلث|triangle/i.test(t)) return "triangle";
  return undefined;
}

function inferRatios(t: string): SubtypeSlug | undefined {
  if (/سرعة|كم\s*\/\s*س|كم\/س|speed|km\/h|mph|distance.*time|time.*distance/i.test(t)) {
    return "speed";
  }
  if (/عمال|أيام.*?(عمل|إنجاز)|workers?.*?(days|hours|complete)/i.test(t)) {
    return "work";
  }
  if (/خصم|discount|تخفيض/i.test(t)) return "discount";
  if (/زاد.*?(\d+)\s*%|نقص.*?(\d+)\s*%|increase.*by.*?%|decrease.*by.*?%/i.test(t)) {
    return "percent-change";
  }
  if (/%|نسبة مئوية|percent|percentage/i.test(t)) return "percent";
  if (/خليط|مزيج|mixture|alloy/i.test(t)) return "mixture";
  if (/نسبة.*?:|\d+\s*:\s*\d+|ratio|proportion/i.test(t)) return "proportion";
  return undefined;
}

function inferStatistics(t: string): SubtypeSlug | undefined {
  if (/المتوسط الحسابي|متوسط|mean|average/i.test(t)) return "mean";
  if (/الوسيط|median/i.test(t)) return "median";
  if (/المنوال|mode/i.test(t)) return "mode";
  if (/المدى|\brange\b/i.test(t)) return "range";
  if (/التباين|الانحراف المعياري|variance|standard deviation|std\.?\s*dev/i.test(t)) {
    return "variance";
  }
  if (/احتمال|probability|chance/i.test(t)) return "probability";
  if (/كم طريقة|عدد الطرق|permutation|combination|arrangements?|choose/i.test(t)) {
    return "counting";
  }
  return undefined;
}

function inferVocabulary(t: string): SubtypeSlug | undefined {
  if (/عكس|ضد|antonym|opposite/i.test(t)) return "antonym";
  if (/مرادف|بمعنى|synonym|same meaning/i.test(t)) return "synonym";
  if (/المختلفة|الشاذة|odd one|does not belong/i.test(t)) return "odd-one-out";
  if (/تعريف|معنى|define|definition|meaning/i.test(t)) return "definition";
  return undefined;
}

function inferComprehension(t: string): SubtypeSlug | undefined {
  if (/استنتج|نستنتج|يمكن أن نستنتج|infer|inference|conclude|implies/i.test(t)) {
    return "inference";
  }
  if (/الفكرة الرئيسة|الفكرة الأساسية|main idea|main point|primary purpose|best title/i.test(t)) {
    return "main-idea";
  }
  if (/تفصيل|detail|according to the (passage|text)/i.test(t)) return "detail";
  return undefined;
}

function inferAnalogy(_t: string): SubtypeSlug | undefined {
  // The four banks share a single analogy format (a:b::c:?). We don't
  // split further because all analogies exercise the same skill —
  // "name the relation". A single bucket gives meaningful counters.
  return "relation";
}

function inferCompletion(_t: string): SubtypeSlug | undefined {
  return "fill-blank";
}

function inferContextual(t: string): SubtypeSlug | undefined {
  if (/خطأ نحو|grammar|grammatical/i.test(t)) return "grammar";
  if (/خطأ إملائ|spelling/i.test(t)) return "spelling";
  return "usage";
}

/**
 * Infer a subtype slug from a question's text and topic.
 *
 * @param text  The question wording (Arabic or English).
 * @param topic The topic slug (e.g. "algebra", "geometry"). Pass the
 *              same value the rest of the app uses — the function
 *              normalizes it internally.
 * @returns A coarse subtype slug, or `undefined` when no pattern
 *          matches. Callers should treat `undefined` as "no subtype"
 *          and fall back to topic-level behavior.
 */
export function inferSubtype(
  text: string,
  topic: string | null | undefined,
): SubtypeSlug | undefined {
  if (!text || typeof text !== "string") return undefined;
  const t = text;
  const topicSlug = normalizeTopic(topic);

  switch (topicSlug) {
    case "algebra":
      return inferAlgebra(t);
    case "geometry":
      return inferGeometry(t);
    case "ratios":
      return inferRatios(t);
    case "statistics":
      return inferStatistics(t);
    case "vocabulary":
      return inferVocabulary(t);
    case "comprehension":
      return inferComprehension(t);
    case "analogy":
      return inferAnalogy(t);
    case "completion":
      return inferCompletion(t);
    case "contextual":
      return inferContextual(t);
    default:
      return undefined;
  }
}
