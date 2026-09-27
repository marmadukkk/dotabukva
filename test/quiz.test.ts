import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classicHeaders, compareClassic } from '../src/minigames/quiz/classic.ts';
import { heroDisplayName } from '../src/minigames/quiz/data.ts';
import {
  addQuizScore,
  readQuizLeaderboard,
  sanitizeNick,
  scoreLabel,
  wouldPlaceQuiz,
} from '../src/minigames/quiz/leaderboard.ts';
import { pickRandomTrivia, TRIVIA_BANK } from '../src/minigames/quiz/trivia.ts';
import type { QuizHero } from '../src/minigames/quiz/types.ts';
import { installMemoryStorage } from './storage.ts';

function hero(partial: Partial<QuizHero> & Pick<QuizHero, 'id' | 'nameEn'>): QuizHero {
  return {
    short: partial.nameEn.toLowerCase(),
    nameRu: partial.nameEn,
    attr: 'str',
    attackType: 'Melee',
    roles: ['Carry'],
    legs: 2,
    year: 2011,
    img: '',
    icon: '',
    ...partial,
  };
}

describe('classic quiz', () => {
  it('marks an exact guess and points year and legs', () => {
    const answer = hero({
      id: 1,
      nameEn: 'Pudge',
      attr: 'str',
      attackType: 'Melee',
      roles: ['Durable', 'Disabler'],
      legs: 2,
      year: 2011,
    });
    const same = compareClassic(answer, answer);
    assert.ok(same.cells.every((cell) => cell.status === 'correct'));

    const other = compareClassic(
      hero({
        id: 2,
        nameEn: 'Sniper',
        attr: 'agi',
        attackType: 'Ranged',
        roles: ['Carry'],
        legs: 0,
        year: 2013,
      }),
      answer,
    );
    const byKey = Object.fromEntries(other.cells.map((cell) => [cell.key, cell.status]));
    assert.equal(byKey.attr, 'wrong');
    assert.equal(byKey.attack, 'wrong');
    assert.equal(byKey.roles, 'wrong');
    assert.equal(byKey.legs, 'higher');
    assert.equal(byKey.year, 'lower');
  });

  it('treats a shared role as partial', () => {
    const answer = hero({ id: 1, nameEn: 'Axe', roles: ['Initiator', 'Durable'] });
    const guess = hero({ id: 2, nameEn: 'Centaur', roles: ['Durable', 'Escape'] });
    const row = compareClassic(guess, answer);
    assert.equal(row.cells.find((cell) => cell.key === 'roles')?.status, 'partial');
  });

  it('labels the columns in both languages', () => {
    assert.equal(classicHeaders('ru')[0], 'Герой');
    assert.equal(classicHeaders('en')[0], 'Hero');
    assert.equal(classicHeaders('ru').length, classicHeaders('en').length);
  });
});

describe('hero names', () => {
  it('shows Russian or English from the quiz hero', () => {
    const h = hero({ id: 1, nameEn: 'Axe', nameRu: 'Акс' });
    assert.equal(heroDisplayName(h, 'ru'), 'Акс');
    assert.equal(heroDisplayName(h, 'en'), 'Axe');
  });
});

describe('quiz leaderboard', () => {
  it('keeps one row per nick and only a better streak', () => {
    installMemoryStorage();
    assert.equal(sanitizeNick('   '), 'Player');
    assert.equal(sanitizeNick('  a   b  '), 'a b');

    let board = addQuizScore('classic', 2, 'Mira');
    board = addQuizScore('classic', 1, 'Mira');
    assert.equal(board.length, 1);
    assert.equal(board[0].score, 2);

    board = addQuizScore('classic', 4, 'mira');
    assert.equal(board.length, 1);
    assert.equal(board[0].score, 4);

    for (let i = 0; i < 12; i++) addQuizScore('classic', i + 1, `p${i}`);
    const stored = readQuizLeaderboard('classic');
    assert.equal(stored.length, 10);
    assert.equal(stored[0].score >= stored[stored.length - 1].score, true);
    assert.equal(wouldPlaceQuiz('classic', 0), false);
    assert.equal(wouldPlaceQuiz('classic', stored[stored.length - 1].score), false);
    assert.equal(wouldPlaceQuiz('classic', stored[0].score + 1), true);
    assert.equal(scoreLabel('classic', 'ru'), 'Стрик');
  });
});

describe('trivia bank', () => {
  it('has unique ids and four answers in both languages', () => {
    const ids = new Set<string>();
    for (const q of TRIVIA_BANK) {
      assert.equal(ids.has(q.id), false, q.id);
      ids.add(q.id);
      assert.equal(q.answersRu.length, 4);
      assert.equal(q.answersEn.length, 4);
      assert.ok(q.ru && q.en);
    }
    assert.ok(TRIVIA_BANK.length > 100);
  });

  it('shuffles options but keeps the original first answer as correct', () => {
    for (let i = 0; i < 20; i++) {
      const round = pickRandomTrivia('en');
      const source = TRIVIA_BANK.find((q) => q.id === round.id)!;
      assert.equal(round.options[round.correctIndex], source.answersEn[0]);
      assert.equal(round.options.length, 4);
      assert.equal(new Set(round.options).size, 4);
    }
  });
});
