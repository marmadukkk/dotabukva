import React from 'react';
import { Language, t } from '../i18n';
import { useWhoseBuild } from '../minigames/whoseBuild/useWhoseBuild';
import type { ItemInfo } from '../minigames/whoseBuild/opendota';

interface WhoseBuildGameProps {
  language: Language;
  onBack: () => void;
}

function ItemSlot({
  item,
  emptyTitle,
  round,
  muted,
}: {
  item?: ItemInfo | null;
  emptyTitle?: string;
  /** Neutral slot — circle like Dota */
  round?: boolean;
  /** Backpack row — greyer / dimmer than main inventory */
  muted?: boolean;
}) {
  const shape = round ? 'rounded-full' : 'rounded-lg';
  return (
    <div
      className={`w-12 h-12 sm:w-14 sm:h-14 ${shape} overflow-hidden flex items-center justify-center ${
        muted
          ? 'border border-[#3a2a1c] bg-[#16110e] opacity-70'
          : 'border border-[#4a3728] bg-[#0c0c0c]'
      }`}
      title={item?.dname || emptyTitle || ''}
    >
      {item ? (
        <img
          src={item.img}
          alt={item.dname}
          className={`w-full h-full object-cover ${muted ? 'grayscale-[35%] brightness-75' : ''}`}
          draggable={false}
          onError={(e) => {
            (e.target as HTMLImageElement).style.opacity = '0.25';
          }}
        />
      ) : (
        <div
          className={`w-full h-full ${round ? 'rounded-full' : ''} ${
            muted ? 'bg-[#16110e]' : 'bg-black/50'
          }`}
        />
      )}
    </div>
  );
}

export default function WhoseBuildGame({ language, onBack }: WhoseBuildGameProps) {
  const g = useWhoseBuild();
  const build = g.round?.correct;

  return (
    <div id="whose-build-game" className="max-w-4xl mx-auto px-4 pt-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="text-[10px] tracking-[3px] text-[#d4af37] uppercase mb-1">
            {t(language, 'minigames.build')}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
            {t(language, 'minigames.build')}
          </h1>
          <p className="text-xs text-zinc-500 mt-1">{t(language, 'build.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-sfx="button"
            onClick={() => void g.newGame()}
            disabled={g.phase === 'loading'}
            className="h-10 px-4 text-sm text-zinc-300 hover:text-white border border-[#4a3728] hover:border-[#d4af37] rounded-xl disabled:opacity-40"
          >
            {t(language, 'build.newGame')}
          </button>
          <button
            type="button"
            data-sfx="button"
            onClick={onBack}
            className="h-10 px-4 ui-btn text-sm rounded-xl"
          >
            {t(language, 'minigames.back')}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-center gap-6 mb-4 font-mono text-sm">
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 tracking-wider uppercase">
            {t(language, 'build.attempts')}
          </div>
          <div
            className={`text-lg tabular-nums ${
              g.attempts <= 1 ? 'text-red-400' : 'text-[#f0c060]'
            }`}
          >
            {g.attempts}/{g.maxAttempts}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 tracking-wider uppercase">
            {t(language, 'build.streak')}
          </div>
          <div className="text-lg text-emerald-400 tabular-nums">{g.streak}</div>
        </div>
      </div>

      <div className="dota-card rounded-2xl border-2 border-[#4a3728] p-4 sm:p-6">
        {/* Loading */}
        {g.phase === 'loading' && (
          <div className="py-16 text-center space-y-3">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-[#d4af37]"></i>
            <p className="text-zinc-400 text-sm">{t(language, 'build.loading')}</p>
          </div>
        )}

        {/* Error */}
        {g.phase === 'error' && (
          <div className="py-12 text-center space-y-4">
            <p className="text-red-400/90 text-sm max-w-md mx-auto">
              {t(language, 'build.error')}
              {g.error ? `: ${g.error}` : ''}
            </p>
            <button
              type="button"
              data-sfx="button"
              onClick={() => void g.newGame()}
              className="h-11 px-8 rounded-xl ui-btn-primary font-semibold"
            >
              {t(language, 'build.retry')}
            </button>
          </div>
        )}

        {/* Game board */}
        {g.round && g.phase !== 'loading' && g.phase !== 'error' && build && (
          <>
            {/* Build display — no hero / nick */}
            <div className="mb-6">
              <div className="text-[10px] tracking-[2px] text-zinc-500 uppercase text-center mb-3">
                {t(language, 'build.buildTitle')}
              </div>

              {/* 3×3: top 2 rows = inventory (6), bottom row = backpack (3) */}
              <div className="flex justify-center items-start gap-4">
                <div
                  className="grid grid-cols-3 gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-xl border border-[#4a3728]/80 bg-black/40"
                  title={t(language, 'build.buildTitle')}
                >
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ItemSlot key={`inv-${i}`} item={build.inventory[i] || null} />
                  ))}
                  {Array.from({ length: 3 }).map((_, i) => (
                    <ItemSlot
                      key={`bp-${i}`}
                      item={build.backpack[i] || null}
                      emptyTitle="Backpack"
                      muted
                    />
                  ))}
                </div>

                {/* Neutral separate (like Dota side slot) */}
                <div className="flex flex-col items-center gap-1.5 pt-1">
                  <ItemSlot item={build.neutral} emptyTitle="Neutral" round />
                  <span className="text-[9px] text-zinc-600 uppercase tracking-wider">
                    {t(language, 'build.neutral')}
                  </span>
                </div>
              </div>
            </div>

            {/* Outcome banner */}
            {g.phase === 'won' && (
              <div className="mb-4 text-center py-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-sm font-semibold tracking-wide">
                {t(language, 'build.won')} — {build.hero.localized}
              </div>
            )}
            {g.phase === 'lost' && (
              <div className="mb-4 text-center py-2 rounded-xl border border-red-500/40 bg-red-500/10 text-red-300 text-sm">
                {t(language, 'build.lost')} —{' '}
                <span className="text-[#f0c060] font-semibold">{build.hero.localized}</span>
              </div>
            )}

            {/* Hero options */}
            <div className="text-[10px] tracking-[2px] text-zinc-500 uppercase text-center mb-3">
              {t(language, 'build.pickHero')}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              {g.round.options.map((hero) => {
                const isBlocked = g.blocked.has(hero.id);
                const isCorrect = hero.id === build.heroId;
                const reveal =
                  (g.phase === 'won' || g.phase === 'lost') && isCorrect;
                const disabled = g.phase !== 'playing' || isBlocked;

                return (
                  <button
                    key={hero.id}
                    type="button"
                    data-sfx={disabled ? 'none' : 'button'}
                    disabled={disabled}
                    onClick={() => g.pickHero(hero)}
                    className={`relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                      reveal
                        ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                        : isBlocked
                          ? 'border-red-900/60 opacity-40 grayscale cursor-not-allowed'
                          : g.phase === 'playing'
                            ? 'border-[#4a3728] hover:border-[#d4af37] active:scale-[0.98] cursor-pointer'
                            : 'border-[#4a3728] opacity-80'
                    }`}
                  >
                    <div className="aspect-[16/9] bg-black/60">
                      <img
                        src={hero.img}
                        alt={hero.localized}
                        className="w-full h-full object-cover object-top"
                        draggable={false}
                      />
                    </div>
                    <div className="px-2 py-1.5 bg-black/70 text-center">
                      <div className="text-xs text-white truncate font-medium">
                        {hero.localized}
                      </div>
                    </div>
                    {isBlocked && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <i className="fa-solid fa-xmark text-red-400 text-2xl"></i>
                      </div>
                    )}
                    {reveal && (
                      <div className="absolute top-1 right-1 text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                        OK
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {(g.phase === 'won' || g.phase === 'lost') && (
              <p className="text-center text-[11px] text-zinc-500 mt-4">
                {t(language, 'build.nextHint')}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
