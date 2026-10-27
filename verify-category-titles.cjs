// Browser acceptance checks for the category rename; URLs remain unchanged.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium, webkit} = require('playwright');
const titles = require('./category-titles.json');
// Page titles and navigation descriptions serve different roles.
const navigation = key => key === 'price-list'
 ? {en:'PRICING',ja:'料金案内'}
 : {en:titles[key].en,ja:titles[key].navigationJa || titles[key].ja};
module.exports = async function verifyCategoryTitles() {
 const results=[]; fs.mkdirSync('news-qa',{recursive:true});
 for (const [device,engine,width,height] of [['desktop',chromium,1440,1000],['iphone',webkit,390,844],['small-phone',chromium,375,812],['large-phone',chromium,430,932],['tablet',chromium,768,1024]]) {
  const browser=await engine.launch({headless:true,executablePath:process.env[engine===webkit?'WEBKIT_EXECUTABLE_PATH':'CHROMIUM_EXECUTABLE_PATH']});
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  ctx.setDefaultTimeout(15000);
  const page=await ctx.newPage();
  let referenceTitleStyle;
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
    const style=await h.evaluate(e=>{const s=getComputedStyle(e);return [s.fontSize,s.fontWeight,s.letterSpacing,s.gap,s.paddingBottom,s.marginBottom];});
    if(referenceTitleStyle)assert.deepEqual(style,referenceTitleStyle,device+' '+slug+' shared heading typography and spacing');
    else referenceTitleStyle=style;
   } else {
    for(const [key,label] of Object.entries(titles)) {
     const ring=page.locator('.orbit > a[href="./'+key+'.html"]');
     assert.equal(await ring.getAttribute('aria-label'),label.en+'｜'+label.ja);
     assert.deepEqual((await ring.locator('textPath').allTextContents()).map(x=>x.trim()),[label.en,label.ja]);
     const directory=page.locator('.index-directory a[href="./'+key+'.html"]');
     assert.equal((await directory.locator('.index-en').textContent()).trim(),navigation(key).en);
     assert.equal((await directory.locator('.index-ja').textContent()).trim(),navigation(key).ja);
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
    assert.equal((await link.locator('.xen-menu-en').textContent()).trim(),navigation(key).en);
    assert.equal((await link.locator('.xen-menu-ja').textContent()).trim(),navigation(key).ja);
    assert.equal(await link.locator('.xen-menu-icon').count(),1,'icon '+slug+' '+key);
   }
   if(slug==='index')await page.screenshot({path:'news-qa/categories-'+device+'-menu.png'});
   await page.locator('.xen-drawer-close').click();
   await page.locator('.xen-header-toggle[aria-expanded="false"]').waitFor({state:'attached',timeout:5000});
   assert.equal(await page.locator('.xen-header-toggle').getAttribute('aria-expanded'),'false');
   if(['sound','artworks','studio','creator'].includes(slug)) await page.screenshot({path:'news-qa/categories-'+device+'-'+slug+'.png'});
   if(slug==='sound') {
    console.log(device+' MUSIC: begin');
    assert.equal(await page.locator('.sound-category-drawer').count(),3);
    assert.equal(await page.locator('.sound-release-card').count(),8);
    assert.equal(await page.locator('.sound-release-card .music-service-icon').count(),40);
    for (const card of await page.locator('.sound-release-card').all()) assert.equal(await card.locator('.music-service-icon').count(),5);
    assert.equal(await page.locator('.music-player-drawer').count(),6);
    assert.equal(await page.locator('#blue-sleep .video-container').count(),2);
    assert.equal(await page.locator('.music-player-drawer[open]').count(),0);
    assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');
    const iconLayout=await page.locator('.music-services').evaluateAll(rows=>rows.every(row=>[...row.children].every(item=>{
     const r=item.getBoundingClientRect(),icon=item.querySelector('svg'),label=item.querySelector('.music-service-name');
     const a=icon.getBoundingClientRect(),b=label.getBoundingClientRect();
     return getComputedStyle(icon).color==='rgb(255, 255, 255)'&&a.left>=r.left-1&&a.right<=r.right+1&&a.bottom<=b.top+1&&b.left>=r.left-1&&b.right<=r.right+1;
    })));
    assert.ok(iconLayout,device+' service icon and label alignment');
    const before=await page.locator('.song-description,.sound-song-lyrics').allTextContents();
    const design=await ctx.newPage();await design.route('**/*',r=>r.request().url().startsWith('http://127.0.0.1:8765/')?r.continue():r.abort());
    await design.goto('http://127.0.0.1:8765/design.html',{waitUntil:'load'});
    const properties=['fontFamily','fontSize','lineHeight','letterSpacing','marginTop','marginBottom','maxWidth','whiteSpace','wordBreak','overflowWrap','lineBreak','textAlign'];
    const reference=await design.locator('.design-description p').first().evaluate((e,keys)=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(e)[k]])),properties);
    await design.close();
    const buttons=page.locator('.music-reader-open');
    assert.equal(await buttons.count(),4);
    for(let i=0;i<await buttons.count();i++) {
     console.log(device+' MUSIC reader '+i);await buttons.nth(i).click();
     const paragraphs=page.locator('#music-reader .song-description p');
     for(const paragraph of await paragraphs.all()) assert.deepEqual(await paragraph.evaluate((e,keys)=>Object.fromEntries(keys.map(k=>[k,getComputedStyle(e)[k]])),properties),reference,device+' DESIGN typography');
     if(i===0)await page.screenshot({path:'news-qa/music-'+device+'-description.png'});
     await page.getByRole('tab',{name:/LYRICS/}).click();
     assert.ok(await page.locator('#music-reader .sound-lyric-section p').evaluateAll(es=>es.every(e=>getComputedStyle(e).textAlign==='center')));
     assert.ok(await page.locator('#music-reader').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'reader overflow');
     if(i===0)await page.screenshot({path:'news-qa/music-'+device+'-lyrics.png'});
     await page.getByRole('button',{name:'楽曲詳細を閉じる',exact:true}).click();
     await page.waitForFunction(()=>!document.querySelector('#music-reader').open&&document.querySelector('.music-reader-identity').children.length===0);
    }
    assert.deepEqual(await page.locator('.song-description,.sound-song-lyrics').allTextContents(),before,'all authored content restored');
    const drawers=page.locator('.music-player-drawer');
    for(let i=0;i<await drawers.count();i++) {
     console.log(device+' MUSIC player '+i);const drawer=drawers.nth(i),summary=drawer.locator('summary');
     await summary.press('Enter');await page.waitForFunction(()=>[...document.querySelectorAll('.music-player-drawer')].every(d=>!d.style.overflow));
     assert.equal(await summary.getAttribute('aria-expanded'),'true');
     if(await drawer.getAttribute('data-service')==='youtube') {
      // BLUE SLEEP has two independent videos inside its shared YouTube drawer.
      for(const video of await drawer.locator('.video-container').all()) {
       const bounds=await video.boundingBox();
       assert.ok(Math.abs(bounds.width/bounds.height-16/9)<.01,'YouTube 16:9');
       await video.locator('.xen-cinema-cover').click();
       assert.equal(await video.locator('iframe').count(),1,'YouTube mounted');
      }
     } else assert.ok((await drawer.locator('iframe').getAttribute('src')).startsWith('https://open.spotify.com/embed/'));
     await summary.press('Enter');await page.waitForFunction(()=>[...document.querySelectorAll('.music-player-drawer')].every(d=>!d.style.overflow));
     assert.equal(await summary.getAttribute('aria-expanded'),'false');
     assert.equal(await drawer.getAttribute('open'),null);
     if(await drawer.getAttribute('data-service')==='youtube')assert.equal(await drawer.locator('iframe').count(),0,'closed video stopped');
     else assert.equal(await drawer.locator('iframe').getAttribute('src'),null,'closed Spotify stopped');
    }
    const nova=page.locator('#nova-pulse');
    await nova.locator('[data-service="spotify"] > .music-player-drawer > summary').click();
    await nova.locator('[data-service="youtube"] > .music-player-drawer > summary').click();await page.waitForFunction(()=>[...document.querySelectorAll('.music-player-drawer')].every(d=>!d.style.overflow));
    assert.equal(await nova.locator('.music-player-drawer[open]').count(),2,'independent drawers');
    await nova.locator('[data-service="youtube"] > .music-player-drawer > summary').click();
    await nova.locator('[data-service="spotify"] > .music-player-drawer > summary').click();await page.waitForFunction(()=>[...document.querySelectorAll('.music-player-drawer')].every(d=>!d.style.overflow));
    await nova.scrollIntoViewIfNeeded();await page.screenshot({path:'news-qa/music-'+device+'-players.png'});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'MUSIC horizontal overflow');
    fs.writeFileSync('news-qa/music-'+device+'-typography.json',JSON.stringify(reference,null,2));
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
