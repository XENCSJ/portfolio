const {chromium,webkit}=require('playwright');
const fs=require('fs'); const path=require('path'); const http=require('http');
const root=__dirname; const evidence=path.join(root,'fusion-qa'); fs.mkdirSync(evidence,{recursive:true});
const sizes=[[390,744],[430,840],[320,568],[375,667],[600,800],[601,800],[768,1024],[900,800],[901,800],[1280,800],[844,390]];
const mime={'.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.html':'text/html','.png':'image/png'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let rel=decodeURIComponent(u.pathname);let file=path.join(root,rel);if(rel==='/before.html')file=path.join(evidence,'before-studio.html');if(rel==='/before-fusion.css')file=path.join(evidence,'before-fusion.css');if(rel==='/before-fusion.js')file=path.join(evidence,'before-fusion.js');try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.statusCode=404;res.end()}});
function measure(){
 const scene=document.querySelector('.studio-fusion'),copy=document.querySelector('#studio-about .studio-copy');
 const boxes=[...scene.querySelectorAll('a')].map(e=>({name:e.textContent,r:e.getBoundingClientRect().toJSON(),color:getComputedStyle(e).color}));
 boxes.push({name:'LOGO',r:scene.querySelector('.studio-fusion-logo-drift').getBoundingClientRect().toJSON()});
 const overlaps=[];
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i].r,b=boxes[j].r;if(a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)overlaps.push([boxes[i].name,boxes[j].name]);}
 return {width:innerWidth,height:innerHeight,sceneHeight:scene.offsetHeight,copyBottom:copy.getBoundingClientRect().bottom,copyVisible:copy.getBoundingClientRect().bottom<=innerHeight,font:getComputedStyle(copy.querySelector('p')).fontSize,line:getComputedStyle(copy.querySelector('p')).lineHeight,copy:copy.textContent.trim(),overlaps,offscreen:boxes.filter(b=>b.r.left<0||b.r.right>innerWidth).map(b=>b.name),horizontalOverflow:document.documentElement.scrollWidth>innerWidth,links:scene.querySelectorAll('a').length,boxes};
}
(async()=>{
 const {execFileSync}=require('child_process');
 const base=process.env.FUSION_BASE_SHA||'HEAD^';
 for(const [source,dest] of [['studio.html','before-studio.html'],['xen-studio-fusion.css','before-fusion.css'],['xen-studio-fusion.js','before-fusion.js']]){
  let text=execFileSync('git',['show',base+':'+source],{encoding:'utf8'});
  if(source==='studio.html')text=text.replace(/\.\/xen-studio-fusion\.css\?v=[^"]+/, './before-fusion.css').replace(/\.\/xen-studio-fusion\.js\?v=[^"]+/, './before-fusion.js');
  fs.writeFileSync(path.join(evidence,dest),text);
 }
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port;const results=[];
 for(const [engine,type] of Object.entries({chromium,webkit})){
 let browser;try{browser=await type.launch({headless:true});}catch(e){results.push({engine,unavailable:e.message});continue;}
 for(const [w,h] of sizes){const p=await browser.newPage({viewport:{width:w,height:h}});let errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>(r.request().url().startsWith(url)||r.request().url().startsWith('https://xencsj.github.io/portfolio/'))?r.continue():r.abort());await p.goto(process.env.FUSION_PUBLIC_URL||url+'/studio.html');await p.waitForTimeout(3500);
 if(w===390){
 const initial=await p.evaluate(()=>document.querySelector('.studio-fusion-sheen').getAnimations()[0]?.currentTime);await p.waitForTimeout(180);
 const advanced=await p.evaluate(()=>document.querySelector('.studio-fusion-sheen').getAnimations()[0]?.currentTime);
 if(!(advanced>initial))errors.push('Logo sweep did not advance');
 const hrefs=await p.locator('.studio-fusion a').evaluateAll(es=>es.map(e=>e.href));
 for(const href of hrefs){const response=await p.request.get(href);if(!response.ok())errors.push('Broken service link '+href);}
 }
 const states=[];for(const time of [3500,5000,7000,9000,12000,17000]){await p.evaluate(t=>{for(const a of document.querySelector('.studio-fusion').getAnimations({subtree:true})){a.pause();a.currentTime=t}},time);states.push(await p.evaluate(measure));}
 const r={engine,w,h,...states[0],errors,animationOverlap:states.flatMap(x=>x.overlaps),animationOffscreen:states.flatMap(x=>x.offscreen)};delete r.boxes;results.push(r);
 if([[390,744],[430,840],[320,568],[768,1024],[1280,800],[844,390]].some(s=>s[0]===w&&s[1]===h))await p.screenshot({path:path.join(evidence,engine+'-'+w+'x'+h+'.png')});
 if(w===390){
 await p.emulateMedia({reducedMotion:'reduce'});
 // A fresh document removes test-owned paused animations before checking the preference.
 await p.reload();
 await p.waitForFunction(()=>document.querySelector('.studio-fusion').getAnimations({subtree:true}).length===0&&getComputedStyle(document.querySelector('.studio-fusion-entry')).opacity==='1',{},{timeout:2000});
 const reduced=await p.evaluate(()=>({count:document.querySelector('.studio-fusion').getAnimations({subtree:true}).length,opacity:getComputedStyle(document.querySelector('.studio-fusion-entry')).opacity}));
 if(reduced.count||reduced.opacity!=='1')errors.push('Reduced motion did not settle');
 await p.emulateMedia({reducedMotion:'no-preference'});
 await p.goto(url+'/before.html');await p.waitForTimeout(3500);results.push({engine,before:await p.evaluate(measure)});await p.screenshot({path:path.join(evidence,engine+'-before.png')});}
 await p.close();}
 await browser.close();}
 fs.writeFileSync(path.join(evidence,'layout-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({engine:r.engine,w:r.w,h:r.h,visible:r.copyVisible,bottom:r.copyBottom,overlaps:r.animationOverlap,offscreen:r.animationOffscreen,overflow:r.horizontalOverflow,errors:r.errors,unavailable:r.unavailable,before:r.before?{bottom:r.before.copyBottom,height:r.before.sceneHeight}:undefined})),null,2));
 const expectedCopy='XEN CSJは、独創性と社会貢献の融合を理念の中心に据えています。独自の感性と創造力を活かし、人々の想いや課題を形にする。表現の領域を超えて、受け取る人にとって意味のある価値を生み出すことを大切にしています。';
 const failures=results.filter(r=>r.unavailable||r.errors?.length||r.animationOverlap?.length||r.animationOffscreen?.length||r.horizontalOverflow||(r.w&&(r.links!==10||r.copy!==expectedCopy||r.font!=='14px'||r.line!=='28px'))||(r.w>=375&&r.h>=667&&!r.copyVisible));
 if(failures.length){console.error('Layout checks failed:',failures.length);process.exitCode=1;}
 server.close();})().catch(e=>{console.error(e);server.close();process.exit(1)});
