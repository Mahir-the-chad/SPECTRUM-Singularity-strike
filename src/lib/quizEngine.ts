import rawQuestionsData from '../data/questions.json';
import type {
  Question,
  QuestionBank,
  QuizSessionState,
  LifelinesState,
  Submission,
  SubmissionStatus,
  Difficulty,
} from '../types';

export const TOTAL_QUIZ_DURATION_SECONDS = 15 * 60; // 15 minutes = 900 seconds
export const QUESTIONS_PER_DIFFICULTY = 5; // 5 easy, 5 medium, 5 hard = 15 questions total
export const LOCAL_STORAGE_SESSION_KEY = 'singularity_strike_session_v1';

const typedQuestionBank: QuestionBank = rawQuestionsData as QuestionBank;

// Shuffle array using Fisher-Yates
export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate randomized questions while preserving category balance
 */
export function generateBalancedQuestions(): Question[] {
  const easyShuffled = shuffleArray(
    (typedQuestionBank.easy || []).map((q) => ({ ...q, difficulty: 'easy' as Difficulty }))
  );
  const mediumShuffled = shuffleArray(
    (typedQuestionBank.medium || []).map((q) => ({ ...q, difficulty: 'medium' as Difficulty }))
  );
  const hardShuffled = shuffleArray(
    (typedQuestionBank.hard || []).map((q) => ({ ...q, difficulty: 'hard' as Difficulty }))
  );

  const selectedEasy = easyShuffled.slice(0, QUESTIONS_PER_DIFFICULTY);
  const selectedMedium = mediumShuffled.slice(0, QUESTIONS_PER_DIFFICULTY);
  const selectedHard = hardShuffled.slice(0, QUESTIONS_PER_DIFFICULTY);

  // Combine in progressive tier or randomized order with difficulty tags
  return [...selectedEasy, ...selectedMedium, ...selectedHard];
}

/**
 * Initialize a new session
 */
export function createNewSession(participantName: string): QuizSessionState {
  const activeQuestions = generateBalancedQuestions();
  const now = Date.now();
  const targetEndTime = now + TOTAL_QUIZ_DURATION_SECONDS * 1000;

  const initialState: QuizSessionState = {
    participantName: participantName.trim(),
    activeQuestions,
    currentIndex: 0,
    selectedAnswers: {},
    hiddenOptions: {},
    usedLifelines: {
      fiftyFifty: false,
      swapChallenge: false,
      askAi: false,
    },
    swappedQuestionIds: [],
    targetEndTime,
    totalDurationSeconds: TOTAL_QUIZ_DURATION_SECONDS,
    remainingSeconds: TOTAL_QUIZ_DURATION_SECONDS,
    isStarted: true,
    isSubmitted: false,
    submissionStatus: null,
    submissionResult: null,
  };

  saveSessionToStorage(initialState);
  return initialState;
}

/**
 * Load persisted session from localStorage
 */
export function loadPersistedSession(): QuizSessionState | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (!raw) return null;

    const state: QuizSessionState = JSON.parse(raw);
    if (!state.isStarted) return null;

    // If already submitted, return the completed state
    if (state.isSubmitted) {
      return state;
    }

    // Re-calculate remaining seconds from wall clock targetEndTime
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((state.targetEndTime - now) / 1000));
    state.remainingSeconds = remaining;

    return state;
  } catch (err) {
    console.error('Error restoring session from localStorage:', err);
    return null;
  }
}

/**
 * Save session state to localStorage
 */
export function saveSessionToStorage(state: QuizSessionState) {
  try {
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving session to localStorage:', err);
  }
}

/**
 * Clear session from localStorage
 */
export function clearStoredSession() {
  try {
    localStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  } catch (e) {
    console.error(e);
  }
}

/**
 * Revoke disqualification for a session and resume countdown from where the participant left off
 */
export function reinstateDisqualifiedSession(session: QuizSessionState): QuizSessionState {
  // Ensure remainingSeconds is at least 1 second (default to 60 if somehow non-positive)
  const remaining = session.remainingSeconds > 0
    ? session.remainingSeconds
    : Math.max(1, session.totalDurationSeconds - (session.submissionResult?.timeTakenSeconds ?? 0));

  const targetEndTime = Date.now() + remaining * 1000;

  const reinstated: QuizSessionState = {
    ...session,
    isStarted: true,
    isSubmitted: false,
    submissionStatus: null,
    submissionResult: null,
    remainingSeconds: remaining,
    targetEndTime,
  };

  saveSessionToStorage(reinstated);
  return reinstated;
}

/**
 * Calculate 50-50 eliminated options
 * "Instantly hides two incorrect options, leaving only the correctAnswer and the closestAnswer"
 */
export function calculateFiftyFiftyHiddenOptions(question: Question): string[] {
  const keep = new Set([question.correctAnswer, question.closestAnswer]);
  // The two incorrect options that are NOT in keep
  return question.options.filter((opt) => !keep.has(opt)).slice(0, 2);
}

/**
 * Swap current question with a fresh un-attempted question of the same difficulty
 */
export function getSwapReplacement(
  currentQuestion: Question,
  activeQuestions: Question[],
  alreadySwappedIds: string[]
): Question | null {
  const diff = currentQuestion.difficulty || 'medium';
  const pool = (typedQuestionBank[diff] || []).map((q) => ({
    ...q,
    difficulty: diff as Difficulty,
  }));

  const activeIds = new Set(activeQuestions.map((q) => q.id));
  const swappedIds = new Set(alreadySwappedIds);

  const available = pool.filter((q) => !activeIds.has(q.id) && !swappedIds.has(q.id));

  if (available.length === 0) {
    // Fallback if somehow all in category are active/swapped
    const anyAvailable = pool.filter((q) => q.id !== currentQuestion.id);
    return anyAvailable.length > 0
      ? shuffleArray(anyAvailable)[0]
      : null;
  }

  return shuffleArray(available)[0];
}

/**
 * Compute submission statistics
 */
export function computeQuizScore(
  questions: Question[],
  selectedAnswers: Record<string, string>,
  remainingSeconds: number,
  totalDurationSeconds: number,
  participantName: string,
  submissionStatus: SubmissionStatus
): Omit<Submission, 'id' | 'submittedAt'> {
  let correctAnswers = 0;
  let totalAttempted = 0;

  for (const q of questions) {
    const selected = selectedAnswers[q.id];
    if (selected !== undefined && selected !== null && selected !== '') {
      totalAttempted++;
      if (selected === q.correctAnswer) {
        correctAnswers++;
      }
    }
  }

  const timeTakenSeconds = Math.max(
    0,
    Math.min(totalDurationSeconds, totalDurationSeconds - remainingSeconds)
  );

  return {
    name: participantName || 'Anonymous Operative',
    correctAnswers,
    totalAttempted,
    timeTakenSeconds,
    remainingSeconds: Math.max(0, Math.floor(remainingSeconds)),
    submissionStatus,
  };
}

/**
 * Format seconds to MM:SS
 */
export function formatTimeMMSS(seconds: number): string {
  const clamped = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
