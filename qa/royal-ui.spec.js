import fs from 'node:fs/promises';
import runtime from './runtime.cjs';
import {AstralPage} from './pages/astral-page.js';
const {test,expect}=runtime;
const data=JSON.parse(await fs.readFile(new URL('./data/royal-flow.json',import.meta.url),'utf8'));

test('全6画面が読み込め、狭い画面でも横にはみ出さない',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data);
  for(const name of data.pages){
    await test.step(name,async()=>{
      await game.openPage(name);
      await expect(page.locator(`nav [data-page="${name}"]`)).toHaveAttribute('aria-current','page');
      expect(await game.hasOverflow()).toBe(false);
      await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
      await game.screenshot(name,info.project.name);
    });
  }
  expect(game.errors).toEqual([]);expect(game.failedAssets).toEqual([]);
});

test('仕事と設備投資から疑似課金・10000連・育成まで進めて保存できる',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data);
  await test.step('仕事と投資',async()=>{
    await game.openPage('earn');const before=await game.savedState();await game.clickWork();
    expect((await game.savedState()).cash).toBeGreaterThanOrEqual(before.cash+600);
    await expect(page.locator('#work-feedback')).toContainText('600');
    await game.invest();expect((await game.savedState()).facility).toBe(9);
    await expect(page.locator('.investment-panel h2')).toContainText('Lv.9');
  });
  await test.step('購入の明細と確定',async()=>{
    // After investment, ten premium packs are affordable without waiting for income.
    await game.choosePack(data.pack,10);
    await page.locator('input[value="credit"]').check();
    await expect(page.locator('.receipt')).toContainText('100,000');
    await game.screenshot('checkout',info.project.name);
    await game.confirmPayment();
    await expect(page.locator('.purchase-success')).toBeVisible();
    const s=await game.savedState();expect(s.spent).toBe(100000);expect(s.gems).toBe(data.gems+180000);
    await game.screenshot('payment',info.project.name);
  });
  await test.step('大量召喚と育成',async()=>{
    await page.locator('[data-go-summon]').click();await page.locator('[data-count="10000"]').click();
    await page.locator('[data-action="summon"]').click();
    await expect(page.locator('.result-modal .result')).toBeVisible({timeout:20000});
    const s=await game.savedState();expect(s.pulls).toBe(10000);expect(s.gems).toBe(data.gems+180000-3000000);
    const total=await page.locator('.rarity-totals strong').allTextContents();
    expect(total.reduce((n,v)=>n+Number(v.replaceAll(',','')),0)).toBe(10000);
    expect(await page.locator('.pull-card').count()).toBe(0);
    expect(await game.hasOverflow()).toBe(false);
    await game.screenshot('bulk-result',info.project.name);
    await page.locator('.result-breakdown summary').click();
    await page.locator('.collected-results [data-training]').first().click();
    await expect(page.locator('.training-modal')).toBeVisible();
    await game.screenshot('training',info.project.name);
    await page.reload();expect((await game.savedState()).pulls).toBe(10000);
    expect((await game.savedState()).spent).toBe(100000);
    await game.openPage('arena');await page.locator('[data-action="battle"]').click();
    await expect(page.locator('.battle-result')).toBeVisible({timeout:20000});
    await game.screenshot('battle-result',info.project.name);
    expect(await page.evaluate(()=>localStorage.getItem('astral-crown-save-v1'))).toBeNull();
  });
  expect(game.errors).toEqual([]);expect(game.failedAssets).toEqual([]);
});

test('残高不足から稼ぐ画面へ戻れ、保存失敗では課金されない',async({page})=>{
  const game=new AstralPage(page);await game.moveToPage(data,{cash:0,facility:0,seals:0});
  await game.choosePack('large',1000);
  await expect(page.locator('[data-confirm-pack]')).toBeDisabled();
  await page.locator('#modal [data-page="earn"]').click();
  await expect(page.locator('#modal')).not.toBeVisible();await expect(page.locator('.earn-screen')).toBeVisible();
  await game.clickWork();await game.clickWork();await game.choosePack('small',1);
  const before=await game.savedState();await page.evaluate(()=>window.failSave=true);await game.confirmPayment();
  await expect(page.locator('#dialog-notice')).toContainText('保存');
  expect((await game.savedState()).spent).toBe(before.spent);expect((await game.savedState()).gems).toBe(before.gems);
  await page.evaluate(()=>window.failSave=false);await game.confirmPayment();
  expect((await game.savedState()).spent).toBe(480);expect((await game.savedState()).gems).toBe(before.gems+600);
  await page.reload();expect((await game.savedState()).spent).toBe(480);
  expect(game.errors).toEqual([]);
});

test('転生は維持と初期化の対象を示して確定できる',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,{rank:1,bestRank:1,spent:100000});
  const before=await game.savedState();await game.openPage('arena');await page.locator('[data-action="ascend"]').click();
  await expect(page.locator('.ascension-lists')).toContainText('引き継ぐ');
  await expect(page.locator('.ascension-reward')).toContainText('+10');
  await game.screenshot('ascension',info.project.name);
  await page.locator('[data-action="confirm-ascend"]').click();const after=await game.savedState();
  expect(after.seals).toBe(before.seals+10);expect(after.season).toBe(before.season+1);expect(after.counts).toEqual(before.counts);
  expect(after.spent).toBe(before.spent);expect(after.rank).toBe(100);expect(after.facility).toBe(0);expect(after.gems).toBe(3000);
  await page.reload();expect((await game.savedState()).seals).toBe(before.seals+10);
  expect(game.errors).toEqual([]);
});

test('ホームの新しい入口から召喚・庭園・ショップ・設備・闘技場へ移動できる',async({page})=>{
  const game=new AstralPage(page);await game.moveToPage(data);
  for(const [selector,target] of [['.moon-banner','summon'],['.garden-banner','arena'],['.jewel-banner','shop'],['.home-economy button','earn'],['.adventure-launch','arena'],['.arena-shortcut','arena']]){
    await game.openPage('home');await game.clickHomeShortcut(selector);
    await expect(page.locator(`nav [data-page="${target}"]`)).toHaveAttribute('aria-current','page');
    if(selector==='.adventure-launch'||selector==='.garden-banner')await expect(page.locator('.patrol')).toBeVisible();
    if(selector==='.arena-shortcut')await expect(page.locator('.arena-ui:not(.patrol)')).toBeVisible();
  }
  await game.openPage('home');await game.clickHomeShortcut('[data-action="mail"]');
  await expect(page.locator('.home-tools [data-action="mail"]')).toBeDisabled();
  await expect(page.locator('.home-badge')).toHaveCount(0);
  expect(game.errors).toEqual([]);expect(game.failedAssets).toEqual([]);
});
