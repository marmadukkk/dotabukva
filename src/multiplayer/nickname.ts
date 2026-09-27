export const NICK_STORAGE_KEY = 'dota_bukva_nick';

export function sanitizeNick(raw: unknown): string {
  const n = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 16);
  return n || 'Player';
}

export function readStoredNick(): string {
  try {
    return sanitizeNick(localStorage.getItem(NICK_STORAGE_KEY) || '');
  } catch {
    return 'Player';
  }
}

export function writeStoredNick(name: string): string {
  const nick = sanitizeNick(name);
  try {
    localStorage.setItem(NICK_STORAGE_KEY, nick);
  } catch {}
  return nick;
}
