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
      <div className="relative flex items-center justify-center p-3 bg-[#18160E] border-2 border-[#423A20] shadow-[4px_4px_0px_#000000]">
        <img
          src="/logo.png"
          alt="Spectrum 5.0 Logo"
          referrerPolicy="no-referrer"
          className={`${currentSizeClass} max-w-[160px] object-contain transition-transform duration-300 hover:scale-105`}
        />
      </div>

      {/* Spectrum 5.0 Branding */}
      {showSubtitle && (
        <div className="flex flex-col items-center mt-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl sm:text-2xl font-mono tracking-widest text-[#FFD000] uppercase">
              SPECTRUM
            </span>
            <span className="font-mono font-bold text-xs sm:text-sm px-2 py-0.5 bg-[#FFD000] text-[#0D0C07] border border-[#FFD000] shadow-[2px_2px_0px_#000000] tracking-wider">
              5.0
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] text-[#A89F81] uppercase mt-1">
            Technical Arena
          </span>
        </div>
      )}
    </div>
  );
};
