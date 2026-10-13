// Gives the editor a few native Mac abilities (Save dialogs, Show in Finder) without exposing Node.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('native', {
  platform: process.platform,
  save: (filename, data) => ipcRenderer.invoke('save-file', filename, data),
  reveal: (p) => ipcRenderer.invoke('reveal', p),
  openPath: (p) => ipcRenderer.invoke('open-path', p),
});
