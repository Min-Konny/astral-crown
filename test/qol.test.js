import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as G from '../src/game.js';
import {transact,receipt} from '../src/session.js';
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
test('real battle entry locks repeat input, preserves modal on failed save and resumes committed result',()=>{
 let state=G.initialState(),saved,fail=false,done,closes=0;
 const modal={open:true,close(){this.open=false;closes++;}},label={textContent:''};
 const context=vm.createContext({G,mission:0,playing:false,battleSpeed:1,speedButton:{},$:q=>q==='#modal'?modal:label,
 commit:(kind,action)=>{const tx=transact({setItem:(k,v)=>{if(fail)throw Error('storage full');saved=v;}},state,kind,action);state=tx.state;return tx.result;},
 render(){},sound(){},shortMotion:()=>false,setPlaying:v=>context.playing=v,
 stage:{battle:(r,reduced,frame,cb)=>{done=cb;}},battleResult:()=>{modal.open=true;}});
 vm.runInContext(source.slice(source.indexOf('function playBattle(){'),source.indexOf('\nrender();\nif(state.presentation)')),context);
 context.playBattle();const dust=state.dust;context.playBattle();assert.equal(state.campaignRuns,1);
 assert.equal(receipt(JSON.parse(saved)).result.mission,0);done();
 fail=true;assert.throws(()=>context.playBattle(),/storage full/);assert.equal(modal.open,true);assert.equal(closes,1);assert.equal(state.dust,dust);
 fail=false;context.playBattle();done();assert.equal(state.dust,dust);assert.equal(state.campaignRuns,2);
 state=G.restore(JSON.parse(saved)).state;assert.equal(state.dust,dust);
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

