import express, { Request, Response } from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotaData from './services/dotaData.js';
import { SpinResult } from './types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// CORS for frontend dev
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Static data mount (papich phrases)
app.use('/data', express.static(path.join(__dirname, '../../data')));

// In-memory rooms (exact replication)
interface RoomState {
  code: string;
  is_private: boolean;
  created: number;
  current_spin: SpinResult | null;
  eliminated: Set<string>;
  game_started: boolean;
  player_data: Map<WebSocket, { free_elims: number; last_elim_time: number }>;
}

const rooms = new Map<string, RoomState>();
const roomConnections = new Map<string, Set<WebSocket>>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  while (true) {
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    if (!rooms.has(code)) return code;
  }
}

function createNewRoom(is_private = false): string {
  const code = generateRoomCode();
  rooms.set(code, {
    code,
    is_private,
    created: Date.now() / 1000,
    current_spin: null,
    eliminated: new Set(),
    game_started: false,
    player_data: new Map()
  });
  roomConnections.set(code, new Set());
  return code;
}

function broadcastToRoom(code: string, message: any) {
  const conns = roomConnections.get(code);
  if (!conns) return;
  const dead: WebSocket[] = [];
  for (const ws of conns) {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      else dead.push(ws);
    } catch { dead.push(ws); }
  }
  for (const ws of dead) conns.delete(ws);
}

// ==================== API ROUTES (exact match to original) ====================

app.get('/', (_req, res) => {
  // In SPA we don't serve HTML here, frontend separate. For direct backend use return json status.
  res.json({ name: 'DotaBukva API (Node/Express)', status: 'ok' });
});

app.get('/api/spin', async (req: Request, res: Response) => {
  const mode = (req.query.mode as string) || 'heroes';
  try {
    const result = await dotaData.getRandomSpin(mode);

    // New multicast / multiplier mechanic (Dota Ogre style)
    const r = Math.random();
    let multiplier = 1;
    if (r < 0.22) multiplier = 1;           // ~22% x1
    else if (r < 0.75) multiplier = 2;      // ~53% x2  (high chance as requested)
    else if (r < 0.90) multiplier = 3;      // ~15% x3
    else multiplier = 4;                    // ~10% x4 (rare)

    res.setHeader('Cache-Control', 'no-store');
    res.json({ ...result, multiplier });
  } catch (e) {
    res.status(500).json({ error: 'spin failed' });
  }
});

app.get('/api/heroes', async (_req, res) => {
  const payload = await dotaData.getHeroesPayload();
  res.setHeader('Cache-Control', 'no-store');
  res.json(payload);
});

app.get('/api/items', async (_req, res) => {
  const payload = await dotaData.getItemsPayload();
  res.setHeader('Cache-Control', 'no-store');
  res.json(payload);
});

app.get('/api/abilities', async (_req, res) => {
  const payload = await dotaData.getAbilitiesPayload();
  res.setHeader('Cache-Control', 'no-store');
  res.json(payload);
});

app.post('/api/heroes/refresh', async (_req, res) => {
  const fresh = await dotaData.refreshHeroes();
  res.json({
    count: fresh.length,
    ttl_seconds: dotaData.CACHE_TTL_SECONDS,
    message: 'Heroes cache refreshed'
  });
});
app.get('/api/heroes/refresh', async (_req, res) => {
  const fresh = await dotaData.refreshHeroes();
  res.json({ count: fresh.length, ttl_seconds: dotaData.CACHE_TTL_SECONDS, message: 'Heroes cache refreshed' });
});

// ==================== ROOM API ====================

app.post('/api/rooms/create', (req: Request, res: Response) => {
  const is_private = req.query.is_private === 'true' || req.body?.is_private === true;
  const code = createNewRoom(is_private);
  res.json({
    code,
    is_private,
    invite_link: `/?room=${code}`
  });
});

app.get('/api/rooms', (_req, res) => {
  const publicRooms: any[] = [];
  for (const [code, room] of rooms.entries()) {
    if (!room.is_private) {
      publicRooms.push({
        code,
        created: room.created,
        players: (roomConnections.get(code) || new Set()).size
      });
    }
  }
  publicRooms.sort((a, b) => b.created - a.created);
  res.json({ rooms: publicRooms.slice(0, 20) });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);
  if (!room) return res.json({ error: 'Room not found' });
  res.json({
    code,
    is_private: room.is_private,
    current_spin: room.current_spin,
    eliminated: Array.from(room.eliminated),
    players: (roomConnections.get(code) || new Set()).size
  });
});

// ==================== WEBSOCKET /ws/room/{code} ====================
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' }); // Note: clients connect to /ws/room/...

// We handle upgrade manually to support path /ws/room/...
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  if (url.pathname.startsWith('/ws/room/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const pathMatch = url.pathname.match(/\/ws\/room\/([^/?]+)/);
  const code = (pathMatch ? pathMatch[1] : '').toUpperCase();
  const role = url.searchParams.get('role') || 'guesser';

  const room = rooms.get(code);
  if (!room) {
    ws.close(4004, 'Room not found');
    return;
  }

  const conns = roomConnections.get(code)!;
  conns.add(ws);

  if (role === 'guesser') {
    room.player_data.set(ws, { free_elims: 3, last_elim_time: 0 });
  }

  // send update
  broadcastToRoom(code, { type: 'room_update', players: conns.size });

  // initial state
  ws.send(JSON.stringify({
    type: 'state',
    current_spin: room.current_spin,
    eliminated: Array.from(room.eliminated),
    role,
    players: conns.size,
    game_started: room.game_started
  }));

  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const msgType = data.type;

      if (msgType === 'spin') {
        const mode = data.mode || 'heroes';
        const result = await dotaData.getRandomSpin(mode);
        room.current_spin = result as SpinResult;
        broadcastToRoom(code, { type: 'spin_result', result, players: conns.size });
      } else if (msgType === 'eliminate') {
        const short = data.short;
        if (short && !room.eliminated.has(short)) {
          const pdata = room.player_data.get(ws);
          if (pdata) {
            const now = Date.now() / 1000;
            let can = false;
            if (pdata.free_elims > 0) {
              pdata.free_elims--;
              can = true;
            } else if (now - pdata.last_elim_time >= 25) {
              can = true;
            }
            if (can) {
              pdata.last_elim_time = now;
              room.eliminated.add(short);
              broadcastToRoom(code, {
                type: 'eliminated_update',
                eliminated: Array.from(room.eliminated),
                players: conns.size
              });
              try {
                ws.send(JSON.stringify({ type: 'elim_personal', free_elims: pdata.free_elims, last_elim_time: pdata.last_elim_time }));
              } catch {}
            }
          }
        }
      } else if (msgType === 'clear_eliminated') {
        room.eliminated.clear();
        for (const pd of room.player_data.values()) {
          pd.free_elims = 3;
          pd.last_elim_time = 0;
        }
        broadcastToRoom(code, { type: 'eliminated_update', eliminated: [], players: conns.size });
      } else if (msgType === 'start_game') {
        room.game_started = true;
        broadcastToRoom(code, { type: 'game_started', players: conns.size });
      }
    } catch (e) {
      // ignore bad msgs
    }
  });

  ws.on('close', () => {
    conns.delete(ws);
    room.player_data.delete(ws);
    broadcastToRoom(code, { type: 'room_update', players: conns.size });
  });
});

// Cleanup loop (exact rules)
const ROOM_ABSOLUTE_TTL = 4 * 3600;
const ROOM_IDLE_NO_CONNECTIONS_TTL = 30 * 60;
const CLEANUP_CHECK_INTERVAL = 5 * 60;

setInterval(() => {
  const now = Date.now() / 1000;
  const expired: string[] = [];
  let activeCount = 0;
  for (const [code, room] of rooms.entries()) {
    const age = now - room.created;
    const active = (roomConnections.get(code) || new Set()).size;
    if (active > 0) activeCount++;
    if (age > ROOM_ABSOLUTE_TTL || (active === 0 && age > ROOM_IDLE_NO_CONNECTIONS_TTL)) {
      expired.push(code);
    }
  }
  for (const code of expired) {
    rooms.delete(code);
    roomConnections.delete(code);
    console.log(`[DotaBukva] Cleaned up expired room ${code}`);
  }
}, CLEANUP_CHECK_INTERVAL * 1000);

console.log('[DotaBukva] Room cleanup task scheduled');

// Start
server.listen(PORT, () => {
  console.log(`[DotaBukva] Backend running on http://localhost:${PORT}`);
  console.log(`[DotaBukva] WS endpoint: ws://localhost:${PORT}/ws/room/{code}`);
});

export default app;
