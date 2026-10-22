import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as G from '../src/game.js';
// Execute the real view functions with a mock modal/DOM, without a browser or save.
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const extract=(name,next)=>source.slice(source.indexOf(`function ${name}(`),source.indexOf(`function ${next}(`));
test('promotion view is skippable, static on reload/reduced motion, and schedules no stale work',()=>{
  const state=G.initialState();state.counts.iris=200;const result=G.promote(state,'iris');
  let html='',reduced=false;const classes=new Set();
  const context=vm.createContext({G,state,structuredClone,
    crest:()=>'<div class="portrait"></div>',shortMotion:()=>reduced,
    growthText:(s,id)=>String(G.promotionPower(s,id)),modal:value=>html=value,
    $:()=>({classList:{add:value=>classes.add(value)}}),
    setTimeout:()=>assert.fail('promotion must not schedule delayed callbacks'),
    requestAnimationFrame:()=>assert.fail('promotion uses cancellable CSS only')});
  vm.runInContext(extract('promotionResult','wallet'),context);
  const before=structuredClone(state);context.result=result;
  vm.runInContext('promotionResult(result)',context);
  assert.match(html,/第1 → 第4段階/);assert.match(html,/data-action="skip-promotion"/);
  vm.runInContext('skipPromotion();skipPromotion()',context);assert.ok(classes.has('still'));
  vm.runInContext('promotionResult(result,true)',context);assert.match(html,/promotion-view still/);
  reduced=true;vm.runInContext('promotionResult(result)',context);assert.match(html,/promotion-view still/);
  assert.deepEqual(state,before);
});
