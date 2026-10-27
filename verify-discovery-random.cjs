/* Run: node verify-discovery-random.cjs. Exercises the production script in a DOM fixture. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('xen-discovery-gallery.js','utf8');
const html=fs.readFileSync('what-is-xen.html','utf8');
const catalog=JSON.parse(fs.readFileSync('xen-discovery-gallery.json','utf8'));
const staticIds=[...html.matchAll(/class="xd-tile"[^>]*data-work="([^"]+)"/g)].map(m=>m[1]);
let checks=0;const check=(value,message)=>{assert(value,message);checks++;};
class Node {
 constructor(){this.dataset={};this.attributes={};this.style={removeProperty(){}};this.events={};this.children=[];}
 setAttribute(k,v){this.attributes[k]=v;}getAttribute(k){return this.attributes[k]||null;}removeAttribute(k){delete this.attributes[k];}
 addEventListener(k,f){this.events[k]=f;}removeEventListener(){}replaceChildren(...nodes){this.children=nodes;}remove(){this.removed=true;}
 querySelector(){return this.children[0]||new Node();}getClientRects(){return[{}];}dispatchEvent(){}contains(){return false;}
}
const store=()=>({data:new Map(),getItem(k){return this.data.get(k)||null;},setItem(k,v){this.data.set(k,v);}});
const key='xen:discovery-gallery:last-visit:v1';
async function boot(local=store(),session=store(),data=catalog){
 const tiles=staticIds.map(id=>{const n=new Node(),w=catalog.works.find(w=>w.id===id),img=new Node();n.dataset.work=id;n.attributes.href=w.href;img.attributes.src=w.image;n.children=[img];return n;});
 const grid=new Node();grid.querySelectorAll=()=>tiles.filter(n=>!n.removed);
 const gallery=new Node(),status=new Node(),dialog=new Node();dialog.showModal=()=>{};
 gallery.querySelector=s=>s==='.xd-mosaic'?grid:status;
 const events={},context={URL,console,Math,JSON,Set,Map,Promise,Image:Node,CustomEvent:class{},setTimeout:()=>1,clearTimeout(){},
  matchMedia:()=>({matches:true,addEventListener(){}}),IntersectionObserver:class{observe(){}},
  addEventListener:(name,fn)=>events[name]=fn,localStorage:local,sessionStorage:session,
  document:{baseURI:'https://xencsj.github.io/portfolio/what-is-xen.html',hidden:false,addEventListener(){},querySelector:s=>s==='.xd-gallery'?gallery:s==='.xd-work-dialog'?dialog:null},
  fetch:()=>Promise.resolve({ok:true,json:()=>Promise.resolve(data)})};
 context.window=context;
 vm.createContext(context);
 // Test access only: no test hook is shipped in the gallery script.
 vm.runInContext(source.replace(" fetch('./xen-discovery-gallery.json", " window.test={drawVisit,excludedWork,get works(){return works;},get cells(){return cells;},rememberVisit,startVisit,settle,setActive(value){active=value;}};\n fetch('./xen-discovery-gallery.json"),context);
 await new Promise(resolve=>setImmediate(resolve));
 return {context,events,tiles,gallery,status,local,session,ids:()=>tiles.map(t=>t.dataset.work),test:context.test};
}
const overlap=(a,b)=>a.filter(id=>b.includes(id)).length;
(async()=>{
 const local=store();let previous=[];
 for(let visit=0;visit<100;visit++){
  const app=await boot(local),ids=app.ids();
  check(app.gallery.dataset.galleryReady==='true','gallery initializes');
  check(ids.length===12&&new Set(ids).size===12,'12 unique slots');
  check(overlap(ids,previous)===0,'reload/new navigation avoids previous visit');
  check(ids.every(id=>app.test.works.some(w=>w.id===id)),'all initial works eligible');
  const saved=JSON.parse(local.getItem(key));
  check(JSON.stringify(saved.order)===JSON.stringify(ids),'order saved');
  app.events.pagehide();app.events.pageshow({persisted:true});
  const restored=app.ids();
  check(overlap(restored,ids)===0,'BFCache revisit redraws');
  app.events.pageshow({persisted:false});
  check(JSON.stringify(restored)===JSON.stringify(app.ids()),'normal pageshow does not double draw');
  previous=restored;
 }
 const app=await boot();
 const pool=app.test.works;
 check(pool.length===142,'current 19 individual and three category exclusions retained');
 for(let size=1;size<=30;size++)for(let seen=0;seen<=size;seen++)for(let repeat=0;repeat<20;repeat++){
  const subset=pool.slice(0,size),history={seen:subset.slice(0,seen).map(w=>w.id),order:[]};
  const count=Math.min(12,size),draw=app.test.drawVisit(subset,count,history),ids=draw.map(w=>w.id);
  check(ids.length===count&&new Set(ids).size===count,'unique selection with small pool');
  check(overlap(ids,history.seen)===Math.max(0,count-(size-seen)),'mathematically minimal overlap');
 }
 const small=app.test.drawVisit(pool.slice(0,3),12,{seen:[],order:[]});
 check(small.length===12&&small.every(w=>pool.slice(0,3).includes(w)),'tiny catalog preserves slots using only eligible works');
 const fixed=pool.slice(0,12),constant=app.context.Math;
 const oldRandom=constant.random;constant.random=()=>.999999;
 const reordered=app.test.drawVisit(fixed,12,{seen:fixed.map(w=>w.id),order:fixed.map(w=>w.id)});
 constant.random=oldRandom;
 check(reordered.some((w,i)=>w.id!==fixed[i].id),'identical order is changed even with an identical draw');
 // Animated replacements must enter the visit history, not just the opening tiles.
 const unseen=pool.find(w=>!app.ids().includes(w.id)),cell=app.test.cells[0],image=new Node();
 app.test.setActive({cell,work:unseen,image,effect:'crossfade',done(){},timeout:1});app.test.settle(true);
 check(JSON.parse(app.local.getItem(key)).seen.includes(unseen.id),'animated works saved');
 const seenVisit=JSON.parse(app.local.getItem(key)).seen;
 app.events.pagehide();app.events.pageshow({persisted:true});
 check(overlap(app.ids(),seenVisit)===0,'revisit also avoids animated replacements');
 // Malformed storage, blocked local storage, and completely blocked storage stay usable.
 const broken={getItem(){throw Error('SecurityError');},setItem(){throw Error('QuotaExceededError');}};
 const corrupt=store();corrupt.setItem(key,'{invalid');check((await boot(corrupt)).gallery.dataset.galleryReady==='true','corrupt history recovers');
 const backup=store(),a=await boot(broken,backup),b=await boot(broken,backup);
 check(overlap(a.ids(),b.ids())===0,'session storage fallback');
 const noStorage=await boot(broken,broken),before=noStorage.ids();noStorage.events.pageshow({persisted:true});
 check(overlap(before,noStorage.ids())===0,'in-memory BFCache fallback without storage');
 // Alias paths and excluded categories are rejected before sampling.
 for(const work of catalog.works.filter(w=>app.test.excludedWork(w))){
  check(app.test.excludedWork({...work,id:'alias-'+work.id,image:new URL(work.image,'https://xencsj.github.io/portfolio/').href+'?cache=old#alias'}),'excluded image URL alias');
 }
 for(const genre of ['CINEMATIC','SNS_MANAGEMENT','ＳＮＡＰ'])check(app.test.excludedWork({...pool[0],genre}),'excluded genre');
 check((html.match(/class="xd-mosaic"/g)||[]).length===1,'no duplicate gallery');
 console.log(JSON.stringify({checks,visits:100,eligible:pool.length,slots:12,result:'PASS'},null,2));
})().catch(error=>{console.error(error);process.exitCode=1;});
