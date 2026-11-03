const { app, BrowserWindow, globalShortcut, ipcMain, screen, dialog } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
// WSLg's virtual GPU can fail to allocate Chromium shared images.
if (/microsoft/i.test(require('node:os').release())) app.disableHardwareAcceleration();
let overlay, toolbar, ghost = false;
const icon = path.join(__dirname, '..', 'assets', process.platform === 'win32' ? 'icon.ico' : 'icon.png');
app.setName('ScreenBrush');
if (process.platform === 'win32') app.setAppUserModelId('tahazz5.ScreenBrush');
const send = (command) => {
  overlay?.webContents.send('command', command);
  toolbar?.webContents.send('command', command);
};
function passthrough(value) {
  ghost = value;
  overlay.setIgnoreMouseEvents(value, { forward: true });
  toolbar.webContents.send('ghost', value);
}
function create() {
  const bounds = screen.getPrimaryDisplay().bounds;
  overlay = new BrowserWindow({ ...bounds, transparent: true, frame: false, hasShadow: false, alwaysOnTop: true, skipTaskbar: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  toolbar = new BrowserWindow({ parent: overlay, width: 880, height: 112, x: bounds.x + Math.max(0, Math.round((bounds.width - 880) / 2)), y: bounds.y + 32, frame: false, transparent: true, resizable: false, alwaysOnTop: true, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  toolbar.setAlwaysOnTop(true, 'screen-saver');
  overlay.setIcon(icon);
  toolbar.setIcon(icon);
  toolbar.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlay.loadFile(path.join(__dirname, 'index.html'));
  toolbar.loadFile(path.join(__dirname, 'toolbar.html'));
  toolbar.on('closed', () => app.quit());
  globalShortcut.register('CommandOrControl+Shift+D', () => passthrough(!ghost));
  globalShortcut.register('CommandOrControl+Shift+Backspace', () => send({ action: 'clear' }));
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
  ipcMain.on('command', (_event, command) => {
    if (command.action === 'quit') return app.quit();
    if (command.action === 'ghost') return passthrough(!ghost);
    if (ghost) passthrough(false);
    send(command);
    if (command.tool === 'text') overlay.focus();
  });
  ipcMain.handle('save', async (_event, data) => {
    if (typeof data !== 'string' || !data.startsWith('data:image/png;base64,')) throw new Error('Expected PNG image');
    const result = await dialog.showSaveDialog(toolbar, { defaultPath: 'ScreenBrush.png', filters: [{ name: 'PNG image', extensions: ['png'] }] });
    if (!result.canceled) await fs.writeFile(result.filePath, Buffer.from(data.slice('data:image/png;base64,'.length), 'base64'));
    return !result.canceled;
  });
}
app.whenReady().then(create);
app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => app.quit());
