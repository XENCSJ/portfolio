/* MUSIC reader: enhance the existing catalogue without rewriting its content.
   Release URLs belong to each card. An empty URL is deliberately not a link. */
(() => {
  'use strict';
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

  // Each release owns its inline drawer; genre navigation and players stay separate.
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  cards.forEach(card => {
    const entries = contents(card);
    const row = serviceRow(card);
    const anchor = card.querySelector('details, .music-playback');
    if (anchor) anchor.before(row); else card.append(row);
    if (entries.length) {
      const drawer = document.createElement('details');
      drawer.className = 'music-text-drawer';
      const toggle = document.createElement('summary');
      toggle.className = 'music-reader-open';
      toggle.innerHTML = '<span lang="en">VIEW DETAILS</span><small>' + entries.map(entry => entry.name).join('・') + '</small><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
      toggle.setAttribute('aria-label', card.querySelector('.sound-song-title').textContent + 'の楽曲詳細');
      const content = document.createElement('div');
      content.className = 'music-text-content'; content.id = card.id + '-details';
      toggle.setAttribute('aria-controls', content.id);
      const tabs = [], panels = [];
      const multiple = entries.length > 1;
      const labels = document.createElement('div'); labels.className = 'music-reader-tabs';
      if (multiple) { labels.setAttribute('role','tablist'); labels.setAttribute('aria-label','楽曲の文章'); }
      content.append(labels);
      function selectTab(index, focus = false) {
        panels.forEach((panel,i) => {
          panel.hidden = i !== index;
          if (multiple) { tabs[i].setAttribute('aria-selected',String(i === index)); tabs[i].tabIndex = i === index ? 0 : -1; }
        });
        if (focus) tabs[index].focus({preventScroll:true});
      }
      entries.forEach((entry,index) => {
        const label = document.createElement(multiple ? 'button' : 'h4');
        label.id = card.id + '-' + entry.key + '-tab';
        label.innerHTML = '<span lang="en">' + entry.en + '</span><small>' + entry.name + '</small>';
        const panel = document.createElement('div');
        panel.className = 'music-reader-panel'; panel.id = card.id + '-' + entry.key + '-content';
        panel.setAttribute('aria-labelledby',label.id);
        panel.setAttribute('role',multiple ? 'tabpanel' : 'region');
        if (multiple) {
          label.type = 'button'; label.setAttribute('role','tab'); label.setAttribute('aria-controls',panel.id);
          label.addEventListener('click',() => selectTab(index));
          label.addEventListener('keydown',event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % entries.length;
            if (event.key === 'ArrowLeft') next = (index + entries.length - 1) % entries.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = entries.length - 1;
            if (next !== undefined) { event.preventDefault(); selectTab(next,true); }
          });
        }
        tabs.push(label); labels.append(label); panel.append(entry.node); panels.push(panel); content.append(panel);
      });
      selectTab(0); drawer.append(toggle,content); row.after(drawer);
      let target = false, animation;
      function settle() {
        if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
        drawer.open = target; drawer.style.height = '';
        content.inert = !target; toggle.setAttribute('aria-expanded',String(target));
      }
      toggle.addEventListener('click',event => {
        event.preventDefault();
        const start = drawer.getBoundingClientRect().height;
        if (animation) { animation.onfinish = null; animation.cancel(); animation = null; }
        target = !target;
        content.inert = !target; toggle.setAttribute('aria-expanded',String(target));
        if (reduced.matches || !drawer.animate) { settle(); return; }
        drawer.open = true;
        const end = target ? drawer.getBoundingClientRect().height : toggle.getBoundingClientRect().height + parseFloat(getComputedStyle(toggle).marginTop);
        animation = drawer.animate([{height:start+'px'},{height:end+'px'}],{duration:260,easing:'cubic-bezier(.22,.68,0,1)',fill:'both'});
        animation.onfinish = settle;
      });
      content.addEventListener('keydown',event => { if (event.key === 'Escape') { target = false; settle(); toggle.focus({preventScroll:true}); } });
      reduced.addEventListener('change',settle);
      window.addEventListener('resize',settle,{passive:true});
      settle();
    }
    card.classList.add('music-reader-ready');
  });
})();
