const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  command: (value) => ipcRenderer.send('command', value),
  onCommand: (callback) => ipcRenderer.on('command', (_event, value) => callback(value)),
  onGhost: (callback) => ipcRenderer.on('ghost', (_event, value) => callback(value)),
  save: (png) => ipcRenderer.invoke('save', png)
});
