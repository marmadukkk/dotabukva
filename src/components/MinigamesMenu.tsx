import React from 'react';
import { Language, t } from '../i18n';

export type MinigameId = 'invoker' | 'build' | 'quiz';

interface MinigamesMenuProps {
  language: Language;
  onBack: () => void;
  onSelect: (id: MinigameId) => void;
}

/** Minimap-style Invoker icon (Dota CDN). */
const INVOKER_MINIMAP_ICON =
  'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/invoker_icon.png';

const GAMES: {
  id: MinigameId;
  titleKey: string;
  descKey: string;
  /** Font Awesome class, or image URL if starts with http / / */
  icon: string;
}[] = [
  {
    id: 'invoker',
    titleKey: 'minigames.invoker',
    descKey: 'minigames.invokerDesc',
    icon: INVOKER_MINIMAP_ICON,
  },
  {
    id: 'build',
    titleKey: 'minigames.build',
    descKey: 'minigames.buildDesc',
    icon: 'fa-cubes',
  },
  {
    id: 'quiz',
    titleKey: 'minigames.quiz',
    descKey: 'minigames.quizDesc',
    icon: 'fa-circle-question',
  },
];

function GameIcon({ icon, alt }: { icon: string; alt: string }) {
  const isImage = icon.startsWith('http') || icon.startsWith('/');
  if (isImage) {
    return (
      <img
        src={icon}
        alt={alt}
        draggable={false}
        className="w-10 h-10 sm:w-11 sm:h-11 object-contain group-hover:scale-110 transition-transform flex-shrink-0"
      />
    );
  }
  return (
    <i
      className={`fa-solid ${icon} text-2xl sm:text-3xl text-[#d4af37] group-hover:scale-110 group-hover:rotate-6 transition-transform w-10 text-center flex-shrink-0`}
    ></i>
  );
}

const MinigamesMenu: React.FC<MinigamesMenuProps> = ({ language, onBack, onSelect }) => {
  return (
    <div id="minigames-menu" className="max-w-3xl mx-auto px-5 pt-8 pb-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-x-2 text-[#d4af37] text-xs tracking-[4px] font-semibold mb-3">
          <i className="fa-solid fa-puzzle-piece"></i>
          <span>{t(language, 'minigames.badge')}</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter text-white">
          {t(language, 'minigames.title')}
        </h1>
        <p className="mt-2 text-zinc-400 text-[15px]">{t(language, 'minigames.subtitle')}</p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {GAMES.map((game) => (
          <div
            key={game.id}
            onClick={() => onSelect(game.id)}
            data-sfx="button"
            className="dota-card group cursor-pointer rounded-2xl p-5 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]"
          >
            <div className="flex items-center gap-4">
              <GameIcon icon={game.icon} alt={t(language, game.titleKey)} />
              <div className="min-w-0 flex-1">
                <div className="font-display text-xl sm:text-2xl tracking-tight text-white">
                  {t(language, game.titleKey)}
                </div>
                <div className="text-sm text-zinc-400 mt-0.5">{t(language, game.descKey)}</div>
              </div>
              <i className="fa-solid fa-chevron-right text-zinc-600 group-hover:text-[#d4af37] transition-colors"></i>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-md mx-auto mt-6">
        <button
          type="button"
          onClick={onBack}
          data-sfx="button"
          className="w-full h-11 ui-btn text-sm rounded-xl transition-colors"
        >
          {t(language, 'minigames.back')}
        </button>
      </div>
    </div>
  );
};

export default MinigamesMenu;
