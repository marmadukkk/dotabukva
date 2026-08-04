import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ensureQuizData,
  filterHeroes,
  getHeroById,
  getQuizHeroes,
  heroChoiceOptions,
  heroDisplayName,
  itemChoiceOptions,
  randomAbilityClue,
  randomHero,
  randomItem,
} from './data';
import { compareClassic } from './classic';
import { pickRandomTrivia, type TriviaRound } from './trivia';
import {
  addQuizScore,
  readQuizLeaderboard,
  readQuizNickname,
  writeQuizNickname,
  sanitizeNick,
  wouldPlaceQuiz,
  type QuizLeaderboardEntry,
} from './leaderboard';
import type {
  AbilityClue,
  ClassicGuessRow,
  QuizHero,
  QuizItem,
  QuizMode,
} from './types';
import { MAX_GUESSES } from './types';

export type QuizPhase = 'loading' | 'playing' | 'won' | 'lost' | 'error';

export function useQuiz(mode: QuizMode, lang: 'ru' | 'en') {
  const [phase, setPhase] = useState<QuizPhase>('loading');
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<QuizHero | null>(null);
  const [guesses, setGuesses] = useState<QuizHero[]>([]);
  const [classicRows, setClassicRows] = useState<ClassicGuessRow[]>([]);
  const [abilityClue, setAbilityClue] = useState<AbilityClue | null>(null);
  const [heroOptions, setHeroOptions] = useState<QuizHero[]>([]);
  const [blockedHeroIds, setBlockedHeroIds] = useState<Set<number>>(new Set());
  const [itemAnswer, setItemAnswer] = useState<QuizItem | null>(null);
  const [itemOptions, setItemOptions] = useState<QuizItem[]>([]);
  const [blockedItemIds, setBlockedItemIds] = useState<Set<number>>(new Set());
  const [trivia, setTrivia] = useState<TriviaRound | null>(null);
  const [blockedTrivia, setBlockedTrivia] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState('');
  const [streak, setStreak] = useState(0);
  const [leaderboard, setLeaderboard] = useState<QuizLeaderboardEntry[]>(() =>
    readQuizLeaderboard(mode)
  );
  /** Pending streak to attach nick to after a loss (if needed). */
  const [namePrompt, setNamePrompt] = useState<{ score: number } | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState(() => readQuizNickname());

  const isMcq = mode === 'ability' || mode === 'items' || mode === 'trivia';

  const registerWin = useCallback(() => {
    setStreak((s) => s + 1);
    setPhase('won');
    setNamePrompt(null);
    // Streak only — board is written after a loss (+ nick).
  }, []);

  const registerLoss = useCallback(() => {
    setPhase('lost');
    const finalStreak = streak;
    setStreak(0);

    // No wins in this run → nothing to put on the board
    if (finalStreak < 1) {
      setNamePrompt(null);
      return;
    }

    // Only offer nick + save if the streak can enter top-10
    if (wouldPlaceQuiz(mode, finalStreak)) {
      setNicknameDraft(readQuizNickname());
      setNamePrompt({ score: finalStreak });
    } else {
      setNamePrompt(null);
    }
  }, [mode, streak]);

  const startRound = useCallback(async () => {
    // Leaving nick form without save → discard pending streak (must confirm nick)
    setNamePrompt(null);

    setPhase('loading');
    setError(null);
    setGuesses([]);
    setClassicRows([]);
    setQuery('');
    setAbilityClue(null);
    setHeroOptions([]);
    setBlockedHeroIds(new Set());
    setItemAnswer(null);
    setItemOptions([]);
    setBlockedItemIds(new Set());
    setTrivia(null);
    setBlockedTrivia(new Set());
    setAnswer(null);
    setLeaderboard(readQuizLeaderboard(mode));

    try {
      if (mode === 'trivia') {
        setTrivia(pickRandomTrivia(lang));
        setPhase('playing');
        return;
      }

      await ensureQuizData();
      const heroes = getQuizHeroes();
      if (!heroes.length) throw new Error('No heroes');

      if (mode === 'classic') {
        setAnswer(randomHero());
      } else if (mode === 'ability') {
        const clue = randomAbilityClue();
        if (!clue) throw new Error('No abilities');
        const h = getHeroById(clue.heroId);
        if (!h) throw new Error('Hero missing');
        setAbilityClue(clue);
        setAnswer(h);
        setHeroOptions(heroChoiceOptions(h, 4));
      } else if (mode === 'items') {
        const item = randomItem();
        if (!item) throw new Error('No items');
        setItemAnswer(item);
        setItemOptions(itemChoiceOptions(item, 4));
        setAnswer(randomHero());
      }

      setPhase('playing');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [mode, lang]);

  useEffect(() => {
    void startRound();
  }, [startRound]);

  // Reset streak when switching mode
  useEffect(() => {
    setStreak(0);
    setLeaderboard(readQuizLeaderboard(mode));
    setNamePrompt(null);
  }, [mode]);

  const suggestions = useMemo(() => {
    if (phase !== 'playing' || isMcq) return [];
    return filterHeroes(query, lang).filter((h) => !guesses.some((g) => g.id === h.id));
  }, [query, lang, phase, guesses, isMcq]);

  const submitGuess = useCallback(
    (hero: QuizHero) => {
      if (phase !== 'playing' || !answer || mode !== 'classic') return;
      if (guesses.some((g) => g.id === hero.id)) return;

      const nextGuesses = [...guesses, hero];
      setGuesses(nextGuesses);
      setQuery('');
      setClassicRows((rows) => [...rows, compareClassic(hero, answer)]);

      if (hero.id === answer.id) {
        registerWin();
        return;
      }
      if (nextGuesses.length >= MAX_GUESSES) {
        registerLoss();
      }
    },
    [phase, answer, guesses, mode, registerWin, registerLoss]
  );

  const pickHeroOption = useCallback(
    (hero: QuizHero) => {
      if (phase !== 'playing' || mode !== 'ability' || !answer) return;
      if (blockedHeroIds.has(hero.id)) return;

      if (hero.id === answer.id) {
        registerWin();
        return;
      }
      const next = new Set(blockedHeroIds);
      next.add(hero.id);
      setBlockedHeroIds(next);
      if (next.size >= heroOptions.length - 1) {
        registerLoss();
      }
    },
    [phase, mode, answer, blockedHeroIds, heroOptions.length, registerWin, registerLoss]
  );

  const pickItemOption = useCallback(
    (item: QuizItem) => {
      if (phase !== 'playing' || mode !== 'items' || !itemAnswer) return;
      if (blockedItemIds.has(item.id)) return;

      if (item.id === itemAnswer.id) {
        registerWin();
        return;
      }
      const next = new Set(blockedItemIds);
      next.add(item.id);
      setBlockedItemIds(next);
      if (next.size >= itemOptions.length - 1) {
        registerLoss();
      }
    },
    [phase, mode, itemAnswer, blockedItemIds, itemOptions.length, registerWin, registerLoss]
  );

  const pickTriviaOption = useCallback(
    (index: number) => {
      if (phase !== 'playing' || mode !== 'trivia' || !trivia) return;
      if (blockedTrivia.has(index)) return;

      if (index === trivia.correctIndex) {
        registerWin();
        return;
      }
      const next = new Set(blockedTrivia);
      next.add(index);
      setBlockedTrivia(next);
      if (next.size >= trivia.options.length - 1) {
        registerLoss();
      }
    },
    [phase, mode, trivia, blockedTrivia, registerWin, registerLoss]
  );

  const submitNickname = useCallback(
    (raw: string) => {
      const nick = sanitizeNick(raw);
      writeQuizNickname(nick);
      setNicknameDraft(nick);
      setNamePrompt((pending) => {
        if (pending && pending.score > 0) {
          setLeaderboard(addQuizScore(mode, pending.score, nick));
        }
        return null;
      });
    },
    [mode]
  );

  return {
    phase,
    error,
    answer,
    guesses,
    classicRows,
    abilityClue,
    heroOptions,
    blockedHeroIds,
    itemAnswer,
    itemOptions,
    blockedItemIds,
    trivia,
    blockedTrivia,
    query,
    setQuery,
    suggestions,
    submitGuess,
    pickHeroOption,
    pickItemOption,
    pickTriviaOption,
    newRound: startRound,
    maxGuesses: MAX_GUESSES,
    remaining: Math.max(0, MAX_GUESSES - guesses.length),
    isMcq,
    streak,
    leaderboard,
    namePrompt,
    nicknameDraft,
    setNicknameDraft,
    submitNickname,
    heroName: (h: QuizHero) => heroDisplayName(h, lang),
  };
}
