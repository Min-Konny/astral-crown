import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {transact,receipt} from '../src/session.js';
test('every character preserves old confirmed power and rejects invalid confirmation records',()=>{
 for(const c of G.CHARACTERS){
  const old=G.initialState();delete old.confirmedCounts;old.counts[c.id]=49;old.promotions[c.id]=2;
  const s=G.restore(old).state;assert.equal(s.confirmedCounts[c.id],49);
  s.counts[c.id]=50;G.promote(s,c.id);assert.equal(s.confirmedCounts[c.id],50);
  assert.equal(G.restore(JSON.parse(JSON.stringify(s))).state.confirmedCounts[c.id],50);
  for(const invalid of [-1,51,0.5,Infinity]){
   const bad=structuredClone(s);bad.confirmedCounts[c.id]=invalid;assert.throws(()=>G.validateSave(bad));
  }
 }
});
test('repeated acquisition changes cards but no confirmed ability until manual promotion',()=>{
 let s=G.initialState();s.gems=30000;const before=G.stats(s,G.byId('noel'));
 G.summon(s,10,'standard',()=>0);assert.equal(s.counts.guard,10);assert.equal(s.promotions.guard,1);
 assert.deepEqual(G.stats(s,G.byId('noel')),before);
 s=G.restore(JSON.parse(JSON.stringify(s))).state;assert.equal(s.confirmedCounts.guard,0);
 const viewed=structuredClone(s);G.collectionCandidates(s,'promotion');assert.deepEqual(s,viewed);
 let saved;const tx=transact({setItem:(k,v)=>saved=v},s,'promotion',x=>G.promote(x,'guard'));
 s=tx.state;assert.equal(s.confirmedCounts.guard,10);assert.ok(G.stats(s,G.byId('noel')).atk>before.atk);
 const stats=G.stats(s,G.byId('noel'));G.summon(s,10,'standard',()=>0);assert.deepEqual(G.stats(s,G.byId('noel')),stats);
 assert.equal(receipt(JSON.parse(saved)).result.to,2);assert.throws(()=>G.promote(s,'guard'));
});
test('failed promotion storage and reload never apply extra power; batch and max remain bounded',()=>{
 const s=G.initialState();s.counts.guard=300000;s.promotions.guard=1;const before=structuredClone(s);
 assert.throws(()=>transact({setItem(){throw Error('full');}},s,'promotion',x=>G.promote(x,'guard')));assert.deepEqual(s,before);
 const tx=transact({setItem(){}},s,'promotion',x=>G.promote(x,'guard'));assert.equal(tx.result.to,9);
 const loaded=G.restore(JSON.parse(JSON.stringify(tx.state))).state;
 assert.equal(G.collectionBonus(loaded),.25);assert.throws(()=>G.promote(loaded,'guard'));
 loaded.counts.guard++;assert.equal(G.collectionBonus(loaded),.25);
});
test('old saves preserve all acquired legacy bonus and hero awakening, later pulls stay pending',()=>{
 const old=G.initialState();delete old.confirmedCounts;delete old.promotions;old.counts.guard=1234;old.counts.luna=6;
 const before=G.stats(old,G.byId('luna'));const s=G.restore(JSON.parse(JSON.stringify(old))).state;
 assert.deepEqual(G.stats(s,G.byId('luna')),before);assert.equal(s.confirmedCounts.guard,1234);
 s.gems=3000;G.summon(s,10,'standard',()=>0);assert.deepEqual(G.stats(s,G.byId('luna')),before);
 assert.deepEqual(G.restore(JSON.parse(JSON.stringify(s))).state.confirmedCounts,s.confirmedCounts);
});
test('between thresholds copies wait for next milestone; old power is replaced, never added twice',()=>{
 const old=G.initialState();delete old.confirmedCounts;
 old.counts.guard=20;old.promotions.guard=2;
 const s=G.restore(JSON.parse(JSON.stringify(old))).state;
 const legacy=G.collectionBonus(s);s.counts.guard=49;
 assert.equal(G.collectionBonus(s),legacy);assert.throws(()=>G.promote(s,'guard'));
 assert.equal(G.PROMOTION_THRESHOLDS[G.promotionStage(s,'guard')],50);
 s.counts.guard=50;G.promote(s,'guard');
 assert.equal(s.confirmedCounts.guard,50);assert.equal(s.counts.guard,50);
 assert.equal(G.collectionBonus(s),Math.sqrt(50/100000)*.25);
 assert.equal(G.restore(JSON.parse(JSON.stringify(s))).state.confirmedCounts.guard,50);
});
test('hero duplicate power also waits for manual promotion, including maximum stage',()=>{
 const s=G.initialState(),c=G.byId('iris'),base=G.stats(s,c);
 s.counts.iris=9;assert.deepEqual(G.stats(s,c),base);
 s.counts.iris=10;assert.deepEqual(G.stats(s,c),base);G.promote(s,'iris');
 assert.equal(G.awakening(s,c),9);const promoted=G.stats(s,c);
 s.counts.iris=49;assert.deepEqual(G.stats(s,c),promoted);
 s.counts.iris=300000;G.promote(s,'iris');const capped=G.stats(s,c);
 s.counts.iris=1e9;assert.deepEqual(G.stats(s,c),capped);assert.throws(()=>G.promote(s,'iris'));
});
