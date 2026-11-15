import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,facilityCost,upgradeFacility,ascend,missionProgress,claimMission,validateSave} from '../src/game.js';
import {resourceTransaction} from '../src/session.js';

test('legacy saves qualify for lifetime milestones and keep unclaimed and claimed rewards after ascension',()=>{
  const old=initialState();
  delete old.highestFacility;
  delete old.claimedMissions;
  Object.assign(old,{facility:10,rank:1,bestRank:1,pulls:1000,spent:1_000_000});
  Object.assign(old.counts,{luna:1,sol:1,flora:1});
  Object.assign(old.promotions,{luna:1,sol:1,flora:1});
  const state=validateSave(old);
  assert.equal(missionProgress(state).filter(m=>m.claimable).length,4);
  assert.deepEqual(claimMission(state,'pulls-1000'),{gems:3000});
  ascend(state);
  const restored=validateSave(state);
  assert.equal(restored.facility,0);
  assert.equal(restored.highestFacility,10);
  assert.equal(missionProgress(restored).filter(m=>m.claimable).length,3);
  assert.throws(()=>claimMission(restored,'pulls-1000'));
  assert.throws(()=>claimMission(restored,'unknown'));
  assert.deepEqual(claimMission(restored,'facility-10'),{dust:600});
  assert.equal(restored.dust,900);
});
test('equipment and mission rewards persist only after successful saves',()=>{
  const state=initialState();
  state.facility=9;
  state.cash=facilityCost(state);
  assert.throws(()=>claimMission(state,'facility-10'));
  upgradeFacility(state);
  assert.equal(state.highestFacility,10);
  assert.throws(()=>resourceTransaction({setItem(){throw Error('full');}},state,s=>claimMission(s,'facility-10')));
  assert.equal(state.dust,300);
  assert.deepEqual(state.claimedMissions,[]);
  const tx=resourceTransaction({setItem(){}},state,s=>claimMission(s,'facility-10'));
  assert.equal(tx.state.dust,900);
  assert.deepEqual(tx.state.claimedMissions,['facility-10']);
});
