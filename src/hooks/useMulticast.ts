import { useState, useCallback } from 'react';

export function useMulticast(playMulticastSound: (level: number) => void) {
  const [multicastLevel, setMulticastLevel] = useState(0);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [sparks, setSparks] = useState<{id: string, tx: number, ty: number, delay: number, size: number}[]>([]);

  const emitSparks = useCallback((count = 8, intensity = 1) => {
    const newSparks: {id: string, tx: number, ty: number, delay: number, size: number}[] = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 25 + Math.random() * 55 * intensity;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist * 0.7 - 15;
      newSparks.push({
        id: Date.now() + '-' + i + Math.random(),
        tx: tx,
        ty: ty,
        delay: Math.random() * 120,
        size: 3 + Math.random() * 5 * intensity
      });
    }
    setSparks(prev => [...prev, ...newSparks].slice(-35));
    setTimeout(() => {
      setSparks(current => current.filter(s => !newSparks.some(ns => ns.id === s.id)));
    }, 900);
  }, []);

  const triggerMulticastSequence = useCallback((multi: number) => {
    if (!multi || multi < 1) multi = 1;

    setMulticastLevel(0);
    setSparks([]);

    setTimeout(() => {
      setMulticastLevel(1);
      playMulticastSound(1);
      emitSparks(6, 0.8);
    }, 50);

    if (multi >= 2) {
      setTimeout(() => {
        setMulticastLevel(2);
        playMulticastSound(2);
        emitSparks(14, 1.3);
      }, 480);
    }
    if (multi >= 3) {
      setTimeout(() => {
        setMulticastLevel(3);
        playMulticastSound(3);
        emitSparks(22, 1.8);
      }, 480 * 2);
    }
    if (multi >= 4) {
      setTimeout(() => {
        setMulticastLevel(4);
        playMulticastSound(4);
        emitSparks(32, 2.5);
        setTimeout(() => emitSparks(18, 2.0), 120);
        setTimeout(() => emitSparks(14, 1.7), 280);
      }, 480 * 3);
    }
  }, [playMulticastSound, emitSparks]);

  const resetMulticast = useCallback(() => {
    setMulticastLevel(0);
    setCurrentMultiplier(1);
    setSparks([]);
  }, []);

  return {
    multicastLevel,
    setMulticastLevel,
    currentMultiplier,
    setCurrentMultiplier,
    sparks,
    setSparks,
    emitSparks,
    triggerMulticastSequence,
    resetMulticast,
  };
}
