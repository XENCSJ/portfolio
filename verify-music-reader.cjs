/* Task-specific browser acceptance checks for BLUE SLEEP and the shared detail reader. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const out='music-reader-qa';fs.mkdirSync(out,{recursive:true});
const results=[],playback=[];
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{const file=path.join(process.cwd(),decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});});
async function shot(page,name){await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:88});}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.MUSIC_BASE_URL||`http://127.0.0.1:${server.address().port}`;
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  for(const [width,height] of [[1440,900],[390,844]]){
   const label=`${engineName}-${width}x${height}`,context=await browser.newContext({viewport:{width,height},isMobile:width<701,hasTouch:width<701,deviceScaleFactor:1});
   context.setDefaultTimeout(12000);const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.route(/googletagmanager|google-analytics|open\.spotify\.com\/embed/,r=>r.abort());
   try{
    await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});
    await page.locator('.music-reader-ready').first().waitFor();
    const rows=await page.locator('.sound-release-card > .music-services').evaluateAll(rows=>rows.map(row=>[...row.querySelectorAll('.music-service-name')].map(x=>x.textContent)));
    assert.equal(rows.length,8);rows.forEach(row=>assert.deepEqual(row,['Spotify','Apple Music','YouTube','LINE MUSIC','YouTube Music']));
    assert.equal(await page.locator('.sound-slide').count(),8);assert.equal(await page.locator('.sound-category-drawer').count(),3);
    assert.equal(await page.locator('.music-genre-videos').count(),0);
    assert.equal(await page.locator('#blue-sleep .sound-video-item').count(),2);
    assert.equal(await page.locator('a[href="https://www.youtube.com/@XEN_BLU"]').count(),1);
    const urls=[['deep-sleep','-_Z0oOPnfvE'],['celestial-lake','t2sB0oOTOAA']];
    for(const [id,video] of urls){assert.equal(await page.locator('#'+id).count(),1);assert(await page.locator('#blue-sleep #'+id+' template').evaluate((e,video)=>e.content.querySelector('iframe').getAttribute('src').includes('/'+video),video));}
    const originals=await page.locator('.sound-release-card').evaluateAll(cards=>cards.map(c=>({id:c.id,title:c.querySelector('h3').textContent,about:c.querySelector('.song-description')?.innerHTML,lyrics:c.querySelector('.sound-song-lyrics')?.innerHTML})));
    for(const original of originals){
     const card=page.locator('#'+original.id),button=card.locator('.music-reader-open');
     if(!original.about&&!original.lyrics){assert.equal(await button.count(),0);continue;}
     await button.click();const d=page.locator('#music-reader');await d.waitFor({state:'visible'});
     assert.equal(await d.locator('.music-services,.music-service,.music-service-name,.music-service-status,iframe,template,.music-playback').count(),0);
     assert.equal(await page.locator('#music-reader-title').textContent(),original.title);
     await d.locator('.music-reader-cover').evaluate(img=>img.decode());
     const cover=await d.locator('.music-reader-cover').evaluate(img=>({loaded:img.complete&&img.naturalWidth>0,width:img.clientWidth,height:img.clientHeight,opacity:getComputedStyle(img).opacity,fit:getComputedStyle(img).objectFit}));
     assert(cover.loaded&&cover.width>0&&Math.abs(cover.width-cover.height)<=1&&cover.opacity==='1'&&cover.fit==='cover',JSON.stringify(cover));
     assert.equal(await page.locator('#music-about-panel .song-description').innerHTML(),original.about);
     assert(await d.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
     const order=await d.evaluate(el=>{const cover=el.querySelector('.music-reader-cover'),title=el.querySelector('#music-reader-title'),text=el.querySelector('.music-reader-text');return cover.getBoundingClientRect().bottom<=title.getBoundingClientRect().top+1&&title.getBoundingClientRect().bottom<=text.getBoundingClientRect().top+1;});assert(order);
     if(original.id==='hikari-no-arika')await shot(page,label+'-details');
     await page.locator('#music-lyrics-tab').click();assert.equal(await page.locator('#music-lyrics-panel .sound-song-lyrics').innerHTML(),original.lyrics);
     assert(await page.locator('#music-lyrics-panel p').evaluateAll(es=>es.every(e=>getComputedStyle(e).textAlign==='center')));
     await page.locator('.music-reader-close').click();await d.waitFor({state:'hidden'});
     assert.equal(await card.locator('.song-description').innerHTML(),original.about);assert.equal(await card.locator('.sound-song-lyrics').innerHTML(),original.lyrics);
    }
    await page.locator('#blue-sleep').scrollIntoViewIfNeeded();await page.locator('#blue-sleep .sound-song-cover').evaluate(img=>img.decode());await shot(page,label+'-blue-sleep');
    for(const [id,video] of urls){
     const drawer=page.locator('#'+id+' details');await drawer.locator('summary').click();
     await page.waitForFunction(id=>{const d=document.querySelector('#'+id+' details');return d.open&&d.getAnimations().length===0&&d.querySelector('summary').getAttribute('aria-expanded')==='true';},id);
     await page.locator('#'+id+' .xen-cinema-cover').click();
     const frame=page.locator('#'+id+' .video-container iframe');await frame.waitFor();assert((await frame.getAttribute('src')).includes('/'+video));
     let outcome={label,id,mounted:true,playing:false};
     if(engineName==='chromium'){
      try{const media=page.frameLocator('#'+id+' .video-container iframe').locator('video');await media.waitFor({timeout:15000});const initial=await media.evaluate(v=>({time:v.currentTime,paused:v.paused,error:v.error?.message}));await page.waitForTimeout(2000);const after=await media.evaluate(v=>({time:v.currentTime,paused:v.paused,error:v.error?.message}));outcome={...outcome,initial,after,playing:!after.paused&&after.time>initial.time};}catch(e){outcome.note=e.message.slice(0,240);}
     }
     playback.push(outcome);await shot(page,label+'-'+id+'-player');
     await drawer.locator('summary').click();await frame.waitFor({state:'detached'});
     await page.waitForFunction(id=>{const d=document.querySelector('#'+id+' details');return !d.open&&d.getAnimations().length===0&&d.querySelector('summary').getAttribute('aria-expanded')==='false';},id);
    }
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));assert.deepEqual(errors,[]);
    results.push({label,pass:true,releases:8,details:4,videos:2});console.log('PASS',label);
   }catch(e){await shot(page,label+'-failure');results.push({label,pass:false,error:e.stack});console.error('FAIL',label,e);}
   await context.close();
  }
  await browser.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify({results,playback},null,2));server.close();if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
