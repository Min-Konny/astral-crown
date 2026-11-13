import test from 'node:test';
import assert from 'node:assert/strict';
import {allowedChange,reviewDecision} from '../scripts/factory/gates.mjs';
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
