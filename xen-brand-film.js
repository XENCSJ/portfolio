/* Exact existing SVG geometry; independent of all other page animations. */
(() => {
  'use strict';
  const film = document.getElementById('xen-brand-film');
  if (!film) return;
  const frame = film.querySelector('.xbf-frame');
  const button = film.querySelector('.xbf-play');
  const label = button.querySelector('span');
  const status = film.querySelector('.xbf-status');
  const time = film.querySelector('.xbf-time');
  const progress = film.querySelector('.xbf-progress span');
  const poster = film.querySelector('.xbf-poster');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const duration = 40000;
  let animations = [], clock = null, raf = 0, state = 'idle';
  const animation = (node, frames, options = {}) => {
    // Keep even short effects on the same 40-second timeline so resume never
    // rewinds an effect that finished earlier in the film.
    if (options.delay || options.duration) {
      const start = (options.delay || 0) / duration;
      const end = Math.min(1, ((options.delay || 0) + (options.duration || duration)) / duration);
      const first = frames[0], last = frames[frames.length - 1];
      frames = [{...first,offset:0},{...first,offset:start,easing:options.easing || 'linear'},
        {...last,offset:end},{...last,offset:1}];
    }
    const a = node.animate(frames, {duration, fill: 'both', easing: 'linear'});
    animations.push(a);
    return a;
  };
  const fade = (node, start, end, move = true) => {
    const span = end - start, edge = Math.min(.65, span / 4);
    const offset = s => s / 40;
    const transform = y => !reduce.matches && move ? `translateY(${y}px)` : 'none';
    animation(node, [
      {opacity:0, transform:transform(5), offset:0},
      {opacity:0, transform:transform(5), offset:offset(start)},
      {opacity:1, transform:transform(0), offset:offset(start+edge)},
      {opacity:1, transform:transform(0), offset:offset(end-edge)},
      {opacity:0, transform:transform(-3), offset:offset(end)},
      {opacity:0, transform:transform(-3), offset:1}
    ]);
  };
  const tick = () => {
    const ms = Math.min(duration, Number(clock?.currentTime) || 0);
    progress.style.transform = `scaleX(${ms / duration})`;
    time.textContent = `00:${String(Math.floor(ms/1000)).padStart(2,'0')} / 00:40`;
    if (state === 'playing') raf = requestAnimationFrame(tick);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    animations.forEach(a => { a.onfinish = null; a.cancel(); });
    animations = []; clock = null;
  };
  const finish = () => {
    state = 'ended'; film.dataset.state = state;
    cancelAnimationFrame(raf); tick();
    label.textContent = 'もう一度再生';
    button.setAttribute('aria-label', 'ブランドフィルムを最初から再生');
    status.textContent = '再生が終了しました。もう一度再生できます。';
  };
  const start = () => {
    stop(); state = 'playing'; film.dataset.state = state;
    poster.style.opacity = '0';
    const fill = film.querySelector('.xbf-logo-fill');
    const trace = film.querySelector('.xbf-logo-trace');
    animation(fill, [
      {opacity:0,offset:0},{opacity:0,offset:.09},{opacity:1,offset:.13},
      {opacity:1,offset:.625},{opacity:0,offset:.65},{opacity:0,offset:.825},
      {opacity:1,offset:.865},{opacity:1,offset:.96},{opacity:0,offset:1}
    ]);
    if (!reduce.matches) {
      animation(trace,[{opacity:0,strokeDashoffset:1,offset:0},{opacity:1,strokeDashoffset:1,offset:.025},{opacity:1,strokeDashoffset:0,offset:.115},{opacity:0,strokeDashoffset:0,offset:.145},{opacity:0,strokeDashoffset:0,offset:1}]);
      fade(film.querySelector('.xbf-seed'),.15,1.4,false);
      const light=film.querySelector('.xbf-light'); fade(light,5.2,11.6,false);
      animation(light,[{strokeDashoffset:1},{strokeDashoffset:0}],{delay:5200,duration:6400});
      const network=film.querySelector('.xbf-network'); fade(network,12,26,false);
      network.querySelectorAll('path').forEach((p,i)=>animation(p,[{strokeDashoffset:1},{strokeDashoffset:0}],{delay:12000+i*650,duration:4500}));
      fade(film.querySelector('.xbf-nodes'),19.3,25.8,false);
      const union=film.querySelector('.xbf-value-union'); fade(union,30.7,34,false);
      animation(union.querySelector('path'),[{strokeDashoffset:1},{strokeDashoffset:0}],{delay:30700,duration:1800});
      animation(union,[{transform:'scale(1)'},{transform:'scale(.05)'}],{delay:32800,duration:1200,fill:'forwards',easing:'cubic-bezier(.4,0,.2,1)'});
    }
    film.querySelectorAll('.xbf-scene').forEach(node=>fade(node,+node.dataset.start,+node.dataset.end));
    film.querySelectorAll('.xbf-value').forEach(node=>fade(node,+node.dataset.start,33.4));
    clock=animation(frame,[{opacity:1},{opacity:1}]);
    // All timelines share one origin; repeat taps cannot create overlapping runs.
    const origin=document.timeline.currentTime;
    animations.forEach(a=>{a.startTime=origin;});
    clock.onfinish=finish;
    label.textContent='一時停止'; button.setAttribute('aria-label','ブランドフィルムを一時停止');
    status.textContent='ブランドフィルムを再生しています。音声はありません。';
    tick();
  };
  const pause = () => {
    animations.forEach(a=>a.pause()); state='paused'; film.dataset.state=state;
    cancelAnimationFrame(raf); label.textContent='続きから再生';
    button.setAttribute('aria-label','ブランドフィルムを続きから再生');
    status.textContent='一時停止中です。';
  };
  if (!frame.animate) {
    status.textContent='このブラウザではブランドフィルムを再生できません。ページ内の理念をご覧ください。';
    return;
  }
  button.disabled=false;
  button.setAttribute('aria-label','40秒のブランドフィルムを再生');
  button.addEventListener('click',()=>{
    if(state==='playing')pause();
    else if(state==='paused'){
      animations.forEach(a=>a.play());state='playing';film.dataset.state=state;
      label.textContent='一時停止';button.setAttribute('aria-label','ブランドフィルムを一時停止');
      status.textContent='再生を再開しました。';tick();
    } else start();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});
  reduce.addEventListener('change',()=>{
    if(state==='playing'||state==='paused'){
      stop();state='idle';film.dataset.state=state;poster.style.opacity='1';
      label.textContent='再生';button.setAttribute('aria-label','40秒のブランドフィルムを再生');
      progress.style.transform='scaleX(0)';time.textContent='00:00 / 00:40';
      status.textContent='動きを減らす設定を反映しました。再生ボタンで開始できます。';
    }
  });
  window.addEventListener('pagehide',()=>{if(state==='playing')pause();});
})();
