/* Shared controls. Page content remains visible if scripts cannot run. */
(() => {
  const button = document.querySelector('.xen-menu-button');
  const menu = document.getElementById('xen-menu');
  if (button && menu) {
    const links = Array.from(menu.querySelectorAll('a'));
    const setOpen = (open, restoreFocus = false) => {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      menu.hidden = !open;
      if (restoreFocus) button.focus();
    };
    button.addEventListener('click', () => setOpen(menu.hidden));
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      setOpen(true);
      links[0]?.focus();
    });
    menu.addEventListener('keydown', (event) => {
      const index = links.indexOf(document.activeElement);
      if (index < 0) return;
      const next = {ArrowDown: (index + 1) % links.length,
        ArrowUp: (index - 1 + links.length) % links.length,
        Home: 0, End: links.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      links[next].focus();
    });
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !menu.hidden) setOpen(false, true);
    });
    for (const type of ['click', 'focusin']) {
      document.addEventListener(type, (event) => {
        if (!event.target.closest('.xen-header')) setOpen(false);
      });
    }
  }

  const viewer = document.getElementById('image-viewer');
  if (viewer && typeof viewer.showModal === 'function') {
    const works = Array.from(document.querySelectorAll('.gallery-item'));
    const preview = viewer.querySelector('img');
    const caption = viewer.querySelector('.viewer-caption');
    const original = viewer.querySelector('.viewer-original');
    const counter = viewer.querySelector('.viewer-counter');
    const status = document.createElement('p');
    status.className = 'viewer-status';
    status.setAttribute('role', 'status');
    viewer.append(status);
    preview.addEventListener('load', () => {
      viewer.setAttribute('aria-busy', 'false');
      status.textContent = '';
    });
    preview.addEventListener('error', () => {
      viewer.setAttribute('aria-busy', 'false');
      status.textContent = '画像を読み込めませんでした。元画像のリンクからご確認ください。';
    });
    let index = 0;
    let opener;
    const show = (next) => {
      index = (next + works.length) % works.length;
      const work = works[index];
      viewer.setAttribute('aria-busy', 'true');
      status.textContent = '画像を読み込んでいます…';
      preview.src = work.href;
      preview.alt = work.querySelector('img').alt;
      caption.textContent = preview.alt;
      original.href = work.href;
      counter.textContent = `${index + 1} / ${works.length}`;
    };
    works.forEach((work, position) => {
      work.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = work;
        show(position);
        viewer.showModal();
      });
    });
    viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
    viewer.querySelector('.viewer-prev').addEventListener('click', () => show(index - 1));
    viewer.querySelector('.viewer-next').addEventListener('click', () => show(index + 1));
    viewer.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      show(index + (event.key === 'ArrowLeft' ? -1 : 1));
    });
    viewer.addEventListener('click', (event) => {
      if (event.target !== viewer) return;
      const rect = viewer.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) viewer.close();
    });
    viewer.addEventListener('close', () => opener?.focus());
  }

  // Display copies may fail independently of preserved originals.
  document.querySelectorAll('.gallery-item img').forEach((image) => {
    image.addEventListener('error', () => {
      const original = image.closest('a').href;
      if (image.src !== original) image.src = original;
    }, {once: true});
  });

  // The existing form has no delivery destination. Never submit to this page.
  const form = document.getElementById('contact');
  if (form && !form.getAttribute('action')) {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      document.getElementById('formnote').textContent = '現在フォームからの送信は受け付けていません。';
    });
  }
})();
