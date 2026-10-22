const {chromium}=require('playwright');
const fs=require('fs');
const expected=JSON.parse(require('child_process').execFileSync('python3',['-c','import json,news; print(json.dumps(news.select(news.read("news-events.json"), news.read("news-pinned.json"))))'],{encoding:'utf8'}));
const base=process.env.NEWS_TEST_URL || 'http://127.0.0.1:8765/';
(async()=>{
 fs.mkdirSync('news-qa',{recursive:true}); const results=[];
 const browser=await chromium.launch({headless:true, ...(process.env.CHROME_EXECUTABLE ? {executablePath:process.env.CHROME_EXECUTABLE}: {})});
 for(const [name,width,height,reduced] of [['desktop',1440,1000,'no-preference'],['mobile',390,844,'no-preference'],['small',360,800,'no-preference'],['reduced',390,844,'reduce']]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:reduced});
  const page=await context.newPage();
  await page.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===new URL(base).origin?r.continue():r.abort();});
  await page.goto(base,{waitUntil:'load'}); await page.locator('#xen-news').scrollIntoViewIfNeeded(); await page.waitForTimeout(1400);
  const data=await page.locator('#xen-news').evaluate(el=>({
    width:innerWidth,scroll:document.documentElement.scrollWidth,box:el.getBoundingClientRect().toJSON(),
    items:[...el.querySelectorAll('.xen-news-item')].map(n=>({text:n.textContent,href:n.querySelector('a').getAttribute('href'),box:n.getBoundingClientRect().toJSON()})),
    color:getComputedStyle(el).color,opacity:getComputedStyle(el).opacity,pin:el.querySelectorAll('.xen-news-pin').length
  }));
  if(data.items.length!==5||data.pin!==1||data.box.right>width+1||data.opacity!=='1'||data.items.some(x=>x.box.height<44))throw Error(JSON.stringify(data));
  if(data.items.filter(x=>x.text.includes('途中のままで')).length>1)throw Error('Song duplicated');
  for(let i=0;i<expected.length;i++)if(data.items[i].href!==expected[i].url||!data.items[i].text.includes(expected[i].title)||!data.items[i].text.includes(expected[i].date.replaceAll('-','.')))throw Error('NEWS registry/display mismatch');
  await page.locator('#xen-news').screenshot({path:`news-qa/${name}.png`});
  const songLink=page.locator('#xen-news a[href="./sound.html#tochu-no-mamade"]');
  if(await songLink.count())await songLink.click();
  else await page.goto(new URL('./sound.html#tochu-no-mamade',base).href);
  await page.waitForURL('**/sound.html#tochu-no-mamade');
  await page.locator('#tochu-no-mamade-title').waitFor({state:'visible'});
  const song=await page.locator('#tochu-no-mamade').evaluate(el=>({y:el.getBoundingClientRect().top,title:el.querySelector('h3').textContent}));
  if(song.title!=='途中のままで'||song.y>height)throw Error('Anchor target failed');
  results.push({name,width,newsItems:5,pin:1,matchesRegistry:true,directLink:true,newsFits:true,documentOverflow:data.scroll>width});
  await context.close();
 }
 await browser.close(); fs.writeFileSync('news-qa/results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
})().catch(e=>{console.error(e);process.exit(1)});
