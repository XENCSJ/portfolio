/* MUSIC reader: enhance the existing catalogue without rewriting its content.
   Release URLs belong to each card. An empty URL is deliberately not a link. */
(() => {
  'use strict';
  if (!window.HTMLDialogElement || !HTMLDialogElement.prototype.showModal) return;
  const main = document.querySelector('.sound-page main');
  const cards = [...document.querySelectorAll('.sound-release-card')];
  if (!main || !cards.length) return;

  const services = [
    {key:'spotify', name:'Spotify', host:'open.spotify.com', path:/^\/(album|track)\/[A-Za-z0-9]+\/?$/},
    {key:'appleMusic', name:'Apple Music', host:'music.apple.com', path:/^\/[a-z]{2}\/album\/[^/]+\/\d+\/?$/},
    {key:'youtube', name:'YouTube', host:/^(youtu\.be|www\.youtube\.com|youtube\.com)$/},
    {key:'lineMusic', name:'LINE MUSIC', host:'music.line.me', path:/^\/(launch|webapp\/album\/)/},
    {key:'youtubeMusic', name:'YouTube Music', host:'music.youtube.com', path:/^\/(playlist|watch)$/}
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
  // One 24-unit, currentColor SVG system for both dark and light surfaces.
  const serviceMarks = {
    spotify:'<circle cx="12" cy="12" r="9.5"/><path d="M6.5 9.2c3.8-1.2 7.7-.8 11 1M7.3 12.3c3.1-.9 6.2-.6 9.1.9M8.1 15.3c2.5-.6 4.8-.3 7 .7"/>',
    appleMusic:'<path d="M9 16V5l11-2v11M9 8l11-2"/><ellipse cx="6" cy="17.5" rx="3" ry="2.5"/><ellipse cx="17" cy="15.5" rx="3" ry="2.5"/>',
    youtube:'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3z" fill="currentColor" stroke="none"/>',
    lineMusic:'<path d="M21.5 10.8c0 4.8-5.2 8.2-12.4 10.2l.9-3.1C5.6 17.4 2.5 14.6 2.5 10.8c0-4.3 4.2-7.8 9.5-7.8s9.5 3.5 9.5 7.8Z"/><path d="M13 12V7l3 1"/><ellipse cx="11.2" cy="12.8" rx="1.8" ry="1.4"/>',
    youtubeMusic:'<circle cx="12" cy="12" r="9.5"/><circle cx="12" cy="12" r="6.6"/><path d="m10 8.5 5.5 3.5-5.5 3.5z" fill="currentColor" stroke="none"/>'
  };
  function serviceIcon(key) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('width','28'); svg.setAttribute('height','28');
    svg.setAttribute('fill','none'); svg.setAttribute('stroke','currentColor'); svg.setAttribute('stroke-width','1.7');
    svg.setAttribute('stroke-linecap','round'); svg.setAttribute('stroke-linejoin','round');
    svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
    svg.classList.add('music-service-icon'); svg.innerHTML = serviceMarks[key]; return svg;
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
      const img = serviceIcon(service.key);
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

  // Reuse the DESIGN prose classes; authored text and paragraph boundaries stay intact.
  main.querySelectorAll('.song-description').forEach(node => {
    node.classList.add('xen-prose-container');
    node.querySelectorAll('p').forEach(p => p.classList.add('xen-description'));
  });
  const drawers = [...main.querySelectorAll('.music-player-drawer')];
  const youtubeSlots = new Map();
  drawers.forEach(drawer => drawer.querySelectorAll('.video-container').forEach(slot => youtubeSlots.set(slot,slot.innerHTML)));
  function stopMedia(drawer, keepReady = false) {
    drawer.querySelectorAll('iframe').forEach(frame => {
      if (drawer.dataset.service === 'spotify') {
        frame.dataset.musicSrc = frame.getAttribute('src') || frame.dataset.musicSrc;
        frame.removeAttribute('src');
        if (keepReady && drawer.open && frame.dataset.musicSrc) frame.src = frame.dataset.musicSrc;
      } else frame.remove();
    });
    drawer.querySelectorAll('.video-container').forEach(slot => {
      if (!slot.querySelector('.xen-cinema-cover')) {
        slot.innerHTML = youtubeSlots.get(slot);
        window.XENCinema?.enhance(slot.parentElement);
      }
    });
  }
  function resumeMedia(drawer) {
    drawer.querySelectorAll('iframe[data-music-src]').forEach(frame => {
      if (!frame.hasAttribute('src')) frame.src = frame.dataset.musicSrc;
    });
  }
  function stopOthers(current) {
    drawers.forEach(drawer => { if (drawer !== current) stopMedia(drawer, true); });
  }
  drawers.forEach(drawer => {
    const summary = drawer.querySelector('summary');
    const panel = drawer.querySelector('.music-player-panel');
    let desiredOpen = false, animation;
    drawer.open = false; panel.inert = true;
    summary.setAttribute('aria-expanded','false');
    // Closed Spotify drawers do not load or play until deliberately opened.
    if (drawer.dataset.service === 'spotify') stopMedia(drawer);
    function settle(open) {
      drawer.open = open; drawer.style.height = ''; drawer.style.overflow = '';
      animation = null;
    }
    summary.addEventListener('click', event => {
      event.preventDefault();
      desiredOpen = !desiredOpen;
      const start = drawer.getBoundingClientRect().height;
      if (animation) { animation.cancel(); animation = null; }
      summary.setAttribute('aria-expanded',String(desiredOpen)); panel.inert = !desiredOpen;
      if (desiredOpen) { drawer.open = true; stopOthers(drawer); resumeMedia(drawer); }
      else stopMedia(drawer);
      drawer.style.height = '';
      const end = desiredOpen ? drawer.getBoundingClientRect().height : summary.getBoundingClientRect().height;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches || !drawer.animate) { settle(desiredOpen); return; }
      drawer.style.overflow = 'hidden';
      animation = drawer.animate({height:[start+'px',end+'px']},{duration:260,easing:'cubic-bezier(.22,1,.36,1)'});
      animation.onfinish = () => settle(desiredOpen);
    });
    // Also reflect native/programmatic changes, without interfering with animation.
    drawer.addEventListener('toggle', () => {
      if (animation) return;
      desiredOpen = drawer.open; panel.inert = !desiredOpen;
      summary.setAttribute('aria-expanded',String(desiredOpen));
      if (!desiredOpen) stopMedia(drawer);
    });
  });
  // YouTube's existing one-click player retains ownership of playback.
  main.addEventListener('click', event => {
    const trigger = event.target.closest('.xen-cinema-cover');
    const drawer = trigger?.closest('.music-player-drawer');
    if (drawer) stopOthers(drawer);
  }, true);
  // Focusing an already-open Spotify player makes it the active media source.
  // Neither this nor stopOthers closes the other independent drawers.
  window.addEventListener('blur', () => setTimeout(() => {
    const frame = document.activeElement;
    if (frame?.tagName !== 'IFRAME') return;
    const drawer = frame.closest('.music-player-drawer');
    if (drawer?.open) { stopOthers(drawer); resumeMedia(drawer); }
  }, 0));

  // Confirmed MUSIC contract: fixed headings/close control, only the active panel scrolls.
  // Keep this shared modal and body scroll lock when changing other pages or disclosures.
  const dialog = document.createElement('dialog');
  dialog.id = 'music-reader'; dialog.setAttribute('aria-labelledby', 'music-reader-title');
  dialog.innerHTML = `<div class="music-reader-toolbar"><span lang="en">XEN / MUSIC</span><button class="music-reader-close" type="button" aria-label="楽曲詳細を閉じる" autofocus>閉じる <span aria-hidden="true">×</span></button></div>
    <div class="music-reader-layout"><div class="music-reader-identity"></div><div class="music-reader-text"></div></div>`;
  main.append(dialog);
  const identity = dialog.querySelector('.music-reader-identity');
  const textArea = dialog.querySelector('.music-reader-text');
  let tabs = [], panels = [];
  let activeCard, opener, pageY = 0, restored = [], bodyStyle = '';
  function selectTab(index, focus = false) {
    if (!panels[index]) return;
    panels.forEach((panel, i) => {
      panel.hidden = i !== index;
      if (tabs[i]) {
        tabs[i].setAttribute('aria-selected', String(i === index));
        tabs[i].tabIndex = i === index ? 0 : -1;
      }
    });
    panels[index].scrollTop = 0;
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
    tabs = []; panels = [];
    const image = card.querySelector('.sound-song-cover').cloneNode(true);
    image.className = 'music-reader-cover'; image.loading = 'eager';
    const heading = document.createElement('h2'); heading.id = 'music-reader-title';
    heading.textContent = card.querySelector('.sound-song-title').textContent;
    identity.append(image, heading);
    ['.sound-artist', '.sound-song-credit'].forEach(selector => {
      const source = card.querySelector(selector);
      if (source) { const copy = source.cloneNode(true); copy.removeAttribute('id'); identity.append(copy); }
    });
    // Distribution links belong only to the catalogue, never to the text reader.
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
    tabs = []; panels = [];
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
  // VIEW DETAILS exclusively owns the reader; catalogue selection stays on the page.
})();
