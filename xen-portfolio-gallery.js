/* Natural-ratio layout without rewriting or duplicating any image links. */
(() => {
  if (!document.body.matches('.xen-curated.snap-page')) return;
  const gallery = document.querySelector('.curated-masonry');
  if (!gallery) return;
  const items = [...gallery.querySelectorAll(':scope > .gallery-item')];
  let lastWidth = 0;
  function layout() {
    const width = gallery.clientWidth;
    if (!width) return;
    const css = getComputedStyle(gallery);
    const columns = Math.max(1, parseInt(css.getPropertyValue('--gallery-columns'), 10) || 1);
    const gap = parseFloat(css.columnGap) || 14;
    const itemWidth = (width - gap * (columns - 1)) / columns;
    const heights = Array(columns).fill(0);
    // Set all widths first, then measure: no read/write loop per photograph.
    items.forEach(item => item.style.setProperty('--item-width', `${itemWidth}px`));
    gallery.setAttribute('data-layout-ready', '');
    const itemHeights = items.map(item => item.offsetHeight);
    items.forEach((item, index) => {
      const shortest = Math.min(...heights);
      const column = heights.indexOf(shortest);
      item.style.setProperty('--item-left', `${column * (itemWidth + gap)}px`);
      item.style.setProperty('--item-top', `${shortest}px`);
      heights[column] += itemHeights[index] + gap;
    });
    gallery.style.height = `${Math.max(...heights) - gap}px`;
    lastWidth = width;
  }
  layout();
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { if (gallery.clientWidth !== lastWidth) layout(); }).observe(gallery);
  } else window.addEventListener('resize', layout, {passive:true});
  document.fonts?.ready.then(layout);
  window.addEventListener('pageshow', layout);
})();
