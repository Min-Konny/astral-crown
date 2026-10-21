import {mkdir,copyFile} from 'node:fs/promises';
import {writeNotices} from './notices.mjs';
await mkdir(new URL('../vendor/',import.meta.url),{recursive:true});
await copyFile(new URL('../node_modules/phaser/dist/phaser.min.js',import.meta.url),new URL('../vendor/phaser.min.js',import.meta.url));
await copyFile(new URL('../node_modules/phaser/LICENSE.md',import.meta.url),new URL('../vendor/PHASER-LICENSE.md',import.meta.url));
await writeNotices();
