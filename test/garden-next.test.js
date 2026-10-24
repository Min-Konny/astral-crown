import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {startPendingBattle,advancePendingBattle,pendingBattleToken,restoreBattleSave,patrolDestination} from '../src/session.js';
test('eight-stage path clears with starter rewards only, without summons or purchases',()=>{
 const s=G.initialState();for(let i=0;i<8;i++){const r=G.campaignBattle(s,i);assert(r.win,`stage ${i}`);G.applyCampaign(s,r);for(let n=0;n<3;n++)for(const id of s.team)if(s.dust>=s.levels[id]*30)G.levelUp(s,id);}
 assert.equal(s.campaignCleared,8);assert.equal(s.pulls,0);assert.equal(s.spent,0);
});
test('wind corridor objective rewards deliberate shield timing; previews match enemy actions',()=>{
 const s=G.initialState();s.team.forEach(id=>s.levels[id]=12);
 const run=mode=>{const c=G.beginCombat(s,G.missionEnemy(6),mode);while(!G.combatStatus(c).done){const q=G.combatStatus(c);G.stepCombat(c,q.waiting?(q.actor==='noel'&&q.turn%3!==1?'hold':'use'):undefined);}return G.combatResult(c);};
 const a=run('auto'),m=run('manual');assert(a.win&&m.win);assert(!G.objectiveMet(6,a.summary));assert(G.objectiveMet(6,m.summary));assert(m.summary.skillBlocks>a.summary.skillBlocks);
 assert(m.frames.filter(f=>f.side==='b'&&f.actor==='ash'&&f.skill).every(f=>f.turn%3===1));
 const last=G.battle(s,G.missionEnemy(7));assert(last.frames.filter(f=>f.side==='b'&&f.actor==='iris'&&f.skill).every(f=>f.turn%3===1));assert(last.frames.filter(f=>f.side==='b'&&f.actor==='ash'&&f.skill).every(f=>f.turn%3===2));
 const strong=G.initialState();strong.team.forEach(id=>strong.levels[id]=18);const r=G.battle(strong,G.missionEnemy(7));assert(r.win);assert(G.objectiveMet(7,r.summary));strong.team=['iris','noel','mira'];assert.notDeepEqual(G.battle(strong,G.missionEnemy(7)).summary,r.summary);
});
test('six-clear legacy saves unlock new stages without resetting progress; journals and rewards stay atomic',()=>{
 let s=G.initialState();s.campaignCleared=6;s.campaignMedals=63;s.team.forEach(id=>s.levels[id]=18);s=G.validateSave(s);assert.equal(G.materialRoutes(s)[0].mission,6);const store={setItem(){}};
 for(const id of [6,7]){s=startPendingBattle(store,s,id);while(s.pendingBattle){const before=structuredClone(s),token=pendingBattleToken(s);assert.throws(()=>advancePendingBattle({setItem(){throw Error('full')}},s,token));assert.deepEqual(s,before);s=advancePendingBattle(store,s,token).state;s=restoreBattleSave(JSON.parse(JSON.stringify(s)),s.lastSeen).state;}assert.equal(s.campaignCleared,id+1);assert.equal(s.campaignMedals&63,63);assert.equal(patrolDestination(s,id,'next'),id===6?7:null);}
 const r=G.campaignBattle(s,7);G.applyCampaign(s,r);const dust=s.dust;assert.throws(()=>G.applyCampaign(s,r));const repeat=G.campaignBattle(s,7);G.applyCampaign(s,repeat);assert.equal(s.dust,dust);
 s.team=['mira'];s.levels.mira=1;const before=s.dust,loss=G.campaignBattle(s,7);assert(!loss.win);G.applyCampaign(s,loss);assert.equal(s.dust,before);
});