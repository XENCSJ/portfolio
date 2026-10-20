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
 const states=[];for(const time of [3500,5000,7000,9000,12000,17000]){await p.evaluate(t=>{for(const a of document.querySelector('.studio-fusion').getAnimations({subtree:true})){a.pause();a.currentTime=t}},time);states.push(await p.evaluate(measure));}
 const r={engine,w,h,...states[0],errors,animationOverlap:states.flatMap(x=>x.overlaps),animationOffscreen:states.flatMap(x=>x.offscreen)};delete r.boxes;results.push(r);
 if([[390,744],[430,840],[320,568],[768,1024],[1280,800],[844,390]].some(s=>s[0]===w&&s[1]===h))await p.screenshot({path:path.join(evidence,engine+'-'+w+'x'+h+'.png')});
 if(w===390){await p.goto(url+'/before.html');await p.waitForTimeout(3500);results.push({engine,before:await p.evaluate(measure)});await p.screenshot({path:path.join(evidence,engine+'-before.png')});}
 await p.close();}
 await browser.close();}
 fs.writeFileSync(path.join(evidence,'layout-results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({engine:r.engine,w:r.w,h:r.h,visible:r.copyVisible,bottom:r.copyBottom,overlaps:r.animationOverlap,offscreen:r.animationOffscreen,overflow:r.horizontalOverflow,errors:r.errors,unavailable:r.unavailable,before:r.before?{bottom:r.before.copyBottom,height:r.before.sceneHeight}:undefined})),null,2));
 const failures=results.filter(r=>r.unavailable||r.errors?.length||r.animationOverlap?.length||r.animationOffscreen?.length||r.horizontalOverflow||(r.w>=375&&r.h>=667&&!r.copyVisible));
 if(failures.length){console.error('Layout checks failed:',failures.length);process.exitCode=1;}
 server.close();})().catch(e=>{console.error(e);server.close();process.exit(1)});
