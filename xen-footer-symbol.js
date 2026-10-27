/* Native links remain usable without JavaScript. Reveal once, without hiding content. */
(() => {
  const footer = document.querySelector('footer.xen-unified-footer');
  if (!footer || footer.dataset.footerReady) return;
  footer.dataset.footerReady = 'true';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const top = footer.querySelector('.xen-footer-return');
  top?.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.scrollTo({top: 0, left: 0, behavior: reduced.matches ? 'instant' : 'smooth'});
  });
  const link = footer.querySelector('.xen-footer-symbol');
  const image = link?.querySelector('img');
  const credits = footer.querySelector('.xen-footer-credits');
  if (reduced.matches || !window.IntersectionObserver || !image?.animate) return;
  const animations = [];
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (reduced.matches || document.activeElement === link) return;
    animations.push(image.animate(
      [{opacity: 0, transform: 'translateY(8px)'}, {opacity: 1, transform: 'none'}],
      {duration: 700, easing: 'cubic-bezier(.22,.68,0,1)'}
    ));
    if (credits?.animate) animations.push(credits.animate(
      [{opacity: 0}, {opacity: 1}],
      {duration: 650, delay: 180, fill: 'backwards', easing: 'ease-out'}
    ));
  }, {threshold: .15});
  observer.observe(link);
  const settle = () => {
    observer.disconnect();
    animations.forEach(animation => animation.cancel());
  };
  link.addEventListener('focus', settle, {once: true});
  reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
})();
