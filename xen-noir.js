/* One-shot progressive enhancement. The complete final state is the HTML default. */
(() => {
  'use strict';
  const page = document.querySelector('body.xen-noir');
  if (!page) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const animations = new Set();
  const counters = new Map();
  const seen = new WeakSet();
  const ease = 'cubic-bezier(.22,.68,0,1)';
  function animate(node, frames, options = {}) {
    if (!node || !node.animate || reduced.matches || document.hidden) return;
    const animation = node.animate(frames, {duration:600, easing:ease, fill:'backwards', ...options});
    animations.add(animation);
    animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
  }
  function reveal(node, delay = 0) {
    if (node.contains(document.activeElement)) return;
    animate(node, [{opacity:0, transform:'translateY(10px)'}, {opacity:1, transform:'translateY(0)'}], {delay});
  }
  function growth(figure) {
    figure.querySelectorAll('.growth-bar').forEach((bar, index) => {
      animate(bar, [{transform:'scaleY(0)', opacity:.2}, {transform:'scaleY(1)', opacity:1}], {duration:650, delay:index*100});
    });
    animate(figure.querySelector('.growth-path'), [{strokeDashoffset:1}, {strokeDashoffset:0}], {duration:1000, delay:700});
    animate(figure.querySelector('.growth-extension'), [{strokeDashoffset:1}, {strokeDashoffset:0}], {duration:450, delay:1700});
    animate(figure.querySelector('.growth-arrow'), [{opacity:0}, {opacity:1}], {duration:300, delay:2100});
    reveal(figure.querySelector('figcaption'), 2300);
  }
  function count(node) {
    const value = Number(node.dataset.snsCount);
    if (!Number.isFinite(value) || value <= 1 || reduced.matches || document.hidden) return;
    const state = {final:node.textContent, frame:0};
    counters.set(node,state);
    const start = performance.now();
    const tick = now => {
      const t = Math.min(1,(now-start)/1200);
      node.textContent = t === 1 ? state.final : Math.round(value*(1-Math.pow(1-t,3))).toLocaleString('en-US');
      if (t < 1) state.frame = requestAnimationFrame(tick);
      else counters.delete(node);
    };
    state.frame = requestAnimationFrame(tick);
  }
  function enter(node) {
    if (seen.has(node)) return;
    seen.add(node);
    if (node.matches('.sns-growth')) growth(node);
    else if (node.matches('[data-sns-count]')) count(node);
    else if (node.matches('.mvv-node')) {
      const index = Array.from(node.parentElement.children).indexOf(node);
      const delay = matchMedia('(min-width:701px)').matches ? index*220 : 0;
      reveal(node.querySelector('.mvv-orb'), delay);
      const vertical = matchMedia('(max-width:700px)').matches;
      animate(node.querySelector('.mvv-connector'), [{transform:vertical?'scaleY(0)':'scaleX(0)'},{transform:vertical?'scaleY(1)':'scaleX(1)'}], {duration:420, delay:delay+260});
    } else if (node.matches('.cp-editorial-index')) {
      node.querySelectorAll('.cp-field-entry').forEach((entry,index) => reveal(entry, Math.min(index*45,360)));
    } else reveal(node, Number(node.dataset.noirDelay)||0);
  }
  const targets = page.querySelectorAll('.sns-growth,[data-sns-count]');
  if ('IntersectionObserver' in window && !reduced.matches) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      enter(entry.target);
    }), {threshold:0, rootMargin:'0px 0px -16px 0px'});
    targets.forEach(node => observer.observe(node));
    reduced.addEventListener('change', () => { if (reduced.matches) observer.disconnect(); });
  }
  function settle() {
    animations.forEach(animation => animation.cancel());
    animations.clear();
    counters.forEach((state,node) => {cancelAnimationFrame(state.frame);node.textContent=state.final;});
    counters.clear();
  }
  reduced.addEventListener('change', () => {if(reduced.matches) settle();});
  document.addEventListener('visibilitychange', () => {if(document.hidden) settle();});
  page.addEventListener('focusin', settle);
  addEventListener('pagehide', settle);
})();
