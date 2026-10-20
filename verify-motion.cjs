/* Regression gate: all public pages, three engines/profiles, controls and failure-safe motion. */
const {chromium,webkit,devices}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {execFileSync}=require('node:child_process');
const pages='index studio creator storybooks animation sound cinematic snap design apparel architecture space artworks sns-management price-list'.split(' ');
const baseline='f2935becae76e04121d767a2edee8a392e2ed215';
const base=process.env.MOTION_BASE_URL||'http://127.0.0.1:8765/';
const out='motion-qa',results=[],failures=[],gaps=[],embedWarnings=[];
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
const oldCache=new Map();
const server=http.createServer((req,res)=>{
 let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';
 const before=name.startsWith('_before/');if(before)name=name.slice(8);
 const file=path.resolve(name);
 if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');
 if(before&&/\.(html|css|js|json)$/.test(name)){
  if(!oldCache.has(name))oldCache.set(name,execFileSync('git',['show',`${baseline}:${name}`]));
  res.end(oldCache.get(name));
 }else fs.createReadStream(file).pipe(res);
});
async function shot(page,name){await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:85});}
async function gap(page){return page.evaluate(()=>{const a=document.querySelector('.brand-visual').getBoundingClientRect(),b=document.querySelector('#base-products-title').getBoundingClientRect();return {gap:b.top-a.bottom,width:a.width,height:a.height,viewport:innerWidth};});}
async function catalog(page){
 await page.waitForFunction(()=>document.querySelectorAll('.base-product').length===6);
 return page.locator('.base-product').evaluateAll(nodes=>nodes.map(n=>({url:n.querySelector('a').href,name:n.querySelector('h3').textContent,price:n.querySelector('.base-product-price').textContent,image:n.querySelector('img')?.src})));
}
async function check(browser,profile,label){
 const context=await browser.newContext(profile);
 await context.route('**/*',r=>/googletagmanager|google-analytics/.test(r.request().url())?r.abort():r.continue());
 const page=await context.newPage();page.setDefaultTimeout(12000);
 await page.addInitScript(()=>{window.__qaMotionCounts=new Map();const animate=Element.prototype.animate;Element.prototype.animate=function(...args){if(this.hasAttribute('data-ql-motion')&&Array.isArray(args[0])&&args[0].some(frame=>Object.hasOwn(frame,'opacity')))window.__qaMotionCounts.set(this,(window.__qaMotionCounts.get(this)||0)+1);return animate.apply(this,args);};window.__qaErrors=[];addEventListener('error',e=>window.__qaErrors.push({message:e.message,source:e.filename}));addEventListener('unhandledrejection',e=>window.__qaErrors.push({message:String(e.reason)}));});
 for(const name of pages){
  const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
  try{
   await page.goto(base+name+'.html',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('body.ql-ready');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(2000);
   const initial=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,title:document.querySelector('main h1')?.textContent.trim(),targets:document.querySelectorAll('[data-ql-motion]').length,seen:document.querySelectorAll('.ql-seen').length,banned:document.querySelectorAll('.xm-sheen,.xen-portrait-sheen,.studio-fusion-sheen,.mvv-outline-sweep').length,hidden:[...document.querySelectorAll('main h1,main h2')].filter(n=>!n.closest('[hidden],dialog')&&getComputedStyle(n).opacity==='0').length}));
   assert(initial.overflow<=2,`horizontal overflow ${initial.overflow}`);assert(initial.title);assert(initial.targets>0);assert(initial.seen>0);assert.equal(initial.banned,0);assert.equal(initial.hidden,0);
   await shot(page,`${label}-${name}-top`);
   await page.locator('.xen-header-toggle').click();await page.locator('.xen-header-toggle[aria-expanded="true"]').waitFor();await page.keyboard.press('Escape');await page.locator('.xen-header-toggle[aria-expanded="false"]').waitFor();
   if(name==='index'){
    const orbit=page.locator('svg.orbit');const a=await orbit.evaluate(n=>getComputedStyle(n).transform);await page.waitForTimeout(180);const b=await orbit.evaluate(n=>getComputedStyle(n).transform);assert.notEqual(a,b,'source category orbit stopped');
    const first=page.locator('.orbit a').first();await first.focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');await page.waitForTimeout(450);assert(await first.evaluate(n=>getComputedStyle(n.querySelector('text')).fill!=='rgb(238, 238, 238)'));await page.locator('.xen-header-home').focus();
   }
   if(name==='studio'){
    await page.locator('.mvv-pyramid').scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector('#studio-mvv').dataset.mvvState==='complete');
    const ratio=await page.locator('.mvv-pyramid').evaluate(n=>n.offsetHeight/n.offsetWidth);assert(Math.abs(ratio-Math.sqrt(3)/2)<.006);
    for(const key of ['mission','vision','values']){const b=page.locator(`[data-mvv-select="${key}"]`);await b.click();await page.waitForTimeout(350);assert.equal(await b.getAttribute('aria-expanded'),'true');assert(await page.locator(`#${key}`).isVisible());await b.click();assert.equal(await b.getAttribute('aria-expanded'),'false');}
    await shot(page,`${label}-studio-mvv`);
    const t=page.locator('.contact-toggle').first();await t.click();assert.equal(await t.getAttribute('aria-expanded'),'true');await t.click();
   }
   if(name==='creator'){const d=page.locator('.cp-field-entry').first();await d.locator('summary').click();await page.waitForTimeout(350);assert(await d.evaluate(n=>n.open));await d.locator('summary').click();}
   if(name==='price-list'){const t=page.locator('.price-toggle').first();await t.click();assert.equal(await t.getAttribute('aria-expanded'),'true');await t.click();}
   if(name==='apparel'){
    const cards=await catalog(page);const expected=JSON.parse(fs.readFileSync('base-products.json')).items;
    assert.deepEqual(cards.map(c=>c.url),expected.map(i=>i.url));assert.deepEqual(cards.map(c=>c.name),expected.map(i=>i.name));assert.deepEqual(cards.map(c=>Number(c.price.replace(/[^0-9]/g,''))),expected.map(i=>Number(i.price))); assert.deepEqual(cards.map(c=>c.image),expected.map(i=>i.image_url));
    const layout=await page.locator('.base-products-grid').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length);assert.equal(layout,3);
    await page.locator('#base-products-title').scrollIntoViewIfNeeded();await page.waitForTimeout(1500);const after=await gap(page);assert(after.gap>=23&&after.gap<=37,`apparel gap ${after.gap}`);
    await page.evaluate(()=>scrollTo({top:scrollY+document.querySelector('#base-products-title').getBoundingClientRect().top-250,behavior:'instant'}));await page.waitForTimeout(400);await shot(page,`${label}-apparel-after`);
    if(!process.env.MOTION_BASE_URL){const before=await context.newPage();await before.goto(base+'_before/apparel.html',{waitUntil:'domcontentloaded'});await before.locator('#base-products-title').scrollIntoViewIfNeeded();await before.waitForTimeout(1800);const previous=await gap(before);assert(Math.abs(after.width-previous.width)<1&&Math.abs(after.height-previous.height)<1,'brand visual dimensions changed');await before.evaluate(()=>scrollTo({top:scrollY+document.querySelector('#base-products-title').getBoundingClientRect().top-250,behavior:'instant'}));await before.waitForTimeout(400);await shot(before,`${label}-apparel-before`);gaps.push({profile:label,before:previous,after});await before.close();}else gaps.push({profile:label,after});
   }
   if(['snap','artworks','architecture','design','space','apparel'].includes(name)){
    const item=page.locator('main .gallery-item').first();if(await item.count()){await item.click();await page.locator('#image-viewer[open]').waitFor();await page.keyboard.press('Escape');await page.locator('#image-viewer').waitFor({state:'hidden'});}
   }
   // Exercise first, middle and last sections; default visibility also protects skipped rows.
   for(const part of [.35,.7,1]){await page.evaluate(p=>scrollTo({top:(document.documentElement.scrollHeight-innerHeight)*p,behavior:'instant'}),part);await page.waitForTimeout(1550);assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));}
   assert(await page.locator('footer').isVisible());await shot(page,`${label}-${name}-bottom`);
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.waitForTimeout(400);
   const replay=await page.evaluate(()=>[...window.__qaMotionCounts.values()].filter(count=>count>1).length);assert.equal(replay,0,'entry replayed on return');
   await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
   const moving=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length);assert.equal(moving,0,'reduced motion still running');
   assert.deepEqual(await page.evaluate(()=>window.__qaErrors),[],'top-level site error');const external=errors.filter(e=>/^Minified React error #418;/.test(e));embedWarnings.push(...external.map(message=>({profile:label,page:name,message})));assert.deepEqual(errors.filter(e=>!external.includes(e)),[]);results.push({profile:label,page:name,...initial,controls:true,reduced:true,pass:true});console.log('PASS',label,name);
  }catch(e){failures.push({profile:label,page:name,error:e.stack});console.error('FAIL',label,name,e.message);await shot(page,`FAIL-${label}-${name}`).catch(()=>{});}
  finally{page.off('pageerror',onError);await page.emulateMedia({reducedMotion:'no-preference'});}
 }
 await context.close();
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 if(!process.env.MOTION_BASE_URL){try{execFileSync('git',['cat-file','-e',baseline]);}catch{execFileSync('git',['fetch','--depth=1','origin',baseline]);}await new Promise(r=>server.listen(8765,'127.0.0.1',r));}
 for(const [engine,profile,label]of [[chromium,{viewport:{width:1440,height:900}},'chrome-pc'],[webkit,{viewport:{width:1440,height:900}},'webkit-pc'],[webkit,{...devices['iPhone 14 Pro Max']},'webkit-iphone']]){
  const browser=await engine.launch();try{await check(browser,profile,label);}finally{await browser.close();}
 }
 const browser=await chromium.launch();
 const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const page=await context.newPage();
 for(const name of pages){try{await page.goto(base+name+'.html',{waitUntil:'domcontentloaded'});assert(await page.locator('main h1').isVisible());assert.equal(await page.locator('main h1').evaluate(n=>getComputedStyle(n).opacity),'1');if(name==='apparel')assert(await page.locator('.base-products-store').isVisible());results.push({profile:'no-js',page:name,pass:true});}catch(e){failures.push({profile:'no-js',page:name,error:e.message});}}
 await browser.close();server.close();
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({base,baseline,results,gaps,failures,embedWarnings},null,2));
 if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## Quiet luxury verification\n${results.length}/60 page/profile checks passed.\n\n${gaps.map(g=>`- ${g.profile}: gap ${g.before?.gap??'—'} → ${g.after.gap}px`).join('\n')}\n\n${failures.map(f=>`- ${f.profile}/${f.page}: ${f.error}`).join('\n')}\n`);
 if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
