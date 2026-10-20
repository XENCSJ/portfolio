/* Pause the existing source orbit outside the viewport and on inactive tabs. */
(() => {
 const body=document.querySelector('body.home-page'),wheel=body?.querySelector('.wheel');
 if(!wheel)return;
 let visible=true;
 const sync=()=>body.classList.toggle('xen-luxury-paused',document.hidden||!visible);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(wheel);
 document.addEventListener('visibilitychange',sync);addEventListener('pageshow',sync);sync();
})();
