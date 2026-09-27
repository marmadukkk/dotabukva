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
  it('no longer blocks a guesser with a cooldown', () => {
    const state = { freeElims: 0, lastElimTime: 200 };
    assert.equal(canEliminate(state, 201), true);
    assert.equal(remainingElimCd(state, 201), 0);
    assert.equal(initialElimState().freeElims, FREE_ELIMS_INITIAL);
    assert.equal(ELIM_COOLDOWN_SEC, 25);
    assert.deepEqual(applySuccessfulElim(state, 300), state);
  });

  it('lets the room host cross out every pick in a row', () => {
    let room = emptyRoom();
    let meta = freshMeta('guesser');
    for (const short of ['a', 'b', 'c', 'd', 'e']) {
      const host = handleClientMessage(room, meta, { type: 'eliminate', short }, 2, 1_000);
      assert.equal(host.direct.some((msg) => msg.rejected), false);
      room = host.room;
      meta = host.meta;
    }
    assert.deepEqual(room.eliminated, ['a', 'b', 'c', 'd', 'e']);
  });
});

describe('room codes', () => {
  it('uses the unambiguous alphabet and the requested length', () => {
    const code = generateRoomCode(8);
    assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    assert.equal(DEFAULT_LAN_PORT, 17432);
  });
});
