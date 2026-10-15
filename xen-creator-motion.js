/* Page-owned choreography; shared controls and destinations are unchanged. */
(() => {
  if (!document.body.classList.contains('creator-page')) return;
  document.querySelectorAll('.xen-menu > a').forEach((link, index) => {
    link.style.setProperty('--nav-delay', `${Math.min(index * 45, 360)}ms`);
  });
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  // Keep heading text accessible while revealing its visual letters in sequence.
  document.querySelectorAll('.hero .title-en, .support-title .title-en').forEach(title => {
    const heading = title.closest('h1,h3');
    heading.setAttribute('aria-label', heading.textContent.trim());
    title.setAttribute('aria-hidden', 'true');
    const fragment = document.createDocumentFragment();
    let index = 0;
    title.textContent.split(/(\s+)/).forEach(word => {
      if (/^\s+$/.test(word)) { fragment.append(document.createTextNode(word)); return; }
      const group = document.createElement('span');
      group.className = 'creator-word';
      for (const character of word) {
        const glyph = document.createElement('span');
        glyph.className = 'creator-glyph';
        glyph.textContent = character;
        glyph.style.setProperty('--glyph-delay', `${Math.min(index++ * 65, 600)}ms`);
        group.append(glyph);
      }
      fragment.append(group);
    });
    title.replaceChildren(fragment);
  });
  const targets = new Map();
  const add = (selector, kind = 'text', delay = 0) => {
    document.querySelectorAll(selector).forEach(node => targets.set(node, {kind, delay}));
  };
  add('.hero .eyebrow', 'fade');
  add('.hero .title-en', 'title', 100);
  add('.hero .page-title-ja', 'text', 200);
  add('.profile-portrait .gallery-item', 'image', 300);
  add('.creator-identity h2', 'text');
  add('.creator-identity p', 'text', 120);
  add('.project-group > h2');
  add('.creator-copy', 'text', 100);
  document.querySelectorAll('.creator-fields li').forEach((node, index) => {
    targets.set(node, {kind: 'text', delay: Math.min(index * 100, 300)});
  });
  document.querySelectorAll('.project-group .image-gallery').forEach(gallery => {
    gallery.querySelectorAll('.gallery-item').forEach((node, index) => {
      targets.set(node, {kind: 'image', delay: Math.min(index * 100, 200)});
    });
  });
  add('.support-title .title-en', 'title');
  add('.support-title .page-title-ja', 'text', 100);
  add('.support-message p', 'text', 200);
  add('.support-login-title', 'text');
  document.querySelectorAll('.support-providers > li').forEach((node, index) => {
    targets.set(node, {kind: 'text', delay: 100 + index * 100});
  });
  add('.support-destination', 'fade', 100);
  add('.support-cta', 'fade');
  add('.support-legal', 'fade', 100);
  add('.support-shell', 'surface');
  add('.xen-back-top', 'text');
  document.querySelectorAll('footer .shared-social a').forEach((node, index) => {
    targets.set(node, {kind: 'text', delay: index * 100});
  });
  add('.footer-text', 'fade', 100);
  add('.xen-powered', 'fade', 200);
  // The shared viewer still owns opening, closing and navigation. Animate only
  // the loaded image; never delay a button, alter its link, or intercept a click.
  const viewer = document.getElementById('image-viewer');
  let viewerImageAnimation;
  const viewerImage = viewer?.querySelector('img');
  viewerImage?.addEventListener('load', () => {
    if (preference.matches || !viewer.open || !viewerImage.animate) return;
    viewerImageAnimation?.cancel();
    viewerImageAnimation = viewerImage.animate(
      [{opacity: .2, transform: 'scale(.985)'}, {opacity: 1, transform: 'scale(1)'}],
      {duration: 500, easing: 'cubic-bezier(.22,.68,0,1)'});
  });
  viewer?.addEventListener('close', () => viewerImageAnimation?.cancel());
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (!preference.matches) entry.target.classList.add('creator-in-view');
    }
  }, {threshold: 0, rootMargin: '0px 0px -12px 0px'});
  targets.forEach(({kind, delay}, node) => {
    node.dataset.creatorMotion = kind;
    node.style.setProperty('--creator-delay', `${delay}ms`);
    observer.observe(node);
  });
  const stop = () => {
    observer.disconnect();
    viewerImageAnimation?.cancel();
    targets.forEach((_, node) => node.classList.remove('creator-in-view'));
  };
  preference.addEventListener('change', event => { if (event.matches) stop(); });
  window.addEventListener('pageshow', event => { if (event.persisted) stop(); });
})();
