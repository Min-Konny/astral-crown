import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedChange,reviewComment,reviewDecision} from '../scripts/factory/gates.mjs';
const passed={verdict:'pass',summary:'画像と実装を確認',referenceViewed:true,screenshotsViewed:true,findings:[]};
test('factory never approves missing visual evidence, even for a claimed pass',()=>{
  for(const field of ['referenceViewed','screenshotsViewed'])for(const value of [false,undefined,'true',1]){
    assert.equal(reviewDecision({...passed,[field]:value}).verdict,'blocked');
  }
  assert.equal(reviewDecision(passed).verdict,'pass');
  assert.equal(reviewDecision({...passed,findings:['ボタンが隠れる']}).verdict,'revise');
  assert.throws(()=>reviewDecision({...passed,verdict:'approved'}));
  assert.throws(()=>reviewDecision({...passed,findings:null}));
});
test('factory rejects economy, save, test, workflow and traversal changes',()=>{
  for(const file of ['src/game.js','src/session.js','test/game.test.js','qa/royal-ui.spec.js','.github/workflows/pages.yml','package.json','assets/redesign/../../secret.png'])assert.equal(allowedChange(file),false,file);
  for(const file of ['src/royal-ui.css','src/app.js','assets/redesign/home.webp'])assert.equal(allowedChange(file),true,file);
});

test('PR comments bind the verdict and capture link to the pushed commit',()=>{
  const sha='a'.repeat(40),url=`https://github.com/Min-Konny/astral-crown/tree/${sha}/docs/visual-verification/home`;
  const lines=reviewComment(passed,sha,url).split('\n');
  assert.equal(lines[0],'[レビュー] pass');
  assert.ok(lines[1].includes(sha));
  assert.ok(lines.at(-1).includes(url));
  assert.match(reviewComment({...passed,verdict:'blocked'},sha,url),/^\[レビュー\] revise/);
  assert.throws(()=>reviewComment(passed,'$head',url));
});
