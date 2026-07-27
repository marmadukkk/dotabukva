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

interface LanHostInfo {
  running: boolean;
  port: number;
  room: string;
  players: number;
  game_started: boolean;
  addresses: string[];
  primaryAddress: string;
  wsPath: string;
  error?: string;
}

interface DotaDesktopBridge {
  platform: string;
  isElectron: boolean;
  lan?: {
    startHost: (opts?: { port?: number; code?: string }) => Promise<LanHostInfo | { error: string }>;
    stopHost: () => Promise<{ ok?: boolean; error?: string }>;
    getInfo: () => Promise<LanHostInfo | null>;
  };
}

interface Window {
  __dotaBgm?: DotaBgmController;
  dotaDesktop?: DotaDesktopBridge;
}
