import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {startPendingBattle,advancePendingBattle,pendingBattleToken,restoreBattleSave,receipt} from '../src/session.js';
test('six stages connect starter rewards to training without summons and never repay clears',()=>{
 const s=G.initialState();const rank=s.rank;
 for(let id=0;id<G.MISSIONS.length;id++){
  assert.throws(()=>G.campaignBattle(s,id+1));
  const r=G.campaignBattle(s,id);assert.equal(r.win,true,`stage ${id}`);G.applyCampaign(s,r);
  for(let round=0;round<3;round++)for(const hero of s.team)if(s.dust>=s.levels[hero]*30)G.levelUp(s,hero);
 }
 assert.equal(s.rank,rank);assert.equal(s.pulls,0);assert.equal(s.campaignCleared,6);
 for(const id of [3,4,5]){let r=G.campaignBattle(s,id);G.applyCampaign(s,r);const dust=s.dust;r=G.campaignBattle(s,id);G.applyCampaign(s,r);assert.equal(s.dust,dust);assert.equal(r.reward.cash,0);assert.equal(r.reward.dust,0);}
});
test('new staggered threat rewards real shield timing, while AUTO still clears',()=>{
 const s=G.initialState();for(const id of s.team)s.levels[id]=6;
 const run=mode=>{const c=G.beginCombat(s,G.missionEnemy(4),mode);while(!G.combatStatus(c).done){const st=G.combatStatus(c);G.stepCombat(c,st.waiting?(st.actor==='noel'&&st.turn%3!==2?'hold':'use'):undefined);}return G.combatResult(c);};
 const auto=run('auto'),manual=run('manual');assert(auto.win&&manual.win);
 assert(!G.objectiveMet(4,auto.summary));assert(G.objectiveMet(4,manual.summary));assert(manual.summary.prevented>auto.summary.prevented);
 assert(auto.frames.filter(f=>f.side==='b'&&f.actor==='ash'&&f.skill).every(f=>f.turn%3===2));
 assert(G.battle(s,G.missionEnemy(2)).frames.filter(f=>f.side==='b'&&f.skill).every(f=>f.turn%3===0));
});
test('old completed chapter and medals remain, new pending stages resume and reward once',()=>{
 const old=G.initialState();old.campaignCleared=3;old.campaignMedals=7;for(const id of old.team)old.levels[id]=12;
 let s=G.validateSave(old);assert.equal(s.campaignMedals,7);assert.equal(s.campaignCleared,3);
 const store={setItem(){}};
 for(const id of [3,4,5]){
  s=startPendingBattle(store,s,id);
  while(s.pendingBattle){const token=pendingBattleToken(s),before=structuredClone(s);assert.throws(()=>advancePendingBattle({setItem(){throw Error('full');}},s,token));assert.deepEqual(s,before);s=advancePendingBattle(store,s,token).state;const raw=JSON.parse(JSON.stringify(s));s=restoreBattleSave(raw,raw.lastSeen).state;}
  assert.equal(s.campaignCleared,id+1);
 }
 assert.equal(s.campaignRuns,3);assert.equal(s.campaignMedals&7,7);assert.throws(()=>G.validateSave({...s,campaignCleared:7}));assert.throws(()=>G.validateSave({...s,campaignMedals:64}));
 assert.equal(G.MISSIONS.length,G.OBJECTIVES.length);
});
test('new final stage defeat consumes nothing; staggered objective receipt survives reload',()=>{
 const s=G.initialState();s.campaignCleared=5;s.team=['mira'];const before=structuredClone(s),r=G.campaignBattle(s,5);
 assert.equal(r.win,false);G.applyCampaign(s,r);assert.equal(s.dust,before.dust);assert.equal(s.cash,before.cash);assert.equal(s.campaignCleared,5);
 const raw={presentation:{kind:'campaign',result:{mission:4,win:true,rank:100,first:false,bonus:true,reward:{cash:0,dust:120},summary:{turns:13,survivors:3,total:3,damage:2000,healing:400,prevented:200,skillBlocks:3}}}};
 assert.equal(receipt(raw).result.summary.skillBlocks,3);raw.presentation.result.summary.skillBlocks=-1;assert.equal(receipt(raw).result.summary.skillBlocks,undefined);
});
