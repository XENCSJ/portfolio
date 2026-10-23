// APPAREL-only visual evidence. BASE API credentials and catalog writes are not used.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const out = 'apparel-editorial-qa';
const expected = JSON.parse(fs.readFileSync('base-products.json','utf8'));
const ids = [157787639,157783299,156849283,156850693,156851036,156851056];
const visibleItems = expected.items.filter(item => ids.includes(item.id));
const displayName = item => item.id === 156851036 ? 'K18 Sculpted Choker' : item.id === 156851056 ? 'K18 Sculpted Bangle' : item.name;
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpeg':'image/jpeg','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const before = new Map(['apparel.html','xen-apparel-seamless.css'].map(name => [name,execFileSync('git',['show',`64b75904b9cceb618339ddcb6c276ede42580d78:${name}`])]));
const server = http.createServer((req,res) => {
  let name = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1);
  const old = name.startsWith('_before/');
  if(old) name = name.slice(8);
  const file = path.resolve(name);
  if(!file.startsWith(process.cwd()+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',mime[path.extname(name).toLowerCase()] || 'application/octet-stream');
  if(old && before.has(name)) res.end(before.get(name)); else fs.createReadStream(file).pipe(res);
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
      const page = await context.newPage();
      await page.goto(base+'apparel.html',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('#base-product-'+ids[0]);
      const editorial = page.locator('.apparel-editorial');
      for(const image of await editorial.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(img=>img.decode());
      }
      assert.equal(await editorial.locator('img').count(),5);
      assert.equal(await page.locator('.base-product:not([data-catalog-static])').count(),ids.length);
      assert.deepEqual(await page.locator('[data-base-grid] > .base-product:not([data-catalog-static])').locator(':scope > .base-product-cta').evaluateAll(nodes=>nodes.map(n=>Number(new URL(n.href).pathname.split('/').pop()))),ids);
      assert.deepEqual(await page.locator('.apparel-editorial-trio [data-apparel-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.apparelProduct)),['tshirt','hoodie','hat']);
      // Four purchase locations stay unlinked until the official product match is certain.
      assert.equal(await page.locator('[data-apparel-product]').count(),4);
      assert.equal(await page.locator('[data-apparel-product][href]').count(),0);
      const layout = await editorial.evaluate(el=>{
        const brand=el.querySelector('.brand-visual').getBoundingClientRect();
        const back=el.querySelector('.apparel-hoodie-back').getBoundingClientRect();
        const trio=el.querySelector('.apparel-editorial-trio').getBoundingClientRect();
        const store=document.querySelector('[data-base-products]').getBoundingClientRect();
        return {brandToHoodie:back.top-brand.bottom,hoodieToTrio:trio.top-back.bottom,storeBeforeEditorial:store.bottom<=el.getBoundingClientRect().top,columns:getComputedStyle(el.querySelector('.apparel-editorial-trio')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth-innerWidth,uncropped:[...el.querySelectorAll('img')].every(img=>Math.abs(img.getBoundingClientRect().width/img.getBoundingClientRect().height-img.naturalWidth/img.naturalHeight)<.005),loaded:[...el.querySelectorAll('img')].every(img=>img.naturalWidth>0)};
      });
      assert.equal(layout.columns,3);assert(layout.overflow<=1);assert(layout.loaded);assert(layout.uncropped);
      assert(Math.abs(layout.brandToHoodie)<1);assert(Math.abs(layout.hoodieToTrio)<1);assert(layout.storeBeforeEditorial);
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
      await page.locator('[data-base-products]').screenshot({path:`${out}/catalog-${width}.jpg`,type:'jpeg',quality:92});
      await page.screenshot({path:`${out}/after-${width}-full.jpg`,fullPage:true,type:'jpeg',quality:85});
      await page.evaluate(()=>scrollTo(0,document.querySelector('.apparel-editorial-trio').getBoundingClientRect().top+scrollY-510));
      await page.screenshot({path:`${out}/after-${width}.jpg`,type:'jpeg',quality:90});
      assert.equal(await page.locator('#base-products-title').evaluate(n=>getComputedStyle(n).textAlign),'center');
      if(width===390) {
        const old = await context.newPage();await old.goto('http://127.0.0.1:8766/_before/apparel.html');await old.waitForSelector('.base-product');
        await old.locator('#base-products-title').scrollIntoViewIfNeeded();
        await old.evaluate(()=>scrollTo(0,document.querySelector('#base-products-title').getBoundingClientRect().top+scrollY-510));
        await old.screenshot({path:`${out}/before-390.jpg`,type:'jpeg',quality:90});await old.close();
      }
      results.push({width,...layout,catalog:ids.length+1,purchaseLinks:'six verified BASE destinations; editorial visual matches remain pending'});
      await context.close();
    }
    fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,results},null,2));
    console.log(JSON.stringify(results));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
