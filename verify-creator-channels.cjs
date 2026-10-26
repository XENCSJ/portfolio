const {chromium,webkit,devices}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const out='creator-channels-qa';fs.mkdirSync(out,{recursive:true});
const base=process.env.CREATOR_PUBLIC_URL||'http://127.0.0.1:8792/';
const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const f=path.resolve('.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(process.cwd()+path.sep)||!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);});
const cases=[],names=['main','amber','purple','blue'],handles=['CSJ','AMT','PAW','BLU'];
async function settled(page){await page.locator('#youtube-channels').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});await page.waitForTimeout(50);}
async function run(browser,profile,label){
 const context=await browser.newContext(profile),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await context.route(/googletagmanager|google-analytics/,r=>r.abort());
 try {
  await page.goto(base+'creator.html',{waitUntil:'domcontentloaded'});
  const root=page.locator('#youtube-channels'),entries=root.locator('details'),summaries=root.locator('summary');
  await root.scrollIntoViewIfNeeded();await page.waitForTimeout(800);
  assert.equal(await entries.count(),4);
  assert.equal(await root.locator('details[open]').count(),0);
  assert.deepEqual(await root.locator('.xc-link').evaluateAll(es=>es.map(e=>e.href)),handles.map(h=>'https://www.youtube.com/@XEN_'+h));
  assert.equal(await root.locator('iframe,video').count(),0);
  assert.deepEqual(await root.locator('.xc-number').allTextContents(),['01','02','03','04']);
  assert.deepEqual(await root.locator('.xc-name').allTextContents(),['XEN','XEN | AMBER TALES','XEN | PURPLE AWAKE','XEN | BLUE SLEEP']);
  assert(!(await root.innerText()).includes('ゼン | XEN'));
  assert.equal(await root.locator('.xc-link').evaluateAll(es=>es.every(e=>e.target==='_blank'&&e.relList.contains('noopener')&&e.relList.contains('noreferrer'))),true);
  assert.equal(await root.locator('.xc-logo-main').getAttribute('src'),'./XEN_logo_fixed_black.svg');
  assert.equal(await root.locator('.xc-logo-main').evaluate(e=>getComputedStyle(e).filter),'brightness(0) invert(1)');
  assert(await root.evaluate(e=>e.previousElementSibling.id==='latest-videos'));
  assert.equal(await page.locator('#latest-videos .xen-latest-grid > *').count(),4);
  assert(await page.locator('#creation-support').count());
  assert(await page.locator('#concept-project').innerText().then(t=>t.includes('XEN FREQUENCY LOUNGE')));
  for(const img of await root.locator('.xc-logo').all()) {
   await img.evaluate(i=>i.decode());
   const r=await img.boundingBox();assert.equal(Math.round(r.width),profile.viewport.width<=600?64:80);assert(Math.abs(r.width-r.height)<.5);
  }
  await root.screenshot({path:`${out}/${label}-closed.jpg`,type:'jpeg',quality:90});
  for(let i=0;i<4;i++){
   await summaries.nth(i).click();await settled(page);
   assert.equal(await root.locator('details[open]').count(),1,'single open');
   assert.equal(await summaries.nth(i).getAttribute('aria-expanded'),'true');
   const panel=page.locator('#channel-'+names[i]+'-panel');
   assert.equal(await panel.evaluate(e=>e.inert),false);
   if(i===0){
    assert.deepEqual(await panel.locator('.xc-description').allTextContents(),['企画、対話、映像、日常。','好奇心から生まれる体験や、日々の中で見つけた発見を、自分自身の視点で記録し、表現しています。','Vlogやトーク、映像作品を通して、XENの感性や価値観を届けるメインチャンネルです。']);
   }
   const img=panel.locator('.xc-banner');await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());
   assert.equal(await img.evaluate(i=>i.naturalWidth),1138);assert.equal(await img.evaluate(i=>getComputedStyle(i).objectFit),'contain');
   assert(await root.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'section overflow');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
   if(i===0||i===3)await root.screenshot({path:`${out}/${label}-${names[i]}.jpg`,type:'jpeg',quality:90});
  }
  await summaries.nth(3).click();await settled(page);assert.equal(await root.locator('details[open]').count(),0);
  await summaries.nth(0).focus();await page.keyboard.press('Enter');await settled(page);assert.equal(await summaries.nth(0).getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Space');await settled(page);assert.equal(await root.locator('details[open]').count(),0);
  assert(await summaries.nth(0).evaluate(e=>getComputedStyle(e).outlineStyle!=='none'),'focus indication');
  await summaries.nth(0).click();await settled(page);
  await summaries.nth(1).scrollIntoViewIfNeeded();await page.waitForTimeout(300);
  const y=await summaries.nth(1).evaluate(e=>e.getBoundingClientRect().top);
  await summaries.nth(1).click();await settled(page);
  const y2=await summaries.nth(1).evaluate(e=>e.getBoundingClientRect().top);
  assert(Math.abs(y-y2)<5,`switch scroll movement ${y2-y}`);
  await summaries.nth(1).click();await summaries.nth(3).click();await summaries.nth(3).click();await settled(page);
  assert.equal(await root.locator('details[open]').count(),0,'rapid reversal');
  assert.equal(errors.length,0,errors.join(';'));
  cases.push({label,status:'passed'});console.log('PASS',label);
 } catch(e){await page.screenshot({path:`${out}/${label}-failure.jpg`,fullPage:true});cases.push({label,status:'failed',error:String(e)});throw e;}
 finally{await context.close();}
}
(async()=>{
 await new Promise(r=>server.listen(8792,'127.0.0.1',r));
 try {
  for(const [name,engine]of [['chromium',chromium],['webkit',webkit]]){
   const browser=await engine.launch({headless:true});
   try{for(const width of [375,390,430,768,1024,1280,1440,1920])await run(browser,{viewport:{width,height:width<500?844:1000}},`${name}-${width}`);
    await run(browser,{...devices['iPhone 13'],defaultBrowserType:undefined},`${name}-iphone`);
    await run(browser,{viewport:{width:390,height:844},reducedMotion:'reduce'},`${name}-reduced`);
    const ctx=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});const p=await ctx.newPage();await p.goto(base+'creator.html');await p.locator('#channel-amber summary').click();assert(await p.locator('#channel-amber').getAttribute('open')!==null);await ctx.close();cases.push({label:name+'-no-js',status:'passed'});
   }finally{await browser.close();}
  }
 }finally{fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,cases},null,2));server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
