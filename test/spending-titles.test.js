import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {resourceTransaction} from '../src/session.js';
test('cosmetic spending titles derive at exact thresholds without changing state',()=>{
 for(const [i,t] of G.SPENDING_TITLES.entries()){
  assert.equal(G.spendingTitles(t.amount-1).unlocked.length,i);
  assert.equal(G.spendingTitles(t.amount).unlocked.length,i+1);
  assert.equal(G.spendingTitles(t.amount+1).unlocked.length,i+1);
 }
 assert.equal(G.spendingTitles(0).next.id,'first');assert.equal(G.spendingTitles(1e15).next,null);
});
test('legacy spending restores titles, ascension preserves them, failed purchases never unlock',()=>{
 const s=G.initialState(1000);s.spent=99999;s.cash=10000;s.rank=50;s.bestRank=50;
 const before=structuredClone(s),prior=G.spendingTitles(s.spent);
 assert.throws(()=>resourceTransaction({setItem(){throw Error('quota');}},s,x=>G.buy(x,'small'),1000),/quota/);
 assert.deepEqual(s,before);assert.deepEqual(G.spendingTitles(s.spent),prior);
 let raw;const tx=resourceTransaction({setItem(k,v){raw=v;}},s,x=>G.buy(x,'small'),1000);
 assert.equal(G.spendingTitles(tx.state.spent).unlocked.length,3);
 const old=G.restore(JSON.parse(raw),1000).state;assert.deepEqual(G.spendingTitles(old.spent),G.spendingTitles(tx.state.spent));
 G.ascend(old,1000);assert.deepEqual(G.spendingTitles(old.spent),G.spendingTitles(tx.state.spent));
 assert.equal('titles' in old,false);
});
