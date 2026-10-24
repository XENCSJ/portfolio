/* Verify the new collection and preserve existing catalog/works. */
const {chromium,webkit,devices}=require('playwright');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const content=JSON.parse(fs.readFileSync('xen-graphic-content.json','utf8'));
const works=content.works;
const shopGalleries=JSON.parse(fs.readFileSync('xen-shop-gallery.json','utf8')).products;
const out=process.env.GRAPHIC_QA_OUT||'graphic-collection-qa';fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{const file=path.resolve(decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1));if(!file.startsWith(process.cwd()+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}res.setHeader('Content-Type',mime[path.extname(file).toLowerCase()]||'application/octet-stream');fs.createReadStream(file).pipe(res)});
let origin=process.env.GRAPHIC_PUBLIC_URL||'http://127.0.0.1:8766/';
const results=[];
async function check(page){assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page overflow');for(const d of await page.locator('.xg-dialog[open]').all())assert(await d.evaluate(e=>e.scrollWidth<=e.clientWidth+1),'dialog overflow');}
async function run(engine,profile,label){
 const browser=await engine.launch({...(engine===chromium&&process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({...profile,reducedMotion:'reduce'});
 // Do not substitute any image; external analytics/video requests are unnecessary for this regression.
 await context.route(/googletagmanager|google-analytics|youtube|i.ytimg/,r=>r.abort());
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(origin+'apparel.html');await page.waitForFunction(()=>document.querySelector('[data-base-products]').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('.catalog-product').count(),11);
  assert.deepEqual(await page.locator('.catalog-product').evaluateAll(es=>es.map(e=>e.id)),['base-product-163232279','base-product-162561554','base-product-159175661','base-product-160077299','base-product-157787639','base-product-157783299','base-product-156849283','base-product-156850693','base-product-156851036','base-product-156851056','lapis-lazuli-ring']);
  const data=JSON.parse(fs.readFileSync('base-products.json','utf8'));
  for(const item of data.items.filter(i=>i.id!==160058456)){
   const card=page.locator(`#base-product-${item.id}`);
   assert((await card.locator(':scope > .base-product-price').innerText()).includes(new Intl.NumberFormat('ja-JP').format(item.price)));
   assert.equal(await card.locator(':scope > .base-product-cta').getAttribute('href'),item.url);
  }
  assert.equal(await page.locator('#base-product-160077299 > .base-product-cta').getAttribute('href'),'https://xen.official.ec/items/160077299');
  await page.getByRole('tab',{name:'APPAREL',exact:true}).click();assert.equal(await page.locator('.catalog-product:visible').count(),7);
  await page.getByRole('tab',{name:'JEWELRY',exact:true}).click();assert.equal(await page.locator('.catalog-product:visible').count(),4);
  await page.getByRole('tab',{name:'ALL',exact:true}).click();
  assert.equal(await page.locator('.video-container>template').count(),3);
  await page.locator('.xen-header-toggle').click();assert.equal(await page.locator('.xen-menu a[href="./design.html"]').isVisible(),true);await page.locator('.xen-drawer-close').click();
  for(const w of works){
   const card=page.locator(`#base-product-${w.product_id}`);
   await card.locator('.base-product-visual').click();
   const dialog=page.locator(`#graphic-${w.key}`);await dialog.waitFor({state:'visible'});
   assert.equal(new URL(page.url()).hash,`#graphic-${w.key}`);
   assert.equal(await dialog.locator('h2').innerText(),w.title);
   await dialog.locator('.xg-concept summary').press('Enter');
   assert.equal(await dialog.locator('.xg-concept summary').getAttribute('aria-expanded'),'true');
   assert.equal((await dialog.locator('.xg-approved-copy p').allTextContents()).join('\n\n'),w.copy);
   assert(await dialog.locator('.xg-approved-copy').evaluate(e=>getComputedStyle(e).maxHeight==='none'&&e.scrollHeight<=e.clientHeight+1));
   const imgs=dialog.locator('.xg-stage img');
   await imgs.evaluateAll(es=>Promise.all(es.map(i=>i.decode())));
   for(const [n,img] of shopGalleries[w.key].images.entries()){
    await dialog.locator(`[data-graphic-thumb="${n}"]`).click();
    assert.equal(await dialog.locator('.xg-stage img.is-current').getAttribute('src'),img.src);
    assert.equal(await dialog.locator(`[data-graphic-thumb="${n}"]`).getAttribute('aria-pressed'),'true');
    assert.equal(await dialog.locator('.xg-stage img.is-current').evaluate(i=>getComputedStyle(i).objectFit),'contain');
   }
   await dialog.locator('.xg-stage').press('Home');await dialog.locator('.xg-stage').press('ArrowRight');assert.equal(await dialog.locator('[data-graphic-thumb="1"]').getAttribute('aria-pressed'),'true');
   await check(page);
   if(w.number==='01'){await dialog.locator('.xg-concept summary').click();await page.screenshot({path:`${out}/${label}-SHOP.jpg`,type:'jpeg',quality:88});}
   await dialog.locator('[data-graphic-close]').click();await page.waitForFunction(()=>!document.querySelector('.xg-dialog[open]'));
   assert.equal(await card.locator('.base-product-visual').evaluate(e=>e===document.activeElement),true);
  }
  // A target product opens even while the catalog remains filtered to jewelry.
  await page.getByRole('tab',{name:'JEWELRY'}).click();
  await page.evaluate(()=>{location.hash='graphic-state-of-mind';});
  await page.locator('#graphic-state-of-mind').waitFor({state:'visible'});await page.locator('#graphic-state-of-mind [data-graphic-close]').click();
  await page.waitForFunction(()=>!document.querySelector('.xg-dialog[open]'));
  // Four DESIGN cards in requested order; prior sections stay present.
  await page.goto(origin+'design.html#xen-graphic-collection');
  assert.deepEqual(await page.locator('.xg-card h3').allTextContents(),works.map(w=>w.name));
  assert.equal(await page.locator('.xg-grid').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),profile.viewport?.width>700||label==='tablet'?2:1);
  for(const id of ['branding','selene-pet-clinic','shirowashi','kuro-usagi','takoleo','apparel-graphics','uniform','product','k18-signet-ring','lapis-lazuli-ring','phone-cases','t-shirt-graphics'])assert.equal(await page.locator('#'+id).count(),1,id);
  for(const w of works){
   await page.locator(`.xg-card a[href="#graphic-${w.key}"]`).click();const d=page.locator(`#graphic-${w.key}`);
   await d.waitFor({state:'visible'});assert.equal(await d.locator('.xg-price').count(),0);
   assert.equal(await d.locator('.xg-message').count(),0,'remove sentence-by-sentence translation UI');
   assert.deepEqual(await d.locator('.xg-print-section').evaluateAll(es=>es.map(e=>e.dataset.graphicPart)),w.design_prints.map(p=>p.role));
   assert.deepEqual(await d.locator('.xg-print-english').allTextContents(),w.design_prints.map(p=>p.message_indices.map(i=>w.messages[i][0]).join(' ')));
   assert.deepEqual(await d.locator('.xg-print-concept').allTextContents(),w.design_prints.map(p=>p.concept));
   assert.equal(await d.locator('[data-graphic-part="main"]').count(),w.key==='nichinichi-kore-kojitsu'?0:1,'do not invent a front theme');
   assert(await d.evaluate(e=>e.querySelector('h2').getBoundingClientRect().top>=e.querySelector('.xg-dialog-bar').getBoundingClientRect().bottom),'initial modal header overlap');
   assert(await d.evaluate(e=>parseFloat(getComputedStyle(e.querySelector('.xg-print-english')).fontSize)>parseFloat(getComputedStyle(e.querySelector('.xg-print-concept')).fontSize)),'English emphasis');
   await d.locator('.xg-stage img').evaluateAll(es=>Promise.all(es.map(i=>i.decode())));
   await page.screenshot({path:`${out}/${label}-${w.key}-theme.jpg`,type:'jpeg',quality:88});
   await d.locator('[data-graphic-part="key"]').scrollIntoViewIfNeeded();
   assert(await d.evaluate(e=>Math.abs(e.querySelector('.xg-dialog-bar').getBoundingClientRect().top-e.getBoundingClientRect().top-1)<2),'sticky modal header');
   await page.screenshot({path:`${out}/${label}-${w.key}-message.jpg`,type:'jpeg',quality:88});
   assert.equal(await d.locator('.xg-crosslink').getAttribute('href'),`./apparel.html#graphic-${w.key}`);
   await check(page);await d.locator('[data-graphic-close]').click();await page.waitForFunction(()=>!document.querySelector('.xg-dialog[open]'));
   await page.locator(`.xg-card a[href="#graphic-${w.key}"]`).click();await d.waitFor({state:'visible'});await d.locator('[data-graphic-close]').press('Escape');await page.waitForFunction(()=>!document.querySelector('.xg-dialog[open]'));
  }
  await page.locator('#xen-graphic-collection').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/${label}-DESIGN.jpg`,type:'jpeg',quality:88});
  // Direct hash, inter-page navigation, Back/Forward, and visible focus trap.
  for(const w of works){
   await page.goto(origin+`design.html#graphic-${w.key}`);let d=page.locator(`#graphic-${w.key}`);await d.waitFor({state:'visible'});
   await d.locator('.xg-crosslink').click();await page.locator(`#graphic-${w.key}`).waitFor({state:'visible'});assert(new URL(page.url()).pathname.endsWith('/apparel.html'));
   await page.goBack();await page.locator(`#graphic-${w.key}`).waitFor({state:'visible'});assert(new URL(page.url()).pathname.endsWith('/design.html'));
   await page.goForward();await page.locator(`#graphic-${w.key}`).waitFor({state:'visible'});
   const active=page.locator('.xg-dialog[open]');for(let i=0;i<16;i++){await page.keyboard.press('Tab');assert(await active.evaluate(e=>e.contains(document.activeElement)),'focus trap');}
   await active.locator('.xg-crosslink').click();await page.locator(`#graphic-${w.key}`).waitFor({state:'visible'});assert(new URL(page.url()).pathname.endsWith('/design.html'));
  }
  await page.goto(origin+'apparel.html#graphic-kyakka-shoko');const d=page.locator('#graphic-kyakka-shoko');await d.waitFor({state:'visible'});
  await page.emulateMedia({reducedMotion:'no-preference'});const stage=d.locator('.xg-stage');await stage.scrollIntoViewIfNeeded();
  const box=await stage.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);await page.mouse.down();await page.mouse.move(box.x+box.width*.2,box.y+box.height*.5,{steps:8});await page.mouse.up();assert.equal(await d.locator('[data-graphic-thumb="1"]').getAttribute('aria-pressed'),'true','swipe');
  await page.mouse.move(box.x+box.width*.5,box.y+box.height*.8);await page.mouse.down();await page.mouse.move(box.x+box.width*.5,box.y+box.height*.2,{steps:8});await page.mouse.up();assert.equal(await d.locator('[data-graphic-thumb="1"]').getAttribute('aria-pressed'),'true','vertical gesture');
  for(let i=0;i<6;i++)await d.locator('.xg-concept summary').click();await page.waitForTimeout(400);assert.equal(await d.locator('.xg-concept').evaluate(e=>e.open),false);
  await d.locator('.xg-concept summary').click();await page.waitForTimeout(400);assert.equal(await d.locator('.xg-concept-panel').evaluate(e=>e.style.height),'');
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await stage.locator('img').first().evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
  await check(page);assert.deepEqual(errors,[]);
  results.push({label,passed:true,approvedCopyExact:true,images:9,catalogCards:11,existingProductsPreserved:true,keyboardAndSwipe:true,hashBackForward:true,reducedMotion:true,pageErrors:errors});console.log('PASS',label);
 }catch(e){await page.screenshot({path:`${out}/FAIL-${label}.jpg`,type:'jpeg'}).catch(()=>{});results.push({label,passed:false,error:e.stack});console.error('FAIL',label,e.stack);}
 finally{await browser.close();}
}
(async()=>{
 for(const w of works)for(const i of w.images)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(i.src)).digest('hex'),i.sha256,'unaltered source image');
 if(!process.env.GRAPHIC_PUBLIC_URL)await new Promise(r=>server.listen(8766,'127.0.0.1',r));
 const profiles=[['PC',chromium,{viewport:{width:1440,height:1000}}],['tablet',chromium,{viewport:{width:768,height:1024},hasTouch:true}],['iPhone',chromium,{viewport:{width:390,height:844},isMobile:true,hasTouch:true}],['Android',chromium,{viewport:{width:360,height:800},isMobile:true,hasTouch:true}]];
 if(process.env.GRAPHIC_WEBKIT==='1')profiles.push(['webkit-iPhone',webkit,{...devices['iPhone 14 Pro Max']}]);
 for(const [label,engine,profile]of profiles){if(process.env.GRAPHIC_QA_PROFILE&&!label.includes(process.env.GRAPHIC_QA_PROFILE))continue;try{await run(engine,profile,label)}catch(e){results.push({label,passed:false,error:e.message});console.error('UNAVAILABLE',label,e.message)}}
 fs.writeFileSync(`${out}/report.json`,JSON.stringify({results,realMobileDevicesTested:false},null,2));server.close();process.exitCode=results.some(r=>!r.passed)?1:0;
})();
