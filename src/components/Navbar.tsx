import React from 'react';
import { Zap, ShieldAlert, Trophy, Volume2, VolumeX, User, HelpCircle } from 'lucide-react';
import { sounds } from '../lib/audio';

interface NavbarProps {
  currentView: 'entry' | 'quiz' | 'result' | 'admin';
  onNavigate: (view: 'entry' | 'quiz' | 'result' | 'admin') => void;
  participantName?: string;
  remainingTimeFormatted?: string;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenRules?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  participantName,
  remainingTimeFormatted,
  soundEnabled,
  onToggleSound,
  onOpenRules,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          id="nav-logo-btn"
          onClick={() => {
            if (currentView !== 'quiz') {
              onNavigate('entry');
            }
          }}
          className="flex items-center gap-3 group text-left transition-opacity hover:opacity-90"
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 via-cyan-500/10 to-transparent border border-cyan-500/40 shadow-inner group-hover:border-cyan-400">
            <Zap className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 bg-cyan-400/10 rounded-lg blur-sm -z-10" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-wider text-slate-100 uppercase font-mono">
                SINGULARITY <span className="text-cyan-400">STRIKE</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 font-semibold tracking-wider">
                v2.6
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block tracking-wide">
              High-Stakes Technical Arena
            </p>
          </div>
        </button>

        {/* Center: Live session status when in quiz */}
        {currentView === 'quiz' && (
          <div className="hidden md:flex items-center gap-4 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 shadow-inner">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-slate-100 font-semibold truncate max-w-[120px]">
                {participantName || 'Operative'}
              </span>
            </div>
            <span className="w-1 h-1 rounded-full bg-slate-600" />
            <div className="flex items-center gap-1.5 text-xs font-mono text-cyan-300">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
              <span>TIME:</span>
              <span className="font-bold text-cyan-300">{remainingTimeFormatted}</span>
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Rules info */}
          {onOpenRules && (
            <button
              id="nav-rules-btn"
              onClick={onOpenRules}
              title="View Competition Rules"
              className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-transparent hover:border-cyan-500/30 transition-all"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            id="nav-sound-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-900 border border-transparent hover:border-cyan-500/30 transition-all"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Admin / Leaderboard Nav Button */}
          <button
            id="nav-admin-btn"
            onClick={() => {
              if (currentView === 'admin') {
                onNavigate('entry');
              } else {
                onNavigate('admin');
              }
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium border transition-all ${
              currentView === 'admin'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:border-cyan-500/40 hover:text-cyan-200'
            }`}
          >
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentView === 'admin' ? 'Exit Admin' : 'Admin & Board'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
