/* Decorative entrances only: all real copy is readable with JavaScript disabled. */
(() => {
  const panels = document.querySelectorAll('.text-graphic');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in-view');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  panels.forEach(panel => observer.observe(panel));
  reducedMotion.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    panels.forEach(panel => panel.classList.remove('is-in-view'));
  });
})();
