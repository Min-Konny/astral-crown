import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STARTER_ART,characterArt,portraitHTML} from '../src/character-art.js';
test('three unique starter PNGs share one mapping and preserve legacy fallback frames',()=>{
 assert.equal(new Set(Object.values(STARTER_ART)).size,3);
 for(const [id,frame] of [['noel',1],['iris',2],['mira',3]]){
  const a=characterArt(id),png=readFileSync(new URL('../'+a.src,import.meta.url));
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png[25],6,'RGBA PNG');
  assert(png.readUInt32BE(16)>=1000&&png.readUInt32BE(20)>=1000);assert.equal(a.frame,frame);assert.match(portraitHTML(id),new RegExp(id+'-chibi.png'));
 }
 for(const [id,frame] of [['sol',1],['ash',1],['ranger',2],['flora',3]]){assert.equal(characterArt(id).src,null);assert.equal(characterArt(id).frame,frame);assert(!portraitHTML(id).includes('<img'));}
});
