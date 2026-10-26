'use strict';
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
const root='http://127.0.0.1:8765/';
const base=process.env.PUBLISHED==='true'?'https://xencsj.github.io/portfolio/':root;
const evidence='index-two-column-evidence';fs.mkdirSync(evidence,{recursive:true});
const widths=[375,390,430,768,1024,1280,1440,1920];
const names=['INDEX','DISCOVER XEN','STUDIO','CREATOR','STORYBOOKS','ANIMATION','MUSIC','CINEMATIC','SNAP','DESIGN','SHOP','ARCHITECTURE','SPACE','ART GALLERY','SNS MANAGEMENT','PRICE LIST','CONTACT'];
const hrefs=['index.html','what-is-xen.html','studio.html','creator.html','storybooks.html','animation.html','sound.html','cinematic.html','snap.html','design.html','apparel.html','architecture.html','space.html','artworks.html','sns-management.html','price-list.html','studio.html#contact'];
const results=[];
async function measure(p){return p.evaluate(()=>{
 const q=s=>document.querySelector(s),rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom,r:r.right}};
 const props=e=>{const s=getComputedStyle(e);return {font:s.fontSize,family:s.fontFamily,line:s.lineHeight,gap:s.gap,weight:s.fontWeight,color:s.color,width:s.width,height:s.height,stroke:s.strokeWidth}};
 const nav=q('.index-directory'),line=getComputedStyle(nav,'::before'),news=q('.xen-news-list');
 return {width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,hero:rect(q('.hero')),logo:rect(q('.center-logo')),news:rect(q('#xen-news')),newsList:rect(news),newsStyle:props(news),entry:rect(q('.xen-index-discovery')),orbit:[...document.querySelectorAll('.orbit>a')].map(e=>[e.getAttribute('href'),e.textContent]),header:q('header').outerHTML,newsHTML:q('#xen-news').outerHTML,footer:q('.xen-footer').outerHTML,sitemap:rect(q('#creative-index')),line:{content:line.content,x:nav.getBoundingClientRect().x+parseFloat(line.left),width:line.width,color:line.backgroundColor,newsColor:getComputedStyle(news).borderLeftColor},rows:[...nav.querySelectorAll('a')].map(e=>{const en=e.querySelector('.index-en'),ja=e.querySelector('.index-ja'),svg=e.querySelector('svg');return {name:en.textContent.trim(),href:e.getAttribute('href'),rect:rect(e),en:rect(en),ja:rect(ja),svg:rect(svg),type:props(en),jtype:props(ja),itype:props(svg),svgHTML:svg.outerHTML,padding:getComputedStyle(e).paddingTop,jaPadding:getComputedStyle(ja).paddingLeft,overflow:en.scrollWidth>en.clientWidth+1,current:e.getAttribute('aria-current'),standalone:e.classList.contains('index-standalone')};}),headings:[...nav.querySelectorAll('.index-category>.index-heading')].map(e=>({text:e.textContent,interactive:!!e.closest('a,button,[role="button"],[role="link"]'),type:props(e.querySelector('.index-en')),rect:rect(e),overflow:e.scrollWidth>e.clientWidth+1}))};
});}
(async()=>{
 if(base!==root){
  // GitHub Pages deploys asynchronously. Test only after the published product matches this commit.
  for(let n=0;;n++){
   const [h,c]=await Promise.all(['index.html','xen-ui.css?v=20261026-sitemap2'].map(async f=>(await fetch(base+f,{cache:'no-store'})).text()));
   if(h===fs.readFileSync('index.html','utf8')&&c===fs.readFileSync('xen-ui.css','utf8'))break;
   assert(n<90,'Pages has not published this tested HTML/CSS after 7.5 minutes');
   await new Promise(r=>setTimeout(r,5000));
  }
 }
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  for(const width of widths){
   const context=await browser.newContext({viewport:{width,height:width<768?844:1100},isMobile:width<768,hasTouch:width<768,deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route('https://www.googletagmanager.com/**',r=>r.abort());
   await page.goto(root+'__baseline-index.html',{waitUntil:'load'});const before=await measure(page);
   await page.goto(base+'index.html',{waitUntil:'load'});const after=await measure(page);
   fs.writeFileSync(`${evidence}/${engine.name()}-${width}-measure.json`,JSON.stringify({before,after},null,2));
   if(width===375)await page.locator('#creative-index').screenshot({path:`${evidence}/${engine.name()}-${width}-sitemap.png`});
   assert.notEqual(after.line.content,'none','continuous divider is drawn');
   assert.deepEqual(after.rows.map(r=>r.name),names);assert.deepEqual(after.rows.map(r=>r.href),hrefs.map(h=>'./'+h));
   assert.equal(after.overflow,false);assert.equal(after.headings.length,2);
   assert.equal(await page.locator('#xen-news #creative-index').count(),0,'separate sections');
   assert.equal(await page.locator('#creative-index').count(),1);
   assert(Math.abs(after.line.x-after.newsList.x)<1,'NEWS and sitemap divider alignment');
   assert.equal(after.line.width,'1px');assert.equal(after.line.color,after.line.newsColor);
   for(const h of after.headings){assert(!h.interactive);assert.equal(h.type.weight,'700');assert.equal(h.type.color,'rgb(201, 170, 120)');assert(!h.overflow,'heading overflow');assert(h.rect.r<=after.line.x+1,'heading fits left column');}
   assert.equal(await page.locator('#index-about-heading + ul a').count(),3);assert.equal(await page.locator('#index-works-heading + ul a').count(),11);
   for(const [i,row] of after.rows.entries()){
    assert(row.rect.h>=44,`${row.name} target height ${row.rect.h}`);assert(!row.overflow,row.name+' overflows');
    const old=before.rows.find(b=>b.name===row.name);
    if(!row.standalone){
     assert(row.svg.x>=after.line.x+16,row.name+' right column');
     assert(Math.abs(row.svg.x-after.rows[1].svg.x)<1,row.name+' icon alignment');
     assert(Math.abs(row.ja.x+parseFloat(row.jaPadding)-(row.svg.x+row.svg.w+8))<1,row.name+' bilingual alignment');
     for(const key of ['font','family','line','gap'])assert.equal(row.type[key],old.type[key],row.name+' English '+key);
     assert.equal(row.type.color,old.type.color,row.name+' color');
    }else{assert(row.svg.x<after.line.x);assert(row.ja.x>=after.line.x);}
    for(const key of ['font','family','line'])assert.equal(row.jtype[key],old.jtype[key],row.name+' Japanese '+key);
    for(const key of ['width','height','stroke'])assert.equal(row.itype[key],old.itype[key],row.name+' icon '+key);
    assert.equal(row.svgHTML,old.svgHTML,row.name+' original icon');
    assert(Math.abs(parseFloat(row.padding)/parseFloat(old.padding)-.8)<.01,row.name+' 20% padding reduction');
    if(i>0)assert(row.rect.y>=after.rows[i-1].rect.b-.1,'no overlapping tap targets');
   }
   assert.equal(after.rows[0].current,'page');
   for(const key of ['hero','logo','news','newsList','newsStyle','entry','orbit','header','newsHTML','footer'])assert.deepEqual(after[key],before[key],'unchanged '+key);
   const url=page.url();await page.locator('#index-about-heading').click();assert.equal(page.url(),url);await page.locator('#index-works-heading').click();assert.equal(page.url(),url);
   const menu=page.locator('.xen-header-toggle');await menu.click();assert.equal(await menu.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');
   if([390,1440].includes(width)){
    await page.mouse.move(0,0);await page.locator('#creative-index').screenshot({path:`${evidence}/${engine.name()}-${width}-sitemap.png`});
    await page.screenshot({path:`${evidence}/${engine.name()}-${width}-page.png`,fullPage:true});
    const destination=await context.newPage();await destination.route('**/*',r=>['image','media','font'].includes(r.request().resourceType())?r.abort():r.continue());
    for(const [i,href] of hrefs.entries()){
     await destination.goto(base+'index.html',{waitUntil:'domcontentloaded'});
     const nav=destination.waitForNavigation({waitUntil:'domcontentloaded'});
     await destination.locator('.index-directory a').nth(i).click();const response=await nav;
     assert(response?.ok(),href+' response');const expected=new URL(href,base);
     assert.equal(new URL(destination.url()).pathname,expected.pathname);assert.equal(new URL(destination.url()).hash,expected.hash);
     if(expected.hash)assert.equal(await destination.locator(expected.hash).count(),1);
     assert(!/404|page not found/i.test(await destination.title()),href+' exists');
    }
    await destination.close();await page.locator('.index-directory a').first().focus();assert.notEqual(await page.locator('.index-directory a').first().evaluate(e=>getComputedStyle(e).outlineStyle),'none');
   }
   assert.deepEqual(errors,[]);results.push({engine:engine.name(),width,status:'PASS',newsLine:after.newsList.x,sitemapLine:after.line.x,beforeHeight:before.sitemap.h,afterHeight:after.sitemap.h,before:before.rows.map(r=>({name:r.name,height:r.rect.h,padding:r.padding})),after:after.rows.map(r=>({name:r.name,height:r.rect.h,padding:r.padding}))});console.log('PASS layout and hierarchy',engine.name(),width,'divider',after.line.x);await context.close();
  }
  const motion=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});await motion.route('https://www.googletagmanager.com/**',r=>r.abort());
  await motion.goto(base+'index.html');await motion.waitForTimeout(4500);
  assert.equal(await motion.locator('.center-logo').evaluate(e=>getComputedStyle(e).opacity),'1');assert.equal(await motion.locator('.orbit').evaluate(e=>getComputedStyle(e).animationName),'spin');assert.equal(await motion.locator('.orbit>a').count(),15);
  await motion.locator('.orbit>a[href="./sound.html"]').focus();await motion.keyboard.press('Enter');await motion.waitForURL('**/sound.html');await motion.close();
  const nojs=await browser.newPage({viewport:{width:390,height:844},javaScriptEnabled:false});await nojs.goto(base+'index.html');assert.equal(await nojs.locator('.index-directory a').count(),17);assert(await nojs.locator('.index-directory a').last().isVisible());await nojs.close();
  await browser.close();
 }
 fs.writeFileSync(`${evidence}/results.json`,JSON.stringify({base,results,linkNavigationCases:68,engines:2},null,2));
 console.log('PASS: 16 responsive layouts, NEWS divider alignment, 68 link navigations, unchanged NEWS/hero/header/footer, original icons and link typography, keyboard/menu/orbit/no-JS. Physical iPhone Safari is not tested.');
})().catch(e=>{console.error(e);process.exit(1)});
