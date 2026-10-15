/* CREATOR v2 timing, explicitly opted in by the other thirteen detail pages.
   Navigation, gallery controls, playback and pricing stay in the existing scripts. */
(() => {
  if (!document.body.classList.contains('xen-detail-unified') ||
      document.body.classList.contains('home-page')) return;
  document.querySelectorAll('.xen-menu > a').forEach((link, index) => {
    link.style.setProperty('--nav-delay', `${Math.min(index * 45, 360)}ms`);
  });
  document.querySelectorAll('.xen-tile-gallery .gallery-item').forEach(link => {
    link.dataset.galleryLabel = link.querySelector('img')?.alt || '';
  });
  const actions = document.querySelectorAll('.contact-actions a, .text-link, .video-source, .xen-spotify-link, .design-category-nav a, .xen-back-top');
  actions.forEach(link => {
    link.classList.add('detail-action');
    const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) if (/[↗→↑]/.test(walker.currentNode.data)) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const fragment = document.createDocumentFragment();
      node.data.split(/([↗→↑])/).forEach(part => {
        if (!/[↗→↑]/.test(part)) { fragment.append(document.createTextNode(part)); return; }
        const arrow = document.createElement('span');
        arrow.className = 'detail-arrow'; arrow.textContent = part;
        fragment.append(arrow);
      });
      node.replaceWith(fragment);
    });
  });
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  document.querySelectorAll('.hero .title-en').forEach(title => {
    const heading = title.closest('h1');
    heading.setAttribute('aria-label', heading.textContent.trim());
    title.setAttribute('aria-hidden', 'true');
    const fragment = document.createDocumentFragment();
    let index = 0;
    title.textContent.split(/(\s+)/).forEach(word => {
      if (/^\s+$/.test(word)) { fragment.append(document.createTextNode(word)); return; }
      const group = document.createElement('span'); group.className = 'detail-word';
      for (const character of word) {
        const glyph = document.createElement('span');
        glyph.className = 'detail-glyph'; glyph.textContent = character;
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
  const sequence = (groups, selector, kind = 'text') => {
    document.querySelectorAll(groups).forEach(group => {
      group.querySelectorAll(selector).forEach((node, index) => {
        targets.set(node, {kind, delay: Math.min(index * 100, 300)});
      });
    });
  };
  add('.hero .eyebrow', 'fade');
  add('.hero .title-en', 'title', 100);
  add('.hero .page-title-ja', 'text', 200);
  add('.hero .lead', 'text', 300);
  add('main .rule, .design-project-line', 'line');
  add('main .pill, main .series-title, .project-group > h2, main .section-label');
  add('main .content > p, main .project-group > p, main .note, main .sub, main .space-caption, .design-view-hint', 'text', 100);
  sequence('.grid, .xen-streaming-grid, .price-cards', '.work, .price-card', 'card');
  sequence('.image-gallery, .design-visuals', '.gallery-item', 'image');
  add('[data-studio-reveal]');
  sequence('.studio-workflow, .studio-brief, .studio-principles, .studio-faq', ':scope > li, :scope > div');
  // Separate section headings from their translations; surfaces animate lines only.
  add('.studio-heading, .sns-section-heading', 'surface');
  add('.studio-heading > span, .sns-section-heading > .sns-kicker', 'fade');
  add('.studio-heading > small, .sns-section-heading > h2', 'text', 100);
  add('.design-index', 'fade');
  add('.design-project-heading > h2', 'text', 80);
  add('.design-subtitle', 'text', 180);
  add('.design-description > p, .design-description > h3, .design-description > h4', 'text', 100);
  sequence('.sns-metrics', '.sns-metric', 'card');
  sequence('.sns-process-list, .sns-service-list, .sns-strength-list, .sns-fit-list', ':scope > li');
  add('.sns-body, .sns-statement > .sns-kicker');
  add('.sns-statement > h2', 'text', 100);
  add('.sns-statement-copy', 'text', 200);
  add('.sns-fit', 'surface');
  add('.detail-action', 'text', 100);
  add('.table-scroll > table', 'fade');
  add('#contact', 'fade');
  sequence('footer .shared-social', 'a');
  add('.footer-text', 'fade', 100);
  add('.xen-powered', 'fade', 200);
  // Moving a whole card and its child separately creates an unwanted double rise.
  for (const [node] of targets) {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (targets.has(parent) && targets.get(parent).kind !== 'surface') {
        targets.delete(node); break;
      }
    }
  }
  document.querySelectorAll('.studio-workflow > li, .studio-brief > li, .studio-principles > div, .studio-faq > div, .sns-process-list > li, .sns-service-list > li, .sns-strength-list > li, .sns-fit-list > li').forEach(node => node.classList.add('detail-list-line'));
  for (const [node, {kind}] of targets) if (kind === 'image') {
    const frame = document.createElement('span'); frame.className = 'detail-frame';
    frame.setAttribute('aria-hidden', 'true'); node.append(frame);
  }
  const viewer = document.getElementById('image-viewer');
  const viewerImage = viewer?.querySelector('img');
  let viewerImageAnimation;
  viewerImage?.addEventListener('load', () => {
    // Enhanced galleries already fade via xen-shared.js; do not animate twice.
    if (preference.matches || !viewer.open || viewer.classList.contains('is-fullscreen-gallery') || !viewerImage.animate) return;
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
      if (!preference.matches) entry.target.classList.add('detail-in-view');
    }
  }, {threshold: 0, rootMargin: '0px 0px -12px 0px'});
  for (const [node, {kind, delay}] of targets) {
    node.dataset.detailMotion = kind;
    node.style.setProperty('--detail-delay', `${delay}ms`);
    observer.observe(node);
  }
  const stop = () => {
    observer.disconnect(); viewerImageAnimation?.cancel();
    targets.forEach((_, node) => node.classList.remove('detail-in-view'));
  };
  preference.addEventListener('change', event => { if (event.matches) stop(); });
  window.addEventListener('pageshow', event => { if (event.persisted) stop(); });
})();
