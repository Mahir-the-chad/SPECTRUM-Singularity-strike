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
    <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-6 h-auto overflow-visible">
      {/* Hero Header */}
      <div className="text-center flex flex-col items-center gap-3 h-auto overflow-visible">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-medium uppercase tracking-widest h-auto overflow-visible">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          Tactical Tech Competition
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-100 font-mono h-auto overflow-visible">
          SINGULARITY <span className="text-cyan-400">STRIKE</span>
        </h1>

        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed h-auto overflow-visible">
          Prove your mastery across distributed systems, machine intelligence, cryptographic protocols,
          and low-level algorithms. 15 questions, 15 minutes, 3 tactical lifelines.
        </p>
      </div>

      {/* Active Session Recovery Alert */}
      {hasActiveSession && onResumeQuiz && (
        <div className="max-w-3xl w-full mx-auto p-4 sm:p-5 rounded-xl bg-amber-500/10 border border-amber-500/40 text-amber-200 flex flex-col gap-4 h-auto overflow-visible">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 h-auto overflow-visible">
            <div className="flex items-start gap-3 h-auto overflow-visible">
              <RefreshCw className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-spin" style={{ animationDuration: '8s' }} />
              <div className="flex flex-col gap-1 h-auto overflow-visible">
                <h3 className="font-semibold text-sm sm:text-base text-amber-200">
                  Active Session Detected for &quot;{savedName}&quot;
                </h3>
                <p className="text-xs text-amber-300/80">
                  Remaining Time: <span className="font-mono font-bold text-amber-300">{minutesRemaining}m {secondsRemaining.toString().padStart(2, '0')}s</span>.
                  Your answers and countdown are safely stored.
                </p>
              </div>
            </div>
            <button
              id="resume-quiz-btn"
              type="button"
              onClick={() => {
                sounds.playSelect();
                onResumeQuiz();
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer h-auto overflow-visible"
            >
              <span>Resume Active Strike</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Card Container */}
      <div className="max-w-3xl w-full mx-auto p-6 flex flex-col gap-6 rounded-xl border border-cyan-500/30 bg-slate-900/50 h-auto overflow-visible">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 h-auto overflow-visible">
          {/* PARTICIPANT IDENTITY input field in its own block at the top with clear padding */}
          <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-800 h-auto overflow-visible">
            <label
              htmlFor="participant-name-input"
              className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider"
            >
              Participant Identity / Full Name
            </label>
            <input
              id="participant-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-sans text-base transition-all h-auto overflow-visible"
            />
            {error && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5 font-mono mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* 3 feature cards inside a responsive grid row below the input field */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-auto overflow-visible">
            {/* Feature 1: 15-Min Countdown */}
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col gap-2 h-auto overflow-visible">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono font-semibold">
                <Clock className="w-4 h-4 shrink-0" />
                <span>15-MIN COUNTDOWN</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Continuous wall-clock timer. Page reload persists your time without reset.
              </p>
            </div>

            {/* Feature 2: 3 Single-Use Lifelines */}
            <div className="p-4 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-col gap-2 h-auto overflow-visible">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-mono font-semibold">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>3 SINGLE-USE LIFELINES</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                50-50 elimination, category Swap Challenge, and conceptual Ask AI hints.
              </p>
            </div>

            {/* Feature 3: Tab-Switch Defense */}
            <div className="p-4 rounded-lg bg-slate-950/60 border border-rose-500/30 flex flex-col gap-2 h-auto overflow-visible">
              <div className="flex items-center gap-2 text-rose-400 text-xs font-mono font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>TAB-SWITCH DEFENSE</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Switching tabs or minimizing triggers immediate auto-submission.
              </p>
            </div>
          </div>

          {/* COMPETITION DIRECTIVE notice banner below the grid */}
          <div className="p-3.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-xs text-cyan-300 leading-relaxed font-mono h-auto overflow-visible">
            <strong className="text-cyan-200">COMPETITION DIRECTIVE:</strong> Ensure an undisturbed environment. Once the 15-minute timer initiates, your attempt is logged and scored in real-time on the global Firestore leaderboard.
          </div>

          {/* INITIALIZE STRIKE RUN button prominently at the bottom with standard padding (py-3) */}
          <button
            id="start-quiz-btn"
            type="submit"
            className="w-full py-3 px-6 rounded-lg bg-cyan-400 hover:bg-cyan-300 active:bg-cyan-500 text-slate-950 font-mono font-extrabold text-sm sm:text-base tracking-wider uppercase transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/35 cursor-pointer h-auto overflow-visible"
          >
            <Play className="w-5 h-5 fill-slate-950 text-slate-950 shrink-0" />
            <span>INITIALIZE STRIKE RUN</span>
          </button>
        </form>
      </div>
    </div>
  );
};
