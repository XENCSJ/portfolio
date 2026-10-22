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
    // Registering a URL on the card is sufficient; empty disclosures stay empty.
    ['spotify', 'youtube'].forEach(service => {
      const panel = card.querySelector(`[data-service="${service}"] .sound-accordion-panel`);
      if (!panel || panel.children.length) return;
      const value = card.dataset[service + 'Url'];
      const target = service === 'spotify' ? spotifyURL(value) : youtubeID(value);
      if (!target) return;
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
  const indicators = root.querySelector('.sound-slide-dots');
  const pause = root.querySelector('.sound-slide-pause');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timer, paused = false, hovered = false, suppressClickUntil = 0;
  const shuffle = (avoid, edge = 'first') => {
    const values = releases.map((_, i) => i);
    for (let i = values.length - 1; i > 0; i--) {
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
  const slides = releases.map((card, i) => {
    const url = spotifyURL(card.dataset.spotifyUrl);
    const slide = document.createElement(url ? 'a' : 'div');
    slide.className = 'sound-slide'; slide.dataset.releaseId = card.id;
    if (url) { slide.href = url.href; slide.target = '_blank'; slide.rel = 'noopener noreferrer'; }
    const img = card.querySelector('.sound-song-cover').cloneNode(true);
    img.className = ''; img.loading = 'eager';
    slide.append(img);stage.append(slide);
    const dot = document.createElement('button');dot.type = 'button';
    dot.setAttribute('aria-label', card.querySelector('h3').textContent + 'を表示');
    dot.addEventListener('click', () => {
      let next = history.indexOf(i, position);
      if (next < 0) { history.push(...shuffle(history.at(-1))); next = history.indexOf(i, position); }
      position = next;render();schedule();
    });
    indicators.append(dot);
    return {slide, dot};
  });
  const syncPause = () => {
    pause.textContent = paused || reduced.matches ? '▷' : 'Ⅱ';
    pause.setAttribute('aria-label', paused || reduced.matches ? 'スライドショーを再生' : 'スライドショーを一時停止');
    pause.disabled = reduced.matches;
  };
  function schedule() {
    clearTimeout(timer);
    if (releases.length > 1 && !paused && !hovered && !reduced.matches && !document.hidden && !root.matches(':focus-within'))
      timer = setTimeout(() => move(1), 5000);
  }
  function render() {
    if (position + 1 >= history.length) history.push(...shuffle(history.at(-1)));
    const active = history[position];
    const previous = position > 0 ? history[position - 1] : history.at(releases.length - 1);
    const next = history[position + 1];
    slides.forEach(({slide, dot}, i) => {
      const state = i === active ? 'active' : i === previous ? 'previous' : i === next ? 'next' : 'away';
      slide.dataset.position = state;slide.setAttribute('aria-hidden', String(i !== active));
      if (slide.tagName === 'A') slide.tabIndex = i === active ? 0 : -1;
      dot.setAttribute('aria-current', String(i === active));
    });
    stage.dataset.activeRelease = releases[active].id;
  }
  function move(direction) {
    if (direction < 0 && position === 0) {
      const earlier = shuffle(history[0], 'last');history.unshift(...earlier);position += earlier.length;
    }
    position += direction;
    render();
    // Bound history while preserving previous navigation and the current shuffle.
    if (position > releases.length * 4) { history.splice(0, releases.length * 2);position -= releases.length * 2; }
    schedule();
  }
  root.querySelector('.sound-slide-prev').addEventListener('click', () => move(-1));
  root.querySelector('.sound-slide-next').addEventListener('click', () => move(1));
  pause.addEventListener('click', () => { paused = !paused;syncPause();schedule(); });
  stage.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault();move(e.key === 'ArrowLeft' ? -1 : 1); }
  });
  let start = null;
  stage.addEventListener('pointerdown', e => { start = {x:e.clientX, y:e.clientY}; });
  stage.addEventListener('pointerup', e => {
    if (!start) return;
    const dx=e.clientX-start.x, dy=e.clientY-start.y;start=null;
    if (Math.abs(dx)>40 && Math.abs(dx)>Math.abs(dy)*1.4) { suppressClickUntil=Date.now()+500;move(dx<0 ? 1 : -1); }
  });
  stage.addEventListener('pointercancel', () => { start=null; });
  stage.addEventListener('click', e => { if (Date.now()<suppressClickUntil) { e.preventDefault();e.stopPropagation(); } }, true);
  root.addEventListener('pointerenter', e => { if (e.pointerType==='mouse') { hovered=true;schedule(); } });
  root.addEventListener('pointerleave', () => { hovered=false;schedule(); });
  root.addEventListener('focusin', schedule);
  root.addEventListener('focusout', () => setTimeout(schedule, 0));
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { syncPause();schedule(); });
  root.hidden=false;render();syncPause();schedule();
})();
