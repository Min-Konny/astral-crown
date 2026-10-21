import * as G from './game.js';
import {createStage} from './scenes.js';
import {SAVE_KEY,transact,receipt} from './session.js';
const $=q=>document.querySelector(q), key=SAVE_KEY;
// Preview tabs use tab-scoped storage so QA never touches a player's local save.
const preview=new URLSearchParams(location.search).get('preview')==='1';
const storage={getItem:k=>(preview?sessionStorage:localStorage).getItem(k),setItem:(k,v)=>(preview?sessionStorage:localStorage).setItem(k,v)};
const fmt=n=>Math.floor(n).toLocaleString('ja-JP'), pct=n=>(n*100).toFixed(2);
let state=G.initialState(), page='home', banner='pickup', count=10, filter='all', packQuantity=1, timer, audio, saveFailed=false, restored=0, recovered=false;
try{
  const raw=storage.getItem(key);
  if(raw){
    try{const parsed=JSON.parse(raw),r=G.restore(parsed);state=r.state;state.presentation=receipt(parsed);restored=r.offline;}
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
  $('#toast').textContent=text;$('#toast').classList.add('visible');clearTimeout(toastTimer);
  if($('#modal').open){
    let error=$('#dialog-notice');
    if(!error){error=document.createElement('p');error.id='dialog-notice';error.setAttribute('role','status');$('#modal-content').append(error);}
    error.textContent=text;error.scrollIntoView({block:'nearest'});
  }
  toastTimer=setTimeout(()=>$('#toast').classList.remove('visible'),4200);
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
function wallet(){
  $('#cash').textContent='¥ '+fmt(state.cash);$('#gems').textContent=fmt(state.gems);$('#dust').textContent=fmt(state.dust);
  $('#season').innerHTML=`<span class="status-dot"></span> ASTRA — ${String(state.season).padStart(2,'0')} <small>シーズン ${state.season}</small>`;
  const income=$('#income-value');if(income)income.textContent='¥ '+fmt(G.income(state))+' / 秒';
}
function heading(eyebrow,title,description,extra=''){return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${extra}</div>`;}
function crest(c,extra=''){
  const frame={luna:0,sol:1,flora:3,noel:1,iris:2,ash:1,mira:3,sage:0,ranger:2,smith:1,guard:1,scholar:0,herbalist:3}[c.id];
  return '<div class="crest illustrated '+extra+'" aria-hidden="true"><div class="mini-portrait" style="background-position:'+frame*100/3+'% center"></div></div>';
}
function badge(c){return `<span class="rarity" style="color:${G.RARITIES[c.rarity].color}">${c.rarity}</span>`;}
function party(){
  return `<div class="party">${state.team.map((id,i)=>{const c=G.byId(id),s=G.stats(state,c);return `<div class="party-card">${crest(c)}<div>${badge(c)} <span class="muted">Lv.${state.levels[id]}</span><h3>${c.name}</h3><small>${i<2?'前衛':'後衛'} · ${c.element} / ${c.role}</small><p>ATK ${fmt(s.atk)} <span class="muted"> · ${G.awakening(state,c)}凸</span></p></div></div>`;}).join('')}${state.team.length<4?'<button class="party-empty" data-page="collection">＋<small>仲間を編成</small></button>':''}</div>`;
}
function collection(){
  const chars=G.CHARACTERS.filter(c=>filter==='all'||(filter==='legacy'?!G.isHero(c):G.isHero(c)));
  return heading('LEGACY ARCHIVE','継承図鑑','主役を育てる。無数の出会いを、全員の力に変える。',`<span class="tag">全体攻撃 +${pct(G.collectionBonus(state))}%</span>`)+`
  <section class="panel formation"><div class="section-title"><h2>出撃編成 <small>${state.team.length} / 4</small></h2><span class="muted">左から前衛2人 → 後衛2人</span></div>${party()}</section>
  <div class="tabs">${[['all','すべて'],['heroes','主力キャラ'],['legacy','全体強化 C / UC']].map(([id,label])=>`<button class="${filter===id?'selected':''}" data-filter="${id}">${label}</button>`).join('')}</div>
  <div class="character-grid">${chars.map(c=>{
    const n=state.counts[c.id],hero=G.isHero(c),r=G.RARITIES[c.rarity],owned=n>0;
    return `<article class="panel character-card ${owned?'':'unowned'}" style="--rarity:${r.color}"><div class="card-top">${badge(c)}<span>${c.element} · ${c.role}</span></div>${crest(c)}<small>${c.title}</small><h2>${c.name}</h2><p class="owned-count">所持 ${fmt(n)}体</p>${hero?
      `<div class="char-stats"><span>Lv.${state.levels[c.id]} / 50</span><span>${G.awakening(state,c)} / ${r.cap}凸</span></div><p class="stars">${'◆'.repeat(Math.min(G.awakening(state,c),5))}${'◇'.repeat(Math.max(0,Math.min(r.cap,5)-G.awakening(state,c)))}</p><button data-level="${c.id}" ${!owned||state.levels[c.id]>=50?'disabled':''}>育成 +1 <small>◈ ${fmt(state.levels[c.id]*30)}</small></button><div class="button-row"><button data-team="${c.id}" ${!owned?'disabled':''} class="${state.team.includes(c.id)?'equipped':''}">${state.team.includes(c.id)?'✓ 編成中 · 外す':'＋ 編成する'}</button>${state.team.includes(c.id)?`<button class="forward" data-forward="${c.id}" aria-label="${c.name}を前へ" ${state.team.indexOf(c.id)===0?'disabled':''}>←</button>`:''}</div>`:
      `<div class="legacy-value">全体攻撃 <strong>+${pct(G.bonusFor(state,c))}%</strong></div><div class="progress"><i style="width:${Math.min(100,n/r.cap*100)}%"></i></div><p class="muted">${fmt(n)} / ${fmt(r.cap)}体で完成</p><div class="passive-note">編成不要 · 自動で全員を強化<br>最大 +${r.bonus*100}%</div>`}</article>`;
  }).join('')}</div>`;
}
function shop(){
  return heading('STAR CRYSTAL BOUTIQUE','星を買う。夢を回す。','財布の限界を超える体験を、ゲームの中だけで。',`<span class="tag">REAL MONEY FREE</span>`)+`
  <div class="simulation-label">◇ これはゲーム内の疑似課金です。実際のお支払い・決済情報の入力はありません。</div>
  <section class="panel shop-summary"><div><small>累計疑似課金額</small><strong>¥ ${fmt(state.spent)}</strong><p>今日も王国の運営を支えていただき、ありがとうございます。</p></div><div class="shop-gem" aria-hidden="true">◇</div></section>
  <div class="section-title"><h2>まとめて購入</h2><span class="muted">選択数ぶんを一括決済</span></div><div class="tabs pack-quantities">${[1,10,100,1000].map(n=>`<button data-quantity="${n}" class="${packQuantity===n?'selected':''}">×${fmt(n)}</button>`).join('')}</div>
  <div class="pack-grid">${G.PACKS.map((p,i)=>`<article class="panel pack ${i===2?'premium':''}"><span class="tag">${p.tag}</span><div class="crystals" aria-hidden="true">${['◇','◇ ◇','◇ ✧ ◇'][i]}</div><h2>${p.name}${packQuantity>1?' ×'+fmt(packQuantity):''}</h2><strong>✧ ${fmt(p.gems*packQuantity)}</strong><p>星晶石 / ${fmt(p.gems*packQuantity/300)}連分</p><button class="${i===2?'primary':''}" data-pack="${p.id}">¥ ${fmt(p.price*packQuantity)} <small>ゲーム内</small></button></article>`).join('')}</div>
  <div class="notice">おこづかい収入 <b>¥ ${fmt(G.income(state))} / 秒</b><button class="text-button" data-page="home">収入設備を育てる →</button></div>`;
}
function render(){
  wallet();preferences();
  const scenic=['home','summon','arena'].includes(page);
  document.body.dataset.page=page;
  $('#game-stage').hidden=!scenic;
  $('#main').innerHTML=scenic?gameHUD():({collection,shop}[page])();
  if(scenic)stage.show(page,state,shortMotion());
  document.querySelectorAll('nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
}
function dismissReceipt(){if(!playing&&state.presentation){delete state.presentation;save();}}
function closeModal(){clearTimeout(timer);if($('#modal').open)$('#modal').close();dismissReceipt();}
function modal(html,cls=''){
  clearTimeout(timer);$('#modal').className=cls;
  $('#modal-content').innerHTML=`<button class="modal-close" data-action="close" aria-label="閉じる">×</button>${html}`;
  if(!$('#modal').open)$('#modal').showModal();
}
$('#modal').addEventListener('cancel',()=>{clearTimeout(timer);dismissReceipt();});
function checkout(id){
  const base=G.PACKS.find(p=>p.id===id),p={...base,price:base.price*packQuantity,gems:base.gems*packQuantity,name:base.name+' ×'+fmt(packQuantity)};
  modal(`<div class="eyebrow">SIMULATED CHECKOUT</div><h2>お支払い方法を選択</h2><p>ゲーム内のおこづかいを使います。</p><div class="payment-methods">${[['carrier','▣','キャリア決済','ASTRA mobile'],['credit','▰','クレジット','CROWN CARD •••• 0000'],['prepaid','▤','プリペイド','STAR GIFT 残高連携']].map(([id,icon,label,note],i)=>`<label><input type="radio" name="payment" value="${id}" ${i===0?'checked':''}><span>${icon}</span><div>${label}<small>${note}</small></div></label>`).join('')}</div><div class="receipt"><div><span>${p.name}</span><b>✧ ${fmt(p.gems)}</b></div><div><span>ゲーム内のお支払い額</span><strong>¥ ${fmt(p.price)}</strong></div><div><span>購入後のおこづかい</span><span>¥ ${fmt(state.cash-p.price)}</span></div></div><p class="simulation-label">実際の請求は発生しません。決済情報は不要です。</p><button class="primary wide" data-confirm-pack="${p.id}" ${state.cash<p.price?'disabled':''}>${state.cash<p.price?'残高不足です':'購入を確定する'}</button>`);
}
function purchase(id){
  const method=document.querySelector('input[name=payment]:checked')?.value||'carrier',p=G.buy(state,id,packQuantity);
  save();render();sound('purchase');
  modal(`<div class="purchase-success"><span class="eyebrow">PAYMENT APPROVED</span><div class="approved">✓</div><h2>決済が完了しました</h2><p>${{carrier:'キャリア決済',credit:'クレジット',prepaid:'プリペイド'}[method]} · ゲーム内のお支払い</p><div class="paid-amount">¥ <span id="paid-counter">0</span></div><div class="gem-award">✧ +${fmt(p.gems)}<small>星晶石を獲得</small></div><p>累計疑似課金額 ¥ ${fmt(state.spent)}</p><button class="primary wide" data-go-summon>さっそく召喚する →</button><button class="text-button" data-action="close">ショップに戻る</button></div>`,'effect-modal');
  const start=performance.now();
  const animate=t=>{const el=$('#paid-counter');if(!el)return;const f=shortMotion()?1:Math.min(1,(t-start)/800);el.textContent=fmt(p.price*(1-(1-f)**3));if(f<1)requestAnimationFrame(animate);};
  requestAnimationFrame(animate);
}
function pullCards(r){
  if(r.n!==10)return '';
  return '<div class="ten-results">'+Object.entries(r.counts).flatMap(([id,n])=>Array.from({length:n},()=>{
    const c=G.byId(id),frame={luna:0,sol:1,flora:3,noel:1,iris:2,ash:1,mira:3,sage:0,ranger:2,smith:1,guard:1,scholar:0,herbalist:3}[id];
    return '<div class="pull-card" style="--rarity:'+G.RARITIES[c.rarity].color+'"><span>'+c.rarity+'</span><div class="mini-portrait" style="background-position:'+frame*100/3+'% center"></div><b>'+c.name+'</b></div>';
  })).join('')+'</div>';
}
function summonResult(r){
  const ssrs=Object.entries(r.counts).filter(([id])=>G.byId(id).rarity==='SSR');
  modal(`<div class="result"><div class="eyebrow">${ssrs.length?'A NEW LEGEND IS BORN':'EVERY ENCOUNTER MATTERS'}</div><h2>${ssrs.length?'星々が、あなたに応えた。':'出会いは、確かな力に。'}</h2><p>${fmt(r.n)}連召喚の結果</p>${pullCards(r)}${ssrs.length?`<div class="ssr-results">${ssrs.map(([id,n])=>{const c=G.byId(id);return `<div>${crest(c)}<span class="gold">SSR</span><h3>${c.name}</h3><strong>×${fmt(n)}</strong></div>`;}).join('')}</div>`:''}<div class="rarity-totals">${Object.entries(r.rarities).map(([rarity,n])=>`<div><span style="color:${G.RARITIES[rarity].color}">${rarity}</span><strong>${fmt(n)}</strong></div>`).join('')}</div><div class="legacy-gain"><span>継承による全体攻撃ボーナス</span><strong>+${pct(r.before)}% <small>→</small> +${pct(r.after)}%</strong><p>低レアもすべて自動継承 · 育成素材 +${fmt(r.n*8)}</p></div><button class="primary wide" data-action="summon">もう一度 ${fmt(count)}連 · ✧ ${fmt(count*300)}</button><button class="text-button" data-action="close">結果を閉じる</button></div>`,'result-modal');
}
function settings(){
  modal(`<span class="eyebrow">PREFERENCES</span><h2>設定とセーブ</h2><div class="settings-list">${[['sound','効果音','短い合成音で演出を彩ります'],['quick','演出を短縮','ガチャと戦闘の結果をすぐ表示'],['soft','発光・動きを抑える','光の演出とアニメーションを軽減']].map(([id,label,note])=>`<label><div>${label}<small>${note}</small></div><input type="checkbox" data-setting="${id}" ${state.settings[id]?'checked':''}></label>`).join('')}</div><p>このブラウザに自動保存します。別端末へ移す場合は書き出してください。同時に複数のタブで遊ぶと保存が競合するため、1つのタブでご利用ください。</p><div class="button-row"><button data-action="export">セーブを書き出す</button><button data-action="import">セーブを読み込む</button></div><button class="danger text-button" data-action="reset">セーブを初期化する</button><p class="muted">試作版 · 実際のお金を使う機能はありません</p>`);
}
function rates(){
  modal(`<span class="eyebrow">SUMMON DETAILS</span><h2>提供割合と天井</h2><div class="receipt">${Object.entries(G.RARITIES).map(([r,d])=>`<div><span style="color:${d.color}">${r}</span><strong>${d.rate*100}%</strong></div>`).join('')}</div><p>ピックアップではSSR抽選時、リュネ50%、レオニス25%、フィオレ25%。常設は各SSR均等です。他レアは同レア内で均等です。</p><p>100連以内にSSR確定。SSRが出るとカウンターをリセット。天井はバナー共通です。10連SR保証はありません。1,000連・10,000連も1回ずつ同じ確率と天井で抽選します。</p><p>天井分を除く基本排出率です。キャラは自動で重なり、上限後も枚数と育成素材は獲得します。</p>`);
}
function confirmAscend(){
  modal(`<span class="eyebrow">NEW SEASON</span><h2>新サーバーへ転生しますか？</h2><div class="gem-award">継承印 +${G.ascensionReward(state)}</div><p><b>引き継ぐ：</b>キャラ所持数・凸・図鑑効果・編成・課金と召喚の累計・最高順位・設定</p><p><b>初期化する：</b>順位・通常レベル・おこづかい・星晶石・素材・収入設備・天井</p><p>新シーズンの初期資源が付与されます。印1つにつき収入+25%、攻撃+8%。</p><button class="primary wide" data-action="confirm-ascend">転生を確定する</button><button class="text-button" data-action="close">今回は見送る</button>`);
}
function run(action){
  try{action();}catch(e){toast(e.message);}
}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  if(playing)return;
  run(()=>{
    if(b.dataset.page){page=b.dataset.page;render();window.scrollTo({top:0});return;}
    if(b.dataset.banner){banner=b.dataset.banner;render();return;}
    if(b.dataset.count){count=Number(b.dataset.count);render();return;}
    if(b.dataset.filter){filter=b.dataset.filter;render();return;}
    if(b.dataset.quantity){packQuantity=Number(b.dataset.quantity);render();return;}
    if(b.dataset.pack){checkout(b.dataset.pack);return;}
    if(b.dataset.confirmPack){purchase(b.dataset.confirmPack);return;}
    if(b.hasAttribute('data-go-summon')){closeModal();page='summon';render();return;}
    if(b.dataset.level){G.levelUp(state,b.dataset.level);save();render();sound();return;}
    if(b.dataset.team){G.toggleTeam(state,b.dataset.team);save();render();return;}
    if(b.dataset.forward){G.moveForward(state,b.dataset.forward);save();render();return;}
    const actions={
      close:closeModal,
      work:()=>{G.work(state);wallet();save();sound();},
      facility:()=>{G.upgradeFacility(state);save();render();sound('purchase');},
      mail:()=>{G.claimMail(state);save();render();toast('お詫びの星晶石 +3,000');sound('purchase');},
      summon:playSummon,
      rates,battle:playBattle,ascend:confirmAscend,
      'confirm-ascend':()=>{const n=G.ascend(state);save();closeModal();render();toast(`シーズン${state.season}へようこそ。継承印 +${n}`);sound('ssr');},
      export:()=>{save();const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='astral-crown-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
      import:()=>$('#import-file').click(),
      reset:()=>modal(`<h2>セーブを初期化しますか？</h2><p>キャラ・凸・購入記録・継承印を含め、すべて失われます。必要なら先に書き出してください。</p><button class="danger wide" data-action="confirm-reset">すべて消去して最初から</button><button class="text-button" data-action="close">キャンセル</button>`),
      'confirm-reset':()=>{state=G.initialState();save();closeModal();page='home';render();toast('セーブを初期化しました');},
    };actions[b.dataset.action]?.();
  });
});
document.addEventListener('change',e=>{
  if(e.target.dataset.setting){state.settings[e.target.dataset.setting]=e.target.checked;preferences();stage.show(page,state,shortMotion());save();if(e.target.dataset.setting==='sound')sound();}
});
let pendingImport;
$('#import-file').addEventListener('change',async e=>{
  const file=e.target.files[0];e.target.value='';if(!file)return;
  try{
    if(file.size>1000000)throw Error('セーブファイルが大きすぎます');
    pendingImport=G.validateSave(JSON.parse(await file.text()));
    modal(`<h2>セーブを読み込みますか？</h2><p>シーズン${pendingImport.season} · ${fmt(pendingImport.pulls)}連 · ${pendingImport.rank}位のデータで、現在の進行を置き換えます。</p><button id="confirm-import" class="primary wide">このデータに置き換える</button><button class="text-button" data-action="close">キャンセル</button>`);
    $('#confirm-import').onclick=()=>{state=G.restore(pendingImport).state;save();closeModal();render();toast('セーブを読み込みました');};
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
$('#skip-playback').onclick=()=>stage.skip();
function setPlaying(value){playing=value;document.body.classList.toggle('playing',value);$('#playback').hidden=!value;}
function gameHUD(){
  if(page==='home')return `<section class="home-ui"><div class="chapter"><span>ASTRAL CROWN / 星冠の継承者</span><h1>星見の庭園</h1><p>SEASON ${state.season} · あなたの物語が、動き出す。</p></div><div class="home-tools"><button data-action="mail" ${state.mail?'disabled':''}>${state.mail?'配布受取済み':'お詫びの星晶石 +3,000'}</button><button data-action="work">仕事する +¥${fmt(300*(1+state.seals*.25))}</button><button data-action="facility" ${state.facility>=30?'disabled':''}>収入強化 Lv.${state.facility}<small>¥${fmt(G.facilityCost(state))}</small></button></div><div class="character-line"><span>月冠の魔女</span><h2>リュネ</h2><p>「おかえりなさい。<br>今日は、どの星へ会いに行きましょう？」</p></div><div class="home-cta"><button data-page="summon"><small>PICK UP / 月冠の契約</small><b>星の召喚</b><span>リュネとの出会いを、あなたに →</span></button><button class="launch" data-page="arena"><small>CROWN ARENA / ${state.rank}位</small><b>出撃する →</b></button></div></section>`;
  if(page==='summon')return `<section class="summon-ui"><div class="chapter"><span>CELESTIAL SUMMON</span><h1>月冠の契約</h1><p>星を越えて、あなたに出会う。</p></div><div class="summon-description"><span class="pickup-label">PICK UP SSR</span><h2>リュネ</h2><p>月冠の魔女 / 水属性・攻撃型</p><button data-action="rates">提供割合・天井</button></div><div class="summon-dock"><div class="tabs"><button data-banner="pickup" class="${banner==='pickup'?'selected':''}">ピックアップ</button><button data-banner="standard" class="${banner==='standard'?'selected':''}">常設</button></div><p>SSR 2% · 次の確定まで ${100-state.pity}連${banner==='pickup'?' · SSR時リュネ50%':''}</p><div class="pull-options">${[10,100,1000,10000].map(n=>`<button data-count="${n}" class="${count===n?'selected':''}">${fmt(n)}連</button>`).join('')}</div><button class="primary" data-action="summon">${fmt(count)}連召喚 <small>星晶石 ${fmt(count*300)}</small></button><button class="text-button" data-page="shop">星晶石を補充 →</button></div></section>`;
  const enemy=G.rival(state),reward=G.ascensionReward(state);
  return `<section class="arena-ui"><div class="chapter"><span>CROWN ARENA / NPCリーグ</span><h1>星冠闘技場</h1><p>${state.rank}位 → ${enemy.rank}位に挑戦</p></div><div class="opponent"><small>NEXT RIVAL</small><h2>${enemy.name}</h2><p>戦力 ${fmt(G.power(state))} / ${state.team.length}人編成</p></div><div class="arena-dock"><button data-page="collection">編成・育成</button><button class="primary" data-action="battle">ランキング戦に挑む →</button><button data-action="ascend" ${reward?'':'disabled'}>${reward?`転生する · 継承印 +${reward}`:'50位以内で転生解放'}</button></div></section>`;
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
  modal(`<div class="battle-result"><span class="eyebrow">${result.win?'VICTORY':'DEFEAT'}</span><h2>${result.win?'勝利。新しい星へ。':'次は、きっと届く。'}</h2><div class="rank-result">${state.rank}<small>位</small></div><p>${result.win?`おこづかい +¥${fmt(result.reward.cash)} · 育成素材 +${fmt(result.reward.dust)}`:'編成と育成を見直して再挑戦しよう。'}</p><p>結果は保存済みです。</p><button class="primary" data-action="close">闘技場に戻る</button></div>`);
}
function playBattle(){
  const result=commit('battle',s=>{const r=G.battle(s);G.applyBattle(s,r);return r;});
  render();setPlaying(true);$('#playback-text').textContent='BATTLE START';sound('tap');
  stage.battle(result,shortMotion(),f=>{$('#playback-text').textContent=`TURN ${f.turn} · ${f.text}`;},()=>{setPlaying(false);render();sound(result.win?'purchase':'tap');battleResult(result);});
}
render();
if(state.presentation){
  page=state.presentation.kind==='summon'?'summon':'arena';render();
  if(state.presentation.kind==='summon')summonResult(state.presentation.result);else battleResult(state.presentation.result);
}
if(recovered)toast('破損したセーブを退避し、初期状態で開始しました');
else if(saveFailed)toast('自動保存が利用できません。設定から書き出してください');
else if(restored>1000)toast(`おかえりなさい。放置収入 +¥${fmt(restored)}`);
