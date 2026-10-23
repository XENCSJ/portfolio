// Verify real catalog data, tab behavior, keyboard control and responsive layout.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const ids=[157787639,157783299,156849283,156850693,156851036,156851056];
const catalog=JSON.parse(fs.readFileSync('base-products.json'));
const origin=process.env.SHOP_PUBLIC_URL||'http://127.0.0.1:8767/';
const out=process.env.SHOP_QA_DIR||'shop-qa';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let file=path.resolve(decodeURIComponent(new URL(req.url,'http://localhost').pathname.slice(1)));if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
(async()=>{
if(!process.env.SHOP_PUBLIC_URL)await new Promise(resolve=>server.listen(8767,'127.0.0.1',resolve));
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const results=[];
try{
for(const width of [320,375,390,430,768,1440]){
const page=await browser.newPage({viewport:{width,height:width<650?1100:1800},reducedMotion:'reduce',isMobile:width<650,hasTouch:width<650});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route(/googletagmanager|google-analytics/,r=>r.abort());
// Optional byte-identical CDN cache for environments without image-CDN access.
if(process.env.SHOP_IMAGE_CACHE)for(const item of catalog.items.filter(i=>ids.slice(0,3).includes(i.id)))await page.route(url=>url.href===item.image_url,r=>r.fulfill({path:path.join(process.env.SHOP_IMAGE_CACHE,`${item.id}.jpg`),contentType:'image/jpeg'}));
await page.goto(origin+'apparel.html',{waitUntil:'domcontentloaded'});
await page.waitForSelector('.catalog-product');
const visible=()=>page.locator('.catalog-product:visible');
assert.equal(await visible().count(),6);
assert.deepEqual(await visible().evaluateAll(es=>es.map(e=>Number(e.id.replace('base-product-','')))),ids);
assert.deepEqual(await page.locator('.catalog-product>.base-product-cta').evaluateAll(es=>es.map(e=>e.href)),ids.map(id=>`https://xen.official.ec/items/${id}`));
for(const id of ids){const item=catalog.items.find(i=>i.id===id);assert.ok((await page.locator(`#base-product-${id}>.base-product-price`).innerText()).includes(item.price.toLocaleString('en-US')));}
assert.equal(await page.locator('[data-base-grid]').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
const layout=await visible().evaluateAll(es=>es.map(e=>({y:e.getBoundingClientRect().top,img:e.querySelector('.base-product-visual').getBoundingClientRect().toJSON(),price:e.querySelector(':scope>.base-product-price').getBoundingClientRect().top,button:e.querySelector(':scope>.base-product-cta').getBoundingClientRect().toJSON()})));
for(let i=0;i<6;i+=3)for(const a of layout.slice(i,i+3)){assert.ok(Math.abs(a.img.width-a.img.height)<1);assert.ok(Math.abs(a.price-layout[i].price)<1);assert.ok(Math.abs(a.button.y-layout[i].button.y)<1);assert.ok(a.button.height>=44);}
await page.getByRole('tab',{name:'APPAREL',exact:true}).click();assert.equal(await visible().count(),3);
assert.equal(await page.locator('.catalog-jewelry:visible').count(),0);
await page.getByRole('tab',{name:'APPAREL',exact:true}).press('ArrowRight');
assert.equal(await page.getByRole('tab',{name:'JEWELRY'}).getAttribute('aria-selected'),'true');assert.equal(await visible().count(),3);
assert.equal(await page.getByRole('tab',{name:'JEWELRY'}).evaluate(e=>getComputedStyle(e).color),'rgb(197, 160, 89)');
assert.equal(await page.getByRole('tab',{name:'JEWELRY'}).evaluate(e=>getComputedStyle(e,'::after').backgroundColor),'rgb(197, 160, 89)');
for(const id of ids.slice(3)){
const summary=page.locator(`#base-product-${id} summary`);await summary.press('Enter');assert.equal(await summary.getAttribute('aria-expanded'),'true');
assert.equal(await page.locator(`#base-product-${id} .jewelry-store`).getAttribute('href'),`https://xen.official.ec/items/${id}`);
assert.ok(await page.locator(`#base-product-${id} .jewelry-description`).isVisible());
assert.equal(await page.evaluate(()=>[...document.querySelectorAll('.catalog-product:not([hidden]),.jewelry-inner')].filter(e=>e.getBoundingClientRect().width).some(e=>e.scrollWidth>e.clientWidth+1)),false);
await summary.press('Enter');assert.equal(await summary.getAttribute('aria-expanded'),'false');
}
// Existing nodes and disclosure state survive category changes.
await page.locator('#base-product-156850693 summary').click();
await page.getByRole('tab',{name:'APPAREL',exact:true}).click();await page.getByRole('tab',{name:'JEWELRY'}).click();
assert.equal(await page.locator('#base-product-156850693 summary').getAttribute('aria-expanded'),'true');await page.locator('#base-product-156850693 summary').click();
await page.getByRole('tab',{name:'JEWELRY'}).press('Home');assert.equal(await visible().count(),6);
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
assert.equal(await visible().evaluateAll(es=>es.some(e=>e.scrollWidth>e.clientWidth+1)),false);
assert.deepEqual(errors,[]);
// Screenshot actual loaded assets only; never substitute fixture imagery.
await page.locator('.catalog-product img').evaluateAll(es=>{es.forEach(e=>e.loading='eager');return Promise.all(es.map(e=>e.decode().catch(()=>null)));});
const imageCount=await page.locator('.catalog-product img').evaluateAll(es=>es.filter(e=>e.complete&&e.naturalWidth>0).length);
await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${out}/shop-${width}.png`});
results.push({width,categories:[6,3,3],columns:3,drawerChecks:3,horizontalOverflow:false,keyboard:true,alignedRows:true,imagesLoaded:imageCount,errors});
if(width===390){
await page.emulateMedia({reducedMotion:'no-preference'});
await page.getByRole('tab',{name:'JEWELRY'}).click();
const timings=await visible().evaluateAll(es=>es.flatMap(e=>e.getAnimations().map(a=>a.effect.getTiming())));
assert.ok(timings.length>0);assert.ok(timings.every(t=>t.duration===400&&t.easing==='ease-out'));
await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>[...document.querySelectorAll('.catalog-product')].every(e=>e.getAnimations().length===0));
for(let i=0;i<9;i++)await page.getByRole('tab',{name:['ALL','APPAREL','JEWELRY'][i%3],exact:true}).click();assert.equal(await visible().count(),3);
await page.reload();await page.waitForSelector('.catalog-product');assert.equal(await visible().count(),6);
}
await page.close();
}
// Navigation changes retain route, order and menu behavior; DESIGN anchors still exist.
const p=await browser.newPage({reducedMotion:'reduce'});await p.route(/googletagmanager|google-analytics/,r=>r.abort());
for(const name of ['index','studio','creator','design']){await p.goto(origin+name+'.html',{waitUntil:'domcontentloaded'});await p.locator('.xen-header-toggle').click();assert.equal(await p.locator('.xen-menu a[href="./apparel.html"] .xen-menu-en').innerText(),'SHOP');await p.locator('.xen-drawer-close').click();if(name==='design')for(const id of ['shirowashi','takoleo','kuro-usagi'])assert.equal(await p.locator('#'+id).count(),1);}
await p.close();fs.writeFileSync(`${out}/results.json`,JSON.stringify({origin,results},null,2));console.log(JSON.stringify(results));
}finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
