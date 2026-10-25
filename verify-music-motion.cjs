/* Shared entrance parity and failure-safe MUSIC motion; run in GitHub Actions. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const out='music-motion-qa';fs.mkdirSync(out,{recursive:true});
const results=[];
const hash=s=>createHash('sha256').update(s).digest('hex');
// Entire authored main at the start of this change: text, URLs, images and data.
const main=fs.readFileSync('sound.html','utf8').match(/<main[\s\S]*?<\/main>/)[0].replace(/ data-soft-reveal/g,'');
assert.equal(hash(main),'c2fe6889c4a6e5f9c3865eed178de5d1a65aa5eb67d4f25acf82e1b5f8a137ac');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 const file=path.resolve('.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
const monitor=()=>{
 window.motionRecords=[];
 const animate=Element.prototype.animate;
 if(animate)Element.prototype.animate=function(frames,options){
  if(this.matches('[data-ql-motion]'))window.motionRecords.push({node:this,frames,options});
  return animate.call(this,frames,options);
 };
};
async function settled(page){await page.waitForFunction(()=>document.getAnimations().every(a=>!a.effect?.target?.matches('[data-ql-motion]')||a.playState!=='running'),null,{timeout:10000});}
async function visible(page){
 const state=await page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth-innerWidth,
  hidden:[...document.querySelectorAll('main h1,.music-intro,.sound-release-card')].filter(e=>getComputedStyle(e).opacity!=='1'||getComputedStyle(e).visibility==='hidden').map(e=>e.id||e.className),
  nested:[...document.querySelectorAll('[data-ql-motion]')].filter(e=>e.parentElement.closest('[data-ql-motion]')).length
 }));
 assert(state.overflow<=1,JSON.stringify(state));assert.deepEqual(state.hidden,[]);assert.equal(state.nested,0);
}
async function sweep(page){
 await page.locator('main [data-ql-motion]').evaluateAll(async nodes=>{
  for(const n of nodes){if(!n.getClientRects().length)continue;n.scrollIntoView({block:'center',behavior:'instant'});await new Promise(requestAnimationFrame);await new Promise(requestAnimationFrame);}
 });
 await settled(page);
}
async function records(page){
 const records=await page.evaluate(()=>window.motionRecords.map(r=>({name:r.node.id||r.node.className,frames:r.frames,options:r.options,count:window.motionRecords.filter(x=>x.node===r.node).length})));
 assert(records.length>0,'No shared entrances observed');
 for(const r of records){
  assert.equal(r.count,1,'Repeated entrance: '+r.name);assert.equal(r.options.duration,700);
  assert.equal(r.options.delay%120,0);assert.equal(r.options.easing,'cubic-bezier(0.22, 1, 0.36, 1)');
  assert.deepEqual(r.frames,[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0px)'}]);
 }
 return records.length;
}
async function shot(page,name){await page.screenshot({path:`${out}/${name}.png`});}
async function run(browser,engine,width,height,base){
 const label=`${engine}-${width}`;
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<701,isMobile:width<701,reducedMotion:'no-preference'});
 await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(monitor);
 try{
  await page.goto(base+'/sound.html',{waitUntil:'load'});await page.locator('[data-music-navigation-ready]').waitFor();
  await settled(page);await visible(page);
  assert.equal(await page.locator('[data-soft-reveal][data-ql-motion]').count(),9);
  assert.equal(await page.locator('.sound-release-card[data-ql-motion]').count(),8);
  assert.equal(await page.locator('.sound-slide[data-ql-motion],.sound-cover-frame[data-ql-motion],.music-reader-dialog [data-ql-motion]').count(),0);
  if([1440,390].includes(width))await shot(page,label+'-top');
  // Existing carousel transforms and keyboard selection retain their own owner.
  const stage=page.locator('.sound-showcase-stage');await stage.focus();
  const first=await page.locator('.sound-slide[data-position="active"]').getAttribute('data-release-id');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(id=>document.querySelector('.sound-slide[data-position="active"]').dataset.releaseId!==id,first);
  assert.equal(await page.locator('.sound-slide').count(),8);
  await page.locator('.sound-category-drawer > summary').first().click();
  await page.locator('.music-index-link[href="#tochu-no-mamade"]').click();
  await page.waitForFunction(()=>document.activeElement?.id==='tochu-no-mamade');
  assert.equal(await page.locator('dialog[open]').count(),0);
  await page.locator('#tochu-no-mamade .music-reader-open').click();
  await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');
  await page.locator('dialog[open]').waitFor({state:'hidden'});
  await sweep(page);await visible(page);const entrances=await records(page);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await settled(page);
  assert.equal(await records(page),entrances,'Entrances replayed on upward scroll');
  if([1440,390].includes(width)){
   await page.locator('#void-to-form').scrollIntoViewIfNeeded();await settled(page);await shot(page,label+'-release');
  }
  // Preference changes must cancel ongoing entrances immediately.
  await page.emulateMedia({reducedMotion:'reduce'});await visible(page);
  assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.effect?.target?.matches('[data-ql-motion]')&&a.playState==='running').length),0);
  await page.emulateMedia({reducedMotion:'no-preference'});
  if([1440,390].includes(width)){
   // DESIGN and another existing lower page use the exact same frames and timing.
   for(const other of ['design','creator']){
    await page.goto(base+'/'+other+'.html',{waitUntil:'load'});await page.locator('body.ql-ready').waitFor();await settled(page);
    await records(page);await visible(page);if(other==='design')await shot(page,label+'-design');
   }
   await page.goto(base+'/sound.html#blue-sleep',{waitUntil:'load'});await settled(page);await visible(page);
   await page.goto(base+'/design.html',{waitUntil:'load'});await page.goBack({waitUntil:'load'});await settled(page);await visible(page);
   assert(page.url().endsWith('sound.html#blue-sleep'));
  }
  assert.deepEqual(errors,[]);results.push({label,pass:true,entrances});console.log('PASS',label,entrances,'single shared entrances');
 }catch(e){results.push({label,pass:false,error:e.stack});console.error('FAIL',label,e);await shot(page,label+'-failure').catch(()=>{});}
 finally{await context.close();}
}
async function fallback(browser,engine,kind,base){
 const label=engine+'-'+kind,context=await browser.newContext({viewport:{width:390,height:844},javaScriptEnabled:kind!=='no-js',reducedMotion:kind==='reduced'?'reduce':'no-preference'});
 await context.route('**/*',r=>!r.request().url().startsWith(base+'/')||(kind==='blocked-motion-script'&&r.request().url().includes('xen-immersive.js'))?r.abort():r.continue());
 const page=await context.newPage();
 if(kind==='no-observer')await page.addInitScript(()=>{delete window.IntersectionObserver;});
 if(kind==='no-web-animations')await page.addInitScript(()=>{Element.prototype.animate=undefined;});
 try{
  await page.goto(base+'/sound.html',{waitUntil:'load'});if(!['no-js','blocked-motion-script'].includes(kind)){await page.locator('body.ql-ready').waitFor();await settled(page);}
  await visible(page);
  await page.locator('#music-genre-1-toggle').click();assert(await page.locator('.music-index-link').first().isVisible());
  if(kind==='reduced')assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);
  results.push({label,pass:true});console.log('PASS',label);
 }catch(e){results.push({label,pass:false,error:e.stack});console.error('FAIL',label,e);}
 finally{await context.close();}
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=(process.env.MUSIC_BASE_URL||`http://127.0.0.1:${server.address().port}`).replace(/\/$/,'');
 if(process.env.MUSIC_WAIT_FOR_DEPLOY==='true'){
  let ready=false;
  for(let attempt=0;attempt<30;attempt++){
   try{for(const file of ['sound.html','xen-sound.css','xen-immersive.js']){const r=await fetch(base+'/'+file+'?motion-qa='+Date.now(),{signal:AbortSignal.timeout(20000)});assert(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(fs.readFileSync(file)),file);}ready=true;break;}
   catch(e){console.log('Waiting for publication:',e.message.split('\n')[0]);await new Promise(r=>setTimeout(r,10000));}
  }
  assert(ready,'Published source does not match this commit');
 }
 for(const [engine,type]of [['chromium',chromium],['webkit',webkit]]){
  const browser=await type.launch();
  try{
   for(const [w,h]of [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[375,667],[390,844],[430,932]])await run(browser,engine,w,h,base);
   for(const kind of ['reduced','no-js','no-observer','no-web-animations','blocked-motion-script'])await fallback(browser,engine,kind,base);
  }finally{await browser.close();}
 }
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({base,results},null,2));
 const pass=results.filter(x=>x.pass).length;
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## MUSIC shared motion\n${pass}/${results.length} checks passed.\n\n700 ms / 16 px / 120 ms stagger / cubic-bezier(0.22, 1, 0.36, 1).\n\nAuthored content and links unchanged; responsive controls, single entrance, reduced motion, history and missing JS/API checks included.\n`);
 if(pass!==results.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
