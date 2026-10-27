const {chromium, webkit} = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const pages = fs.readdirSync('.').filter(f => f.endsWith('.html') && fs.readFileSync(f, 'utf8').includes('class="xen-footer-symbol"'));
assert.equal(pages.length, 17);
const out = 'footer-symbol-evidence';
fs.mkdirSync(out, {recursive: true});
const mime = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp'};
const server = http.createServer((req, res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve('.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404); return res.end();}
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const results = [];
async function inspect(page, width) {
  await page.locator('.xen-footer-symbol img').evaluate(img => img.decode());
  const value = await page.locator('footer').evaluate(footer => {
    const link = footer.querySelector('.xen-footer-symbol');
    const img = link.querySelector('img');
    const top = footer.querySelector('.xen-footer-top,.xen-back-top');
    const copyright = footer.querySelector('.xen-footer-copyright,.xen-copyright');
    const rect = n => {const r = n.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
    const css = getComputedStyle(img);
    return {count:footer.querySelectorAll('.xen-footer-symbol').length, link:rect(link), image:rect(img), top:rect(top), copyright:rect(copyright), footer:rect(footer),
      loaded:img.complete && img.naturalWidth === 2232 && img.naturalHeight === 2293, href:link.href, label:link.getAttribute('aria-label'),
      opacity:css.opacity, transform:css.transform, filter:css.filter, dark:document.body.matches('.home-page,.xen-noir'),
      overflow:document.documentElement.scrollWidth > innerWidth + 1, background:getComputedStyle(footer).backgroundColor,
      animations:img.getAnimations().filter(a => a.playState === 'running').length};
  });
  assert.equal(value.count, 1);
  assert(value.loaded);
  assert.equal(value.href, 'https://xencsj.github.io/portfolio/');
  assert.equal(value.label, 'XEN INDEXへ戻る');
  assert.equal(value.image.width, width <= 600 ? 26 : 30);
  assert(Math.abs(value.image.height / value.image.width - 2293 / 2232) < .01);
  assert(Math.abs(value.image.x + value.image.width / 2 - (value.footer.x + value.footer.width / 2)) < 1);
  assert(value.top.bottom <= value.link.y + 1);
  assert(value.link.bottom <= value.copyright.y + 1);
  assert(value.link.width >= 44 && value.link.height >= 44);
  assert.equal(value.opacity, '1');
  assert.equal(value.transform, 'none');
  assert(value.filter.includes(value.dark ? '0.72' : '0.42'));
  assert.equal(value.animations, 0);
  assert(!value.overflow, 'horizontal overflow');
  return value;
}
async function run(browser, engine, base, width, mode = 'normal', chosen = pages) {
  const context = await browser.newContext({viewport:{width,height:width > 600 ? 900 : 844}, isMobile:width <= 600, hasTouch:width <= 600,
    javaScriptEnabled:mode !== 'no-js', reducedMotion:mode === 'reduce' ? 'reduce' : 'no-preference'});
  // Third-party embeds are outside this footer test. First-party assets load normally.
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base) || url === 'https://xencsj.github.io/portfolio/') return route.continue();
    return route.abort();
  });
  await context.addInitScript(() => {
    window.footerReveals = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function(frames, options) {
      if (this.matches('.xen-footer-symbol img')) window.footerReveals.push({frames, options});
      return original.call(this, frames, options);
    };
  });
  const page = await context.newPage();
  let errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const file of chosen) {
    const label = `${engine}-${width}-${mode}-${file}`;
    errors = [];
    try {
      await page.goto(`${base}${file}?footer-check=20261027-1`, {waitUntil:'domcontentloaded'});
      await page.locator('.xen-footer-symbol').waitFor({state:'attached'});
      if (mode !== 'no-js') await page.waitForFunction(() => document.querySelector('.xen-footer-symbol')?.dataset.symbolReady === 'true');
      await page.locator('.xen-footer-symbol').scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      const details = await inspect(page, width);
      const reveals = mode === 'no-js' ? [] : await page.evaluate(() => window.footerReveals);
      assert.equal(reveals.length, mode === 'normal' ? 1 : 0, 'one reveal or reduced-motion bypass');
      if (reveals.length) assert.equal(reveals[0].options.duration, 700);
      assert.equal(errors.length, 0, JSON.stringify(errors));
      if (mode === 'normal') {
        if (['index.html','design.html','studio.html'].includes(file)) await page.screenshot({path:`${out}/${label.replace('.html','.png')}`});
        await page.locator('.xen-footer-top,.xen-back-top').click();
        await page.waitForFunction(() => window.scrollY < 2);
        await page.locator('.xen-footer-symbol').scrollIntoViewIfNeeded();
        await page.waitForTimeout(800);
        assert.equal((await page.evaluate(() => window.footerReveals)).length, 1, 'must not replay');
        if (width <= 600) await page.locator('.xen-footer-symbol').tap();
        else {await page.locator('.xen-footer-symbol').focus(); await page.keyboard.press('Enter');}
        await page.waitForURL('https://xencsj.github.io/portfolio/', {waitUntil:'domcontentloaded'});
        await page.goBack({waitUntil:'domcontentloaded'});
        await page.locator('.xen-footer-symbol').scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
        await inspect(page, width);
        await page.reload({waitUntil:'domcontentloaded'});
        await page.locator('.xen-footer-symbol').scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
        await inspect(page, width);
      }
      results.push({label, pass:true, details});
      console.log('PASS', label);
    } catch (e) {
      results.push({label, pass:false, error:e.stack, errors});
      console.error('FAIL', label, e.message);
      await page.screenshot({path:`${out}/${label}-failure.png`}).catch(() => {});
    }
  }
  await context.close();
}
(async () => {
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  const base = process.env.FOOTER_BASE_URL || `http://127.0.0.1:${server.address().port}/`;
  for (const [name,type] of [['chromium',chromium],['webkit',webkit]]) {
    const browser = await type.launch();
    try {
      for (const width of [1440,390]) await run(browser,name,base,width);
      for (const mode of ['reduce','no-js']) await run(browser,name,base,390,mode,['index.html','design.html','studio.html']);
      for (const width of [320,375,430]) await run(browser,name,base,width,'normal',['index.html','design.html','studio.html']);
    } finally {await browser.close();}
  }
  const passed = results.filter(r => r.pass).length;
  fs.writeFileSync(`${out}/report.json`, JSON.stringify({base, passed, total:results.length, results},null,2));
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\nFooter symbol: **${passed}/${results.length}** checks passed.\nBase: ${base}\n17 pages; Chromium/WebKit; 1440/390px plus 320/375/430px examples; original image, spacing, centering, 700ms once-only fade, keyboard/desktop and mobile link, Back to Top, history, reload, no JS and reduced motion.\n`);
  if (passed !== results.length) process.exitCode = 1;
})().catch(e => {console.error(e);process.exitCode=1;}).finally(() => server.close());
