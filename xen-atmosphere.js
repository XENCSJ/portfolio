/* Isolated progressive enhancement. No dependency, scroll interception or hidden content. */
(() => {
  'use strict';
  const page = document.querySelector('body.studio-page,body.creator-page');
  if (!page || !('IntersectionObserver' in window)) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const ease = 'cubic-bezier(.22,.68,0,1)';
  const animations = new Map();
  const seen = new WeakSet();
  const sceneVisibility = new Map();
  const activeScenes = new Set();
  const intro = page.querySelector('.xen-logo-stage');
  const orbit = page.querySelector('.studio-values-orbit');
  const portrait = page.querySelector('.profile-portrait');
  let scrollFrame = 0;
  let introPlayed = false;
  let portraitPlayed = false;
  let suspended = false;
  const allowed = () => !reduced.matches && !document.hidden && !suspended;

  function animate(node, frames, options = {}) {
    if (!node?.animate || !allowed()) return;
    const animation = node.animate(frames, {duration:650,easing:ease,fill:'backwards',...options});
    animations.set(animation,node);
    const release = () => { animations.delete(animation); animation.cancel(); };
    animation.finished.then(release, () => animations.delete(animation));
    return animation;
  }
  function cancelWithin(root) {
    for (const [animation,node] of animations) {
      if (root === node || root.contains(node)) { animation.cancel(); animations.delete(animation); }
    }
  }
  function reveal(node, delay = 0) {
    if (node.contains(document.activeElement)) return;
    animate(node,[{opacity:0,transform:'translate3d(0,10px,0)'},{opacity:1,transform:'translate3d(0,0,0)'}],{delay});
  }
  function divider(host, top = false) {
    if (!host) return;
    host.classList.add('xen-divider-host');
    const line = document.createElement('span');
    line.className = 'xen-motion-divider';
    line.setAttribute('aria-hidden','true');
    if (top) { line.style.top = '-1px'; line.style.bottom = 'auto'; }
    // Keep title first/last-child typography selectors intact.
    if (host.matches('.cp-page-label') && host.firstElementChild) host.firstElementChild.append(line);
    else host.append(line);
    return line;
  }
  const lines = new Map();
  page.querySelectorAll('main .cp-page-label,main .cp-section,main .creator-connect').forEach(host => {
    lines.set(host,divider(host,host.matches('.cp-section,.creator-connect')));
  });
  const targets = new Set(page.querySelectorAll([
    'main .cp-page-label','main .cp-section-heading','main .creator-connect-heading',
    '.studio-section > .studio-copy','.studio-copy > p','.studio-philosophy-copy',
    '.studio-service-grid > li','.studio-values-summary > div','.contact-catch',
    '.contact-item','.studio-actions','.cp-kicker','.cp-role','.cp-facts > div',
    '.profile-portrait','.cp-personal > li','.cp-field-entry','.cp-career > li',
    '.cp-section > .cp-copy','.cp-about-layout','.cp-philosophy blockquote',
    '.cp-philosophy .cp-copy','.creator-connect-links > a','.cp-project-archive',
    '.cp-section','.creator-connect'
  ].join(',')));
  const revealObserver = new IntersectionObserver(entries => {
    let order = 0;
    for (const entry of entries) {
      const node = entry.target;
      if (!entry.isIntersecting) { cancelWithin(node); continue; }
      if (seen.has(node) || !allowed()) continue;
      seen.add(node);
      const delay = Math.min(order++ * 45,220);
      // Section containers draw their divider; only leaf content moves.
      if (!node.matches('.cp-section,.creator-connect') &&
          !node.parentElement.matches('.studio-copy')) reveal(node,delay);
      if (node.parentElement.matches('.studio-copy') && !targets.has(node.parentElement)) reveal(node,delay);
      const line = lines.get(node);
      if (line) animate(line,[{transform:'scaleX(0)',opacity:.8},{transform:'scaleX(1)',opacity:.8},{transform:'scaleX(1)',opacity:0}],{duration:1050,delay});
      if (node.matches('.studio-service-grid > li')) {
        node.querySelectorAll('svg > *').forEach(shape => {
          if (!shape.getTotalLength) return;
          const length = shape.getTotalLength();
          if (length < 1) return;
          animate(shape,[{strokeDasharray:`${length} ${length}`,strokeDashoffset:length},{strokeDasharray:`${length} ${length}`,strokeDashoffset:0}],{duration:900,delay:delay+100});
        });
      }
    }
  },{threshold:0,rootMargin:'0px 0px -12px 0px'});
  targets.forEach(node => revealObserver.observe(node));

  function revealLogo() {
    if (!intro || introPlayed || !allowed()) return;
    introPlayed = true;
    animate(intro.querySelector('.xen-logo-tilt'),[{opacity:0},{opacity:1}],{delay:500,duration:650});
  }
  function lightPortrait() {
    if (!portrait || portraitPlayed || !allowed()) return;
    portraitPlayed = true;
    const surface = portrait.querySelector('.gallery-item');
    if (!surface) return;
    const sheen = document.createElement('span');
    sheen.className = 'xen-portrait-sheen'; sheen.setAttribute('aria-hidden','true');
    surface.append(sheen);
    animate(sheen,[{transform:'translateX(-65%)',opacity:0},{transform:'translateX(0)',opacity:.8,offset:.5},{transform:'translateX(65%)',opacity:0}],{duration:1800,delay:250});
  }
  orbit?.querySelectorAll('.studio-values-label').forEach(label => { label.dataset.lightLabel = label.textContent.trim(); });
  const scenes = [intro,orbit,portrait].filter(Boolean);
  scenes.forEach(scene => { scene.classList.add('xen-motion-ready'); sceneVisibility.set(scene,false); });
  function updateScroll() {
    scrollFrame = 0;
    if (!allowed()) return;
    // All layout reads precede writes; no perpetual rAF loop for scrolling.
    const positions = [...activeScenes].map(scene => {
      const rect = scene.getBoundingClientRect();
      return [scene,Math.max(-1,Math.min(1,(innerHeight/2-rect.top-rect.height/2)/(innerHeight/2+rect.height/2)))];
    });
    for (const [scene,p] of positions) {
      if (scene === orbit) {
        scene.style.setProperty('--ring-rx',`${12+p*8}deg`);
        scene.style.setProperty('--ring-ry',`${-8+p*9}deg`);
        scene.style.setProperty('--ring-z',`${p*7}px`);
      } else if (scene === portrait) scene.style.setProperty('--portrait-y',`${p*5}px`);
      else if (!fine.matches) {
        scene.style.setProperty('--logo-rx',`${p*3}deg`);
        scene.style.setProperty('--logo-ry',`${p*-2}deg`);
      }
    }
  }
  function scheduleScroll() {
    if (!scrollFrame && allowed() && activeScenes.size) scrollFrame = requestAnimationFrame(updateScroll);
  }
  function syncScenes() {
    for (const [scene,visible] of sceneVisibility) {
      const active = visible && allowed();
      scene.classList.toggle('xen-motion-active',active);
      if (active) activeScenes.add(scene);
      else { activeScenes.delete(scene); cancelWithin(scene); }
    }
    if (activeScenes.has(intro)) revealLogo();
    if (activeScenes.has(portrait)) lightPortrait();
    scheduleScroll();
  }
  const sceneObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => sceneVisibility.set(entry.target,entry.isIntersecting));
    syncScenes();
  },{threshold:0});
  scenes.forEach(scene => sceneObserver.observe(scene));
  if (intro) {
    intro.addEventListener('pointermove',event => {
      if (!fine.matches || !allowed() || !activeScenes.has(intro)) return;
      const rect = intro.getBoundingClientRect();
      const x = Math.max(-.5,Math.min(.5,(event.clientX-rect.left)/rect.width-.5));
      const y = Math.max(-.5,Math.min(.5,(event.clientY-rect.top)/rect.height-.5));
      intro.style.setProperty('--logo-rx',`${-y*7}deg`);
      intro.style.setProperty('--logo-ry',`${x*7}deg`);
    },{passive:true});
    intro.addEventListener('pointerleave',() => {
      intro.style.setProperty('--logo-rx','0deg'); intro.style.setProperty('--logo-ry','0deg');
    },{passive:true});
  }
  function settle() {
    for (const animation of animations.keys()) animation.cancel();
    animations.clear();
    cancelAnimationFrame(scrollFrame); scrollFrame = 0;
    syncScenes();
  }
  addEventListener('scroll',scheduleScroll,{passive:true});
  addEventListener('resize',scheduleScroll,{passive:true});
  fine.addEventListener('change',() => {
    intro?.style.removeProperty('--logo-rx'); intro?.style.removeProperty('--logo-ry'); scheduleScroll();
  });
  reduced.addEventListener('change',settle);
  document.addEventListener('visibilitychange',settle);
  page.addEventListener('focusin',event => {
    for (const [animation,node] of animations) if (node.contains(event.target)) { animation.cancel(); animations.delete(animation); }
  });
  addEventListener('pagehide',() => { suspended = true; settle(); });
  addEventListener('pageshow',() => { suspended = false; syncScenes(); });
})();
