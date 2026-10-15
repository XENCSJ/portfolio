/* Shared STORYBOOKS player and motion for every YouTube work.
   Prepare the native player before interaction: one click goes directly to
   YouTube's play control, without a facade click or unmuted autoplay request. */
document.querySelectorAll('.video-launch').forEach((link) => {
  const id = link.dataset.videoId;
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
  const container = link.closest('.video-container');
  if (!container) return;

  // Preserve the original per-video parameters, including cinematic links.
  const original = container.querySelector('template.cinematic-player')?.content.querySelector('iframe');
  const url = new URL('https://www.youtube-nocookie.com/embed/' + id);
  if (original) url.search = new URL(original.src).search;
  url.searchParams.set('autoplay', '0');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('controls', '1');

  const frame = document.createElement('iframe');
  frame.src = url.href;
  frame.title = link.closest('.work')?.querySelector('h3')?.textContent.trim() || 'XEN YouTube作品';
  frame.width = '560';
  frame.height = '315';
  frame.loading = 'lazy';
  frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  container.replaceChildren(frame);
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
