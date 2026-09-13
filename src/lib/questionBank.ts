import rawQuestionsData from '../data/questions.json';
import type { Question, QuestionBank, QuestionOption, Difficulty } from '../types';

/**
 * Normalizes raw question input into standard decoupled Question objects.
 * Handles both legacy string arrays and modern QuestionOption arrays.
 */
export function normalizeQuestion(raw: any, fallbackDifficulty: Difficulty = 'medium'): Question {
  const id = String(raw.id || `q-${Math.random().toString(36).substring(2, 9)}`);
  let options: QuestionOption[] = [];

  if (Array.isArray(raw.options)) {
    if (typeof raw.options[0] === 'string') {
      // Legacy format: options is string[]
      options = raw.options.map((optText: string, idx: number) => ({
        id: `${id}-opt-${idx + 1}`,
        text: String(optText),
      }));
    } else if (typeof raw.options[0] === 'object' && raw.options[0] !== null) {
      // Modern format: options is QuestionOption[]
      options = raw.options.map((opt: any, idx: number) => ({
        id: String(opt.id || `${id}-opt-${idx + 1}`),
        text: String(opt.text || ''),
      }));
    }
  }

  // Resolve correctAnswerId
  let correctAnswerId = String(raw.correctAnswerId || '');
  let correctAnswerText = String(raw.correctAnswer || '');

  if (!correctAnswerId && correctAnswerText) {
    const matched = options.find((opt) => opt.text === correctAnswerText);
    correctAnswerId = matched ? matched.id : options[0]?.id || '';
  } else if (correctAnswerId && !correctAnswerText) {
    const matched = options.find((opt) => opt.id === correctAnswerId);
    correctAnswerText = matched ? matched.text : '';
  }

  // Resolve closestAnswerId (for 50-50 lifeline)
  let closestAnswerId = raw.closestAnswerId ? String(raw.closestAnswerId) : undefined;
  let closestAnswerText = raw.closestAnswer ? String(raw.closestAnswer) : undefined;

  if (!closestAnswerId && closestAnswerText) {
    const matched = options.find((opt) => opt.text === closestAnswerText);
    closestAnswerId = matched ? matched.id : undefined;
  } else if (closestAnswerId && !closestAnswerText) {
    const matched = options.find((opt) => opt.id === closestAnswerId);
    closestAnswerText = matched ? matched.text : undefined;
  }

  // If closest answer is not specified, select any other option different from correctAnswer
  if (!closestAnswerId) {
    const other = options.find((opt) => opt.id !== correctAnswerId);
    if (other) {
      closestAnswerId = other.id;
      closestAnswerText = other.text;
    }
  }

  return {
    id,
    question: String(raw.question || ''),
    options,
    correctAnswerId,
    closestAnswerId,
    correctAnswer: correctAnswerText,
    closestAnswer: closestAnswerText,
    aiHint: String(raw.aiHint || ''),
    difficulty: (raw.difficulty as Difficulty) || fallbackDifficulty,
    category: raw.category ? String(raw.category) : undefined,
  };
}

/**
 * Normalizes an entire QuestionBank.
 */
export function normalizeQuestionBank(rawBank: any): QuestionBank {
  return {
    easy: (rawBank.easy || []).map((q: any) => normalizeQuestion(q, 'easy')),
    medium: (rawBank.medium || []).map((q: any) => normalizeQuestion(q, 'medium')),
    hard: (rawBank.hard || []).map((q: any) => normalizeQuestion(q, 'hard')),
  };
}

// In-memory active question bank (defaults to bundled questions.json)
let activeQuestionBank: QuestionBank = normalizeQuestionBank(rawQuestionsData);

/**
 * Get the current active question bank.
 */
export function getQuestionBank(): QuestionBank {
  return activeQuestionBank;
}

/**
 * Extensibility hook: Hot-swap or update the question bank dynamically at runtime.
 */
export function setQuestionBank(newBank: any): void {
  activeQuestionBank = normalizeQuestionBank(newBank);
}
