/* Shared navigation: fixed header, keyboard access and iOS scroll restoration. */
(() => {
  const header = document.getElementById('xen-site-header');
  if (!header) return;
  const button = header.querySelector('.xen-header-toggle');
  const menu = header.querySelector('#xen-menu');
  const links = Array.from(menu.querySelectorAll('a'));
  let saved;
  let background = [];
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';
  const setOpen = (open, restoreFocus = false) => {
    if (isOpen() === open) return;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    menu.hidden = !open;
    menu.inert = !open;
    if (open) {
      saved = { x: scrollX, y: scrollY, body: document.body.getAttribute('style'), overflow: document.documentElement.style.overflow };
      Object.assign(document.body.style, { position: 'fixed', top: `-${saved.y}px`, left: '0', right: '0', width: '100%', overflow: 'hidden' });
      document.documentElement.style.overflow = 'hidden';
      background = Array.from(document.body.children).filter(node => node !== header && !['SCRIPT', 'STYLE', 'LINK'].includes(node.tagName)).map(node => [node, node.inert]);
      background.forEach(([node]) => { node.inert = true; });
      links[0]?.focus({ preventScroll: true });
    } else {
      background.forEach(([node, inert]) => { node.inert = inert; });
      background = [];
      if (saved) {
        if (saved.body === null) document.body.removeAttribute('style');
        else document.body.setAttribute('style', saved.body);
        document.documentElement.style.overflow = saved.overflow;
        window.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
        saved = undefined;
      }
      if (restoreFocus) button.focus({ preventScroll: true });
    }
  };
  menu.inert = true;
  button.addEventListener('click', () => setOpen(!isOpen(), isOpen()));
  button.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); links[0]?.focus(); }
  });
  menu.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
  menu.addEventListener('keydown', event => {
    const index = links.indexOf(document.activeElement);
    if (index < 0) return;
    const next = { ArrowDown: (index + 1) % links.length, ArrowUp: (index - 1 + links.length) % links.length, Home: 0, End: links.length - 1 }[event.key];
    if (next !== undefined) { event.preventDefault(); links[next].focus(); }
  });
  document.addEventListener('keydown', event => {
    if (!isOpen()) return;
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false, true); }
    if (event.key === 'Tab') {
      const controls = Array.from(header.querySelectorAll('a[href], button'));
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
  document.addEventListener('click', event => { if (isOpen() && !header.contains(event.target)) setOpen(false, true); });
  window.addEventListener('pagehide', () => setOpen(false));
})();
