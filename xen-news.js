/* NEWS-only shuffled crossfades; static HTML remains the no-JavaScript fallback. */
(() => {
  const list = document.querySelector('.news-page #news-list');
  if (!list) return;
  const fallback = image => {
    const frame = image.closest('.news-thumb');
    if (!frame || frame.classList.contains('is-logo') || image.classList.contains('news-slide-next')) return;
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
        // Source markup stays inert; slideshow images load individually when needed.
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
    const originals = [];
    ids.forEach(id => {
      if (id.startsWith('image:')) {
        const path = imagePath('./' + id.slice(6).split('/').map(encodeURIComponent).join('/'), url);
        const image = gallery.get(path);
        if (image) images.push(image);
        else originals.push({ src: new URL('./' + id.slice(6).split('/').map(encodeURIComponent).join('/'), url).href, position: '', portrait: item.category === 'SNAP' });
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
      unique.set(src.href, { src: src.href, position, portrait: item.category === 'SNAP' });
    });
    originals.forEach(candidate => { if (!unique.has(candidate.src)) unique.set(candidate.src, candidate); });
    return [...unique.values()];
  };
  const INTERVAL = 4000;
  const FADE = 800;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const controllers = new Map();
  const shuffle = values => {
    const result = values.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
  const loadImage = (candidate, first) => {
    const image = new Image();
    image.alt = '';
    image.width = 480;
    image.height = 270;
    image.decoding = 'async';
    image.fetchPriority = first ? 'high' : 'low';
    image.style.objectPosition = candidate.position || 'center';
    return new Promise(resolve => {
      image.onload = async () => {
        try { await image.decode(); } catch (_) { /* onload still provides a usable image. */ }
        if (!candidate.position && candidate.portrait && image.naturalHeight > image.naturalWidth) {
          image.style.objectPosition = 'center 35%';
        }
        resolve(image);
      };
      image.onerror = () => resolve(null);
      image.src = candidate.src;
    });
  };
  const makeSlideshow = (frame, candidates) => {
    // One shuffle per visit. Repeating this permutation also prevents repeats at its boundary.
    const order = shuffle(candidates);
    let current = frame.querySelector('img');
    let index = -1;
    let visible = false;
    let alive = true;
    let busy = false;
    let timer;
    let fading;
    let incoming;
    let pending;
    const failed = new Set();
    const active = () => alive && visible && !document.hidden;
    const playable = () => active() && !motion.matches && order.length - failed.size > 1;
    const nextIndex = () => {
      for (let offset = 1; offset <= order.length; offset++) {
        const candidate = (index + offset) % order.length;
        if (candidate !== index && !failed.has(candidate)) return candidate;
      }
      return -1;
    };
    const prepare = () => {
      if (!pending && active() && (index < 0 || playable())) {
        const target = nextIndex();
        if (target >= 0) pending = { target, image: loadImage(order[target], index < 0) };
      }
      return pending;
    };
    const finishFade = () => {
      clearTimeout(fading);
      if (!incoming) return;
      current.remove();
      current = incoming;
      incoming = null;
      current.classList.remove('news-slide-next', 'is-visible');
      current.style.removeProperty('opacity');
    };
    const schedule = () => {
      clearTimeout(timer);
      if (!playable()) return;
      prepare(); // Only the next slide is fetched, after the initial image has decoded.
      timer = setTimeout(advance, INTERVAL);
    };
    const advance = async () => {
      if (!active() || busy || (index >= 0 && !playable())) return;
      const next = prepare();
      if (!next) return;
      busy = true;
      const image = await next.image;
      busy = false;
      if (!alive) return;
      if (!active() || (index >= 0 && motion.matches)) return;
      pending = null;
      if (!image) {
        failed.add(next.target);
        // Keep the last good image and skip unavailable candidates without a blank frame.
        advance();
        return;
      }
      finishFade();
      frame.classList.remove('is-logo');
      const first = index < 0;
      index = next.target;
      if (first) {
        current.replaceWith(image);
        current = image;
      } else {
        incoming = image;
        image.classList.add('news-slide-next');
        image.setAttribute('aria-hidden', 'true');
        frame.append(image);
        // Commit opacity:0 before fading the next image over the opaque current image.
        void image.offsetWidth;
        image.classList.add('is-visible');
        fading = setTimeout(finishFade, FADE);
      }
      schedule();
    };
    const update = () => {
      clearTimeout(timer);
      if (!active() || motion.matches) finishFade();
      if (!active()) return;
      if (index < 0) advance();
      else schedule();
    };
    return {
      setVisible(value) { visible = value; update(); },
      update,
      destroy() {
        alive = false;
        clearTimeout(timer);
        finishFade();
        pending = null;
      }
    };
  };
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => controllers.get(entry.target)?.setVisible(entry.isIntersecting));
  }, { threshold: 0 }) : null;

  const selection = fetch('./news-archive.json', { cache: 'no-cache' }).then(response => {
    if (!response.ok) throw new Error('NEWS archive unavailable');
    return response.json();
  }).then(async archive => {
    const byId = new Map(archive.map(item => [item.id, item]));
    return Promise.all([...list.querySelectorAll('[data-news-id]')].map(async row => {
      const frame = row.querySelector('.news-thumb');
      const item = byId.get(row.dataset.newsId);
      if (!frame || !item) return null;
      try {
        const candidates = await candidatesFor(item);
        return candidates.length > 1 ? { frame, candidates } : null;
      } catch (_) {
        return null;
      }
    }));
  }).catch(() => []);
  let visit = 0;
  const start = async () => {
    const currentVisit = ++visit;
    observer?.disconnect();
    controllers.forEach(controller => controller.destroy());
    controllers.clear();
    const entries = await selection;
    if (currentVisit !== visit) return;
    entries.forEach(entry => {
      if (!entry) return;
      const { frame, candidates } = entry;
      const controller = makeSlideshow(frame, candidates);
      controllers.set(frame, controller);
      if (observer) observer.observe(frame);
      else controller.setVisible(true);
    });
  };
  const update = () => controllers.forEach(controller => controller.update());
  document.addEventListener('visibilitychange', update);
  if (motion.addEventListener) motion.addEventListener('change', update);
  else motion.addListener(update);
  window.addEventListener('pagehide', () => {
    ++visit;
    observer?.disconnect();
    controllers.forEach(controller => controller.destroy());
    controllers.clear();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted) start();
  });
  start();
})();
