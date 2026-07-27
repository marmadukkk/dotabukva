import React from 'react';
import { Language, t } from '../i18n';
import { NEWS_ITEMS } from '../constants/news';

interface MainMenuProps {
  language: Language;
  onStartNormal: () => void;
  onCreateRoom: () => void;
  onShowRooms: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ language, onStartNormal, onCreateRoom, onShowRooms }) => {
  const isDesktop =
    (typeof window !== 'undefined' && window.dotaDesktop?.isElectron) ||
    import.meta.env.VITE_IS_ELECTRON === 'true' ||
    import.meta.env.VITE_IS_ELECTRON === true;

  return (
    <div id="main-menu" className="max-w-6xl mx-auto px-5 pt-10 pb-12">
      {/*
        On lg+: row height = left column (logo + buttons).
        News is position:absolute inset-0 so its bottom aligns with the last button.
        Version sits in a second row under the buttons only.
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 lg:gap-x-10 gap-y-6">
        {/* LEFT — logo + buttons (defines row height on desktop) */}
        <div className="lg:col-span-5 xl:col-span-5 lg:row-start-1">
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <div className="mb-8 text-center">
              <div className="flex justify-center mb-5">
                <img
                  src="/images/canvas.png"
                  alt="Dota Bukva"
                  className="w-24 h-24 sm:w-28 sm:h-28 object-contain drop-shadow-lg"
                />
              </div>
              <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tighter text-white">
                DOTA-BUKVA
              </h1>
              <p className="mt-2 text-zinc-400 text-base sm:text-lg">
                {t(language, 'main.tagline')}
              </p>
            </div>

            <div className="space-y-3">
              <div
                onClick={onStartNormal}
                data-sfx="button"
                className="dota-card group cursor-pointer rounded-2xl p-5 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-4">
                  <i className="fa-solid fa-gamepad text-2xl sm:text-3xl text-[#d4af37] group-hover:rotate-12 group-hover:scale-110 transition-transform"></i>
                  <div>
                    <div className="font-display text-xl sm:text-2xl tracking-tight text-white">{t(language, 'main.normal')}</div>
                    <div className="text-sm text-zinc-400 mt-0.5">{t(language, 'main.normalDesc')}</div>
                  </div>
                </div>
              </div>

              <div
                onClick={onCreateRoom}
                data-sfx="button"
                className="dota-card group cursor-pointer rounded-2xl p-5 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-4">
                  <i className="fa-solid fa-plus text-2xl sm:text-3xl text-[#d4af37] group-hover:rotate-90 group-hover:scale-110 transition-transform"></i>
                  <div>
                    <div className="font-display text-xl sm:text-2xl tracking-tight text-white">{t(language, 'main.create')}</div>
                    <div className="text-sm text-zinc-400 mt-0.5">{t(language, 'main.createDesc')}</div>
                  </div>
                </div>
              </div>

              <div
                onClick={onShowRooms}
                data-sfx="button"
                className="dota-card group cursor-pointer rounded-2xl p-5 border-2 border-[#4a3728] hover:border-[#d4af37] transition-all active:scale-[0.985]"
              >
                <div className="flex items-center gap-4">
                  <i className="fa-solid fa-list text-2xl sm:text-3xl text-[#d4af37] group-hover:-rotate-6 group-hover:scale-110 transition-transform"></i>
                  <div>
                    <div className="font-display text-xl sm:text-2xl tracking-tight text-white">{t(language, 'main.rooms')}</div>
                    <div className="text-sm text-zinc-400 mt-0.5">{t(language, 'main.roomsDesc')}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — news matches left column height on lg+ */}
        <div className="lg:col-span-7 xl:col-span-7 lg:row-start-1 relative min-h-[300px] lg:min-h-0">
          <div className="rounded-2xl border-2 border-[#4a3728]/80 overflow-hidden flex flex-col h-full min-h-[300px] lg:absolute lg:inset-0 lg:min-h-0 bg-black/35 backdrop-blur-md shadow-lg shadow-black/40">
            <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-[#4a3728]/70 bg-black/25 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <i className="fa-solid fa-newspaper text-[#d4af37]"></i>
                <h2 className="font-display text-lg sm:text-xl tracking-tight text-[#f0c060]">
                  {t(language, 'main.newsTitle')}
                </h2>
              </div>
              <span className="text-[10px] tracking-[2px] text-zinc-500 uppercase">
                {t(language, 'main.newsSubtitle')}
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-white/5">
              {NEWS_ITEMS.map((item) => (
                <article
                  key={item.id}
                  className="px-5 py-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {item.version && (
                      <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded border border-[#4a3728] text-[#d4af37] bg-[#111]">
                        v{item.version}
                      </span>
                    )}
                    {item.tag && (
                      <span className="text-[10px] tracking-wider px-2 py-0.5 rounded border border-[#333] text-zinc-400">
                        {item.tag[language]}
                      </span>
                    )}
                    <time className="text-[10px] text-zinc-600 ml-auto tabular-nums">
                      {item.date}
                    </time>
                  </div>
                  <h3 className="font-display text-base sm:text-lg text-white tracking-tight leading-snug">
                    {item.title[language]}
                  </h3>
                  <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">
                    {item.body[language]}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        {/* Version under buttons only — does not affect news height */}
        <div className="lg:col-span-5 lg:row-start-2 w-full max-w-md mx-auto lg:mx-0">
          <div
            id="papich-phrase"
            className="text-center mt-0 lg:mt-6 text-[11px] text-zinc-500 tracking-wider cursor-pointer"
          >
            {t(language, isDesktop ? 'main.versionDesktop' : 'main.version')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
