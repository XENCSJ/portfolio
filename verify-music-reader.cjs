/* Reproducible browser coverage for the MUSIC reader and preserved catalogue. */
const {chromium, webkit} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const out = 'music-reader-qa'; fs.mkdirSync(out,{recursive:true});
const profiles = [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[375,667],[390,844],[430,932],[375,568],[320,480],[844,390]];
const results=[];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
  const file=path.join(process.cwd(),decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.MUSIC_BASE_URL || `http://127.0.0.1:${server.address().port}`;
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  for(const [width,height] of profiles){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<701,hasTouch:width<701,deviceScaleFactor:1});
   const page=await context.newPage(); const errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   // Playback requests are independent of the reader; retain their DOM, avoid network noise in layout checks.
   await page.route(/googletagmanager|google-analytics|open\.spotify\.com\/embed|youtube-nocookie|i\.ytimg\.com/,route=>route.abort());
   const label=`${engineName}-${width}x${height}`;
   try {
    await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});
    await page.locator('.music-reader-open').first().waitFor();
    const originals=await page.locator('.sound-release-card').evaluateAll(cards=>cards.map(card=>({id:card.id,title:card.querySelector('h3').textContent,about:card.querySelector('.song-description')?.innerHTML,lyrics:card.querySelector('.sound-song-lyrics')?.innerHTML,cover:card.querySelector('.sound-song-cover').getAttribute('src')})));
    assert.equal(originals.length,8);
    assert.equal(await page.locator('.sound-slide').count(),8);
    assert.equal(await page.locator('.sound-category-drawer').count(),3);
    const states=await page.locator('.sound-release-card > .music-services').evaluateAll(rows=>rows.map(row=>[...row.children].map(li=>({service:li.firstElementChild.dataset.service,linked:li.firstElementChild.tagName==='A',href:li.firstElementChild.getAttribute('href')}))));
    for(const row of states){assert.deepEqual(row.map(x=>x.service),['spotify','appleMusic','youtube','lineMusic','youtubeMusic']);for(const item of row)if(!item.linked)assert.equal(item.href,null);}
    assert.deepEqual(states.map(row=>row.filter(x=>x.linked).length),[0,0,0,0,1,5,1,1]);
    for(const original of originals){
     const open=page.locator('#'+original.id+' .music-reader-open');await open.click();
     const dialog=page.locator('#music-reader'); await dialog.waitFor({state:'visible'});
     assert.equal(await page.locator('#music-reader-title').textContent(),original.title);
     await page.locator('.music-reader-cover').evaluate(img=>img.decode());
     await page.locator('#music-reader .music-services img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
     assert.equal(await page.locator('.music-reader-cover').getAttribute('src'),original.cover);
     if(original.about)assert.equal(await page.locator('#music-about-panel .song-description').innerHTML(),original.about);
     const documentY=await page.evaluate(()=>window.scrollY);
     const coverBefore=await page.locator('.music-reader-cover').boundingBox();
     await page.locator('#music-lyrics-tab').click();
     if(original.lyrics)assert.equal(await page.locator('#music-lyrics-panel .sound-song-lyrics').innerHTML(),original.lyrics);
     assert.equal(await page.evaluate(()=>window.scrollY),documentY);
     const geometry=await page.locator('#music-reader').evaluate(el=>{
      const p=el.querySelector('#music-lyrics-panel'),c=el.querySelector('.music-reader-cover'),r=el.getBoundingClientRect();
      return {overflow:el.scrollWidth>el.clientWidth+1,panel:p.clientHeight,panelBottom:p.getBoundingClientRect().bottom,dialogBottom:r.bottom,cover:c.getBoundingClientRect().toJSON(),height:innerHeight,bodyOverflow:document.documentElement.scrollWidth>innerWidth+1};
     });
     assert.equal(geometry.overflow,false);assert.equal(geometry.bodyOverflow,false);
     assert(geometry.panel>=100,`${label} ${original.id}: readable body ${geometry.panel}`);
     assert(geometry.panelBottom<=geometry.dialogBottom+1);assert(geometry.cover.y>=0 && geometry.cover.y+geometry.cover.height<=geometry.height);
     await page.locator('#music-lyrics-panel').focus();await page.keyboard.press('ControlOrMeta+End');
     // Native wheel on desktop and keyboard on every engine, then verify the full scroll extent.
     if(width>=701){await page.locator('#music-lyrics-panel').hover();await page.mouse.wheel(0,5000);}
     await page.locator('#music-lyrics-panel').evaluate(el=>{el.scrollTop=el.scrollHeight;});
     const extent=await page.locator('#music-lyrics-panel').evaluate(el=>({bottom:el.scrollTop+el.clientHeight,total:el.scrollHeight}));
     assert(extent.bottom>=extent.total-2,'last lyric reachable');
     const coverAfter=await page.locator('.music-reader-cover').boundingBox();assert.deepEqual(coverAfter,coverBefore,'jacket stays fixed');
     assert.equal(await page.evaluate(()=>window.scrollY),documentY);
     await page.locator('#music-lyrics-tab').focus();await page.keyboard.press('ArrowLeft');
     assert.equal(await page.locator('#music-about-tab').getAttribute('aria-selected'),'true');
     await page.keyboard.press('End');assert.equal(await page.locator('#music-lyrics-tab').getAttribute('aria-selected'),'true');
     await page.keyboard.press('Home');assert.equal(await page.locator('#music-about-tab').getAttribute('aria-selected'),'true');
     if(original.id==='tochu-no-mamade' && [1440,390,375,320].includes(width)){
      await page.screenshot({path:`${out}/${label}-about.jpg`,type:'jpeg',quality:90});
      await page.locator('#music-lyrics-tab').click();await page.locator('#music-lyrics-panel').evaluate(el=>{el.scrollTop=0;});
      await page.screenshot({path:`${out}/${label}-lyrics.jpg`,type:'jpeg',quality:90});
     }
     await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
     await page.waitForFunction(id=>document.querySelector('#'+id+' .music-reader-open').getAttribute('aria-expanded')==='false',original.id);
     assert.equal(await open.getAttribute('aria-expanded'),'false');assert(await open.evaluate(el=>document.activeElement===el));
     if(original.about)assert.equal(await page.locator('#'+original.id+' .song-description').innerHTML(),original.about);
     if(original.lyrics)assert.equal(await page.locator('#'+original.id+' .sound-song-lyrics').innerHTML(),original.lyrics);
    }
    // Test an existing genre disclosure and direct detail anchor without changing its open state.
    await page.locator('.sound-category-drawer').first().locator('summary').click();
    await page.locator('.sound-category-links a').first().click();await page.locator('#music-reader').waitFor({state:'visible'});
    await page.locator('.music-reader-close').click();assert(await page.locator('.sound-category-drawer').first().evaluate(el=>el.open));
    await page.locator('.sound-category-drawer').first().locator('summary').click();
    assert.equal(await page.locator('.sound-category-drawer').first().evaluate(el=>el.open),false);
    await page.locator('.sound-showcase-stage').scrollIntoViewIfNeeded();
    const stage=page.locator('.sound-showcase-stage');const before=await stage.getAttribute('data-active-release');
    await page.locator('.sound-slide[data-position="next"]').click();assert.notEqual(await stage.getAttribute('data-active-release'),before);
    await page.locator('.sound-slide[data-position="active"]').focus();await page.keyboard.press('ArrowRight');
    const countIds=await page.locator('[id]').evaluateAll(els=>els.map(el=>el.id));assert.equal(new Set(countIds).size,countIds.length,'unique IDs');
    assert.deepEqual(errors,[]);results.push({label,pass:true,releases:8});console.log('PASS',label);
   } catch(error){await page.screenshot({path:`${out}/${label}-failure.jpg`});results.push({label,pass:false,error:error.stack});console.error('FAIL',label,error);}
   await context.close();
  }
  await browser.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));
 server.close();if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
