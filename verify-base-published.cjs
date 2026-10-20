// Verify the actual GitHub Pages catalog after publication, without fixtures.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const expected = JSON.parse(fs.readFileSync('base-products.json', 'utf8'));
const ids = [163232279,162561554,160058456,159175661,157787639,157783299];
const origin = 'https://xencsj.github.io/portfolio/';
(async () => {
  fs.mkdirSync('base-products-qa', {recursive:true});
  const browser = await chromium.launch({headless:true});
  try {
    const results = [];
    for (const width of [375,390,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin+'apparel.html?verify='+Date.now(), {waitUntil:'domcontentloaded'});
      await page.waitForFunction(() => document.querySelectorAll('.base-product').length === 6);
      const catalog = page.locator('[data-base-products]');
      await catalog.scrollIntoViewIfNeeded();
      for (const img of await catalog.locator('img').all()) await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const images = [...document.querySelectorAll('.base-product img')];
        return images.length === 6 && images.every(img => img.complete && img.naturalWidth > 0);
      });
      assert.deepEqual(await page.locator('.base-product-link').evaluateAll(es=>es.map(e=>e.href)), ids.map(id=>'https://xen.official.ec/items/'+id));
      assert.deepEqual(await page.locator('.base-product-name').allTextContents(), expected.items.map(i=>i.name));
      const prices = await page.locator('.base-product-price').allTextContents();
      expected.items.forEach((item,i)=>assert.ok(prices[i].includes(new Intl.NumberFormat('ja-JP').format(item.price))));
      assert.equal(await page.locator('[data-base-grid]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
      assert.equal(await page.locator('.base-product').evaluateAll(es=>new Set(es.map(e=>Math.round(e.getBoundingClientRect().top))).size),2);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
      assert.equal(await page.locator('.base-products-store').getAttribute('href'),'https://xen.official.ec/');
      assert.ok(await page.locator('.base-products-store').evaluate(el=>el.getBoundingClientRect().top >= document.querySelector('[data-base-grid]').getBoundingClientRect().bottom));
      assert.equal(await page.locator('.image-gallery.trio').count(),0);
      assert.equal(await page.locator('.video-container iframe').count(),3);
      assert.equal(await page.locator('.apparel-media .gallery-item').count(),2);
      assert.equal(await page.locator('.xen-header').count(),1);
      assert.equal(await page.locator('footer').count(),1);
      assert.deepEqual(errors,[]);
      await catalog.screenshot({path:`base-products-qa/published-${width}.png`});
      results.push({width,cards:6,columns:3,rows:2,imagesLoaded:6,horizontalOverflow:false,namesAndPricesMatch:true,linksMatch:true,films:3,pageErrors:errors});
      await page.close();
    }
    // Confirm that every destination and the one shop link return successful pages.
    const request = await browser.newContext();
    for (const url of ['https://xen.official.ec/',...expected.items.map(i=>i.url)]) {
      const response = await request.request.get(url);
      assert.ok(response.ok(), 'Store destination did not respond successfully: '+url);
    }
    await request.close();
    fs.writeFileSync('base-products-qa/published-results.json',JSON.stringify(results,null,2));
    console.log(JSON.stringify(results));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
