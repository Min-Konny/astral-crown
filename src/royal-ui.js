// Presentation only. All purchases, upgrades and save transactions stay in app.js.
import * as G from './game.js';
const fmt=n=>Math.floor(n).toLocaleString('ja-JP');
const money=n=>'¥ '+fmt(n);
const paths={
 home:'M3 21V10l4-3V3l3 3 2-4 2 4 3-3v4l4 3v11H3Zm6 0v-7h6v7M3 10h18',
 earn:'M3 8h18v13H3V8Zm5 0V4h8v4M3 12l9 4 9-4M10 14v4h4v-4',
 shop:'M3 6h18l-2 7H5L3 6Zm2 7v8h14v-8M2 3h3M8 17h8',
 summon:'m12 2 8 7-8 13L4 9l8-7Zm-8 7h16M12 2 8 9l4 13 4-13-4-7',
 collection:'M3 4h6v16H3V4Zm12 0h6v16h-6V4ZM9 7h6v16H9V7Z',
 arena:'m4 3 12 12-2 2L2 5l2-2Zm16 0L8 15l2 2L22 5l-2-2ZM3 16l5 5M16 16l5 5M6 18l-4 4M18 18l4 4',
 crown:'m3 6 4 4 5-7 5 7 4-4-2 13H5L3 6Zm2 10h14',
 arrow:'M4 12h16m-6-6 6 6-6 6',
 mail:'M3 5h18v14H3V5Zm0 0 9 8 9-8',
 up:'m5 10 7-7 7 7M12 3v18',
 star:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7',
 check:'m5 12 4 4L20 5',
 gear:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M19 5l-2 2M7 17l-2 2'
};
export function icon(name){return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"> <path d="${paths[name]||paths.star}"/></svg>`;}
export function gemArt(id='small'){
 return '<img class="pack-art" src="./assets/redesign/pack-'+id+'.webp" alt="" decoding="async"/>';
}
export function homeView(s){
 return `<section class="home-ui royal-home festival-home">
 <div class="chapter"><div class="royal-emblem" aria-hidden="true">${icon('crown')}<span>✦</span></div><div class="home-logo"><span>ASTRAL<i aria-hidden="true">✦</i>CROWN</span><h1>星冠の継承者</h1></div></div>
 <div class="home-tools">
 <button class="home-medal" data-action="mail" aria-label="${s.mail?'メール・受取済み':'メール・星晶石3000個を受け取る'}" ${s.mail?'disabled':''}><span class="medal-face">${icon('mail')}</span><span class="medal-label">メール</span>${s.mail?'':'<i class="home-badge" aria-hidden="true">!</i>'}</button>
 <button class="home-medal" data-page="collection"><span class="medal-face">${icon('collection')}</span><span class="medal-label">図鑑</span></button>
 <button class="home-medal" data-page="earn"><span class="medal-face">${icon('up')}</span><span class="medal-label">設備強化</span><small>Lv.${s.facility}</small></button>
 </div>
 <div class="home-banners" aria-label="おすすめコンテンツ">
 <button class="home-banner moon-banner" data-page="summon"><span class="banner-ribbon">ピックアップ召喚</span><strong>月冠の契約</strong><small>月冠の魔女 リュネ</small><img class="banner-portrait" src="./assets/redesign/luna-court.webp" alt=""/></button>
 <button class="home-banner garden-banner" data-mission="0"><span class="banner-ribbon">冒険 · 庭園巡回</span><strong>星降る庭園</strong><small>仲間と挑む、育成の旅</small><span class="banner-party" aria-hidden="true"></span></button>
 <button class="home-banner jewel-banner" data-page="shop"><span class="banner-ribbon">星晶石ショップ</span><strong>願いを星に</strong><small>稼いだお金で、召喚の準備</small><img class="banner-pack" src="./assets/redesign/pack-large.webp" alt=""/></button>
 </div>
 <div class="home-economy"><div class="estate-art" aria-hidden="true"></div><span class="income-chest" aria-hidden="true"></span><div class="income-copy"><h2>放置収入</h2><strong id="income-value">${money(G.income(s))}<small> / 秒</small></strong><small>おこづかいに自動加算</small><button data-page="earn">稼ぐ・強化へ ${icon('arrow')}</button></div></div>
 <div class="character-line"><span>月冠の魔女 リュネ</span><p class="home-greeting">おかえりなさい、継承者さま。</p><p class="home-notice" role="status" aria-live="polite" hidden></p></div>
 <div class="home-cta"><button class="launch adventure-launch" data-mission="0"><small>GARDEN ADVENTURE</small><b>冒険へ</b><span>仲間と、星降る庭園へ</span></button><button class="arena-shortcut" data-mission="-1"><span class="arena-crest" aria-hidden="true"></span><b>闘技場</b><small>現在 ${s.rank}位</small></button></div>
 </section>`;
}
export function earnView(s,offline=0){
 const max=s.facility>=30,next=G.income({...s,facility:s.facility+1}),cost=G.facilityCost(s);
 return `<section class="earn-screen"><div class="page-heading"><div><div class="eyebrow">A LITTLE WORK. A GREATER WISH.</div><h1>おこづかいを稼ぐ</h1><p>いま石を買うか、投資してもっと稼ぐか。</p></div><span class="tag">継承倍率 ×${(1+s.seals*.25).toFixed(2)}</span></div><div class="earn-layout"><section class="income-stage"><div class="income-number"><span>毎秒のおこづかい</span><strong>${money(G.income(s))}<small> / 秒</small></strong><p>仕事も、放置も。すべて次の召喚につながる。</p></div><div class="work-action"><div id="work-feedback" aria-live="polite"></div><button class="primary work-button" data-action="work">${icon('earn')}<span>仕事する<small>+${money(300*(1+s.seals*.25))}</small></span></button></div><div class="offline-note">${icon('check')}<div>離れている間も収入が増えます<small>${offline>0?`今回の放置収入 ${money(offline)} · 反映済み`:'オフライン収入は最大8時間'}</small></div></div></section><aside class="investment-panel ornate-panel"><div class="eyebrow">INVEST IN TOMORROW</div><h2>収入設備 <small>Lv.${s.facility}${max?' / MAX':' → '+(s.facility+1)}</small></h2><div class="desk-illustration" aria-hidden="true"></div><dl class="investment-values"><div><dt>毎秒収入</dt><dd>${money(G.income(s))}${max?'':`<span>→ ${money(next)}</span>`}</dd></div><div><dt>投資額</dt><dd>${max?'最大レベル':money(cost)}</dd></div></dl><button class="primary wide" data-action="facility" data-invest-button ${max||s.cash<cost?'disabled':''}>${icon('up')} ${max?'設備は最大レベルです':'設備に投資する'}</button><p class="afford-note" data-invest-note></p><div class="investment-choice"><span>次のガチャを、今すぐ。</span><button data-page="shop">稼いだお金で課金へ ${icon('arrow')}</button></div></aside></div></section>`;
}
export function shopView(s,quantity,titles){
 return `<section class="royal-shop"><div class="page-heading"><div><div class="eyebrow">THE JOY OF SPENDING BIG</div><h1>星晶石を購入</h1><p>ゲームで稼いだお金で、思いきり課金する気分を。</p></div><span class="tag">追加の実課金なし</span></div><div class="shop-layout"><aside class="shop-host"><img src="./assets/redesign/luna-court.webp" alt="月冠の魔女 リュネ"/><div class="host-quote"><span>月冠の魔女 / リュネ</span><p>あなたの願いを、<br>星に変えましょう。</p></div></aside><div class="shop-products"><div class="shop-toolbar"><span>まとめて購入</span><div class="tabs pack-quantities">${[1,10,100,1000].map(n=>`<button data-quantity="${n}" aria-pressed="${quantity===n}" class="${quantity===n?'selected':''}">×${fmt(n)}</button>`).join('')}</div></div><div class="pack-grid">${G.PACKS.map((p,i)=>`<article class="panel pack ${i===2?'premium':''}"><span class="tag">${i===2?'PREMIUM PACK':i===1?'CRYSTAL BOX':'CRYSTAL POUCH'}</span>${gemArt(p.id)}<h2>${p.name}</h2><strong class="gem-count">${fmt(p.gems*quantity)}<small> 個</small></strong><p>${fmt(quantity)}パック · ${fmt(p.gems*quantity/300)}連分</p><button class="${i===2?'primary':''} wide" data-pack="${p.id}">${money(p.price*quantity)}<small>購入手続きへ</small></button><span class="pack-unit">1パック ${money(p.price)} / ${fmt(p.gems)}個</span></article>`).join('')}</div><p class="simulation-label">ゲーム内のおこづかいから支払います。実際の請求・決済情報の入力はありません。</p><div class="spender-summary"><div>${icon('crown')}<span>累計疑似課金額<strong>${money(s.spent)}</strong></span></div><button data-page="earn">おこづかいを稼ぐ ${icon('arrow')}</button></div><details class="spender-titles"><summary>支援者の称号を見る</summary>${titles}</details></div></div></section>`;
}
export function ascensionView(s){
 const reward=G.ascensionReward(s),after=s.seals+reward;
 return `<section class="ascension-view"><div class="eyebrow">A NEW SERVER. A GREATER LEGACY.</div><h2>新サーバーへ転生</h2><p>仲間との出会いを引き継いで、もっと遠くまで。</p><div class="ascension-reward">${icon('crown')}<span>継承印 <strong>+${reward}</strong><small>累計 ${fmt(s.seals)} → ${fmt(after)}</small></span></div><div class="ascension-lists"><div><h3>引き継ぐ</h3><p>全キャラ所持数・凸・図鑑効果・編成<br>課金と召喚の累計・最高順位・設定<br>継承印</p></div><div><h3>初期化する</h3><p>現在順位・通常レベル<br>おこづかい・星晶石・素材<br>収入設備・天井</p></div></div><div class="prestige-multipliers"><div>収入倍率<strong>×${(1+s.seals*.25).toFixed(2)} <span>→ ×${(1+after*.25).toFixed(2)}</span></strong></div><div>攻撃倍率<strong>×${(1+s.seals*.08).toFixed(2)} <span>→ ×${(1+after*.08).toFixed(2)}</span></strong></div></div><p class="muted">ひとり用の新シーズンです。新シーズンの初期資源が付与されます。</p><button class="primary wide" data-action="confirm-ascend" ${reward?'':'disabled'}>転生を確定する</button><button class="text-button wide" data-action="close">今回は見送る</button></section>`;
}
export function refreshEconomy(s){
 const button=document.querySelector('[data-invest-button]'),note=document.querySelector('[data-invest-note]');
 if(button){const max=s.facility>=30,missing=Math.max(0,G.facilityCost(s)-s.cash);button.disabled=max||missing>0;if(note)note.textContent=max?'すべての設備投資が完了しました':missing?`あと ${money(missing)} / 放置で約${fmt(Math.ceil(missing/G.income(s)))}秒`:'投資できます · 毎秒収入が1.65倍に';}
}

export function summonView(s,banner,count){
 const pickup=banner==='pickup',remaining=100-s.pity,cost=count*300,missing=Math.max(0,cost-Math.floor(s.gems));
 return `<section class="summon-ui celestial-summon astral-summon${pickup?'':' is-standard'}">
 <div class="summon-banners" aria-label="召喚の種類">
 <button data-banner="pickup" aria-pressed="${pickup}" class="summon-banner pickup-banner ${pickup?'selected':''}"><img class="banner-art" src="./assets/redesign/lune-summon.png" alt=""/><span>ピックアップ</span><strong>リュネ召喚</strong></button>
 <button data-banner="standard" aria-pressed="${!pickup}" class="summon-banner standard-banner ${!pickup?'selected':''}"><img class="banner-art" src="./assets/party.png" alt=""/><span>常設召喚</span><strong>星冠の仲間たち</strong></button>
 <button class="summon-shop-banner" data-page="shop"><img src="./assets/redesign/pack-large.webp" alt=""/><span>星晶石ショップ</span><small>稼いだお金で、次の願いを</small></button>
 </div>
 <div class="chapter"><div class="chapter-top"><span>CELESTIAL SUMMON</span><div class="pity-jewel">SSR確定まで <strong>${remaining}</strong> 回<i class="pity-gauge" aria-hidden="true"><b style="width:${s.pity}%"></b></i></div></div><h1>星の召喚</h1></div>
 <div class="summon-description"><span class="pickup-label">✧ ${pickup?'月冠の魔女':'星々に集う継承者'} ✧</span><h2>${pickup?'リュネ':'星冠の仲間'}</h2><div class="summon-signature">${pickup?'Lune':'Astral companions'}</div><div class="hero-rarity"><b>SSR</b><span>${pickup?'◈ 水属性・攻撃型':'✦ すべての属性'}</span></div><p>${pickup?'月が導く、運命の出会い。':'星を越えて、まだ見ぬ仲間と。'}</p><small class="banner-rates">SSR 2%${pickup?' · SSR時リュネ50%':' · SSRキャラ均等'}</small></div>
 <div class="summon-dock">
 <span class="pull-label" id="pull-label">召喚回数を選ぶ</span>
 <div class="pull-options" role="group" aria-labelledby="pull-label">${[10,100,1000,10000].map(n=>`<button data-count="${n}" aria-pressed="${count===n}" ${count===n&&missing?'aria-describedby="summon-shortage"':' '} class="${count===n?'selected':''}"><b>${fmt(n)}<small>連</small></b><em>✧ ${fmt(n*300)}</em></button>`).join('')}</div>
 <button class="primary summon-confirm" data-action="summon" ${missing?'disabled aria-describedby="summon-shortage"':''}><span>${fmt(count)}回召喚</span><small>✧ 星晶石 ${fmt(cost)}</small></button>
 ${missing?`<p class="summon-shortage" id="summon-shortage">星晶石があと ${fmt(missing)} 個必要です</p>`:''}
 <div class="summon-footnotes"><button data-action="rates">ⓘ 提供割合・天井</button><button data-page="shop" class="${missing?'needed':''}">星晶石を購入 ${icon('arrow')}</button></div></div>
 </section>`;
}
