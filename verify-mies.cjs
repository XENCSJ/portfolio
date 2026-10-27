const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.MIES_BASE_URL||'http://127.0.0.1:8765/';
const directory=process.env.MIES_EVIDENCE||'mies-evidence';
fs.mkdirSync(directory,{recursive:true});
let checks=0;const results=[];const ok=(v,m)=>{assert(v,m);checks++};
const sections=['profile','about','creative-origin','background','philosophy','creative-fields','latest-videos','youtube-channels','personal','concept-project','discover-xen','creation-support'];
const copy='幼い頃から絵を描くことが好きで、将来は画家になることを夢見ていた。将来の進路を考えるなかで、画家として生計を立てることの難しさを意識し、同じ芸術分野である建築に目を向けた。当時、インテリアを見ることが好きだった。なかでも強く惹かれたのが、バルセロナチェアのデザイン。その作者を調べたことで、ドイツの建築家ミース・ファン・デル・ローエを知った。一脚の椅子との出会いが、建築への興味を深めるきっかけとなった。';
const frame=page=>page.locator('dialog[open]').evaluate(e=>{const c=getComputedStyle(e);return {width:e.getBoundingClientRect().width,border:c.borderTopColor,background:c.backgroundColor,bar:e.querySelector('.xd-work-bar').getBoundingClientRect().height}});
async function imageReady(locator){await locator.evaluate(async image=>{image.loading='eager';await image.decode();});}
(async()=>{
 for(const [engine,width] of [[chromium,320],[chromium,375],[chromium,390],[chromium,430],[chromium,768],[chromium,1024],[chromium,1440],[webkit,390],[webkit,1440]]){
  const browser=await engine.launch();
  for(const motion of ['reduce','no-preference']){
   const label=`${engine.name()}-${width}-${motion}`;
   const context=await browser.newContext({viewport:{width,height:width<768?844:960},isMobile:width<768,hasTouch:width<768,reducedMotion:motion});
   const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(/google-analytics|googletagmanager/,r=>r.abort());
   try {
   await page.goto(base+'what-is-xen.html#future',{waitUntil:'domcontentloaded'});
   await page.locator('.xd-theme-dialog[open]').waitFor();await page.waitForTimeout(350);
   const expected=await frame(page);
   const links=await page.locator('[data-panel="future"] .xd-sign-main').evaluateAll(es=>es.map(e=>e.getAttribute('href')));
   ok(links.join()==='./studio.html#studio-philosophy,./studio.html#vision,./studio.html#mission,./creator.html#breathing-architecture','FUTURE links: '+label);
   await page.locator('[data-sign="future-4"] a').click();
   await page.waitForURL('**/creator.html#breathing-architecture');
   await page.waitForFunction(()=>document.querySelector('.cp-project-archive').open);
   await page.waitForTimeout(300);
   const target=await page.locator('#breathing-architecture').evaluate(e=>({top:e.getBoundingClientRect().top,bar:document.querySelector('#xen-site-header').getBoundingClientRect().bottom}));
   ok(target.top>=target.bar&&target.top<target.bar+80,'breathing architecture below header: '+label+' '+JSON.stringify(target));
   await page.goto(base+'creator.html#creative-origin',{waitUntil:'domcontentloaded'});
   await page.locator('.mies-person-link').scrollIntoViewIfNeeded();await page.waitForTimeout(400);
   ok(await page.locator('#creative-origin .cp-copy p').textContent()===copy,'origin text unchanged');
   const order=await page.locator(sections.map(x=>'#'+x).join(',')).evaluateAll(es=>es.map(e=>e.id));ok(order.join()===sections.join(),'12 sections unchanged');
   const origin=await page.locator('.cp-origin-image img').evaluate(i=>({width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,fit:getComputedStyle(i).objectFit,position:getComputedStyle(i).objectPosition}));
   ok(Math.abs(origin.width/origin.height-1.5)<.005&&origin.fit==='cover'&&origin.position==='50% 50%','origin uses centered 3:2 cover');
   ok(await page.locator('#mies-origin-title').count()===0,'duplicate origin removed');
   const y=await page.evaluate(()=>scrollY);
   await page.locator('.mies-person-link').click();await page.waitForTimeout(350);
   ok(await page.locator('#mies-detail').evaluate(e=>e.open),'modal opens');
   const actual=await frame(page);
   ok(actual.width===expected.width&&actual.border===expected.border&&actual.background===expected.background,'FUTURE modal frame shared');
   ok(await page.evaluate(()=>document.activeElement.matches('.mies-close')),'initial focus close');
   ok(await page.evaluate(()=>getComputedStyle(document.body).position==='fixed'),'background fixed');
   ok(await page.locator('#mies-detail').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'dialog no horizontal overflow');
   ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page no horizontal overflow');
   const before=await page.locator('#creative-origin').boundingBox();
   await page.locator('.mies-scroll').evaluate(e=>e.scrollTop=300);
   const after=await page.locator('#creative-origin').boundingBox();ok(Math.abs(before.y-after.y)<1,'internal scroll keeps background stationary');
   ok(await page.locator('.mies-close').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<innerHeight;}),'close control stays visible');
   await page.locator('.mies-scroll').evaluate(e=>e.scrollTop=0);
   for(const im of await page.locator('#mies-detail img').all())await imageReady(im);
   if([390,1440].includes(width)&&motion==='no-preference')await page.screenshot({path:`${directory}/${label}-profile.png`});
   await page.locator('.mies-artwork img').scrollIntoViewIfNeeded();
   const sketch=await page.locator('.mies-artwork img').evaluate(i=>{const c=getComputedStyle(i);return {src:i.getAttribute('src'),loaded:i.naturalWidth,width:i.width,height:i.height,fit:c.objectFit}});
   ok(sketch.src==='./xen-artwork-20261023-03.jpg'&&sketch.loaded===1254&&Math.abs(sketch.width/sketch.height-1)<.01&&sketch.fit==='contain','exact uncropped sketch');
   if([390,1440].includes(width)&&motion==='no-preference')await page.screenshot({path:`${directory}/${label}-sketch.png`});
   await page.locator('.mies-close').focus();
   for(let i=0;i<12;i++){await page.keyboard.press('Tab');ok(await page.evaluate(()=>!!document.activeElement.closest('#mies-detail')||document.activeElement===document.body),'focus stays in dialog');}
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#mies-detail').open);
   ok(await page.evaluate(()=>document.activeElement.matches('.mies-person-link')),'focus restored');
   ok(Math.abs(await page.evaluate(()=>scrollY)-y)<2,'scroll position restored');
   await page.locator('.mies-person-link').press('Enter');await page.locator('#mies-detail[open]').waitFor();await page.waitForTimeout(350);
   await page.locator('.mies-close').click();await page.waitForFunction(()=>!document.querySelector('#mies-detail').open);ok(true,'button closes');
   await page.locator('.mies-person-link').click();await page.waitForTimeout(350);
   await page.locator('.mies-artwork-link').click();await page.waitForURL('**/artworks.html#artwork-20261023-03');
   await page.waitForLoadState('load');await page.waitForTimeout(250);
   const artwork=await page.locator('#artwork-20261023-03').evaluate(e=>({top:e.getBoundingClientRect().top,bottom:e.getBoundingClientRect().bottom,viewport:innerHeight,atEnd:scrollY+innerHeight>=document.documentElement.scrollHeight-2,header:document.querySelector('#xen-site-header').getBoundingClientRect().bottom}));
   ok(artwork.top>=artwork.header-1&&(artwork.top<artwork.header+80||(artwork.atEnd&&artwork.bottom<=artwork.viewport+1)),'ARTWORKS exact anchor after shuffle '+JSON.stringify(artwork));
   await page.locator('#artwork-20261023-03').click();await page.locator('#image-viewer[open]').waitFor();await imageReady(page.locator('#image-viewer img'));ok(await page.locator('#image-viewer img').getAttribute('src').then(s=>s.endsWith('/xen-artwork-20261023-03.jpg')),'gallery original viewer preserved');
   ok(errors.length===0,'no JavaScript errors '+errors.join());
   results.push({engine:engine.name(),width,motion,status:'passed'});console.log('PASS',label,checks);
   } catch(error) {
    results.push({engine:engine.name(),width,motion,status:'failed',error:error.stack});
    console.error('FAIL',label,error.message);
    await page.screenshot({path:`${directory}/${label}-failure.png`}).catch(()=>{});
   } finally {await context.close();}
  }
  await browser.close();
 }
 fs.writeFileSync(`${directory}/results.json`,JSON.stringify({base,checks,results},null,2));const failed=results.filter(r=>r.status==='failed');console.log(failed.length?'FAILED':'ALL PASSED',checks,'checks;',failed.length,'cases failed');if(failed.length)process.exitCode=1;
})().catch(e=>{fs.writeFileSync(`${directory}/results.json`,JSON.stringify({base,checks,results,error:e.stack},null,2));console.error(e);process.exit(1)});
