/* MVV owns its entry and disclosure state; shared page motion is untouched. */
(() => {
  'use strict';
  const root = document.querySelector('#studio-mvv[data-mvv-pyramid]');
  if (!root) return;
  const scene = root.querySelector('.mvv-pyramid');
  const drawer = root.querySelector('.mvv-detail');
  const buttons = [...root.querySelectorAll('.mvv-layer')];
  const panels = [...root.querySelectorAll('.mvv-detail-panel')];
  if (buttons.length !== 3 || panels.length !== 3 || !scene || !drawer) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let selected = null, animation = null, finishTimer = 0, played = false;

  function finish() {
    clearTimeout(finishTimer);
    root.dataset.mvvState = 'complete';
  }
  function play() {
    if (played) return;
    played = true;
    if (reduced.matches || document.hidden) { finish(); return; }
    root.dataset.mvvState = 'assembling';
    finishTimer = setTimeout(finish, 2600);
  }
  function settleDrawer() {
    if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
    drawer.hidden = selected === null;
  }
  function select(key) {
    const height = drawer.hidden ? 0 : drawer.getBoundingClientRect().height;
    selected = selected === key ? null : key;
    settleDrawer();
    buttons.forEach(button => button.setAttribute('aria-expanded', String(button.dataset.mvvSelect === selected)));
    panels.forEach(panel => { panel.hidden = panel.id !== selected; });
    if (!selected || reduced.matches || !drawer.animate) return;
    const end = drawer.getBoundingClientRect().height;
    animation = drawer.animate([
      {height:height + 'px', opacity:.25, transform:'translateY(-6px)'},
      {height:end + 'px', opacity:1, transform:'translateY(0)'}
    ], {duration:320, easing:'cubic-bezier(.2,.7,.3,1)', fill:'both'});
    animation.onfinish = settleDrawer;
  }
  buttons.forEach((button,index) => {
    button.disabled = false;
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click', () => { if (!played) play(); select(button.dataset.mvvSelect); });
    button.addEventListener('keydown', event => {
      const offsets = {ArrowDown:1, ArrowRight:1, ArrowUp:-1, ArrowLeft:-1};
      if (event.key in offsets) { event.preventDefault(); buttons[(index + offsets[event.key] + 3) % 3].focus(); }
      else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); buttons[event.key === 'Home' ? 0 : 2].focus(); }
      // Enter / Space use native button activation.
    });
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && selected) {
      const button = buttons.find(item => item.dataset.mvvSelect === selected);
      select(selected); button.focus();
    }
  });
  panels.forEach(panel => { panel.hidden = true; });
  drawer.hidden = true;
  root.dataset.mvvState = 'complete';

  if ('IntersectionObserver' in window && !reduced.matches) {
    try {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          root.dataset.mvvVisible = String(entry.isIntersecting);
          if (entry.isIntersecting) play();
          else if (played) finish();
        }
      }, {threshold:.15});
      observer.observe(scene);
      root.dataset.mvvState = 'waiting';
    } catch (_) { played = true; finish(); }
  } else { played = true; finish(); }

  // Existing #mission / #vision / #values links remain meaningful.
  function followHash() {
    const target = document.getElementById(location.hash.slice(1));
    const key = target?.closest('.mvv-detail-panel')?.id;
    if (!key) return;
    if (selected !== key) select(key);
    played = true; finish();
    requestAnimationFrame(() => target.scrollIntoView({block:'start'}));
  }
  addEventListener('hashchange',followHash);
  addEventListener('resize',settleDrawer,{passive:true});
  addEventListener('pagehide',() => { if (played) finish(); settleDrawer(); });
  document.addEventListener('visibilitychange',() => { if (document.hidden && played) finish(); });
  reduced.addEventListener('change',() => { if (reduced.matches) { played = true; finish(); } settleDrawer(); });
  followHash();
})();
