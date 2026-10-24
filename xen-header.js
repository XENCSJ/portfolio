/* Inline SVG icons: Lucide (https://lucide.dev).
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.



The following Lucide icons are derived from the Feather project:

airplay, alert-circle, alert-octagon, alert-triangle, aperture, arrow-down-circle, arrow-down-left, arrow-down-right, arrow-down, arrow-left-circle, arrow-left, arrow-right-circle, arrow-right, arrow-up-circle, arrow-up-left, arrow-up-right, arrow-up, at-sign, calendar, cast, check, chevron-down, chevron-left, chevron-right, chevron-up, chevrons-down, chevrons-left, chevrons-right, chevrons-up, circle, clipboard, clock, code, columns, command, compass, corner-down-left, corner-down-right, corner-left-down, corner-left-up, corner-right-down, corner-right-up, corner-up-left, corner-up-right, crosshair, database, divide-circle, divide-square, dollar-sign, download, external-link, feather, frown, hash, headphones, help-circle, info, italic, key, layout, life-buoy, link-2, link, loader, lock, log-in, log-out, maximize, meh, minimize, minimize-2, minus-circle, minus-square, minus, monitor, moon, more-horizontal, more-vertical, move, music, navigation-2, navigation, octagon, pause-circle, percent, plus-circle, plus-square, plus, power, radio, rss, search, server, share, shopping-bag, sidebar, smartphone, smile, square, table-2, tablet, target, terminal, trash-2, trash, triangle, tv, type, upload, x-circle, x-octagon, x-square, x, zoom-in, zoom-out

The MIT License (MIT) (for the icons listed above)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. */
/* Shared 70% drawer: native modal focus, keyboard controls and iOS scroll lock. */
(() => {
  const header = document.getElementById('xen-site-header');
  if (!header) return;
  // One shared header: wordmark, cart and menu. The INDEX hero stays untouched.
  header.querySelector('.xen-header-center')?.remove();
  const button = header.querySelector('.xen-header-toggle');
  const menu = header.querySelector('#xen-menu');
  if (!button || !menu) return;
  // Reuse the INDEX line-art vocabulary; decorate only labels already in this menu.
  // UI policy: no decorative emoji in navigation. Use existing gold SVG icons only;
  // CONTACT keeps its left icon and plain label, with no trailing symbol or replacement.
  const menuIcons = {
    "ABOUT XEN": "<circle cx=\"12\" cy=\"12\" r=\"10\" /><path d=\"M12 16v-4\" /><path d=\"M12 8h.01\" />",
    "STUDIO": "<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\" /><path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\" /><path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\" />",
    "CREATOR": "<circle cx=\"12\" cy=\"8\" r=\"5\" /><path d=\"M20 21a8 8 0 0 0-16 0\" />",
    "WORKS": "<rect width=\"7\" height=\"7\" x=\"3\" y=\"3\" rx=\"1\" /><rect width=\"7\" height=\"7\" x=\"14\" y=\"3\" rx=\"1\" /><rect width=\"7\" height=\"7\" x=\"14\" y=\"14\" rx=\"1\" /><rect width=\"7\" height=\"7\" x=\"3\" y=\"14\" rx=\"1\" />",
    "STORYBOOKS": "<path d=\"M12 5v16\" /><path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\" />",
    "ANIMATION": "<path d=\"m12.296 3.464 3.02 3.956\" /><path d=\"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z\" /><path d=\"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\" /><path d=\"m6.18 5.276 3.1 3.899\" />",
    "SOUND": "<path d=\"M2 10v3\" /><path d=\"M6 6v11\" /><path d=\"M10 3v18\" /><path d=\"M14 8v7\" /><path d=\"M18 5v13\" /><path d=\"M22 10v3\" />",
    "CINEMATIC": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /><path d=\"M7 3v18\" /><path d=\"M3 7.5h4\" /><path d=\"M3 12h18\" /><path d=\"M3 16.5h4\" /><path d=\"M17 3v18\" /><path d=\"M17 7.5h4\" /><path d=\"M17 16.5h4\" />",
    "SNAP": "<path d=\"M13.997 4a2 2 0 0 1 1.76 1.05l.486.9A2 2 0 0 0 18.003 7H20a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h1.997a2 2 0 0 0 1.759-1.048l.489-.904A2 2 0 0 1 10.004 4z\" /><circle cx=\"12\" cy=\"13\" r=\"3\" />",
    "DESIGN": "<path d=\"m18 13-.654-4.736a4 4 0 00-2.756-3.266l-9.163-2.9a2 2 0 00-2.017.493l-.82.819a2 2 0 00-.492 2.017l2.9 9.163a4 4 0 003.266 2.756L13 18\" /><path d=\"M18.648 12.352a1.205 1.205 0 011.704 0l1.296 1.296a1.205 1.205 0 010 1.704l-6.296 6.296a1.205 1.205 0 01-1.704 0l-1.296-1.296a1.205 1.205 0 010-1.704z\" /><path d=\"m3 3 6.586 6.586\" /><circle cx=\"11\" cy=\"11\" r=\"2\" />",
    "APPAREL": '<use href="./xen-shop-icon.svg#cart"></use>',
    "ARCHITECTURE": "<path d=\"M12 10h.01\" /><path d=\"M12 14h.01\" /><path d=\"M12 6h.01\" /><path d=\"M16 10h.01\" /><path d=\"M16 14h.01\" /><path d=\"M16 6h.01\" /><path d=\"M8 10h.01\" /><path d=\"M8 14h.01\" /><path d=\"M8 6h.01\" /><path d=\"M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3\" /><rect x=\"4\" y=\"2\" width=\"16\" height=\"20\" rx=\"2\" />",
    "SPACE": "<path d=\"M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z\" /><path d=\"m3.3 7 8.7 5 8.7-5\" /><path d=\"M12 22V12\" />",
    "ARTWORKS": "<path d=\"M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z\" /><circle cx=\"13.5\" cy=\"6.5\" r=\".5\" fill=\"currentColor\" /><circle cx=\"17.5\" cy=\"10.5\" r=\".5\" fill=\"currentColor\" /><circle cx=\"6.5\" cy=\"12.5\" r=\".5\" fill=\"currentColor\" /><circle cx=\"8.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\" />",
    "CONTACT": "<path d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719\" />",
    "INDEX": "<path d=\"M3 10 12 3l9 7v10H3Z\"/><path d=\"M9 20v-7h6v7\"/>",
    "SNS MANAGEMENT": "<path d=\"M3 3v18h18\"/><path d=\"m6 15 5-5 4 3 6-7\"/>",
    "PRICE LIST": "<path d=\"M3 3h8l10 10-8 8L3 11Z\"/><circle cx=\"7.5\" cy=\"7.5\" r=\"1\"/>",
  };
  menu.querySelectorAll('.xen-menu-en').forEach(label => {
    const name = label.textContent.replace(/\s*↗\s*$/, '').trim();
    const artwork = menuIcons[({ MUSIC: 'SOUND', SHOP: 'APPAREL', 'ART GALLERY': 'ARTWORKS' })[name] || name];
    const row = label.parentElement;
    if (!artwork || row.querySelector('.xen-menu-icon')) return;
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'xen-menu-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('width', '20');
    icon.setAttribute('height', '20');
    icon.setAttribute('aria-hidden', 'true');
    icon.setAttribute('focusable', 'false');
    icon.innerHTML = artwork;
    row.classList.add('xen-menu-icon-row');
    row.prepend(icon);
  });
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
