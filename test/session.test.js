import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {transact,receipt,SAVE_KEY} from '../src/session.js';
const memory=()=>{const values=new Map();return {getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};};
test('old v1 saves remain valid without a presentation receipt',()=>{
  const old=G.initialState(1000);const restored=G.restore(JSON.parse(JSON.stringify(old)),1000).state;
  assert.deepEqual(restored,old);assert.equal(receipt(old),null);
});
test('summon resources and replay receipt commit together; reload never rerolls',()=>{
  const store=memory(),old=G.initialState(1000);let calls=0;
  const tx=transact(store,old,'summon',s=>G.summon(s,10,'pickup',()=>{calls++;return .1;}),1000);
  assert.equal(old.gems,3000);assert.equal(tx.state.gems,0);
  const raw=JSON.parse(store.getItem(SAVE_KEY)),loaded=G.restore(raw,1000).state,replay=receipt(raw),before=calls;
  assert.equal(replay.kind,'summon');assert.equal(replay.result.n,10);assert.deepEqual(replay.result.counts,tx.result.counts);
  assert.equal(loaded.gems,0);assert.equal(loaded.pulls,10);assert.equal(calls,before);
});
test('failed save aborts resource mutation and receipt',()=>{
  const state=G.initialState(),before=structuredClone(state);
  assert.throws(()=>transact({setItem(){throw Error('quota');}},state,'summon',s=>G.summon(s,10)),/quota/);
  assert.deepEqual(state,before);
});
test('battle replay contains only already-committed rewards',()=>{
  const state=G.initialState(1000),store=memory();state.levels.noel=50;state.levels.iris=50;state.levels.mira=50;
  const tx=transact(store,state,'battle',s=>{const r=G.battle(s);G.applyBattle(s,r);return r;},1000);
  assert.equal(tx.result.win,true);assert.equal(tx.state.rank,95);
  const raw=JSON.parse(store.getItem(SAVE_KEY)),loaded=G.restore(raw,1000).state,replay=receipt(raw);
  assert.equal(replay.result.rank,95);assert.equal(loaded.cash,state.cash+tx.result.reward.cash);
  assert.equal(loaded.dust,state.dust+tx.result.reward.dust);
  assert.throws(()=>G.applyBattle(tx.state,tx.result),/反映済み/);
});
test('structured battle events reconstruct the complete HP history',()=>{
  const s=G.initialState();const r=G.battle(s);
  const hp={a:Object.fromEntries(r.allies.map(u=>[u.id,u.hp])),b:Object.fromEntries(r.enemy.units.map(u=>[u.id,u.hp]))};
  for(const f of r.frames){
    assert.ok(hp[f.side][f.actor]>0);assert.ok(Number.isFinite(f.amount)&&f.amount>=0);
    const before=hp[f.targetSide][f.target];
    hp[f.targetSide][f.target]=f.kind==='heal'?before+f.amount:Math.max(0,before-f.amount);
    for(const side of ['a','b'])for(const u of f[side])assert.equal(u.hp,hp[side][u.id]);
  }
});
test('malformed receipts cannot inject characters or reward fields',()=>{
  assert.equal(receipt({presentation:{kind:'summon',result:{n:10,counts:{'<script>':10},rarities:{},before:0,after:0}}}),null);
  assert.equal(receipt({presentation:{kind:'battle',result:{win:true,rank:1,reward:{cash:Infinity,dust:1}}}}),null);
});
