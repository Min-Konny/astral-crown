import test from 'node:test';
import assert from 'node:assert/strict';
import {createStage} from '../src/scenes.js';
import * as G from '../src/game.js';

test('missing engine preserves access to committed results without replaying actions',async()=>{
  const errors=[],stage=createStage({},message=>errors.push(message));
  const result=Object.freeze({win:true,reward:Object.freeze({cash:2000,dust:180})});
  let completed=0;
  stage.show('home',{},false);
  stage.summon(result,[],false,()=>completed++);
  stage.battle(result,false,()=>assert.fail('no visual replay without engine'),()=>completed++);
  stage.skip();stage.skip();stage.destroy();
  await Promise.resolve();
  assert.equal(completed,2);
  assert.equal(errors.length,1);
});

test('renderer constructor failure also falls back without blocking the UI',async()=>{
  const previous=globalThis.Phaser;
  globalThis.Phaser={Scene:class{},Scale:{RESIZE:1},Game:class{constructor(){throw Error('Canvas unavailable');}}};
  try{
    const errors=[],stage=createStage({clientWidth:390,clientHeight:844},s=>errors.push(s));
    let complete=0;stage.battle({},true,()=>{},()=>complete++);stage.skip();
    await Promise.resolve();assert.equal(complete,1);assert.equal(errors.length,1);
  }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});

test('normal navigation, resize and summon reveal never use camera flashes or rebuild the engine',async()=>{
  const previous=globalThis.Phaser;
  let scene,engines=0,resized;
  const tasks=[];
  const object=()=>{const target={width:100,height:100,x:50,y:50,active:true};let proxy;
    proxy=new Proxy(target,{get:(o,k)=>k in o?o[k]:(...args)=>proxy});return proxy;};
  class Scene {
    constructor(){
      this.scale={width:390,height:844,on:(event,fn)=>{resized=fn;}};
      this.textures={get:()=>({getSourceImage:()=>({width:2048,height:683}),add(){}})};
      this.load={image(){},on(){}};
      this.add=new Proxy({},{get:()=>object});
      this.tweens={add(){},killAll(){}};
      this.time={delayedCall:(ms,fn)=>tasks.push(fn),removeAllEvents:()=>{tasks.length=0;}};
      this.children={removeAll(){}};
      this.cameras={main:new Proxy({},{get:(_,name)=>()=>assert.fail('Unexpected full-screen camera effect: '+String(name))})};
    }
  }
  globalThis.Phaser={Scene,Scale:{RESIZE:1},Game:class{
    constructor(config){engines++;assert.equal(config.backgroundColor,'#10224b');scene=new config.scene();queueMicrotask(()=>{scene.preload();scene.create();});}
    destroy(){}
  }};
  try{
    const state=G.initialState(),stage=createStage({clientWidth:390,clientHeight:844},()=>assert.fail('Unexpected initialization failure'));
    stage.show('home',state,false);await Promise.resolve();
    for(const mode of ['summon','summon','summon','home','arena'])stage.show(mode,state,false);
    for(const width of [1920,390]){scene.scale.width=width;resized();}
    const result=G.summon(state,10,'pickup',()=>.1);let finished=0;
    stage.summon(result,[G.byId('scholar')],false,()=>finished++);
    tasks.shift()(); // Charge -> cut-in, formerly a white camera flash.
    tasks.shift()(); // Finish -> results.
    stage.skip();assert.equal(finished,1);
    stage.battle(G.battle(state),false,()=>{},()=>finished++);stage.skip();stage.skip();
    assert.equal(finished,2);assert.equal(engines,1);stage.destroy();
  }finally{if(previous===undefined)delete globalThis.Phaser;else globalThis.Phaser=previous;}
});
