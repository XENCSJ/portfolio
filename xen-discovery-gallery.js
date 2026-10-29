/* A single serialized transition, with a decoded queue and immutable pointer selection. */
(() => {
 'use strict';
 const gallery=document.querySelector('.xd-gallery'),grid=gallery?.querySelector('.xd-mosaic');
 const dialog=document.querySelector('.xd-work-dialog');
 if(!grid||!dialog||typeof dialog.showModal!=='function')return;
 const status=gallery.querySelector('.xd-gallery-status');
 // Discovery-only exclusions. Original assets and their source pages stay intact.
 // APPAREL (1).png is the ABC TV 'Miss Target' episode 3 media collage;
 // APPAREL (1).JPG and the separate grey hoodie are different, allowed works.
 const excludedCategories=new Set(['cinematic','snsmanagement','snap']);
 // Red-X references IMG_9947 through IMG_9954: 17 whole images, not their separate works.
 // Stable work IDs plus original/preview paths keep ordering and URL aliases irrelevant.
 // SPACE (1).jpg is the pink shopping-arcade proposal; the different SPACE (1).png stays eligible.
 const excludedAssets=[
  ["space-ee2b661d3cb7", "SPACE (1).jpg", "xen-preview-e68077eee5863d4c.webp"],
  ["space-3cdf06737385", "IMG_8369.PNG", "xen-preview-67719606a928b04a.webp"], // ARCHITECTURE 作品 18: interior perspectives, plans and planting
  ['apparel-ccc341888110','APPAREL (1).png','xen-preview-6e9cfc944d27281a.webp'], // existing Miss Target exclusion
  ["design-e7a94102467b", "DESIGN (1).png", "xen-preview-a72f67e01dba78a8.webp"],
  ["design-88900d525066", "DESIGN (4).jpg", "xen-preview-6f26cf8bfee67f8d.webp"],
  ["architecture-2424aea1ca35", "ARCHITECTURE (3).PNG", "xen-preview-2e434359d95c5f34.webp"],
  ["architecture-b3a885b4a868", "ARCHITECTURE (7).PNG", "xen-preview-037ce0d518f1845a.webp"],
  ["architecture-cd8cdcdb14d0", "ARCHITECTURE (8).PNG", "xen-preview-af910ba9d31b9b0e.webp"],
  ["architecture-ebc64cb39540", "ARCHITECTURE (6).PNG", "xen-preview-672e0557b511f605.webp"],
  ["architecture-1e49dea01c50", "ARCHITECTURE (5).PNG", "xen-preview-f77333dc61ed2f87.webp"],
  ["architecture-b2dbd0707f0f", "ARCHITECTURE (10).PNG", "xen-preview-4575b1287cca4e7e.webp"],
  ["architecture-fb17daedd9df", "ARCHITECTURE (11).PNG", "xen-preview-13caa425cdd86b2b.webp"],
  ["architecture-1d5d294c4bd0", "ARCHITECTURE (4).jpg", "xen-preview-47fd91971437be69.webp"],
  ["architecture-f18cf5c8997b", "ARCHITECTURE (5).jpg", "xen-preview-92008f2425eaed58.webp"],
  ["architecture-0a6065abe276", "ARCHITECTURE (1).jpg", "xen-preview-5245c11466c25fd4.webp"],
  ["architecture-590ec40e476e", "ARCHITECTURE (3).jpg", "xen-preview-317f870787c07f32.webp"],
  ["architecture-8b0fe09e46a9", "ARCHITECTURE (6).jpg", "xen-preview-450130aa0b1ba695.webp"],
  ["architecture-9d4659851c16", "ARCHITECTURE-S (1).jpg", "xen-preview-99b2ffd5fd9341f5.webp"],
  ["architecture-639e72800da4", "ARCHITECTURE-S (3).jpg", "xen-preview-7b9c541511702cf2.webp"],
  ["architecture-70b86bed2ebf", "ARCHITECTURE-S (2).jpg", "xen-preview-8d235bd5c952128a.webp"],
 ];
 const excludedWorkIds=new Set(excludedAssets.map(([id])=>id));
 const excludedImages=new Set(excludedAssets.flatMap(([, ...paths])=>paths.map(path=>path.normalize('NFKC').toLowerCase())));
 const categoryKey=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\s_\-–—/]+/g,'');
 function imageName(value){
  try{return decodeURIComponent(new URL(value,document.baseURI).pathname).split('/').pop().normalize('NFKC').toLowerCase();}catch{return '';}
 }
 function excludedWork(work){
  if(!work)return true;
  if([work.genre,work.category].some(value=>excludedCategories.has(categoryKey(value))))return true;
  if(excludedWorkIds.has(String(work.id).toLowerCase()))return true;
  if([work.image,work.originalImage].some(value=>value&&excludedImages.has(imageName(value))))return true;
  // Catch catalog aliases using their source page or original category ID.
  return /^(?:cinematic|sns[-_ ]?management|snap)(?:[-_]|$)/i.test(work.id||'')||
   [work.source,work.href].some(value=>/^(?:cinematic|sns[-_ ]?management|snap)\.html$/i.test(imageName(value)));
 }
 const eligibleWork=work=>Boolean(work&&work.id&&work.title&&work.image&&work.href&&!excludedWork(work));
 // A stale static tile must not survive a failed catalog request.
 grid.querySelectorAll('.xd-tile').forEach(node=>{
  if(excludedWork({id:node.dataset.work,image:node.querySelector('img')?.getAttribute('src'),href:node.getAttribute('href')}))node.remove();
 });
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const effects=['crossfade','mask','zoom','vertical','blur'];
 const random=list=>list[Math.floor(Math.random()*list.length)];
 const rand=(low,high)=>low+Math.random()*(high-low);
 let works=[],groups=[],cells=[],queue=[],pending=new Set(),failed=new Set(),recent=[];
 let near=false,visible=false,active=null,timer=null,lastCell=null,lastEffect='';
 let opener=null,pageY=0,detailOpen=false,changeCount=0,themeOpen=Boolean(document.querySelector('.xd-theme-dialog[open]'));
 // Persist this visit's displayed works, including animated replacements.
 const historyKey='xen:discovery-gallery:last-visit:v1';
 let visitSeen=new Set(),previousSeen=new Set(),previousOrder=new Set(),visitGeneration=0;
 function readHistory(){
  for(const name of ['localStorage','sessionStorage']){
   try{
    const saved=JSON.parse(window[name].getItem(historyKey));
    if(saved&&Array.isArray(saved.seen)&&Array.isArray(saved.order))return saved;
   }catch{/* Storage may be disabled or contain invalid JSON. */}
  }
  return {seen:[...visitSeen],order:cells.map(cell=>cell.work.id)};
 }
 function rememberVisit(){
  if(!cells.length)return;
  cells.forEach(cell=>visitSeen.add(cell.work.id));
  const value=JSON.stringify({seen:[...visitSeen],order:cells.map(cell=>cell.work.id)});
  for(const name of ['localStorage','sessionStorage']){
   try{window[name].setItem(historyKey,value);}catch{/* Randomization still works without storage. */}
  }
 }
 function shuffled(list){
  const result=[...list];
  for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
  return result;
 }
 function drawVisit(pool,count,history){
  const previous=new Set(history.seen),lastScreen=new Set(history.order);
  // Exhaust unseen works before taking the minimum unavoidable repeats.
  const fresh=shuffled(pool.filter(work=>!previous.has(work.id)));
  const earlier=shuffled(pool.filter(work=>previous.has(work.id)&&!lastScreen.has(work.id)));
  const last=shuffled(pool.filter(work=>previous.has(work.id)&&lastScreen.has(work.id)));
  const selected=shuffled([...fresh,...earlier,...last].slice(0,count));
  if(!selected.length)return selected;
  // Preserve the existing number of slots even with a very small catalog.
  while(selected.length<count)selected.push(selected[selected.length%pool.length]);
  if(selected.length>1&&selected.every((work,i)=>work.id===history.order[i]))selected.push(selected.shift());
  return selected;
 }
 function startVisit(){
  if(!works.length||!cells.length)return;
  stop();
  const history=readHistory();
  previousSeen=new Set(history.seen);previousOrder=new Set(history.order);visitSeen=new Set();visitGeneration++;
  queue=[];pending.clear();recent=[];lastCell=null;gestures.clear();hovered.clear();focused.clear();
  const selection=drawVisit(works.filter(work=>!failed.has(work.id)),cells.length,history);
  selection.forEach((work,index)=>{
   // Keep the opening grid's image and surrounding tile in the same paint.
   const image=new Image();image.width=640;image.height=640;image.decoding='sync';image.src=work.image;
   setCell(cells[index],work,image);
  });
  rememberVisit();pump();schedule();updateState();
 }
 const gestures=new Map(),hovered=new Set(),focused=new Set();
 const isVisible=cell=>cell.node.getClientRects().length>0;
 const locked=cell=>gestures.has(cell)||hovered.has(cell)||focused.has(cell);
 const canLoad=()=>near&&!document.hidden&&!detailOpen&&!themeOpen;
 const canRun=()=>visible&&!document.hidden&&!detailOpen&&!themeOpen&&!reduced.matches;
 function updateState(){
  gallery.dataset.galleryState=detailOpen?'details':themeOpen?'theme':document.hidden?'hidden':reduced.matches?'reduced':visible?'running':'out-of-view';

 }
 function setCell(cell,work,image){
  cell.work=work;cell.node.dataset.work=work.id;cell.node.href=work.href;
  cell.node.setAttribute('aria-label',work.title+' — '+work.genre+'の詳細を表示');
  if(image){image.className='';image.removeAttribute('aria-hidden');image.alt=work.title;image.style.objectPosition=work.position;cell.node.replaceChildren(image);}
 }
 function dominantIncoming(){
  if(!active)return false;
  const style=getComputedStyle(active.image);
  if(['crossfade','zoom','blur'].includes(active.effect))return Number(style.opacity)>=.5;
  const inset=style.clipPath.match(/[\d.]+/g)?.map(Number)||[0];
  return active.effect==='mask'?(inset[1]||0)<=25:(inset[0]||0)<=50;
 }
 function settle(commit=true){
  if(!active)return;
  const transition=active;active=null;
  clearTimeout(transition.timeout);transition.image.removeEventListener('animationend',transition.done);
  if(commit){
   setCell(transition.cell,transition.work,transition.image);recent.push(transition.work.id);recent=recent.slice(-24);
   rememberVisit();
   changeCount++;gallery.dataset.changeCount=String(changeCount);
   gallery.dispatchEvent(new CustomEvent('xen:gallery-change',{detail:{cell:cells.indexOf(transition.cell),id:transition.work.id,effect:transition.effect}}));
  }else transition.image.remove();
  delete transition.cell.node.dataset.effect;transition.cell.node.style.removeProperty('--xd-duration');
  gallery.dataset.transitioning='0';
 }
 function stop(){clearTimeout(timer);timer=null;if(active)settle(dominantIncoming());updateState();}
 function candidate(){
  const occupied=new Set([...cells.map(c=>c.work.id),...queue.map(q=>q.work.id),...pending,...failed,active?.work.id,...recent]);
  const available=groups.map(group=>group.filter(w=>!occupied.has(w.id))).filter(group=>group.length);
  const fresh=available.map(group=>group.filter(w=>!previousSeen.has(w.id))).filter(group=>group.length);
  const earlier=available.map(group=>group.filter(w=>!previousOrder.has(w.id))).filter(group=>group.length);
  const choices=fresh.length?fresh:earlier.length?earlier:available;
  return choices.length?random(random(choices)):null;
 }
 function decode(work){
  return new Promise((resolve,reject)=>{
   const image=new Image();image.width=640;image.height=640;image.decoding='async';image.alt=work.title;
   let done=false;const timeout=setTimeout(()=>finish(false),12000);
   function finish(ok){if(done)return;done=true;clearTimeout(timeout);image.onload=image.onerror=null;ok&&image.naturalWidth>1?resolve(image):reject(new Error('Image unavailable'));}
   image.onload=()=>image.decode().then(()=>finish(true),()=>finish(true));image.onerror=()=>finish(false);image.src=work.image;
  });
 }
 function pump(){
  if(!works.length||!canLoad())return;
  while(queue.length+pending.size<7&&pending.size<3){
   const work=candidate();if(!work)break;pending.add(work.id);const generation=visitGeneration;
   decode(work).then(image=>{
    if(generation!==visitGeneration)return;
    pending.delete(work.id);queue.push({work,image});
    pump();schedule();
   }).catch(()=>{if(generation!==visitGeneration)return;pending.delete(work.id);failed.add(work.id);pump();});
  }
 }
 function schedule(delay=rand(800,1500)){
  updateState();if(!canRun()||timer||active||!works.length)return;
  timer=setTimeout(()=>{timer=null;next();},delay);
 }
 function next(){
  if(active||detailOpen||!canRun())return;
  const eligible=cells.filter(c=>isVisible(c)&&!locked(c)&&c!==lastCell);
  if(!eligible.length||!queue.length){pump();schedule();return;}
  const cell=random(eligible),item=queue.shift();lastCell=cell;
  // Pointer and focus exclusions are checked again at the only mutation boundary.
  if(locked(cell)){queue.unshift(item);schedule();return;}
  const effect=random(effects.filter(e=>e!==lastEffect));lastEffect=effect;
  const interval=rand(800,1500),duration=rand(400,600);
  const image=item.image;image.className='xd-incoming';image.alt='';image.setAttribute('aria-hidden','true');image.style.objectPosition=item.work.position;
  active={cell,work:item.work,image,effect,done:null,timeout:null};
  const finish=()=>{if(active?.image!==image)return;image.removeAttribute('aria-hidden');settle(true);pump();schedule(Math.max(20,interval-duration));};
  active.done=finish;gallery.dataset.transitioning='1';cell.node.dataset.effect=effect;
  cell.node.style.setProperty('--xd-duration',duration+'ms');cell.node.append(image);
  if(duration===0){finish();return;}
  image.addEventListener('animationend',finish,{once:true});active.timeout=setTimeout(finish,duration+45);
 }
 function selectWork(cell,latched){
  if(themeOpen||document.querySelector('.xd-theme-dialog[open]'))return;
  if(active?.cell===cell)settle(dominantIncoming());
  const work=latched||cell.work;
  if(!eligibleWork(work))return;
  detailOpen=true;stop();opener=cell.node;pageY=scrollY;
  dialog.dataset.work=work.id;dialog.querySelector('.xd-work-image').src=work.image;dialog.querySelector('.xd-work-image').alt=work.title;
  dialog.querySelector('#xd-work-title').textContent=work.title;dialog.querySelector('.xd-work-genre').textContent=work.genre;
  const description=dialog.querySelector('.xd-work-description');description.textContent=work.description;description.hidden=!work.description;
  const originLink=dialog.querySelector('.xd-work-origin-link');
  originLink.hidden=!work.originHref;
  if(work.originHref)originLink.href=work.originHref;
  const link=dialog.querySelector('.xd-work-link');link.href=work.href;
  if(work.href.startsWith('https:')){link.target='_blank';link.rel='noopener noreferrer';link.setAttribute('aria-label','作品の詳細を見る（新しいタブで開く）');}else{link.removeAttribute('target');link.removeAttribute('rel');link.removeAttribute('aria-label');}
  document.body.style.top=`-${pageY}px`;document.body.classList.add('xd-modal-open');dialog.showModal();
  dialog.querySelector('.xd-work-scroll').scrollTop=0;dialog.querySelector('.xd-work-close').focus({preventScroll:true});updateState();
  if(!reduced.matches)dialog.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:280,easing:'ease-out'});
 }
 function closeDetail(){
  if(!detailOpen)return;dialog.close();detailOpen=false;gestures.clear();
  document.body.classList.remove('xd-modal-open');document.body.style.top='';scrollTo({top:pageY,behavior:'instant'});
  opener?.focus({preventScroll:true});pump();schedule();updateState();
 }
 function bind(cell){
  const node=cell.node;
  node.setAttribute('aria-haspopup','dialog');
  node.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hovered.add(cell);if(active?.cell===cell){settle(dominantIncoming());schedule();}}});
  node.addEventListener('pointerleave',()=>hovered.delete(cell));
  node.addEventListener('focusin',()=>{focused.add(cell);if(active?.cell===cell){settle(dominantIncoming());schedule();}});
  node.addEventListener('focusout',()=>focused.delete(cell));
  node.addEventListener('pointerdown',e=>{
   if(e.button!==0)return;if(active?.cell===cell){settle(dominantIncoming());schedule();}
   gestures.set(cell,{id:e.pointerId,x:e.clientX,y:e.clientY,moved:false,work:cell.work});
  });
  node.addEventListener('click',e=>{
   if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||e.button)return;
   e.preventDefault();const gesture=gestures.get(cell);gestures.delete(cell);if(gesture?.moved)return;selectWork(cell,gesture?.work);
  });
  node.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();selectWork(cell);}});
 }
 // Track the full gesture even when a mouse or pen leaves its original tile.
 addEventListener('pointermove',e=>{gestures.forEach(g=>{if(g.id===e.pointerId&&Math.hypot(e.clientX-g.x,e.clientY-g.y)>10)g.moved=true;});},{passive:true});
 const releaseGesture=e=>gestures.forEach((g,cell)=>{
  if(g.id!==e.pointerId)return;
  if(e.type==='pointercancel'||!cell.node.contains(e.target))g.moved=true;
  setTimeout(()=>{if(gestures.get(cell)===g)gestures.delete(cell);},500);
 });
 addEventListener('pointerup',releaseGesture,{passive:true});
 addEventListener('pointercancel',releaseGesture,{passive:true});
 addEventListener('blur',()=>{gestures.clear();hovered.clear();});
 dialog.querySelector('.xd-work-close').addEventListener('click',closeDetail);
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
 dialog.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;const first=dialog.querySelector('.xd-work-close'),last=dialog.querySelector('.xd-work-origin-link:not([hidden])')||dialog.querySelector('.xd-work-link');
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 document.addEventListener('xen:theme-modal',event=>{themeOpen=event.detail.open;if(themeOpen)stop();else{pump();schedule();}});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{pump();schedule();}});
 reduced.addEventListener('change',()=>{stop();pump();schedule();});
 addEventListener('pagehide',()=>{stop();rememberVisit();});
 // Normal navigation initializes after fetch; BFCache restores the same document.
 addEventListener('pageshow',event=>{if(event.persisted)startVisit();else{pump();schedule();}});
 if('IntersectionObserver'in window){
  new IntersectionObserver(entries=>{near=entries[0].isIntersecting;if(near)pump();},{rootMargin:'240px'}).observe(grid);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else{pump();schedule();}},{threshold:.05}).observe(grid);
 }else{near=visible=true;}
 fetch('./xen-discovery-gallery.json?v=20261029-space-chair1').then(r=>{if(!r.ok)throw new Error('Catalog unavailable');return r.json();}).then(data=>{
  // Filter before grouping, selection, decoding, preloading or queuing.
  const ids=new Set();
  works=(Array.isArray(data.works)?data.works:[]).filter(work=>{
   if(!eligibleWork(work)||ids.has(work.id))return false;ids.add(work.id);return true;
  });
  groups=[...new Set(works.map(w=>w.genre))].map(genre=>works.filter(w=>w.genre===genre));
  cells=[...grid.querySelectorAll('.xd-tile')].map(node=>({node,work:works.find(w=>w.id===node.dataset.work)}));
  if(cells.some(c=>!c.work))throw new Error('Static catalog mismatch');
  cells.forEach(bind);gallery.dataset.galleryReady='true';gallery.dataset.changeCount='0';gallery.dataset.transitioning='0';
  startVisit();
 }).catch(()=>{status.textContent='画像から掲載ページへ進めます。';});
})();