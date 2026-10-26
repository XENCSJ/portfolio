const {chromium,webkit,devices}=require('playwright');
const fs=require('fs');const assert=require('node:assert/strict');
const base=process.env.DISCOVERY_BASE_URL||'http://127.0.0.1:8765/';
const nodes=JSON.parse(fs.readFileSync('xen-discovery-data.json','utf8')).nodes;
const channels=JSON.parse(fs.readFileSync('xen-channels.json','utf8'));
fs.mkdirSync('discovery-evidence',{recursive:true});
let checks=0;const results=[];
function ok(value,message){assert(value,message);checks++;}
async function ready(page){await page.waitForSelector('html[data-discovery-ready="true"]');}
async function scene(page,id){await page.waitForFunction(id=>document.querySelector('.xd-stage').dataset.branch===id,id);}
async function select(page,id){for(let group=0;group<4&&!await page.locator(`[data-node="${id}"]`).count();group++){if(!await page.locator('.xd-page-controls').isVisible())break;await page.locator('.xd-page-controls [data-page="1"]').click();}await page.locator(`[data-node="${id}"]`).click({force:true});if(nodes[id].children)await scene(page,id);else await page.waitForFunction(title=>document.querySelector('.xd-dialog[open] #xd-detail-title')?.textContent===title,nodes[id].title);}
async function home(page){await page.locator('[data-home]').click();await scene(page,'home');}
async function checkBounds(page,label){
 const data=await page.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom}};return{width:innerWidth,scroll:document.documentElement.scrollWidth,words:[...document.querySelectorAll('.xd-word button')].map(rect),center:rect(document.querySelector('.xd-center'))};});
 ok(data.scroll<=data.width+1,label+' no horizontal overflow');
 for(let i=0;i<data.words.length;i++){const a=data.words[i];ok(a.w>=44&&a.h>=44,label+' touch target');ok(a.x>=0&&a.r<=data.width+1,label+' word within viewport');for(let j=i+1;j<data.words.length;j++){const b=data.words[j];ok(a.r+10<=b.x||b.r+10<=a.x||a.b+12<=b.y||b.b+12<=a.y,label+' words do not collide during float');}const c=data.center;ok(a.r+5<=c.x||c.r+5<=a.x||a.b+12<=c.y||c.b+12<=a.y,label+' central mark clear');}
}
async function close(page){await page.keyboard.press('Escape');await page.waitForSelector('.xd-dialog[open]',{state:'hidden'});}
(async()=>{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  for(const width of [375,390,430,768,1024,1280,1440,1920]){
   const context=await browser.newContext({viewport:{width,height:width<768?844:1000},reducedMotion:'reduce',hasTouch:width<768,isMobile:width<768});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'what-is-xen.html',{waitUntil:'domcontentloaded'});await ready(page);
   ok(await page.locator('.xd-logo').evaluate(i=>i.complete&&i.naturalWidth>0),'official logo loaded');await page.screenshot({path:`discovery-evidence/${engine.name()}-${width}-initial.png`,fullPage:true});await checkBounds(page,engine.name()+width+' home');
   for(const branch of ['identity','philosophy','creation','connection']){
    await select(page,branch);const seen=new Set();let count=1;
    if(await page.locator('.xd-page-controls').isVisible())count=Number((await page.locator('.xd-page-count').innerText()).split('/')[1]);
    for(let group=0;group<count;group++){await checkBounds(page,engine.name()+width+branch);for(const id of await page.locator('.xd-word button').evaluateAll(bs=>bs.map(b=>b.dataset.node)))seen.add(id);if(count>1)await page.locator('.xd-page-controls [data-page="1"]').click();}
    ok(nodes[branch].children.every(id=>seen.has(id)),'all keywords available '+branch);
    await home(page);
   }
   if([390,1440].includes(width)){
    for(const branch of ['identity','philosophy','creation','connection']){
     await select(page,branch);
     for(const id of nodes[branch].children){
      while(!await page.locator(`[data-node="${id}"]`).count())await page.locator('.xd-page-controls [data-page="1"]').click();
      if(id==='youtube'){
       await select(page,id);ok(await page.locator('.xd-word button').count()===3,'three channels');
       for(const channel of nodes.youtube.children){await select(page,channel);await page.locator('.xc-banner').scrollIntoViewIfNeeded();await page.waitForFunction(()=>[...document.querySelectorAll('.xd-dialog img')].every(i=>i.complete&&i.naturalWidth>0));ok(await page.locator('.xd-dialog .xc-banner').count()===1,'channel banner');await page.locator('.xd-dialog .xc-more summary').click();ok(await page.locator('.xd-dialog .xc-more').getAttribute('open')!==null,'channel MORE');const a=page.locator('.xd-dialog .xc-body>a');ok(await a.getAttribute('rel')==='noopener noreferrer','channel external security');await close(page);await scene(page,'youtube');}
       await page.locator('[data-back]').click();await scene(page,'connection');
      }else{
       await select(page,id);ok(await page.locator('#xd-detail-title').innerText()===nodes[id].title,'correct detail '+id);
       if(nodes[id].more){await page.locator('.xd-more summary').click();ok(await page.locator('.xd-more').getAttribute('open')!==null,'MORE opens');await page.locator('.xd-more summary').click();}
       await page.keyboard.press('Tab');ok(await page.evaluate(()=>document.querySelector('.xd-dialog').contains(document.activeElement)),'modal keyboard focus');await close(page);await scene(page,branch);
       ok(await page.locator(`[data-node="${id}"]`).evaluate(e=>e===document.activeElement),'restore focus '+id);
      }
     }await home(page);
    }
    await page.screenshot({path:`discovery-evidence/${engine.name()}-${width}-home.png`,fullPage:true});
    await select(page,'connection');await select(page,'youtube');await select(page,'purple-awake');await page.screenshot({path:`discovery-evidence/${engine.name()}-${width}-youtube.png`,fullPage:true});await close(page);
    await page.setViewportSize({width:844,height:390});await checkBounds(page,'rotation');await home(page);await page.setViewportSize({width,height:844});
    await select(page,'identity');await select(page,'profile');await page.goBack();await scene(page,'identity');await page.goForward();await page.waitForSelector('.xd-dialog[open]');await close(page);
   }
   ok(errors.length===0,'no runtime errors '+errors.join(';'));results.push({engine:engine.name(),width,status:'PASS'});console.log('PASS',engine.name(),width);await context.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await page.goto(base+'what-is-xen.html');await ready(page);
  ok(await page.locator('.xd-float').first().evaluate(n=>getComputedStyle(n).animationName)!=='none','float active');
  await page.locator('[data-node="identity"]').click({force:true});ok(await page.locator('.xd-stage').getAttribute('aria-busy')==='true','transition locks input');await scene(page,'identity');ok(await page.locator('.xd-flight').count()===0,'transition cleans up');
  await page.locator('[data-node="profile"]').click({force:true});await page.setViewportSize({width:430,height:844});await page.waitForFunction(()=>document.querySelector('.xd-stage').getAttribute('aria-busy')==='false');ok(await page.locator('.xd-flight').count()===0,'rotation cancels flight safely');
  await page.goto(base+'what-is-xen.html#philosophy/values');await ready(page);await page.waitForSelector('.xd-dialog[open]');await close(page);await scene(page,'philosophy');
  await page.goto(base+'what-is-xen.html#identity/profile');await ready(page);await page.waitForSelector('.xd-dialog[open]');
  await page.locator('.xd-related button').first().click();await page.waitForFunction(()=>document.querySelector('#xd-detail-title').textContent!=='PROFILE');await close(page);ok(await page.locator('.xd-dialog[open]').count()===0,'ESC closes a related detail');
  await page.goto(base+'creator.html',{waitUntil:'domcontentloaded'});await page.waitForSelector('.xc-channel');ok(await page.locator('.xc-channel').count()===3,'existing CREATOR specialist channels');
  ok(await page.locator('.xen-discovery-entry a').getAttribute('href')==='./what-is-xen.html','CREATOR discovery entrance');
  for(const c of channels.filter(c=>c.creatorId)){const row=page.locator('#'+c.creatorId);await row.locator('summary').click();await row.locator('.xc-banner').scrollIntoViewIfNeeded();ok((await row.locator('.xc-link').getAttribute('href'))===c.url,'shared official URL');ok(await row.locator('.xc-description').innerText()===c.descriptionShort,'shared description');await row.locator('summary').click();}
  await page.close();
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:812}});const fallback=await nojs.newPage();await fallback.goto(base+'what-is-xen.html');ok(await fallback.locator('.xd-fallback[open]').count()===1,'no-JS fallback expanded');ok(await fallback.locator('.xd-fallback a').count()===27,'no-JS all detail routes');await nojs.close();
  const fail=await browser.newPage();await fail.route('**/xen-discovery-data.json',r=>r.abort());await fail.goto(base+'what-is-xen.html');ok(await fail.locator('.xd-fallback[open]').count()===1,'data failure keeps fallback');await fail.close();
  await browser.close();
 }
 // Existing pages have exactly one new common menu item, no global CSS/JS changes.
 const {request}=require('playwright');const api=await request.newContext();
 for(const filename of ['index','creator','studio','sound','design','animation','cinematic','snap','apparel','architecture','space','storybooks','artworks','sns-management','price-list']){const response=await api.get(base+filename+'.html');ok(response.ok(),filename+' available');const body=await response.text();ok((body.match(/class="xen-menu-en" lang="en">WHAT IS XEN\?/g)||[]).length===1,filename+' common menu');}
 for(const node of Object.values(nodes)){if(node.href?.startsWith('./')){const response=await api.get(base+node.href.slice(2).split('#')[0]);ok(response.ok(),'internal route '+node.href);}}
 await api.dispose();
 fs.writeFileSync('discovery-evidence/results.json',JSON.stringify({base,checks,results},null,2));console.log(`PASS: ${checks} assertions, ${results.length} viewport/browser combinations`);
})().catch(e=>{console.error(e);process.exit(1);});
