import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {rankingContinuation,continueRanking,levelTransaction,restoreBattleSave} from '../src/session.js';
const store=()=>({value:null,setItem(k,v){this.value=v;}});
test('ranking next and retry reject final victories, stale results and already started battles',()=>{
 const s=G.initialState(1000);s.rank=95;s.bestRank=95;s.battleSerial=2;s.presentation={kind:'battle',result:{win:true,rank:95,reward:{cash:2000,dust:180}}};
 const next=rankingContinuation(s);assert.equal(next.rank,90);assert.equal(next.retry,false);
 const mem=store(),started=continueRanking(mem,s,next.token,1000);
 assert.equal(started.rank,95);assert.equal(started.cash,s.cash);assert.equal(started.pendingBattle.mission,-1);
 assert.throws(()=>continueRanking(mem,started,next.token));assert.equal(rankingContinuation(s,'1:95'),null);
 const reloaded=restoreBattleSave(JSON.parse(mem.value),1000).state;assert.equal(rankingContinuation(reloaded,next.token),null);
 s.presentation.result.win=false;assert.equal(rankingContinuation(s).retry,true);
 s.rank=1;s.bestRank=1;s.presentation.result.rank=1;assert.ok(rankingContinuation(s));
 s.presentation.result.win=true;assert.equal(rankingContinuation(s),null);
 s.presentation.result.rank=95;assert.equal(rankingContinuation(s),null);
});
test('ranking continuation save failure preserves receipt and resources for retry',()=>{
 const s=G.initialState(1000);s.presentation={kind:'battle',result:{win:false,rank:100,reward:null}};
 const before=structuredClone(s),token=rankingContinuation(s).token;
 assert.throws(()=>continueRanking({setItem(){throw Error('quota');}},s,token),/quota/);assert.deepEqual(s,before);
 const next=continueRanking(store(),s,token,1000);assert.equal(next.battleSerial,1);assert.equal(next.cash,s.cash);
});
test('shared level conditions cover insufficient, exact cost, max and unowned; old click cannot double spend',()=>{
 const s=G.initialState(1000);s.dust=29;assert.equal(G.levelInfo(s,'noel').missing,1);assert.throws(()=>levelTransaction(store(),s,'noel',1));
 s.dust=30;const before=structuredClone(s),mem=store();
 assert.throws(()=>levelTransaction({setItem(){throw Error('quota');}},s,'noel',1),/quota/);assert.deepEqual(s,before);
 const next=levelTransaction(mem,s,'noel',1,1000);assert.equal(next.dust,0);assert.equal(next.levels.noel,2);
 assert.throws(()=>levelTransaction(mem,next,'noel',1));assert.deepEqual(G.restore(JSON.parse(mem.value),1000).state,next);
 next.levels.noel=50;assert.match(G.levelInfo(next,'noel').reason,/最大/);
 assert.match(G.levelInfo(next,'luna').reason,/所持/);assert.match(G.levelInfo(next,'guard').reason,/所持/);
});
