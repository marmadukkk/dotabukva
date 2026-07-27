/**
 * Preload bridge (contextIsolation on).
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('dotaDesktop', {
  platform: process.platform,
  isElectron: true,
  lan: {
    startHost: (opts) => ipcRenderer.invoke('lan:startHost', opts || {}),
    stopHost: () => ipcRenderer.invoke('lan:stopHost'),
    getInfo: () => ipcRenderer.invoke('lan:getInfo'),
  },
});
