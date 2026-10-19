(() => {
  'use strict';
  const section = document.getElementById('xen-news');
  if (!section || !('IntersectionObserver' in window)) return;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  const reset = () => {
    observer?.disconnect();
    section.classList.remove('xen-news-pending');
    if (motion.matches) return;
    observer = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) {
        section.classList.remove('xen-news-pending');
        observer.disconnect();
      }
    }, {threshold: 0.06});
    section.classList.add('xen-news-pending');
    observer.observe(section);
  };
  motion.addEventListener?.('change', reset);
  reset();
})();
