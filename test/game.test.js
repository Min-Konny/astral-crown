import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
function seeded(seed=123){return ()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};}

test('購入はゲーム内残高のみを使い、不足時は何も変更しない',()=>{
  const s=G.initialState();G.buy(s,'large');
  assert.equal(s.cash,8000);assert.equal(s.gems,21000);assert.equal(s.spent,10000);
  const before=structuredClone(s);assert.throws(()=>G.buy(s,'large'));assert.deepEqual(s,before);
  assert.throws(()=>G.buy(s,'unknown'));assert.deepEqual(s,before);
});
test('全召喚サイズで消費・枚数・素材が一致し、不足時は無変更',()=>{
  for(const n of [10,100,1000,10000]){
    const s=G.initialState();s.gems=n*300;
    const before=Object.values(s.counts).reduce((a,b)=>a+b,0),r=G.summon(s,n,'pickup',seeded());
    assert.equal(s.gems,0);assert.equal(s.dust,300+n*8);assert.equal(s.pulls,n);
    assert.equal(Object.values(r.rarities).reduce((a,b)=>a+b,0),n);
    assert.equal(Object.values(s.counts).reduce((a,b)=>a+b,0)-before,n);
    const copy=structuredClone(s);assert.throws(()=>G.summon(s,10));assert.deepEqual(s,copy);
  }
});
test('まとめ購入は数量ぶんだけ支払いと石を増やす',()=>{
  const s=G.initialState();s.cash=10000000;
  G.buy(s,'large',1000);assert.equal(s.cash,0);assert.equal(s.gems,18003000);assert.equal(s.spent,10000000);
  const before=structuredClone(s);assert.throws(()=>G.buy(s,'small',-1));assert.deepEqual(s,before);
});
test('自然SSRが出ない乱数でも100連ごとに天井が発生する',()=>{
  const s=G.initialState();s.gems=3000000;
  const r=G.summon(s,10000,'pickup',()=>.1);
  assert.equal(r.rarities.SSR,100);assert.equal(s.pity,0);assert.equal(r.counts.luna,100);
});
test('天井直前と自然SSR排出時に天井がリセットされる',()=>{
  const s=G.initialState();s.pity=99;
  let r=G.summon(s,10,'standard',()=>.1);assert.equal(r.rarities.SSR,1);assert.equal(s.pity,9);
  s.gems=3000;r=G.summon(s,10,'standard',()=>.999);assert.equal(r.rarities.SSR,10);assert.equal(s.pity,0);
});
test('低レアは編成外で攻撃だけを増加し、10万体でボーナス上限',()=>{
  const s=G.initialState(),c=G.byId('noel'),before=G.stats(s,c);
  s.counts.guard=100;assert.ok(G.stats(s,c).atk>before.atk);assert.equal(G.stats(s,c).hp,before.hp);
  assert.throws(()=>G.toggleTeam(s,'guard'));
  s.counts.guard=100000;assert.equal(G.collectionBonus(s),.25);
  s.counts.guard=200000;assert.equal(G.collectionBonus(s),.25);
});
test('SSRは本体と5体で5凸し、余剰では凸と戦力が増加しない',()=>{
  const s=G.initialState(),c=G.byId('luna');s.counts.luna=6;
  assert.equal(G.awakening(s,c),5);const before=G.stats(s,c);s.counts.luna=500;
  assert.equal(G.awakening(s,c),5);assert.deepEqual(G.stats(s,c),before);
});
test('編成は所持主力のみ4人まで、最後の1人は外せない',()=>{
  const s=G.initialState();assert.throws(()=>G.toggleTeam(s,'luna'));
  s.counts.luna=1;G.toggleTeam(s,'luna');assert.equal(s.team.length,4);
  s.counts.sol=1;assert.throws(()=>G.toggleTeam(s,'sol'));
  G.moveForward(s,'luna');assert.equal(s.team[2],'luna');
  for(const id of [...s.team].slice(1))G.toggleTeam(s,id);
  assert.throws(()=>G.toggleTeam(s,s.team[0]));
});
test('育成費が正しく差し引かれ50で停止する',()=>{
  const s=G.initialState();G.levelUp(s,'iris');assert.equal(s.dust,270);assert.equal(s.levels.iris,2);
  s.levels.iris=50;const before=structuredClone(s);assert.throws(()=>G.levelUp(s,'iris'));assert.deepEqual(s,before);
});
test('戦闘は決着し、計算では変更せず、報酬の二重付与を拒否する',()=>{
  const s=G.initialState(),before=structuredClone(s),r=G.battle(s);
  assert.deepEqual(s,before);assert.ok(r.frames.length>0);
  assert.ok(r.frames.every(f=>f.turn<=30&&[...f.a,...f.b].every(u=>u.hp>=0&&u.hp<=u.max)));
  assert.equal(r.win,true);G.applyBattle(s,r);assert.equal(s.rank,95);assert.ok(s.cash>before.cash);
  const after=structuredClone(s);assert.throws(()=>G.applyBattle(s,r));assert.deepEqual(s,after);
});
test('敗北では順位も通貨も変化しない',()=>{
  const s=G.initialState();s.rank=1;s.bestRank=1;s.team=['mira'];
  const r=G.battle(s),before=structuredClone(s);assert.equal(r.win,false);G.applyBattle(s,r);assert.deepEqual(s,before);
});
test('転生条件、引継ぎ、リセットが仕様通り',()=>{
  const s=G.initialState();assert.throws(()=>G.ascend(s));
  s.rank=46;s.bestRank=46;s.levels.iris=20;s.counts.guard=2345;s.counts.luna=6;s.spent=99999;s.pulls=400;s.facility=5;s.pity=55;
  const counts=structuredClone(s.counts),team=[...s.team];assert.equal(G.ascend(s),5);
  assert.deepEqual(s.counts,counts);assert.deepEqual(s.team,team);assert.equal(s.spent,99999);assert.equal(s.pulls,400);
  assert.equal(s.seals,5);assert.equal(s.season,2);assert.equal(s.rank,100);assert.equal(s.bestRank,46);
  assert.equal(s.cash,18000);assert.equal(s.gems,3000);assert.equal(s.facility,0);assert.equal(s.levels.iris,1);assert.equal(s.pity,0);
});
test('保存の検証と復帰で不正値を拒否し、オフラインは最大8時間',()=>{
  const s=G.initialState(1000000);assert.deepEqual(G.validateSave(s),s);
  const r=G.restore(s,1000000+86400000);assert.equal(r.offline,120*28800);
  assert.equal(G.restore(s,0).offline,0);
  for(const mutate of [
    s=>s.cash=-1,s=>s.gems=Infinity,s=>s.rank=0,s=>s.pity=100,s=>s.team=['luna'],
    s=>s.team=['iris','iris'],s=>s.counts.guard='3',s=>s.levels.iris=51,s=>s.settings.sound='yes',
  ]){const corrupt=structuredClone(s);mutate(corrupt);assert.throws(()=>G.validateSave(corrupt));}
});
test('お詫び配布は一度だけ、設備の価格と収入は成長する',()=>{
  const s=G.initialState();G.claimMail(s);assert.equal(s.gems,6000);assert.throws(()=>G.claimMail(s));
  G.upgradeFacility(s);assert.equal(s.cash,15000);assert.equal(G.facilityCost(s),6000);assert.equal(G.income(s),198);
});
test('初期資源から購入・召喚・育成・10勝・転生・保存まで一周できる',()=>{
  const s=G.initialState(),rng=seeded();
  G.claimMail(s);G.buy(s,'large');
  for(let i=0;i<8;i++)G.summon(s,10,'pickup',rng);
  s.team=G.CHARACTERS.filter(c=>G.isHero(c)&&s.counts[c.id]).sort((a,b)=>{
    const x=G.stats(s,a),y=G.stats(s,b);return y.atk*5+y.hp-x.atk*5-x.hp;
  }).slice(0,4).map(c=>c.id);
  for(let minute=0;minute<15&&s.rank>50;minute++){
    G.tick(s,60);
    while(s.cash>=G.facilityCost(s)&&s.facility<6)G.upgradeFacility(s);
    while(s.cash>=10000)G.buy(s,'large');
    while(s.gems>=3000)G.summon(s,10,'pickup',rng);
    for(let pass=0;pass<10;pass++)for(const id of s.team)
      if(s.levels[id]<50&&s.dust>=s.levels[id]*30)G.levelUp(s,id);
    for(let n=0;n<10&&s.rank>50;n++){
      const b=G.battle(s);G.applyBattle(s,b);if(!b.win)break;
    }
  }
  assert.equal(s.rank,50);const counts=structuredClone(s.counts);
  assert.equal(G.ascend(s),5);assert.deepEqual(s.counts,counts);
  assert.equal(G.validateSave(JSON.parse(JSON.stringify(s))).season,2);
});
