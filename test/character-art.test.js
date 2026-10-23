import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CHARACTER_ART,characterArt,portraitHTML} from '../src/character-art.js';
import {CHARACTERS} from '../src/game.js';
test('three unique starter PNGs share one mapping and preserve legacy fallback frames',()=>{
 assert.equal(new Set(Object.values(CHARACTER_ART)).size,13);
 for(const [id,frame] of [['noel',1],['iris',2],['mira',3]]){
  const a=characterArt(id),png=readFileSync(new URL('../'+a.src,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6,'RGBA PNG');
  assert(png.readUInt32BE(16)>=1000&&png.readUInt32BE(20)>=1000);assert.equal(a.frame,frame);assert.match(portraitHTML(id),new RegExp(id+'-chibi.png'));
 }
 assert.equal(characterArt('unknown').src,null);assert(!portraitHTML('unknown').includes('<img'));
});
test('patrol shield, swordsman and support have distinct RGBA art and original atlas fallbacks',()=>{
 for(const [id,frame] of [['sol',1],['ash',1],['flora',3]]){
  const a=characterArt(id),png=readFileSync(new URL('../'+a.src,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);
  assert(png.readUInt32BE(16)>=1000&&png.readUInt32BE(20)>=1000);
  assert.equal(a.frame,frame);assert.match(portraitHTML(id),new RegExp(id+'-chibi.png'));
 }
 assert.notEqual(characterArt('sol').src,characterArt('ash').src);
});
test('three formerly identical mages have separate images while sharing their original fallback',()=>{
 for(const id of ['luna','sage','scholar']){
  const a=characterArt(id),png=readFileSync(new URL('../'+a.src,import.meta.url));
  assert.equal(a.frame,0);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);
  assert(png.readUInt32BE(16)>=1000&&png.readUInt32BE(20)>=1000);
  assert.match(portraitHTML(id),new RegExp(id+'-chibi.png'));
 }
 assert.equal(new Set(['luna','sage','scholar'].map(id=>characterArt(id).src)).size,3);
});
test('all 13 existing identities have unique valid RGBA assets in the explicit build and preserve atlas fallbacks',()=>{
 const build=readFileSync(new URL('../scripts/build.mjs',import.meta.url),'utf8');
 const frames={luna:0,sol:1,flora:3,iris:2,ash:1,noel:1,mira:3,sage:0,ranger:2,smith:1,guard:1,scholar:0,herbalist:3};
 assert.deepEqual(Object.keys(CHARACTER_ART).sort(),CHARACTERS.map(c=>c.id).sort());
 for(const c of CHARACTERS){const a=characterArt(c.id),png=readFileSync(new URL('../'+a.src,import.meta.url));
  assert.equal(a.frame,frames[c.id]);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6);
  assert(png.readUInt32BE(16)>=1000&&png.readUInt32BE(20)>=1000);assert.ok(build.includes(a.src.slice(2)));
 }
});
