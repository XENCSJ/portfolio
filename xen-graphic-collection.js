/* Isolated graphic collection behavior. Existing catalog pricing and navigation retain ownership. */
(() => {
  'use strict';
  const dialogs = [...document.querySelectorAll('[data-graphic-dialog]')];
  if (!dialogs.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const byId = new Map(dialogs.map(dialog => [dialog.id, dialog]));
  let active = null;
  let opener = null;
  let ownEntry = null;
  const animations = new Set();
  function animate(node, frames, options) {
    if (reduced.matches || !node.animate) return;
    const animation = node.animate(frames, options);
    animations.add(animation);
    animation.finished.then(() => { animations.delete(animation); animation.cancel(); }, () => animations.delete(animation));
  }
  function closeVisible() {
    if (!active) return;
    const previous = active;
    active = null;
    previous.close();
    document.documentElement.classList.remove('xg-modal-open');
  }
  function syncHash() {
    const dialog = byId.get(location.hash.slice(1));
    if (dialog === active) return;
    closeVisible();
    if (!dialog) {
      if (opener?.isConnected) opener.focus({preventScroll:true});
      opener = null;
      return;
    }
    active = dialog;
    dialog.showModal();
    document.documentElement.classList.add('xg-modal-open');
    dialog.scrollTop = 0;
    dialog.querySelector('[data-graphic-close]').focus({preventScroll:true});
    animate(dialog, [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}], {duration:260,easing:'ease-out'});
  }
  function closeFromUI() {
    if (!active) return;
    if (ownEntry === location.href) {
      ownEntry = null;
      history.back();
    } else {
      const anchor = document.body.classList.contains('apparel-page')
        ? `#base-product-${active.dataset.productId}` : '#xen-graphic-collection';
      history.replaceState(history.state, '', location.pathname + location.search + anchor);
      closeVisible();
      document.querySelector(anchor)?.scrollIntoView({block:'start',behavior:'instant'});
      opener?.focus({preventScroll:true});
      opener = null;
    }
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !byId.has(url.hash.slice(1))) return;
    event.preventDefault();
    opener = link;
    if (location.hash !== url.hash) {
      history.pushState(history.state, '', url.hash);
      ownEntry = location.href;
    }
    syncHash();
  });
  addEventListener('popstate', syncHash);
  addEventListener('hashchange', syncHash);
  addEventListener('pageshow', syncHash);
  dialogs.forEach(dialog => {
    dialog.querySelector('[data-graphic-close]').addEventListener('click', closeFromUI);
    // Keep keyboard navigation inside the modal, including at the browser chrome boundary.
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('a[href],button:not([disabled]),summary,[tabindex="0"]')]
        .filter(node => node.getClientRects().length && !node.closest('[inert]'));
      const first=controls[0], last=controls[controls.length-1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement===first || !dialog.contains(document.activeElement))) {
        event.preventDefault();last.focus();
      } else if (!event.shiftKey && (document.activeElement===last || !dialog.contains(document.activeElement))) {
        event.preventDefault();first.focus();
      }
    });
    dialog.addEventListener('cancel', event => {event.preventDefault();closeFromUI();});
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeFromUI();
    });
    const gallery = dialog.querySelector('[data-graphic-gallery]');
    const stage = gallery.querySelector('.xg-stage');
    const images = [...stage.querySelectorAll('img')];
    const thumbs = [...gallery.querySelectorAll('[data-graphic-thumb]')];
    const status = gallery.querySelector('[data-graphic-image-status]');
    let index = 0;
    let gesture = null;
    function select(next) {
      index = (next + images.length) % images.length;
      images.forEach((img,n) => {img.classList.toggle('is-current', n===index);img.setAttribute('aria-hidden', String(n!==index));});
      thumbs.forEach((button,n) => button.setAttribute('aria-pressed', String(n===index)));
      status.textContent = `${thumbs[index].getAttribute('aria-label').replace('を表示','')} · ${index+1} / ${images.length}`;
    }
    thumbs.forEach((button,n) => button.addEventListener('click', () => select(n)));
    gallery.querySelector('[data-graphic-prev]').addEventListener('click', () => select(index-1));
    gallery.querySelector('[data-graphic-next]').addEventListener('click', () => select(index+1));
    gallery.addEventListener('keydown', event => {
      const next={ArrowLeft:index-1,ArrowRight:index+1,Home:0,End:images.length-1}[event.key];
      if (next===undefined) return;
      event.preventDefault();select(next);
    });
    stage.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0) {gesture=null;return;}
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
      stage.setPointerCapture(event.pointerId);
    });
    stage.addEventListener('pointerup', event => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;
      if (Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)*1.35) select(index+(dx<0?1:-1));
    });
    stage.addEventListener('pointercancel',()=>{gesture=null;});
    stage.addEventListener('lostpointercapture',()=>{gesture=null;});
  });
  document.querySelectorAll('[data-graphic-concept]').forEach(details => {
    const summary=details.querySelector('summary'), panel=details.querySelector('.xg-concept-panel');
    let intended=details.open, animation=null;
    function finish() {
      details.open=intended;animation=null;panel.style.removeProperty('height');panel.style.removeProperty('overflow');
    }
    function update() {
      summary.setAttribute('aria-expanded',String(intended));
      summary.querySelector('.xg-disclosure-icon').textContent=intended?'−':'＋';
      panel.inert=!intended;
    }
    update();
    summary.addEventListener('click', event => {
      event.preventDefault();
      const start=details.open?panel.getBoundingClientRect().height:0;
      animation?.cancel();intended=!intended;update();
      if(reduced.matches||!panel.animate){finish();return;}
      details.open=true;panel.style.height=`${start}px`;panel.style.overflow='hidden';
      animation=panel.animate([{height:`${start}px`,opacity:start?1:0},{height:`${intended?panel.scrollHeight:0}px`,opacity:intended?1:0}],{duration:320,easing:'cubic-bezier(.25,.1,.25,1)',fill:'both'});
      const current=animation;
      current.onfinish=()=>{if(animation!==current)return;current.cancel();finish();};
    });
    details.addEventListener('toggle',()=>{if(!animation){intended=details.open;update();}});
    reduced.addEventListener('change',()=>{if(reduced.matches&&animation){animation.cancel();finish();}});
  });
  // Enrich the existing product cards after the asynchronous feed renders them.
  const grid=document.querySelector('[data-base-grid]');
  function enrichCatalog() {
    if (!document.body.classList.contains('apparel-page') || !grid) return;
    dialogs.forEach(dialog => {
      const card=document.getElementById(`base-product-${dialog.dataset.productId}`);
      if (!card) return;
      if(!card.hasAttribute('data-graphic-product')){
        card.setAttribute('data-graphic-product','');
        const visual=card.querySelector('.base-product-visual');
        visual.href=`#${dialog.id}`;visual.removeAttribute('target');visual.removeAttribute('rel');
        visual.setAttribute('aria-label',`${dialog.dataset.graphicName}の商品詳細を開く`);visual.setAttribute('aria-haspopup','dialog');
        let img=visual.querySelector('img');
        if(!img){img=document.createElement('img');visual.append(img);}
        img.src=dialog.dataset.graphicCover;img.alt=`${dialog.dataset.graphicName} フロント`;
        img.loading='lazy';img.decoding='async';img.width=img.height=1254;
        const detail=document.createElement('a');detail.className='xg-product-detail';detail.href=`#${dialog.id}`;
        detail.setAttribute('aria-haspopup','dialog');detail.textContent='詳細を見る ↗';
        card.querySelector('.base-product-links').append(detail);
      }
      const price=card.querySelector(':scope > .base-product-price');
      const purchase=card.querySelector(':scope > .base-product-cta');
      dialog.querySelector('[data-graphic-price]').replaceChildren(...[...price.childNodes].map(node=>node.cloneNode(true)));
      dialog.querySelector('[data-graphic-purchase]').href=purchase.href;
    });
  }
  if(grid){new MutationObserver(enrichCatalog).observe(grid,{childList:true});enrichCatalog();}
  const reveals=[...document.querySelectorAll('[data-graphic-reveal]')];
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      observer.unobserve(entry.target);
      animate(entry.target,[{opacity:0,transform:'translateY(16px)'},{opacity:1,transform:'translateY(0)'}],{duration:600,easing:'ease-out'});
    }),{threshold:.08});reveals.forEach(card=>observer.observe(card));
  }
  reduced.addEventListener('change',()=>{if(reduced.matches){animations.forEach(a=>a.cancel());animations.clear();}});
  syncHash();
})();
