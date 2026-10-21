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
})();

/* Native details still works without JavaScript; enhance both open and close. */
(() => {
  const details = document.querySelector('#tochu-no-mamade .sound-lyrics-accordion');
  if (!details) return;
  const summary = details.querySelector('summary');
  const panel = details.querySelector('.sound-lyrics-panel');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let expanded = details.open;
  let animation = null;

  const syncState = () => {
    details.dataset.expanded = String(expanded);
    summary.setAttribute('aria-expanded', String(expanded));
    panel.setAttribute('aria-hidden', String(!expanded));
  };
  const finish = () => {
    details.open = expanded;
    details.style.overflow = '';
    animation = null;
  };
  const settle = () => {
    if (animation) animation.cancel();
    finish();
  };
  syncState();

  summary.addEventListener('click', event => {
    event.preventDefault();
    const startHeight = details.getBoundingClientRect().height;
    if (animation) animation.cancel();
    expanded = !expanded;
    syncState();
    if (reducedMotion.matches || !details.animate) {
      finish();
      return;
    }
    // Keep the content rendered until the closing animation has completed.
    details.open = true;
    details.style.overflow = 'hidden';
    const endHeight = summary.getBoundingClientRect().height +
      (expanded ? panel.getBoundingClientRect().height : 0);
    animation = details.animate(
      { height: [startHeight + 'px', endHeight + 'px'] },
      { duration: 400, easing: 'cubic-bezier(.22, 1, .36, 1)' }
    );
    animation.onfinish = finish;
  });
  // Finish at the natural height if orientation or motion preferences change.
  window.addEventListener('resize', settle);
  reducedMotion.addEventListener('change', settle);
})();
