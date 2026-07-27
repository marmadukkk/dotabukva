/**
 * Preload bridge (contextIsolation on).
 * Expose only safe, explicit APIs to the renderer if needed later.
 */
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('dotaDesktop', {
  platform: process.platform,
  isElectron: true,
});
