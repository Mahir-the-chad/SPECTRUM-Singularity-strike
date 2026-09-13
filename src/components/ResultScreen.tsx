import React, { useState } from 'react';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles,
  Zap,
} from 'lucide-react';
import type { QuizSessionState } from '../types';
import { formatTimeMMSS } from '../lib/quizEngine';
import { sounds } from '../lib/audio';

interface ResultScreenProps {
  session: QuizSessionState;
  onViewLeaderboard: () => void;
  onResetQuiz?: () => void;
  onResumeQuiz?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  session,
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
      badgeClass: 'bg-[#221E12] text-[#FFD000] border-[#FFD000]',
      icon: CheckCircle2,
    },
    time_expired: {
      title: 'CHRONO EXHAUSTION (TIME EXPIRED)',
      desc: '15-minute operational limit reached. Responses auto-committed to database.',
      badgeClass: 'bg-[#221E12] text-[#E59500] border-[#E59500]',
      icon: Clock,
    },
    tab_switched: {
      title: 'INTEGRITY BREACH DETECTED (TAB-SWITCH)',
      desc: 'Browser visibility change detected. Auto-finalized by anti-cheat sentinel protocol.',
      badgeClass: 'bg-[#221E12] text-[#E59500] border-[#E59500]',
      icon: ShieldAlert,
    },
  }[status];

  const StatusIcon = statusConfig.icon;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8 animate-in fade-in duration-200 font-mono">
      {/* Result Hero Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 border-2 text-xs font-mono font-bold uppercase tracking-widest ${statusConfig.badgeClass} shadow-[3px_3px_0px_#000000]`}
        >
          <StatusIcon className="w-4 h-4" />
          <span>{statusConfig.title}</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#FFF6D1] font-mono">
          DEBRIEF: <span className="text-[#FFD000]">{session.participantName}</span>
        </h1>
        {session.participantId && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#18160E] border-2 border-[#423A20] text-xs font-mono text-[#FFD000] shadow-[2px_2px_0px_#000000]">
            <span className="text-[#A89F81]">ID:</span>
            <span className="font-bold">{session.participantId}</span>
          </div>
        )}

        <p className="text-sm text-[#A89F81] max-w-xl mx-auto">{statusConfig.desc}</p>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 bg-[#18160E] border-2 border-[#FFD000] shadow-[4px_4px_0px_#000000] text-center">
          <div className="text-xs font-mono text-[#FFD000] font-bold mb-1 uppercase">
            Correct Score
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#FFF6D1]">
            {correct}{' '}
            <span className="text-sm sm:text-base font-normal text-[#A89F81]">
              / {totalQuestions}
            </span>
          </div>
          <div className="text-[11px] text-[#A89F81] font-mono mt-1">
            {overallScorePercent}% Total Yield
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[#18160E] border-2 border-[#423A20] shadow-[4px_4px_0px_#000000] text-center">
          <div className="text-xs font-mono text-[#A89F81] font-bold mb-1 uppercase">
            Attempted
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#FFF6D1]">
            {attempted}{' '}
            <span className="text-sm sm:text-base font-normal text-[#A89F81]">
              / {totalQuestions}
            </span>
          </div>
          <div className="text-[11px] text-[#A89F81] font-mono mt-1">
            {accuracy}% Precision
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[#18160E] border-2 border-[#423A20] shadow-[4px_4px_0px_#000000] text-center">
          <div className="text-xs font-mono text-[#FFE853] font-bold mb-1 uppercase">
            Time Taken
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#FFF6D1]">
            {formatTimeMMSS(timeTakenSeconds)}
          </div>
          <div className="text-[11px] text-[#A89F81] font-mono mt-1">
            Tie-Breaker Benchmark
          </div>
        </div>

        <div className="p-4 sm:p-5 bg-[#18160E] border-2 border-[#423A20] shadow-[4px_4px_0px_#000000] text-center">
          <div className="text-xs font-mono text-[#E59500] font-bold mb-1 uppercase">
            Lifelines Used
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold font-mono text-[#FFF6D1]">
            {[session.usedLifelines.fiftyFifty, session.usedLifelines.swapChallenge, session.usedLifelines.askAi].filter(Boolean).length}{' '}
            <span className="text-sm sm:text-base font-normal text-[#A89F81]">/ 3</span>
          </div>
          <div className="text-[11px] text-[#A89F81] font-mono mt-1">
            Tactical Assets
          </div>
        </div>
      </div>

      {/* Tab-Switch Disqualification Notice & Revocation Status */}
      {status === 'tab_switched' && (
        <div className="p-5 bg-[#221E12] border-2 border-[#E59500] shadow-[4px_4px_0px_#000000] flex items-start gap-3">
          <div className="p-2 bg-[#0D0C07] text-[#E59500] border border-[#E59500] shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-[#E59500] uppercase">
              Anti-Cheat Sentinel Disqualification
            </h3>
            <p className="text-xs text-[#FFF6D1] font-mono mt-1 leading-relaxed max-w-2xl">
              Session was locked due to browser window tab-switch detection. The competition administrator can revoke your disqualification from the Command Center, which immediately restores your active session and countdown timer ({formatTimeMMSS(session.remainingSeconds)} banked).
            </p>
          </div>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex items-center justify-center pt-2">
        <button
          id="view-leaderboard-btn"
          onClick={() => {
            sounds.playSelect();
            onViewLeaderboard();
          }}
          className="w-full sm:w-auto px-8 py-3.5 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-sm font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-2 border-[#FFD000] shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none cursor-pointer"
        >
          <Trophy className="w-4 h-4" />
          <span>Inspect Global Leaderboard</span>
        </button>
      </div>

      {/* Detailed Question Review Toggle */}
      <div className="border-t-2 border-[#423A20] pt-8">
        <button
          id="toggle-review-btn"
          onClick={() => {
            sounds.playSelect();
            setShowDetailedReview(!showDetailedReview);
          }}
          className="w-full p-4 rounded-none bg-[#18160E] hover:bg-[#221E12] border-2 border-[#423A20] flex items-center justify-between text-xs font-mono text-[#FFF6D1] uppercase tracking-wider transition-colors cursor-pointer shadow-[3px_3px_0px_#000000]"
        >
          <div className="flex items-center gap-2 font-bold text-[#FFD000]">
            <Zap className="w-4 h-4 text-[#FFD000]" />
            <span>Comprehensive Question Review ({totalQuestions} Questions)</span>
          </div>
          {showDetailedReview ? <ChevronUp className="w-4 h-4 text-[#FFD000]" /> : <ChevronDown className="w-4 h-4 text-[#FFD000]" />}
        </button>

        {showDetailedReview && (
          <div className="mt-4 flex flex-col gap-4">
            {session.activeQuestions.map((q, idx) => {
              const selected = session.selectedAnswers[q.id];
              const selectedOption = q.options.find((o) => o.id === selected || o.text === selected);
              const selectedText = selectedOption ? selectedOption.text : selected;

              const isCorrect =
                selected === q.correctAnswerId ||
                selected === q.correctAnswer ||
                (selectedText && selectedText === q.correctAnswer);
              const isUnanswered = !selected;

              const correctOption = q.options.find((o) => o.id === q.correctAnswerId);
              const correctText = correctOption?.text || q.correctAnswer;

              return (
                <div
                  key={q.id}
                  className={`p-5 rounded-none border-2 transition-all shadow-[3px_3px_0px_#000000] ${
                    isCorrect
                      ? 'bg-[#18160E] border-[#FFD000]'
                      : isUnanswered
                      ? 'bg-[#18160E] border-[#423A20]'
                      : 'bg-[#221E12] border-[#E59500]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#FFD000]">Q#{idx + 1}</span>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-[#0D0C07] border border-[#423A20] text-[#A89F81]">
                        {q.difficulty}
                      </span>
                    </div>

                    <div className="font-bold flex items-center gap-1.5">
                      {isCorrect ? (
                        <span className="text-[#FFD000] flex items-center gap-1 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD000]" /> Correct (+1)
                        </span>
                      ) : isUnanswered ? (
                        <span className="text-[#A89F81]">Unanswered</span>
                      ) : (
                        <span className="text-[#E59500] flex items-center gap-1 font-bold">
                          <XCircle className="w-3.5 h-3.5 text-[#E59500]" /> Incorrect
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-[#FFF6D1] mb-3">
                    {q.question}
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono mb-3">
                    <div className="p-2.5 bg-[#0D0C07] border border-[#423A20]">
                      <span className="text-[#A89F81] block mb-0.5">Your Response:</span>
                      <span
                        className={`font-bold ${
                          isCorrect
                            ? 'text-[#FFD000]'
                            : isUnanswered
                            ? 'text-[#A89F81] italic'
                            : 'text-[#E59500]'
                        }`}
                      >
                        {selectedText || 'No response recorded'}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#0D0C07] border border-[#423A20]">
                      <span className="text-[#A89F81] block mb-0.5">Verified Correct Answer:</span>
                      <span className="text-[#FFE853] font-bold">{correctText}</span>
                    </div>
                  </div>

                  {q.aiHint && (
                    <div className="text-[11px] text-[#FFF6D1] bg-[#0D0C07] p-2.5 border border-[#423A20] font-mono">
                      <span className="text-[#FFD000] font-bold">AI Conceptual Core: </span>
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
