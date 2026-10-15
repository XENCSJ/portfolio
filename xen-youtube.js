/* Shared YouTube motion for all video pages.
   Native iframe players are in the HTML from the first render.
   No click-to-load cover or JavaScript player replacement sits above Play. */
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
