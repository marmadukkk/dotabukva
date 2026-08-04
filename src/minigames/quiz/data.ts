import type { AbilityClue, QuizHero, QuizItem } from './types';

const API = 'https://api.opendota.com/api';
const CDN = 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react';

const YEAR_BY_SHORT: Record<string, number> = {
  antimage: 2011, axe: 2011, bane: 2011, bloodseeker: 2011, crystal_maiden: 2011,
  drow_ranger: 2011, earthshaker: 2011, juggernaut: 2011, mirana: 2011, morphling: 2011,
  nevermore: 2011, phantom_lancer: 2011, puck: 2011, pudge: 2011, razor: 2011,
  sand_king: 2011, storm_spirit: 2011, sven: 2011, tiny: 2011, vengefulspirit: 2011,
  windrunner: 2011, zuus: 2011, kunkka: 2011, lina: 2011, lion: 2011, shadow_shaman: 2011,
  slardar: 2011, tidehunter: 2011, witch_doctor: 2011, lich: 2011, riki: 2011,
  enigma: 2011, tinker: 2011, sniper: 2011, necrolyte: 2011, warlock: 2011,
  beastmaster: 2011, queenofpain: 2011, venomancer: 2011, faceless_void: 2011,
  skeleton_king: 2011, death_prophet: 2011, phantom_assassin: 2011, pugna: 2011,
  templar_assassin: 2011, viper: 2011, luna: 2011, dragon_knight: 2011, dazzle: 2011,
  rattletrap: 2011, leshrac: 2011, furion: 2011, life_stealer: 2011, dark_seer: 2011,
  clinkz: 2011, omniknight: 2011, enchantress: 2011, huskar: 2011, night_stalker: 2011,
  broodmother: 2011, bounty_hunter: 2011, weaver: 2011, jakiro: 2011, batrider: 2011,
  chen: 2011, spectre: 2011, ancient_apparition: 2011, doom_bringer: 2011, ursa: 2011,
  spirit_breaker: 2011, gyrocopter: 2011, alchemist: 2011, invoker: 2011, silencer: 2011,
  obsidian_destroyer: 2011, lycan: 2011, brewmaster: 2011, shadow_demon: 2011,
  lone_druid: 2011, chaos_knight: 2011, meepo: 2011, treant: 2011, ogre_magi: 2011,
  undying: 2011, rubick: 2011, disruptor: 2011, nyx_assassin: 2011, naga_siren: 2011,
  keeper_of_the_light: 2011, wisp: 2011, visage: 2011, slark: 2011, medusa: 2011,
  troll_warlord: 2011, centaur: 2011, magnataur: 2011, shredder: 2011, bristleback: 2012,
  tusk: 2012, skywrath_mage: 2012, abaddon: 2012, elder_titan: 2012, legion_commander: 2012,
  techies: 2014, ember_spirit: 2013, earth_spirit: 2013, abyssal_underlord: 2016,
  terrorblade: 2014, phoenix: 2014, oracle: 2014, winter_wyvern: 2014, arc_warden: 2015,
  monkey_king: 2016, dark_willow: 2017, pangolier: 2017, grimstroke: 2018, mars: 2019,
  snapfire: 2019, void_spirit: 2019, hoodwink: 2020, dawnbreaker: 2021, marci: 2021,
  primal_beast: 2022, muerta: 2023, ringmaster: 2024, kez: 2024,
};

let heroesCache: QuizHero[] | null = null;
let abilitiesByHero: Map<number, AbilityClue[]> | null = null;
let itemsCache: QuizItem[] | null = null;
let loadPromise: Promise<void> | null = null;

function shortName(apiName: string): string {
  return apiName.replace(/^npc_dota_hero_/, '');
}

function mapAttr(a: string): QuizHero['attr'] {
  if (a === 'str' || a === 'agi' || a === 'int' || a === 'all') return a;
  return 'int';
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`OpenDota ${res.status}`);
  return res.json() as Promise<T>;
}

export async function ensureQuizData(): Promise<void> {
  if (heroesCache && abilitiesByHero && itemsCache) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const [heroesRaw, heroAbilities, abilitiesRaw, itemsRaw, localHeroes] = await Promise.all([
      fetchJson<Record<string, any>>(`${API}/constants/heroes`),
      fetchJson<Record<string, { abilities: string[] }>>(`${API}/constants/hero_abilities`),
      fetchJson<Record<string, { dname?: string; img?: string }>>(`${API}/constants/abilities`),
      fetchJson<Record<string, { id?: number; dname?: string; qual?: string; cost?: number; components?: unknown }>>(
        `${API}/constants/items`
      ),
      fetch('/data/heroes.json')
        .then((r) => r.json())
        .catch(() => ({ heroes: [] })),
    ]);

    const ruByShort = new Map<string, string>();
    for (const h of localHeroes.heroes || []) {
      if (h.short) ruByShort.set(h.short, h.ru || h.en);
    }

    const list: QuizHero[] = [];
    for (const h of Object.values(heroesRaw)) {
      if (!h?.id || !h.name) continue;
      const short = shortName(h.name);
      // skip invalid / event heroes without img
      if (!short || short.includes('base')) continue;
      list.push({
        id: h.id,
        short,
        nameEn: h.localized_name || short,
        nameRu: ruByShort.get(short) || h.localized_name || short,
        attr: mapAttr(h.primary_attr),
        attackType: h.attack_type === 'Ranged' ? 'Ranged' : 'Melee',
        roles: Array.isArray(h.roles) ? h.roles : [],
        legs: typeof h.legs === 'number' ? h.legs : 2,
        year: YEAR_BY_SHORT[short] || 2015,
        img: `${CDN}/heroes/${short}.png`,
        icon: `${CDN}/heroes/icons/${short}.png`,
      });
    }
    heroesCache = list.sort((a, b) => a.nameEn.localeCompare(b.nameEn));

    const abMap = new Map<number, AbilityClue[]>();
    for (const [heroKey, data] of Object.entries(heroAbilities)) {
      const short = shortName(heroKey);
      const hero = list.find((x) => x.short === short);
      if (!hero || !data?.abilities) continue;
      const clues: AbilityClue[] = [];
      for (const key of data.abilities) {
        if (!key || key === 'generic_hidden' || key.includes('special_bonus')) continue;
        const meta = abilitiesRaw[key];
        const dname = meta?.dname;
        if (!dname) continue;
        clues.push({
          abilityKey: key,
          dname,
          img: `${CDN}/abilities/${key}.png`,
          heroId: hero.id,
        });
      }
      if (clues.length) abMap.set(hero.id, clues);
    }
    abilitiesByHero = abMap;

    // Shop / upgrade items with names (skip recipes, empty, consumable fluff lightly)
    const items: QuizItem[] = [];
    for (const [key, it] of Object.entries(itemsRaw || {})) {
      if (!it?.id || !it.dname) continue;
      if (key.startsWith('recipe_') || key.includes('river') || key === 'empty') continue;
      if (it.dname.toLowerCase().includes('recipe')) continue;
      // Prefer real purchasable-ish items
      if (typeof it.cost === 'number' && it.cost <= 0 && !it.components) continue;
      items.push({
        id: it.id,
        key,
        dname: it.dname,
        img: `${CDN}/items/${key}.png`,
      });
    }
    itemsCache = items.length ? items : Object.entries(itemsRaw || {})
      .filter(([k, it]) => it?.id && it.dname && !k.startsWith('recipe_'))
      .map(([key, it]) => ({
        id: it!.id!,
        key,
        dname: it!.dname!,
        img: `${CDN}/items/${key}.png`,
      }));
  })();

  try {
    await loadPromise;
  } catch (e) {
    loadPromise = null;
    throw e;
  }
}

export function getQuizHeroes(): QuizHero[] {
  return heroesCache || [];
}

export function getHeroById(id: number): QuizHero | undefined {
  return heroesCache?.find((h) => h.id === id);
}

export function getHeroByShort(short: string): QuizHero | undefined {
  return heroesCache?.find((h) => h.short === short);
}

export function randomHero(): QuizHero {
  const list = getQuizHeroes();
  return list[Math.floor(Math.random() * list.length)];
}

export function randomAbilityClue(): AbilityClue | null {
  if (!abilitiesByHero || !abilitiesByHero.size) return null;
  const heroIds = [...abilitiesByHero.keys()];
  for (let i = 0; i < 20; i++) {
    const hid = heroIds[Math.floor(Math.random() * heroIds.length)];
    const arr = abilitiesByHero.get(hid)!;
    if (arr.length) return arr[Math.floor(Math.random() * arr.length)];
  }
  return null;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Correct hero + 3 random others (shuffled). */
export function heroChoiceOptions(correct: QuizHero, count = 4): QuizHero[] {
  const others = getQuizHeroes().filter((h) => h.id !== correct.id);
  return shuffle([correct, ...shuffle(others).slice(0, count - 1)]);
}

export function randomItem(): QuizItem | null {
  if (!itemsCache?.length) return null;
  return itemsCache[Math.floor(Math.random() * itemsCache.length)];
}

/** Correct item + 3 random others (shuffled). */
export function itemChoiceOptions(correct: QuizItem, count = 4): QuizItem[] {
  if (!itemsCache?.length) return [correct];
  const others = itemsCache.filter((i) => i.id !== correct.id && i.key !== correct.key);
  return shuffle([correct, ...shuffle(others).slice(0, count - 1)]);
}

export function filterHeroes(query: string, lang: 'ru' | 'en'): QuizHero[] {
  const q = query.trim().toLowerCase();
  if (!q) return getQuizHeroes().slice(0, 12);
  return getQuizHeroes()
    .filter((h) => {
      const en = h.nameEn.toLowerCase();
      const ru = h.nameRu.toLowerCase();
      const sh = h.short.toLowerCase().replace(/_/g, ' ');
      return en.includes(q) || ru.includes(q) || sh.includes(q);
    })
    .slice(0, 12);
}

export function heroDisplayName(h: QuizHero, lang: 'ru' | 'en'): string {
  return lang === 'ru' ? h.nameRu : h.nameEn;
}
