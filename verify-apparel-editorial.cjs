// APPAREL-only visual evidence. BASE API credentials and catalog writes are not used.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const out = process.env.APPAREL_QA_DIR || 'apparel-editorial-qa';
const expected = JSON.parse(fs.readFileSync('base-products.json','utf8'));
const ids = [163232279,162561554,159175661,157787639,157783299,156849283,156850693,156851036,156851056];
const visibleItems = expected.items.filter(item => ids.includes(item.id));
const displayName = item => item.id === 156851036 ? 'K18 Sculpted Choker' : item.id === 156851056 ? 'K18 Sculpted Bangle' : item.name;
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server = http.createServer((req,res) => {
  let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  const file = path.resolve(name);
  if(!file.startsWith(process.cwd()+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',mime[path.extname(name).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve => server.listen(8766,'127.0.0.1',resolve));
  const base = process.env.APPAREL_PUBLIC_URL || 'http://127.0.0.1:8766/';
  const browser = await chromium.launch({...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  const results = [];
  try {
    for(const width of [375,390,430,768,1440]) {
      const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<650,isMobile:width<650});
      await context.route(/googletagmanager|google-analytics/,r=>r.abort());
      // Optional unmodified responses fetched from the original CDN URLs for restricted QA environments.
      if(process.env.SHOP_IMAGE_CACHE)for(const item of expected.items.filter(i=>ids.slice(0,6).includes(i.id)))await context.route(url=>url.href===item.image_url,r=>r.fulfill({path:path.join(process.env.SHOP_IMAGE_CACHE,`${item.id}.jpg`),contentType:'image/jpeg'}));
      const page = await context.newPage();
      await page.goto(base+'apparel.html',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('#base-product-'+ids[0]);
      const editorial = page.locator('.apparel-editorial');
      for(const image of await editorial.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(img=>img.decode());
      }
      assert.equal(await editorial.locator('img').count(),5);
      assert.equal(await page.locator('.apparel-editorial-trio img').count(),3);
      assert.equal(await page.locator('.base-product:not([data-catalog-static])').count(),ids.length);
      assert.deepEqual(await page.locator('[data-base-grid] > .base-product:not([data-catalog-static])').locator(':scope > .base-product-cta').evaluateAll(nodes=>nodes.map(n=>Number(new URL(n.href).pathname.split('/').pop()))),ids);
      assert.deepEqual(await page.locator('.apparel-editorial-trio [data-apparel-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.apparelProduct)),['tshirt','hoodie','hat']);
      // Four purchase locations stay unlinked until the official product match is certain.
      assert.equal(await page.locator('[data-apparel-product]').count(),4);
      assert.equal(await page.locator('[data-apparel-product][href]').count(),0);
      const layout = await page.evaluate(()=>{
        const rect=s=>document.querySelector(s).getBoundingClientRect();
        const hero=rect('main>.hero'), concept=rect('main>.lead');
        const brand=rect('.brand-visual'),back=rect('.apparel-hoodie-back');
        const grid=rect('#shop-products'),trio=rect('.apparel-editorial-trio');
        const tabs=rect('.shop-tabs'),films=rect('.apparel-films-heading');
        const buttons=[...document.querySelectorAll('.shop-tab')].map(e=>e.getBoundingClientRect());
        const images=[...document.querySelectorAll('.apparel-editorial img')];
        const width=document.body.getBoundingClientRect().width;
        return {brandToHoodie:back.top-brand.bottom,sequence:hero.bottom<=concept.top&&concept.bottom<=brand.top&&brand.bottom<=back.top&&back.bottom<=trio.top&&trio.bottom<=tabs.top&&tabs.bottom<=grid.top&&grid.bottom<=films.top,titleCentered:Math.abs(hero.left+hero.width/2-width/2)<1,tabsCentered:Math.abs((buttons[0].left+buttons[2].right)/2-width/2)<1,tabsHorizontal:buttons.every(r=>Math.abs(r.top-buttons[0].top)<1),tabsEqualGap:Math.abs((buttons[1].left-buttons[0].right)-(buttons[2].left-buttons[1].right))<1,columns:getComputedStyle(document.querySelector('#shop-products')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth-innerWidth,uncropped:images.every(img=>Math.abs(img.clientWidth/img.clientHeight-img.naturalWidth/img.naturalHeight)<.005),loaded:images.every(img=>img.naturalWidth>0)};
      });
      assert.equal(layout.columns,3);assert(layout.overflow<=1);assert(layout.loaded);assert(layout.uncropped);
      assert(Math.abs(layout.brandToHoodie)<1);assert(layout.sequence);assert(layout.titleCentered);
      assert(layout.tabsCentered&&layout.tabsHorizontal&&layout.tabsEqualGap);
      assert.equal(await page.locator('.shop-tabs').count(),1);
      assert.equal(await page.locator('.apparel-editorial-trio').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length),3);
      assert.equal(await page.locator('#shop-tab-all').getAttribute('aria-selected'),'true');
      for(const [category,count] of [['apparel',6],['jewelry',4],['all',10]]) {
        await page.locator(`[data-shop-filter="${category}"]`).click();
        assert.equal(await page.locator('.catalog-product:visible').count(),count);
        assert.equal(await page.locator(`[data-shop-filter="${category}"]`).getAttribute('aria-selected'),'true');
        if(category!=='all')assert(await page.locator('.catalog-product:visible').evaluateAll((cards,cat)=>cards.every(card=>card.dataset.shopCategory===cat),category));
      }
      assert.deepEqual(await page.locator('.base-product:not([data-catalog-static]) .base-product-name').allTextContents(),visibleItems.map(displayName));
      assert.equal(await page.locator('.base-product:not([data-catalog-static]) .base-product-brand').count(),ids.length);
      assert.equal(await page.locator('.base-product:not([data-catalog-static]) .base-product-cta').count(),ids.length);
      const cards = await page.locator('.base-product').evaluateAll(nodes=>nodes.map(node=>{
        const image=node.querySelector('.base-product-visual, .jewelry-visual').getBoundingClientRect();
        const name=node.querySelector('.base-product-name').getBoundingClientRect();
        const cta=node.querySelector('.base-product-cta, .jewelry-action').getBoundingClientRect();
        return {belowImage:name.top>=image.bottom,buttonHeight:cta.height,buttonWidth:cta.width,overflow:node.scrollWidth>node.clientWidth+1};
      }));
      assert(cards.every(c=>c.belowImage&&c.buttonHeight>=44&&c.buttonWidth>=44&&!c.overflow));
      const prices=await page.locator('.catalog-product > .base-product-price').allTextContents();
      visibleItems.forEach((item,index)=>assert(prices[index].includes(item.price.toLocaleString('ja-JP'))&&prices[index].includes('（税込）')));
      const captions=await page.locator('.apparel-editorial-trio figure').evaluateAll(nodes=>nodes.map(node=>node.querySelector('figcaption').getBoundingClientRect().top>=node.querySelector('img').getBoundingClientRect().bottom));
      assert(captions.every(Boolean));
      await page.locator('.base-products-store').scrollIntoViewIfNeeded();
      await page.locator('.base-product img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>null))));
      for(const img of await page.locator('.base-product img,.apparel-editorial-trio img,.apparel-media img').all()) {await img.scrollIntoViewIfNeeded();await img.evaluate(i=>i.decode());}
      assert.equal(await page.locator('.base-product img').count(),10);
      await page.locator('[data-base-products]').screenshot({path:`${out}/catalog-${width}.jpg`,type:'jpeg',quality:92});
      await page.evaluate(()=>scrollTo(0,0));
      await page.screenshot({path:`${out}/top-${width}.jpg`,type:'jpeg',quality:92});
      await page.screenshot({path:`${out}/after-${width}-full.jpg`,fullPage:true,type:'jpeg',quality:85});
      await page.evaluate(()=>scrollTo(0,document.querySelector('.apparel-editorial-trio').getBoundingClientRect().top+scrollY-510));
      await page.screenshot({path:`${out}/after-${width}.jpg`,type:'jpeg',quality:90});
      assert.equal(await page.locator('#base-products-title').evaluate(n=>getComputedStyle(n).textAlign),'center');
      await page.locator('#shop-tab-all').click();
      await page.screenshot({path:`${out}/controls-${width}.jpg`,type:'jpeg',quality:92});
      for(const video of await page.locator('.video-container').all()) {
        const before=await video.boundingBox();
        assert(Math.abs(before.width/before.height-16/9)<.01);
        const src=await video.locator('template').evaluate(t=>t.content.querySelector('iframe').getAttribute('src'));
        await video.locator('.xen-cinema-cover').click();
        const frame=video.locator('iframe');
        assert.equal(await frame.count(),1);
        const current=new URL(await frame.getAttribute('src'));
        assert.equal(current.pathname,new URL(src).pathname);
        assert.equal(current.searchParams.get('autoplay'),'1');
        const after=await video.boundingBox();
        assert(Math.abs(after.width/after.height-16/9)<.01);
      }
      await page.locator('.xen-header-toggle').click();assert(await page.locator('.xen-menu').isVisible());
      await page.keyboard.press('Escape');assert(!(await page.locator('.xen-menu').isVisible()));
      results.push({width,filters:[10,6,4],menu:true,videoActivation:true,...layout,catalog:ids.length+1,purchaseLinks:'nine verified BASE destinations; editorial visual matches remain pending'});
      await context.close();
    }
    fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,results},null,2));
    console.log(JSON.stringify(results));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
