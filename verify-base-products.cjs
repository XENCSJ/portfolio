// Fixture-driven UI regression check; fixture data never reaches the public JSON.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = 'http://127.0.0.1:8765';
const pinnedIds = [163232279,162561554,160058456,159175661,157787639,157783299,156849283,156850693,156851036,156851056];
const displayedIds = [163232279,162561554,159175661,157787639,157783299,156849283,156850693,156851036,156851056];
const fixture = {
  schema_version: 1, shop_url: 'https://xen.official.ec/', updated_at: '2026-10-20T10:00:00Z',
  items: Array.from({ length: pinnedIds.length }, (_, i) => ({
    id: pinnedIds[i], name: i === 5 ? '<img src=x onerror=alert(1)> XEN & テスト商品' : `XEN テスト商品 ${i+1}`,
    price: i === 4 ? null : 8800 + i * 1000,
    url: `https://xen.official.ec/items/${pinnedIds[i]}`,
    image_url: i === 3 ? null : 'https://xen.official.ec/test-products/image.jpg',
    available: i !== 5, sales_status: 'item_now_on_sale'
  }))
};
(async () => {
  fs.mkdirSync('base-products-qa', { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  try {
    const results = [];
    for (const width of [375, 390, 768, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route('**/*', route => {
        const url = route.request().url();
        if (url === 'https://xen.official.ec/test-products/image.jpg') {
          return route.fulfill({ path: path.resolve('xen-preview-93ac40b5e0f8f5dc.webp'), contentType: 'image/webp' });
        }
        if (!url.startsWith(origin)) return route.abort();
        return route.continue();
      });
      await page.route('**/base-products.json', route => route.fulfill({ json: fixture }));
      await page.goto(origin + '/apparel.html');
      await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      const catalog = page.locator('[data-base-products]');
      await catalog.scrollIntoViewIfNeeded();
      assert.equal(await page.locator('.base-product').count(), displayedIds.length + 2);
      assert.equal(await page.locator('.base-product-brand').count(), displayedIds.length + 2);
      assert.equal(await page.locator('.base-product-cta').count(), displayedIds.length + 2);
      assert.equal(await page.locator('[data-base-products] [data-jewelry]').count(), 0);
      assert.match(await page.locator('.base-product-cta').first().innerText(), /購入する/);
      assert.match(await page.locator('.base-product-cta').nth(1).innerText(), /購入する/);
      assert.match(await page.locator('#base-products-title').innerText(), /ONLINE STORE/);
      assert.equal(await page.locator('#base-products-title').evaluate(el => getComputedStyle(el).textAlign), 'center');
      assert.equal(await page.locator('[role=tab]').count(), 3);
      assert.equal(await page.locator('.base-product-name img').count(), 0, 'Product names must be rendered as text');
      assert.equal(await page.locator('.base-product-state').innerText(), 'SOLD OUT');
      assert.match(await page.locator('#base-product-157787639 > .base-product-price').innerText(), /価格はストアでご確認ください/);
      assert.equal(await page.locator('.catalog-product > .base-product-cta').first().getAttribute('href'), fixture.items[0].url);
      assert.equal(await page.locator('.image-gallery.trio .gallery-item').count(), 0);
      assert.equal(await page.locator('.image-gallery.apparel-media .gallery-item').count(), 2);
      const columns = await page.locator('[data-base-grid]').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      assert.equal(columns, 3);
      const rows = await page.locator('.base-product').evaluateAll(els => [...new Set(els.map(el => Math.round(el.getBoundingClientRect().top)))]);
      assert.equal(rows.length, Math.ceil((displayedIds.length + 2) / columns));
      const alignment = await page.locator('.catalog-product').evaluateAll(cards => {
        const rect = element => { const r = element.getBoundingClientRect(); return {top:r.top, width:r.width, height:r.height}; };
        return cards.map(card => ({
          id:card.id, card:rect(card), visual:rect(card.querySelector('.base-product-visual')),
          price:rect(card.querySelector(':scope > .base-product-price')),
          button:rect(card.querySelector(':scope > .base-product-cta')),
          links:rect(card.querySelector('.base-product-links')),
          order:[...card.children].map(el => el.className)
        }));
      });
      for (let offset=0; offset<alignment.length; offset+=3) {
        const row = alignment.slice(offset, offset+3);
        for (const card of row) {
          assert.ok(Math.abs(card.visual.width-card.visual.height)<1, 'Square product images');
          assert.equal(card.button.height,44);
          const jewelry = ['base-product-156850693','base-product-156851036','base-product-156851056','lapis-lazuli-ring'].includes(card.id);
          assert.deepEqual(card.order,['base-product-visual','base-product-brand','base-product-name','base-product-price',...(jewelry ? ['base-product-links','base-product-cta'] : ['base-product-cta','base-product-links'])]);
          for (const key of ['price','button','links']) assert.ok(Math.abs(card[key].top-row[0][key].top)<1, `${key} must align within its row`);
        }
      }
      assert.equal(await page.locator('#base-product-160058456').count(), 0);
      assert.equal(await page.locator('.catalog-product:not([data-catalog-static]) > .base-product-cta').allTextContents().then(labels => labels.every(label => label === '購入する →')), true);
      const jewelryTargets = {
        'base-product-156850693': 'k18-signet-ring',
        'base-product-156851036': 'product',
        'base-product-156851056': 'product',
        'lapis-lazuli-ring': 'lapis-lazuli-ring'
      };
      for (const [id, target] of Object.entries(jewelryTargets)) {
        const link = page.locator(`#${id} .base-product-design-link`);
        assert.equal(await link.innerText(), '詳細を見る →');
        assert.equal(await link.getAttribute('href'), `./design.html#${target}`);
        assert.equal(await link.getAttribute('target'), null, 'Keep DESIGN navigation in the same tab');
        assert.equal(await page.locator(`#${id} details`).count(), 0);
      }

      assert.equal(await page.locator('.video-container').count(), 3);
      assert.equal(await page.locator('.video-container > template[data-xen-youtube]').count(), 3);
      assert.equal(await page.locator('.video-container > .xen-cinema-cover').count(), 3);
      assert.equal(await page.locator('.video-container > iframe').count(), 0, 'YouTube loads only after a gesture');
      assert.deepEqual(await page.locator('template[data-xen-youtube]').evaluateAll(nodes => nodes.map(n =>
        new URL(n.content.querySelector('iframe').src).pathname.split('/').pop())),
        ['OvsxT_ngrWg','PQs_Ii2_hI8','yBNfm0PbP4Y']);
      assert.equal(await page.getByText('XEN APPAREL STOREはこちら', {exact:true}).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await catalog.screenshot({ path: `base-products-qa/catalog-${width}.png` });
      results.push({ width, cards: displayedIds.length + 2, columns, horizontalOverflow: false, pageErrors: errors });
      assert.equal(await page.locator('#base-product-156849283 .base-product-design-link').getAttribute('href'), './design.html#kuro-usagi');
      const lapis = page.locator('#lapis-lazuli-ring');
      assert.equal(await lapis.count(), 1);
      assert.equal(await lapis.locator('.base-product-price').innerText(), '価格未定');
      assert.equal(await lapis.locator('.base-product-cta').isDisabled(), true);
      assert.equal(await lapis.locator('a[href]').count(), 2);
      assert.equal(await lapis.locator('.base-product-visual').getAttribute('href'), './design.html#lapis-lazuli-ring');
      for (const [id, target] of Object.entries(jewelryTargets)) {
        await page.locator(`#${id} .base-product-design-link`).press('Enter');
        await page.waitForURL(origin + `/design.html#${target}`);
        assert.equal(await page.locator(`#${target}`).isVisible(), true);
        await page.goBack();
        await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      }
      // A reordered catalog must be rejected instead of replacing the approved selection.
      await page.unroute('**/base-products.json');
      const reordered = structuredClone(fixture);
      reordered.items.reverse();
      await page.route('**/base-products.json', route => route.fulfill({json:reordered}));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      assert.equal(await page.locator('.base-product:not([data-catalog-static])').count(), 0);
      // Missing JSON must expose the store fallback, without fake cards.
      await page.unroute('**/base-products.json');
      await page.route('**/base-products.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      assert.equal(await page.locator('.base-product:not([data-catalog-static])').count(), 0);
      assert.equal(await page.locator('[data-base-status]').isVisible(), true);
      assert.equal(await page.locator('#lapis-lazuli-ring').count(), 1, 'Local design survives feed failure');
      assert.equal(await page.locator('.base-products-store').getAttribute('href'), 'https://xen.official.ec/');
      // An invalid product destination must reject the entire catalog.
      await page.unroute('**/base-products.json');
      const invalid = structuredClone(fixture);
      invalid.items[0].url = 'https://example.com/items/600';
      await page.route('**/base-products.json', route => route.fulfill({ json: invalid }));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      assert.equal(await page.locator('.base-product:not([data-catalog-static])').count(), 0);
      // The added character shares the real disclosure and catalog renderer.
      await page.unroute('**/base-products.json');
      await page.route('**/base-products.json', route => route.fulfill({json:fixture}));
      await page.goto(origin + '/design.html#kuro-usagi');
      const disclosure = page.locator('#kuro-usagi [data-design-apparel]');
      const toggle = disclosure.locator('summary');
      await toggle.scrollIntoViewIfNeeded();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      const related = disclosure.locator('.base-product-link');
      await related.waitFor({state:'visible'});
      assert.equal(await related.getAttribute('href'), 'https://xen.official.ec/items/156849283');
      assert.equal(await disclosure.locator('.design-apparel-page-link').getAttribute('href'), './apparel.html#base-product-156849283');
      await toggle.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await page.close();
    }
    fs.writeFileSync('base-products-qa/results.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
