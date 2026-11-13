import * as G from './game.js';
import {icon,summonView,homeView,earnView,shopView,ascensionView,refreshEconomy} from './royal-ui.js';
import {portraitHTML} from './character-art.js';
import {createStage} from './scenes.js';
import {SAVE_KEY,rankingContinuation,continueRanking,levelTransaction,resourceTransaction,transact,receipt,trainTransaction,patrolDestination,battleReadout,restoreBattleSave,restorePendingBattle,pendingCombat,pendingBattleToken,startPendingBattle,advancePendingBattle,changeBattleMode} from './session.js';
const $=q=>document.querySelector(q), key=SAVE_KEY;
document.querySelectorAll('nav [data-page]').forEach(b=>{b.querySelector('span').innerHTML='';b.querySelector('span').className='painted-nav-icon';b.querySelector('span').setAttribute('aria-hidden','true');});
$('#settings').innerHTML=icon('gear');
// Preview tabs use tab-scoped storage so QA never touches a player's local save.
const preview=new URLSearchParams(location.search).get('preview')==='1';
const storage={getItem:k=>(preview?sessionStorage:localStorage).getItem(k),setItem:(k,v)=>(preview?sessionStorage:localStorage).setItem(k,v)};
const fmt=n=>Math.floor(n).toLocaleString('ja-JP'), pct=n=>(n*100).toFixed(2);
let state=G.initialState(), page='home', banner='pickup', count=10, filter='all', packQuantity=1, timer, audio, saveFailed=false, restored=0, recovered=false,recoveredBattle=false;
try{
  const raw=storage.getItem(key);
  if(raw){
    try{const parsed=JSON.parse(raw),r=restoreBattleSave(parsed);state=r.state;restored=r.offline;if(r.battleDamaged){recoveredBattle=true;try{storage.setItem(key+'-damaged-battle-'+Date.now(),raw);}catch{saveFailed=true;}}}
    catch{storage.setItem(key+'-damaged-'+Date.now(),raw);recovered=true;}
  }
}catch{saveFailed=true;}
function save(){
  state.lastSeen=Date.now();
  try{storage.setItem(key,JSON.stringify(state));$('#save-status').textContent='✓ このブラウザに保存済み';}
  catch{if(!saveFailed)toast('保存できません。設定からセーブを書き出してください');saveFailed=true;$('#save-status').textContent='保存不可 · 書き出してください';}
}
let toastTimer;
function toast(text){
  clearTimeout(toastTimer);
  $('#toast').classList.remove('visible');
  const homeNotice=$('.home-notice');
  const notice=homeNotice||$('#toast');
  notice.textContent=text;
  if(homeNotice)homeNotice.hidden=false;
  notice.classList.add('visible');
  if($('#modal').open){
    let error=$('#dialog-notice');
    if(!error){error=document.createElement('p');error.id='dialog-notice';error.setAttribute('role','status');$('#modal-content').append(error);}
    error.textContent=text;error.scrollIntoView({block:'nearest'});
  }
  toastTimer=setTimeout(()=>{notice.classList.remove('visible');if(homeNotice)homeNotice.hidden=true;},4200);
}
function sound(kind='tap'){
  if(!state.settings.sound)return;
  try{
    audio ||= new (window.AudioContext||window.webkitAudioContext)(); audio.resume();
    const notes=kind==='ssr'?[392,494,587,784,988]:kind==='purchase'?[440,554,659,880]:[440,660];
    notes.forEach((freq,i)=>{
      const o=audio.createOscillator(),gain=audio.createGain(),t=audio.currentTime+i*.09;
      o.type='sine';o.frequency.value=freq;gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(.075,t+.02);gain.gain.exponentialRampToValueAtTime(.001,t+.55);
      o.connect(gain);gain.connect(audio.destination);o.start(t);o.stop(t+.6);
    });
  }catch{}
}
function preferences(){
  document.body.classList.toggle('soft',state.settings.soft);
  document.body.classList.toggle('quick',state.settings.quick);
}
const shortMotion=()=>state.settings.quick||state.settings.soft||matchMedia('(prefers-reduced-motion: reduce)').matches;
let mission=-1;
function growthText(s,id){
  const c=G.byId(id),rank=s.mastery?.[id]??0,p=G.promotionPower(s,id);
  if(!G.isHero(c))return `編成枠不要：全員の${(s.focus?.[id]??'power')==='power'?`攻撃 +${pct(rank*.015+p*.005)}%`:`HP +${pct(rank*.02+p*.0075)}%`}（従来の所持ボーナスに追加）`;
  return c.role==='防御'?`守りの軽減率 ${pct(Math.min(.65,.4+rank*.06+p*.01))}%`:`固有技の効果 +${pct(rank*.15+p*.03)}%`;
}
function levelControl(id){
  const i=G.levelInfo(state,id);
  return '<button class="level-control wide" data-level="'+id+'" data-level-current="'+i.level+'" '+(i.reason?'disabled':'')+'>Lv.'+i.level+(i.level>=50?' / 50 · 上限':(' → '+(i.level+1)))+'<small>'+ (i.level>=50?'通常レベルは最大です':('必要素材 '+fmt(i.cost)+' / 所持 '+fmt(state.dust)+(i.reason?' · '+i.reason:' · 育成する')) )+'</small></button>';
}
let trainingReturnId=null;
let trainingReturnFromShowcase=false;
const trainingTripKey=(preview?'preview-':'')+'astral-crown-training-trip';
function trainingTrip(){
 try{const r=JSON.parse(sessionStorage.getItem(trainingTripKey));return r&&r.season===state.season&&G.byId(r.id)&&state.counts[r.id]>0&&Number.isInteger(r.mission)&&G.MISSIONS[r.mission]&&r.mission<=state.campaignCleared?r:null;}catch{return null;}
}
function trainingBack(missionId){const r=trainingTrip();return r?.mission===missionId?`<button data-training-back>${G.byId(r.id).name}の育成へ戻る</button>`:'';}
function materialGuide(id){
 const c=G.byId(id);if(!state.counts[id])return '';
 const info=G.trainingInfo(state,id),level=G.isHero(c)?G.levelInfo(state,id):null;
 const costs=[...(level&&level.level<50?[level.cost]:[]),...(info.rank<2?[info.cost]:[])];
 if(!costs.length)return '';
 const missing=Math.max(0,Math.min(...costs)-state.dust),routes=G.materialRoutes(state);
 return `<section class="material-guide"><h3>育成素材の入手先</h3><p>所持 ${fmt(state.dust)} / 次の育成費用 ${fmt(Math.min(...costs))}${missing?'・あと'+fmt(missing):'・素材は足りています'}<br>鍛錬の解放条件は上の表示を確認してください。</p>${routes.map(r=>`<button class="wide" data-material-mission="${r.mission}" data-material-character="${id}">${G.MISSIONS[r.mission].name}<small>${r.kind==='first'?'初回勝利で':'任意目標達成で'}素材 +${r.dust}（1回限り）${r.kind==='objective'?' · '+G.OBJECTIVES[r.mission]:''}</small></button>`).join('')||'<p>庭園の素材報酬はすべて受取済みです。ランキング戦の勝利や召喚でも素材を入手できます。</p>'}</section>`;
}
function combatTrial(id){
 const c=G.byId(id);if(!c||!state.counts[id])return '';
 const hero=G.isHero(c),equipped=state.team.includes(id),v=hero?G.stats(state,c):null;
 const label=hero?(equipped?'編成中・次の戦闘に反映':'未編成・使うには編成へ'):'編成不要・出撃する全員に反映';
 return `<section class="combat-trial"><p><b>${label}</b><br>${hero?`現在の攻撃 ${fmt(v.atk)} / HP ${fmt(v.hp)}`:`現在の編成・攻撃合計 ${fmt(state.team.reduce((sum,key)=>sum+G.stats(state,G.byId(key)).atk,0))}`}</p><button class="wide" data-try-upgrade="${id}">${hero&&!equipped?'この仲間の編成へ':'編成を試す → 出撃準備'}</button></section>`;
}
function trainingDialog(id,growthFeedback=''){
  trainingReturnId=id;
  const c=G.byId(id),info=G.trainingInfo(state,id),current=G.promotionStage(state,id),eligible=G.promotion(state.counts[id]),next=G.PROMOTION_THRESHOLDS[current];
  const preview=structuredClone(state);if(eligible.stage>current)G.promote(preview,id);
  const stats=G.isHero(c)?G.stats(state,c):null,after=stats?G.stats(preview,c):null;
  const skillPreview=structuredClone(state);skillPreview.mastery[id]=Math.min(2,info.rank+1);
  modal(`${mission>=0?`<button data-return-patrol>庭園「${G.MISSIONS[mission].name}」へ戻る</button>`:''}<section class="training-view"><div class="training-art tier-${Math.min(current,5)}">${crest(c)}<span class="stage-badge">第${current}段階</span></div><div><div class="eyebrow">${c.rarity} / ${c.role}</div><h2>${c.name}</h2><p>${G.isHero(c)?G.SKILLS[id].description:'C / UCの継承者。戦闘枠を使わず、全員の成長を支えます。'}</p><p><b>${fmt(state.counts[id])}枚</b> / ${next?`次の条件 ${fmt(next)}枚（あと${fmt(Math.max(0,next-state.counts[id]))}枚）`:'最終段階'}</p><p>累計条件・カード消費なし。複数段階をまとめて昇格できます。</p><p>確定済み ${fmt(state.confirmedCounts?.[id]??state.counts[id])}枚分。入手だけでは能力は変わりません。</p>${!G.isHero(c)?`<p>継承攻撃 +${pct(G.bonusFor(state,c))}% → +${pct(G.bonusFor(preview,c))}%</p>`:''}<p>${growthText(state,id)}${eligible.stage>current?` → ${growthText(preview,id)}`:''}</p>${stats?`<p>攻撃 ${fmt(stats.atk)} → ${fmt(after.atk)} / HP ${fmt(stats.hp)} → ${fmt(after.hp)}</p>`:''}<button class="primary wide" data-promote="${id}" ${eligible.stage>current?'':'disabled'}>${eligible.stage>current?`強化する：第${current} → 第${eligible.stage}段階`:(next?'カードを集めて次の昇格へ':'最大段階まで強化済み')}</button>${G.isHero(c)?levelControl(id)+`<p class="growth-status ${growthFeedback?'growth-feedback':''}" role="status">${growthFeedback||'素材でレベルを強化。保存後に能力が反映されます。'}</p>`:''}${combatTrial(id)}<h3>${G.isHero(c)?'固有技の鍛錬':'継承の鍛錬'} ${info.rank} / 2</h3><p>${growthText(state,id)} → ${growthText(skillPreview,id)}</p><button class="wide" data-train-skill="${id}" ${info.reason?'disabled':''}>${info.reason||`鍛える：素材 ${info.cost}`}</button>${materialGuide(id)}<div class="button-row">${['power','guard'].map(f=>`<button data-focus="${f}" data-focus-id="${id}" ${info.rank||current>=2?'':'disabled'} class="${(state.focus[id]??'power')===f?'equipped':''}">${f==='power'?'攻撃を伸ばす':'耐久を伸ばす'}</button>`).join('')}</div><p>方針は無料で選び直せます。${G.isHero(c)?'昇格・鍛錬後は攻撃+8%かHP+12%。':'鍛錬1段につき全員の攻撃+1.5%かHP+2%。昇格も方針に応じて加算。'}</p></div></section>`,'training-modal');
}
function promotionResult(result,replay=false){
  const c=G.byId(result.id),before=structuredClone(state);before.promotions[result.id]=result.from;
  modal(`<section class="promotion-view ${replay||shortMotion()?'still':''}"><div class="eyebrow">ASCENSION / 昇格確定</div><div class="training-art tier-${Math.min(result.to,5)}">${crest(c)}</div><h2>${c.name}</h2><div class="stage-badge">第${result.from} → 第${result.to}段階</div><p>${growthText(before,c.id)}<br>↓<br>${growthText(state,c.id)}</p>${combatTrial(c.id)}<p>カード消費なし・保存済み。枠とオーラの変化です。別イラストの解放ではありません。</p><button data-action="skip-promotion">演出をスキップ</button><button class="primary" data-training="${c.id}">育成へ戻る</button></section>`,'promotion-modal');
}
function skipPromotion(){ $('.promotion-view')?.classList.add('still'); }
function wallet(){
  $('#cash').textContent='¥ '+fmt(state.cash);$('#gems').textContent=fmt(state.gems);$('#dust').textContent=fmt(state.dust);
  $('#season').innerHTML=`<small>闘技場 RANK · S${state.season}</small><strong>${fmt(state.rank)}<em>位</em></strong>`;
  const income=$('#income-value');if(income)income.innerHTML='¥ '+fmt(G.income(state))+'<small> / 秒</small>';
  refreshEconomy(state);
}
function heading(eyebrow,title,description,extra=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${extra}</div>`;}
function crest(c,extra=''){return '<div class="crest illustrated '+extra+'" aria-hidden="true">'+portraitHTML(c.id)+'</div>';}
document.addEventListener('load',e=>{if(e.target.matches?.('img[data-hero-art]'))e.target.parentElement.classList.add('has-dedicated-art');},true);
document.addEventListener('error',e=>{if(e.target.matches?.('img[data-hero-art]')){e.target.parentElement.classList.remove('has-dedicated-art');e.target.remove();}},true);

function badge(c){return `<span class="rarity" style="color:${G.RARITIES[c.rarity].color}">${c.rarity}</span>`;}
// UI-only highlight for the collection showcase. Never saved; economy and team stay in state.
let selectedId=null;
const ELEMENT_KEY={'水':'water','炎':'fire','森':'forest'};
const SHOWCASE_ART={luna:'./assets/redesign/lune-summon.png'};
function collectionPortrait(id){
  return `<img class="collection-portrait" src="./assets/redesign/portrait-${id}.webp" alt="" decoding="async">`;
}
function growState(c){
  const n=state.counts[c.id]??0,owned=n>0,stage=G.promotionStage(state,c.id),ready=owned&&G.promotion(n).stage>stage;
  const level=owned&&G.isHero(c)&&!G.levelInfo(state,c.id).reason,skill=owned&&!G.trainingInfo(state,c.id).reason;
  return {n,owned,stage,ready,grow:ready||level||skill,label:ready?'昇格可能':level||skill?'強化可能':''};
}
function cardFace(c,extra=''){
  const g=growState(c),hero=G.isHero(c),slot=state.team.indexOf(c.id);
  return `<span class="card-frame tier-${Math.min(g.stage,5)} rarity-${c.rarity.toLowerCase()} element-${ELEMENT_KEY[c.element]??'none'}" style="--rarity:${G.RARITIES[c.rarity].color}">${collectionPortrait(c.id)}<span class="card-rarity">${c.rarity}</span>${slot>=0?`<span class="card-flag team-flag">編成中</span>`:''}${g.label?`<span class="card-flag grow-flag">${g.label}</span>`:''}${extra}<span class="card-name"><i class="element-mark" aria-hidden="true">${c.element}</i><b>${c.name}</b><small>${!g.owned?'未所持':hero?`Lv.${state.levels[c.id]}`:`+${pct(G.bonusFor(state,c))}%`}</small></span></span>`;
}
function party(){
  const slots=[0,1,2,3].map(i=>{
    const id=state.team[i],pos=i<2?'前衛':'後衛';
    if(!id)return `<div class="party-slot empty"><span class="slot-label">${pos}</span><button class="party-empty" data-filter="heroes">＋<small>仲間を編成</small></button></div>`;
    const c=G.byId(id),label=growState(c).label;
    return `<div class="party-slot"><span class="slot-label">${pos}</span><button class="party-card ${selectedId===id?'selected-card':''}" data-select="${id}" aria-pressed="${selectedId===id}" aria-label="${pos} ${c.name}（${c.rarity}）${label?'・'+label:''}の詳細を表示">${cardFace(c)}</button></div>`;
  });
  return `<div class="party">${slots.join('')}</div>`;
}
function showcase(c){
  if(!c)return '';
  const g=growState(c),hero=G.isHero(c),r=G.RARITIES[c.rarity],equipped=state.team.includes(c.id),slot=state.team.indexOf(c.id),s=hero?G.stats(state,c):null,next=G.PROMOTION_THRESHOLDS[g.stage];
  const art=SHOWCASE_ART[c.id];
  return `<aside class="collection-showcase rarity-${c.rarity.toLowerCase()} element-${ELEMENT_KEY[c.element]??'none'} ${g.owned?'':'unowned'} ${art?'has-full-art':''}" aria-label="${c.name}の詳細" tabindex="-1">
  <div class="showcase-art" aria-hidden="true">${art?`<img src="${art}" alt="" decoding="async">`:collectionPortrait(c.id)}</div>
  <div class="showcase-info">
   <div class="showcase-name"><span class="card-rarity" style="--rarity:${r.color}">${c.rarity}</span><div><small>${c.title} · <span style="white-space:nowrap">${c.element} / ${c.role}</span></small><h2>${c.name}</h2></div></div>
   <p class="showcase-level">${!g.owned?'未所持 · 召喚で仲間にしよう':hero?`<b>Lv. ${state.levels[c.id]}</b><span>${G.awakening(state,c)} / ${r.cap}凸</span>`:`<span>全員の攻撃</span><b>+${pct(G.bonusFor(state,c))}%</b>`}</p>
   <dl class="showcase-stats">${hero?`<div><dt>HP</dt><dd>${fmt(s.hp)}</dd></div><div><dt>攻撃</dt><dd>${fmt(s.atk)}</dd></div>`:`<div><dt>上限</dt><dd>${fmt(r.cap)}枚</dd></div>`}<div><dt>所持</dt><dd>${fmt(g.n)}枚 · 第${g.stage}段階</dd></div></dl>
   <p class="showcase-note">${hero?(equipped?`編成中・${slot<2?'前衛':'後衛'} ${slot+1}番目`:g.owned?'未編成・編成すると戦闘に参加':'編成するには入手が必要'):'編成不要・手動昇格で全員を強化'}${next?` · 次の昇格まで ${fmt(Math.max(0,next-g.n))}枚`:' · 最終段階'}</p>
   <button class="primary wide showcase-train" data-training="${c.id}" ${g.owned?'':'disabled'}>${!g.owned?'未所持':g.ready?'昇格可能 · 育成する':'育成する'}</button>
   ${hero?`<div class="showcase-team"><button data-team="${c.id}" ${g.owned?'':'disabled'} class="${equipped?'equipped':''}" aria-pressed="${equipped}">${equipped?'編成中 · 外す':'編成する'}</button>${equipped?`<button class="forward" data-forward="${c.id}" aria-label="${c.name}を前へ" ${slot===0?'disabled':''}>← 前へ</button>`:''}</div>`:''}
  </div></aside>`;
}
function collection(){
  const chars=G.collectionCandidates(state,filter);
  if(!G.byId(selectedId))selectedId=state.team[0]??G.CHARACTERS.find(c=>state.counts[c.id])?.id??G.CHARACTERS[0].id;
  const owned=G.CHARACTERS.filter(c=>state.counts[c.id]>0).length;
  return `<section class="astral-collection">
  <div class="collection-title"><span class="title-crest" aria-hidden="true">☾</span><div><div class="eyebrow">LEGACY ARCHIVE</div><h1>継承図鑑</h1></div><span class="tag">全体攻撃 +${pct(G.collectionBonus(state))}%</span></div>
  <div class="collection-layout"><div class="collection-main">
  <section class="formation" aria-label="出撃編成"><div class="section-title"><h2>出撃編成 <small>${state.team.length} / 4</small></h2><span>左から前衛2人 → 後衛2人</span></div>${party()}</section>
  ${mission>=0?`<button class="primary wide" data-return-patrol>庭園「${G.MISSIONS[mission].name}」へ戻る</button>`:''}
  <section class="roster" aria-label="仲間一覧"><div class="roster-bar"><div class="tabs">${[['all','すべて'],['heroes','主力キャラ'],['legacy','全体強化 C / UC'],['promotion','昇格可能'],['training','鍛錬可能']].map(([id,label])=>`<button class="${filter===id?'selected':''}" data-filter="${id}" aria-pressed="${filter===id}">${label}</button>`).join('')}</div><span class="roster-count">所持 <b>${owned}</b> / ${G.CHARACTERS.length}</span></div>
  ${!chars.length?'<div class="roster-empty"><p>今の条件に合う仲間はいません。絞り込みは育成後も保持されます。</p><button data-filter="all">すべての仲間を表示</button></div>':''}
  <div class="character-grid">${chars.map(c=>{
    const g=growState(c);
    return `<article class="roster-card ${g.owned?'':'unowned'} ${selectedId===c.id?'selected-card':''}"><button class="roster-art" data-select="${c.id}" aria-pressed="${selectedId===c.id}" aria-label="${c.name}（${c.rarity}）${state.team.includes(c.id)?'・編成中':' '}${g.label?'・'+g.label:' '}の詳細を表示">${cardFace(c)}</button><button aria-label="${c.name}：${!g.owned?'未所持':g.ready?'昇格へ':'育成'}" class="roster-train ${g.ready?'ready':''}" data-training="${c.id}" ${g.owned?'':'disabled'}>${!g.owned?'未所持':g.ready?'昇格へ':'育成'}</button></article>`;
  }).join('')}</div></section>
  </div>${showcase(G.byId(selectedId))}</div></section>`;
}

function titleSummary(){
  const t=G.spendingTitles(state.spent);
  return '<section class="spending-titles" aria-label="疑似課金の称号"><b>疑似課金の称号 · 見た目のみ</b><div class="title-badges">'+(t.unlocked.length?t.unlocked.map(x=>'<span>取得済み：'+x.name+'</span>').join(''):'<span>まだ取得していません</span>')+'</div><p>'+ (t.next?'次は「'+t.next.name+'」 · 累計 '+fmt(t.next.amount)+'（あと '+fmt(t.next.amount-state.spent)+'）':'すべての称号を取得済み')+'</p><small>ゲーム内のおこづかいのみ。能力・報酬への影響はありません。</small></section>';
}
function shop(){return shopView(state,packQuantity,titleSummary());}
function earn(){return earnView(state,restored);}

function showStage(){
  const sceneState=page==='summon'?{...state,summonBanner:banner}:
    mission>=0&&page==='arena'?{...state,previewEnemy:G.missionEnemy(mission).units}:state;
  stage.show(page,sceneState,shortMotion());
}

function render(){
  wallet();preferences();
  const scenic=['home','summon','arena'].includes(page);
  document.body.dataset.page=page;
  $('#game-stage').hidden=!scenic;
  $('#main').innerHTML=scenic?gameHUD():({collection,shop,earn}[page])();
  if(scenic)showStage();
  document.querySelectorAll('nav [data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);if(b.dataset.page===page)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  refreshEconomy(state);
}
function dismissReceipt(){if(!playing&&state.presentation){delete state.presentation;save();}}
function closeModal(){clearTimeout(timer);if($('#modal').open)$('#modal').close();dismissReceipt();}
function modal(html,cls=''){
  clearTimeout(timer);$('#modal').className=cls;
  $('#modal-content').innerHTML=`<button class="modal-close" data-action="close" aria-label="閉じる">×</button>${html}`;
  if(!$('#modal').open)$('#modal').showModal();
}
$('#modal').addEventListener('cancel',()=>{clearTimeout(timer);dismissReceipt();});
$('#modal').addEventListener('close',()=>{
  if($('#modal').open)return; // A replacement dialog may already be open.
  if(trainingReturnId&&page==='collection'){
    const scope=trainingReturnFromShowcase?'.collection-showcase':'.roster';
    const target=$(`${scope} [data-training="${trainingReturnId}"]:not(:disabled)`)||
      $(`[data-training="${trainingReturnId}"]:not(:disabled)`)||
      $(`.roster [data-filter="${filter}"]`)||$('nav [data-page="collection"]');
    target?.scrollIntoView({block:'nearest',behavior:'instant'});
    target?.focus({preventScroll:true});
  }
  trainingReturnId=null;
  trainingReturnFromShowcase=false;
});
function checkout(id){
  const base=G.PACKS.find(p=>p.id===id),p={...base,price:base.price*packQuantity,gems:base.gems*packQuantity,name:base.name+' ×'+fmt(packQuantity)};
  modal(`<div class="eyebrow">SIMULATED CHECKOUT</div><h2>お支払いの確認</h2><p>ゲーム内のおこづかいを使います。</p><div class="payment-methods">${[['carrier','▣','キャリア決済','ASTRA mobile'],['credit','▰','クレジット','CROWN CARD •••• 0000'],['prepaid','▤','プリペイド','STAR GIFT 残高連携']].map(([id,icon,label,note],i)=>`<label><input type="radio" name="payment" value="${id}" ${i===0?'checked':''}><span>${icon}</span><div>${label}<small>${note}</small></div></label>`).join('')}</div><div class="receipt"><div><span>${p.name}</span><b>✧ ${fmt(p.gems)}</b></div><div><span>ゲーム内のお支払い額</span><strong>¥ ${fmt(p.price)}</strong></div><div><span>購入前のおこづかい</span><span>¥ ${fmt(state.cash)}</span></div><div><span>購入後のおこづかい</span><span>¥ ${state.cash<p.price?'不足 '+fmt(p.price-state.cash):fmt(state.cash-p.price)}</span></div></div><p class="simulation-label">実際の請求は発生しません。決済情報は不要です。</p><button class="primary wide" data-confirm-pack="${p.id}" ${state.cash<p.price?'disabled':''}>${state.cash<p.price?'残高不足です':'¥ '+fmt(p.price)+'の購入を確定する'}</button>${state.cash<p.price?'<button class="wide" data-page="earn">おこづかいを稼ぐ →</button>':''}`,'checkout-modal');
}
function commitResources(action){
  let tx;
  try{tx=resourceTransaction(storage,state,action);}
  catch(e){throw Error('保存・確定できませんでした。状態は変更していません。再試行できます：'+e.message);}
  state=tx.state;saveFailed=false;$('#save-status').textContent='✓ このブラウザに保存済み';
  return tx.result;
}
function purchase(id){
  const previousSpent=state.spent;
  const method=document.querySelector('input[name=payment]:checked')?.value||'carrier',p=commitResources(s=>G.buy(s,id,packQuantity));
  const earned=G.spendingTitles(state.spent).unlocked.filter(t=>previousSpent<t.amount);
  render();sound('purchase');
  modal(`<div class="purchase-success"><span class="eyebrow">PAYMENT APPROVED</span><div class="approved">✓</div><h2>決済が完了しました</h2><p>${{carrier:'キャリア決済',credit:'クレジット',prepaid:'プリペイド'}[method]} · ゲーム内のお支払い</p><div class="paid-amount">¥ <span id="paid-counter">0</span></div><div class="gem-award">✧ +${fmt(p.gems)}<small>星晶石を獲得</small></div><p>累計疑似課金額 ¥ ${fmt(state.spent)}</p>${earned.length?`<div class="spending-titles title-earned" role="status"><b>称号を取得：${earned.map(t=>t.name).join('・')}</b><p>疑似課金の記念です。能力・報酬は変わりません。</p></div>`:''}<button class="primary wide" data-go-summon>さっそく召喚する →</button><button class="text-button" data-action="close">ショップに戻る</button></div>`,'effect-modal');
  const start=performance.now();
  const animate=t=>{const el=$('#paid-counter');if(!el)return;const f=shortMotion()?1:Math.min(1,(t-start)/800);el.textContent=fmt(p.price*(1-(1-f)**3));if(f<1)requestAnimationFrame(animate);};
  requestAnimationFrame(animate);
}
function pullCards(r){
  if(r.n!==10)return '';
  return '<div class="ten-results">'+Object.entries(r.counts).flatMap(([id,n])=>Array.from({length:n},()=>{
    const c=G.byId(id);
    return '<div class="pull-card" style="--rarity:'+G.RARITIES[c.rarity].color+'"><span>'+c.rarity+'</span>'+portraitHTML(c.id)+'<b>'+c.name+'</b></div>';
  })).join('')+'</div>';
}
function summonTraining(){
  const id=state.team.find(id=>!G.levelInfo(state,id).reason);if(!id)return '';
  const info=G.levelInfo(state,id),c=G.byId(id);
  return `<section class="combat-trial summon-training"><p>召喚で得た素材は、編成中の仲間の育成にも使えます。</p><button class="wide" data-training="${id}">${c.name} Lv.${info.level} → ${info.level+1} / 素材 ${info.cost}<br>育成を確認 →</button></section>`;
}
function summonResult(r){
  const ssrs=Object.entries(r.counts).filter(([id])=>G.byId(id).rarity==='SSR');
  modal(`<div class="result"><div class="eyebrow">${ssrs.length?'A NEW LEGEND IS BORN':'EVERY ENCOUNTER MATTERS'}</div><h2>${ssrs.length?'星々が、あなたに応えた。':'出会いは、確かな力に。'}</h2><p>${fmt(r.n)}連召喚の結果</p><div class="rarity-totals">${Object.entries(r.rarities).map(([rarity,n])=>`<div><span style="color:${G.RARITIES[rarity].color}">${rarity}</span><strong>${fmt(n)}</strong></div>`).join('')}</div>${pullCards(r)}<details class="result-breakdown"><summary>キャラ別の獲得数と強化を確認</summary><div class="collected-results">${Object.entries(r.counts).map(([id,n])=>{const c=G.byId(id),stage=G.promotionStage(state,id),next=G.PROMOTION_THRESHOLDS[stage],ready=G.promotion(state.counts[id]).stage>stage;return `<button data-training="${id}"><b>${c.name} ×${fmt(n)}</b><span>所持 ${fmt(state.counts[id])}枚 / ${next?`次の条件 ${fmt(next)}枚`:'最大段階'}</span><strong>${ready?'強化可能':next?`あと${fmt(next-state.counts[id])}枚`:'強化済み'}</strong><span>コレクションで見る →</span></button>`;}).join('')}</div></details>${summonTraining()}${ssrs.length?`<div class="ssr-results">${ssrs.map(([id,n])=>{const c=G.byId(id);return `<div>${crest(c)}<span class="gold">SSR</span><h3>${c.name}</h3><strong>×${fmt(n)}</strong></div>`;}).join('')}</div>`:''}<div class="legacy-gain"><span>継承による全体攻撃ボーナス</span><strong>+${pct(r.before)}% <small>→</small> +${pct(r.after)}%</strong><p>入手だけでは強化されません。コレクションで手動昇格 · 育成素材 +${fmt(r.n*8)}</p></div><button class="primary wide" data-action="summon">もう一度 ${fmt(count)}連 · ✧ ${fmt(count*300)}</button><button class="text-button" data-action="close">結果を閉じる</button></div>`,'result-modal');
}
function settings(){
  modal(`<span class="eyebrow">PREFERENCES</span><h2>設定とセーブ</h2><div class="settings-list">${[['sound','効果音','短い合成音で演出を彩ります'],['quick','演出を短縮','ガチャと戦闘の結果をすぐ表示'],['soft','発光・動きを抑える','光の演出とアニメーションを軽減']].map(([id,label,note])=>`<label><div>${label}<small>${note}</small></div><input type="checkbox" data-setting="${id}" ${state.settings[id]?'checked':''}></label>`).join('')}</div><p>このブラウザに自動保存します。別端末へ移す場合は書き出してください。同時に複数のタブで遊ぶと保存が競合するため、1つのタブでご利用ください。</p><div class="button-row"><button data-action="export">セーブを書き出す</button><button data-action="import">セーブを読み込む</button></div><button class="danger text-button" data-action="reset">セーブを初期化する</button><p class="muted">試作版 · 実際のお金を使う機能はありません</p>`);
}
function rates(){
  modal(`<span class="eyebrow">SUMMON DETAILS</span><h2>提供割合と天井</h2><div class="receipt">${Object.entries(G.RARITIES).map(([r,d])=>`<div><span style="color:${d.color}">${r}</span><strong>${Number((d.rate*100).toFixed(4))}%</strong></div>`).join('')}</div><p>ピックアップではSSR抽選時、リュネ50%、レオニス25%、フィオレ25%。常設は各SSR均等です。他レアは同レア内で均等です。</p><p>100連以内にSSR確定。SSRが出るとカウンターをリセット。天井はバナー共通です。10連SR保証はありません。1,000連・10,000連も1回ずつ同じ確率と天井で抽選します。</p><p>天井分を除く基本排出率です。キャラは自動で重なり、上限後も枚数と育成素材は獲得します。</p>`);
}
function confirmAscend(){modal(ascensionView(state),'ascension-modal');}

function run(action){
  try{action();}catch(e){toast(e.message);}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(playing)return;
  run(()=>{
    if(b.dataset.skillMode){state=changeBattleMode(storage,state,b.dataset.skillMode);render();return;}
    if(b.dataset.continueRank){state=continueRanking(storage,state,b.dataset.continueRank);resumeBattle();return;}
    if(b.dataset.page){if(!['home','earn','shop','summon','collection','arena'].includes(b.dataset.page))return;closeModal();page=b.dataset.page;render();$('#main').scrollTop=0;window.scrollTo({top:0});return;}
    if(b.hasAttribute('data-return-patrol')){closeModal();page='arena';render();window.scrollTo({top:0});return;}
    if(b.dataset.retryPatrol!==undefined||b.dataset.nextPatrol!==undefined){const next=b.dataset.nextPatrol!==undefined;const target=patrolDestination(state,Number(next?b.dataset.nextPatrol:b.dataset.retryPatrol),next?'next':'retry',Number(b.dataset.patrolRun));if(target===null)return;mission=target;page='arena';playBattle();return;}
    if(b.dataset.tryUpgrade){
      const id=b.dataset.tryUpgrade,c=G.byId(id);if(!c||!state.counts[id])return;
      if(G.isHero(c)&&!state.team.includes(id)){trainingReturnId=null;closeModal();page='collection';filter='heroes';selectedId=id;render();const target=$('[data-team="'+id+'"]');target?.scrollIntoView({block:'center',behavior:'instant'});target?.focus({preventScroll:true});return;}
      const target=mission>=0&&mission<=state.campaignCleared?mission:Math.min(state.campaignCleared,G.MISSIONS.length-1);
      sessionStorage.setItem(trainingTripKey,JSON.stringify({id,mission:target,season:state.season}));closeModal();mission=target;page='arena';render();window.scrollTo({top:0});return;
    }
    if(b.dataset.materialMission!==undefined){
      const target=Number(b.dataset.materialMission),id=b.dataset.materialCharacter;
      if(!state.counts[id]||!G.materialRoutes(state).some(r=>r.mission===target))throw Error('入手先が変わりました。育成画面を開き直してください');
      sessionStorage.setItem(trainingTripKey,JSON.stringify({id,mission:target,season:state.season}));
      closeModal();mission=target;page='arena';render();window.scrollTo({top:0});return;
    }
    if(b.hasAttribute('data-training-back')){const r=trainingTrip();if(!r)return;closeModal();page='collection';render();trainingDialog(r.id);return;}
    if(b.hasAttribute('data-adjust-patrol')){mission=state.presentation?.result?.mission??mission;closeModal();page='collection';render();return;}
    if(b.dataset.training){
      const fromShowcase=!!b.closest('.collection-showcase')||
        (!!b.closest('#modal')&&trainingReturnId===b.dataset.training&&trainingReturnFromShowcase);
      closeModal();page='collection';render();
      trainingReturnFromShowcase=fromShowcase;
      trainingDialog(b.dataset.training);return;
    }
    if(b.dataset.promote){const r=commit('promotion',s=>G.promote(s,b.dataset.promote));render();promotionResult(r);return;}
    if(b.dataset.trainSkill){state=trainTransaction(storage,state,s=>G.trainSkill(s,b.dataset.trainSkill));render();trainingDialog(b.dataset.trainSkill);return;}
    if(b.dataset.focus){state=trainTransaction(storage,state,s=>G.chooseFocus(s,b.dataset.focusId,b.dataset.focus));render();trainingDialog(b.dataset.focusId);return;}
    if(b.dataset.action==='skip-promotion'){skipPromotion();return;}
    if(b.dataset.banner){banner=b.dataset.banner;render();$(`[data-banner="${banner}"]`)?.focus({preventScroll:true});return;}
    if(b.dataset.count){count=Number(b.dataset.count);render();$(`[data-count="${count}"]`)?.focus({preventScroll:true});return;}
    if(b.dataset.mission!==undefined){mission=Number(b.dataset.mission);page='arena';render();return;}
    if(b.dataset.select){
      const fromParty=!!b.closest('.party');selectedId=b.dataset.select;render();
      const panel=$('.collection-showcase');
      const main=$('#main');
      const bounds=panel.getBoundingClientRect(),viewport=main.getBoundingClientRect();
      if(e.detail===0||matchMedia('(max-width:1100px)').matches||bounds.top<viewport.top||bounds.bottom>viewport.bottom){
        panel?.scrollIntoView({block:'start',behavior:'instant'});
        panel?.focus({preventScroll:true});
      }else $(`${fromParty?'.party':'.roster'} [data-select="${selectedId}"]`)?.focus({preventScroll:true});
      return;
    }
    if(b.dataset.filter){filter=b.dataset.filter;render();$(`.roster [data-filter="${filter}"]`)?.focus({preventScroll:true});return;}
    if(b.dataset.quantity){
      packQuantity=Number(b.dataset.quantity);
      render();
      $(`[data-quantity="${packQuantity}"]`)?.focus({preventScroll:true});
      return;
    }
    if(b.dataset.pack){checkout(b.dataset.pack);return;}
    if(b.dataset.confirmPack){purchase(b.dataset.confirmPack);return;}
    if(b.hasAttribute('data-go-summon')){closeModal();page='summon';render();return;}
    if(b.dataset.level){
      const inDetail=b.closest('.training-modal'),scroll=$('#modal').scrollTop;
      const previousLevel=state.levels[b.dataset.level],previousStats=G.stats(state,G.byId(b.dataset.level));
      state=levelTransaction(storage,state,b.dataset.level,Number(b.dataset.levelCurrent));render();
      if(inDetail){const currentStats=G.stats(state,G.byId(b.dataset.level));trainingDialog(b.dataset.level,`✓ Lv.${previousLevel} → ${state.levels[b.dataset.level]}・保存済み<br>攻撃 ${fmt(previousStats.atk)} → ${fmt(currentStats.atk)} / HP ${fmt(previousStats.hp)} → ${fmt(currentStats.hp)}`);$('#modal').scrollTop=scroll;const next=$('#modal [data-level]');if(!next.disabled)next.focus({preventScroll:true});else $('#modal .modal-close')?.focus({preventScroll:true});}
      sound();return;
    }
    if(b.dataset.team){const id=b.dataset.team;G.toggleTeam(state,id);save();render();$(`[data-team="${id}"]`)?.focus({preventScroll:true});return;}
    if(b.dataset.forward){const id=b.dataset.forward;G.moveForward(state,id);save();render();const f=$(`[data-forward="${id}"]`);(f&&!f.disabled?f:$(`[data-team="${id}"]`))?.focus({preventScroll:true});return;}
    const actions={
      close:closeModal,
      work:()=>{commitResources(G.work);wallet();const feedback=$('#work-feedback');if(feedback){feedback.textContent='+¥ '+fmt(300*(1+state.seals*.25));feedback.classList.remove('earned');void feedback.offsetWidth;feedback.classList.add('earned');}sound();},
      facility:()=>{commitResources(G.upgradeFacility);render();sound('purchase');},
      mail:()=>{commitResources(G.claimMail);render();toast('お詫びの星晶石 +3,000');sound('purchase');},
      summon:playSummon,
      rates,battle:playBattle,ascend:confirmAscend,
      'confirm-ascend':()=>{const n=commitResources(G.ascend);closeModal();render();toast(`シーズン${state.season}へようこそ。継承印 +${n}`);sound('ssr');},
      export:()=>{save();const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='astral-crown-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
      import:()=>$('#import-file').click(),
      reset:()=>modal(`<h2>セーブを初期化しますか？</h2><p>キャラ・凸・購入記録・継承印を含め、すべて失われます。必要なら先に書き出してください。</p><button class="danger wide" data-action="confirm-reset">すべて消去して最初から</button><button class="text-button" data-action="close">キャンセル</button>`),
      'confirm-reset':()=>{state=G.initialState();save();closeModal();page='home';render();toast('セーブを初期化しました');},
    };actions[b.dataset.action]?.();
  });
});
document.addEventListener('change',e=>{
  if(e.target.dataset.setting){state.settings[e.target.dataset.setting]=e.target.checked;preferences();showStage();save();if(e.target.dataset.setting==='sound')sound();}
});
let pendingImport;
$('#import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{
    if(file.size>1000000)throw Error('セーブファイルが大きすぎます');
    const imported=JSON.parse(await file.text());pendingImport=restorePendingBattle(imported,G.validateSave(imported));
    modal(`<h2>セーブを読み込みますか？</h2><p>シーズン${pendingImport.season} · ${fmt(pendingImport.pulls)}連 · ${pendingImport.rank}位のデータで、現在の進行を置き換えます。</p><button id="confirm-import" class="primary wide">このデータに置き換える</button><button class="text-button" data-action="close">キャンセル</button>`);
    $('#confirm-import').onclick=()=>{state=restorePendingBattle(pendingImport,G.restore(pendingImport).state);save();closeModal();render();if(state.pendingBattle)resumeBattle();toast('セーブを読み込みました');};
  }catch(err){toast('読み込めません：'+err.message);}
});
$('#settings').onclick=()=>{if(!playing)settings();};
let last=Date.now(),saveTicks=0;
setInterval(()=>{
  const now=Date.now();G.tick(state,(now-last)/1000);last=now;wallet();
  if(++saveTicks%5===0)save();
},1000);
window.addEventListener('pagehide',save);
let playing=false;
const stage=createStage($('#game-stage'),toast);
$('#skip-playback').onclick=()=>{if(state.pendingBattle){fastBattle=true;stage.skip();if(!animating&&!battleError)pumpBattle();}else stage.skip();};
let battleSpeed=1;
const playbackToolbar=document.createElement('div');playbackToolbar.id='playback-toolbar';$('#playback').append(playbackToolbar);playbackToolbar.append($('#skip-playback'));
const speedButton=document.createElement('button');speedButton.id='battle-speed';speedButton.hidden=true;speedButton.textContent='演出 1倍';speedButton.setAttribute('aria-label','戦闘の演出速度を切り替える');playbackToolbar.prepend(speedButton);
speedButton.onclick=()=>{if(!playing||speedButton.hidden)return;battleSpeed=battleSpeed===1?2:1;stage.setBattleSpeed?.(battleSpeed);speedButton.textContent=`演出 ${battleSpeed}倍`;};
function setPlaying(value){if(!value)speedButton.hidden=true;playing=value;document.body.classList.toggle('playing',value);$('#playback').hidden=!value;}
function skillModeButtons(){return '<div class="skill-mode-choice" aria-label="スキル発動モード">'+['auto','manual'].map(m=>'<button data-skill-mode="'+m+'" aria-pressed="'+((state.settings.skillMode??'auto')===m)+'">'+m.toUpperCase()+'</button>').join('')+'</div>';}
function gameHUD(){
  if(page==='home')return homeView(state);
  if(page==='summon')return summonView(state,banner,count);
  if(mission>=0){
    const m=G.MISSIONS[mission],cleared=state.campaignCleared??0,medal=!!((state.campaignMedals??0)&(1<<mission));
    const route=cleared<G.MISSIONS.length?`次の攻略地点：${G.MISSIONS[cleared].name}`:'全庭園クリア · 任意目標に挑戦';
    return `<section class="arena-ui patrol"><div class="chapter"><span>GARDEN PATROL · ${cleared}/${G.MISSIONS.length} CLEAR</span><h1>${m.name}</h1><p>${route}</p></div><div class="opponent"><small>選択中 ${mission+1}/${G.MISSIONS.length} · ${mission<cleared?'再挑戦':'初回攻略'}</small><h2>${m.tactic||['前衛を突破','後衛への狙撃','盾と回復'][mission]}</h2><p>${m.hint}</p><p class="patrol-reward"><b>${mission<cleared?'初回報酬は受取済み':`初回報酬：素材 ${m.dust} · おこづかい ${fmt(m.cash)}`}</b><br>${medal?'任意目標も達成済み · 再戦報酬なし':`任意目標：${G.OBJECTIVES[mission]}<br>達成で素材 +120（1回限り）`}</p></div><div class="arena-dock">${skillModeButtons()}<div class="tabs" aria-label="庭園を選択">${G.MISSIONS.map(m=>`<button data-mission="${m.id}" ${m.id>cleared?'disabled':''} aria-pressed="${mission===m.id}" class="${mission===m.id?'selected':''}">${m.id+1} ${m.name}${m.id<cleared?' ✓':''}</button>`).join('')}</div>${trainingBack(mission)||'<button data-page="collection">編成・育成</button>'}<button class="primary" data-action="battle">${mission<cleared?'再挑戦する':'巡回へ出発'} →</button><button data-mission="-1">ランキング戦</button></div></section>`;
  }
  const enemy=G.rival(state),reward=G.ascensionReward(state);
  return `<section class="arena-ui"><div class="chapter"><span>CROWN ARENA / NPCリーグ</span><h1>星冠闘技場</h1><p>${state.rank}位 → ${enemy.rank}位に挑戦</p></div><div class="opponent"><small>NEXT RIVAL</small><h2>${enemy.name}</h2><p>戦力 ${fmt(G.power(state))} / ${state.team.length}人編成</p></div><div class="arena-dock">${skillModeButtons()}<button data-mission="0">庭園巡回 / ${G.MISSIONS.length}つの試練</button><button data-page="collection">編成・育成</button><button class="primary" data-action="battle">ランキング戦に挑む →</button><button data-action="ascend" ${reward?'':'disabled'}>${reward?`転生する · 継承印 +${reward}`:'50位以内で転生解放'}</button></div></section>`;
}
function commit(kind,action){
  if(playing)throw Error('演出が終わるまでお待ちください');
  let committed;
  try{committed=transact(storage,state,kind,action);}catch(e){throw Error('確定できませんでした：'+e.message);}
  state=committed.state;return committed.result;
}
function playSummon(){
  const result=commit('summon',s=>G.summon(s,count,banner));
  if($('#modal').open)$('#modal').close();
  render();setPlaying(true);$('#playback-text').textContent='召喚結果は保存済みです';sound('tap');
  stage.summon(result,Object.keys(result.counts).map(G.byId),shortMotion(),()=>{setPlaying(false);render();sound(result.rarities.SSR?'ssr':'tap');summonResult(result);});
}
function battleResult(result){
  if(result.mission!==undefined){
    modal(`<div class="battle-result"><span>${result.win?'VICTORY':'RETRY'}</span><h2>${G.MISSIONS[result.mission].name}</h2><p>${result.win?(result.first?`初回踏破！ 育成素材 +${result.reward.dust} / おこづかい +${fmt(result.reward.cash)}`:`再戦完了・育成素材 +${result.reward.dust}（初回報酬は受取済み）`):'育成・隊列を見直して再挑戦しよう。消費はありません。'}</p><p>${result.bonus?'任意目標達成：素材120を上の報酬に含みます。':'任意目標：'+G.OBJECTIVES[result.mission]}</p>${result.summary?`<p>${result.summary.turns}ターン / 生存 ${result.summary.survivors}/${result.summary.total}<br>与ダメージ ${fmt(result.summary.damage)} / 回復 ${fmt(result.summary.healing)} / 守りで軽減 ${fmt(result.summary.prevented)}${result.summary.skillBlocks!==undefined?` / 範囲技の盾軽減 ${result.summary.skillBlocks}人分`:""}</p>`:''}<p>結果は保存済みです。次の行動を選んでください。</p><div class="button-row">${patrolDestination(state,result.mission,'next')!==null?`<button class="primary" data-next-patrol="${result.mission}" data-patrol-run="${state.campaignRuns??0}">次へ出撃：${G.MISSIONS[result.mission+1].name} →</button>`:''}${trainingBack(result.mission)}<button data-adjust-patrol>編成・育成を調整</button><button data-retry-patrol="${result.mission}" data-patrol-run="${state.campaignRuns??0}">同じ庭園に再挑戦</button><button data-action="close">巡回へ戻る</button></div></div>`);return;
  }
  modal(`<div class="battle-result"><span class="eyebrow">${result.win?'VICTORY':'DEFEAT'}</span><h2>${result.win?'勝利。新しい星へ。':'次は、きっと届く。'}</h2><div class="rank-result">${state.rank}<small>位</small></div><p>${result.win?`おこづかい +¥${fmt(result.reward.cash)} · 育成素材 +${fmt(result.reward.dust)}`:'編成と育成を見直して再挑戦しよう。'}</p><p>結果は保存済みです。</p>${rankingContinuation(state)?`<button class="primary" data-continue-rank="${rankingContinuation(state).token}">${rankingContinuation(state).retry?'同じ相手に再挑戦':'次の相手へ出撃'}：${rankingContinuation(state).rank}位 →</button>`:'<p>1位達成！ 次の順位はありません。</p>'}<button data-action="close">闘技場に戻る</button></div>`);
}
let battleEpoch=0,animating=false,fastBattle=false,battleError=false,battleTimer;
const combatControls=document.createElement('section');combatControls.id='combat-controls';combatControls.hidden=true;$('#playback').append(combatControls);
function combatControlsUpdate(){
  combatControls.hidden=!state.pendingBattle;
  if(!state.pendingBattle)return;
  const c=pendingCombat(state),status=G.combatStatus(c),token=pendingBattleToken(state),epoch=battleEpoch;
  const waiting=!animating&&status.waiting&&!battleError;
  combatControls.innerHTML=`<div class="button-row">${['auto','manual'].map(m=>`<button data-mode="${m}" aria-pressed="${c.mode===m}" ${battleError?'disabled':''}>${m.toUpperCase()}</button>`).join('')}</div><p>${battleError?'保存できませんでした。進行を止めています。':waiting?`${G.byId(status.actor).name} / ${G.SKILLS[status.actor].name}：発動可能`:`${c.mode.toUpperCase()} / ${status.turn}ターン目${status.side==='a'?`・再使用まで ${status.cooldown}ターン`:''}`}</p>${waiting?'<div class="button-row"><button class="primary" data-decision="use">スキル発動</button><button data-decision="hold">温存・通常攻撃</button></div>':''}${battleError?'<button data-resume>保存を再試行</button>':''}`;
  combatControls.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{
    if(epoch!==battleEpoch||token!==pendingBattleToken(state)||battleError)return;
    try{state=changeBattleMode(storage,state,b.dataset.mode,token);combatControlsUpdate();if(!animating){clearTimeout(battleTimer);battleTimer=setTimeout(()=>pumpBattle(),0);}}
    catch(e){combatFailure(e,()=>b.onclick());}
  });
  combatControls.querySelectorAll('[data-decision]').forEach(b=>b.onclick=()=>{if(epoch===battleEpoch&&token===pendingBattleToken(state)&&!animating&&!battleError)pumpBattle(b.dataset.decision);});
}
let retryCombat;
function combatFailure(error,retry){
  battleError=true;retryCombat=retry;combatControlsUpdate();
  const b=combatControls.querySelector('[data-resume]');if(b)b.onclick=()=>{battleError=false;const action=retryCombat;retryCombat=null;action();};
  toast('戦闘を保存できません：'+error.message);
}
function pumpBattle(choice){
  if(!state.pendingBattle||animating||battleError)return;
  clearTimeout(battleTimer);
  const before=pendingCombat(state),status=G.combatStatus(before);
  if(status.waiting&&!choice){combatControlsUpdate();return;}
  const token=pendingBattleToken(state),epoch=battleEpoch;
  let step;
  try{step=advancePendingBattle(storage,state,token,choice);state=step.state;}
  catch(e){combatFailure(e,()=>pumpBattle(choice));return;}
  animating=true;combatControlsUpdate();wallet();
  const visual={live:true,allies:before.a,enemy:{units:before.b},frames:step.frames};
  stage.battle(visual,shortMotion()||fastBattle,(f)=>{
    $('#playback-text').textContent=`${f.turn}ターン / ${f.side==='a'?'味方':'敵'} ${G.byId(f.actor)?.name??f.actor} → ${G.byId(f.target)?.name??f.target}\n${f.ability|| (f.skill?'スキル':'通常攻撃')}：${f.dealt??f.amount??0}${f.prevented?`（軽減 ${f.prevented}）`:''}`;
  },()=>{
    if(epoch!==battleEpoch)return;
    animating=false;
    if(step.result){battleEpoch++;clearTimeout(battleTimer);combatControls.hidden=true;setPlaying(false);render();battleResult(step.result);return;}
    combatControlsUpdate();battleTimer=setTimeout(()=>pumpBattle(),0);
  });
  stage.setBattleSpeed?.(battleSpeed);
}
function resumeBattle(){
  battleEpoch++;clearTimeout(battleTimer);animating=false;battleError=false;fastBattle=false;
  mission=state.pendingBattle.mission;page='arena';if($('#modal').open)$('#modal').close();
  render();setPlaying(true);battleSpeed=1;speedButton.textContent='演出 1倍';speedButton.hidden=shortMotion();
  $('#playback-text').textContent='通常攻撃は自動。MANUALでは発動可能なスキルだけ選択します。';
  const c=pendingCombat(state),epoch=battleEpoch;
  stage.battle({live:true,allies:c.a,enemy:{units:c.b},frames:[]},true,()=>{},()=>{if(epoch===battleEpoch){combatControlsUpdate();battleTimer=setTimeout(()=>pumpBattle(),0);}});
}
function playBattle(){
  if(playing)return;
  state=startPendingBattle(storage,state,mission);resumeBattle();
}

render();
if(state.pendingBattle)resumeBattle();
else if(state.presentation){
  if(state.presentation.kind==='campaign')mission=state.presentation.result.mission;
  page=state.presentation.kind==='summon'?'summon':'arena';render();
  if(state.presentation.kind==='promotion'){page='collection';render();promotionResult(state.presentation.result,true);}
  else if(state.presentation.kind==='summon')summonResult(state.presentation.result);else battleResult(state.presentation.result);
}
if(recoveredBattle)toast('途中の戦闘記録を復元できませんでした。所持品と育成は維持し、戦闘前に戻しました。');
else if(recovered)toast('破損したセーブを退避し、初期状態で開始しました');
else if(saveFailed)toast('自動保存が利用できません。設定から書き出してください');
else if(restored>1000)toast(`おかえりなさい。放置収入 +¥${fmt(restored)}`);
