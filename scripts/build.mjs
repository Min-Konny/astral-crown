import { mkdir, copyFile, readFile } from 'node:fs/promises';
import './prepare.mjs';
import {CHARACTERS} from '../src/game.js';
const files = [...CHARACTERS.map(({id})=>'assets/redesign/portrait-'+id+'.webp'), 'assets/redesign/lune-summon.webp', 'src/illustrated-ui.css', 'assets/redesign/nav-icons.webp', 'assets/redesign/hud-plate.webp', 'assets/redesign/nav-active.webp', 'assets/redesign/summon-gold.webp', 'assets/redesign/banner-frame.webp', 'index.html', 'src/app.js', 'src/game.js', 'src/session.js', 'src/scenes.js', 'src/character-art.js', 'src/style.css', 'src/game-ui.css', 'src/royal-ui.css', 'src/royal-ui.js', 'assets/redesign/pack-small.webp', 'assets/redesign/pack-medium.webp', 'assets/redesign/pack-large.webp', 'assets/redesign/workroom.webp', 'assets/redesign/observatory.webp', 'assets/redesign/colosseum.webp', 'assets/redesign/luna-court.webp', 'docs/requirements.md', 'assets/luna.webp', 'assets/garden.webp', 'assets/party.webp', 'assets/noel-chibi.webp', 'assets/iris-chibi.webp', 'assets/mira-chibi.webp', 'assets/sol-chibi.webp', 'assets/ash-chibi.webp', 'assets/flora-chibi.webp', 'assets/luna-chibi.webp', 'assets/sage-chibi.webp', 'assets/scholar-chibi.webp', 'assets/ranger-chibi.webp', 'assets/smith-chibi.webp', 'assets/guard-chibi.webp', 'assets/herbalist-chibi.webp', 'vendor/phaser.min.js', 'vendor/PHASER-LICENSE.md', 'vendor/THIRD-PARTY-NOTICES.txt'];
for (const file of files) {
  const target = new URL(`../dist/${file}`, import.meta.url);
  await mkdir(new URL('.', target), { recursive: true });
  await copyFile(new URL(`../${file}`, import.meta.url), target);
}
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
if (/(?:src|href)="\/(?!\/)/.test(html)) throw new Error('Root-relative asset URL breaks project Pages hosting');
console.log(`Built ${files.length} public game files in dist/`);
