/** Background soundtrack paths (order matches settings cycle). */
export const MUSIC_TRACKS = [
  '/sounds/menutheme.m4a',
  '/sounds/menutheme2.m4a',
  '/sounds/menutheme3.m4a',
  '/sounds/menutheme4.m4a',
] as const;

export const MUSIC_TRACK_STORAGE_KEY = 'dota_bukva_music_track';

export function clampMusicTrackIndex(index: number): number {
  const n = MUSIC_TRACKS.length;
  if (!n) return 0;
  const i = Math.floor(index);
  return ((i % n) + n) % n;
}

export function readStoredMusicTrack(): number {
  try {
    const raw = localStorage.getItem(MUSIC_TRACK_STORAGE_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) return clampMusicTrackIndex(parsed);
    }
  } catch {}
  return 0;
}
