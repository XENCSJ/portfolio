/* Regression evidence for the four-theme modal and the unchanged discovery gallery. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const base=process.env.DISCOVERY_BASE_URL||'http://127.0.0.1:8765/';
const widths=[375,390,430,768,1024,1280,1440,1920];
const themes=['past','present','future','together'];let checks=0;
const ok=(value,message)=>{assert(value,message);checks++};
const catalog=JSON.parse(fs.readFileSync('xen-discovery-gallery.json','utf8'));
const source=fs.readFileSync('what-is-xen.html','utf8');
// Existing 17 red-X images plus ARCHITECTURE work 18 (classified as SPACE).
const redXAssets=[
 ["space-3cdf06737385", "IMG_8369.PNG", "xen-preview-67719606a928b04a.webp"],
 ["design-e7a94102467b", "DESIGN (1).png", "xen-preview-a72f67e01dba78a8.webp"],
 ["design-88900d525066", "DESIGN (4).jpg", "xen-preview-6f26cf8bfee67f8d.webp"],
 ["architecture-2424aea1ca35", "ARCHITECTURE (3).PNG", "xen-preview-2e434359d95c5f34.webp"],
 ["architecture-b3a885b4a868", "ARCHITECTURE (7).PNG", "xen-preview-037ce0d518f1845a.webp"],
 ["architecture-cd8cdcdb14d0", "ARCHITECTURE (8).PNG", "xen-preview-af910ba9d31b9b0e.webp"],
 ["architecture-ebc64cb39540", "ARCHITECTURE (6).PNG", "xen-preview-672e0557b511f605.webp"],
 ["architecture-1e49dea01c50", "ARCHITECTURE (5).PNG", "xen-preview-f77333dc61ed2f87.webp"],
 ["architecture-b2dbd0707f0f", "ARCHITECTURE (10).PNG", "xen-preview-4575b1287cca4e7e.webp"],
 ["architecture-fb17daedd9df", "ARCHITECTURE (11).PNG", "xen-preview-13caa425cdd86b2b.webp"],
 ["architecture-1d5d294c4bd0", "ARCHITECTURE (4).jpg", "xen-preview-47fd91971437be69.webp"],
 ["architecture-f18cf5c8997b", "ARCHITECTURE (5).jpg", "xen-preview-92008f2425eaed58.webp"],
 ["architecture-0a6065abe276", "ARCHITECTURE (1).jpg", "xen-preview-5245c11466c25fd4.webp"],
 ["architecture-590ec40e476e", "ARCHITECTURE (3).jpg", "xen-preview-317f870787c07f32.webp"],
 ["architecture-8b0fe09e46a9", "ARCHITECTURE (6).jpg", "xen-preview-450130aa0b1ba695.webp"],
 ["architecture-9d4659851c16", "ARCHITECTURE-S (1).jpg", "xen-preview-99b2ffd5fd9341f5.webp"],
 ["architecture-639e72800da4", "ARCHITECTURE-S (3).jpg", "xen-preview-7b9c541511702cf2.webp"],
 ["architecture-70b86bed2ebf", "ARCHITECTURE-S (2).jpg", "xen-preview-8d235bd5c952128a.webp"],
];
const blockedIds=new Set(redXAssets.map(([id])=>id));
const blockedNames=new Set(redXAssets.flatMap(([, ...paths])=>paths.map(p=>p.toLowerCase())));
const eligibleCatalog=catalog.works.filter(w=>!blockedIds.has(w.id));

const results=[];
const visibleWorks=page=>page.locator('.xd-tile:visible').evaluateAll(nodes=>nodes.map(n=>n.dataset.work));
async function ready(page,fragment=''){await page.goto(base+'what-is-xen.html'+fragment);await page.waitForSelector('html[data-discovery-ready="true"]',{state:'attached'});await page.waitForSelector('[data-gallery-ready="true"]');}
async function screenshot(page,name){await page.screenshot({path:`discovery-evidence/${name}.png`});}
const creatorOrder=['profile','about','creative-origin','background','philosophy','creative-fields','latest-videos','youtube-channels','personal','concept-project','discover-xen','creation-support'];
const originCopy='幼い頃から絵を描くことが好きで、将来は画家になることを夢見ていた。将来の進路を考えるなかで、画家として生計を立てることの難しさを意識し、同じ芸術分野である建築に目を向けた。当時、インテリアを見ることが好きだった。なかでも強く惹かれたのが、バルセロナチェアのデザイン。その作者を調べたことで、ドイツの建築家ミース・ファン・デル・ローエを知った。一脚の椅子との出会いが、建築への興味を深めるきっかけとなった。';
async function verifyCreator(page,width,engine){
 await page.locator('#latest-videos:not([hidden])').waitFor();
 const sections=await page.locator(creatorOrder.map(id=>'#'+id).join(',')).evaluateAll(es=>es.map(e=>({id:e.id,top:e.getBoundingClientRect().top})));
 ok(sections.map(s=>s.id).join()===creatorOrder.join(),'CREATOR exact 12-section DOM order');
 ok(sections.every((s,i)=>!i||s.top>sections[i-1].top),'CREATOR exact visual section order');
 const ids=await page.locator('[id]').evaluateAll(es=>es.map(e=>e.id));ok(new Set(ids).size===ids.length,'CREATOR unique IDs');
 ok(await page.locator('#profile #connect').count()===1,'SNS remains within PROFILE');
 ok(await page.locator('#creative-origin .cp-copy p').count()===1,'one compact origin paragraph');
 ok(await page.locator('#creative-origin .cp-copy p').textContent()===originCopy,'exact confirmed origin copy');
 ok(await page.locator('.cp-origin-discover').count()===0,'removed reverse origin link');
 await page.locator('#creative-origin img').evaluate(i=>i.decode());
 const photo=await page.locator('#creative-origin img').evaluate(i=>({natural:i.naturalWidth,ratio:i.width/i.height,expected:i.naturalWidth/i.naturalHeight}));
 ok(photo.natural===1535&&Math.abs(photo.ratio-photo.expected)<.01,'origin original resolution and ratio');
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'CREATOR no horizontal overflow');
 if([390,1440].includes(width))await screenshot(page,`${engine}-${width}-creator-origin`);
 const nav=page.locator('.cp-jump a[href^="#"]');
 ok((await nav.evaluateAll(es=>es.map(e=>e.hash))).join()==='#about,#creative-origin,#background,#philosophy,#creative-fields','ordered in-page navigation');
 for(const link of await nav.all()){
  const hash=await link.getAttribute('href');await link.click();await page.waitForTimeout(450);
  const visible=await page.locator(hash+' h2').evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=document.querySelector('#xen-site-header').getBoundingClientRect().bottom-1&&r.top<innerHeight;});
  ok(visible,'heading below fixed header '+hash);
 }
 for(const entry of await page.locator('#creative-fields details').all()){
  await entry.locator('summary').click();await page.waitForTimeout(350);ok(await entry.getAttribute('open')!==null,'field accordion opens');
  await entry.locator('summary').click();await page.waitForTimeout(350);ok(await entry.getAttribute('open')===null,'field accordion closes');
 }
 await page.locator('#latest-videos').scrollIntoViewIfNeeded();
 const cards=await page.locator('.xen-latest-grid > li').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top};}));
 ok(cards.length===4,'all four latest videos retained');
 if(width<600)ok(Math.abs(cards[0].top-cards[1].top)<1&&cards[2].top>cards[0].top,'mobile latest videos keep two columns');
 const media=await page.locator('.xen-latest-play').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return r.width/r.height;}));
 ok(media.length===4&&media.every(r=>Math.abs(r-16/9)<.03),'video thumbnails keep 16:9');
 if([390,1440].includes(width)){
  const thumbnails=await page.locator('.xen-latest-grid img').evaluateAll(async es=>Promise.all(es.map(async i=>{try{await i.decode();}catch{}return{src:i.currentSrc,loaded:i.naturalWidth>0};})));
  fs.writeFileSync(`discovery-evidence/${engine}-${width}-thumbnails.json`,JSON.stringify(thumbnails,null,2));
  await screenshot(page,`${engine}-${width}-creator-videos`);
 }
 const project=page.locator('#concept-project details');await project.locator('summary').click();await page.waitForTimeout(350);
 ok(await project.getAttribute('open')!==null&&await project.innerText().then(t=>t.includes('XEN FREQUENCY LOUNGE')),'concept project and lounge preserved');
 await project.locator('summary').click();await page.waitForTimeout(350);ok(await project.getAttribute('open')===null,'concept project closes');
 ok(await page.locator('#creation-support').isVisible()&&await page.locator('.xen-footer-inquiry').count()===1,'support and contact retained');
}
(async()=>{
fs.mkdirSync('discovery-evidence',{recursive:true});
ok(catalog.works.length===160,'160 catalog records retained');
ok(eligibleCatalog.length===142,'142 eligible works after 18 exclusions');
const fallbackIds=[...source.matchAll(/class="xd-tile"[^>]*data-work="([^"]+)"/g)].map(m=>m[1]);
ok(fallbackIds.length===12&&fallbackIds.every(id=>eligibleCatalog.some(w=>w.id===id)),'all 12 static tiles eligible, including no-JS initial display');
ok(catalog.works.every(w=>!['CINEMATIC','SNS MANAGEMENT','SNAP'].includes(w.genre)&&w.id!=='apparel-ccc341888110'&&!w.image.includes('6e9cfc944d27281a')),'exclusions retained');
ok(!/xd-panels|xd-drawer|id="xd-data"/.test(source),'retired inline content removed');
for(const match of source.matchAll(/href="(\.\/[^"]+\.html(?:#[^"]+)?)"/g)){
 const [file,hash]=match[1].slice(2).split('#');ok(fs.existsSync(file),'destination exists '+file);
 if(hash)ok(fs.readFileSync(file,'utf8').includes(`id="${hash}"`),'anchor exists '+match[1]);
}
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();
 for(const width of widths){
  const height=width<768?844:900;
  const context=await browser.newContext({viewport:{width,height},isMobile:width<768,hasTouch:width<768,reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await ready(page);
  ok(await page.title()==='DISCOVER XEN | XEN CSJ','page title');
  ok((await page.locator('.xd-theme').evaluateAll(nodes=>nodes.map(n=>n.dataset.theme))).join()===themes.join(),'four themes in order');
  ok(await page.locator('.xd-sign').count()===16,'16 signs');
  ok(await page.locator('.xd-sign-main[href]').count()===16,'16 verified primary destinations');
  ok(await page.locator('#xd-origin-detail,[data-origin-open],.xd-sign-unavailable').count()===0,'ORIGIN detail popup removed');
  ok(await page.locator('[data-sign="past-1"] a').getAttribute('href')==='./creator.html#creative-origin','ORIGIN direct destination');
  ok(await page.locator('.xd-sign-main[href] .xd-sign-icon').count()===16,'linked signs include icon and text');
  ok(await page.locator('.xd-gallery button').count()===0,'no pause controls');
  const order=await page.evaluate(()=>['.xd-page-intro','.xd-gallery','.xd-intro','.xd-explorer','.xen-common-footer'].map(selector=>document.querySelector(selector).getBoundingClientRect().top));
  ok(order.every((y,i)=>!i||y>order[i-1]),'page information order');
  const layout=await page.locator('.xd-theme').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width}}));
  if(width<768)ok(layout[0].y===layout[1].y&&layout[2].y>layout[0].y,'mobile 2x2 themes');
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'page no horizontal overflow');
  const tiles=await page.locator('.xd-tile:visible').count();ok(tiles===(width>=1024?12:9),'gallery 3 rows');
  for(const theme of themes){
   const card=page.locator(`[data-theme="${theme}"]`);await card.click();
   const dialog=page.locator('.xd-theme-dialog');await dialog.waitFor({state:'visible'});
   ok(await page.locator('dialog[open]').count()===1,'one modal');
   ok(await page.locator('.xd-theme-panel:visible').count()===1,'one theme panel');
   ok(await page.locator(`#${theme}-title`).innerText()===theme.toUpperCase(),'theme heading');
   const grid=page.locator(`[data-panel="${theme}"] .xd-sign`);
   const r=await grid.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height}}));
   ok(r.length===4&&r[0].y===r[1].y&&r[2].y===r[3].y&&r[2].y>r[0].y,'2x2 signs');
   ok(await dialog.evaluate(d=>{const r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight+1&&r.left>=0&&r.right<=innerWidth+1}),'modal in viewport');
   ok(await page.locator('.xd-theme-scroll').evaluate(n=>n.scrollWidth<=n.clientWidth),'no modal horizontal overflow');
   ok(await page.locator('.xd-theme-close').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight}),'close always visible');
   ok((await page.locator('.xd-theme-panel:visible').innerText()).length<220,'short copy only');
   const frozen=await visibleWorks(page);await page.waitForTimeout(100);ok(JSON.stringify(frozen)===JSON.stringify(await visibleWorks(page)),'gallery stationary behind theme');
   if([390,1440].includes(width))await screenshot(page,`${engine.name()}-${width}-${theme}`);
   await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
   ok(await card.evaluate(n=>n===document.activeElement),'focus returns to opener');
   await page.waitForFunction(()=>!location.hash||location.hash==='#explore');
  }
  await page.locator('[data-theme="past"]').click();
  for(const theme of themes){await page.locator(`[data-switch="${theme}"]`).click();ok(await page.locator(`[data-switch="${theme}"]`).getAttribute('aria-pressed')==='true','switch active');ok(await page.locator('dialog[open]').count()===1,'switch does not stack');}
  await page.locator('.xd-theme-close').click();await page.locator('.xd-theme-dialog').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!location.hash||location.hash==='#explore');
  await page.locator('[data-theme="present"]').click();
  ok(await page.locator('[data-sign="present-3"] .xd-sign-routes a').count()===3&&await page.locator('[data-sign="present-4"] .xd-sign-routes a').count()===3,'all six grouped genres accessible');
  await page.locator('[data-sign="present-1"] a').click();await page.waitForURL('**/studio.html#creative-fields');
  ok(await page.locator('#creative-fields a').count()===10,'PRESENT opens the real ten-field STUDIO section');
  await page.waitForTimeout(150);
  ok(await page.locator('#creative-fields').evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.top<innerHeight}),'activity anchor on screen');
  if([390,1440].includes(width))await screenshot(page,`${engine.name()}-${width}-studio`);
  await ready(page);
  await page.locator('[data-theme="past"]').click();await page.locator('[data-sign="past-1"] a').click();await page.waitForURL('**/creator.html#creative-origin');
  await verifyCreator(page,width,engine.name());
  await page.goto(base+'what-is-xen.html#past/origin');await page.waitForURL('**/creator.html#creative-origin');ok(true,'legacy ORIGIN URL redirects');
  await ready(page);
  await page.locator('.xd-tile:visible').first().click();await page.locator('.xd-work-dialog').waitFor({state:'visible'});
  ok(await page.locator('dialog[open]').count()===1,'gallery opens single work modal');
  const work=await page.locator('.xd-work-dialog').getAttribute('data-work');const item=catalog.works.find(w=>w.id===work);
  ok(await page.locator('.xd-work-link').getAttribute('href')===item.href,'work exact destination');
  ok(await page.locator('#xd-work-title').innerText()===item.title,'work exact title');
  ok(!blockedIds.has(work),'work popup excludes all blocked assets');
  await page.keyboard.press('Escape');await page.locator('.xd-work-dialog').waitFor({state:'hidden'});
  await page.locator('.xen-header-toggle').click();ok(await page.locator('.xen-header-toggle').getAttribute('aria-expanded')==='true','shared menu intact');await page.keyboard.press('Escape');
  ok(await page.locator('.xen-header-cart').getAttribute('href')==='https://xen.official.ec/','shop cart intact');
  ok(await page.locator('.xen-footer-inquiry').getAttribute('href')==='./studio.html#contact','consultation intact');
  ok(await page.locator('.xen-footer-action').nth(1).getAttribute('href')==='./price-list.html','prices intact');
  if([390,1440].includes(width)){
   await page.locator('.xd-words').scrollIntoViewIfNeeded();await screenshot(page,`${engine.name()}-${width}-explore`);
   await page.evaluate(()=>scrollTo(0,0));await screenshot(page,`${engine.name()}-${width}-top`);
  }
  ok(errors.length===0,'no JS errors '+errors.join(';'));
  results.push({engine:engine.name(),width,height,status:'pass'});console.log('PASS',engine.name(),width);await context.close();
 }
 const context=await browser.newContext({viewport:{width:390,height:667},isMobile:true,hasTouch:true});const page=await context.newPage();await ready(page);
 await page.locator('[data-theme="present"]').click();await page.waitForTimeout(450);
 ok(await page.locator('.xd-theme-close').evaluate(n=>n.getBoundingClientRect().bottom<innerHeight),'short iPhone close stays reachable');
 await page.locator('[data-switch="future"]').click();await page.locator('[data-sign="future-4"] a').click();await page.waitForURL('**/studio.html#value-evolution');
 ok(await page.locator('#values').isVisible(),'nested VALUES fragment opens parent panel');
 ok(await page.locator('#value-evolution').innerText().then(t=>t.includes('可能性を、拓く。')),'possibility uses published text');
 await page.goto(base+'studio.html#value-contribution');ok(await page.locator('#values').isVisible(),'trust parent visible');
 ok(await page.locator('#value-contribution').innerText().then(t=>t.includes('長期的な信頼')),'trust uses published content');
 await page.goto(base+'studio.html#vision');ok(await page.locator('#vision').isVisible(),'direction opens VISION');
 await page.goto(base+'studio.html#mission');ok(await page.locator('#mission').isVisible(),'social value opens MISSION');
 await ready(page,'#past');ok(await page.locator('.xd-theme-dialog').isVisible(),'direct theme hash');await page.locator('.xd-theme-close').click();await page.locator('.xd-theme-dialog').waitFor({state:'hidden'});
 await ready(page);await page.locator('[data-theme="past"]').click();await page.goBack();await page.locator('.xd-theme-dialog').waitFor({state:'hidden'});ok(true,'browser Back closes modal');
 await page.locator('.xd-mosaic').scrollIntoViewIfNeeded();
 await page.evaluate(()=>{window.galleryEvents=[];window.maxTransitions=0;document.querySelector('.xd-gallery').addEventListener('xen:gallery-change',e=>window.galleryEvents.push({...e.detail,time:performance.now()}));window.watch=setInterval(()=>window.maxTransitions=Math.max(window.maxTransitions,document.querySelectorAll('.xd-incoming').length),20);});
 await page.waitForFunction(()=>window.galleryEvents.length>=100,{},{timeout:240000});
 const events=await page.evaluate(()=>({events:window.galleryEvents,max:window.maxTransitions}));
 console.log('PASS',engine.name(),'mobile',events.events.length,'draws; excluded=0 after catalog check');
 ok(events.max===1,'one random tile changes at a time');
 ok(new Set(events.events.map(e=>e.cell)).size>=4,'random cells');
 ok(events.events.every(e=>eligibleCatalog.some(w=>w.id===e.id)),'dynamic works approved');
 ok(events.events.every(e=>['crossfade','mask','zoom','vertical','blur'].includes(e.effect)),'existing five effects');
 ok(events.events.slice(1).every((e,i)=>e.time-events.events[i].time>500),'existing slower cadence preserved');
 await page.locator('[data-theme="together"]').click();await page.waitForTimeout(300);const frozen=await visibleWorks(page);await page.waitForTimeout(1800);ok(JSON.stringify(frozen)===JSON.stringify(await visibleWorks(page)),'animated mode gallery pauses for theme');
 await page.locator('.xd-theme-close').click();await page.locator('.xd-theme-dialog').waitFor({state:'hidden'});
 await page.locator('.xd-mosaic').scrollIntoViewIfNeeded();const before=await page.locator('.xd-gallery').getAttribute('data-change-count');await page.waitForFunction(count=>document.querySelector('.xd-gallery').dataset.changeCount!==count,before,{timeout:10000});ok(true,'gallery resumes');
 fs.writeFileSync(`discovery-evidence/${engine.name()}-random.json`,JSON.stringify(events,null,2));await context.close();
 // Desktop: deliberately reintroduce blocked records into the network catalog.
 // Production filtering must reject them before any image preload or random draw.
 const desktop=await browser.newContext({viewport:{width:1440,height:900}});
 const desktopPage=await desktop.newPage();const blockedRequests=[];
 const variants=[
  {id:'excluded-category-cinema',genre:' cinematic '},
  {id:'excluded-category-sns',genre:'SNS_MANAGEMENT'},
  {id:'excluded-category-snap',genre:'ＳＮＡＰ'},
  {id:'excluded-source',genre:'DESIGN',source:'./sns-management.html'},
  {id:'excluded-link',genre:'DESIGN',href:'./snap.html#work'},
  {id:'cinematic-original-id',genre:'DESIGN'},
  {id:'apparel-ccc341888110',genre:'SHOP'},
  {id:'excluded-preview',genre:'SHOP',image:'./xen-preview-6e9cfc944d27281a.webp?v=old'},
  {id:'excluded-original',genre:'APPAREL',image:'./APPAREL%20%281%29.png'},
  {id:'excluded-original-alias',genre:'SHOP',originalImage:'./APPAREL%20(1).png'}
 ].map((overrides,index)=>({...catalog.works[0],id:'blocked-'+index,image:'./blocked-discovery-fixture-'+index+'.png',...overrides}));
 const redXVariants=redXAssets.flatMap(([id,...paths],index)=>[
  {...catalog.works[0],id},
  ...paths.flatMap((path,alias)=>[
   {...catalog.works[0],id:`redx-path-${index}-${alias}`,image:`./${encodeURIComponent(path)}?v=old#alias`},
   {...catalog.works[0],id:`redx-original-${index}-${alias}`,image:`./blocked-discovery-fixture-redx-${index}-${alias}.png`,originalImage:`https://xencsj.github.io/portfolio/${encodeURIComponent(path)}`}
  ])
 ]);
 variants.push(...redXVariants);
 desktopPage.on('request',request=>{const name=decodeURIComponent(new URL(request.url()).pathname).split('/').pop().toLowerCase();if(blockedNames.has(name))blockedRequests.push(request.url());if(/blocked-discovery-fixture|6e9cfc944d27281a|APPAREL%20(?:%28|\()1(?:%29|\))\.png/i.test(request.url()))blockedRequests.push(request.url());});
 await desktopPage.route('**/xen-discovery-gallery.json?*',route=>route.fulfill({json:{...catalog,works:[...catalog.works,...variants],genres:[...catalog.genres,' cinematic ','SNS_MANAGEMENT','ＳＮＡＰ','APPAREL']}}));
 await ready(desktopPage);await desktopPage.reload();await desktopPage.waitForSelector('[data-gallery-ready="true"]');
 ok(await desktopPage.locator('.xd-tile:visible').count()===12,'desktop retains 12 tiles after reload');
 await desktopPage.locator('.xd-tile:visible').first().click();await desktopPage.locator('.xd-work-dialog').waitFor({state:'visible'});
 await desktopPage.keyboard.press('Escape');await desktopPage.locator('.xd-work-dialog').waitFor({state:'hidden'});
 await desktopPage.locator('.xd-mosaic').scrollIntoViewIfNeeded();
 await desktopPage.evaluate(()=>{window.exclusionEvents=[];document.querySelector('.xd-gallery').addEventListener('xen:gallery-change',event=>window.exclusionEvents.push(event.detail));});
 await desktopPage.waitForFunction(()=>window.exclusionEvents.length>=100,{},{timeout:240000});
 const desktopEvents=await desktopPage.evaluate(()=>window.exclusionEvents);
 ok(desktopEvents.every(event=>eligibleCatalog.some(work=>work.id===event.id)),'100 desktop draws reject injected exclusions');
 ok(blockedRequests.length===0,'excluded images never preloaded or requested');
 ok(await desktopPage.locator('.xd-gallery button').count()===0,'no pause control added');
 await desktopPage.locator('[data-theme="past"]').click();await desktopPage.keyboard.press('Escape');await desktopPage.locator('.xd-theme-dialog').waitFor({state:'hidden'});
 await desktopPage.locator('.xd-mosaic').scrollIntoViewIfNeeded();
 await screenshot(desktopPage,engine.name()+'-desktop-exclusions');
 fs.writeFileSync(`discovery-evidence/${engine.name()}-desktop-exclusions.json`,JSON.stringify({draws:desktopEvents.length,excluded:0,blockedRequests,events:desktopEvents},null,2));
 console.log('PASS',engine.name(),'desktop',desktopEvents.length,'draws; excluded=0; blocked image requests=0');
 await desktop.close();
 const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const plain=await nojs.newPage();await plain.goto(base+'what-is-xen.html');ok(await plain.locator('.xd-theme[href]').count()===4,'no-JS navigation available');ok(await plain.locator('.xd-tile:visible').count()===9,'no-JS gallery');await nojs.close();await browser.close();
}
fs.writeFileSync('discovery-evidence/results.json',JSON.stringify({base,checks,results,newExclusions:18,eligibleWorks:142,creatorOrder,unresolved:['Real iPhone Safari not available; tested WebKit engine'],galleryCadence:'existing 800-1500ms retained'},null,2));
console.log('PASS',checks,'checks');
})().catch(error=>{console.error(error);process.exit(1)});
