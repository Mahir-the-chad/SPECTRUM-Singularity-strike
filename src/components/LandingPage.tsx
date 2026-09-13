import React, { useState } from 'react';
import { UserPlus, ArrowRight, RefreshCw, ShieldAlert } from 'lucide-react';
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
    <div className="w-full max-w-4xl mx-auto px-4 py-10 sm:py-20 flex flex-col items-center justify-center gap-8 font-mono flex-1 my-auto">
      {/* Visual Anchor: Prominent Headline Section without Logo */}
      <div className="text-center flex flex-col items-center gap-5 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#221E12] border-2 border-[#423A20] text-[#FFD000] text-xs font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0px_#000000]">
          <span className="w-2 h-2 bg-[#FFD000] inline-block" />
          <span>SPECTRUM 5.0</span>
          <span className="text-[#423A20]">/</span>
          <span>FLAGSHIP TECHNICAL CHALLENGE</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-[#FFF6D1] font-mono uppercase leading-tight">
          SINGULARITY <span className="text-[#FFD000]">STRIKE</span>
          <div className="text-xl sm:text-3xl md:text-4xl mt-3 font-bold text-[#FFE853] tracking-widest uppercase">
            [ ROUND 01 ]
          </div>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-[#A89F81] max-w-2xl mx-auto leading-relaxed font-mono">
          Welcome to the high-stakes tactical knowledge arena for Spectrum 5.0.
          Test your expertise across algorithms, artificial intelligence, discrete logic, and systems engineering.
        </p>
      </div>

      {/* On-Screen Disqualification Warning Banner if participant tried to resume while disqualified */}
      {disqualificationWarning && (
        <div
          id="landing-disqualification-alert"
          className="w-full max-w-xl p-4 bg-[#221E12] border-2 border-[#E59500] text-[#FFF6D1] flex flex-col gap-2 shadow-[4px_4px_0px_#000000]"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#E59500] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <span className="font-bold uppercase tracking-wider text-[#FFD000] text-xs font-mono">
                SECURITY CLEARANCE REVOKED
              </span>
              <p className="text-[#FFF6D1] text-xs sm:text-sm leading-relaxed font-mono">
                {disqualificationWarning}
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-[#A89F81] pt-1 border-t border-[#423A20]">
            Participant ID: <strong className="text-[#FFD000] uppercase">{savedParticipantId}</strong>
          </div>
        </div>
      )}

      {/* Active Session Notice (If participant already has an active run) */}
      {hasActiveSession && onResumeQuiz && (
        <div className="w-full max-w-xl p-4 sm:p-5 bg-[#18160E] border-2 border-[#FFD000] text-[#FFF6D1] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_#000000]">
          <div className="flex items-center gap-3">
            <RefreshCw className="w-5 h-5 text-[#FFD000] shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="text-left">
              <div className="text-xs font-mono font-bold uppercase text-[#FFD000]">
                Active Session Detected
              </div>
              <div className="text-sm font-bold text-[#FFF6D1]">
                {savedName} {savedParticipantId && <span className="text-xs text-[#A89F81] font-mono">({savedParticipantId})</span>}
              </div>
              <div className="text-xs text-[#FFE853] font-mono mt-0.5">
                Banked Time: {minutesRemaining}m {secondsRemaining.toString().padStart(2, '0')}s
              </div>
            </div>
          </div>
          <button
            id="landing-resume-strike-btn"
            onClick={handleResume}
            disabled={isVerifying}
            className="w-full sm:w-auto px-5 py-2.5 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
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
          className="w-full py-4 px-8 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono font-extrabold text-sm sm:text-base uppercase tracking-widest border-2 border-[#FFD000] shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer"
        >
          <UserPlus className="w-5 h-5 text-[#0D0C07]" />
          <span>Register</span>
          <ArrowRight className="w-5 h-5 text-[#0D0C07]" />
        </button>
      </div>
    </div>
  );
};
