/**
 * Multiplayer transport config.
 * - Desktop: LAN host (Electron).
 * - Web: online (remote WS/API) when configured; otherwise local offline session
 *   with full client mechanics (no LAN — web multiplayer will be server-based).
 */

import type { MpTransport } from './protocol';
import { DEFAULT_LAN_PORT } from './protocol';

/**
 * Production web rooms (Cloudflare worker). Dev and Electron ignore this
 * unless VITE_API_URL / VITE_WS_URL is set.
 */
export const PUBLIC_ROOMS_ORIGIN = 'https://dotabukva-rooms.dotabukva.workers.dev';

export function isElectronDesktop(): boolean {
  return !!(typeof window !== 'undefined' && window.dotaDesktop?.isElectron);
}

function isElectronBuild(): boolean {
  const flag = import.meta.env.VITE_IS_ELECTRON;
  return flag === true || flag === 'true';
}

/** Remote HTTP API base (no trailing slash). */
export function getApiBase(): string {
  const fromEnv = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (isElectronDesktop() || isElectronBuild()) return '';
  if (!import.meta.env.PROD) return '';
  return PUBLIC_ROOMS_ORIGIN.replace(/\/$/, '');
}

/**
 * Explicit online WebSocket base, e.g. wss://api.example.com
 * If empty, derived from API base or same-origin /ws/room/:code
 */
export function getOnlineWsBase(): string {
  const explicit = (import.meta.env.VITE_WS_URL || '').replace(/\/$/, '');
  if (explicit) return explicit;
  const api = getApiBase();
  if (api) {
    try {
      const u = new URL(api);
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      return u.origin;
    } catch {
      return '';
    }
  }
  return '';
}

/** True when an online multiplayer backend is configured (not used until server exists). */
export function isOnlineMultiplayerConfigured(): boolean {
  return !!(getApiBase() || getOnlineWsBase() || import.meta.env.VITE_ONLINE_MP === '1');
}

export function getPreferredTransport(): MpTransport {
  if (isElectronDesktop()) return 'lan';
  if (isOnlineMultiplayerConfigured()) return 'online';
  // Web without backend: local session only (mechanics ready, no network)
  return 'local';
}

/** Build WebSocket URL for joining a room. */
export function buildRoomWsUrl(opts: {
  code: string;
  role: string;
  transport: MpTransport;
  host?: string;
  port?: number;
}): string | null {
  const code = opts.code.toUpperCase();
  const role = opts.role || 'guesser';

  if (opts.transport === 'lan') {
    const host = opts.host || '127.0.0.1';
    const port = opts.port || DEFAULT_LAN_PORT;
    return `ws://${host}:${port}/ws?role=${encodeURIComponent(role)}&room=${encodeURIComponent(code)}`;
  }

  if (opts.transport === 'online') {
    const base = getOnlineWsBase();
    if (base) {
      return `${base}/ws/room/${encodeURIComponent(code)}?role=${encodeURIComponent(role)}`;
    }
    // Same-origin fallback (for self-hosted reverse proxy later)
    if (typeof location !== 'undefined') {
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${proto}//${location.host}/ws/room/${encodeURIComponent(code)}?role=${encodeURIComponent(role)}`;
    }
  }

  // local / none — no socket
  return null;
}

export { DEFAULT_LAN_PORT };
