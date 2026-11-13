import runtime from './runtime.cjs';
export default runtime.defineConfig({
  testDir:'.', testMatch:'*.spec.js', timeout:45000, workers:1,
  outputDir:'../artifacts/royal-qa', reporter:[['list']],
  use:{headless:true, reducedMotion:'reduce', screenshot:'only-on-failure',
    launchOptions:process.env.ASTRAL_CHROME ? {executablePath:process.env.ASTRAL_CHROME,args:['--renderer-process-limit=2','--mute-audio']} : {}},
  projects:[
    {name:'desktop',use:{viewport:{width:1440,height:900}}},
    {name:'laptop',use:{viewport:{width:1280,height:720}}},
    {name:'mobile',use:{viewport:{width:390,height:844}}},
    {name:'narrow',use:{viewport:{width:320,height:740}}}
  ]
});
