/** Room rules shared with the desktop LAN host (electron/lanServer.cjs). */

export const FREE_ELIMS = 3;
export const ELIM_COOLDOWN_SEC = 25;

export type Role = 'leader' | 'guesser';

export interface ClientMeta {
  role: Role;
  freeElims: number;
  lastElim: number;
}

export interface RoomData {
  gameStarted: boolean;
  currentSpin: unknown | null;
  eliminated: string[];
}

export type ServerMsg = { type: string; [key: string]: unknown };

export function emptyRoom(): RoomData {
  return { gameStarted: false, currentSpin: null, eliminated: [] };
}

export function publicState(room: RoomData, players: number): ServerMsg {
  return {
    type: 'state',
    players,
    game_started: room.gameStarted,
    eliminated: room.eliminated,
    current_spin: room.currentSpin,
  };
}

export function freshMeta(role: Role): ClientMeta {
  return { role, freeElims: FREE_ELIMS, lastElim: 0 };
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
}

export function handleClientMessage(
  room: RoomData,
  meta: ClientMeta,
  msg: { type?: string; result?: unknown; short?: string },
  players: number,
  nowSec: number,
): HandleResult {
  const direct: ServerMsg[] = [];
  const broadcast: ServerMsg[] = [];

  if (msg.type === 'start_game') {
    if (meta.role !== 'leader') return { room, meta, direct, broadcast };
    const next = { ...room, gameStarted: true };
    broadcast.push({ type: 'game_started' });
    broadcast.push(publicState(next, players));
    return { room: next, meta, direct, broadcast };
  }

  if (msg.type === 'spin_result' && msg.result) {
    if (meta.role !== 'leader') return { room, meta, direct, broadcast };
    const next = { ...room, currentSpin: msg.result };
    broadcast.push({ type: 'spin_result', result: msg.result });
    broadcast.push(publicState(next, players));
    return { room: next, meta, direct, broadcast };
  }

  if (msg.type === 'eliminate' && msg.short) {
    if (meta.role !== 'guesser') return { room, meta, direct, broadcast };
    if (meta.freeElims <= 0 && nowSec - meta.lastElim < ELIM_COOLDOWN_SEC) {
      direct.push({
        type: 'elim_personal',
        free_elims: meta.freeElims,
        last_elim_time: meta.lastElim,
        rejected: true,
      });
      return { room, meta, direct, broadcast };
    }

    const eliminated = room.eliminated.includes(msg.short)
      ? room.eliminated
      : [...room.eliminated, String(msg.short)];
    const nextMeta: ClientMeta =
      meta.freeElims > 0
        ? { ...meta, freeElims: meta.freeElims - 1 }
        : { ...meta, lastElim: nowSec };
    const next = { ...room, eliminated };
    direct.push({
      type: 'elim_personal',
      free_elims: nextMeta.freeElims,
      last_elim_time: nextMeta.lastElim,
    });
    broadcast.push({
      type: 'eliminated_update',
      eliminated,
      players,
    });
    return { room: next, meta: nextMeta, direct, broadcast };
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
