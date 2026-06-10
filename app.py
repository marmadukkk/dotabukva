from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import random
from pathlib import Path
import json
import urllib.request
import urllib.error

app = FastAPI(
    title="Герой на букву",
    description="Крути рулетку — получай героя Dota 2 и букву. Опиши героя на эту букву!",
)

BASE_DIR = Path(__file__).resolve().parent

def _get_index_html():
    return (BASE_DIR / "templates" / "index.html").read_text(encoding="utf-8")

with open(BASE_DIR / "data" / "heroes.json", encoding="utf-8") as f:
    _DATA = json.load(f)

LETTERS = _DATA["letters"]
ATTR_LABEL = _DATA["attr_labels"]
ATTR_COLORS = _DATA["attr_colors"]

_RU_NAME_MAP = {}
for h in _DATA.get("heroes", []):
    short = h.get("short")
    if short:
        _RU_NAME_MAP[short] = h.get("ru") or h.get("en") or short

def _fetch_heroes_from_opendota():
    url = "https://api.opendota.com/api/heroes"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "DotaBukva/1.0 (https://github.com)"}
    )
    with urllib.request.urlopen(req, timeout=7) as resp:
        raw = json.loads(resp.read().decode("utf-8"))

    heroes = []
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

    heroes.sort(key=lambda x: (x["attr"], x["en"]))
    return heroes

def _load_heroes():
    try:
        live = _fetch_heroes_from_opendota()
        if live:
            print(f"[DotaBukva] Загружено {len(live)} героев из OpenDota API")
            return live
    except Exception as e:
        print(f"[DotaBukva] Не удалось получить героев из OpenDota ({e}), используем локальный heroes.json")
    return _DATA.get("heroes", [])

HEROES = _load_heroes()



def get_hero_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/{short}_lg.png"


@app.get("/", response_class=HTMLResponse)
async def index():
    html = _get_index_html().replace("__TOTAL_HEROES__", str(len(HEROES)))
    return HTMLResponse(html)


@app.get("/api/spin")
async def api_spin():
    hero = random.choice(HEROES)
    letter = random.choice(LETTERS)
    return {
        "hero": hero["en"],
        "hero_ru": hero["ru"],
        "hero_en": hero["en"],
        "short": hero["short"],
        "attr": hero["attr"],
        "attr_label": ATTR_LABEL[hero["attr"]],
        "color": ATTR_COLORS[hero["attr"]],
        "image": get_hero_image(hero["short"]),
        "letter": letter,
    }


@app.get("/api/heroes")
async def api_heroes():
    return {"heroes": HEROES, "count": len(HEROES)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
