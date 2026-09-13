import { getQuestionBank } from './questionBank';
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
export const QUESTIONS_DISTRIBUTION = { easy: 12, medium: 6, hard: 2 }; // 20 questions total
export const LOCAL_STORAGE_SESSION_KEY = 'singularity_strike_session_v1';

// Non-mutating Fisher-Yates array shuffle
export function shuffleArray<T>(array: readonly T[] | T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Generate randomized questions: 12 Easy, 6 Medium, 2 Hard (20 total)
 * Shuffles questions pool and randomizes choices order per question without mutation.
 */
export function generateBalancedQuestions(): Question[] {
  const bank = getQuestionBank();

  const easyShuffled = shuffleArray(
    (bank.easy || []).map((q) => ({
      ...q,
      difficulty: 'easy' as Difficulty,
      options: shuffleArray(q.options),
    }))
  );
  const mediumShuffled = shuffleArray(
    (bank.medium || []).map((q) => ({
      ...q,
      difficulty: 'medium' as Difficulty,
      options: shuffleArray(q.options),
    }))
  );
  const hardShuffled = shuffleArray(
    (bank.hard || []).map((q) => ({
      ...q,
      difficulty: 'hard' as Difficulty,
      options: shuffleArray(q.options),
    }))
  );

  const selectedEasy = easyShuffled.slice(0, QUESTIONS_DISTRIBUTION.easy);
  const selectedMedium = mediumShuffled.slice(0, QUESTIONS_DISTRIBUTION.medium);
  const selectedHard = hardShuffled.slice(0, QUESTIONS_DISTRIBUTION.hard);

  // Combine in progressive tier: 12 easy -> 6 medium -> 2 hard
  return [...selectedEasy, ...selectedMedium, ...selectedHard];
}

/**
 * Initialize a new session with Participant Name and Participant ID
 */
export function createNewSession(participantName: string, participantId: string = ''): QuizSessionState {
  const activeQuestions = generateBalancedQuestions();
  const now = Date.now();
  const targetEndTime = now + TOTAL_QUIZ_DURATION_SECONDS * 1000;
  const finalId = participantId.trim() || 'OP-' + Math.floor(1000 + Math.random() * 9000);

  const initialState: QuizSessionState = {
    participantName: participantName.trim(),
    participantId: finalId,
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
    askAiQuestionId: undefined,
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
    if (!state.participantId) {
      state.participantId = 'OP-' + Math.floor(1000 + Math.random() * 9000);
    }

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
 * Extend countdown timer for an active or reinstated participant session
 */
export function extendSessionTime(
  session: QuizSessionState,
  addedTime: number,
  isMinutes: boolean = false
): QuizSessionState {
  const addedSeconds = isMinutes ? addedTime * 60 : addedTime;
  const currentRemaining = session.remainingSeconds > 0 ? session.remainingSeconds : 0;
  const newRemaining = currentRemaining + addedSeconds;
  const newTotal = (session.totalDurationSeconds || TOTAL_QUIZ_DURATION_SECONDS) + addedSeconds;
  const newTargetEndTime = Date.now() + newRemaining * 1000;

  const updated: QuizSessionState = {
    ...session,
    remainingSeconds: newRemaining,
    totalDurationSeconds: newTotal,
    targetEndTime: newTargetEndTime,
    // If the session was stopped due to time expiration, allow immediate resumption
    isSubmitted: session.submissionStatus === 'time_expired' ? false : session.isSubmitted,
    submissionStatus: session.submissionStatus === 'time_expired' ? null : session.submissionStatus,
  };

  saveSessionToStorage(updated);
  return updated;
}

/**
 * Calculate 50-50 eliminated options
 * Instantly eliminates two incorrect options, leaving only the correctAnswer and the closestAnswer.
 * Returns array of eliminated option IDs.
 */
export function calculateFiftyFiftyHiddenOptions(question: Question): string[] {
  const keepIds = new Set([question.correctAnswerId, question.closestAnswerId]);
  const keepTexts = new Set([question.correctAnswer, question.closestAnswer]);

  return question.options
    .filter((opt) => !keepIds.has(opt.id) && !keepTexts.has(opt.text))
    .slice(0, 2)
    .map((opt) => opt.id);
}

/**
 * Swap current question with a fresh un-attempted question of the same difficulty.
 * Also randomizes the order of choices on the replacement question.
 */
export function getSwapReplacement(
  currentQuestion: Question,
  activeQuestions: Question[],
  alreadySwappedIds: string[]
): Question | null {
  const bank = getQuestionBank();
  const diff = currentQuestion.difficulty || 'medium';
  const pool = (bank[diff] || []).map((q) => ({
    ...q,
    difficulty: diff as Difficulty,
  }));

  const activeIds = new Set(activeQuestions.map((q) => q.id));
  const swappedIds = new Set(alreadySwappedIds);

  const available = pool.filter((q) => !activeIds.has(q.id) && !swappedIds.has(q.id));

  let chosen: Question | null = null;
  if (available.length > 0) {
    chosen = shuffleArray(available)[0];
  } else {
    // Fallback if somehow all in category are active/swapped
    const anyAvailable = pool.filter((q) => q.id !== currentQuestion.id);
    chosen = anyAvailable.length > 0 ? shuffleArray(anyAvailable)[0] : null;
  }

  if (!chosen) return null;

  return {
    ...chosen,
    options: shuffleArray(chosen.options),
  };
}

/**
 * Compute submission statistics with decoupled option ID validation.
 */
export function computeQuizScore(
  questions: Question[],
  selectedAnswers: Record<string, string>,
  remainingSeconds: number,
  totalDurationSeconds: number,
  participantName: string,
  participantId: string,
  submissionStatus: SubmissionStatus
): Omit<Submission, 'id' | 'submittedAt'> {
  let correctAnswers = 0;
  let totalAttempted = 0;

  for (const q of questions) {
    const selected = selectedAnswers[q.id];
    if (selected !== undefined && selected !== null && selected !== '') {
      totalAttempted++;
      const isCorrect =
        selected === q.correctAnswerId ||
        selected === q.correctAnswer ||
        q.options.find((o) => o.id === selected)?.text === q.correctAnswer;
      if (isCorrect) {
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
    participantId: participantId || 'N/A',
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
