/* Public, prevalidated JSON only. No API credentials or initial player requests. */
(() => {
  'use strict';
  const section = document.getElementById('latest-videos');
  if (!section) return;
  const grid = section.querySelector('.xen-latest-grid');
  let dialog, playerSlot, fallback, lastTrigger;
  function openVideo(video, trigger) {
    // YouTube requires a player viewport >=200x200. Keep 16:9 on small devices.
    if (!('HTMLDialogElement' in window) || window.innerWidth < 374 || !video.embeddable || video.madeForKids) {
      window.location.assign(video.url);
      return;
    }
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'xen-latest-dialog';
      dialog.setAttribute('aria-label', 'YouTube 動画プレーヤー');
      const bar = document.createElement('div');
      bar.className = 'xen-latest-dialog-bar';
      const close = document.createElement('button');
      close.type = 'button'; close.className = 'xen-latest-close';
      close.textContent = '閉じる ×'; close.addEventListener('click', () => dialog.close());
      bar.append(close);
      playerSlot = document.createElement('div'); playerSlot.className = 'xen-latest-player';
      fallback = document.createElement('a'); fallback.className = 'xen-latest-fallback';
      fallback.textContent = '再生できない場合は YouTube で見る ↗';
      fallback.target = '_blank'; fallback.rel = 'noopener';
      dialog.append(bar, playerSlot, fallback);
      dialog.addEventListener('close', () => { playerSlot.replaceChildren(); lastTrigger?.focus(); });
      document.body.append(dialog);
    }
    lastTrigger = trigger;
    fallback.href = video.url;
    const frame = document.createElement('iframe');
    frame.title = video.title;
    // Autoplay is requested only as the direct result of a user's play click.
    frame.src = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&playsinline=1&rel=0`;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    playerSlot.replaceChildren(frame);
    dialog.showModal();
  }
  function valid(video) {
    if (!video || !/^[A-Za-z0-9_-]{11}$/.test(video.id) || typeof video.title !== 'string' || !video.title.trim()) return false;
    if (video.url !== `https://www.youtube.com/watch?v=${video.id}` || !Number.isFinite(Date.parse(video.publishedAt))) return false;
    if (typeof video.embeddable !== 'boolean' || typeof video.madeForKids !== 'boolean') return false;
    try { const u = new URL(video.thumbnail); return u.protocol === 'https:' && ['i.ytimg.com','img.youtube.com'].includes(u.hostname); } catch { return false; }
  }
  async function init() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch('./youtube-latest.json', {cache:'no-cache', signal:controller.signal});
      if (!response.ok) throw new Error('Video data unavailable');
      const data = await response.json();
      const age = Date.now() - Date.parse(data.validatedAt);
      if (data.schemaVersion !== 1 || data.status !== 'verified' || !Number.isFinite(age) || age < -300000 || age > 30*86400000 || !Array.isArray(data.items) || data.items.length > 4 || !data.items.every(valid)) return;
      const fragment = document.createDocumentFragment();
      for (const video of data.items) {
        const li = document.createElement('li'); li.className = 'xen-latest-item';
        const button = document.createElement('button'); button.className = 'xen-latest-play'; button.type = 'button';
        button.setAttribute('aria-label', `${video.title} を再生`);
        const img = document.createElement('img'); img.src = video.thumbnail; img.alt = ''; img.width = 640; img.height = 360; img.loading = 'lazy'; img.decoding = 'async';
        const icon = document.createElement('span'); icon.setAttribute('aria-hidden', 'true');
        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 30 30');
        const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d','M10 5 L26 15 L10 25 Z'); svg.append(path); icon.append(svg);
        button.append(img, icon); button.addEventListener('click', () => openVideo(video, button));
        const title = document.createElement('h3'); title.className = 'xen-latest-title';
        const link = document.createElement('a'); link.href = video.url; link.textContent = video.title; link.title = video.title; link.target = '_blank'; link.rel = 'noopener';
        title.append(link); li.append(button, title); fragment.append(li);
      }
      grid.replaceChildren(fragment); section.hidden = false;
    } catch { /* Isolate load failures; never disturb the existing page. */ }
    finally { clearTimeout(timeout); }
  }
  init();
})();
