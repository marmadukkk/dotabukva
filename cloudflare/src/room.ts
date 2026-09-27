import { DurableObject } from 'cloudflare:workers';
import {
  ClientMeta,
  RoomData,
  Seat,
  ServerMsg,
  dealLeader,
  emptyRoom,
  freshMeta,
  handleClientMessage,
  publicState,
  rotateWinnerToLeader,
  sanitizeNick,
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
    const meta = freshMeta(role, url.searchParams.get('nick') || '', crypto.randomUUID().slice(0, 8));
    server.serializeAttachment(meta);

    const room = await this.loadRoom();
    this.send(server, { type: 'hello', you: meta.id, roster: this.roster() });
    this.send(server, {
      type: 'elim_personal',
      free_elims: meta.freeElims,
      last_elim_time: meta.lastElim,
    });
    if (room.gameStarted) {
      this.send(server, {
        type: 'game_started',
        role: meta.role,
        you: meta.id,
        roster: this.roster(),
      });
    }
    this.broadcastPersonalized(room);

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const meta = this.readMeta(ws);
    if (!meta) return;

    let parsed: { type?: string; result?: unknown; short?: string; name?: string };
    try {
      const text = typeof message === 'string' ? message : new TextDecoder().decode(message);
      parsed = JSON.parse(text);
    } catch {
      return;
    }

    if (parsed.type === 'set_nick') {
      ws.serializeAttachment({ ...meta, name: sanitizeNick(parsed.name) });
      this.broadcastPersonalized(await this.loadRoom());
      return;
    }

    const room = await this.loadRoom();
    const players = this.ctx.getWebSockets().length;
    const result = handleClientMessage(room, meta, parsed, players, Date.now() / 1000);

    if (result.started) {
      const dealt = dealLeader(this.roster());
      this.applySeats(dealt);
      await this.saveRoom(result.room);
      for (const sock of this.ctx.getWebSockets()) {
        const seat = this.readMeta(sock);
        if (!seat) continue;
        this.send(sock, {
          type: 'game_started',
          role: seat.role,
          you: seat.id,
          roster: this.roster(),
        });
      }
      this.broadcastPersonalized(result.room);
      return;
    }

    if (result.win) {
      const winner = meta;
      const dealt = rotateWinnerToLeader(this.roster(), winner.id);
      this.applySeats(dealt, true);
      const next: RoomData = { ...room, eliminated: [], currentSpin: null };
      await this.saveRoom(next);
      const hero =
        room.currentSpin && typeof room.currentSpin === 'object'
          ? String((room.currentSpin as { hero?: string }).hero || answerFrom(room))
          : answerFrom(room);
      this.broadcast({
        type: 'round_won',
        winnerId: winner.id,
        winnerName: winner.name,
        short: parsed.short,
        hero,
        roster: this.roster(),
      });
      this.broadcastPersonalized(next);
      return;
    }

    ws.serializeAttachment(result.meta);
    if (result.room !== room) await this.saveRoom(result.room);
    for (const msg of result.direct) this.send(ws, msg);
    for (const msg of result.broadcast) this.broadcast(msg);
    if (result.room !== room || parsed.type === 'spin_result') {
      this.broadcastPersonalized(result.room);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.broadcastPersonalized(await this.loadRoom(), ws);
  }

  private roster(except?: WebSocket): Seat[] {
    return this.ctx
      .getWebSockets()
      .filter((sock) => sock !== except)
      .map((sock) => this.readMeta(sock))
      .filter((meta): meta is ClientMeta => !!meta)
      .map((meta) => ({ id: meta.id, name: meta.name, role: meta.role }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  private applySeats(seats: Seat[], resetElims = false) {
    const byId = new Map(seats.map((seat) => [seat.id, seat]));
    for (const sock of this.ctx.getWebSockets()) {
      const meta = this.readMeta(sock);
      if (!meta) continue;
      const seat = byId.get(meta.id);
      if (!seat) continue;
      sock.serializeAttachment({
        ...meta,
        role: seat.role,
        ...(resetElims ? { freeElims: 3, lastElim: 0 } : {}),
      });
    }
  }

  private broadcastPersonalized(room: RoomData, except?: WebSocket) {
    for (const sock of this.ctx.getWebSockets()) {
      if (sock === except) continue;
      const meta = this.readMeta(sock);
      if (!meta) continue;
      this.send(sock, publicState(room, this.roster(except).length, this.roster(except), meta.role === 'leader'));
    }
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
    return {
      ...raw,
      id: raw.id || 'seat',
      name: sanitizeNick(raw.name),
    };
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

function answerFrom(room: RoomData): string {
  if (!room.currentSpin || typeof room.currentSpin !== 'object') return '';
  const short = (room.currentSpin as { short?: string }).short;
  return short || '';
}
