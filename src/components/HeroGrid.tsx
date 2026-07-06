import React from 'react';
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
  onToggleEliminated?: (short: string) => void; // undefined = readonly
  readonly?: boolean;
  onImageLoad?: (short: string) => void;
}

const HeroGrid: React.FC<HeroGridProps> = ({ heroes, mode, eliminated, onToggleEliminated, readonly = false, onImageLoad }) => {
  return (
    <div 
      id={readonly ? "leader-guesser-grid" : "hero-grid"} 
      className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2"
    >
      {heroes.map((h: any) => {
        const isElim = eliminated.has(h.short);
        const match = h._match !== false; // default visible
        const className = `hero-cell ${isElim ? 'eliminated' : ''} ${!match ? 'search-dimmed' : ''} ${readonly ? 'readonly' : ''}`;

        const handleClick = () => {
          if (onToggleEliminated && !readonly) onToggleEliminated(h.short);
        };

        return (
          <div
            key={h.short}
            data-short={h.short}
            onClick={handleClick}
            className={className}
          >
            <div className="img-wrap">
              <img 
                src={getEntryImage(h.short, mode)} 
                alt={h.en} 
                loading="eager" 
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
      })}
    </div>
  );
};

export default HeroGrid;
