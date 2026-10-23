import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/game-ui.css',import.meta.url),'utf8');
test('mobile battle HUD keeps controls in a separate row and long captions scrollable',()=>{
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 assert.ok(app.includes("playbackToolbar.append($('#skip-playback'))"));
 assert.ok(app.includes('playbackToolbar.prepend(speedButton)'));
 const layout=css.slice(css.indexOf('/* Playback actions and action text'));
 assert.match(layout,/#playback-toolbar\{position:static;order:0/);
 assert.match(layout,/#playback-text\{position:static;order:1/);
 assert.match(layout,/overflow:auto;pointer-events:auto/);
 assert.match(layout,/overflow-wrap:anywhere/);
});
test('illustrated text surfaces are opaque and dark dialogs have explicit light text scopes',()=>{
 assert.match(css,/body :is\(\.chapter,\.character-line,\.opponent,\.summon-dock\)\{background:var\(--surface\)/);
 assert.match(css,/--surface:#f8fcff;/);
 assert.match(css,/body :is\(\.training-modal,\.promotion-modal\) :is\(h2,h3,p,\.eyebrow,\.stage-badge\)\{color:var\(--ink-on-dark\)/);
 // These specific legacy selectors previously won over the general light theme.
 assert.match(css,/body \.tabs button:not\(\.selected\)\{color:var\(--ink-secondary\)/);
 assert.match(css,/body \.receipt b\{color:var\(--ink\)/);
});
