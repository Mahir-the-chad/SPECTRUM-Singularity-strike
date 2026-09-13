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
    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#18160E] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000] font-mono">
      <div className="flex items-center gap-2">
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#A89F81]">
          Tactical Lifelines:
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 bg-[#221E12] border border-[#423A20] text-[#FFD000] font-bold">
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
          className={`group relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-none text-xs font-mono transition-all ${
            lifelines.fiftyFifty
              ? 'bg-[#0D0C07] border-2 border-[#423A20] text-[#A89F81]/40 cursor-not-allowed'
              : isFiftyFiftyActiveOnCurrent
              ? 'bg-[#FFD000] border-2 border-[#FFD000] text-[#0D0C07] shadow-[2px_2px_0px_#000000]'
              : 'bg-[#221E12] border-2 border-[#423A20] hover:border-[#FFD000] text-[#FFF6D1] hover:text-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
          }`}
        >
          <div
            className={`w-5 h-5 flex items-center justify-center font-extrabold text-[11px] border ${
              lifelines.fiftyFifty
                ? 'bg-[#18160E] text-[#A89F81]/40 border-[#423A20]'
                : isFiftyFiftyActiveOnCurrent
                ? 'bg-[#0D0C07] text-[#FFD000] border-[#0D0C07]'
                : 'bg-[#0D0C07] text-[#FFD000] border-[#423A20]'
            }`}
          >
            50%
          </div>
          <div className="text-left">
            <div className="font-bold flex items-center gap-1.5">
              <span>50-50</span>
              {lifelines.fiftyFifty && <span className="text-[10px] text-[#A89F81] font-normal">[USED]</span>}
              {!lifelines.fiftyFifty && <span className="w-1.5 h-1.5 bg-[#FFD000] animate-pulse" />}
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
          className={`group relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-none text-xs font-mono transition-all ${
            lifelines.swapChallenge
              ? 'bg-[#0D0C07] border-2 border-[#423A20] text-[#A89F81]/40 cursor-not-allowed'
              : 'bg-[#221E12] border-2 border-[#423A20] hover:border-[#FFD000] text-[#FFF6D1] hover:text-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
          }`}
        >
          <div
            className={`w-5 h-5 flex items-center justify-center border ${
              lifelines.swapChallenge
                ? 'bg-[#18160E] text-[#A89F81]/40 border-[#423A20]'
                : 'bg-[#0D0C07] text-[#E59500] border-[#423A20]'
            }`}
          >
            <RefreshCw className="w-3 h-3" />
          </div>
          <div className="text-left">
            <div className="font-bold flex items-center gap-1.5">
              <span>Swap</span>
              {lifelines.swapChallenge && <span className="text-[10px] text-[#A89F81] font-normal">[USED]</span>}
              {!lifelines.swapChallenge && <span className="w-1.5 h-1.5 bg-[#E59500] animate-pulse" />}
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
              className={`group relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-none text-xs font-mono transition-all ${
                isButtonDisabled
                  ? 'bg-[#0D0C07] border-2 border-[#423A20] text-[#A89F81]/40 cursor-not-allowed'
                  : canViewHintOnCurrent
                  ? 'bg-[#FFD000] border-2 border-[#FFD000] text-[#0D0C07] shadow-[2px_2px_0px_#000000] cursor-pointer'
                  : 'bg-[#221E12] border-2 border-[#423A20] hover:border-[#FFD000] text-[#FFF6D1] hover:text-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
              }`}
            >
              <div
                className={`w-5 h-5 flex items-center justify-center border ${
                  isButtonDisabled
                    ? 'bg-[#18160E] text-[#A89F81]/40 border-[#423A20]'
                    : canViewHintOnCurrent
                    ? 'bg-[#0D0C07] text-[#FFD000] border-[#0D0C07]'
                    : 'bg-[#0D0C07] text-[#FFE853] border-[#423A20]'
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="font-bold flex items-center gap-1.5">
                  <span>Ask AI</span>
                  {canViewHintOnCurrent ? (
                    <span className="text-[10px] text-[#0D0C07] font-extrabold uppercase tracking-wider">
                      [VIEW HINT]
                    </span>
                  ) : isGloballyUsed ? (
                    <span className="text-[10px] text-[#A89F81] font-normal">[USED]</span>
                  ) : (
                    <span className="w-1.5 h-1.5 bg-[#FFE853] animate-pulse" />
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
