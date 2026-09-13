import React from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, User } from 'lucide-react';
import type { Submission } from '../types';
import { sounds } from '../lib/audio';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Submission | null;
  onConfirmDelete: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  participant,
  onConfirmDelete,
  isDeleting,
}) => {
  if (!isOpen || !participant) return null;

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDeleting) return;
    await onConfirmDelete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-3xl shadow-2xl shadow-rose-500/10 overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-rose-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                Delete Participant User
              </h3>
              <p className="text-[11px] text-rose-400">Irreversible Operative Purge</p>
            </div>
          </div>
          <button
            id="close-delete-modal-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Warning Banner */}
          <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/40 text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-rose-200 uppercase tracking-wide">
                Warning: Permanent Database Deletion
              </p>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                This will completely remove this user, their test submission score, time grants, and reinstatement entries from Firestore and the leaderboard.
              </p>
            </div>
          </div>

          {/* Participant Info Card */}
          <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Participant Name:</span>
              <span className="text-slate-100 text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                {participant.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Participant ID:</span>
              <span className="text-cyan-400 text-xs font-bold px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/60">
                {participant.participantId || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Current Score:</span>
              <span className="text-slate-200 text-xs font-bold">
                {participant.correctAnswers} / {participant.totalAttempted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Current Status:</span>
              <span className="text-amber-400 text-[11px] font-bold uppercase">
                {participant.submissionStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Are you sure you want to permanently delete this user?
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              id="cancel-delete-btn"
              onClick={() => {
                sounds.playSelect();
                onClose();
              }}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-delete-btn"
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white border border-rose-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-rose-600/30 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete User</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
