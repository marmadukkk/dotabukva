/**
 * OpenDota helpers for "Whose Build?" mini-game.
 * https://docs.opendota.com/
 */

const API = 'https://api.opendota.com/api';
const UA = { headers: { Accept: 'application/json' } };

export const HERO_IMG = (name: string) =>
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${name}.png`;

export const ITEM_IMG = (name: string) =>
  `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items/${name}.png`;

export interface HeroInfo {
  id: number;
  /** short name without npc_dota_hero_ — for CDN */
  name: string;
  localized: string;
  img: string;
}

export interface ItemInfo {
  id: number;
  name: string;
  dname: string;
  img: string;
}

export interface PlayerBuild {
  heroId: number;
  hero: HeroInfo;
  /** Main inventory item_0..item_5 */
  inventory: ItemInfo[];
  backpack: ItemInfo[];
  neutral: ItemInfo | null;
}

export interface WhoseBuildRound {
  matchId: number;
  correct: PlayerBuild;
  options: HeroInfo[]; // 4 heroes, shuffled
}

type HeroesConst = Record<
  string,
  { id: number; name: string; localized_name?: string; img?: string }
>;
type ItemsConst = Record<
  string,
  { id: number; img?: string; dname?: string; qual?: string; cost?: number }
>;

let heroesCache: Map<number, HeroInfo> | null = null;
let itemsByIdCache: Map<number, ItemInfo> | null = null;
let constantsPromise: Promise<void> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, UA);
  if (!res.ok) throw new Error(`OpenDota ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

function heroShortName(apiName: string): string {
  return apiName.replace(/^npc_dota_hero_/, '');
}

export async function ensureConstants(): Promise<void> {
  if (heroesCache && itemsByIdCache) return;
  if (constantsPromise) return constantsPromise;

  constantsPromise = (async () => {
    const [heroesRaw, itemsRaw] = await Promise.all([
      fetchJson<HeroesConst>(`${API}/constants/heroes`),
      fetchJson<ItemsConst>(`${API}/constants/items`),
    ]);

    const hMap = new Map<number, HeroInfo>();
    for (const h of Object.values(heroesRaw)) {
      if (!h?.id || !h.name) continue;
      const name = heroShortName(h.name);
      hMap.set(h.id, {
        id: h.id,
        name,
        localized: h.localized_name || name,
        img: HERO_IMG(name),
      });
    }
    heroesCache = hMap;

    const iMap = new Map<number, ItemInfo>();
    for (const [key, it] of Object.entries(itemsRaw)) {
      if (!it?.id) continue;
      // skip recipe-only empty
      iMap.set(it.id, {
        id: it.id,
        name: key,
        dname: it.dname || key,
        img: ITEM_IMG(key),
      });
    }
    itemsByIdCache = iMap;
  })();

  try {
    await constantsPromise;
  } catch (e) {
    constantsPromise = null;
    throw e;
  }
}

export function getHero(id: number): HeroInfo | null {
  return heroesCache?.get(id) ?? null;
}

export function getItem(id: number | null | undefined): ItemInfo | null {
  if (!id || id <= 0) return null;
  return itemsByIdCache?.get(id) ?? null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function countItems(p: Record<string, unknown>): number {
  let n = 0;
  for (let i = 0; i < 6; i++) {
    const v = p[`item_${i}`] as number;
    if (v && v > 0) n++;
  }
  return n;
}

function playerToBuild(p: Record<string, unknown>): PlayerBuild | null {
  const heroId = p.hero_id as number;
  const hero = getHero(heroId);
  if (!hero) return null;

  const inventory: ItemInfo[] = [];
  for (let i = 0; i < 6; i++) {
    const it = getItem(p[`item_${i}`] as number);
    if (it) inventory.push(it);
  }
  const backpack: ItemInfo[] = [];
  for (let i = 0; i < 3; i++) {
    const it = getItem(p[`backpack_${i}`] as number);
    if (it) backpack.push(it);
  }
  const neutral = getItem(p.item_neutral as number);

  if (inventory.length + backpack.length + (neutral ? 1 : 0) < 2) return null;

  return { heroId, hero, inventory, backpack, neutral };
}

interface PublicMatch {
  match_id: number;
  duration?: number;
  avg_rank_tier?: number;
}

/**
 * Load a random public match + build a "Whose Build?" round.
 * Retries several match IDs until a usable parse is found.
 */
async function tryBuildFromMatchId(mid: number): Promise<WhoseBuildRound | null> {
  const match = await fetchJson<{
    match_id: number;
    players?: Record<string, unknown>[];
    duration?: number;
  }>(`${API}/matches/${mid}`);

  const players = match.players || [];
  if (players.length < 10) return null;

  const withBuilds = players
    .filter((p) => countItems(p) >= 2)
    .map((p) => playerToBuild(p))
    .filter((b): b is PlayerBuild => !!b);

  if (withBuilds.length < 1) return null;

  const correct = withBuilds[Math.floor(Math.random() * withBuilds.length)];
  const allHeroIds = players
    .map((p) => p.hero_id as number)
    .filter((id) => id && id !== correct.heroId);
  const uniqueOthers = [...new Set(allHeroIds)]
    .map((id) => getHero(id))
    .filter((h): h is HeroInfo => !!h);

  if (uniqueOthers.length < 3) return null;

  const wrongs = shuffle(uniqueOthers).slice(0, 3);
  const options = shuffle([correct.hero, ...wrongs]);

  return {
    matchId: match.match_id || mid,
    correct,
    options,
  };
}

export async function loadWhoseBuildRound(maxTries = 14): Promise<WhoseBuildRound> {
  await ensureConstants();

  const idSet = new Set<number>();

  try {
    const publics = await fetchJson<PublicMatch[]>(`${API}/publicMatches`);
    for (const m of publics) {
      if (m.match_id) idSet.add(m.match_id);
    }
  } catch {}

  // proMatches usually have full parse + items
  try {
    const pros = await fetchJson<PublicMatch[]>(`${API}/proMatches`);
    for (const m of pros) {
      if (m.match_id) idSet.add(m.match_id);
    }
  } catch {}

  // Recent finished parsed sample via explorer-less fallback: subtract offsets from latest id
  if (idSet.size > 0) {
    const maxId = Math.max(...idSet);
    for (let k = 0; k < 15; k++) {
      idSet.add(maxId - Math.floor(Math.random() * 50000) - k * 100);
    }
  }

  const pool = shuffle([...idSet]);
  let lastErr: unknown = null;

  for (let i = 0; i < Math.min(maxTries, pool.length); i++) {
    try {
      const round = await tryBuildFromMatchId(pool[i]);
      if (round) return round;
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr || new Error('Could not find a suitable match. Try again.');
}
