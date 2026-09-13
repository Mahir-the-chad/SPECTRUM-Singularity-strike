import React, { useState } from 'react';
import {
  BookOpen,
  Clock,
  Zap,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Bot,
  User,
  Hash,
  RefreshCw,
} from 'lucide-react';
import { SpectrumLogo } from './SpectrumLogo';
import { sounds } from '../lib/audio';
import { checkParticipantDisqualification } from '../lib/firebase';

interface RulesPageProps {
  participantName: string;
  participantId: string;
  onInitializeStrikeRun: () => void;
  onBackToRegistration: () => void;
}

export const RulesPage: React.FC<RulesPageProps> = ({
  participantName,
  participantId,
  onInitializeStrikeRun,
  onBackToRegistration,
}) => {
  const [agreed, setAgreed] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [disqualificationWarning, setDisqualificationWarning] = useState('');

  const handleStart = async () => {
    if (!agreed || isVerifying) return;

    setIsVerifying(true);
    setDisqualificationWarning('');

    try {
      const disqResult = await checkParticipantDisqualification(participantId);
      setIsVerifying(false);

      if (disqResult.isDisqualified) {
        sounds.playWarning();
        setDisqualificationWarning(
          'Your account has been disqualified due to a tab-switch or policy violation. Please contact an admin to revoke your disqualification.'
        );
        return;
      }

      sounds.playSelect();
      onInitializeStrikeRun();
    } catch (e) {
      setIsVerifying(false);
      sounds.playSelect();
      onInitializeStrikeRun();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 py-4 flex-1 flex flex-col items-center justify-center font-mono my-auto">
      {/* Viewport-Constrained Directives Card */}
      <div className="w-full max-w-3xl max-h-[86vh] sm:max-h-[88vh] bg-[#18160E] border-2 border-[#423A20] shadow-[6px_6px_0px_#000000] flex flex-col overflow-hidden">
        {/* Pinned Card Header */}
        <div className="p-4 sm:p-5 border-b-2 border-[#423A20] bg-[#18160E] shrink-0 flex flex-col gap-3">
          {/* Top Bar with Back Link and Participant Identity Chip */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <button
              id="rules-back-btn"
              type="button"
              onClick={() => {
                sounds.playSelect();
                onBackToRegistration();
              }}
              className="flex items-center gap-2 text-xs font-mono text-[#A89F81] hover:text-[#FFD000] transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Edit Registration Info</span>
            </button>

            <div className="flex items-center gap-2.5 px-3 py-1.5 bg-[#0D0C07] border border-[#423A20] font-mono text-xs text-[#FFF6D1] shadow-inner">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FFD000]" />
                <span className="text-[#FFF6D1] font-bold">{participantName}</span>
              </div>
              <span className="text-[#423A20]">|</span>
              <div className="flex items-center gap-1.5 text-[#FFD000]">
                <Hash className="w-3.5 h-3.5" />
                <span className="font-bold">{participantId}</span>
              </div>
            </div>
          </div>

          {/* Headline & Protocol Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#423A20]/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-[#221E12] border border-[#FFD000] text-[#FFD000] text-[10px] font-mono font-bold uppercase tracking-widest shadow-[2px_2px_0px_#000000]">
                  Protocol Directives
                </span>
                <span className="text-[11px] text-[#A89F81] font-mono">Spectrum 5.0</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase text-[#FFF6D1] tracking-tight font-mono mt-1">
                Arena Rules &amp; <span className="text-[#FFD000]">Guidelines</span>
              </h1>
            </div>
            <p className="text-xs text-[#A89F81] hidden sm:block max-w-xs text-right leading-tight">
              Review format, tactical lifelines, and anti-cheat policies.
            </p>
          </div>
        </div>

        {/* Scrollable Directives Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs font-mono text-[#FFF6D1]">
          {/* On-Screen Disqualification Warning Banner */}
          {disqualificationWarning && (
            <div
              id="rules-disqualification-alert"
              className="p-4 bg-[#221E12] border-2 border-[#E59500] text-[#FFF6D1] flex flex-col gap-2 shadow-[3px_3px_0px_#000000]"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-[#E59500] shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold uppercase tracking-wider text-[#FFD000] text-xs font-mono">
                    SECURITY CLEARANCE REVOKED
                  </span>
                  <p className="text-[#FFF6D1] text-xs leading-relaxed font-mono">
                    {disqualificationWarning}
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono text-[#A89F81] pt-1 border-t border-[#423A20]">
                Locked Participant ID: <strong className="text-[#FFD000] uppercase">{participantId}</strong>
              </div>
            </div>
          )}

          {/* Section 1: Quiz Structure & Format */}
          <div className="p-4 bg-[#0D0C07] border-2 border-[#423A20] space-y-3">
            <div className="flex items-center gap-2 text-[#FFD000] font-bold uppercase tracking-wider text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-[#FFD000]" />
              <span>1. Quiz Structure &amp; Telemetry</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-[#A89F81]">
              <div className="p-2.5 bg-[#18160E] border border-[#423A20]">
                <strong className="text-[#FFF6D1] block mb-0.5">20 Questions Total:</strong>
                12 Easy, 6 Medium, 2 Hard multi-disciplinary technical problems.
              </div>
              <div className="p-2.5 bg-[#18160E] border border-[#423A20]">
                <strong className="text-[#FFF6D1] block mb-0.5">4 Core Categories:</strong>
                Algorithms, AI &amp; ML, Discrete Logic, and Systems Engineering.
              </div>
              <div className="p-2.5 bg-[#18160E] border border-[#423A20]">
                <strong className="text-[#FFF6D1] block mb-0.5">15-Minute Countdown:</strong>
                900s server clock starts on initiation. Auto-submits on expiry.
              </div>
              <div className="p-2.5 bg-[#18160E] border border-[#423A20]">
                <strong className="text-[#FFF6D1] block mb-0.5">Scoring System:</strong>
                +1 mark per correct answer. 0 marks for incorrect (no negative marking).
              </div>
            </div>
          </div>

          {/* Section 2: 3 Strategic Lifelines */}
          <div className="p-4 bg-[#0D0C07] border-2 border-[#423A20] space-y-3">
            <div className="flex items-center gap-2 text-[#FFD000] font-bold uppercase tracking-wider text-xs sm:text-sm">
              <Zap className="w-4 h-4 text-[#FFD000]" />
              <span>2. Strategic Lifelines (Single-Use Each)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 bg-[#18160E] border border-[#423A20] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-bold text-[#FFD000]">
                  <span className="px-1.5 py-0.5 bg-[#FFD000] text-[#0D0C07] text-[10px]">50:50</span>
                  <span>50-50 Purge</span>
                </div>
                <p className="text-[#A89F81] text-[11px] leading-relaxed">
                  Eliminates 2 incorrect options, preserving only the correct and closest choice.
                </p>
              </div>

              <div className="p-3 bg-[#18160E] border border-[#423A20] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-bold text-[#E59500]">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Swap Challenge</span>
                </div>
                <p className="text-[#A89F81] text-[11px] leading-relaxed">
                  Replaces the active question with an unattempted question of identical difficulty.
                </p>
              </div>

              <div className="p-3 bg-[#18160E] border border-[#423A20] flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-bold text-[#FFE853]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Hint Lifeline</span>
                </div>
                <p className="text-[#A89F81] text-[11px] leading-relaxed">
                  Transmits a conceptual neural clue without revealing the direct answer.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Sentinel Security & Tab-Switch Defense */}
          <div className="p-4 bg-[#221E12] border-2 border-[#E59500] space-y-2.5">
            <div className="flex items-center gap-2 text-[#E59500] font-bold uppercase tracking-wider text-xs sm:text-sm">
              <ShieldAlert className="w-4 h-4 text-[#E59500]" />
              <span>3. Anti-Cheat Sentinel &amp; Defense Protocols</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 bg-[#0D0C07] border border-[#423A20]">
                <strong className="text-[#E59500] block mb-0.5">Tab-Switch Penalty:</strong>
                Switching tabs, minimizing the window, or losing window focus triggers immediate auto-submission with disqualification status.
              </div>
              <div className="p-2.5 bg-[#0D0C07] border border-[#423A20]">
                <strong className="text-[#FFD000] block mb-0.5">Live State Persistence:</strong>
                Answers are immediately saved in real time upon selection. Refreshing the browser preserves your active session and countdown.
              </div>
            </div>
          </div>

          {/* Section 4: Tie-Breaker Directive */}
          <div className="p-3.5 bg-[#0D0C07] border border-[#FFD000] text-xs font-mono text-[#FFD000] flex items-center gap-2">
            <span>&#9733;</span>
            <span>
              <strong>Ranking Directive:</strong> Leaderboard is ordered strictly by <strong>Highest Correct Answers</strong>, broken by <strong>Least Time Taken</strong>.
            </span>
          </div>
        </div>

        {/* Pinned Card Footer: Agreement & Launch */}
        <div className="p-4 sm:p-5 bg-[#0D0C07] border-t-2 border-[#423A20] shrink-0 flex flex-col items-center gap-3">
          {/* Mandatory Agreement Checkbox */}
          <label
            htmlFor="rules-agreement-checkbox"
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <input
              id="rules-agreement-checkbox"
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) sounds.playSelect();
                if (disqualificationWarning) setDisqualificationWarning('');
              }}
              className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-[#423A20] bg-[#0D0C07] text-[#FFD000] focus:ring-0 cursor-pointer accent-[#FFD000]"
            />
            <span className="text-xs sm:text-sm font-mono font-bold text-[#FFF6D1] group-hover:text-[#FFD000] transition-colors">
              I confirm that I have read and agree to all tournament rules and directives.
            </span>
          </label>

          {/* Launch Button */}
          <button
            id="rules-initialize-btn"
            type="button"
            onClick={handleStart}
            disabled={!agreed || isVerifying}
            className={`w-full max-w-md py-3 sm:py-3.5 px-6 font-mono font-black text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              agreed && !isVerifying
                ? 'bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
                : 'bg-[#221E12] text-[#A89F81] border-2 border-[#423A20] cursor-not-allowed opacity-50 shadow-none'
            }`}
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Clearance...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Initialize Strike Run</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <p className="text-[10px] text-[#A89F81] font-mono text-center">
            Clicking &quot;Initialize Strike Run&quot; activates the continuous 15-minute countdown clock. Ensure you are ready.
          </p>
        </div>
      </div>
    </div>
  );
};
