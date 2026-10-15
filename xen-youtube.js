/* Shared STORYBOOKS player and motion for every YouTube work. */
/* Keep a direct YouTube link and an image fallback. Load the player only on request. */
document.querySelectorAll('.video-launch').forEach((link) => {
  const thumbnail = link.querySelector('img');
  const id = link.dataset.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;

  // Both sources are 16:9. hqdefault embeds black bars in a 4:3 image.
  // Some videos return a small placeholder instead of a max-resolution image.
  if (thumbnail) {
    const fallback = 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg';
    const checkThumbnail = () => {
      if (thumbnail.src !== fallback &&
          (!thumbnail.naturalWidth || thumbnail.naturalWidth <= 120 ||
           Math.abs(thumbnail.naturalWidth / thumbnail.naturalHeight - 16 / 9) > 0.02)) {
        thumbnail.src = fallback;
      }
    };
    thumbnail.addEventListener('load', checkThumbnail);
    thumbnail.addEventListener('error', checkThumbnail);
    if (thumbnail.complete) checkThumbnail();
  }

  link.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const frame = document.createElement('iframe');
    // Retain per-video URL parameters supplied with a cinematic template.
    const original = link.parentElement.querySelector('template.cinematic-player')?.content.querySelector('iframe');
    const url = new URL('https://www.youtube-nocookie.com/embed/' + id);
    if (original) url.search = new URL(original.src).search;
    url.searchParams.set('autoplay', '1');
    frame.src = url.href;
    frame.title = link.closest('.work')?.querySelector('h3')?.textContent || 'XEN YouTube作品';
    frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    link.parentElement.replaceChildren(frame);
    frame.focus();
  });
});


(() => {
  const init = () => {
    if (!document.body.matches('body.xen-youtube-unified')) return;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches || !('IntersectionObserver' in window)) return;
    const entries = [];
    document.querySelectorAll('main .work:has(.video-container)').forEach(work => {
      [
        ['h3', 0], ['.video-container', 80],
        ['.story-subtitle, .animation-subtitle, .cinematic-subtitle', 100], ['.story-description, .animation-description, .cinematic-description, .studio-film-caption', 180], ['.video-source', 240]
      ].forEach(([selector, delay]) => {
        const node = work.querySelector(selector);
        if (!node) return;
        node.dataset.collectionEntry = '';
        node.style.setProperty('--collection-delay', `${delay}ms`);
        entries.push(node);
      });
    });
    const entrance = new IntersectionObserver(records => {
      records.forEach(({target, isIntersecting}) => {
        if (!isIntersecting) return;
        if (!preference.matches) target.classList.add('collection-entered');
        entrance.unobserve(target);
      });
    }, {threshold: .08, rootMargin: '0px 0px -24px 0px'});
    entries.forEach(node => entrance.observe(node));
    const videos = document.querySelectorAll('main .video-container');
    const visibility = new IntersectionObserver(records => {
      records.forEach(({target, isIntersecting}) => {
        target.classList.toggle('collection-on-screen', isIntersecting && !preference.matches);
      });
    }, {threshold: 0});
    videos.forEach(node => visibility.observe(node));
    const pause = () => document.body.classList.toggle('collection-paused', document.hidden);
    document.addEventListener('visibilitychange', pause);
    pause();
    const stop = () => {
      entrance.disconnect(); visibility.disconnect();
      document.body.classList.add('collection-motion-rest');
      videos.forEach(node => node.classList.remove('collection-on-screen'));
      document.removeEventListener('visibilitychange', pause);
    };
    preference.addEventListener('change', event => { if (event.matches) stop(); });
    window.addEventListener('pageshow', event => { if (event.persisted) stop(); });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();
