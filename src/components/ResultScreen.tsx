import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  CloudCheck,
  Zap,
} from 'lucide-react';
import type { QuizSessionState } from '../types';
import { formatTimeMMSS } from '../lib/quizEngine';
import { sounds } from '../lib/audio';

interface ResultScreenProps {
  session: QuizSessionState;
  onResetQuiz: () => void;
  onViewLeaderboard: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  session,
  onResetQuiz,
  onViewLeaderboard,
}) => {
  const [showDetailedReview, setShowDetailedReview] = useState(false);
  const result = session.submissionResult;

  const totalQuestions = session.activeQuestions.length;
  const correct = result ? result.correctAnswers : 0;
  const attempted = result ? result.totalAttempted : 0;
  const timeTakenSeconds = result ? result.timeTakenSeconds : 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
  const overallScorePercent = Math.round((correct / totalQuestions) * 100);

  const status = session.submissionStatus || 'completed';

  const statusConfig = {
    completed: {
      title: 'STRIKE RUN FINALIZED',
      desc: 'All responses successfully locked and verified.',
      badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
    },
    time_expired: {
      title: 'CHRONO EXHAUSTION (TIME EXPIRED)',
      desc: '15-minute operational limit reached. Responses auto-committed to database.',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: Clock,
    },
    tab_switched: {
      title: 'INTEGRITY BREACH DETECTED (TAB-SWITCH)',
      desc: 'Browser visibility change detected. Auto-finalized by anti-cheat sentinel protocol.',
      badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      icon: ShieldAlert,
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-in fade-in duration-300">
      {/* Result Hero Header */}
      <div className="text-center space-y-3">
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-mono font-bold uppercase tracking-widest ${statusConfig.badgeClass}`}
        >
          <StatusIcon className="w-4 h-4" />
          <span>{statusConfig.title}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 font-mono">
          DEBRIEF: <span className="text-cyan-400">{session.participantName}</span>
        </h1>

        <p className="text-sm text-slate-400 max-w-xl mx-auto">{statusConfig.desc}</p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-cyan-500/30 shadow-lg text-center">
          <div className="text-xs font-mono text-cyan-400 font-semibold mb-1 uppercase">
            Correct Score
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100">
            {correct}{' '}
            <span className="text-sm sm:text-base font-normal text-slate-500">
              / {totalQuestions}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {overallScorePercent}% Total Yield
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
          <div className="text-xs font-mono text-slate-400 font-semibold mb-1 uppercase">
            Attempted
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100">
            {attempted}{' '}
            <span className="text-sm sm:text-base font-normal text-slate-500">
              / {totalQuestions}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            {accuracy}% Precision
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
          <div className="text-xs font-mono text-amber-400 font-semibold mb-1 uppercase">
            Time Taken
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100">
            {formatTimeMMSS(timeTakenSeconds)}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Tie-Breaker Benchmark
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 text-center">
          <div className="text-xs font-mono text-purple-400 font-semibold mb-1 uppercase">
            Lifelines Used
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-100">
            {[session.usedLifelines.fiftyFifty, session.usedLifelines.swapChallenge, session.usedLifelines.askAi].filter(Boolean).length}{' '}
            <span className="text-sm sm:text-base font-normal text-slate-500">/ 3</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            Tactical Assets
          </div>
        </div>
      </div>

      {/* Cloud Sync Receipt Banner */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2.5 text-slate-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>FIREBASE FIRESTORE SYNC:</span>
          <span className="text-emerald-400 font-bold">COMMITTED TO `submissions`</span>
        </div>
        <div className="text-slate-500">
          Status Code: <span className="text-slate-300">{status}</span>
        </div>
      </div>

      {/* Navigation Actions */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <button
          id="view-leaderboard-btn"
          onClick={() => {
            sounds.playSelect();
            onViewLeaderboard();
          }}
          className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-mono text-sm font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer"
        >
          <Trophy className="w-4 h-4" />
          <span>Inspect Global Leaderboard</span>
        </button>

        <button
          id="reset-quiz-btn"
          onClick={() => {
            sounds.playSelect();
            onResetQuiz();
          }}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border border-slate-700 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>New Strike Run</span>
        </button>
      </div>

      {/* Detailed Question Review Toggle */}
      <div className="border-t border-slate-800/80 pt-8">
        <button
          id="toggle-review-btn"
          onClick={() => {
            sounds.playSelect();
            setShowDetailedReview(!showDetailedReview);
          }}
          className="w-full p-4 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono text-slate-300 uppercase tracking-wider transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 font-bold">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Comprehensive Question Review ({totalQuestions} Questions)</span>
          </div>
          {showDetailedReview ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetailedReview && (
          <div className="mt-4 space-y-4">
            {session.activeQuestions.map((q, idx) => {
              const selected = session.selectedAnswers[q.id];
              const isCorrect = selected === q.correctAnswer;
              const isUnanswered = !selected;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-2xl border transition-all ${
                    isCorrect
                      ? 'bg-emerald-950/20 border-emerald-500/30'
                      : isUnanswered
                      ? 'bg-slate-900/40 border-slate-800'
                      : 'bg-rose-950/20 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-400">Q#{idx + 1}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="font-bold flex items-center gap-1.5">
                      {isCorrect ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                        </span>
                      ) : isUnanswered ? (
                        <span className="text-slate-500">Unanswered</span>
                      ) : (
                        <span className="text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-semibold text-slate-200 mb-3">
                    {q.question}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-500 block mb-0.5">Your Response:</span>
                      <span
                        className={`font-semibold ${
                          isCorrect
                            ? 'text-emerald-400'
                            : isUnanswered
                            ? 'text-slate-500 italic'
                            : 'text-rose-400'
                        }`}
                      >
                        {selected || 'No response recorded'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                      <span className="text-slate-500 block mb-0.5">Verified Correct Answer:</span>
                      <span className="text-emerald-400 font-semibold">{q.correctAnswer}</span>
                    </div>
                  </div>

                  {q.aiHint && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/60 font-mono">
                      <span className="text-cyan-400 font-semibold">AI Conceptual Core: </span>
                      {q.aiHint}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
