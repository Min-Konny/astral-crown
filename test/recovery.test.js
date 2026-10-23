import test from 'node:test';
import assert from 'node:assert/strict';
import {createStage} from '../src/scenes.js';
import * as G from '../src/game.js';
import {transact,receipt,SAVE_KEY} from '../src/session.js';

function harness(){
  let scene,loadError;
  const tasks=[],tweens=[],canvas=new EventTarget();canvas.style={};
  const object=()=>{const value={width:100,height:100,x:50,y:50,active:true};let proxy;
    proxy=new Proxy(value,{get:(o,k)=>k in o?o[k]:()=>proxy});return proxy;};
  class Scene {
    constructor(){
      scene=this;this.game={canvas};
      this.scale={width:390,height:844,on(){}};
      this.textures={get:()=>({getSourceImage:()=>({width:2048,height:683}),add(){}})};
      this.load={image(){},on:(event,fn)=>{loadError=fn;}};
      this.add=new Proxy({},{get:()=>object});
      this.tweens={add:config=>tweens.push(config),killAll:()=>{tweens.length=0;}};
      this.time={delayedCall:(ms,fn)=>tasks.push(fn),removeAllEvents:()=>{tasks.length=0;}};
      this.children={removeAll(){}};
    }
  }
  globalThis.Phaser={Scene,Scale:{RESIZE:1},Game:class{
    constructor(config){new config.scene();}destroy(){}
  }};
  return {canvas,tasks,tweens,boot(failImage=false){scene.preload();if(failImage)loadError();scene.create();},
    scales:()=>[scene.time.timeScale,scene.tweens.timeScale],failImage:file=>loadError(file),lose:()=>canvas.dispatchEvent(new Event('webglcontextlost'))};
}

test('optional starter image failure keeps legacy atlas battle available',()=>{
 const previous=globalThis.Phaser;
 try{
  const h=harness(),errors=[],stage=createStage({},x=>errors.push(x));h.boot();h.failImage({key:'hero-noel'});
  let frames=0,done=0;stage.battle(G.battle(G.initialState()),false,()=>frames++,()=>done++);
  assert(frames>0);assert.deepEqual(errors,[]);stage.skip();assert.equal(done,1);stage.destroy();
 }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});

test('live action skip keeps the battlefield but invalidates its old hit callback',()=>{
 const previous=globalThis.Phaser;
 try{
  const h=harness(),stage=createStage({},()=>{});h.boot();
  const r=G.battle(G.initialState()),slice=i=>({live:true,allies:r.allies,enemy:r.enemy,frames:[r.frames[i]]});
  let completed=0,frames=0;
  stage.battle(slice(0),false,()=>frames++,()=>completed++);
  const oldHit=h.tweens.find(t=>t.onYoyo)?.onYoyo;assert.ok(oldHit);
  stage.skip();assert.equal(completed,1);
  stage.battle(slice(1),false,()=>frames++,()=>completed++);
  oldHit();assert.equal(completed,1);assert.equal(frames,2);
  stage.skip();stage.skip();assert.equal(completed,2);
  h.lose();stage.battle(slice(2),false,()=>assert.fail(),()=>completed++);assert.equal(completed,3);
  stage.destroy();
 }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});

test('battle speed changes only clocks and resets on skip, failure and subsequent scenes',()=>{
 const previous=globalThis.Phaser;
 try{
  const h=harness(),stage=createStage({clientWidth:390,clientHeight:844},()=>{});h.boot();
  const r=G.campaignBattle(G.initialState(),0),before=structuredClone(r);let done=0;
  stage.battle(r,false,()=>{},()=>done++);stage.setBattleSpeed(2);assert.deepEqual(h.scales(),[2,2]);
  stage.setBattleSpeed(99);assert.deepEqual(h.scales(),[2,2]);
  const stale=[...h.tasks,...h.tweens.map(t=>t.onYoyo).filter(Boolean)];
  stage.skip();stage.skip();assert.equal(done,1);assert.deepEqual(h.scales(),[1,1]);
  stage.setBattleSpeed(2);assert.deepEqual(h.scales(),[1,1]);
  stage.battle(r,false,()=>{},()=>done++);stage.setBattleSpeed(2);
  for(const callback of stale)callback();assert.equal(done,1);assert.deepEqual(h.scales(),[2,2]);
  h.lose();assert.equal(done,2);assert.deepEqual(h.scales(),[1,1]);
  assert.deepEqual(r,before);stage.destroy();
 }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});

for(const failure of ['image','context'])for(const kind of ['summon','battle'])for(const reduced of [false,true]){
  test(`${failure} failure during ${kind} (reduced=${reduced}) releases results once and preserves reload receipt`,()=>{
    const previous=globalThis.Phaser;
    try{
      const h=harness(),errors=[],stage=createStage({clientWidth:390,clientHeight:844},m=>errors.push(m));
      h.boot();
      const old=G.initialState(1000);old.levels.noel=50;old.levels.iris=50;old.levels.mira=50;
      let saved,writes=0,rolls=0,completed=0;
      const store={setItem(k,v){assert.equal(k,SAVE_KEY);saved=v;writes++;}};
      const tx=transact(store,old,kind,s=>{
        if(kind==='summon')return G.summon(s,10,'pickup',()=>{rolls++;return .1;});
        const r=G.battle(s);G.applyBattle(s,r);return r;
      },1000);
      const before=saved,rollCount=rolls;
      if(kind==='summon')stage.summon(tx.result,[G.byId('scholar')],reduced,()=>completed++);
      else stage.battle(tx.result,reduced,()=>{},()=>completed++);
      const stale=[...h.tasks];
      if(failure==='image')h.failImage();else h.lose();
      h.lose();h.failImage();stage.skip();stage.skip();
      for(const callback of stale)callback();
      assert.equal(completed,1);assert.equal(errors.length,1);
      assert.equal(h.canvas.style.visibility,'hidden');
      assert.equal(saved,before);assert.equal(writes,1);assert.equal(rolls,rollCount);
      const raw=JSON.parse(saved),loaded=G.restore(raw,1000).state;
      assert.equal(receipt(raw).kind,kind);
      for(const field of ['gems','dust','cash','rank','pulls'])assert.equal(loaded[field],tx.state[field]);
      if(kind==='summon'){assert.equal(loaded.gems,0);assert.equal(loaded.pulls,10);}
      else {assert.equal(tx.result.win,true);assert.equal(loaded.dust,old.dust+tx.result.reward.dust);}
      stage.show('home',loaded,false);
      stage.summon({},[],false,()=>completed++);stage.battle({},false,()=>{},()=>completed++);
      assert.equal(completed,3);stage.destroy();h.lose();assert.equal(completed,3);
    }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
  });
}

test('preload failure skips absent textures and a fresh stage can recover after reload',()=>{
  const previous=globalThis.Phaser;
  try{
    const h=harness(),stage=createStage({},()=>{});h.boot(true);
    let done=0;stage.summon({},[],false,()=>done++);assert.equal(done,1);stage.destroy();
    const fresh=harness(),reloaded=createStage({},()=>assert.fail('unexpected failure'));fresh.boot();
    reloaded.show('home',G.initialState(),false);
    reloaded.summon({},[G.byId('scholar')],false,()=>done++);
    assert.equal(done,1);fresh.tasks.shift()();fresh.tasks.shift()();assert.equal(done,2);reloaded.destroy();
  }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});

test('skipped summon completion cannot complete a later presentation after returning home',()=>{
  const previous=globalThis.Phaser;
  try{
    const h=harness(),stage=createStage({},()=>{});h.boot();let first=0,next=0;
    stage.summon({},[G.byId('scholar')],true,()=>first++);
    const staleCompletion=h.tasks[0];stage.skip();
    stage.show('home',G.initialState(),false);
    stage.summon({},[G.byId('scholar')],false,()=>next++);
    staleCompletion();
    assert.equal(first,1);assert.equal(next,0,'old completion must not finish the new summon');
    stage.skip();assert.equal(next,1);stage.destroy();
  }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});

for(const order of ['skip-first','failure-first','complete-first'])test(`${order}: repeated failures and stale battle tween leave home usable`,()=>{
  const previous=globalThis.Phaser;
  try{
    const h=harness(),errors=[],stage=createStage({},m=>errors.push(m));h.boot();
    let completed=0,frames=0;const state=G.initialState();
    stage.battle(G.battle(state),false,()=>frames++,()=>{completed++;stage.show('home',state,false);});
    const oldHit=h.tweens.find(t=>t.onYoyo)?.onYoyo;
    assert.ok(oldHit,'test retains an attack callback from the active battle');
    if(order==='skip-first')stage.skip();
    if(order==='complete-first'){
      oldHit();
      // Advance real battle sequencing through the captured mock callbacks.
      let guard=0;
      while(!completed&&guard++<500){
        const callback=h.tasks.shift();if(callback)callback();
        else {const tween=h.tweens.splice(0).find(t=>t.onYoyo);tween?.onYoyo();}
      }
      assert.equal(completed,1);
    }
    h.lose();stage.skip();h.failImage();h.lose();
    const priorFrames=frames;oldHit();
    assert.equal(frames,priorFrames);assert.equal(completed,1);assert.equal(errors.length,1);
    stage.show('home',state,false);stage.battle({},false,()=>assert.fail(),()=>completed++);
    assert.equal(completed,2);stage.destroy();
  }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});

for(const kind of ['summon','battle'])test(`failed ${kind} save leaves state and prior receipt unchanged, even in rendering fallback`,()=>{
  const previous=globalThis.Phaser;
  try{
    const h=harness(),stage=createStage({},()=>{});h.boot();h.lose();
    const state=G.initialState(1000),before=structuredClone(state);
    const prior=JSON.stringify({...state,presentation:{kind:'battle',result:{win:false,rank:100,reward:null}}});
    const values=new Map([[SAVE_KEY,prior]]);let attempts=0,presentations=0;
    const store={getItem:key=>values.get(key),setItem(){attempts++;throw Error('quota');}};
    assert.throws(()=>{
      const tx=transact(store,state,kind,s=>{
        if(kind==='summon')return G.summon(s,10,'pickup',()=>.1);
        const r=G.battle(s);G.applyBattle(s,r);return r;
      });
      if(kind==='summon')stage.summon(tx.result,[],false,()=>presentations++);
      else stage.battle(tx.result,false,()=>{},()=>presentations++);
    },/quota/);
    assert.deepEqual(state,before);assert.equal(store.getItem(SAVE_KEY),prior);
    assert.equal(attempts,1);assert.equal(presentations,0);stage.skip();stage.destroy();
  }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});
