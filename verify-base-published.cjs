// Verify the actual GitHub Pages catalog after publication, without fixtures.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const expected = JSON.parse(fs.readFileSync('base-products.json', 'utf8'));
const ids = [163232279,162561554,159175661,157787639,157783299,156849283,156850693,156851036,156851056];
const visibleItems = expected.items.filter(item => ids.includes(item.id));
const displayName = item => item.id === 156851036 ? 'K18 Sculpted Choker' : item.id === 156851056 ? 'K18 Sculpted Bangle' : item.name;
const origin = process.env.BASE_PUBLIC_URL || 'https://xencsj.github.io/portfolio/';
(async () => {
  fs.mkdirSync('base-products-qa', {recursive:true});
  const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? {executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE} : {})});
  try {
    const results = [];
    for (const width of [375,390,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin+'apparel.html?verify='+Date.now(), {waitUntil:'domcontentloaded'});
      await page.waitForFunction(count => document.querySelectorAll('.base-product').length === count, ids.length);
      const catalog = page.locator('[data-base-products]');
      await catalog.scrollIntoViewIfNeeded();
      for (const img of await catalog.locator('img').all()) await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(count => {
        const images = [...document.querySelectorAll('.base-product img')];
        return images.length === count && images.every(img => img.complete && img.naturalWidth > 0);
      }, ids.length);
      assert.deepEqual(await page.locator('[data-base-grid] > .base-product').locator(':scope > .base-product-cta').evaluateAll(es=>es.map(e=>e.href)), ids.map(id=>'https://xen.official.ec/items/'+id));
      assert.deepEqual(await page.locator('.base-product-name').allTextContents(), visibleItems.map(displayName));
      const prices = await page.locator('.catalog-product > .base-product-price').allTextContents();
      visibleItems.forEach((item,i)=>assert.ok(prices[i].includes(new Intl.NumberFormat('ja-JP').format(item.price))));
      assert.equal(await page.locator('#base-product-160058456').count(),0);
      for (const [id,file] of [[156850693,'signet-ring-20261023-8a2ce834d1'],[156851036,'sculpted-choker-20261023-7605c8856a']]) {
        const img=page.locator(`#base-product-${id} img`);
        assert.equal(await img.getAttribute('src'),`./xen-apparel-${file}.jpg`);
        assert.equal(await img.evaluate(e=>getComputedStyle(e).objectFit),'contain');
        assert.equal(await img.evaluate(e=>getComputedStyle(e).objectPosition),'50% 50%');
        const box=await img.boundingBox();assert.ok(Math.abs(box.width-box.height)<1);
      }
      assert.equal(await page.locator('#base-product-156851056 img').getAttribute('src'),'./xen-jewelry-bangle-white.jpg');
      for (const id of [156850693,156851036,156851056]) {
        const card = page.locator(`#base-product-${id}`);
        const cta = card.locator(':scope > .base-product-cta');
        assert.equal(await cta.isVisible(),true);
        assert.equal(await cta.getAttribute('target'),'_blank');
        assert.equal(await cta.innerText(),'購入する →');
        const summary = card.locator('summary');
        await summary.click();
        assert.equal(await summary.getAttribute('aria-expanded'),'true');
        assert.equal(await cta.isVisible(),true);
        await summary.press('Enter');
        assert.equal(await summary.getAttribute('aria-expanded'),'false');
      }
      const summary=page.locator('#base-product-156851036 summary');
      await summary.click();assert.equal(await summary.getAttribute('aria-expanded'),'true');
      assert.equal(await page.locator('#base-product-156851036 .jewelry-store').isVisible(),true);
      await summary.press('Enter');assert.equal(await summary.getAttribute('aria-expanded'),'false');
      assert.equal(await page.locator('[data-base-grid]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
      assert.equal(await page.locator('.base-product').evaluateAll(es=>new Set(es.map(e=>Math.round(e.getBoundingClientRect().top))).size),Math.ceil(ids.length/3));
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth),true);
      assert.equal(await page.locator('.base-products-store').getAttribute('href'),'https://xen.official.ec/');
      assert.ok(await page.locator('.base-products-store').evaluate(el=>el.getBoundingClientRect().top >= document.querySelector('[data-base-grid]').getBoundingClientRect().bottom));
      assert.equal(await page.locator('.image-gallery.trio').count(),0);
      assert.equal(await page.locator('.video-container > template[data-xen-youtube]').count(),3);
      assert.equal(await page.locator('.video-container > .xen-cinema-cover').count(),3);
      assert.equal(await page.locator('.video-container > iframe').count(),0);
      assert.deepEqual(await page.locator('template[data-xen-youtube]').evaluateAll(nodes => nodes.map(n =>
        new URL(n.content.querySelector('iframe').src).pathname.split('/').pop())),
        ['OvsxT_ngrWg','PQs_Ii2_hI8','yBNfm0PbP4Y']);
      assert.equal(await page.locator('.apparel-media .gallery-item').count(),2);
      assert.equal(await page.locator('.xen-header').count(),1);
      assert.equal(await page.locator('footer').count(),1);
      assert.deepEqual(errors,[]);
      await catalog.screenshot({path:`base-products-qa/published-${width}.png`});
      results.push({width,cards:ids.length,columns:3,rows:Math.ceil(ids.length/3),imagesLoaded:ids.length,horizontalOverflow:false,namesAndPricesMatch:true,linksMatch:true,films:3,pageErrors:errors});
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
