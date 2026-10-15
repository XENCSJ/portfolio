/* One observer and timing system; no hidden loading state or scroll handlers. */
(() => {
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('.xen-menu > a').forEach((link, index) => {
    link.style.setProperty('--nav-delay', `${Math.min(index * 18, 180)}ms`);
  });
  document.querySelectorAll('.xen-tile-gallery .gallery-item').forEach(link => {
    link.dataset.galleryLabel = link.querySelector('img')?.alt || '';
  });
  if (preference.matches || !('IntersectionObserver' in window)) return;
  document.querySelectorAll('main h1 .title-en, .support-title .title-en').forEach(title => {
    const heading = title.closest('h1,h2,h3');
    heading.setAttribute('aria-label', heading.textContent.trim());
    title.setAttribute('aria-hidden', 'true');
    const fragment = document.createDocumentFragment();
    let index = 0;
    title.textContent.split(/(\s+)/).forEach(word => {
      if (/^\s+$/.test(word)) { fragment.append(document.createTextNode(word)); return; }
      const group = document.createElement('span');
      group.className = 'title-word';
      Array.from(word).forEach(character => {
        const span = document.createElement('span');
        span.className = 'title-char';
        span.textContent = character;
        span.style.setProperty('--char-delay', `${Math.min(index++ * 14, 220)}ms`);
        group.append(span);
      });
      fragment.append(group);
    });
    title.replaceChildren(fragment);
  });
  const kinds = new Map();
  const add = (selector, kind) => document.querySelectorAll(selector).forEach(node => kinds.set(node, kind));
  add('main .lead, main .pill, main .series-title, .project-group > h2, main .section-label, main .text-graphic, main .index-link, main .content > p, main .project-group > p, [data-studio-reveal], .support-message > p, .support-login, .support-cta, .support-legal', 'text');
  add('main .work, main .price-card, main .workflow-copy > div', 'card');
  add('main .gallery-item', 'image');
  add('[data-design-reveal]', 'text');
  add('main .rule, .design-project-line', 'line');
  add('main h1, .support-title', 'title');
  // Do not animate both a parent and its descendants on entry.
  const targets = [...kinds].filter(([node]) => {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (kinds.has(parent)) return false;
    }
    return true;
  });
  const observer = new IntersectionObserver(entries => {
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (preference.matches) continue;
      entry.target.style.setProperty('--xen-delay', `${Math.min(order++ * 35, 140)}ms`);
      entry.target.classList.add('xen-in-view');
    }
  }, { threshold: 0, rootMargin: '0px 0px -8px 0px' });
  targets.forEach(([node, kind]) => {
    node.dataset.xenMotion = kind;
    observer.observe(node);
  });
  preference.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    targets.forEach(([node]) => node.classList.remove('xen-in-view'));
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    observer.disconnect();
    targets.forEach(([node]) => node.classList.remove('xen-in-view'));
  });
})();
