const {chromium,webkit} = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert/strict');
const root='http://127.0.0.1:8893/';
const output=process.env.XEN_QA_OUTPUT||'../index-motion-qa';fs.mkdirSync(output,{recursive:true});
const baseline=require('child_process').execFileSync('git',['show','09e2498784abf577892d549a16304c59ce91ed5b:index.html']);
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,root);let file=path.resolve('.','.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
 if(!file.startsWith(path.resolve('.')+path.sep)){res.writeHead(403);return res.end()}
 if(u.pathname==='/baseline.html'){res.setHeader('Content-Type','text/html');return res.end(baseline)}
 fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);return res.end()};res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(d)});
});
async function setup(browser,width,set,options={}){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:options.reduced?'reduce':'no-preference',javaScriptEnabled:!options.nojs,deviceScaleFactor:1});
 const page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>{
  if(!r.request().url().startsWith(root))return r.abort();
  if(options.fail && r.request().url().includes('xen-index-motion.js'))return r.abort();
  return r.continue();
 });
 await page.goto(root+(set==='baseline'?'baseline.html':`index.html?xen-preview-set=${set}`),{waitUntil:'load'});
 await page.evaluate(()=>{const orbit=document.querySelector('.orbit');orbit.getAnimations().forEach(a=>{a.pause();a.currentTime=0})});
 return {page,context,errors};
}
async function snapshot(p){return p.evaluate(()=>{
 const box=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height].map(v=>Math.round(v*100)/100)};
 const style=e=>{const s=getComputedStyle(e);return [s.fontSize,s.fill,s.opacity,s.color,s.transform,s.filter]};
 return {logo:box(document.querySelector('.center-logo')),logoStyle:style(document.querySelector('.center-logo')),ring:[...document.querySelectorAll('.orbit>a')].map(a=>({href:a.getAttribute('href'),text:a.textContent,box:box(a),opacity:getComputedStyle(a).opacity,offsets:[...a.querySelectorAll('textPath')].map(p=>p.getAttribute('startOffset')),styles:[...a.querySelectorAll('text')].map(style)})),news:document.querySelector('#xen-news')?.outerHTML,overflow:document.documentElement.scrollWidth>innerWidth};
})}
const results=[];
(async()=>{
 await new Promise(r=>server.listen(8893,'127.0.0.1',r));
 for(const engine of (process.env.XEN_TEST_ENGINES||'chromium').split(',')){
  const browser=await (engine==='chromium'?chromium.launch({headless:true,executablePath:'/root/.cache/ms-playwright/chromium_headless_shell-1194/chrome-linux/headless_shell',args:['--no-sandbox']}):webkit.launch({headless:true}));
  for(const width of (engine==='chromium'&&process.env.SKIP_CHROMIUM_NORMAL?[]:[1440,390,430,320])){
   const base=await setup(browser,width,'baseline');await base.page.waitForTimeout(3800);const before=await snapshot(base.page);
   if(width===390)await base.page.screenshot({path:`${output}/${engine}-baseline.png`});
   await base.context.close();
   await Promise.all((process.env.XEN_TEST_SETS?process.env.XEN_TEST_SETS.split(',').map(Number):[1,2,3,4,5]).map(async set=>{
    const test=await setup(browser,width,set),p=test.page;
    const running=await p.evaluate(()=>({name:document.documentElement.dataset.xenIndexSet,state:document.documentElement.dataset.xenIndexState,lines:document.querySelectorAll('.xen-set-line').length,links:[...document.querySelectorAll('.orbit>a')].map(a=>({name:getComputedStyle(a).animationName,delay:parseFloat(getComputedStyle(a).animationDelay),duration:parseFloat(getComputedStyle(a).animationDuration),transform:getComputedStyle(a).transform,children:[...a.querySelectorAll('text')].map(t=>getComputedStyle(t).animationName)}))}));
    assert.equal(running.links.length,15);
    const during=await snapshot(p);
    assert.deepEqual(during.logo,before.logo);assert.deepEqual(during.ring.map(x=>x.box),before.ring.map(x=>x.box));assert.equal(during.overflow,false);
    assert.ok(running.links.every(l=>l.transform==='none'&&l.children.every(n=>n==='none')));
    if(set===1)running.links.forEach((l,i)=>{assert.equal(l.name,'xen-index-orbit-reveal');assert.equal(l.duration,.4);assert.ok(Math.abs(l.delay-i*.12)<.001)});
    else {assert.equal(running.state,'playing');assert.ok(running.lines>=23);assert.ok(running.links.every(l=>l.name==='xen-set-text'));}
    if(set===3)assert.equal(await p.locator('.center-logo').evaluate(el=>getComputedStyle(el).animationName),'xen-set-soft-solid');
    if(set===4){assert.equal(running.links[0].delay,.2);assert.ok(running.links[14].delay<running.links[1].delay)}
    if(set===5){const counts=Object.values(running.links.reduce((a,l)=>(a[l.delay]=(a[l.delay]||0)+1,a),{})).sort();assert.deepEqual(counts,[1,2,2,2,2,2,2,2]);}
    if(width===390&&engine==='chromium'){
      for(const [frame,delay] of [[1,250],[2,700],[3,900]]){await p.waitForTimeout(delay);await p.screenshot({path:`${output}/set-${set}-frame-${frame}.png`});}
    }
    await p.waitForTimeout(3900);
    const after=await snapshot(p);
    assert.deepEqual(after,before,`${engine} ${width} SET${set} final differs`);
    assert.equal(after.overflow,false);
    assert.equal(await p.locator('.xen-set-trace').count(),0);
    assert.equal(test.errors.length,0,test.errors.join('\n'));
    if(width===390)await p.screenshot({path:`${output}/${engine}-set-${set}-complete.png`});
    // The anchor hit areas, hrefs and their real local destinations remain usable.
    for(const href of after.ring.map(x=>x.href)){const r=await p.request.get(new URL(href,root).href);assert.equal(r.status(),200)}
    await p.locator('.orbit>a[href="./sound.html"]').click();await p.waitForURL('**/sound.html');
    results.push({engine,width,set,originalTiming:set===1?'unchanged':undefined,finalIdentical:true,noOverflow:true,noJSErrors:true,all15Destinations:true,realLinkClick:true});
    console.log(`PASS ${engine} ${width} SET ${set}`);
    await test.context.close();
   }));
  }
  for(const options of [{reduced:true},{nojs:true},{fail:true}])for(let set=1;set<=5;set++){
   const test=await setup(browser,390,set,options);await test.page.waitForTimeout(options.reduced||options.nojs?50:3000);
   const snap=await snapshot(test.page);assert.equal(snap.logoStyle[2],'1');assert.ok(snap.ring.every(x=>x.opacity==='1'),JSON.stringify({engine,set,options,opacities:snap.ring.map(x=>x.opacity)}));assert.equal(test.errors.length,0);
   results.push({engine,set,fallback:options,visible:true});console.log('PASS fallback',engine,set,JSON.stringify(options));await test.context.close();
  }
  const previewContext=await browser.newContext();const preview=await previewContext.newPage();
  await preview.route('**/*',r=>r.request().url().startsWith(root)?r.continue():r.abort());
  await preview.goto(root+'index-motion-preview.html');
  const names=['original','sequential-trace','soft-reveal','reverse-trace','dual-reveal'];
  for(let set=1;set<=5;set++){
   await preview.locator('[data-set="'+set+'"]').click();
   await preview.waitForFunction(({set,name})=>{const f=document.getElementById('preview');return f.contentDocument?.documentElement?.dataset.xenIndexSet===name&&f.contentWindow.location.search.includes('xen-preview-set='+set)},{set,name:names[set-1]});
   assert.equal(await preview.locator('[data-set="'+set+'"]').getAttribute('aria-pressed'),'true');
  }
  const urlBefore=await preview.locator('iframe').getAttribute('src');await preview.locator('#replay').click();assert.notEqual(await preview.locator('iframe').getAttribute('src'),urlBefore);
  results.push({engine,previewAllFive:true,replay:true});await previewContext.close();
  await browser.close();
 }
 fs.writeFileSync(output+'/results.json',JSON.stringify(results,null,2));server.close();
})().catch(e=>{console.error(e);process.exit(1)});
