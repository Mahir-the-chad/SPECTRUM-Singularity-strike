export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  closestAnswer: string;
  aiHint: string;
  difficulty?: Difficulty;
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

export type SubmissionStatus = 'completed' | 'time_expired' | 'tab_switched';

export interface Submission {
  id?: string;
  name: string;
  correctAnswers: number;
  totalAttempted: number;
  timeTakenSeconds: number;
  submittedAt: any;
  submissionStatus: SubmissionStatus;
}

export interface QuizSessionState {
  participantName: string;
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
}
