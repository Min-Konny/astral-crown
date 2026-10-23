import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../src/game.js';
import {battleReadout} from '../src/session.js';
test('readout distinguishes teams, actual damage, support and automatic skill timing without mutation',()=>{
 const result=G.campaignBattle(G.initialState(),0),before=structuredClone(result);
 for(const [i,f] of result.frames.entries()){
  const text=battleReadout(f,i,result.frames.length);
  assert.ok(text.includes(f.side==='a'?'味方':'敵'));
  assert.ok(text.includes(`${i+1}/${result.frames.length}行動`));
  assert.ok(text.includes(f.turn%3===0?'スキル発動ターン':'次のスキル発動：TURN '+(f.turn+3-f.turn%3)));
  assert.ok(text.includes(f.kind==='guard'?'味方全員を守る':f.kind==='heal'?`${f.amount} 回復`:`${f.dealt??f.amount} ダメージ`));
 }
 assert.deepEqual(result,before);
});

test('displayed attack and healing values equal HP deltas, including overkill and guarded hits',()=>{
 const s=G.initialState();s.campaignCleared=2;
 const r=G.campaignBattle(s,1);
 const hp={a:Object.fromEntries(r.allies.map(u=>[u.id,u.hp])),b:Object.fromEntries(r.enemy.units.map(u=>[u.id,u.hp]))};
 let guarded=0;
 for(const [i,f] of r.frames.entries()){
  const after=f[f.targetSide].find(u=>u.id===f.target).hp,before=hp[f.targetSide][f.target];
  if(f.kind==='attack'){assert.equal(f.dealt,before-after);assert.ok(battleReadout(f,i,r.frames.length).includes(`${before-after} ダメージ`));}
  if(f.kind==='heal')assert.equal(f.amount,after-before);
  if(f.prevented){guarded++;assert.ok(battleReadout(f,i,r.frames.length).includes(`守りで ${f.prevented} 軽減`));}
  for(const side of ['a','b'])for(const u of f[side])hp[side][u.id]=u.hp;
 }
 assert.ok(guarded>0);
});
