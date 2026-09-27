import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { after, describe, it } from 'node:test';
import { WebSocket } from 'ws';

const require = createRequire(import.meta.url);
const { createLanServer } = require('./lanServer.cjs');

const PORT = 18741;

function connect(code, role) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `ws://127.0.0.1:${PORT}/ws?role=${role}&room=${encodeURIComponent(code)}`,
    );
    const msgs = [];
    ws.on('message', (data) => msgs.push(JSON.parse(String(data))));
    ws.on('open', () => resolve({ ws, msgs }));
    ws.on('error', reject);
  });
}

function waitFor(msgs, pred, ms = 2000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      const hit = msgs.find(pred);
      if (hit) return resolve(hit);
      if (Date.now() - start > ms) {
        return reject(new Error(`timeout ${JSON.stringify(msgs)}`));
      }
      setTimeout(tick, 20);
    };
    tick();
  });
}

describe('LAN host', () => {
  const server = createLanServer();

  after(async () => {
    await server.stop();
  });

  it('syncs a spin and enforces the eliminate cooldown', async () => {
    const info = await server.start({ port: PORT });
    assert.equal(info.port, PORT);
    assert.match(info.room, /^[A-Z0-9]{6}$/);

    const leader = await connect(info.room, 'leader');
    await waitFor(leader.msgs, (m) => m.type === 'state' && m.players === 1);

    const guesser = await connect(info.room, 'guesser');
    await waitFor(leader.msgs, (m) => m.type === 'state' && m.players === 2);

    const stranger = new WebSocket(
      `ws://127.0.0.1:${PORT}/ws?role=guesser&room=ZZZZZZ`,
    );
    const strangerMsgs = [];
    stranger.on('message', (data) => strangerMsgs.push(JSON.parse(String(data))));
    await new Promise((resolve, reject) => {
      stranger.on('close', resolve);
      stranger.on('error', reject);
    });
    assert.equal(strangerMsgs[0]?.message, 'wrong_room');

    leader.ws.send(JSON.stringify({ type: 'start_game' }));
    await waitFor(guesser.msgs, (m) => m.type === 'game_started');

    leader.ws.send(JSON.stringify({ type: 'spin_result', result: { hero: 'Pudge', letter: 'П' } }));
    const spin = await waitFor(guesser.msgs, (m) => m.type === 'spin_result');
    assert.equal(spin.result.hero, 'Pudge');

    for (const short of ['a', 'b', 'c', 'd', 'e']) {
      guesser.ws.send(JSON.stringify({ type: 'eliminate', short }));
    }
    const rejected = await waitFor(
      guesser.msgs,
      (m) => m.type === 'elim_personal' && m.rejected === true,
    );
    assert.equal(rejected.free_elims, 0);

    const update = await waitFor(
      leader.msgs,
      (m) => m.type === 'eliminated_update' && m.eliminated?.length === 4,
    );
    assert.deepEqual(update.eliminated, ['a', 'b', 'c', 'd']);

    leader.ws.close();
    guesser.ws.close();
  });
});
