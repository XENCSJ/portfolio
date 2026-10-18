/* 36 seconds, six scenes, one local clock. The official logo is an unchanged img. */
(() => {
  'use strict';
  const film = document.getElementById('xen-brand-film');
  if (!film) return;
  const frame = film.querySelector('.xbf-frame');
  const logo = film.querySelector('.xbf-logo');
  const orbit = film.querySelector('.xbf-orbit');
  const items = [...film.querySelectorAll('.xbf-category')];
  const philosophy = film.querySelector('.xbf-philosophy');
  const button = film.querySelector('.xbf-play');
  const startButton = film.querySelector('.xbf-start');
  const label = button.querySelector('span');
  const status = film.querySelector('.xbf-status');
  const time = film.querySelector('.xbf-time');
  const progress = film.querySelector('.xbf-progress span');
  const caption = film.querySelector('.xbf-now');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 36000;
  let state = 'idle', elapsed = 0, origin = 0, raf = 0, compact = false, lastCaption = -1;
  const clamp = n => Math.min(1, Math.max(0, n));
  const smooth = n => { n = clamp(n); return n*n*(3-2*n); };
  const windowFade = (t,a,b,edge=.7) => smooth((t-a)/edge)*smooth((b-t)/edge);
  function render(ms) {
    const t = ms / 1000;
    // Stationary logo fades on, then remains white through the final frame.
    logo.style.opacity = String(smooth((t-.2)/1.8));
    // 5 degrees/s, with smooth acceleration and deceleration; no abrupt stop.
    let angle = t < 5 ? 0 : t < 7 ? 2.5*(t-5)*(t-5)/2 : t < 27 ? 5+5*(t-7) : t < 31 ? 105+5*(t-27)-.625*(t-27)*(t-27) : 115;
    if (reduce.matches) angle = 0;
    orbit.style.transform = `rotate(${angle}deg)`;
    const ringFade = smooth((32-t)/2);
    items.forEach((item,i) => {
      const pulseStart = compact ? 3+Math.floor(i/3)*5+(i%3)*1.5 : 7+i*1.3;
      const highlight = windowFade(t,pulseStart,pulseStart+1.8,.65);
      const appear = compact ? windowFade(t,3+Math.floor(i/3)*5,8+Math.floor(i/3)*5,.65) : smooth((t-2-i*.18)/.7)*ringFade;
      item.style.opacity = String(appear*(.46+.54*highlight));
    });
    // Ring is fading out before the philosophy enters its own clear area.
    philosophy.style.opacity = String(windowFade(t,32,35.2,.7));
    const current = t >= 3 && t < 28 ? Math.min(14, Math.floor((t-3)/5)*3+Math.min(2,Math.floor(((t-3)%5)/1.67))) : -1;
    if (current !== lastCaption) {
      caption.children[0].textContent = current < 0 ? '' : items[current].dataset.en;
      caption.children[1].textContent = current < 0 ? '' : items[current].dataset.ja;
      lastCaption = current;
    }
    progress.style.transform = `scaleX(${ms/duration})`;
    time.textContent = `00:${String(Math.floor(ms/1000)).padStart(2,'0')} / 00:36`;
  }
  function finish() {
    state='ended'; film.dataset.state=state; elapsed=duration; cancelAnimationFrame(raf); render(duration);
    label.textContent='もう一度再生'; button.setAttribute('aria-label','ブランドフィルムを最初から再生');
    status.textContent='再生が終了しました。もう一度再生できます。';
  }
  function tick(now) {
    if(state !== 'playing') return;
    elapsed=Math.min(duration,now-origin); render(elapsed);
    if(elapsed>=duration) finish(); else raf=requestAnimationFrame(tick);
  }
  function play() {
    if(state==='idle'||state==='ended') elapsed=0;
    state='playing';film.dataset.state=state;startButton.hidden=true;
    origin=performance.now()-elapsed;cancelAnimationFrame(raf);render(elapsed);raf=requestAnimationFrame(tick);
    label.textContent='一時停止';button.setAttribute('aria-label','ブランドフィルムを一時停止');
    status.textContent='ブランドフィルムを再生しています。音声はありません。';
  }
  function pause() {
    if(state!=='playing')return;
    elapsed=Math.min(duration,performance.now()-origin);cancelAnimationFrame(raf);render(elapsed);
    state='paused';film.dataset.state=state;label.textContent='続きから再生';
    button.setAttribute('aria-label','ブランドフィルムを続きから再生');status.textContent='一時停止中です。';
  }
  function resize() {
    compact=frame.clientWidth<760;film.dataset.compact=String(compact);
    items.forEach((item,i) => item.querySelectorAll('textPath').forEach(p=>p.setAttribute('startOffset',`${compact ? (i%3+.5)*100/3 : (i+.5)*100/15}%`)));
    if(state!=='idle')render(elapsed);
  }
  button.disabled=false;startButton.disabled=false;
  button.addEventListener('click',()=>state==='playing'?pause():play());
  startButton.addEventListener('click',play);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  window.addEventListener('pagehide',pause);
  if('IntersectionObserver' in window)new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)pause();},{threshold:0}).observe(frame);
  if('ResizeObserver' in window)new ResizeObserver(resize).observe(frame);else window.addEventListener('resize',resize,{passive:true});
  reduce.addEventListener('change',()=>{if(state!=='idle')render(elapsed);});
  resize();
})();
