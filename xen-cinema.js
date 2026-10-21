/* User-initiated YouTube embeds. No slot dimensions or outside layout are changed. */
(() => {
  'use strict';
  if (window.XENCinema) return;
  let apiPromise;
  let sequence = 0;
  const mounted = new WeakSet();
  function videoURL(value) {
    try {
      const url = new URL(value, document.baseURI);
      if (url.protocol !== 'https:') return null;
      let id;
      if (url.hostname === 'youtu.be') id = url.pathname.slice(1);
      else if (['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)) {
        id = url.pathname.match(/^\/(?:embed|shorts)\/([\w-]{11})\/?$/)?.[1] || url.searchParams.get('v');
      }
      if (!/^[\w-]{11}$/.test(id || '')) return null;
      const embed = new URL('https://www.youtube-nocookie.com/embed/' + id);
      embed.search = url.search;
      embed.searchParams.delete('v');
      return {id, embed, watch:'https://www.youtube.com/watch?v=' + id};
    } catch { return null; }
  }
  function decorate(button) {
    if (button.querySelector('.xen-cinema-icon')) return;
    const icon = document.createElement('span');
    icon.className = 'xen-cinema-icon';icon.setAttribute('aria-hidden','true');
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('focusable','false');
    const path = document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M8 5 L19 12 L8 19 Z');svg.append(path);icon.append(svg);button.append(icon);
  }
  function thumbnail(image, id) {
    if (!image) return;
    const sources = ['maxresdefault','sddefault','hqdefault','mqdefault'].map(size =>
      'https://i.ytimg.com/vi/' + id + '/' + size + '.jpg');
    let attempt = 0;
    function next() {
      while (attempt < sources.length && image.src === sources[attempt]) attempt++;
      if (attempt < sources.length) image.src = sources[attempt++];
      else image.hidden = true;
    }
    image.addEventListener('error', next);
    image.addEventListener('load', () => { if (image.naturalWidth <= 120) next(); });
    if (image.complete && (!image.naturalWidth || image.naturalWidth <= 120)) next();
  }
  function loadAPI() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (!apiPromise) apiPromise = new Promise(resolve => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        try { previous?.(); } finally { resolve(window.YT); }
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';script.async = true;
      // The native iframe remains usable if the optional monitoring API fails.
      script.onerror = () => resolve(null);
      document.head.append(script);
    });
    return apiPromise;
  }
  function createFrame(source, title, original, onFailure) {
    const video = videoURL(source);
    if (!video) return null;
    const frame = original ? original.cloneNode(false) : document.createElement('iframe');
    frame.id = 'xen-cinema-player-' + (++sequence);
    frame.title = title || 'XEN YouTube作品';
    frame.loading = 'eager';
    const url = video.embed;
    url.searchParams.set('autoplay','1');
    url.searchParams.set('playsinline','1');
    url.searchParams.set('controls','1');
    url.searchParams.set('enablejsapi','1');
    if (/^https?:$/.test(location.protocol)) url.searchParams.set('origin',location.origin);
    // Never introduce muted playback or retry a blocked autoplay attempt.
    frame.src = url.href;
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    let loaded = false;
    let failed = false;
    const timeout = setTimeout(() => { if (!loaded) fail(); },20000);
    function fail() {
      clearTimeout(timeout);
      if (failed || !frame.isConnected) return;
      failed = true;
      onFailure?.(frame);
    }
    frame.addEventListener('load', () => { loaded = true;clearTimeout(timeout); },{once:true});
    frame.addEventListener('error',fail,{once:true});
    // Appending the iframe happens synchronously in the original click handler.
    // Monitoring is optional and must never delay that first playback request.
    loadAPI().then(api => {
      if (!api || !frame.isConnected || failed) return;
      new api.Player(frame, {events:{
        onReady: () => { loaded = true;clearTimeout(timeout); },
        onError: fail,
        onStateChange: event => { frame.dataset.playbackState = String(event.data); },
        onAutoplayBlocked: () => { frame.dataset.autoplayBlocked = 'true'; }
      }});
    }).catch(() => { /* Preserve the official player and its normal controls. */ });
    return frame;
  }
  function enhance(root = document) {
    root.querySelectorAll('.video-container > template[data-xen-youtube]').forEach(template => {
      if (mounted.has(template)) return;
      const original = template.content.querySelector('iframe');
      const video = videoURL(original?.getAttribute('src'));
      const slot = template.parentElement;
      const button = slot.querySelector('.xen-cinema-cover');
      if (!original || !video || !button) return;
      mounted.add(template);
      decorate(button);
      thumbnail(button.querySelector('img'),video.id);
      let active = false;
      function play() {
        if (active) return;
        active = true;
        const frame = createFrame(original.getAttribute('src'),original.title,original,failedFrame => {
          if (failedFrame.parentElement !== slot) return;
          const error = document.createElement('div');error.className = 'xen-cinema-error';
          const message = document.createElement('p');message.setAttribute('role','status');
          message.textContent = '動画を読み込めませんでした。';
          const retry = document.createElement('button');retry.type = 'button';retry.textContent = '再試行';
          retry.addEventListener('click', () => { error.remove();active = false;play(); });
          const link = document.createElement('a');link.href = video.watch;
          link.target = '_blank';link.rel = 'noopener noreferrer';link.textContent = 'YouTubeで見る';
          error.append(message,retry,link);failedFrame.replaceWith(error);retry.focus({preventScroll:true});
        });
        button.remove();
        slot.append(frame);
        frame.focus({preventScroll:true});
      }
      button.addEventListener('click',play);
    });
  }
  window.XENCinema = {enhance, decorate, createFrame, thumbnail};
  enhance();
})();
