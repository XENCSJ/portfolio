/* Progressive enhancement of the existing four themes and approved detail data. */
(() => {
  'use strict';
  const host = document.querySelector('.xd-explorer');
  if (!host || typeof HTMLDialogElement === 'undefined') return;
  const dialog = document.querySelector('.xd-dialog');
  const detail = dialog.querySelector('.xd-detail-content');
  const scroller = dialog.querySelector('.xd-detail-scroll');
  const close = dialog.querySelector('.xd-close');
  const back = dialog.querySelector('.xd-detail-back');
  const locationLabel = dialog.querySelector('.xd-location');
  const stage = host.querySelector('.xd-stage');
  const cards = [...host.querySelectorAll('[data-node]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };
  let nodes;
  try { nodes = JSON.parse(document.querySelector('#xd-data').textContent).nodes; }
  catch { return; } // The static navigation and full text remain usable.
  const themes = nodes.home.children, parents = {}, savedViews = new Map();
  Object.entries(nodes).forEach(([id, n]) => n.children?.forEach(child => { parents[child] = id; }));
  let current = 'home', returnY = 0, returnTheme = themes[0], closing = false;
  let openingTimer, feedback;
  const pathTo = id => {
    const path = [];
    while (id && id !== 'home') { path.unshift(id); id = parents[id]; }
    return path;
  };
  const hashFor = id => id === 'home' ? '#home' : '#' + pathTo(id).join('/');
  const themeFor = id => pathTo(id)[0];
  function readHash() {
    const raw = location.hash.slice(1);
    if (!raw || raw === 'home' || raw === 'top' || raw === 'discovery-main') return 'home';
    let parent = 'home';
    for (const id of raw.split('/')) {
      if (!nodes[parent]?.children?.includes(id)) return 'home';
      parent = id;
    }
    return parent;
  }
  function state(id, depth, previous) {
    return { xenDiscovery: true, id, depth, previous, returnY, returnTheme };
  }
  function makeLink(label, href) {
    const a = el('a', 'xd-open-link', label + ' ↗'); a.href = href;
    if (href.startsWith('https:')) {
      a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.setAttribute('aria-label', label + '（新しいタブで開く）');
    }
    return a;
  }
  function makeButton(id, cls = 'xd-topic') {
    const b = el('button', cls); b.type = 'button'; b.dataset.node = id;
    b.append(el('span', '', nodes[id].ja), el('small', '', nodes[id].title), el('span', 'xd-topic-arrow', '→'));
    b.setAttribute('aria-label', nodes[id].ja + ' — 詳細を見る');
    b.addEventListener('click', () => navigate(id)); return b;
  }
  function rememberView() {
    if (!dialog.open) return;
    savedViews.set(current, {
      y: scroller.scrollTop,
      focus: document.activeElement?.dataset.node,
      more: [...detail.querySelectorAll('details')].map(d => d.open)
    });
  }
  function restoreView(id, focus) {
    const saved = savedViews.get(id);
    detail.querySelectorAll('details').forEach((d, i) => { d.open = !!saved?.more[i]; });
    scroller.scrollTop = saved?.y || 0;
    if (focus) {
      const previous = [...detail.querySelectorAll('[data-node]')].find(b => b.dataset.node === saved?.focus);
      (previous || detail.querySelector('h2')).focus({ preventScroll: true });
    }
  }
  function updateCards(theme) {
    cards.forEach(a => {
      const selected = a.dataset.node === theme;
      a.setAttribute('aria-expanded', String(selected));
      if (selected) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    stage.dataset.branch = theme || 'home';
  }
  function unlockPage() {
    document.body.classList.remove('xd-modal-open');
    document.body.style.top = '';
    window.scrollTo({ top: returnY, behavior: 'instant' });
  }
  function render(id, focus = true) {
    const wasOpen = dialog.open;
    current = id;
    const theme = themeFor(id);
    updateCards(theme);
    if (id === 'home') {
      if (wasOpen) { dialog.close(); unlockPage(); }
      if (focus && wasOpen) cards.find(a => a.dataset.node === returnTheme)?.focus({ preventScroll: true });
      host.querySelector('.xd-status').textContent = '4つのテーマから選べます。';
      closing = false;
      return;
    }
    const node = nodes[id], group = nodes[theme], isTheme = id === theme;
    detail.replaceChildren();
    locationLabel.textContent = `${String(themes.indexOf(theme) + 1).padStart(2, '0')} / 04 — ${group.title}`;
    back.hidden = isTheme;
    back.textContent = id === 'youtube' || parents[id] === theme ? '← テーマの概要へ' : '← ' + nodes[parents[id]].title;
    const heading = el('div', 'xd-detail-heading');
    heading.append(cards.find(a => a.dataset.node === theme).querySelector('svg').cloneNode(true));
    const h2 = el('h2', '', node.ja); h2.id = 'xd-detail-title'; h2.tabIndex = -1;
    heading.append(h2, el('p', 'xd-detail-en', node.title)); detail.append(heading);
    if (id === 'philosophy') detail.append(el('p', 'xd-keyphrase', '創造の可能性を、社会の価値へ。'));
    if (node.overview || node.text) detail.append(el('p', 'xd-detail-text', node.overview || node.text));
    if (node.children) {
      detail.append(el('h3', 'xd-section-label', 'さらに知る'));
      const list = el('div', 'xd-topics');
      node.children.forEach(child => list.append(makeButton(child))); detail.append(list);
    } else {
      if (node.more?.length) {
        const more = el('details', 'xd-more'), summary = el('summary', '', 'さらに読む');
        summary.setAttribute('aria-expanded', 'false');
        more.append(summary);
        node.more.forEach(item => more.append(el('h3', '', item.title), el('p', '', item.text)));
        more.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(more.open)));
        detail.append(more);
      }
      // Fetch channel artwork only when a channel is requested. A failure must
      // never block the theme UI or its verified official destination link.
      if (node.channel && window.XenChannels) {
        const channelHost = el('div', 'xd-channel'); detail.append(channelHost);
        window.XenChannels.load().then(channels => {
          if (current !== id || !channelHost.isConnected) return;
          const channel = channels.find(c => c.id === node.channel);
          if (channel) {
            channelHost.append(window.XenChannels.artwork(channel, 'banner'));
            const more = el('details', 'xd-more'), summary = el('summary', '', 'チャンネルについて');
            summary.setAttribute('aria-expanded', 'false'); more.append(summary, el('p', '', channel.more));
            more.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(more.open)));
            channelHost.append(more);
            if (channel.video) {
              const video = el('button', 'xd-video', '動画を見る — ' + channel.video.title);
              video.type = 'button';
              video.addEventListener('click', () => {
                const frame = el('iframe', 'xc-video'); frame.title = channel.video.title;
                frame.src = `https://www.youtube-nocookie.com/embed/${channel.video.id}`;
                frame.allow = 'encrypted-media; picture-in-picture'; frame.allowFullscreen = true;
                frame.referrerPolicy = 'strict-origin-when-cross-origin'; video.replaceWith(frame);
              }); channelHost.append(video);
            }
          }
        }).catch(() => {});
      }
    }
    const links = isTheme ? node.links : node.href ? [{ label: node.title + (node.href.startsWith('https:') ? '｜公式ページ' : '｜作品・詳細を見る'), href: node.href }] : [];
    if (links?.length) {
      const related = el('nav', 'xd-links'); related.setAttribute('aria-label', '関連ページ');
      links.slice(0, 2).forEach(link => related.append(makeLink(link.label, link.href))); detail.append(related);
    }
    if (!node.children && node.related?.length) {
      const related = el('div', 'xd-related'); related.append(el('h3', 'xd-section-label', '関連するテーマ'));
      node.related.slice(0, 2).forEach(id => related.append(makeButton(id))); detail.append(related);
    }
    const nextId = themes[(themes.indexOf(theme) + 1) % themes.length];
    const next = el('button', 'xd-next'); next.type = 'button'; next.dataset.next = nextId;
    next.append(el('small', '', 'NEXT → ' + nodes[nextId].title), el('span', '', nodes[nextId].ja));
    next.addEventListener('click', () => navigate(nextId)); detail.append(next);
    if (!wasOpen) {
      document.body.style.top = `-${returnY}px`;
      document.body.classList.add('xd-modal-open'); dialog.showModal();
    }
    restoreView(id, focus);
    if (!reduced.matches) detail.animate([{ opacity: .6, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.22,.68,.2,1)' });
    host.querySelector('.xd-status').textContent = group.ja + '。' + node.ja + 'の詳細を表示しました。';
  }
  function navigate(id) {
    if (!nodes[id] || id === current || closing) return;
    rememberView();
    if (current === 'home') {
      returnY = scrollY; returnTheme = themeFor(id);
      savedViews.clear();
      history.replaceState(state('home', 0, null), '', location.href);
    }
    const previous = current;
    history.pushState(state(id, (history.state?.depth || 0) + 1, previous), '', hashFor(id));
    render(id);
  }
  function dismiss() {
    if (!dialog.open || closing) return;
    rememberView();
    const depth = history.state?.xenDiscovery ? history.state.depth : 0;
    if (depth > 0) { closing = true; history.go(-depth); }
    else { history.replaceState(state('home', 0, null), '', '#home'); render('home'); }
  }
  cards.forEach(a => {
    a.setAttribute('aria-haspopup', 'dialog'); a.setAttribute('aria-controls', 'xd-dialog'); a.setAttribute('aria-expanded', 'false');
    a.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      clearTimeout(openingTimer); feedback?.cancel();
      cards.forEach(card => card.classList.remove('is-selecting'));
      a.classList.add('is-selecting');
      if (!reduced.matches) feedback = a.querySelector('svg').animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 240, easing: 'ease-out' });
      stage.classList.add('is-selecting');
      openingTimer = setTimeout(() => {
        a.classList.remove('is-selecting'); stage.classList.remove('is-selecting'); navigate(a.dataset.node);
      }, reduced.matches ? 0 : 220);
    });
    a.addEventListener('keydown', event => { if (event.key === ' ') { event.preventDefault(); a.click(); } });
  });
  back.addEventListener('click', () => {
    const parent = parents[current];
    if (history.state?.previous === parent && history.state.depth > 0) history.back();
    else navigate(parent);
  });
  close.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  function restore() {
    clearTimeout(openingTimer); feedback?.cancel(); stage.classList.remove('is-selecting');
    cards.forEach(a => a.classList.remove('is-selecting'));
    rememberView();
    returnY = history.state?.returnY ?? returnY; returnTheme = history.state?.returnTheme || returnTheme;
    closing = false; render(readHash());
  }
  addEventListener('popstate', restore);
  addEventListener('hashchange', () => { if (readHash() !== current) restore(); });
  reduced.addEventListener('change', () => { feedback?.cancel(); });
  const initial = readHash();
  returnTheme = themeFor(initial) || themes[0]; returnY = initial === 'home' ? scrollY : 0;
  history.replaceState(state(initial, 0, null), '', initial === 'home' ? location.href : hashFor(initial));
  document.querySelector('.xd-fallback').hidden = true;
  render(initial, initial !== 'home');
  document.documentElement.dataset.discoveryReady = 'true';
})();
