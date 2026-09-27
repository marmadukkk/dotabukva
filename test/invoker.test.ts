import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_KEYBINDS,
  INVOKER_SPELLS,
  addLeaderboardTime,
  formatTime,
  keyCodeLabel,
  readKeybinds,
  resolveSpell,
  shuffleSpellNames,
  spellByName,
  wouldPlaceOnLeaderboard,
  writeKeybinds,
} from '../src/minigames/invoker/spells.ts';
import type { Orb } from '../src/minigames/invoker/spells.ts';
import { installMemoryStorage } from './storage.ts';

describe('invoker spells', () => {
  it('resolves every spell regardless of orb order', () => {
    assert.equal(INVOKER_SPELLS.length, 10);
    for (const spell of INVOKER_SPELLS) {
      assert.equal(spell.combo.length, 3);
      const reversed = [...spell.combo].reverse() as Orb[];
      assert.equal(resolveSpell(reversed), spell.name);
      assert.equal(spellByName(spell.name)?.title, spell.title);
    }
    assert.equal(resolveSpell(['q', 'w']), null);
    assert.equal(resolveSpell(['q', 'q', 'q', 'q'] as Orb[]), null);
  });

  it('shuffles the full spell list', () => {
    const names = shuffleSpellNames();
    assert.equal(names.length, INVOKER_SPELLS.length);
    assert.deepEqual([...names].sort(), INVOKER_SPELLS.map((s) => s.name).sort());
  });

  it('formats time and key labels', () => {
    assert.equal(formatTime(12.3), '12.30');
    assert.equal(keyCodeLabel(81), 'Q');
    assert.equal(keyCodeLabel(32), 'SPACE');
    assert.equal(keyCodeLabel(112), 'F1');
    assert.equal(keyCodeLabel(97), 'N1');
  });
});

describe('invoker records', () => {
  it('keeps the faster time for a nick and stores binds', () => {
    installMemoryStorage();
    let board = addLeaderboardTime(40, 'Invoker');
    board = addLeaderboardTime(50, 'invoker');
    assert.equal(board.length, 1);
    assert.equal(board[0].time, 40);

    board = addLeaderboardTime(12.345, 'Invoker');
    assert.equal(board[0].time, 12.35);
    assert.equal(wouldPlaceOnLeaderboard(12.35, 'Invoker'), false);
    assert.equal(wouldPlaceOnLeaderboard(10, 'Invoker'), true);

    assert.equal(readKeybinds().q, DEFAULT_KEYBINDS.q);
    writeKeybinds({ q: 65, w: 83, e: 68, invoke: 70 });
    assert.equal(readKeybinds().invoke, 70);
  });
});
