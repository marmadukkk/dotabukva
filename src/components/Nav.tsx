import React, { useEffect, useRef } from 'react';
import { Language, t } from '../i18n';

interface NavProps {
  language: Language;
  currentRole: 'leader' | 'guesser' | null;
  currentRoom: string | null;
  showLangMenu: boolean;
  showSettingsMenu: boolean;
  musicVolume: number;
  sfxVolume: number;
  musicTrack: number;
  musicTrackCount: number;
  multicastEnabled: boolean;
  isBgTransitioning: boolean;
  onShowRoleMenu: () => void;
  onShowHowto: () => void;
  onLeaveRoom: () => void;
  onToggleLangMenu: () => void;
  onChangeLanguage: (lang: Language) => void;
  onToggleSettingsMenu: () => void;
  onCloseSettingsMenu: () => void;
  onMusicVolumeChange: (volume: number) => void;
  onSfxVolumeChange: (volume: number) => void;
  onCycleMusicTrack: () => void;
  onToggleMulticast: () => void;
  onChangeBackground: () => void;
  onLogoClick?: () => void;
}

const Nav: React.FC<NavProps> = ({
  language,
  currentRole,
  currentRoom,
  showLangMenu,
  showSettingsMenu,
  musicVolume,
  sfxVolume,
  musicTrack,
  musicTrackCount,
  multicastEnabled,
  isBgTransitioning,
  onShowRoleMenu,
  onShowHowto,
  onLeaveRoom,
  onToggleLangMenu,
  onChangeLanguage,
  onToggleSettingsMenu,
  onCloseSettingsMenu,
  onMusicVolumeChange,
  onSfxVolumeChange,
  onCycleMusicTrack,
  onToggleMulticast,
  onChangeBackground,
  onLogoClick,
}) => {
  const settingsRef = useRef<HTMLDivElement>(null);

  // Close settings when clicking outside
  useEffect(() => {
    if (!showSettingsMenu) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = settingsRef.current;
      if (el && !el.contains(e.target as Node)) {
        onCloseSettingsMenu();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [showSettingsMenu, onCloseSettingsMenu]);

  const musicPercent = Math.round(musicVolume * 100);
  const sfxPercent = Math.round(sfxVolume * 100);
  const musicIcon =
    musicVolume <= 0 ? 'fa-volume-xmark' : musicVolume < 0.4 ? 'fa-volume-low' : 'fa-music';
  const sfxIcon =
    sfxVolume <= 0 ? 'fa-volume-xmark' : sfxVolume < 0.4 ? 'fa-volume-low' : 'fa-volume-high';

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

          {/* Settings gear */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={onToggleSettingsMenu}
              className={`flex items-center justify-center w-8 h-7 rounded border cursor-pointer text-xs transition-colors ${
                showSettingsMenu
                  ? 'border-[#d4af37] bg-[#2a2a2a] text-[#f0c060]'
                  : 'border-[#444] bg-[#1f1f1f] hover:border-[#c23c2a] hover:bg-[#2a2a2a] text-[#d4af37]'
              }`}
              aria-label={t(language, 'nav.settings')}
              title={t(language, 'nav.settings')}
            >
              <i className="fa-solid fa-gear text-sm"></i>
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 mt-1 z-[200] w-64 rounded-xl border border-[#4a3728] bg-[#1a1a1a] shadow-xl overflow-hidden text-sm">
                <div className="px-3 py-2 border-b border-[#333] text-[10px] tracking-widest text-[#888] font-medium">
                  {t(language, 'nav.settings').toUpperCase()}
                </div>

                {/* Music volume */}
                <div className="px-3 py-3 border-b border-[#333]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-[#e0d2b0] text-xs font-medium">
                      <i className={`fa-solid ${musicIcon} text-[#d4af37] w-4 text-center`}></i>
                      {t(language, 'nav.volumeMusic')}
                    </label>
                    <span className="text-[#888] text-[11px] tabular-nums w-8 text-right">{musicPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={musicPercent}
                    onChange={(e) => onMusicVolumeChange(Number(e.target.value) / 100)}
                    className="settings-volume-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${musicPercent}%, #333 ${musicPercent}%, #333 100%)`,
                    }}
                    aria-label={t(language, 'nav.volumeMusic')}
                  />
                </div>

                {/* SFX volume */}
                <div className="px-3 py-3 border-b border-[#333]">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-[#e0d2b0] text-xs font-medium">
                      <i className={`fa-solid ${sfxIcon} text-[#d4af37] w-4 text-center`}></i>
                      {t(language, 'nav.volumeSfx')}
                    </label>
                    <span className="text-[#888] text-[11px] tabular-nums w-8 text-right">{sfxPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={sfxPercent}
                    onChange={(e) => onSfxVolumeChange(Number(e.target.value) / 100)}
                    className="settings-volume-slider w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #d4af37 0%, #d4af37 ${sfxPercent}%, #333 ${sfxPercent}%, #333 100%)`,
                    }}
                    aria-label={t(language, 'nav.volumeSfx')}
                  />
                </div>

                {/* Soundtrack cycle */}
                <button
                  type="button"
                  onClick={onCycleMusicTrack}
                  className="w-full text-left px-3 py-3 border-b border-[#333] hover:bg-[#2a2a2a] flex items-center gap-2.5 text-[#e0d2b0] transition-colors"
                >
                  <i className="fa-solid fa-compact-disc text-[#d4af37] w-4 text-center"></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{t(language, 'nav.soundtrack')}</div>
                    <div className="text-[10px] text-[#888] mt-0.5">
                      {t(language, 'nav.soundtrackN').replace('{n}', String(musicTrack + 1))}
                      {' · '}
                      {musicTrack + 1}/{musicTrackCount}
                    </div>
                  </div>
                  <i className="fa-solid fa-sync text-[10px] text-[#666]"></i>
                </button>

                {/* Multicast toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={multicastEnabled}
                  onClick={onToggleMulticast}
                  className="w-full text-left px-3 py-3 border-b border-[#333] hover:bg-[#2a2a2a] flex items-center gap-2.5 transition-colors"
                >
                  <i className="fa-solid fa-bolt text-[#d4af37] w-4 text-center"></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#e0d2b0]">{t(language, 'nav.multicast')}</div>
                    <div className="text-[10px] text-[#888] mt-0.5 leading-snug">{t(language, 'nav.multicastDesc')}</div>
                  </div>
                  <span
                    className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                      multicastEnabled ? 'bg-[#c23c2a]' : 'bg-[#333]'
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#f0c060] shadow transition-transform ${
                        multicastEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>

                {/* Change background */}
                <button
                  onClick={onChangeBackground}
                  disabled={isBgTransitioning}
                  className="w-full text-left px-3 py-3 hover:bg-[#2a2a2a] flex items-center gap-2.5 text-[#e0d2b0] disabled:opacity-50 transition-colors"
                >
                  <i className="fa-solid fa-image text-[#d4af37] w-4 text-center"></i>
                  <span className="text-xs font-medium">{t(language, 'nav.changeBg')}</span>
                  <i className="fa-solid fa-sync text-[10px] text-[#666] ml-auto"></i>
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
