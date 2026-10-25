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
const results=[];
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=process.env.MUSIC_BASE_URL||`http://127.0.0.1:${server.address().port}`;
try{for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){const browser=await engine.launch();
try{for(const [width,height] of [[1920,1080],[1440,900],[1280,800],[1024,768],[768,1024],[375,667],[390,844],[430,932],[320,568]]){
const context=await browser.newContext({viewport:{width,height},isMobile:width<701,hasTouch:width<701,deviceScaleFactor:1,reducedMotion:'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
try{
 await page.goto(base+'/sound.html',{waitUntil:'domcontentloaded'});await page.locator('.music-reader-open').first().waitFor();
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
 const current=page.url();await page.locator('.sound-service-unverified').first().click();assert.equal(page.url(),current);assert.equal(context.pages().length,1);
 await page.locator('#sound-streaming a.sound-service').first().focus();assert.equal(await page.locator('#sound-streaming a.sound-service').first().evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 // Protect the independent catalogue icons, carousel, genres and reader.
 assert.equal(await page.locator('.sound-release-card').count(),8);assert.equal(await page.locator('.sound-release-card > .music-services .music-service-icon').count(),40);
 assert(await page.locator('.sound-release-card > .music-services .music-service-icon').evaluateAll(es=>es.every(e=>getComputedStyle(e).color==='rgb(255, 255, 255)')));
 assert.equal(await page.locator('.sound-slide').count(),8);await page.locator('.sound-showcase-stage').focus();const active=await page.locator('.sound-slide[data-position="active"] img').getAttribute('src');await page.keyboard.press('ArrowRight');await page.waitForFunction(src=>document.querySelector('.sound-slide[data-position="active"] img').getAttribute('src')!==src,active);
 const genre=page.locator('.sound-category-drawer').first();await genre.locator('summary').click();await page.waitForFunction(()=>document.querySelector('.sound-category-drawer').open);assert.equal(await page.locator('.music-index-link').count(),8);await genre.locator('summary').click();
 assert.equal(await page.locator('#blue-sleep .video-container').count(),2);assert.equal(await page.locator('.music-player-drawer').count(),7);
 await page.locator('#hikari-no-arika .music-reader-open').click();await page.locator('#music-reader').waitFor({state:'visible'});assert.equal(await page.locator('#music-reader .music-services').count(),0);await page.locator('#music-lyrics-tab').click();assert.equal(await page.locator('#music-lyrics-tab').getAttribute('aria-selected'),'true');await page.keyboard.press('Escape');await page.locator('#music-reader').waitFor({state:'hidden'});
 if([1440,390].includes(width)){for(const id of ['sound-streaming','sound-download']){await page.locator('#'+id).scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${engineName}-${width}-${id}.png`});}}
 assert.deepEqual(errors,[]);results.push({engine:engineName,width,height,status:'passed'});console.log(`PASS ${engineName} ${width}x${height}: 23 logos, 14 URLs, 9 disabled, ${width>=1000?6:4} columns; MUSIC regression`);
}finally{await context.close();}
}}finally{await browser.close();}}
}finally{server.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);process.exitCode=1;});
