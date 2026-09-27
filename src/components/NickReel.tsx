import React, { useEffect, useRef } from 'react';

const ITEM = 72;
const COPIES = 8;

interface NickReelProps {
  names: string[];
  winnerName: string;
}

/** Vertical nickname reel. Lands on winnerName. */
const NickReel: React.FC<NickReelProps> = ({ names, winnerName }) => {
  const stripRef = useRef<HTMLDivElement>(null);
  const list = names.length ? names : ['Player'];
  const winnerIndex = Math.max(0, list.indexOf(winnerName));

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const target = (COPIES - 2) * list.length + winnerIndex;
    strip.style.transition = 'none';
    strip.style.transform = 'translateY(0px)';
    const frame = requestAnimationFrame(() => {
      strip.style.transition = 'transform 3s cubic-bezier(0.15, 0.8, 0.1, 1)';
      strip.style.transform = `translateY(-${target * ITEM}px)`;
    });
    return () => cancelAnimationFrame(frame);
  }, [list.length, winnerIndex, winnerName]);

  const strip = Array.from({ length: COPIES }, () => list).flat();

  return (
    <div className="mx-auto mt-4 w-full max-w-xs">
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#d4af37] bg-black/70" style={{ height: ITEM }}>
        <div ref={stripRef} className="will-change-transform">
          {strip.map((name, index) => (
            <div
              key={`${name}-${index}`}
              className="flex items-center justify-center font-display text-2xl text-[#f0c060]"
              style={{ height: ITEM }}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NickReel;
