// Verify rendered external SVGs, navigation and responsive header/drawer behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium, webkit, devices, expect } = require('@playwright/test');
const pages = ['index', ...Object.keys(require('./category-titles.json'))];
const base = (process.env.SHOP_ICONS_URL || 'http://127.0.0.1:8765/').replace(/\/?$/, '/');
const output = 'shop-icons-qa';
fs.mkdirSync(output, {recursive: true});
const results = [];
const profiles = [
  ['pc-chromium', chromium, {viewport:{width:1440,height:1000}}],
  ['iphone-webkit', webkit, {...devices['iPhone 13'], deviceScaleFactor:1}],
  ['android-chromium', chromium, {...devices['Pixel 5'], deviceScaleFactor:1}],
  ['small-phone', chromium, {viewport:{width:320,height:740},isMobile:true,hasTouch:true}],
  ['pc-webkit', webkit, {viewport:{width:1440,height:1000}}],
];
async function rendered(icon) {
  await expect(icon).toBeVisible();
  await expect.poll(() => icon.evaluate(el => {
    const b=el.querySelector('use').getBBox(); return b.width > 10 && b.height > 10;
  })).toBe(true);
}
async function run() {
  for (const [name,engine,options] of profiles) {
    const browser = await engine.launch();
    const ctx = await browser.newContext(options);
    const page = await ctx.newPage();
    const errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    // Keep real local site assets; third-party media/analytics are outside this check.
    await page.route('**/*', route=>route.request().url().startsWith(base)?route.continue():route.abort());
    try {
      for (const slug of pages) {
        console.log('CHECK',name,slug);
        assert.equal((await page.goto(base+slug+'.html',{waitUntil:'domcontentloaded'})).status(),200);
        const header=page.locator('#xen-site-header');
        const cart=header.locator('.xen-header-cart');
        const toggle=header.locator('.xen-header-toggle');
        await rendered(cart.locator('svg'));
        assert.equal(await cart.getAttribute('href'),'./apparel.html');
        const geometry=await header.evaluate(el=>{
          const box=s=>{const r=el.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right}};
          return {home:box('.xen-header-home'),cart:box('.xen-header-cart'),toggle:box('.xen-header-toggle'),height:el.getBoundingClientRect().height,
            color:getComputedStyle(el.querySelector('.xen-header-cart svg')).stroke,
            overflow:document.documentElement.scrollWidth>innerWidth+1};
        });
        assert.equal(geometry.height,56);
        assert.equal(geometry.color,'rgb(255, 255, 255)');
        assert.ok(geometry.home.right<=geometry.cart.x && geometry.cart.right<=geometry.toggle.x);
        assert.ok(geometry.cart.w>=44 && geometry.cart.h>=44);
        assert.ok(!geometry.overflow, name+' '+slug+' overflow');
        await toggle.click();
        await expect(page.locator('#xen-drawer')).toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded','true');
        const shop=page.locator('#xen-menu a[href="./apparel.html"]');
        await shop.scrollIntoViewIfNeeded();
        const menuIcon=shop.locator('svg');
        await rendered(menuIcon);
        const styles=await menuIcon.evaluate(el=>{
          const s=getComputedStyle(el),r=el.getBoundingClientRect(),t=el.parentElement.querySelector('.xen-menu-en').getBoundingClientRect();
          return {color:s.stroke,width:s.width,height:s.height,stroke:s.strokeWidth,overlap:r.right>t.left};
        });
        assert.deepEqual(styles,{color:'rgb(201, 170, 120)',width:'20px',height:'20px',stroke:'1.65px',overlap:false});
        if(slug==='index')await page.screenshot({path:`${output}/${name}-menu.png`});
        await page.locator('.xen-drawer-close').click();
        await expect(page.locator('#xen-drawer')).not.toBeVisible();
        await expect(toggle).toHaveAttribute('aria-expanded','false');
        await toggle.click();
        await page.keyboard.press('Escape');
        await expect(page.locator('#xen-drawer')).not.toBeVisible();
        await expect(toggle).toBeFocused();
        if(slug==='index') {
          await page.waitForTimeout(9000);
          await page.screenshot({path:`${output}/${name}-index.png`});
          const item=page.locator('.index-directory a[href="./apparel.html"]');
          await item.scrollIntoViewIfNeeded();
          await rendered(item.locator('svg'));
          await page.screenshot({path:`${output}/${name}-index-directory.png`});
          await item.click(); await expect(page).toHaveURL(base+'apparel.html');
          await page.goto(base+slug+'.html',{waitUntil:'domcontentloaded'});
        }
        if(slug==='creator') {
          const link=page.locator('.creator-connect-links a[aria-label="Shop"]');
          assert.equal(await link.getAttribute('href'),'https://xen.official.ec/');
          assert.equal(await link.getAttribute('target'),'_blank');
          await link.scrollIntoViewIfNeeded(); await rendered(link.locator('svg'));
          assert.equal(await link.locator('svg').evaluate(el=>getComputedStyle(el).stroke),'rgb(245, 245, 245)');
          await page.screenshot({path:`${output}/${name}-creator.png`});
        }
        if(slug==='studio') {
          const link=page.locator('.studio-service-link[href="./apparel.html"]');
          await link.scrollIntoViewIfNeeded(); await rendered(link.locator('svg'));
          await page.screenshot({path:`${output}/${name}-studio.png`});
          await link.click(); await expect(page).toHaveURL(base+'apparel.html');
          await page.goto(base+slug+'.html',{waitUntil:'domcontentloaded'});
        }
        await cart.click(); await expect(page).toHaveURL(base+'apparel.html');
        await page.goto(base+slug+'.html',{waitUntil:'domcontentloaded'});
        await toggle.click(); await page.locator('#xen-menu a[href="./apparel.html"]').click();
        await expect(page).toHaveURL(base+'apparel.html');
        results.push({profile:name,page:slug,passed:true,geometry,menu:styles});
        console.log('PASS',name,slug);
      }
      assert.deepEqual(errors,[],name+' JavaScript errors');
    } catch(error) {
      console.error('Verification failed:',error);
      fs.writeFileSync(`${output}/partial-results.json`,JSON.stringify({base,results},null,2));
      await page.screenshot({path:`${output}/${name}-failure.png`,timeout:5000}).catch(e=>console.warn('Failure screenshot unavailable:',e.message));
      throw error;
    } finally {await browser.close();}
  }
  fs.writeFileSync(`${output}/results.json`,JSON.stringify({base,results},null,2));
  console.log(`PASS ${results.length} page/profile cases. Real devices are not tested.`);
}
run().catch(error=>{fs.writeFileSync(`${output}/failure.txt`,error.stack);console.error(error);process.exitCode=1;});
