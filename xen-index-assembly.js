/* Independent X/E/N converge into the original compound SVG; no invented path morph. */
(() => {
 'use strict';
 const orbit=document.querySelector('.home-page .orbit');
 const button=document.querySelector('.home-page .logo-stage');
 if(!orbit||!button)return;
 const links=[...orbit.querySelectorAll('a')];
 const final=button.querySelector('.logo-final');
 const letters=[...button.querySelectorAll('.logo-letter')];
 const preference=matchMedia('(prefers-reduced-motion: reduce)');
 let running=false,animations=[],generation=0;
 function arrange(){
  const outer=orbit.querySelector('#circle').getTotalLength(),inner=orbit.querySelector('#circle-ja').getTotalLength();
  const en=links.map(a=>a.querySelector('.orbit-en')),ja=links.map(a=>a.querySelector('.orbit-ja'));
  [...en,...ja].forEach(t=>t.style.removeProperty('font-size'));
  const measure=()=>en.map((t,i)=>Math.max(t.getComputedTextLength()/outer,ja[i].getComputedTextLength()/inner));
  let widths=measure(),total=widths.reduce((a,b)=>a+b,0);
  if(total>.82){[...en,...ja].forEach(t=>t.style.fontSize=(parseFloat(getComputedStyle(t).fontSize)*.82/total)+'px');widths=measure();}
  const gap=(1-widths.reduce((a,b)=>a+b,0))/links.length;
  let offset=gap/2;
  widths.forEach((width,i)=>{links[i].querySelectorAll('textPath').forEach(p=>p.setAttribute('startOffset',((offset+width/2)*100).toFixed(6)+'%'));offset+=width+gap;});
 }
 function finish(){generation++;animations.forEach(a=>a.cancel());animations=[];running=false;button.removeAttribute('aria-busy');button.dataset.state='complete';}
 function play(initial=false){
  if(running||preference.matches||document.hidden||!button.animate)return;
  running=true;const token=++generation;button.setAttribute('aria-busy','true');button.dataset.state='assembling';
  const duration=2800,easing='cubic-bezier(.22,.68,0,1)';
  const start=['translate3d(-100%,-8%,70px) rotateY(-45deg) rotateZ(-10deg)','translate3d(0,-50%,-80px) rotateX(40deg)','translate3d(100%,8%,45px) rotateY(45deg) rotateZ(10deg)'];
  letters.forEach((letter,i)=>animations.push(letter.animate([
   {opacity:0,transform:start[i],offset:0},
   {opacity:1,transform:start[i],offset:.12},
   {opacity:1,transform:`translate3d(${(i-1)*40}%,0,0) rotateX(0) rotateY(0) rotateZ(0)`,offset:.36},
   {opacity:.7,transform:'translate3d(0,0,0) scale(.95)',offset:.59},
   {opacity:0,transform:'translate3d(0,0,0) scale(.9)',offset:.74},
   {opacity:0,transform:'translate3d(0,0,0) scale(.9)',offset:1}
  ],{duration,easing,fill:'both'})));
  animations.push(final.animate([
   {opacity:0,transform:'scale(.88)',offset:0},
   {opacity:0,transform:'scale(.88)',offset:.56},
   {opacity:1,transform:'scale(1)',offset:.84},
   {opacity:1,transform:'scale(1)',offset:1}
  ],{duration,easing,fill:'both'}));
  // Only the first entrance fades the orbit. Replay never hides navigation.
  if(initial)animations.push(orbit.animate([{opacity:0,offset:0},{opacity:0,offset:.82},{opacity:1,offset:1}],{duration,easing:'ease-out',fill:'both'}));
  Promise.all(animations.map(a=>a.finished)).then(()=>{if(token===generation)finish();}).catch(()=>{});
 }
 button.addEventListener('click',()=>play());
 orbit.addEventListener('focusin',finish);
 orbit.addEventListener('pointerdown',finish,{passive:true});
 preference.addEventListener('change',()=>{if(preference.matches)finish();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)finish();});
 window.addEventListener('pagehide',finish);
 window.addEventListener('pageshow',e=>{if(e.persisted)finish();});
 arrange();document.fonts?.ready.then(arrange);window.addEventListener('resize',arrange,{passive:true});
 const img=button.querySelector('img');
 if(img.complete&&img.naturalWidth)play(true);else img.addEventListener('load',()=>play(true),{once:true});
})();
