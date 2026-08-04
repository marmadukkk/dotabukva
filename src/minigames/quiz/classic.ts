import type { CellStatus, ClassicGuessRow, QuizHero } from './types';

function roleOverlap(a: string[], b: string[]): CellStatus {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const hits = a.filter((r) => setB.has(r.toLowerCase()));
  if (hits.length === 0) return 'wrong';
  if (hits.length === a.length && a.length === b.length) {
    // same multiset roughly
    const sa = [...a].map((x) => x.toLowerCase()).sort().join('|');
    const sb = [...b].map((x) => x.toLowerCase()).sort().join('|');
    if (sa === sb) return 'correct';
  }
  // all roles of answer covered by guess roles and same count
  if (hits.length === b.length && a.length === b.length) return 'correct';
  return 'partial';
}

function yearStatus(guess: number, answer: number): CellStatus {
  if (guess === answer) return 'correct';
  return guess < answer ? 'higher' : 'lower';
}

function legsStatus(guess: number, answer: number): CellStatus {
  if (guess === answer) return 'correct';
  return guess < answer ? 'higher' : 'lower';
}

export function compareClassic(guess: QuizHero, answer: QuizHero): ClassicGuessRow {
  const attrOk = guess.attr === answer.attr;
  const atkOk = guess.attackType === answer.attackType;
  const roles = roleOverlap(guess.roles, answer.roles);
  const legs = legsStatus(guess.legs, answer.legs);
  const year = yearStatus(guess.year, answer.year);

  const attrLabel =
    guess.attr === 'str' ? 'STR' : guess.attr === 'agi' ? 'AGI' : guess.attr === 'int' ? 'INT' : 'UNI';

  return {
    hero: guess,
    cells: [
      { key: 'attr', label: attrLabel, status: attrOk ? 'correct' : 'wrong' },
      {
        key: 'attack',
        label: guess.attackType === 'Melee' ? 'Melee' : 'Ranged',
        status: atkOk ? 'correct' : 'wrong',
      },
      {
        key: 'roles',
        label: guess.roles.slice(0, 2).join(', ') || '—',
        status: roles,
      },
      {
        key: 'legs',
        label: String(guess.legs),
        status: legs,
      },
      {
        key: 'year',
        label: String(guess.year),
        status: year,
      },
    ],
  };
}

export function classicHeaders(lang: 'ru' | 'en'): string[] {
  return lang === 'ru'
    ? ['Герой', 'Атр.', 'Атака', 'Роли', 'Ноги', 'Год']
    : ['Hero', 'Attr', 'Attack', 'Roles', 'Legs', 'Year'];
}
