import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dealLeader,
  emptyRoom,
  freshMeta,
  handleClientMessage,
  isCorrectPick,
  joinMessages,
  rotateWinnerToLeader,
  sanitizeNick,
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
    assert.equal(started.started, true);
    assert.equal(started.broadcast.length, 0);

    const spun = handleClientMessage(
      started.room,
      freshMeta('leader'),
      { type: 'spin_result', result: { hero: 'Pudge', short: 'pudge' } },
      2,
      2,
    );
    assert.equal((spun.room.currentSpin as { short: string }).short, 'pudge');
    assert.equal(spun.direct[0]?.type, 'spin_result');
    assert.equal(JSON.stringify(spun.broadcast).includes('pudge'), false);
  });

  it('ends the round when the guesser picks the spun hero', () => {
    const room = { ...emptyRoom(), gameStarted: true, currentSpin: { hero: 'Axe', short: 'axe' } };
    const hit = handleClientMessage(room, freshMeta('guesser', 'Mira', 'a'), { type: 'pick', short: 'axe' }, 2, 10);
    assert.equal(hit.win, true);
    assert.equal(hit.room.eliminated.length, 0);

    const miss = handleClientMessage(room, freshMeta('guesser', 'Mira', 'a'), { type: 'pick', short: 'lion' }, 2, 10);
    assert.equal(miss.win, undefined);
    assert.deepEqual(miss.room.eliminated, ['lion']);
    assert.equal(isCorrectPick(room.currentSpin, 'axe'), true);
  });

  it('deals one leader and hands the next round to the winner', () => {
    assert.equal(sanitizeNick('   '), 'Player');
    const seats = [
      { id: 'a', role: 'leader' as const },
      { id: 'b', role: 'leader' as const },
      { id: 'c', role: 'guesser' as const },
    ];
    const dealt = dealLeader(seats, () => 0.9);
    assert.equal(dealt.filter((seat) => seat.role === 'leader').length, 1);
    assert.equal(dealt[2].role, 'leader');

    const next = rotateWinnerToLeader(dealt, 'a');
    assert.equal(next.find((seat) => seat.id === 'a')?.role, 'leader');
    assert.equal(next.filter((seat) => seat.role === 'leader').length, 1);
  });

  it('tells a joiner the game already started', () => {
    const room = { ...emptyRoom(), gameStarted: true };
    const types = joinMessages(room, 2).map((m) => m.type);
    assert.ok(types.includes('game_started'));
    assert.ok(types.includes('elim_personal'));
  });
});
