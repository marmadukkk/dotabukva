import { useState, useCallback, useEffect } from 'react';
import { HistoryEntry, SpinResult } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const logSpin = useCallback((result: SpinResult) => {
    const heroName = result.hero || result.hero_en || result.hero_ru || '';
    if (!heroName || !result.letter) return;
    const entry: HistoryEntry = {
      hero: heroName, letter: result.letter, short: result.short,
      attr: result.attr, color: result.color, image: result.image, ts: Date.now()
    };
    setHistory(prev => {
      const next = [entry, ...prev.filter(h => !(h.hero === entry.hero && h.letter === entry.letter))].slice(0, 30);
      localStorage.setItem('dota_bukva_history', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = useCallback((showConfirm: (msg: string, title: string, cb: () => void) => void) => {
    showConfirm('Очистить всю историю?', 'Очистить историю', () => {
      localStorage.removeItem('dota_bukva_history');
      setHistory([]);
    });
  }, []);

  // Load from localStorage
  useEffect(() => {
    try {
      const savedH = JSON.parse(localStorage.getItem('dota_bukva_history') || '[]');
      setHistory(savedH);
    } catch {}
  }, []);

  return {
    history,
    setHistory,
    logSpin,
    clearHistory,
  };
}
