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
const server = http.createServer((req,res) => {
  const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = path.resolve('.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(process.cwd() + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(res);
});
const results = [];
async function inspect(page, width) {
  await page.locator('.xen-footer-symbol img').evaluate(img => img.decode());
  const v = await page.locator('footer').evaluate(footer => {
    const rect = el => {const r = el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom};};
    const css = el => {const s=getComputedStyle(el); return {color:s.color,opacity:s.opacity,transform:s.transform,fontSize:s.fontSize,lineHeight:s.lineHeight,background:s.backgroundImage,border:s.borderTopWidth,shadow:s.boxShadow};};
    const top=footer.querySelector('.xen-footer-return'), link=footer.querySelector('.xen-footer-symbol'), img=link.querySelector('img'), credits=footer.querySelector('.xen-footer-credits'), powered=credits.querySelector('.xen-footer-powered'), copyright=credits.querySelector('.xen-footer-legal'), arrow=top.querySelector('svg');
    return {version:footer.dataset.footerVersion, count:footer.querySelectorAll('.xen-footer-symbol').length, footer:rect(footer), signature:rect(footer.querySelector('.xen-footer-signature')), top:rect(top), link:rect(link), image:rect(img), credits:rect(credits), powered:rect(powered), copyright:rect(copyright), arrow:rect(arrow), topStyle:css(top), imageStyle:css(img), poweredStyle:css(powered), copyrightStyle:css(copyright), background:getComputedStyle(footer).backgroundColor, border:getComputedStyle(footer).borderTopWidth,padding:[getComputedStyle(footer).paddingTop,getComputedStyle(footer).paddingBottom], before:getComputedStyle(top,'::before').content, after:getComputedStyle(top,'::after').content, text:[powered.textContent,copyright.textContent], loaded:img.complete&&img.naturalWidth>0, source:img.getAttribute('src'), href:link.href, overflow:document.documentElement.scrollWidth>innerWidth+1, creditsOverflow:credits.scrollWidth>credits.clientWidth+1, actionCount:footer.querySelectorAll('.xen-footer-actions a').length, reveals:window.footerReveals||[]};
  });
  assert.equal(v.version, '20261027-vertical1');
  assert.equal(v.count,1); assert(v.loaded); assert.equal(v.source,'./XEN_logo_fixed_black.svg');
  assert.equal(v.href,'https://xencsj.github.io/portfolio/');
  assert.equal(v.image.width,width<=600?64:76);
  assert(Math.abs(v.image.height/v.image.width-2293/2232)<.01);
  for(const key of ['top','link','image','credits','powered','copyright','arrow']) assert(Math.abs(v[key].x+v[key].width/2-(v.footer.x+v.footer.width/2))<1,`${key} centered`);
  assert(Math.abs(v.link.y-v.top.bottom-(width<=600?32:36))<1,'top/logo gap');
  assert(Math.abs(v.credits.y-v.link.bottom-(width<=600?24:26))<1,'logo/credits gap');
  assert(Math.abs(v.copyright.y-v.powered.bottom-6)<1,'two-line gap');
  assert.deepEqual(v.text,['Powered by XEN','© XEN CREATIVE STUDIO JAPAN']);
  assert(Math.abs(v.powered.height-18)<.1); assert(Math.abs(v.copyright.height-18)<.1);
  assert.equal(v.topStyle.fontSize,'14px'); assert.equal(v.poweredStyle.fontSize,'12px');
  assert.equal(v.copyrightStyle.fontSize,width<=600?'10px':'11px');
  assert.equal(v.arrow.width,width<=600?20:22);
  assert.deepEqual(v.padding,width<=600?['36px','32px']:['48px','40px']);
  assert.equal(v.background,'rgb(0, 0, 0)'); assert.equal(v.border,'0px');
  assert.equal(v.topStyle.border,'0px'); assert.equal(v.topStyle.background,'none'); assert.equal(v.topStyle.shadow,'none');
  assert.equal(v.before,'none'); assert.equal(v.after,'none');
  assert.equal(v.imageStyle.opacity,'1'); assert.equal(v.imageStyle.transform,'none');
  assert(!v.overflow,'horizontal overflow'); assert(!v.creditsOverflow,'credits overflow');
  return v;
}
async function run(browser,engine,base,width,mode='normal',chosen=pages) {
  const mobile=width<=600;
  const context=await browser.newContext({viewport:{width,height:mobile?844:900},isMobile:mobile,hasTouch:mobile,javaScriptEnabled:mode!=='no-js',reducedMotion:mode==='reduce'?'reduce':'no-preference'});
  // External video/store services are not part of this footer regression check.
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  await context.addInitScript(()=>{
    window.footerReveals=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
      if(this.matches('.xen-footer-symbol img,.xen-footer-credits')) window.footerReveals.push({target:this.className,frames,options});
      return original.call(this,frames,options);
    };
  });
  const page=await context.newPage(); page.setDefaultTimeout(12000);
  for(const file of chosen) {
    const label=`${engine}-${width}-${mode}-${file}`;
    try {
      await page.goto(`${base}${file}?footer-check=20261027-vertical1`,{waitUntil:'domcontentloaded'});
      if(mode!=='no-js') await page.waitForFunction(()=>document.querySelector('footer')?.dataset.footerReady==='true');
      await page.locator('.xen-footer-credits').scrollIntoViewIfNeeded();
      await page.waitForTimeout(1000);
      const details=await inspect(page,width);
      assert.equal(details.actionCount,file==='index.html'?0:2,'preserve existing footer navigation');
      assert.equal(details.reveals.length,mode==='normal'?2:0,'one reveal each, reduced-motion bypass');
      if(mode==='normal') {
        assert.equal(details.reveals[0].options.duration,700);
        assert.equal(details.reveals[1].options.delay,180);
      }
      if(!mobile) {
        await page.locator('.xen-footer-return').hover();
        await page.waitForFunction(expected => getComputedStyle(document.querySelector('.xen-footer-chevron')).transform === expected, mode==='reduce'?'none':'matrix(1, 0, 0, 1, 0, -3)');
        const hover=await page.locator('.xen-footer-chevron').evaluate(el=>getComputedStyle(el).transform);
        assert.equal(hover,mode==='reduce'?'none':'matrix(1, 0, 0, 1, 0, -3)');
        await page.mouse.move(0,0);
      }
      await page.screenshot({path:`${out}/${label.replace('.html','.png')}`});
      await page.locator('.xen-footer-return').click();
      // Native smooth scrolling and the JS path must both reach the actual top.
      // Await completion instead of assuming a one-second animation budget.
      await page.waitForFunction(()=>window.scrollY<2);
      await page.locator('.xen-footer-credits').scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      if(mode!=='no-js') assert.equal(await page.evaluate(()=>window.footerReveals.length),mode==='normal'?2:0,'do not replay');
      if(file==='index.html'&&mode==='normal') {
        await page.locator('.xen-footer-return').focus(); await page.keyboard.press('Tab');
        assert.equal(await page.locator('.xen-footer-symbol').evaluate(el=>getComputedStyle(el).outlineWidth),'1px');
      }
      results.push({label,pass:true,details}); console.log('PASS',label);
    } catch(e) {
      results.push({label,pass:false,error:e.stack}); console.error('FAIL',label,e.message);
      await page.screenshot({path:`${out}/${label}-failure.png`}).catch(()=>{});
    }
  }
  await context.close();
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.FOOTER_BASE_URL||`http://127.0.0.1:${server.address().port}/`;
  for(const [name,type] of [['chromium',chromium],['webkit',webkit]]) {
    const browser=await type.launch();
    try {
      for(const width of [1440,390]) await run(browser,name,base,width);
      for(const mode of ['reduce','no-js']) await run(browser,name,base,390,mode,['index.html','design.html','studio.html']);
      for(const width of [320,375,430]) await run(browser,name,base,width,'normal',['index.html','design.html','studio.html']);
      await run(browser,name,base,1440,'reduce',['index.html']);
    } finally { await browser.close(); }
  }
  const passed=results.filter(r=>r.pass).length;
  fs.writeFileSync(`${out}/report.json`,JSON.stringify({base,passed,total:results.length,results},null,2));
  if(process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\nFooter: **${passed}/${results.length}** checks passed.\n17 pages; Chromium/WebKit; 1440/390px; 320/375/430px examples; centered two-line credits, original logo, specified gaps, no lines, no overflow, hover, Back to Top, once-only reveal, no-JS and reduced-motion.\n`);
  if(passed!==results.length) process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
