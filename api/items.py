import json
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_PATH = PROJECT_ROOT / "data" / "heroes.json"  # not used for items

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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            payload = {"items": ITEMS, "count": len(ITEMS)}
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")

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