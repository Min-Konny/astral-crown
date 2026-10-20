import * as G from './game.js';
const $=q=>document.querySelector(q), key='astral-crown-save-v1';
const fmt=n=>Math.floor(n).toLocaleString('ja-JP'), pct=n=>(n*100).toFixed(2);
let state=G.initialState(), page='home', banner='pickup', count=10, filter='all', packQuantity=1, timer, audio, saveFailed=false, restored=0, recovered=false;
try{
  const raw=localStorage.getItem(key);
  if(raw){
    try{const r=G.restore(JSON.parse(raw));state=r.state;restored=r.offline;}
    catch{localStorage.setItem(key+'-damaged-'+Date.now(),raw);recovered=true;}
  }
}catch{saveFailed=true;}
function save(){
  state.lastSeen=Date.now();
  try{localStorage.setItem(key,JSON.stringify(state));$('#save-status').textContent='✓ このブラウザに保存済み';}
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
function crest(c,extra=''){return `<div class="crest ${extra}" style="--rarity:${G.RARITIES[c.rarity].color}" aria-hidden="true"><span>${c.icon}</span><i></i></div>`;}
function badge(c){return `<span class="rarity" style="color:${G.RARITIES[c.rarity].color}">${c.rarity}</span>`;}
function party(){
  return `<div class="party">${state.team.map((id,i)=>{const c=G.byId(id),s=G.stats(state,c);return `<div class="party-card">${crest(c)}<div>${badge(c)} <span class="muted">Lv.${state.levels[id]}</span><h3>${c.name}</h3><small>${i<2?'前衛':'後衛'} · ${c.element} / ${c.role}</small><p>ATK ${fmt(s.atk)} <span class="muted"> · ${G.awakening(state,c)}凸</span></p></div></div>`;}).join('')}${state.team.length<4?'<button class="party-empty" data-page="collection">＋<small>仲間を編成</small></button>':''}</div>`;
}
function home(){
  return heading('THE NEXT CHAPTER','星を集め、頂点へ。','何度生まれ変わっても、積み重ねた力は消えない。',`<span class="tag">SEASON ${String(state.season).padStart(2,'0')}</span>`)+`
  <section class="home-hero panel">
    <div class="hero-copy"><span class="eyebrow gold">PICK UP SUMMON</span><h2>月は、あなたを<br>選んだ。</h2><p>月冠の魔女 リュネ<br><span class="gold">SSR出現時 50%ピックアップ</span></p><button class="primary" data-page="summon">星の召喚へ <span>↗</span></button></div>
    <div class="moon-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="moon">☾</div><div class="star s1">✧</div><div class="star s2">✦</div><div class="star s3">✧</div><span class="art-caption">LUNE · THE MOONCROWN WITCH</span></div>
    <div class="hero-note">あなたの物語は、まだ序章。</div>
  </section>
  <div class="metrics"><div class="panel metric"><small>チーム戦力</small><strong>${fmt(G.power(state))}</strong><span>継承による全体攻撃 +${pct(G.collectionBonus(state))}%</span></div><div class="panel metric"><small>サーバーランキング</small><strong>${state.rank}<em>位</em></strong><span>自己最高 ${state.bestRank}位 · NPCリーグ</span></div><div class="panel metric"><small>累計召喚数</small><strong>${fmt(state.pulls)}<em>連</em></strong><span>すべての出会いが、力になる</span></div></div>
  <div class="section-title"><h2>あなたの継承者たち</h2><button class="text-button" data-page="collection">育成・編成 ↗</button></div>${party()}
  <div class="two-col"><section class="panel income-panel"><div class="eyebrow">IDLE INCOME</div><h2>冒険を支える、おこづかい。</h2><strong id="income-value">¥ ${fmt(G.income(state))} / 秒</strong><p>収入設備 Lv.${state.facility} · 離れている間も最大8時間ぶん蓄積</p><div class="button-row"><button class="primary" data-action="work">仕事する +¥${fmt(300*(1+state.seals*.25))}</button><button data-action="facility" ${state.facility>=30?'disabled':''}>収入設備を強化 · ¥${fmt(G.facilityCost(state))}</button></div></section>
  <section class="panel news"><div class="eyebrow">LETTER FROM THE OPERATORS</div><h2>長すぎたメンテのお詫び</h2><p>予定より3分延長してしまいました。<br>お詫びの星晶石3,000個をお受け取りください。</p><button data-action="mail" ${state.mail?'disabled':''}>${state.mail?'✓ 受取済み':'✉ 星晶石3,000個を受け取る'}</button><small>※ 架空の運営からのお知らせです</small></section></div>`;
}
function summonPage(){
  const c=G.byId('luna');
  return heading('CELESTIAL SUMMON','星の召喚','一度の奇跡も、一万の出会いも。すべてを、あなたの力に。',`<button class="text-button" data-action="rates">提供割合・天井 ↗</button>`)+`
  <div class="tabs"><button data-banner="pickup" class="${banner==='pickup'?'selected':''}">月冠の契約 <small>PICK UP</small></button><button data-banner="standard" class="${banner==='standard'?'selected':''}">常設召喚 <small>STANDARD</small></button></div>
  <section class="summon-banner panel"><div class="summon-copy"><span class="tag gold">${banner==='pickup'?'PICK UP · SSR 50%':'STANDARD · SSR 2%'}</span><p class="character-title">${banner==='pickup'?'月冠の魔女':'星々の継承者たち'}</p><h2>${banner==='pickup'?'リュネ':'運命を、召喚せよ。'}</h2><p class="quote">「${c.quote}」</p><div class="character-meta"><span>水属性</span><span>攻撃型</span><span>最大5凸</span></div></div><div class="summon-art">${crest(c,'giant')}<div class="art-label">SSR <span>THE MOONCROWN WITCH</span></div></div><span class="banner-footnote">キャラビジュアルは試作用の紋章表現です</span></section>
  <section class="panel summon-controls"><div class="pity"><span>次のSSR確定まで <b>${100-state.pity}連</b></span><span>SSR 2% · バナー共通天井</span></div><div class="progress"><i style="width:${state.pity}%"></i></div><div class="pull-options">${[10,100,1000,10000].map(n=>`<button data-count="${n}" class="${count===n?'selected':''}">${fmt(n)}<small>連召喚</small></button>`).join('')}</div><button class="primary summon-button" data-action="summon">✧ ${fmt(count)}連召喚 <span>星晶石 ${fmt(count*300)}</span></button><p class="center muted">低レアは自動で継承。編成していなくても、全員の攻撃力が上がります。</p></section>
  <div class="notice">石が足りないときは <button class="text-button" data-page="shop">星晶ショップへ →</button> <span>ゲーム内のおこづかいだけで購入できます。</span></div>`;
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
function arena(){
  const enemy=G.rival(state),reward=G.ascensionReward(state),enemyPower=enemy.units.reduce((t,c)=>t+c.atk*5+c.hp,0);
  return heading('CROWN ARENA','頂点に、名を刻め。','育てた力を試す場所。ここから次の伝説が始まる。',`<span class="tag">NPCリーグ · ${state.rank}位</span>`)+`
  <section class="panel versus"><div><span class="eyebrow">YOUR TEAM</span><h2>星冠の継承者</h2><strong>${fmt(G.power(state))}</strong><p>現在 ${state.rank}位</p><div class="team-symbols">${state.team.map(id=>crest(G.byId(id))).join('')}</div></div><span class="vs">VS</span><div><span class="eyebrow">RIVAL · NPC</span><h2>${enemy.name}</h2><strong>${fmt(enemyPower)}</strong><p>挑戦順位 ${enemy.rank}位</p><div class="team-symbols">${enemy.units.map(c=>crest(c)).join('')}</div></div></section>
  <button class="primary battle-button" data-action="battle">⚔ ランキング戦に挑む</button><p class="center muted">炎 → 森 → 水 → 炎の順で有利。前衛から攻撃を受けます。支援役は3ターンごとに回復。</p>
  <section class="panel ascension"><div><span class="eyebrow gold">ASCENSION</span><h2>終わりではなく、次の始まり。</h2><p>50位以内で、新サーバーへ転生。<br>仲間も凸も継承して、より速く頂点を目指す。</p><div class="ascension-stats"><span>継承印 <b>${fmt(state.seals)}</b></span><span>収入 <b>+${state.seals*25}%</b></span><span>攻撃 <b>+${state.seals*8}%</b></span></div></div><div><div class="ascend-symbol">✵</div><button data-action="ascend" ${reward?'':'disabled'}>${reward?`転生する · 継承印 +${reward}`:'50位以内で転生解放'}</button></div></section>`;
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
  $('#main').innerHTML=({home,summon:summonPage,collection,arena,shop}[page])();
  document.querySelectorAll('nav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
}
function closeModal(){clearTimeout(timer);if($('#modal').open)$('#modal').close();}
function modal(html,cls=''){
  clearTimeout(timer);$('#modal').className=cls;
  $('#modal-content').innerHTML=`<button class="modal-close" data-action="close" aria-label="閉じる">×</button>${html}`;
  if(!$('#modal').open)$('#modal').showModal();
}
$('#modal').addEventListener('cancel',()=>clearTimeout(timer));
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
function summonResult(r){
  const ssrs=Object.entries(r.counts).filter(([id])=>G.byId(id).rarity==='SSR');
  modal(`<div class="result"><div class="eyebrow">${ssrs.length?'A NEW LEGEND IS BORN':'EVERY ENCOUNTER MATTERS'}</div><h2>${ssrs.length?'星々が、あなたに応えた。':'出会いは、確かな力に。'}</h2><p>${fmt(r.n)}連召喚の結果</p>${ssrs.length?`<div class="ssr-results">${ssrs.map(([id,n])=>{const c=G.byId(id);return `<div>${crest(c)}<span class="gold">SSR</span><h3>${c.name}</h3><strong>×${fmt(n)}</strong></div>`;}).join('')}</div>`:''}<div class="rarity-totals">${Object.entries(r.rarities).map(([rarity,n])=>`<div><span style="color:${G.RARITIES[rarity].color}">${rarity}</span><strong>${fmt(n)}</strong></div>`).join('')}</div><div class="legacy-gain"><span>継承による全体攻撃ボーナス</span><strong>+${pct(r.before)}% <small>→</small> +${pct(r.after)}%</strong><p>低レアもすべて自動継承 · 育成素材 +${fmt(r.n*8)}</p></div><button class="primary wide" data-action="summon">もう一度 ${fmt(count)}連 · ✧ ${fmt(count*300)}</button><button class="text-button" data-action="close">結果を閉じる</button></div>`,'result-modal');
}
function reveal(r){
  const ids=Object.keys(r.counts),c=ids.map(G.byId).find(c=>c.rarity==='SSR'),gold=!!c;
  if(shortMotion()){sound(gold?'ssr':'tap');summonResult(r);return;}
  modal(`<div class="summon-stage ${gold?'gold-stage':r.rarities.SR?'':'blue-stage'}"><span class="eyebrow">CONNECTING TO THE STARS</span><div class="summoning-ring"><span>✧</span></div><h2>星の記憶が、目を覚ます。</h2><p>${fmt(r.n)}の運命をつなぐ</p><button id="skip-reveal" class="text-button">演出をスキップ →</button></div>`,'effect-modal');
  $('#skip-reveal').onclick=()=>{clearTimeout(timer);summonResult(r);};
  timer=setTimeout(()=>{
    if(!gold){sound();summonResult(r);return;}
    sound('ssr');
    modal(`<div class="spotlight"><span class="eyebrow gold">SUPER SUPER RARE</span>${crest(c,'giant')}<p>${c.title}</p><h2>${c.name}</h2><p class="quote">「${c.quote}」</p><button id="show-result" class="primary wide">召喚結果を見る →</button></div>`,'effect-modal');
    $('#show-result').onclick=()=>summonResult(r);
  },1600);
}
function startBattle(){
  const result=G.battle(state);G.applyBattle(state,result);save();render();
  let i=0;
  const finish=()=>{
    clearTimeout(timer);sound(result.win?'purchase':'tap');
    modal(`<div class="battle-result"><span class="eyebrow">${result.win?'VICTORY':'DEFEAT'}</span><h2>${result.win?'王冠に、一歩近づいた。':'次の一手が、未来を変える。'}</h2><div class="rank-result">${state.rank}<small>位</small></div><p>${result.win?`おこづかい +¥${fmt(result.reward.cash)} · 素材 +${fmt(result.reward.dust)}`:'編成・レベル・図鑑ボーナスを育てて再挑戦しよう。'}</p><button class="primary wide" data-action="close">闘技場に戻る</button></div>`);
  };
  if(shortMotion()){finish();return;}
  modal(`<span class="eyebrow">ARENA BATTLE</span><h2>星冠の継承者 vs ${result.enemy.name}</h2><div id="battle-live"></div><button id="skip-battle" class="text-button">結果へスキップ →</button>`,'battle-modal');
  $('#skip-battle').onclick=finish;
  const step=()=>{
    const frame=result.frames[i];if(!frame){finish();return;}
    $('#battle-live').innerHTML=`<p>TURN ${frame.turn}</p><div class="battle-hp">${['a','b'].map(side=>`<div>${frame[side].map(c=>`<div class="unit-hp ${c.hp===0?'fallen':''}"><span>${c.name}<small>${c.hp}/${c.max}</small></span><div class="progress"><i style="width:${c.hp/c.max*100}%"></i></div></div>`).join('')}</div>`).join('')}</div><p class="battle-log">${frame.text}</p>`;
    i++;timer=setTimeout(step,110);
  };step();
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
      summon:()=>{const r=G.summon(state,count,banner);save();render();reveal(r);},
      rates,battle:startBattle,ascend:confirmAscend,
      'confirm-ascend':()=>{const n=G.ascend(state);save();closeModal();render();toast(`シーズン${state.season}へようこそ。継承印 +${n}`);sound('ssr');},
      export:()=>{save();const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='astral-crown-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},
      import:()=>$('#import-file').click(),
      reset:()=>modal(`<h2>セーブを初期化しますか？</h2><p>キャラ・凸・購入記録・継承印を含め、すべて失われます。必要なら先に書き出してください。</p><button class="danger wide" data-action="confirm-reset">すべて消去して最初から</button><button class="text-button" data-action="close">キャンセル</button>`),
      'confirm-reset':()=>{state=G.initialState();save();closeModal();page='home';render();toast('セーブを初期化しました');},
    };actions[b.dataset.action]?.();
  });
});
document.addEventListener('change',e=>{
  if(e.target.dataset.setting){state.settings[e.target.dataset.setting]=e.target.checked;preferences();save();if(e.target.dataset.setting==='sound')sound();}
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
$('#settings').onclick=settings;
let last=Date.now(),saveTicks=0;
setInterval(()=>{
  const now=Date.now();G.tick(state,(now-last)/1000);last=now;wallet();
  if(++saveTicks%5===0)save();
},1000);
window.addEventListener('pagehide',save);
render();
if(recovered)toast('破損したセーブを退避し、初期状態で開始しました');
else if(saveFailed)toast('自動保存が利用できません。設定から書き出してください');
else if(restored>1000)toast(`おかえりなさい。放置収入 +¥${fmt(restored)}`);
