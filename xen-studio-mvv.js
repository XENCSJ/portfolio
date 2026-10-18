/* Tap-only enhancement. Native anchors and every formal MVV paragraph work without JS. */
(() => {
  const root = document.querySelector('.studio-mvv-experience');
  if (!root) return;
  const links = [...root.querySelectorAll('[data-mvv-select]')];
  const arcs = [...root.querySelectorAll('[data-mvv-arc]')];
  const keys = links.map(link => link.dataset.mvvSelect);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pending = 0;
  let destination = null;

  const select = key => {
    links.forEach(link => {
      if (link.dataset.mvvSelect === key) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    arcs.forEach(arc => arc.classList.toggle('is-active', arc.dataset.mvvArc === key));
  };
  const cancel = () => {
    clearTimeout(pending);
    pending = 0;
    destination = null;
  };
  const navigate = () => {
    const target = destination;
    cancel();
    if (!target) return;
    const hash = `#${target.id}`;
    if (location.hash !== hash) history.pushState(null, '', hash);
    target.focus({preventScroll: true});
    target.scrollIntoView({behavior: reduced.matches ? 'instant' : 'smooth', block: 'start'});
  };

  // Include the page index, using the same canonical anchors as the orbit.
  document.querySelectorAll('.mvv-tab, .studio-index a').forEach(link => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
      cancel();
      const key = link.getAttribute('href').slice(1);
      if (!keys.includes(key)) return;
      const target = document.getElementById(key);
      if (!target) return;
      event.preventDefault();
      select(key);
      destination = target;
      // Let the selected label and its fixed arc respond before leaving the orbit.
      if (reduced.matches || !root.contains(link)) navigate();
      else pending = setTimeout(navigate, 420);
    });
  });
  // Back/forward and direct MVV URLs stay in sync, with no automatic selection on load.
  const syncHash = () => {
    cancel();
    const key = location.hash.slice(1);
    select(keys.includes(key) ? key : null);
  };
  window.addEventListener('hashchange', syncHash);
  window.addEventListener('popstate', syncHash);
  window.addEventListener('pagehide', cancel);
  window.addEventListener('pageshow', syncHash);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
  reduced.addEventListener('change', () => { if (reduced.matches && destination) navigate(); });
  syncHash();
})();
