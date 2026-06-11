import json
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_PATH = PROJECT_ROOT / "data" / "heroes.json"

with open(DATA_PATH, encoding="utf-8") as f:
    _DATA = json.load(f)

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


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            payload = {"heroes": HEROES, "count": len(HEROES)}
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
