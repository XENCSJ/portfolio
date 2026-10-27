/* One quiet reveal; the static link remains visible without JS or motion APIs. */
(() => {
  const link = document.querySelector('footer .xen-footer-symbol');
  const image = link?.querySelector('img');
  if (!image || link.dataset.symbolReady) return;
  link.dataset.symbolReady = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !window.IntersectionObserver || !image.animate) return;
  let animation;
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (reduced.matches || document.activeElement === link) return;
    animation = image.animate(
      [{opacity: 0, transform: 'translateY(3px)'}, {opacity: 1, transform: 'none'}],
      {duration: 700, easing: 'cubic-bezier(.22,.68,0,1)'}
    );
  }, {threshold: .1});
  observer.observe(link);
  const settle = () => {
    observer.disconnect();
    animation?.cancel();
  };
  link.addEventListener('focus', settle, {once: true});
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
})();
