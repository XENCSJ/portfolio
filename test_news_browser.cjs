const {chromium,webkit}=require('playwright');
const fs=require('fs');
(async()=>{
 fs.mkdirSync('news-qa',{recursive:true});const results=[];
 for(const [name,engine,width,height,reduced,js] of [['desktop',chromium,1440,1000,'no-preference',true],['iphone',webkit,390,844,'no-preference',true],['small-phone',chromium,360,800,'no-preference',true],['reduced',webkit,390,844,'reduce',true],['no-js',chromium,390,844,'reduce',false]]){
 const browser=await engine.launch({headless:true});const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced,javaScriptEnabled:js});const page=await ctx.newPage();
 await page.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/')?route.continue():route.abort());
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'load'});await page.locator('#xen-news').scrollIntoViewIfNeeded();await page.waitForTimeout(800);
 const data=await page.locator('#xen-news').evaluate(el=>({items:[...el.querySelectorAll('li')].map(e=>({id:e.dataset.newsId,text:e.textContent,box:e.getBoundingClientRect().toJSON()})),box:el.getBoundingClientRect().toJSON(),width:innerWidth,scrollWidth:document.documentElement.scrollWidth,opacity:getComputedStyle(el).opacity,transition:getComputedStyle(el).transitionDuration,pin:el.querySelectorAll('.xen-news-pin').length}));
 if(data.items.length!==5||data.items.at(-1).id!=='website-renewal-20261020'||data.pin!==1||data.box.right>width||data.opacity!=='1'||data.items.some(e=>e.box.height<44))throw Error(name+' layout failed '+JSON.stringify(data));
 if(reduced==='reduce'&&data.transition!=='0s')throw Error('motion not disabled');
 if(js){await page.locator('#xen-news a').first().focus();if(!await page.locator('#xen-news a').first().evaluate(el=>el===document.activeElement))throw Error('keyboard focus failed');}
 await page.locator('#xen-news').screenshot({path:'news-qa/'+name+'.png'});
 results.push({name,width,count:data.items.length,pinLast:true,documentOverflow:data.scrollWidth>width,newsFits:true,visible:true});await browser.close();
 }
 await require('./verify-category-titles.cjs')();
 fs.writeFileSync('news-qa/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
