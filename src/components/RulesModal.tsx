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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-100">
              Singularity Strike Directives
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

        <div className="flex flex-col gap-4 text-xs font-mono text-slate-300">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase">
              <Clock className="w-3.5 h-3.5" />
              1. 15-Minute Wall-Clock Countdown
            </div>
            <p className="text-slate-400 font-sans">
              The continuous 900-second timer begins immediately upon entering the arena. Refreshing or reloading your browser will not reset the clock or replace questions; your session continues without disruption.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              2. Three Single-Use Tactical Lifelines
            </div>
            <ul className="list-disc list-inside text-slate-400 flex flex-col gap-1 font-sans">
              <li><strong className="text-slate-200 font-mono">50-50:</strong> Instantly eliminates 2 incorrect options, preserving only the correct and closest choices.</li>
              <li><strong className="text-slate-200 font-mono">Swap Challenge:</strong> Replaces the active question with an un-attempted question from the identical difficulty tier.</li>
              <li><strong className="text-slate-200 font-mono">Ask AI:</strong> Opens a neural co-pilot transmission providing a conceptual hint without explicitly stating the answer.</li>
            </ul>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-rose-500/30 flex flex-col gap-1.5 text-rose-200">
            <div className="flex items-center gap-2 text-rose-400 font-bold uppercase">
              <ShieldAlert className="w-3.5 h-3.5" />
              3. Tab-Switch Sentinel Defense
            </div>
            <p className="text-rose-300/80 font-sans">
              Switching tabs, changing window focus, or minimizing your browser window triggers the browser VisibilityChange API and executes immediate auto-submission with status <code className="text-rose-200 font-mono font-bold">tab_switched</code>.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase">
              <Award className="w-3.5 h-3.5" />
              4. Ranking & Tie-Breaker Logic
            </div>
            <p className="text-slate-400 font-sans">
              Leaderboard order is determined primarily by <strong>Highest Correct Answers</strong>. Ties are broken strictly by <strong>Least Time Taken</strong>.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
