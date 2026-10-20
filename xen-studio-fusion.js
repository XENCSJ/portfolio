/* STUDIO intro only: CSS motion + bounded scroll depth, no continuous RAF loop. */
(() => {
  'use strict';
  const scene = document.querySelector('.studio-fusion');
  if (!scene || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let entered = false;
  let suspended = false;
  let scrollFrame = 0;
  function depth() {
    scrollFrame = 0;
    if (!visible || document.hidden || suspended || reduced.matches) return;
    const progress = Math.max(0, Math.min(1, -scene.getBoundingClientRect().top / scene.offsetHeight));
    scene.style.setProperty('--fusion-depth', `${(progress * -5).toFixed(2)}px`);
  }
  function queueDepth() {
    if (!scrollFrame && visible && !reduced.matches) scrollFrame = requestAnimationFrame(depth);
  }
  function sync() {
    const active = visible && !document.hidden && !suspended && !reduced.matches;
    if (active && !entered) {
      entered = true;
      scene.classList.add('is-running');
    }
    scene.classList.toggle('is-paused', !active);
    if (active) queueDepth();
    else { cancelAnimationFrame(scrollFrame); scrollFrame = 0; }
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, {threshold:0});
  observer.observe(scene);
  // A reduced-motion change settles the scene permanently, without replaying the intro.
  reduced.addEventListener('change', () => {
    if (reduced.matches) { entered = true; scene.classList.remove('is-running'); scene.style.removeProperty('--fusion-depth'); }
    sync();
  });
  if (reduced.matches) entered = true;
  addEventListener('scroll', queueDepth, {passive:true});
  addEventListener('resize', queueDepth, {passive:true});
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => { suspended = true; sync(); });
  addEventListener('pageshow', () => { suspended = false; sync(); });
})();
