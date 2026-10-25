/* Native disclosures remain usable without JavaScript. */
(() => {
  'use strict';
  const root=document.getElementById('youtube-channels');
  if(!root) return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let anchorFrame=0;
  const stopAnchor=()=>{ cancelAnimationFrame(anchorFrame); anchorFrame=0; };
  const states=[...root.querySelectorAll('.xc-channel')].map(details=>{
    const summary=details.querySelector('summary'), panel=details.querySelector('.xc-panel');
    let animation=null, target=false;
    details.removeAttribute('name');
    details.dataset.enhanced='';
    const sync=()=>{ summary.setAttribute('aria-expanded',String(target)); panel.inert=!target; };
    const settle=()=>{ const old=animation; animation=null; if(old){old.onfinish=null;old.cancel();} details.open=target; details.style.height=''; sync(); };
    const set=open=>{
      if(target===open) return;
      const start=details.getBoundingClientRect().height;
      const old=animation; animation=null; if(old){old.onfinish=null;old.cancel();}
      target=open; sync();
      if(reduced.matches||!details.animate){settle();return;}
      details.open=true;
      const border=parseFloat(getComputedStyle(details).borderTopWidth)+parseFloat(getComputedStyle(details).borderBottomWidth);
      const end=open?details.getBoundingClientRect().height:summary.getBoundingClientRect().height+border;
      animation=details.animate([{height:start+'px'},{height:end+'px'}],{duration:350,easing:'cubic-bezier(.22,.68,0,1)',fill:'both'});
      animation.onfinish=settle;
    };
    details.open=false;sync();
    return {details,summary,panel,set,settle,get target(){return target;},get moving(){return !!animation;}};
  });
  states.forEach((state,index)=>state.summary.addEventListener('click',event=>{
    event.preventDefault();stopAnchor();
    const open=!state.target;
    const anchorTop=state.summary.getBoundingClientRect().top;
    const closesAbove=open&&states.slice(0,index).some(s=>s.target||s.moving);
    if(open) states.forEach(other=>{if(other!==state)other.set(false);});
    state.set(open);
    // Keep the tapped row in place while a preceding panel collapses.
    // User scrolling cancels this short-lived compensation immediately.
    if(closesAbove){
      const hold=()=>{
        const delta=state.summary.getBoundingClientRect().top-anchorTop;
        if(Math.abs(delta)>.5) window.scrollBy({top:delta,left:0,behavior:'instant'});
        if(states.some(s=>s.moving))anchorFrame=requestAnimationFrame(hold);else anchorFrame=0;
      };hold();
    }
  }));
  for(const event of ['wheel','touchstart','pointerdown','keydown'])window.addEventListener(event,stopAnchor,{passive:true});
  const finish=()=>{stopAnchor();states.forEach(s=>s.settle());};
  window.addEventListener('resize',finish,{passive:true});
  reduced.addEventListener('change',finish);
})();
