import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {resourceTransaction,SAVE_KEY} from '../src/session.js';

for(const [name,action] of [
  ['purchase',s=>G.buy(s,G.PACKS[0].id,10)],
  ['ascension',s=>G.ascend(s,1000)],
  ['facility',G.upgradeFacility],['mail',G.claimMail]
])test(`${name}: failed writes preserve all progress; retry commits exactly once and reload agrees`,()=>{
  const state=G.initialState(1000);state.rank=50;state.bestRank=50;state.seals=7;
  state.levels.noel=9;state.counts.guard=50;state.confirmedCounts.guard=10;state.promotions.guard=2;
  state.mastery.noel=1;state.focus.noel='guard';
  const original=structuredClone(state),expected=structuredClone(state);action(expected);
  let saved=JSON.stringify(state),fail=true,writes=0;
  const storage={setItem(k,v){assert.equal(k,SAVE_KEY);if(fail)throw Error('quota');saved=v;writes++;}};
  for(let i=0;i<3;i++)assert.throws(()=>resourceTransaction(storage,state,action,1000),/quota/);
  assert.deepEqual(state,original);assert.deepEqual(JSON.parse(saved),original);assert.equal(writes,0);
  fail=false;const tx=resourceTransaction(storage,state,action,1000);
  assert.deepEqual(tx.state,expected);assert.deepEqual(state,original);assert.equal(writes,1);
  assert.deepEqual(G.restore(JSON.parse(saved),1000).state,expected);
  if(name==='ascension'||name==='mail'){
    assert.throws(()=>resourceTransaction(storage,tx.state,action,1000));assert.equal(writes,1);
  }
});
