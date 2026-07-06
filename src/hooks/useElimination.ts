import { useState, useRef, useCallback, useEffect } from 'react';

interface UseEliminationProps {
  currentRoom: string | null;
  currentRole: 'leader' | 'guesser' | null;
  sendRoomMessage?: (data: any) => void;
  language?: string; // for messages if needed
}

export function useElimination({ currentRoom, currentRole, sendRoomMessage }: UseEliminationProps) {
  const [eliminatedHeroes, setEliminatedHeroes] = useState<Set<string>>(new Set());
  const [myFreeElims, setMyFreeElims] = useState(3);
  const [myLastElim, setMyLastElim] = useState(0);
  const [elimCD, setElimCD] = useState(0);

  const elimCDIntervalRef = useRef<number | null>(null);

  const stopElimCD = useCallback(() => {
    if (elimCDIntervalRef.current) clearInterval(elimCDIntervalRef.current);
    elimCDIntervalRef.current = null;
    setElimCD(0);
  }, []);

  const startElimCD = useCallback((secs: number) => {
    if (elimCDIntervalRef.current) clearInterval(elimCDIntervalRef.current);
    setElimCD(Math.ceil(secs));
    elimCDIntervalRef.current = window.setInterval(() => {
      setElimCD(prev => {
        const n = prev - 1;
        if (n <= 0) {
          if (elimCDIntervalRef.current) { clearInterval(elimCDIntervalRef.current); elimCDIntervalRef.current = null; }
          return 0;
        }
        return n;
      });
    }, 1000);
  }, []);

  const toggleEliminated = useCallback((short: string) => {
    if (currentRoom && sendRoomMessage) {
      if (currentRole !== 'guesser') return;
      const now = Date.now() / 1000;
      if (myFreeElims <= 0 && now - myLastElim < 25) return;

      sendRoomMessage({ type: 'eliminate', short });

      setEliminatedHeroes(prev => {
        const n = new Set(prev);
        n.add(short);
        return n;
      });

      let newFree = myFreeElims;
      let newLast = myLastElim;
      if (myFreeElims > 0) newFree--;
      else newLast = now;
      setMyFreeElims(newFree);
      setMyLastElim(newLast);
      if (newFree <= 0) {
        const rem = Math.max(0, 25 - (Date.now()/1000 - newLast));
        if (rem > 0) startElimCD(rem);
      }
      return;
    }

    setEliminatedHeroes(prev => {
      const next = new Set(prev);
      if (next.has(short)) next.delete(short); else next.add(short);
      localStorage.setItem('dota_bukva_eliminated', JSON.stringify(Array.from(next)));
      return next;
    });
  }, [currentRoom, currentRole, sendRoomMessage, myFreeElims, myLastElim, startElimCD]);

  const resetEliminated = useCallback((currentMode: string, showConfirm: (msg: string, title: string, cb: () => void) => void) => {
    const msg = currentMode === 'items' 
      ? 'Сбросить все вычеркнутые предметы?' 
      : (currentMode === 'abilities' ? 'Сбросить все вычеркнутые способности?' : 'Сбросить все вычеркнутые герои?');
    showConfirm(msg, 'Сброс вычеркнутых', () => {
      setEliminatedHeroes(new Set());
      localStorage.setItem('dota_bukva_eliminated', '[]');
    });
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const savedE = JSON.parse(localStorage.getItem('dota_bukva_eliminated') || '[]');
      setEliminatedHeroes(new Set(savedE));
    } catch {}
  }, []);

  return {
    eliminatedHeroes,
    setEliminatedHeroes,
    myFreeElims,
    setMyFreeElims,
    myLastElim,
    setMyLastElim,
    elimCD,
    setElimCD,
    toggleEliminated,
    resetEliminated,
    stopElimCD,
    startElimCD,
    elimCDIntervalRef,
  };
}
