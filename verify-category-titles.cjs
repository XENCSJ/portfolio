// Browser acceptance checks for the category rename; URLs remain unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium, webkit} = require('playwright');
const titles = require('./category-titles.json');
module.exports = async function verifyCategoryTitles() {
 const results=[]; fs.mkdirSync('news-qa',{recursive:true});
 for (const [device,engine,width,height] of [['desktop',chromium,1440,1000],['iphone',webkit,390,844],['small-phone',chromium,375,812],['large-phone',chromium,430,932],['tablet',chromium,768,1024]]) {
  const browser=await engine.launch({headless:true,executablePath:process.env[engine===webkit?'WEBKIT_EXECUTABLE_PATH':'CHROMIUM_EXECUTABLE_PATH']});
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await ctx.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
  for (const slug of ['index',...Object.keys(titles)]) {
   const response=await page.goto('http://127.0.0.1:8765/'+slug+'.html',{waitUntil:'load'});
   assert.equal(response.status(),200,device+' '+slug+' response');
   await page.waitForTimeout(900);
   if(slug!=='index') {
    const h=page.locator('h1');
    const spans=await h.locator(':scope > span').allTextContents();
    assert.deepEqual(spans.map(x=>x.trim()).filter(Boolean),[titles[slug].en,titles[slug].ja],device+' '+slug+' heading');
    const layout=await h.evaluate(el=>{
     const [en,ja]=['.title-en','.page-title-ja'].map(s=>el.querySelector(s).getBoundingClientRect());
     const h=el.getBoundingClientRect(),center=h.left+h.width/2;
     return {fits:en.left>=-1&&ja.right<=innerWidth+1,separate:en.bottom<=ja.top+1,centered:Math.abs(en.left+en.width/2-center)<1&&Math.abs(ja.left+ja.width/2-center)<1,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert.ok(layout.fits&&layout.separate&&layout.centered,device+' '+slug+' heading bounds '+JSON.stringify(layout));
    assert.ok(!layout.overflow,device+' '+slug+' horizontal overflow');
   } else {
    for(const [key,label] of Object.entries(titles)) {
     const ring=page.locator('.orbit > a[href="./'+key+'.html"]');
     assert.equal(await ring.getAttribute('aria-label'),label.en+'｜'+label.ja);
     assert.deepEqual((await ring.locator('textPath').allTextContents()).map(x=>x.trim()),[label.en,label.ja]);
     const directory=page.locator('.index-directory a[href="./'+key+'.html"]');
     assert.equal((await directory.locator('.index-en').textContent()).trim(),label.en);
     assert.equal((await directory.locator('.index-ja').textContent()).trim(),label.ja);
    }
    const ring=await page.locator('.orbit').evaluate(el=>{
     const outer=el.querySelector('#circle').getTotalLength(),inner=el.querySelector('#circle-ja').getTotalLength();
     const widths=[...el.querySelectorAll(':scope > a')].map(a=>Math.max(a.querySelector('.orbit-en').getComputedTextLength()/outer,a.querySelector('.orbit-ja').getComputedTextLength()/inner));
     return {sum:widths.reduce((a,b)=>a+b,0),animation:getComputedStyle(el).animationName};
    });
    assert.ok(ring.sum<1,'ring text spacing '+JSON.stringify(ring));
    assert.notEqual(ring.animation,'none','ring animation preserved');
    await page.screenshot({path:'news-qa/categories-'+device+'-index.png'});
   }
   await page.locator('.xen-header-toggle').click();
   await page.waitForTimeout(350);
   assert.equal(await page.locator('.xen-header-toggle').getAttribute('aria-expanded'),'true');
   for(const [key,label] of Object.entries(titles)) {
    const link=page.locator('#xen-menu a[href="./'+key+'.html"]');
    assert.equal((await link.locator('.xen-menu-en').textContent()).trim(),label.en);
    assert.equal((await link.locator('.xen-menu-ja').textContent()).trim(),label.ja);
    assert.equal(await link.locator('.xen-menu-icon').count(),1,'icon '+slug+' '+key);
   }
   if(slug==='index')await page.screenshot({path:'news-qa/categories-'+device+'-menu.png'});
   await page.locator('.xen-drawer-close').click();
   await page.locator('.xen-header-toggle[aria-expanded="false"]').waitFor({state:'attached',timeout:5000});
   assert.equal(await page.locator('.xen-header-toggle').getAttribute('aria-expanded'),'false');
   if(['sound','artworks','studio','creator'].includes(slug)) await page.screenshot({path:'news-qa/categories-'+device+'-'+slug+'.png'});
   if(slug==='sound') {
    const workStyles=await page.locator('.sound-work-title').evaluateAll(es=>es.map(e=>{
     const s=getComputedStyle(e),line=getComputedStyle(e,'::after');
     return [s.fontSize,s.fontWeight,s.letterSpacing,s.textAlign,s.marginBottom,line.width,line.height];
    }));
    assert.equal(workStyles.length,3);
    for(const style of workStyles)assert.deepEqual(style,workStyles[0]);
    assert.equal(workStyles[0][3],'center');
    assert.equal(await page.locator('#deep-sleep-title,#celestial-lake-title').count(),0);
    const stack=await page.locator('.sound-sleep-series').evaluate(el=>{
     const videos=[...el.querySelectorAll('.video-container')].map(e=>e.getBoundingClientRect());
     return {count:videos.length,vertical:videos[0].bottom<videos[1].top,ratios:videos.map(r=>r.width/r.height),gap:getComputedStyle(el).gap};
    });
    assert.equal(stack.count,2);assert.ok(stack.vertical);assert.equal(stack.gap,'24px');
    stack.ratios.forEach(r=>assert.ok(Math.abs(r-16/9)<.01));
   }
   if(slug==='creator') {
    assert.equal(await page.getByText('CONNECT WITH XEN',{exact:true}).count(),0);
    const links=page.locator('.creator-connect-links > a');
    assert.deepEqual(await links.evaluateAll(es=>es.map(e=>e.getAttribute('aria-label'))),['Instagram','X','YouTube','TikTok','Spotify','Apple Music','Shop','Support']);
    const grid=await page.locator('.creator-connect-links').evaluate(e=>({columns:getComputedStyle(e).gridTemplateColumns.split(' ').length,rows:getComputedStyle(e).gridTemplateRows.split(' ').length}));
    assert.deepEqual(grid,{columns:4,rows:2});
   }
   if(slug==='studio') {
    assert.equal(await page.locator('.studio-fusion a').count(),10);
    const ring=await page.locator('.studio-fusion').evaluate(e=>getComputedStyle(e,'::before').content);
    assert.ok(ring==='none'||ring==='normal','Decorative ring removed');
   }
   results.push({device,slug,status:200,titles:true,menu:true});
  }
  assert.deepEqual(errors,[],device+' page errors');
  await browser.close();
 }
 fs.writeFileSync('news-qa/category-results.json',JSON.stringify(results,null,2));
 console.log('CATEGORY CHECKS PASSED: '+results.length+' page/viewport combinations');
};
if(require.main===module)module.exports().catch(e=>{console.error(e);process.exit(1)});
