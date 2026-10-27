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
      page.setDefaultTimeout(30000);
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin+'apparel.html?verify='+Date.now(), {waitUntil:'domcontentloaded'});
      await page.waitForFunction(count => document.querySelectorAll('.base-product').length === count, ids.length + 2);
      const catalog = page.locator('[data-base-products]');
      await catalog.scrollIntoViewIfNeeded();
      for (const img of await catalog.locator('img').all()) await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(count => {
        const images = [...document.querySelectorAll('.base-product img')];
        return images.length === count && images.every(img => img.complete && img.naturalWidth > 0);
      }, ids.length + 2);
      assert.deepEqual(await page.locator('[data-base-grid] > .base-product:not([data-catalog-static])').locator(':scope > .base-product-cta').evaluateAll(es=>es.map(e=>e.href)), ids.map(id=>'https://xen.official.ec/items/'+id));
      assert.deepEqual(await page.locator('.catalog-product:not([data-catalog-static]) > .base-product-name').allTextContents(), visibleItems.map(displayName));
      const prices = await page.locator('.catalog-product:not([data-catalog-static]) > .base-product-price').allTextContents();
      visibleItems.forEach((item,i)=>assert.ok(prices[i].includes(new Intl.NumberFormat('ja-JP').format(item.price))));
      assert.equal(await page.locator('#base-product-160058456').count(),0);
      const lapis=page.locator('#lapis-lazuli-ring');
      assert.equal(await lapis.count(),1);
      assert.equal(await lapis.locator('.base-product-price').innerText(),'価格未定');
      assert.equal(await lapis.locator('.base-product-cta').isDisabled(),true);
      assert.deepEqual(await lapis.locator('a[href]').evaluateAll(links => links.map(link => link.getAttribute('href'))),
        ['./design.html#lapis-lazuli-ring', './design.html#lapis-lazuli-ring']);

      for (const [id,file] of [[156850693,'signet-ring-20261023-8a2ce834d1'],[156851036,'sculpted-choker-20261023-7605c8856a']]) {
        const img=page.locator(`#base-product-${id} img`);
        assert.equal(await img.getAttribute('src'),`./xen-apparel-${file}.jpg`);
        assert.equal(await img.evaluate(e=>getComputedStyle(e).objectFit),'contain');
        assert.equal(await img.evaluate(e=>getComputedStyle(e).objectPosition),'50% 50%');
        const box=await img.boundingBox();assert.ok(Math.abs(box.width-box.height)<1);
      }
      assert.equal(await page.locator('#base-product-156851056 img').getAttribute('src'),'./xen-jewelry-bangle-white.jpg');
      for(const [id,target] of [[156850693,'k18-signet-ring'],[156851036,'product'],[156851056,'product']]) {
        const cta=page.locator(`#base-product-${id} > .base-product-cta`);
        assert.equal(await cta.isVisible(),true);
        assert.equal(await cta.getAttribute('target'),'_blank');
        const details=page.locator(`#base-product-${id} .base-product-design-link`);
        assert.equal(await details.isVisible(),true);
        assert.equal(await details.getAttribute('href'),`./design.html#${target}`);
        await details.click();
        await page.waitForURL(url => url.pathname.endsWith('/design.html') && url.hash === `#${target}`);
        assert.equal(await page.locator(`#${target}`).count(),1);
        await page.goBack({waitUntil:'domcontentloaded'});
        await page.waitForSelector(`#base-product-${id} > .base-product-cta`);
        await page.locator(`#base-product-${id}`).scrollIntoViewIfNeeded();
        assert.equal(await page.locator(`#base-product-${id} > .base-product-cta`).isVisible(),true);
      }
      const positions=await page.locator('.catalog-product').evaluateAll(cards=>cards.map(card=>{
        const box=el=>{const r=el.getBoundingClientRect();return {top:r.top,width:r.width,height:r.height};};
        return {image:box(card.querySelector('.base-product-visual')),price:box(card.querySelector(':scope > .base-product-price')),button:box(card.querySelector(':scope > .base-product-cta')),links:box(card.querySelector('.base-product-links'))};
      }));
      for(let i=0;i<positions.length;i+=3) for(const item of positions.slice(i,i+3)) {
        assert.ok(Math.abs(item.image.width-item.image.height)<1);
        assert.equal(item.button.height,44);
        for(const key of ['price','button','links']) assert.ok(Math.abs(item[key].top-positions[i][key].top)<1,`${key} alignment`);
      }
      assert.equal(await page.locator('.catalog-product:not([data-catalog-static]) > .base-product-cta').allTextContents().then(labels=>labels.every(label=>label==='購入する →')),true);
      assert.equal(await page.locator('[data-base-grid]').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),3);
      assert.equal(await page.locator('.base-product').evaluateAll(es=>new Set(es.map(e=>Math.round(e.getBoundingClientRect().top))).size),Math.ceil((ids.length+2)/3));
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
      results.push({width,cards:ids.length+2,columns:3,rows:Math.ceil((ids.length+2)/3),imagesLoaded:ids.length+2,horizontalOverflow:false,namesAndPricesMatch:true,linksMatch:true,alignedRows:true,designDetails:4,films:3,pageErrors:errors});
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
