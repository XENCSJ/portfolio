/* Four themes -> their full content. HTML remains the no-JavaScript experience. */
(() => {
 'use strict';
 const host=document.querySelector('.xd-explorer'); if(!host)return;
 const cards=[...host.querySelectorAll('[data-theme]')],panels=[...host.querySelectorAll('.xd-panel')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const nodes=JSON.parse(document.querySelector('#xd-data').textContent).nodes;
 const themes=nodes.home.children;
 let current='',returnY=scrollY,opener=cards[0],enterTimer;
 const owner=id=>themes.find(t=>t===id||nodes[t].children.includes(id)||nodes[t].children.some(c=>nodes[c].children?.includes(id)));
 const fromHash=()=>owner(location.hash.slice(1).split('/').at(-1))||'';
 function render(id,{focus=false,scroll=false}={}){
  clearTimeout(enterTimer);current=id;
  cards.forEach(a=>{const selected=a.dataset.theme===id;a.setAttribute('aria-expanded',String(selected));a.classList.toggle('is-selected',selected);if(selected)a.setAttribute('aria-current','true');else a.removeAttribute('aria-current');});
  panels.forEach(p=>{p.hidden=p.id!==id;p.classList.remove('is-entering');p.querySelector('.xd-panel-toolbar').hidden=false;});
  host.querySelectorAll('[data-switch]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.switch===id)));
  const panel=panels.find(p=>p.id===id);
  if(panel){
   if(!reduced.matches){panel.classList.add('is-entering');enterTimer=setTimeout(()=>panel.classList.remove('is-entering'),600);}
   if(scroll)panel.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
   if(focus)panel.querySelector('h2').focus({preventScroll:true});
  }
  host.querySelector('.xd-status').textContent=id?nodes[id].ja+'の内容を表示しました。':'4つのテーマから選べます。';
 }
 function select(id,trigger){
  if(id===current)return;
  if(!current){returnY=scrollY;opener=trigger||cards.find(a=>a.dataset.theme===id);}
  history.pushState({...history.state,xdTheme:id,xdReturnY:returnY},'', '#'+id);
  render(id,{focus:true,scroll:true});
 }
 function close(){
  history.replaceState({...history.state,xdTheme:''},'','#home');render('');
  window.scrollTo({top:returnY,behavior:'instant'});opener?.focus({preventScroll:true});
 }
 cards.forEach(a=>{a.setAttribute('aria-controls',a.dataset.theme);a.setAttribute('aria-expanded','false');a.addEventListener('click',e=>{if(e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;e.preventDefault();select(a.dataset.theme,a);});a.addEventListener('keydown',e=>{if(e.key===' '){e.preventDefault();a.click();}});});
 host.querySelectorAll('[data-switch]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.switch)));
 host.querySelectorAll('.xd-theme-close').forEach(b=>b.addEventListener('click',close));
 host.querySelectorAll('.xd-drawer').forEach(drawer=>{
  const summary=drawer.querySelector('summary'),panel=drawer.querySelector('.xd-drawer-body');
  let desiredOpen=false,animation;
  drawer.open=false;panel.inert=true;
  const settle=open=>{drawer.open=open;drawer.style.height='';drawer.style.overflow='';animation=null;};
  summary.addEventListener('click',event=>{
   event.preventDefault();desiredOpen=!desiredOpen;
   const start=drawer.getBoundingClientRect().height;
   if(animation){animation.cancel();animation=null;}
   summary.setAttribute('aria-expanded',String(desiredOpen));panel.inert=!desiredOpen;
   if(desiredOpen)drawer.open=true;
   drawer.style.height='';
   const end=desiredOpen?drawer.getBoundingClientRect().height:summary.getBoundingClientRect().height;
   if(reduced.matches||!drawer.animate){settle(desiredOpen);return;}
   drawer.style.overflow='hidden';
   animation=drawer.animate({height:[start+'px',end+'px']},{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
   animation.onfinish=()=>settle(desiredOpen);
  });
  drawer.addEventListener('toggle',()=>{if(animation)return;desiredOpen=drawer.open;panel.inert=!desiredOpen;summary.setAttribute('aria-expanded',String(desiredOpen));});
 });
 host.querySelectorAll('.xd-more').forEach(d=>{const s=d.querySelector('summary');s.setAttribute('aria-expanded',String(d.open));d.addEventListener('toggle',()=>s.setAttribute('aria-expanded',String(d.open)));});
 host.querySelectorAll('[data-video]').forEach(button=>button.addEventListener('click',()=>{const frame=document.createElement('iframe');frame.src='https://www.youtube-nocookie.com/embed/'+button.dataset.video;frame.title=button.dataset.title;frame.allow='encrypted-media; picture-in-picture';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';button.replaceWith(frame);}));
 addEventListener('popstate',()=>{returnY=history.state?.xdReturnY??returnY;render(fromHash());});
 addEventListener('hashchange',()=>{if(fromHash()!==current)render(fromHash());});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&current&&!document.querySelector('dialog[open]')&&!document.querySelector('.xen-header-toggle[aria-expanded=true]')){e.preventDefault();close();}});
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('xd-in-view');observer.unobserve(entry.target);}}),{threshold:.1});document.querySelectorAll('.xd-gallery-heading,.xd-related-pages').forEach(n=>observer.observe(n));}
 render(fromHash());
 document.documentElement.dataset.discoveryReady='true';
})();
