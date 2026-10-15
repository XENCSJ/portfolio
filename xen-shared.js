/* Shared controls. Page content remains visible if scripts cannot run. */
(() => {
  const button = document.querySelector('.xen-menu-button');
  const menu = document.getElementById('xen-menu');
  if (button && menu) {
    const links = Array.from(menu.querySelectorAll('a'));
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let menuAnimation;
    const setOpen = (open, restoreFocus = false) => {
      const wasOpen = button.getAttribute('aria-expanded') === 'true';
      if (open === wasOpen) return;
      menuAnimation?.cancel();
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
      menu.inert = !open;
      if (open) menu.hidden = false;
      if (!motion.matches && menu.animate) {
        menuAnimation = menu.animate(open ?
          [{ opacity: 0, translate: '0 -6px' }, { opacity: 1, translate: '0 0' }] :
          [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -6px' }],
          { duration: open ? 280 : 160, easing: 'cubic-bezier(.22,.68,0,1)' });
        menuAnimation.onfinish = () => { menu.hidden = !open; };
      } else menu.hidden = !open;
      if (restoreFocus) button.focus();
    };
    button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
    motion.addEventListener('change', () => {
      if (!motion.matches) return;
      menuAnimation?.cancel();
      menu.hidden = button.getAttribute('aria-expanded') !== 'true';
    });
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
    const enhanced = viewer.hasAttribute('data-gallery-enhanced');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let activeWorks = works;
    let animateGallery = false;
    let viewerAnimation;
    let imageAnimation;
    let closing = false;
    let gesture;
    let ignoreSwipeClick = false;
    const status = document.createElement('p');
    status.className = 'viewer-status';
    status.setAttribute('role', 'status');
    viewer.append(status);
    preview.addEventListener('load', () => {
      viewer.setAttribute('aria-busy', 'false');
      status.textContent = '';
      if (animateGallery && viewer.open && !motion.matches && preview.animate) {
        imageAnimation?.cancel();
        imageAnimation = preview.animate([{opacity: .35}, {opacity: 1}],
          {duration: 280, easing: 'cubic-bezier(.22,.68,0,1)'});
      }
    });
    preview.addEventListener('error', () => {
      viewer.setAttribute('aria-busy', 'false');
      status.textContent = '画像を読み込めませんでした。元画像のリンクからご確認ください。';
    });
    let index = 0;
    let opener;
    const close = () => {
      if (closing || !viewer.open) return;
      gesture = undefined;
      if (!animateGallery || motion.matches || !viewer.animate) {
        viewer.close();
        return;
      }
      closing = true;
      viewerAnimation?.cancel();
      viewerAnimation = viewer.animate(
        [{opacity: 1, transform: 'scale(1)'}, {opacity: 0, transform: 'scale(.985)'}],
        {duration: 280, easing: 'cubic-bezier(.22,.68,0,1)'});
      viewerAnimation.onfinish = () => viewer.close();
    };
    const show = (next) => {
      if (closing || !activeWorks.length) return;
      index = (next + activeWorks.length) % activeWorks.length;
      const work = activeWorks[index];
      imageAnimation?.cancel();
      viewer.setAttribute('aria-busy', 'true');
      status.textContent = '画像を読み込んでいます…';
      preview.src = work.href;
      preview.alt = work.querySelector('img').alt;
      caption.textContent = preview.alt;
      original.href = work.href;
      counter.textContent = `${index + 1} / ${activeWorks.length}`;
    };
    works.forEach((work, position) => {
      work.addEventListener('click', (event) => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        opener = work;
        const gallery = enhanced && work.closest('.xen-tile-gallery, [data-gallery-group]');
        animateGallery = Boolean(gallery);
        viewer.classList.toggle('is-fullscreen-gallery', animateGallery);
        activeWorks = gallery ? Array.from(gallery.querySelectorAll('.gallery-item')) : works;
        show(gallery ? activeWorks.indexOf(work) : position);
        viewer.showModal();
        document.documentElement.classList.add('xen-viewer-open');
        if (animateGallery && !motion.matches && viewer.animate) {
          viewerAnimation?.cancel();
          viewerAnimation = viewer.animate(
            [{opacity: 0, transform: 'scale(.985)'}, {opacity: 1, transform: 'scale(1)'}],
            {duration: 320, easing: 'cubic-bezier(.22,.68,0,1)'});
        }
      });
    });
    viewer.querySelector('.viewer-close').addEventListener('click', close);
    viewer.querySelector('.viewer-prev').addEventListener('click', () => show(index - 1));
    viewer.querySelector('.viewer-next').addEventListener('click', () => show(index + 1));
    viewer.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      show(index + (event.key === 'ArrowLeft' ? -1 : 1));
    });
    viewer.addEventListener('click', (event) => {
      if (animateGallery && (event.target === viewer || event.target === preview)) {
        if (ignoreSwipeClick) { ignoreSwipeClick = false; return; }
        if (event.target === viewer) { close(); return; }
        // The image element also covers the letterboxed background. Only taps
        // outside the painted image close the fullscreen viewer.
        if (!preview.naturalWidth || !preview.naturalHeight) return;
        const rect = preview.getBoundingClientRect();
        const scale = Math.min(rect.width / preview.naturalWidth, rect.height / preview.naturalHeight);
        const width = preview.naturalWidth * scale;
        const height = preview.naturalHeight * scale;
        const left = rect.left + (rect.width - width) / 2;
        const top = rect.top + (rect.height - height) / 2;
        if (event.clientX < left || event.clientX > left + width ||
            event.clientY < top || event.clientY > top + height) close();
        return;
      }
      if (event.target !== viewer) return;
      const rect = viewer.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right ||
          event.clientY < rect.top || event.clientY > rect.bottom) close();
    });
    viewer.addEventListener('close', () => {
      document.documentElement.classList.remove('xen-viewer-open');
      closing = false;
      gesture = undefined;
      ignoreSwipeClick = false;
      viewer.classList.remove('is-fullscreen-gallery');
      viewerAnimation?.cancel();
      imageAnimation?.cancel();
      opener?.focus();
    });
    if (enhanced) {
      viewer.addEventListener('cancel', (event) => {
        if (!animateGallery) return;
        event.preventDefault();
        close();
      });
      motion.addEventListener('change', () => {
        if (!motion.matches) return;
        viewerAnimation?.cancel();
        imageAnimation?.cancel();
        if (closing) viewer.close();
      });
      // Only a deliberate one-finger horizontal gesture on the image navigates.
      // Vertical scrolling, multi-touch and pinch zoom keep their native behavior.
      viewer.addEventListener('pointerdown', (event) => {
        ignoreSwipeClick = false;
        if (!event.isPrimary) { gesture = undefined; return; }
        if (!animateGallery || closing || event.pointerType !== 'touch' || event.target !== preview ||
            (window.visualViewport?.scale || 1) > 1) return;
        gesture = {id: event.pointerId, x: event.clientX, y: event.clientY, time: event.timeStamp};
      });
      viewer.addEventListener('pointercancel', () => { gesture = undefined; });
      viewer.addEventListener('pointerup', (event) => {
        const start = gesture;
        gesture = undefined;
        if (!start || start.id !== event.pointerId || closing || !viewer.open) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        const threshold = Math.max(40, Math.min(80, preview.clientWidth * .12));
        if (Math.abs(dx) < threshold || Math.abs(dy) > Math.abs(dx) * .65 ||
            event.timeStamp - start.time > 800 || (window.visualViewport?.scale || 1) > 1) return;
        ignoreSwipeClick = true;
        show(index + (dx < 0 ? 1 : -1));
      });
    }
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

/* Read the unchanged price tables once; never maintain a second set of fees. */
(() => {
  if (!document.body.classList.contains('price-list-page')) return;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  document.querySelectorAll('.table-scroll').forEach(region => {
    const table = region.querySelector('table');
    if (!table || region.querySelector('.price-cards')) return;
    const headings = Array.from(table.querySelectorAll('thead th'), th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'), tr => Array.from(tr.cells));
    if (!headings.length || !rows.length || rows.some(row => row.length !== headings.length)) return;
    const comparison = ['price-section-2','price-section-3'].includes(region.getAttribute('aria-labelledby'));
    const cards = element('div', undefined, 'price-cards');
    const makeCard = (name, price, label) => {
      const card = element('article', undefined, 'price-card');
      card.append(element('h3', name));
      const value = element('p', undefined, 'price-value');
      value.append(element('span', label, 'price-label'), document.createTextNode(price));
      card.append(value);
      cards.append(card);
      return card;
    };
    if (comparison) {
      headings.forEach((name, column) => {
        rows[0][column].classList.add('price-value');
        const card = makeCard(name, rows[0][column].textContent.trim(), '料金');
        const list = element('ul');
        rows.slice(1).forEach(row => list.append(element('li', row[column].textContent.trim())));
        card.append(list);
      });
    } else {
      const priceColumn = headings.findIndex(text => /価格|PRICE/.test(text));
      if (priceColumn < 0) return;
      rows.forEach(row => {
        row[priceColumn].classList.add('price-value');
        const card = makeCard(row[0].textContent.trim(), row[priceColumn].textContent.trim(), headings[priceColumn]);
        const details = element('dl');
        row.forEach((cell, column) => {
          if (column === 0 || column === priceColumn) return;
          details.append(element('dt', headings[column]), element('dd', cell.textContent.trim()));
        });
        card.append(details);
      });
    }
    region.append(cards);
    region.classList.add('has-price-cards');
    region.removeAttribute('tabindex');
  });
})();
