import fs from 'node:fs/promises';
import {appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {allowedChange,reviewComment,reviewDecision} from './gates.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const args=process.argv.slice(2);
const option=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1];};
const issue=Number(option('--issue','0'));
const maxRounds=Number(option('--max-rounds','3'));
const base=option('--base','master');
const resumeFrom=option('--resume-from',null);
const publish=args.includes('--publish')&&!args.includes('--dry-run');
if(publish&&base!=='master')throw Error('Published runs must target master.');
const repo='Min-Konny/astral-crown';
const screens=JSON.parse(await fs.readFile(new URL('./screens.json',import.meta.url),'utf8'));
const screen=screens.find(s=>s.key===option('--screen','home'));
if(!screen||!Number.isInteger(issue)||issue<1||!Number.isInteger(maxRounds)||maxRounds<1||maxRounds>3||!/^[a-zA-Z0-9_./-]+$/.test(base)||base.startsWith('-'))throw Error('Use --issue NUMBER --screen KEY [--max-rounds 1..3] [--base BRANCH] [--publish] [--dry-run]');
const playwright=process.env.ASTRAL_PLAYWRIGHT;
const playwrightCli=process.env.ASTRAL_PLAYWRIGHT_CLI;
if(!playwright||!playwrightCli)throw Error('Set ASTRAL_PLAYWRIGHT (test.js) and ASTRAL_PLAYWRIGHT_CLI (cli.js). Optionally set ASTRAL_CHROME.');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const runDir=path.join(root,'.factory',`issue-${issue}-${stamp}`);
const work=path.join(runDir,'work');
const branch=`claude/ui-${screen.key}-${stamp}`;
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
  if(await git(['rev-parse','HEAD'])!==expectedHead)throw Error('Agent unexpectedly committed changes.');
}
let startingHead,expectedHead,pr;
const evidenceDir=`docs/visual-verification/${screen.key}/${stamp}`;
async function publishRound(beforeImages=[],afterImages=[]){
  if(!publish)return null;
  await git(['fetch','origin','master']);
  if(await git(['rev-parse','FETCH_HEAD'])!==startingHead)throw Error('Remote master changed; revalidate against the new base.');
  if(!pr&&!(await git(['status','--porcelain'])))return null;
  for(const [side,images] of [['before',beforeImages],['after',afterImages]]){
    const dir=path.join(work,evidenceDir,side);
    await fs.mkdir(dir,{recursive:true});
    for(const file of images)await fs.copyFile(file,path.join(dir,path.basename(file)));
  }
  await git(['add','--all']);
  const total=(await git(['diff','--cached','--numstat',startingHead])).split('\n').reduce((n,line)=>{
    const [added,removed]=line.split('\t');return n+(Number(added)||0)+(Number(removed)||0);
  },0);
  if(total>300)throw Error(`This implementation changes ${total} lines; split the Issue before publishing.`);
  if(await git(['diff','--cached','--name-only'])){
    await git(['commit','-m',`Improve ${screen.key} graphics for #${issue}`]);
    expectedHead=await git(['rev-parse','HEAD']);
    await git(['push','-u','origin',branch]);
  }
  if(!pr){
    const body=path.join(runDir,'pr.md');
    await fs.writeFile(body,`Closes #${issue}

変更前後の実キャプチャは \`${evidenceDir}\` に保存します。検証とレビューは各ラウンドのPRコメントを参照してください。
`);
    pr=(await run('gh',['pr','create','--repo',repo,'--draft','--base','master','--head',branch,'--title',`[UI] ${screen.title} #${issue}`,'--body-file',body],{cwd:work})).stdout.trim();
    console.log(pr);
  }
  return expectedHead;
}
async function confirmRemoteHead(sha,waitForCheck=false){
  for(let retry=0;retry<120;retry++){
    const remote=JSON.parse((await run('gh',['pr','view',pr,'--repo',repo,'--json','headRefOid,statusCheckRollup'],{cwd:work})).stdout);
    if(remote.headRefOid!==sha)throw Error('PR head changed during review; the result was not posted.');
    if(!waitForCheck)return;
    const check=remote.statusCheckRollup.find(c=>c.workflowName==='PR check'&&c.name==='check');
    if(check?.status==='COMPLETED'){
      if(check.conclusion==='SUCCESS')return;
      throw Error(`PR check concluded ${check.conclusion}; review was not started.`);
    }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
  throw Error('PR check has not completed after 10 minutes.');
}
async function postReview(review,sha,round){
  if(!sha)return;
  await confirmRemoteHead(sha);
  const body=path.join(runDir,`round-${round}-pr-comment.md`);
  const url=`https://github.com/${repo}/tree/${sha}/${evidenceDir}`;
  await fs.writeFile(body,reviewComment(review,sha,url));
  await run('gh',['pr','comment',pr,'--repo',repo,'--body-file',body],{cwd:work});
}
await fs.mkdir(runDir,{recursive:true});
const lockPath=path.join(root,'.factory','loop.lock');
let lock;
try{
  lock=await fs.open(lockPath,'wx');await lock.writeFile(JSON.stringify({pid:process.pid,runDir,issue}));
  console.log(`Run folder: ${runDir}`);
  const task=JSON.parse((await run('gh',['issue','view',String(issue),'--repo',repo,'--json','number,title,body,state,url'])).stdout);
  if(task.state!=='OPEN'||!task.body.includes(`docs/design-references/${screen.key}.png`))throw Error('Issue must be open and reference the selected screen image.');
  await fs.writeFile(path.join(runDir,'issue.json'),JSON.stringify(task,null,2));
  if(publish)await git(['fetch','origin','master'],root);
  startingHead=await git(['rev-parse',`${publish?'FETCH_HEAD':base}^{commit}`],root);
  expectedHead=startingHead;
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
    const captures=[screen.capture,...screen.extraCaptures||[]].flatMap(c=>['desktop','laptop','mobile','narrow','short'].map(size=>path.join(work,'artifacts',`royal-${c}-${size}.png`)));
    process.env.ASTRAL_CAPTURE_SHORT='1';
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
      const patch=(await run('git',['diff','--binary','--no-color',previous.startingHead,'--',':(exclude)docs/visual-verification'],{cwd:previousWork})).stdout;
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
      if(failed){await publishRound();continue;}
      for(const capture of captures)await fs.access(capture);
      const roundImages=path.join(runDir,`round-${round}-images`);await fs.mkdir(roundImages);
      for(const capture of captures)await fs.copyFile(capture,path.join(roundImages,path.basename(capture)));
      const beforeImages=captures.map(f=>path.join(before,path.basename(f)));
      const sha=await publishRound(beforeImages,captures);
      if(publish&&!sha)throw Error('No implementation changes to review.');
      if(sha)await confirmRemoteHead(sha,true);
      const snapshot=await statusHash();
      console.log(`Round ${round}: Codex visual review`);
      const output=path.join(runDir,`round-${round}-review.json`);
      const reviewPrompt=`ASTRAL CROWN の独立レビュー担当。コードは変更禁止。Issue: ${task.title}\n${task.body}\n重点: ${screen.focus}\n添付1枚目は参考画像、残りはこのラウンドの実画面PC/スマホです。必ず目視比較する。単体・ビルド・4サイズのブラウザ回帰と375×667の追加キャプチャは親が成功を確認済み。テスト成功だけを根拠に見た目を合格にしない。git diff を読んで操作と保存互換性も確認。図や文字の重なり、引き伸ばし、クリック妨害、可読性、構図と絵の密度を具体的に判定。大きな不足があればrevise、画像を確認できない/素材生成や仕様判断が必要ならblocked。passは受入条件を実際に確認できた場合のみ。コード修正、コミット、外部通信、他エージェントは禁止。結果は指定JSON形式の日本語。`;
      const imageArgs=[reference,...captures,...beforeImages].flatMap(f=>['--image',f]);
      const diff=await git(['diff',startingHead,'--no-ext-diff','--no-color','--',':(exclude)docs/visual-verification']);
      const changed=(await git(['diff','--name-only',startingHead])).split('\n').filter(f=>/\.(js|css|html)$/.test(f));
      const source=await Promise.all(changed.map(async f=>`\n--- ${f} (current) ---\n${await fs.readFile(path.join(work,f),'utf8')}`));
      const reviewInput=reviewPrompt+`\n重要: ツール・シェルは使わず、以下の親プロセスが収集した差分・コード・検証結果と添付画像だけで判定してください。git diffを自分で実行する必要はありません。未確認の操作を確認したと主張しないこと。\n添付順: 参考画像1枚、変更後${captures.length}枚、同条件の変更前${beforeImages.length}枚。各グループはdesktop/laptop/mobile/narrow/short（375×667）順。\n基点コミット: ${startingHead}\nレビュー対象SHA: ${sha??"ローカル作業コピー"}\n差分ハッシュ: ${snapshot}\n検証: node --test、build、Playwrightがこの差分で終了コード0。親がQA・テスト・保存経済モデルの無変更を検証。\n実装担当報告:\n${claudeResult.result||''}\n差分:\n${diff}\n現在の変更ファイル全文:\n${source.join('\n')}`;
      await run('codex',['exec','--sandbox','read-only','--ephemeral','--output-schema',schema,'--output-last-message',output,...imageArgs,'-'],{cwd:work,input:reviewInput,log:path.join(runDir,`round-${round}-codex.log`)});
      if(snapshot!==await statusHash())throw Error('Reviewer changed the work copy.');
      const review=reviewDecision(JSON.parse(await fs.readFile(output,'utf8')));
      history.push({round,sha,worktreeHash:snapshot,...review});feedback=JSON.stringify(review);
      await fs.writeFile(path.join(runDir,'history.json'),JSON.stringify(history,null,2));
      await postReview(review,sha,round);
      if(review.verdict==='pass'||review.verdict==='blocked'){outcome=review.verdict;break;}
    }
    await validateScope();
    await fs.writeFile(path.join(runDir,'result.json'),JSON.stringify({issue,screen:screen.key,base,startingHead,branch,outcome,history},null,2));
    if(publish&&['blocked','round-limit'].includes(outcome))await run('gh',['issue','edit',String(issue),'--repo',repo,'--add-label','社長判断'],{cwd:work});
    console.log(`Finished: ${outcome}. Evidence: ${runDir}`);
    if(outcome!=='pass')process.exitCode=2;
  }
}catch(error){console.error(error.message);await fs.writeFile(path.join(runDir,'error.json'),JSON.stringify({issue,outcome:'error',message:error.message},null,2));process.exitCode=1;}
finally{if(lock){await lock.close();await fs.unlink(lockPath);}}
