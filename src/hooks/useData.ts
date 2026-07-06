import { useState, useCallback, useRef } from 'react';
import { getEntryImage } from '../utils';

interface UseDataReturn {
  heroesData: any[];
  currentMode: 'heroes' | 'items' | 'abilities';
  isLoadingData: boolean;
  isTableImagesLoading: boolean;
  pendingTableImagesRef: React.MutableRefObject<Set<string>>;
  setIsTableImagesLoading: (loading: boolean) => void;
  setIsLoadingData: (loading: boolean) => void;
  loadData: (mode: 'heroes' | 'items' | 'abilities') => Promise<any[]>;
  setHeroesData: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentMode: (mode: 'heroes' | 'items' | 'abilities') => void;
}

export function useData(initialMode: 'heroes' | 'items' | 'abilities' = 'heroes'): UseDataReturn {
  const [heroesData, setHeroesData] = useState<any[]>([]);
  const [currentModeInternal, setCurrentModeInternal] = useState<'heroes' | 'items' | 'abilities'>(initialMode);
  const [isLoadingData, setIsLoadingData] = useState(false);
  // expose setIsLoadingData for external use if needed
  const [isTableImagesLoading, setIsTableImagesLoading] = useState(false);
  const pendingTableImagesRef = useRef(new Set<string>());
  const loadingTimeoutRef = useRef<number | null>(null);

  const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

  function getFallbackHeroes() {
    return [
      {"en":"Pudge","ru":"Pudge","short":"pudge","attr":"str"},
      {"en":"Invoker","ru":"Invoker","short":"invoker","attr":"int"},
      {"en":"Anti-Mage","ru":"Anti-Mage","short":"antimage","attr":"agi"},
      {"en":"Crystal Maiden","ru":"Crystal Maiden","short":"crystal_maiden","attr":"int"},
      {"en":"Juggernaut","ru":"Juggernaut","short":"juggernaut","attr":"agi"}
    ];
  }

  function getFallbackAbilities() {
    return [
      {"en":"Meat Hook","ru":"Meat Hook","short":"pudge_meat_hook","attr":"ability"},
      {"en":"Rot","ru":"Rot","short":"pudge_rot","attr":"ability"},
      {"en":"Dismember","ru":"Dismember","short":"pudge_dismember","attr":"ability"},
      {"en":"Sun Strike","ru":"Sun Strike","short":"invoker_sun_strike","attr":"ability"},
      {"en":"Blink","ru":"Blink","short":"antimage_blink","attr":"ability"}
    ];
  }

  // Filter abilities to only those whose icon actually loads
  async function filterValidAbilityIcons(abilities: any[]): Promise<any[]> {
    if (!abilities || abilities.length === 0) return abilities;

    const CACHE_KEY = 'dota_valid_ability_shorts_v1';
    const allShorts = abilities.map(a => a.short);

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const validShorts: string[] = JSON.parse(cached);
        const cachedSet = new Set(validShorts);
        const fromCache = abilities.filter(a => cachedSet.has(a.short));
        if (fromCache.length > 0 && fromCache.length >= Math.floor(allShorts.length * 0.7)) {
          return fromCache;
        }
      }
    } catch {}

    const valid: any[] = [];
    const CONCURRENCY = 10;

    const checkIcon = (item: any): Promise<boolean> =>
      new Promise((resolve) => {
        const url = getEntryImage(item.short, 'abilities');
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
      });

    for (let i = 0; i < abilities.length; i += CONCURRENCY) {
      const batch = abilities.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(checkIcon));
      batch.forEach((item, idx) => {
        if (results[idx]) valid.push(item);
      });
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(valid.map(v => v.short)));
    } catch {}

    return valid;
  }

  const loadData = useCallback(async (mode: 'heroes' | 'items' | 'abilities') => {
    setIsLoadingData(true);

    if (API_BASE) {
      let endpoint = `${API_BASE}/api/heroes`;
      let key = 'heroes';
      if (mode === 'items') { endpoint = `${API_BASE}/api/items`; key = 'items'; }
      else if (mode === 'abilities') { endpoint = `${API_BASE}/api/abilities`; key = 'abilities'; }

      try {
        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          const list = data[key] || data.heroes || data.items || data.abilities || [];
          setHeroesData(list);
          setCurrentModeInternal(mode);
          setIsLoadingData(false);
          return list;
        }
      } catch (e) {
        console.warn('Backend fetch failed, using client-side data');
      }
    }

    if (mode === 'heroes') {
      try {
        let ruMap: Record<string, string> = {};
        let attrMap: Record<string, string> = {};
        try {
          const ruRes = await fetch('/data/heroes.json');
          const ruD = await ruRes.json();
          (ruD.heroes || []).forEach((h: any) => {
            if (h.short) {
              ruMap[h.short] = h.ru || h.en;
              if (h.attr) attrMap[h.short] = h.attr;
            }
            if (h.en) {
              ruMap[h.en.toLowerCase()] = h.ru || h.en;
              if (h.attr) attrMap[h.en.toLowerCase()] = h.attr;
            }
          });
        } catch {}

        const res = await fetch('https://api.opendota.com/api/constants/heroes');
        const rawH = await res.json();
        let list: any[] = Object.values(rawH || {}).map((h: any) => {
          const name: string = h.name || '';
          const short = name.replace(/^npc_dota_hero_/, '');
          const en = h.localized_name || short;
          let attr = h.primary_attr || 'str';
          if (attr === 'all') attr = 'uni';
          if (attrMap[short]) attr = attrMap[short];
          const ru = ruMap[short] || ruMap[en.toLowerCase()] || en;
          return { en, ru, short, attr };
        });
        list.sort((a: any, b: any) => a.en.localeCompare(b.en));
        setHeroesData(list);
        setCurrentModeInternal(mode);
        setIsLoadingData(false);
        return list;
      } catch {
        try {
          const res = await fetch('/data/heroes.json');
          const d = await res.json();
          const list = d.heroes || [];
          setHeroesData(list);
          setCurrentModeInternal(mode);
          setIsLoadingData(false);
          return list;
        } catch {
          const fb = getFallbackHeroes();
          setHeroesData(fb);
          setCurrentModeInternal(mode);
          setIsLoadingData(false);
          return fb;
        }
      }
    } else if (mode === 'items') {
      try {
        const res = await fetch('https://api.opendota.com/api/constants/items');
        const raw = await res.json();
        const list = Object.keys(raw)
          .filter(k => {
            const it = raw[k];
            if (!it || !it.dname) return false;
            if (k.startsWith('item_recipe_') || k.startsWith('recipe_')) return false;

            const key = k.replace(/^item_/, '');
            const dnameLower = (it.dname || '').toLowerCase();

            const exactExclude = [
              'ofrenda', 'furion_gold_bag', 'madstone_bundle',
              'ofrenda_pledge', 'ofrenda_shovel', 'mutation_tombstone'
            ];
            if (exactExclude.includes(key)) return false;

            if (dnameLower.includes('river vial') || key.includes('river_painter')) return false;

            if (/^tier\d*_token$/.test(key) || (dnameLower.includes('tier') && dnameLower.includes('token'))) return false;

            return true;
          })
          .map(k => ({
            en: raw[k].dname,
            ru: raw[k].dname,
            short: k.replace(/^item_/, ''),
            attr: 'item'
          }));
        setHeroesData(list);
        setCurrentModeInternal(mode);
        setIsLoadingData(false);
        return list;
      } catch {
        setHeroesData([]);
        setCurrentModeInternal(mode);
        setIsLoadingData(false);
        return [];
      }
    } else if (mode === 'abilities') {
      try {
        const res = await fetch('https://api.opendota.com/api/constants/abilities');
        const raw = await res.json();
        const list = Object.keys(raw)
          .filter(k => {
            const a = raw[k];
            if (!a || !a.dname || !k.includes('_') || k.includes('special_bonus')) return false;
            const bad = ['creep_', 'neutral_', 'roshan', 'courier', 'filler_', 'dummy_', 'seasonal_', 'necronomicon_', 'forged_spirit', 'spirit_bear', 'eidolon', 'beastmaster_boar', 'lycan_wolf', 'warlock_golem', 'broodmother_spider', 'enigma_eidolon', 'wisp_', 'tusk_frozen', 'phoenix_', 'arc_warden_tempest', 'monkey_king_furarmy', 'dark_willow_creature', 'morphling_replicate', 'naga_', 'meepo_', 'spectre_haunt', 'venomancer_', 'shadow_shaman_serpent', 'shadow_demon_disruption', 'obsidian_destroyer_astral', 'chen_', 'enchantress_', 'furion_', 'keeper_of_the_light_', 'oracle_', 'techies_', 'tinker_', 'visage_', 'clinkz_', 'drow_', 'hoodwink_', 'marci_', 'primal_beast_', 'muerta_', 'ringmaster_', 'backdoor_', 'ancient_', 'siege_', 'healing_ward', 'plague_ward', 'death_ward', 'serpent_ward'];
            if (bad.some(b => k.includes(b))) return false;

            const excludeAbilities = [
              'abyssal_underlord_abyssal_horde', 'morphling_accumulation', 'miniboss_alleviation',
              'lycan_apex_predator', 'frogmen_arm_of_the_deep', 'rattletrap_armor_power',
              'invoker_attribute_bonus', 'ursa_bear_down', 'lone_druid_bear_necessities',
              'bounty_hunter_big_game_hunter', 'warlock_black_grimoire', 'juggernaut_bladeform',
              'huskar_blood_magic', 'tidehunter_blubber', 'queenofpain_bondage', 'snapfire_boomstick',
              'bristleback_brawlers_grit', 'berserker_troll_break', 'dawnbreaker_break_of_dawn',
              'snapfire_buckshot', 'gyrocopter_chop_shop', 'leshrac_chronoptic_nourishment',
              'bounty_hunter_cutpurse', 'terrorblade_dark_unity', 'mars_dauntless',
              'furbolg_enrage_damage', 'furbolg_enrage_attack_speed', 'leshrac_defilement',
              'doom_bringer_devils_bargain', 'faceless_void_distortion_field', 'jakiro_double_trouble',
              'brewmaster_drunken_brawler', 'brewmaster_drunken_brawler_brew_up', 'juggernaut_duelist',
              'windrunner_easy_breezy', 'morphling_ebb', 'morphling_ebb_and_flow', 'largo_encore',
              'winter_wyvern_essence_of_the_blueheart', 'enigma_event_horizon', 'shredder_exposure_therapy',
              'morphling_flow', 'miniboss_fortification', 'chaos_knight_fundamental_forging',
              'storm_spirit_galvanized', 'lone_druid_gift_bearer', 'enigma_gravity_well',
              'witch_doctor_gris_gris', 'plus_guild_banner', 'batrider_sticky_napalm_application_damage',
              'abyssal_underling_archer_aoe'
            ];
            if (excludeAbilities.includes(k)) return false;

            const dnameLower = (a.dname || '').toLowerCase();
            if (dnameLower.includes('death throe') || k.includes('death_throe')) return false;
            if (dnameLower.includes('eldritch') || k.includes('eldritch')) return false;
            if (dnameLower.includes('archer aura') || k.includes('archer_aoe')) return false;

            return true;
          })
          .map(k => ({
            en: raw[k].dname,
            ru: raw[k].dname,
            short: k,
            attr: 'ability'
          }));

        const validated = await filterValidAbilityIcons(list);
        setHeroesData(validated);
        setCurrentModeInternal(mode);
        setIsLoadingData(false);
        return validated;
      } catch {
        const list = getFallbackAbilities();
        setHeroesData(list);
        setCurrentModeInternal(mode);
        setIsLoadingData(false);
        return list;
      }
    }

    const fb = getFallbackHeroes();
    setHeroesData(fb);
    setCurrentModeInternal(mode);
    setIsLoadingData(false);
    return fb;
  }, []);

  // Expose setCurrentMode wrapper
  const setCurrentMode = (mode: 'heroes' | 'items' | 'abilities') => {
    setCurrentModeInternal(mode);
  };

  return {
    heroesData,
    currentMode: currentModeInternal,
    isLoadingData,
    isTableImagesLoading,
    pendingTableImagesRef,
    setIsTableImagesLoading,
    setIsLoadingData,
    loadData,
    setHeroesData,
    setCurrentMode,
  };
}
