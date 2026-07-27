/**
 * Shared multiplayer protocol (desktop LAN + future web online).
 * Both clients speak the same JSON messages over WebSocket.
 */

export type RoomRole = 'leader' | 'guesser';

export type MpTransport = 'lan' | 'online' | 'local' | 'none';

/** Client → server */
export type ClientRoomMessage =
  | { type: 'start_game' }
  | { type: 'spin_result'; result: unknown }
  | { type: 'eliminate'; short: string }
  | { type: 'uneliminate'; short: string }
  | { type: 'reset_eliminated' }
  | { type: 'ping' };

/** Server → client */
export type ServerRoomMessage =
  | {
      type: 'state';
      room?: string;
      players?: number;
      game_started?: boolean;
      eliminated?: string[];
      current_spin?: unknown;
    }
  | { type: 'game_started' }
  | { type: 'spin_result'; result: unknown }
  | {
      type: 'eliminated_update';
      eliminated: string[];
      players?: number;
    }
  | {
      type: 'elim_personal';
      free_elims: number;
      last_elim_time: number;
      rejected?: boolean;
    }
  | { type: 'error'; message: string }
  | { type: 'pong' }
  | { players?: number; type?: string; [key: string]: unknown };

export const DEFAULT_LAN_PORT = 17432;
export const FREE_ELIMS_INITIAL = 3;
export const ELIM_COOLDOWN_SEC = 25;

export function generateRoomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < length; i++) {
    c += chars[Math.floor(Math.random() * chars.length)];
  }
  return c;
}
