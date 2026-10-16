/* Run once, before viewer and reveal setup, on the two opted-in galleries. */
(() => {
  document.querySelectorAll('[data-gallery-shuffle]').forEach(gallery => {
    const items = Array.from(gallery.children).filter(item =>
      item.classList.contains('gallery-item'));

    // Fisher–Yates: move whole cards so images, labels and links stay together.
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    const fragment = document.createDocumentFragment();
    items.forEach((item, index) => {
      const image = item.querySelector('img');
      if (image) {
        image.loading = index < 3 ? 'eager' : 'lazy';
        image.setAttribute('fetchpriority', index === 0 ? 'high' : 'auto');
      }
      fragment.append(item);
    });
    gallery.append(fragment);
  });
})();
