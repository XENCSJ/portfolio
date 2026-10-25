/* Header visibility regression, including missing PNG transport and page history. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const out='header-logo-qa';fs.mkdirSync(out,{recursive:true});
const results=[];
const html=fs.readFileSync('sound.html','utf8');
const embedded=html.match(/class="xen-header-logo" src="data:image\/png;base64,([^"]+)"/);
assert(embedded,'MUSIC header must not depend on a separate image request');
assert.deepEqual(Buffer.from(embedded[1],'base64'),fs.readFileSync('xen-header-logo.png'),'Use the unchanged official artwork');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const f=path.resolve('.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!f.startsWith(process.cwd()+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);
});
async function visible(page,label){
 const s=await page.locator('#xen-site-header').evaluate(h=>{
  const a=h.querySelector('.xen-header-home'),img=a.querySelector('.xen-header-logo');
  const r=img.getBoundingClientRect(),cart=h.querySelector('.xen-header-cart').getBoundingClientRect();
  return {loaded:img.complete&&img.naturalWidth===6731,logoHeight:r.height,logoWidth:r.width,top:h.getBoundingClientRect().top,height:h.getBoundingClientRect().height,
   overlap:r.right>cart.left,overflow:document.documentElement.scrollWidth>innerWidth+1,href:a.getAttribute('href'),
   states:[h,a,img].map(n=>{const c=getComputedStyle(n);return {opacity:c.opacity,visibility:c.visibility,display:c.display,transform:c.transform,animation:c.animationName};}),
   motion:h.querySelectorAll('[data-ql-motion]').length};
 });
 assert(s.loaded,label+' image');assert.equal(s.top,0,label+' fixed position');assert.equal(s.height,56,label+' bar size');
 assert.equal(s.logoHeight,15,label+' logo size');assert(Math.abs(s.logoWidth-6731/1520*15)<.1,label+' aspect ratio');
 assert(!s.overlap&&!s.overflow,label+' layout');assert.equal(s.href,'./index.html');assert.equal(s.motion,0);
 for(const c of s.states){assert.equal(c.opacity,'1',label);assert.equal(c.visibility,'visible',label);assert.notEqual(c.display,'none',label);assert.equal(c.transform,'none',label);assert.equal(c.animation,'none',label);}
}
async function run(browser,engine,width,height,base){
 const label=engine+'-'+width;
 const ctx=await browser.newContext({viewport:{width,height},isMobile:width<701,hasTouch:width<701});
 await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const page=await ctx.newPage();
 try{
  await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});await visible(page,'initial');
  await page.locator('[data-music-navigation-ready]').waitFor();
  await page.locator('.sound-showcase-stage').press('ArrowRight');await visible(page,'carousel');
  await page.locator('#music-genre-1-toggle').click();await visible(page,'genre open');
  await page.locator('.music-index-link[href="#hikari-no-arika"]').click();
  await page.waitForFunction(()=>document.activeElement?.id==='hikari-no-arika');await visible(page,'song navigation');
  await page.locator('#hikari-no-arika .music-reader-open').click();
  await page.locator('#music-reader[open]').waitFor();await page.keyboard.press('Escape');
  await page.locator('#music-reader[open]').waitFor({state:'hidden'});await visible(page,'reader closed');
  await page.locator('.xen-header-toggle').click();await page.locator('#xen-drawer[open]').waitFor();
  await page.keyboard.press('Escape');await page.locator('#xen-drawer[open]').waitFor({state:'hidden'});await visible(page,'menu closed');
  for(const y of [2000,6000,1000,0]){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await visible(page,'scroll '+y);}
  await page.reload({waitUntil:'domcontentloaded'});await visible(page,'reload');
  await Promise.all([page.waitForURL('**/index.html',{waitUntil:'domcontentloaded'}),page.locator('.xen-header-home').click()]);
  await page.waitForFunction(()=>document.querySelector('.xen-header-logo')?.naturalWidth>0);await visible(page,'INDEX link');
  await page.goBack({waitUntil:'domcontentloaded'});await visible(page,'history return');
  if([390,1440].includes(width)){
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
   await page.waitForFunction(()=>document.getAnimations().every(a=>!a.effect?.target?.matches('[data-ql-motion]')||a.playState!=='running'));
   await page.screenshot({path:`${out}/${label}-music.png`});
  }
  results.push({label,pass:true});console.log('PASS header',label);
 }catch(e){results.push({label,pass:false,url:page.url(),error:e.stack});console.error('FAIL header',label,page.url(),e);await page.screenshot({path:`${out}/${label}-failure.png`}).catch(()=>{});}
 finally{await ctx.close();}
}
async function resilience(browser,engine,base){
 for(const kind of ['blocked-logo-request','no-js','reduced']){
  const label=engine+'-'+kind,ctx=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:kind!=='no-js',reducedMotion:kind==='reduced'?'reduce':'no-preference'});
  await ctx.route('**/*',r=>!r.request().url().startsWith(base+'/')||r.request().url().includes('xen-header-logo.png')?r.abort():r.continue());
  const page=await ctx.newPage();
  try{await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});await visible(page,label);await page.evaluate(()=>scrollTo(0,1500));await visible(page,label+' scroll');results.push({label,pass:true});console.log('PASS header',label);}
  catch(e){results.push({label,pass:false,error:e.stack});console.error('FAIL header',label,e);}
  finally{await ctx.close();}
 }
 const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage();
 await ctx.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const pages=['index','studio','creator','design','apparel','architecture','space','artworks','storybooks','animation','cinematic','snap','price-list','sns-management'];
 for(const slug of pages){
  const label=engine+'-shared-'+slug;
  try{await page.goto(base+'/'+slug+'.html',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('.xen-header-logo')?.naturalWidth>0);await visible(page,label);await page.evaluate(()=>scrollTo(0,1200));await visible(page,label+' scroll');results.push({label,pass:true});console.log('PASS header',label);}
  catch(e){results.push({label,pass:false,error:e.stack});console.error('FAIL header',label,e);}
 }
 await ctx.close();
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=(process.env.MUSIC_BASE_URL||`http://127.0.0.1:${server.address().port}`).replace(/\/$/,'');
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{for(const [w,h]of [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[375,667],[390,844],[430,932]])await run(browser,engine,w,h,base);await resilience(browser,engine,base);}
  finally{await browser.close();}
 }
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({base,results},null,2));
 const passed=results.filter(r=>r.pass).length;
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n## Static XEN header\n${passed}/${results.length} checks passed: Chromium/WebKit, eight widths, initial rendering, scroll, carousel, genre navigation, reader/menu close, reload, INDEX/history, image request failure, no JS, reduced motion and 14 other pages.\n`);
 if(passed!==results.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
