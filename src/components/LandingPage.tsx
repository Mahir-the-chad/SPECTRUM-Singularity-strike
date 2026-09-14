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
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-16 flex flex-col items-center justify-start gap-6 font-mono h-auto min-h-0 overflow-visible">
      {/* Visual Anchor: Prominent Headline Section without Logo */}
      <div className="w-full text-center flex flex-col items-center gap-4 max-w-3xl mx-auto h-auto overflow-visible">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#221E12] border-2 border-[#423A20] text-[#FFD000] text-xs font-mono font-bold uppercase tracking-widest shadow-[3px_3px_0px_#000000] h-auto">
          <span className="w-2 h-2 bg-[#FFD000] inline-block shrink-0" />
          <span>SPECTRUM 5.0</span>
          <span className="text-[#423A20]">/</span>
          <span>FLAGSHIP TECHNICAL CHALLENGE</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-[#FFF6D1] font-mono uppercase leading-tight flex flex-col items-center gap-2 h-auto">
          <span>
            SINGULARITY <span className="text-[#FFD000]">STRIKE</span>
          </span>
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-[#FFE853] tracking-widest uppercase">
            [ ROUND 01 ]
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[#A89F81] max-w-2xl mx-auto leading-relaxed font-mono break-words h-auto">
          Welcome to the high-stakes tactical knowledge arena for Spectrum 5.0.
          Test your expertise across algorithms, artificial intelligence, discrete logic, and systems engineering.
        </p>
      </div>

      {/* On-Screen Disqualification Warning Banner if participant tried to resume while disqualified */}
      {disqualificationWarning && (
        <div
          id="landing-disqualification-alert"
          className="w-full max-w-xl p-4 bg-[#221E12] border-2 border-[#E59500] text-[#FFF6D1] flex flex-col gap-3 shadow-[4px_4px_0px_#000000] h-auto overflow-visible"
        >
          <div className="flex items-start gap-3 h-auto">
            <ShieldAlert className="w-5 h-5 text-[#E59500] shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1 h-auto">
              <span className="font-bold uppercase tracking-wider text-[#FFD000] text-xs font-mono">
                SECURITY CLEARANCE REVOKED
              </span>
              <p className="text-[#FFF6D1] text-xs sm:text-sm leading-relaxed font-mono break-words">
                {disqualificationWarning}
              </p>
            </div>
          </div>
          <div className="text-[11px] font-mono text-[#A89F81] pt-2 border-t border-[#423A20]">
            Participant ID: <strong className="text-[#FFD000] uppercase">{savedParticipantId}</strong>
          </div>
        </div>
      )}

      {/* Active Session Notice (If participant already has an active run) */}
      {hasActiveSession && onResumeQuiz && (
        <div className="w-full max-w-xl p-4 sm:p-5 bg-[#18160E] border-2 border-[#FFD000] text-[#FFF6D1] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_#000000] h-auto overflow-visible">
          <div className="flex items-center gap-3 h-auto">
            <RefreshCw className="w-5 h-5 text-[#FFD000] shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <div className="text-left flex flex-col gap-0.5 h-auto">
              <div className="text-xs font-mono font-bold uppercase text-[#FFD000]">
                Active Session Detected
              </div>
              <div className="text-sm font-bold text-[#FFF6D1] break-words">
                {savedName} {savedParticipantId && <span className="text-xs text-[#A89F81] font-mono">({savedParticipantId})</span>}
              </div>
              <div className="text-xs text-[#FFE853] font-mono">
                Banked Time: {minutesRemaining}m {secondsRemaining.toString().padStart(2, '0')}s
              </div>
            </div>
          </div>
          <button
            id="landing-resume-strike-btn"
            onClick={handleResume}
            disabled={isVerifying}
            className="w-full sm:w-auto px-5 py-2.5 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 h-auto shrink-0"
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

      {/* Register Action Section */}
      <div className="w-full max-w-md flex flex-col gap-4 items-center justify-center h-auto overflow-visible mt-2">
        <button
          id="landing-register-btn"
          onClick={() => {
            sounds.playSelect();
            onGoToRegister();
          }}
          className="w-full py-4 px-8 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono font-extrabold text-sm sm:text-base uppercase tracking-widest border-2 border-[#FFD000] shadow-[4px_4px_0px_#000000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all flex items-center justify-center gap-3 cursor-pointer h-auto"
        >
          <UserPlus className="w-5 h-5 text-[#0D0C07]" />
          <span>Register</span>
          <ArrowRight className="w-5 h-5 text-[#0D0C07]" />
        </button>
      </div>
    </div>
  );
};
