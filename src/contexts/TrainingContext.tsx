"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

// Types for the training system
export interface QuestionRecord {
  questionId: string;
  topic: string;
  category: string;
  difficulty: "easy" | "medium" | "hard";
  isCorrect: boolean;
  answeredAt: number;
  timeSpent: number;
}

export interface TopicStats {
  topic: string;
  totalAttempts: number;
  correctAnswers: number;
  wrongAnswers: number;
  accuracy: number;
  lastAttemptAt: number;
  averageTimePerQuestion: number;
  currentStreak: number;
  bestStreak: number;
}

export interface UserTrainingState {
  // Question tracking
  seenQuestions: Set<string>;
  correctQuestions: Set<string>;
  wrongQuestions: Set<string>;

  // Topic performance
  topicStats: Map<string, TopicStats>;
  weakTopics: string[];
  strongTopics: string[];

  // Session stats
  currentDifficulty: "easy" | "medium" | "hard";
  consecutiveCorrect: number;
  consecutiveWrong: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  totalTimeSpent: number;

  // History
  questionHistory: QuestionRecord[];
}

interface TrainingContextType {
  userState: UserTrainingState;

  // Actions
  recordAnswer: (record: Omit<QuestionRecord, "answeredAt">) => void;
  markQuestionSeen: (questionId: string) => void;
  getNextDifficulty: () => "easy" | "medium" | "hard";
  getWeakTopics: () => string[];
  getTopicAccuracy: (topic: string) => number;
  shouldPrioritizeTopic: (topic: string) => boolean;
  isQuestionSeen: (questionId: string) => boolean;
  wasQuestionCorrect: (questionId: string) => boolean | null;
  resetSession: () => void;
  resetAllData: () => void;

  // Adaptive helpers
  getRecommendedTopic: () => string | null;
  getSimilarQuestionPriority: (topic: string, wasWrong: boolean) => number;
}

const initialState: UserTrainingState = {
  seenQuestions: new Set(),
  correctQuestions: new Set(),
  wrongQuestions: new Set(),
  topicStats: new Map(),
  weakTopics: [],
  strongTopics: [],
  currentDifficulty: "easy",
  consecutiveCorrect: 0,
  consecutiveWrong: 0,
  totalQuestionsAnswered: 0,
  totalCorrect: 0,
  totalTimeSpent: 0,
  questionHistory: [],
};

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

// Local storage key
const STORAGE_KEY = "dalilak_training_state";

// Helper to serialize state for storage
const serializeState = (state: UserTrainingState): string => {
  return JSON.stringify({
    seenQuestions: Array.from(state.seenQuestions),
    correctQuestions: Array.from(state.correctQuestions),
    wrongQuestions: Array.from(state.wrongQuestions),
    topicStats: Array.from(state.topicStats.entries()),
    weakTopics: state.weakTopics,
    strongTopics: state.strongTopics,
    currentDifficulty: state.currentDifficulty,
    consecutiveCorrect: state.consecutiveCorrect,
    consecutiveWrong: state.consecutiveWrong,
    totalQuestionsAnswered: state.totalQuestionsAnswered,
    totalCorrect: state.totalCorrect,
    totalTimeSpent: state.totalTimeSpent,
    questionHistory: state.questionHistory.slice(-500), // Keep last 500 records
  });
};

// Helper to deserialize state from storage
const deserializeState = (data: string): UserTrainingState => {
  try {
    const parsed = JSON.parse(data);
    return {
      seenQuestions: new Set(parsed.seenQuestions || []),
      correctQuestions: new Set(parsed.correctQuestions || []),
      wrongQuestions: new Set(parsed.wrongQuestions || []),
      topicStats: new Map(parsed.topicStats || []),
      weakTopics: parsed.weakTopics || [],
      strongTopics: parsed.strongTopics || [],
      currentDifficulty: parsed.currentDifficulty || "easy",
      consecutiveCorrect: parsed.consecutiveCorrect || 0,
      consecutiveWrong: parsed.consecutiveWrong || 0,
      totalQuestionsAnswered: parsed.totalQuestionsAnswered || 0,
      totalCorrect: parsed.totalCorrect || 0,
      totalTimeSpent: parsed.totalTimeSpent || 0,
      questionHistory: parsed.questionHistory || [],
    };
  } catch {
    return initialState;
  }
};

export function TrainingProvider({ children }: { children: ReactNode }) {
  const [userState, setUserState] = useState<UserTrainingState>(initialState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUserState(deserializeState(stored));
      }
      setIsInitialized(true);
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (isInitialized && typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, serializeState(userState));
    }
  }, [userState, isInitialized]);

  // Update weak/strong topics based on stats
  const updateTopicClassifications = useCallback((stats: Map<string, TopicStats>) => {
    const weakTopics: string[] = [];
    const strongTopics: string[] = [];

    stats.forEach((stat, topic) => {
      if (stat.totalAttempts >= 3) {
        if (stat.accuracy < 50) {
          weakTopics.push(topic);
        } else if (stat.accuracy >= 80) {
          strongTopics.push(topic);
        }
      }
    });

    return { weakTopics, strongTopics };
  }, []);

  // Record an answer
  const recordAnswer = useCallback((record: Omit<QuestionRecord, "answeredAt">) => {
    setUserState((prev) => {
      const newState = { ...prev };
      const fullRecord: QuestionRecord = {
        ...record,
        answeredAt: Date.now(),
      };

      // Update seen questions
      newState.seenQuestions = new Set(prev.seenQuestions);
      newState.seenQuestions.add(record.questionId);

      // Update correct/wrong sets
      newState.correctQuestions = new Set(prev.correctQuestions);
      newState.wrongQuestions = new Set(prev.wrongQuestions);

      if (record.isCorrect) {
        newState.correctQuestions.add(record.questionId);
        newState.wrongQuestions.delete(record.questionId);
        newState.consecutiveCorrect = prev.consecutiveCorrect + 1;
        newState.consecutiveWrong = 0;
        newState.totalCorrect = prev.totalCorrect + 1;
      } else {
        newState.wrongQuestions.add(record.questionId);
        newState.consecutiveWrong = prev.consecutiveWrong + 1;
        newState.consecutiveCorrect = 0;
      }

      // Update topic stats
      newState.topicStats = new Map(prev.topicStats);
      const existingStats = newState.topicStats.get(record.topic) || {
        topic: record.topic,
        totalAttempts: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        accuracy: 0,
        lastAttemptAt: 0,
        averageTimePerQuestion: 0,
        currentStreak: 0,
        bestStreak: 0,
      };

      const newCorrect = existingStats.correctAnswers + (record.isCorrect ? 1 : 0);
      const newWrong = existingStats.wrongAnswers + (record.isCorrect ? 0 : 1);
      const newTotal = existingStats.totalAttempts + 1;
      const newStreak = record.isCorrect ? existingStats.currentStreak + 1 : 0;

      newState.topicStats.set(record.topic, {
        ...existingStats,
        totalAttempts: newTotal,
        correctAnswers: newCorrect,
        wrongAnswers: newWrong,
        accuracy: Math.round((newCorrect / newTotal) * 100),
        lastAttemptAt: Date.now(),
        averageTimePerQuestion: Math.round(
          (existingStats.averageTimePerQuestion * (newTotal - 1) + record.timeSpent) / newTotal
        ),
        currentStreak: newStreak,
        bestStreak: Math.max(existingStats.bestStreak, newStreak),
      });

      // Update overall stats
      newState.totalQuestionsAnswered = prev.totalQuestionsAnswered + 1;
      newState.totalTimeSpent = prev.totalTimeSpent + record.timeSpent;

      // Update difficulty based on performance
      if (newState.consecutiveCorrect >= 3) {
        if (prev.currentDifficulty === "easy") {
          newState.currentDifficulty = "medium";
        } else if (prev.currentDifficulty === "medium") {
          newState.currentDifficulty = "hard";
        }
        newState.consecutiveCorrect = 0;
      } else if (newState.consecutiveWrong >= 2) {
        if (prev.currentDifficulty === "hard") {
          newState.currentDifficulty = "medium";
        } else if (prev.currentDifficulty === "medium") {
          newState.currentDifficulty = "easy";
        }
        newState.consecutiveWrong = 0;
      }

      // Update weak/strong topics
      const { weakTopics, strongTopics } = updateTopicClassifications(newState.topicStats);
      newState.weakTopics = weakTopics;
      newState.strongTopics = strongTopics;

      // Add to history
      newState.questionHistory = [...prev.questionHistory, fullRecord];

      return newState;
    });
  }, [updateTopicClassifications]);

  // Mark question as seen (without answering)
  const markQuestionSeen = useCallback((questionId: string) => {
    setUserState((prev) => {
      const newSeenQuestions = new Set(prev.seenQuestions);
      newSeenQuestions.add(questionId);
      return { ...prev, seenQuestions: newSeenQuestions };
    });
  }, []);

  // Get recommended next difficulty
  const getNextDifficulty = useCallback((): "easy" | "medium" | "hard" => {
    return userState.currentDifficulty;
  }, [userState.currentDifficulty]);

  // Get weak topics
  const getWeakTopics = useCallback((): string[] => {
    return userState.weakTopics;
  }, [userState.weakTopics]);

  // Get topic accuracy
  const getTopicAccuracy = useCallback((topic: string): number => {
    const stats = userState.topicStats.get(topic);
    return stats?.accuracy ?? 0;
  }, [userState.topicStats]);

  // Check if topic should be prioritized (it's weak)
  const shouldPrioritizeTopic = useCallback((topic: string): boolean => {
    return userState.weakTopics.includes(topic);
  }, [userState.weakTopics]);

  // Check if question was seen
  const isQuestionSeen = useCallback((questionId: string): boolean => {
    return userState.seenQuestions.has(questionId);
  }, [userState.seenQuestions]);

  // Check if question was answered correctly (null if not answered)
  const wasQuestionCorrect = useCallback((questionId: string): boolean | null => {
    if (userState.correctQuestions.has(questionId)) return true;
    if (userState.wrongQuestions.has(questionId)) return false;
    return null;
  }, [userState.correctQuestions, userState.wrongQuestions]);

  // Get recommended topic to practice
  const getRecommendedTopic = useCallback((): string | null => {
    if (userState.weakTopics.length > 0) {
      // Prioritize least practiced weak topic
      let leastPracticed = userState.weakTopics[0];
      let minAttempts = Number.POSITIVE_INFINITY;

      for (const topic of userState.weakTopics) {
        const stats = userState.topicStats.get(topic);
        if (stats && stats.totalAttempts < minAttempts) {
          minAttempts = stats.totalAttempts;
          leastPracticed = topic;
        }
      }
      return leastPracticed;
    }
    return null;
  }, [userState.weakTopics, userState.topicStats]);

  // Get priority for similar questions (used for adaptive behavior)
  const getSimilarQuestionPriority = useCallback((topic: string, wasWrong: boolean): number => {
    if (wasWrong) {
      // High priority if user got it wrong - need similar practice
      return 0.9;
    }

    const stats = userState.topicStats.get(topic);
    if (!stats) return 0.5;

    // Lower priority for strong topics
    if (stats.accuracy >= 80) return 0.3;

    // Medium priority for average topics
    if (stats.accuracy >= 50) return 0.5;

    // Higher priority for weak topics
    return 0.7;
  }, [userState.topicStats]);

  // Reset current session (keep history)
  const resetSession = useCallback(() => {
    setUserState((prev) => ({
      ...prev,
      consecutiveCorrect: 0,
      consecutiveWrong: 0,
      currentDifficulty: "easy",
    }));
  }, []);

  // Reset all data
  const resetAllData = useCallback(() => {
    setUserState(initialState);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const value: TrainingContextType = {
    userState,
    recordAnswer,
    markQuestionSeen,
    getNextDifficulty,
    getWeakTopics,
    getTopicAccuracy,
    shouldPrioritizeTopic,
    isQuestionSeen,
    wasQuestionCorrect,
    resetSession,
    resetAllData,
    getRecommendedTopic,
    getSimilarQuestionPriority,
  };

  return (
    <TrainingContext.Provider value={value}>
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error("useTraining must be used within a TrainingProvider");
  }
  return context;
}
