import json
import random
import os
from http.server import BaseHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT_ROOT = HERE.parent
DATA_PATH = PROJECT_ROOT / "data" / "heroes.json"

with open(DATA_PATH, encoding="utf-8") as f:
    _DATA = json.load(f)

HEROES = _DATA["heroes"]
LETTERS = _DATA["letters"]
ATTR_LABEL = _DATA["attr_labels"]
ATTR_COLORS = _DATA["attr_colors"]


def get_hero_image(short: str) -> str:
    return f"https://cdn.cloudflare.steamstatic.com/apps/dota2/images/heroes/{short}_lg.png"


def get_random_spin():
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
        if self.path.startswith("/api/spin"):
            try:
                result = get_random_spin()
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
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
