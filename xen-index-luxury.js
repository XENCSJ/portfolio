/* Progressive enhancement for the existing INDEX artwork. No frame loop,
   image replacement, navigation changes or new layout-sized elements. */
(() => {
  'use strict';
  const body = document.querySelector('body.home-page');
  const wheel = body?.querySelector('.wheel');
  const orbit = wheel?.querySelector('svg.orbit');
  if (!orbit || wheel.querySelector('.xen-luxury-rings')) return;
  const ns = 'http://www.w3.org/2000/svg';
  const makeSVG = (tag, attributes = {}) => {
    const node = document.createElementNS(ns, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    return node;
  };
  const decorative = { 'aria-hidden': 'true', focusable: 'false' };
  const ambient = document.createElement('span');
  ambient.className = 'xen-luxury-ambient';
  ambient.setAttribute('aria-hidden', 'true');
  const rings = makeSVG('svg', { ...decorative, class: 'xen-luxury-rings', viewBox: '0 0 600 600' });
  rings.append(
    makeSVG('circle', { class: 'luxury-ring-inner', cx: 300, cy: 300, r: 220 }),
    makeSVG('circle', { class: 'luxury-ring-outer', cx: 300, cy: 300, r: 226, pathLength: 100, 'stroke-dasharray': '32 .7 4 .7 25 .7 3 .7 32.5' })
  );
  wheel.prepend(ambient, rings);

  // Feathered 24-degree sector: a letter passes through in about 1.5s.
  // SVG alpha masking keeps exactly the same glyph shapes and path positions.
  const defs = orbit.querySelector('defs');
  const gradient = makeSVG('linearGradient', { id: 'xen-luxury-feather', gradientUnits: 'userSpaceOnUse', x1: 0, y1: 235, x2: 0, y2: 365 });
  [[0, 0], [.24, .2], [.45, 1], [.55, 1], [.76, .2], [1, 0]].forEach(([offset, opacity]) => {
    gradient.append(makeSVG('stop', { offset, 'stop-color': '#fff', 'stop-opacity': opacity }));
  });
  const mask = makeSVG('mask', { id: 'xen-luxury-sector-mask', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 600, height: 600, 'mask-type': 'alpha' });
  const sector = makeSVG('g', { class: 'xen-luxury-sector' });
  sector.append(makeSVG('path', { d: 'M300 300 L600 235 L600 365 Z', fill: 'url(#xen-luxury-feather)' }));
  mask.append(sector);
  defs.append(gradient, mask);
  const reflection = makeSVG('g', { ...decorative, class: 'xen-luxury-reflection', mask: 'url(#xen-luxury-sector-mask)' });
  reflection.append(makeSVG('circle', { class: 'xen-luxury-orbit-line', cx: 300, cy: 300, r: 285 }));
  const pairs = [...orbit.querySelectorAll('a text')].map(source => {
    const copy = source.cloneNode(true);
    copy.removeAttribute('id');
    reflection.append(copy);
    return { source, copy };
  });
  orbit.append(reflection);

  const logoPairs = [];
  for (const img of body.querySelectorAll('.logo-final > img.center-logo')) {
    const surface = document.createElement('span');
    surface.className = 'xen-luxury-logo';
    surface.setAttribute('aria-hidden', 'true');
    const light = document.createElement('span');
    light.className = 'xen-luxury-logo-light';
    surface.append(light);
    img.after(surface);
    logoPairs.push({ img, surface });
  }
  const syncGeometry = () => {
    // The existing assembly script owns spacing and responsive font sizing.
    // Mirror its results without touching a single source text node.
    for (const { source, copy } of pairs) {
      const offset = source.querySelector('textPath').getAttribute('startOffset');
      copy.querySelector('textPath').setAttribute('startOffset', offset);
      copy.style.fontSize = source.style.fontSize;
    }
    for (const { img, surface } of logoPairs) {
      surface.style.setProperty('--luxury-logo-image', `url("${img.currentSrc || img.src}")`);
      const rect = img.getBoundingClientRect();
      surface.style.setProperty('--luxury-logo-width', `${rect.width}px`);
      surface.style.setProperty('--luxury-logo-height', `${rect.height}px`);
    }
    const duration = parseFloat(getComputedStyle(orbit).animationDuration);
    if (duration > 22) {
      sector.style.setProperty('--luxury-relative-period', `${1 / (1 / 22 - 1 / duration)}s`);
    }
  };
  syncGeometry();
  document.fonts?.ready.then(syncGeometry);
  // One coalesced frame only after layout changes; never an animation loop.
  let resizeFrame = 0;
  const scheduleSync = () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(syncGeometry);
  };
  window.addEventListener('resize', scheduleSync, { passive: true });
  const observer = new ResizeObserver(scheduleSync);
  observer.observe(wheel);
  logoPairs.forEach(({ img }) => {
    observer.observe(img);
    img.addEventListener('load', scheduleSync, { once: true });
  });
  const visibility = () => body.classList.toggle('xen-luxury-paused', document.hidden);
  document.addEventListener('visibilitychange', visibility);
  visibility();
})();
