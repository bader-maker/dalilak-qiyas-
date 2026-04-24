/**
 * Adaptive Training Engine
 *
 * This engine provides:
 * 1. Smart question selection (prioritize unseen, then by difficulty)
 * 2. Question variation generation when pool is exhausted
 * 3. Adaptive difficulty adjustment
 * 4. Weak topic prioritization
 * 5. Non-repetition guarantees
 */

export interface TrainingQuestion {
  id: string;
  originalId?: string; // If this is a variation
  section: string;
  category: string;
  topic: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  isVariation?: boolean;
  variationOf?: string;
  // ===== Smart training metadata (all optional, backward compatible) =====
  branch?: string;        // e.g. "equations", "circles", "main-idea"
  subtype?: string;       // finer-grained pattern within a branch (e.g. "linear-add", "circle-area")
  strategy_tag?: string;  // canonical tag identifying the solving strategy (used for diversity)
  is_common?: boolean;    // true if this is a frequently-seen exam pattern
  idea?: string;          // short label: "تبسيط" / "معادلة" / "تحليل"
  fast_method?: string;   // fastest method tied to the question
  why_important?: string; // why this type appears in exams
  wording_style?: string; // surface form: "direct", "story", "applied", "instruction", "passage"
  hint?: string;          // short thinking prompt — must NOT reveal the answer
  common_mistake?: string;// the trap students typically fall into on this pattern
  reinforcement?: string; // brief positive tip shown when the student answers correctly
}

export interface QuestionPool {
  questions: TrainingQuestion[];
  byTopic: Map<string, TrainingQuestion[]>;
  byDifficulty: Map<string, TrainingQuestion[]>;
}

export interface SelectionCriteria {
  topic?: string;
  difficulty?: "easy" | "medium" | "hard" | "all";
  excludeIds: Set<string>;
  prioritizeTopics?: string[];
  lastWrongTopic?: string;
}

export interface SelectedQuestion extends TrainingQuestion {
  selectionReason: "unseen" | "weak_topic" | "similar_practice" | "difficulty_match" | "variation" | "random";
}

// ============ QUESTION VARIATION GENERATOR ============

interface NumberRange {
  min: number;
  max: number;
}

const NUMBER_VARIATIONS: NumberRange = { min: 2, max: 100 };

/**
 * Generate a variation of an existing question
 * Changes numbers, some wording, and recalculates correct answer
 */
export function generateQuestionVariation(
  original: TrainingQuestion,
  variationIndex: number
): TrainingQuestion {
  const newId = `${original.id}_var_${variationIndex}_${Date.now()}`;

  // Try to generate a mathematical variation
  const mathVariation = tryGenerateMathVariation(original, variationIndex);
  if (mathVariation) {
    return {
      ...mathVariation,
      id: newId,
      originalId: original.id,
      isVariation: true,
      variationOf: original.id,
    };
  }

  // For non-math questions, create word/option shuffled variation
  return {
    ...original,
    id: newId,
    originalId: original.id,
    ...shuffleOptionsWithCorrect(original.options, original.correct),
    isVariation: true,
    variationOf: original.id,
  };
}

/**
 * Try to generate a mathematical variation by changing numbers
 */
function tryGenerateMathVariation(
  original: TrainingQuestion,
  variationIndex: number
): TrainingQuestion | null {
  const topic = original.topic;

  // Algebra variations
  if (topic === "algebra") {
    return generateAlgebraVariation(original, variationIndex);
  }

  // Geometry variations
  if (topic === "geometry") {
    return generateGeometryVariation(original, variationIndex);
  }

  // Ratios variations
  if (topic === "ratios") {
    return generateRatioVariation(original, variationIndex);
  }

  // Statistics variations
  if (topic === "statistics") {
    return generateStatisticsVariation(original, variationIndex);
  }

  return null;
}

function generateAlgebraVariation(
  original: TrainingQuestion,
  index: number
): TrainingQuestion {
  const patterns = [
    // Pattern: x + a = b
    {
      regex: /إذا كان س \+ (\d+) = (\d+)/,
      generate: () => {
        const a = randomInt(3, 15);
        const x = randomInt(5, 20);
        const b = x + a;
        return {
          question: `إذا كان س + ${a} = ${b}، فما قيمة س؟`,
          options: [String(x - 2), String(x - 1), String(x), String(x + 1)],
          correct: 2,
          explanation: `لإيجاد قيمة س، نطرح ${a} من طرفي المعادلة:\nس + ${a} - ${a} = ${b} - ${a}\nس = ${x}`,
        };
      },
    },
    // Pattern: ax = b
    {
      regex: /إذا كان (\d+)س = (\d+)/,
      generate: () => {
        const a = randomInt(2, 8);
        const x = randomInt(3, 15);
        const b = a * x;
        return {
          question: `إذا كان ${a}س = ${b}، فما قيمة س؟`,
          options: [String(x - 2), String(x - 1), String(x), String(x + 1)],
          correct: 2,
          explanation: `${a}س = ${b}\nنقسم الطرفين على ${a}:\nس = ${b} ÷ ${a} = ${x}`,
        };
      },
    },
    // Pattern: x² = b
    {
      regex: /إذا كان س² = (\d+)/,
      generate: () => {
        const x = randomInt(4, 12);
        const b = x * x;
        return {
          question: `إذا كان س² = ${b}، فما قيمة س؟`,
          options: [String(x - 2), String(x - 1), String(x), String(x + 1)],
          correct: 2,
          explanation: `س² = ${b}\nس = √${b} = ${x}`,
        };
      },
    },
  ];

  // Try each pattern
  for (const pattern of patterns) {
    if (pattern.regex.test(original.question)) {
      const generated = pattern.generate();
      return {
        ...original,
        ...generated,
      };
    }
  }

  // Fallback: shuffle options
  return {
    ...original,
    ...shuffleOptionsWithCorrect(original.options, original.correct),
  };
}

function generateGeometryVariation(
  original: TrainingQuestion,
  index: number
): TrainingQuestion {
  const patterns = [
    // Square area
    {
      regex: /مساحة مربع طول ضلعه (\d+)/,
      generate: () => {
        const side = randomInt(4, 15);
        const area = side * side;
        return {
          question: `مساحة مربع طول ضلعه ${side} سم تساوي:`,
          options: [
            `${area - 10} سم²`,
            `${area - 5} سم²`,
            `${area} سم²`,
            `${area + 5} سم²`,
          ],
          correct: 2,
          explanation: `مساحة المربع = طول الضلع × طول الضلع\nالمساحة = ${side} × ${side} = ${area} سم²`,
        };
      },
    },
    // Rectangle area
    {
      regex: /مساحة المستطيل الذي طوله (\d+) .* وعرضه (\d+)/,
      generate: () => {
        const length = randomInt(5, 15);
        const width = randomInt(3, 10);
        const area = length * width;
        return {
          question: `مساحة المستطيل الذي طوله ${length} سم وعرضه ${width} سم:`,
          options: [
            `${length + width} سم²`,
            `${2 * (length + width)} سم²`,
            `${area} سم²`,
            `${area * 2} سم²`,
          ],
          correct: 2,
          explanation: `مساحة المستطيل = الطول × العرض\nالمساحة = ${length} × ${width} = ${area} سم²`,
        };
      },
    },
    // Circle circumference
    {
      regex: /محيط دائرة نصف قطرها (\d+)/,
      generate: () => {
        const r = randomInt(3, 14);
        const circumference = 2 * r * (22 / 7);
        return {
          question: `محيط دائرة نصف قطرها ${r} سم يساوي (π = 22/7):`,
          options: [
            `${Math.round(circumference / 2)} سم`,
            `${Math.round(circumference)} سم`,
            `${Math.round(circumference * 1.5)} سم`,
            `${Math.round(circumference * 2)} سم`,
          ],
          correct: 1,
          explanation: `محيط الدائرة = 2 × π × نصف القطر\nالمحيط = 2 × (22/7) × ${r} = ${Math.round(circumference)} سم`,
        };
      },
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(original.question)) {
      const generated = pattern.generate();
      return {
        ...original,
        ...generated,
      };
    }
  }

  return {
    ...original,
    ...shuffleOptionsWithCorrect(original.options, original.correct),
  };
}

function generateRatioVariation(
  original: TrainingQuestion,
  index: number
): TrainingQuestion {
  const patterns = [
    // Percentage calculation
    {
      regex: /(\d+)% من (\d+)/,
      generate: () => {
        const percent = randomInt(2, 9) * 5; // 10, 15, 20, etc.
        const total = randomInt(5, 20) * 20; // 100, 120, 140, etc.
        const result = (percent / 100) * total;
        return {
          question: `${percent}% من ${total} تساوي:`,
          options: [
            String(result - 10),
            String(result),
            String(result + 10),
            String(result + 20),
          ],
          correct: 1,
          explanation: `${percent}% من ${total} = (${percent}/100) × ${total}\n= ${percent / 100} × ${total} = ${result}`,
        };
      },
    },
    // Ratio problems
    {
      regex: /نسبة.*(\d+):(\d+)/,
      generate: () => {
        const a = randomInt(2, 5);
        const b = randomInt(2, 5);
        const multiplier = randomInt(3, 8);
        const valueA = a * multiplier;
        const valueB = b * multiplier;
        return {
          question: `إذا كانت نسبة أ:ب = ${a}:${b}، وكانت قيمة أ = ${valueA}، فما قيمة ب؟`,
          options: [
            String(valueB - 4),
            String(valueB - 2),
            String(valueB),
            String(valueB + 2),
          ],
          correct: 2,
          explanation: `النسبة ${a}:${b} = ${valueA}:ب\n${a} × ${multiplier} = ${valueA}\nإذن ب = ${b} × ${multiplier} = ${valueB}`,
        };
      },
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(original.question)) {
      const generated = pattern.generate();
      return {
        ...original,
        ...generated,
      };
    }
  }

  return {
    ...original,
    ...shuffleOptionsWithCorrect(original.options, original.correct),
  };
}

function generateStatisticsVariation(
  original: TrainingQuestion,
  index: number
): TrainingQuestion {
  const patterns = [
    // Mean calculation
    {
      regex: /المتوسط الحسابي/,
      generate: () => {
        const count = 5;
        const base = randomInt(5, 15);
        const numbers = Array.from({ length: count }, (_, i) => base + i * 2);
        const sum = numbers.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        return {
          question: `المتوسط الحسابي للأعداد: ${numbers.join("، ")} هو:`,
          options: [
            String(mean - 2),
            String(mean),
            String(mean + 2),
            String(mean + 4),
          ],
          correct: 1,
          explanation: `المتوسط الحسابي = مجموع القيم ÷ عددها\n= (${numbers.join("+")}) ÷ ${count}\n= ${sum} ÷ ${count} = ${mean}`,
        };
      },
    },
    // Range
    {
      regex: /المدى/,
      generate: () => {
        const min = randomInt(3, 10);
        const max = min + randomInt(10, 25);
        const middle = Array.from({ length: 3 }, () => randomInt(min + 1, max - 1));
        const numbers = [min, ...middle, max].sort((a, b) => a - b);
        const range = max - min;
        return {
          question: `المدى للأعداد: ${numbers.join("، ")} هو:`,
          options: [
            String(range - 5),
            String(range - 2),
            String(range),
            String(range + 3),
          ],
          correct: 2,
          explanation: `المدى = أكبر قيمة - أصغر قيمة\n= ${max} - ${min} = ${range}`,
        };
      },
    },
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(original.question)) {
      const generated = pattern.generate();
      return {
        ...original,
        ...generated,
      };
    }
  }

  return {
    ...original,
    ...shuffleOptionsWithCorrect(original.options, original.correct),
  };
}

// ============ HELPER FUNCTIONS ============

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function shuffleOptionsWithCorrect(
  options: string[],
  correctIndex: number,
): { options: string[]; correct: number } {
  // Pair each option with whether it is the correct one, shuffle, then locate
  // the new index of the correct option so the caller can update `correct`.
  const pairs = options.map((opt, i) => ({ opt, isCorrect: i === correctIndex }));
  const shuffled = shuffleArray(pairs);
  return {
    options: shuffled.map(p => p.opt),
    correct: shuffled.findIndex(p => p.isCorrect),
  };
}

// ============ QUESTION SELECTION ENGINE ============

export class AdaptiveQuestionSelector {
  private pool: QuestionPool;
  private seenQuestions: Set<string>;
  private variationCounter: Map<string, number>;

  constructor(questions: TrainingQuestion[]) {
    this.pool = this.buildPool(questions);
    this.seenQuestions = new Set();
    this.variationCounter = new Map();
  }

  private buildPool(questions: TrainingQuestion[]): QuestionPool {
    const byTopic = new Map<string, TrainingQuestion[]>();
    const byDifficulty = new Map<string, TrainingQuestion[]>();

    for (const q of questions) {
      // By topic
      const topicList = byTopic.get(q.topic) || [];
      topicList.push(q);
      byTopic.set(q.topic, topicList);

      // By difficulty
      const diffList = byDifficulty.get(q.difficulty) || [];
      diffList.push(q);
      byDifficulty.set(q.difficulty, diffList);
    }

    return { questions, byTopic, byDifficulty };
  }

  /**
   * Select the next question based on criteria
   * Returns null if no suitable question found
   */
  selectQuestion(criteria: SelectionCriteria): SelectedQuestion | null {
    const { topic, difficulty, excludeIds, prioritizeTopics, lastWrongTopic } = criteria;

    // Combine all exclusions
    const allExclusions = new Set([...excludeIds, ...this.seenQuestions]);

    // Step 1: Get candidate questions
    const candidates = this.getCandidates(topic, difficulty);

    // Step 2: Filter out seen/excluded questions
    const unseenCandidates = candidates.filter(q => !allExclusions.has(q.id));

    // Step 3: If user got last question wrong, prioritize similar topic
    if (lastWrongTopic && unseenCandidates.length > 0) {
      const similarTopicQuestions = unseenCandidates.filter(q => q.topic === lastWrongTopic);
      if (similarTopicQuestions.length > 0) {
        const selected = this.weightedRandomSelect(similarTopicQuestions);
        this.seenQuestions.add(selected.id);
        return { ...selected, selectionReason: "similar_practice" };
      }
    }

    // Step 4: Prioritize weak topics if specified
    if (prioritizeTopics && prioritizeTopics.length > 0 && unseenCandidates.length > 0) {
      const weakTopicQuestions = unseenCandidates.filter(q =>
        prioritizeTopics.includes(q.topic)
      );
      if (weakTopicQuestions.length > 0) {
        const selected = this.weightedRandomSelect(weakTopicQuestions);
        this.seenQuestions.add(selected.id);
        return { ...selected, selectionReason: "weak_topic" };
      }
    }

    // Step 5: Select from unseen candidates
    if (unseenCandidates.length > 0) {
      const selected = this.weightedRandomSelect(unseenCandidates);
      this.seenQuestions.add(selected.id);
      return { ...selected, selectionReason: "unseen" };
    }

    // Step 6: All questions seen - generate variation
    if (candidates.length > 0) {
      // Pick a random question to create variation from
      const baseQuestion = this.weightedRandomSelect(candidates);
      const varCount = (this.variationCounter.get(baseQuestion.id) || 0) + 1;
      this.variationCounter.set(baseQuestion.id, varCount);

      const variation = generateQuestionVariation(baseQuestion, varCount);
      this.seenQuestions.add(variation.id);
      return { ...variation, selectionReason: "variation" };
    }

    return null;
  }

  private getCandidates(
    topic?: string,
    difficulty?: "easy" | "medium" | "hard" | "all"
  ): TrainingQuestion[] {
    let candidates = this.pool.questions;

    if (topic) {
      candidates = candidates.filter(q => q.topic === topic);
    }

    if (difficulty && difficulty !== "all") {
      candidates = candidates.filter(q => q.difficulty === difficulty);
    }

    return candidates;
  }

  private weightedRandomSelect(questions: TrainingQuestion[]): TrainingQuestion {
    // Simple random for now, could add weighting based on:
    // - Time since last seen
    // - Difficulty preference
    // - Category balance
    const index = Math.floor(Math.random() * questions.length);
    return questions[index];
  }

  /**
   * Reset seen questions (for new session)
   */
  resetSession(): void {
    this.seenQuestions.clear();
  }

  /**
   * Get count of unseen questions for a topic
   */
  getUnseenCount(topic?: string): number {
    const candidates = topic
      ? (this.pool.byTopic.get(topic) || [])
      : this.pool.questions;

    return candidates.filter(q => !this.seenQuestions.has(q.id)).length;
  }

  /**
   * Mark a question as seen externally (e.g., from stored state)
   */
  markSeen(questionId: string): void {
    this.seenQuestions.add(questionId);
  }

  /**
   * Sync with external seen questions set
   */
  syncWithExternal(seenIds: Set<string>): void {
    this.seenQuestions = new Set([...this.seenQuestions, ...seenIds]);
  }
}

// ============ TRAINING SESSION MANAGER ============

export interface TrainingSessionConfig {
  topic: string;
  section: string;
  difficulty: "easy" | "medium" | "hard" | "all";
  enableAdaptiveDifficulty: boolean;
  enableWeakTopicPriority: boolean;
  timePerQuestion: number;
}

export interface SessionState {
  currentQuestionIndex: number;
  questions: SelectedQuestion[];
  answers: (number | null)[];
  startTime: number;
  lastWrongTopic: string | null;
  currentStreak: number;
  adaptiveDifficulty: "easy" | "medium" | "hard";
}

export class TrainingSession {
  private selector: AdaptiveQuestionSelector;
  private config: TrainingSessionConfig;
  private state: SessionState;
  private weakTopics: string[];

  constructor(
    allQuestions: TrainingQuestion[],
    config: TrainingSessionConfig,
    seenQuestionIds: Set<string>,
    weakTopics: string[] = []
  ) {
    this.selector = new AdaptiveQuestionSelector(allQuestions);
    this.selector.syncWithExternal(seenQuestionIds);
    this.config = config;
    this.weakTopics = weakTopics;
    this.state = {
      currentQuestionIndex: 0,
      questions: [],
      answers: [],
      startTime: Date.now(),
      lastWrongTopic: null,
      currentStreak: 0,
      adaptiveDifficulty: config.difficulty === "all" ? "easy" : config.difficulty,
    };
  }

  /**
   * Get the next question dynamically
   */
  getNextQuestion(): SelectedQuestion | null {
    const criteria: SelectionCriteria = {
      topic: this.config.topic,
      difficulty: this.config.enableAdaptiveDifficulty
        ? this.state.adaptiveDifficulty
        : this.config.difficulty,
      excludeIds: new Set(this.state.questions.map(q => q.id)),
      prioritizeTopics: this.config.enableWeakTopicPriority ? this.weakTopics : undefined,
      lastWrongTopic: this.state.lastWrongTopic || undefined,
    };

    const question = this.selector.selectQuestion(criteria);

    if (question) {
      this.state.questions.push(question);
      this.state.answers.push(null);
    }

    return question;
  }

  /**
   * Record an answer and update state
   */
  recordAnswer(questionIndex: number, answerIndex: number, isCorrect: boolean, topic: string): void {
    this.state.answers[questionIndex] = answerIndex;

    if (isCorrect) {
      this.state.currentStreak++;
      this.state.lastWrongTopic = null;

      // Increase difficulty after 3 correct in a row
      if (this.config.enableAdaptiveDifficulty && this.state.currentStreak >= 3) {
        this.increaseDifficulty();
        this.state.currentStreak = 0;
      }
    } else {
      this.state.currentStreak = 0;
      this.state.lastWrongTopic = topic;

      // Decrease difficulty after wrong answer (if adaptive)
      if (this.config.enableAdaptiveDifficulty) {
        this.decreaseDifficulty();
      }
    }
  }

  private increaseDifficulty(): void {
    if (this.state.adaptiveDifficulty === "easy") {
      this.state.adaptiveDifficulty = "medium";
    } else if (this.state.adaptiveDifficulty === "medium") {
      this.state.adaptiveDifficulty = "hard";
    }
  }

  private decreaseDifficulty(): void {
    if (this.state.adaptiveDifficulty === "hard") {
      this.state.adaptiveDifficulty = "medium";
    } else if (this.state.adaptiveDifficulty === "medium") {
      this.state.adaptiveDifficulty = "easy";
    }
  }

  /**
   * Get current session stats
   */
  getStats(): {
    totalQuestions: number;
    answered: number;
    correct: number;
    currentStreak: number;
    currentDifficulty: string;
    timeElapsed: number;
  } {
    const correct = this.state.questions.filter((q, i) =>
      this.state.answers[i] !== null && this.state.answers[i] === q.correct
    ).length;

    return {
      totalQuestions: this.state.questions.length,
      answered: this.state.answers.filter(a => a !== null).length,
      correct,
      currentStreak: this.state.currentStreak,
      currentDifficulty: this.state.adaptiveDifficulty,
      timeElapsed: Date.now() - this.state.startTime,
    };
  }

  /**
   * Get remaining unseen questions count
   */
  getRemainingUnseenCount(): number {
    return this.selector.getUnseenCount(this.config.topic);
  }

  /**
   * Get all answered questions for review
   */
  getAnsweredQuestions(): Array<{
    question: SelectedQuestion;
    userAnswer: number | null;
    isCorrect: boolean;
  }> {
    return this.state.questions.map((q, i) => ({
      question: q,
      userAnswer: this.state.answers[i],
      isCorrect: this.state.answers[i] === q.correct,
    }));
  }
}
