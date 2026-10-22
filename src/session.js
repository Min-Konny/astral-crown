import * as G from './game.js';
export const SAVE_KEY = 'astral-crown-save-v1';
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
  return Object.fromEntries(['turns','survivors','total','damage','healing','prevented'].map(k=>[k,x[k]]));
}
