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
  disclaimerEnabled: boolean;
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
  onToggleDisclaimer: () => void;
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
  disclaimerEnabled,
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
  onToggleDisclaimer,
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
    <nav className="tavern-header sticky top-0 z-50 relative">
      <div className="header-bar max-w-6xl mx-auto px-2.5 sm:px-6 h-14 flex items-center justify-between gap-2 sm:gap-4">
        <div
          onClick={onLogoClick}
          data-sfx="logo"
          className="header-logo"
        >
          <img src="/images/canvas.png" alt="Dota Bukva" />
          <span className="header-wordmark font-display">
            DOTA<span className="header-wordmark__dash">-</span>BUKVA
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {currentRole && (
            <div
              id="nav-role"
              onClick={onShowRoleMenu}
              data-sfx="button"
              className="header-chip"
            >
              <i className={`fa-solid ${currentRole === 'leader' ? 'fa-crown' : 'fa-th-large'} text-[11px] text-[#d4af37]`}></i>
              <span>{currentRole === 'leader' ? t(language, 'room.leader') : t(language, 'room.guesser')}</span>
              <span className="header-chip__hint">{t(language, 'nav.change')}</span>
            </div>
          )}

          <div
            onClick={onShowHowto}
            data-sfx="button"
            className="header-chip"
          >
            <i className="fa-solid fa-question-circle text-[13px] text-[#d4af37]"></i>
            <span className="hidden sm:inline">{t(language, 'nav.howto')}</span>
          </div>

          <div className="relative">
            <button
              onClick={onToggleLangMenu}
              data-sfx="button"
              className="header-chip"
              aria-label="Language"
            >
              <i className="fa-solid fa-globe text-[13px] text-[#d4af37]"></i>
              <span>{language.toUpperCase()}</span>
            </button>
            {showLangMenu && (
              <div className="header-menu absolute right-0 mt-2 z-[200] min-w-[140px] rounded-xl overflow-hidden text-sm">
                <button
                  onClick={() => onChangeLanguage('ru')}
                  data-sfx="button"
                  className={`w-full text-left px-4 py-2 hover:bg-[#2a2118] flex items-center gap-2 ${language === 'ru' ? 'text-[#f0c060]' : 'text-[#e0d2b0]'}`}
                >
                  🇷🇺 Русский
                </button>
                <button
                  onClick={() => onChangeLanguage('en')}
                  data-sfx="button"
                  className={`w-full text-left px-4 py-2 hover:bg-[#2a2118] flex items-center gap-2 ${language === 'en' ? 'text-[#f0c060]' : 'text-[#e0d2b0]'}`}
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
              data-sfx="settings"
              className={`header-chip header-chip--icon ${showSettingsMenu ? 'header-chip--on' : ''}`}
              aria-label={t(language, 'nav.settings')}
              title={t(language, 'nav.settings')}
            >
              <i className="fa-solid fa-gear text-[13px]"></i>
            </button>
            {showSettingsMenu && (
              <div
                data-sfx="settings"
                className="header-menu absolute right-0 mt-2 z-[200] w-64 rounded-xl overflow-hidden text-sm"
              >
                <div className="px-3 py-2 border-b border-[#4a3728] text-[10px] tracking-widest text-[#888] font-medium">
                  {t(language, 'nav.settings').toUpperCase()}
                </div>

                {/* Music volume */}
                <div className="px-3 py-3 border-b border-[#4a3728]">
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
                <div className="px-3 py-3 border-b border-[#4a3728]">
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
                  className="w-full text-left px-3 py-3 border-b border-[#4a3728] hover:bg-[#2a2118] flex items-center gap-2.5 text-[#e0d2b0] transition-colors"
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
                  className="w-full text-left px-3 py-3 border-b border-[#4a3728] hover:bg-[#2a2118] flex items-center gap-2.5 transition-colors"
                >
                  <i className="fa-solid fa-bolt text-[#d4af37] w-4 text-center"></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#e0d2b0]">{t(language, 'nav.multicast')}</div>
                    <div className="text-[10px] text-[#888] mt-0.5 leading-snug">{t(language, 'nav.multicastDesc')}</div>
                  </div>
                  <span
                    className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                      multicastEnabled ? 'bg-[#8a6230]' : 'bg-[#2a2118]'
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

                {/* Startup disclaimer toggle */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={disclaimerEnabled}
                  onClick={onToggleDisclaimer}
                  className="w-full text-left px-3 py-3 border-b border-[#4a3728] hover:bg-[#2a2118] flex items-center gap-2.5 transition-colors"
                >
                  <i className="fa-solid fa-circle-exclamation text-[#d4af37] w-4 text-center"></i>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[#e0d2b0]">{t(language, 'nav.disclaimer')}</div>
                    <div className="text-[10px] text-[#888] mt-0.5 leading-snug">{t(language, 'nav.disclaimerDesc')}</div>
                  </div>
                  <span
                    className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors ${
                      disclaimerEnabled ? 'bg-[#8a6230]' : 'bg-[#2a2118]'
                    }`}
                    aria-hidden
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[#f0c060] shadow transition-transform ${
                        disclaimerEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </span>
                </button>

                {/* Change background */}
                <button
                  onClick={onChangeBackground}
                  disabled={isBgTransitioning}
                  className="w-full text-left px-3 py-3 hover:bg-[#2a2118] flex items-center gap-2.5 text-[#e0d2b0] disabled:opacity-50 transition-colors"
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
              className="header-chip hidden sm:inline-flex"
            >
              <span className="header-chip__code">{currentRoom}</span>
              <button
                onClick={(e) => { e.stopPropagation(); onLeaveRoom(); }}
                className="header-chip__leave"
                aria-label="×"
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
