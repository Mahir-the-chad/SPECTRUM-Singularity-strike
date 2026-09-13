import React, { useState, useEffect } from 'react';
import { Bot, X, Sparkles, Terminal, CheckCircle2, ShieldCheck } from 'lucide-react';
import { sounds } from '../lib/audio';

interface AskAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiHint: string;
  questionIndex: number;
  difficulty?: string;
}

export const AskAiModal: React.FC<AskAiModalProps> = ({
  isOpen,
  onClose,
  aiHint,
  questionIndex,
  difficulty = 'medium',
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // If text is already loaded or user is re-opening, show immediately
    if (displayedText === aiHint) {
      setIsTyping(false);
      return;
    }

    // Typewriter effect simulation for high-tech AI transmission
    let i = 0;
    setDisplayedText('');
    setIsTyping(true);

    const timer = setInterval(() => {
      if (i < aiHint.length) {
        setDisplayedText(aiHint.slice(0, i + 1));
        i++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, 10);

    return () => clearInterval(timer);
  }, [isOpen, aiHint]);

  const handleSkipTyping = () => {
    setDisplayedText(aiHint);
    setIsTyping(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0C07]/90 font-mono animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-[#18160E] border-2 border-[#FFD000] shadow-[6px_6px_0px_#000000] overflow-hidden">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#221E12] border-b-2 border-[#423A20]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 bg-[#FFD000] text-[#0D0C07] font-bold">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FFF6D1]">
                  TACTICAL AI CO-PILOT // TRANSMISSION
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#0D0C07] text-[#FFE853] border border-[#FFD000] uppercase font-bold">
                  Q#{questionIndex + 1}
                </span>
              </div>
            </div>
          </div>
          <button
            id="close-ai-modal-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="p-1 text-[#A89F81] hover:text-[#0D0C07] hover:bg-[#FFD000] border border-transparent hover:border-[#FFD000] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#FFD000]">
            <Terminal className="w-3.5 h-3.5" />
            <span>NEURAL REASONING COPROCESSOR STREAM</span>
            {isTyping && (
              <span className="w-2 h-4 bg-[#FFD000] animate-pulse ml-1 inline-block" />
            )}
          </div>

          <div
            onClick={isTyping ? handleSkipTyping : undefined}
            className={`p-4 bg-[#0D0C07] border-2 border-[#423A20] text-[#FFF6D1] font-mono text-sm leading-relaxed min-h-[100px] select-text shadow-inner ${
              isTyping ? 'cursor-pointer hover:border-[#FFD000]' : ''
            }`}
            title={isTyping ? 'Click to reveal immediately' : undefined}
          >
            {displayedText}
            {isTyping && <span className="inline-block w-2 h-4 bg-[#FFD000] ml-1 animate-pulse" />}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#A89F81] font-mono">
            <ShieldCheck className="w-4 h-4 text-[#FFD000] shrink-0" />
            <span>
              Hint unlocked for Question #{questionIndex + 1}. You can re-open and view this transmission at any time without consuming extra lifelines.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#221E12] border-t-2 border-[#423A20] flex items-center justify-between">
          {isTyping ? (
            <button
              type="button"
              id="skip-ai-typing-btn"
              onClick={handleSkipTyping}
              className="text-[11px] font-mono text-[#FFD000] hover:text-[#FFE853] underline cursor-pointer"
            >
              Skip animation &amp; view full hint
            </button>
          ) : (
            <div className="text-[11px] font-mono text-[#A89F81] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#FFD000]" />
              <span>Hint available in Question #{questionIndex + 1}</span>
            </div>
          )}
          <button
            id="dismiss-ai-hint-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-5 py-2 rounded-none bg-[#FFD000] hover:bg-[#FFE853] active:translate-x-[1px] active:translate-y-[1px] text-[#0D0C07] font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:shadow-none"
          >
            Close &amp; Return to Arena
          </button>
        </div>
      </div>
    </div>
  );
};
