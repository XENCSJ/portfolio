const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium, webkit} = require('playwright');
const titles = require('./category-titles.json');
const base = (process.env.NAMES_BASE_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const out = 'names-qa'; fs.mkdirSync(out, {recursive:true});
const results = {base, sha:process.env.GITHUB_SHA, cases:[], interactions:[]};
const save = () => fs.writeFileSync(out+'/results.json', JSON.stringify(results,null,2));
const pages = ['index','what-is-xen',...Object.keys(titles),'studio-logo-review'];
const expected = Object.fromEntries(Object.entries(titles).map(([slug,t])=>[slug,[t.en,t.navigationJa||t.ja]]));
expected['what-is-xen']=['DISCOVER XEN','XENを知る'];
expected['price-list']=['PRICING','料金案内'];
const plain = s=>s.replace(/\s+/g,' ').trim();
async function main(){
 for(const [name,engine,width] of [['pc',chromium,1440],['phone',chromium,390],['small-phone',chromium,375],['iphone',webkit,390]]){
  const browser=await engine.launch();
  const ctx=await browser.newContext({viewport:{width,height:width>500?1000:844},deviceScaleFactor:1});
  if(base.startsWith('http://127.0.0.1'))await ctx.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const p=await ctx.newPage();p.setDefaultTimeout(12000);
  for(const slug of pages){
   const rec={name,width,slug};
   try{
    const response=await p.goto(base+slug+'.html',{waitUntil:'domcontentloaded',timeout:45000});
    assert.equal(response.status(),200);await p.waitForTimeout(600);
    rec.overflow=await p.evaluate(()=>document.documentElement.scrollWidth-innerWidth);assert.ok(rec.overflow<=1,'horizontal overflow');
    assert.ok(!/\bSNAP\b/.test(await p.locator('body').innerText()),'visible SNAP');
    assert.ok(!/\bSNAP\b/.test(await p.title()),'title SNAP');
    await p.locator('.xen-header-toggle').click();
    await p.locator('.xen-header-toggle[aria-expanded="true"]').waitFor();
    for(const [key,[en,ja]] of Object.entries(expected)){
     if(slug==='studio-logo-review'&&key==='what-is-xen')continue; // Existing auxiliary preview has no DISCOVER entry.
     const a=p.locator('#xen-menu a[href="./'+key+'.html"]');
     assert.equal(plain(await a.locator('.xen-menu-en').textContent()),en,slug+' '+key+' English');
     assert.equal(plain(await a.locator('.xen-menu-ja').textContent()),ja,slug+' '+key+' Japanese');
     assert.equal(await a.locator('.xen-menu-icon').count(),1,'existing icon '+key);
     assert.ok(await a.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'menu text clipping '+key);
    }
    if(slug==='index')await p.screenshot({path:out+'/'+name+'-menu.jpg',quality:80});
    await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('.xen-header-toggle').getAttribute('aria-expanded')==='false');
    if(['snap','cinematic','apparel'].includes(slug)){
     const en={snap:'PHOTOGRAPHY',cinematic:'CINEMATIC',apparel:'SHOP'}[slug];
     assert.equal(plain(await p.locator('h1 .title-en').textContent()),en);
     const r=await p.locator('h1 .title-en').boundingBox();assert.ok(r.x>=-1&&r.x+r.width<=width+1,'heading viewport');
    }
    if(slug==='cinematic')assert.equal(plain(await p.locator('h1 .page-title-ja').textContent()),'映像作品');
    if(slug==='index'){
     for(const [key,[en,ja]] of Object.entries(expected)){
      const a=p.locator('.index-directory a[href="./'+key+'.html"]');
      assert.equal(plain(await a.locator('.index-en').textContent()),en,'sitemap '+key);
      assert.equal(plain(await a.locator('.index-ja').textContent()),ja,'sitemap Japanese '+key);
     }
     assert.deepEqual((await p.locator('.index-destination-en').allTextContents()).map(plain),['HOME','VIEW PRICING','GET IN TOUCH']);
     assert.deepEqual((await p.locator('.index-destination-ja').allTextContents()).map(plain),['ホーム','料金を見る','制作を相談する']);
     const a=p.locator('.index-directory a[href="./snap.html"]');await a.hover();
     assert.equal(await a.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','hover background');
     await a.focus();assert.equal(await a.evaluate(e=>getComputedStyle(e).backgroundColor),'rgba(0, 0, 0, 0)','focus background');
     for(let y=0;y<await p.evaluate(()=>document.body.scrollHeight);y+=500){await p.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await p.waitForTimeout(90);}
     await p.waitForTimeout(1800);await p.locator('#creative-index h1').click();await p.waitForTimeout(300);
     await p.locator('#creative-index').screenshot({path:out+'/'+name+'-sitemap.jpg',quality:85});
     const spacing=await p.locator('.orbit').evaluate(el=>{
      const length=el.querySelector('#circle').getTotalLength();const links=[...el.querySelectorAll(':scope > a')];
      return links.map((a,i)=>({text:a.querySelector('.orbit-en').textContent,gap:((parseFloat(links[(i+1)%links.length].querySelector('textPath').getAttribute('startOffset'))-parseFloat(a.querySelector('textPath').getAttribute('startOffset'))+100)%100)/100*length-(a.querySelector('.orbit-en').getComputedTextLength()+links[(i+1)%links.length].querySelector('.orbit-en').getComputedTextLength())/2}));
     });rec.ringSpacing=spacing;assert.ok(spacing.every(x=>x.gap>0),'overlapping ring labels '+JSON.stringify(spacing));
     await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(400);await p.screenshot({path:out+'/'+name+'-index.jpg',quality:85});
     await p.locator('.orbit a[href="./snap.html"]').focus();await p.keyboard.press('Enter');await p.waitForURL('**/snap.html');assert.equal(plain(await p.locator('h1 .title-en').textContent()),'PHOTOGRAPHY');
    }
    if(['snap','cinematic','apparel','creator'].includes(slug))await p.screenshot({path:out+'/'+name+'-'+slug+'.jpg',quality:80});
    rec.ok=true;
   }catch(e){rec.ok=false;rec.error=e.message;await p.screenshot({path:out+'/'+name+'-'+slug+'-failure.jpg',quality:75}).catch(()=>{});}
   results.cases.push(rec);save();console.log(JSON.stringify(rec));
  }
  async function test(label,fn){const rec={name,width,label};try{rec.details=await fn();rec.ok=true;}catch(e){rec.ok=false;rec.error=e.message;}results.interactions.push(rec);save();console.log(JSON.stringify(rec));}
  await test('photography gallery viewer',async()=>{await p.goto(base+'snap.html');await p.locator('.gallery-item').first().click();await p.locator('#image-viewer[open]').waitFor();await p.locator('.viewer-next').click();await p.waitForTimeout(350);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#image-viewer').open);return true;});
  await test('cinematic one-click player',async()=>{await p.goto(base+'cinematic.html');const v=p.locator('.video-container').first();await v.locator('.xen-cinema-cover').click();const f=v.locator('iframe');await f.waitFor();const src=await f.getAttribute('src');assert.match(src,/autoplay=1/);return {iframe:src,streamPlayback:'not asserted by this test'};});
  await test('shop categories and purchase links',async()=>{await p.goto(base+'apparel.html');await p.locator('[data-shop-filter="apparel"]').click();assert.equal(await p.locator('[data-shop-filter="apparel"]').getAttribute('aria-selected'),'true');assert.equal(plain(await p.locator('[data-shop-filter="apparel"]').textContent()),'APPAREL');const links=await p.locator('a[href*="xen.official.ec/items/"]').evaluateAll(es=>es.map(e=>e.href));assert.ok(links.length>0);return {productLinks:links.length};});
  await test('creator field links',async()=>{await p.goto(base+'creator.html');assert.ok(await p.locator('#creative-fields a[href="./cinematic.html"]').count());assert.match(await p.locator('#creative-fields a[href="./cinematic.html"]').textContent(),/映像作品/);assert.ok(await p.locator('#creative-fields a[href="./snap.html"]').count());assert.ok(await p.locator('#creative-fields a[href="./apparel.html"]').count());return true;});
  await browser.close();
 }
 results.failed=results.cases.filter(x=>!x.ok).length+results.interactions.filter(x=>!x.ok).length;save();
 const summary=`Naming QA: ${results.cases.length} page/viewport cases, ${results.interactions.length} interactions, ${results.failed} failures.\nBase: ${base}\nSource: ${results.sha}\n`;
 console.log(summary);if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,summary);
 if(results.failed)process.exitCode=1;
}
main().catch(e=>{save();console.error(e);process.exitCode=1;});
