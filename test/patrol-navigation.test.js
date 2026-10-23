import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as G from '../src/game.js';
import {patrolDestination,transact} from '../src/session.js';

test('real click handler rejects disabled, locked, and stale result inputs',()=>{
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 let click,launches=0;
 const s=G.initialState();s.campaignCleared=1;s.campaignRuns=1;
 s.presentation={kind:'campaign',result:{mission:0,win:true}};
 const ctx=vm.createContext({document:{addEventListener:(type,fn)=>{if(type==='click')click=fn;}},
  state:s,playing:false,mission:0,page:'arena',patrolDestination,run:fn=>fn(),
  playBattle:()=>{launches++;ctx.playing=true;ctx.state.campaignRuns++;}});
 vm.runInContext(source.slice(source.indexOf("document.addEventListener('click'"),source.indexOf("$('#import-file').addEventListener")),ctx);
 const button={disabled:false,dataset:{retryPatrol:'0',patrolRun:'1'},hasAttribute:()=>false};
 const press=()=>click({target:{closest:()=>button}});
 button.disabled=true;press();assert.equal(launches,0);
 button.disabled=false;press();press();assert.equal(launches,1);
 ctx.playing=false;press();assert.equal(launches,1);
 button.dataset={nextPatrol:'0',patrolRun:'2'};press();assert.equal(launches,2);assert.equal(ctx.mission,1);
});
test('result destinations require matching receipt, victory and an unlocked next map',()=>{
 const s=G.initialState();s.presentation={kind:'campaign',result:{mission:0,win:true}};
 assert.equal(patrolDestination(s,0,'next'),null);
 s.campaignCleared=1;const before=structuredClone(s);
 assert.equal(patrolDestination(s,0,'next'),1);assert.equal(patrolDestination(s,0,'retry'),0);
 assert.deepEqual(s,before);assert.equal(patrolDestination(s,1,'next'),null);
 s.presentation.result.win=false;assert.equal(patrolDestination(s,0,'next'),null);assert.equal(patrolDestination(s,0,'retry'),0);
 s.presentation.result={mission:G.MISSIONS.length-1,win:true};s.campaignCleared=G.MISSIONS.length;
 assert.equal(patrolDestination(s,G.MISSIONS.length-1,'next'),null);assert.equal(patrolDestination(s,G.MISSIONS.length-1,'retry'),G.MISSIONS.length-1);
 delete s.presentation;assert.equal(patrolDestination(s,G.MISSIONS.length-1,'retry'),null);
});

test('old same-map retry buttons expire after a new run, including defeat and reload',()=>{
 let s=G.initialState();s.team=['mira'];s.campaignCleared=2;
 const fight=x=>{const r=G.campaignBattle(x,2);G.applyCampaign(x,r);return r;};
 s=transact({setItem(){}},s,'campaign',fight).state;
 const ticket=s.campaignRuns;
 assert.equal(patrolDestination(s,2,'retry',ticket),2);
 s=transact({setItem(){}},s,'campaign',fight).state;
 assert.equal(patrolDestination(s,2,'retry',ticket),null);
 assert.equal(patrolDestination(s,2,'retry',s.campaignRuns),2);
 s=G.restore(JSON.parse(JSON.stringify(s))).state;
 assert.equal(patrolDestination(s,2,'retry',ticket),null);
 assert.equal(patrolDestination(s,2,'retry',NaN),null);
 assert.equal(s.dust,300);
});
test('next-map save failure preserves previous reward and receipt; stale next click is rejected',()=>{
 let s=G.initialState();for(const id of s.team)s.levels[id]=50;
 const action=(state,id)=>{const r=G.campaignBattle(state,id);G.applyCampaign(state,r);return r;};
 s=transact({setItem(){}},s,'campaign',x=>action(x,0)).state;
 const before=structuredClone(s),target=patrolDestination(s,0,'next');assert.equal(target,1);
 assert.throws(()=>transact({setItem(){throw Error('full');}},s,'campaign',x=>action(x,target)));
 assert.deepEqual(s,before);
 s=transact({setItem(){}},s,'campaign',x=>action(x,target)).state;
 assert.equal(patrolDestination(s,0,'next'),null);
 const loaded=G.restore(JSON.parse(JSON.stringify(s))).state;
 assert.equal(loaded.dust,s.dust);assert.equal(loaded.campaignCleared,2);
});
