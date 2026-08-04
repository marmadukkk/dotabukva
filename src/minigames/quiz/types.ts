export type QuizMode = 'classic' | 'ability' | 'items' | 'trivia';

export interface QuizHero {
  id: number;
  short: string;
  nameEn: string;
  nameRu: string;
  attr: 'str' | 'agi' | 'int' | 'all';
  attackType: 'Melee' | 'Ranged';
  roles: string[];
  legs: number;
  year: number;
  img: string;
  icon: string;
}

export interface AbilityClue {
  abilityKey: string;
  dname: string;
  img: string;
  heroId: number;
}

export interface QuizItem {
  id: number;
  key: string;
  dname: string;
  img: string;
}

export type CellStatus = 'correct' | 'partial' | 'wrong' | 'higher' | 'lower';

export interface ClassicGuessRow {
  hero: QuizHero;
  cells: { key: string; label: string; status: CellStatus }[];
}

export const MAX_GUESSES = 8;
