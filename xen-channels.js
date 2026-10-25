/* One verified dataset for the discovery panel and CREATOR channel section. */
(() => {
  'use strict';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  let data;
  function load() { return data ||= fetch('./xen-channels.json').then(r => { if (!r.ok) throw new Error('Channel data unavailable'); return r.json(); }); }
  function artwork(channel, type) {
    const img = el('img', `xc-${type}`);
    img.src = channel[type]; img.alt = `${channel.label} 公式${type === 'banner' ? 'バナー' : 'チャンネルアイコン'}`;
    img.width = type === 'banner' ? (channel.imageWidth || 2560) : 900; img.height = type === 'banner' ? (channel.imageHeight || 424) : 900;
    img.loading = 'lazy'; img.decoding = 'async'; return img;
  }
  function link(channel) { const a = el('a', '', 'YOUTUBE CHANNEL ↗'); a.href = channel.url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('aria-label', `${channel.label} 公式YouTubeチャンネル（新しいタブで開く）`); return a; }
  function content(channel) {
    const body = el('div', 'xc-body');
    body.append(artwork(channel, 'banner'), el('p', '', channel.summary));
    const more = el('details', 'xc-more'); more.append(el('summary', '', 'MORE — チャンネルについて'));
    // The original official description is text, not executable markup.
    more.append(el('p', '', channel.more));
    if (channel.video) {
      more.append(el('h3', '', channel.video.title));
      const play = el('button', 'xc-load-video', '動画を読み込む — YouTube'); play.type = 'button';
      play.addEventListener('click', () => {
        const frame = el('iframe', 'xc-video'); frame.title = channel.video.title;
        frame.src = `https://www.youtube-nocookie.com/embed/${channel.video.id}`;
        frame.allow = 'encrypted-media; picture-in-picture'; frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin'; play.replaceWith(frame);
      }); more.append(play);
    }
    body.append(more, link(channel)); return body;
  }
  window.XenChannels = Object.freeze({ load, artwork, content });
})();
