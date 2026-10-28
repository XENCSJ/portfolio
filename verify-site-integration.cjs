/* Integrated regression for the published INDEX, CREATOR, DISCOVER and MUSIC pages.
   Called by verify-music-motion.cjs in both Chromium and WebKit, locally and on Pages. */
const fs=require('node:fs'),assert=require('node:assert/strict');
const output='music-motion-qa/integrated';fs.mkdirSync(output,{recursive:true});
const blocked=new Set(["space-ee2b661d3cb7", "apparel-ccc341888110", "space-3cdf06737385", "design-e7a94102467b", "design-88900d525066", "architecture-2424aea1ca35", "architecture-b3a885b4a868", "architecture-cd8cdcdb14d0", "architecture-ebc64cb39540", "architecture-1e49dea01c50", "architecture-b2dbd0707f0f", "architecture-fb17daedd9df", "architecture-1d5d294c4bd0", "architecture-f18cf5c8997b", "architecture-0a6065abe276", "architecture-590ec40e476e", "architecture-8b0fe09e46a9", "architecture-9d4659851c16", "architecture-639e72800da4", "architecture-70b86bed2ebf"]);
const screenshot=async(page,name)=>{await page.waitForFunction(()=>document.getAnimations().every(a=>!a.effect?.target?.matches('[data-ql-motion]')||a.playState!=='running'),null,{timeout:15000});return page.screenshot({path:output+'/'+name+'.png',fullPage:false});};
async function pageChecks(page){
 const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,ids:[...document.querySelectorAll('[id]')].map(x=>x.id)}));
 assert(state.overflow<=1,'Horizontal overflow '+state.overflow);
 assert.equal(state.ids.length,new Set(state.ids).size,'Duplicate IDs');
}
module.exports=async function(page,base,width,label){
   await page.goto(base+'/index.html',{waitUntil:'load'});await page.locator('body[data-xim-ready]').waitFor({state:'attached'});
   await page.locator('#creative-index .index-directory').waitFor();
   await page.locator('#creative-index').scrollIntoViewIfNeeded();await page.waitForTimeout(1800);await pageChecks(page);
   const layout=await page.evaluate(()=>{const b=s=>document.querySelector(s).getBoundingClientRect();return {news:b('#xen-news').toJSON(),directory:b('#creative-index').toJSON(),head:b('#index-about-heading').toJSON(),items:b('#index-about-heading + .index-items').toJSON()}});
   assert(Math.abs(layout.news.left-layout.directory.left)<1,'NEWS left edge');assert(Math.abs(layout.news.width-layout.directory.width)<1,'NEWS width');
   assert(layout.head.right<=layout.items.left+1,'Two directory columns');
   await screenshot(page,label+'-index');
   await page.goto(base+'/creator.html#creative-origin');await page.locator('#creative-origin img').scrollIntoViewIfNeeded();await page.waitForTimeout(1600);await pageChecks(page);
   const photo=await page.locator('#creative-origin img').evaluate(e=>({ok:e.complete&&e.naturalWidth===1535,ratio:e.width/e.height,natural:e.naturalWidth/e.naturalHeight}));assert(photo.ok);assert(Math.abs(photo.ratio-photo.natural)<.01);
   await screenshot(page,label+'-origin');
   await page.locator('#channel-main summary').click();await page.waitForTimeout(400);assert(await page.locator('#channel-main').getAttribute('open')!==null);
   await page.locator('#channel-amber summary').click();await page.waitForTimeout(400);assert.equal(await page.locator('#channel-main').getAttribute('open'),null);
   const logos=await page.locator('.xc-logo').evaluateAll(els=>els.map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,fit:getComputedStyle(e).objectFit})));
   assert(logos.length===4&&logos.every(x=>x.width===logos[0].width&&x.height===logos[0].height&&x.fit==='contain'));
   await page.locator('#channel-amber summary').click();await page.waitForTimeout(400);await page.locator('#youtube-channels').scrollIntoViewIfNeeded();await screenshot(page,label+'-channels');
   const sns=await page.locator('.creator-connect-links a').evaluateAll(els=>els.slice(0,5).map(e=>({text:e.textContent.trim(),href:e.href,svg:e.querySelector('svg')?.outerHTML})));
   assert.deepEqual(sns.map(x=>x.text),['Instagram','X','YouTube','TikTok','Spotify']);assert(sns[2].svg&&!sns[2].svg.includes('data-icon="globe"'));
   await page.goto(base+'/what-is-xen.html');await page.locator('[data-gallery-ready="true"]').waitFor();await pageChecks(page);
   const title=await page.locator('.xd-gallery h2').evaluate(e=>({height:e.getBoundingClientRect().height,line:parseFloat(getComputedStyle(e).lineHeight)}));assert(title.height<title.line*1.8,'English gallery heading wrapped');
   const initial=await page.locator('.xd-tile').evaluateAll(els=>els.map(e=>e.dataset.work));assert(initial.every(x=>!blocked.has(x)));
   await page.locator('.xd-mosaic').scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>Number(document.querySelector('.xd-gallery').dataset.changeCount)>=3,{},{timeout:20000});
   const updated=await page.locator('.xd-tile').evaluateAll(els=>els.map(e=>e.dataset.work));assert(updated.every(x=>!blocked.has(x)));
   await page.locator('.xd-tile').first().click();await page.locator('.xd-work-dialog[open]').waitFor();const firstWork=await page.locator('.xd-tile').first().getAttribute('data-work');assert.equal(await page.locator('.xd-work-origin-link').isVisible(),firstWork==='artworks-9c96fa42b34a','Origin link belongs to Mies only');await page.locator('.xd-work-dialog .xd-work-close').click();
   await page.locator('[data-theme="past"]').click();await page.locator('[data-sign="past-1"] a').click();await page.waitForURL('**/creator.html#creative-origin');
   await page.waitForTimeout(1600);
   const originTop=await page.locator('#creative-origin').evaluate(e=>e.getBoundingClientRect().top);assert(originTop>=0&&originTop<220,'Origin anchor not visible '+originTop);
   await page.goBack();await page.locator('[data-panel="past"]:not([hidden])').waitFor();assert.equal(await page.locator('#xd-origin-detail').count(),0);await page.locator('.xd-theme-close').click();await page.waitForFunction(()=>!document.querySelector('.xd-theme-dialog').open&&!/^#(past|present|future|together)$/.test(location.hash));
   for(const theme of ['present','future','together']){await page.locator('[data-theme="'+theme+'"]').click();await page.locator('[data-panel="'+theme+'"]:not([hidden])').waitFor();await page.locator('.xd-theme-close').click();await page.waitForFunction(()=>!document.querySelector('.xd-theme-dialog').open&&!/^#(past|present|future|together)$/.test(location.hash));}
   await page.reload();await page.locator('[data-gallery-ready="true"]').waitFor();assert((await page.locator('.xd-tile').evaluateAll(els=>els.map(e=>e.dataset.work))).every(x=>!blocked.has(x)));
   await page.goto(base+'/sound.html');await page.locator('.music-reader-open').first().waitFor();await pageChecks(page);
   const cards=await page.locator('.sound-release-card').count();assert.equal(cards,8);
   const lyricsBefore=await page.locator('.sound-song-lyrics').allTextContents();
   const readers=await page.locator('.music-reader-open').all();assert.equal(readers.length,4);
   const detail=page.locator('#music-reader');
   for(const reader of readers){await reader.click();await detail.waitFor({state:'visible'});assert.equal(await detail.evaluate(d=>getComputedStyle(document.body).position),'fixed');await detail.locator('.music-reader-close').click();await detail.waitFor({state:'hidden'});await page.waitForFunction(()=>getComputedStyle(document.body).position!=='fixed');}
   await page.locator('#tochu-no-mamade .music-reader-open').click();await detail.getByRole('tab',{name:'LYRICS 歌詞'}).click();
   assert.equal(await detail.locator('.sound-song-lyrics').evaluate(e=>getComputedStyle(e).textAlign),'center');await pageChecks(page);await screenshot(page,label+'-music');
   await detail.getByRole('tab',{name:'ABOUT THE SONG 楽曲解説'}).click();assert.equal(await detail.locator('.song-description p').first().evaluate(e=>getComputedStyle(e).fontSize),'14px');
   await detail.locator('.music-reader-close').click();await page.waitForFunction(()=>!document.querySelector('#music-reader').open && getComputedStyle(document.body).position!=='fixed');
   assert.deepEqual(await page.locator('.sound-song-lyrics').allTextContents(),lyricsBefore);
   assert(!/BIG\s*UP!?/i.test(await page.locator('body').innerText()));
   console.log('PASS integrated',label,'INDEX / CREATOR / DISCOVER / MUSIC');
};
