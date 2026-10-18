/* Read the existing formal prose from HTML; no rewritten or abbreviated MVV copy. */
(() => {
  const root = document.querySelector('.studio-mvv-experience');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[data-mvv-select]')];
  const panels = [...root.querySelectorAll('[data-mvv-panel]')];
  const tablist = root.querySelector('.mvv-tabs');
  const wrapper = root.querySelector('.mvv-panels');
  const toggle = root.querySelector('.mvv-auto');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer = 0, visible = true, automatic = !reduced.matches, fade;
  const durations = [10000, 10000, 22000];
  const measure = () => { wrapper.style.height = `${panels[index].getBoundingClientRect().height}px`; };
  const schedule = () => {
    clearTimeout(timer);
    const running = automatic && visible && !document.hidden && !reduced.matches;
    root.classList.toggle('is-running', running);
    toggle.textContent = automatic ? '自動切替を停止' : '自動切替を再開';
    if (running) timer = setTimeout(() => select((index + 1) % tabs.length), durations[index]);
  };
  const select = (next, manual = false) => {
    if (manual) automatic = false;
    fade?.cancel();
    index = next;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    measure();
    if (!reduced.matches && panels[index].animate) {
      fade = panels[index].animate([{opacity:0}, {opacity:1}], {duration:420, easing:'ease-out'});
    }
    schedule();
  };
  tablist.hidden = false;
  tablist.setAttribute('role', 'tablist');
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].setAttribute('aria-labelledby', tab.id);
    panels[i].tabIndex = 0;
    tab.addEventListener('click', () => select(i, true));
    tab.addEventListener('keydown', event => {
      const next = {ArrowRight:(i+1)%3, ArrowDown:(i+1)%3, ArrowLeft:(i+2)%3, ArrowUp:(i+2)%3, Home:0, End:2}[event.key];
      if (next === undefined) return;
      event.preventDefault(); select(next, true); tabs[next].focus();
    });
  });
  toggle.hidden = reduced.matches;
  toggle.addEventListener('click', () => { automatic = !automatic; schedule(); });
  root.addEventListener('focusin', event => {
    if (event.target !== toggle) { automatic = false; schedule(); }
  });
  root.classList.add('is-enhanced');
  select(0);
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(wrapper);
  window.addEventListener('resize', measure, {passive:true});
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting; schedule();
  }, {threshold:0}).observe(root);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => {
    automatic = !reduced.matches;
    toggle.hidden = reduced.matches;
    if (reduced.matches) fade?.cancel();
    schedule();
  });
  window.addEventListener('pagehide', () => { clearTimeout(timer); fade?.cancel(); });
  window.addEventListener('pageshow', () => { measure(); schedule(); });
})();
