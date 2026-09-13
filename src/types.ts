export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  question: string;
  options: QuestionOption[];
  correctAnswerId: string;
  closestAnswerId?: string;
  correctAnswer?: string;
  closestAnswer?: string;
  aiHint: string;
  difficulty?: Difficulty;
  category?: string;
}

export interface QuestionBank {
  easy: Question[];
  medium: Question[];
  hard: Question[];
}

export interface LifelinesState {
  fiftyFifty: boolean;
  swapChallenge: boolean;
  askAi: boolean;
}

export type SubmissionStatus = 'active' | 'completed' | 'time_expired' | 'tab_switched' | 'disqualified' | 'reinstated';

export interface Submission {
  id?: string;
  name: string;
  participantId: string;
  correctAnswers: number;
  totalAttempted: number;
  timeTakenSeconds: number;
  remainingSeconds?: number;
  startedAt?: any;
  submittedAt: any;
  submissionStatus: SubmissionStatus;
  isDisqualified?: boolean;
  reinstatedAt?: any;
  lastTimeGrantMinutes?: number;
  lastTimeGrantAt?: any;
}

export interface QuizSessionState {
  participantName: string;
  participantId: string;
  activeQuestions: Question[];
  currentIndex: number;
  selectedAnswers: Record<string, string>; // questionId -> option
  hiddenOptions: Record<string, string[]>; // questionId -> options eliminated by 50-50
  usedLifelines: LifelinesState;
  swappedQuestionIds: string[];
  targetEndTime: number; // epoch ms
  totalDurationSeconds: number;
  remainingSeconds: number;
  isStarted: boolean;
  isSubmitted: boolean;
  submissionStatus: SubmissionStatus | null;
  submissionResult: Submission | null;
  askAiQuestionId?: string; // ID of the specific question where Ask AI was activated
}
