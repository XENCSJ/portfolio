/* MUSIC reader: enhance the existing catalogue without rewriting its content.
   Release URLs belong to each card. An empty URL is deliberately not a link. */
(() => {
  'use strict';
  if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;
  const main = document.querySelector('.sound-page main');
  const cards = [...document.querySelectorAll('.sound-release-card')];
  if (!main || !cards.length) return;

  const services = [
    {key:'spotify', name:'Spotify', image:'xen-music-spotify-black.svg', host:'open.spotify.com', path:/^\/(album|track)\/[A-Za-z0-9]+\/?$/},
    {key:'appleMusic', name:'Apple Music', image:'xen-music-apple-black.svg', host:'music.apple.com', path:/^\/[a-z]{2}\/album\/[^/]+\/\d+\/?$/},
    {key:'youtube', name:'YouTube', image:'xen-music-youtube-black.png', host:/^(youtu\.be|www\.youtube\.com|youtube\.com)$/},
    {key:'lineMusic', name:'LINE MUSIC', image:'xen-music-line-black.png', host:'music.line.me', path:/^\/(launch|webapp\/album\/)/},
    {key:'youtubeMusic', name:'YouTube Music', image:'xen-music-youtube-music.png', host:'music.youtube.com', path:/^\/(playlist|watch)$/}
  ];
  function validURL(value, service) {
    try {
      const u = new URL(value);
      if (u.protocol !== 'https:' || u.username || u.password) return null;
      if (typeof service.host === 'string' ? u.hostname !== service.host : !service.host.test(u.hostname)) return null;
      if (service.path && !service.path.test(u.pathname)) return null;
      if (service.key === 'youtube' && !/^[\w-]{11}$/.test(u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') || '')) return null;
      if (service.key === 'lineMusic' && u.pathname === '/launch' && !u.searchParams.get('item')) return null;
      if (service.key === 'youtubeMusic' && !(u.searchParams.get('list') || u.searchParams.get('v'))) return null;
      return u.href;
    } catch { return null; }
  }
  function serviceRow(card) {
    const row = document.createElement('ul');
    row.className = 'music-services'; row.setAttribute('aria-label', '音楽配信サービス');
    services.forEach(service => {
      const li = document.createElement('li');
      const href = validURL(card.dataset[service.key + 'Url'], service);
      const item = document.createElement(href ? 'a' : 'span');
      item.className = 'music-service'; item.dataset.service = service.key;
      const label = service.name + (href ? '（新しいタブで開く）' : '（準備中）');
      item.setAttribute('aria-label', label); item.title = label;
      if (href) { item.href = href; item.target = '_blank'; item.rel = 'noopener noreferrer'; }
      else { item.setAttribute('aria-disabled', 'true'); item.setAttribute('role', 'link'); }
      const img = document.createElement('img');
      img.src = './' + service.image; img.alt = ''; img.width = 32; img.height = 32;
      img.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span'); name.className = 'music-service-name';
      name.textContent = service.name; name.lang = 'en';
      const status = document.createElement('span'); status.className = 'music-service-status';
      status.textContent = href ? '配信中 ↗' : '準備中'; status.setAttribute('aria-hidden', 'true');
      item.append(img, name, status); li.append(item); row.append(li);
    });
    return row;
  }
  const missingText = /^(?:(?:楽曲解説|歌詞|解説)(?:は|が)?(?:未掲載|未公開|準備中)(?:です)?[。．.]?|(?:未掲載|未公開|準備中|coming\s+soon|tbd)[。．.]?)$/i;
  function publishedContent(node) {
    if (!node || node.matches('[data-content-placeholder]')) return null;
    const copy = node.cloneNode(true);
    copy.querySelectorAll('[data-lyric-label], [data-content-placeholder], script, style').forEach(el => el.remove());
    const text = copy.textContent.replace(/[\s\u200b\ufeff]+/g, ' ').trim();
    return text && !missingText.test(text) ? node : null;
  }
  function contents(card) {
    return [
      {key:'about', en:'ABOUT THE SONG', name:'楽曲解説', node:publishedContent(card.querySelector('.song-description'))},
      {key:'lyrics', en:'LYRICS', name:'歌詞', node:publishedContent(card.querySelector('.sound-song-lyrics'))}
    ].filter(item => item.node);
  }
  const dialog = document.createElement('dialog');
  dialog.id = 'music-reader'; dialog.setAttribute('aria-labelledby', 'music-reader-title');
  dialog.innerHTML = `<div class="music-reader-toolbar"><span lang="en">XEN / MUSIC</span><button class="music-reader-close" type="button" aria-label="楽曲詳細を閉じる" autofocus>閉じる <span aria-hidden="true">×</span></button></div>
    <div class="music-reader-layout"><div class="music-reader-identity"></div><div class="music-reader-text"></div></div>`;
  main.append(dialog);
  const identity = dialog.querySelector('.music-reader-identity');
  const textArea = dialog.querySelector('.music-reader-text');
  let tabs = [], panels = [], scrollPositions = [];
  let activeCard, opener, pageY = 0, restored = [], bodyStyle = '';
  function selectTab(index, focus = false) {
    if (!panels[index]) return;
    panels.forEach((panel, i) => {
      if (!panel.hidden) scrollPositions[i] = panel.scrollTop;
      panel.hidden = i !== index;
      if (tabs[i]) {
        tabs[i].setAttribute('aria-selected', String(i === index));
        tabs[i].tabIndex = i === index ? 0 : -1;
      }
    });
    panels[index].scrollTop = scrollPositions[index] || 0;
    if (focus) tabs[index]?.focus({preventScroll:true});
  }
  function borrow(node, target) {
    const marker = document.createComment('music-reader-return');
    node.before(marker); restored.push({node, marker}); target.append(node);
  }
  function openReader(card, trigger) {
    if (dialog.open) return false;
    const entries = contents(card);
    // A release with no published text has no detail action or empty reader.
    if (!entries.length) return false;
    activeCard = card; opener = trigger; pageY = window.scrollY;
    identity.replaceChildren(); textArea.replaceChildren();
    tabs = []; panels = []; scrollPositions = entries.map(() => 0);
    const image = card.querySelector('.sound-song-cover').cloneNode(true);
    image.className = 'music-reader-cover'; image.loading = 'eager';
    const heading = document.createElement('h2'); heading.id = 'music-reader-title';
    heading.textContent = card.querySelector('.sound-song-title').textContent;
    identity.append(image, heading);
    ['.sound-artist', '.sound-song-credit'].forEach(selector => {
      const source = card.querySelector(selector);
      if (source) { const copy = source.cloneNode(true); copy.removeAttribute('id'); identity.append(copy); }
    });
    identity.append(serviceRow(card));
    const multiple = entries.length > 1;
    let tablist;
    if (multiple) {
      tablist = document.createElement('div'); tablist.className = 'music-reader-tabs';
      tablist.setAttribute('role', 'tablist'); tablist.setAttribute('aria-label', '楽曲の文章');
      textArea.append(tablist);
    }
    entries.forEach((entry, index) => {
      const label = document.createElement(multiple ? 'button' : 'h3');
      label.id = 'music-' + entry.key + (multiple ? '-tab' : '-heading');
      label.innerHTML = '<span lang="en">' + entry.en + '</span><small>' + entry.name + '</small>';
      const panel = document.createElement('div'); panel.id = 'music-' + entry.key + '-panel';
      panel.className = 'music-reader-panel'; panel.tabIndex = 0;
      panel.setAttribute('aria-labelledby', label.id);
      if (multiple) {
        label.type = 'button'; label.setAttribute('role', 'tab');
        label.setAttribute('aria-controls', panel.id); panel.setAttribute('role', 'tabpanel');
        label.addEventListener('click', () => selectTab(index));
        label.addEventListener('keydown', e => {
          let next;
          if (e.key === 'ArrowRight') next = (index + 1) % entries.length;
          if (e.key === 'ArrowLeft') next = (index + entries.length - 1) % entries.length;
          if (e.key === 'Home') next = 0;
          if (e.key === 'End') next = entries.length - 1;
          if (next !== undefined) { e.preventDefault(); selectTab(next, true); }
        });
        tabs.push(label); tablist.append(label);
      } else {
        label.className = 'music-reader-heading'; panel.setAttribute('role', 'region');
        textArea.append(label);
      }
      panels.push(panel); borrow(entry.node, panel); textArea.append(panel);
    });
    selectTab(0);
    bodyStyle = document.body.getAttribute('style') || '';
    document.body.style.position = 'fixed'; document.body.style.top = -pageY + 'px';
    document.body.style.width = '100%'; document.body.style.overflow = 'hidden';
    card.querySelector('.music-reader-open')?.setAttribute('aria-expanded', 'true');
    dialog.dataset.release = card.id; dialog.showModal();
    return true;
  }
  dialog.querySelector('.music-reader-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    restored.forEach(({node, marker}) => marker.replaceWith(node)); restored = [];
    identity.replaceChildren(); textArea.replaceChildren();
    tabs = []; panels = []; scrollPositions = [];
    document.body.setAttribute('style', bodyStyle);
    window.scrollTo({top:pageY, behavior:'instant'});
    activeCard?.querySelector('.music-reader-open')?.setAttribute('aria-expanded', 'false');
    opener?.focus({preventScroll:true}); activeCard = null;
  });
  cards.forEach(card => {
    const row = serviceRow(card);
    const entries = contents(card);
    const anchor = card.querySelector('details, .music-playback');
    if (anchor) anchor.before(row); else card.append(row);
    if (entries.length) {
      const button = document.createElement('button');
      button.className = 'music-reader-open'; button.type = 'button';
      button.innerHTML = '<span lang="en">VIEW DETAILS</span><small>' + entries.map(entry => entry.name).join('・') + '</small><span aria-hidden="true">↗</span>';
      button.setAttribute('aria-label', card.querySelector('.sound-song-title').textContent + 'の楽曲詳細を開く');
      button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', dialog.id); button.setAttribute('aria-expanded', 'false');
      button.addEventListener('click', () => openReader(card, button));
      row.after(button);
    }
    card.classList.add('music-reader-ready');
  });
  // Preserve native catalogue navigation for releases without published text.
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('.sound-category-links a, .sound-slide[data-position="active"]');
    if (!link || !link.getAttribute('href')?.startsWith('#')) return;
    const card = cards.find(card => '#' + card.id === link.getAttribute('href'));
    if (card && openReader(card, link)) e.preventDefault();
  });
})();
