import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=p=>readFile(new URL(p,root),'utf8');
export async function createNotices(){
  for(const [name,version] of [['phaser','3.90.0'],['eventemitter3','5.0.4']]){
    if(JSON.parse(await read(`node_modules/${name}/package.json`)).version!==version)
      throw Error(`Review bundled third-party notices before upgrading ${name}`);
  }
  const sections=['# Third-party notices\n\nFor the unmodified npm Phaser 3.90.0 distribution bundled with this game. Notices below are reproduced from the official package and linked authors. No game assets are licensed by this document.\n'];
  for(const p of ['node_modules/phaser/LICENSE.md','node_modules/eventemitter3/LICENSE','node_modules/phaser/src/physics/matter-js/lib/license.js'])
    sections.push(`## ${p}\n\n`+await read(p));
  // The corresponding non-minified distribution retains notices stripped from phaser.min.js.
  const bundle=await read('node_modules/phaser/dist/phaser.js');
  const comments=[...new Set(bundle.match(/\/\*[\s\S]*?\*\//g)||[])].filter(c=>/copyright|\blicense\b/i.test(c));
  sections.push('## Notices preserved from phaser/dist/phaser.js\n\n'+comments.join('\n\n'));
  const lines=bundle.split('\n');
  sections.push('## Inline credits preserved from phaser/dist/phaser.js\n\n'+lines.filter((l,i)=>/\/\//.test(l)&&/copyright|license|modifications:|phrogz|mgechev|Paul Bourke/i.test(l)).join('\n'));
  const sources=JSON.parse(await read('licenses/sources.json'));
  for(const source of sources){
    const text=await read('licenses/'+source.file);
    if(createHash('sha256').update(text.replaceAll('\r\n','\n')).digest('hex')!==source.sha256)throw Error('License source checksum changed: '+source.file);
    sections.push(`## ${source.file}\n\nSource: ${source.url}\n\n`+text);
  }
  const result=sections.join('\n\n');
  for(const credit of ['Arnout Kazemier','Mapbox','Vladimir Agafonkin','Liam Brummitt','Matt DesLauriers','Gavin Kistner','Minko Gechev','RoboWhale','Stefan Hedman'])
    if(!result.includes(credit))throw Error('Missing bundled notice: '+credit);
  return result;
}
export async function writeNotices(){
  await writeFile(new URL('vendor/THIRD-PARTY-NOTICES.txt',root),await createNotices());
}
