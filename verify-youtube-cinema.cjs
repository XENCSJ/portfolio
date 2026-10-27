// Compare the unchanged layout against the pre-change revision in isolated CI.
// External media is a deterministic fixture: these tests do not prove real playback.
const {chromium,webkit}=require('playwright');
const fs=require('node:fs');const path=require('node:path');const http=require('node:http');
const {execFileSync}=require('node:child_process');const assert=require('node:assert/strict');
// Compare with the actual PR base instead of a stale historical redesign.
let baseline=process.env.CINEMA_BASE_SHA;
if(!baseline){
  execFileSync('git',['fetch','--depth','1','origin',process.env.GITHUB_BASE_REF||'main']);
  baseline='FETCH_HEAD';
}
const pages={storybooks:3,animation:4,sound:4,cinematic:4,apparel:3,creator:4};
const old=new Map();
for(const file of [...Object.keys(pages).map(n=>n+'.html'),'xen-latest-videos.js'])
  old.set(file,execFileSync('git',['show',baseline+':'+file]));
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const parts=decodeURIComponent(url.pathname).split('/');const mode=parts[1];const file=parts.slice(2).join('/');
  const local=path.resolve(file);
  if(!local.startsWith(process.cwd()+path.sep)){res.writeHead(403).end();return;}
  try{const bytes=mode==='before'&&old.has(file)?old.get(file):fs.readFileSync(local);
    res.setHeader('Content-Type',types[path.extname(file).toLowerCase()]||'application/octet-stream');res.end(bytes);
  }catch{res.writeHead(404).end();}
});
const layout=()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,
  nodes:[...document.querySelectorAll('header,footer,main,main section,main .grid,main .work,main h1,main h2,main h3,main p,.video-container,.xen-latest-play,.xen-latest-title')].map(e=>{
    const r=e.getBoundingClientRect(),viewportCoordinates=getComputedStyle(e).position==='fixed'||!e.getClientRects().length;
    // A navigation-only ID on the existing heading does not change its layout.
    const id=e.matches('h3#breathing-architecture')?'':e.id;
    return [e.tagName,id,r.x+(viewportCoordinates?0:scrollX),r.y+(viewportCoordinates?0:scrollY),r.width,r.height].map(v=>typeof v==='number'?Math.round(v*100)/100:v);
  })});
(async()=>{
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
  fs.mkdirSync('cinema-qa',{recursive:true});const results=[];
  for(const [engine,type] of Object.entries({chromium,webkit})){
    const browser=await type.launch({headless:true});
    try{for(const width of [390,430,1440])for(const [name,count] of Object.entries(pages)){
      const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
      await context.route('**/*',route=>{
        if(route.request().url().startsWith(origin))return route.continue();
        if(route.request().resourceType()==='image')return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><rect width="640" height="360" fill="#222"/></svg>'});
        if(route.request().resourceType()==='document')return route.fulfill({contentType:'text/html',body:'<!doctype html><title>Test media fixture</title>'});
        return route.abort();
      });
      const shots={};let target;
      // MUSIC intentionally changes player visibility and page height; check its current playback geometry below.
      for(const mode of (name==='sound'?['after']:['before','after'])){
        const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
        await page.goto(origin+'/'+mode+'/'+name+'.html',{waitUntil:'networkidle'});
        if(name==='creator')await page.locator('.xen-latest-play').nth(3).waitFor();
        if(name==='apparel')await page.locator('.base-product').nth(5).waitFor();
        for(const img of await page.locator('main img').all()){
          if(await img.isVisible())await img.scrollIntoViewIfNeeded();
        }
        // The requested specialist-channel section adds height below LATEST VIDEOS.
        // The requested discovery entrance also adds height at the end of main.
        // These additions are covered by verify-creator-channels.cjs / verify-discovery.cjs.
        // Remove only that addition here to keep the original-page comparison strict.
        if(name==='creator')await page.locator('#youtube-channels, .xen-discovery-entry').evaluateAll(es=>es.forEach(e=>e.remove()));
        await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(150);
        shots[mode]=await page.evaluate(layout);assert.equal(shots[mode].width<=width,true,name+' overflow');
        assert.deepEqual(errors,[],name+' script errors');
        if(mode==='after')target=page;else await page.close();
      }
      if(name!=='sound')assert.deepEqual(shots.after,shots.before,engine+' '+width+' '+name+' outside layout');
      const covers=target.locator(name==='creator'?'.xen-latest-play':'.xen-cinema-cover');
      assert.equal(await covers.count(),count);assert.equal(await target.locator('.xen-cinema-icon').count(),count);
      assert.equal(await target.locator('iframe[src*="youtube"]').count(),0);
      if(name==='sound'){
        await target.locator('.music-player-drawer[data-service="youtube"] > summary').first().click();
        shots.after=await target.evaluate(layout);
      }
      const bounds=await covers.first().boundingBox();
      await covers.first().press('Enter');
      const frame=target.locator('iframe[src*="youtube"]');assert.equal(await frame.count(),1);
      const url=new URL(await frame.getAttribute('src'));
      assert.equal(url.searchParams.get('autoplay'),'1');assert.equal(url.searchParams.has('mute'),false);
      if(name!=='creator'){
        const r=await frame.boundingBox();assert.equal(r.width,bounds.width);assert.equal(r.height,bounds.height);
        await target.evaluate(()=>scrollTo(0,0));
        assert.deepEqual(await target.evaluate(layout),shots.after,'playback preserves outside layout');
      }else{
        await target.getByRole('button',{name:'閉じる ×'}).click();await frame.waitFor({state:'detached'});
        await covers.last().press('Space');assert.equal(await frame.count(),1);
      }
      results.push({engine,width,page:name,videos:count,layoutIdentical:true,keyboardActivation:true,playback:'iframe request only; media mocked'});
      fs.writeFileSync('cinema-qa/results.json',JSON.stringify(results,null,2));
      console.log(engine,width,name,'layout identical');
      await context.close();
    }}finally{await browser.close();}
  }
  fs.writeFileSync('cinema-qa/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());
