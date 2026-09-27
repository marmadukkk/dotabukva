/** Room rules shared with the desktop LAN host (electron/lanServer.cjs). */

export const FREE_ELIMS = 3;
export const ELIM_COOLDOWN_SEC = 25;
export const COUNTDOWN_MS = 3000;
export const REEL_MS = 3200;
export const TURN_MS = 15000;
export const MIN_PLAYERS = 2;

export type Role = 'leader' | 'guesser';

export type RoomPhase = 'lobby' | 'countdown' | 'reel' | 'playing';

export interface ClientMeta {
  id: string;
  name: string;
  role: Role;
  ready: boolean;
  freeElims: number;
  lastElim: number;
}

export interface Seat {
  id: string;
  name: string;
  role: Role;
  ready: boolean;
}

export interface RoomData {
  code: string;
  gameStarted: boolean;
  currentSpin: unknown | null;
  eliminated: string[];
  phase: RoomPhase;
  pool: string[];
  turnOrder: string[];
  turnIndex: number;
  turnDeadline: number;
  countdownEndsAt: number;
  reelEndsAt: number;
  reelWinnerId: string;
}

export type ServerMsg = { type: string; [key: string]: unknown };

export function emptyRoom(): RoomData {
  return {
    code: '',
    gameStarted: false,
    currentSpin: null,
    eliminated: [],
    phase: 'lobby',
    pool: [],
    turnOrder: [],
    turnIndex: 0,
    turnDeadline: 0,
    countdownEndsAt: 0,
    reelEndsAt: 0,
    reelWinnerId: '',
  };
}

export function allReadyToStart(seats: Seat[]): boolean {
  return seats.length >= MIN_PLAYERS && seats.every((seat) => seat.ready);
}

export function guesserOrder(seats: Seat[]): string[] {
  return seats
    .filter((seat) => seat.role === 'guesser')
    .map((seat) => seat.id)
    .sort();
}

export function randomMiss(
  pool: string[],
  eliminated: string[],
  answer: string | null,
  rng: () => number = Math.random,
): string | null {
  const banned = new Set(eliminated);
  if (answer) banned.add(answer);
  const choices = pool.filter((short) => short && !banned.has(short));
  if (!choices.length) return null;
  return choices[Math.floor(rng() * choices.length)] ?? null;
}

export function sanitizeNick(raw: unknown): string {
  const n = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 16);
  return n || 'Player';
}

export function answerShort(spin: unknown): string | null {
  if (!spin || typeof spin !== 'object') return null;
  const short = (spin as { short?: unknown }).short;
  return typeof short === 'string' && short ? short : null;
}

export function isCorrectPick(spin: unknown, short: string): boolean {
  const answer = answerShort(spin);
  return !!answer && answer === short;
}

/** One random player describes. Everyone else guesses. */
export function dealLeader<T extends { id: string; role: Role }>(
  players: T[],
  rng: () => number = Math.random,
): T[] {
  if (players.length === 0) return players;
  const idx = Math.floor(rng() * players.length);
  return players.map((player, i) => ({
    ...player,
    role: i === idx ? 'leader' : 'guesser',
  }));
}

/** Whoever found the hero describes the next round. */
export function rotateWinnerToLeader<T extends { id: string; role: Role }>(
  players: T[],
  winnerId: string,
): T[] {
  return players.map((player) => ({
    ...player,
    role: player.id === winnerId ? 'leader' : 'guesser',
  }));
}

export function publicState(
  room: RoomData,
  players: number,
  roster: Seat[] = [],
  revealSpin = false,
): ServerMsg {
  return {
    type: 'state',
    players,
    game_started: room.gameStarted,
    eliminated: room.eliminated,
    roster,
    phase: room.phase,
    countdownEndsAt: room.countdownEndsAt,
    reelEndsAt: room.reelEndsAt,
    reelWinnerId: room.reelWinnerId,
    turnDeadline: room.turnDeadline,
    turnPlayerId: room.turnOrder[room.turnIndex] || '',
    ...(revealSpin ? { current_spin: room.currentSpin } : {}),
  };
}

export function freshMeta(role: Role, name = 'Player', id = ''): ClientMeta {
  return {
    id,
    name: sanitizeNick(name),
    role,
    ready: false,
    freeElims: FREE_ELIMS,
    lastElim: 0,
  };
}

/** Messages sent to the socket that just joined, then a state broadcast. */
export function joinMessages(room: RoomData, players: number): ServerMsg[] {
  const direct: ServerMsg[] = [
    publicState(room, players),
    { type: 'elim_personal', free_elims: FREE_ELIMS, last_elim_time: 0 },
  ];
  if (room.gameStarted) direct.push({ type: 'game_started' });
  direct.push(publicState(room, players));
  return direct;
}

export interface HandleResult {
  room: RoomData;
  meta: ClientMeta;
  direct: ServerMsg[];
  broadcast: ServerMsg[];
  /** Host pressed start — caller deals a random leader, then tells each seat. */
  started?: boolean;
  /** Guesser clicked the spun hero. */
  win?: boolean;
}

export function handleClientMessage(
  room: RoomData,
  meta: ClientMeta,
  msg: { type?: string; result?: unknown; short?: string; pool?: unknown },
  players: number,
  nowSec: number,
): HandleResult {
  const direct: ServerMsg[] = [];
  const broadcast: ServerMsg[] = [];

  if (msg.type === 'start_game') {
    if (meta.role !== 'leader') return { room, meta, direct, broadcast };
    const next = { ...room, gameStarted: true, currentSpin: null, eliminated: [] };
    return { room: next, meta, direct, broadcast, started: true };
  }

  if (msg.type === 'spin_result' && msg.result) {
    if (meta.role !== 'leader') return { room, meta, direct, broadcast };
    const pool = Array.isArray(msg.pool)
      ? msg.pool.filter((short): short is string => typeof short === 'string' && short.length > 0)
      : room.pool;
    const next = { ...room, currentSpin: msg.result, pool };
    direct.push({ type: 'spin_result', result: msg.result });
    return { room: next, meta, direct, broadcast };
  }

  if ((msg.type === 'eliminate' || msg.type === 'pick') && msg.short) {
    if (meta.role !== 'guesser') return { room, meta, direct, broadcast };
    if (isCorrectPick(room.currentSpin, String(msg.short))) {
      return { room, meta, direct, broadcast, win: true };
    }

    const eliminated = room.eliminated.includes(String(msg.short))
      ? room.eliminated
      : [...room.eliminated, String(msg.short)];
    const next = { ...room, eliminated };
    broadcast.push({
      type: 'eliminated_update',
      eliminated,
      players,
    });
    return { room: next, meta, direct, broadcast };
  }

  if (msg.type === 'uneliminate' && msg.short) {
    if (meta.role !== 'guesser' && meta.role !== 'leader') return { room, meta, direct, broadcast };
    const eliminated = room.eliminated.filter((s) => s !== String(msg.short));
    const next = { ...room, eliminated };
    broadcast.push({ type: 'eliminated_update', eliminated, players });
    return { room: next, meta, direct, broadcast };
  }

  if (msg.type === 'reset_eliminated') {
    const next = { ...room, eliminated: [] };
    broadcast.push({ type: 'eliminated_update', eliminated: [], players });
    return { room: next, meta, direct, broadcast };
  }

  if (msg.type === 'ping') {
    direct.push({ type: 'pong' });
  }

  return { room, meta, direct, broadcast };
}

const ROOM_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(length = 6): string {
  let c = '';
  for (let i = 0; i < length; i++) {
    c += ROOM_CHARS[Math.floor(Math.random() * ROOM_CHARS.length)];
  }
  return c;
}
