/* Resolve the existing portrait anchor after gallery shuffling and image layout.
   Never alter the gallery's contents, order, randomizer or viewer. */
(() => {
  const reveal=()=>{
    if(location.hash!=='#artwork-20261023-03')return;
    const work=document.getElementById('artwork-20261023-03');if(!work)return;
    const image=work.querySelector('img');if(image)image.loading='eager';
    requestAnimationFrame(()=>{
      const header=document.getElementById('xen-site-header');
      const offset=(header?.getBoundingClientRect().height||0)+16;
      // Existing entrance animations translate ancestors; use untransformed layout.
      let top=0;for(let node=work;node;node=node.offsetParent)top+=node.offsetTop;
      scrollTo({top:top-offset,behavior:'instant'});
      work.focus({preventScroll:true});
    });
  };
  addEventListener('pageshow',reveal);addEventListener('hashchange',reveal);
  if(document.readyState==='complete')reveal();else addEventListener('load',reveal,{once:true});
})();
