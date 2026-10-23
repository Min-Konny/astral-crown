import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as G from '../src/game.js';
import {transact,receipt,startPendingBattle} from '../src/session.js';
test('availability filters follow promotion, costs and gates without changing team or state',()=>{
 const s=G.initialState(),before=structuredClone(s);
 assert.deepEqual(G.collectionCandidates(s,'promotion'),[]);assert.deepEqual(G.collectionCandidates(s,'training'),[]);
 assert.deepEqual(s,before);s.counts.guard=10;
 assert.deepEqual(G.collectionCandidates(s,'promotion').map(c=>c.id),['guard']);
 G.promote(s,'guard');assert.equal(G.collectionCandidates(s,'promotion').length,0);
 s.campaignCleared=2;s.dust=150;
 assert.ok(G.collectionCandidates(s,'training').some(c=>c.id==='guard'));
 G.trainSkill(s,'guard');assert.equal(G.collectionCandidates(s,'training').length,0);
 assert.deepEqual(s.team,before.team);assert.equal(G.collectionCandidates(s,'all').length,G.CHARACTERS.length);
});
const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8').replaceAll('\r\n','\n');
test('real battle entry locks repeat input and starts only after durable save',()=>{
 let fail=true,saved,resumed=0;
 const context=vm.createContext({state:G.initialState(),mission:0,playing:false,startPendingBattle,
 storage:{setItem:(k,v)=>{if(fail)throw Error('storage full');saved=v;}},
 resumeBattle(){resumed++;context.playing=true;}});
 vm.runInContext(source.slice(source.indexOf('function playBattle(){'),source.indexOf('\nrender();',source.indexOf('function playBattle(){'))),context);
 const before=structuredClone(context.state);
 assert.throws(()=>context.playBattle(),/storage full/);assert.deepEqual(context.state,before);assert.equal(resumed,0);
 fail=false;context.playBattle();context.playBattle();assert.equal(resumed,1);
 assert.equal(context.state.campaignRuns,0);assert.equal(context.state.dust,before.dust);
 assert.equal(JSON.parse(saved).pendingBattle.mission,0);assert.equal(context.state.battleSerial,1);
});
test('defeat retry remains free and interruption preserves the same result',()=>{
 let s=G.initialState();s.team=['mira'];s.campaignCleared=2;
 const before=s.dust;let saved;
 for(let n=0;n<3;n++){
  const tx=transact({setItem:(k,v)=>saved=v},s,'campaign',x=>{const r=G.campaignBattle(x,2);G.applyCampaign(x,r);return r;});
  assert.equal(tx.result.win,false);s=G.restore(JSON.parse(saved)).state;
  assert.equal(receipt(JSON.parse(saved)).result.win,false);assert.equal(s.dust,before);
 }
 assert.equal(s.campaignRuns,3);
});

