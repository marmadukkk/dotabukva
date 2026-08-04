import type { QuizMode } from './types';

export interface QuizLeaderboardEntry {
  /** Higher is better: consecutive win streak */
  score: number;
  at: number;
  name: string;
}

const MAX = 10;
const NICK_KEY = 'dota_bukva_quiz_nickname';

function storageKey(mode: QuizMode): string {
  // v2: streak-based (higher better). Old keys used lower-is-better scores.
  return `dota_bukva_quiz_streak_lb_${mode}`;
}

function nickKey(name: string): string {
  return name.trim().toLowerCase();
}

export function readQuizNickname(): string {
  try {
    return (localStorage.getItem(NICK_KEY) || '').trim();
  } catch {
    return '';
  }
}

export function writeQuizNickname(name: string): void {
  try {
    localStorage.setItem(NICK_KEY, name.trim().slice(0, 16));
  } catch {}
}

export function sanitizeNick(raw: string): string {
  const n = raw.trim().replace(/\s+/g, ' ').slice(0, 16);
  return n || 'Player';
}

/** Normalize list: one row per nick (best streak), sorted high → low. */
function normalize(list: QuizLeaderboardEntry[]): QuizLeaderboardEntry[] {
  const best = new Map<string, QuizLeaderboardEntry>();
  for (const e of list) {
    if (!e || typeof e.score !== 'number' || e.score < 1) continue;
    const name = (e.name && String(e.name).trim()) || 'Player';
    const key = nickKey(name);
    const entry: QuizLeaderboardEntry = {
      score: Math.floor(e.score),
      at: typeof e.at === 'number' ? e.at : Date.now(),
      name,
    };
    const prev = best.get(key);
    if (!prev || entry.score > prev.score || (entry.score === prev.score && entry.at < prev.at)) {
      best.set(key, entry);
    }
  }
  return [...best.values()]
    .sort((a, b) => b.score - a.score || a.at - b.at)
    .slice(0, MAX);
}

export function readQuizLeaderboard(mode: QuizMode): QuizLeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuizLeaderboardEntry[];
    if (!Array.isArray(parsed)) return [];
    return normalize(parsed);
  } catch {
    return [];
  }
}

/**
 * Upsert streak for a nick. Higher streak ranks higher.
 * Same nick never appears twice; only personal best is kept.
 */
export function addQuizScore(
  mode: QuizMode,
  score: number,
  name?: string
): QuizLeaderboardEntry[] {
  const s = Math.max(0, Math.floor(score));
  if (s < 1) return readQuizLeaderboard(mode);

  const nick = sanitizeNick(name ?? readQuizNickname());
  writeQuizNickname(nick);

  const list = readQuizLeaderboard(mode);
  const key = nickKey(nick);
  const prev = list.find((e) => nickKey(e.name) === key);
  // Not better than existing personal best → no change (avoids duplicate rows)
  if (prev && s <= prev.score) {
    return list;
  }

  const others = list.filter((e) => nickKey(e.name) !== key);
  others.push({ score: s, at: Date.now(), name: nick });
  const next = normalize(others);
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(next));
  } catch {}
  return next;
}

/** Whether this streak would place on the top-10 board (higher = better). */
export function wouldPlaceQuiz(mode: QuizMode, score: number): boolean {
  const s = Math.floor(score);
  if (s < 1) return false;
  const list = readQuizLeaderboard(mode);
  if (list.length < MAX) return true;
  return s > list[list.length - 1].score;
}

/** Column label for leaderboard */
export function scoreLabel(_mode: QuizMode, lang: 'ru' | 'en'): string {
  return lang === 'ru' ? 'Стрик' : 'Streak';
}
