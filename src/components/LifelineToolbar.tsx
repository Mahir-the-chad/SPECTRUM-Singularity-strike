import React from 'react';
import { Divide, RefreshCw, Bot, Check, Ban, Sparkles } from 'lucide-react';
import type { LifelinesState } from '../types';

interface LifelineToolbarProps {
  lifelines: LifelinesState;
  onUseFiftyFifty: () => void;
  onUseSwapChallenge: () => void;
  onUseAskAi: () => void;
  isFiftyFiftyActiveOnCurrent: boolean;
  isAskAiActiveOnCurrent?: boolean;
  disabled?: boolean;
}

export const LifelineToolbar: React.FC<LifelineToolbarProps> = ({
  lifelines,
  onUseFiftyFifty,
  onUseSwapChallenge,
  onUseAskAi,
  isFiftyFiftyActiveOnCurrent,
  isAskAiActiveOnCurrent = false,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
          Tactical Lifelines:
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
          {[lifelines.fiftyFifty, lifelines.swapChallenge, lifelines.askAi].filter((v) => !v).length} / 3 Available
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* 50-50 Lifeline */}
        <button
          id="lifeline-fifty-fifty-btn"
          onClick={onUseFiftyFifty}
          disabled={disabled || lifelines.fiftyFifty}
          title={
            lifelines.fiftyFifty
              ? '50-50 already used in this session'
              : 'Eliminate two incorrect answers, keeping correct & closest'
          }
          className={`group relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
            lifelines.fiftyFifty
              ? 'bg-slate-950/60 border border-slate-800/80 text-slate-600 cursor-not-allowed'
              : isFiftyFiftyActiveOnCurrent
              ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-500/20'
              : 'bg-slate-800/90 border border-slate-700 hover:border-cyan-400 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 shadow-sm cursor-pointer'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center font-extrabold text-[11px] ${
              lifelines.fiftyFifty
                ? 'bg-slate-800 text-slate-600'
                : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
            }`}
          >
            50%
          </div>
          <div className="text-left">
            <div className="font-bold flex items-center gap-1.5">
              <span>50-50</span>
              {lifelines.fiftyFifty && <span className="text-[10px] text-slate-600 font-normal">[USED]</span>}
              {!lifelines.fiftyFifty && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
            </div>
          </div>
        </button>

        {/* Swap Challenge Lifeline */}
        <button
          id="lifeline-swap-challenge-btn"
          onClick={onUseSwapChallenge}
          disabled={disabled || lifelines.swapChallenge}
          title={
            lifelines.swapChallenge
              ? 'Swap challenge already used in this session'
              : 'Replace current question with a fresh one of identical difficulty'
          }
          className={`group relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
            lifelines.swapChallenge
              ? 'bg-slate-950/60 border border-slate-800/80 text-slate-600 cursor-not-allowed'
              : 'bg-slate-800/90 border border-slate-700 hover:border-amber-400 hover:bg-slate-800 text-slate-200 hover:text-amber-300 shadow-sm cursor-pointer'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center ${
              lifelines.swapChallenge
                ? 'bg-slate-800 text-slate-600'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
          </div>
          <div className="text-left">
            <div className="font-bold flex items-center gap-1.5">
              <span>Swap</span>
              {lifelines.swapChallenge && <span className="text-[10px] text-slate-600 font-normal">[USED]</span>}
              {!lifelines.swapChallenge && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
            </div>
          </div>
        </button>

        {/* Ask AI Lifeline */}
        {(() => {
          const isGloballyUsed = lifelines.askAi;
          const canViewHintOnCurrent = isGloballyUsed && isAskAiActiveOnCurrent;
          const isButtonDisabled = disabled || (isGloballyUsed && !isAskAiActiveOnCurrent);

          return (
            <button
              id="lifeline-ask-ai-btn"
              onClick={onUseAskAi}
              disabled={isButtonDisabled}
              title={
                canViewHintOnCurrent
                  ? 'Re-open and view AI Hint for this question (No extra lifeline consumed)'
                  : isGloballyUsed
                  ? 'Ask AI lifeline already used in this session on another question'
                  : 'Consult AI neural co-pilot for a conceptual hint'
              }
              className={`group relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-mono transition-all ${
                isButtonDisabled
                  ? 'bg-slate-950/60 border border-slate-800/80 text-slate-600 cursor-not-allowed'
                  : canViewHintOnCurrent
                  ? 'bg-purple-500/20 border border-purple-400 text-purple-200 shadow-md shadow-purple-500/25 hover:bg-purple-500/30 cursor-pointer active:scale-95'
                  : 'bg-slate-800/90 border border-slate-700 hover:border-purple-400 hover:bg-slate-800 text-slate-200 hover:text-purple-300 shadow-sm cursor-pointer'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center ${
                  isButtonDisabled
                    ? 'bg-slate-800 text-slate-600'
                    : canViewHintOnCurrent
                    ? 'bg-purple-500 text-slate-950 font-bold'
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-bold flex items-center gap-1.5">
                  <span>Ask AI</span>
                  {canViewHintOnCurrent ? (
                    <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
                      [VIEW HINT]
                    </span>
                  ) : isGloballyUsed ? (
                    <span className="text-[10px] text-slate-600 font-normal">[USED]</span>
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  )}
                </div>
              </div>
            </button>
          );
        })()}
      </div>
    </div>
  );
};
