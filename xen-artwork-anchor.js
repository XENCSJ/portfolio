/* Resolve the existing portrait anchor after gallery shuffling and image layout.
   Never alter the gallery's contents, order, randomizer or viewer. */
(() => {
  const reveal=()=>{
    if(location.hash!=='#artwork-20261023-03')return;
    const work=document.getElementById('artwork-20261023-03');if(!work)return;
    const image=work.querySelector('img');if(image)image.loading='eager';
    requestAnimationFrame(()=>{
      const header=document.getElementById('xen-site-header');
      const offset=(header?.getBoundingClientRect().bottom||0)+16;
      scrollTo({top:work.getBoundingClientRect().top+scrollY-offset,behavior:'instant'});
      work.focus({preventScroll:true});
    });
  };
  addEventListener('pageshow',reveal);addEventListener('hashchange',reveal);
  if(document.readyState==='complete')reveal();else addEventListener('load',reveal,{once:true});
})();
