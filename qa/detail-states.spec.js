import fs from 'node:fs/promises';
import runtime from './runtime.cjs';
import {AstralPage} from './pages/astral-page.js';
import * as G from '../src/game.js';
const {test,expect}=runtime;
const data=JSON.parse(await fs.readFile(new URL('./data/royal-flow.json',import.meta.url),'utf8'));
async function stateShot(game,name,info,selector){
  const target=game.page.locator(selector).first();
  await target.scrollIntoViewIfNeeded();await target.hover();
  await game.screenshot(name+'-hover',info.project.name);
  await game.page.keyboard.press('Tab');await target.focus();
  await expect(target).toBeFocused();
  expect(await target.evaluate(e=>parseFloat(getComputedStyle(e).outlineWidth))).toBeGreaterThanOrEqual(2);
  await game.screenshot(name+'-focus',info.project.name);
  expect(await game.hasOverflow()).toBe(false);
}
function owned(){
  const s=G.initialState();
  for(const c of G.CHARACTERS){s.counts[c.id]=c.id==='luna'?50:200;s.confirmedCounts[c.id]=1;s.promotions[c.id]=1;}
  return {counts:s.counts,confirmedCounts:s.confirmedCounts,promotions:s.promotions,dust:10000};
}
test('召喚の選択・提供割合・不足時を実操作で確認する',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,{gems:3000});await game.openPage('summon');
  const execute=page.locator('[data-action="summon"]');
  await execute.hover();
  expect(await execute.evaluate(e=>getComputedStyle(e).backgroundImage)).toContain('summon-gold.png');
  await stateShot(game,'summon',info,'[data-banner="standard"]');
  const canvas=page.locator('#game-stage canvas');
  const pickup=await canvas.screenshot();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-banner="standard"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-banner="standard"]')).toBeFocused();
  await expect.poll(async()=>pickup.equals(await canvas.screenshot())).toBe(false);
  await game.screenshot('summon-standard',info.project.name);
  await page.locator('[data-count="10000"]').click();
  await expect(page.locator('[data-count="10000"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-action="summon"]')).toBeDisabled();
  await expect(page.locator('#summon-shortage')).toContainText('2,997,000');
  await game.screenshot('summon-insufficient',info.project.name);
  await page.locator('[data-action="rates"]').click();await expect(page.locator('#modal')).toBeVisible();
  await game.screenshot('summon-rates',info.project.name);
  expect((await game.savedState()).gems).toBe(3000);expect(game.errors).toEqual([]);
  if(info.project.name==='mobile'){
    await page.keyboard.press('Escape');
    for(const height of [640,701,720]){
      await page.setViewportSize({width:390,height});
      const description=await page.locator('.summon-description').boundingBox();
      const dock=await page.locator('.summon-dock').boundingBox();
      expect(dock.y).toBeGreaterThan(description.y+description.height);
    }
    await page.locator('[data-action="rates"]').click();
    await expect(page.locator('#modal')).toBeVisible();
  }
  if(info.project.name==='laptop'){
    await page.keyboard.press('Escape');
    const confirm=page.locator('[data-action="summon"]');
    for(const [width,height] of [[651,720],[1001,720],[1101,900]]){
      await page.setViewportSize({width,height});
      await expect.poll(()=>canvas.evaluate(e=>[e.width,e.height])).toEqual([width,height]);
      await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      expect(await confirm.evaluate(button=>{
      const style=getComputedStyle(button);
      const text=document.createRange();
      text.selectNodeContents(button.querySelector('span'));
      return text.getClientRects().length===1&&text.getBoundingClientRect().width<=
        button.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)+1;
      })).toBe(true);
      await game.screenshot('summon-insufficient',String(width));
    }
    await page.reload();
    await game.openPage('summon');
    await expect.poll(()=>canvas.evaluate(e=>[e.width,e.height])).toEqual([1101,900]);
    await game.screenshot('summon','1101-fresh');
  }
});
test('投資上限では操作を無効にし理由を示す',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,{cash:0,facility:30,rank:100,bestRank:100});
  await game.openPage('earn');await expect(page.locator('[data-invest-button]')).toBeDisabled();
  await expect(page.locator('[data-invest-note]')).toContainText('完了');await game.screenshot('earn-disabled',info.project.name);
  expect((await game.savedState()).facility).toBe(30);expect(game.errors).toEqual([]);
});
test('仲間の編成と低レアの手動継承強化を保存する',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,owned());await game.openPage('collection');
  await stateShot(game,'collection',info,'[data-filter="legacy"]');
  const team=(await game.savedState()).team;
  const next=team[1];
  await page.locator(`.roster [data-select="${next}"]`).click();
  await expect(page.locator('.collection-showcase h2')).toHaveText(G.byId(next).name);
  if(['mobile','narrow'].includes(info.project.name)){
    await expect(page.locator('.collection-showcase')).toBeFocused();
    await expect(page.locator('.showcase-train')).toBeInViewport();
  }else await expect(page.locator(`.roster [data-select="${next}"]`)).toBeFocused();
  await page.locator(`.collection-showcase [data-forward="${next}"]`).click();
  expect((await game.savedState()).team[0]).toBe(next);
  const train=page.locator('.showcase-train');
  await train.click();
  await page.locator(`[data-promote="${next}"]`).click();
  await page.locator(`#modal [data-training="${next}"]`).click();
  await page.keyboard.press('Escape');
  await expect(train).toBeFocused();
  await game.screenshot('collection-selected',info.project.name);
  await page.locator(`.roster [data-select="${team[0]}"]`).click();
  await page.locator(`[data-team="${team[0]}"]`).click();
  expect((await game.savedState()).team).not.toContain(team[0]);
  await page.locator(`[data-team="${team[0]}"]`).click();expect((await game.savedState()).team).toContain(team[0]);
  await page.locator('[data-filter="legacy"]').click();await game.screenshot('collection-legacy',info.project.name);
  await page.locator('[data-training="guard"]').first().click();
  await expect(page.locator('.training-view')).toContainText('編成');
  await game.screenshot('inheritance',info.project.name);
  const before=await game.savedState();expect(before.promotions.guard).toBe(1);
  await stateShot(game,'inheritance',info,'[data-promote="guard"]');
  await page.locator('[data-promote="guard"]').click();
  await expect(page.locator('.promotion-view')).toBeVisible();
  const after=await game.savedState();expect(after.promotions.guard).toBe(4);expect(after.counts.guard).toBe(before.counts.guard);
  await game.screenshot('inheritance-promoted',info.project.name);
  await page.locator('#modal [data-training="guard"]').click();
  await expect(page.locator('[data-promote="guard"]')).toBeDisabled();
  await game.screenshot('inheritance-disabled',info.project.name);
  await page.reload();expect((await game.savedState()).promotions.guard).toBe(4);expect(game.errors).toEqual([]);
});
test('育成から庭園に出撃し結果から育成へ戻る',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,owned());await game.openPage('collection');
  const id=(await game.savedState()).team[0];
  await page.locator(`[data-training="${id}"]`).first().click();
  await game.screenshot('training-detail',info.project.name);
  await stateShot(game,'training',info,`#modal [data-level="${id}"]`);
  const before=await game.savedState();await page.locator(`#modal [data-level="${id}"]`).click();
  expect((await game.savedState()).levels[id]).toBe(before.levels[id]+1);
  await page.locator('[data-material-mission="0"]').click();
  await expect(page.locator('.patrol')).toBeVisible();await game.screenshot('garden',info.project.name);
  await stateShot(game,'garden',info,'[data-action="battle"]');
  await page.locator('[data-action="battle"]').click();await expect(page.locator('.battle-result')).toBeVisible({timeout:20000});
  await game.screenshot('garden-result',info.project.name);
  await page.locator('#modal [data-training-back]').click();await expect(page.locator('.training-modal')).toBeVisible();
  expect(await game.hasOverflow()).toBe(false);expect(game.errors).toEqual([]);
});
test('ショップ数量・購入方式・投資・転生取消の状態を確認する',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,{rank:1,bestRank:1});await game.openPage('shop');
  await stateShot(game,'shop',info,'[data-quantity="10"]');await page.locator('[data-quantity="10"]').click();
  await expect(page.locator('[data-quantity="10"]')).toHaveAttribute('aria-pressed','true');
  await game.screenshot('shop-selected',info.project.name);await page.locator('[data-pack="large"]').click();
  await page.locator('input[value="credit"]').check();await game.screenshot('checkout-selected',info.project.name);
  await stateShot(game,'checkout',info,'[data-confirm-pack]');
  await page.locator('#modal .modal-close').click();
  await game.openPage('earn');await stateShot(game,'earn',info,'[data-invest-button]');
  await game.openPage('arena');await stateShot(game,'arena',info,'[data-action="battle"]');
  await page.locator('[data-action="ascend"]').click();const before=await game.savedState();
  await stateShot(game,'ascension',info,'[data-action="confirm-ascend"]');
  await page.locator('#modal [data-action="close"]').last().click();expect((await game.savedState()).season).toBe(before.season);
  expect(game.errors).toEqual([]);expect(game.failedAssets).toEqual([]);
  expect(await page.evaluate(()=>localStorage.getItem('astral-crown-save-v1'))).toBeNull();
});

