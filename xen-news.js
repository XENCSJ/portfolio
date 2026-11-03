/* Keep the site's own logo visible when an article image becomes unavailable. */
(() => {
  const list = document.querySelector('.news-page #news-list');
  if (!list) return;
  const fallback = image => {
    const frame = image.closest('.news-thumb');
    if (!frame || frame.classList.contains('is-logo')) return;
    frame.classList.add('is-logo');
    image.src = './xen-header-logo.png';
  };
  list.addEventListener('error', e => {
    if (e.target instanceof HTMLImageElement) fallback(e.target);
  }, true);
  list.querySelectorAll('img').forEach(image => {
    if (image.complete && !image.naturalWidth) fallback(image);
  });
})();
