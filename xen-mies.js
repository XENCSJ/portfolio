/* Native dialog with FUTURE's 280/180ms, 6px open/close motion. */
(() => {
  'use strict';
  const dialog=document.getElementById('mies-detail');
  const trigger=document.querySelector('.mies-person-link');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let pageY=0,opener=null,closing=false,animation=null,oldTop='';
  if(dialog&&trigger&&typeof dialog.showModal==='function'){
    const finish=()=>{
      animation?.cancel();animation=null;
      if(dialog.open)dialog.close();
      dialog.classList.remove('is-closing');closing=false;
      document.body.classList.remove('mies-modal-open');document.body.style.top=oldTop;
      scrollTo({top:pageY,behavior:'instant'});
      trigger.setAttribute('aria-expanded','false');opener?.focus({preventScroll:true});
    };
    const close=()=>{
      if(!dialog.open||closing)return;
      closing=true;animation?.cancel();dialog.classList.add('is-closing');
      if(reduced.matches){finish();return;}
      animation=dialog.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(6px)'}],{duration:180,easing:'ease-in'});
      animation.onfinish=finish;
    };
    const open=()=>{
      if(dialog.open||closing||document.querySelector('dialog[open]'))return;
      pageY=scrollY;oldTop=document.body.style.top;opener=trigger;
      document.body.style.top=`-${pageY}px`;document.body.classList.add('mies-modal-open');
      dialog.showModal();dialog.querySelector('.mies-scroll').scrollTop=0;
      trigger.setAttribute('aria-expanded','true');dialog.querySelector('.mies-close').focus({preventScroll:true});
      if(!reduced.matches)animation=dialog.animate([{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:280,easing:'ease-out'});
    };
    trigger.addEventListener('click',event=>{event.preventDefault();open();});
    trigger.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();open();}});
    dialog.querySelector('.mies-close').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    // A queued close event may arrive after the user has already reopened it.
    dialog.addEventListener('close',()=>{if(!dialog.open&&document.body.classList.contains('mies-modal-open'))finish();});
    reduced.addEventListener('change',()=>{if(reduced.matches){if(closing)finish();else animation?.cancel();}});
    addEventListener('pagehide',()=>{if(dialog.open)finish();});
    if(location.hash==='#mies-detail')open();
  }
  // The published breathing-architecture work currently lives in CREATOR.
  // Open only its existing archive when arriving at this exact deep link.
  const revealProject=()=>{
    if(location.hash!=='#breathing-architecture')return;
    const heading=document.getElementById('breathing-architecture');
    const archive=heading?.closest('details');if(!heading||!archive)return;
    archive.open=true;
    requestAnimationFrame(()=>{
      const header=document.getElementById('xen-site-header');
      const offset=(header?.getBoundingClientRect().height||0)+16;
      // Existing entrance animations translate ancestors; use untransformed layout.
      let top=0;for(let node=heading;node;node=node.offsetParent)top+=node.offsetTop;
      scrollTo({top:top-offset,behavior:'instant'});
    });
  };
  addEventListener('hashchange',revealProject);addEventListener('pageshow',revealProject);
  if(document.readyState==='complete')revealProject();else addEventListener('load',revealProject,{once:true});
})();
