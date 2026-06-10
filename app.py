from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
import random
from pathlib import Path
import json
import urllib.request
import urllib.error
import time
import string
from typing import Dict, Set, Optional
from collections import defaultdict

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

# ==================== ROOM SYSTEM ====================
rooms: Dict[str, dict] = {}
room_connections: Dict[str, Set[WebSocket]] = defaultdict(set)

def generate_room_code() -> str:
    chars = string.ascii_uppercase + string.digits
    while True:
        code = ''.join(random.choices(chars, k=6))
        if code not in rooms:
            return code

def create_new_room(is_private: bool = False) -> str:
    code = generate_room_code()
    rooms[code] = {
        "code": code,
        "is_private": is_private,
        "created": time.time(),
        "current_spin": None,
        "eliminated": set(),
        "game_started": False,
        "player_data": {}  # websocket -> {"free_elims": 3, "last_elim_time": 0}
    }
    return code

async def broadcast_to_room(code: str, message: dict):
    if code not in room_connections:
        return
    dead = []
    for ws in list(room_connections[code]):
        try:
            await ws.send_json(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        room_connections[code].discard(ws)



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


# ==================== ROOM API ====================

@app.post("/api/rooms/create")
async def api_create_room(is_private: bool = False):
    code = create_new_room(is_private)
    return {
        "code": code,
        "is_private": is_private,
        "invite_link": f"/?room={code}"
    }

@app.get("/api/rooms")
async def api_list_rooms():
    public_rooms = []
    for code, room in rooms.items():
        if not room["is_private"]:
            public_rooms.append({
                "code": code,
                "created": room["created"],
                "players": len(room_connections.get(code, []))
            })
    public_rooms.sort(key=lambda x: x["created"], reverse=True)
    return {"rooms": public_rooms[:20]}

@app.get("/api/rooms/{code}")
async def api_get_room(code: str):
    if code not in rooms:
        return {"error": "Room not found"}
    room = rooms[code]
    return {
        "code": code,
        "is_private": room["is_private"],
        "current_spin": room["current_spin"],
        "eliminated": list(room["eliminated"]),
        "players": len(room_connections.get(code, []))
    }

@app.websocket("/ws/room/{code}")
async def ws_room(websocket: WebSocket, code: str, role: str = "guesser"):
    if code not in rooms:
        await websocket.close(code=4004, reason="Room not found")
        return

    await websocket.accept()
    room_connections[code].add(websocket)

    room = rooms[code]

    if role == 'guesser':
        room["player_data"][websocket] = {"free_elims": 3, "last_elim_time": 0}

    # Notify everyone (including new) about new player count
    await broadcast_to_room(code, {
        "type": "room_update",
        "players": len(room_connections.get(code, []))
    })

    # Send current state on connect
    await websocket.send_json({
        "type": "state",
        "current_spin": room["current_spin"],
        "eliminated": list(room["eliminated"]),
        "role": role,
        "players": len(room_connections.get(code, [])),
        "game_started": room.get("game_started", False)
    })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "spin":
                # Generate new spin (anyone in leader role can trigger for now)
                spin_result = await api_spin()
                room["current_spin"] = spin_result
                await broadcast_to_room(code, {
                    "type": "spin_result",
                    "result": spin_result,
                    "players": len(room_connections.get(code, []))
                })

            elif msg_type == "eliminate":
                short = data.get("short")
                if short and short not in room["eliminated"]:
                    ws = websocket
                    if ws in room.get("player_data", {}):
                        pdata = room["player_data"][ws]
                        now = time.time()
                        can = False
                        if pdata["free_elims"] > 0:
                            pdata["free_elims"] -= 1
                            can = True
                        elif now - pdata["last_elim_time"] >= 25:
                            can = True
                        if can:
                            pdata["last_elim_time"] = now
                            room["eliminated"].add(short)
                            await broadcast_to_room(code, {
                                "type": "eliminated_update",
                                "eliminated": list(room["eliminated"]),
                                "players": len(room_connections.get(code, []))
                            })
                            # personal ack for the player's CD state
                            try:
                                await websocket.send_json({
                                    "type": "elim_personal",
                                    "free_elims": pdata["free_elims"],
                                    "last_elim_time": pdata["last_elim_time"]
                                })
                            except Exception:
                                pass

            elif msg_type == "clear_eliminated":
                room["eliminated"].clear()
                for pdata in room.get("player_data", {}).values():
                    pdata["free_elims"] = 3
                    pdata["last_elim_time"] = 0
                await broadcast_to_room(code, {
                    "type": "eliminated_update",
                    "eliminated": [],
                    "players": len(room_connections.get(code, []))
                })

            elif msg_type == "start_game":
                # Only the leader should be able to start, but we trust the client for now
                room["game_started"] = True
                await broadcast_to_room(code, {
                    "type": "game_started",
                    "players": len(room_connections.get(code, []))
                })

    except WebSocketDisconnect:
        pass
    finally:
        room_connections[code].discard(websocket)
        if websocket in room.get("player_data", {}):
            del room["player_data"][websocket]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
