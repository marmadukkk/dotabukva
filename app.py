from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import asyncio
import random
from pathlib import Path
import time
import string
from typing import Dict, Set, Optional
from collections import defaultdict

import dota_data

# ==================== BACKGROUND TASKS (rooms TTL + hero cache) ====================

# Tunables for room cleanup (easy to adjust)
ROOM_ABSOLUTE_TTL = 4 * 3600          # 4 hours
ROOM_IDLE_NO_CONNECTIONS_TTL = 30 * 60  # 30 minutes with 0 players
CLEANUP_CHECK_INTERVAL = 5 * 60       # check every 5 minutes


async def _cleanup_rooms_loop():
    """Background task: periodically remove stale rooms.

    Rules:
    - Hard TTL: rooms older than ROOM_ABSOLUTE_TTL are removed.
    - Idle TTL: rooms with zero WebSocket connections for > ROOM_IDLE_NO_CONNECTIONS_TTL are removed.
    """
    cycle = 0
    print(f"[DotaBukva] Room cleanup task running: absolute={ROOM_ABSOLUTE_TTL}s, idle={ROOM_IDLE_NO_CONNECTIONS_TTL}s, interval={CLEANUP_CHECK_INTERVAL}s")

    while True:
        try:
            await asyncio.sleep(CLEANUP_CHECK_INTERVAL)
            cycle += 1
            now = time.time()

            expired: list[str] = []
            active_count = 0

            for code, room in list(rooms.items()):
                age = now - room.get("created", now)
                active = len(room_connections.get(code, set()))
                if active > 0:
                    active_count += 1
                if age > ROOM_ABSOLUTE_TTL or (active == 0 and age > ROOM_IDLE_NO_CONNECTIONS_TTL):
                    expired.append(code)

            for code in expired:
                rooms.pop(code, None)
                room_connections.pop(code, None)
                print(f"[DotaBukva] Cleaned up expired room {code}")

            # Light periodic status (every ~3 cycles = ~15 min)
            if cycle % 3 == 0:
                total_rooms = len(rooms)
                print(f"[DotaBukva] Rooms status: {total_rooms} total, {active_count} with active players")

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[DotaBukva] Room cleanup error (cycle {cycle}): {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    cleanup_task = asyncio.create_task(_cleanup_rooms_loop())
    print("[DotaBukva] Room cleanup background task started (4h absolute / 30m idle TTL)")
    try:
        yield
    finally:
        # Shutdown
        cleanup_task.cancel()
        try:
            await cleanup_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Герой на букву",
    description="Крути рулетку — получай героя Dota 2 и букву. Опиши героя на эту букву!",
    lifespan=lifespan,
)

BASE_DIR = Path(__file__).resolve().parent


def _get_index_html():
    # Unified frontend: serve the single source of truth from public/.
    # This way both the full FastAPI deploy and the Vercel static deploy
    # use exactly the same index.html (no more drift between templates/ and public/).
    # /data/* is mounted below so that papich phrases (and future data) work
    # the same in FastAPI deploys as they do via Vercel's rewrites.
    return (BASE_DIR / "public" / "index.html").read_text(encoding="utf-8")


# Shared cached heroes (TTL + fallback handled in dota_data).
# This replaces the previous duplicated fetch logic that lived in three files.
HEROES = dota_data.get_heroes()
LETTERS = dota_data.get_letters()
ATTR_LABEL = dota_data.ATTR_LABEL
ATTR_COLORS = dota_data.ATTR_COLORS

# Room state (in-memory). Declared early so background cleanup task can see the names
# at runtime (the task is started via lifespan after the whole module loads).
rooms: Dict[str, dict] = {}
room_connections: Dict[str, Set[WebSocket]] = defaultdict(set)

# ==================== ROOM SYSTEM (helpers) ====================

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


@app.get("/", response_class=HTMLResponse)
async def index():
    # The __TOTAL_HEROES__ placeholder was no longer present in the HTML
    # (count is provided dynamically via /api/heroes + JS). Keep the call simple.
    html = _get_index_html()
    return HTMLResponse(html)


# Serve canonical data files (papich phrases etc.) under /data so the unified
# public/index.html works identically under FastAPI and under Vercel rewrites.
# Vercel will continue to work via its own public/data/ + rewrites.
app.mount("/data", StaticFiles(directory=BASE_DIR / "data"), name="data")


@app.get("/api/spin")
async def api_spin(mode: str = "heroes"):
    # Use the shared implementation (same shape, benefits from the central cache)
    return dota_data.get_random_spin(mode)


@app.get("/api/heroes")
async def api_heroes():
    return {"heroes": HEROES, "count": len(HEROES)}


@app.get("/api/items")
async def api_items():
    items = dota_data.get_items()
    return {"items": items, "count": len(items)}


@app.get("/api/abilities")
async def api_abilities():
    abils = dota_data.get_abilities()
    return {"abilities": abils, "count": len(abils)}


@app.post("/api/heroes/refresh")
@app.get("/api/heroes/refresh")  # convenient for manual browser/curl trigger
async def api_refresh_heroes():
    """Force refresh of the heroes cache from OpenDota (falls back to local JSON).

    Useful for:
    - Picking up newly released heroes without restarting the server.
    - Debugging the cache / OpenDota connectivity.
    """
    fresh = dota_data.refresh_heroes()
    return {
        "count": len(fresh),
        "ttl_seconds": dota_data.CACHE_TTL_SECONDS,
        "message": "Heroes cache refreshed (will be used until next TTL expiry or manual refresh)",
    }


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
                mode = data.get("mode", "heroes")
                spin_result = dota_data.get_random_spin(mode)
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
