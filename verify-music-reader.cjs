/* MUSIC reader regression coverage; CI runs Chromium and WebKit against all eight releases. */
const {chromium, webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const out='music-reader-qa';fs.mkdirSync(out,{recursive:true});
const profiles=[[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[375,667],[390,844],[430,932],[375,568],[320,480],[844,390]];
const results=[],source=fs.readFileSync('sound.html','utf8');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const file=path.join(process.cwd(),decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!file.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(e,data)=>{if(e){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(data);});
});
async function squares(locator){
 const values=await locator.evaluateAll(els=>els.map(el=>{const s=getComputedStyle(el);return {width:parseFloat(s.width),height:parseFloat(s.height),fit:s.objectFit,position:s.objectPosition,src:el.getAttribute('src')};}));
 for(const v of values){assert(v.width>0&&Math.abs(v.width-v.height)<.6,JSON.stringify(v));if(v.src){assert.equal(v.fit,'cover');assert.equal(v.position,'50% 50%');}}
 return values;
}
async function shot(page,name){await page.screenshot({path:`${out}/${name}.jpg`,type:'jpeg',quality:88});}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=process.env.MUSIC_BASE_URL||`http://127.0.0.1:${server.address().port}`;
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]].filter(([name])=>!process.env.QA_ENGINE||process.env.QA_ENGINE===name)){
  const browser=await engine.launch(process.env.QA_EXECUTABLE?{executablePath:process.env.QA_EXECUTABLE,args:['--no-sandbox']}:{});
  for(const [width,height] of profiles.filter(([w])=>!process.env.QA_WIDTHS||process.env.QA_WIDTHS.split(',').includes(String(w)))){
   const context=await browser.newContext({viewport:{width,height},isMobile:width<701,hasTouch:width<701,deviceScaleFactor:1});
   context.setDefaultTimeout(15000);
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   // Avoid third-party playback/analytics during deterministic UI checks; URLs and nodes are checked separately.
   await page.route(/googletagmanager|google-analytics|open\.spotify\.com\/embed|youtube-nocookie|i\.ytimg\.com|youtube\.com\/(iframe_api|s\/player)/,r=>r.abort());
   const label=`${engineName}-${width}x${height}`;
   try{
    await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});
    await page.locator('.music-reader-open').first().waitFor();
    const originals=await page.locator('.sound-release-card').evaluateAll(cards=>cards.map(c=>({id:c.id,title:c.querySelector('h3').textContent,about:c.querySelector('.song-description')?.innerHTML,lyrics:c.querySelector('.sound-song-lyrics')?.innerHTML,cover:c.querySelector('.sound-song-cover').getAttribute('src')})));
    assert.equal(originals.length,8);assert.equal(await page.locator('.sound-slide').count(),8);assert.equal(await page.locator('.sound-category-drawer').count(),3);
    const rows=await page.locator('.sound-release-card > .music-services').evaluateAll(rows=>rows.map(row=>[...row.children].map(li=>({key:li.firstElementChild.dataset.service,name:li.querySelector('.music-service-name').textContent,href:li.firstElementChild.getAttribute('href'),status:li.querySelector('.music-service-status').textContent}))));
    for(const row of rows){assert.deepEqual(row.map(x=>x.name),['Spotify','Apple Music','YouTube','LINE MUSIC','YouTube Music']);for(const x of row)assert.equal(x.status,x.href?'配信中 ↗':'準備中');}
    assert.deepEqual(rows.map(r=>r.filter(x=>x.href).length),[0,0,0,0,4,5,1,4]);
    await page.locator('.sound-song-cover,.sound-slide img,.sound-service-logo img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return Promise.race([img.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Image decode timeout: '+img.src)),15000))]);})));
    await squares(page.locator('.sound-release-card .sound-cover-frame'));
    await squares(page.locator('.sound-release-card .sound-song-cover'));
    await squares(page.locator('.sound-slide,.sound-slide-art,.sound-slide img'));
    const brands=await page.locator('.sound-service-logo img').evaluateAll(imgs=>imgs.map(img=>({src:img.getAttribute('src'),filter:getComputedStyle(img).filter,fit:getComputedStyle(img).objectFit,loaded:img.complete&&img.naturalWidth>0,width:img.clientWidth,height:img.clientHeight,nw:img.naturalWidth,nh:img.naturalHeight})));
    assert.equal(brands.length,23);assert.equal(await page.locator('.sound-service-logo svg').count(),0);
    // Compare pixel dimensions: clientWidth/clientHeight and SVG natural sizes are integer-rounded, especially in WebKit.
    for(const brand of brands){assert(brand.loaded);assert.equal(brand.filter,'none');assert.equal(brand.fit,'contain');assert(brand.width>0&&brand.height>0&&Math.abs(brand.height-brand.width*brand.nh/brand.nw)<=1.1,JSON.stringify(brand));}
    assert.equal(await page.locator('.sound-release-card > .music-services .music-service-icon').count(),40);
    assert(await page.locator('.sound-release-card > .music-services .music-service-icon').evaluateAll(icons=>icons.every(i=>getComputedStyle(i).color==='rgb(255, 255, 255)')));
    assert(await page.locator('.sound-slide').evaluateAll(els=>els.every(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)')));
    if([1440,390].includes(width)){
     await page.locator('.sound-showcase').scrollIntoViewIfNeeded();await shot(page,label+'-carousel');
     for(const id of ['hikari-no-arika','sora-ni-tokeru']){await page.locator('#'+id).scrollIntoViewIfNeeded();await shot(page,label+'-'+id+'-card');}
     await page.locator('#listen-download').scrollIntoViewIfNeeded();await shot(page,label+'-streaming');
     await page.locator('.sound-platform-group').last().scrollIntoViewIfNeeded();await shot(page,label+'-download');
    }

    assert.equal(await page.locator('.sound-media-accordion').count(),0);assert.equal(await page.locator('.music-playback').count(),4);
    assert.equal(await page.locator('.music-playback iframe[data-music-src*="spotify"]').count(),3);
    assert.equal(await page.locator('.music-player-drawer').count(),6);
    assert.equal(await page.locator('.music-player-drawer[open]').count(),0);
    assert.equal(await page.locator('.music-playback .video-container').count(),4);
    assert.equal(await page.locator('.music-genre-videos .video-container').count(),0);
    assert.equal(await page.locator('#blue-sleep .video-container').count(),2);
    assert.equal(await page.locator('.music-reader-open').count(),4);
    await page.locator('.sound-release-card > .music-services img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
    await page.locator('.music-playback,.music-genre-videos').evaluateAll(els=>{
     window.__musicPlaybackNodes=els.flatMap(el=>[el,...el.querySelectorAll('iframe,template,.video-container')]).map(node=>({node,parent:node.parentNode,source:node.getAttribute('src')}));
    });
    for(const original of originals){
     const card=page.locator('#'+original.id),open=card.locator('.music-reader-open');
     if(!original.about&&!original.lyrics){assert.equal(await open.count(),0);continue;}
     const drawer=card.locator('.music-text-drawer');
     const aboutPanel=card.locator('#'+original.id+'-about-content');
     const lyricsPanel=card.locator('#'+original.id+'-lyrics-content');
     const aboutTab=card.locator('#'+original.id+'-about-tab');
     const lyricsTab=card.locator('#'+original.id+'-lyrics-tab');
     await open.click();await aboutPanel.waitFor({state:'visible'});
     await page.waitForFunction(id=>!document.querySelector('#'+id+' .music-text-drawer').getAnimations().some(a=>a.playState==='running'),original.id);
     assert(await drawer.evaluate(d=>d.open));assert.equal(await page.locator('dialog[open]').count(),0);
     assert.equal(await open.getAttribute('aria-expanded'),'true');
     assert.equal(await open.getAttribute('aria-controls'),original.id+'-details');
     assert.equal(await aboutPanel.locator('.song-description').innerHTML(),original.about);
     assert.equal(await drawer.locator('iframe,template,details,.music-playback').count(),0);
     assert.equal(await drawer.getByText('楽曲解説は未掲載です。',{exact:true}).count(),0);
     assert(await page.evaluate(()=>window.__musicPlaybackNodes.every(({node,parent,source})=>node.isConnected&&node.parentNode===parent&&node.getAttribute('src')===source)),'reader must not relocate or replace any player');
     const geometry=await drawer.evaluate(d=>{const p=d.querySelector('[role="tabpanel"]'),a=p.querySelector('.song-description p');return {overflow:d.scrollWidth>d.clientWidth+1,pageOverflow:document.documentElement.scrollWidth>innerWidth+1,panel:p.clientHeight,bottom:p.getBoundingClientRect().bottom,end:d.getBoundingClientRect().bottom,font:getComputedStyle(a).fontSize,line:getComputedStyle(a).lineHeight};});
     assert(!geometry.overflow&&!geometry.pageOverflow,JSON.stringify(geometry));assert(geometry.panel>0,`${label}: empty reading area`);assert(geometry.bottom<=geometry.end+1);assert.equal(geometry.font,'14px');assert(Math.abs(parseFloat(geometry.line)-28)<.01);
     await lyricsTab.click();assert.equal(await lyricsPanel.locator('.sound-song-lyrics').innerHTML(),original.lyrics);
     assert(await lyricsPanel.locator('.sound-lyric-section p').evaluateAll(es=>es.every(e=>getComputedStyle(e).textAlign==='center')));
     if(width>=1280){const firstVerse=await lyricsPanel.locator('.sound-lyric-section p').first().evaluate(p=>({height:p.getBoundingClientRect().height,line:parseFloat(getComputedStyle(p).lineHeight),lines:p.querySelectorAll('br').length+1}));assert(Math.abs(firstVerse.height-firstVerse.line*firstVerse.lines)<2,'authored lyric breaks must render once');}
     await lyricsPanel.locator('p').last().scrollIntoViewIfNeeded();
     assert(await lyricsPanel.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
     await lyricsTab.focus();await page.keyboard.press('ArrowLeft');assert.equal(await aboutTab.getAttribute('aria-selected'),'true');
     await page.keyboard.press('End');assert.equal(await lyricsTab.getAttribute('aria-selected'),'true');await page.keyboard.press('Home');
     if(['hikari-no-arika','sora-ni-tokeru'].includes(original.id)&&[1440,390,375].includes(width)){
      await open.scrollIntoViewIfNeeded();await shot(page,label+'-'+original.id+'-about');await lyricsTab.click();await open.scrollIntoViewIfNeeded();await shot(page,label+'-'+original.id+'-lyrics');
     }
     await lyricsTab.focus();await page.keyboard.press('Escape');
     await page.waitForFunction(id=>!document.querySelector('#'+id+' .music-text-drawer').open,original.id);
     assert.equal(await open.getAttribute('aria-expanded'),'false');
     assert(await open.evaluate(el=>document.activeElement===el));
     assert.equal(await card.locator('.song-description').innerHTML(),original.about);assert.equal(await card.locator('.sound-song-lyrics').innerHTML(),original.lyrics);
    }
    await page.locator('.sound-category-drawer').first().locator('summary').click();await page.locator('.sound-category-links a').first().click();await page.waitForFunction(()=>document.activeElement?.id==='tochu-no-mamade');assert(page.url().endsWith('#tochu-no-mamade'));assert.equal(await page.locator('dialog[open]').count(),0);assert(await page.locator('.sound-category-drawer').first().evaluate(el=>el.open));
    await page.locator('.sound-category-drawer').first().locator('summary').click();
    const stage=page.locator('.sound-showcase-stage');await stage.scrollIntoViewIfNeeded();const previous=await stage.getAttribute('data-active-release');await page.locator('.sound-slide[data-position="next"]').click();assert.notEqual(await stage.getAttribute('data-active-release'),previous);
    const afterTap=await stage.getAttribute('data-active-release');
    await stage.dispatchEvent('pointerdown',{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:260,clientY:150});
    await stage.dispatchEvent('pointerup',{pointerId:1,pointerType:'touch',isPrimary:true,button:0,clientX:100,clientY:152});
    assert.notEqual(await stage.getAttribute('data-active-release'),afterTap);
    if(width===1440){
     await page.locator('h1').click();await page.mouse.move(0,0);
     const beforeAuto=await stage.getAttribute('data-active-release');
     await page.waitForFunction(id=>document.querySelector('.sound-showcase-stage').dataset.activeRelease!==id,beforeAuto,{timeout:8000});
    }
    const ids=await page.locator('[id]').evaluateAll(els=>els.map(e=>e.id));assert.equal(new Set(ids).size,ids.length);
    assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1));
    if([1440,390].includes(width)){
     await page.locator('#nova-pulse').scrollIntoViewIfNeeded();await shot(page,label+'-playback');
    }
    // One-tap activation must mount the original video in its existing page section.
    await page.locator('#nova-pulse .music-player-drawer[data-service="youtube"] > summary').click();
    await page.locator('#nova-pulse .xen-cinema-cover').click();
    const frame=page.locator('#nova-pulse .video-container iframe');await frame.waitFor();assert((await frame.getAttribute('src')).includes('/TpUbm4xbmVc'));
    await page.locator('#nova-pulse .music-player-drawer[data-service="youtube"] > summary').click();
    await frame.waitFor({state:'detached'});
    assert.deepEqual(errors,[]);results.push({label,pass:true,releases:8});console.log('PASS',label);
   }catch(e){await shot(page,label+'-failure');results.push({label,pass:false,error:e.stack});console.error('FAIL',label,e);}
   await context.close();
  }
  // Edge cases for future releases: about-only, lyrics-only, whitespace and exact placeholders.
  for(const [name,about,lyrics,count] of [['about-only','<p>実際の楽曲解説。</p>','',1],['lyrics-only','', '<p>一行目<br>二行目</p>',1],['empty',' \n\t ','',0],['placeholder','<p>楽曲解説は未掲載です。</p>','<p>歌詞は未掲載です。</p>',0],['valid-word','<p>未掲載の手紙をテーマにした曲。</p>','',1]]){
   const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
   await page.route('**/sound.html',r=>r.fulfill({contentType:'text/html',body:source.replace(/(<article\b[^>]*id="tochu-no-mamade"[\s\S]*?<\/article>)/,card=>card.replace(/<div class="song-description">[\s\S]*?<\/div>/,`<div class="song-description">${about}</div>`).replace(/<div aria-label="途中のままで 歌詞全文" class="sound-song-lyrics">[\s\S]*?<\/div>/,`<div class="sound-song-lyrics">${lyrics}</div>`))}));
   const label=engineName+'-'+name;
   try{
    await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});await page.locator('#tochu-no-mamade.music-reader-ready').waitFor();
    const button=page.locator('#tochu-no-mamade .music-reader-open');assert.equal(await button.count(),count);
    if(count){await button.click();const drawer=page.locator('#tochu-no-mamade .music-text-drawer');assert.equal(await drawer.locator('[role="tablist"]').count(),0);assert.equal(await drawer.locator('.music-reader-panel').count(),1);assert.equal(await drawer.locator('.music-reader-tabs h4').count(),1);assert.equal(await page.locator('dialog[open]').count(),0);}
    results.push({label,pass:true});console.log('PASS',label);
   }catch(e){results.push({label,pass:false,error:e.stack});console.error('FAIL',label,e);}await context.close();
  }
  await browser.close();
 }
 fs.writeFileSync(out+'/results.json',JSON.stringify(results,null,2));server.close();if(results.some(r=>!r.pass))process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
