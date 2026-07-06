import React from 'react';
import { Language, t } from '../i18n';

interface NavProps {
  language: Language;
  currentRole: 'leader' | 'guesser' | null;
  currentRoom: string | null;
  showLangMenu: boolean;
  onShowRoleMenu: () => void;
  onShowHowto: () => void;
  onLeaveRoom: () => void;
  onToggleLangMenu: () => void;
  onChangeLanguage: (lang: Language) => void;
  onLogoClick?: () => void;
}

const Nav: React.FC<NavProps> = ({
  language,
  currentRole,
  currentRoom,
  showLangMenu,
  onShowRoleMenu,
  onShowHowto,
  onLeaveRoom,
  onToggleLangMenu,
  onChangeLanguage,
  onLogoClick,
}) => {
  return (
    <nav className="tavern-header sticky top-0 z-50 shadow-lg relative">
      <div className="header-rivet" style={{left:'28px',top:'26px'}}></div>
      <div className="header-rivet" style={{left:'64px',top:'26px'}}></div>
      <div className="header-rivet" style={{right:'28px',top:'26px'}}></div>
      <div className="header-rivet" style={{right:'64px',top:'26px'}}></div>
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Left logo area */}
        <div className="flex items-center">
          <div 
            onClick={onLogoClick} 
            className="logo-frame flex items-center gap-x-2.5 cursor-pointer px-3 py-1.5 rounded-sm"
          >
            <img 
              src="/images/canvas.png" 
              alt="Dota Bukva" 
              className="w-10 h-10 object-contain" 
            />
            <span className="font-display text-xl font-semibold tracking-tighter text-[#f0c060]">DOTA-BUKVA</span>
          </div>
        </div>

        {/* Right side controls */}
        <div className="controls-frame flex items-center gap-x-1 px-2 py-1 rounded-sm text-sm">
          {currentRole && (
            <div 
              id="nav-role" 
              onClick={onShowRoleMenu} 
              className="flex items-center gap-x-1.5 px-3 py-0.5 rounded border border-[#444] hover:border-[#c23c2a] cursor-pointer text-xs bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors"
            >
              <span className="font-medium text-[#e0d2b0]">{currentRole === 'leader' ? t(language, 'room.leader') : t(language, 'room.guesser')}</span>
              <span className="text-[#c23c2a] text-[10px] tracking-widest">{t(language, 'nav.change')}</span>
            </div>
          )}
          
          <div 
            onClick={onShowHowto} 
            className="flex items-center gap-x-1.5 px-3 py-0.5 rounded border border-[#444] hover:border-[#c23c2a] cursor-pointer text-xs bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors text-[#d4af37]"
          >
            <i className="fa-solid fa-question-circle text-sm"></i>
            <span className="hidden sm:inline font-medium tracking-widest">{t(language, 'nav.howto')}</span>
          </div>

          {/* Language Burger Menu */}
          <div className="relative">
            <button
              onClick={onToggleLangMenu}
              className="flex items-center gap-x-1.5 px-3 py-0.5 rounded border border-[#444] hover:border-[#c23c2a] cursor-pointer text-xs bg-[#1f1f1f] hover:bg-[#2a2a2a] transition-colors text-[#d4af37]"
              aria-label="Language"
            >
              <i className="fa-solid fa-globe text-sm"></i>
              <span className="font-medium tracking-widest">{language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-1 z-[200] min-w-[120px] rounded-xl border border-[#4a3728] bg-[#1a1a1a] shadow-xl overflow-hidden text-sm">
                <button
                  onClick={() => onChangeLanguage('ru')}
                  className={`w-full text-left px-4 py-2 hover:bg-[#2a2a2a] flex items-center gap-2 ${language === 'ru' ? 'text-[#f0c060]' : 'text-[#e0d2b0]'}`}
                >
                  🇷🇺 Русский
                </button>
                <button
                  onClick={() => onChangeLanguage('en')}
                  className={`w-full text-left px-4 py-2 hover:bg-[#2a2a2a] flex items-center gap-2 ${language === 'en' ? 'text-[#f0c060]' : 'text-[#e0d2b0]'}`}
                >
                  🇬🇧 English
                </button>
              </div>
            )}
          </div>

          {currentRoom && (
            <div 
              id="nav-room-badge" 
              onClick={() => { const l = `${window.location.origin}/?room=${currentRoom}`; navigator.clipboard?.writeText(l); }} 
              className="flex items-center gap-x-1.5 px-3 py-0.5 text-xs rounded border border-[#444] bg-[#1f1f1f] cursor-pointer hover:bg-[#2a2a2a]"
            >
              <span className="font-mono text-[#f0c060] tracking-[2px]">{currentRoom}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); onLeaveRoom(); }} 
                className="text-[#888] hover:text-white ml-1 text-[10px] leading-none"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Nav;
