const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, webkit } = require('playwright');
const base = process.env.NEWS_TEST_URL || 'http://127.0.0.1:8765/';
const expected = require('./news-archive.json').filter(record => record.listed).slice(0, 50);
const configs = [
  ['desktop', chromium, 1440, 1000], ['iphone', webkit, 390, 844],
  ['small-phone', chromium, 320, 750], ['reduced', webkit, 390, 844],
  ['no-js', chromium, 390, 844]
];

async function verify(name, engine, width, height) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({ viewport: { width, height },
      reducedMotion: name === 'reduced' ? 'reduce' : 'no-preference',
      javaScriptEnabled: name !== 'no-js' });
    await page.route('**/*', route => route.request().url().startsWith(base) ? route.continue() : route.abort());
    await page.goto(base);
    const pinned = require('./news-pinned.json').id;
    const homeIds = expected.filter(record => record.id !== pinned).slice(0, 4).map(record => record.id);
    assert.deepEqual(await page.locator('#xen-news li').evaluateAll(rows => rows.map(row => row.dataset.newsId)), [...homeIds, pinned]);
    await page.goto(base + 'news.html');
    for (let start = 0; start < Math.max(1, expected.length); start += 10) {
      const number = start / 10 + 1;
      if (start) await page.getByRole('link', { name: '次のページ' }).click();
      const list = page.locator('#news-list');
      const records = expected.slice(start, start + 10);
      assert.deepEqual(await list.locator('li').evaluateAll(rows => rows.map(row => row.dataset.newsId)), records.map(row => row.id));
      assert.equal(await page.locator('.news-pages [aria-current]').textContent(), String(number));
      for (const image of await list.locator('img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(img => img.decode());
        assert.ok(await image.evaluate(img => {
          const frame = img.parentNode.getBoundingClientRect();
          const text = img.closest('.news-card').querySelector('.news-copy').getBoundingClientRect();
          return img.naturalWidth > 0 && Math.abs(frame.width / frame.height - 16 / 9) < .01 &&
            text.left > frame.right && text.right <= innerWidth;
        }));
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (number === 1) {
        await page.getByRole('heading', {name: /NEWS/}).scrollIntoViewIfNeeded();
        await page.screenshot({path: 'news-qa/' + name + '.png'});
      }
    }
    if (expected.length > 10) {
      await page.getByRole('link', { name: '前のページ' }).click();
      assert.ok(page.url().endsWith('#news-list'));
    }
  } finally { await browser.close(); }
}
(async () => {
  fs.mkdirSync('news-qa', {recursive:true});
  for (const config of configs) await verify(...config);
  await require('./verify-category-titles.cjs')();
})().catch(error => { console.error(error); process.exitCode = 1; });
