import { useRef } from 'react';

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  function getAudioContext() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtxRef.current;
  }

  function playTick(volume = 0.08) {
    try {
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'square';
      osc.frequency.value = 620 + Math.random() * 80;
      filter.type = 'lowpass';
      filter.frequency.value = 1400;
      gain.gain.value = volume;
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
      const ctx = getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      osc.type = 'sine';
      osc.frequency.value = 780;
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      gain.gain.value = 0.35;
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
      const audio = new Audio(`/sounds/x${level}.mp3`);
      audio.volume = 0.9;
      audio.play().catch(() => {});
    } catch (e) {}
  }

  return {
    playTick,
    playSpinSounds,
    playDing,
    playMulticastSound,
  };
}
