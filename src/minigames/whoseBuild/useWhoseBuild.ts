import { useCallback, useEffect, useRef, useState } from 'react';
import {
  HeroInfo,
  WhoseBuildRound,
  loadWhoseBuildRound,
} from './opendota';

export type BuildPhase = 'loading' | 'playing' | 'won' | 'lost' | 'error';

const MAX_ATTEMPTS = 3;
const NEXT_DELAY_MS = 2500;

export function useWhoseBuild() {
  const [phase, setPhase] = useState<BuildPhase>('loading');
  const [round, setRound] = useState<WhoseBuildRound | null>(null);
  const [attempts, setAttempts] = useState(MAX_ATTEMPTS);
  const [blocked, setBlocked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const nextTimerRef = useRef<number | null>(null);
  const genRef = useRef(0);

  const clearNextTimer = useCallback(() => {
    if (nextTimerRef.current != null) {
      clearTimeout(nextTimerRef.current);
      nextTimerRef.current = null;
    }
  }, []);

  const loadRound = useCallback(async () => {
    clearNextTimer();
    const gen = ++genRef.current;
    setPhase('loading');
    setError(null);
    setBlocked(new Set());
    setAttempts(MAX_ATTEMPTS);
    setRound(null);

    try {
      const r = await loadWhoseBuildRound();
      if (gen !== genRef.current) return;
      setRound(r);
      setPhase('playing');
    } catch (e) {
      if (gen !== genRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  }, [clearNextTimer]);

  useEffect(() => {
    void loadRound();
    return () => {
      clearNextTimer();
      genRef.current++;
    };
  }, [loadRound, clearNextTimer]);

  const scheduleNext = useCallback(() => {
    clearNextTimer();
    nextTimerRef.current = window.setTimeout(() => {
      void loadRound();
    }, NEXT_DELAY_MS);
  }, [clearNextTimer, loadRound]);

  const pickHero = useCallback(
    (hero: HeroInfo) => {
      if (phase !== 'playing' || !round) return;
      if (blocked.has(hero.id)) return;

      if (hero.id === round.correct.heroId) {
        setPhase('won');
        setStreak((s) => s + 1);
        scheduleNext();
        return;
      }

      const nextBlocked = new Set(blocked);
      nextBlocked.add(hero.id);
      setBlocked(nextBlocked);

      const left = attempts - 1;
      setAttempts(left);

      if (left <= 0) {
        setPhase('lost');
        setStreak(0);
        scheduleNext();
      }
    },
    [phase, round, blocked, attempts, scheduleNext]
  );

  return {
    phase,
    round,
    attempts,
    maxAttempts: MAX_ATTEMPTS,
    blocked,
    error,
    streak,
    pickHero,
    newGame: loadRound,
  };
}
