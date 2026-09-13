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
    <div className="w-full max-w-5xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8 h-auto overflow-visible">
      {/* Top Bar with Back Link and Participant Identity Chip */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <button
          id="rules-back-btn"
          type="button"
          onClick={() => {
            sounds.playSelect();
            onBackToRegistration();
          }}
          className="flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Registration Info</span>
        </button>

        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-900/80 border border-cyan-500/30 font-mono text-xs text-slate-300 shadow-inner">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-100 font-semibold">{participantName}</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="flex items-center gap-1.5 text-cyan-300">
            <Hash className="w-3.5 h-3.5" />
            <span className="font-bold">{participantId}</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="text-center flex flex-col items-center gap-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium uppercase tracking-widest">
          <SpectrumLogo size="sm" showSubtitle={false} />
          <span>Protocol Directive</span>
        </div>

        {/* Display the title: 'Arena Rules & Guidelines' */}
        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 font-mono uppercase">
          Arena Rules & <span className="text-cyan-400">Guidelines</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Please review the competition format, tactical lifelines, and telemetry security protocols before initiating your run.
        </p>
      </div>

      {/* Visual Feature Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Quiz Structure & Format (Matching User Image 1) */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-cyan-500/30 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm sm:text-base tracking-wider uppercase">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Quiz Structure & Format</span>
          </div>

          <div className="flex flex-col gap-3.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <p>
                <strong className="text-slate-100 font-mono">20 Questions Total:</strong> Specially curated with 12 Easy, 6 Medium, and 2 Hard multi-disciplinary technical problems.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <p>
                <strong className="text-slate-100 font-mono">4 Core Categories:</strong> Data Structures & Algorithms, AI & Machine Learning, Math & Logic, and Syntax/Bug Fixing.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <p>
                <strong className="text-slate-100 font-mono">15 Minutes (900s):</strong> Strict server-side countdown timer. Unsubmitted quizzes are automatically finalized when time expires.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                4
              </div>
              <p>
                <strong className="text-slate-100 font-mono">Scoring:</strong> +1 mark per correct answer. 0 marks for incorrect or unanswered questions (No negative marking).
              </p>
            </div>
          </div>
        </div>

        {/* Card 2: 3 Strategic Lifelines (Matching User Image 2) */}
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-fuchsia-500/30 flex flex-col gap-4 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-2 text-fuchsia-400 font-mono font-bold text-sm sm:text-base tracking-wider uppercase">
            <Zap className="w-5 h-5 text-fuchsia-400" />
            <span>3 Strategic Lifelines (Once Per Attempt)</span>
          </div>

          <div className="flex flex-col gap-3">
            {/* Lifeline 1: 50 / 50 */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30 flex items-start gap-3">
              <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs shrink-0">
                50:50
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono">50 / 50 Lifeline</span>
                <p className="text-xs text-slate-400">
                  Instantly eliminates two incorrect answer choices for the current question.
                </p>
              </div>
            </div>

            {/* Lifeline 2: Swap */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-blue-500/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono">Swap Question</span>
                <p className="text-xs text-slate-400">
                  Replaces the current question with a new unseen question of the EXACT same difficulty level.
                </p>
              </div>
            </div>

            {/* Lifeline 3: AI Hint */}
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-cyan-500/30 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs sm:text-sm font-bold text-slate-100 font-mono">AI Hint Lifeline (Gemini 2.5)</span>
                <p className="text-xs text-slate-400">
                  Provides a strategic 30-second conceptual clue powered by Gemini without giving away the direct answer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security & System Directives Banner (The 3 explicit rule guidelines) */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-rose-500/40 flex flex-col gap-4 shadow-xl">
        <div className="flex items-center gap-2 text-rose-400 font-mono font-bold text-sm sm:text-base tracking-wider uppercase">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Security, Tab Defense & Leaderboard Rules</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="font-mono font-bold text-slate-100 uppercase text-xs flex items-center gap-1.5 text-cyan-300">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              Real-Time Saving
            </span>
            <p className="leading-relaxed text-slate-400">
              Do not refresh or close your browser unnecessarily. Answers are saved immediately in real time upon selection.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="font-mono font-bold text-slate-100 uppercase text-xs flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Session Recovery
            </span>
            <p className="leading-relaxed text-slate-400">
              In the event of accidental tab closure, ask admin to revoke disqualification to resume immediately within your remaining time window.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col gap-2">
            <span className="font-mono font-bold text-slate-100 uppercase text-xs flex items-center gap-1.5 text-rose-300">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Tab-Switch Defense
            </span>
            <p className="leading-relaxed text-slate-400">
              Switching tabs, minimizing the browser, or losing window focus triggers immediate auto-submission with disqualification status.
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/20 text-xs font-mono text-cyan-300 flex items-center gap-2">
          <span>🏆</span>
          <span>
            <strong>Tie-Breaking Directive:</strong> Ties on the leaderboard are resolved strictly by lowest time taken, followed by earliest submission timestamp.
          </span>
        </div>
      </div>

      {/* Mandatory Agreement Checkbox & Proceed Button Container */}
      <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-cyan-500/40 flex flex-col items-center gap-6 shadow-2xl">
        {/* On-Screen Disqualification Warning Banner */}
        {disqualificationWarning && (
          <div
            id="rules-disqualification-alert"
            className="w-full p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 flex flex-col gap-2 shadow-lg shadow-rose-950/50"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase tracking-wider text-rose-300 text-xs font-mono">
                  SECURITY CLEARANCE REVOKED
                </span>
                <p className="text-slate-100 text-xs sm:text-sm leading-relaxed font-sans">
                  {disqualificationWarning}
                </p>
              </div>
            </div>
            <div className="text-[11px] font-mono text-rose-300/80 pt-1 border-t border-rose-500/30">
              Locked Participant ID: <strong className="text-white uppercase">{participantId}</strong>
            </div>
          </div>
        )}

        {/* Mandatory Agreement Checkbox */}
        <label
          htmlFor="rules-agreement-checkbox"
          className="flex items-center gap-3.5 cursor-pointer select-none group"
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
            className="w-5 h-5 rounded border-slate-700 bg-slate-950 text-cyan-500 focus:ring-cyan-400 focus:ring-offset-slate-950 cursor-pointer accent-cyan-500"
          />
          <span className="text-xs sm:text-sm font-mono font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
            I have read and agree to all the competition rules and guidelines.
          </span>
        </label>

        {/* Proceed Button Constraint: The 'Initialize Strike Run' button must remain disabled until agreement checked */}
        {/* Timer Start Trigger: Strict 15-minute timer starts ONLY when clicked */}
        <button
          id="rules-initialize-btn"
          type="button"
          onClick={handleStart}
          disabled={!agreed || isVerifying}
          className={`w-full max-w-md py-4 px-8 rounded-xl font-mono font-extrabold text-sm sm:text-base uppercase tracking-wider transition-all flex items-center justify-center gap-3 shadow-xl ${
            agreed && !isVerifying
              ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-fuchsia-500 hover:opacity-95 text-slate-950 shadow-cyan-500/25 cursor-pointer active:scale-95'
              : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-50 shadow-none'
          }`}
        >
          {isVerifying ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Verifying Clearance...</span>
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              <span>Initialize Strike Run</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>

        <p className="text-[11px] text-slate-500 font-mono text-center">
          Clicking &quot;Initialize Strike Run&quot; will activate the strict 15-minute countdown clock. Ensure you are ready before proceeding.
        </p>
      </div>
    </div>
  );
};
