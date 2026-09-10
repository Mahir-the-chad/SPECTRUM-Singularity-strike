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
      setDisplayedText('');
      setIsTyping(true);
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
    }, 12);

    return () => clearInterval(timer);
  }, [isOpen, aiHint]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden shadow-cyan-500/10">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950/90 border-b border-cyan-500/30">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                  TACTICAL AI CO-PILOT // TRANSMISSION
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
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
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Terminal className="w-3.5 h-3.5" />
            <span>NEURAL REASONING COPROCESSOR STREAM</span>
            {isTyping && (
              <span className="w-2 h-4 bg-cyan-400 animate-pulse ml-1 inline-block" />
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/20 text-slate-200 font-mono text-sm leading-relaxed min-h-[100px] select-text">
            {displayedText}
            {isTyping && <span className="inline-block w-2 h-4 bg-cyan-400 ml-1 animate-pulse" />}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Conceptual hint loaded without revealing the explicit answer. Lifeline is now marked as used.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            id="dismiss-ai-hint-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all"
          >
            Acknowledge & Return to Arena
          </button>
        </div>
      </div>
    </div>
  );
};
