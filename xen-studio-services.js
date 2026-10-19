/* Preserve existing inquiry URLs after removing the page-only CONTACT section. */
(() => {
  'use strict';
  const followInquiry = () => {
    if (location.hash === '#studio-contact' && !document.getElementById('studio-contact')) {
      location.replace('https://ig.me/m/xen_csj');
    }
  };
  window.addEventListener('hashchange', followInquiry);
  followInquiry();
})();

/* One finite sequence. Text is readable before, during and after it. */
(() => {
  'use strict';
  const root = document.querySelector('body.studio-page .studio-values-motion');
  if (!root) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timer = 0;
  let frame = 0;
  let played = false;
  const stop = () => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    root.classList.remove('is-playing');
  };
  const play = () => {
    stop();
    if (reduced.matches || document.hidden) return;
    played = true;
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        root.classList.add('is-playing');
        timer = setTimeout(stop, 6000);
      });
    });
  };
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !played) play();
      else if (!entries[0].isIntersecting) stop();
    }, {threshold:0.25});
    observer.observe(root.querySelector('.studio-values-orbit'));
  }
  reduced.addEventListener('change', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
})();
