import fs from 'node:fs/promises';
import {appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {allowedChange,reviewDecision} from './gates.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const issue=Number(option('--issue','0'));
const maxRounds=Number(option('--max-rounds','3'));
const base=option('--base','codex/visual-redesign-baseline');
const resumeFrom=option('--resume-from',null);
const repo='Min-Konny/astral-crown';
const screens=JSON.parse(await fs.readFile(new URL('./screens.json',import.meta.url),'utf8'));
const screen=screens.find(s=>s.key===option('--screen','home'));
if(!screen||!Number.isInteger(issue)||issue<1||!Number.isInteger(maxRounds)||maxRounds<1||maxRounds>5||!/^[a-zA-Z0-9_./-]+$/.test(base)||base.startsWith('-'))throw Error('Use --issue NUMBER --screen KEY [--max-rounds 1..5] [--base BRANCH] [--publish] [--dry-run]');
const playwright=process.env.ASTRAL_PLAYWRIGHT;
const playwrightCli=process.env.ASTRAL_PLAYWRIGHT_CLI;
if(!playwright||!playwrightCli)throw Error('Set ASTRAL_PLAYWRIGHT (test.js) and ASTRAL_PLAYWRIGHT_CLI (cli.js). Optionally set ASTRAL_CHROME.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const runDir=path.join(root,'.factory',`issue-${issue}-${stamp}`);
const work=path.join(runDir,'work');
const branch=`codex/ui-${screen.key}-${stamp}`;
let active;
async function run(command,argv,{cwd=root,input='',log,timeout=20*60*1000,acceptFailure=false}={}){
  if(log)await fs.writeFile(log,'');
  return new Promise((resolve,reject)=>{
    const child=spawn(command,argv,{cwd,env:process.env,windowsHide:true,stdio:['pipe','pipe','pipe']});active=child;
    let stdout='',stderr='',timedOut=false;
    const timer=setTimeout(()=>{timedOut=true;child.kill();},timeout);
    child.stdout.on('data',v=>{stdout+=v;if(log)appendFileSync(log,v);});child.stderr.on('data',v=>{stderr+=v;if(log)appendFileSync(log,v);});
    child.stdin.on('error',()=>{});child.stdin.end(input);
    child.on('error',e=>{clearTimeout(timer);reject(e);});
    child.on('close',async code=>{
      clearTimeout(timer);active=null;
      if(timedOut||code!==0&&!acceptFailure)reject(Error(`${path.basename(command)} failed (${timedOut?'timeout':code}); ${log||stderr.slice(-1000)}`));
      else resolve({stdout,stderr,code});
    });
  });
}
process.on('SIGINT',()=>{active?.kill();process.exit(130);});
async function git(argv,cwd=work){return (await run('git',argv,{cwd})).stdout.trim();}
async function statusHash(){
  const hash=createHash('sha256').update(await git(['diff','HEAD','--binary','--no-color'])).update(await git(['rev-parse','HEAD']));
  const changes=(await git(['ls-files','--others','--exclude-standard'])).split('\n').filter(Boolean);
  for(const file of changes){hash.update(file);hash.update(await fs.readFile(path.join(work,file)));}
  return hash.digest('hex');
}
async function validateScope(){
  const files=(await git(['diff','--name-only','HEAD'])).split('\n').filter(Boolean);
  const extra=(await git(['ls-files','--others','--exclude-standard'])).split('\n').filter(Boolean);
  if([...files,...extra].some(f=>!allowedChange(f)))throw Error('Implementation changed a protected/out-of-scope file. Inspect the retained work copy.');
  if(await git(['rev-parse','HEAD'])!==startingHead)throw Error('Agent unexpectedly committed changes.');
}
let startingHead;
await fs.mkdir(runDir,{recursive:true});
const lockPath=path.join(root,'.factory','loop.lock');
let lock;
try{
  lock=await fs.open(lockPath,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,runDir,issue}));
  console.log(`Run folder: ${runDir}`);
  const task=JSON.parse((await run('gh',['issue','view',String(issue),'--repo',repo,'--json','number,title,body,state,url'])).stdout);
  if(task.state!=='OPEN'||!task.body.includes(`docs/design-references/${screen.key}.png`))throw Error('Issue must be open and reference the selected screen image.');
  await fs.writeFile(path.join(runDir,'issue.json'),JSON.stringify(task,null,2));
  startingHead=await git(['rev-parse',`${base}^{commit}`],root);
  if(args.includes('--dry-run')){console.log(JSON.stringify({issue,screen:screen.key,base,startingHead,maxRounds,branch,work,publish:args.includes('--publish')},null,2));process.exitCode=0;}
  else{
    if(!screen.capture)throw Error('This screen needs a dedicated screenshot fixture before automatic visual approval.');
    await run('git',['clone','--no-hardlinks',root,work]);
    await git(['switch','-c',branch,startingHead]);
    await git(['remote','set-url','origin',`https://github.com/${repo}.git`]);
    // Use the trusted controller's npm executable; no shell interpolation or API keys.
    const npmCmd=(await run(process.platform==='win32'?'where.exe':'which',[process.platform==='win32'?'npm.cmd':'npm'])).stdout.trim().split(/\r?\n/)[0];
    const npmCli=process.platform==='win32'?path.join(path.dirname(npmCmd),'node_modules/npm/bin/npm-cli.js'):await fs.realpath(npmCmd);
    await run(process.execPath,[npmCli,'ci','--ignore-scripts'],{cwd:work,log:path.join(runDir,'install.log')});
    await run(process.execPath,['scripts/prepare.mjs'],{cwd:work});
    const reference=path.join(work,'docs/design-references',`${screen.key}.png`);
    const schema=path.join(root,'scripts/factory/review.schema.json');
    const captures=[screen.capture,...screen.extraCaptures||[]].flatMap(c=>['desktop','laptop','mobile','narrow'].map(size=>path.join(work,'artifacts',`royal-${c}-${size}.png`)));
    console.log('Capturing baseline before implementation');
    await run(process.execPath,[playwrightCli,'test','--config=qa/playwright.config.js'],{cwd:work,log:path.join(runDir,'baseline-browser.log')});
    const before=path.join(runDir,'before');await fs.mkdir(before);
    for(const capture of captures)await fs.copyFile(capture,path.join(before,path.basename(capture)));
    if(resumeFrom){
      const previousDir=await fs.realpath(path.resolve(root,resumeFrom));
      const factoryDir=await fs.realpath(path.join(root,'.factory'));
      if(!previousDir.startsWith(factoryDir+path.sep))throw Error('Resume source must be a retained .factory run.');
      const previous=JSON.parse(await fs.readFile(path.join(previousDir,'result.json'),'utf8'));
      if(previous.issue!==issue||previous.startingHead!==startingHead)throw Error('Resume source issue/base does not match.');
      const previousWork=await fs.realpath(path.join(previousDir,'work'));
      if(!previousWork.startsWith(previousDir+path.sep))throw Error('Invalid resume work path.');
      const patch=(await run('git',['diff','--binary','--no-color','HEAD'],{cwd:previousWork})).stdout;
      if(patch){const patchFile=path.join(runDir,'resume.patch');await fs.writeFile(patchFile,patch);await git(['apply',patchFile]);}
      for(const file of (await git(['ls-files','--others','--exclude-standard'],previousWork)).split('\n').filter(Boolean)){
        if(!allowedChange(file))throw Error('Resume contains an out-of-scope file.');
        await fs.mkdir(path.dirname(path.join(work,file)),{recursive:true});await fs.copyFile(path.join(previousWork,file),path.join(work,file));
      }
      await validateScope();
      console.log('Resumed retained changes; first round starts at verification/review.');
    }
    let feedback='初回。参考画像と既存実装を比較し、この画面のグラフィックを改善してください。';
    let outcome='round-limit';
    const history=[];
    for(let round=1;round<=maxRounds;round++){
      if(await fs.access(path.join(runDir,'STOP')).then(()=>true,()=>false)){outcome='stopped';break;}
      let claudeResult={result:'前回の作業コピーから変更を復元。最初に再検証・レビューする。'};
      if(!resumeFrom||round>1){
      console.log(`Round ${round}/${maxRounds}: Claude implementation`);
      const prompt=`ASTRAL CROWN の画面改修担当です。次のIssueだけを実装してください。\n${task.title}\n${task.body}\n参考画像をReadで必ず見る: ${reference}\n重点: ${screen.focus}\n前回フィードバック: ${feedback}\n編集可能: src/royal-ui.js, src/royal-ui.css, src/illustrated-ui.css, src/game-ui.css, src/scenes.js, src/app.js, index.html, assets/redesign/*.png/webp。ゲーム経済・抽選・保存ルールとセーブ互換性は変更禁止。テスト・QA・ビルド・依存・指示・設定ファイルは変更禁止。git操作、外部送信、公開、追加エージェント起動は禁止。テストと実画面キャプチャは親プロセスが実行します。CSSだけの管理画面にしない。既存の画像素材を活用し、専用の新規生成素材が不可欠なら未解決として報告する。完了後は変更点と未解決点を日本語で短く返す。`;
      const implemented=await run('claude',['-p','--output-format','json','--permission-mode','acceptEdits','--permission-prompts','none','--tools','Read,Write,Edit,Glob,Grep','--allowedTools','Read,Write,Edit,Glob,Grep','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--no-session-persistence'],{cwd:work,input:prompt+`\n変更前画像: ${before}\n直近の実画面もReadで確認する: ${captures.join(', ')}`,log:path.join(runDir,`round-${round}-claude.log`)});
      claudeResult=JSON.parse(implemented.stdout);
      if(claudeResult.is_error)throw Error('Claude returned an error; see local log.');
      }
      await validateScope();
      console.log(`Round ${round}: deterministic tests and screenshots`);
      let failed=false;
      for(const [name,argv] of [['unit',['--test']],['build',['scripts/build.mjs']],['browser',[playwrightCli,'test','--config=qa/playwright.config.js']]]){
        const result=await run(process.execPath,argv,{cwd:work,log:path.join(runDir,`round-${round}-${name}.log`),acceptFailure:true});
        if(result.code!==0){feedback=`${name} テスト失敗。ログ:\n${(result.stdout+'\n'+result.stderr).slice(-18000)}`;history.push({round,gate:name,passed:false});await fs.writeFile(path.join(runDir,'history.json'),JSON.stringify(history,null,2));failed=true;break;}
      }
      if(failed)continue;
      for(const capture of captures)await fs.access(capture);
      const roundImages=path.join(runDir,`round-${round}-images`);await fs.mkdir(roundImages);
      for(const capture of captures)await fs.copyFile(capture,path.join(roundImages,path.basename(capture)));
      const snapshot=await statusHash();
      console.log(`Round ${round}: Codex visual review`);
      const output=path.join(runDir,`round-${round}-review.json`);
      const reviewPrompt=`ASTRAL CROWN の独立レビュー担当。コードは変更禁止。Issue: ${task.title}\n${task.body}\n重点: ${screen.focus}\n添付1枚目は参考画像、残りはこのラウンドの実画面PC/スマホです。必ず目視比較する。全118件以上の単体・ビルド・4サイズのブラウザ回帰は親が成功を確認済み。テスト成功だけを根拠に見た目を合格にしない。git diff を読んで操作と保存互換性も確認。図や文字の重なり、引き伸ばし、クリック妨害、可読性、構図と絵の密度を具体的に判定。大きな不足があればrevise、画像を確認できない/素材生成や仕様判断が必要ならblocked。passは受入条件を実際に確認できた場合のみ。コード修正、コミット、外部通信、他エージェントは禁止。結果は指定JSON形式の日本語。`;
      const beforeImages=captures.map(f=>path.join(before,path.basename(f)));
      const imageArgs=[reference,...captures,...beforeImages].flatMap(f=>['--image',f]);
      const diff=await git(['diff','HEAD','--no-ext-diff','--no-color']);
      const changed=(await git(['diff','--name-only','HEAD'])).split('\n').filter(f=>/\.(js|css|html)$/.test(f));
      const source=await Promise.all(changed.map(async f=>`\n--- ${f} (current) ---\n${await fs.readFile(path.join(work,f),'utf8')}`));
      const reviewInput=reviewPrompt+`\n重要: ツール・シェルは使わず、以下の親プロセスが収集した差分・コード・検証結果と添付画像だけで判定してください。git diffを自分で実行する必要はありません。未確認の操作を確認したと主張しないこと。\n添付順: 参考画像1枚、変更後${captures.length}枚、同条件の変更前${beforeImages.length}枚。各グループはdesktop/laptop/mobile/narrow順。\n基点コミット: ${startingHead}\n差分ハッシュ: ${snapshot}\n検証: node --test、build、Playwright全20ケースがこの差分で終了コード0。親がQA・テスト・保存経済モデルの無変更を検証。\n実装担当報告:\n${claudeResult.result||''}\n差分:\n${diff}\n現在の変更ファイル全文:\n${source.join('\n')}`;
      await run('codex',['exec','--sandbox','read-only','--ephemeral','--output-schema',schema,'--output-last-message',output,...imageArgs,'-'],{cwd:work,input:reviewInput,log:path.join(runDir,`round-${round}-codex.log`)});
      if(snapshot!==await statusHash())throw Error('Reviewer changed the work copy.');
      const review=reviewDecision(JSON.parse(await fs.readFile(output,'utf8')));
      history.push({round,worktreeHash:snapshot,...review});feedback=JSON.stringify(review);
      await fs.writeFile(path.join(runDir,'history.json'),JSON.stringify(history,null,2));
      if(review.verdict==='pass'||review.verdict==='blocked'){outcome=review.verdict;break;}
    }
    await validateScope();
    await fs.writeFile(path.join(runDir,'result.json'),JSON.stringify({issue,screen:screen.key,base,startingHead,branch,outcome,history},null,2));
    if(args.includes('--publish')&&outcome==='pass'){
      if((await git(['status','--porcelain'])).trim()){
        await git(['fetch','origin',base]);
        if(await git(['rev-parse','FETCH_HEAD'])!==startingHead)throw Error('Remote base changed during review; revalidate against the new base before publishing.');
        await git(['add','src','index.html','assets/redesign']);
        await git(['commit','-m',`Improve ${screen.key} graphics for #${issue}`]);
        await git(['push','-u','origin',branch]);
        const bodyPath=path.join(runDir,'pr.md');
        await fs.writeFile(bodyPath,`## 変更\n${task.title}\n\nCloses #${issue}\n\n## 検証\n単体テスト・build・Playwright 4サイズ成功。Codexが参考画像と実キャプチャを比較。\n\n${history.at(-1).summary}\n\n基点: ${startingHead}。自動マージ・公開はしません。`);
        const pr=await run('gh',['pr','create','--repo',repo,'--draft','--base',base,'--head',branch,'--title',`[UI] ${screen.title} #${issue}`,'--body-file',bodyPath],{cwd:work});
        console.log(pr.stdout.trim());
      }else console.log('No changes; no PR created.');
    }
    console.log(`Finished: ${outcome}. Evidence: ${runDir}`);
    if(outcome!=='pass')process.exitCode=2;
  }
}catch(error){console.error(error.message);await fs.writeFile(path.join(runDir,'error.json'),JSON.stringify({issue,outcome:'error',message:error.message},null,2));process.exitCode=1;}
finally{if(lock){await lock.close();await fs.unlink(lockPath);}}
