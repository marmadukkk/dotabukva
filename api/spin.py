import json
import random
import urllib.request
import urllib.error
import urllib.parse
from http.server import BaseHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_PATH = PROJECT_ROOT / "data" / "heroes.json"

with open(DATA_PATH, encoding="utf-8") as f:
    _DATA = json.load(f)

LETTERS = _DATA.get("letters", [])
ATTR_LABEL = _DATA.get("attr_labels", {})
ATTR_COLORS = _DATA.get("attr_colors", {})

_RU_NAME_MAP = {}
for h in _DATA.get("heroes", []):
    short = h.get("short")
    if short:
        _RU_NAME_MAP[short] = h.get("ru") or h.get("en") or short

def _fetch_heroes_from_opendota():
    url = "https://api.opendota.com/api/heroes"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (vercel)"}
    )
    with urllib.request.urlopen(req, timeout=6) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    heroes = []
    for h in raw:
        internal = h.get("name", "")
        if not internal.startswith("npc_dota_hero_"):
            continue
        short = internal.replace("npc_dota_hero_", "")
        en = h.get("localized_name") or short.replace("_", " ").title()
        ru = _RU_NAME_MAP.get(short, en)
        attr = h.get("primary_attr", "str")
        if attr == "all":
            attr = "uni"
        heroes.append({"en": en, "ru": ru, "short": short, "attr": attr})
    heroes.sort(key=lambda x: x["en"])
    return heroes

def _get_heroes():
    try:
        live = _fetch_heroes_from_opendota()
        if live:
            return live
    except Exception:
        pass
    return _DATA.get("heroes", [])

HEROES = _get_heroes()

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


def _fetch_items_from_opendota():
    url = "https://api.opendota.com/api/constants/items"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (vercel)"}
    )
    with urllib.request.urlopen(req, timeout=6) as resp:
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

def _get_items():
    try:
        live = _fetch_items_from_opendota()
        if live:
            return live
    except Exception:
        pass
    return []

ITEMS = _get_items()


def _fetch_abilities_from_opendota():
    url = "https://api.opendota.com/api/constants/abilities"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (vercel)"}
    )
    with urllib.request.urlopen(req, timeout=8) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

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

    abilities = []
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
            "ru": dname,
            "short": key,
            "attr": "ability"
        })
    abilities.sort(key=lambda x: x["en"])
    return abilities


def _get_abilities():
    try:
        live = _fetch_abilities_from_opendota()
        if live:
            return live
    except Exception:
        pass
    return []


ABILITIES = _get_abilities()


def get_hero_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/{short}_lg.png"

def get_item_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/{short}_lg.png"

def get_ability_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/abilities/{short}.png"


def get_random_spin(mode: str = "heroes"):
    if mode == "items":
        pool = ITEMS or [{"en": "Blink Dagger", "ru": "Blink Dagger", "short": "blink", "attr": "item"}]
        obj = random.choice(pool)
        letter = random.choice(LETTERS)
        return {
            "hero": obj["en"],
            "hero_ru": obj["ru"],
            "hero_en": obj["en"],
            "short": obj["short"],
            "attr": obj["attr"],
            "attr_label": ATTR_LABEL.get(obj["attr"], obj["attr"].upper()),
            "color": ATTR_COLORS.get(obj["attr"], "#71717a"),
            "image": get_item_image(obj["short"]),
            "letter": letter,
        }
    elif mode == "abilities":
        pool = ABILITIES or [{"en": "Meat Hook", "ru": "Meat Hook", "short": "pudge_meat_hook", "attr": "ability"}]
        obj = random.choice(pool)
        letter = random.choice(LETTERS)
        return {
            "hero": obj["en"],
            "hero_ru": obj["ru"],
            "hero_en": obj["en"],
            "short": obj["short"],
            "attr": obj["attr"],
            "attr_label": "СПОСОБНОСТЬ",
            "color": "#67e8f9",
            "image": get_ability_image(obj["short"]),
            "letter": letter,
        }
    else:
        hero = random.choice(HEROES)
        letter = random.choice(LETTERS)
        return {
            "hero": hero["en"],
            "hero_ru": hero["ru"],
            "hero_en": hero["en"],
            "short": hero["short"],
            "attr": hero["attr"],
            "attr_label": ATTR_LABEL.get(hero["attr"], hero["attr"].upper()),
            "color": ATTR_COLORS.get(hero["attr"], "#71717a"),
            "image": get_hero_image(hero["short"]),
            "letter": letter,
        }


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Parse query for mode=items
            query = urllib.parse.urlparse(self.path).query
            params = urllib.parse.parse_qs(query)
            mode = params.get("mode", ["heroes"])[0]
            result = get_random_spin(mode)
            body = json.dumps(result, ensure_ascii=False).encode("utf-8")

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)
        except Exception as e:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
