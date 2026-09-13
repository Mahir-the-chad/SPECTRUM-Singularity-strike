import React from 'react';

interface SpectrumLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  showSubtitle?: boolean;
}

export const SpectrumLogo: React.FC<SpectrumLogoProps> = ({
  className = '',
  size = 'hero',
  showSubtitle = true,
}) => {
  const sizeClasses = {
    sm: 'h-10 w-auto',
    md: 'h-16 w-auto',
    lg: 'h-24 w-auto',
    hero: 'h-32 sm:h-40 w-auto',
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.hero;

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* Spectrum 5.0 Custom Logo Image */}
      <div className="relative flex items-center justify-center">
        {/* Ambient neon radial glows */}
        <div
          className="absolute -inset-4 rounded-full opacity-40 blur-2xl pointer-events-none -z-10"
          style={{
            background: 'radial-gradient(circle, rgba(0,229,255,0.4) 0%, rgba(236,72,153,0.3) 50%, transparent 70%)',
          }}
        />

        <img
          src="/logo.png"
          alt="Spectrum 5.0 Logo"
          referrerPolicy="no-referrer"
          className={`${currentSizeClass} object-contain drop-shadow-[0_0_25px_rgba(0,229,255,0.45)] transition-transform duration-500 hover:scale-105`}
        />
      </div>

      {/* Spectrum 5.0 Branding */}
      {showSubtitle && (
        <div className="flex flex-col items-center mt-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl sm:text-2xl font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-fuchsia-400 uppercase drop-shadow-[0_0_12px_rgba(0,229,255,0.4)]">
              SPECTRUM
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm px-2 py-0.5 rounded-md bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 tracking-wider">
              5.0
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] text-slate-400 uppercase mt-0.5">
            Technical Arena
          </span>
        </div>
      )}
    </div>
  );
};
