import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../src/game-ui.css',import.meta.url),'utf8');
test('illustrated text surfaces are opaque and dark dialogs have explicit light text scopes',()=>{
 assert.match(css,/body :is\(\.chapter,\.character-line,\.opponent,\.summon-dock\)\{background:var\(--surface\)/);
 assert.match(css,/--surface:#f8fcff;/);
 assert.match(css,/body :is\(\.training-modal,\.promotion-modal\) :is\(h2,h3,p,\.eyebrow,\.stage-badge\)\{color:var\(--ink-on-dark\)/);
 // These specific legacy selectors previously won over the general light theme.
 assert.match(css,/body \.tabs button:not\(\.selected\)\{color:var\(--ink-secondary\)/);
 assert.match(css,/body \.receipt b\{color:var\(--ink\)/);
});
