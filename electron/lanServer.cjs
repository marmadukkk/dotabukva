/**
 * LAN multiplayer host for DOTA-BUKVA desktop.
 * One active room per host process. Listens on 0.0.0.0 so LAN clients can connect.
 */
const http = require('http');
const os = require('os');
const { WebSocketServer } = require('ws');

const DEFAULT_PORT = 17432;

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const addrs = [];
  for (const name of Object.keys(nets || {})) {
    for (const net of nets[name] || []) {
      const fam = net.family;
      if ((fam === 'IPv4' || fam === 4) && !net.internal) {
        addrs.push({ address: net.address, iface: name });
      }
    }
  }
  return addrs;
}

/**
 * @returns {{
 *   start: (opts?: { port?: number }) => Promise<object>,
 *   stop: () => Promise<void>,
 *   getInfo: () => object | null,
 *   isRunning: () => boolean,
 * }}
 */
function createLanServer() {
  /** @type {http.Server | null} */
  let httpServer = null;
  /** @type {WebSocketServer | null} */
  let wss = null;
  let port = DEFAULT_PORT;
  let roomCode = '';
  let gameStarted = false;
  /** @type {any | null} */
  let currentSpin = null;
  /** @type {Set<string>} */
  let eliminated = new Set();
  /** @type {Map<import('ws').WebSocket, { role: string, freeElims: number, lastElim: number }>} */
  const clients = new Map();

  function playerCount() {
    return clients.size;
  }

  function publicState() {
    return {
      type: 'state',
      room: roomCode,
      players: playerCount(),
      game_started: gameStarted,
      eliminated: Array.from(eliminated),
      current_spin: currentSpin,
    };
  }

  function send(ws, obj) {
    if (ws.readyState === 1) {
      try {
        ws.send(JSON.stringify(obj));
      } catch {}
    }
  }

  function broadcast(obj, except = null) {
    const raw = JSON.stringify(obj);
    for (const ws of clients.keys()) {
      if (ws === except) continue;
      if (ws.readyState === 1) {
        try {
          ws.send(raw);
        } catch {}
      }
    }
  }

  function broadcastState() {
    broadcast(publicState());
  }

  function handleMessage(ws, msg) {
    const meta = clients.get(ws);
    if (!meta) return;

    if (msg.type === 'start_game') {
      if (meta.role !== 'leader') return;
      gameStarted = true;
      broadcast({ type: 'game_started' });
      broadcastState();
      return;
    }

    if (msg.type === 'spin_result' && msg.result) {
      if (meta.role !== 'leader') return;
      currentSpin = msg.result;
      broadcast({ type: 'spin_result', result: msg.result });
      broadcastState();
      return;
    }

    if (msg.type === 'eliminate' && msg.short) {
      if (meta.role !== 'guesser') return;
      const now = Date.now() / 1000;
      if (meta.freeElims <= 0 && now - meta.lastElim < 25) {
        send(ws, {
          type: 'elim_personal',
          free_elims: meta.freeElims,
          last_elim_time: meta.lastElim,
          rejected: true,
        });
        return;
      }

      eliminated.add(String(msg.short));

      if (meta.freeElims > 0) {
        meta.freeElims -= 1;
      } else {
        meta.lastElim = now;
      }
      clients.set(ws, meta);

      send(ws, {
        type: 'elim_personal',
        free_elims: meta.freeElims,
        last_elim_time: meta.lastElim,
      });
      broadcast({
        type: 'eliminated_update',
        eliminated: Array.from(eliminated),
        players: playerCount(),
      });
      return;
    }

    if (msg.type === 'uneliminate' && msg.short) {
      // Optional: allow unban only offline-style; for fairness keep leader-only or guesser who banned
      if (meta.role !== 'guesser' && meta.role !== 'leader') return;
      eliminated.delete(String(msg.short));
      broadcast({
        type: 'eliminated_update',
        eliminated: Array.from(eliminated),
        players: playerCount(),
      });
      return;
    }

    if (msg.type === 'reset_eliminated') {
      if (meta.role !== 'leader' && meta.role !== 'guesser') return;
      eliminated = new Set();
      broadcast({
        type: 'eliminated_update',
        eliminated: [],
        players: playerCount(),
      });
      return;
    }

    if (msg.type === 'ping') {
      send(ws, { type: 'pong' });
    }
  }

  function attachClient(ws, role) {
    const safeRole = role === 'leader' ? 'leader' : 'guesser';
    // Only one leader
    if (safeRole === 'leader') {
      for (const [other, m] of clients.entries()) {
        if (m.role === 'leader' && other !== ws) {
          // demote extra leaders
          m.role = 'guesser';
          clients.set(other, m);
        }
      }
    }

    clients.set(ws, {
      role: safeRole,
      freeElims: 3,
      lastElim: 0,
    });

    send(ws, publicState());
    send(ws, {
      type: 'elim_personal',
      free_elims: 3,
      last_elim_time: 0,
    });
    if (gameStarted) {
      send(ws, { type: 'game_started' });
    }
    broadcastState();

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(String(data));
        handleMessage(ws, msg);
      } catch {}
    });

    ws.on('close', () => {
      clients.delete(ws);
      broadcastState();
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  }

  async function start(opts = {}) {
    if (httpServer) {
      return getInfo();
    }

    port = opts.port || DEFAULT_PORT;
    roomCode = opts.code || generateRoomCode();
    gameStarted = false;
    currentSpin = null;
    eliminated = new Set();
    clients.clear();

    httpServer = http.createServer((req, res) => {
      // Tiny discovery endpoint for LAN clients
      if (req.url === '/lan' || req.url === '/lan/') {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        });
        res.end(JSON.stringify(getInfo()));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('DOTA-BUKVA LAN host\n');
    });

    wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    wss.on('connection', (ws, req) => {
      try {
        const url = new URL(req.url || '/ws', 'http://localhost');
        const role = url.searchParams.get('role') || 'guesser';
        const code = (url.searchParams.get('room') || '').toUpperCase();
        if (code && code !== roomCode) {
          send(ws, { type: 'error', message: 'wrong_room' });
          ws.close();
          return;
        }
        attachClient(ws, role);
      } catch {
        try { ws.close(); } catch {}
      }
    });

    await new Promise((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.listen(port, '0.0.0.0', () => resolve(undefined));
    });

    return getInfo();
  }

  async function stop() {
    for (const ws of clients.keys()) {
      try { ws.close(); } catch {}
    }
    clients.clear();
    await new Promise((resolve) => {
      if (wss) {
        try {
          wss.close(() => resolve(undefined));
        } catch {
          resolve(undefined);
        }
      } else resolve(undefined);
    });
    wss = null;
    await new Promise((resolve) => {
      if (httpServer) {
        httpServer.close(() => resolve(undefined));
      } else resolve(undefined);
    });
    httpServer = null;
    roomCode = '';
    gameStarted = false;
    currentSpin = null;
    eliminated = new Set();
  }

  function getInfo() {
    if (!httpServer) return null;
    const addresses = getLanAddresses();
    return {
      running: true,
      port,
      room: roomCode,
      players: playerCount(),
      game_started: gameStarted,
      addresses: addresses.map((a) => a.address),
      primaryAddress: addresses[0]?.address || '127.0.0.1',
      wsPath: '/ws',
    };
  }

  return {
    start,
    stop,
    getInfo,
    isRunning: () => !!httpServer,
  };
}

module.exports = {
  createLanServer,
  DEFAULT_PORT,
  generateRoomCode,
  getLanAddresses,
};
