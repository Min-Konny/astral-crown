import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/game-ui.css',import.meta.url),'utf8');
const luminance=hex=>{
 const rgb=hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
};
const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

test('launch/primary state palettes keep readable labels, including gradient endpoints',()=>{
 const rules=[...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].filter(x=>x[1].includes('body button:is(.launch,.primary)'));
 assert.ok(rules.length>=4);
 for(const [,selector,body] of rules){
  const foreground=body.match(/(?:^|;)color:(#[\da-f]+)/)[1];
  const fg=foreground.length===4?'#'+[...foreground.slice(1)].map(x=>x+x).join(''):foreground;
  const background=body.match(/background:([^;]+)/)[1];
  for(const bg of background.match(/#[\da-f]{6}/g))assert.ok(ratio(fg,bg)>=4.5,`${selector}: ${ratio(fg,bg)}`);
 }
});

test('pressed visuals have no retained JS state and motion overrides follow compression',()=>{
 // Static regression guard only: native pointer cancellation/focus behavior needs browser QA.
 const lastPress=css.lastIndexOf('transform:translateY(2px) scale(1.02,.94)');
 assert.ok(lastPress>=0);
  assert.match(css,/scale\(1\.02,\.94\);transition:none/);
 assert.ok(css.lastIndexOf('body.soft button:active:not(:disabled),body.quick button:active:not(:disabled){transform:none}')>lastPress);
 assert.ok(css.lastIndexOf('@media(prefers-reduced-motion:reduce)')>lastPress);
 assert.match(css,/body button:disabled\{[^}]*transform:none/);
 assert.match(css,/body button:focus-visible\{[^}]*outline:3px/);
 const source=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/addEventListener\(['"](?:pointerdown|mousedown|touchstart)['"]/);
});

test('saved growth acknowledgement remains legible and respects reduced motion',()=>{
  assert.ok(ratio('#203d59','#d7e9f3')>=4.5);
  assert.match(css,/body\.soft \.growth-feedback,body\.quick \.growth-feedback\{animation:none\}/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{body \.training-modal \.growth-feedback\{animation:none\}\}/);
});
