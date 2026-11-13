import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as G from '../../src/game.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const contentTypes={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'};
export class AstralPage {
  constructor(page){this.page=page;this.errors=[];this.failedAssets=[];}
  async moveToPage(data,overrides={}){
    const state=Object.assign(G.initialState(),{cash:data.cash,gems:data.gems,facility:data.facility,seals:data.seals,settings:{quick:true,sound:false,soft:true,skillMode:'auto'}},overrides);
    this.page.on('pageerror',error=>this.errors.push(error.message));
    this.page.on('response',response=>{if(response.status()>=400)this.failedAssets.push(response.url());});
    // Route local bytes: no user browser, remote server, real payment, or normal save is touched.
    await this.page.route('http://astral.test/**',async route=>{
      const url=new URL(route.request().url());
      const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
      if(!file.startsWith(root+path.sep))return route.abort();
      try{await route.fulfill({body:await fs.readFile(file),contentType:contentTypes[path.extname(file)]||'application/octet-stream'});}
      catch{await route.fulfill({status:404,body:'not found'});}
    });
    await this.page.addInitScript(state=>{
      if(!sessionStorage.getItem('royal-seeded')){
        sessionStorage.setItem('astral-crown-save-v1',JSON.stringify({...state,lastSeen:Date.now()}));
        sessionStorage.setItem('royal-seeded','1');
      }
      const write=Storage.prototype.setItem;
      window.failSave=false;
      Storage.prototype.setItem=function(key,value){
        if(window.failSave&&this===sessionStorage&&key==='astral-crown-save-v1')throw Error('QA storage failure');
        return write.call(this,key,value);
      };
    },state);
    await this.page.goto('http://astral.test/?preview=1');
    await this.page.locator('nav [aria-current="page"]').waitFor();
    await this.page.locator('#game-stage canvas').waitFor();
  }
  async openPage(name){await this.page.locator(`nav [data-page="${name}"]`).click();}
  async clickHomeShortcut(selector){await this.page.locator(`.festival-home ${selector}`).click();}
  async clickWork(){await this.page.locator('[data-action="work"]').click();}
  async invest(){await this.page.locator('[data-invest-button]').click();}
  async choosePack(id,quantity){await this.openPage('shop');await this.page.locator(`[data-quantity="${quantity}"]`).click();await this.page.locator(`[data-pack="${id}"]`).click();}
  async confirmPayment(){await this.page.locator('[data-confirm-pack]').click();}
  async savedState(){return this.page.evaluate(()=>JSON.parse(sessionStorage.getItem('astral-crown-save-v1')));}
  async hasOverflow(){return this.page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);}
  async screenshot(name,project){
    if(name.startsWith('collection')){
      await this.page.evaluate(async()=>{
        await Promise.all([...document.querySelectorAll('.collection-portrait')].map(img=>img.decode()));
      });
    }
    await this.page.screenshot({path:path.join(root,'artifacts',`royal-${name}-${project}.png`),fullPage:!name.startsWith('collection')});
  }
}

