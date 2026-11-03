const fs = require('node:fs/promises');
const path = require('node:path');
async function build() {
  const { downloadArtifact } = await import('@electron/get');
  const { extract } = await import('@electron-internal/extract-zip');
  const version = require('electron/package.json').version;
  const root = path.resolve(__dirname, '..');
  const destination = path.join(root, 'build', 'windows');
  const zip = await downloadArtifact({
    version, artifactName: 'electron', platform: 'win32', arch: 'x64',
    cacheRoot: path.join(root, 'build', 'cache'),
    checksums: require('electron/checksums.json')
  });
  await fs.mkdir(destination, { recursive: true });
  await extract(zip, { dir: destination });
  const app = path.join(destination, 'resources', 'app');
  await fs.mkdir(app, { recursive: true });
  await fs.cp(path.join(root, 'src'), path.join(app, 'src'), { recursive: true });
  await fs.cp(path.join(root, 'assets'), path.join(app, 'assets'), { recursive: true });
  await fs.writeFile(path.join(app, 'package.json'), JSON.stringify({ name: 'screenbrush-rebuild', version: '0.1.0', main: 'src/main.cjs' }, null, 2));
  console.log(`Native Windows app prepared: ${destination}`);
}
build().catch(error => { console.error(error); process.exitCode = 1; });
