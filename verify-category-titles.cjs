// Browser acceptance checks for the category rename; URLs remain unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium, webkit} = require('playwright');
const titles = require('./category-titles.json');
module.exports = async function verifyCategoryTitles() {
 const results=[];
 for (const [device,engine,width,height] of [['desktop',chromium,1440,1000],['iphone',webkit,390,844],['small-phone',chromium,360,800]]) {
  const browser=await engine.launch({headless:true});
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
     const [en,ja]=[...el.children].map(x=>x.getBoundingClientRect());
     return {fits:en.left>=-1&&ja.right<=innerWidth+1,separate:en.right<=ja.left+1,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    assert.ok(layout.fits&&layout.separate,device+' '+slug+' heading bounds '+JSON.stringify(layout));
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
   results.push({device,slug,status:200,titles:true,menu:true});
  }
  assert.deepEqual(errors,[],device+' page errors');
  await browser.close();
 }
 fs.writeFileSync('news-qa/category-results.json',JSON.stringify(results,null,2));
 console.log('CATEGORY CHECKS PASSED: '+results.length+' page/viewport combinations');
};
