import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {transact,receipt,SAVE_KEY} from '../src/session.js';
const action=id=>s=>{const r=G.campaignBattle(s,id);G.applyCampaign(s,r);return r;};
test('old saves default patrol progress; malformed progress is rejected',()=>{
  const s=G.initialState(1000);delete s.campaignCleared;delete s.campaignRuns;
  const restored=G.restore(s,1000).state;assert.equal(restored.campaignCleared,0);
  for(const value of [-1,4,NaN,'1'])assert.throws(()=>G.restore({...s,campaignCleared:value},1000));
});
test('three patrols form a complete starter-team training loop without gacha',()=>{
  const s=G.initialState(1000);const rank=s.rank;
  assert.throws(()=>G.campaignBattle(s,1));
  for(let id=0;id<3;id++){
    const r=action(id)(s);assert.equal(r.win,true,`mission ${id}`);
    assert.equal(s.campaignCleared,id+1);
    if(id<2)for(let n=0;n<3;n++)for(const hero of s.team){try{G.levelUp(s,hero);}catch{}}
  }
  assert.equal(s.rank,rank);assert.ok(s.dust>=600);
  assert.equal(s.levels.iris,5);
  const before=s.dust;const replay=action(0)(s);assert.equal(replay.reward.dust,0);assert.equal(s.dust,before);
});
test('enemy tactics differ: the second patrol archer targets the last living ally',()=>{
  const s=G.initialState();s.campaignCleared=1;
  const r=G.campaignBattle(s,1);
  const shot=r.frames.find(f=>f.side==='b'&&f.actor==='iris');
  assert.equal(shot.target,'mira');
  G.moveForward(s,'mira');G.moveForward(s,'mira');
  assert.equal(G.campaignBattle(s,1).frames.find(f=>f.side==='b'&&f.actor==='iris').target,'iris');
});
test('defeat costs nothing, retry works after training, and cancellation before commit is inert',()=>{
  const s=G.initialState();s.campaignCleared=2;const before=structuredClone(s);
  const cancelled=G.campaignBattle(s,2);assert.equal(cancelled.win,false);assert.deepEqual(s,before);
  G.applyCampaign(s,cancelled);assert.equal(s.dust,before.dust);assert.equal(s.campaignCleared,2);
  s.team.forEach(id=>s.levels[id]=5);assert.equal(action(2)(s).win,true);
});
test('repeat clicks and cloned stale results cannot grant the same first reward twice',()=>{
  const s=G.initialState(),r=G.campaignBattle(s,0),copy=structuredClone(r);
  G.applyCampaign(s,r);const after=structuredClone(s);
  assert.throws(()=>G.applyCampaign(s,r));assert.throws(()=>G.applyCampaign(s,copy));assert.deepEqual(s,after);
});
test('interrupted presentation reloads the committed receipt; failed save leaves all progress intact',()=>{
  const old=G.initialState(1000);let saved;
  const tx=transact({setItem:(k,v)=>{assert.equal(k,SAVE_KEY);saved=v;}},old,'campaign',action(0),1000);
  const raw=JSON.parse(saved),loaded=G.restore(raw,1000).state;
  assert.equal(receipt(raw).result.mission,0);assert.equal(loaded.dust,tx.state.dust);assert.equal(loaded.campaignCleared,1);
  assert.equal(receipt(raw).kind,'campaign');
  const before=structuredClone(loaded);
  assert.throws(()=>transact({setItem(){throw Error('quota');}},loaded,'campaign',action(1)),/quota/);
  assert.deepEqual(loaded,before);assert.equal(old.campaignCleared,0);
});
