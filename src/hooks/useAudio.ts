import { useRef, useState, useEffect, useCallback } from 'react';

const VOLUME_STORAGE_KEY = 'dota_bukva_volume';

function readStoredVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_STORAGE_KEY);
    if (raw !== null) {
      const n = parseFloat(raw);
      if (!isNaN(n) && n >= 0 && n <= 1) return n;
    }
  } catch {}
  return 0.7;
}

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [volume, setVolumeState] = useState(readStoredVolume);
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    try {
      localStorage.setItem(VOLUME_STORAGE_KEY, String(volume));
    } catch {}
  }, [volume]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
  }, []);

  function getAudioContext() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  function playTick(baseVolume = 0.08) {
    try {
      const master = volumeRef.current;
      if (master <= 0) return;
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'square';
      osc.frequency.value = 620 + Math.random() * 80;
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      gain.gain.value = baseVolume * master;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.035);
        setTimeout(() => osc.stop(), 50);
      }, 4);
    } catch {}
  }

  function playSpinSounds(totalDuration: number) {
    if (volumeRef.current <= 0) return;
    const tickInterval = 38;
    let elapsed = 0;
    const iv = setInterval(() => {
      if (elapsed > totalDuration + 80) {
        clearInterval(iv);
        return;
      }
      const progress = elapsed / totalDuration;
      const vol = Math.max(0.015, 0.09 * (1 - progress * 0.7));
      playTick(vol);
      elapsed += tickInterval;
    }, tickInterval);
  }

  function playDing() {
    try {
      const master = volumeRef.current;
      if (master <= 0) return;
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = 780;
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      gain.gain.value = 0.35 * master;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.65);
        setTimeout(() => osc.stop(), 720);
      }, 90);
    } catch {}
  }

  function playMulticastSound(level: number) {
    try {
      const master = volumeRef.current;
      if (master <= 0) return;
      const audio = new Audio(`/sounds/x${level}.mp3`);
      audio.volume = Math.min(1, 0.9 * master);
      audio.play().catch(() => {});
    } catch (e) {}
  }

  return {
    volume,
    setVolume,
    playTick,
    playSpinSounds,
    playDing,
    playMulticastSound,
  };
}
