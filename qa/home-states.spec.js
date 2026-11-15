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

test('拠点でミッションを確認し、達成報酬を一度だけ受け取る',async({page},info)=>{
  const game=new AstralPage(page);await game.moveToPage(data,{pulls:1000});
  const entry=page.getByRole('button',{name:'ミッション・受取可能 1件'});
  await expect(entry).toBeVisible();
  await game.screenshot('missions-entry',info.project.name);
  await entry.click();
  const modal=page.getByRole('dialog',{name:'ミッション'});
  await expect(modal.getByRole('heading',{name:'ミッション',exact:true})).toBeFocused();
  await expect(modal.getByRole('button',{name:'収入設備Lv.10到達の報酬：未達成'})).toBeDisabled();
  const before=await game.savedState();
  const claim=modal.getByRole('button',{name:'累計1,000連の報酬：受け取る'});
  const liveRegion=await modal.locator('.mission-received').elementHandle();
  await page.evaluate(()=>{window.failSave=true;});
  await claim.click();
  expect((await game.savedState()).gems).toBe(before.gems);
  await expect(claim).toBeEnabled();
  await page.evaluate(()=>{window.failSave=false;});
  await claim.click();
  expect((await game.savedState()).gems).toBe(before.gems+3000);
  expect(await liveRegion.evaluate(el=>el.isConnected)).toBe(true);
  await expect(modal.getByRole('status')).toContainText('星晶石 +3,000');
  await expect(modal.getByRole('button',{name:'累計1,000連の報酬：受取済み'})).toBeDisabled();
  await game.screenshot('missions',info.project.name);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button',{name:'ミッション',exact:true})).toBeFocused();
  await page.reload();
  await page.getByRole('button',{name:'ミッション',exact:true}).click();
  await expect(modal.getByRole('button',{name:'累計1,000連の報酬：受取済み'})).toBeDisabled();
  expect(game.errors).toEqual([]);
  expect(await game.hasOverflow()).toBe(false);
});
