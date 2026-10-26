/* Behavior checks for the shared data, responsive theme UI and history lifecycle. */
const {chromium,webkit}=require('playwright');
const fs=require('fs'), assert=require('node:assert/strict');
const base=process.env.DISCOVERY_BASE_URL||'http://127.0.0.1:8765/';
const nodes=JSON.parse(fs.readFileSync('xen-discovery-data.json','utf8')).nodes;
const themes=nodes.home.children, results=[];
let checks=0; const failures=[];
fs.mkdirSync('discovery-evidence',{recursive:true});
const ok=(v,msg)=>{assert(v,msg);checks++;};
const ready=p=>p.waitForSelector('html[data-discovery-ready="true"]',{state:'attached'});
const active=(p,id)=>p.waitForFunction(id=>document.querySelector('.xd-dialog[open] #xd-detail-title')?.textContent===id,id==='home'?'':nodes[id].ja);
async function pick(p,id){await p.locator(`.xd-dialog [data-node="${id}"]`).click();await active(p,id);}
async function close(p){await p.keyboard.press('Escape');await p.waitForSelector('.xd-dialog[open]',{state:'hidden'});}
async function bounds(p,label){
 const b=await p.evaluate(()=>{const rect=n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,r:r.right,b:r.bottom}};return{w:innerWidth,sw:document.documentElement.scrollWidth,cards:[...document.querySelectorAll('.xd-theme')].map(rect),logo:rect(document.querySelector('.xd-center'))};});
 ok(b.sw<=b.w+1,label+' no horizontal overflow');
 for(const a of b.cards){ok(a.w>=44&&a.h>=44,label+' large targets');ok(a.x>=0&&a.r<=b.w+1,label+' within viewport');const c=b.logo;ok(a.r<=c.x||c.r<=a.x||a.b<=c.y||c.b<=a.y,label+' logo clear');}
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=b.cards[i],c=b.cards[j];ok(a.r<=c.x+1||c.r<=a.x+1||a.b<=c.y+1||c.b<=a.y+1,label+' cards clear');}
 if(b.w<768){ok(Math.abs(b.cards[0].y-b.cards[1].y)<1&&b.cards[2].y>b.cards[0].y,label+' 2x2 order');ok(Math.max(...b.cards.map(c=>c.h))-Math.min(...b.cards.map(c=>c.h))<1,label+' equal heights');}
}
(async()=>{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  for(const width of [320,375,390,430,768,1024,1440,1920]){
   const context=await browser.newContext({viewport:{width,height:width<768?844:1000},reducedMotion:'reduce',isMobile:width<768,hasTouch:width<768});
   const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
   try {
   await p.goto(base+'what-is-xen.html',{waitUntil:'domcontentloaded'});await ready(p);
   await p.waitForFunction(()=>document.querySelector('.xd-logo').naturalWidth>0);
   await bounds(p,engine.name()+width);
   if(width<768)ok(await p.locator('.xd-theme').first().evaluate(n=>n.getBoundingClientRect().top<innerHeight),'themes in first view');
   await p.screenshot({path:`discovery-evidence/${engine.name()}-${width}-initial.png`,fullPage:true});
   for(const theme of themes){
    await p.locator(`.xd-theme[data-node="${theme}"]`).click();await active(p,theme);
    if([390,1440].includes(width))await p.screenshot({path:`discovery-evidence/${engine.name()}-${width}-${theme}.png`});
    ok(await p.locator('.xd-theme[aria-expanded="true"]').getAttribute('data-node')===theme,'selected theme');
    ok((await p.locator('.xd-location').innerText()).includes(nodes[theme].title),'location');
    ok(await p.locator('.xd-topics .xd-topic').count()===nodes[theme].children.length,'all topics available');
    ok(await p.locator('.xd-links a').count()<=2,'related links limited');
    ok(await p.locator('.xd-detail-scroll').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'detail no overflow');
    await close(p);
    ok(await p.locator(`.xd-theme[data-node="${theme}"]`).evaluate(n=>document.activeElement===n),'focus returned to selected theme');
   }
   if([390,1440].includes(width)){
    for(const theme of themes){
     await p.locator(`.xd-theme[data-node="${theme}"]`).click();await active(p,theme);
     for(const id of nodes[theme].children){
      await pick(p,id);
      if(nodes[id].children){
       for(const leaf of nodes[id].children){await pick(p,leaf);ok((await p.locator('.xd-detail-text').innerText())===nodes[leaf].text,'channel original text');await p.locator('.xd-detail-back').click();await active(p,id);}
      }else{
       ok((await p.locator('.xd-detail-text').innerText())===nodes[id].text,'original text '+id);
       if(nodes[id].more){await p.locator('.xd-more summary').first().click();await p.waitForFunction(()=>document.querySelector('.xd-more summary')?.getAttribute('aria-expanded')==='true');ok(await p.locator('.xd-more summary').first().getAttribute('aria-expanded')==='true','disclosure accessible');}
      }
      await p.locator('.xd-detail-back').click();await active(p,theme);
     }
     await close(p);
    }
    // Native back/forward plus NEXT must restore content and both scroll contexts.
    await p.evaluate(()=>scrollTo(0,180));await p.locator('.xd-theme[data-node="creation"]').scrollIntoViewIfNeeded();const y=await p.evaluate(()=>scrollY);
    await p.locator('.xd-theme[data-node="creation"]').click();await active(p,'creation');
    await p.locator('.xd-dialog [data-node="storybooks"]').scrollIntoViewIfNeeded();
    const detailY=await p.locator('.xd-detail-scroll').evaluate(n=>n.scrollTop);
    await pick(p,'storybooks');await p.goBack();await active(p,'creation');
    ok(Math.abs((await p.locator('.xd-detail-scroll').evaluate(n=>n.scrollTop))-detailY)<3,'overview scroll restored');
    await p.goForward();await active(p,'storybooks');
    await p.locator('.xd-next').click();await active(p,'connection');
    await p.locator('.xd-next').click();await active(p,'identity');await close(p);
    ok(Math.abs((await p.evaluate(()=>scrollY))-y)<3,'original page scroll restored after NEXT');
    await p.goto(base+'what-is-xen.html#philosophy/values');await ready(p);await active(p,'values');await close(p);
    await p.goto(base+'what-is-xen.html#identity');await ready(p);await active(p,'identity');await close(p);
    await p.locator('.xd-theme[data-node="identity"]').focus();await p.keyboard.press('Enter');await active(p,'identity');
    for(let i=0;i<12;i++){await p.keyboard.press('Tab');ok(await p.evaluate(()=>document.querySelector('.xd-dialog').contains(document.activeElement)),'modal focus trapped');}
    await close(p);await p.setViewportSize({width:844,height:390});await bounds(p,'landscape');
    await p.setViewportSize({width,height:844});await bounds(p,'portrait');
   }
   ok(errors.length===0,errors.join(';'));results.push({engine:engine.name(),width,status:'PASS'});console.log('PASS',engine.name(),width);
   } catch(e) {const label=engine.name()+' '+width;failures.push(label+': '+e.message);results.push({engine:engine.name(),width,status:'FAIL',error:e.stack});console.error('FAIL',label,e);await p.screenshot({path:`discovery-evidence/${engine.name()}-${width}-failure.png`,fullPage:true});}
   await context.close();
  }
  const p=await browser.newPage({viewport:{width:390,height:844}});await p.goto(base+'what-is-xen.html');await ready(p);
  // Resize caused by Safari toolbar must retain the exact interactive elements.
  const card=await p.locator('.xd-theme').first().elementHandle();await p.setViewportSize({width:390,height:800});ok(await card.evaluate(n=>n.isConnected),'height resize retains targets');
  await p.locator('.xd-theme[data-node="identity"]').click();await active(p,'identity');await close(p);
  await p.emulateMedia({reducedMotion:'reduce'});ok(await p.locator('.xd-logo-wrap').evaluate(n=>getComputedStyle(n).animationName)==='none','reduced motion');await p.close();
  // Both no-JS and failed JS keep four usable static theme links and all content.
  for(const mode of ['nojs','failed-script']){
   const c=await browser.newContext({javaScriptEnabled:mode!=='nojs',viewport:{width:320,height:812}});const q=await c.newPage();
   if(mode==='failed-script')await q.route('**/xen-discovery.js*',r=>r.abort());
   await q.goto(base+'what-is-xen.html');ok(await q.locator('.xd-theme').count()===4,mode+' static themes');ok(await q.locator('.xd-fallback').isVisible(),mode+' detail fallback');
   ok(await q.locator('.xd-fallback details').count()===Object.values(nodes).filter(n=>!n.children).length,mode+' all original details');
   await q.locator('.xd-theme[data-node="identity"]').click();ok(await q.locator('#identity').isVisible(),mode+' native anchor');await c.close();
  }
  // Unavailable optional channel data cannot block the initial UI or official links.
  const fail=await browser.newPage();await fail.route('**/xen-channels.json',r=>r.abort());await fail.goto(base+'what-is-xen.html#connection/youtube/blue-sleep');await ready(fail);await active(fail,'blue-sleep');
  ok(await fail.locator('.xd-links a').getAttribute('href')===nodes['blue-sleep'].href,'official link survives channel failure');await fail.close();
  await browser.close();
 }
 // Every internal destination exists, including its named anchor.
 for(const n of Object.values(nodes))for(const href of [n.href,...(n.links||[]).map(l=>l.href)].filter(h=>h?.startsWith('./'))){const [file,anchor]=href.slice(2).split('#');ok(fs.existsSync(file),'file '+file);if(anchor)ok(fs.readFileSync(file,'utf8').includes(`id="${anchor}"`),'anchor '+href);}
 fs.writeFileSync('discovery-evidence/results.json',JSON.stringify({base,checks,results,failures},null,2));assert(failures.length===0,failures.join('\n'));console.log(`PASS: ${checks} assertions; ${results.length} viewport/browser combinations`);
})().catch(e=>{console.error(e);process.exit(1);});
