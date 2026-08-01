import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_KEYBINDS,
  INVOKER_SPELLS,
  KeybindMap,
  LeaderboardEntry,
  Orb,
  addLeaderboardTime,
  formatTime,
  readBestTime,
  readKeybinds,
  readLeaderboard,
  readNickname,
  resolveSpell,
  shuffleSpellNames,
  spellByName,
  wouldPlaceOnLeaderboard,
  writeBestTime,
  writeKeybinds,
} from './spells';

export type GamePhase = 'waiting' | 'playing' | 'finished';

export type InvokeOutcome = 'needed' | 'wrong';

interface UseInvokerGameOptions {
  /**
   * Fired when Invoke creates a valid spell.
   * - needed — matches the required target
   * - wrong — valid spell but not the one needed
   */
  onInvoke?: (outcome: InvokeOutcome) => void;
}

export function useInvokerGame(opts: UseInvokerGameOptions = {}) {
  const onInvokeRef = useRef(opts.onInvoke);
  onInvokeRef.current = opts.onInvoke;

  const [phase, setPhase] = useState<GamePhase>('waiting');
  const [keys, setKeys] = useState<KeybindMap>(() => readKeybinds());
  const [orbs, setOrbs] = useState<(Orb | '')[]>(['', '', '']);
  const [spell1, setSpell1] = useState('');
  const [spell2, setSpell2] = useState('');
  const [targetSpell, setTargetSpell] = useState('');
  const [queue, setQueue] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [record, setRecord] = useState(() => readBestTime());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => readLeaderboard());
  const [bindingKey, setBindingKey] = useState<keyof KeybindMap | null>(null);
  /** Ask for nickname after a record / top-10 finish */
  const [namePrompt, setNamePrompt] = useState<{
    time: number;
    isRecord: boolean;
  } | null>(null);
  const [nicknameDraft, setNicknameDraft] = useState(() => readNickname());

  const namePromptRef = useRef(namePrompt);
  useEffect(() => {
    namePromptRef.current = namePrompt;
  }, [namePrompt]);

  const phaseRef = useRef(phase);
  const keysRef = useRef(keys);
  const orbsRef = useRef(orbs);
  const spell1Ref = useRef(spell1);
  const spell2Ref = useRef(spell2);
  const targetRef = useRef(targetSpell);
  const queueRef = useRef(queue);
  const progressRef = useRef(progress);
  const elapsedRef = useRef(elapsed);
  const recordRef = useRef(record);
  const timerRef = useRef<number | null>(null);
  const tickStartRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    keysRef.current = keys;
  }, [keys]);
  useEffect(() => {
    orbsRef.current = orbs;
  }, [orbs]);
  useEffect(() => {
    spell1Ref.current = spell1;
  }, [spell1]);
  useEffect(() => {
    spell2Ref.current = spell2;
  }, [spell2]);
  useEffect(() => {
    targetRef.current = targetSpell;
  }, [targetSpell]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    elapsedRef.current = elapsed;
  }, [elapsed]);
  useEffect(() => {
    recordRef.current = record;
  }, [record]);

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    tickStartRef.current = performance.now();
    setElapsed(0);
    timerRef.current = window.setInterval(() => {
      const sec = (performance.now() - tickStartRef.current) / 1000;
      setElapsed(sec);
      elapsedRef.current = sec;
    }, 16);
  }, [stopTimer]);

  const endGame = useCallback(() => {
    // If closed with pending nick prompt, still save under last/default nick
    setNamePrompt((pending) => {
      if (pending) {
        setLeaderboard(addLeaderboardTime(pending.time));
      }
      return null;
    });
    stopTimer();
    setPhase('waiting');
    phaseRef.current = 'waiting';
    setOrbs(['', '', '']);
    setSpell1('');
    setSpell2('');
    setTargetSpell('');
    setQueue([]);
    setProgress(0);
    setElapsed(0);
    setResult(null);
  }, [stopTimer]);

  const submitNickname = useCallback((rawName: string) => {
    setNamePrompt((pending) => {
      if (pending) {
        setLeaderboard(addLeaderboardTime(pending.time, rawName));
      }
      return null;
    });
    setNicknameDraft(rawName.trim().slice(0, 16));
  }, []);

  const startGame = useCallback(() => {
    const names = shuffleSpellNames();
    setQueue(names.slice(1));
    queueRef.current = names.slice(1);
    setTargetSpell(names[0]);
    targetRef.current = names[0];
    setOrbs(['', '', '']);
    setSpell1('');
    setSpell2('');
    setProgress(0);
    progressRef.current = 0;
    setResult(null);
    setPhase('playing');
    phaseRef.current = 'playing';
    startTimer();
  }, [startTimer]);

  const pushOrb = useCallback((orb: Orb) => {
    setOrbs((prev) => {
      const next: (Orb | '')[] = [prev[1] || '', prev[2] || '', orb];
      orbsRef.current = next;
      return next;
    });
  }, []);

  const doInvoke = useCallback(() => {
    const cur = orbsRef.current;
    if (cur.some((o) => o === '')) return;
    const name = resolveSpell(cur as Orb[]);
    if (!name) return;

    const needed = name === targetRef.current;
    try {
      onInvokeRef.current?.(needed ? 'needed' : 'wrong');
    } catch {}

    const prev1 = spell1Ref.current;
    const prev2 = spell2Ref.current;
    const next2 = prev1 !== name ? prev1 : prev2;
    setSpell2(next2);
    setSpell1(name);
    spell1Ref.current = name;
    spell2Ref.current = next2;

    if (needed) {
      const nextProgress = progressRef.current + 1;
      const total = INVOKER_SPELLS.length;
      if (nextProgress >= total) {
        stopTimer();
        const finalTime = parseFloat(elapsedRef.current.toFixed(2));
        setResult(finalTime);
        setProgress(nextProgress);
        progressRef.current = nextProgress;
        setPhase('finished');
        phaseRef.current = 'finished';

        const isRecord = finalTime < recordRef.current;
        if (isRecord) {
          writeBestTime(finalTime);
          setRecord(finalTime);
          recordRef.current = finalTime;
        }

        // Record or top-10 → ask for nick; otherwise silent save with last nick
        if (isRecord || wouldPlaceOnLeaderboard(finalTime)) {
          setNicknameDraft(readNickname());
          setNamePrompt({ time: finalTime, isRecord });
        } else {
          setLeaderboard(addLeaderboardTime(finalTime));
        }
      } else {
        const q = queueRef.current;
        setTargetSpell(q[0] || '');
        targetRef.current = q[0] || '';
        setQueue(q.slice(1));
        queueRef.current = q.slice(1);
        setProgress(nextProgress);
        progressRef.current = nextProgress;
      }
    }
  }, [stopTimer]);

  useEffect(() => {
    if (!bindingKey) return;
    const onKey = (ev: KeyboardEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      const code = ev.keyCode || ev.which;
      if (!code) return;
      if (code === 27) {
        setBindingKey(null);
        return;
      }
      // Enter reserved for start/reset
      if (code === 13) return;
      setKeys((prev) => {
        const next = { ...prev, [bindingKey]: code };
        keysRef.current = next;
        writeKeybinds(next);
        return next;
      });
      setBindingKey(null);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [bindingKey]);

  const resetKeybinds = useCallback(() => {
    const next = { ...DEFAULT_KEYBINDS };
    setKeys(next);
    keysRef.current = next;
    writeKeybinds(next);
    setBindingKey(null);
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (bindingKey) return;
      const t = ev.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) {
        return;
      }

      const code = ev.keyCode || ev.which;
      const phaseNow = phaseRef.current;
      const k = keysRef.current;

      if (code === 13) {
        // Don't steal Enter while nickname prompt is open
        if (namePromptRef.current) return;
        ev.preventDefault();
        if (phaseNow === 'waiting') startGame();
        else if (phaseNow === 'playing' || phaseNow === 'finished') endGame();
        return;
      }

      if (phaseNow !== 'playing') return;

      if (code === k.q) {
        ev.preventDefault();
        pushOrb('q');
      } else if (code === k.w) {
        ev.preventDefault();
        pushOrb('w');
      } else if (code === k.e) {
        ev.preventDefault();
        pushOrb('e');
      } else if (code === k.invoke) {
        ev.preventDefault();
        doInvoke();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [bindingKey, startGame, endGame, pushOrb, doInvoke]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const totalSpells = INVOKER_SPELLS.length;
  const targetMeta = targetSpell ? spellByName(targetSpell) : undefined;
  const spell1Meta = spell1 ? spellByName(spell1) : undefined;
  const spell2Meta = spell2 ? spellByName(spell2) : undefined;

  return {
    phase,
    keys,
    orbs,
    spell1,
    spell2,
    spell1Meta,
    spell2Meta,
    targetSpell,
    targetMeta,
    progress,
    totalSpells,
    elapsed,
    elapsedLabel: formatTime(elapsed),
    result,
    resultLabel: result != null ? formatTime(result) : null,
    record,
    recordLabel: Number.isFinite(record) ? formatTime(record) : '—',
    leaderboard,
    namePrompt,
    nicknameDraft,
    setNicknameDraft,
    submitNickname,
    bindingKey,
    startKeybind: (k: keyof KeybindMap) => setBindingKey(k),
    cancelKeybind: () => setBindingKey(null),
    resetKeybinds,
    startGame,
    endGame,
    pushOrb,
    doInvoke,
  };
}
