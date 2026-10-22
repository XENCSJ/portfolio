/* Random cover sequence with a five-second cadence; verified links live in HTML. */
(() => {
  'use strict';
  document.querySelectorAll('[data-sound-jackets]').forEach(root => {
    const slides = Array.from(root.querySelectorAll('.sound-jacket-slide'));
    if (slides.length < 2) return;
    const previous = root.querySelector('.sound-jacket-prev');
    const next = root.querySelector('.sound-jacket-next');
    const pause = root.querySelector('.sound-jacket-pause');
    const status = root.querySelector('.sound-jacket-status');
    const stage = root.querySelector('.sound-jacket-stage');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let order, index = 0, timer = null, paused = motion.matches;
    let touch = null, suppressClickUntil = 0;
    function shuffle(avoidFirst) {
      const result = slides.slice();
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      if (result[0] === avoidFirst) [result[0], result[1]] = [result[1], result[0]];
      return result;
    }
    function schedule() {
      clearTimeout(timer);
      if (!paused && !document.hidden) timer = setTimeout(() => advance(1, false), 5000);
    }
    function render(manual) {
      const active = order[index];
      const before = order[(index - 1 + order.length) % order.length];
      const after = order[(index + 1) % order.length];
      slides.forEach(slide => {
        const current = slide === active;
        slide.classList.toggle('is-current', current);
        slide.classList.toggle('is-previous', slide === before);
        slide.classList.toggle('is-next', slide === after);
        slide.setAttribute('aria-hidden', String(!current));
        if (slide.tagName === 'A') slide.tabIndex = current ? 0 : -1;
        if (current || slide === before || slide === after) slide.querySelector('img').loading = 'eager';
      });
      status.setAttribute('aria-live', manual ? 'polite' : 'off');
      status.textContent = active.dataset.jacketTitle;
      root.dataset.currentJacket = active.dataset.jacketTitle;
      schedule();
    }
    function advance(direction, manual = true) {
      if (direction > 0 && index === order.length - 1) {
        order = shuffle(order[index]); index = 0;
      } else {
        index = (index + direction + order.length) % order.length;
      }
      render(manual);
    }
    function syncPause() {
      pause.setAttribute('aria-pressed', String(paused));
      pause.setAttribute('aria-label', paused ? '自動切替を開始' : '自動切替を停止');
      schedule();
    }
    previous.addEventListener('click', () => advance(-1));
    next.addEventListener('click', () => advance(1));
    pause.addEventListener('click', () => { paused = !paused; syncPause(); });
    root.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); advance(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    stage.addEventListener('touchstart', event => {
      if (event.touches.length !== 1) { touch = null; return; }
      touch = {x:event.touches[0].clientX, y:event.touches[0].clientY};
    }, {passive:true});
    stage.addEventListener('touchend', event => {
      if (!touch || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touch.x;
      const dy = event.changedTouches[0].clientY - touch.y;
      touch = null;
      if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        suppressClickUntil = Date.now() + 600;
        advance(dx < 0 ? 1 : -1);
      }
    }, {passive:true});
    stage.addEventListener('touchcancel', () => { touch = null; }, {passive:true});
    stage.addEventListener('click', event => {
      if (Date.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
    }, true);
    document.addEventListener('visibilitychange', schedule);
    function changeMotion(event) { paused = event.matches; syncPause(); }
    if (motion.addEventListener) motion.addEventListener('change', changeMotion);
    else if (motion.addListener) motion.addListener(changeMotion);
    order = shuffle();
    [previous, next, pause].forEach(button => { button.hidden = false; });
    syncPause();
    render(false);
  });
})();
