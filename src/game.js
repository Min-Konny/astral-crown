export const RARITIES = {
  C: { rate: .50, cap: 100000, bonus: .25, color: '#a5afc2' },
  UC: { rate: .28, cap: 30000, bonus: .35, color: '#62d8a4' },
  R: { rate: .15, cap: 20, color: '#73b9ff' },
  SR: { rate: .05, cap: 10, color: '#c197ff' },
  SSR: { rate: .02, cap: 5, color: '#ffd98b' },
};
export const CHARACTERS = [
  { id:'luna', name:'リュネ', title:'月冠の魔女', rarity:'SSR', element:'水', role:'攻撃', atk:128, hp:650, icon:'☾', quote:'あなたが望む未来に、月の祝福を。' },
  { id:'sol', name:'レオニス', title:'暁光の騎士', rarity:'SSR', element:'炎', role:'防御', atk:92, hp:1100, icon:'♜', quote:'この剣は、あなたの誓いと共に。' },
  { id:'flora', name:'フィオレ', title:'星詠みの聖女', rarity:'SSR', element:'森', role:'支援', atk:102, hp:800, icon:'✿', quote:'何度巡っても、ここで待っている。' },
  { id:'iris', name:'イリス', title:'翠弓の狩人', rarity:'SR', element:'森', role:'攻撃', atk:83, hp:540, icon:'➶' },
  { id:'ash', name:'アッシュ', title:'紅蓮の剣士', rarity:'SR', element:'炎', role:'攻撃', atk:87, hp:520, icon:'⚔' },
  { id:'noel', name:'ノエル', title:'蒼の守護者', rarity:'R', element:'水', role:'防御', atk:48, hp:710, icon:'♜' },
  { id:'mira', name:'ミラ', title:'木漏れ日の祈り手', rarity:'R', element:'森', role:'支援', atk:53, hp:490, icon:'✧' },
  { id:'sage', name:'若葉の術師', title:'叡智の継承', rarity:'UC', element:'森', role:'継承', icon:'❧' },
  { id:'ranger', name:'蒼穹の斥候', title:'技巧の継承', rarity:'UC', element:'水', role:'継承', icon:'➶' },
  { id:'smith', name:'灯火の鍛冶師', title:'鍛錬の継承', rarity:'UC', element:'炎', role:'継承', icon:'⚒' },
  { id:'guard', name:'王都の衛兵', title:'守護の記憶', rarity:'C', element:'水', role:'継承', icon:'♜' },
  { id:'scholar', name:'見習い魔術師', title:'探求の記憶', rarity:'C', element:'炎', role:'継承', icon:'✦' },
  { id:'herbalist', name:'森の薬草師', title:'生命の記憶', rarity:'C', element:'森', role:'継承', icon:'❦' },
];
export const PACKS = [
  { id:'small', name:'ひとくち星晶パック', price:480, gems:600, tag:'気軽な一歩' },
  { id:'medium', name:'冒険者の星晶箱', price:3000, gems:4500, tag:'石をまとめて補充' },
  { id:'large', name:'星冠のプレミアム金庫', price:10000, gems:18000, tag:'60連分の星晶石' },
];
export const byId = id => CHARACTERS.find(c => c.id === id);
export const isHero = c => !RARITIES[c.rarity].bonus;
export function initialState(now = Date.now()) {
  return { version:1, cash:18000, gems:3000, dust:300, facility:0, rank:100, bestRank:100,
    season:1, seals:0, pity:0, spent:0, pulls:0, mail:false, lastSeen:now,
    counts:Object.fromEntries(CHARACTERS.map(c => [c.id, ['iris','noel','mira'].includes(c.id) ? 1 : 0])),
    levels:Object.fromEntries(CHARACTERS.filter(isHero).map(c => [c.id,1])),
    team:['noel','iris','mira'], settings:{ sound:false, quick:false, soft:false } };
}
export const income = s => 120 * 1.65 ** s.facility * (1 + s.seals * .25);
export const facilityCost = s => 3000 * 2 ** s.facility;
export function tick(s, seconds) {
  s.cash = Math.min(1e15, s.cash + income(s) * Math.max(0, Math.min(seconds, 28800)));
}
export function work(s) { s.cash = Math.min(1e15, s.cash + 300 * (1 + s.seals * .25)); }
export function upgradeFacility(s) {
  if (s.facility >= 30) throw Error('収入設備は試作の上限に達しました');
  const cost = facilityCost(s);
  if (s.cash < cost) throw Error('おこづかいが足りません');
  s.cash -= cost; s.facility++;
}
export function buy(s, id, quantity=1) {
  const base = PACKS.find(p => p.id === id);
  if (!base) throw Error('パックが見つかりません');
  if (![1,10,100,1000].includes(quantity)) throw Error('購入数が不正です');
  const p = {...base, price:base.price*quantity,gems:base.gems*quantity,quantity};
  if (s.cash < p.price) throw Error('おこづかいが足りません。仕事や収入設備で増やしましょう');
  s.cash -= p.price; s.gems = Math.min(1e15,s.gems+p.gems); s.spent += p.price;
  return p;
}
export function bonusFor(s,c) {
  const r = RARITIES[c.rarity];
  return r.bonus ? Math.sqrt(Math.min(s.counts[c.id],r.cap)/r.cap)*r.bonus : 0;
}
export const collectionBonus = s => CHARACTERS.reduce((sum,c) => sum + bonusFor(s,c),0);
export const awakening = (s,c) => Math.min(RARITIES[c.rarity].cap, Math.max(0,s.counts[c.id]-1));
export function stats(s,c) {
  const mult = (1 + awakening(s,c)*.18)*(1 + (s.levels[c.id]-1)*.08);
  return { atk:c.atk*mult*(1+collectionBonus(s))*(1+s.seals*.08), hp:Math.round(c.hp*mult) };
}
export const power = s => s.team.reduce((sum,id) => {const t=stats(s,byId(id));return sum+t.atk*5+t.hp;},0);
export function summon(s,n,banner='pickup',random=Math.random) {
  if (![10,100,1000,10000].includes(n)) throw Error('召喚回数が不正です');
  if (!['pickup','standard'].includes(banner)) throw Error('召喚対象が不正です');
  if (s.gems < n*300) throw Error(`星晶石が${(n*300-Math.floor(s.gems)).toLocaleString()}個足りません`);
  const before = collectionBonus(s);
  const result = { n, counts:{}, rarities:{C:0,UC:0,R:0,SR:0,SSR:0}, before, after:before };
  s.gems -= n*300;
  for(let i=0;i<n;i++) {
    s.pity++;
    let rarity='SSR';
    if(s.pity<100) {
      let roll=random();
      for(const [key,r] of Object.entries(RARITIES)) {roll-=r.rate;if(roll<0){rarity=key;break;}}
    }
    let pool=CHARACTERS.filter(c=>c.rarity===rarity), c;
    if(rarity==='SSR') {
      s.pity=0;
      if(banner==='pickup') {
        if(random()<.5)c=byId('luna');
        else pool=pool.filter(c=>c.id!=='luna');
      }
    }
    c ||= pool[Math.min(pool.length-1,Math.floor(random()*pool.length))];
    s.counts[c.id]++; result.counts[c.id]=(result.counts[c.id]||0)+1; result.rarities[rarity]++;
  }
  s.dust += n*8; s.pulls += n; result.after=collectionBonus(s);
  return result;
}
export function levelUp(s,id) {
  const c=byId(id);
  if(!c || !isHero(c) || !s.counts[id])throw Error('所持している主力キャラを選んでください');
  if(s.levels[id]>=50)throw Error('通常レベルは最大です');
  const cost=s.levels[id]*30;
  if(s.dust<cost)throw Error('育成素材が足りません');
  s.dust-=cost;s.levels[id]++;
}
export function toggleTeam(s,id) {
  const c=byId(id);
  if(!c || !isHero(c) || !s.counts[id])throw Error('このキャラは編成できません');
  if(s.team.includes(id)){
    if(s.team.length===1)throw Error('最低1人は編成してください');
    s.team=s.team.filter(x=>x!==id);
  }else{
    if(s.team.length>=4)throw Error('編成は4人までです。先に1人外してください');
    s.team.push(id);
  }
}
export function moveForward(s,id) {
  const i=s.team.indexOf(id);
  if(i>0)[s.team[i-1],s.team[i]]=[s.team[i],s.team[i-1]];
}
const advantage=(a,b)=>a===b?1:({炎:'森',森:'水',水:'炎'}[a]===b?1.25:.8);
export function rival(s) {
  const progress=(100-s.rank)/99;
  const scale=.70 + progress*3.6;
  const ids=['noel','ash','iris','mira'];
  return { name:s.rank>70?'無課金の誓い':s.rank>40?'推しだけ完凸':s.rank>10?'石油王ねこ':'†終焉の課金王†',
    rank:Math.max(1,s.rank-5),
    units:ids.map(id=>{const c=byId(id);return {...c,atk:Math.round(c.atk*scale),hp:Math.round(c.hp*scale)};}) };
}
export function battle(s) {
  const enemy=rival(s), allies=s.team.map(id=>({...byId(id),...stats(s,byId(id))}));
  const a=allies.map(c=>({...c,max:c.hp})), b=enemy.units.map(c=>({...c,max:c.hp}));
  const frames=[];
  const snap=(text,turn)=>frames.push({text,turn,a:a.map(c=>({name:c.name,hp:c.hp,max:c.max})),b:b.map(c=>({name:c.name,hp:c.hp,max:c.max}))});
  for(let turn=1;turn<=30;turn++) {
    for(const [own,other] of [[a,b],[b,a]]) {
      for(const u of own.filter(x=>x.hp>0)) {
        if(!other.some(x=>x.hp>0))break;
        if(u.role==='支援'&&turn%3===0){
          const target=own.filter(x=>x.hp>0).sort((x,y)=>x.hp/x.max-y.hp/y.max)[0];
          const heal=Math.min(target.max-target.hp,Math.round(u.atk*1.8));
          target.hp+=heal;snap(`${u.name}の祈り → ${target.name}を${heal}回復`,turn);
        }else{
          const target=other.find(x=>x.hp>0), adv=advantage(u.element,target.element);
          const skill=u.role==='攻撃'&&turn%3===0;
          const damage=Math.max(1,Math.round(u.atk*adv*(skill?1.8:1)*(target.role==='防御'?.75:1)));
          target.hp=Math.max(0,target.hp-damage);
          snap(`${u.name}${skill?'の奥義':'の攻撃'} → ${target.name} ${damage}${adv>1?' 属性有利':''}`,turn);
        }
      }
    }
    if(!a.some(x=>x.hp>0)||!b.some(x=>x.hp>0))break;
  }
  const ratio=units=>units.reduce((t,u)=>t+u.hp/u.max,0)/units.length;
  const win=ratio(a)>ratio(b);
  return {win,frames,enemy,allies,reward:win?{cash:2000+(100-s.rank)*100,dust:180+(100-s.rank)*10}:null};
}
export function applyBattle(s,result) {
  if(result.applied)throw Error('戦闘結果は反映済みです');
  result.applied=true;
  if(result.win){
    s.rank=result.enemy.rank; s.bestRank=Math.min(s.bestRank,s.rank);
    s.cash=Math.min(1e15,s.cash+result.reward.cash);s.dust+=result.reward.dust;
  }
}
export const ascensionReward = s => s.rank<=50?Math.floor((101-s.rank)/10):0;
export function ascend(s,now=Date.now()) {
  const reward=ascensionReward(s);
  if(!reward)throw Error('転生には50位以内への到達が必要です');
  Object.assign(s,{cash:18000,gems:3000,dust:300,facility:0,rank:100,season:s.season+1,
    seals:s.seals+reward,pity:0,levels:initialState(now).levels,lastSeen:now});
  return reward;
}
export function claimMail(s) {
  if(s.mail)throw Error('受取済みです');
  s.mail=true;s.gems+=3000;
}
export function validateSave(raw) {
  if(!raw||raw.version!==1)throw Error('未対応のセーブ形式です');
  const s=initialState();
  for(const key of ['cash','gems','dust','facility','rank','bestRank','season','seals','pity','spent','pulls','lastSeen']){
    const n=raw[key];
    if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e16)throw Error(`不正な保存値: ${key}`);
    if(key!=='cash'&&!Number.isInteger(n))throw Error(`整数ではない保存値: ${key}`);
    s[key]=n;
  }
  if(s.rank<1||s.rank>100||s.bestRank<1||s.bestRank>s.rank||s.facility>30||s.pity>99||s.season<1)throw Error('保存値が範囲外です');
  for(const c of CHARACTERS){
    const n=raw.counts?.[c.id];
    if(!Number.isSafeInteger(n)||n<0||n>1e15)throw Error('キャラの所持数が不正です');
    s.counts[c.id]=n;
    if(isHero(c)){
      const l=raw.levels?.[c.id];
      if(!Number.isInteger(l)||l<1||l>50)throw Error('キャラレベルが不正です');
      s.levels[c.id]=l;
    }
  }
  if(!Array.isArray(raw.team)||raw.team.length<1||raw.team.length>4||new Set(raw.team).size!==raw.team.length||
    raw.team.some(id=>!byId(id)||!isHero(byId(id))||!s.counts[id]))throw Error('編成が不正です');
  s.team=[...raw.team];
  if(typeof raw.mail!=='boolean')throw Error('受取記録が不正です');
  s.mail=raw.mail;
  for(const key of ['sound','quick','soft']){
    if(typeof raw.settings?.[key]!=='boolean')throw Error('設定が不正です');
    s.settings[key]=raw.settings[key];
  }
  return s;
}
export function restore(raw,now=Date.now()){
  const s=validateSave(raw), before=s.cash;
  tick(s,(now-s.lastSeen)/1000);s.lastSeen=now;
  return {state:s,offline:s.cash-before};
}
