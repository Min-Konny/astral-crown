// One identity map for Phaser and HTML portraits. Legacy atlas remains the fallback.
export const CHARACTER_ART=Object.freeze({noel:'./assets/noel-chibi.png',iris:'./assets/iris-chibi.png',mira:'./assets/mira-chibi.png',sol:'./assets/sol-chibi.png',ash:'./assets/ash-chibi.png',flora:'./assets/flora-chibi.png'});
const frames={luna:0,sol:1,flora:3,noel:1,iris:2,ash:1,mira:3,sage:0,ranger:2,smith:1,guard:1,scholar:0,herbalist:3};
export function characterArt(id){return {src:CHARACTER_ART[id]??null,key:`hero-${id}`,frame:frames[id]??0};}
export function portraitHTML(id){const a=characterArt(id);return `<div class="mini-portrait" style="background-position:${a.frame*100/3}% center">${a.src?`<img data-hero-art="${id}" src="${a.src}" alt="" decoding="async">`:''}</div>`;}
