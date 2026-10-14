/* Progressive one-shot motion: content is never hidden waiting for a script. */
(() => {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const targets = Array.from(document.querySelectorAll(
    'main h1, main .lead, main .pill, main .series-title, .project-group > h2, ' +
    'main .gallery-item, main .work, main .text-graphic, main .index-link, ' +
    'main .section-label, main .price-card, main .workflow-copy > div'
  ));
  const selected = new Set(targets);
  const animations = new Set();
  const observer = new IntersectionObserver(entries => {
    let order = 0;
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      if (reducedMotion.matches) continue;
      entry.target.classList.add('is-in-view');
      if (!entry.target.animate) continue;
      const animation = entry.target.animate([
        { opacity: 0, translate: '0 12px' }, { opacity: 1, translate: '0 0' }
      ], { duration: 650, delay: Math.min(order++ * 45, 180),
        easing: 'cubic-bezier(.22,.68,0,1)', fill: 'backwards' });
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation), () => animations.delete(animation));
    }
  }, { threshold: 0, rootMargin: '0px 0px -12px 0px' });
  targets.filter(target => {
    for (let parent = target.parentElement; parent; parent = parent.parentElement) {
      if (selected.has(parent)) return false;
    }
    return true;
  }).forEach(target => observer.observe(target));
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    animations.forEach(animation => animation.cancel());
    document.querySelectorAll('.text-graphic.is-in-view').forEach(panel => panel.classList.remove('is-in-view'));
  });
})();
