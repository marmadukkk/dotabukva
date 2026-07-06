import React from 'react';
import { Language, t } from '../i18n';

interface LeaderReelsProps {
  language: Language;
  heroReelRef: React.RefObject<HTMLDivElement | null>;
  letterReelRef: React.RefObject<HTMLDivElement | null>;
  heroStripRef: React.RefObject<HTMLDivElement | null>;
  letterStripRef: React.RefObject<HTMLDivElement | null>;
  isSpinning: boolean;
  onSpin: () => void;
  multicastLevel: number;
  sparks: Array<{id: string, tx: number, ty: number, delay: number, size: number}>;
  currentMode: 'heroes' | 'items' | 'abilities';
}

const LeaderReels: React.FC<LeaderReelsProps> = ({
  language,
  heroReelRef,
  letterReelRef,
  heroStripRef,
  letterStripRef,
  isSpinning,
  onSpin,
  multicastLevel,
  sparks,
  currentMode,
}) => {
  return (
    <div className="relative mb-6">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* HERO / ITEM / ABILITY REEL */}
        <div className="lg:col-span-3">
          <div className="flex items-center mb-2 px-1">
            <div className="section-title flex items-center gap-x-2">
              <i className="fa-solid fa-user-ninja"></i>
              <span>{currentMode === 'items' ? t(language, 'misc.item').toUpperCase() : currentMode === 'abilities' ? t(language, 'misc.ability').toUpperCase() : t(language, 'misc.hero').toUpperCase()}</span>
            </div>
          </div>
          <div 
            id="hero-reel" 
            ref={heroReelRef} 
            className="slot-window h-[236px] relative cursor-pointer" 
            onClick={() => !isSpinning && onSpin()}
          >
            <div id="hero-strip" ref={heroStripRef} className="slot-strip"></div>
            <div className="reel-cylinder left"><div className="cylinder-strip"></div></div>
            <div className="reel-cylinder right"><div className="cylinder-strip"></div></div>
            <div className="reel-shadow"></div>
            <div className="reel-lens absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] h-[78px] rounded-xl pointer-events-none z-20"></div>
          </div>
        </div>

        {/* LETTER REEL */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <div className="section-title flex items-center gap-x-2"><i className="fa-solid fa-font"></i><span>{t(language, 'leader.letter')}</span></div>
          </div>
          <div 
            id="letter-reel" 
            ref={letterReelRef} 
            className="slot-window h-[236px] relative cursor-pointer" 
            onClick={() => !isSpinning && onSpin()}
          >
            <div id="letter-strip" ref={letterStripRef} className="slot-strip letter-strip"></div>
            <div className="reel-cylinder left"><div className="cylinder-strip"></div></div>
            <div className="reel-cylinder right"><div className="cylinder-strip"></div></div>
            <div className="reel-shadow"></div>
            <div className="reel-lens absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] h-[110px] rounded-2xl pointer-events-none z-20"></div>
          </div>
        </div>
      </div>

      {/* Multicast numbers overlaid directly IN FRONT OF the drums on a higher layer */}
      {multicastLevel > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[60]">
          <div className="relative">
            <div 
              className={`
                multicast-text font-display text-[5.5rem] sm:text-[6rem] font-black tracking-[-5px] 
                transition-all duration-100
                ${multicastLevel >= 3 ? 'scale-125' : 'scale-100'}
                level-${multicastLevel}
              `}
              style={{
                color: multicastLevel >= 4 
                  ? '#ff6b6b' 
                  : (multicastLevel >= 3 ? '#ff9f43' : '#f0c060'),
                textShadow: multicastLevel >= 4 
                  ? '0 0 12px #ff6b6b, 0 0 28px #ff4500, 0 0 45px #d4af37, 2px 3px 6px rgba(0,0,0,0.95)' 
                  : (multicastLevel >= 3 
                    ? '0 0 12px #ff9f43, 0 0 26px #ff6b00, 0 0 38px #d4af37, 2px 3px 6px rgba(0,0,0,0.9)' 
                    : '0 0 10px #d4af37, 0 0 22px #8b6914, 2px 3px 5px rgba(0,0,0,0.9)'),
                animation: multicastLevel === 4 ? 'multicast-pop 0.18s ease, multicast-pulse 1.2s ease-in-out infinite' : 'multicast-pop 0.22s ease'
              } as any}
            >
              x{multicastLevel}
            </div>

            {/* Dynamic sparks - more intense for higher x */}
            {sparks.map((spark) => (
              <div
                key={spark.id}
                className="spark"
                style={{
                  '--tx': `${spark.tx}px` as any,
                  '--ty': `${spark.ty}px` as any,
                  left: '50%',
                  top: '50%',
                  width: `${spark.size * 1.2}px`,
                  height: `${spark.size * 1.2}px`,
                  animationDelay: `${spark.delay}ms`,
                  background: multicastLevel >= 4 ? '#ffeb3b' : (multicastLevel >= 3 ? '#ffd700' : '#f0c060'),
                  boxShadow: multicastLevel >= 3 
                    ? '0 0 10px #ff8c00, 0 0 18px #ff4500' 
                    : '0 0 8px #f0c060, 0 0 14px #d4af37'
                } as any}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaderReels;
