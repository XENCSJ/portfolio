/* A single serialized transition, with a decoded queue and immutable pointer selection. */
(() => {
 'use strict';
 const gallery=document.querySelector('.xd-gallery'),grid=gallery?.querySelector('.xd-mosaic');
 const dialog=document.querySelector('.xd-work-dialog');
 if(!grid||!dialog||typeof dialog.showModal!=='function')return;
 const toggle=gallery.querySelector('.xd-gallery-toggle'),status=gallery.querySelector('.xd-gallery-status');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),mobile=matchMedia('(max-width:1023px)');
 const effects=['crossfade','mask','zoom','vertical','blur'];
 const random=list=>list[Math.floor(Math.random()*list.length)];
 const rand=(low,high)=>low+Math.random()*(high-low);
 let works=[],groups=[],cells=[],queue=[],pending=new Set(),failed=new Set(),recent=[];
 let near=false,visible=false,paused=false,active=null,timer=null,lastCell=null,lastEffect='';
 let opener=null,pageY=0,detailOpen=false,manualWaiting=false,changeCount=0;
 const gestures=new Map(),hovered=new Set(),focused=new Set();
 const isVisible=cell=>cells.indexOf(cell)<(mobile.matches?9:12);
 const locked=cell=>gestures.has(cell)||hovered.has(cell)||focused.has(cell);
 const canLoad=()=>near&&!document.hidden&&!detailOpen&&(!paused||reduced.matches);
 const canRun=()=>visible&&!document.hidden&&!detailOpen&&!paused&&!reduced.matches;
 function updateState(){
  gallery.dataset.galleryState=detailOpen?'details':document.hidden?'hidden':reduced.matches?'reduced':paused?'paused':visible?'running':'out-of-view';
  const stopped=paused||reduced.matches;
  toggle.setAttribute('aria-pressed',String(stopped));
  toggle.querySelector('span').textContent=reduced.matches?'次の作品':paused?'再開':'停止';
  toggle.setAttribute('aria-label',reduced.matches?'動きを止めたまま、1枚を次の作品にする':paused?'作品の切り替えを再開':'作品の切り替えを停止');
  toggle.querySelector('svg').innerHTML=stopped?'<path d="m8 4 12 8-12 8Z"/>':'<path d="M8 5v14M16 5v14"/>';
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
  return available.length?random(random(available)):null;
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
   const work=candidate();if(!work)break;pending.add(work.id);
   decode(work).then(image=>{
    pending.delete(work.id);queue.push({work,image});
    if(manualWaiting&&reduced.matches&&visible&&!detailOpen){manualWaiting=false;next(true);}
    pump();schedule();
   }).catch(()=>{pending.delete(work.id);failed.add(work.id);pump();});
  }
 }
 function schedule(delay=rand(300,700)){
  updateState();if(!canRun()||timer||active||!works.length)return;
  timer=setTimeout(()=>{timer=null;next(false);},delay);
 }
 function next(manual=false){
  if(active||detailOpen||(!manual&&!canRun()))return;
  const eligible=cells.filter(c=>isVisible(c)&&!locked(c)&&c!==lastCell);
  if(!eligible.length||!queue.length){pump();if(manual)manualWaiting=true;else schedule();return;}
  const cell=random(eligible),item=queue.shift();lastCell=cell;
  // Pointer and focus exclusions are checked again at the only mutation boundary.
  if(locked(cell)){queue.unshift(item);schedule();return;}
  const effect=random(effects.filter(e=>e!==lastEffect));lastEffect=effect;
  const interval=rand(300,700),duration=manual?0:rand(250,Math.min(440,interval-20));
  const image=item.image;image.className='xd-incoming';image.alt='';image.setAttribute('aria-hidden','true');image.style.objectPosition=item.work.position;
  active={cell,work:item.work,image,effect,done:null,timeout:null};
  const finish=()=>{if(active?.image!==image)return;image.removeAttribute('aria-hidden');settle(true);pump();schedule(Math.max(20,interval-duration));};
  active.done=finish;gallery.dataset.transitioning='1';cell.node.dataset.effect=effect;
  cell.node.style.setProperty('--xd-duration',duration+'ms');cell.node.append(image);
  if(duration===0){finish();return;}
  image.addEventListener('animationend',finish,{once:true});active.timeout=setTimeout(finish,duration+45);
 }
 function selectWork(cell,latched){
  if(active?.cell===cell)settle(dominantIncoming());
  const work=latched||cell.work;
  detailOpen=true;manualWaiting=false;stop();opener=cell.node;pageY=scrollY;
  dialog.dataset.work=work.id;dialog.querySelector('.xd-work-image').src=work.image;dialog.querySelector('.xd-work-image').alt=work.title;
  dialog.querySelector('#xd-work-title').textContent=work.title;dialog.querySelector('.xd-work-genre').textContent=work.genre;
  const description=dialog.querySelector('.xd-work-description');description.textContent=work.description;description.hidden=!work.description;
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
 toggle.addEventListener('click',()=>{
  if(reduced.matches){manualWaiting=false;pump();next(true);status.textContent='1枚の作品を切り替えます。';return;}
  paused=!paused;stop();if(!paused){pump();schedule();}status.textContent=paused?'作品の切り替えを停止しました。':'作品の切り替えを再開しました。';
 });
 dialog.querySelector('.xd-work-close').addEventListener('click',closeDetail);
 dialog.addEventListener('cancel',e=>{e.preventDefault();closeDetail();});
 dialog.addEventListener('keydown',e=>{
  if(e.key!=='Tab')return;const first=dialog.querySelector('.xd-work-close'),last=dialog.querySelector('.xd-work-link');
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else{pump();schedule();}});
 reduced.addEventListener('change',()=>{manualWaiting=false;stop();pump();schedule();});
 mobile.addEventListener('change',()=>{stop();gestures.clear();hovered.clear();focused.clear();pump();schedule();});
 addEventListener('pagehide',()=>{stop();});
 addEventListener('pageshow',()=>{pump();schedule();});
 if('IntersectionObserver'in window){
  new IntersectionObserver(entries=>{near=entries[0].isIntersecting;if(near)pump();},{rootMargin:'240px'}).observe(grid);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(!visible)stop();else{pump();schedule();}},{threshold:.05}).observe(grid);
 }else{near=visible=true;}
 fetch('./xen-discovery-gallery.json?v=20261026-mosaic2').then(r=>{if(!r.ok)throw new Error('Catalog unavailable');return r.json();}).then(data=>{
  works=data.works.filter(w=>w.id&&w.title&&w.image&&w.href);groups=data.genres.map(g=>works.filter(w=>w.genre===g)).filter(g=>g.length);
  cells=[...grid.querySelectorAll('.xd-tile')].map(node=>({node,work:works.find(w=>w.id===node.dataset.work)}));
  if(cells.some(c=>!c.work))throw new Error('Static catalog mismatch');
  cells.forEach(bind);toggle.hidden=false;gallery.dataset.galleryReady='true';gallery.dataset.changeCount='0';gallery.dataset.transitioning='0';
  pump();schedule();updateState();
 }).catch(()=>{status.textContent='画像から掲載ページへ進めます。';});
})();
