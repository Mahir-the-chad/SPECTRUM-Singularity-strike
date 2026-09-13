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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0C07]/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#18160E] border-2 border-[#E59500] shadow-[6px_6px_0px_#000000] overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0D0C07] border-b-2 border-[#E59500]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#221E12] border-2 border-[#E59500] text-[#E59500] flex items-center justify-center shadow-[2px_2px_0px_#000000]">
              <Trash2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#FFF6D1] uppercase tracking-wider">
                Delete Participant User
              </h3>
              <p className="text-[11px] text-[#E59500]">Irreversible Operative Purge</p>
            </div>
          </div>
          <button
            id="close-delete-modal-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            disabled={isDeleting}
            className="p-1.5 border border-[#423A20] text-[#A89F81] hover:text-[#FFF6D1] hover:border-[#FFD000] bg-[#221E12] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleConfirm} className="p-6 space-y-5">
          {/* Warning Banner */}
          <div className="p-4 bg-[#221E12] border-2 border-[#E59500] text-[#FFF6D1] flex items-start gap-3 shadow-[3px_3px_0px_#000000]">
            <AlertTriangle className="w-5 h-5 text-[#E59500] shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-[#E59500] uppercase tracking-wide">
                Warning: Permanent Database Deletion
              </p>
              <p className="text-[#A89F81] text-[11px] leading-relaxed">
                This will completely remove this user, their test submission score, time grants, and reinstatement entries from Firestore and the leaderboard.
              </p>
            </div>
          </div>

          {/* Participant Info Card */}
          <div className="p-4 bg-[#0D0C07] border-2 border-[#423A20] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[#A89F81] text-xs">Participant Name:</span>
              <span className="text-[#FFF6D1] text-xs font-bold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#FFD000]" />
                {participant.name}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A89F81] text-xs">Participant ID:</span>
              <span className="text-[#FFD000] text-xs font-bold px-2 py-0.5 bg-[#221E12] border border-[#FFD000]">
                {participant.participantId || 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A89F81] text-xs">Current Score:</span>
              <span className="text-[#FFF6D1] text-xs font-bold">
                {participant.correctAnswers} / {participant.totalAttempted}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#A89F81] text-xs">Current Status:</span>
              <span className="text-[#E59500] text-[11px] font-bold uppercase">
                {participant.submissionStatus.replace('_', ' ')}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#A89F81] text-center">
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
              className="flex-1 py-2.5 px-4 bg-[#221E12] hover:bg-[#2A2416] text-[#A89F81] hover:text-[#FFF6D1] border-2 border-[#423A20] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-delete-btn"
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 bg-[#E59500] hover:bg-[#FFD000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-[#0D0C07] border-2 border-[#E59500] hover:border-[#FFD000] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[3px_3px_0px_#000000] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#0D0C07]/30 border-t-[#0D0C07] rounded-full animate-spin" />
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
