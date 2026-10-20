/* Finite intro + CSS-only drift. No pointer tracking, navigation interception or RAF loop. */
(() => {
  'use strict';
  const scene = document.querySelector('.studio-fusion');
  if (!scene || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let entered = false;
  let suspended = false;
  function sync() {
    const active = visible && !document.hidden && !suspended && !reduced.matches;
    if (active && !entered) {
      entered = true;
      scene.classList.add('is-running');
    }
    scene.classList.toggle('is-paused', !active);
  }
  const observer = new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    sync();
  }, {threshold:0});
  observer.observe(scene);
  // A reduced-motion change settles the scene permanently, without replaying the intro.
  reduced.addEventListener('change', () => {
    if (reduced.matches) { entered = true; scene.classList.remove('is-running'); }
    sync();
  });
  if (reduced.matches) entered = true;
  document.addEventListener('visibilitychange', sync);
  addEventListener('pagehide', () => { suspended = true; sync(); });
  addEventListener('pageshow', () => { suspended = false; sync(); });
})();
