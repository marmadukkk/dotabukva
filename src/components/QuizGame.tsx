import React, { useRef, useEffect } from 'react';
import { Language, t } from '../i18n';
import { useQuiz } from '../minigames/quiz/useQuiz';
import { classicHeaders } from '../minigames/quiz/classic';
import { scoreLabel } from '../minigames/quiz/leaderboard';
import type { CellStatus, QuizMode } from '../minigames/quiz/types';

interface QuizGameProps {
  language: Language;
  mode: QuizMode;
  onBack: () => void;
}

function cellClass(status: CellStatus): string {
  switch (status) {
    case 'correct':
      return 'bg-emerald-700/90 border-emerald-400 text-white';
    case 'partial':
      return 'bg-amber-600/90 border-amber-400 text-white';
    case 'higher':
    case 'lower':
      return 'bg-[#8b3a2a]/90 border-[#d4af37]/60 text-[#f0c060]';
    default:
      return 'bg-[#1c1612] border-[#5a422a] text-[#cbbfa6]';
  }
}

function cellArrow(status: CellStatus): string {
  if (status === 'higher') return ' ↑';
  if (status === 'lower') return ' ↓';
  return '';
}

const MODE_TITLE: Record<QuizMode, string> = {
  classic: 'quiz.classic',
  ability: 'quiz.ability',
  items: 'quiz.items',
  trivia: 'quiz.trivia',
};

export default function QuizGame({ language, mode, onBack }: QuizGameProps) {
  const lang = language === 'en' ? 'en' : 'ru';
  const g = useQuiz(mode, lang);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (g.phase === 'playing' && mode === 'classic') inputRef.current?.focus();
  }, [g.phase, mode]);

  // No "New round" button: auto-advance after win, or after loss when nick is not needed.
  useEffect(() => {
    if (g.phase === 'won' || (g.phase === 'lost' && !g.namePrompt)) {
      const id = window.setTimeout(() => {
        void g.newRound();
      }, 1800);
      return () => window.clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm on end-of-round
  }, [g.phase, g.namePrompt]);

  const headers = classicHeaders(lang);
  const showBoard =
    g.phase !== 'loading' &&
    g.phase !== 'error' &&
    (mode === 'items' ? !!g.itemAnswer : mode === 'trivia' ? !!g.trivia : !!g.answer);

  const scoreCol = scoreLabel(mode, lang);

  return (
    <div id="quiz-game" className="max-w-5xl mx-auto px-4 pt-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="text-[10px] tracking-[3px] text-[#d4af37] uppercase mb-1">
            {t(language, 'minigames.quiz')}
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
            {t(language, MODE_TITLE[mode])}
            {mode === 'trivia' && (
              <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border border-amber-500/50 text-amber-400 bg-amber-500/10">
                BETA
              </span>
            )}
          </h1>
        </div>
        <button
          type="button"
          data-sfx="button"
          onClick={onBack}
          className="h-10 px-4 ui-btn text-sm rounded-xl"
        >
          {t(language, 'quiz.modes')}
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* Leaderboard per mode */}
      <aside className="w-full lg:w-48 xl:w-52 flex-shrink-0 lg:sticky lg:top-20 order-2 lg:order-1">
        <div className="dota-card rounded-2xl border-2 border-[#4a3728] overflow-hidden bg-black/40">
          <div className="px-3 py-2.5 border-b border-[#4a3728]/70 bg-black/30 flex items-center gap-2">
            <i className="fa-solid fa-trophy text-[#d4af37] text-xs"></i>
            <div className="text-[11px] tracking-[2px] text-[#d4af37] uppercase font-semibold">
              {t(language, 'quiz.leaderboard')}
            </div>
          </div>
          {g.leaderboard.length === 0 ? (
            <p className="px-3 py-4 text-xs text-zinc-500 leading-relaxed">
              {t(language, 'quiz.lbEmpty')}
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] tracking-wider text-zinc-500 uppercase border-b border-[#4a3728]/50">
                  <th className="py-2 pl-2 pr-0.5 text-left font-medium w-8">#</th>
                  <th className="py-2 px-1 text-left font-medium">{t(language, 'quiz.lbName')}</th>
                  <th className="py-2 pl-1 pr-2 text-right font-medium">{scoreCol}</th>
                </tr>
              </thead>
              <tbody>
                {g.leaderboard.map((entry, i) => (
                  <tr
                    key={`${entry.at}-${entry.score}-${i}`}
                    className={`border-b border-white/5 last:border-0 ${
                      i === 0 ? 'bg-[#d4af37]/08' : ''
                    }`}
                  >
                    <td className="py-2 pl-2 pr-0.5 font-mono text-zinc-400 text-xs">
                      {i === 0 ? (
                        <span className="text-[#f0c060]">#{i + 1}</span>
                      ) : (
                        `#${i + 1}`
                      )}
                    </td>
                    <td
                      className={`py-2 px-1 text-xs truncate max-w-[5.5rem] ${
                        i === 0 ? 'text-[#f0c060]' : 'text-zinc-300'
                      }`}
                      title={entry.name}
                    >
                      {entry.name}
                    </td>
                    <td
                      className={`py-2 pl-1 pr-2 text-right font-mono tabular-nums text-xs ${
                        i === 0 ? 'text-emerald-400 font-semibold' : 'text-[#e0d2b0]'
                      }`}
                    >
                      {entry.score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="px-3 py-2 text-[10px] text-zinc-600 border-t border-[#4a3728]/40">
            {t(language, 'quiz.lbHintStreak')}
          </p>
        </div>
      </aside>

      <div className="flex-1 min-w-0 w-full order-1 lg:order-2">
      <div className="flex justify-center gap-6 mb-4 font-mono text-sm">
        <div className="text-center">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
            {t(language, 'quiz.streak')}
          </div>
          <div className="text-emerald-400 text-lg tabular-nums">{g.streak}</div>
        </div>
        {mode === 'classic' && (
          <div className="text-center">
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
              {t(language, 'quiz.guesses')}
            </div>
            <div className="text-[#f0c060] text-lg tabular-nums">
              {g.guesses.length}/{g.maxGuesses}
            </div>
          </div>
        )}
      </div>

      <div className="dota-card rounded-2xl border-2 border-[#4a3728] p-4 sm:p-6">
        {g.phase === 'loading' && (
          <div className="py-16 text-center space-y-3">
            <i className="fa-solid fa-spinner fa-spin text-3xl text-[#d4af37]"></i>
            <p className="text-zinc-400 text-sm">{t(language, 'quiz.loading')}</p>
          </div>
        )}

        {g.phase === 'error' && (
          <div className="py-12 text-center space-y-4">
            <p className="text-red-400 text-sm">{t(language, 'quiz.error')}</p>
            <button
              type="button"
              data-sfx="button"
              onClick={() => void g.newRound()}
              className="h-11 px-8 rounded-xl ui-btn-primary font-semibold"
            >
              {t(language, 'quiz.retry')}
            </button>
          </div>
        )}

        {showBoard && (
          <>
            {/* Ability: grayscale icon, no name, 4 hero choices */}
            {mode === 'ability' && g.abilityClue && (
              <div className="flex flex-col items-center mb-6">
                <div className="text-[10px] tracking-[2px] text-zinc-500 uppercase mb-3">
                  {t(language, 'quiz.abilityClue')}
                </div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-[#4a3728] overflow-hidden bg-black/50">
                  <img
                    src={g.abilityClue.img}
                    alt=""
                    className="w-full h-full object-cover grayscale brightness-90"
                    draggable={false}
                  />
                </div>
              </div>
            )}

            {/* Items: grayscale icon, no name, 4 item choices */}
            {mode === 'items' && g.itemAnswer && (
              <div className="flex flex-col items-center mb-6">
                <div className="text-[10px] tracking-[2px] text-zinc-500 uppercase mb-3">
                  {t(language, 'quiz.itemsClue')}
                </div>
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-[#4a3728] overflow-hidden bg-black/50">
                  <img
                    src={g.itemAnswer.img}
                    alt=""
                    className="w-full h-full object-cover grayscale brightness-90"
                    draggable={false}
                  />
                </div>
              </div>
            )}

            {mode === 'classic' && (
              <p className="text-center text-xs text-zinc-500 mb-4">{t(language, 'quiz.classicHint')}</p>
            )}

            {/* Outcome + optional nick for leaderboard */}
            {(g.phase === 'won' || g.phase === 'lost') && (
              <div
                className={`mb-4 text-center py-3 rounded-xl border text-sm font-semibold ${
                  g.phase === 'won'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : 'border-red-500/40 bg-red-500/10 text-red-300'
                }`}
              >
                {g.phase === 'won' ? t(language, 'quiz.won') : t(language, 'quiz.lost')}{' '}
                <span className="text-[#f0c060]">
                  {mode === 'items' && g.itemAnswer
                    ? g.itemAnswer.dname
                    : mode === 'trivia' && g.trivia
                      ? g.trivia.options[g.trivia.correctIndex]
                      : g.answer
                        ? g.heroName(g.answer)
                        : ''}
                </span>
              </div>
            )}

            {/* After a loss: enter nick to post the finished streak */}
            {g.phase === 'lost' && g.namePrompt && (
              <form
                className="mb-4 max-w-xs mx-auto space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  g.submitNickname(g.nicknameDraft);
                  // Auto-advance when namePrompt clears
                }}
              >
                <label className="block text-[11px] text-zinc-400 tracking-wider uppercase text-center">
                  {t(language, 'quiz.nickPrompt')}
                </label>
                <p className="text-center text-sm text-[#f0c060] font-mono tabular-nums">
                  {t(language, 'quiz.streak')}: {g.namePrompt.score}
                </p>
                <input
                  type="text"
                  value={g.nicknameDraft}
                  onChange={(e) => g.setNicknameDraft(e.target.value.slice(0, 16))}
                  maxLength={16}
                  autoFocus
                  placeholder={t(language, 'quiz.nickPlaceholder')}
                  className="w-full ui-field px-3 py-2 rounded-xl text-center font-mono text-[#f0c060]"
                />
                <button
                  type="submit"
                  data-sfx="button"
                  className="w-full h-10 rounded-xl ui-btn-primary text-sm font-semibold"
                >
                  {t(language, 'quiz.nickSave')}
                </button>
              </form>
            )}

            {/* Trivia question */}
            {mode === 'trivia' && g.trivia && (
              <div className="mb-6 text-center max-w-xl mx-auto">
                <div className="text-[10px] tracking-[2px] text-zinc-500 uppercase mb-3">
                  {t(language, 'quiz.triviaClue')}
                </div>
                <p className="text-base sm:text-lg text-[#e0d2b0] leading-snug px-2">
                  {g.trivia.question}
                </p>
              </div>
            )}

            {/* Classic table */}
            {mode === 'classic' && g.classicRows.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <table className="w-full text-xs sm:text-sm border-collapse min-w-[480px]">
                  <thead>
                    <tr className="text-[10px] text-zinc-500 uppercase tracking-wider">
                      {headers.map((h) => (
                        <th key={h} className="py-2 px-1 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...g.classicRows].reverse().map((row, i) => (
                      <tr key={`${row.hero.id}-${i}`}>
                        <td className="p-1">
                          <div className="flex items-center gap-2 min-w-[100px]">
                            <img
                              src={row.hero.icon}
                              alt=""
                              className="w-8 h-8 object-contain"
                              draggable={false}
                            />
                            <span className="text-white truncate">{g.heroName(row.hero)}</span>
                          </div>
                        </td>
                        {row.cells.map((c) => (
                          <td key={c.key} className="p-1">
                            <div
                              className={`rounded-md border px-1.5 py-2 text-center font-mono text-[11px] leading-tight min-h-[40px] flex items-center justify-center ${cellClass(
                                c.status
                              )}`}
                              title={c.label}
                            >
                              <span className="line-clamp-2">
                                {c.label}
                                {cellArrow(c.status)}
                              </span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Ability: 4 hero cards */}
            {mode === 'ability' && g.heroOptions.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto mb-2">
                {g.heroOptions.map((hero) => {
                  const blocked = g.blockedHeroIds.has(hero.id);
                  const isCorrect = g.answer && hero.id === g.answer.id;
                  const reveal = (g.phase === 'won' || g.phase === 'lost') && isCorrect;
                  const disabled = g.phase !== 'playing' || blocked;
                  return (
                    <button
                      key={hero.id}
                      type="button"
                      data-sfx={disabled ? 'none' : 'button'}
                      disabled={disabled}
                      onClick={() => g.pickHeroOption(hero)}
                      className={`relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                        reveal
                          ? 'border-emerald-400 ring-2 ring-emerald-400/40'
                          : blocked
                            ? 'border-red-900/60 opacity-40 grayscale cursor-not-allowed'
                            : g.phase === 'playing'
                              ? 'border-[#4a3728] hover:border-[#d4af37] active:scale-[0.98] cursor-pointer'
                              : 'border-[#4a3728] opacity-80'
                      }`}
                    >
                      <div className="aspect-[16/9] bg-black/60">
                        <img
                          src={hero.img}
                          alt={g.heroName(hero)}
                          className="w-full h-full object-cover object-top"
                          draggable={false}
                        />
                      </div>
                      <div className="px-2 py-1.5 bg-black/70 text-center">
                        <div className="text-xs text-white truncate font-medium">
                          {g.heroName(hero)}
                        </div>
                      </div>
                      {blocked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                          <i className="fa-solid fa-xmark text-red-400 text-2xl"></i>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Items: 4 text/name cards */}
            {mode === 'items' && g.itemOptions.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mb-2">
                {g.itemOptions.map((item) => {
                  const blocked = g.blockedItemIds.has(item.id);
                  const isCorrect = g.itemAnswer && item.id === g.itemAnswer.id;
                  const reveal = (g.phase === 'won' || g.phase === 'lost') && isCorrect;
                  const disabled = g.phase !== 'playing' || blocked;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-sfx={disabled ? 'none' : 'button'}
                      disabled={disabled}
                      onClick={() => g.pickItemOption(item)}
                      className={`relative rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all ${
                        reveal
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                          : blocked
                            ? 'border-red-900/60 opacity-40 line-through cursor-not-allowed text-zinc-500'
                            : g.phase === 'playing'
                              ? 'border-[#4a3728] hover:border-[#d4af37] bg-black/40 text-white active:scale-[0.98]'
                              : 'border-[#4a3728] bg-black/30 text-zinc-300'
                      }`}
                    >
                      {item.dname}
                      {blocked && (
                        <i className="fa-solid fa-xmark text-red-400 ml-2"></i>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Trivia: 4 answers */}
            {mode === 'trivia' && g.trivia && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto mb-2">
                {g.trivia.options.map((opt, index) => {
                  const blocked = g.blockedTrivia.has(index);
                  const isCorrect = index === g.trivia!.correctIndex;
                  const reveal = (g.phase === 'won' || g.phase === 'lost') && isCorrect;
                  const disabled = g.phase !== 'playing' || blocked;
                  return (
                    <button
                      key={`${g.trivia!.id}-${index}`}
                      type="button"
                      data-sfx={disabled ? 'none' : 'button'}
                      disabled={disabled}
                      onClick={() => g.pickTriviaOption(index)}
                      className={`relative rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all text-left ${
                        reveal
                          ? 'border-emerald-400 bg-emerald-500/15 text-emerald-300'
                          : blocked
                            ? 'border-red-900/60 opacity-40 line-through cursor-not-allowed text-zinc-500'
                            : g.phase === 'playing'
                              ? 'border-[#4a3728] hover:border-[#d4af37] bg-black/40 text-white active:scale-[0.98]'
                              : 'border-[#4a3728] bg-black/30 text-zinc-300'
                      }`}
                    >
                      {opt}
                      {blocked && (
                        <i className="fa-solid fa-xmark text-red-400 ml-2"></i>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Classic text input */}
            {mode === 'classic' && g.phase === 'playing' && (
              <div className="relative max-w-md mx-auto">
                <input
                  ref={inputRef}
                  type="text"
                  value={g.query}
                  onChange={(e) => g.setQuery(e.target.value)}
                  placeholder={t(language, 'quiz.placeholder')}
                  className="w-full ui-field px-4 py-3 rounded-xl text-center text-white"
                  autoComplete="off"
                />
                {g.query.trim() && g.suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 max-h-56 overflow-y-auto rounded-xl border border-[#4a3728] bg-[#14120e] shadow-xl">
                    {g.suggestions.map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        data-sfx="button"
                        onClick={() => g.submitGuess(h)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#d4af37]/10 text-left border-b border-white/5 last:border-0"
                      >
                        <img src={h.icon} alt="" className="w-8 h-8" draggable={false} />
                        <span className="text-sm text-white">{g.heroName(h)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {g.query.trim() && g.suggestions.length === 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-20 px-3 py-2 rounded-xl border border-[#4a3728] bg-[#14120e] text-xs text-zinc-500 text-center">
                    {t(language, 'quiz.noHero')}
                  </div>
                )}
              </div>
            )}


          </>
        )}
      </div>
      </div>
      </div>
    </div>
  );
}
