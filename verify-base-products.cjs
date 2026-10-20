// Fixture-driven UI regression check; fixture data never reaches the public JSON.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = 'http://127.0.0.1:8765';
const pinnedIds = [163232279,162561554,160058456,159175661,157787639,157783299];
const fixture = {
  schema_version: 1, shop_url: 'https://xen.official.ec/', updated_at: '2026-10-20T10:00:00Z',
  items: Array.from({ length: 6 }, (_, i) => ({
    id: pinnedIds[i], name: i === 0 ? '<img src=x onerror=alert(1)> XEN & テスト商品' : `XEN テスト商品 ${i+1}`,
    price: i === 4 ? null : 8800 + i * 1000,
    url: `https://xen.official.ec/items/${pinnedIds[i]}`,
    image_url: i === 3 ? null : 'https://xen.official.ec/test-products/image.jpg',
    available: i !== 1, sales_status: 'item_now_on_sale'
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
      assert.equal(await page.locator('.base-product').count(), 6);
      assert.match(await page.locator('#base-products-title').innerText(), /ONLINE STORE/);
      assert.equal(await page.locator('#base-products-title').evaluate(el => getComputedStyle(el).textAlign), 'center');
      assert.equal(await page.locator('#base-products-title .section-ja').evaluate(el => getComputedStyle(el).display), 'block');
      assert.equal(await page.locator('.base-product-name img').count(), 0, 'Product names must be rendered as text');
      assert.equal(await page.locator('.base-product-state').innerText(), 'SOLD OUT');
      assert.match(await page.locator('.base-product-price').first().innerText(), /8,800/);
      assert.equal(await page.locator('.base-product-link').first().getAttribute('href'), fixture.items[0].url);
      assert.equal(await page.locator('.image-gallery.trio .gallery-item').count(), 0);
      assert.equal(await page.locator('.image-gallery.apparel-media .gallery-item').count(), 2);
      const columns = await page.locator('[data-base-grid]').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      assert.equal(columns, 3);
      const rows = await page.locator('.base-product').evaluateAll(els => [...new Set(els.map(el => Math.round(el.getBoundingClientRect().top)))]);
      assert.equal(rows.length, 2);
      assert.equal(await page.locator('iframe').count(), 3);
      assert.equal(await page.getByText('XEN APPAREL STOREはこちら', {exact:true}).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      assert.deepEqual(errors, []);
      await catalog.screenshot({ path: `base-products-qa/catalog-${width}.png` });
      results.push({ width, cards: 6, columns, horizontalOverflow: false, pageErrors: errors });
      // A reordered catalog must be rejected instead of replacing the approved selection.
      await page.unroute('**/base-products.json');
      const reordered = structuredClone(fixture);
      reordered.items.reverse();
      await page.route('**/base-products.json', route => route.fulfill({json:reordered}));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      assert.equal(await page.locator('.base-product').count(), 0);
      // Missing JSON must expose the store fallback, without fake cards.
      await page.unroute('**/base-products.json');
      await page.route('**/base-products.json', route => route.fulfill({ status: 503, body: 'unavailable' }));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      assert.equal(await page.locator('.base-product').count(), 0);
      assert.equal(await page.locator('[data-base-status]').isVisible(), true);
      assert.equal(await page.locator('.base-products-store').getAttribute('href'), 'https://xen.official.ec/');
      // An invalid product destination must reject the entire catalog.
      await page.unroute('**/base-products.json');
      const invalid = structuredClone(fixture);
      invalid.items[0].url = 'https://example.com/items/600';
      await page.route('**/base-products.json', route => route.fulfill({ json: invalid }));
      await page.reload();
      await page.waitForFunction(() => document.querySelector('[data-base-products]').getAttribute('aria-busy') === 'false');
      assert.equal(await page.locator('.base-product').count(), 0);
      await page.close();
    }
    fs.writeFileSync('base-products-qa/results.json', JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
