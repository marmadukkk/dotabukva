const { app, BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { createLanServer } = require('./lanServer.cjs');

const isDev = !app.isPackaged;

/** @type {BrowserWindow | null} */
let mainWindow = null;
/** @type {http.Server | null} */
let staticServer = null;
const lanServer = createLanServer();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.map': 'application/json',
};

/**
 * Serve the Vite dist folder over localhost so absolute paths like /sounds/... work.
 * file:// breaks root-absolute asset URLs used throughout the app.
 */
function startStaticServer(rootDir) {
  return new Promise((resolve, reject) => {
    const root = path.resolve(rootDir);

    const server = http.createServer((req, res) => {
      try {
        const rawUrl = req.url || '/';
        const urlPath = decodeURIComponent(new URL(rawUrl, 'http://127.0.0.1').pathname);
        let rel = urlPath === '/' ? '/index.html' : urlPath;
        // prevent path traversal
        const filePath = path.normalize(path.join(root, rel));
        if (!filePath.startsWith(root)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        fs.stat(filePath, (err, st) => {
          if (err || !st.isFile()) {
            // SPA fallback
            const indexPath = path.join(root, 'index.html');
            fs.readFile(indexPath, (e2, data) => {
              if (e2) {
                res.writeHead(404);
                res.end('Not found');
                return;
              }
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(data);
            });
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          const type = MIME[ext] || 'application/octet-stream';
          res.writeHead(200, {
            'Content-Type': type,
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
          });
          fs.createReadStream(filePath).pipe(res);
        });
      } catch (e) {
        res.writeHead(500);
        res.end('Server error');
      }
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to bind static server'));
        return;
      }
      resolve({ server, port: addr.port });
    });
  });
}

function resolveAppIcon() {
  // Packaged: resources/icon.png (electron-builder buildResources)
  // Dev: electron/resources/icon.png next to main.cjs
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.png'),
    path.join(__dirname, 'resources', 'icon.png'),
    path.join(__dirname, 'resources', 'icon.ico'),
    path.join(__dirname, '..', 'public', 'images', 'canvas.png'),
  ];
  for (const p of candidates) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {}
  }
  return undefined;
}

async function createWindow() {
  const icon = resolveAppIcon();

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'DOTA-BUKVA',
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,
    show: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    await mainWindow.loadURL(devUrl);
  } else {
    const distDir = path.join(__dirname, '..', 'dist');
    const { server, port } = await startStaticServer(distDir);
    staticServer = server;
    await mainWindow.loadURL(`http://127.0.0.1:${port}/`);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // LAN multiplayer host controls (desktop only)
  ipcMain.handle('lan:startHost', async (_evt, opts) => {
    try {
      return await lanServer.start(opts || {});
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  });
  ipcMain.handle('lan:stopHost', async () => {
    try {
      await lanServer.stop();
      return { ok: true };
    } catch (e) {
      return { error: String(e && e.message ? e.message : e) };
    }
  });
  ipcMain.handle('lan:getInfo', async () => lanServer.getInfo());

  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow().catch(console.error);
    }
  });
});

app.on('window-all-closed', () => {
  if (staticServer) {
    try { staticServer.close(); } catch {}
    staticServer = null;
  }
  lanServer.stop().catch(() => {});
  if (process.platform !== 'darwin') app.quit();
});
