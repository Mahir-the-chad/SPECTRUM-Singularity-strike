import React, { useState } from 'react';
import { UserPlus, ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
import { SpectrumLogo } from './SpectrumLogo';
import { sounds } from '../lib/audio';
import { checkParticipantDisqualification } from '../lib/firebase';

interface LandingPageProps {
  onGoToRegister: () => void;
  onResumeQuiz?: () => void;
  hasActiveSession?: boolean;
  savedName?: string;
  savedParticipantId?: string;
  savedRemainingSeconds?: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToRegister,
  onResumeQuiz,
  hasActiveSession = false,
  savedName = '',
  savedParticipantId = '',
  savedRemainingSeconds = 0,
}) => {
  const [disqualificationWarning, setDisqualificationWarning] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const minutesRemaining = Math.floor(savedRemainingSeconds / 60);
  const secondsRemaining = savedRemainingSeconds % 60;

  const handleResume = async () => {
    if (!savedParticipantId) {
      if (onResumeQuiz) onResumeQuiz();
      return;
    }

    setIsVerifying(true);
    setDisqualificationWarning('');

    try {
      const result = await checkParticipantDisqualification(savedParticipantId);
      setIsVerifying(false);

      if (result.isDisqualified) {
        sounds.playWarning();
        setDisqualificationWarning(
          'Your account has been disqualified due to a tab-switch or policy violation. Please contact an admin to revoke your disqualification.'
        );
        return;
      }

      sounds.playSelect();
      if (onResumeQuiz) onResumeQuiz();
    } catch (e) {
      setIsVerifying(false);
      if (onResumeQuiz) onResumeQuiz();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center gap-8 h-auto overflow-visible">
      {/* 1. Spectrum 5.0 Logo at the Top */}
      <div className="flex flex-col items-center justify-center animate-fade-in">
        <SpectrumLogo size="hero" showSubtitle={true} />
      </div>

      {/* 2. Singularity Strike - Round 1 Prominently in Big, Bold Text in Center */}
      <div className="text-center flex flex-col items-center gap-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-bold uppercase tracking-widest">
          <img
            src="/logo.png"
            alt="Logo"
            referrerPolicy="no-referrer"
            className="h-4 w-auto object-contain"
          />
          Flagship Cybernetic Challenge
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100 font-mono uppercase leading-tight">
          SINGULARITY <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400">STRIKE</span>
          <div className="text-2xl sm:text-4xl mt-2 font-bold text-cyan-300 tracking-wider">
            Round 1
          </div>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
          Welcome to the high-stakes tactical knowledge arena for Spectrum 5.0.
          Test your expertise across algorithms, artificial intelligence, logic, and systems engineering.
        </p>
      </div>

      {/* On-Screen Disqualification Warning Banner if participant tried to resume while disqualified */}
      {disqualificationWarning && (
        <div
          id="landing-disqualification-alert"
          className="w-full max-w-xl p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 flex flex-col gap-2 shadow-lg shadow-rose-950/50"
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
            Participant ID: <strong className="text-white uppercase">{savedParticipantId}</strong>
          </div>
        </div>
      )}

      {/* Active Session Notice (If participant already has an active run) */}
      {hasActiveSession && onResumeQuiz && (
        <div className="w-full max-w-xl p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="text-left">
              <div className="text-xs font-mono font-bold uppercase text-amber-300">
                Active Session Detected
              </div>
              <div className="text-sm font-semibold text-slate-100">
                {savedName} {savedParticipantId && <span className="text-xs text-slate-400 font-mono">({savedParticipantId})</span>}
              </div>
              <div className="text-xs text-amber-300/80 font-mono mt-0.5">
                Banked Time: {minutesRemaining}m {secondsRemaining.toString().padStart(2, '0')}s
              </div>
            </div>
          </div>
          <button
            id="landing-resume-strike-btn"
            onClick={handleResume}
            disabled={isVerifying}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20 disabled:opacity-50"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <>
                <span>Resume Strike</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}

      {/* 3. Register Button Redirecting to Registration Page */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
        <button
          id="landing-register-btn"
          onClick={() => {
            sounds.playSelect();
            onGoToRegister();
          }}
          className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-400 to-fuchsia-500 hover:opacity-95 text-slate-950 font-mono font-extrabold text-sm sm:text-base uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-cyan-500/25 cursor-pointer active:scale-95"
        >
          <UserPlus className="w-5 h-5 text-slate-950" />
          <span>Register</span>
          <ArrowRight className="w-5 h-5 text-slate-950" />
        </button>
      </div>
    </div>
  );
};
