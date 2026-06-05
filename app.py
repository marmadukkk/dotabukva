from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import random
from pathlib import Path

app = FastAPI(
    title="Герой на букву",
    description="Крути рулетку — получай героя Dota 2 и букву. Опиши героя на эту букву!",
)

BASE_DIR = Path(__file__).resolve().parent

def _get_index_html():
    return (BASE_DIR / "templates" / "index.html").read_text(encoding="utf-8")

import json
with open(BASE_DIR / "data" / "heroes.json", encoding="utf-8") as f:
    _DATA = json.load(f)

HEROES = _DATA["heroes"]
LETTERS = _DATA["letters"]
ATTR_LABEL = _DATA["attr_labels"]
ATTR_COLORS = _DATA["attr_colors"]



def get_hero_image(short: str) -> str:
    """Публичный CDN Steam для портретов героев (lg = large)."""
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
