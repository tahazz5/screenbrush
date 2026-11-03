// Run with Electron: electron test/smoke.cjs. Opens the app briefly, then exits.
const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
require('../src/main.cjs');
const deadline = setTimeout(() => { console.error('Startup check timed out'); app.exit(1); }, 20000);
app.whenReady().then(async () => {
  try {
    const windows = BrowserWindow.getAllWindows();
    assert.equal(windows.length, 2);
    await Promise.all(windows.map(window => window.webContents.isLoading()
      ? new Promise((resolve, reject) => {
        window.webContents.once('did-finish-load', resolve);
        window.webContents.once('did-fail-load', (_event, code, description) => reject(new Error(`${code}: ${description}`)));
      }) : Promise.resolve()));
    const overlay = windows.find(window => window.webContents.getURL().endsWith('/index.html'));
    const toolbar = windows.find(window => window.webContents.getURL().endsWith('/toolbar.html'));
    assert.ok(overlay); assert.ok(toolbar);
    const topmost = { overlay: overlay.isAlwaysOnTop(), toolbar: toolbar.isAlwaysOnTop() };
    if (!/microsoft/i.test(require('node:os').release())) {
      assert.ok(topmost.overlay); assert.ok(topmost.toolbar);
    }
    await toolbar.webContents.executeJavaScript(`window.dispatchEvent(new KeyboardEvent('keydown', {key:'a', bubbles:true}))`);
    const selectedTool = await overlay.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const deadline = Date.now() + 2000;
      const check = () => tool === 'arrow' ? resolve(tool) : Date.now() > deadline ? reject(new Error('Toolbar shortcut was not delivered')) : setTimeout(check, 20);
      check();
    })`);
    assert.equal(selectedTool, 'arrow');
    assert.equal(await toolbar.webContents.executeJavaScript(`document.querySelector('[data-tool="arrow"]').classList.contains('active')`), true);
    const result = await overlay.webContents.executeJavaScript(`(() => {
      current = null;
      commit({tool:'line', color:'#ff526c', width:10, points:[{x:100,y:150},{x:200,y:150}]});
      render();
      const at = () => Array.from(ctx.getImageData(150*devicePixelRatio, 150*devicePixelRatio, 1, 1).data);
      const drawn = at();
      command({action:'clear'}); const cleared = at();
      command({action:'undo'}); const restored = at();
      command({action:'whiteboard'});
      const background = Array.from(ctx.getImageData(20*devicePixelRatio, 20*devicePixelRatio, 1, 1).data);
      command({action:'whiteboard'});
      return {drawn, cleared, restored, background};
    })()`);
    assert.equal(result.drawn[3], 255);
    assert.equal(result.cleared[3], 0);
    assert.deepEqual(result.restored, result.drawn);
    assert.equal(result.background[3], 255);
    await fs.writeFile('/tmp/screenbrush-toolbar.png', (await toolbar.webContents.capturePage()).toPNG());
    console.log('PASS: both windows loaded; toolbar keyboard routing and selection, real canvas drawing, clear, undo and whiteboard passed. Toolbar screenshot: /tmp/screenbrush-toolbar.png');
    console.log('Compositor always-on-top status:', topmost);
    clearTimeout(deadline); app.exit(0);
  } catch (error) { console.error(error); clearTimeout(deadline); app.exit(1); }
});
