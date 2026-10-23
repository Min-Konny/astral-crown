import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {transact,receipt} from '../src/session.js';
const run=(s,id)=>{const r=G.campaignBattle(s,id);G.applyCampaign(s,r);return r;};
test('all six starter-party orders can clear all patrols with training',()=>{
  for(const team of [['noel','iris','mira'],['noel','mira','iris'],['iris','noel','mira'],['iris','mira','noel'],['mira','noel','iris'],['mira','iris','noel']]){
    const s=G.initialState();s.team=team;s.team.forEach(id=>s.levels[id]=15);
    for(let id=0;id<3;id++)assert.equal(run(s,id).win,true,`${team} mission ${id}`);
  }
});
test('starter guard actually prevents damage, healing restores HP, and piercing ignores defender mitigation',()=>{
  const s=G.initialState(),r=G.battle(s);
  assert.ok(r.summary.prevented>0);assert.ok(r.summary.healing>0);
  assert.ok(r.frames.some(f=>f.kind==='guard'&&f.actor==='noel'));
  const enemy=G.missionEnemy(0);enemy.units.forEach(c=>{c.hp=100000;c.atk=1;});
  const protectedResult=G.battle(s,enemy);
  const stripped=structuredClone(enemy);stripped.units[0].role='攻撃';
  const unprotectedResult=G.battle(s,stripped);
  const shot=r=>r.frames.find(f=>f.side==='a'&&f.actor==='iris'&&f.turn===3);
  assert.equal(shot(protectedResult).amount,shot(unprotectedResult).amount);
  const normal=r=>r.frames.find(f=>f.side==='a'&&f.actor==='iris'&&f.turn===1).amount;
  assert.ok(normal(protectedResult)<normal(unprotectedResult));
});
test('area attack and group heal generate separate actual HP events per target',()=>{
  const s=G.initialState();s.counts.ash=1;s.counts.flora=1;s.team=['noel','ash','flora'];
  const enemy=G.missionEnemy(1);enemy.units.forEach(c=>c.hp=10000);
  const r=G.battle(s,enemy);
  const aoe=r.frames.filter(f=>f.side==='a'&&f.actor==='ash'&&f.turn===3);
  assert.equal(new Set(aoe.map(f=>f.target)).size,3);assert.ok(aoe.every(f=>f.amount>0));
  assert.equal(new Set(r.frames.filter(f=>f.side==='a'&&f.actor==='flora'&&f.turn===3).map(f=>f.target)).size,3);
});
test('optional objective can be earned after first clear and never twice, including reload',()=>{
  let s=G.initialState(1000);s.campaignCleared=2;s.team.forEach(id=>s.levels[id]=5);
  const first=run(s,2);assert.equal(first.win,true);assert.equal(first.bonus,false);
  s.team.forEach(id=>s.levels[id]=15);let raw;
  const tx=transact({setItem:(k,v)=>raw=v},s,'campaign',state=>run(state,2),1000);
  assert.equal(tx.result.bonus,true);assert.equal(tx.result.first,false);assert.equal(tx.result.reward.dust,120);
  s=G.restore(JSON.parse(raw),1000).state;
  assert.equal(receipt(JSON.parse(raw)).result.summary.turns,tx.result.summary.turns);
  const dust=s.dust;assert.equal(run(s,2).reward.dust,0);assert.equal(s.dust,dust);
  assert.throws(()=>G.applyCampaign(s,structuredClone(tx.result)));
});
test('legacy medals default to zero and failed storage never commits an objective',()=>{
  const old=G.initialState(1000);delete old.campaignMedals;
  const s=G.restore(old,1000).state;assert.equal(s.campaignMedals,0);
  const before=structuredClone(s);
  assert.throws(()=>transact({setItem(){throw Error('quota');}},s,'campaign',state=>run(state,0)),/quota/);
  assert.deepEqual(s,before);
  assert.throws(()=>G.restore({...old,campaignMedals:1<<G.MISSIONS.length},1000));
});
