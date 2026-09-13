import React from 'react';
import { Volume2, VolumeX, User, HelpCircle } from 'lucide-react';
import { sounds } from '../lib/audio';

interface NavbarProps {
  currentView: 'landing' | 'register' | 'rules' | 'quiz' | 'result' | 'admin';
  onNavigate: (view: 'landing' | 'register' | 'rules' | 'quiz' | 'result' | 'admin') => void;
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
    <header className="sticky top-0 z-40 w-full border-b-2 border-[#423A20] bg-[#18160E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <button
          id="nav-logo-btn"
          onClick={() => {
            sounds.playSelect();
            onNavigate('landing');
          }}
          className="flex items-center gap-3 group text-left transition-opacity hover:opacity-90 cursor-pointer"
        >
          <img
            id="nav-brand-logo"
            src="/logo.png"
            alt="Spectrum 5.0"
            referrerPolicy="no-referrer"
            className="h-10 w-auto object-contain border border-[#423A20] p-1 bg-[#0D0C07] transition-transform duration-200 group-hover:scale-105"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base sm:text-lg tracking-wider text-[#FFF6D1] uppercase font-mono">
                SINGULARITY <span className="text-[#FFD000]">STRIKE</span>
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#221E12] border border-[#FFD000] text-[#FFD000] font-bold tracking-wider">
                SPECTRUM 5.0
              </span>
            </div>
            <p className="text-[11px] text-[#A89F81] hidden sm:block tracking-wide font-mono">
              Round 1 Arena
            </p>
          </div>
        </button>

        {/* Center: Live session status when in quiz */}
        {currentView === 'quiz' && (
          <div className="hidden md:flex items-center gap-4 px-3.5 py-1.5 bg-[#221E12] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#FFF6D1]">
              <User className="w-3.5 h-3.5 text-[#FFD000]" />
              <span className="text-[#FFF6D1] font-bold truncate max-w-[120px]">
                {participantName || 'Operative'}
              </span>
            </div>
            <span className="w-1 h-1 bg-[#423A20]" />
            <div className="flex items-center gap-1.5 text-xs font-mono text-[#FFD000]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full bg-[#FFD000] opacity-75" />
                <span className="relative inline-flex h-2 w-2 bg-[#FFD000]" />
              </span>
              <span className="text-[#A89F81]">TIME:</span>
              <span className="font-bold text-[#FFE853]">{remainingTimeFormatted}</span>
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
              className="p-2 bg-[#221E12] text-[#FFF6D1] hover:text-[#0D0C07] hover:bg-[#FFD000] border-2 border-[#423A20] hover:border-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            id="nav-sound-btn"
            onClick={onToggleSound}
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
            className="p-2 bg-[#221E12] text-[#FFF6D1] hover:text-[#0D0C07] hover:bg-[#FFD000] border-2 border-[#423A20] hover:border-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#FFD000]" />
            ) : (
              <VolumeX className="w-4 h-4 text-[#A89F81]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
