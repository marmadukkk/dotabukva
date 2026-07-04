# DotaBukva — Migration (React + Node/Express + TS)

This is a **pixel-perfect, functionally equivalent** rewrite of the original FastAPI + single-file HTML/JS app.

- **Frontend**: Vite + React + TypeScript + styled-components
- **Backend**: Express + TypeScript + native WebSocket
- Exact same routes, same responses, same UI (colors, fonts, reel animations, grids, modals, history, room WS behavior, free-elim / CD, search dimming, etc.)
- No new features. No design changes.

## Project Structure
```
dotabukva_ts/
├── backend/
│   ├── src/
│   │   ├── server.ts
│   │   └── services/dotaData.ts   # faithful port of caching + OpenDota + spin logic
│   ├── data/                      # heroes.json + papich
│   └── package.json
├── frontend/
│   ├── src/App.tsx                # full port of original JS + DOM structure
│   ├── public/data/...
│   └── index.html                 # contains original custom CSS + CDNs (Tailwind, FA, Cinzel)
└── README.md
```

## Running (Development)

### 1. Backend
```bash
cd backend
cp .env.example .env   # optional
npm run dev
# Runs on http://localhost:3001
```

### 2. Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173  (proxies /api /ws /data → backend)
```

Open http://localhost:5173

## Production build
```bash
# Backend
cd backend && npm run build && npm start

# Frontend
cd frontend && npm run build
# Serve the dist/ with any static server. Configure API base if needed.
```

## Database / Seeding
- **No database**. Rooms are in-memory (same TTL rules as original).
- Heroes/items/abilities are fetched live from OpenDota (with 1h TTL cache) and fall back to `data/heroes.json`.
- No seeding required. The local JSON is the fallback snapshot.

## Notes on Fidelity
- Reel animations, cylinder visuals, lens effects, wood tavern frames, sounds (WebAudio), confetti are identical.
- Guesser grid: exact eliminated styling (grayscale + ✕ overlay), search dimming, attribute sorts.
- Room flows, leader/guessers, free-elims (3) + 25s CD, WS messages, eliminated sync, start game — identical.
- "Create room" button shows the exact donation popup (as in original).
- History and eliminated persisted in localStorage.
- All API paths and response shapes match the original exactly.

## Original routes replicated
- GET /api/spin?mode=...
- GET /api/heroes, /api/items, /api/abilities
- POST/GET /api/heroes/refresh
- POST /api/rooms/create
- GET /api/rooms , /api/rooms/{code}
- WS /ws/room/{code}?role=...

Enjoy the tavern.
