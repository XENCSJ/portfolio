/* Run: node verify-discovery-random.cjs. Exercises the production script in a DOM fixture. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('xen-discovery-gallery.js','utf8');
const html=fs.readFileSync('what-is-xen.html','utf8');
const catalog=JSON.parse(fs.readFileSync('xen-discovery-gallery.json','utf8'));
const staticIds=[...html.matchAll(/class="xd-tile"[^>]*data-work="([^"]+)"/g)].map(m=>m[1]);
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
class Node {
 constructor(){this.dataset={};this.attributes={};this.style={removeProperty(){}};this.events={};this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]||null;}removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,f){this.events[k]=f;}removeEventListener(){}replaceChildren(...nodes){this.children=nodes;}remove(){this.removed=true;}
 querySelector(){return this.children[0]||new Node();}getClientRects(){return[{}];}dispatchEvent(){}contains(){return false;}
}
const store=()=>({data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);}});
const key='xen:discovery-gallery:last-visit:v1';
async function boot(local=store(),session=store(),data=catalog){
 const tiles=staticIds.map(id=>{const n=new Node(),w=catalog.works.find(w=>w.id===id),img=new Node();n.dataset.work=id;n.attributes.href=w.href;img.attributes.src=w.image;n.children=[img];return n;});
 const grid=new Node();grid.querySelectorAll=()=>tiles.filter(n=>!n.removed);
 const gallery=new Node(),status=new Node(),dialog=new Node();dialog.showModal=()=>{};
 gallery.querySelector=s=>s==='.xd-mosaic'?grid:status;
 const events={},context={URL,console,Math,JSON,Set,Map,Promise,Image:Node,CustomEvent:class{},setTimeout:()=>1,clearTimeout(){},
  matchMedia:()=>({matches:true,addEventListener(){}}),IntersectionObserver:class{observe(){}},
  addEventListener:(name,fn)=>events[name]=fn,localStorage:local,sessionStorage:session,
  document:{baseURI:'https://xencsj.github.io/portfolio/what-is-xen.html',hidden:false,addEventListener(){},querySelector:s=>s==='.xd-gallery'?gallery:s==='.xd-work-dialog'?dialog:null},
  fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve(data)})};
 context.window=context;
 vm.createContext(context);
 // Test access only: no test hook is shipped in the gallery script.
 vm.runInContext(source.replace(" fetch('./xen-discovery-gallery.json", " window.test={drawVisit,excludedWork,get works(){return works;},get cells(){return cells;},rememberVisit,startVisit,settle,setActive(value){active=value;}};\n fetch('./xen-discovery-gallery.json"),context);
 await new Promise(resolve=>setImmediate(resolve));
 return {context,events,tiles,gallery,status,local,session,ids:()=>tiles.map(t=>t.dataset.work),test:context.test};
}
const overlap=(a,b)=>a.filter(id=>b.includes(id)).length;
(async()=>{
 const local=store();let previous=[];
 for(let visit=0;visit<100;visit++){
  const app=await boot(local),ids=app.ids();
  check(app.gallery.dataset.galleryReady==='true','gallery initializes');
  check(ids.length===12&&new Set(ids).size===12,'12 unique slots');
  check(overlap(ids,previous)===0,'reload/new navigation avoids previous visit');
  check(ids.every(id=>app.test.works.some(w=>w.id===id)),'all initial works eligible');
  const saved=JSON.parse(local.getItem(key));
  check(JSON.stringify(saved.order)===JSON.stringify(ids),'order saved');
  app.events.pagehide();app.events.pageshow({persisted:true});
  const restored=app.ids();
  check(overlap(restored,ids)===0,'BFCache revisit redraws');
  app.events.pageshow({persisted:false});
  check(JSON.stringify(restored)===JSON.stringify(app.ids()),'normal pageshow does not double draw');
  previous=restored;
 }
 const app=await boot();
 const pool=app.test.works;
 check(pool.length===141,'20 individual and three category exclusions retained');
 const removed=catalog.works.find(w=>w.id==='space-ee2b661d3cb7');
 check(removed&&app.test.excludedWork(removed),'pink shopping-arcade SPACE (1) excluded by stable ID');
 for(const image of ['./SPACE%20%281%29.jpg','./space%20(1).JPG?cached=1#old','./xen-preview-e68077eee5863d4c.webp?v=old']){
  check(app.test.excludedWork({...removed,id:'renamed-work',image}),'target image alias excluded');
  check(app.test.excludedWork({...removed,id:'renamed-work',image:pool[0].image,originalImage:image}),'target originalImage alias excluded');
 }
 check(pool.some(w=>w.id==='space-1b1ba281a1a9'),'different SPACE (1).png remains eligible');
 check(fs.readFileSync('space.html','utf8').includes('id="discovery-work-ee2b661d3cb7"'),'original remains on SPACE page');
 for(let repeat=0;repeat<100;repeat++){
  const finalScreen=pool.slice(0,12).map(w=>w.id);
  const saturated=app.test.drawVisit(pool,12,{seen:pool.map(w=>w.id),order:finalScreen});
  check(overlap(saturated.map(w=>w.id),finalScreen)===0,'long visits still avoid the last displayed screen');
 }
 for(let size=1;size<=30;size++)for(let seen=0;seen<=size;seen++)for(let repeat=0;repeat<20;repeat++){
  const subset=pool.slice(0,size),history={seen:subset.slice(0,seen).map(w=>w.id),order:[]};
  const count=Math.min(12,size),draw=app.test.drawVisit(subset,count,history),ids=draw.map(w=>w.id);
  check(ids.length===count&&new Set(ids).size===count,'unique selection with small pool');
  check(overlap(ids,history.seen)===Math.max(0,count-(size-seen)),'mathematically minimal overlap');
 }
 const small=app.test.drawVisit(pool.slice(0,3),12,{seen:[],order:[]});
 check(small.length===12&&small.every(w=>pool.slice(0,3).includes(w)),'tiny catalog preserves slots using only eligible works');
 const fixed=pool.slice(0,12),constant=app.context.Math;
 const oldRandom=constant.random;constant.random=()=>.999999;
 const reordered=app.test.drawVisit(fixed,12,{seen:fixed.map(w=>w.id),order:fixed.map(w=>w.id)});
 constant.random=oldRandom;
 check(reordered.some((w,i)=>w.id!==fixed[i].id),'identical order is changed even with an identical draw');
 // Animated replacements must enter the visit history, not just the opening tiles.
 const unseen=pool.find(w=>!app.ids().includes(w.id)),cell=app.test.cells[0],image=new Node();
 app.test.setActive({cell,work:unseen,image,effect:'crossfade',done(){},timeout:1});app.test.settle(true);
 check(JSON.parse(app.local.getItem(key)).seen.includes(unseen.id),'animated works saved');
 const seenVisit=JSON.parse(app.local.getItem(key)).seen;
 app.events.pagehide();app.events.pageshow({persisted:true});
 check(overlap(app.ids(),seenVisit)===0,'revisit also avoids animated replacements');
 // Malformed storage, blocked local storage, and completely blocked storage stay usable.
 const broken={getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceededError');}};
 const corrupt=store();corrupt.setItem(key,'{invalid');check((await boot(corrupt)).gallery.dataset.galleryReady==='true','corrupt history recovers');
 const backup=store(),a=await boot(broken,backup),b=await boot(broken,backup);
 check(overlap(a.ids(),b.ids())===0,'session storage fallback');
 const noStorage=await boot(broken,broken),before=noStorage.ids();noStorage.events.pageshow({persisted:true});
 check(overlap(before,noStorage.ids())===0,'in-memory BFCache fallback without storage');
 // Alias paths and excluded categories are rejected before sampling.
 for(const work of catalog.works.filter(w=>app.test.excludedWork(w))){
  check(app.test.excludedWork({...work,id:'alias-'+work.id,image:new URL(work.image,'https://xencsj.github.io/portfolio/').href+'?cache=old#alias'}),'excluded image URL alias');
 }
 for(const genre of ['CINEMATIC','SNS_MANAGEMENT','ＳＮＡＰ'])check(app.test.excludedWork({...pool[0],genre}),'excluded genre');
 check((html.match(/class="xd-mosaic"/g)||[]).length===1,'no duplicate gallery');
 console.log(JSON.stringify({checks,visits:100,eligible:pool.length,slots:12,result:'PASS'},null,2));
 if(process.env.DISCOVERY_BROWSER_CHECK)await browserChecks(pool);
})().catch(error=>{console.error(error);process.exit(1);});

async function browserChecks(pool){
 const {chromium,webkit}=require('playwright');
 const base=process.env.DISCOVERY_BASE_URL||'http://127.0.0.1:8765/',allowed=new Set(pool.map(w=>w.id)),results=[];
 if(process.env.DISCOVERY_WAIT_FOR_DEPLOY==='true'){
  const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
  let ready=false;
  for(let attempt=0;attempt<30;attempt++){
   try{for(const file of ['index.html','what-is-xen.html','xen-discovery-gallery.js']){
    const response=await fetch(base+file+'?discovery-qa='+Date.now(),{signal:AbortSignal.timeout(20000)});
    check(response.ok,'published file available');
    assert.equal(hash(Buffer.from(await response.arrayBuffer())),hash(fs.readFileSync(file)),file);
   }ready=true;break;}catch(error){console.log('Waiting for Pages:',error.message.split('\n')[0]);await new Promise(resolve=>setTimeout(resolve,10000));}
  }
  check(ready,'Pages serves the exact tested revision');
 }
 fs.mkdirSync('discovery-random-evidence',{recursive:true});
 const ids=page=>page.locator('.xd-tile').evaluateAll(nodes=>nodes.map(n=>n.dataset.work));
 const ready=page=>page.waitForSelector('[data-gallery-ready="true"]');
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch({ignoreDefaultArgs:['--disable-back-forward-cache']});
  for(const width of [375,390,430,768,1440]){
   const context=await browser.newContext({viewport:{width,height:width<768?844:1000},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'index.html');
   const entry=page.locator('.xen-index-discovery>a');await entry.waitFor();
   await entry.scrollIntoViewIfNeeded();
   const label=await entry.evaluate(a=>{
    const en=a.querySelector('.xen-index-discovery-en'),ja=a.querySelector('.xen-index-discovery-ja');
    return {href:a.getAttribute('href'),text:ja.textContent,color:getComputedStyle(ja).color,
     below:ja.getBoundingClientRect().top>=en.getBoundingClientRect().bottom,
     gold:getComputedStyle(a).color,border:getComputedStyle(a).borderTopWidth,
     compass:a.querySelectorAll('.xen-discovery-compass').length};
   });
   check(label.text==='XENを知る'&&label.color==='rgb(153, 153, 153)'&&label.below,'Japanese subtitle below English in #999999');
   check(label.href==='./what-is-xen.html'&&label.gold==='rgb(200, 171, 117)'&&label.border==='1px'&&label.compass===1,'existing link, gold frame and icon retained');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'INDEX no horizontal overflow');
   await page.screenshot({path:`discovery-random-evidence/index-${engine.name()}-${width}.png`});
   await entry.click();await ready(page);
   check(await page.locator('script[src*="20261028-space-exclusion1"]').count()===1,'published exclusion revision');
   let prior=await ids(page);
   check(prior.length===12&&new Set(prior).size===12&&prior.every(id=>allowed.has(id)),'published initial draw');
   check(await page.locator('.xd-tile:visible').count()===(width>=1024?12:9),'unchanged responsive count');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
   for(let reload=0;reload<3;reload++){
    await page.reload();await ready(page);const current=await ids(page);
    check(overlap(current,prior)===0,'published reload has zero repeats');check(current.every(id=>allowed.has(id)),'reload exclusions');prior=current;
   }
   await page.locator('.xd-mosaic').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>[...document.querySelectorAll('.xd-tile')].filter(n=>n.getClientRects().length).every(n=>n.querySelector('img').complete&&n.querySelector('img').naturalWidth>0));
   await page.locator('.xd-tile img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
   await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
   await page.screenshot({path:`discovery-random-evidence/${engine.name()}-${width}.png`});
   await page.locator('.xd-tile:visible').first().click();await page.locator('.xd-work-dialog[open]').waitFor();
   const selected=await page.locator('.xd-work-dialog').getAttribute('data-work');check(prior.includes(selected),'detail corresponds to selected work');
   const work=catalog.works.find(w=>w.id===selected);
   check(allowed.has(selected),'popup only opens eligible work');
   check(await page.locator('#xd-work-title').innerText()===work.title,'popup title retained');
   check(await page.locator('.xd-work-genre').innerText()===work.genre,'popup category retained');
   check(await page.locator('.xd-work-link').getAttribute('href')===work.href,'popup detail link retained');
   check(await page.locator('.xd-work-image').getAttribute('src')===work.image,'popup image retained');
   check(await page.locator('.xd-work-dialog .xd-work-close').isVisible(),'popup close visible');
   await page.screenshot({path:`discovery-random-evidence/popup-${engine.name()}-${width}.png`});
   await page.locator('.xd-work-dialog .xd-work-close').click();await page.locator('.xd-work-dialog').waitFor({state:'hidden'});
   await page.goto(base+'creator.html');await page.goBack();await ready(page);
   await page.waitForFunction(previous=>[...document.querySelectorAll('.xd-tile')].every(n=>!previous.includes(n.dataset.work)),prior);
   const returned=await ids(page);check(overlap(returned,prior)===0&&returned.every(id=>allowed.has(id)),'published back/revisit has zero repeats and retains exclusions');
   await page.goto(base+'creator.html');await page.goto(base+'what-is-xen.html');await ready(page);
   const revisited=await ids(page);check(overlap(revisited,returned)===0&&revisited.every(id=>allowed.has(id)),'published direct revisit has zero repeats and retains exclusions');
   check(errors.length===0,'no JS errors: '+errors.join(';'));
   results.push({engine:engine.name(),width,visible:width>=1024?12:9,reloads:3,revisits:2,repeats:0,status:'PASS'});
   console.log('PASS published',engine.name(),width,'reload/revisit/exclusions/images/layout');await context.close();
  }
  for(const width of [390,1440]){
   const context=await browser.newContext({viewport:{width,height:1000},isMobile:width<768,hasTouch:width<768});
   const page=await context.newPage();await page.goto(base+'what-is-xen.html');await ready(page);
   await page.locator('.xd-mosaic').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>Number(document.querySelector('.xd-gallery').dataset.changeCount)>=3);
   const current=await ids(page),saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
   check(current.every(id=>saved.seen.includes(id)),'animation saves displayed works');
   check(current.every(id=>allowed.has(id)),'animated exclusions');
   check(await page.locator('.xd-incoming').count()<=1,'serialized existing animation');
   await page.reload();await ready(page);
   const redrawn=await ids(page);check(overlap(redrawn,saved.seen)===0,'reloaded draw avoids animated visit');
   console.log('PASS motion',engine.name(),width);await context.close();
  }
  await browser.close();
 }
 fs.writeFileSync('discovery-random-evidence/results.json',JSON.stringify({base,checks,results,eligible:pool.length,removed:'space-ee2b661d3cb7',realIPhoneTested:false},null,2));
 console.log('PASS all published browser checks',checks);
}
