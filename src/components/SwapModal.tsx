import React from 'react';
import { RefreshCw, AlertCircle, X, Check } from 'lucide-react';
import { sounds } from '../lib/audio';

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  difficulty: string;
  questionNumber: number;
}

export const SwapModal: React.FC<SwapModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  difficulty,
  questionNumber,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Confirm Swap Challenge
            </h3>
          </div>
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-300 mb-4 leading-relaxed font-sans">
          Are you sure you want to execute your <span className="text-amber-400 font-semibold font-mono">SWAP CHALLENGE</span>?
        </p>

        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 mb-6 space-y-1.5 text-xs font-mono text-slate-400">
          <div className="flex justify-between">
            <span>Target Question:</span>
            <span className="text-slate-200">Question #{questionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Category Tier:</span>
            <span className="text-amber-400 uppercase font-bold">{difficulty}</span>
          </div>
          <div className="flex justify-between">
            <span>Replacement:</span>
            <span className="text-emerald-400">Fresh Un-attempted Question</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            id="cancel-swap-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-mono font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            id="confirm-swap-btn"
            onClick={() => {
              sounds.playLifeline();
              onConfirm();
            }}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Execute Swap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
