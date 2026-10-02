import React from 'react';
import { Language, t } from '../i18n';
import type { QuizMode } from '../minigames/quiz/types';

interface QuizMenuProps {
  language: Language;
  onBack: () => void;
  onSelect: (mode: QuizMode) => void;
}

const MODES: {
  id: QuizMode;
  titleKey: string;
  descKey: string;
  icon: string;
  beta?: boolean;
}[] = [
  {
    id: 'classic',
    titleKey: 'quiz.classic',
    descKey: 'quiz.classicDesc',
    icon: 'fa-table-cells',
  },
  {
    id: 'ability',
    titleKey: 'quiz.ability',
    descKey: 'quiz.abilityDesc',
    icon: 'fa-wand-magic-sparkles',
  },
  {
    id: 'items',
    titleKey: 'quiz.items',
    descKey: 'quiz.itemsDesc',
    icon: 'fa-flask',
  },
  {
    id: 'trivia',
    titleKey: 'quiz.trivia',
    descKey: 'quiz.triviaDesc',
    icon: 'fa-dice',
    beta: true,
  },
];

const QuizMenu: React.FC<QuizMenuProps> = ({ language, onBack, onSelect }) => {
  return (
    <div id="quiz-menu" className="max-w-3xl mx-auto px-5 pt-8 pb-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-x-2 text-[#d4af37] text-xs tracking-[4px] font-semibold mb-3">
          <i className="fa-solid fa-circle-question"></i>
          <span>{t(language, 'quiz.badge')}</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter text-white">
          {t(language, 'minigames.quiz')}
        </h1>
        <p className="mt-2 text-zinc-400 text-[15px] max-w-md mx-auto">
          {t(language, 'quiz.subtitle')}
        </p>
      </div>

      <div className="space-y-3 max-w-md mx-auto">
        {MODES.map((m) => (
          <div
            key={m.id}
            onClick={() => onSelect(m.id)}
            data-sfx="button"
            className="dota-card group cursor-pointer rounded-2xl p-5 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]"
          >
            <div className="flex items-center gap-4">
              <i
                className={`fa-solid ${m.icon} text-2xl sm:text-3xl text-[#d4af37] group-hover:scale-110 transition-transform w-10 text-center`}
              ></i>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-display text-xl sm:text-2xl tracking-tight text-white">
                    {t(language, m.titleKey)}
                  </div>
                  {m.beta && (
                    <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-400 bg-amber-500/10">
                      BETA
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-400 mt-0.5">{t(language, m.descKey)}</div>
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

export default QuizMenu;
