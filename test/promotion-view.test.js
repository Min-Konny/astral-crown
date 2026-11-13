import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as G from '../src/game.js';
// Execute the real view functions with a mock modal/DOM, without a browser or save.
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const extract=(name,next)=>source.slice(source.indexOf(`function ${name}(`),source.indexOf(`function ${next}(`));
test('summon offers affordable owned team training without applying it, and hides exhausted choices',()=>{
 const state=G.initialState(),context=vm.createContext({G,state});
 vm.runInContext(extract('summonTraining','summonResult'),context);
 const before=structuredClone(state);
 assert.match(vm.runInContext('summonTraining()',context),/data-training="noel"/);
 assert.match(vm.runInContext('summonTraining()',context),/Lv.1 → 2 \/ 素材 30/);
 assert.deepEqual(state,before);
 state.levels.noel=50;assert.match(vm.runInContext('summonTraining()',context),/data-training="iris"/);
 state.dust=0;assert.equal(vm.runInContext('summonTraining()',context),'');
 state.dust=9999;state.team.forEach(id=>state.levels[id]=50);assert.equal(vm.runInContext('summonTraining()',context),'');
 state.team=[];assert.equal(vm.runInContext('summonTraining()',context),'');
});
test('combat trial distinguishes equipped, unequipped and passive support without granting upgrades',()=>{
 const state=G.initialState();state.counts.noel=10;state.counts.ash=1;state.counts.guard=10;
 const before=structuredClone(state),context=vm.createContext({G,state,fmt:value=>String(value)});
 vm.runInContext(extract('combatTrial','trainingDialog'),context);
 assert.match(vm.runInContext("combatTrial('noel')",context),/編成中・次の戦闘に反映/);
 assert.match(vm.runInContext("combatTrial('ash')",context),/未編成・使うには編成へ/);
 assert.match(vm.runInContext("combatTrial('guard')",context),/編成不要・出撃する全員に反映/);
 assert.equal(vm.runInContext("combatTrial('luna')",context),'');
 assert.equal(vm.runInContext("combatTrial('invalid')",context),'');
 assert.deepEqual(state,before);
});
test('promotion view is skippable, static on reload/reduced motion, and schedules no stale work',()=>{
  const state=G.initialState();state.counts.iris=200;const result=G.promote(state,'iris');
  let html='',reduced=false;const classes=new Set();
  const context=vm.createContext({G,state,structuredClone,fmt:value=>String(value),
    crest:()=>'<div class="portrait"></div>',shortMotion:()=>reduced,
    growthText:(s,id)=>String(G.promotionPower(s,id)),modal:value=>html=value,
    $:()=>({classList:{add:value=>classes.add(value)}}),
    setTimeout:()=>assert.fail('promotion must not schedule delayed callbacks'),
    requestAnimationFrame:()=>assert.fail('promotion uses cancellable CSS only')});
  vm.runInContext(extract('combatTrial','trainingDialog'),context);
  vm.runInContext(extract('promotionResult','wallet'),context);
  const before=structuredClone(state);context.result=result;
  vm.runInContext('promotionResult(result)',context);
  assert.match(html,/第1 → 第4段階/);assert.match(html,/data-action="skip-promotion"/);
  vm.runInContext('skipPromotion();skipPromotion()',context);assert.ok(classes.has('still'));
  vm.runInContext('promotionResult(result,true)',context);assert.match(html,/promotion-view still/);
  reduced=true;vm.runInContext('promotionResult(result)',context);assert.match(html,/promotion-view still/);
  assert.deepEqual(state,before);
});
