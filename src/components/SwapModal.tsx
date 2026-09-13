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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0C07]/90 font-mono animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-[#18160E] border-2 border-[#FFD000] shadow-[6px_6px_0px_#000000] p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#423A20]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 bg-[#FFD000] text-[#0D0C07] font-bold">
              <RefreshCw className="w-4 h-4" />
            </div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#FFF6D1]">
              Confirm Swap Challenge
            </h3>
          </div>
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="p-1 text-[#A89F81] hover:text-[#0D0C07] hover:bg-[#FFD000] border border-transparent hover:border-[#FFD000] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-[#FFF6D1] mb-4 leading-relaxed font-mono">
          Are you sure you want to execute your <span className="text-[#FFD000] font-bold font-mono">SWAP CHALLENGE</span>?
        </p>

        <div className="p-3.5 bg-[#0D0C07] border-2 border-[#423A20] mb-6 flex flex-col gap-1.5 text-xs font-mono text-[#A89F81] shadow-inner">
          <div className="flex justify-between">
            <span>Target Question:</span>
            <span className="text-[#FFF6D1] font-bold">Question #{questionNumber}</span>
          </div>
          <div className="flex justify-between">
            <span>Category Tier:</span>
            <span className="text-[#FFD000] uppercase font-bold">{difficulty}</span>
          </div>
          <div className="flex justify-between">
            <span>Replacement:</span>
            <span className="text-[#FFE853] font-bold">Fresh Un-attempted Question</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            id="cancel-swap-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-4 py-2 rounded-none text-xs font-mono font-bold uppercase text-[#FFF6D1] bg-[#221E12] border-2 border-[#423A20] hover:border-[#FFD000] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-swap-btn"
            onClick={() => {
              sounds.playLifeline();
              onConfirm();
            }}
            className="px-5 py-2 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Execute Swap</span>
          </button>
        </div>
      </div>
    </div>
  );
};
