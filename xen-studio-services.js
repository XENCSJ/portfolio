/* One finite, optional sequence. Text is readable before, during and after it. */
(() => {
  'use strict';
  const root = document.querySelector('body.studio-page .studio-values-motion');
  if (!root) return;
  const toggle = root.querySelector('.studio-motion-toggle');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timer = 0;
  let frame = 0;
  let played = false;
  const stop = () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    root.classList.remove('is-playing');
    toggle.textContent = 'もう一度再生';
    toggle.setAttribute('aria-pressed', 'false');
  };
  const play = () => {
    stop();
    if (reduced.matches || document.hidden) return;
    played = true;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        root.classList.add('is-playing');
        toggle.textContent = '動きを止める';
        toggle.setAttribute('aria-pressed', 'true');
        timer = setTimeout(stop, 6000);
      });
    });
  };
  toggle.hidden = reduced.matches;
  toggle.addEventListener('click', () => root.classList.contains('is-playing') ? stop() : play());
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !played) play();
      else if (!entries[0].isIntersecting) stop();
    }, {threshold:0.25});
    observer.observe(root.querySelector('.studio-values-orbit'));
  }
  reduced.addEventListener('change', () => { stop(); toggle.hidden = reduced.matches; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
