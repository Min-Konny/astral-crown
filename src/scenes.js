// Phaser owns the illustrated stage; accessible HTML owns navigation and dialogs.
import {byId} from './game.js';
const frameFor=id=>({luna:0,sol:1,flora:3,noel:1,iris:2,ash:1,mira:3,sage:0,ranger:2,smith:1,guard:1,scholar:0,herbalist:3}[id]??0);
export function createStage(parent, onError) {
  try { return createPhaserStage(parent,onError); }
  catch {
    // A missing engine or unavailable canvas must not abort app initialization.
    queueMicrotask(()=>onError('描画を開始できません。演出を省略して結果を表示します。再読み込みで復旧をお試しください。'));
    return {show(){},summon(result,characters,reduced,done){done();},
      battle(result,reduced,onFrame,done){done();},skip(){},destroy(){}};
  }
}
function createPhaserStage(parent, onError) {
  let current,queued,sequence=0,finish=null,failed=false,canvas;
  const contextLost=()=>fail();
  function fail(){
    if(failed)return;
    failed=true;
    if(canvas)canvas.style.visibility='hidden';
    // Cancel stale visual callbacks before releasing the HTML input lock.
    // Outcomes have already been committed; never rerun gameplay here.
    const done=finish;finish=null;clear();current=null;
    done?.();
    onError('画像・描画を利用できないため演出を省略しました。操作は続けられます。画像の復帰には再読み込みしてください。');
  }
  class AstralStage extends Phaser.Scene {
    constructor(){super('astral');}
    preload(){
      canvas=this.game?.canvas;
      canvas?.addEventListener('webglcontextlost',contextLost);
      canvas?.addEventListener('contextlost',contextLost);
      this.load.image('garden','./assets/garden.png');
      this.load.image('luna','./assets/luna.png');
      this.load.image('party','./assets/party.png');
      this.load.on('loaderror',fail);
    }
    create(){
      if(failed)return;
      const source=this.textures.get('party').getSourceImage(),width=source.width,height=source.height;
      // Art-directed atlas regions, kept as frames without modifying the original image.
      const cuts=[0,.282,.507,.757,1];
      for(let i=0;i<4;i++)this.textures.get('party').add(i,0,Math.round(width*cuts[i]),0,Math.round(width*(cuts[i+1]-cuts[i])),height);
      current=this;
      this.scale.on('resize',()=>{if(!finish&&queued)draw(...queued);});
      if(queued)draw(...queued);
    }
  }
  const game=new Phaser.Game({type:Phaser.AUTO,parent,backgroundColor:'#10224b',antialias:true,
    scale:{mode:Phaser.Scale.RESIZE,width:parent.clientWidth,height:parent.clientHeight},
    scene:AstralStage,render:{powerPreference:'low-power'},fps:{target:30,forceSetTimeOut:true},audio:{noAudio:true}});
  function clear(){
    sequence++;if(!current)return;
    current.tweens.killAll();current.time.removeAllEvents();current.children.removeAll(true);
  }
  function backdrop(mode){
    const s=current,w=s.scale.width,h=s.scale.height;
    const bg=s.add.image(w/2,h/2,'garden');bg.setScale(Math.max(w/bg.width,h/bg.height));
    if(mode==='summon')bg.setTint(0x435d9a);
    s.add.rectangle(w/2,h/2,w,h,mode==='summon'?0x10224b:0x75b5dc,mode==='summon'?.3:.04);
    return {s,w,h};
  }
  function draw(mode,state,reduced){
    queued=[mode,state,reduced];if(failed||!current||finish)return;
    clear();const {s,w,h}=backdrop(mode),mobile=w<650;
    if(mode==='home'||mode==='summon'){
      const hero=s.add.image(w*(mobile?.54:.57),h*(mobile?.99:.93),'luna').setOrigin(.5,1);
      const scale=h*(mobile?.8:.82)/hero.height;hero.setScale(scale);
      if(!reduced)s.tweens.add({targets:hero,y:hero.y-7,duration:2600,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      if(mode==='summon')s.add.rectangle(w/2,h/2,w,h,0x182447,.09);
      if(!reduced)for(let i=0;i<15;i++){
        const mote=s.add.circle((i*131)%w,(i*83)%h,1+i%3,0xffffff,.65);
        s.tweens.add({targets:mote,y:mote.y-80,alpha:0,duration:3000+i*170,repeat:-1});
      }
    }else if(mode==='arena'){
      placeUnits(state.team.map(id=>({id,name:byId(id).name,hp:1,max:1})), 'a',w,h);
      placeUnits((state.previewEnemy||['noel','ash','iris','mira'].map(id=>byId(id))).map(c=>({id:c.id,name:c.name,hp:1,max:1})),'b',w,h);
    }
    // Draw into the existing canvas without a full-screen transition overlay.
  }
  function placeUnits(units,side,w,h){
    const s=current,map={};
    units.forEach((u,i)=>{
      const mobile=w<650, direction=side==='a'?1:-1;
      const x=mobile?w*(side==='a'?.25:.75):w*(side==='a'?.26:.74)+direction*(i%2?-.10:.06)*w;
      const y=mobile?h*(.32+i*.14):h*(.48+Math.floor(i/2)*.22);
      const shadow=s.add.ellipse(x,y+7,w*(mobile?.16:.075),12,0x244961,.2);
      const sprite=s.add.image(x,y,'party',frameFor(u.id)).setOrigin(.5,1).setFlipX(side==='b');
      sprite.setScale(Math.min(h*(mobile?.105:.18)/sprite.height,w*(mobile?.22:.12)/sprite.width));
      const label=s.add.text(x,y+18,u.name||'',{fontFamily:'sans-serif',fontSize:mobile?'12px':'15px',color:'#143351',backgroundColor:'#ffffffdd',padding:{x:6,y:3}}).setOrigin(.5,0);
      const hp=s.add.rectangle(x,y+9,mobile?56:90,5,side==='a'?0x24aeb5:0xe2788f);
      map[u.id]={sprite,label,hp,shadow,x,y,width:mobile?56:90,max:u.max||u.hp};
    });return map;
  }
  function complete(){if(!finish)return;const cb=finish;finish=null;clear();cb();}
  function summon(result,characters,reduced,done){
    if(!current){done();return;}
    clear();finish=done;const ticket=sequence,{s,w,h}=backdrop('summon');
    const best=characters.sort((a,b)=>['C','UC','R','SR','SSR'].indexOf(b.rarity)-['C','UC','R','SR','SSR'].indexOf(a.rarity))[0];
    const color=best.rarity==='SSR'?0xffd68e:best.rarity==='SR'?0xc5a3ff:0x8edfff;
    const ring=s.add.circle(w/2,h*.47,Math.min(w*.26,150),0xffffff,0).setStrokeStyle(3,color,.9);
    const core=s.add.star(w/2,h*.47,6,12,38,color,.9);
    const text=s.add.text(w/2,h*.7,'星の記憶を、あなたのもとへ。',{fontSize:w<650?'17px':'24px',color:'#ffffff',fontFamily:'sans-serif'}).setOrigin(.5);
    const reveal=()=>{
      if(sequence!==ticket)return;
      ring.destroy();core.destroy();text.destroy();
      const art=s.add.image(w/2,h*.8,best.id==='luna'?'luna':'party',best.id==='luna'?undefined:frameFor(best.id)).setOrigin(.5,1);
      art.setScale(Math.min(h*.63/art.height,w*.8/art.width));
      s.add.text(w/2,h*.82,`${best.rarity}  ${best.name}`,{fontFamily:'sans-serif',fontSize:w<650?'28px':'42px',fontStyle:'bold',color:'#fff5cc',stroke:'#173a66',strokeThickness:5}).setOrigin(.5);
      s.add.text(w/2,h*.9,best.title,{fontFamily:'sans-serif',fontSize:'18px',color:'#ffffff',stroke:'#173a66',strokeThickness:3}).setOrigin(.5);
      if(!reduced){s.tweens.add({targets:art,alpha:{from:0,to:1},x:{from:w*.65,to:w/2},duration:550,ease:'Cubic.easeOut'});}
      s.time.delayedCall(reduced?50:1900,()=>{if(sequence===ticket)complete();});
    };
    if(reduced){reveal();return;}
    s.tweens.add({targets:ring,scale:1.8,angle:180,alpha:.15,duration:1500});
    s.tweens.add({targets:core,scale:3,angle:90,duration:1500,ease:'Cubic.easeIn'});
    s.time.delayedCall(1550,reveal);
  }
  function battle(result,reduced,onFrame,done){
    if(!current){done();return;}
    clear();finish=done;const ticket=sequence,{s,w,h}=backdrop('arena');
    const units={a:placeUnits(result.allies.map(u=>({...u,max:u.hp})),'a',w,h),b:placeUnits(result.enemy.units.map(u=>({...u,max:u.hp})),'b',w,h)};
    let index=0;
    const step=()=>{
      if(sequence!==ticket)return;
      const f=result.frames[index++];if(!f){complete();return;}
      onFrame(f);
      const actor=units[f.side][f.actor],target=units[f.targetSide][f.target];
      const hit=()=>{
        if(sequence!==ticket)return;
        for(const side of ['a','b'])for(const u of f[side]){
          const view=units[side][u.id];view.hp.width=view.width*u.hp/u.max;
          view.sprite.setAlpha(u.hp?1:.25);view.label.setText(`${u.name} ${u.hp}`);
        }
        const value=s.add.text(target.x,target.y-70,f.kind==='guard'?'GUARD':`${f.kind==='heal'?'+':'−'}${f.amount}`,{fontFamily:'sans-serif',fontSize:f.skill?'30px':'23px',fontStyle:'bold',color:f.kind==='heal'?'#43e8bd':'#ffffff',stroke:'#16334c',strokeThickness:4}).setOrigin(.5);
        if(!reduced){
          target.sprite.setTint(f.kind==='heal'?0x99ffdd:0xffaabb);
          s.time.delayedCall(130,()=>target.sprite.active&&target.sprite.clearTint());
          s.tweens.add({targets:value,y:value.y-40,alpha:0,duration:620,onComplete:()=>value.destroy()});
          if(f.skill){const burst=s.add.circle(target.x,target.y-50,15,f.kind==='heal'?0x77ffdd:0xaedaff,.7);s.tweens.add({targets:burst,scale:5,alpha:0,duration:400,onComplete:()=>burst.destroy()});}
        }else s.time.delayedCall(100,()=>value.destroy());
        s.time.delayedCall(reduced?30:450,step);
      };
      if(reduced||f.kind==='heal'||f.kind==='guard')hit();
      else s.tweens.add({targets:actor.sprite,x:actor.x+(f.side==='a'?24:-24),duration:160,yoyo:true,onYoyo:hit});
    };step();
  }
  return {show:draw,summon,battle,skip:complete,destroy:()=>{
    canvas?.removeEventListener('webglcontextlost',contextLost);
    canvas?.removeEventListener('contextlost',contextLost);
    finish=null;clear();current=null;failed=true;game.destroy(true);
  }};
}
