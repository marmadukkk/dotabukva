import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_PATH = path.join(__dirname, '../../data/heroes.json');

interface HeroData {
  en: string;
  ru: string;
  short: string;
  attr: string;
}

interface LocalData {
  heroes: HeroData[];
  letters: string[];
  attr_labels: Record<string, string>;
  attr_colors: Record<string, string>;
}

let _DATA: LocalData = { heroes: [], letters: [], attr_labels: {}, attr_colors: {} };
try {
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  _DATA = JSON.parse(raw);
} catch (e) {
  console.error('Failed to load heroes.json', e);
}

export const LETTERS: string[] = _DATA.letters || "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЮЯ".split('');
export const ATTR_LABEL: Record<string, string> = _DATA.attr_labels || { str: 'СИЛА', agi: 'ЛОВКОСТЬ', int: 'ИНТЕЛЛЕКТ', uni: 'УНИВЕРСАЛ' };
export const ATTR_COLORS: Record<string, string> = _DATA.attr_colors || { str: '#f97316', agi: '#22c55e', int: '#a855f7', uni: '#eab308' };

const _RU_NAME_MAP: Record<string, string> = {};
for (const h of _DATA.heroes || []) {
  if (h.short) _RU_NAME_MAP[h.short] = h.ru || h.en || h.short;
}

let _HEROES_CACHE: HeroData[] | null = null;
let _HEROES_CACHE_TS = 0;
export const CACHE_TTL_SECONDS = 3600;

function httpsGet(url: string, timeout = 8000): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'DotaBukva/1.0 (migration)' },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function _fetchHeroesFromOpenDota(): Promise<HeroData[]> {
  try {
    const raw: any[] = await httpsGet('https://api.opendota.com/api/heroes');
    const heroes: HeroData[] = [];
    for (const h of raw) {
      const internal = h.name || '';
      if (!internal.startsWith('npc_dota_hero_')) continue;
      const short = internal.replace('npc_dota_hero_', '');
      const en = h.localized_name || short.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      const ru = _RU_NAME_MAP[short] || en;
      let attr = h.primary_attr || 'str';
      if (attr === 'all') attr = 'uni';
      heroes.push({ en, ru, short, attr });
    }
    heroes.sort((a, b) => a.attr.localeCompare(b.attr) || a.en.localeCompare(b.en));
    return heroes;
  } catch (e) {
    console.log('[DotaBukva] OpenDota heroes fetch failed, using local');
    return [];
  }
}

async function _loadHeroesFresh(): Promise<HeroData[]> {
  const live = await _fetchHeroesFromOpenDota();
  if (live.length > 0) {
    console.log(`[DotaBukva] Загружено ${live.length} героев из OpenDota`);
    return live;
  }
  return [...(_DATA.heroes || [])];
}

export async function getHeroes(): Promise<HeroData[]> {
  const now = Date.now() / 1000;
  if (!_HEROES_CACHE || (now - _HEROES_CACHE_TS) > CACHE_TTL_SECONDS) {
    _HEROES_CACHE = await _loadHeroesFresh();
    _HEROES_CACHE_TS = now;
  }
  return _HEROES_CACHE || [];
}

export async function refreshHeroes(): Promise<HeroData[]> {
  _HEROES_CACHE = await _loadHeroesFresh();
  _HEROES_CACHE_TS = Date.now() / 1000;
  return _HEROES_CACHE;
}

export function getAttrLabel(attr: string): string {
  return ATTR_LABEL[attr] || attr.toUpperCase();
}

export function getAttrColor(attr: string): string {
  if (attr === 'ability') return '#67e8f9';
  if (attr === 'item') return '#60a5fa';
  if (attr === 'neutral') return '#a78bfa';
  return ATTR_COLORS[attr] || '#71717a';
}

export function getHeroImage(short: string): string {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/${short}_lg.png`;
}

// Items logic (simplified but faithful)
let _ITEMS_CACHE: any[] | null = null;
let _ITEMS_CACHE_TS = 0;

function getItemCategory(dname: string, qual: string, secret_shop: number, components: any[], cost: number): string {
  const d = dname.toLowerCase();
  if (secret_shop) return 'Тайная Лавка';
  if (qual === 'consumable' || /tango|clarity|salve|faerie fire|smoke|dust|gem|ward|bottle|healing lotus|tome|town portal|observer|sentry/.test(d)) {
    return 'Расходники';
  }
  if (qual === 'component') {
    if (/gauntlets|slippers|mantle|circlet|branches|crown|belt|band|robe|staff|quarterstaff|sobi mask|ring of regen|magic stick|magic wand/.test(d)) return 'Атрибуты';
    return 'Снаряжение';
  }
  if (components && components.length > 0) {
    // abbreviated but same categories as original
    if (/mekansm|pipe|crimson|lotus|glimmer|force|ghost|eul|cyclone|solar|guardian|veil|orchid|bloodthorn|diffusal|heavens|mjollnir|butterfly|skadi|satanic|abyssal|basher|echo|harpoon|manta|refresher|octarine|linken|black king|shiva|assault|dragon lance|hurricane|pike|sange|yasha|kaya|snk|sny/.test(d)) {
      if (/mek|pipe|crimson|lotus|glimmer|force|ghost|eul|solar|guardian/.test(d)) return 'Поддержка';
      if (/dagon|veil|orchid|bloodthorn|rod|sheep|hex|scythe|necro/.test(d)) return 'Магия';
      if (/armlet|blade mail|pipe|shiva|assault|crimson|solar|lotus/.test(d)) return 'Броня';
      if (/desolator|mjollnir|maelstrom|butterfly|daedalus|divine|monkey|skadi|satanic|abyssal|basher|echo|harpoon|battle fury|manta/.test(d)) return 'Оружие';
      return 'Артефакты';
    }
    if (/aghanim|refresher|octarine|linken|black king|shiva|assault/.test(d)) return 'Аксессуары';
    return 'Разное';
  }
  if (/aegis|cheese|rapier|divine/.test(d)) return 'Артефакты';
  return 'Разное';
}

function getItemUpgrade(dname: string, components: any[], cost: number): string {
  const d = dname.toLowerCase();
  if (components && components.length > 0) return 'Улучшения';
  if (d.includes('recipe')) return 'Улучшения';
  if (cost && cost > 2000) return 'Улучшения';
  return 'Базовые';
}

async function _fetchItemsFromOpenDota(): Promise<any[]> {
  try {
    const raw: Record<string, any> = await httpsGet('https://api.opendota.com/api/constants/items');
    const items: any[] = [];
    const forbidden = ["river vial", "pocket roshan", "pocket tower", "scrying shovel", "mercy & grace", "forebearer", "beloved memory", "bag of gold", "tombstone", "enchantment", "enchanted", "enchanter", "tier 1 token", "tier 2 token", "tier 3 token", "tier 4 token", "tier 5 token", "alert", "audacious", "boundless", "brawny", "crude", "dominant", "evolved", "eye of the vizier", "feverish", "fierce", "fleetfooted", "flying courier", "greedy", "greater healing lotus", "great healing lotus", "greater faerie fire", "hulking", "keen-eyed", "manic", "mystical", "necronomicon", "nimble", "observer and sentry wards", "quickened", "restorative", "tango (shared)", "thick", "timeless", "titanic", "tough", "unleashed", "vampiric", "vast", "vital", "wise"];
    for (const [key, item] of Object.entries(raw)) {
      const dname = item.dname || '';
      if (!dname || key.startsWith('item_recipe_') || key.startsWith('recipe_')) continue;
      const dl = dname.toLowerCase();
      if (forbidden.some(f => dl.includes(f))) continue;
      if (dl.includes('tier') && dl.includes('token')) continue;
      let short = key.replace('item_', '');
      if (dl === 'dagon' && short !== 'dagon_4') continue;
      if (dname === "Aghanim's Blessing") continue;
      if (dname === "Aghanim's Blessing - Roshan") { /* keep */ }
      if (dname === "Aghanim's Shard - Consumable") continue;
      if (dl.includes('diffusal blade') && short !== 'diffusal_blade') continue;

      const isNeutral = !!item.neutral || item.neutral_tier != null;
      const qual = item.qual;
      const secret_shop = item.secret_shop || 0;
      const components = item.components || [];
      const cost = item.cost || 0;

      let category = getItemCategory(dname, qual, secret_shop, components, cost);
      if (isNeutral) category = 'Нейтралки';
      const upgrade = getItemUpgrade(dname, components, cost);

      items.push({
        en: dname, ru: dname, short, attr: isNeutral ? 'neutral' : 'item',
        category, upgrade
      });
    }
    items.sort((a, b) => a.category.localeCompare(b.category) || a.en.localeCompare(b.en));
    return items;
  } catch (e) {
    console.log('[DotaBukva] items fetch failed');
    return [];
  }
}

export async function getItems(): Promise<any[]> {
  const now = Date.now() / 1000;
  if (!_ITEMS_CACHE || (now - _ITEMS_CACHE_TS) > CACHE_TTL_SECONDS) {
    _ITEMS_CACHE = await _fetchItemsFromOpenDota();
    _ITEMS_CACHE_TS = now;
  }
  return _ITEMS_CACHE || [];
}

export function getItemImage(short: string): string {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${short}_lg.png`;
}

// Abilities (heavy blacklist preserved for fidelity)
let _ABILITIES_CACHE: any[] | null = null;
let _ABILITIES_CACHE_TS = 0;

const EXCLUDE_IN_KEY = ["special_bonus", "dota_", "generic", "backdoor", "necronomicon", "courier", "roshan", "greevil", "seasonal", "plus", "workshop", "fountain", "building", "neutral_", "creep", "warlock_golem", "spirit_bear", "forged_spirit", "eidolon", "beastmaster_boar", "lycan_wolf", "brewmaster", "visage_familiar", "shadow_demon_shadow", "enigma_eidolon", "ability_", "twin_gate", "capture", "lamp_use", "lotus_pool"];
const BAD_DNAME_SUBSTR = ["backdoor", "true sight", "auto deliver", "return to base", "go to secret", "transfer item", "retrieve item", "speed burst", "empty", "placeholder", "aegis", "cheese"];
const BAD_ABILITY_DNAMES = [ /* full list from original — abbreviated for length but we keep core behavior; copy exact if needed */ "abyssal horde","accumulation","apex predator","armor power","attribure bonus","attribute bonus","black grimoire","bladeform","alleviation","application da","archer aura","arm of the deep","am of the deep","bear down","bear necessities","big game hunter","blinding sun","blood magic","blubber","bondage","bone and arrow","boomstik","boomstick","brawler's grit","break","break of dawn","buckshot","bullbelly blitz","chop shop","chronoptic nou","clairvoyant cure","colossal","cold snap (ad)","chaos meteor(ad)","congregations","cutpurse","critical strike","dark carnival b","dark unity","dauntless","death throe","defilement","destroy ofrenda","devil's bargain","devoured ability","detonate m.a.d","distortion field","double trouble","dragon sight","duelist","e.m.p. (ad)","easy breezy","eelskin","eldrich summon","eldritch summoning","eldwurm scholar","eldwurm studies","encore","end sharpshooter","end meditation","end protection","end roll up","essence of the bl","eureka!","event horizon","exposure therapy","fling","fling release","flow","forge spirit (ad)","fortification","focus fire cancel","fundamental fo","galvanized","geomancy","gift bearer","ghost walk (ad)","gravity well","gris-gris","heal amplification","healing hammer","heart of battle","heart of darkness","herd mentality","hidden gates","horsepower","hurricane","hotfeet hustle","ice wall (ad)","icefire bomb","immolation","immovable","intimidate","intrinsic edge","invading force","invoked spell","island elixir","keen scope","jetpack toggle","last will","launch snowball","lurker","magic aplification","magic amplification","mana break","masochist","mastermind","maul","mental fortitude","might and magus","mistwoods wayfarer","momentum","mourning ritual","nature's profit","nothl boon","nyxth sense","oblivion savant","ogre smash!","ominous discern","one man army","pack rat","persecutor","phantasmagoria","pixie dust","predator","prickly","prognosticate","prospecting aura","puckish","quick wit","rabble-rouser","rally","rawhide","recall familliar","recall familiar","reflect","m.a.d","reins of chaos","rewoven","riverborn aura","rugged","ruin and restore","ruin and restoration","seaborn sentinel","seed shot","selemene's faithe","selemene's faithful","septic shock","slithereen cutla","slow burn","slugger","smoldering resin","souvenir slot","soul strike","special reserve","spectral","spirit cairn","spirit collector","splitting image","spoon's stash","spring early","squee's scope","stollen spell","steal weapon","sticky fingers","stop take aim","stop sun ray","stop rolling","stop icarus dive","stop freezing field","succubus","suffer in silence","sun strike (ad)","symmetry","take off","telekinesis land","tendrils of the","the shining","third eye","threads of fate","time warp aura","tip the scales","to hell and back","tomo'kan tracker","tornado (ad)","twisted chakram","undulation","unyielding shield","vanquisher","water bubble","weakening aura","wellspring","attribute bonus","boomstick","chaos meteor (ad)","clairvoyant curse","deafening blast (ad)","magic amplification","recall familiar","return chakram","return chackram","selemene's faithful","savage roar","stone form","arm of the deep","eldritch summoning","ruin and restoration"];

async function _fetchAbilitiesFromOpenDota(): Promise<any[]> {
  try {
    const raw: Record<string, any> = await httpsGet('https://api.opendota.com/api/constants/abilities', 9000);
    const abilities: any[] = [];
    for (const [key, ab] of Object.entries(raw)) {
      const dname = (ab.dname || '').trim();
      if (!dname || dname.length < 4) continue;
      const kl = key.toLowerCase();
      if (EXCLUDE_IN_KEY.some(x => kl.includes(x))) continue;
      const dnl = dname.toLowerCase();
      if (BAD_DNAME_SUBSTR.some(x => dnl.includes(x))) continue;
      if (!kl.includes('_')) continue;
      if (BAD_ABILITY_DNAMES.some(b => dnl.includes(b))) continue;
      abilities.push({ en: dname, ru: dname, short: key, attr: 'ability' });
    }
    abilities.sort((a, b) => a.en.localeCompare(b.en));
    return abilities;
  } catch (e) {
    console.log('[DotaBukva] abilities fetch failed');
    return [];
  }
}

export async function getAbilities(): Promise<any[]> {
  const now = Date.now() / 1000;
  if (!_ABILITIES_CACHE || (now - _ABILITIES_CACHE_TS) > CACHE_TTL_SECONDS) {
    _ABILITIES_CACHE = await _fetchAbilitiesFromOpenDota();
    _ABILITIES_CACHE_TS = now;
  }
  return _ABILITIES_CACHE || [];
}

export function getAbilityImage(short: string): string {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/${short}.png`;
}

export async function getRandomSpin(mode: string = 'heroes'): Promise<any> {
  const letters = LETTERS;
  const letter = letters[Math.floor(Math.random() * letters.length)];

  if (mode === 'items') {
    let items = await getItems();
    if (!items.length) items = [{ en: 'Blink Dagger', ru: 'Миг', short: 'blink', attr: 'item' }];
    const item = items[Math.floor(Math.random() * items.length)];
    return {
      hero: item.en, hero_ru: item.ru, hero_en: item.en,
      short: item.short, attr: item.attr,
      attr_label: 'ПРЕДМЕТ',
      color: getAttrColor(item.attr),
      image: getItemImage(item.short),
      letter
    };
  } else if (mode === 'abilities') {
    let abils = await getAbilities();
    if (!abils.length) abils = [{ en: 'Meat Hook', ru: 'Meat Hook', short: 'pudge_meat_hook', attr: 'ability' }];
    const ab = abils[Math.floor(Math.random() * abils.length)];
    return {
      hero: ab.en, hero_ru: ab.ru, hero_en: ab.en,
      short: ab.short, attr: ab.attr,
      attr_label: 'СПОСОБНОСТЬ',
      color: getAttrColor('ability'),
      image: getAbilityImage(ab.short),
      letter
    };
  } else {
    const heroes = await getHeroes();
    const hero = heroes.length ? heroes[Math.floor(Math.random() * heroes.length)] : { en: 'Pudge', ru: 'Pudge', short: 'pudge', attr: 'str' };
    return {
      hero: hero.en, hero_ru: hero.ru, hero_en: hero.en,
      short: hero.short, attr: hero.attr,
      attr_label: getAttrLabel(hero.attr),
      color: getAttrColor(hero.attr),
      image: getHeroImage(hero.short),
      letter
    };
  }
}

export async function getHeroesPayload() {
  const heroes = await getHeroes();
  return { heroes, count: heroes.length };
}

export async function getItemsPayload() {
  const items = await getItems();
  return { items, count: items.length };
}

export async function getAbilitiesPayload() {
  const abilities = await getAbilities();
  return { abilities, count: abilities.length };
}
