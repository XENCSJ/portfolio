/* Native details work without JS; enhancement adds a cancellable 300 ms disclosure. */
(() => {
 'use strict';
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 const entries=[...document.querySelectorAll('.creator-page .cp-field-entry')];
 const states=entries.map(details=>{
  const summary=details.querySelector('summary'),panel=details.querySelector('.cp-field-detail');
  let animation=null,target=details.open;
  const settle=()=>{animation?.cancel();animation=null;details.open=target;details.style.height='';summary.setAttribute('aria-expanded',String(target));panel.inert=!target;};
  summary.setAttribute('aria-expanded',String(target));panel.inert=!target;
  summary.addEventListener('click',event=>{
   event.preventDefault();
   const start=details.getBoundingClientRect().height;
   animation?.cancel();animation=null;
   target=!target;summary.setAttribute('aria-expanded',String(target));panel.inert=!target;
   if(preference.matches||!details.animate){settle();return;}
   details.style.height='';details.open=true;
   const end=target?details.getBoundingClientRect().height:summary.getBoundingClientRect().height+parseFloat(getComputedStyle(details).borderTopWidth)+parseFloat(getComputedStyle(details).borderBottomWidth);
   animation=details.animate([{height:start+'px'},{height:end+'px'}],{duration:300,easing:'cubic-bezier(.22,.68,0,1)',fill:'both'});
   animation.onfinish=settle;
  });
  details.addEventListener('toggle',()=>{if(!animation){target=details.open;summary.setAttribute('aria-expanded',String(target));panel.inert=!target;}});
  return {settle,open:()=>{target=true;settle();}};
 });
 preference.addEventListener('change',()=>{if(preference.matches)states.forEach(s=>s.settle());});
 window.addEventListener('resize',()=>states.forEach(s=>s.settle()),{passive:true});
 const openHash=()=>{const id=location.hash.slice(1);const index=entries.findIndex(e=>e.id===id);if(index>=0)states[index].open();};
 window.addEventListener('hashchange',openHash);openHash();
})();
