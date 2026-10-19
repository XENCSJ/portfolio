/* Progressive enhancement: final diagram and native anchors remain usable without JS. */
(() => {
  'use strict';
  const root = document.querySelector('.studio-mvv-experience');
  if (!root) return;
  const orbit = root.querySelector('.mvv-orbit');
  const toggle = root.querySelector('.mvv-motion-toggle');
  const links = [...root.querySelectorAll('[data-mvv-select]')];
  const keys = links.map(link => link.dataset.mvvSelect);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let played = false;
  let timer = 0;
  let frame = 0;

  const finish = (idle = false) => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    root.classList.remove('is-playing');
    root.classList.toggle('is-idle', idle && !reduced.matches);
    root.dataset.mvvState = idle && !reduced.matches ? 'idle' : 'static';
    toggle.textContent = idle && !reduced.matches ? '動きを止める' : 'もう一度再生';
  };
  const play = () => {
    played = true;
    finish();
    if (reduced.matches || document.hidden) return;
    // Separate removal and re-addition so replay starts every finite animation together.
    frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        root.classList.add('is-playing');
        root.dataset.mvvState = 'playing';
        toggle.textContent = '動きを止める';
        timer = setTimeout(() => finish(true), 6000);
      });
    });
  };
  toggle.hidden = reduced.matches;
  toggle.addEventListener('click', () => {
    if (root.classList.contains('is-playing') || root.classList.contains('is-idle')) finish();
    else play();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries[0].isIntersecting;
      root.classList.toggle('is-paused', !visible);
      if (visible && !played && !reduced.matches) play();
      else if (!visible && root.classList.contains('is-playing')) finish(true);
    }, {threshold:0.2});
    observer.observe(orbit);
  } else played = true; // Leave the readable static composition on older browsers.

  const select = key => links.forEach(link => {
    if (link.dataset.mvvSelect === key) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
  document.querySelectorAll('.mvv-tab, .studio-index a').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
      const key = link.getAttribute('href').slice(1);
      if (!keys.includes(key)) return;
      const target = document.getElementById(key);
      if (!target) return;
      event.preventDefault();
      select(key);
      if (location.hash !== `#${key}`) history.pushState(null, '', `#${key}`);
      target.focus({preventScroll:true});
      target.scrollIntoView({behavior:reduced.matches ? 'instant' : 'smooth', block:'start'});
    });
  });
  const syncHash = () => select(keys.includes(location.hash.slice(1)) ? location.hash.slice(1) : null);
  window.addEventListener('hashchange', syncHash);
  window.addEventListener('popstate', syncHash);
  window.addEventListener('pageshow', syncHash);
  window.addEventListener('pagehide', () => finish());
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  reduced.addEventListener('change', () => {
    toggle.hidden = reduced.matches;
    if (reduced.matches) { played = true; finish(); }
  });
  syncHash();
})();
