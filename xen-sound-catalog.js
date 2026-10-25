/* Each release card is the single source for the catalogue and cover slideshow. */
(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.sound-release-card')];
  const spotifyURL = value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && u.hostname === 'open.spotify.com' &&
        /^\/(album|track|playlist)\/[A-Za-z0-9]+\/?$/.test(u.pathname) ? u : null;
    } catch { return null; }
  };
  const youtubeID = value => {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:') return null;
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) :
        /^(www\.)?youtube\.com$/.test(u.hostname) ? u.searchParams.get('v') : null;
      return /^[\w-]{11}$/.test(id || '') ? id : null;
    } catch { return null; }
  };
  cards.forEach(card => {
    // A verified card URL replaces only its pending message, preserving existing players.
    ['spotify', 'youtube'].forEach(service => {
      const panel = card.querySelector(`[data-service="${service}"] .sound-accordion-panel`);
      if (!panel || panel.querySelector(':scope > :not([data-service-placeholder])')) return;
      const value = card.dataset[service + 'Url'];
      const target = service === 'spotify' ? spotifyURL(value) : youtubeID(value);
      if (!target) return;
      panel.querySelectorAll('[data-service-placeholder]').forEach(node => node.remove());
      const label = panel.closest('details').querySelector('.sound-service-label');
      if (label) label.textContent = service === 'spotify' ? 'Spotifyで聴く' : 'YouTubeで視聴';
      const iframe = document.createElement('iframe');
      iframe.src = service === 'spotify' ? `https://open.spotify.com/embed${target.pathname}` :
        `https://www.youtube-nocookie.com/embed/${target}?playsinline=1&controls=1`;
      iframe.title = `${service === 'spotify' ? 'Spotify' : 'YouTube'}：${card.querySelector('h3').textContent}`;
      iframe.loading = 'lazy'; iframe.width = '100%'; iframe.height = service === 'spotify' ? '152' : '315';
      iframe.allow = 'autoplay; encrypted-media; fullscreen; picture-in-picture';
      iframe.allowFullscreen = true; iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      iframe.className = service === 'spotify' ? 'sound-compact-player' : 'sound-direct-youtube';
      panel.append(iframe);
      const link = document.createElement('a');
      link.href = value; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = service === 'spotify' ? 'Spotifyで聴く ↗' : 'YouTubeで視聴 ↗';
      panel.append(link);
    });
  });

  const root = document.querySelector('.sound-showcase');
  const releases = cards.filter(card => card.dataset.slideshow === 'true' && card.querySelector('.sound-song-cover'));
  if (!root || !releases.length) return;
  const stage = root.querySelector('.sound-showcase-stage');
  if (!stage) return;
  const status = root.querySelector('.sound-showcase-status');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const comparing = root.hasAttribute('data-comparison');
  let timer, hovered = false, suppressClickUntil = 0;
  // Keep the existing shuffled sequence and five-second automatic cadence.
  const shuffle = (avoid, edge = 'first') => {
    const values = releases.map((_, i) => i);
    if (!comparing) for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    const index = edge === 'first' ? 0 : values.length - 1;
    if (values.length > 1 && values[index] === avoid) {
      const other = edge === 'first' ? 1 : 0;
      [values[index], values[other]] = [values[other], values[index]];
    }
    return values;
  };
  let history = shuffle(), position = 0;
  // A shuffle boundary must not ask one DOM element to occupy both side slots.
  function extend() {
    const batch = shuffle(history.at(-1));
    if (releases.length > 2 && batch[0] === history.at(-2)) {
      const j = batch.findIndex(v => v !== history.at(-1) && v !== history.at(-2));
      [batch[0], batch[j]] = [batch[j], batch[0]];
    }
    if (releases.length > 2 && batch[1] === history.at(-1)) {
      const j = batch.findIndex((v, i) => i > 1 && v !== history.at(-1));
      [batch[1], batch[j]] = [batch[j], batch[1]];
    }
    history.push(...batch);
  }
  const fragment = document.createDocumentFragment();
  const slides = releases.map(card => {
    const slide = document.createElement('a');
    slide.className = 'sound-slide'; slide.dataset.releaseId = card.id;
    slide.href = '#' + card.id;
    const art = document.createElement('div'); art.className = 'sound-slide-art';
    const img = card.querySelector('.sound-song-cover').cloneNode(true);
    img.className = ''; img.loading = 'eager'; img.draggable = false;
    art.append(img);slide.append(art);fragment.append(slide);
    return slide;
  });
  // Build completely before replacing the visible static fallback.
  stage.replaceChildren(fragment);
  function schedule() {
    clearTimeout(timer);
    if (!comparing && releases.length > 1 && !hovered && !reduced.matches && !document.hidden &&
        !root.matches(':focus-within') && !root.classList.contains('is-entering'))
      timer = setTimeout(() => move(1, false), 5000);
  }
  function render(manual = false) {
    if (position + 1 >= history.length) extend();
    const active = history[position];
    const previous = position > 0 ? history[position - 1] : history.at(releases.length - 1);
    const next = history[position + 1];
    slides.forEach((slide, i) => {
      const state = i === active ? 'active' : i === previous ? 'previous' : i === next ? 'next' : 'away';
      slide.dataset.position = state;
      slide.setAttribute('aria-hidden', String(state === 'away'));
      slide.tabIndex = state === 'away' ? -1 : 0;
      const title = releases[i].querySelector('h3').textContent;
      if (state === 'active' && slide.tagName === 'A') {
        slide.removeAttribute('role'); slide.setAttribute('aria-label', title + 'の楽曲紹介へ');
      } else {
        slide.setAttribute('role', state === 'active' ? 'group' : 'button');
        slide.setAttribute('aria-label', title + (state === 'active' ? ' — 表示中' : 'を中央に表示'));
      }
    });
    stage.dataset.activeRelease = releases[active].id;
    if (status) {
      status.setAttribute('aria-live', manual ? 'polite' : 'off');
      status.textContent = releases[active].querySelector('h3').textContent;
    }
  }
  function move(direction, manual = true) {
    root.dispatchEvent(new Event('sound:beforechange'));
    if (direction < 0 && position === 0) {
      // Reuse the visible previous jacket, then extend navigation into a new batch.
      const previous = history[releases.length - 1];
      const earlier = shuffle();
      earlier.splice(earlier.indexOf(previous), 1);earlier.push(previous);
      if (releases.length > 2 && earlier.at(-2) === history[0]) {
        const j = earlier.findIndex((v, i) => i < earlier.length - 2 && v !== history[0]);
        [earlier[j], earlier[earlier.length - 2]] = [earlier[earlier.length - 2], earlier[j]];
      }
      history.unshift(...earlier);position += earlier.length;
    }
    position += direction;
    render(manual);
    if (position > releases.length * 4) { history.splice(0, releases.length * 2);position -= releases.length * 2; }
    schedule();
  }
  function activateSide(target, event) {
    const slide = target.closest('.sound-slide');
    if (!slide || !stage.contains(slide)) return;
    if (slide.dataset.position === 'previous' || slide.dataset.position === 'next') {
      event.preventDefault();move(slide.dataset.position === 'previous' ? -1 : 1);
    }
  }
  stage.addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();move(e.key === 'ArrowLeft' ? -1 : 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      const slide = e.target.closest('.sound-slide');
      if (e.key === ' ' && slide?.dataset.position === 'active') { e.preventDefault();slide.click(); }
      else activateSide(e.target, e);
    }
  });
  let start = null;
  stage.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0) { start = null; return; }
    start = {x:e.clientX, y:e.clientY, id:e.pointerId};
  });
  // Passive tracking and pan-y preserve native page scrolling on touch screens.
  window.addEventListener('pointerup', e => {
    if (!start || e.pointerId !== start.id) return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y;start=null;
    if (Math.hypot(dx,dy)>12) suppressClickUntil=Date.now()+500;
    if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.4) {
      suppressClickUntil=Date.now()+500;move(dx<0 ? 1 : -1);
    }
  }, {passive:true});
  window.addEventListener('pointercancel', () => { start=null;suppressClickUntil=Date.now()+500; }, {passive:true});
  stage.addEventListener('click', e => {
    if (Date.now()<suppressClickUntil) { e.preventDefault();e.stopPropagation();return; }
    activateSide(e.target, e);
  });
  stage.addEventListener('dragstart', e => e.preventDefault());
  root.addEventListener('pointerenter', e => { if (e.pointerType==='mouse') { hovered=true;schedule(); } });
  root.addEventListener('pointerleave', () => { hovered=false;schedule(); });
  root.addEventListener('focusin', schedule);
  root.addEventListener('focusout', () => setTimeout(schedule, 0));
  root.addEventListener('sound:reschedule', schedule);
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', schedule);
  root.hidden=false;render();schedule();
})();
