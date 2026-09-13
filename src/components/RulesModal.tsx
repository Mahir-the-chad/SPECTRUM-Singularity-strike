import React from 'react';
import { Shield, Clock, Sparkles, ShieldAlert, Award, X, Zap } from 'lucide-react';
import { sounds } from '../lib/audio';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0C07]/90 font-mono animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#18160E] border-2 border-[#FFD000] shadow-[6px_6px_0px_#000000] p-5 sm:p-6 flex flex-col overflow-hidden">
        {/* Pinned Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-[#423A20] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 bg-[#FFD000] text-[#0D0C07] font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#FFF6D1]">
              Singularity Strike Directives
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-3.5 text-xs font-mono text-[#FFF6D1]">
          <div className="p-3.5 bg-[#0D0C07] border-2 border-[#423A20] flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-[#FFD000] font-bold uppercase">
              <Clock className="w-3.5 h-3.5" />
              1. 15-Minute Wall-Clock Countdown
            </div>
            <p className="text-[#A89F81] font-mono leading-relaxed">
              The continuous 900-second timer begins immediately upon entering the arena. Refreshing or reloading your browser will not reset the clock or replace questions; your session continues without disruption.
            </p>
          </div>

          <div className="p-3.5 bg-[#0D0C07] border-2 border-[#423A20] flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-[#FFE853] font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              2. Three Single-Use Tactical Lifelines
            </div>
            <ul className="list-disc list-inside text-[#A89F81] flex flex-col gap-1 font-mono">
              <li><strong className="text-[#FFF6D1]">50-50:</strong> Instantly eliminates 2 incorrect options, preserving only the correct and closest choices.</li>
              <li><strong className="text-[#FFF6D1]">Swap Challenge:</strong> Replaces the active question with an un-attempted question from the identical difficulty tier.</li>
              <li><strong className="text-[#FFF6D1]">Ask AI:</strong> Opens a neural co-pilot transmission providing a conceptual hint without explicitly stating the answer.</li>
            </ul>
          </div>

          <div className="p-3.5 bg-[#221E12] border-2 border-[#E59500] flex flex-col gap-1.5 text-[#FFF6D1]">
            <div className="flex items-center gap-2 text-[#E59500] font-bold uppercase">
              <ShieldAlert className="w-3.5 h-3.5" />
              3. Tab-Switch Sentinel Defense
            </div>
            <p className="text-[#A89F81] font-mono leading-relaxed">
              Switching tabs, changing window focus, or minimizing your browser window triggers the browser VisibilityChange API and executes immediate auto-submission with status <code className="text-[#E59500] font-mono font-bold">tab_switched</code>.
            </p>
          </div>

          <div className="p-3.5 bg-[#0D0C07] border-2 border-[#423A20] flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center gap-2 text-[#FFD000] font-bold uppercase">
              <Award className="w-3.5 h-3.5" />
              4. Ranking &amp; Tie-Breaker Logic
            </div>
            <p className="text-[#A89F81] font-mono leading-relaxed">
              Leaderboard order is determined primarily by <strong className="text-[#FFF6D1]">Highest Correct Answers</strong>. Ties are broken strictly by <strong className="text-[#FFF6D1]">Least Time Taken</strong>.
            </p>
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="mt-4 pt-3 border-t-2 border-[#423A20] flex justify-end shrink-0">
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-5 py-2 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-xs font-bold uppercase tracking-wider transition-all border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
