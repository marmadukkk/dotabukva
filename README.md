# DotaBukva (React + TypeScript)

Modern TS rewrite of the Dota hero/item/ability spin game.

- **Frontend**: Vite + React + TS + styled-components
- **Backend**: Express + TS (data fetching + rooms)

**WebSocket rooms are disabled** for Vercel deployment (client-side demo fallback still works).

## Project Structure
```
/
├── frontend/     # Vite React app (deploy this to Vercel)
├── backend/      # Express API (deploy separately, e.g. Railway/Render)
└── README.md
```

## Running (Development)

### Backend
```bash
cd backend
npm run dev
# Runs on http://localhost:3001
```

### Frontend
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

Open http://localhost:5173

## Deployment on Vercel

### Frontend (recommended)
1. In Vercel, import the repo and set:
   - **Root Directory**: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

2. Add Environment Variables (if you have a backend):
   - `VITE_API_URL` = full URL of your backend (e.g. `https://your-backend.railway.app`)

3. `frontend/vercel.json` is already configured for SPA fallback.

The app will work with client-side fallbacks even without a backend.

### Backend (separate)
Deploy the `backend/` folder to Railway, Render, Fly.io, etc.

Set the `VITE_API_URL` above to point to it.

**Note**: Real-time WebSocket rooms are disabled (client demo mode only).

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
