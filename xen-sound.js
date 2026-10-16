/* Progressive enhancement: every player, name and destination is in the HTML. */
(() => {
  document.querySelectorAll('.sound-service-logo img').forEach(image => {
    const fallback = () => {
      image.hidden = true;
      image.closest('.sound-service-logo').hidden = true;
      image.closest('.sound-service').classList.add('sound-service-text');
    };
    image.addEventListener('error', fallback, {once:true});
    if (image.complete && !image.naturalWidth) fallback();
  });
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({target,isIntersecting}) => {
      if (!isIntersecting) return;
      if (!preference.matches) target.classList.add('sound-revealed');
      observer.unobserve(target);
    });
  }, {threshold:0.05});
  document.querySelectorAll('.sound-platform-group h3, .sound-service-grid li, .sound-social-use').forEach(node => observer.observe(node));
  preference.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    document.querySelectorAll('.sound-revealed').forEach(node => node.classList.remove('sound-revealed'));
  });
})();
