/* Soft Fade Up Reveal: one observer, one entrance per card, visible without JS. */
(() => {
  'use strict';
  const start = () => {
    if (window.XENMotion || !document.body) return;
    const body = document.body;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const targets = new Set(), seen = new WeakSet(), active = new Map();
    const selector = [
      'main h1','main h2','main .eyebrow','main .lead','main .series-title','main .pill','main .section-label',
      'main .content > p','main .project-group > p','main .note','main .space-caption',
      'main .rule','.design-project-line','.design-subtitle','.design-index','.contents-grid > li',
      'main .work','.cinematic-work','.sound-release-card','.gallery-description-card','.design-description',
      '.arch-project','.space-feature','.price-card','.price-overview','.price-summary-row',
      '.price-category-nav > a','.price-category-heading','main .gallery-item',
      '.sound-platform-group h3','.sound-service-grid > li','.sound-social-use','.sound-category-nav > a',
      '.cp-facts > div','.cp-personal > li','.cp-field-entry','.cp-career > li','.cp-kicker','.cp-role',
      '.cp-about-layout','.cp-copy','.cp-philosophy blockquote','.creator-connect-links > a','.cp-project-archive',
      '.profile-portrait','.support-shell','.studio-copy > p','.studio-philosophy-copy','.contact-catch',
      '.contact-item','.studio-actions','.studio-service-grid > li','.studio-values-summary > div','.mvv-detail',
      '.sns-body','.sns-service-list > li','.sns-process-list > li','.sns-strength-list > li','.sns-fit-list > li',
      '.sns-metrics','.sns-fit','.base-product','.xen-latest-item','.apparel-editorial-image',
      '#base-products-title','.xen-news-heading','.xen-news-item','.xen-news-card','.news-card',
      '.index-link','.about > *','.xen-footer-actions > a','.xen-footer-top','.xen-footer-copyright',
      // INDEX orbit labels have a dedicated clockwise, opacity-only entrance.
      '[data-soft-reveal-demo]'
    ].join(',');
    let suspended = false;
    const canAnimate = () => !reduced.matches && !document.hidden && !suspended;
    function enter(node, index) {
      if (seen.has(node)) return;
      seen.add(node);
      node.classList.add('ql-seen');
      if (!canAnimate() || !node.animate || node.contains(document.activeElement)) return;
      const animation = node.animate([
        {opacity:0, transform:'translateY(16px)'},
        {opacity:1, transform:'translateY(0px)'}
      ], {duration:700, delay:index * 120, easing:'cubic-bezier(0.22, 1, 0.36, 1)', fill:'backwards', iterations:1});
      active.set(animation, node);
      animation.finished.then(() => {active.delete(animation); animation.cancel();}, () => active.delete(animation));
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting && !seen.has(entry.target));
      // Sort from the untransformed layout, before any of this batch starts moving.
      visible.sort((a,b) => Math.abs(a.boundingClientRect.top-b.boundingClientRect.top) > 1
        ? a.boundingClientRect.top-b.boundingClientRect.top
        : a.boundingClientRect.left-b.boundingClientRect.left);
      visible.forEach((entry,index) => {observer.unobserve(entry.target); enter(entry.target,index);});
    }, {threshold:0, rootMargin:'0px'}) : null;
    function refresh() {
      const candidates = new Set(document.querySelectorAll(selector));
      for (const node of candidates) {
        // Keep the existing logo and MVV diagrams intact. Their controls have their own state.
        if (node.closest('.studio-fusion,.mvv-pyramid,[data-shop-catalog] .catalog-product,[hidden],dialog')) {candidates.delete(node); continue;}
        for (let parent=node.parentElement; parent; parent=parent.parentElement) {
          if (candidates.has(parent) || targets.has(parent)) {candidates.delete(node); break;}
        }
      }
      for (const node of candidates) {
        if (targets.has(node)) continue;
        targets.add(node);
        node.dataset.qlMotion = 'soft-fade-up';
        if (observer && !reduced.matches) observer.observe(node);
        else {seen.add(node); node.classList.add('ql-seen');}
      }
      for (const node of targets) if (!node.isConnected) {observer?.unobserve(node); targets.delete(node);}
    }
    function settle() {
      active.forEach((node,animation) => animation.cancel());
      active.clear();
      if (reduced.matches) {
        observer?.disconnect();
        targets.forEach(node => {seen.add(node); node.classList.add('ql-seen');});
      }
    }
    window.XENMotion = {refresh};
    body.classList.add('ql-ready');
    refresh();
    // Only asynchronous content containers need mutation observation.
    document.querySelectorAll('[data-base-grid],[data-latest-videos],.xen-latest-grid,[data-design-products]').forEach(grid => {
      new MutationObserver(refresh).observe(grid,{childList:true,subtree:true});
    });
    document.addEventListener('toggle',refresh,true);
    body.addEventListener('focusin',event => {
      for (const [animation,node] of active) if (node.contains(event.target)) {animation.cancel(); active.delete(animation);}
      for (const node of targets) if (node.contains(event.target)) {seen.add(node); observer?.unobserve(node);}
    });
    reduced.addEventListener('change',settle);
    document.addEventListener('visibilitychange',() => {if(document.hidden) settle();});
    addEventListener('pagehide',() => {suspended=true; settle();});
    addEventListener('pageshow',event => {suspended=false; if(event.persisted) settle();});
  };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
