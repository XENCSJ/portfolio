const {chromium,webkit}=require('playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const path=require('node:path');
const out='music-navigation-qa';fs.mkdirSync(out,{recursive:true});
const remote=process.env.MUSIC_BASE_URL;
const base=remote||'http://127.0.0.1:8765/';
const server=remote?null:spawn('python3',['-m','http.server','8765'],{stdio:'ignore'});
const widths=[375,390,430,768,1024,1280,1440,1920];
const results=[];
let currentBrowser,currentPage;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
  if(server){for(let i=0;i<30;i++){try{await fetch(base);break;}catch{await sleep(100);}}}
  for(const [engine,api] of Object.entries({chromium,webkit})){
    const browser=currentBrowser=await api.launch();
    for(const width of widths){
      const context=await browser.newContext({viewport:{width,height:width<700?844:1000},deviceScaleFactor:1,isMobile:width<700,hasTouch:width<700});
      const page=currentPage=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
      if(!remote) await page.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
      await page.goto(base+'sound.html',{waitUntil:'load'});
      await page.waitForSelector('[data-music-navigation-ready="true"]');
      const nav=page.locator('.music-index');const drawers=nav.locator('details');const toggles=nav.locator('summary');
      assert.equal(await drawers.count(),3);assert.equal(await nav.locator('[data-expanded="true"]').count(),0);
      const expected=await page.locator('.sound-section').evaluateAll(sections=>sections.filter(s=>s.querySelector('.sound-release-card')).map(s=>[...s.querySelectorAll('.sound-release-card')].map(c=>({id:c.id,title:c.querySelector('.sound-song-title').textContent,src:c.querySelector('.sound-song-cover').getAttribute('src')}))));
      assert.equal(expected.flat().length,8);
      for(let genre=0;genre<3;genre++){
        await toggles.nth(genre).click();
        await page.waitForTimeout(390);
        assert.equal(await nav.locator('[data-expanded="true"]').count(),1);
        assert.equal(await drawers.filter({has:page.locator('summary[aria-expanded="true"]')}).count(),1);
        const links=drawers.nth(genre).locator('.music-index-link');assert.equal(await links.count(),expected[genre].length);
        for(let n=0;n<expected[genre].length;n++){
          const link=links.nth(n),item=expected[genre][n];
          assert.equal(await link.getAttribute('href'),'#'+item.id);
          assert.equal(await link.locator('.music-index-title').textContent(),item.title);
          assert.equal(await link.locator('img').getAttribute('src'),item.src);
          const img=await link.locator('img').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height,n:el.naturalWidth}));
          assert(Math.abs(img.w-img.h)<1&&img.n>0);
        }
        const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert(!overflow,'horizontal overflow '+width);
        const geometry=await toggles.nth(genre).evaluate(el=>{const en=el.querySelector('.sound-category-en').getBoundingClientRect(),ja=el.querySelector('.sound-category-ja').getBoundingClientRect();return{enBottom:en.bottom,jaTop:ja.top,right:en.right,viewport:innerWidth};});
        assert(geometry.jaTop>=geometry.enBottom-1);assert(geometry.right<=geometry.viewport);
        if(genre===0&&(width===390||width===1440)){
          await nav.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,engine+'-'+width+'-navigation.jpg'),type:'jpeg',quality:88});
        }
        const targets=(width===390||width===1440)?expected[genre]:[expected[genre].at(-1)];
        for(const item of targets){
          const link=links.filter({has:page.locator('.music-index-title',{hasText:item.title})});
          await link.click();
          if(width===390&&genre===0&&item===targets[0]) await page.setViewportSize({width,height:876});
          const card=page.locator('#'+item.id);
          await page.waitForFunction(id=>document.getElementById(id)?.querySelector('.music-navigation-highlight'),item.id,{polling:'raf',timeout:6000});
          assert.equal(await page.locator('dialog[open]').count(),0,'index must not open reader');
          assert.equal(new URL(page.url()).hash,'#'+item.id);
          const position=await card.locator('.sound-cover-frame').evaluate(el=>({top:el.getBoundingClientRect().top,header:document.getElementById('xen-site-header').getBoundingClientRect().height}));
          assert(position.top>=position.header+16&&position.top<=position.header+32,JSON.stringify({engine,width,id:item.id,...position}));
          assert.equal(await page.evaluate(()=>document.activeElement.id),item.id);
          if(genre===0&&item===targets[0]&&(width===390||width===1440)) await page.screenshot({path:path.join(out,engine+'-'+width+'-destination.jpg'),type:'jpeg',quality:88});
          if(width===390&&genre===0&&item===targets[0]) await page.keyboard.press('Escape');
          await page.waitForTimeout(550);assert.equal(await card.locator('.music-navigation-highlight').count(),0);
          if(width===390&&genre===0&&item===targets[0]) await page.setViewportSize({width,height:844});
        }
      }
      await toggles.nth(2).click();await page.waitForTimeout(390);assert.equal(await nav.locator('details[open]').count(),0);
      await toggles.nth(0).focus();await page.keyboard.press('Enter');await page.waitForTimeout(390);assert.equal(await toggles.nth(0).getAttribute('aria-expanded'),'true');
      await page.keyboard.press('Space');await page.waitForTimeout(390);assert.equal(await toggles.nth(0).getAttribute('aria-expanded'),'false');
      await toggles.nth(0).click();await toggles.nth(1).click();await toggles.nth(2).click();await page.waitForTimeout(390);assert.equal(await nav.locator('details[open]').count(),1);
      const stage=page.locator('.sound-showcase-stage');await stage.focus();const before=await stage.getAttribute('data-active-release');await page.keyboard.press('ArrowRight');assert.notEqual(await stage.getAttribute('data-active-release'),before);assert.equal(await stage.locator('.sound-slide').count(),8);
      const details=page.locator('#tochu-no-mamade .music-reader-open');await details.click();await page.locator('dialog[open]').waitFor();await page.locator('.music-reader-close').click();
      assert.equal(await page.locator('.sound-release-card').count(),8);
      assert.equal(errors.length,0,errors.join('\n'));results.push({engine,width,passed:true});
      console.log('PASS',engine,width);await context.close();
    }
    const reducedContext=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const reducedPage=await reducedContext.newPage();
    await reducedPage.goto(base+'sound.html');await reducedPage.locator('[data-music-navigation-ready]').waitFor();
    await reducedPage.locator('.music-index summary').nth(0).click();await reducedPage.locator('.music-index-link').first().click();await reducedPage.locator('.music-navigation-highlight').waitFor();
    assert.equal(await reducedPage.locator('.music-navigation-highlight').evaluate(e=>getComputedStyle(e).animationName),'none');results.push({engine,reducedMotion:true,passed:true});await reducedContext.close();
    const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const p=await plain.newPage();await p.goto(base+'sound.html');await p.locator('.music-index summary').nth(0).click();assert.equal(await p.locator('.music-index-link:visible').count(),4);await p.locator('.music-index summary').nth(1).click();assert.equal(await p.locator('.music-index details[open]').count(),1);results.push({engine,noJS:true,passed:true});await plain.close();
    await browser.close();
  }
}
run().then(()=>{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));console.log('All',results.length,'cases passed.');}).catch(async e=>{console.error(e);if(currentPage){console.log('FAIL STATE',await currentPage.evaluate(()=>({url:location.href,scrollY,active:document.activeElement?.id,highlight:[...document.querySelectorAll('.music-navigation-highlight')].map(e=>e.closest('.sound-release-card').id)})));await currentPage.screenshot({path:path.join(out,'failure.jpg'),fullPage:false});}process.exitCode=1;}).finally(async()=>{await currentBrowser?.close();server?.kill();});
