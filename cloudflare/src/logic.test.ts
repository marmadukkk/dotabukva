import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  emptyRoom,
  freshMeta,
  handleClientMessage,
  joinMessages,
} from './logic.ts';

describe('room logic', () => {
  it('rejects a second eliminate inside the cooldown', () => {
    const meta = { ...freshMeta('guesser'), freeElims: 0, lastElim: 1_000 };
    const result = handleClientMessage(emptyRoom(), meta, { type: 'eliminate', short: 'pudge' }, 2, 1_010);
    assert.equal(result.direct[0]?.rejected, true);
    assert.equal(result.room.eliminated.length, 0);
    assert.equal(result.broadcast.length, 0);
  });

  it('spends free elims before starting the cooldown', () => {
    const first = handleClientMessage(
      emptyRoom(),
      freshMeta('guesser'),
      { type: 'eliminate', short: 'axe' },
      2,
      50,
    );
    assert.equal(first.meta.freeElims, 2);
    assert.equal(first.meta.lastElim, 0);
    assert.deepEqual(first.room.eliminated, ['axe']);
  });

  it('lets only the leader start and spin', () => {
    const guesser = handleClientMessage(emptyRoom(), freshMeta('guesser'), { type: 'start_game' }, 2, 1);
    assert.equal(guesser.room.gameStarted, false);

    const started = handleClientMessage(emptyRoom(), freshMeta('leader'), { type: 'start_game' }, 2, 1);
    assert.equal(started.room.gameStarted, true);
    assert.equal(started.broadcast[0]?.type, 'game_started');

    const spun = handleClientMessage(
      started.room,
      freshMeta('leader'),
      { type: 'spin_result', result: { hero: 'Pudge' } },
      2,
      2,
    );
    assert.deepEqual(spun.room.currentSpin, { hero: 'Pudge' });
  });

  it('tells a joiner the game already started', () => {
    const room = { ...emptyRoom(), gameStarted: true };
    const types = joinMessages(room, 2).map((m) => m.type);
    assert.ok(types.includes('game_started'));
    assert.ok(types.includes('elim_personal'));
  });
});
