import { mkdir, copyFile, readFile } from 'node:fs/promises';
import './prepare.mjs';
const files = ['assets/redesign/lune-summon.png', 'src/illustrated-ui.css', 'assets/redesign/nav-icons.png', 'assets/redesign/hud-plate.png', 'assets/redesign/nav-active.png', 'assets/redesign/summon-gold.png', 'assets/redesign/banner-frame.png', 'index.html', 'src/app.js', 'src/game.js', 'src/session.js', 'src/scenes.js', 'src/character-art.js', 'src/style.css', 'src/game-ui.css', 'src/royal-ui.css', 'src/royal-ui.js', 'assets/redesign/pack-small.webp', 'assets/redesign/pack-medium.webp', 'assets/redesign/pack-large.webp', 'assets/redesign/workroom.webp', 'assets/redesign/observatory.webp', 'assets/redesign/colosseum.webp', 'assets/redesign/luna-court.webp', 'docs/requirements.md', 'assets/luna.png', 'assets/garden.png', 'assets/party.png', 'assets/noel-chibi.png', 'assets/iris-chibi.png', 'assets/mira-chibi.png', 'assets/sol-chibi.png', 'assets/ash-chibi.png', 'assets/flora-chibi.png', 'assets/luna-chibi.png', 'assets/sage-chibi.png', 'assets/scholar-chibi.png', 'assets/ranger-chibi.png', 'assets/smith-chibi.png', 'assets/guard-chibi.png', 'assets/herbalist-chibi.png', 'vendor/phaser.min.js', 'vendor/PHASER-LICENSE.md', 'vendor/THIRD-PARTY-NOTICES.txt'];
for (const file of files) {
  const target = new URL(`../dist/${file}`, import.meta.url);
  await mkdir(new URL('.', target), { recursive: true });
  await copyFile(new URL(`../${file}`, import.meta.url), target);
}
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
if (/(?:src|href)="\/(?!\/)/.test(html)) throw new Error('Root-relative asset URL breaks project Pages hosting');
console.log(`Built ${files.length} public game files in dist/`);
