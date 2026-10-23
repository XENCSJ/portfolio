// Verify image-only galleries while retaining accessible descriptions and product copy.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium, webkit, devices} = require('playwright');
const pages = 'index studio creator storybooks animation sound cinematic snap design apparel architecture space artworks sns-management price-list'.split(' ');
const profiles = {
  desktop: {engine: chromium, options: {viewport: {width: 1440, height: 1000}}},
  android: {engine: chromium, options: {...devices['Pixel 7']}},
  iphone: {engine: webkit, options: {...devices['iPhone 13']}},
  safari: {engine: webkit, options: {viewport: {width: 1440, height: 1000}}}
};
const profile = process.env.CAPTION_PROFILE || 'desktop';
const config = profiles[profile];
assert.ok(config, 'Unknown CAPTION_PROFILE');
const base = process.env.CAPTION_PUBLIC_URL || 'http://127.0.0.1:8873/';
const out = process.env.CAPTION_QA_DIR || 'image-caption-qa';
const mime = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const root = process.cwd();
const server = http.createServer((req,res) => {
  const file = path.resolve(root, decodeURIComponent(new URL(req.url, 'http://localhost').pathname.slice(1)));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404).end(); return;}
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
(async () => {
  if (!process.env.CAPTION_PUBLIC_URL) await new Promise(resolve => server.listen(8873, '127.0.0.1', resolve));
  fs.mkdirSync(out, {recursive:true});
  const browser = await config.engine.launch({headless:true, ...(process.env.CHROMIUM_EXECUTABLE_PATH && config.engine===chromium ? {executablePath:process.env.CHROMIUM_EXECUTABLE_PATH} : {})});
  const context = await browser.newContext({...config.options, reducedMotion:'reduce'});
  const results = [];
  try {
    for (const slug of pages) {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.route(/googletagmanager|google-analytics/, route => route.abort());
      const response = await page.goto(base + slug + '.html', {waitUntil:'domcontentloaded'});
      assert.equal(response.status(), 200, slug + ' HTTP status');
      if (slug==='apparel') await page.locator('.catalog-product').first().waitFor();
      assert.equal(await page.locator('.viewer-caption,[data-gallery-label],.arch-figure figcaption').count(), 0, slug+' redundant captions');
      const text = await page.locator('body').innerText();
      assert.ok(!/\.(?:jpe?g|png|webp)(?:\s|$)/i.test(text), slug+' visible file name');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth+1), slug+' horizontal overflow');
      const images = await page.locator('img[src]').evaluateAll(async elements => {
        elements.forEach(image => image.loading='eager');
        await Promise.all(elements.map(image => Promise.race([image.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,15000))])));
        return elements.map(image => ({src:image.currentSrc||image.src,loaded:image.complete&&image.naturalWidth>0,alt:image.getAttribute('alt')}));
      });
      const localBroken = images.filter(image=>image.src.startsWith(base)&&!image.loaded);
      assert.deepEqual(localBroken, [], slug+' site image loading');
      assert.ok(images.every(image=>image.alt!==null), slug+' accessible alt attributes');
      const generatedLabels = await page.locator('.gallery-item').evaluateAll(elements => elements.map(element=>getComputedStyle(element,'::after').content).filter(text=>!['none','normal','""'].includes(text)));
      assert.deepEqual(generatedLabels, [], slug+' generated labels');
      const candidates = page.locator('.gallery-item:visible');
      let viewerChecked = false;
      if (await candidates.count() && await page.locator('#image-viewer').count()) {
        const opener = slug==='design' ? page.locator('#k18-signet-ring .gallery-item').first() : candidates.first();
        const expectedAlt = await opener.locator('img').getAttribute('alt');
        await opener.focus();
        assert.ok(['none','normal','""'].includes(await opener.evaluate(element=>getComputedStyle(element,'::after').content)), slug+' focus caption');
        if (profile==='desktop'||profile==='safari') {
          await opener.hover();
          assert.ok(['none','normal','""'].includes(await opener.evaluate(element=>getComputedStyle(element,'::after').content)), slug+' hover caption');
        }
        await opener.click();
        const viewer = page.locator('#image-viewer');
        await page.locator('#image-viewer[open]').waitFor();
        await page.waitForFunction(()=>document.querySelector('#image-viewer img').naturalWidth>0);
        assert.equal(await viewer.locator('img').getAttribute('alt'),expectedAlt,slug+' viewer alt');
        assert.ok(!(await viewer.innerText()).includes(expectedAlt),slug+' viewer visual caption');
        const firstSource=await viewer.locator('img').getAttribute('src');
        await viewer.locator('.viewer-next').click();
        await page.waitForFunction(()=>document.querySelector('#image-viewer img').complete&&document.querySelector('#image-viewer img').naturalWidth>0);
        if(await candidates.count()>1)assert.notEqual(await viewer.locator('img').getAttribute('src'),firstSource,slug+' next image');
        assert.equal(await viewer.locator('.viewer-original').getAttribute('href'),await viewer.locator('img').getAttribute('src'),slug+' original link');
        await page.keyboard.press('ArrowLeft');
        assert.equal(await viewer.locator('img').getAttribute('src'),firstSource,slug+' keyboard previous');
        if(slug==='design')await page.screenshot({path:path.join(out,profile+'-design-viewer.png')});
        await viewer.locator('.viewer-close').click();
        await page.locator('#image-viewer[open]').waitFor({state:'detached'});
        viewerChecked=true;
      }
      if(slug==='design') {
        const section=page.locator('#k18-signet-ring');
        assert.equal(await section.locator('.gallery-item').count(),2);
        const rects=await section.locator('.gallery-item img').evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().toJSON()));
        assert.ok(Math.abs(rects[0].top-rects[1].top)<1&&rects[1].left>rects[0].left,'ring two-column layout');
        assert.ok((await section.innerText()).includes('MATERIAL：K18 Yellow Gold'));
        assert.ok((await section.innerText()).includes('装飾を削ぎ落とし、象徴を身につける。'));
        assert.equal(await section.locator('a[href="https://xen.official.ec/items/156850693"]').count(),1);
        await section.screenshot({path:path.join(out,profile+'-design-ring.png')});
      }
      if(slug==='apparel') {
        assert.equal(await page.locator('.product-caption').count(),3,'intentional product names retained');
        for(const category of ['APPAREL','JEWELRY','ALL'])await page.getByRole('tab',{name:category,exact:true}).click();
        for(const id of [156850693,156851036,156851056]) {
          const product=page.locator('#base-product-'+id);
          assert.equal(await product.locator(':scope>.base-product-cta').getAttribute('href'),'https://xen.official.ec/items/'+id);
          await product.locator('summary').click();
          assert.ok(await product.locator('.jewelry-description').isVisible());
          await product.locator('summary').click();
        }
      }
      if(slug==='space')assert.equal(await page.locator('.space-caption').count(),9,'formal space concepts retained');
      if(slug==='sns-management')assert.ok(await page.locator('#sns-growth-caption').isVisible(),'intentional chart annotation retained');
      assert.deepEqual(errors,[],slug+' JavaScript errors');
      const externalBroken=images.filter(image=>!image.src.startsWith(base)&&!image.loaded);
      results.push({profile,slug,images:images.length,localBroken,externalBroken,viewerChecked,overflow:false,errors});
      if(process.env.CAPTION_REQUIRE_EXTERNAL==='1')assert.deepEqual(externalBroken,[],slug+' external image loading');
      console.log(profile,slug,'PASS',images.length+' images',externalBroken.length+' external images unavailable');
      await page.close();
    }
  } finally {
    fs.writeFileSync(path.join(out,profile+'-results.json'),JSON.stringify(results,null,2));
    await browser.close();
    server.close();
  }
})().catch(error=>{console.error(error);server.close();process.exit(1)});
