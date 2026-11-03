const { app, BrowserWindow, nativeImage } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.disableHardwareAcceleration();
app.whenReady().then(async () => {
  try {
    const folder = path.resolve(__dirname, '../assets');
    const svg = await fs.readFile(path.join(folder, 'icon.svg'), 'utf8');
    const window = new BrowserWindow({ show: false, width: 512, height: 512, webPreferences: { contextIsolation: true, nodeIntegration: false } });
    await window.loadURL('data:text/html,<canvas width="512" height="512"></canvas>');
    const png = await window.webContents.executeJavaScript(`new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.querySelector('canvas');
        canvas.getContext('2d').drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      image.onerror = () => reject(new Error('SVG could not be rendered'));
      image.src = ${JSON.stringify('data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64'))};
    })`);
    const source = Buffer.from(png.split(',')[1], 'base64');
    await fs.writeFile(path.join(folder, 'icon.png'), source);
    const sizes = [16, 24, 32, 48, 64, 128, 256];
    const images = sizes.map(size => nativeImage.createFromBuffer(source).resize({ width: size, height: size, quality: 'best' }).toPNG());
    const header = Buffer.alloc(6 + sizes.length * 16);
    header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
    let offset = header.length;
    sizes.forEach((size, index) => {
      const entry = 6 + index * 16;
      header[entry] = size === 256 ? 0 : size;
      header[entry + 1] = size === 256 ? 0 : size;
      header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
      header.writeUInt32LE(images[index].length, entry + 8); header.writeUInt32LE(offset, entry + 12);
      offset += images[index].length;
    });
    await fs.writeFile(path.join(folder, 'icon.ico'), Buffer.concat([header, ...images]));
    console.log('Created assets/icon.png and assets/icon.ico (7 resolutions)');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
