/* Independent, keyboard-accessible disclosures; no external hash redirects. */
(() => {
  'use strict';
  const root = document.querySelector('main > #contact');
  if (!root) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const items = Array.from(root.querySelectorAll('.contact-toggle')).map(button => ({
    button, panel: document.getElementById(button.getAttribute('aria-controls')), animation: null
  })).filter(item => item.panel);
  const settle = (item, open) => {
    if (item.animation) {
      item.animation.onfinish = null;
      item.animation.cancel();
      item.animation = null;
    }
    item.panel.hidden = !open;
    item.panel.inert = !open;
  };
  items.forEach(item => {
    item.button.addEventListener('click', () => {
      const open = item.button.getAttribute('aria-expanded') !== 'true';
      const start = item.panel.hidden ? 0 : item.panel.getBoundingClientRect().height;
      if (item.animation) {
        item.animation.onfinish = null;
        item.animation.cancel();
        item.animation = null;
      }
      item.button.setAttribute('aria-expanded', String(open));
      item.button.querySelector('.contact-plus').textContent = open ? '−' : '＋';
      item.panel.hidden = false;
      item.panel.inert = !open;
      if (reduced.matches || !item.panel.animate) { settle(item, open); return; }
      item.animation = item.panel.animate([{height: start + 'px'}, {height: (open ? item.panel.scrollHeight : 0) + 'px'}], {
        duration: 240, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both'
      });
      item.animation.onfinish = () => settle(item, open);
    });
  });
  const settleAll = () => items.forEach(item => settle(item, item.button.getAttribute('aria-expanded') === 'true'));
  reduced.addEventListener('change', settleAll);
  window.addEventListener('resize', settleAll, {passive: true});
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
