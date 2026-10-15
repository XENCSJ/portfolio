/* One-shot text motion, with no loading gate, text splitting or layout changes. */
(() => {
  const page = document.querySelector('.studio-page');
  if (!page) return;
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const active = new Set();
  const observer = new IntersectionObserver(entries => {
    let order = 0;
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      observer.unobserve(entry.target);
      if (preference.matches || typeof entry.target.animate !== 'function') return;
      const animation = entry.target.animate([
        { opacity: 0, transform: 'translateY(10px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], {
        duration: 650,
        delay: Math.min(order++ * 55, 165),
        easing: 'cubic-bezier(.22,.68,0,1)',
        fill: 'backwards'
      });
      active.add(animation);
      animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    });
  }, { threshold: 0, rootMargin: '0px 0px -16px 0px' });
  page.querySelectorAll('[data-studio-reveal]').forEach(element => observer.observe(element));
  preference.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    active.forEach(animation => animation.cancel());
    active.clear();
  });
})();
