import React, { memo } from 'react';
import { getEntryImage } from '../utils';

interface HeroItem {
  short: string;
  en: string;
  ru: string;
  attr?: string;
  _match?: boolean;
}

interface HeroGridProps {
  heroes: HeroItem[];
  mode: 'heroes' | 'items' | 'abilities';
  eliminated: Set<string>;
  onToggleEliminated?: (short: string) => void;
  readonly?: boolean;
  onImageLoad?: (short: string) => void;
}

const HeroGrid: React.FC<HeroGridProps> = ({ 
  heroes, 
  mode, 
  eliminated, 
  onToggleEliminated, 
  readonly = false, 
  onImageLoad 
}) => {
  return (
    <div 
      id={readonly ? "leader-guesser-grid" : "hero-grid"} 
      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2"
    >
      {heroes.map((h) => (
        <MemoHeroCell
          key={h.short}
          h={h}
          mode={mode}
          isElim={eliminated.has(h.short)}
          match={h._match !== false}
          readonly={readonly}
          onToggleEliminated={onToggleEliminated}
          onImageLoad={onImageLoad}
        />
      ))}
    </div>
  );
};

const MemoHeroCell = memo(function MemoHeroCell({
  h,
  mode,
  isElim,
  match,
  readonly,
  onToggleEliminated,
  onImageLoad,
}: {
  h: HeroItem;
  mode: 'heroes' | 'items' | 'abilities';
  isElim: boolean;
  match: boolean;
  readonly: boolean;
  onToggleEliminated?: (short: string) => void;
  onImageLoad?: (short: string) => void;
}) {
  const className = `hero-cell ${isElim ? 'eliminated' : ''} ${!match ? 'search-dimmed' : ''} ${readonly ? 'readonly' : ''}`;

  const handleClick = () => {
    if (onToggleEliminated && !readonly) onToggleEliminated(h.short);
  };

  return (
    <div
      data-short={h.short}
      onClick={handleClick}
      className={className}
    >
      <div className="img-wrap">
        <img 
          src={getEntryImage(h.short, mode)} 
          alt={h.en} 
          loading="lazy" 
          onLoad={() => onImageLoad && onImageLoad(h.short)}
          onError={(e: any) => {
            e.target.src = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/pudge_lg.png';
            onImageLoad && onImageLoad(h.short);
          }} 
        />
      </div>
      <div className="hero-label" title={h.ru}>{h.en}</div>
    </div>
  );
});

export default HeroGrid;
