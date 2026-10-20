/* QUIET LUXURY: one entry observer, final-state baseline, no overlay or link interception. */
(() => {
  'use strict';
  const start = () => {
    if (window.XENMotion || !document.body) return;
    const body = document.body;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width:901px) and (hover:hover) and (pointer:fine)');
    const ease = 'cubic-bezier(.22,.68,0,1)';
    const seen = new WeakSet(), registered = new WeakSet(), targets = new Map(), active = new Map();
    let suspended = false, frame = 0, depthVisible = false;
    const allowed = () => !reduced.matches && !document.hidden && !suspended;
    const animate = (node, frames, options = {}) => {
      if (!allowed() || !node.animate || node.contains(document.activeElement)) return;
      const animation = node.animate(frames, {duration:850, easing:ease, fill:'backwards', ...options});
      active.set(animation,node);
      animation.finished.then(() => {active.delete(animation);animation.cancel();}, () => active.delete(animation));
    };
    const enter = (node, index) => {
      if (seen.has(node)) return;
      seen.add(node);
      node.classList.add('ql-seen');
      if (!allowed()) return;
      const kind = targets.get(node);
      // Cap a visible group at four beats. Later rows get their own clock.
      const delay = Math.min(index,3) * 100;
      const frames = kind === 'line' ? [{transform:'scaleX(0)',opacity:0},{transform:'scaleX(1)',opacity:1}] :
        kind === 'mask' ? [{opacity:0,clipPath:'inset(0 0 5% 0)'},{opacity:1,clipPath:'inset(0)'}] :
        kind === 'image' || kind === 'fade' ? [{opacity:0},{opacity:1}] :
        [{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}];
      animate(node,frames,{duration:kind === 'image' || kind === 'mask' ? 1000 : 850,delay});
      // Scale is contained within an existing image frame, never a whole card or player.
      if ((kind === 'image' || kind === 'mask') && !node.closest('.brand-visual')) {
        const image = node.querySelector('img');
        if (image && image.parentElement.matches('.gallery-visual,.thumb')) {
          animate(image,[{transform:'scale(1.025)'},{transform:'scale(1)'}],{duration:1100,delay});
        }
      }
      if (node.matches('.studio-service-grid > li')) node.querySelectorAll('svg > *').forEach(shape => {
        if (!shape.getTotalLength) return;
        const length=shape.getTotalLength();
        if(length>0) animate(shape,[{strokeDasharray:`${length} ${length}`,strokeDashoffset:length},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0}],{duration:900,delay});
      });
    };
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top || a.boundingClientRect.left-b.boundingClientRect.left);
      visible.forEach((entry,index)=>{observer.unobserve(entry.target);enter(entry.target,index);});
    }, {threshold:0,rootMargin:'0px 0px -12px 0px'}) : null;
    function refresh() {
      const candidates = new Map();
      const add = (selector,kind='text') => document.querySelectorAll(selector).forEach(n=>candidates.set(n,kind));
      add('main h1, main h2, main .eyebrow, main .lead, main .series-title, main .pill, main .section-label');
      add('main .content > p, main .project-group > p, main .note, main .space-caption, .design-description > *, .design-subtitle, .design-index');
      add('main .rule, .design-project-line','line');
      add('main .work, .price-card, .price-overview, .price-summary-row, .price-category-nav > a, .price-category-heading','card');
      add('main .gallery-item','image');
      add('.storybooks-page main .work, .architecture-page main .gallery-item','mask');
      add('.cinematic-page main .work, .animation-page main .work, .space-page main .gallery-item','fade');
      add('.sound-platform-group h3, .sound-service-grid > li, .sound-social-use, .sound-category-nav > a','card');
      add('.cp-facts > div, .cp-personal > li, .cp-field-entry, .cp-career > li, .cp-kicker, .cp-role, .cp-about-layout, .cp-copy, .cp-philosophy blockquote, .creator-connect-links > a, .cp-project-archive','card');
      add('.profile-portrait','image');
      add('.studio-copy > p, .studio-philosophy-copy, .contact-catch, .contact-item, .studio-actions');
      add('.studio-service-grid > li, .studio-values-summary > div','card');
      add('.sns-body, .sns-service-list > li, .sns-process-list > li, .sns-strength-list > li, .sns-fit-list > li, .sns-metric','card');
      add('.base-product, .xen-latest-item','card');
      add('#base-products-title');
      add('.xen-news-heading, .xen-news-item, .xen-news-card, .news-card, .index-link, .about > *, .xen-footer-actions > a, .xen-footer-top, .xen-footer-copyright');
      // These scenes own their assembly, disclosures and native playback.
      for(const [node] of candidates) {
        if(node.closest('.studio-fusion,.mvv-pyramid,.mvv-detail,[hidden],dialog')) {candidates.delete(node);continue;}
        for(let parent=node.parentElement;parent;parent=parent.parentElement) {
          if(candidates.has(parent) || registered.has(parent)) {candidates.delete(node);break;}
        }
      }
      for(const [node,kind] of candidates) {
        if(registered.has(node)) continue;
        registered.add(node);targets.set(node,kind);node.dataset.qlMotion=kind;
        if(observer && !reduced.matches)observer.observe(node);else seen.add(node);
      }
      // Newly fetched catalog/latest-video cards join the same observer.
      for(const [node] of targets) if(!node.isConnected){observer?.unobserve(node);targets.delete(node);}
    }
    window.XENMotion = {refresh};
    body.classList.add('ql-ready');
    refresh();
    document.querySelectorAll('[data-base-grid], [data-latest-videos], .xen-latest-grid').forEach(grid=> {
      new MutationObserver(refresh).observe(grid,{childList:true,subtree:true});
    });
    document.querySelectorAll('.xen-tile-gallery .gallery-item').forEach(link=>{link.dataset.galleryLabel=link.querySelector('img')?.alt||'';});
    // INDEX source labels reveal in order. SVG paths and the approved logo stay intact.
    document.querySelectorAll('.home-page .orbit a').forEach((link,index)=>{
      animate(link,[{opacity:0},{opacity:1}],{duration:850,delay:index*100});
    });
    // Just one architectural surface receives a bounded 4px desktop depth movement.
    const depth = document.querySelector('.architecture-page main .gallery-item');
    const updateDepth=()=>{
      frame=0;
      if(!depth || !depthVisible || !desktop.matches || !allowed())return;
      const rect=depth.getBoundingClientRect();
      const progress=Math.max(-1,Math.min(1,(innerHeight/2-rect.top-rect.height/2)/(innerHeight/2+rect.height/2)));
      depth.style.translate=`0 ${(progress*4).toFixed(2)}px`;
    };
    const queueDepth=()=>{if(depth && depthVisible && desktop.matches && allowed() && !frame)frame=requestAnimationFrame(updateDepth);};
    if(depth && observer) {
      new IntersectionObserver(entries=>{depthVisible=entries[0].isIntersecting;queueDepth();}).observe(depth);
      addEventListener('scroll',queueDepth,{passive:true});
      addEventListener('resize',queueDepth,{passive:true});
    }
    function settle() {
      active.forEach((_,animation)=>animation.cancel());active.clear();
      cancelAnimationFrame(frame);frame=0;
      if(!allowed() || !desktop.matches)depth?.style.removeProperty('translate');
      if(reduced.matches){observer?.disconnect();targets.forEach((_,node)=>seen.add(node));}
      queueDepth();
    }
    body.addEventListener('focusin',event=>{
      for(const [animation,node] of active)if(node.contains(event.target)){animation.cancel();active.delete(animation);}
    });
    reduced.addEventListener('change',settle);desktop.addEventListener('change',settle);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)settle();else queueDepth();});
    addEventListener('pagehide',()=>{suspended=true;settle();});
    addEventListener('pageshow',event=>{suspended=false;if(event.persisted)settle();});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
