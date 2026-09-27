import { DurableObject } from 'cloudflare:workers';
import {
  COUNTDOWN_MS,
  ClientMeta,
  REEL_MS,
  RoomData,
  Seat,
  ServerMsg,
  TURN_MS,
  allReadyToStart,
  answerShort,
  dealLeader,
  emptyRoom,
  freshMeta,
  guesserOrder,
  handleClientMessage,
  publicState,
  randomMiss,
  rotateWinnerToLeader,
  sanitizeNick,
} from './logic';

interface Env {
  ROOM: DurableObjectNamespace;
  DIRECTORY: DurableObjectNamespace;
}

type AlarmKind = 'countdown' | 'reel' | 'turn';

export class RoomDO extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected websocket', { status: 426 });
    }

    const url = new URL(request.url);
    await this.rememberCode(url);
    const wantsLeader = url.searchParams.get('role') === 'leader';
    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server);

    const room = await this.loadRoom();
    const leaderTaken = this.roster().some((seat) => seat.role === 'leader');
    const role = wantsLeader && !leaderTaken ? 'leader' : 'guesser';
    const meta = freshMeta(role, url.searchParams.get('nick') || '', crypto.randomUUID().slice(0, 8));
    server.serializeAttachment(meta);

    this.send(server, { type: 'hello', you: meta.id, roster: this.roster() });
    if (room.phase === 'reel') {
      this.send(server, this.reelMessage(room));
    }
    if (room.gameStarted && room.phase === 'playing') {
      this.send(server, {
        type: 'game_started',
        role: meta.role,
        you: meta.id,
        roster: this.roster(),
      });
    }
    await this.syncReady(await this.loadRoom());
    await this.publish();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const meta = this.readMeta(ws);
    if (!meta) return;

    let parsed: { type?: string; result?: unknown; short?: string; name?: string; ready?: boolean; pool?: unknown };
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

    if (parsed.type === 'ready') {
      ws.serializeAttachment({ ...meta, ready: !!parsed.ready });
      await this.syncReady(await this.loadRoom());
      return;
    }

    let room = await this.loadRoom();
    if ((parsed.type === 'pick' || parsed.type === 'eliminate') && parsed.short) {
      const current = room.turnOrder[room.turnIndex];
      if (!current || current !== meta.id || room.phase !== 'playing') return;
    }

    const players = this.ctx.getWebSockets().length;
    const result = handleClientMessage(room, meta, parsed, players, Date.now() / 1000);

    if (result.win) {
      await this.finishRound(meta, String(parsed.short || ''), room);
      return;
    }

    ws.serializeAttachment(result.meta);
    if (result.room !== room) await this.saveRoom(result.room);
    for (const msg of result.direct) this.send(ws, msg);
    for (const msg of result.broadcast) this.broadcast(msg);

    if (parsed.type === 'spin_result' && result.room.currentSpin) {
      await this.openTurn(result.room);
      return;
    }

    if ((parsed.type === 'pick' || parsed.type === 'eliminate') && result.room !== room) {
      await this.advanceTurn(result.room);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    const room = await this.loadRoom();
    const left = this.readMeta(ws);
    const current = room.turnOrder[room.turnIndex];
    if (left && current === left.id && room.phase === 'playing') {
      await this.skipTurn(room);
    }
    await this.syncReady(await this.loadRoom(), ws);
    await this.publish(ws);
  }

  async alarm(): Promise<void> {
    const kind = await this.ctx.storage.get<AlarmKind>('alarm');
    const room = await this.loadRoom();
    if (kind === 'countdown') {
      if (room.phase !== 'countdown' || !allReadyToStart(this.roster())) {
        await this.enterLobby(room);
        return;
      }
      await this.beginReel(room);
      return;
    }
    if (kind === 'reel') {
      if (room.phase !== 'reel') return;
      const next = { ...room, phase: 'playing' as const };
      await this.saveRoom(next);
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
      this.broadcastPersonalized(next);
      return;
    }
    if (kind === 'turn') {
      if (room.phase !== 'playing' || !room.turnDeadline) return;
      if (Date.now() + 250 < room.turnDeadline) return;
      await this.skipTurn(room);
    }
  }

  private async syncReady(room: RoomData, except?: WebSocket) {
    if (room.phase === 'playing' || room.phase === 'reel') {
      this.broadcastPersonalized(room, except);
      return;
    }
    const seats = this.roster(except);
    if (allReadyToStart(seats)) {
      if (room.phase !== 'countdown') {
        const endsAt = Date.now() + COUNTDOWN_MS;
        const next = { ...room, phase: 'countdown' as const, countdownEndsAt: endsAt };
        await this.saveRoom(next);
        await this.arm('countdown', endsAt);
        this.broadcast({ type: 'countdown', endsAt, roster: seats });
        this.broadcastPersonalized(next, except);
      } else {
        this.broadcastPersonalized(room, except);
      }
      return;
    }
    if (room.phase === 'countdown') {
      await this.enterLobby(room, except);
      return;
    }
    this.broadcastPersonalized(room, except);
  }

  private async enterLobby(room: RoomData, except?: WebSocket) {
    const next = { ...room, phase: 'lobby' as const, countdownEndsAt: 0 };
    await this.saveRoom(next);
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.delete('alarm');
    this.broadcast({ type: 'countdown_cancel', roster: this.roster(except) });
    this.broadcastPersonalized(next, except);
  }

  private async beginReel(room: RoomData) {
    const dealt = dealLeader(this.roster());
    this.applySeats(dealt);
    const winner = dealt.find((seat) => seat.role === 'leader');
    const endsAt = Date.now() + REEL_MS;
    const next: RoomData = {
      ...room,
      phase: 'reel',
      gameStarted: true,
      currentSpin: null,
      eliminated: [],
      turnOrder: [],
      turnIndex: 0,
      turnDeadline: 0,
      countdownEndsAt: 0,
      reelEndsAt: endsAt,
      reelWinnerId: winner?.id || '',
    };
    await this.saveRoom(next);
    await this.arm('reel', endsAt);
    this.broadcast(this.reelMessage(next));
    this.broadcastPersonalized(next);
    await this.publish();
  }

  private async openTurn(room: RoomData) {
    const order = guesserOrder(this.roster());
    const next: RoomData = {
      ...room,
      phase: 'playing',
      turnOrder: order,
      turnIndex: 0,
      turnDeadline: order.length ? Date.now() + TURN_MS : 0,
    };
    await this.saveRoom(next);
    if (next.turnDeadline) await this.arm('turn', next.turnDeadline);
    this.broadcastTurn(next);
    this.broadcastPersonalized(next);
  }

  private async advanceTurn(room: RoomData) {
    if (!room.turnOrder.length) {
      this.broadcastPersonalized(room);
      return;
    }
    const next: RoomData = {
      ...room,
      turnIndex: (room.turnIndex + 1) % room.turnOrder.length,
      turnDeadline: Date.now() + TURN_MS,
    };
    await this.saveRoom(next);
    await this.arm('turn', next.turnDeadline);
    this.broadcastTurn(next);
    this.broadcastPersonalized(next);
  }

  private async skipTurn(room: RoomData) {
    const miss = randomMiss(room.pool, room.eliminated, answerShort(room.currentSpin));
    const eliminated = miss && !room.eliminated.includes(miss) ? [...room.eliminated, miss] : room.eliminated;
    const next: RoomData = {
      ...room,
      eliminated,
      turnIndex: room.turnOrder.length ? (room.turnIndex + 1) % room.turnOrder.length : 0,
      turnDeadline: room.turnOrder.length ? Date.now() + TURN_MS : 0,
    };
    await this.saveRoom(next);
    if (miss) {
      this.broadcast({
        type: 'eliminated_update',
        eliminated,
        players: this.ctx.getWebSockets().length,
        auto: true,
        short: miss,
      });
    }
    if (next.turnDeadline) await this.arm('turn', next.turnDeadline);
    else await this.ctx.storage.deleteAlarm();
    this.broadcastTurn(next);
    this.broadcastPersonalized(next);
  }

  private async finishRound(winner: ClientMeta, short: string, room: RoomData) {
    const dealt = rotateWinnerToLeader(this.roster(), winner.id);
    this.applySeats(dealt);
    const hero =
      room.currentSpin && typeof room.currentSpin === 'object'
        ? String((room.currentSpin as { hero?: string }).hero || short)
        : short;
    const next: RoomData = {
      ...room,
      phase: 'playing',
      eliminated: [],
      currentSpin: null,
      pool: room.pool,
      turnOrder: [],
      turnIndex: 0,
      turnDeadline: 0,
    };
    await this.saveRoom(next);
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.delete('alarm');
    this.broadcast({
      type: 'round_won',
      winnerId: winner.id,
      winnerName: winner.name,
      short,
      hero,
      roster: this.roster(),
    });
    this.broadcastPersonalized(next);
  }

  private reelMessage(room: RoomData): ServerMsg {
    const seats = this.roster();
    return {
      type: 'reel',
      winnerId: room.reelWinnerId,
      endsAt: room.reelEndsAt,
      roster: seats,
      names: seats.map((seat) => seat.name),
    };
  }

  private broadcastTurn(room: RoomData) {
    const id = room.turnOrder[room.turnIndex] || '';
    const seat = this.roster().find((item) => item.id === id);
    this.broadcast({
      type: 'turn',
      playerId: id,
      name: seat?.name || '',
      deadline: room.turnDeadline,
    });
  }

  private async rememberCode(url: URL) {
    const match = url.pathname.match(/\/ws\/room\/([A-Za-z0-9]+)/);
    const code = match?.[1]?.toUpperCase() || '';
    if (!code) return;
    const room = await this.loadRoom();
    if (room.code !== code) await this.saveRoom({ ...room, code });
  }

  private async publish(except?: WebSocket) {
    const room = await this.loadRoom();
    if (!room.code) return;
    const players = this.ctx.getWebSockets().filter((sock) => sock !== except).length;
    try {
      const directory = this.env.DIRECTORY.get(this.env.DIRECTORY.idFromName('index'));
      await directory.fetch('https://directory/update', {
        method: 'POST',
        body: JSON.stringify({
          code: room.code,
          players,
          phase: room.phase,
          created: Date.now(),
        }),
      });
    } catch {
      /* listing is best-effort */
    }
  }

  private async arm(kind: AlarmKind, at: number) {
    await this.ctx.storage.put('alarm', kind);
    await this.ctx.storage.setAlarm(at);
  }

  private roster(except?: WebSocket): Seat[] {
    return this.ctx
      .getWebSockets()
      .filter((sock) => sock !== except)
      .map((sock) => this.readMeta(sock))
      .filter((meta): meta is ClientMeta => !!meta)
      .map((meta) => ({ id: meta.id, name: meta.name, role: meta.role, ready: !!meta.ready }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  }

  private applySeats(seats: Seat[]) {
    const byId = new Map(seats.map((seat) => [seat.id, seat]));
    for (const sock of this.ctx.getWebSockets()) {
      const meta = this.readMeta(sock);
      if (!meta) continue;
      const seat = byId.get(meta.id);
      if (!seat) continue;
      sock.serializeAttachment({ ...meta, role: seat.role });
    }
  }

  private broadcastPersonalized(room: RoomData, except?: WebSocket) {
    const seats = this.roster(except);
    for (const sock of this.ctx.getWebSockets()) {
      if (sock === except) continue;
      const meta = this.readMeta(sock);
      if (!meta) continue;
      this.send(sock, publicState(room, seats.length, seats, meta.role === 'leader'));
    }
  }

  private readMeta(ws: WebSocket): ClientMeta | null {
    const raw = ws.deserializeAttachment() as ClientMeta | null;
    if (!raw || (raw.role !== 'leader' && raw.role !== 'guesser')) return null;
    return {
      ...freshMeta(raw.role, raw.name, raw.id || 'seat'),
      ...raw,
      name: sanitizeNick(raw.name),
      ready: !!raw.ready,
    };
  }

  private async loadRoom(): Promise<RoomData> {
    const stored = await this.ctx.storage.get<Partial<RoomData>>('room');
    return { ...emptyRoom(), ...(stored || {}) };
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
