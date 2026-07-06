import React from 'react';
import { Language, t } from '../i18n';

interface MainMenuProps {
  language: Language;
  onStartNormal: () => void;
  onCreateRoom: () => void;
  onShowRooms: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ language, onStartNormal, onCreateRoom, onShowRooms }) => {
  return (
    <div id="main-menu" className="max-w-5xl mx-auto px-5 pt-12 pb-12">
      <div className="text-center mb-10">
        <div className="flex justify-center mb-6">
          <img 
            src="/images/canvas.png" 
            alt="Dota Bukva" 
            className="w-28 h-28 object-contain drop-shadow-lg" 
          />
        </div>
        <h1 className="font-display text-6xl sm:text-7xl font-bold tracking-tighter text-white">DOTA-BUKVA</h1>
        <p className="mt-2 text-zinc-400 text-lg">{t(language, 'main.tagline')}</p>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        <div onClick={onStartNormal} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
          <div className="flex items-center gap-4">
            <i className="fa-solid fa-gamepad text-3xl text-[#d4af37] group-hover:rotate-12 group-hover:scale-110 transition-transform"></i>
            <div>
              <div className="font-display text-2xl tracking-tight text-white">{t(language, 'main.normal')}</div>
              <div className="text-sm text-zinc-400 mt-0.5">{t(language, 'main.normalDesc')}</div>
            </div>
          </div>
        </div>

        <div onClick={onCreateRoom} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
          <div className="flex items-center gap-4">
            <i className="fa-solid fa-plus text-3xl text-[#d4af37] group-hover:rotate-90 group-hover:scale-110 transition-transform"></i>
            <div>
              <div className="font-display text-2xl tracking-tight text-white">{t(language, 'main.create')}</div>
              <div className="text-sm text-zinc-400 mt-0.5">{t(language, 'main.createDesc')}</div>
            </div>
          </div>
        </div>

        <div onClick={onShowRooms} className="dota-card group cursor-pointer rounded-2xl p-6 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]">
          <div className="flex items-center gap-4">
            <i className="fa-solid fa-list text-3xl text-[#d4af37] group-hover:-rotate-6 group-hover:scale-110 transition-transform"></i>
            <div>
              <div className="font-display text-2xl tracking-tight text-white">{t(language, 'main.rooms')}</div>
              <div className="text-sm text-zinc-400 mt-0.5">{t(language, 'main.roomsDesc')}</div>
            </div>
          </div>
        </div>
      </div>

      <div id="papich-phrase" className="text-center mt-8 text-[11px] text-zinc-500 tracking-wider cursor-pointer">
        {t(language, 'main.version')}
      </div>
    </div>
  );
};

export default MainMenu;
