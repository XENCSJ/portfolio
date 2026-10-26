/* Browser regression evidence for the published DISCOVER XEN interaction model. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs');const assert=require('node:assert/strict');
const base=process.env.DISCOVERY_BASE_URL||'http://127.0.0.1:8765/';
const widths=[375,390,430,768,1024,1280,1440,1920];let checks=0;
const ok=(condition,message)=>{assert(condition,message);checks++};
const catalog=JSON.parse(fs.readFileSync('xen-discovery-gallery.json','utf8'));
const themes=['identity','philosophy','creation','connection'];
const sleep=(page,ms)=>page.waitForTimeout(ms);
async function ready(page){await page.goto(base+'what-is-xen.html');await page.waitForSelector('html[data-discovery-ready="true"]');await page.waitForSelector('[data-gallery-ready="true"]');}
async function visibleWorks(page){return page.locator('.xd-tile:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.work));}
(async()=>{
fs.mkdirSync('discovery-evidence',{recursive:true});
ok(catalog.genres.length===8,'eight approved image genres');
ok(new Set(catalog.works.map(w=>w.image)).size===catalog.works.length,'catalog has no duplicate images');
ok(catalog.works.length===160,'160 retained images');
ok(catalog.works.every(w=>!['CINEMATIC','SNS MANAGEMENT','SNAP'].includes(w.genre)&&w.id!=='apparel-ccc341888110'&&!w.image.includes('6e9cfc944d27281a')),'excluded images absent from catalog');
// Every local destination exists, including IDs added without changing other page content.
for(const work of catalog.works){if(!work.href.startsWith('./'))continue;const [file,fragment]=work.href.slice(2).split('#');const source=fs.readFileSync(file,'utf8');ok(!fragment||source.includes(`id="${fragment}"`),'verified target '+work.href);}
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:900},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'index.html');
  const entry=page.locator('.xen-index-discovery a');
  ok(await entry.count()===1&&await entry.innerText()==='DISCOVER XEN','one renamed INDEX entrance');
  ok(await entry.getAttribute('href')==='./what-is-xen.html','INDEX destination retained');
  ok(await entry.evaluate(a=>{const s=getComputedStyle(a),r=a.getBoundingClientRect();return s.borderTopWidth==='1px'&&s.borderRadius==='0px'&&s.backgroundColor==='rgba(0, 0, 0, 0)'&&Math.abs(r.left+r.width/2-innerWidth/2)<1}),'INDEX centered transparent rectangular border');
  ok(await page.locator('.orbit>a').count()===15,'INDEX orbit links retained');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'INDEX no horizontal overflow');
  await page.locator('.xen-header-toggle').click();
  ok(await page.locator('#xen-menu a[href="./what-is-xen.html"] .xen-menu-en').innerText()==='DISCOVER XEN','shared menu label');
  await page.keyboard.press('Escape');
  if([390,1440].includes(width))await page.screenshot({path:`discovery-evidence/${engine.name()}-${width}-index.png`});
  await entry.click();await page.waitForURL('**/what-is-xen.html');
  await page.waitForSelector('html[data-discovery-ready="true"]');await page.waitForSelector('[data-gallery-ready="true"]');
  ok(await page.locator('.xd-theme').count()===4,'four first-level themes');
  ok(await page.locator('.xd-logo,.xd-center').count()===0,'large center logo removed');
  const shape=await page.locator('.xd-theme').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
  if(width<768){ok(Math.abs(shape[0].y-shape[1].y)<1&&shape[2].y>shape[0].y,'2x2 mobile themes');}
  const layout=await page.evaluate(()=>{const hero=document.querySelector('.xd-page-intro'),g=document.querySelector('.xd-gallery'),h=g.querySelector('h2'),r=h.getBoundingClientRect(),p=g.querySelector('header p').getBoundingClientRect(),intro=document.querySelector('.xd-intro'),t=document.querySelector('h1');return {first:document.querySelector('main').firstElementChild===hero,ordered:hero.getBoundingClientRect().bottom<=g.getBoundingClientRect().top&&g.getBoundingClientRect().bottom<=intro.getBoundingClientRect().top,nowrap:getComputedStyle(h).whiteSpace==='nowrap',fits:r.right<=innerWidth&&h.scrollWidth<=r.width+1,jp:p.top>=r.bottom,firstImage:document.querySelector('.xd-tile').getBoundingClientRect().top<innerHeight,larger:parseFloat(getComputedStyle(t).fontSize)>parseFloat(getComputedStyle(h).fontSize),center:Math.abs(t.getBoundingClientRect().left+t.getBoundingClientRect().width/2-innerWidth/2)<1};});
  ok(layout.first&&layout.ordered,'page title, gallery, exploration order without overlap');
  ok(layout.nowrap&&layout.fits&&layout.jp&&layout.firstImage,'one-line gallery title, Japanese below, images in first viewport');
  ok(layout.larger&&layout.center,'main title centered and larger than gallery heading');
  ok(await page.getByRole('heading',{level:1,name:'DISCOVER XEN',exact:true}).count()===1,'one accessible page title');
  ok(await page.title()==='DISCOVER XEN | XEN CSJ','HTML title');
  ok(await page.locator('meta[property="og:title"]').getAttribute('content')==='DISCOVER XEN | XEN CSJ','OG title');
  ok(await page.locator('meta[name="twitter:title"]').getAttribute('content')==='DISCOVER XEN | XEN CSJ','Twitter title');
  ok(await page.locator('#xd-page-title').evaluate(n=>n.scrollWidth<=n.clientWidth&&new Set([...n.children].map(c=>Math.round(c.getBoundingClientRect().top))).size===1),'main title fits one line');
  ok(await page.locator('.xd-gallery h2').innerText()==='DISCOVERY GALLERY','exact gallery name');
  ok(await page.locator('.xd-page-intro .xd-copy > span').count()===2,'catch copy has two lines');
  ok(await page.locator('.xd-kicker').innerText()==='EXPLORE'&&await page.locator('#xd-explore-title').innerText()==='4つのテーマから探す','separate exploration heading');
  ok(await page.locator('.xen-footer-inquiry').getAttribute('href')==='./studio.html#contact'&&await page.locator('.xen-footer-action').nth(1).getAttribute('href')==='./price-list.html','consultation and price list links retained');
  ok(await page.locator('.xd-gallery button').count()===0,'no pause/play controls in gallery');
  for(const t of themes){
   await page.locator(`[data-theme="${t}"]`).click();
   ok(await page.locator('.xd-panel:visible').count()===1,'one inline theme');
   const drawers=page.locator(`#${t} .xd-drawer`);
   ok(await drawers.first().isVisible(),'drawers visible after single selection');
   ok(await page.locator(`#${t} .xd-drawer[open]`).count()===0,'initially closed details');
   for(let d=0;d<await drawers.count();d++){
    const drawer=drawers.nth(d),summary=drawer.locator(':scope > summary'),body=drawer.locator('.xd-drawer-body');
    await summary.press('Enter');ok(await summary.getAttribute('aria-expanded')==='true'&&await body.isVisible(),'keyboard opens complete drawer');
   }
   ok(await page.locator(`#${t} .xd-drawer[open]`).count()===await drawers.count(),'independent drawers remain open like MUSIC');
   for(let d=0;d<await drawers.count();d++){const summary=drawers.nth(d).locator(':scope > summary');await summary.press('Enter');ok(await summary.getAttribute('aria-expanded')==='false','keyboard closes drawer');}

   ok(await page.locator(`[data-theme="${t}"]`).getAttribute('aria-expanded')==='true','theme expanded state');
   ok(await page.locator('dialog[open]').count()===0,'theme is not a modal/intermediate step');
   ok(!(await page.locator(`#${t}`).innerText()).includes('さらに知る'),'no intermediate route');
  }
  await page.locator('#connection .xd-theme-close').click();
  ok(await page.locator('.xd-panel:visible').count()===0,'theme closes');
  await page.locator('.xd-mosaic').scrollIntoViewIfNeeded();
  const tiles=await page.locator('.xd-tile:visible').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{w:r.width,h:r.height,x:r.x,y:r.y}}));
  const columns=width>=1024?4:3;ok(tiles.length===columns*3&&Math.abs(tiles[0].y-tiles[columns-1].y)<1&&tiles[columns].y>tiles[0].y,'three rows at each breakpoint');
  ok(tiles.every(r=>Math.abs(r.w-r.h)<1&&r.w>=44),'square, usable tiles');
  const before=await visibleWorks(page);await sleep(page,800);ok(JSON.stringify(before)===JSON.stringify(await visibleWorks(page)),'reduced motion stops autoplay');
  const tile=page.locator('.xd-tile:visible').first(),selected=await tile.getAttribute('data-work');
  if(width<768)await tile.tap();else await tile.press('Enter');
  ok(await page.locator('.xd-work-dialog').getAttribute('data-work')===selected,'exact tapped/keyboard work');
  const item=catalog.works.find(w=>w.id===selected);
  ok(await page.locator('#xd-work-title').innerText()===item.title,'verified title');
  ok(await page.locator('.xd-work-link').getAttribute('href')===item.href,'verified work URL');
  ok(await page.locator('.xd-work-dialog').evaluate(d=>{const r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1}),'dialog fits viewport');
  await page.keyboard.press('Escape');ok(await page.locator('dialog[open]').count()===0,'Escape closes work detail');
  ok(await tile.evaluate(n=>n===document.activeElement),'focus returns to chosen work');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  await sleep(page,800);ok(JSON.stringify(before)===JSON.stringify(await visibleWorks(page)),'reduced motion remains static without controls');
  if([390,1440].includes(width)){await page.locator('#xd-page-title').click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`discovery-evidence/${engine.name()}-${width}-page.png`,fullPage:true});}
  ok(errors.length===0,'no JS errors '+errors.join(';'));console.log('PASS layout',engine.name(),width);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const page=await context.newPage();await ready(page);
 const titleMotion=await page.locator('#xd-page-title > span').evaluateAll(nodes=>nodes.map(n=>({name:getComputedStyle(n).animationName,delay:parseFloat(getComputedStyle(n).animationDelay)})));
 ok(titleMotion.length===12&&titleMotion.every(n=>n.name==='xd-title-in')&&titleMotion[11].delay>titleMotion[0].delay,'title letters enter in sequence');
 ok(await page.locator('.xd-words').evaluate(n=>!n.classList.contains('xd-in-view')),'offscreen themes wait for their own reveal');
 await page.locator('.xd-words').scrollIntoViewIfNeeded();await sleep(page,200);
 ok(await page.locator('.xd-words').evaluate(n=>n.classList.contains('xd-in-view')),'theme animation starts on scroll');
 ok(await page.locator('.xd-theme .xd-icon-identity path').evaluate(n=>getComputedStyle(n).animationName==='xd-draw'),'theme line icon drawing preserved');

 await page.locator('.xd-mosaic').scrollIntoViewIfNeeded();
 await page.evaluate(()=>{window.galleryEvents=[];document.querySelector('.xd-gallery').addEventListener('xen:gallery-change',e=>window.galleryEvents.push({...e.detail,time:performance.now()}));window.maxTransitions=0;window.transitionWatch=setInterval(()=>{window.maxTransitions=Math.max(window.maxTransitions,document.querySelectorAll('.xd-incoming').length)},20);});
 await page.waitForFunction(()=>window.galleryEvents.length>=16,{},{timeout:30000});
 const evidence=await page.evaluate(()=>({events:window.galleryEvents,max:window.maxTransitions}));
 ok(evidence.events.every(e=>catalog.works.some(w=>w.id===e.id)),'all dynamic images belong to approved catalog');
 ok(evidence.events.slice(1).every((e,i)=>e.time-evidence.events[i].time>500),'slower serialized rhythm');
 ok(evidence.max===1,'only one tile can transition at a time');
 ok(new Set(evidence.events.map(e=>e.cell)).size>=5,'irregular positions');
 ok(evidence.events.every((e,i)=>!i||e.cell!==evidence.events[i-1].cell),'no repeated position');
 ok(new Set(evidence.events.map(e=>e.id)).size===evidence.events.length,'no repeated work in recent transitions');
 ok(new Set(await visibleWorks(page)).size===9,'no simultaneous duplicates');
 // A held pointer latches a work. Movement marks it as scrolling and suppresses activation.
 const tile=page.locator('.xd-tile:visible').nth(4);await tile.dispatchEvent('pointerdown',{pointerId:11,button:0,clientX:50,clientY:50,pointerType:'touch'});
 const held=await tile.getAttribute('data-work');await sleep(page,1000);ok(await tile.getAttribute('data-work')===held,'held tile cannot change');
 await tile.dispatchEvent('pointermove',{pointerId:11,clientX:50,clientY:90,pointerType:'touch'});await tile.dispatchEvent('click',{button:0});ok(await page.locator('dialog[open]').count()===0,'scroll gesture not a tap');
 await tile.tap();const selected=await page.locator('.xd-work-dialog').getAttribute('data-work');const frozen=await visibleWorks(page);await sleep(page,900);ok(JSON.stringify(frozen)===JSON.stringify(await visibleWorks(page)),'details stop every tile');
 const image=page.locator('.xd-work-image');await image.evaluate(img=>img.decode());ok(await image.evaluate(img=>img.naturalWidth>1),'detail image loads');
 await page.screenshot({path:`discovery-evidence/${engine.name()}-390-work.png`});
 await page.locator('.xd-work-close').click();
 await page.locator('[data-theme="identity"]').click();await page.locator('#identity').scrollIntoViewIfNeeded();await sleep(page,500);const outside=await visibleWorks(page);await sleep(page,1700);ok(JSON.stringify(outside)===JSON.stringify(await visibleWorks(page)),'offscreen gallery stops');
 // Theme controls, channel content, browser back, and shared menu remain usable.
 await page.locator('[data-theme="identity"]').click();await page.locator('#identity [data-switch="philosophy"]').click();await page.goBack();ok(await page.locator('#identity').isVisible(),'browser back restores prior theme');
 await page.locator('#identity .xd-drawer > summary').first().click();await sleep(page,320);ok(await page.locator('#identity .xd-drawer > summary').first().getAttribute('aria-expanded')==='true','animated drawer opens');await page.screenshot({path:`discovery-evidence/${engine.name()}-390-drawer.png`,fullPage:true});
 await page.locator('#identity .xd-theme-close').click();await page.locator('.xen-header-toggle').click();ok(await page.locator('.xen-header-toggle').getAttribute('aria-expanded')==='true','shared menu opens');await page.keyboard.press('Escape');
 fs.writeFileSync(`discovery-evidence/${engine.name()}-random.json`,JSON.stringify(evidence,null,2));await context.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const plain=await nojs.newPage();await plain.goto(base+'what-is-xen.html');ok(await plain.locator('.xd-panel:visible').count()===4,'no-JS content available');ok(await plain.locator('.xd-tile:visible').count()===9,'no-JS gallery links available');await nojs.close();
 await browser.close();
}
console.log('PASS',checks,'checks: 16 layouts, title hierarchy, section entrances, inline themes, random single-cell transitions, touch/keyboard, MUSIC drawers, exclusions, reduced motion, no-JS, source destinations');
})().catch(error=>{console.error(error);process.exitCode=1;});
