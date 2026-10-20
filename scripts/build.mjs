import { mkdir, copyFile, readFile } from 'node:fs/promises';
const files = ['index.html', 'src/app.js', 'src/game.js', 'src/style.css', 'docs/requirements.md'];
for (const file of files) {
  const target = new URL(`../dist/${file}`, import.meta.url);
  await mkdir(new URL('.', target), { recursive: true });
  await copyFile(new URL(`../${file}`, import.meta.url), target);
}
const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
if (/(?:src|href)="\/(?!\/)/.test(html)) throw new Error('Root-relative asset URL breaks project Pages hosting');
console.log(`Built ${files.length} public game files in dist/`);
