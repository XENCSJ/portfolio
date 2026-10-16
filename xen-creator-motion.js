/* Progressive enhancement for CREATOR only. All copy and links exist in HTML. */
(() => {
  const root = document.querySelector('body.creator-page');
  if (!root) return;
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  const map = root.querySelector('.cp-field-map');
  const panel = root.querySelector('#field-selection');
  const controls = Array.from(root.querySelectorAll('.cp-field'));
  const entries = Array.from(root.querySelectorAll('[data-field-entry]'));
  let panelAnimation;
  let selected;
  const select = (key, animate = true) => {
    const entry = entries.find(item => item.dataset.fieldEntry === key);
    if (!entry || key === selected) return;
    selected = key;
    controls.forEach(control => control.setAttribute('aria-pressed', String(control.dataset.field === key)));
    entries.forEach(item => item.classList.toggle('is-active', item === entry));
    root.querySelectorAll('[data-line]').forEach(line => line.classList.toggle('is-active', line.dataset.line === key));
    const count = document.createElement('p');
    count.className = 'cp-selection-count';
    count.textContent = `${String(entries.indexOf(entry) + 1).padStart(2, '0')} / 10`;
    const content = document.createElement('div');
    content.append(entry.querySelector('h3').cloneNode(true), entry.querySelector('p').cloneNode(true), entry.querySelector('.cp-work-links').cloneNode(true));
    panelAnimation?.cancel();
    panel.replaceChildren(count, content);
    panel.hidden = false;
    if (animate && !preference.matches && content.animate) {
      panelAnimation = content.animate([{opacity:.45, translate:'0 3px'}, {opacity:1, translate:'0 0'}], {duration:240, easing:'ease-out'});
    }
  };
  if (map && panel && controls.length === 10 && entries.length === 10) {
    controls.forEach((control,index) => {
      control.setAttribute('role','button');
      control.setAttribute('aria-controls','field-selection');
      control.setAttribute('aria-pressed','false');
      control.addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        // Never let an entrance animation delay an intentional tap.
        map.getAnimations({subtree:true}).forEach(animation => animation.finish());
        select(control.dataset.field);
      });
      control.addEventListener('keydown', event => {
        if (event.key === ' ') { event.preventDefault(); control.click(); return; }
        const next = {ArrowRight:(index+1)%10, ArrowDown:(index+1)%10, ArrowLeft:(index+9)%10, ArrowUp:(index+9)%10, Home:0, End:9}[event.key];
        if (next === undefined) return;
        event.preventDefault();
        controls[next].focus();
        controls[next].click();
      });
    });
    select('visual',false);
  }
  // Default styles never hide content. Observers apply a single entrance only.
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const targets = Array.from(root.querySelectorAll('[data-cp-reveal]'));
  const observer = new IntersectionObserver(events => {
    events.forEach(event => {
      if (!event.isIntersecting) return;
      observer.unobserve(event.target);
      if (!preference.matches) event.target.classList.add('cp-revealed');
    });
  }, {threshold:.08});
  targets.forEach(target => observer.observe(target));
  const mapObserver = new IntersectionObserver(events => {
    events.forEach(event => {
      if (!event.isIntersecting) return;
      mapObserver.unobserve(event.target);
      if (!preference.matches) event.target.classList.add('cp-map-entered');
    });
  }, {threshold:.2});
  if (map) mapObserver.observe(map);
  const stop = () => {
    observer.disconnect(); mapObserver.disconnect(); panelAnimation?.cancel();
    targets.forEach(target => target.classList.remove('cp-revealed'));
    map?.classList.remove('cp-map-entered');
  };
  preference.addEventListener('change', event => { if (event.matches) stop(); });
  window.addEventListener('pageshow', event => { if (event.persisted) stop(); });
})();
