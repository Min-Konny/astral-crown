import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {transact,trainTransaction,receipt,SAVE_KEY} from '../src/session.js';
test('fresh save: rewards fund training, replay earns missed objective, reload preserves it',()=>{
  let saved,state=G.initialState(1000);
  const store={setItem:(k,v)=>{assert.equal(k,SAVE_KEY);saved=v;}};
  const run=id=>{const tx=transact(store,state,'campaign',s=>{const r=G.campaignBattle(s,id);G.applyCampaign(s,r);return r;},1000);state=tx.state;return tx.result;};
  for(let id=0;id<3;id++){
    const r=run(id);assert.equal(r.win,true);
    if(id===2){assert.equal(r.summary.turns,14);assert.equal(r.bonus,false);}
    else for(let n=0;n<3;n++)for(const hero of state.team){
      if(state.dust>=state.levels[hero]*30)state=trainTransaction(store,state,s=>G.levelUp(s,hero),1000);
    }
  }
  state=trainTransaction(store,state,s=>G.trainSkill(s,'iris'),1000);
  const before=state.dust,r=run(2);assert.equal(r.summary.turns,12);assert.equal(r.bonus,true);assert.equal(state.dust,before+120);
  const raw=JSON.parse(saved);state=G.restore(raw,1000).state;
  assert.equal(receipt(raw).result.bonus,true);
  assert.equal(run(2).reward.dust,0);
  const steady=state.dust;state=trainTransaction(store,state,s=>G.chooseFocus(s,'iris','guard'),1000);
  state=trainTransaction(store,state,s=>G.chooseFocus(s,'iris','power'),1000);assert.equal(state.dust,steady);
});
test('all six legacy supports saturate and never accumulate on repeated selection, save or battle',()=>{
  let s=G.initialState(1000);s.campaignCleared=3;s.dust=1e6;
  const legacy=G.CHARACTERS.filter(c=>!G.isHero(c));assert.equal(legacy.length,6);
  for(const c of legacy){s.counts[c.id]=300000;s.promotions[c.id]=1;G.promote(s,c.id);G.trainSkill(s,c.id);G.trainSkill(s,c.id);}
  assert.ok(Math.abs(G.legacyTraining(s,'power')-.42)<1e-9);
  const capped=G.stats(s,G.byId('iris'));
  for(const c of legacy)s.counts[c.id]=1e15;
  assert.deepEqual(G.stats(s,G.byId('iris')),capped);
  for(let n=0;n<10;n++){
    for(const c of legacy)G.chooseFocus(s,c.id,'guard');
    assert.ok(Math.abs(G.legacyTraining(s,'guard')-.60)<1e-9);assert.equal(G.legacyTraining(s,'power'),0);
    for(const c of legacy)G.chooseFocus(s,c.id,'power');
    s=G.restore(JSON.parse(JSON.stringify(s)),1000).state;G.battle(s);
    assert.deepEqual(G.stats(s,G.byId('iris')),capped);
  }
});
test('300000-card legacy migration and promotion retain every card and preexisting support',()=>{
  const raw=G.initialState(1000);for(const c of G.CHARACTERS)raw.counts[c.id]=300000;
  delete raw.promotions;delete raw.mastery;delete raw.focus;
  let s=G.restore(raw,1000).state;const before=G.collectionBonus(s);let saved;
  for(const c of G.CHARACTERS){
    const tx=transact({setItem:(k,v)=>saved=v},s,'promotion',s=>G.promote(s,c.id),1000);s=tx.state;
    s=G.restore(JSON.parse(saved),1000).state;
    assert.equal(s.counts[c.id],300000);assert.equal(G.promotionStage(s,c.id),9);
    assert.equal(G.collectionBonus(s),before);
  }
});
test('every manual stage increases real hero stats and bounded skill effectiveness',()=>{
  const s=G.initialState();let previous=G.stats(s,G.byId('noel')).hp;
  for(const threshold of G.PROMOTION_THRESHOLDS.slice(1)){
    s.counts.noel=threshold;G.promote(s,'noel');const next=G.stats(s,G.byId('noel')).hp;
    assert.ok(next>previous);previous=next;
  }
  s.mastery.noel=2;
  const r=G.battle(s);assert.ok(r.summary.prevented>0);
  assert.ok(r.frames.every(f=>Number.isFinite(f.amount)&&f.amount>=0));
});
