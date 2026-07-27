# DOTA-BUKVA Desktop (Electron)

## Development

```bash
npm install
npm run electron:dev
```

Starts Vite on `:5173` and opens Electron against it.

## Production build

```bash
# Current OS
npm run electron:build

# Linux only (AppImage + deb)
npm run electron:build:linux

# Windows (run on Windows, or cross-build with wine)
npm run electron:build:win
```

Artifacts land in `release/`.

## Notes

- Renderer is the same React/Vite app (`src/`).
- Production loads `dist/` via a local `127.0.0.1` static server so absolute asset paths (`/sounds/...`, `/videos/...`) keep working.
- Tailwind, Font Awesome and Cinzel are bundled locally (no CDN required).
- App icon: `electron/resources/icon.png` (+ `icon.ico` for Windows), sourced from `public/images/canvas.png`.
- **LAN multiplayer:** `electron/lanServer.cjs` hosts a room on `0.0.0.0:17432` (WebSocket `/ws`). Guests connect with host LAN IP.
