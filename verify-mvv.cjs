/* Isolated MVV regression and visual checks. Run: node verify-mvv.cjs */
const { chromium, webkit, devices } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const output = path.join(__dirname, 'mvv-qa');
fs.mkdirSync(output, {recursive:true});
const expected = [
  '独創的な表現で、想いを社会に届く価値へ。',
  '独自の感性と創造力を活かし、人々の想いや課題を形にする。表現の領域を超えて、受け取る人にとって意味のある価値を生み出す。',
  '創造が、人々の心と社会を豊かにする未来。',
  '新しい発想や表現が、人々の感情や暮らしに前向きな変化をもたらし、創造の価値が社会に広がる未来を目指す。',
  '価値で、応える。', '相手の目的に向き合い、確かな成果と信頼を積み重ねる。',
  '受託制作では、顧客と合意した目的・品質・条件を優先し、長期的な信頼を大切にする。',
  '独自の答えを、創る。', '自分自身の美学と相手の目的を掛け合わせ、既存の正解にとらわれない価値を生み出す。',
  '可能性を、拓く。', '現状に満足せず、新しい技術・発想・表現を磨き続ける。',
  '創造を、絶やさない。', 'ものづくりへの情熱を原動力に、持続可能な創作を続ける。'
];
const results=[];
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const filename=path.resolve(__dirname,'.'+name);
  if(!filename.startsWith(__dirname+path.sep)) {res.writeHead(403).end();return;}
  fs.readFile(filename,(err,data)=>{
    if(err){res.writeHead(404).end();return;}
    const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);
  });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=process.env.MVV_PUBLIC_URL || `http://127.0.0.1:${server.address().port}/studio.html`;
 console.log('Target:',url);
 for(const [name,type,options] of [
  ['desktop',chromium,{viewport:{width:1440,height:1000}}],
  ['iphone-webkit',webkit,{...devices['iPhone 13']}],
  ['small-webkit',webkit,{...devices['iPhone SE'],viewport:{width:320,height:568}}]
 ]) {
  const browser=await type.launch();
  try {
   const context=await browser.newContext(options);
   // Do not send synthetic QA visits to the site's analytics account.
   await context.route(/googletagmanager|google-analytics/,route=>route.abort());
   const page=await context.newPage();const errors=[];
   page.on('pageerror',err=>errors.push(String(err)));
   await page.goto(url,{waitUntil:'load'});
   const root=page.locator('#studio-mvv');
   await page.waitForFunction(()=>document.querySelector('#studio-mvv')?.dataset.mvvState==='waiting');
   assert.equal(await page.locator('.studio-values-orbit,.studio-values-summary').count(),0);
   assert.equal(await page.locator('.mvv-layer').count(),3);
   assert.deepEqual(await page.locator('#studio-mvv .studio-mvv-statement,#studio-mvv .studio-mvv-copy p').allTextContents(),expected);
   assert.equal(await page.locator('.mvv-detail').isVisible(),false);
   // Record the actual animation frames while scroll enters the observer.
   await root.evaluate(el=>{
    window.mvvSamples=[]; let started=0;
    const record=t=>{
     if(el.dataset.mvvState==='assembling'){
      if(!started)started=t;
      window.mvvSamples.push({t:t-started,opacity:[...el.querySelectorAll('.mvv-layer')].map(n=>+getComputedStyle(n).opacity),sweep:+getComputedStyle(el.querySelector('.mvv-outline-sweep')).opacity});
     }
     if(el.dataset.mvvState==='complete'&&started)return;
     requestAnimationFrame(record);
    };requestAnimationFrame(record);
   });
   await page.locator('.mvv-pyramid').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#studio-mvv').dataset.mvvState==='complete');
   const samples=await page.evaluate(()=>window.mvvSamples);
   const first=idx=>samples.find(x=>x.opacity[idx]>.1)?.t;
   assert(first(2)<first(1)&&first(1)<first(0),'VALUES → VISION → MISSION');
   assert(samples.some(x=>x.sweep>.5),'Perimeter sweep is visible');
   const geometry=await page.locator('.mvv-pyramid').evaluate(el=>{
    const r=el.getBoundingClientRect();return {width:r.width,height:r.height,layers:[...el.querySelectorAll('.mvv-layer')].map(n=>n.getBoundingClientRect().height)};
   });
   assert(Math.abs(geometry.height/geometry.width-Math.sqrt(3)/2)<.002);
   geometry.layers.forEach(h=>assert(Math.abs(h-geometry.height/3)<1));
   await page.screenshot({path:path.join(output,`${name}-complete.png`)});
   for(const key of ['mission','vision','values']){
    const button=page.locator(`#mvv-${key}-button`);
    if(options.isMobile) await button.tap();else await button.click();
    await page.waitForTimeout(350);
    assert.equal(await button.getAttribute('aria-expanded'),'true');
    assert.equal(await page.locator(`#${key}`).isVisible(),true);
    assert.equal(await page.locator('.mvv-detail-panel:visible').count(),1);
    assert.equal(await page.locator('.mvv-layer[aria-expanded="true"]').count(),1);
    if(key==='mission')await page.screenshot({path:path.join(output,`${name}-mission.png`)});
   }
   await page.locator('#values').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(output,`${name}-values.png`)});
   await page.locator('#mvv-values-button').click();
   assert.equal(await page.locator('.mvv-detail').isVisible(),false);
   // Native Enter/Space, arrow navigation, and Escape.
   await page.locator('#mvv-mission-button').focus();
   await page.keyboard.press('Enter');
   assert.equal(await page.locator('#mission').isVisible(),true);
   await page.keyboard.press('ArrowDown');
   assert.equal(await page.locator('#mvv-vision-button').evaluate(el=>el===document.activeElement),true);
   await page.keyboard.press('Space');
   assert.equal(await page.locator('#vision').isVisible(),true);
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('.mvv-detail').isVisible(),false);
   await page.locator('#studio-about-title').scrollIntoViewIfNeeded();
   await page.locator('.mvv-pyramid').scrollIntoViewIfNeeded();
   assert.equal(await root.getAttribute('data-mvv-state'),'complete');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.locator('#contact-consultation-toggle').click();
   assert.equal(await page.locator('#contact-consultation-panel').isVisible(),true);
   await page.reload();
   await page.locator('.mvv-pyramid').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector('#studio-mvv').dataset.mvvState==='complete');
   assert.equal(await page.locator('.mvv-layer').evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).opacity==='1')),true);
   await page.emulateMedia({reducedMotion:'reduce'});await page.reload();
   assert.equal(await root.getAttribute('data-mvv-state'),'complete');
   await page.locator('#mvv-mission-button').click();
   assert.equal(await page.locator('#mission').isVisible(),true);
   assert.equal(await root.evaluate(el=>el.getAnimations({subtree:true}).length),0);
   assert.deepEqual(errors,[]);
   const nojs=await browser.newContext({...options,javaScriptEnabled:false});
   const staticPage=await nojs.newPage();await staticPage.goto(url);
   assert.equal(await staticPage.locator('.mvv-pyramid').isVisible(),true);
   assert.equal(await staticPage.locator('.mvv-detail-panel:visible').count(),3);
   await nojs.close();
   const noio=await browser.newContext(options);await noio.addInitScript(()=>{delete window.IntersectionObserver;});
   const fallback=await noio.newPage();await fallback.goto(url);
   assert.equal(await fallback.locator('#studio-mvv').getAttribute('data-mvv-state'),'complete');
   await fallback.locator('#mvv-vision-button').click();assert.equal(await fallback.locator('#vision').isVisible(),true);
   await noio.close();
   results.push({name,pass:true,geometry,timing:{values:first(2),vision:first(1),mission:first(0)},errors});
   fs.writeFileSync(path.join(output,`${name}-animation-samples.json`),JSON.stringify(samples));
   console.log(name,'PASS',JSON.stringify(results.at(-1)));
  } catch(error){results.push({name,pass:false,error:String(error)});console.error(error);throw error;}
  finally{await browser.close();fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));}
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
