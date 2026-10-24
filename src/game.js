// Cosmetic milestones from requirements §6; amounts are simulated spending only.
export const SPENDING_TITLES = [
  {id:'first',name:'初課金',amount:480},
  {id:'patron',name:'太客',amount:10000},
  {id:'legend',name:'伝説の支援者',amount:100000},
];
export function spendingTitles(spent){
  const total=Number.isFinite(spent)&&spent>=0?spent:0;
  return {unlocked:SPENDING_TITLES.filter(t=>total>=t.amount),next:SPENDING_TITLES.find(t=>total<t.amount)??null};
}
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
export const PROMOTION_THRESHOLDS=[1,10,50,200,1000,5000,20000,100000,300000];
export function promotion(count){
  const stage=PROMOTION_THRESHOLDS.filter(n=>count>=n).length;
  return {stage,next:PROMOTION_THRESHOLDS[stage]??null,remaining:Math.max(0,(PROMOTION_THRESHOLDS[stage]??count)-count)};
}
export const promotionStage=(s,id)=>s.promotions?.[id]??(s.counts[id]>0?1:0);
export const promotionPower=(s,id)=>Math.max(0,promotionStage(s,id)-1);
export function promote(s,id){
  if(!byId(id)||!s.counts[id])throw Error('仲間にしてから昇格できます');
  const from=promotionStage(s,id),to=promotion(s.counts[id]).stage;
  if(to<=from)throw Error('次の昇格に必要な枚数が足りません');
  s.promotions??=Object.fromEntries(CHARACTERS.map(c=>[c.id,s.counts[c.id]>0?1:0]));
  s.promotions[id]=to;s.confirmedCounts??={};s.confirmedCounts[id]=s.counts[id];return {id,from,to};
}
export function initialState(now = Date.now()) {
  return { version:1, cash:18000, gems:3000, dust:300, facility:0, rank:100, bestRank:100,
    season:1, seals:0, pity:0, spent:0, pulls:0, mail:false, lastSeen:now, campaignCleared:0, campaignRuns:0, campaignMedals:0,
    counts:Object.fromEntries(CHARACTERS.map(c => [c.id, ['iris','noel','mira'].includes(c.id) ? 1 : 0])),
    levels:Object.fromEntries(CHARACTERS.filter(isHero).map(c => [c.id,1])),
    promotions:Object.fromEntries(CHARACTERS.map(c=>[c.id,['iris','noel','mira'].includes(c.id)?1:0])),
    confirmedCounts:Object.fromEntries(CHARACTERS.map(c=>[c.id,['iris','noel','mira'].includes(c.id)?1:0])),
    mastery:Object.fromEntries(CHARACTERS.map(c=>[c.id,0])),
    focus:Object.fromEntries(CHARACTERS.map(c=>[c.id,'power'])),
    team:['noel','iris','mira'], settings:{ sound:false, quick:false, soft:false, skillMode:'auto' }, battleSerial:0 };
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
  return r.bonus ? Math.sqrt(Math.min(s.confirmedCounts?.[c.id]??s.counts[c.id],r.cap)/r.cap)*r.bonus : 0;
}
export const collectionBonus = s => CHARACTERS.reduce((sum,c) => sum + bonusFor(s,c),0);
export const awakening = (s,c) => Math.min(RARITIES[c.rarity].cap, Math.max(0,(s.confirmedCounts?.[c.id]??s.counts[c.id])-1));
export function stats(s,c) {
  const mult = (1 + awakening(s,c)*.18)*(1 + (s.levels[c.id]-1)*.08);
  const trained=(s.mastery?.[c.id]??0)>0||promotionPower(s,c.id)>0,focus=s.focus?.[c.id]??'power';
  const ascend=1+promotionPower(s,c.id)*.02;
  return { atk:c.atk*mult*(1+collectionBonus(s))*(1+s.seals*.08)*(1+legacyTraining(s,'power'))*(trained&&focus==='power'?1.08:1)*ascend, hp:Math.round(c.hp*mult*(1+legacyTraining(s,'guard'))*(trained&&focus==='guard'?1.12:1)*ascend) };
}
export const legacyTraining=(s,focus)=>CHARACTERS.filter(c=>!isHero(c)&&s.counts[c.id]>0&&(s.focus?.[c.id]??'power')===focus).reduce((n,c)=>n+(s.mastery?.[c.id]??0)*(focus==='power'?.015:.02)+promotionPower(s,c.id)*(focus==='power'?.005:.0075),0);
export function trainingInfo(s,id){
  const c=byId(id);if(!c)throw Error('仲間が見つかりません');
  const rank=s.mastery?.[id]??0,requiredLevel=(rank+1)*3;
  const reason=!s.counts[id]?'召喚で仲間にしよう':rank>=2?'強化完了':(s.campaignCleared??0)<rank+1?`巡回 ${rank+1} を踏破しよう`:isHero(c)&&s.levels[id]<requiredLevel?`Lv.${requiredLevel} で解放`:s.dust<150*(rank+1)?'育成素材が足りません':'';
  return {rank,cost:150*(rank+1),reason};
}
export function trainSkill(s,id){
  const info=trainingInfo(s,id);if(info.reason)throw Error(info.reason);
  s.mastery??=Object.fromEntries(CHARACTERS.map(c=>[c.id,0]));
  s.dust-=info.cost;s.mastery[id]=info.rank+1;
}
export function collectionCandidates(s,filter='all'){
  return CHARACTERS.filter(c=>filter==='promotion'?s.counts[c.id]>0&&promotion(s.counts[c.id]).stage>promotionStage(s,c.id):filter==='training'?!trainingInfo(s,c.id).reason:filter==='heroes'?isHero(c):filter==='legacy'?!isHero(c):true);
}
export function chooseFocus(s,id,focus){
  if(!byId(id)||!s.counts[id]||!((s.mastery?.[id]??0)>0||promotionPower(s,id)>0)||!['power','guard'].includes(focus))throw Error('強化か第2段階への昇格で成長方針を選べます');
  s.focus??=Object.fromEntries(CHARACTERS.map(c=>[c.id,'power']));s.focus[id]=focus;
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
    s.counts[c.id]++;if(s.promotions&&s.promotions[c.id]===0)s.promotions[c.id]=1; result.counts[c.id]=(result.counts[c.id]||0)+1; result.rarities[rarity]++;
  }
  s.dust += n*8; s.pulls += n; result.after=collectionBonus(s);
  return result;
}
export function levelInfo(s,id) {
  const c=byId(id);
  const level=s.levels[id]??0,cost=level*30,missing=Math.max(0,cost-s.dust);
  const reason=!c||!isHero(c)||!s.counts[id]?'所持している主力キャラを選んでください':level>=50?'通常レベルは最大です':missing?`育成素材があと${missing}必要です`:'';
  return {level,cost,missing,reason};
}
export function levelUp(s,id) {
  const info=levelInfo(s,id);if(info.reason)throw Error(info.reason);
  s.dust-=info.cost;s.levels[id]++;
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
export const SKILLS = {
  noel:{name:'守りの輪',description:'3ターンごとに味方全員の次の被ダメージを40%軽減。'},
  sol:{name:'不退の盾',description:'3ターンごとに味方全員の次の被ダメージを40%軽減。'},
  iris:{name:'貫く一矢',description:'3ターンごとに防御役の軽減を無視する1.8倍の単体攻撃。'},
  ash:{name:'火花の奔流',description:'3ターンごとに生存する敵全員へ0.9倍の範囲攻撃。'},
  luna:{name:'星の裁き',description:'3ターンごとに2.2倍の単体攻撃。'},
  mira:{name:'木漏れ日の祈り',description:'3ターンごとにHP割合が最も低い味方を攻撃力の1.8倍回復。'},
  flora:{name:'芽吹きの合唱',description:'3ターンごとに生存する味方全員を攻撃力の0.9倍回復。'},
};
export function beginCombat(s,enemy=rival(s),mode='auto') {
  if(!['auto','manual'].includes(mode))throw Error('Invalid skill mode');
  const allies=s.team.map(id=>({...byId(id),...stats(s,byId(id)),mastery:s.mastery?.[id]??0,promotion:promotionPower(s,id)}));
  return {allies,enemy:structuredClone(enemy),a:allies.map(c=>({...c,max:c.hp})),b:enemy.units.map(c=>({...c,max:c.hp})),frames:[],turn:1,side:'a',cursor:0,mode,readyAt:Object.fromEntries(allies.map(c=>[c.id,3])),rank:s.rank,done:false};
}
function seekCombat(c){
  while(!c.done){
    if(c.turn>30||!c.a.some(x=>x.hp>0)||!c.b.some(x=>x.hp>0)){c.done=true;break;}
    const own=c[c.side];
    if(c.cursor>=own.length){c.cursor=0;if(c.side==='a')c.side='b';else{c.side='a';c.turn++;}continue;}
    if(own[c.cursor].hp<=0){c.cursor++;continue;}
    break;
  }
}
export function combatStatus(c){
  seekCombat(c);if(c.done)return {done:true};
  const actor=c[c.side][c.cursor],ready=c.side==='a'&&c.turn>=c.readyAt[actor.id];
  return {done:false,turn:c.turn,side:c.side,actor:actor.id,ready,waiting:ready&&c.mode==='manual',cooldown:c.side==='a'?Math.max(0,c.readyAt[actor.id]-c.turn):(3-((c.turn-(actor.skillOffset??0))%3+3)%3)%3};
}
export function stepCombat(c,choice){
  const status=combatStatus(c);if(status.done)throw Error('Combat already finished');
  if(status.waiting&&!['use','hold'].includes(choice))return {waiting:true,frames:[]};
  if(choice!==undefined&&(!status.waiting||!['use','hold'].includes(choice)))throw Error('Skill decision is not available');
  const {a,b,enemy,frames,turn}=c,side=c.side,foe=side==='a'?'b':'a',own=c[side],other=c[foe],u=own[c.cursor];
  const skill=side==='a'?status.ready&&(c.mode==='auto'||choice==='use'):(turn-(u.skillOffset??0))%3===0;
  if(skill&&side==='a')c.readyAt[u.id]=turn+3;
  const from=frames.length;
  const snap=(text,turn,event)=>frames.push({text,turn,...event,a:a.map(c=>({id:c.id,name:c.name,hp:c.hp,max:c.max})),b:b.map(c=>({id:c.id,name:c.name,hp:c.hp,max:c.max}))});
      const evolved=own===a||enemy.rank===undefined,boost=1+(u.mastery??0)*.15+(u.promotion??0)*.03;
      const ability=skill?(evolved?SKILLS[u.id]?.name:'通常奥義'):undefined;
      if(skill&&u.role==='防御'&&evolved){
        for(const target of own.filter(x=>x.hp>0))target.guard=Math.min(.65,.4+(u.mastery??0)*.06+(u.promotion??0)*.01);
        snap(`${u.name} / ${ability} → 味方全員を守る`,turn,{kind:'guard',actor:u.id,target:u.id,side,targetSide:side,amount:0,skill:true,ability});
      }else if(skill&&u.role==='支援'){
        const targets=u.id==='flora'&&evolved?own.filter(x=>x.hp>0):[own.filter(x=>x.hp>0).sort((x,y)=>x.hp/x.max-y.hp/y.max)[0]];
        for(const target of targets){
          const heal=Math.min(target.max-target.hp,Math.round(u.atk*(u.id==='flora'&&evolved?.9:1.8)*boost));
          target.hp+=heal;snap(`${u.name} / ${ability} → ${target.name} +${heal}`,turn,{kind:'heal',actor:u.id,target:target.id,side,targetSide:side,amount:heal,skill:true,ability});
        }
      }else{
        const targets=skill&&u.id==='ash'&&evolved?other.filter(x=>x.hp>0):[u.backline?other.findLast(x=>x.hp>0):other.find(x=>x.hp>0)];
        for(const target of targets){
          const adv=advantage(u.element,target.element),guarded=!!target.guard;
          const mult=skill&&u.role==='攻撃'?(evolved?(u.id==='ash'?.9:u.id==='luna'?2.2:1.8)*boost:1.8):1;
          const defense=target.role==='防御'&&!(skill&&u.id==='iris'&&evolved) ?.75:1;
          const base=u.atk*adv*mult*defense;
          const damage=Math.max(1,Math.round(base*(guarded?1-target.guard:1)));
          const dealt=Math.min(target.hp,damage);target.guard=false;target.hp=Math.max(0,target.hp-damage);
          snap(`${u.name}${ability?' / '+ability:'の攻撃'} → ${target.name} ${damage}${guarded?'（守りで軽減）':''}`,turn,{kind:'attack',actor:u.id,target:target.id,side,targetSide:foe,amount:damage,dealt,skill,ability,advantage:adv,prevented:guarded?Math.max(0,Math.round(base)-damage):0});
        }
      }
  c.cursor++;seekCombat(c);return {waiting:false,done:c.done,frames:frames.slice(from)};
}
export function combatResult(c){
  if(!combatStatus(c).done)throw Error('Combat is unfinished');
  const {a,b,frames,enemy,allies}=c,s={rank:c.rank};
  const ratio=units=>units.reduce((t,u)=>t+u.hp/u.max,0)/units.length;
  const win=ratio(a)>ratio(b);
  const summary={turns:frames.at(-1)?.turn||0,survivors:a.filter(u=>u.hp>0).length,total:a.length,
    damage:frames.filter(f=>f.side==='a'&&f.kind==='attack').reduce((v,f)=>v+f.dealt,0),
    healing:frames.filter(f=>f.side==='a'&&f.kind==='heal').reduce((v,f)=>v+f.amount,0),
    prevented:frames.filter(f=>f.targetSide==='a').reduce((v,f)=>v+(f.prevented||0),0)};
  if(enemy.units.some(u=>u.skillOffset))summary.skillBlocks=frames.filter(f=>f.side==='b'&&f.skill&&(f.prevented??0)>0).length;
  return {win,frames,summary,enemy,allies,reward:win?{cash:2000+(100-s.rank)*100,dust:180+(100-s.rank)*10}:null};
}
export function battle(s,enemy=rival(s)){
  const c=beginCombat(s,enemy);
  while(!combatStatus(c).done)stepCombat(c);
  return combatResult(c);
}
export function applyBattle(s,result) {
  if(result.applied)throw Error('戦闘結果は反映済みです');
  result.applied=true;
  if(result.win){
    s.rank=result.enemy.rank; s.bestRank=Math.min(s.bestRank,s.rank);
    s.cash=Math.min(1e15,s.cash+result.reward.cash);s.dust+=result.reward.dust;
  }
}
export const MISSIONS = [
  {id:0,name:'庭園の門',hint:'守護役を前へ。前衛を突破する攻撃役を育てよう。',ids:['noel','ash'],scale:.65,dust:240,cash:2000},
  {id:1,name:'木陰の射線',hint:'射手は最後尾を狙う。後衛の耐久と回復役の育成が鍵。',ids:['noel','iris','mira'],scale:.85,dust:360,cash:3500,backline:'iris'},
  {id:2,name:'誓いの守り手',hint:'盾と回復の連携。攻撃役を育て、回復を上回る火力で挑もう。',ids:['sol','ash','flora'],scale:.85,dust:600,cash:5000},
  {id:3,name:'星渡りの橋',tactic:'前衛の回復役と後衛射手',hint:'回復役が最前列、守り手が最後尾。回復前に前列を突破し、最後尾への狙撃には編成と回復で備えよう。',ids:['mira','iris','sol'],scale:1.05,dust:480,cash:5000,backline:'iris'},
  {id:4,name:'静謐の回廊',tactic:'2・5・8ターンの範囲攻撃',hint:'アッシュの範囲技は2・5・8ターン。盾を温存して危険なターンに合わせ、回復で立て直そう。',ids:['noel','ash','flora'],scale:1.15,dust:600,cash:6000,skillOffsets:{ash:2}},
  {id:5,name:'宵星の広場',tactic:'後衛狙撃と全体回復',hint:'前衛・射手・範囲攻撃・回復の4人編成。回復役の前に突破し、盾と回復を組み合わせよう。',ids:['noel','iris','ash','flora'],scale:1.15,dust:720,cash:7000,backline:'iris'},
  {id:6,name:'風切りの回廊',tactic:'1・4・7ターンの範囲攻撃',hint:'回復役のいない盾・射手・範囲攻撃の編成。最初の範囲技は受け、3ターン目に盾を温存して4ターン目に合わせよう。後衛の耐久にも備えよう。',ids:['noel','iris','ash'],scale:1.3,dust:600,cash:6000,backline:'iris',skillOffsets:{ash:1}},
  {id:7,name:'夜明けの泉',tactic:'前列の回復役と交互の攻撃',hint:'回復役が先頭。射手は1・4・7ターン、範囲技は2・5・8ターンに発動。前列を早く突破し、盾を範囲技に、回復を被弾後に合わせよう。',ids:['flora','sol','iris','ash'],scale:1.05,dust:720,cash:7000,backline:'iris',skillOffsets:{iris:1,ash:2}},
];
export function missionEnemy(id){
  const m=MISSIONS[id];if(!m)throw Error('巡回先が見つかりません');
  return {name:m.name,units:m.ids.map(id=>{const c=byId(id);return {...c,atk:Math.round(c.atk*m.scale),hp:Math.round(c.hp*m.scale),backline:id===m.backline,skillOffset:m.skillOffsets?.[id]??0};})};
}
export function campaignBattle(s,id){
  if(!Number.isInteger(id)||!MISSIONS[id]||id>(s.campaignCleared??0))throw Error('前の巡回をクリアしてください');
  const result=battle(s,missionEnemy(id)),m=MISSIONS[id];
  const bonus=result.win&&objectiveMet(id,result.summary)&&!((s.campaignMedals??0)&(1<<id));
  return {...result,mission:id,run:s.campaignRuns??0,first:id===(s.campaignCleared??0),bonus,
    reward:result.win?{cash:id===(s.campaignCleared??0)?m.cash:0,dust:(id===(s.campaignCleared??0)?m.dust:0)+(bonus?120:0)}:null};
}
export const OBJECTIVES=['3人以上で全員生存して勝利','回復と守りの軽減を両方発動して勝利','12ターン以内に勝利','3人以上で全員生存して勝利','範囲技の被弾を盾で3人分以上軽減し、回復して勝利','18ターン以内に回復と盾の軽減を使って勝利','3人以上で全員生存し、範囲技を盾で累計5人分以上軽減して勝利','3人以上で全員生存し、18ターン以内に勝利'];
export const objectiveMet=(id,x)=>[()=>x.total>=3&&x.survivors===x.total,()=>x.healing>0&&x.prevented>0,()=>x.turns<=12,()=>x.total>=3&&x.survivors===x.total,()=>x.skillBlocks>=3&&x.healing>0,()=>x.turns<=18&&x.healing>0&&x.prevented>0,()=>x.total>=3&&x.survivors===x.total&&x.skillBlocks>=5,()=>x.total>=3&&x.survivors===x.total&&x.turns<=18][id]?.()??false;
export function applyCampaign(s,result){
  if(result.applied||result.run!==(s.campaignRuns??0))throw Error('巡回結果は反映済みか古い結果です');
  if(!MISSIONS[result.mission]||result.mission>(s.campaignCleared??0))throw Error('巡回結果が不正です');
  result.applied=true;s.campaignRuns=(s.campaignRuns??0)+1;
  if(result.win&&result.mission===(s.campaignCleared??0)){
    const m=MISSIONS[result.mission];s.cash=Math.min(1e15,s.cash+m.cash);s.dust+=m.dust;s.campaignCleared=result.mission+1;
  }
  if(result.win&&objectiveMet(result.mission,result.summary)&&!((s.campaignMedals??0)&(1<<result.mission))){
    s.campaignMedals=(s.campaignMedals??0)|(1<<result.mission);s.dust+=120;
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
  for(const [key,max] of [['campaignCleared',MISSIONS.length],['campaignRuns',1e15],['campaignMedals',(1<<MISSIONS.length)-1]]){
    const value=raw[key]??0;
    if(!Number.isSafeInteger(value)||value<0||value>max)throw Error('巡回記録が不正です');
    s[key]=value;
  }
  for(const key of ['cash','gems','dust','facility','rank','bestRank','season','seals','pity','spent','pulls','lastSeen']){
    const n=raw[key];
    if(typeof n!=='number'||!Number.isFinite(n)||n<0||n>1e16)throw Error(`不正な保存値: ${key}`);
    if(key!=='cash'&&!Number.isInteger(n))throw Error(`整数ではない保存値: ${key}`);
    s[key]=n;
  }
  if(s.rank<1||s.rank>100||s.bestRank<1||s.bestRank>s.rank||s.facility>30||s.pity>99||s.season<1)throw Error('保存値が範囲外です');
  for(const c of CHARACTERS){
    const mastery=raw.mastery?.[c.id]??0,focus=raw.focus?.[c.id]??'power';
    if(!Number.isInteger(mastery)||mastery<0||mastery>2||!['power','guard'].includes(focus))throw Error('育成方針が不正です');
    s.mastery[c.id]=mastery;s.focus[c.id]=focus;
    const n=raw.counts?.[c.id];
    if(!Number.isSafeInteger(n)||n<0||n>1e15)throw Error('キャラの所持数が不正です');
    s.counts[c.id]=n;
    const confirmed=raw.confirmedCounts?.[c.id]??n;
    if(!Number.isSafeInteger(confirmed)||confirmed<0||confirmed>n)throw Error('確定済みカード枚数が不正です');
    s.confirmedCounts[c.id]=confirmed;
    const promoted=raw.promotions?.[c.id]??(n>0?1:0);
    if(!Number.isInteger(promoted)||promoted<0||promoted>promotion(n).stage||(n>0&&promoted===0))throw Error('昇格記録が不正です');
    s.promotions[c.id]=promoted;
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
  s.settings.skillMode=raw.settings?.skillMode??'auto';
  if(!['auto','manual'].includes(s.settings.skillMode))throw Error('Invalid skill mode');
  s.battleSerial=raw.battleSerial??0;
  if(!Number.isSafeInteger(s.battleSerial)||s.battleSerial<0||s.battleSerial>1e15)throw Error('Invalid battle serial');
  return s;
}
export function restore(raw,now=Date.now()){
  const s=validateSave(raw), before=s.cash;
  tick(s,(now-s.lastSeen)/1000);s.lastSeen=now;
  return {state:s,offline:s.cash-before};
}

// Navigation only: never promises farmable rewards after one-time rewards are exhausted.
export function materialRoutes(s){
 const cleared=s.campaignCleared??0,medals=s.campaignMedals??0;
 const first=MISSIONS[cleared];
 const optional=MISSIONS.find(m=>m.id<cleared&&!(medals&(1<<m.id)));
 return [...(first?[{mission:first.id,dust:first.dust,kind:'first'}]:[]),...(optional?[{mission:optional.id,dust:120,kind:'objective'}]:[])];
}
