/* node verify-music-platforms.cjs; Chromium + WebKit directory and MUSIC regression. */
const {chromium,webkit}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const expected=JSON.parse(fs.readFileSync('music-platforms-inventory.json','utf8'));
// WebKit rounds SVG naturalWidth/naturalHeight to rendered whole pixels.
// Check the actual official SVG viewBox / PNG IHDR, not that rounded API value.
const assetRatios=Object.fromEntries(expected.map(({asset})=>{const b=fs.readFileSync(asset);if(asset.endsWith('.svg')){const v=b.toString().match(/viewBox=["']([^"']+)["']/)[1].trim().split(/[ ,]+/).map(Number);return[asset,v[2]/v[3]];}assert.equal(b.toString('ascii',1,4),'PNG');return[asset,b.readUInt32BE(16)/b.readUInt32BE(20)];}));
const out='music-platforms-qa';fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const file=path.resolve('.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
const {execFileSync}=require('node:child_process');
const beforeSha='2251a8ced25edec4770013baf7f5ac82baecd828';
try{execFileSync('git',['cat-file','-e',beforeSha],{stdio:'ignore'});}catch{execFileSync('git',['fetch','--depth=1','origin',beforeSha],{stdio:'inherit'});}
const beforeHtml=execFileSync('git',['show',beforeSha+':sound.html']);
const beforeCss=execFileSync('git',['show',beforeSha+':xen-sound.css']);
fs.writeFileSync('music-logo-before.html',beforeHtml.toString().replace('xen-sound.css?v=20261025-platform1','music-logo-before.css'));
fs.writeFileSync('music-logo-before.css',beforeCss);
const results=[];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.MUSIC_BASE_URL||`http://127.0.0.1:${server.address().port}`;
if(process.env.MUSIC_WAIT_FOR_DEPLOY==='true'){
 const files=['sound.html','xen-sound.css',...new Set(expected.map(x=>x.asset))];
 const hash=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
 let ready=false;
 for(let attempt=0;attempt<30;attempt++){
  try{for(const f of files){const r=await fetch(base+'/'+f+'?logo-qa='+Date.now(),{signal:AbortSignal.timeout(20000)});assert(r.ok);assert.equal(hash(Buffer.from(await r.arrayBuffer())),hash(fs.readFileSync(f)),f);}ready=true;break;}catch(e){console.log('Waiting for Pages publication:',e.message.split('\n')[0]);await new Promise(r=>setTimeout(r,10000));}
 }
 assert(ready,'GitHub Pages did not serve the expected HTML, CSS and all logo bytes');
 console.log('PUBLICATION VERIFIED: HTML, CSS and every directory asset match this commit');
}
try{for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){const browser=await engine.launch();
try{for(const [width,height] of [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[375,667],[390,844],[430,932],[320,568],[390,500],[812,375]]){
const context=await browser.newContext({viewport:{width,height},isMobile:width<701,hasTouch:width<701,deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
try{
 await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});await page.locator('.music-reader-open').first().waitFor();
 // The load handler restores a deep link without focus; let it finish before testing a user navigation.
 await page.waitForLoadState('load');
 // Intro + verified BIG UP! release routing, checked at every Chromium/WebKit viewport.
 const introText=["日常の中で生まれる思考や感情。", "デザインをはじめとする視覚表現だけでは伝えきれない想いを、音楽と言葉にのせて形にしています。", "言葉にならない感覚や、心の奥にある感情。", "音楽には、そうした目に見えないものを伝える力があると感じています。"];
 const releaseURLs={"void-to-form": {"title": "VOID TO FORM", "bigup": "https://big-up.style/Inno3PlgIt", "spotify": "https://open.spotify.com/album/3gctpaDVfWyTIEOQqJCoJW", "apple-music": "https://music.apple.com/jp/album/void-to-form/1862015320?l=en&ls=1&app=music", "line-music": "https://music.line.me/launch?target=album&item=mb0000000004e379d1&cc=JP&v=1", "youtube-music": "https://music.youtube.com/playlist?list=OLAK5uy_nXY1X_13U3-6h7INr_4sOLwwIviNojBAI"}, "blue-sleep": {"title": "BLUE SLEEP", "bigup": "https://big-up.style/FNgAp3vScI", "spotify": "https://open.spotify.com/album/3Q44x33F8fkmWPARoD9x1D", "apple-music": "https://music.apple.com/jp/album/blue-sleep/1872882836?l=en&ls=1&app=music", "line-music": "https://music.line.me/launch?target=album&item=mb0000000004fbbc06&cc=JP&v=1", "youtube-music": "https://music.youtube.com/playlist?list=OLAK5uy_klyQLSz8qxzMTe5ZgyECFDOOd-kjT_VXg"}};
 assert.deepEqual(await page.locator('.music-intro > p').allTextContents(),introText);
 const intro=await page.locator('.music-intro').evaluate(e=>{
  const r=e.getBoundingClientRect(),h=document.querySelector('.hero h1').getBoundingClientRect(),c=document.querySelector('.sound-showcase').getBoundingClientRect();
  return {width:r.width,afterTitle:r.top>=h.bottom-1,beforeCarousel:r.bottom<=c.top+1,overflow:e.scrollWidth>e.clientWidth+1};
 });
 assert(intro.afterTitle&&intro.beforeCarousel&&!intro.overflow&&intro.width<=761,JSON.stringify(intro));
 const typography=e=>{const c=getComputedStyle(e);return Object.fromEntries(['fontFamily','fontSize','lineHeight','textAlign','whiteSpace','wordBreak','overflowWrap','lineBreak'].map(k=>[k,c[k]]));};
 const introType=await page.locator('.music-intro > p').first().evaluate(typography);
 const design=await context.newPage();
 try{await design.goto(base+'/design.html',{waitUntil:'load'});assert.deepEqual(introType,await design.locator('.hero .xen-description').evaluate(typography));}finally{await design.close();}
 assert.equal(introType.fontSize,'14px');assert.equal(introType.lineHeight,'28px');assert.equal(introType.textAlign,'left');
 for(const [id,urls] of Object.entries(releaseURLs)){
  const card=page.locator('#'+id);
  for(const [attr,key] of [['spotify','spotify'],['apple-music','appleMusic'],['line-music','lineMusic'],['youtube-music','youtubeMusic']]){
   const service=card.locator('.music-services [data-service="'+key+'"]');
   assert.equal(await service.getAttribute('href'),urls[attr]);
   assert.equal(await service.locator('.music-service-status').textContent(),'配信中 ↗');
   assert.equal(await service.getAttribute('target'),'_blank');
   assert.equal(await service.getAttribute('aria-disabled'),null);
  }
  const pending=card.locator('.music-services [data-service="youtube"]');
  assert.equal(await pending.getAttribute('href'),null);assert.equal(await pending.getAttribute('aria-disabled'),'true');
  assert.equal(await pending.locator('.music-service-status').textContent(),'準備中');
  assert.equal(await card.locator('.music-release-hub').getAttribute('href'),urls.bigup);
  assert.equal(await card.locator('.music-release-hub').getAttribute('target'),'_blank');
  assert.equal(await card.locator('.sound-artist').textContent(),'XEN');
 }
 if([1440,390].includes(width)&&height!==500){
  await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${out}/${engineName}-${width}-music-intro.png`});
  for(const id of Object.keys(releaseURLs)){
   const card=page.locator('#'+id);await card.scrollIntoViewIfNeeded();await card.locator('.sound-song-cover').evaluate(i=>i.decode());
   await card.screenshot({path:`${out}/${engineName}-${width}-${id}-links.png`});
  }
 }
 console.log(`PASS RELEASES ${engineName} ${width}: exact intro, DESIGN typography, 8 verified service URLs, 2 BIG UP! hubs, YouTube pending`);

 const entries=page.locator('#listen-download .sound-service');assert.equal(await entries.count(),23);
 assert.deepEqual(await entries.evaluateAll(es=>es.map(e=>({name:e.querySelector('.sound-service-name').textContent,href:e.getAttribute('href')}))),expected.map(x=>({name:x.name,href:x.href})));
 assert.equal(await page.locator('#sound-streaming .sound-service').count(),12);assert.equal(await page.locator('#sound-download .sound-service').count(),11);
 for(const group of await page.locator('.sound-platform-group').all()){
  await group.scrollIntoViewIfNeeded();
  await group.locator('img').evaluateAll(imgs=>{imgs.forEach(i=>i.loading='eager')});
  await page.waitForFunction(()=>[...document.querySelectorAll('.sound-service-logo img')].filter(i=>i.loading==='eager').every(i=>i.complete&&i.naturalWidth>0));
  const columns=await group.locator('.sound-service-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(columns,width>=1000?6:4);
 }
 const states=await entries.evaluateAll(es=>es.map(e=>{const c=getComputedStyle(e),i=e.querySelector('img'),ic=getComputedStyle(i),ir=i.getBoundingClientRect(),r=e.getBoundingClientRect(),n=e.querySelector('.sound-service-name'),nr=n.getBoundingClientRect();return{name:e.querySelector('.sound-service-name').textContent,src:i.getAttribute('src'),dimensions:[ir.width,ir.height,i.naturalWidth,i.naturalHeight],loaded:i.complete&&i.naturalWidth>0,box:[r.width,r.height],border:c.borderTopWidth,bg:c.backgroundColor,shadow:c.boxShadow,radius:c.borderRadius,opacity:c.opacity,filter:ic.filter,fit:ic.objectFit,ratio:ir.width/ir.height,natural:i.naturalWidth/i.naturalHeight,inside:nr.left>=r.left-1&&nr.right<=r.right+1,noTextOverflow:n.scrollWidth<=n.clientWidth+1,href:e.getAttribute('href'),target:e.getAttribute('target'),rel:e.getAttribute('rel'),status:e.querySelector('.sound-service-status')?.textContent};}));
 for(const s of states){assert(s.loaded);assert.equal(s.border,'0px');assert.equal(s.bg,'rgba(0, 0, 0, 0)');assert.equal(s.shadow,'none');assert.equal(s.radius,'0px');assert.equal(s.opacity,'1');assert.equal(s.filter,'none');assert.equal(s.fit,'contain');assert(Math.abs(s.ratio-assetRatios[s.src.replace(/^\.\//,'')])<.02,JSON.stringify({engineName,width,...s}));assert(s.inside&&s.noTextOverflow);assert(s.box[0]>=44&&s.box[1]>=44);if(s.href){assert.equal(s.target,'_blank');assert(s.rel.includes('noopener')&&s.rel.includes('noreferrer'));assert.equal(s.status,undefined);}else assert.equal(s.status,'リンク未確認');}
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(0, 0, 0)');

 const alpha=await page.locator('#listen-download .sound-service-logo img').evaluateAll(imgs=>imgs.map(i=>{const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(i,0,0,64,64);const d=x.getImageData(0,0,64,64).data;let transparent=0;for(let k=3;k<d.length;k+=4)if(d[k]<16)transparent++;return{src:i.getAttribute('src'),transparent};}));
 for(const a of alpha){if(/rakuten|kkbox-transparent|dhits|tiktok|oricon-transparent|mumo|rekochoku|mysound-transparent|musicjp/.test(a.src))assert(a.transparent>10,'Missing real alpha: '+a.src);}
 const current=page.url();await page.locator('.sound-service-unverified').first().click();assert.equal(page.url(),current);assert.equal(context.pages().length,1);
 await page.locator('#sound-streaming a.sound-service').first().focus();assert.equal(await page.locator('#sound-streaming a.sound-service').first().evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 // Protect the independent catalogue icons, carousel, genres and reader.
 assert.equal(await page.locator('.sound-release-card').count(),8);assert.equal(await page.locator('.sound-release-card > .music-services .music-service-icon').count(),40);
 assert(await page.locator('.sound-release-card > .music-services .music-service-icon').evaluateAll(es=>es.every(e=>getComputedStyle(e).color==='rgb(255, 255, 255)')));
 assert.equal(await page.locator('.sound-slide').count(),8);await page.locator('.sound-showcase-stage').focus();const active=await page.locator('.sound-slide[data-position="active"] img').getAttribute('src');await page.keyboard.press('ArrowRight');await page.waitForFunction(src=>document.querySelector('.sound-slide[data-position="active"] img').getAttribute('src')!==src,active);
 const genre=page.locator('.sound-category-drawer').first();await genre.locator('summary').click();await page.waitForFunction(()=>document.querySelector('.sound-category-drawer').open);assert.equal(await page.locator('.music-index-link').count(),8);await genre.locator('summary').click();
 assert.equal(await page.locator('#blue-sleep .video-container').count(),2);assert.equal(await page.locator('.music-player-drawer').count(),6);assert.equal(await page.locator('#blue-sleep .music-player-drawer[data-service="youtube"]').count(),1);
 // Album identity is independent of the preserved YouTube video title/URL.
 assert.equal(await page.locator('#nights-awakening-title').textContent(),'PURPLE AWAKE');
 assert.equal(await page.locator('.music-index-link[href="#nights-awakening"] .music-index-title').textContent(),'PURPLE AWAKE');
 assert((await page.locator('.sound-slide[data-release-id="nights-awakening"]').getAttribute('aria-label')).startsWith('PURPLE AWAKE'));
 assert.equal(await page.locator('#nights-awakening template').evaluate(e=>e.content.querySelector('iframe').title),"NIGHT'S AWAKENING");
 assert.equal(await page.locator('#nights-awakening .video-source').getAttribute('href'),'https://youtu.be/uqQI6369VYg');
 const edm=page.locator('.sound-category-drawer[data-genre-section="edm-electronic"]');await edm.locator('summary').click();await page.locator('.music-index-link[href="#nights-awakening"]').click();await page.waitForFunction(()=>document.activeElement?.id==='nights-awakening');assert(page.url().endsWith('#nights-awakening'));assert.equal(await page.locator('#music-reader').isVisible(),false);
 const readers=page.locator('.music-reader-open');assert.equal(await readers.count(),4);
 const sourceText=await page.locator('.sound-release-card').evaluateAll(cs=>cs.map(c=>[c.id,[...c.querySelectorAll('.song-description,.sound-song-lyrics')].map(n=>n.innerHTML)]));
 for(let r=0;r<await readers.count();r++){
  await readers.nth(r).click();const dialog=page.locator('#music-reader');await dialog.waitFor({state:'visible'});
  // Public CDN images may decode after dialog.showModal(); measure the settled artwork.
  await dialog.locator('.music-reader-cover').evaluate(async image=>{await image.decode();await document.fonts.ready;});
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.equal(await dialog.locator('.music-services').count(),0);
  const fixed=()=>dialog.evaluate(d=>[...d.querySelectorAll('.music-reader-toolbar,.music-reader-cover,#music-reader-title,.sound-artist,.sound-song-credit,.music-reader-tabs')].map(e=>{const r=e.getBoundingClientRect();return[r.x,r.y,r.width,r.height]}));
  const before=await fixed();const tabs=dialog.getByRole('tab');assert.equal(await tabs.count(),2);
  for(let t=0;t<await tabs.count();t++){
   await tabs.nth(t).click();const panel=dialog.locator('.music-reader-panel:not([hidden])');
   assert.equal(await panel.evaluate(e=>e.scrollTop),0);
   const metrics=await dialog.evaluate(d=>{const p=d.querySelector('.music-reader-panel:not([hidden])'),c=d.querySelector('.music-reader-cover'),r=d.getBoundingClientRect();return{dialog:[r.top,r.bottom],overflow:getComputedStyle(d).overflowY,panel:p.clientHeight,panelOverflow:getComputedStyle(p).overflowY,square:Math.abs(c.getBoundingClientRect().width-c.getBoundingClientRect().height),body:getComputedStyle(document.body).position};});
   assert(metrics.dialog[0]>=-1&&metrics.dialog[1]<=height+1);assert.equal(metrics.overflow,'hidden');assert.equal(metrics.body,'fixed');assert.equal(metrics.panelOverflow,'auto');assert(metrics.panel>=Math.min(180,height*.3),JSON.stringify(metrics));assert(metrics.square<1);
   assert.equal(await panel.locator(t===0?'.song-description':'.sound-song-lyrics').evaluate(e=>getComputedStyle(e).textAlign),t===0?'left':'center');
   await panel.focus();await page.keyboard.press('End');await page.waitForFunction(()=>{const e=document.querySelector('.music-reader-panel:not([hidden])');return Math.abs(e.scrollHeight-e.clientHeight-e.scrollTop)<2;});
   assert.deepEqual(await fixed(),before);assert.equal(await dialog.evaluate(e=>e.scrollTop),0);
   await panel.evaluate(e=>e.scrollTop=e.scrollHeight);await tabs.nth(1-t).click();await tabs.nth(t).click();assert.equal(await panel.evaluate(e=>e.scrollTop),0);
  }
  if(r===1&&[1440,390].includes(width)&&height!==500){await tabs.nth(1).click();await page.screenshot({path:`${out}/${engineName}-${width}-fixed-reader.png`});}
  await dialog.getByRole('button',{name:'楽曲詳細を閉じる'}).click();await dialog.waitFor({state:'hidden'});
  // dialog.close() hides synchronously; its close event restores authored nodes on the next task.
  await page.waitForFunction(()=>![...document.querySelectorAll('.music-reader-open')].some(e=>e.getAttribute('aria-expanded')==='true'));
 }
 assert.deepEqual(await page.locator('.sound-release-card').evaluateAll(cs=>cs.map(c=>[c.id,[...c.querySelectorAll('.song-description,.sound-song-lyrics')].map(n=>n.innerHTML)])),sourceText);

 if([1440,390].includes(width)&&height!==500) await require('./verify-music-links.cjs')(page,context,{engineName,width,out});
 for(const id of ['sound-streaming','sound-download']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.locator('#'+id).screenshot({path:`${out}/${engineName}-${width}-${height}-${id}.png`});}
 if(!process.env.MUSIC_BASE_URL && [1440,390].includes(width)&&height!==500){await page.goto(base+'/music-logo-before.html',{waitUntil:'load'});for(const id of ['sound-streaming','sound-download']){const g=page.locator('#'+id);await g.scrollIntoViewIfNeeded();await g.locator('img').evaluateAll(is=>is.forEach(i=>i.loading='eager'));await page.waitForFunction(()=>[...document.querySelectorAll('#listen-download img')].filter(i=>i.loading==='eager').every(i=>i.complete&&i.naturalWidth));await g.screenshot({path:`${out}/${engineName}-${width}-before-${id}.png`});}}
 assert.deepEqual(errors,[]);results.push({engine:engineName,width,height,status:'passed'});console.log(`PASS ${engineName} ${width}x${height}: 23 logos, 14 URLs, 9 disabled, ${width>=1000?6:4} columns; MUSIC regression + four fixed readers`);
}catch(error){await page.screenshot({path:`${out}/${engineName}-${width}x${height}-failure.png`});throw error;}finally{await context.close();}
}}finally{await browser.close();}}
}finally{server.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
