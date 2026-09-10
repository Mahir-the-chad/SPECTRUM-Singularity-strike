import React, { useState } from 'react';
import { Play, ShieldAlert, Zap, Clock, Sparkles, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';
import { sounds } from '../lib/audio';

interface ParticipantEntryProps {
  onStartQuiz: (name: string) => void;
  onResumeQuiz?: () => void;
  hasActiveSession?: boolean;
  savedName?: string;
  savedRemainingSeconds?: number;
}

export const ParticipantEntry: React.FC<ParticipantEntryProps> = ({
  onStartQuiz,
  onResumeQuiz,
  hasActiveSession = false,
  savedName = '',
  savedRemainingSeconds = 0,
}) => {
  const [name, setName] = useState(savedName || '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your full name or callsign to enter the strike arena.');
      return;
    }
    setError('');
    sounds.playSelect();
    onStartQuiz(name.trim());
  };

  const minutesRemaining = Math.floor(savedRemainingSeconds / 60);
  const secondsRemaining = savedRemainingSeconds % 60;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium uppercase tracking-widest mb-4">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Tactical Tech Competition
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 font-mono">
          SINGULARITY <span className="text-cyan-400 drop-shadow-[0_0_20px_rgba(6,182,212,0.4)]">STRIKE</span>
        </h1>

        <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Prove your mastery across distributed systems, machine intelligence, cryptographic protocols,
          and low-level algorithms. 15 questions, 15 minutes, 3 tactical lifelines.
        </p>
      </div>

      {/* Active Session Recovery Alert */}
      {hasActiveSession && onResumeQuiz && (
        <div className="mb-8 p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '8s' }} />
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-amber-200">
                  Active Session Detected for &quot;{savedName}&quot;
                </h3>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Remaining Time: <span className="font-mono font-bold text-amber-300">{minutesRemaining}m {secondsRemaining.toString().padStart(2, '0')}s</span>.
                  Your answers and countdown are safely stored.
                </p>
              </div>
            </div>
            <button
              id="resume-quiz-btn"
              onClick={() => {
                sounds.playSelect();
                onResumeQuiz();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Resume Active Strike</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Entry Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="participant-name-input" className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Participant Identity / Full Name
            </label>
            <div className="relative">
              <input
                id="participant-name-input"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g., Mahir Saraiya"
                autoFocus
                className="w-full px-4 py-3.5 rounded-xl bg-slate-950/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 font-sans text-base transition-all"
              />
            </div>
            {error && (
              <p className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}
          </div>

          {/* Tactical Briefing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold mb-1">
                <Clock className="w-4 h-4" />
                15-MIN COUNTDOWN
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                Continuous wall-clock timer. Page reload persists your time without reset.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold mb-1">
                <Sparkles className="w-4 h-4" />
                3 SINGLE-USE LIFELINES
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                50-50 elimination, category Swap Challenge, and conceptual Ask AI hints.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-rose-500/20 bg-rose-500/[0.02]">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold mb-1">
                <ShieldAlert className="w-4 h-4" />
                TAB-SWITCH DEFENSE
              </div>
              <p className="text-xs text-slate-400 leading-snug">
                Switching tabs or minimizing triggers immediate auto-submission.
              </p>
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-300/90 leading-relaxed font-mono">
            <span className="font-bold text-cyan-200">COMPETITION DIRECTIVE:</span> Ensure an undisturbed environment. Once the 15-minute timer initiates, your attempt is logged and scored in real-time on the global Firestore leaderboard.
          </div>

          {/* Launch Button */}
          <button
            id="start-quiz-btn"
            type="submit"
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-mono font-extrabold text-sm sm:text-base tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-slate-950" />
            <span>INITIALIZE STRIKE RUN</span>
          </button>
        </form>
      </div>
    </div>
  );
};
