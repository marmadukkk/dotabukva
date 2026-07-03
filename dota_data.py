"""
Shared Dota 2 heroes data loader with TTL caching.
Used by:
- app.py (FastAPI full app with rooms)
- api/heroes.py and api/spin.py (Vercel-compatible serverless handlers)

This centralizes fetching, fallback, normalization ("all" -> "uni"),
Russian name mapping, and caching so we don't duplicate logic 3 times.

Deployment note:
- Long-running FastAPI: cache is effective (refreshes at most every hour).
- Short-lived serverless (Vercel api/*.py): cache lives only for the invocation
  lifetime. Still avoids repeated work within one request and gives consistent
  data shape. Cold starts may hit OpenDota (acceptable; data is small).
"""

import json
import random
import time
import urllib.request
import urllib.error
from pathlib import Path
from typing import Any, Dict, List, Optional

HERE = Path(__file__).resolve().parent
DATA_PATH = HERE / "data" / "heroes.json"

# Module-level TTL cache
_CACHE: Optional[List[Dict[str, Any]]] = None
_CACHE_TS: float = 0.0
CACHE_TTL_SECONDS = 3600  # 1 hour

# Load static metadata once
with open(DATA_PATH, encoding="utf-8") as f:
    _DATA = json.load(f)

LETTERS: List[str] = _DATA.get("letters", [])
ATTR_LABEL: Dict[str, str] = _DATA.get("attr_labels", {})
ATTR_COLORS: Dict[str, str] = _DATA.get("attr_colors", {})

# Fallback RU names from the local JSON (used when OpenDota doesn't give localized)
_RU_NAME_MAP: Dict[str, str] = {}
for h in _DATA.get("heroes", []):
    short = h.get("short")
    if short:
        _RU_NAME_MAP[short] = h.get("ru") or h.get("en") or short


def _fetch_heroes_from_opendota() -> List[Dict[str, Any]]:
    """Fetch fresh list from OpenDota. Returns [] on any error (caller falls back)."""
    url = "https://api.opendota.com/api/heroes"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (https://github.com)"}
    )
    with urllib.request.urlopen(req, timeout=7) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    heroes: List[Dict[str, Any]] = []
    for h in raw:
        internal_name = h.get("name", "")
        if not internal_name.startswith("npc_dota_hero_"):
            continue
        short = internal_name.replace("npc_dota_hero_", "")
        en = h.get("localized_name") or short.replace("_", " ").title()
        ru = _RU_NAME_MAP.get(short, en)
        attr = h.get("primary_attr", "str")
        if attr == "all":
            attr = "uni"
        heroes.append({
            "en": en,
            "ru": ru,
            "short": short,
            "attr": attr
        })

    # Stable order: by primary attr then English name (nice for reels/grids)
    heroes.sort(key=lambda x: (x["attr"], x["en"]))
    return heroes


def _load_heroes_fresh() -> List[Dict[str, Any]]:
    """Try live API, fall back to the bundled JSON. Never raises."""
    try:
        live = _fetch_heroes_from_opendota()
        if live:
            print(f"[DotaBukva] Загружено {len(live)} героев из OpenDota API (TTL {CACHE_TTL_SECONDS}s)")
            return live
    except Exception as e:
        print(f"[DotaBukva] Не удалось получить героев из OpenDota ({e}), используем локальный heroes.json")
    return list(_DATA.get("heroes", []))


def get_heroes() -> List[Dict[str, Any]]:
    """
    Return the current list of heroes.
    Refreshes from the network at most once every CACHE_TTL_SECONDS in a
    long-lived process. Thread/async safe enough for this use case.
    """
    global _CACHE, _CACHE_TS
    now = time.time()
    if _CACHE is None or (now - _CACHE_TS) > CACHE_TTL_SECONDS:
        _CACHE = _load_heroes_fresh()
        _CACHE_TS = now
    return _CACHE


def refresh_heroes() -> List[Dict[str, Any]]:
    """Force an immediate refresh (bypass TTL). Useful for debugging/admin."""
    global _CACHE, _CACHE_TS
    _CACHE = _load_heroes_fresh()
    _CACHE_TS = time.time()
    return _CACHE


def get_letters() -> List[str]:
    return LETTERS


def get_attr_label(attr: str) -> str:
    return ATTR_LABEL.get(attr, attr.upper())


def get_attr_color(attr: str) -> str:
    if attr == "ability":
        return "#67e8f9"  # cyan for abilities
    return ATTR_COLORS.get(attr, "#71717a")


def get_hero_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/{short}_lg.png"


def get_item_category(dname, qual, secret_shop, components, cost):
    d = dname.lower()
    if secret_shop:
        return "Тайная Лавка"
    if qual == "consumable" or any(x in d for x in ["tango", "clarity", "salve", "faerie fire", "smoke", "dust", "gem", "ward", "bottle", "healing lotus", "tome", "dust of appearance", "town portal", "observer", "sentry"]):
        return "Расходники"
    if qual == "component":
        if any(x in d for x in ["gauntlets", "slippers", "mantle", "circlet", "branches", "crown", "belt", "band", "robe", "staff", "quarterstaff", "sobi mask", "ring of regen", "magic stick", "magic wand"]):
            return "Атрибуты"
        return "Снаряжение"
    # Upgraded items
    if components and len(components or []) > 0:
        if any(x in d for x in ["mekansm", "pipe", "crimson", "lotus", "glimmer", "force", "ghost", "eul", "cyclone", "solar", "guardian", "veil", "orchid", "bloodthorn", "diffusal", "heavens", "mjollnir", "butterfly", "skadi", "satanic", "abyssal", "basher", "echo", "harpoon", "manta", "refresher", "octarine", "linken", "black king", "shiva", "assault", "dragon lance", "hurricane", "pike", "sange", "yasha", "kaya", "snk", "sny"]):
            if any(x in d for x in ["mek", "pipe", "crimson", "lotus", "glimmer", "force", "ghost", "eul", "solar", "guardian"]):
                return "Поддержка"
            if any(x in d for x in ["dagon", "veil", "orchid", "bloodthorn", "rod", "sheep", "hex", "scythe", "necro"]):
                return "Магия"
            if any(x in d for x in ["armlet", "blade mail", "pipe", "shiva", "assault", "crimson", "solar", "lotus"]):
                return "Броня"
            if any(x in d for x in ["desolator", "mjollnir", "maelstrom", "butterfly", "daedalus", "divine", "monkey", "skadi", "satanic", "abyssal", "basher", "echo", "harpoon", "battle fury", "manta"]):
                return "Оружие"
            return "Артефакты"
        if any(x in d for x in ["aghanim", "refresher", "octarine", "linken", "black king", "shiva", "assault"]):
            return "Аксессуары"
        return "Разное"
    if any(x in d for x in ["aegis", "cheese", "rapier", "divine"]):
        return "Артефакты"
    return "Разное"


def get_item_upgrade(dname, components, cost):
    d = dname.lower()
    if components and len(components or []) > 0:
        return "Улучшения"
    if "recipe" in d:
        return "Улучшения"
    if cost and cost > 2000:
        return "Улучшения"
    return "Базовые"


def _fetch_items_from_opendota() -> List[Dict[str, Any]]:
    url = "https://api.opendota.com/api/constants/items"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (https://github.com)"}
    )
    with urllib.request.urlopen(req, timeout=7) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    items = []
    forbidden_substrings = [
        "river vial", "pocket roshan", "pocket tower", "scrying shovel",
        "mercy & grace", "forebearer", "beloved memory", "bag of gold", "tombstone",
        "enchantment", "enchanted", "enchanter",
        "tier 1 token", "tier 2 token", "tier 3 token", "tier 4 token", "tier 5 token",
        "alert", "audacious", "boundless", "brawny", "crude", "dominant", "evolved",
        "eye of the vizier", "feverish", "fierce", "fleetfooted", "flying courier",
        "greedy", "greater healing lotus", "great healing lotus", "greater faerie fire",
        "hulking", "keen-eyed", "manic", "mystical", "necronomicon", "nimble",
        "observer and sentry wards", "quickened", "restorative", "tango (shared)",
        "thick", "timeless", "titanic", "tough", "unleashed", "vampiric", "vast",
        "vital", "wise"
    ]
    for key, item in raw.items():
        dname = item.get("dname") or ""
        if key.startswith("item_recipe_") or key.startswith("recipe_") or not dname:
            continue
        dname_lower = dname.lower()
        if any(sub in dname_lower for sub in forbidden_substrings):
            continue
        if "tier" in dname_lower and "token" in dname_lower:
            continue
        short = key.replace("item_", "")
        if dname_lower == "dagon" and short != "dagon_4":
            continue

        # Special handling for Aghanim items
        if dname == "Aghanim's Blessing":
            continue
        if dname == "Aghanim's Blessing - Roshan":
            dname = "Aghanim's Blessing"
        if dname == "Aghanim's Shard - Consumable":
            continue

        if "diffusal blade" in dname_lower and short != "diffusal_blade":
            continue

        is_neutral = bool(item.get("neutral")) or item.get("neutral_tier") is not None
        qual = item.get("qual")
        secret_shop = item.get("secret_shop") or 0
        components = item.get("components") or []
        cost = item.get("cost") or 0

        category = get_item_category(dname, qual, secret_shop, components, cost)
        if is_neutral:
            category = "Нейтралки"

        upgrade = get_item_upgrade(dname, components, cost)

        items.append({
            "en": dname,
            "ru": dname,
            "short": short,
            "attr": "neutral" if is_neutral else "item",
            "category": category,
            "upgrade": upgrade
        })

    items.sort(key=lambda x: (x["category"], x["en"]))
    return items


_ITEMS_CACHE: Optional[List[Dict[str, Any]]] = None
_ITEMS_CACHE_TS: float = 0.0

def _load_items_fresh() -> List[Dict[str, Any]]:
    try:
        live = _fetch_items_from_opendota()
        if live:
            print(f"[DotaBukva] Загружено {len(live)} предметов из OpenDota API")
            return live
    except Exception as e:
        print(f"[DotaBukva] Не удалось получить предметы из OpenDota ({e}), используем пустой список")
    return []


def get_items() -> List[Dict[str, Any]]:
    global _ITEMS_CACHE, _ITEMS_CACHE_TS
    now = time.time()
    if _ITEMS_CACHE is None or (now - _ITEMS_CACHE_TS) > CACHE_TTL_SECONDS:
        _ITEMS_CACHE = _load_items_fresh()
        _ITEMS_CACHE_TS = now
    return _ITEMS_CACHE


def get_item_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/{short}_lg.png"


# ==================== ABILITIES (Способности) ====================

_ABILITIES_CACHE: Optional[List[Dict[str, Any]]] = None
_ABILITIES_CACHE_TS: float = 0.0


def _fetch_abilities_from_opendota() -> List[Dict[str, Any]]:
    """Fetch and filter hero abilities from OpenDota constants."""
    url = "https://api.opendota.com/api/constants/abilities"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (https://github.com)"}
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    # Filters to keep mostly real hero abilities (exclude talents, generics, creeps, couriers etc.)
    exclude_in_key = [
        "special_bonus", "dota_", "generic", "backdoor", "necronomicon", "courier",
        "roshan", "greevil", "seasonal", "plus", "workshop", "fountain", "building",
        "neutral_", "creep", "warlock_golem", "spirit_bear", "forged_spirit", "eidolon",
        "beastmaster_boar", "lycan_wolf", "brewmaster", "visage_familiar", "shadow_demon_shadow",
        "enigma_eidolon", "ability_", "twin_gate", "capture", "lamp_use", "lotus_pool"
    ]
    bad_dname_substrings = [
        "backdoor", "true sight", "auto deliver", "return to base", "go to secret",
        "transfer item", "retrieve item", "speed burst", "empty", "placeholder",
        "aegis", "cheese"
    ]

    # User-requested blacklist of abilities to remove from reel and grid
    bad_ability_dnames = [
        "abyssal horde", "accumulation", "apex predator", "armor power", "attribure bonus", "attribute bonus",
        "black grimoire", "bladeform", "alleviation", "application da", "archer aura",
        "arm of the deep", "am of the deep", "bear down", "bear necessities", "big game hunter", "blinding sun",
        "blood magic", "blubber", "bondage", "bone and arrow", "boomstik", "boomstick", "brawler's grit",
        "break", "break of dawn", "buckshot", "bullbelly blitz", "chop shop", "chronoptic nou",
        "clairvoyant cure", "colossal", "cold snap (ad)", "chaos meteor(ad)", "congregations",
        "cutpurse", "critical strike", "dark carnival b", "dark unity", "dauntless",
        "death throe", "defilement", "destroy ofrenda", "devil's bargain", "devoured ability",
        "detonate m.a.d", "distortion field", "double trouble", "dragon sight", "duelist",
        "e.m.p. (ad)", "easy breezy", "eelskin", "eldrich summon", "eldritch summoning", "eldwurm scholar",
        "eldwurm studies", "encore", "end sharpshooter", "end meditation", "end protection",
        "end roll up", "essence of the bl", "eureka!", "event horizon", "exposure therapy",
        "fling", "fling release", "flow", "forge spirit (ad)", "fortification",
        "focus fire cancel", "fundamental fo", "galvanized", "geomancy", "gift bearer",
        "ghost walk (ad)", "gravity well", "gris-gris", "heal amplification", "healing hammer",
        "heart of battle", "heart of darkness", "herd mentality", "hidden gates", "horsepower",
        "hurricane", "hotfeet hustle", "ice wall (ad)", "icefire bomb", "immolation",
        "immovable", "intimidate", "intrinsic edge", "invading force", "invoked spell",
        "island elixir", "keen scope", "jetpack toggle", "last will", "launch snowball",
        "lurker", "magic aplification", "magic amplification", "mana break", "masochist", "mastermind", "maul",
        "mental fortitude", "might and magus", "mistwoods wayfarer", "momentum",
        "mourning ritual", "nature's profit", "nothl boon", "nyxth sense", "oblivion savant",
        "ogre smash!", "ominous discern", "one man army", "pack rat", "persecutor",
        "phantasmagoria", "pixie dust", "predator", "prickly", "prognosticate",
        "prospecting aura", "puckish", "quick wit", "rabble-rouser", "rally", "rawhide",
        "recall familliar", "recall familiar", "reflect", "m.a.d", "reins of chaos", "rewoven",
        "riverborn aura", "rugged", "ruin and restore", "ruin and restoration", "seaborn sentinel", "seed shot",
        "selemene's faithe", "selemene's faithful", "septic shock", "slithereen cutla", "slow burn", "slugger",
        "smoldering resin", "souvenir slot", "soul strike", "special reserve", "spectral",
        "spirit cairn", "spirit collector", "splitting image", "spoon's stash", "spring early",
        "squee's scope", "stollen spell", "steal weapon", "sticky fingers",
        "stop take aim", "stop sun ray", "stop rolling", "stop icarus dive", "stop freezing field",
        "succubus", "suffer in silence", "sun strike (ad)", "symmetry", "take off",
        "telekinesis land", "tendrils of the", "the shining", "third eye", "threads of fate",
        "time warp aura", "tip the scales", "to hell and back", "tomo'kan tracker",
        "tornado (ad)", "twisted chakram", "undulation", "unyielding shield", "vanquisher",
        "water bubble", "weakening aura", "wellspring",
        "attribute bonus", "boomstick", "chaos meteor (ad)", "clairvoyant curse",
        "deafening blast (ad)", "magic amplification", "recall familiar",
        "return chakram", "return chackram", "selemene's faithful", "savage roar", "stone form",
        "arm of the deep", "eldritch summoning", "ruin and restoration"
    ]

    abilities: List[Dict[str, Any]] = []
    for key, ab in raw.items():
        dname = (ab.get("dname") or "").strip()
        if not dname or len(dname) < 4:
            continue
        kl = key.lower()
        if any(x in kl for x in exclude_in_key):
            continue
        dnl = dname.lower()
        if any(x in dnl for x in bad_dname_substrings):
            continue
        if "_" not in kl:
            continue
        if any(bad in dnl for bad in bad_ability_dnames):
            continue

        abilities.append({
            "en": dname,
            "ru": dname,  # no separate localized from this API; same as items
            "short": key,
            "attr": "ability"
        })

    abilities.sort(key=lambda x: x["en"])
    return abilities


def _load_abilities_fresh() -> List[Dict[str, Any]]:
    try:
        live = _fetch_abilities_from_opendota()
        if live:
            print(f"[DotaBukva] Загружено {len(live)} способностей из OpenDota API")
            return live
    except Exception as e:
        print(f"[DotaBukva] Не удалось получить способности из OpenDota ({e}), используем пустой список")
    return []


def get_abilities() -> List[Dict[str, Any]]:
    global _ABILITIES_CACHE, _ABILITIES_CACHE_TS
    now = time.time()
    if _ABILITIES_CACHE is None or (now - _ABILITIES_CACHE_TS) > CACHE_TTL_SECONDS:
        _ABILITIES_CACHE = _load_abilities_fresh()
        _ABILITIES_CACHE_TS = now
    return _ABILITIES_CACHE


def get_ability_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/{short}.png"


def get_random_spin(mode: str = "heroes") -> Dict[str, Any]:
    """Convenience used by both the main app and the /api/spin handler."""
    if mode == "items":
        items = get_items()
        if not items:
            items = [{"en": "Blink Dagger", "ru": "Миг", "short": "blink", "attr": "item"}]
        item = random.choice(items)
        letter = random.choice(get_letters())
        return {
            "hero": item["en"],  # keep key for compatibility in spin result
            "hero_ru": item["ru"],
            "hero_en": item["en"],
            "short": item["short"],
            "attr": item["attr"],
            "attr_label": get_attr_label(item["attr"]),
            "color": get_attr_color(item["attr"]),
            "image": get_item_image(item["short"]),
            "letter": letter,
        }
    elif mode == "abilities":
        abils = get_abilities()
        if not abils:
            abils = [{"en": "Meat Hook", "ru": "Meat Hook", "short": "pudge_meat_hook", "attr": "ability"}]
        ab = random.choice(abils)
        letter = random.choice(get_letters())
        return {
            "hero": ab["en"],
            "hero_ru": ab["ru"],
            "hero_en": ab["en"],
            "short": ab["short"],
            "attr": ab["attr"],
            "attr_label": "СПОСОБНОСТЬ",
            "color": get_attr_color(ab["attr"]),
            "image": get_ability_image(ab["short"]),
            "letter": letter,
        }
    else:
        heroes = get_heroes()
        hero = random.choice(heroes)
        letter = random.choice(get_letters())
        return {
            "hero": hero["en"],
            "hero_ru": hero["ru"],
            "hero_en": hero["en"],
            "short": hero["short"],
            "attr": hero["attr"],
            "attr_label": get_attr_label(hero["attr"]),
            "color": get_attr_color(hero["attr"]),
            "image": get_hero_image(hero["short"]),
            "letter": letter,
        }


# Snapshot at import time for modules that do "HEROES = ..." at module level.
# This will trigger at most one network fetch per process (thanks to the cache above).
HEROES: List[Dict[str, Any]] = get_heroes()
