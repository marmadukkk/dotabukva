/** Invoker spell combos — matches https://invoker-game.com/ (new + old modes). */

export type Orb = 'q' | 'w' | 'e';

export interface InvokerSpell {
  name: string;
  /** Display title */
  title: string;
  combo: Orb[];
  /** Dota ability icon key (steam CDN) */
  ability?: string;
}

/** Ability icons via Steam CDN (works offline-cacheable in browser). */
const CDN =
  'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities';

export function abilityIcon(ability: string): string {
  return `${CDN}/${ability}.png`;
}

export const ORB_ICONS = {
  q: abilityIcon('invoker_quas'),
  w: abilityIcon('invoker_wex'),
  e: abilityIcon('invoker_exort'),
  invoke: abilityIcon('invoker_invoke'),
} as const;

export const ORB_COLORS: Record<Orb | 'empty', string> = {
  q: '#3b82f6',
  w: '#c026d3',
  e: '#f59e0b',
  empty: '#27272a',
};

/** Modern Invoker (Dota 2) — combo order free; match by sorted orbs. */
export const INVOKER_SPELLS: InvokerSpell[] = [
  { name: 'cold snap', title: 'Cold Snap', combo: ['q', 'q', 'q'], ability: 'invoker_cold_snap' },
  { name: 'ghost walk', title: 'Ghost Walk', combo: ['q', 'q', 'w'], ability: 'invoker_ghost_walk' },
  { name: 'ice wall', title: 'Ice Wall', combo: ['q', 'q', 'e'], ability: 'invoker_ice_wall' },
  { name: 'emp', title: 'EMP', combo: ['w', 'w', 'w'], ability: 'invoker_emp' },
  { name: 'tornado', title: 'Tornado', combo: ['q', 'w', 'w'], ability: 'invoker_tornado' },
  { name: 'alacrity', title: 'Alacrity', combo: ['w', 'w', 'e'], ability: 'invoker_alacrity' },
  { name: 'sun strike', title: 'Sun Strike', combo: ['e', 'e', 'e'], ability: 'invoker_sun_strike' },
  { name: 'forge spirit', title: 'Forge Spirit', combo: ['q', 'e', 'e'], ability: 'invoker_forge_spirit' },
  { name: 'chaos meteor', title: 'Chaos Meteor', combo: ['w', 'e', 'e'], ability: 'invoker_chaos_meteor' },
  { name: 'deafening blast', title: 'Deafening Blast', combo: ['q', 'w', 'e'], ability: 'invoker_deafening_blast' },
];

export function spellByName(name: string): InvokerSpell | undefined {
  return INVOKER_SPELLS.find((s) => s.name === name);
}

/** Resolve orb triple → spell name (null if incomplete / invalid). Order free. */
export function resolveSpell(orbs: Orb[]): string | null {
  if (orbs.length !== 3 || orbs.some((o) => !o)) return null;
  const key = [...orbs].sort().join('');
  for (const s of INVOKER_SPELLS) {
    if ([...s.combo].sort().join('') === key) return s.name;
  }
  return null;
}

export function shuffleSpellNames(): string[] {
  const names = INVOKER_SPELLS.map((s) => s.name);
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }
  return names;
}

export function formatTime(sec: number): string {
  return sec.toFixed(2);
}

const RECORD_KEY = 'dota_bukva_invoker_best';

export function readBestTime(): number {
  try {
    const raw = localStorage.getItem(RECORD_KEY);
    // migrate old new-mode key if present
    const legacy = localStorage.getItem('dota_bukva_invoker_best_new');
    const candidate = raw ?? legacy;
    if (candidate == null) return Infinity;
    const n = parseFloat(candidate);
    return !isNaN(n) && n > 0 ? n : Infinity;
  } catch {
    return Infinity;
  }
}

export function writeBestTime(sec: number): void {
  try {
    localStorage.setItem(RECORD_KEY, String(sec));
  } catch {}
}

export interface LeaderboardEntry {
  time: number;
  at: number; // unix ms
  name: string;
}

const LEADERBOARD_KEY = 'dota_bukva_invoker_leaderboard';
const LEADERBOARD_MAX = 10;
const NICK_KEY = 'dota_bukva_invoker_nickname';

export function readNickname(): string {
  try {
    return (localStorage.getItem(NICK_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function writeNickname(name: string): void {
  try {
    localStorage.setItem(NICK_KEY, name.trim().slice(0, 16));
  } catch {}
}

export function sanitizeNickname(raw: string): string {
  const n = raw.trim().replace(/\s+/g, ' ').slice(0, 16);
  return n || 'Player';
}

export function readLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) {
      const best = readBestTime();
      if (Number.isFinite(best)) {
        return [{ time: best, at: Date.now(), name: readNickname() || 'Player' }];
      }
      return [];
    }
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e.time === 'number' && e.time > 0)
      .map((e) => ({
        time: e.time,
        at: typeof e.at === 'number' ? e.at : Date.now(),
        name: (e.name && String(e.name).trim()) || 'Player',
      }))
      .sort((a, b) => a.time - b.time)
      .slice(0, LEADERBOARD_MAX);
  } catch {
    return [];
  }
}

/** Insert a finished run; returns updated top list. Lower time = better. */
export function addLeaderboardTime(sec: number, name?: string): LeaderboardEntry[] {
  const time = parseFloat(sec.toFixed(2));
  if (!time || time <= 0) return readLeaderboard();
  const nick = sanitizeNickname(name ?? readNickname() ?? 'Player');
  writeNickname(nick);
  const list = readLeaderboard();
  list.push({ time, at: Date.now(), name: nick });
  list.sort((a, b) => a.time - b.time);
  const next = list.slice(0, LEADERBOARD_MAX);
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

/** Whether this time would place on the top-10 board. */
export function wouldPlaceOnLeaderboard(sec: number): boolean {
  const time = parseFloat(sec.toFixed(2));
  const list = readLeaderboard();
  if (list.length < LEADERBOARD_MAX) return true;
  return time < list[list.length - 1].time;
}

export type KeybindMap = { q: number; w: number; e: number; invoke: number };

/** Default: Q W E R (keyCodes) */
export const DEFAULT_KEYBINDS: KeybindMap = {
  q: 81,
  w: 87,
  e: 69,
  invoke: 82,
};

const KEYBINDS_STORAGE = 'dota_bukva_invoker_keybinds';

export function readKeybinds(): KeybindMap {
  try {
    const raw = localStorage.getItem(KEYBINDS_STORAGE);
    if (!raw) return { ...DEFAULT_KEYBINDS };
    const parsed = JSON.parse(raw) as Partial<KeybindMap>;
    return {
      q: typeof parsed.q === 'number' ? parsed.q : DEFAULT_KEYBINDS.q,
      w: typeof parsed.w === 'number' ? parsed.w : DEFAULT_KEYBINDS.w,
      e: typeof parsed.e === 'number' ? parsed.e : DEFAULT_KEYBINDS.e,
      invoke: typeof parsed.invoke === 'number' ? parsed.invoke : DEFAULT_KEYBINDS.invoke,
    };
  } catch {
    return { ...DEFAULT_KEYBINDS };
  }
}

export function writeKeybinds(keys: KeybindMap): void {
  try {
    localStorage.setItem(KEYBINDS_STORAGE, JSON.stringify(keys));
  } catch {}
}

export function keyCodeLabel(code: number): string {
  if (code === 13) return 'ENTER';
  if (code === 27) return 'ESC';
  if (code === 32) return 'SPACE';
  if (code === 16) return 'SHIFT';
  if (code === 17) return 'CTRL';
  if (code === 18) return 'ALT';
  if (code >= 65 && code <= 90) return String.fromCharCode(code);
  if (code >= 48 && code <= 57) return String.fromCharCode(code);
  if (code >= 96 && code <= 105) return `N${code - 96}`;
  if (code >= 112 && code <= 123) return `F${code - 111}`;
  return `Key${code}`;
}
