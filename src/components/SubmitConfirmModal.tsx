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
  if (!isOpen) return null;

  const unanswered = totalQuestions - answeredCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Send className="w-4 h-4" />
            </div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Finalize & Submit Strike Run
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 mb-4 font-sans leading-relaxed">
          Are you ready to lock in your answers and commit your final score to the global Firestore leaderboard?
        </p>

        {unanswered > 0 ? (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 mb-5 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-mono uppercase">Attention:</span> You have{' '}
              <span className="font-bold underline">{unanswered} unanswered question{unanswered > 1 ? 's' : ''}</span>. Unanswered questions will receive 0 points.
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-5 flex items-start gap-3 text-xs text-emerald-200">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold font-mono uppercase">All Set:</span> All {totalQuestions} questions have been answered.
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-6 space-y-1.5 text-xs font-mono text-slate-400">
          <div className="flex justify-between">
            <span>Attempted:</span>
            <span className="text-slate-100 font-bold">{answeredCount} / {totalQuestions}</span>
          </div>
          <div className="flex justify-between">
            <span>Remaining Time:</span>
            <span className="text-cyan-400 font-bold">{formatTimeMMSS(remainingSeconds)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            id="cancel-submit-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            disabled={isSubmitting}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Review Answers
          </button>
          <button
            id="confirm-submit-btn"
            onClick={() => {
              sounds.playSelect();
              onConfirm();
            }}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/20 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
