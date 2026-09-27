import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applySuccessfulElim,
  canEliminate,
  initialElimState,
  remainingElimCd,
} from '../src/multiplayer/elimRules.ts';
import {
  DEFAULT_LAN_PORT,
  ELIM_COOLDOWN_SEC,
  FREE_ELIMS_INITIAL,
  generateRoomCode,
} from '../src/multiplayer/protocol.ts';
import { handleClientMessage, freshMeta, emptyRoom } from '../cloudflare/src/logic.ts';

describe('eliminate rules', () => {
  it('spends three free eliminates before the cooldown', () => {
    let state = initialElimState();
    assert.equal(state.freeElims, FREE_ELIMS_INITIAL);
    assert.equal(canEliminate(state, 100), true);

    state = applySuccessfulElim(state, 100);
    state = applySuccessfulElim(state, 101);
    state = applySuccessfulElim(state, 102);
    assert.deepEqual(state, { freeElims: 0, lastElimTime: 0 });
    assert.equal(remainingElimCd(state, 102), 0);

    state = applySuccessfulElim(state, 200);
    assert.equal(state.lastElimTime, 200);
    assert.equal(canEliminate(state, 200 + ELIM_COOLDOWN_SEC - 1), false);
    assert.equal(remainingElimCd(state, 200 + 10), ELIM_COOLDOWN_SEC - 10);
    assert.equal(canEliminate(state, 200 + ELIM_COOLDOWN_SEC), true);
  });

  it('matches the cloud room host for the same sequence', () => {
    let client = initialElimState();
    let room = emptyRoom();
    let meta = freshMeta('guesser');
    const shorts = ['a', 'b', 'c', 'd', 'e'];

    for (const [i, short] of shorts.entries()) {
      const now = 1_000 + i;
      const host = handleClientMessage(room, meta, { type: 'eliminate', short }, 2, now);
      if (host.direct[0]?.rejected) {
        assert.equal(canEliminate(client, now), false);
        continue;
      }
      assert.equal(canEliminate(client, now), true);
      client = applySuccessfulElim(client, now);
      room = host.room;
      meta = host.meta;
      assert.equal(meta.freeElims, client.freeElims);
      assert.equal(meta.lastElim, client.lastElimTime);
    }

    assert.equal(meta.freeElims, 0);
    assert.equal(room.eliminated.length, 4);
    assert.equal(canEliminate(client, meta.lastElim + 1), false);
  });
});

describe('room codes', () => {
  it('uses the unambiguous alphabet and the requested length', () => {
    const code = generateRoomCode(8);
    assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    assert.equal(DEFAULT_LAN_PORT, 17432);
  });
});
