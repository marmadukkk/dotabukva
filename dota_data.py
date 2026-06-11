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
    return ATTR_COLORS.get(attr, "#71717a")


def get_hero_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/{short}_lg.png"


def get_random_spin() -> Dict[str, Any]:
    """Convenience used by both the main app and the /api/spin handler."""
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
