import { DurableObject } from 'cloudflare:workers';

export interface ListedRoom {
  code: string;
  created: number;
  players: number;
  phase: string;
}

const MAX_AGE_MS = 3 * 60 * 60 * 1000;

export class DirectoryDO extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET') {
      const rooms = await this.list();
      return Response.json({ rooms });
    }
    if (request.method === 'POST' && url.pathname === '/update') {
      const body = (await request.json()) as Partial<ListedRoom>;
      const code = String(body.code || '').toUpperCase();
      if (!code) return Response.json({ ok: false }, { status: 400 });
      const players = Number(body.players) || 0;
      const now = Date.now();
      const rooms = await this.read();
      const prev = rooms.find((room) => room.code === code);
      const next = rooms.filter((room) => room.code !== code);
      if (players > 0) {
        next.unshift({
          code,
          created: prev?.created || Number(body.created) || now,
          players,
          phase: String(body.phase || 'lobby'),
        });
      }
      await this.ctx.storage.put('rooms', next);
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  private async list(): Promise<ListedRoom[]> {
    const now = Date.now();
    const rooms = (await this.read()).filter((room) => now - room.created < MAX_AGE_MS && room.players > 0);
    return rooms.sort((a, b) => b.created - a.created);
  }

  private async read(): Promise<ListedRoom[]> {
    const stored = await this.ctx.storage.get<ListedRoom[]>('rooms');
    return Array.isArray(stored) ? stored : [];
  }
}
