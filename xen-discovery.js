/* Four compact theme panels share one native modal. Existing URLs stay valid. */
(() => {
 'use strict';
 const host=document.querySelector('.xd-explorer'),dialog=document.querySelector('.xd-theme-dialog');
 if(!host||!dialog||typeof dialog.showModal!=='function')return;
 const cards=[...host.querySelectorAll('[data-theme]')],panels=[...dialog.querySelectorAll('[data-panel]')];
 const switches=[...dialog.querySelectorAll('[data-switch]')],themes=cards.map(a=>a.dataset.theme);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const aliases={identity:'past',philosophy:'future',creation:'present',connection:'together'};
 let current='',opener=null,pageY=0,returnHash='',closing=false,animation=null;
 const hashTheme=()=>{const id=location.hash.slice(1).split('/').at(-1);return themes.includes(id)?id:aliases[id]||'';};
 const announce=open=>document.dispatchEvent(new CustomEvent('xen:theme-modal',{detail:{open}}));
 function render(id){
  current=id;
  cards.forEach(card=>{const selected=card.dataset.theme===id;card.setAttribute('aria-expanded',String(selected));card.classList.toggle('is-selected',selected);});
  panels.forEach(panel=>panel.hidden=panel.dataset.panel!==id);
  switches.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.switch===id)));
  dialog.setAttribute('aria-labelledby',id+'-title');
  dialog.querySelector('.xd-theme-counter').textContent=`0${themes.indexOf(id)+1} / 04 — ${id.toUpperCase()}`;
  dialog.querySelector('.xd-theme-scroll').scrollTop=0;
 }
 function open(id,trigger){
  if(!themes.includes(id)||closing)return;
  // Never layer a theme modal over the gallery's work modal.
  if(document.querySelector('dialog[open]:not(.xd-theme-dialog)'))return;
  const first=!dialog.open;
  if(first){pageY=scrollY;opener=trigger||cards.find(a=>a.dataset.theme===id);returnHash=location.hash;}
  render(id);
  if(first){
   document.body.style.top=`-${pageY}px`;document.body.classList.add('xd-modal-open');
   dialog.showModal();announce(true);
   dialog.querySelector('.xd-theme-close').focus({preventScroll:true});
   if(!reduced.matches)animation=dialog.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:280,easing:'ease-out'});
  }
 }
 function close(changeHistory=true){
  if(!dialog.open||closing)return;
  closing=true;
  const finish=()=>{
   dialog.close();current='';closing=false;
   cards.forEach(card=>{card.setAttribute('aria-expanded','false');card.classList.remove('is-selected');});
   document.body.classList.remove('xd-modal-open');document.body.style.top='';
   scrollTo({top:pageY,behavior:'instant'});opener?.focus({preventScroll:true});announce(false);
   if(changeHistory){
    if(history.state?.xdThemeModal)history.back();
    else history.replaceState(history.state,'',location.pathname+location.search+'#explore');
   }
  };
  animation?.cancel();
  if(reduced.matches){finish();return;}
  animation=dialog.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(6px)'}],{duration:180,easing:'ease-in'});
  animation.onfinish=finish;
 }
 function select(id,trigger){
  const wasOpen=dialog.open;open(id,trigger);
  if(!dialog.open||closing)return;
  if(wasOpen)history.replaceState(history.state,'','#'+id);
  else history.pushState({...history.state,xdThemeModal:true},'','#'+id);
 }
 cards.forEach(card=>{
  card.setAttribute('aria-haspopup','dialog');card.setAttribute('aria-controls','xd-theme-modal');card.setAttribute('aria-expanded','false');
  card.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.button)return;event.preventDefault();select(card.dataset.theme,card);});
  card.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();card.click();}});
 });
 dialog.id='xd-theme-modal';
 switches.forEach(button=>button.addEventListener('click',()=>select(button.dataset.switch)));
 dialog.querySelector('.xd-theme-close').addEventListener('click',()=>close());
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
 const sync=()=>{const id=hashTheme();if(id){if(current!==id)open(id);}else close(false);};
 addEventListener('popstate',sync);addEventListener('hashchange',sync);
 // Close before navigation is cached so Back restores the original exploration screen.
 addEventListener('pagehide',()=>{if(dialog.open){animation?.cancel();dialog.close();current='';closing=false;document.body.classList.remove('xd-modal-open');document.body.style.top='';}});
 addEventListener('pageshow',event=>{if(event.persisted){scrollTo({top:pageY,behavior:'instant'});sync();announce(dialog.open);}});
 cards.forEach((card,i)=>card.style.setProperty('--theme-order',i));
 document.querySelectorAll('.xd-tile').forEach((tile,i)=>tile.style.setProperty('--tile-order',i));
 const sections=document.querySelectorAll('.xd-gallery,.xd-intro,.xd-words');
 if('IntersectionObserver'in window){const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('xd-in-view');observer.unobserve(entry.target);}}),{threshold:.08});sections.forEach(n=>observer.observe(n));}
 else sections.forEach(n=>n.classList.add('xd-in-view'));
 sync();document.documentElement.dataset.discoveryReady='true';
})();
