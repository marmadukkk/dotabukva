/** Early BGM player from index.html (looped menutheme, survives reload via session position). */
interface DotaBgmController {
  audio: HTMLAudioElement;
  BGM_BASE: number;
  TRACKS: string[];
  getTrackIndex: () => number;
  setTrack: (index: number, opts?: { force?: boolean }) => number;
  cycleTrack: () => number;
  /** Absolute music volume 0..1 (independent of SFX). */
  setMusicVolume: (music: number) => void;
  ensurePlaying: () => Promise<void> | void;
  saveNow: () => void;
}

interface Window {
  __dotaBgm?: DotaBgmController;
}
