import React from 'react';
import { Send, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { sounds } from '../lib/audio';
import { formatTimeMMSS } from '../lib/quizEngine';

interface SubmitConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalQuestions: number;
  answeredCount: number;
  remainingSeconds: number;
  isSubmitting: boolean;
}

export const SubmitConfirmModal: React.FC<SubmitConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  remainingSeconds,
  isSubmitting,
}) => {
  const [hasConfirmed, setHasConfirmed] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setHasConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isSubmitting || hasConfirmed) return;
    setHasConfirmed(true);
    sounds.playSelect();
    onConfirm();
  };

  const unanswered = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0C07]/90 font-mono animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#18160E] border-2 border-[#FFD000] shadow-[6px_6px_0px_#000000] p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#423A20]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 bg-[#FFD000] text-[#0D0C07] font-bold">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#FFF6D1]">
              Finalize &amp; Submit Strike Run
            </h3>
          </div>
          <button
            onClick={() => {
              if (!isSubmitting) {
                sounds.playSelect();
                onClose();
              }
            }}
            disabled={isSubmitting}
            className="p-1 text-[#A89F81] hover:text-[#0D0C07] hover:bg-[#FFD000] border border-transparent hover:border-[#FFD000] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#FFF6D1] mb-4 font-mono leading-relaxed">
          Are you ready to lock in your answers and commit your final score to the global Firestore leaderboard?
        </p>

        {unanswered > 0 ? (
          <div className="p-3.5 bg-[#221E12] border-2 border-[#E59500] mb-5 flex items-start gap-3 text-xs text-[#FFF6D1]">
            <AlertTriangle className="w-4 h-4 text-[#E59500] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-mono uppercase text-[#E59500]">Attention:</span> You have{' '}
              <span className="font-bold underline text-[#FFD000]">{unanswered} unanswered question{unanswered > 1 ? 's' : ''}</span>. Unanswered questions will receive 0 points.
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-[#221E12] border-2 border-[#FFD000] mb-5 flex items-start gap-3 text-xs text-[#FFF6D1]">
            <CheckCircle className="w-4 h-4 text-[#FFD000] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-mono uppercase text-[#FFD000]">All Set:</span> All {totalQuestions} questions have been answered.
            </div>
          </div>
        )}

        <div className="p-3.5 bg-[#0D0C07] border-2 border-[#423A20] mb-6 flex flex-col gap-1.5 text-xs font-mono text-[#A89F81] shadow-inner">
          <div className="flex justify-between">
            <span>Attempted:</span>
            <span className="text-[#FFF6D1] font-bold">{answeredCount} / {totalQuestions}</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining Time:</span>
            <span className="text-[#FFD000] font-bold">{formatTimeMMSS(remainingSeconds)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            id="cancel-submit-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            disabled={isSubmitting || hasConfirmed}
            className="px-4 py-2 rounded-none text-xs font-mono font-bold uppercase text-[#FFF6D1] bg-[#221E12] border-2 border-[#423A20] hover:border-[#FFD000] transition-colors disabled:opacity-50 cursor-pointer"
          >
            Review Answers
          </button>
          <button
            id="confirm-submit-btn"
            onClick={handleConfirm}
            disabled={isSubmitting || hasConfirmed}
            className="px-5 py-2.5 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting || hasConfirmed ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-[#0D0C07] border-t-transparent rounded-full animate-spin" />
                <span>Transmitting...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Score Now</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
