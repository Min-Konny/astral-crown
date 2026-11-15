import fs from 'node:fs/promises';
import runtime from './runtime.cjs';
import {AstralPage} from './pages/astral-page.js';
const {test,expect}=runtime;
const data=JSON.parse(await fs.readFile(new URL('./data/royal-flow.json',import.meta.url),'utf8'));

test('拠点の通知・通常・ホバー・キーボード・受取済み状態を確認する',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data);
  await page.evaluate(()=>Promise.all([...document.images].map(i=>i.decode().catch(()=>{}))));
  await page.locator('.home-tools [data-action="mail"]').click();
  await expect(page.locator('.home-notice')).toContainText('3,000');
  await expect(page.locator('.home-greeting')).toBeHidden();
  await expect(page.locator('#toast')).not.toHaveClass(/visible/);
  await expect(page.locator('.home-tools [data-action="mail"]')).toBeDisabled();
  const overlaps=await page.evaluate(()=>{
    const panel=document.querySelector('.character-line').getBoundingClientRect();
    const notice=document.querySelector('.home-notice').getBoundingClientRect();
    const result=[];
    if(notice.left<panel.left||notice.right>panel.right||notice.top<panel.top||notice.bottom>panel.bottom)result.push('notification outside speech panel');
    for(const el of document.querySelectorAll('.chapter,header,.home-tools button,.home-banners button,.home-economy,.home-cta button,.sidebar nav')){
      const r=el.getBoundingClientRect();
      if(Math.min(panel.right,r.right)-Math.max(panel.left,r.left)>1&&Math.min(panel.bottom,r.bottom)-Math.max(panel.top,r.top)>1)result.push(el.className||el.tagName);
    }
    return result;
  });
  expect(overlaps).toEqual([]);
  await game.screenshot('home-notice-disabled',info.project.name);
  await expect(page.locator('.home-notice')).toBeHidden({timeout:6000});
  await expect(page.locator('.home-greeting')).toBeVisible();
  await game.screenshot('home-settled',info.project.name);
  const gems=(await game.savedState()).gems;
  await page.locator('.home-tools [data-action="mail"]').evaluate(b=>b.click());
  expect((await game.savedState()).gems).toBe(gems);
  const moon=page.locator('.moon-banner');
  const background=await moon.evaluate(el=>getComputedStyle(el).backgroundImage);
  await moon.hover();
  expect(await moon.evaluate(el=>getComputedStyle(el).backgroundImage)).toBe(background);
  await game.screenshot('home-hover',info.project.name);
  await page.mouse.move(0,0);await page.keyboard.press('Tab');await moon.focus();
  expect(await moon.evaluate(el=>el.matches(':focus-visible'))).toBe(true);
  expect(await moon.evaluate(el=>parseFloat(getComputedStyle(el).outlineWidth))).toBeGreaterThanOrEqual(2);
  await game.screenshot('home-focus',info.project.name);
  await page.keyboard.press('Enter');
  await expect(page.locator('nav [data-page="summon"]')).toHaveAttribute('aria-current','page');
  await game.openPage('home');await page.locator('.home-economy button').click();
  await expect(page.locator('nav [data-page="earn"]')).toHaveAttribute('aria-current','page');
  expect(game.errors).toEqual([]);expect(game.failedAssets).toEqual([]);
  expect(await game.hasOverflow()).toBe(false);
  expect(await page.evaluate(()=>localStorage.getItem('astral-crown-save-v1'))).toBeNull();
});

test('長い戦闘記録復元エラーも画面内に折り返し操作群を隠さない',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,{pendingBattle:{}});
  await expect(page.locator('.home-notice')).toContainText('途中の戦闘記録を復元できませんでした');
  const geometry=await page.evaluate(()=>{
    const p=document.querySelector('.character-line'),r=p.getBoundingClientRect();
    const n=document.querySelector('.home-notice');
    const overlaps=[...document.querySelectorAll('.chapter,header,.home-tools button,.home-banners button,.home-economy,.home-cta button,.sidebar nav')].filter(el=>{
      const b=el.getBoundingClientRect();return Math.min(r.right,b.right)-Math.max(r.left,b.left)>1&&Math.min(r.bottom,b.bottom)-Math.max(r.top,b.top)>1;
    }).map(el=>el.className||el.tagName);
    return {inside:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,unclipped:n.scrollWidth<=n.clientWidth&&n.scrollHeight<=n.clientHeight,overlaps};
  });
  expect(geometry).toEqual({inside:true,unclipped:true,overlaps:[]});
  expect(await game.hasOverflow()).toBe(false);
  await game.screenshot('home-long-notice',info.project.name);
  await expect(page.locator('.home-notice')).toBeHidden({timeout:6000});
  await expect(page.locator('.home-greeting')).toBeVisible();
  expect(game.errors).toEqual([]);
});
