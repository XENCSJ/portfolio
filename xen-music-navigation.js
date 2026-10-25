/* The release-card DOM is the source of titles, jackets, artists and ordering. */
(() => {
  'use strict';
  const nav = document.querySelector('.sound-category-nav.music-index');
  if (!nav) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = [];
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve));
  let journey = 0, highlightTimer, viewportWidth = innerWidth;
  const arrow = '<svg class="music-index-arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12h15m-6-6 6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  nav.querySelectorAll('.sound-category-drawer').forEach(details => {
    const summary = details.querySelector(':scope > summary');
    const panel = details.querySelector(':scope > .sound-category-links');
    const section = document.getElementById(details.dataset.genreSection);
    if (!summary || !panel || !section) return;
    const rows = [...section.querySelectorAll('.sound-release-card')].map(card => {
      const cover = card.querySelector('.sound-song-cover');
      const title = card.querySelector('.sound-song-title');
      if (!card.id || !cover || !title) return null;
      const link = document.createElement('a');
      link.className = 'music-index-link'; link.href = '#' + card.id; link.dataset.releaseId = card.id;
      const image = cover.cloneNode(false);
      image.className = 'music-index-cover'; image.alt = ''; image.width = image.height = 88;
      image.loading = 'lazy';
      const meta = document.createElement('span'); meta.className = 'music-index-meta';
      const name = document.createElement('span'); name.className = 'music-index-title'; name.textContent = title.textContent;
      const artist = document.createElement('span'); artist.className = 'music-index-artist'; artist.textContent = card.querySelector('.sound-artist')?.textContent || '';
      meta.append(name, artist); link.append(image, meta); link.insertAdjacentHTML('beforeend', arrow);
      return link;
    }).filter(Boolean);
    if (rows.length) panel.replaceChildren(...rows);
    // Native exclusive details is the no-JS fallback; animated state is managed here.
    details.removeAttribute('name'); details.open = false;
    let expanded = false, animations = [], pending = Promise.resolve();
    const finish = () => {
      details.open = expanded; details.style.overflow = ''; animations = [];
    };
    const settle = () => { animations.forEach(a => a.cancel()); finish(); };
    const sync = () => {
      details.dataset.expanded = String(expanded);
      summary.setAttribute('aria-expanded', String(expanded));
      panel.inert = !expanded; panel.setAttribute('aria-hidden', String(!expanded));
    };
    const set = value => {
      if (value === expanded) return pending;
      const startHeight = details.getBoundingClientRect().height;
      const startOpacity = details.open ? Number(getComputedStyle(panel).opacity) : 0;
      animations.forEach(a => a.cancel()); expanded = value; sync();
      if (reduced.matches || !details.animate) { finish(); return Promise.resolve(); }
      details.open = true; details.style.overflow = 'hidden';
      const endHeight = summary.getBoundingClientRect().height + (expanded ? panel.getBoundingClientRect().height : 0) + 1;
      animations = [
        details.animate({height:[startHeight + 'px',endHeight + 'px']},{duration:350,easing:'ease-in-out'}),
        panel.animate({opacity:[startOpacity,expanded ? 1 : 0]},{duration:350,easing:'ease-in-out'})
      ];
      const current = animations;
      pending = Promise.allSettled(current.map(a => a.finished)).then(() => { if (animations === current) finish(); });
      return pending;
    };
    sync();
    const control = {details, set, settle, pending:() => pending}; controllers.push(control);
    summary.addEventListener('click', event => {
      event.preventDefault();
      const opening = !expanded;
      if (opening) controllers.forEach(other => { if (other !== control) other.set(false); });
      set(opening);
    });
  });

  function headerGap() {
    const header = document.getElementById('xen-site-header');
    return (header?.getBoundingClientRect().height || 0) + 24;
  }
  // Layout offsets are independent of the existing reveal transforms.
  function layoutTop(node) {
    let top = 0;
    for (let current = node; current; current = current.offsetParent) top += current.offsetTop;
    return top;
  }
  function destination(card) {
    const frame = card.querySelector('.sound-cover-frame') || card;
    return Math.max(0, Math.min(layoutTop(frame) - headerGap(), document.documentElement.scrollHeight - innerHeight));
  }
  function cardForHash(hash) {
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return null; }
    const card = document.getElementById(id);
    return card?.matches('.sound-release-card') ? card : null;
  }
  async function navigate(card, updateHash, focus = true) {
    const token = ++journey;
    clearTimeout(highlightTimer);
    document.querySelectorAll('.music-navigation-highlight').forEach(el => el.classList.remove('music-navigation-highlight'));
    const ancestors = [];
    for (let parent = card.parentElement; parent; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS' && !parent.open) { parent.open = true; ancestors.push(parent); }
    }
    await Promise.all(controllers.map(c => c.pending()));
    await Promise.allSettled(ancestors.flatMap(el => el.getAnimations().map(a => a.finished)));
    await nextFrame(); await nextFrame();
    if (token !== journey) return;
    if (updateHash && location.hash !== '#' + card.id) history.pushState(null, '', '#' + card.id);
    const top = destination(card);
    window.scrollTo({top,behavior:reduced.matches ? 'instant' : 'smooth'});
    const started = performance.now(); let stable = 0;
    while (token === journey && performance.now() - started < 3000) {
      await nextFrame();
      stable = Math.abs(window.scrollY - destination(card)) < 3 ? stable + 1 : 0;
      if (stable >= 4) break;
    }
    if (token !== journey) return;
    // Correct a late layout shift after image/font loading, without a second smooth journey.
    if (Math.abs(window.scrollY - destination(card)) >= 3) window.scrollTo({top:destination(card),behavior:'instant'});
    if (focus) {
      card.dataset.musicNavigationTarget = ''; card.tabIndex = -1; card.focus({preventScroll:true});
    }
    const frame = card.querySelector('.sound-cover-frame');
    if (frame) {
      frame.classList.add('music-navigation-highlight');
      highlightTimer = setTimeout(() => frame.classList.remove('music-navigation-highlight'),500);
    }
  }
  function selectRelease(event) {
    if (event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('.music-index-link, .sound-slide[data-position="active"]');
    if (!link) return;
    const card = cardForHash('#' + link.dataset.releaseId);
    if (!card) return;
    event.preventDefault(); navigate(card,true);
  }
  nav.addEventListener('click', selectRelease);
  document.querySelector('.sound-showcase-stage')?.addEventListener('click', selectRelease);
  const cancelJourney = () => { journey++; };
  window.addEventListener('wheel',cancelJourney,{passive:true});
  window.addEventListener('touchstart',cancelJourney,{passive:true});
  window.addEventListener('keydown',event => { if (!event.defaultPrevented && ['ArrowUp','ArrowDown','PageUp','PageDown','Home','End','Escape','Tab',' '].includes(event.key)) cancelJourney(); });
  // iOS Safari may resize only the height when its address bar collapses during a scroll.
  window.addEventListener('resize',() => {
    if (innerWidth === viewportWidth) return;
    viewportWidth = innerWidth; cancelJourney(); controllers.forEach(c => c.settle());
  });
  reduced.addEventListener('change',() => { cancelJourney(); controllers.forEach(c => c.settle()); });
  // Native hash changes/back-forward keep the same header-aware destination.
  window.addEventListener('hashchange',() => { const card=cardForHash(location.hash); if(card) navigate(card,false,false); });
  window.addEventListener('load',() => { const card=cardForHash(location.hash); if(card) navigate(card,false,false); },{once:true});
  nav.dataset.musicNavigationReady = 'true';
})();
