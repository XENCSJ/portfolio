/* End-to-end checks for the four SHOP galleries and existing purchase/navigation behavior. */
const {chromium,webkit,devices}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const products=JSON.parse(fs.readFileSync('xen-shop-gallery.json')).products;
const feed=JSON.parse(fs.readFileSync('base-products.json')).items;
const out=process.env.SHOP_QA_OUT||'shop-gallery-qa';fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpeg':'image/jpeg','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const f=path.resolve('.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!f.startsWith(process.cwd()+path.sep)||!fs.existsSync(f)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res)});
const results=[];let origin=process.env.SHOP_PUBLIC_URL||'http://127.0.0.1:8786/';
async function run(engine,profile,label){
 const browser=await engine.launch({headless:true,...(engine===chromium&&process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{}),...(engine===webkit&&process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE}:{})});const context=await browser.newContext(profile);
 await context.route(/googletagmanager|google-analytics|youtube|i.ytimg/,r=>r.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));console.log('START',label);
 try{
  await page.goto(origin+'apparel.html',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('[data-base-products]')?.getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('.catalog-product').count(),11);
  const order=['163232279','162561554','159175661','160077299','157787639','157783299','156849283','156850693','156851036','156851056'].map(id=>'base-product-'+id).concat('lapis-lazuli-ring');
  assert.deepEqual(await page.locator('.catalog-product').evaluateAll(es=>es.map(e=>e.id)),order);
  for(const item of feed.filter(x=>x.id!==160058456)){
   const card=page.locator('#base-product-'+item.id);
   assert((await card.locator(':scope>.base-product-price').innerText()).includes(item.price.toLocaleString('en-US')));
   assert.equal(await card.locator(':scope>.base-product-cta').getAttribute('href'),item.url);
  }
  for(const [key,p] of Object.entries(products)){
   assert.equal(await page.locator(`#base-product-${p.product_id} .base-product-visual img`).getAttribute('src'),p.images[0].src);
   await page.locator(`#base-product-${p.product_id} .base-product-visual img`).scrollIntoViewIfNeeded();
   await page.locator(`#base-product-${p.product_id} .base-product-visual img`).evaluate(i=>Promise.race([i.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('cover load timeout')),15000))]));
  }
  const catalog=page.locator('[data-base-grid]');await page.locator('.catalog-product').first().scrollIntoViewIfNeeded();
  await page.screenshot({path:`${out}/${label}-catalog.jpg`,type:'jpeg',quality:90});
  for(const [key,p] of Object.entries(products)){
   console.log('CHECK',label,key);
   const card=page.locator(`#base-product-${p.product_id} .base-product-visual`);
   await card.click();const d=page.locator('#graphic-'+key);await d.waitFor({state:'visible'});
   const current=d.locator('.xg-stage img.is-current');
   assert.equal(await current.getAttribute('src'),p.images[0].src);
   assert.deepEqual(await d.locator('.xg-stage img').evaluateAll(es=>es.map(i=>i.getAttribute('src'))),p.images.map(i=>i.src));
   assert.equal(await d.locator('[data-graphic-purchase]').getAttribute('href'),`https://xen.official.ec/items/${p.product_id}`);
   assert.equal(await d.locator('.xg-crosslink').getAttribute('href'),'./design.html#graphic-'+key);
   for(let n=0;n<p.images.length;n++){
    await d.locator(`[data-graphic-thumb="${n}"]`).click();
    assert.equal(await current.getAttribute('src'),p.images[n].src);
    await current.scrollIntoViewIfNeeded();
    await current.evaluate(i=>Promise.race([i.decode(),new Promise((_,reject)=>setTimeout(()=>reject(Error('slide load timeout')),15000))]));
    assert.equal(await current.evaluate(i=>getComputedStyle(i).objectFit),'contain');
    assert((await d.locator('[data-graphic-image-status]').innerText()).includes(`${n+1} / ${p.images.length}`));
    assert.equal(await current.evaluate(i=>i.naturalWidth),p.images[n].width);
   }
   await d.locator('[data-graphic-thumb="0"]').click();
   await d.locator('[data-graphic-next]').click();assert.equal(await current.getAttribute('src'),p.images[1].src);
   await d.locator('[data-graphic-prev]').click();assert.equal(await current.getAttribute('src'),p.images[0].src);
   await d.locator('.xg-stage').press('ArrowRight');assert.equal(await current.getAttribute('src'),p.images[1].src);
   await d.locator('.xg-stage').press('Home');
   if(engine===chromium&&profile.hasTouch){
    await d.locator('.xg-stage').scrollIntoViewIfNeeded();const r=await d.locator('.xg-stage').boundingBox();const cdp=await context.newCDPSession(page);
    const y=r.y+r.height/2;
    for(const direction of [-1,1]){
     const start=r.x+r.width*(direction<0?.8:.2);
     await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:start,y}]});
     for(let step=1;step<=6;step++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start+direction*step*18,y}]});
     await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     assert.equal(await current.getAttribute('src'),p.images[direction<0?1:0].src,'touch swipe');
    }
    await cdp.detach();
   }
   await d.locator('[data-graphic-thumb="2"]').click();
   await d.locator('[data-shop-enlarge]').click();const z=page.locator('.xsg-zoom');await z.waitFor({state:'visible'});
   assert.equal(await z.locator('img').getAttribute('src'),origin+p.images[2].src.slice(2));
   await z.locator('img').evaluate(i=>i.decode());
   await z.locator('[data-shop-magnify]').click();assert.equal(await z.locator('[data-shop-magnify]').getAttribute('aria-pressed'),'true');
   assert(await z.locator('.xsg-zoom-viewport').evaluate(e=>e.scrollWidth>e.clientWidth||e.scrollHeight>e.clientHeight),'zoom can pan');
   if(key==='kyakka-shoko')await page.screenshot({path:`${out}/${label}-zoom.jpg`,type:'jpeg',quality:90});
   await z.locator('[data-shop-zoom-close]').click();await z.waitFor({state:'hidden'});
   assert.equal(await current.getAttribute('src'),p.images[2].src);
   assert(await d.locator('[data-shop-enlarge]').evaluate(e=>e===document.activeElement));
   assert(await d.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'dialog overflow');
   await d.locator('[data-graphic-thumb="0"]').click();
   await d.evaluate(e=>{e.scrollTop=0;});
   await current.evaluate(i=>i.decode());
   await d.locator('.xg-stage').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
   assert.equal(await current.getAttribute('src'),p.images[0].src);
   assert((await d.locator('[data-graphic-image-status]').innerText()).includes(`1 / ${p.images.length}`));
   if(key==='state-of-mind'||key==='kyakka-shoko')await page.screenshot({path:`${out}/${label}-${key}.jpg`,type:'jpeg',quality:90});
   await d.locator('[data-graphic-next]').click();
   await d.locator('[data-graphic-close]').click();await d.waitFor({state:'hidden'});
   assert(await card.evaluate(e=>e===document.activeElement));
   await card.click();await d.waitFor({state:'visible'});assert.equal(await current.getAttribute('src'),p.images[0].src,'reopen at first image');
   await d.locator('[data-graphic-close]').press('Escape');await d.waitFor({state:'hidden'});
  }
  for(const [name,count] of [['APPAREL',7],['JEWELRY',4],['ALL',11]]){
   await page.getByRole('tab',{name,exact:true}).click();assert.equal(await page.locator('.catalog-product:visible').count(),count);
  }
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');
  assert.equal(await page.locator('.video-container>template').count(),3);
  await page.goto(origin+'apparel.html#graphic-kyakka-shoko');await page.locator('#graphic-kyakka-shoko').waitFor({state:'visible'});
  await page.locator('#graphic-kyakka-shoko [data-graphic-close]').click();await page.locator('#graphic-kyakka-shoko').waitFor({state:'hidden'});
  await page.goto(origin+'design.html#graphic-state-of-mind');await page.locator('#graphic-state-of-mind').waitFor({state:'visible'});
  assert.equal(await page.locator('.xsg-gallery').count(),0);assert.equal(await page.locator('#graphic-state-of-mind .xg-stage img').count(),2);
  assert.deepEqual(errors,[]);results.push({profile:label,status:'passed',products:4,images:22,errors});
 }catch(e){await page.screenshot({path:`${out}/FAIL-${label}.jpg`,type:'jpeg'}).catch(()=>{});fs.writeFileSync(`${out}/failure.json`,JSON.stringify({profile:label,error:e.stack},null,2));throw e;}finally{await browser.close();}
}
(async()=>{
 for(const p of Object.values(products))for(const i of p.images){assert.equal(crypto.createHash('sha256').update(fs.readFileSync(i.src)).digest('hex'),i.sha256);assert(fs.existsSync(i.thumbnail));}
 if(!process.env.SHOP_PUBLIC_URL)await new Promise(resolve=>server.listen(8786,'127.0.0.1',resolve));
 try{
  await run(chromium,{viewport:{width:1440,height:1000}},'desktop');
  await run(chromium,{...devices['iPhone 13'],defaultBrowserType:undefined},'mobile-chromium');
  await run(webkit,{...devices['iPhone 13'],defaultBrowserType:undefined},'mobile-webkit');
  await run(chromium,{viewport:{width:320,height:720},isMobile:true,hasTouch:true,reducedMotion:'reduce'},'mobile-320');
  fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results));
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
