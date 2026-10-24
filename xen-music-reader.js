/* MUSIC reader: enhance the existing catalogue without rewriting its content.
   Release URLs belong to each card. An empty URL is deliberately not a link. */
(() => {
  'use strict';
  if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;
  const main = document.querySelector('.sound-page main');
  const cards = [...document.querySelectorAll('.sound-release-card')];
  if (!main || !cards.length) return;

  const services = [
    {key:'spotify', name:'Spotify', image:'xen-music-spotify.svg', host:'open.spotify.com', path:/^\/(album|track)\/[A-Za-z0-9]+\/?$/},
    {key:'appleMusic', name:'Apple Music', image:'xen-music-apple.svg', host:'music.apple.com', path:/^\/[a-z]{2}\/album\/[^/]+\/\d+\/?$/},
    {key:'youtube', name:'YouTube', image:'xen-music-youtube.png', host:/^(youtu\.be|www\.youtube\.com|youtube\.com)$/},
    {key:'lineMusic', name:'LINE MUSIC', image:'xen-music-line.png', host:'music.line.me', path:/^\/(launch|webapp\/album\/)/},
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
      const status = document.createElement('span'); status.className = 'music-service-status';
      status.textContent = href ? '↗' : '準備中'; status.setAttribute('aria-hidden', 'true');
      item.append(img, status); li.append(item); row.append(li);
    });
    return row;
  }
  const dialog = document.createElement('dialog');
  dialog.id = 'music-reader'; dialog.setAttribute('aria-labelledby', 'music-reader-title');
  dialog.innerHTML = `<div class="music-reader-toolbar"><span lang="en">XEN / MUSIC</span><button class="music-reader-close" type="button" aria-label="楽曲詳細を閉じる" autofocus>閉じる <span aria-hidden="true">×</span></button></div>
    <div class="music-reader-layout"><div class="music-reader-identity"></div><div class="music-reader-text">
      <div class="music-reader-tabs" role="tablist" aria-label="楽曲の文章">
        <button id="music-about-tab" role="tab" aria-selected="true" aria-controls="music-about-panel" type="button"><span lang="en">ABOUT THE SONG</span><small>楽曲解説</small></button>
        <button id="music-lyrics-tab" role="tab" aria-selected="false" aria-controls="music-lyrics-panel" tabindex="-1" type="button"><span lang="en">LYRICS</span><small>歌詞</small></button>
      </div>
      <div id="music-about-panel" class="music-reader-panel" role="tabpanel" aria-labelledby="music-about-tab" tabindex="0"></div>
      <div id="music-lyrics-panel" class="music-reader-panel" role="tabpanel" aria-labelledby="music-lyrics-tab" tabindex="0" hidden></div>
    </div></div>`;
  main.append(dialog);
  const identity = dialog.querySelector('.music-reader-identity');
  const tabs = [...dialog.querySelectorAll('[role="tab"]')];
  const panels = [...dialog.querySelectorAll('[role="tabpanel"]')];
  let activeCard, opener, pageY = 0, restored = [], bodyStyle = '';
  const scrollPositions = [0, 0];
  function selectTab(index, focus = false) {
    tabs.forEach((tab, i) => {
      if (!panels[i].hidden) scrollPositions[i] = panels[i].scrollTop;
      tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    panels[index].scrollTop = scrollPositions[index];
    if (focus) tabs[index].focus({preventScroll:true});
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i));
    tab.addEventListener('keydown', e => {
      let next;
      if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (e.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { e.preventDefault(); selectTab(next, true); }
    });
  });
  function borrow(node, target) {
    const marker = document.createComment('music-reader-return');
    node.before(marker); restored.push({node, marker}); target.append(node);
  }
  function emptyText(panel, text) {
    const p = document.createElement('p'); p.className = 'music-reader-empty'; p.textContent = text; panel.append(p);
  }
  function openReader(card, trigger) {
    if (dialog.open) return;
    activeCard = card; opener = trigger; pageY = window.scrollY;
    identity.replaceChildren(); panels.forEach(panel => panel.replaceChildren());
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
    const about = card.querySelector('.song-description');
    const lyrics = card.querySelector('.sound-song-lyrics');
    if (about) borrow(about, panels[0]); else emptyText(panels[0], '楽曲解説は未掲載です。');
    if (lyrics) borrow(lyrics, panels[1]); else emptyText(panels[1], '歌詞は未掲載です。');
    const media = [...card.querySelectorAll('.sound-media-accordion')].filter(el => el.querySelector('iframe, template[data-xen-youtube], .video-container'));
    if (media.length) {
      const holder = document.createElement('div'); holder.className = 'music-reader-media';
      media.forEach(el => borrow(el, holder)); panels[0].append(holder);
    }
    scrollPositions.fill(0); panels.forEach(panel => {panel.scrollTop = 0;}); selectTab(0);
    bodyStyle = document.body.getAttribute('style') || '';
    document.body.style.position = 'fixed'; document.body.style.top = -pageY + 'px';
    document.body.style.width = '100%'; document.body.style.overflow = 'hidden';
    card.querySelector('.music-reader-open').setAttribute('aria-expanded', 'true');
    dialog.dataset.release = card.id; dialog.showModal();
  }
  dialog.querySelector('.music-reader-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    restored.forEach(({node, marker}) => marker.replaceWith(node)); restored = [];
    identity.replaceChildren(); panels.forEach(panel => panel.replaceChildren());
    document.body.setAttribute('style', bodyStyle);
    window.scrollTo({top:pageY, behavior:'instant'});
    activeCard?.querySelector('.music-reader-open').setAttribute('aria-expanded', 'false');
    opener?.focus({preventScroll:true}); activeCard = null;
  });
  cards.forEach(card => {
    const row = serviceRow(card);
    const button = document.createElement('button');
    button.className = 'music-reader-open'; button.type = 'button';
    button.innerHTML = '<span lang="en">VIEW DETAILS</span><small>楽曲解説・歌詞</small><span aria-hidden="true">↗</span>';
    button.setAttribute('aria-label', card.querySelector('.sound-song-title').textContent + 'の楽曲詳細を開く');
    button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', dialog.id); button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => openReader(card, button));
    const firstDetail = card.querySelector('details');
    if (firstDetail) firstDetail.before(row, button); else card.append(row, button);
    card.classList.add('music-reader-ready');
  });
  // Existing genre disclosures and carousel navigation keep their own behavior.
  // Their song-detail anchors now open the same per-release reader.
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const link = e.target.closest('.sound-category-links a, .sound-slide[data-position="active"]');
    if (!link || !link.getAttribute('href')?.startsWith('#')) return;
    const card = cards.find(card => '#' + card.id === link.getAttribute('href'));
    if (card) { e.preventDefault(); openReader(card, link); }
  });
})();
