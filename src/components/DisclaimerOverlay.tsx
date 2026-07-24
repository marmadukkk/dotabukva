import React, { useEffect, useState } from 'react';

const FADE_MS = 900;
const TOTAL_MS = 5000;
const VISIBLE_MS = TOTAL_MS - FADE_MS;

interface DisclaimerOverlayProps {
  onDone: () => void;
  onPlaySound: () => void;
}

/**
 * Startup educational disclaimer: darkened fullscreen, bilingual text, 5s then fade out.
 */
const DisclaimerOverlay: React.FC<DisclaimerOverlayProps> = ({ onDone, onPlaySound }) => {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    onPlaySound();

    const fadeTimer = window.setTimeout(() => setFading(true), VISIBLE_MS);
    const doneTimer = window.setTimeout(() => onDone(), TOTAL_MS);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only intro
  }, []);

  return (
    <div
      className={`disclaimer-overlay fixed inset-0 z-[10050] flex items-center justify-center px-5 sm:px-8 ${
        fading ? 'disclaimer-overlay--fade' : ''
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="disclaimer-title"
    >
      <div className="disclaimer-overlay__panel max-w-xl w-full text-center">
        <h1
          id="disclaimer-title"
          className="font-display text-3xl sm:text-4xl font-bold tracking-tighter text-[#f0c060] mb-5"
        >
          Внимание / Warning
        </h1>

        <p className="font-display text-sm sm:text-base text-[#e0d2b0] leading-relaxed mb-4">
          Это приложение создано в учебных целях и является open-source проектом.
          Не является коммерческим продуктом. Все ассеты взяты из открытых источников.
        </p>
        <p className="font-display text-sm sm:text-base text-[#c8b896] leading-relaxed mb-6">
          This application was created for educational purposes and is an open-source project.
          It is not a commercial product. All assets were taken from open sources.
        </p>

        <p className="font-display text-lg sm:text-xl font-semibold tracking-tight text-[#c23c2a]">
          @mrmdkkkk
        </p>
      </div>
    </div>
  );
};

export default DisclaimerOverlay;
