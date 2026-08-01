import { useRef, useState, useEffect, useCallback } from 'react';
import {
  MUSIC_TRACKS,
  MUSIC_TRACK_STORAGE_KEY,
  clampMusicTrackIndex,
  readStoredMusicTrack,
} from '../constants/music';

const LEGACY_VOLUME_KEY = 'dota_bukva_volume';
const SFX_VOLUME_KEY = 'dota_bukva_sfx_volume';
const MUSIC_VOLUME_KEY = 'dota_bukva_music_volume';
/** Peak gain for multicast mp3s at 100% SFX (files are loud). */
const MULTICAST_BASE = 0.85;

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function readStoredVolume(key: string, fallback = 0.7): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      const n = parseFloat(raw);
      if (!isNaN(n) && n >= 0 && n <= 1) return n;
    }
  } catch {}
  return fallback;
}

/** Prefer new key; if missing, fall back to legacy single volume. */
function readSfxVolume(): number {
  try {
    if (localStorage.getItem(SFX_VOLUME_KEY) !== null) {
      return readStoredVolume(SFX_VOLUME_KEY, 0.7);
    }
  } catch {}
  return readStoredVolume(LEGACY_VOLUME_KEY, 0.7);
}

function readMusicVolume(): number {
  try {
    if (localStorage.getItem(MUSIC_VOLUME_KEY) !== null) {
      return readStoredVolume(MUSIC_VOLUME_KEY, 0.55);
    }
  } catch {}
  // Default music a bit quieter than SFX when migrating
  const legacy = readStoredVolume(LEGACY_VOLUME_KEY, 0.7);
  return clamp01(legacy * 0.85);
}

export function useAudio() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [sfxVolume, setSfxVolumeState] = useState(readSfxVolume);
  const [musicVolume, setMusicVolumeState] = useState(readMusicVolume);
  const [musicTrack, setMusicTrackState] = useState(readStoredMusicTrack);
  const sfxVolumeRef = useRef(sfxVolume);
  const musicVolumeRef = useRef(musicVolume);
  sfxVolumeRef.current = sfxVolume;
  musicVolumeRef.current = musicVolume;

  /** Currently playing multicast HTMLAudioElements — updated live when the slider moves. */
  const activeMulticastRef = useRef<HTMLAudioElement[]>([]);
  /** Looping music bed during reel spin. */
  const spinMusicRef = useRef<HTMLAudioElement | null>(null);

  const SPIN_MUSIC_PEAK = 0.85;

  useEffect(() => {
    try {
      localStorage.setItem(SFX_VOLUME_KEY, String(sfxVolume));
    } catch {}
  }, [sfxVolume]);

  useEffect(() => {
    try {
      localStorage.setItem(MUSIC_VOLUME_KEY, String(musicVolume));
    } catch {}
  }, [musicVolume]);

  useEffect(() => {
    try {
      localStorage.setItem(MUSIC_TRACK_STORAGE_KEY, String(musicTrack));
    } catch {}
  }, [musicTrack]);

  // SFX volume → in-flight multicast clips + spin music bed
  useEffect(() => {
    const v = clamp01(sfxVolume * MULTICAST_BASE);
    for (const el of activeMulticastRef.current) {
      try {
        el.volume = v;
        if (sfxVolume <= 0) {
          el.pause();
          el.currentTime = 0;
        }
      } catch {}
    }
    const spinEl = spinMusicRef.current;
    if (spinEl) {
      try {
        spinEl.volume = clamp01(sfxVolume * SPIN_MUSIC_PEAK);
        if (sfxVolume <= 0) {
          spinEl.pause();
        }
      } catch {}
    }
  }, [sfxVolume]);

  // Music volume → background theme (singleton from index.html)
  useEffect(() => {
    try {
      window.__dotaBgm?.setMusicVolume(musicVolume);
    } catch {}
  }, [musicVolume]);

  // Selected soundtrack
  useEffect(() => {
    try {
      window.__dotaBgm?.setTrack(musicTrack);
    } catch {}
  }, [musicTrack]);

  // Ensure BGM is running once the app mounts
  useEffect(() => {
    try {
      window.__dotaBgm?.setMusicVolume(musicVolumeRef.current);
      window.__dotaBgm?.setTrack(readStoredMusicTrack());
      window.__dotaBgm?.ensurePlaying();
    } catch {}
  }, []);

  const setSfxVolume = useCallback((v: number) => {
    setSfxVolumeState(clamp01(v));
  }, []);

  const setMusicVolume = useCallback((v: number) => {
    setMusicVolumeState(clamp01(v));
  }, []);

  const setMusicTrack = useCallback((index: number) => {
    setMusicTrackState(clampMusicTrackIndex(index));
  }, []);

  const cycleMusicTrack = useCallback(() => {
    setMusicTrackState((prev) => clampMusicTrackIndex(prev + 1));
  }, []);

  function getAudioContext() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  const playTick = useCallback((baseVolume = 0.08) => {
    try {
      const master = sfxVolumeRef.current;
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
  }, []);

  const playSpinSounds = useCallback((totalDuration: number) => {
    if (sfxVolumeRef.current <= 0) return;
    const tickInterval = 38;
    let elapsed = 0;
    const iv = setInterval(() => {
      if (elapsed > totalDuration + 80) {
        clearInterval(iv);
        return;
      }
      if (sfxVolumeRef.current <= 0) {
        clearInterval(iv);
        return;
      }
      const progress = elapsed / totalDuration;
      const vol = Math.max(0.015, 0.09 * (1 - progress * 0.7));
      playTick(vol);
      elapsed += tickInterval;
    }, tickInterval);
  }, [playTick]);

  const playDing = useCallback(() => {
    try {
      const master = sfxVolumeRef.current;
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
  }, []);

  /**
   * Play a one-shot SFX file, scaled by effects volume.
   * `src` may be a full path or a basename without extension (tries mp3/m4a/ogg/wav).
   */
  const playSfxFile = useCallback((src: string, peak = MULTICAST_BASE) => {
    try {
      const master = sfxVolumeRef.current;
      if (master <= 0) return;

      const candidates = src.includes('.')
        ? [src]
        : [`/sounds/${src}.mp3`, `/sounds/${src}.m4a`, `/sounds/${src}.ogg`, `/sounds/${src}.wav`];

      let idx = 0;
      const tryNext = () => {
        if (idx >= candidates.length) return;
        const url = candidates[idx++];
        const el = new Audio(url);
        const applyVol = () => {
          el.volume = clamp01(sfxVolumeRef.current * peak);
        };
        applyVol();

        el.addEventListener('loadedmetadata', applyVol);
        el.addEventListener('canplay', applyVol);

        const cleanup = () => {
          activeMulticastRef.current = activeMulticastRef.current.filter((a) => a !== el);
          el.removeEventListener('loadedmetadata', applyVol);
          el.removeEventListener('canplay', applyVol);
          el.removeEventListener('ended', cleanup);
          el.removeEventListener('error', onError);
        };
        const onError = () => {
          cleanup();
          tryNext();
        };
        el.addEventListener('ended', cleanup);
        el.addEventListener('error', onError);
        activeMulticastRef.current.push(el);

        const playPromise = el.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => applyVol())
            .catch(() => {
              cleanup();
              tryNext();
            });
        }
      };
      tryNext();
    } catch (e) {}
  }, []);

  const stopSpinMusic = useCallback(() => {
    const el = spinMusicRef.current;
    if (!el) return;
    try {
      el.pause();
      el.currentTime = 0;
    } catch {}
    spinMusicRef.current = null;
  }, []);

  /** Looping spin bed while reels are rolling (must NOT gate UI / result reveal). */
  const startSpinMusic = useCallback(() => {
    stopSpinMusic();
    if (sfxVolumeRef.current <= 0) return;
    try {
      // Prefer spin.mp3 if present, else spinmusic.mp3
      const el = new Audio('/sounds/spinmusic.mp3');
      el.loop = true;
      el.preload = 'auto';
      el.volume = clamp01(sfxVolumeRef.current * SPIN_MUSIC_PEAK);
      spinMusicRef.current = el;
      // Fire-and-forget — never await; result timing must not depend on this
      void el.play().catch(() => {
        if (spinMusicRef.current === el) spinMusicRef.current = null;
      });
    } catch {}
  }, [stopSpinMusic]);

  /**
   * End sting after reels land. Safe to call after stopSpinMusic().
   * Must stay non-blocking so the result card can paint immediately.
   */
  const playSpinMusicEnd = useCallback(() => {
    stopSpinMusic();
    if (sfxVolumeRef.current <= 0) return;
    // Defer one macrotask so React can commit setLastResult first
    window.setTimeout(() => {
      playSfxFile('/sounds/spinmusicend.mp3', 0.95);
    }, 0);
  }, [stopSpinMusic, playSfxFile]);

  // Cleanup spin music on unmount
  useEffect(() => () => stopSpinMusic(), [stopSpinMusic]);

  const playMulticastSound = useCallback((level: number) => {
    const lvl = Math.max(1, Math.min(4, Math.floor(level) || 1));
    playSfxFile(`/sounds/x${lvl}.mp3`, MULTICAST_BASE);
  }, [playSfxFile]);

  /** yess/noo (RU) or yess_eng/noo_eng (EN) when Multicast is toggled. */
  const playMulticastToggleSound = useCallback((enabled: boolean, lang: 'ru' | 'en' = 'ru') => {
    if (lang === 'en') {
      playSfxFile(enabled ? 'yess_eng' : 'noo_eng', 0.95);
    } else {
      playSfxFile(enabled ? 'yess' : 'noo', 0.95);
    }
  }, [playSfxFile]);

  const playDisclaimerSound = useCallback(() => {
    playSfxFile('/sounds/disclaimer.mp3', 0.9);
  }, [playSfxFile]);

  /** Warning popup (e.g. multiplayer in development). */
  const playWarningSound = useCallback(() => {
    playSfxFile('/sounds/warning.mp3', 0.95);
  }, [playSfxFile]);

  /** General UI button / card click. */
  const playButtonClick = useCallback(() => {
    playSfxFile('/sounds/buttonclick.mp3', 0.9);
  }, [playSfxFile]);

  /** Settings gear + items inside the settings panel. */
  const playSettingsClick = useCallback(() => {
    playSfxFile('/sounds/buttonclickSettings.mp3', 0.9);
  }, [playSfxFile]);

  /** Header logo click. */
  const playLogoClick = useCallback(() => {
    playSfxFile('/sounds/logoclick.mp3', 0.95);
  }, [playSfxFile]);

  /** Role pick cards (leader / guesser). */
  const playRolePick = useCallback(() => {
    playSfxFile('/sounds/rolepick.mp3', 0.95);
  }, [playSfxFile]);

  /** Cross out (ban) a hero/item/ability in the table. */
  const playBanSound = useCallback(() => {
    playSfxFile('/sounds/ban.mp3', 0.95);
  }, [playSfxFile]);

  /** Undo cross-out (unban) in the table. */
  const playUnbanSound = useCallback(() => {
    playSfxFile('/sounds/unban.mp3', 0.95);
  }, [playSfxFile]);

  /** Clicked eliminate while on cooldown (denied). */
  const playMipmapSound = useCallback(() => {
    playSfxFile('/sounds/mipmap.mp3', 0.95);
  }, [playSfxFile]);

  /** Invoker Game — Invoke skill cast. */
  const playInvokeSound = useCallback(() => {
    playSfxFile('/sounds/Invoke.mp3', 0.95);
  }, [playSfxFile]);

  // Global UI click SFX by data-sfx / common interactive selectors
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;

      // Never SFX on volume sliders / form typing fields
      if (target.closest('input[type="range"], input[type="text"], input[type="search"], textarea, select')) {
        return;
      }

      const marked = target.closest('[data-sfx]') as HTMLElement | null;
      if (marked) {
        const kind = (marked.getAttribute('data-sfx') || '').toLowerCase();
        if (kind === 'logo') playLogoClick();
        else if (kind === 'settings') playSettingsClick();
        else if (kind === 'rolepick' || kind === 'role') playRolePick();
        else if (kind === 'button' || kind === 'click') playButtonClick();
        // data-sfx="none" → silent
        return;
      }

      // Fallback: plain <button> / role=button without data-sfx
      if (target.closest('button, [role="button"]')) {
        playButtonClick();
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [playButtonClick, playSettingsClick, playLogoClick, playRolePick]);

  return {
    /** @deprecated use sfxVolume — kept as alias for any leftover callers */
    volume: sfxVolume,
    sfxVolume,
    musicVolume,
    musicTrack,
    musicTrackCount: MUSIC_TRACKS.length,
    setSfxVolume,
    setMusicVolume,
    setMusicTrack,
    cycleMusicTrack,
    setVolume: setSfxVolume,
    playTick,
    playSpinSounds,
    startSpinMusic,
    stopSpinMusic,
    playSpinMusicEnd,
    playDing,
    playMulticastSound,
    playMulticastToggleSound,
    playDisclaimerSound,
    playWarningSound,
    playButtonClick,
    playSettingsClick,
    playLogoClick,
    playRolePick,
    playBanSound,
    playUnbanSound,
    playMipmapSound,
    playInvokeSound,
  };
}
