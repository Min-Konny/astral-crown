import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedChange,reviewComment,reviewDecision} from '../scripts/factory/gates.mjs';
const passed={verdict:'pass',summary:'画像と実装を確認',referenceViewed:true,screenshotsViewed:true,unverified:[],findings:[]};
test('factory never approves missing visual evidence, even for a claimed pass',()=>{
  for(const field of ['referenceViewed','screenshotsViewed'])for(const value of [false,undefined,'true',1]){
    const blocked=reviewDecision({...passed,[field]:value});
    assert.equal(blocked.verdict,'blocked');
    assert.equal(blocked.needsDecision,true);
    assert.ok(blocked.findings.length);
  }
  assert.equal(reviewDecision(passed).verdict,'pass');
  assert.equal(reviewDecision({...passed,findings:['ボタンが隠れる']}).verdict,'revise');
  assert.throws(()=>reviewDecision({...passed,verdict:'approved'}));
  assert.throws(()=>reviewDecision({...passed,findings:null}));
  assert.throws(()=>reviewDecision({...passed,unverified:null}));
  assert.equal(reviewDecision({...passed,verdict:'revise'}).verdict,'blocked');
});
test('factory rejects economy, save, test, workflow and traversal changes',()=>{
  for(const file of ['src/game.js','src/session.js','test/game.test.js','qa/royal-ui.spec.js','.github/workflows/pages.yml','package.json','assets/redesign/../../secret.png','docs/visual-verification/../secret.png','docs/art-provenance/../secret.md'])assert.equal(allowedChange(file),false,file);
  for(const file of ['src/royal-ui.css','src/app.js','assets/redesign/home.webp','docs/visual-verification/home/desktop.png','docs/art-provenance/lune.md'])assert.equal(allowedChange(file),true,file);
});

test('PR comments bind the verdict and capture link to the pushed commit',()=>{
  const sha='a'.repeat(40),url=`https://github.com/Min-Konny/astral-crown/tree/${sha}/docs/visual-verification/home`;
  const lines=reviewComment(passed,sha,url).split('\n');
  assert.equal(lines[0],'[レビュー] pass');
  assert.ok(lines[1].includes(sha));
  assert.ok(lines.at(-1).includes(url));
  assert.ok(lines.includes('## 未確認のもの'));
  assert.throws(()=>reviewComment(passed,sha,undefined));
  assert.throws(()=>reviewComment(passed,sha,url.replace(sha,'b'.repeat(40))));
  assert.match(reviewComment({...passed,verdict:'blocked'},sha,url),/^\[レビュー\] revise/);
  assert.throws(()=>reviewComment(passed,'$head',url));
});
