import * as G from './game.js';
// Presentation only: use resolved events, never simulate or award from this readout.
export function battleReadout(frame,index,total){
  const side=frame.side==='a'?'味方':'敵';
  const actor=G.byId(frame.actor)?.name??frame.actor,target=(frame.targetSide==='a'?'味方 ':'敵 ')+(G.byId(frame.target)?.name??frame.target);
  const effect=frame.kind==='guard'?'味方全員を守る':frame.kind==='heal'?`${target}を ${frame.amount} 回復`:`${target}に ${frame.dealt??frame.amount} ダメージ${frame.prevented?`（守りで ${frame.prevented} 軽減）`:''}`;
  return `TURN ${frame.turn} · ${index+1}/${total}行動\n${side} ${actor} / ${frame.ability||'通常攻撃'} → ${effect}\n${frame.turn%3===0?'スキル発動ターン':'次のスキル発動：TURN '+(frame.turn+3-frame.turn%3)} · オート戦闘`;
}
// Result navigation only selects an unlocked destination; reward commits remain in transact.
export function patrolDestination(state,from,action,run=state.campaignRuns??0){
  const r=state.presentation?.kind==='campaign'?state.presentation.result:null;
  if(!r||r.mission!==from||!G.MISSIONS[from]||run!==(state.campaignRuns??0))return null;
  if(action==='retry')return from;
  if(action==='next'&&r.win&&G.MISSIONS[from+1]&&from+1<=(state.campaignCleared??0))return from+1;
  return null;
}
export const SAVE_KEY = 'astral-crown-save-v1';
const combatKeys=['rank','bestRank','campaignRuns','campaignCleared','campaignMedals','team','counts','levels','mastery','promotions','confirmedCounts','focus','seals'];
export function pendingBattleToken(state){const p=state.pendingBattle;return p?`${p.id}:${p.revision}`:null;}
export function pendingCombat(state){
  const p=state.pendingBattle;
  if(!p||p.id!==state.battleSerial||!Number.isSafeInteger(p.revision)||p.revision<0||p.revision>1000000||!Array.isArray(p.actions)||p.actions.length>240||p.revision<p.actions.length)throw Error('Invalid pending battle');
  const seed=G.validateSave(p.seed);
  if(combatKeys.some(k=>JSON.stringify(seed[k])!==JSON.stringify(state[k])))throw Error('Battle setup changed');
  if(!Number.isInteger(p.mission)||p.mission< -1||p.mission>=G.MISSIONS.length||p.mission>seed.campaignCleared)throw Error('Invalid mission');
  const combat=G.beginCombat(seed,p.mission<0?G.rival(seed):G.missionEnemy(p.mission));
  for(const action of p.actions){
    if(!['auto','manual'].includes(action.mode)||![undefined,'use','hold'].includes(action.choice))throw Error('Invalid battle action');
    combat.mode=action.mode;
    if(G.stepCombat(combat,action.choice).waiting)throw Error('Missing skill decision');
  }
  if(G.combatStatus(combat).done)throw Error('Completed battle must have a receipt');
  combat.mode=state.settings.skillMode??'auto';return combat;
}
export function restorePendingBattle(raw,state){
  if(!raw.pendingBattle)return state;
  const next={...state,pendingBattle:structuredClone(raw.pendingBattle)};
  pendingCombat(next);return next;
}
// A damaged action journal must not erase an otherwise valid collection/save.
// Import stays strict through restorePendingBattle; startup can preserve the base.
export function restoreBattleSave(raw,now=Date.now()){
  const restored=G.restore(raw,now);
  try{restored.state=restorePendingBattle(raw,restored.state);}
  catch{restored.battleDamaged=true;}
  restored.state.presentation=raw.pendingBattle?null:receipt(raw);
  return restored;
}
function saveCombat(storage,next,now){next.lastSeen=now;storage.setItem(SAVE_KEY,JSON.stringify(next));return next;}
export function startPendingBattle(storage,state,mission=-1,now=Date.now()){
  if(state.pendingBattle)throw Error('Battle is already in progress');
  const next=structuredClone(state);delete next.presentation;
  const seed=structuredClone(next);next.battleSerial=(next.battleSerial??0)+1;
  if(!Number.isSafeInteger(next.battleSerial)||next.battleSerial>1e15)throw Error('Battle counter limit reached');
  next.pendingBattle={id:next.battleSerial,revision:0,mission,seed,actions:[]};pendingCombat(next);
  return saveCombat(storage,next,now);
}
export function changeBattleMode(storage,state,mode,token=pendingBattleToken(state),now=Date.now()){
  if(!['auto','manual'].includes(mode))throw Error('Invalid skill mode');
  if(state.pendingBattle&&token!==pendingBattleToken(state))throw Error('Stale battle control');
  const next=structuredClone(state);next.settings.skillMode=mode;
  if(next.pendingBattle){pendingCombat(next);next.pendingBattle.revision++;}
  return saveCombat(storage,next,now);
}
export function advancePendingBattle(storage,state,token,choice,now=Date.now()){
  if(!token||token!==pendingBattleToken(state))throw Error('Stale battle action');
  const next=structuredClone(state),combat=pendingCombat(next),step=G.stepCombat(combat,choice);
  if(step.waiting)return {state,waiting:true,frames:[]};
  next.pendingBattle.actions.push({mode:combat.mode,...(choice?{choice}:{})});next.pendingBattle.revision++;
  let result;
  if(step.done){
    const p=next.pendingBattle;result=G.combatResult(combat);
    if(p.mission>=0){
      const m=G.MISSIONS[p.mission],first=p.mission===next.campaignCleared,bonus=result.win&&G.objectiveMet(p.mission,result.summary)&&!((next.campaignMedals??0)&(1<<p.mission));
      Object.assign(result,{mission:p.mission,run:next.campaignRuns??0,first,bonus,reward:result.win?{cash:first?m.cash:0,dust:(first?m.dust:0)+(bonus?120:0)}:null});
      G.applyCampaign(next,result);
    }else G.applyBattle(next,result);
    next.presentation={kind:p.mission<0?'battle':'campaign',result:{win:result.win,reward:result.reward,rank:next.rank,...(p.mission>=0?{mission:p.mission,first:result.first,bonus:result.bonus,summary:result.summary}:{})}};
    delete next.pendingBattle;
  }
  saveCombat(storage,next,now);return {state:next,waiting:false,frames:step.frames,result};
}
export function trainTransaction(storage,state,action,now=Date.now()){
  const next=structuredClone(state);action(next);next.lastSeen=now;
  storage.setItem(SAVE_KEY,JSON.stringify(next));return next;
}
// One localStorage write commits both resources and the replay receipt.
// The caller replaces its state only after this write succeeds.
export function transact(storage, state, kind, action, now=Date.now()) {
  const next=structuredClone(state);
  const result=action(next);
  next.lastSeen=now;
  next.presentation=['summon','promotion'].includes(kind)?{kind,result}:{kind,result:{win:result.win,reward:result.reward,rank:next.rank,...(kind==='campaign'?{mission:result.mission,first:result.first,bonus:result.bonus,summary:result.summary}:{})}};
  storage.setItem(SAVE_KEY,JSON.stringify(next));
  return {state:next,result};
}
export function receipt(raw) {
  const p=raw?.presentation,r=p?.result;
  if(!r)return null;
  if(p.kind==='promotion'){
    if(!G.byId(r.id)||!Number.isInteger(r.from)||r.from<1||!Number.isInteger(r.to)||r.to<=r.from||r.to>G.PROMOTION_THRESHOLDS.length)return null;
    return {kind:p.kind,result:{id:r.id,from:r.from,to:r.to}};
  }
  if(p.kind==='summon') {
    if(![10,100,1000,10000].includes(r.n)||!r.counts||!r.rarities)return null;
    const counts={},rarities={C:0,UC:0,R:0,SR:0,SSR:0};
    for(const [id,n] of Object.entries(r.counts)) {
      const c=G.byId(id);if(!c||!Number.isInteger(n)||n<1||n>r.n)return null;
      counts[id]=n;rarities[c.rarity]+=n;
    }
    if(Object.values(counts).reduce((a,b)=>a+b,0)!==r.n)return null;
    if(![r.before,r.after].every(n=>Number.isFinite(n)&&n>=0&&n<=2)||r.after<r.before)return null;
    return {kind:p.kind,result:{n:r.n,counts,rarities,before:r.before,after:r.after}};
  }
  if(['battle','campaign'].includes(p.kind)&&typeof r.win==='boolean'&&Number.isInteger(r.rank)&&r.rank>=1&&r.rank<=100) {
    if(p.kind==='campaign'&&(!Number.isInteger(r.mission)||!G.MISSIONS[r.mission]||typeof r.first!=='boolean'))return null;
    if(r.win&&(!r.reward||![r.reward.cash,r.reward.dust].every(n=>Number.isFinite(n)&&n>=0&&n<=20000)))return null;
    return {kind:p.kind,result:{win:r.win,rank:r.rank,reward:r.win?{cash:r.reward.cash,dust:r.reward.dust}:null,...(p.kind==='campaign'?{mission:r.mission,first:r.first,bonus:r.bonus===true,summary:validSummary(r.summary)}:{})}};
  }
  return null;
}

function validSummary(x){
  if(!x||!['turns','survivors','total','damage','healing','prevented'].every(k=>Number.isSafeInteger(x[k])&&x[k]>=0&&x[k]<=1e15))return null;
  const clean=Object.fromEntries(['turns','survivors','total','damage','healing','prevented'].map(k=>[k,x[k]]));
  if(Number.isSafeInteger(x.skillBlocks)&&x.skillBlocks>=0&&x.skillBlocks<=240)clean.skillBlocks=x.skillBlocks;
  return clean;
}
