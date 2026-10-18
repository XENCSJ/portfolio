/* 30-second, silent STUDIO film. INDEX code and assets are never mutated. */
(() => {
  'use strict';
  const film = document.getElementById('xen-brand-film');
  if (!film) return;
  const frame = film.querySelector('.xbf-frame');
  const button = film.querySelector('.xbf-play');
  const pauseButton = film.querySelector('.xbf-pause');
  const label = button.querySelector('span');
  const status = film.querySelector('.xbf-status');
  const time = film.querySelector('.xbf-time');
  const progress = film.querySelector('.xbf-progress span');
  const logo = film.querySelector('.xbf-logo');
  const solid = film.querySelector('.xbf-solid');
  const trace = film.querySelector('.xbf-trace');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 30000;
  let animations = [], clock = null, raf = 0, state = 'idle';
  const offset = seconds => seconds * 1000 / duration;
  function animate(node, frames) {
    const a = node.animate(frames, { duration, fill:'both', easing:'linear' });
    animations.push(a);
    return a;
  }
  function stop() {
    cancelAnimationFrame(raf);
    animations.forEach(a => { a.onfinish = null; a.cancel(); });
    animations = [];
    clock = null;
  }
  function tick() {
    const ms = Math.min(duration, Number(clock?.currentTime) || 0);
    progress.style.transform = `scaleX(${ms / duration})`;
    time.textContent = `00:${String(Math.floor(ms / 1000)).padStart(2,'0')} / 00:30`;
    if (state === 'playing') raf = requestAnimationFrame(tick);
  }
  function finish() {
    stop();
    state = 'ended';
    film.dataset.state = state;
    label.textContent = 'もう一度再生';
    button.setAttribute('aria-label','ブランドフィルムを最初から再生');
    pauseButton.hidden = true;
    logo.style.top = '50%';
    progress.style.transform = 'scaleX(1)';
    time.textContent = '00:30 / 00:30';
    status.textContent = '再生が終了しました。もう一度再生できます。';
  }
  function fade(node) {
    const start = Number(node.dataset.start), end = Number(node.dataset.end);
    if (reduce.matches) {
      // Still scenes only: no tracing, fades, or positional motion.
      animate(node,[
        {opacity:0,offset:0},{opacity:0,offset:offset(start)},
        {opacity:1,offset:offset(start)},{opacity:1,offset:offset(end)},
        {opacity:0,offset:offset(end)},{opacity:0,offset:1}
      ]);
      return;
    }
    const edge = Math.min(.55, (end-start)/4);
    animate(node,[
      {opacity:0,transform:'translateY(4px)',offset:0},
      {opacity:0,transform:'translateY(4px)',offset:offset(start)},
      {opacity:1,transform:'translateY(0)',offset:offset(start+edge)},
      {opacity:1,transform:'translateY(0)',offset:offset(end-edge)},
      {opacity:0,transform:'translateY(-3px)',offset:offset(end)},
      {opacity:0,transform:'translateY(-3px)',offset:1}
    ]);
  }
  function start() {
    stop();
    state = 'playing';
    film.dataset.state = state;
    logo.style.top = reduce.matches ? '34%' : '50%';
    if (!reduce.matches) {
      // Exactly the INDEX 2.5-second envelope and per-path timings.
      animate(solid,[
        {opacity:0,offset:0},{opacity:0,offset:offset(1.6)},
        {opacity:1,offset:offset(2.2)},{opacity:1,offset:1}
      ]);
      animate(trace,[
        {opacity:0,offset:0},{opacity:1,offset:offset(.4)},
        {opacity:1,offset:offset(2.2)},{opacity:0,offset:offset(2.5)},
        {opacity:0,offset:1}
      ]);
      trace.querySelectorAll('.xen-trace-line').forEach(path => {
        const startMs = parseFloat(path.style.getPropertyValue('--trace-start'));
        const pathMs = parseFloat(path.style.getPropertyValue('--trace-duration'));
        animate(path,[
          {strokeDashoffset:1,offset:0},
          {strokeDashoffset:1,offset:startMs/duration,easing:'cubic-bezier(.42,0,.58,1)'},
          {strokeDashoffset:0,offset:(startMs+pathMs)/duration},
          {strokeDashoffset:0,offset:1}
        ]);
      });
      animate(logo,[
        {top:'50%',offset:0},
        {top:'50%',offset:offset(2.5),easing:'cubic-bezier(.4,0,.2,1)'},
        {top:'34%',offset:offset(3.5)},
        {top:'34%',offset:offset(27),easing:'cubic-bezier(.4,0,.2,1)'},
        {top:'50%',offset:offset(28.2)},{top:'50%',offset:1}
      ]);
    }
    film.querySelectorAll('.xbf-scene').forEach(fade);
    clock = animate(frame,[{opacity:1},{opacity:1}]);
    const origin = document.timeline.currentTime;
    animations.forEach(a => { a.startTime = origin; });
    clock.onfinish = finish;
    label.textContent = '最初から再生';
    button.setAttribute('aria-label','ブランドフィルムを最初から再生');
    pauseButton.hidden = false;
    pauseButton.textContent = '一時停止';
    pauseButton.setAttribute('aria-label','ブランドフィルムを一時停止');
    status.textContent = reduce.matches
      ? '動きを減らして理念を順番に表示しています。音声はありません。'
      : 'ブランドフィルムを再生しています。音声はありません。';
    tick();
  }
  function pause() {
    if (state !== 'playing') return;
    animations.forEach(a => a.pause());
    state = 'paused';
    film.dataset.state = state;
    cancelAnimationFrame(raf);
    pauseButton.textContent = '続きから再生';
    pauseButton.setAttribute('aria-label','ブランドフィルムを続きから再生');
    status.textContent = '一時停止中です。再生ボタンで最初から、続きから再生ボタンで再開できます。';
  }
  function reset() {
    stop();
    state = 'idle';
    film.dataset.state = state;
    logo.style.top = '50%';
    label.textContent = '再生';
    pauseButton.hidden = true;
    button.setAttribute('aria-label','30秒のブランドフィルムを再生');
    progress.style.transform = 'scaleX(0)';
    time.textContent = '00:00 / 00:30';
    status.textContent = '再生ボタンで開始します。音声はありません。';
  }
  if (!frame.animate) {
    status.textContent = 'このブラウザではブランドフィルムを再生できません。ページ内の理念をご覧ください。';
    return;
  }
  button.disabled = false;
  button.setAttribute('aria-label','30秒のブランドフィルムを再生');
  button.addEventListener('click',start);
  pauseButton.addEventListener('click',() => {
    if (state === 'playing') pause();
    else if (state === 'paused') {
      animations.forEach(a => a.play());
      state = 'playing';
      film.dataset.state = state;
      pauseButton.textContent = '一時停止';
      pauseButton.setAttribute('aria-label','ブランドフィルムを一時停止');
      status.textContent = '再生を再開しました。';
      tick();
    }
  });
  document.addEventListener('visibilitychange',() => { if (document.hidden) pause(); });
  window.addEventListener('pagehide',pause);
  if (reduce.addEventListener) reduce.addEventListener('change',reset);
  else if (reduce.addListener) reduce.addListener(reset);
})();
