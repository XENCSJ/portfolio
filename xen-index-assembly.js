/* INDEX ring spacing only. Logo entrance is CSS-only and never replays on selection. */
(() => {
 'use strict';
 const orbit=document.querySelector('.home-page .orbit');
 if(!orbit)return;
 const links=[...orbit.querySelectorAll('a')];
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
 arrange();document.fonts?.ready.then(arrange);window.addEventListener('resize',arrange,{passive:true});
})();
