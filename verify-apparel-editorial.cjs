// APPAREL-only visual evidence. BASE API credentials and catalog writes are not used.
const {chromium} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const out = 'apparel-editorial-qa';
const ids = [163232279,162561554,160058456,159175661,157787639,157783299];
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
  const browser = await chromium.launch();
  const results = [];
  try {
    for(const width of [375,390,430,1440]) {
      const context = await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',hasTouch:width<650,isMobile:width<650});
      await context.route(/googletagmanager|google-analytics/,r=>r.abort());
      const page = await context.newPage();
      await page.goto(base+'apparel.html',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('.base-product');
      const editorial = page.locator('.apparel-editorial');
      await editorial.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.equal(await editorial.locator('img').count(),5);
      assert.equal(await page.locator('.base-product').count(),6);
      assert.deepEqual(await page.locator('.base-product-link').evaluateAll(nodes=>nodes.map(n=>Number(new URL(n.href).pathname.split('/').pop()))),ids);
      assert.deepEqual(await page.locator('.apparel-editorial-trio [data-apparel-product]').evaluateAll(nodes=>nodes.map(n=>n.dataset.apparelProduct)),['tshirt','hoodie','hat']);
      // Four purchase locations stay unlinked until the official product match is certain.
      assert.equal(await page.locator('[data-apparel-product]').count(),4);
      assert.equal(await page.locator('[data-apparel-product][href]').count(),0);
      const layout = await editorial.evaluate(el=>{
        const brand=el.querySelector('.brand-visual').getBoundingClientRect();
        const back=el.querySelector('.apparel-hoodie-back').getBoundingClientRect();
        const trio=el.querySelector('.apparel-editorial-trio').getBoundingClientRect();
        const heading=document.querySelector('#base-products-title').getBoundingClientRect();
        return {brandToHoodie:back.top-brand.bottom,hoodieToTrio:trio.top-back.bottom,trioToStore:heading.top-trio.bottom,columns:getComputedStyle(el.querySelector('.apparel-editorial-trio')).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth-innerWidth,uncropped:[...el.querySelectorAll('img')].every(img=>Math.abs(img.getBoundingClientRect().width/img.getBoundingClientRect().height-img.naturalWidth/img.naturalHeight)<.005),loaded:[...el.querySelectorAll('img')].every(img=>img.naturalWidth>0)};
      });
      assert.equal(layout.columns,3);assert(layout.overflow<=1);assert(layout.loaded);assert(layout.uncropped);
      assert(Math.abs(layout.brandToHoodie)<1);assert(Math.abs(layout.hoodieToTrio)<1);assert(layout.trioToStore>=23&&layout.trioToStore<=37);
      await page.locator('.base-products-store').scrollIntoViewIfNeeded();
      await page.locator('.base-product img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>null))));
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
      results.push({width,...layout,catalog:6,purchaseLinks:'pending official image/ID verification during BASE maintenance'});
      await context.close();
    }
    fs.writeFileSync(`${out}/results.json`,JSON.stringify({base,results},null,2));
    console.log(JSON.stringify(results));
  } finally {await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
