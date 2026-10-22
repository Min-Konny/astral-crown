import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {transact,trainTransaction,receipt} from '../src/session.js';
test('all promotion boundaries require a manual action, keep cards, and batch steps',()=>{
  for(const threshold of G.PROMOTION_THRESHOLDS.slice(1))for(const n of [threshold-1,threshold,threshold+1]){
    const s=G.initialState();s.counts.guard=n;s.promotions.guard=1;
    const eligible=G.promotion(n).stage;assert.equal(G.promotionStage(s,'guard'),1);
    if(eligible===1){assert.throws(()=>G.promote(s,'guard'));continue;}
    const r=G.promote(s,'guard');assert.equal(r.to,eligible);assert.equal(s.counts.guard,n);
    assert.throws(()=>G.promote(s,'guard'));assert.equal(G.promotionStage(s,'guard'),eligible);
  }
  assert.equal(G.promotion(10).stage,2);assert.equal(G.promotion(50).stage,3);
  assert.equal(G.promotion(1e15).stage,9);
});
test('legacy saves retain counts and old bonus, acquire no automatic promotion or replay',()=>{
  const s=G.initialState(1000);s.counts.guard=300000;
  delete s.promotions;delete s.mastery;delete s.focus;
  const restored=G.restore(s,1000).state;
  assert.equal(restored.counts.guard,300000);assert.equal(G.promotionStage(restored,'guard'),1);
  assert.equal(G.collectionBonus(restored),G.collectionBonus(s));assert.equal(receipt(restored),null);
});
test('promotion saves atomically and reload or repeated receipt reads never add strength',()=>{
  const s=G.initialState(1000);s.counts.iris=200;let saved;
  const tx=transact({setItem:(k,v)=>saved=v},s,'promotion',s=>G.promote(s,'iris'),1000);
  assert.deepEqual(tx.result,{id:'iris',from:1,to:4});assert.equal(s.promotions.iris,1);
  const raw=JSON.parse(saved),loaded=G.restore(raw,1000).state,before=G.stats(loaded,G.byId('iris'));
  for(let n=0;n<5;n++)assert.equal(receipt(raw).result.to,4);
  assert.deepEqual(G.stats(loaded,G.byId('iris')),before);assert.throws(()=>G.promote(loaded,'iris'));
  assert.throws(()=>transact({setItem(){throw Error('quota');}},s,'promotion',s=>G.promote(s,'iris')),/quota/);
  assert.equal(s.promotions.iris,1);
});
test('skill training gates, insufficient materials and repeated clicks are bounded',()=>{
  const s=G.initialState();assert.throws(()=>G.trainSkill(s,'iris'));
  s.campaignCleared=2;s.levels.iris=6;s.dust=450;
  G.trainSkill(s,'iris');G.trainSkill(s,'iris');assert.equal(s.dust,0);assert.equal(s.mastery.iris,2);
  assert.throws(()=>G.trainSkill(s,'iris'));
  const before=structuredClone(s);assert.throws(()=>G.trainSkill(s,'mira'));assert.deepEqual(s,before);
});
test('focus is reversible and low-rarity training supports heroes without taking a team slot',()=>{
  const s=G.initialState();s.counts.herbalist=50;s.promotions.herbalist=1;G.promote(s,'herbalist');
  const team=[...s.team],c=G.byId('noel'),power=G.stats(s,c);
  G.chooseFocus(s,'herbalist','guard');const guard=G.stats(s,c);
  assert.ok(guard.hp>power.hp);assert.ok(guard.atk<power.atk);assert.deepEqual(s.team,team);
  G.chooseFocus(s,'herbalist','power');assert.deepEqual(G.stats(s,c),power);
  const before=structuredClone(s);assert.throws(()=>trainTransaction({setItem(){throw Error('quota');}},s,t=>G.chooseFocus(t,'herbalist','guard')),/quota/);assert.deepEqual(s,before);
});
test('trained skills produce stronger real combat effects and persist across reload',()=>{
  const s=G.initialState(1000);s.campaignCleared=2;s.levels.iris=6;s.dust=450;
  const enemy=G.missionEnemy(0);enemy.units.forEach(u=>{u.hp=100000;u.atk=1;});
  const shot=s=>G.battle(s,enemy).frames.find(f=>f.side==='a'&&f.actor==='iris'&&f.turn===3).amount;
  const before=shot(s);let raw;
  const next=trainTransaction({setItem:(k,v)=>raw=v},s,t=>G.trainSkill(t,'iris'),1000);
  assert.ok(shot(next)>before);assert.equal(shot(G.restore(JSON.parse(raw),1000).state),shot(next));
});
test('ranking enemies keep published single-target skills while patrol enemies use role skills',()=>{
  const s=G.initialState();s.team.forEach(id=>s.levels[id]=15);s.rank=1;
  const ranked=G.battle(s),patrol=G.battle(s,{...G.rival(s),rank:undefined});
  assert.equal(ranked.frames.some(f=>f.side==='b'&&f.kind==='guard'),false);
  assert.ok(patrol.frames.some(f=>f.side==='b'&&f.kind==='guard'));
  const hits=ranked.frames.filter(f=>f.side==='b'&&f.actor==='ash'&&f.turn===3);assert.equal(hits.length,1);
});
