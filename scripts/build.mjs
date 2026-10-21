import { mkdir, copyFile, readFile } from 'node:fs/promises';
import './prepare.mjs';
const files = ['index.html', 'src/app.js', 'src/game.js', 'src/session.js', 'src/scenes.js', 'src/style.css', 'src/game-ui.css', 'docs/requirements.md', 'assets/luna.png', 'assets/garden.png', 'assets/party.png', 'vendor/phaser.min.js', 'vendor/PHASER-LICENSE.md', 'vendor/THIRD-PARTY-NOTICES.txt'];
for (const file of files) {
  const target = new URL(`../dist/${file}`, import.meta.url);
  await mkdir(new URL('.', target), { recursive: true });
  await copyFile(new URL(`../${file}`, import.meta.url), target);
}
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
if (/(?:src|href)="\/(?!\/)/.test(html)) throw new Error('Root-relative asset URL breaks project Pages hosting');
console.log(`Built ${files.length} public game files in dist/`);
