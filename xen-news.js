/* Choose one related image per visit; keep static thumbnails as safe fallbacks. */
(() => {
  const list = document.querySelector('.news-page #news-list');
  if (!list) return;
  const fallback = image => {
    const frame = image.closest('.news-thumb');
    if (!frame || frame.classList.contains('is-logo')) return;
    frame.classList.add('is-logo');
    image.style.removeProperty('object-position');
    image.src = './xen-header-logo.png';
  };
  list.addEventListener('error', e => {
    if (e.target instanceof HTMLImageElement) fallback(e.target);
  }, true);
  list.querySelectorAll('img').forEach(image => {
    if (image.complete && !image.naturalWidth) fallback(image);
  });

  const pages = new Map();
  const getPage = url => {
    const key = url.origin + url.pathname;
    if (!pages.has(key)) {
      pages.set(key, fetch(key).then(response => {
        if (!response.ok) throw new Error('NEWS image source unavailable');
        return response.text();
      }).then(html => {
        // Template contents stay inert: only the chosen image is loaded.
        const template = document.createElement('template');
        template.innerHTML = html;
        return template.content;
      }));
    }
    return pages.get(key);
  };
  const imagePath = (value, base) => decodeURIComponent(new URL(value, base).pathname);
  const candidatesFor = async item => {
    const ids = item.contentIds || [];
    if (!ids.some(id => /^(image|design|sound):/.test(id))) return [];
    const url = new URL(item.url, document.baseURI);
    if (url.origin !== location.origin || !url.pathname.endsWith('.html')) return [];
    const source = await getPage(url);
    const gallery = new Map();
    source.querySelectorAll('a.gallery-item[href]').forEach(link => {
      gallery.set(imagePath(link.getAttribute('href'), url), link.querySelector('img'));
    });
    const images = [];
    ids.forEach(id => {
      if (id.startsWith('image:')) {
        const path = imagePath('./' + id.slice(6).split('/').map(encodeURIComponent).join('/'), url);
        const image = gallery.get(path);
        if (image) images.push(image);
      } else if (/^(design|sound):/.test(id)) {
        const work = source.getElementById(id.slice(id.indexOf(':') + 1));
        if (!work) return;
        const selector = id.startsWith('sound:') ? '.sound-song-cover' : '.gallery-item img, .xg-stage img';
        images.push(...work.querySelectorAll(selector));
      }
    });
    const unique = new Map();
    images.forEach(image => {
      const value = image.getAttribute('src');
      if (!value) return;
      const src = new URL(value, url);
      if (src.origin !== location.origin) return;
      const frame = image.closest('.gallery-item');
      const position = image.style.objectPosition || (frame && frame.style.getPropertyValue('--gallery-position')) || '';
      unique.set(src.href, { src: src.href, position });
    });
    return [...unique.values()];
  };
  const selection = fetch('./news-archive.json', { cache: 'no-cache' }).then(response => {
    if (!response.ok) throw new Error('NEWS archive unavailable');
    return response.json();
  }).then(async archive => {
    const byId = new Map(archive.map(item => [item.id, item]));
    return Promise.all([...list.querySelectorAll('[data-news-id]')].map(async row => {
      const image = row.querySelector('.news-thumb img');
      const item = byId.get(row.dataset.newsId);
      if (!image || !item) return null;
      try {
        const candidates = await candidatesFor(item);
        return candidates.length > 1 ? { image, candidates } : null;
      } catch (_) {
        return null;
      }
    }));
  }).catch(() => []);
  let visit = 0;
  const randomize = async () => {
    const currentVisit = ++visit;
    for (const entry of await selection) {
      if (!entry) continue;
      const { image, candidates } = entry;
      const selected = candidates[Math.floor(Math.random() * candidates.length)];
      const preload = new Image();
      preload.onload = () => {
        if (currentVisit !== visit) return;
        image.closest('.news-thumb').classList.remove('is-logo');
        if (selected.position) image.style.objectPosition = selected.position;
        else image.style.removeProperty('object-position');
        image.src = selected.src;
      };
      // A failed candidate leaves the existing static thumbnail in place.
      preload.src = selected.src;
    }
  };
  randomize();
  window.addEventListener('pageshow', event => {
    if (event.persisted) randomize();
  });
})();
