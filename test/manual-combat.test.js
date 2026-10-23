import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as G from '../src/game.js';
import {startPendingBattle,pendingCombat,pendingBattleToken,advancePendingBattle,changeBattleMode,restorePendingBattle,restoreBattleSave,receipt} from '../src/session.js';
const baseline=readFileSync(new URL('./fixtures/legacy-battle.txt',import.meta.url),'utf8').replace(/^import[^\n]+\n/,'const {byId,stats,promotionPower,SKILLS,rival}=G;\n').replace('export function battle','function battle');
const legacy=Function('G',baseline+'\nreturn battle;')(G);
const memory={setItem(){}};
test('startup preserves valid progression when a pending journal is corrupt; import rejects it',()=>{
 const s=startPendingBattle(memory,G.initialState(),0),bad=structuredClone(s);bad.pendingBattle.actions=[{mode:'manual',choice:'use'}];bad.pendingBattle.revision=1;
 assert.throws(()=>restorePendingBattle(bad,G.validateSave(bad)));
 const r=restoreBattleSave(bad,bad.lastSeen);assert.equal(r.battleDamaged,true);assert.equal(r.state.pendingBattle,undefined);
 for(const key of ['counts','levels','dust','cash','campaignRuns','promotions','confirmedCounts'])assert.deepEqual(r.state[key],s[key]);
 assert.equal(r.state.presentation,null);assert.deepEqual(restoreBattleSave(s,s.lastSeen).state.pendingBattle,s.pendingBattle);
});
function resolve(s,id,mode,choose=()=> 'use'){
 const c=G.beginCombat(s,id<0?G.rival(s):G.missionEnemy(id),mode);
 while(!G.combatStatus(c).done){const st=G.combatStatus(c);G.stepCombat(c,st.waiting?choose(st):undefined);}
 return G.combatResult(c);
}
test('stepper AUTO exactly matches published battle frames, outcomes and summaries across progression',()=>{
 for(const level of [1,3,10,30,50])for(const rank of [100,50,10])for(const id of [-1,0,1,2]){
  const s=G.initialState();s.rank=rank;s.bestRank=rank;for(const c of s.team){s.levels[c]=level;s.mastery[c]=level>10?2:0;s.promotions[c]=level>30?3:1;}
  const enemy=id<0?G.rival(s):G.missionEnemy(id);
  assert.deepEqual(G.battle(s,enemy),legacy(s,enemy));assert.deepEqual(resolve(s,id,'manual'),legacy(s,enemy));
 }
});
test('manual readiness waits without resolving, holding changes actual combat and cooldown follows use',()=>{
 const s=G.initialState(),c=G.beginCombat(s,G.missionEnemy(1),'manual');
 while(!G.combatStatus(c).waiting)G.stepCombat(c);
 const st=G.combatStatus(c),before=structuredClone(c);assert.equal(st.turn,3);
 assert.equal(G.stepCombat(c).waiting,true);assert.deepEqual(c,before);
 const held=G.stepCombat(c,'hold');assert.equal(held.frames[0].skill,false);assert.equal(c.readyAt[st.actor],3);
 while(!G.combatStatus(c).done){const status=G.combatStatus(c);if(status.actor===st.actor&&status.waiting){G.stepCombat(c,'use');assert.equal(c.readyAt[st.actor],status.turn+3);break;}G.stepCombat(c,status.waiting?'hold':undefined);}
 const use=resolve(s,1,'manual'),hold=resolve(s,1,'manual',()=> 'hold');assert.notDeepEqual(hold.summary,use.summary);
 let outcomesDiffer=false;
 for(let level=1;level<=8;level++){for(const id of [0,1,2]){const x=G.initialState();for(const u of x.team)x.levels[u]=level;if(resolve(x,id,'manual').win!==resolve(x,id,'manual',()=> 'hold').win)outcomesDiffer=true;}}
 assert.ok(outcomesDiffer,'manual decisions must change actual victory in at least one concrete progression scenario');
});
test('old saves default AUTO; modes save atomically and invalidate old controls',()=>{
 const old=G.initialState();delete old.settings.skillMode;delete old.battleSerial;const restored=G.validateSave(old);assert.equal(restored.settings.skillMode,'auto');assert.equal(restored.battleSerial,0);
 let s=startPendingBattle(memory,restored,0);const token=pendingBattleToken(s),before=structuredClone(s);
 assert.throws(()=>changeBattleMode({setItem(){throw Error('disk');}},s,'manual',token),/disk/);assert.deepEqual(s,before);
 s=changeBattleMode(memory,s,'manual',token);assert.equal(pendingCombat(s).mode,'manual');assert.throws(()=>advancePendingBattle(memory,s,token),/Stale/);
 s=changeBattleMode(memory,s,'auto');assert.equal(pendingCombat(s).mode,'auto');
});
test('each saved action resumes identically; failed terminal save and repeated input never grant rewards twice',()=>{
 let s=G.initialState();let bytes;const store={setItem(k,v){bytes=v;}};s=startPendingBattle(store,s,0);
 const initialDust=s.dust;let terminalFailures=0,steps=0;
 while(s.pendingBattle){
  const token=pendingBattleToken(s),before=structuredClone(s),c=pendingCombat(s),last=G.stepCombat(c).done;
  if(last){assert.throws(()=>advancePendingBattle({setItem(){throw Error('disk');}},s,token),/disk/);assert.deepEqual(s,before);terminalFailures++;}
  const tx=advancePendingBattle(store,s,token);s=tx.state;steps++;
  assert.throws(()=>advancePendingBattle(store,s,token),/Stale/);
  const raw=JSON.parse(bytes);s=restorePendingBattle(raw,G.validateSave(raw));if(raw.presentation)s.presentation=receipt(raw);
  if(s.pendingBattle){assert.equal(s.dust,initialDust);assert.deepEqual(pendingCombat(s),pendingCombat(tx.state));}
 }
 assert.ok(steps>5);assert.equal(terminalFailures,1);assert.equal(s.campaignRuns,1);assert.equal(s.campaignCleared,1);assert.equal(s.dust,initialDust+360);
 const dust=s.dust;assert.equal(restorePendingBattle(s,G.validateSave(s)).dust,dust);
});
test('pending manual pause, mode switch, dead actor and corrupt journal are handled without free actions',()=>{
 let s=G.initialState();s.settings.skillMode='manual';s.campaignCleared=2;s=startPendingBattle(memory,s,1);
 while(!G.combatStatus(pendingCombat(s)).waiting)s=advancePendingBattle(memory,s,pendingBattleToken(s)).state;
 const before=structuredClone(s),wait=advancePendingBattle({setItem(){assert.fail('pause must not write');}},s,pendingBattleToken(s));assert.equal(wait.waiting,true);assert.deepEqual(s,before);
 s=changeBattleMode(memory,s,'auto');s=advancePendingBattle(memory,s,pendingBattleToken(s)).state;s=changeBattleMode(memory,s,'manual');
 const bad=structuredClone(s);bad.pendingBattle.actions[0].choice='use';assert.throws(()=>pendingCombat(bad));
 const c=pendingCombat(s);c.a[0].hp=0;c.side='a';c.cursor=0;c.turn=3;const status=G.combatStatus(c);assert.notEqual(status.actor,c.a[0].id);
 const oldToken=pendingBattleToken(s);assert.throws(()=>startPendingBattle(memory,s,0),/already/);assert.equal(pendingBattleToken(s),oldToken);
});

test('start and every intermediate write failure preserve the original state in ranking and patrol',()=>{
 const broken={setItem(){throw Error('full');}};
 for(const mission of [-1,0]){
  const original=G.initialState(),copy=structuredClone(original);assert.throws(()=>startPendingBattle(broken,original,mission),/full/);assert.deepEqual(original,copy);
  let s=startPendingBattle(memory,original,mission);
  while(s.pendingBattle){const before=structuredClone(s),token=pendingBattleToken(s);assert.throws(()=>advancePendingBattle(broken,s,token),/full/);assert.deepEqual(s,before);s=advancePendingBattle(memory,s,token).state;}
  assert.equal(s.battleSerial,1);assert.equal(s.presentation.kind,mission<0?'battle':'campaign');
 }
});
