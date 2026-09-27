import { DurableObject } from 'cloudflare:workers';
import {
  ClientMeta,
  RoomData,
  ServerMsg,
  emptyRoom,
  freshMeta,
  handleClientMessage,
  joinMessages,
  publicState,
} from './logic';

interface Env {
  ROOM: DurableObjectNamespace;
}

/**
 * One party room. WebSocket hibernation keeps the free-tier duration bill at
 * zero while players sit idle; room state lives in DO storage across wakes.
 */
export class RoomDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const url = new URL(request.url);
    const role = url.searchParams.get('role') === 'leader' ? 'leader' : 'guesser';
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);

    if (role === 'leader') this.demoteOtherLeaders(server);
    const meta = freshMeta(role);
    server.serializeAttachment(meta);

    const room = await this.loadRoom();
    const players = this.ctx.getWebSockets().length;
    const joined = joinMessages(room, players);
    // Last message is the public state; everyone else needs the new player count.
    const announce = joined[joined.length - 1];
    for (const msg of joined.slice(0, -1)) this.send(server, msg);
    if (announce) this.broadcast(announce);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const meta = this.readMeta(ws);
    if (!meta) return;

    let parsed: { type?: string; result?: unknown; short?: string };
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    const room = await this.loadRoom();
    const players = this.ctx.getWebSockets().length;
    const result = handleClientMessage(room, meta, parsed, players, Date.now() / 1000);

    ws.serializeAttachment(result.meta);
    if (result.room !== room) await this.saveRoom(result.room);
    for (const msg of result.direct) this.send(ws, msg);
    for (const msg of result.broadcast) this.broadcast(msg);
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const room = await this.loadRoom();
    const players = this.ctx.getWebSockets().filter((sock) => sock !== ws).length;
    this.broadcast(publicState(room, players), ws);
  }

  private demoteOtherLeaders(self: WebSocket) {
    for (const other of this.ctx.getWebSockets()) {
      if (other === self) continue;
      const meta = this.readMeta(other);
      if (meta?.role === 'leader') {
        other.serializeAttachment({ ...meta, role: 'guesser' });
      }
    }
  }

  private readMeta(ws: WebSocket): ClientMeta | null {
    const raw = ws.deserializeAttachment() as ClientMeta | null;
    if (!raw || (raw.role !== 'leader' && raw.role !== 'guesser')) return null;
    return raw;
  }

  private async loadRoom(): Promise<RoomData> {
    const stored = await this.ctx.storage.get<RoomData>('room');
    if (!stored) return emptyRoom();
    return {
      gameStarted: !!stored.gameStarted,
      currentSpin: stored.currentSpin ?? null,
      eliminated: Array.isArray(stored.eliminated) ? stored.eliminated.map(String) : [],
    };
  }

  private async saveRoom(room: RoomData): Promise<void> {
    await this.ctx.storage.put('room', room);
  }

  private send(ws: WebSocket, msg: ServerMsg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
      /* socket already gone */
    }
  }

  private broadcast(msg: ServerMsg, except?: WebSocket) {
    const raw = JSON.stringify(msg);
    for (const ws of this.ctx.getWebSockets()) {
      if (ws === except) continue;
      try {
        ws.send(raw);
      } catch {
        /* socket already gone */
      }
    }
  }
}
