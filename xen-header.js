/* Shared 70% drawer: native modal focus, keyboard controls and iOS scroll lock. */
(() => {
  const header = document.getElementById('xen-site-header');
  if (!header) return;
  const home = header.querySelector('.xen-header-home');
  // Keep the existing centre mark on detail pages only. INDEX has its own wheel.
  if (document.body.classList.contains('home-page')) {
    header.querySelector('.xen-header-center')?.remove();
  } else if (home && !header.querySelector('.xen-header-center')) {
    const center = document.createElement('a');
    center.className = 'xen-header-center';
    center.href = home.href;
    center.setAttribute('aria-label', 'XEN INDEXへ（中央ロゴ）');
    const symbol = document.createElement('img');
    symbol.className = 'xen-header-symbol';
    symbol.src = new URL('./XEN_logo_fixed_black.svg', document.currentScript?.src || document.baseURI).href;
    symbol.alt = '';
    symbol.width = 2232;
    symbol.height = 2293;
    symbol.decoding = 'async';
    center.append(symbol);
    home.after(center);
  }
  const button = header.querySelector('.xen-header-toggle');
  const menu = header.querySelector('#xen-menu');
  if (!button || !menu) return;
  const links = Array.from(menu.querySelectorAll('a'));
  const drawer = document.createElement('dialog');
  drawer.id = 'xen-drawer';
  drawer.className = 'xen-drawer';
  drawer.setAttribute('aria-label', 'サイトメニュー');
  const bar = document.createElement('div');
  bar.className = 'xen-drawer-bar';
  const closeButton = document.createElement('button');
  closeButton.className = 'xen-drawer-close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'メニューを閉じる');
  closeButton.setAttribute('autofocus', '');
  closeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  bar.append(closeButton);
  drawer.append(bar, menu);
  header.append(drawer);
  button.setAttribute('aria-controls', drawer.id);
  button.setAttribute('aria-haspopup', 'dialog');
  menu.hidden = false;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let saved;
  let animation;
  let closing = false;
  let outsidePointer = false;
  const animate = (frames) => {
    animation?.cancel();
    if (motion.matches || !drawer.animate) return null;
    animation = drawer.animate(frames, { duration: 320, easing: 'cubic-bezier(.22,.68,0,1)' });
    return animation;
  };
  const restore = () => {
    animation?.cancel();
    animation = undefined;
    closing = false;
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'メニューを開く');
    if (saved) {
      if (saved.body === null) document.body.removeAttribute('style');
      else document.body.setAttribute('style', saved.body);
      document.documentElement.style.overflow = saved.overflow;
      window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
      saved = undefined;
    }
  };
  const finishClose = (restoreFocus = true) => {
    if (!drawer.open) return;
    drawer.close();
    restore();
    if (restoreFocus) button.focus({ preventScroll: true });
  };
  const close = (immediate = false, restoreFocus = true) => {
    if (!drawer.open || (closing && !immediate)) return;
    closing = true;
    const effect = immediate ? null : animate([{ transform: 'translateX(0)' }, { transform: 'translateX(100%)' }]);
    if (effect) effect.onfinish = () => finishClose(restoreFocus);
    else finishClose(restoreFocus);
  };
  const open = () => {
    if (drawer.open) return;
    saved = { x: scrollX, y: scrollY, body: document.body.getAttribute('style'), overflow: document.documentElement.style.overflow };
    const scrollbar = innerWidth - document.documentElement.clientWidth;
    const paddingRight = parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    Object.assign(document.body.style, { position: 'fixed', top: `-${saved.y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
    if (scrollbar > 0 && !getComputedStyle(document.documentElement).scrollbarGutter.includes('stable')) document.body.style.paddingRight = `${paddingRight + scrollbar}px`;
    document.documentElement.style.overflow = 'hidden';
    drawer.showModal();
    menu.scrollTop = 0;
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-label', 'メニューを閉じる');
    closeButton.focus({ preventScroll: true });
    animate([{ transform: 'translateX(100%)' }, { transform: 'translateX(0)' }]);
  };
  button.addEventListener('click', open);
  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); open(); links[0]?.focus(); }
  });
  closeButton.addEventListener('click', () => close());
  drawer.addEventListener('cancel', event => { event.preventDefault(); close(); });
  drawer.addEventListener('close', () => { if (!drawer.open) restore(); });
  // A press must begin and end outside the panel; dragging out does not close it.
  const isOutside = event => {
    const rect = drawer.getBoundingClientRect();
    return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  };
  drawer.addEventListener('pointerdown', event => { outsidePointer = event.target === drawer && isOutside(event); });
  drawer.addEventListener('click', event => {
    if (outsidePointer && event.target === drawer && isOutside(event)) close();
    outsidePointer = false;
  });
  menu.addEventListener('click', event => {
    // Restore scroll synchronously before the browser follows same-page anchors.
    if (event.target.closest('a')) close(true);
  });
  drawer.addEventListener('keydown', event => {
    // Keep Tab inside the drawer, including the close control.
    if (event.key === 'Tab') {
      const controls = [closeButton, ...links];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    }
    const index = links.indexOf(document.activeElement);
    if (index < 0) return;
    const next = { ArrowDown: (index + 1) % links.length, ArrowUp: (index - 1 + links.length) % links.length, Home: 0, End: links.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); links[next].focus(); }
  });
  motion.addEventListener('change', () => {
    if (!motion.matches) return;
    animation?.cancel();
    if (closing) finishClose();
  });
  window.addEventListener('pagehide', () => close(true, false));
})();
