import { DirectoryDO } from './directory';
import { generateRoomCode } from './logic';
import { RoomDO } from './room';

export { DirectoryDO, RoomDO };

interface Env {
  ROOM: DurableObjectNamespace;
  DIRECTORY: DurableObjectNamespace;
}

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/api/rooms/create') {
      return json({ code: generateRoomCode() });
    }

    if (request.method === 'GET' && url.pathname === '/api/rooms') {
      const directory = env.DIRECTORY.get(env.DIRECTORY.idFromName('index'));
      const listed = await directory.fetch('https://directory/rooms');
      const body = await listed.text();
      return new Response(body, {
        status: listed.status,
        headers: { 'Content-Type': 'application/json', ...CORS },
      });
    }

    const roomMatch = url.pathname.match(/^\/ws\/room\/([A-Za-z0-9]{4,12})$/);
    if (roomMatch && request.headers.get('Upgrade') === 'websocket') {
      const code = roomMatch[1].toUpperCase();
      const id = env.ROOM.idFromName(code);
      const stub = env.ROOM.get(id);
      return stub.fetch(request);
    }

    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response('dotabukva rooms', {
        headers: { 'Content-Type': 'text/plain', ...CORS },
      });
    }

    return json({ error: 'not_found' }, 404);
  },
};
