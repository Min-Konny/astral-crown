import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createNotices} from '../scripts/notices.mjs';
test('build ships complete original third-party notices beside the unchanged engine',async()=>{
  execFileSync(process.execPath,['scripts/build.mjs']);
  const generated=await createNotices();
  assert.equal(await readFile('dist/vendor/THIRD-PARTY-NOTICES.txt','utf8'),generated);
  for(const p of ['node_modules/eventemitter3/LICENSE','node_modules/phaser/src/physics/matter-js/lib/license.js'])
    assert.ok(generated.includes(await readFile(p,'utf8')));
  for(const [p,credit]of [['Earcut.js','Mapbox'],['Simplify.js','Vladimir Agafonkin']]){
    const source=await readFile('node_modules/phaser/src/geom/polygon/'+p,'utf8');
    const notice=source.match(/\/\*[\s\S]*?\*\//g).find(c=>c.includes(credit)&&c.includes('Copyright'));
    assert.ok(notice&&generated.includes(notice));
  }
  assert.deepEqual(await readFile('dist/vendor/phaser.min.js'),await readFile('node_modules/phaser/dist/phaser.min.js'));
});
