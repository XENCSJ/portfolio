/* Browser regression gate for the animation-only change. Run with Playwright. */
const { chromium, webkit, devices } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const pages = 'index studio creator storybooks animation sound cinematic snap design apparel architecture space artworks sns-management price-list'.split(' ');
const result = [], failures = [];
const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.JPEG':'image/jpeg','.webp':'image/webp'};
const server = http.createServer((req,res) => {
  const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1) || 'index.html';
  const file = path.resolve(name);
  if (!file.startsWith(process.cwd()+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
const base = process.env.MOTION_BASE_URL || 'http://127.0.0.1:8765/';
async function check(browser,profile,label) {
  const context=await browser.newContext(profile);
  // External player/network behavior is unchanged. Keep QA deterministic and avoid analytics.
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin ? route.continue() : route.abort());
  for(const name of pages) {
    const page=await context.newPage(); const errors=[];page.on('pageerror',e=>errors.push(e.message));
    try {
      await page.goto(base+name+'.html',{waitUntil:'domcontentloaded'});
      await page.waitForSelector('body.xm-ready'); await page.waitForTimeout(1700);
      const layout=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth-innerWidth,
        title:document.querySelector('main h1')?.textContent.trim(),
        opacity:getComputedStyle(document.querySelector('main h1')).opacity,
        scenes:document.querySelectorAll('.xm-active').length,
        atmospheric:getComputedStyle(document.querySelector('.xm-atmosphere')).pointerEvents,
        animations:document.getAnimations().filter(a=>(a.animationName||'').startsWith('xm-')).map(a=>a.animationName)
      }));
      assert(layout.overflow<=2,`overflow ${layout.overflow}`);assert(layout.title);assert.equal(layout.opacity,'1');assert(layout.scenes>0);assert.equal(layout.atmospheric,'none');assert(layout.animations.length>0);
      await page.screenshot({path:`motion-qa/${label}-${name}-top.png`});
      await page.locator('.xen-header-toggle').click();
      await page.locator('.xen-header-toggle[aria-expanded="true"]').waitFor();
      await page.keyboard.press('Escape');
      await page.locator('.xen-header-toggle[aria-expanded="false"]').waitFor();
      if(name==='studio') {
        const toggle=page.locator('.contact-toggle').first();await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      }
      if(name==='price-list') {
        const toggle=page.locator('.price-toggle').first();await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'true');await toggle.click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
      }
      if(name==='creator') {
        const entry=page.locator('.cp-field-entry').first();await entry.locator('summary').click();await page.waitForTimeout(400);assert.equal(await entry.getAttribute('open'),'');await entry.locator('summary').click();
      }
      const target=page.locator('main .xm-tilt,main .sound-section,main .price-category').first();
      if(await target.count()) {
        await target.scrollIntoViewIfNeeded();await page.waitForTimeout(1300);
        if(!profile.isMobile && await target.evaluate(n=>n.classList.contains('xm-tilt'))) {
          await target.hover({position:{x:20,y:20}});await page.waitForTimeout(350);
          const rotation=await target.evaluate(n=>n.style.getPropertyValue('--xm-rotate'));
          assert(rotation && !rotation.endsWith(' 0.00deg'),`pointer tilt did not react: ${rotation}`);
        }
        await page.screenshot({path:`motion-qa/${label}-${name}-detail.png`});
      }
      if(['snap','artworks','architecture','design','space','apparel'].includes(name)) {
        await page.locator('main .gallery-item').first().click();await page.locator('#image-viewer[open]').waitFor();await page.keyboard.press('Escape');await page.locator('#image-viewer').waitFor({state:'hidden'});
      }
      await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);
      assert.equal(await page.locator('.xm-atmosphere').evaluate(n=>getComputedStyle(n).display),'none');
      assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>(a.animationName||'').startsWith('xm-') && a.playState==='running').length),0);
      assert.deepEqual(errors,[]);result.push({profile:label,page:name,...layout,pass:true});
      console.log('PASS',label,name);
    }catch(e){failures.push({profile:label,page:name,error:e.stack});console.error('FAIL',label,name,e.message);await page.screenshot({path:`motion-qa/FAIL-${label}-${name}.png`}).catch(()=>{});}
    await page.close();
  }
  await context.close();
}
(async()=>{
  fs.mkdirSync('motion-qa',{recursive:true});
  if(!process.env.MOTION_BASE_URL) await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
  for(const [engine,profile,label] of [[chromium,{viewport:{width:1440,height:900}},'desktop'],[webkit,{...devices['iPhone 14 Pro Max']},'iphone']]) {
    const browser=await engine.launch();try{await check(browser,profile,label);}finally{await browser.close();}
  }
  const browser=await chromium.launch();
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
  await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(base).origin?route.continue():route.abort());
  const page=await context.newPage();
  for(const name of pages){await page.goto(base+name+'.html',{waitUntil:'domcontentloaded'});const visible=await page.locator('main h1').isVisible();if(!visible)failures.push({page:name,error:'no-JS title hidden'});}
  await browser.close();server.close();
  fs.writeFileSync('motion-qa/report.json',JSON.stringify({result,failures},null,2));
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`## Motion verification\n${result.length}/30 browser page checks passed.\n\n${failures.map(f=>`- ${f.profile||'no-JS'} / ${f.page}: ${f.error}`).join('\n')}\n`);
  if(failures.length)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
