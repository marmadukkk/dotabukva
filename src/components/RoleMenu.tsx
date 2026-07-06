import React from 'react';
import { Language, t, getModeWord, getModePlural } from '../i18n';

interface RoleMenuProps {
  language: Language;
  currentMode: 'heroes' | 'items' | 'abilities';
  onLoadMode: (mode: 'heroes' | 'items' | 'abilities') => void;
  onEnterLeader: () => void;
  onEnterGuesser: () => void;
}

const RoleMenu: React.FC<RoleMenuProps> = ({ language, currentMode, onLoadMode, onEnterLeader, onEnterGuesser }) => {
  return (
    <div id="role-menu" className="max-w-5xl mx-auto px-5 pt-8 pb-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-x-2 text-[#d4af37] text-xs tracking-[4px] font-semibold mb-3">
          <i className="fa-solid fa-users"></i>
          <span>{t(language, 'role.company')}</span>
        </div>
        <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter text-white">{t(language, 'role.title')}</h1>
        <p className="mt-2 text-zinc-400 text-[15px]">{t(language, 'role.subtitle')}</p>

        {/* Mode switch exact */}
        <div className="mt-4 mb-2">
          <div className="text-[10px] text-zinc-500 tracking-[1.5px] mb-1">{t(language, 'role.mode')}</div>
          <div className="inline-grid grid-cols-3 rounded-2xl border border-[#4a3728] overflow-hidden text-sm">
            <button 
              onClick={() => onLoadMode('heroes')} 
              className={`px-4 py-1.5 font-medium text-center ${currentMode==='heroes' ? 'bg-[#1f1f1f]' : 'hover:bg-[#2a2a2a]'}`}
            >
              {t(language, 'role.heroes')}
            </button>
            <button 
              onClick={() => onLoadMode('items')} 
              className={`px-4 py-1.5 font-medium text-center ${currentMode==='items' ? 'bg-[#1f1f1f]' : 'hover:bg-[#2a2a2a]'} border-l border-[#4a3728]`}
            >
              {t(language, 'role.items')}
            </button>
            <button 
              onClick={() => onLoadMode('abilities')} 
              className={`px-4 py-1.5 font-medium text-center ${currentMode==='abilities' ? 'bg-[#1f1f1f]' : 'hover:bg-[#2a2a2a]'} border-l border-[#4a3728]`}
            >
              {t(language, 'role.abilities')}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
        <div onClick={onEnterLeader} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-[2.5px] text-[#c23c2a] font-bold">{t(language, 'role.leaderBadge')}</div>
              <div className="font-display text-4xl tracking-[-1.5px] mt-1 group-hover:text-[#f0c060] transition-colors text-white">{t(language, 'role.leaderTitle')}</div>
            </div>
            <i className="fa-solid fa-crown text-4xl text-[#d4af37] group-hover:rotate-12 group-hover:scale-110 transition-transform"></i>
          </div>
          <div className="mt-5 text-[15px] text-zinc-300">{t(language, 'role.leaderDesc').replace('{mode}', getModeWord(language, currentMode))}</div>
          <div className="mt-5 inline-flex items-center text-xs font-semibold tracking-widest text-[#d4af37]">{t(language, 'role.leaderCta')} <i className="fa-solid fa-arrow-right ml-2"></i></div>
        </div>

        <div onClick={onEnterGuesser} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs tracking-[2.5px] text-emerald-400 font-bold">{t(language, 'role.guesserBadge')}</div>
              <div className="font-display text-4xl tracking-[-1.5px] mt-1 group-hover:text-[#f0c060] transition-colors text-white">{t(language, 'role.guesserTitle')}</div>
            </div>
            <i className="fa-solid fa-th-large text-4xl text-[#d4af37] group-hover:scale-110 group-hover:rotate-6 transition-transform"></i>
          </div>
          <div className="mt-5 text-[15px] text-zinc-300">{t(language, 'role.guesserDesc').replace('{mode}', getModePlural(language, currentMode))}</div>
          <div className="mt-5 inline-flex items-center text-xs font-semibold tracking-widest text-[#d4af37]">{t(language, 'role.guesserCta')} <i className="fa-solid fa-arrow-right ml-2"></i></div>
        </div>
      </div>
    </div>
  );
};

export default RoleMenu;
