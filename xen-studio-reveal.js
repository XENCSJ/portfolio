/* STUDIO only. The 10 s silent film is rendered from the official SVG:
 * volumetric smoke, extruded contours, satin steel and horizontal tool marks.
 * Native H.264 playback keeps the same render on desktop and mobile.
 */
(() => {
  'use strict';
  const stage = document.querySelector('.studio-page [data-studio-sign]');
  if (!stage) return;
  const video = stage.querySelector('video');
  const preference = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let loaded = false;
  let complete = false;
  let pending = false;
  const showPoster = () => {
    video.pause();
    stage.classList.remove('studio-sign-playing');
    stage.dataset.state = 'static';
  };
  const finish = () => {
    complete = true;
    showPoster();
    stage.dataset.state = 'complete';
    observer?.disconnect();
  };
  const sync = () => {
    if (preference.matches) { showPoster(); return; }
    if (complete) return;
    if (!visible || document.hidden) { video.pause(); return; }
    if (!loaded) {
      loaded = true;
      video.muted = true;
      video.defaultMuted = true;
      video.src = video.dataset.src;
      video.load();
    }
    if (pending || !video.paused) return;
    pending = true;
    const result = video.play();
    if (result?.then) {
      result.then(() => {
        pending = false;
        if (preference.matches || !visible || document.hidden) video.pause();
      }).catch(error => {
        pending = false;
        // A deliberate viewport/tab pause can interrupt a pending play request.
        if (error.name === 'AbortError') {
          if (visible && !document.hidden && !preference.matches) sync();
          return;
        }
        complete = true;
        showPoster();
        stage.dataset.state = 'autoplay-blocked';
      });
    } else pending = false;
  };
  video.addEventListener('playing', () => {
    if (preference.matches || complete) { showPoster(); return; }
    stage.classList.add('studio-sign-playing');
    stage.dataset.state = 'playing';
  });
  video.addEventListener('ended', finish);
  video.addEventListener('error', () => { complete = true; showPoster(); stage.dataset.state = 'media-error'; });
  let observer;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      sync();
    }, {threshold: .15});
    observer.observe(stage);
  } else { visible = true; sync(); }
  preference.addEventListener('change', () => {
    if (preference.matches) finish();
    else sync();
  });
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', () => video.pause());
  window.addEventListener('pageshow', () => { if (complete) showPoster(); else sync(); });
})();
