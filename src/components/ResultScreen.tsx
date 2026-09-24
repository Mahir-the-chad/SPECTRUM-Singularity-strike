import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import type { QuizSessionState } from '../types';
import { formatTimeMMSS } from '../lib/quizEngine';

interface ResultScreenProps {
  session: QuizSessionState;
  onViewLeaderboard?: () => void;
  onResetQuiz?: () => void;
  onResumeQuiz?: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  session,
}) => {
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
    </div>
  );
};
