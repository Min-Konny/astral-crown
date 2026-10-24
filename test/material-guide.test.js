import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
test('material guide offers only unlocked outstanding one-time rewards without mutation',()=>{
 const s=G.initialState(),before=structuredClone(s);assert.deepEqual(G.materialRoutes(s),[{mission:0,dust:240,kind:'first'}]);assert.deepEqual(s,before);
 s.campaignCleared=2;assert.deepEqual(G.materialRoutes(s),[{mission:2,dust:600,kind:'first'},{mission:0,dust:120,kind:'objective'}]);
 s.campaignMedals=1;assert.equal(G.materialRoutes(s)[1].mission,1);
 s.campaignCleared=G.MISSIONS.length;s.campaignMedals=(1<<G.MISSIONS.length)-1;assert.deepEqual(G.materialRoutes(s),[]);
});
test('material recommendation follows successful reward commit and old saves',()=>{
 const s=G.initialState();s.levels.noel=s.levels.iris=s.levels.mira=5;
 const r=G.campaignBattle(s,0);assert(r.win);G.applyCampaign(s,r);assert.equal(G.materialRoutes(s)[0].mission,1);assert(!G.materialRoutes(s).some(r=>r.mission===0));
 assert.throws(()=>G.applyCampaign(s,r));const old=G.initialState();delete old.campaignCleared;delete old.campaignMedals;assert.equal(G.materialRoutes(G.validateSave(old))[0].mission,0);
});