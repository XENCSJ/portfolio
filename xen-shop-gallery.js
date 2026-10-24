/* Extend the four curated galleries in SHOP and DESIGN without changing their copy. */
(() => {
  'use strict';
  const galleries = [...document.querySelectorAll('.xg-dialog .xsg-gallery')];
  if (!galleries.length) return;
  const zoom = document.createElement('dialog');
  zoom.className = 'xsg-zoom';
  zoom.setAttribute('aria-labelledby', 'xsg-zoom-title');
  zoom.innerHTML = '<div class="xsg-zoom-bar"><p class="xsg-zoom-title" id="xsg-zoom-title"></p><div class="xsg-zoom-actions"><button type="button" data-shop-magnify aria-pressed="false">2倍に拡大</button><button type="button" data-shop-zoom-close aria-label="拡大表示を閉じる">CLOSE ×</button></div></div><div class="xsg-zoom-viewport" tabindex="0" aria-label="拡大画像。拡大後はスクロールして移動"><div class="xsg-zoom-canvas"><img class="xsg-zoom-image" alt="" decoding="async"></div></div><p class="xsg-zoom-help">2倍に拡大すると、スクロールで細部を確認できます。</p>';
  document.body.append(zoom);
  const image = zoom.querySelector('img');
  const viewport = zoom.querySelector('.xsg-zoom-viewport');
  const title = zoom.querySelector('.xsg-zoom-title');
  const magnify = zoom.querySelector('[data-shop-magnify]');
  const close = zoom.querySelector('[data-shop-zoom-close]');
  let owner = null;
  let trigger = null;
  function fit() {
    if (!zoom.open || !image.naturalWidth) return;
    const style = getComputedStyle(viewport);
    const width = viewport.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = viewport.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight, 1);
    image.style.setProperty('--xsg-width', `${image.naturalWidth * scale}px`);
    image.style.setProperty('--xsg-height', `${image.naturalHeight * scale}px`);
  }
  function setMagnified(value) {
    zoom.classList.toggle('is-magnified', value);
    magnify.setAttribute('aria-pressed', String(value));
    magnify.textContent = value ? '全体を表示' : '2倍に拡大';
    viewport.scrollTo(0, 0);
  }
  magnify.addEventListener('click', () => setMagnified(!zoom.classList.contains('is-magnified')));
  close.addEventListener('click', () => zoom.close());
  zoom.addEventListener('close', () => {
    setMagnified(false);
    if (owner?.open && trigger?.isConnected) trigger.focus({preventScroll:true});
    owner = null;
  });
  zoom.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const controls = [magnify, close, viewport];
    if (event.shiftKey && document.activeElement === controls[0]) {
      event.preventDefault(); controls.at(-1).focus();
    } else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
      event.preventDefault(); controls[0].focus();
    }
  });
  image.addEventListener('load', fit);
  new ResizeObserver(fit).observe(viewport);
  galleries.forEach(gallery => {
    const dialog = gallery.closest('dialog');
    const enlarge = gallery.querySelector('[data-shop-enlarge]');
    const first = gallery.querySelector('[data-graphic-thumb="0"]');
    const reset = () => {
      if (dialog.open) {
        first.click();
        gallery.querySelector('.xg-thumbnails').scrollLeft = 0;
      } else if (owner === dialog && zoom.open) zoom.close();
    };
    new MutationObserver(reset).observe(dialog, {attributes:true,attributeFilter:['open']});
    reset();
    enlarge.addEventListener('click', () => {
      const current = gallery.querySelector('.xg-stage img.is-current');
      owner = dialog; trigger = enlarge;
      image.alt = current.alt;
      title.textContent = current.alt;
      image.src = current.currentSrc || current.src;
      image.width = Number(current.getAttribute('width'));
      image.height = Number(current.getAttribute('height'));
      zoom.showModal();
      setMagnified(false); fit(); close.focus({preventScroll:true});
    });
    // Keep the selected thumbnail in view without moving the page or modal.
    const thumbs = gallery.querySelector('.xg-thumbnails');
    new MutationObserver(() => {
      const selected = thumbs.querySelector('[aria-pressed="true"]');
      if (!dialog.open || !selected) return;
      const t = selected.getBoundingClientRect(), c = thumbs.getBoundingClientRect();
      if (t.left < c.left) thumbs.scrollLeft += t.left - c.left;
      if (t.right > c.right) thumbs.scrollLeft += t.right - c.right;
    }).observe(thumbs, {subtree:true,attributes:true,attributeFilter:['aria-pressed']});
  });
  const grid = document.querySelector('[data-base-grid]');
  function labelCovers() {
    galleries.forEach(gallery => {
      const dialog = gallery.closest('dialog');
      const img = document.querySelector(`#base-product-${dialog.dataset.productId} .base-product-visual img`);
      if (img && img.getAttribute('src') === dialog.dataset.graphicCover) {
        const first = gallery.querySelector('.xg-stage img');
        img.alt = `${dialog.dataset.graphicName} グラフィック`;
        img.width = Number(first.getAttribute('width'));
        img.height = Number(first.getAttribute('height'));
      }
    });
  }
  if (grid) new MutationObserver(labelCovers).observe(grid, {childList:true});
  labelCovers();
})();
