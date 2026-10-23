/* Isolated derivative controller. ORIGINAL code is executed verbatim, unmodified. */
(() => {
  'use strict';
  const root = document.documentElement;
  const name = root.dataset.xenIndexSet || 'original';
  root.dataset.xenIndexSet = name;
  if (name === 'original') {
    const source = document.getElementById('xen-index-precision-trace-control');
    const script = document.createElement('script');
    script.textContent = source.textContent;
    source.after(script);
    return;
  }
  const stage = document.querySelector('.home-page .logo-stage');
  const image = stage?.querySelector('.center-logo');
  const source = stage?.querySelector('.xen-precision-trace');
  const links = [...document.querySelectorAll('.home-page .orbit > a')];
  if (!image || !source || !links.length) return;
  // Replay belongs to the isolated preview. Derivatives autoplay once per document.
  stage.removeAttribute('role');
  stage.removeAttribute('tabindex');
  stage.setAttribute('aria-label', 'XEN');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let overlay, timer, started = false;
  const settle = () => {
    clearTimeout(timer);
    delete root.dataset.xenIndexState;
    overlay?.remove();
  };
  try {
    const duration = {'sequential-trace':2800,'soft-reveal':3500,'reverse-trace':3000,'dual-reveal':3200}[name];
    if (!duration) return;
    root.style.setProperty('--xen-set-duration', `${duration}ms`);
    overlay = source.cloneNode(true);
    overlay.classList.replace('xen-precision-trace', 'xen-set-trace');
    const clip = overlay.querySelector('clipPath');
    clip.id = 'xen-set-clip';
    const group = overlay.querySelector('g');
    group.setAttribute('clip-path', 'url(#xen-set-clip)');
    overlay.querySelector('.xen-trace-guide').remove();
    const paths = [...group.querySelectorAll('.xen-trace-line')];
    // Parts and the evenodd clipping silhouette are exact copies, never retraced.
    const ordered = name === 'reverse-trace' ? [...paths].reverse() : paths;
    const lengths = ordered.map(p => p.getTotalLength());
    const total = lengths.reduce((a,b) => a+b,0);
    let cursor = 200;
    ordered.forEach((path,i) => {
      let delay = cursor;
      let drawing = lengths[i] / total * (duration - 1250);
      cursor += drawing;
      if (name === 'dual-reveal') {
        const coordinates = path.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
        const xs = coordinates.filter((_,j) => j % 2 === 0);
        const distanceFromEdge = Math.min(Math.min(...xs), 2232 - Math.max(...xs));
        delay = 200 + Math.max(0, distanceFromEdge) / 1116 * 1600;
        drawing = 850;
      }
      if (name === 'soft-reveal') {delay = 100;drawing = 1800;}
      path.setAttribute('class', 'xen-set-line');
      path.removeAttribute('style');
      path.style.setProperty('--xen-draw-delay', `${delay}ms`);
      path.style.setProperty('--xen-draw-duration', `${drawing}ms`);
      if (name !== 'soft-reveal') {
        const fill = path.cloneNode(false);
        fill.setAttribute('class','xen-set-fill');
        fill.setAttribute('fill','#fff');
        fill.setAttribute('stroke','none');
        fill.style.setProperty('--xen-fill-delay', `${delay+drawing}ms`);
        group.insertBefore(fill, paths[0]);
      }
    });
    if (name === 'dual-reveal') {
      // Mirror each contour's drawing direction. Neither geometry nor artwork is mirrored.
      paths.forEach(path => {
        const opposite = path.cloneNode(false);
        opposite.style.animationName = 'xen-set-draw-reverse';
        group.append(opposite);
      });
    }
    // 15 labels cannot form exact diametric pairs without moving existing geometry.
    // Use the closest disjoint opposing pairs; the remaining label completes the set.
    const configureText = () => {
    const pairs = [];
    if (name === 'dual-reveal') {
      const remaining = new Set(links.map((_,i) => i));
      const angles = links.map(a => parseFloat(a.querySelector('textPath').getAttribute('startOffset')) * 3.6);
      while (remaining.size > 1) {
        const first = remaining.values().next().value;
        remaining.delete(first);
        const opposite = [...remaining].sort((a,b) => {
          const distance = j => Math.abs(180-Math.abs(angles[first]-angles[j]));
          return distance(a)-distance(b);
        })[0];
        remaining.delete(opposite);
        pairs.push([first,opposite]);
      }
      if (remaining.size) pairs.push([...remaining]);
    }
      links.forEach((link,i) => {
        let order = name === 'reverse-trace' ? (links.length-i)%links.length : i;
        let count = links.length;
        if (name === 'dual-reveal') {order = pairs.findIndex(pair => pair.includes(i));count = pairs.length;}
        const textDuration = name === 'soft-reveal' ? 950 : 550;
        const delay = 200 + order * (duration-textDuration-200)/(count-1);
        link.style.setProperty('--xen-text-delay',`${delay}ms`);
        link.style.setProperty('--xen-text-duration',`${textDuration}ms`);
      });
    };
    const play = () => {
      if (started) return;
      started = true;
      if (reduced.matches || document.hidden || !image.naturalWidth) {settle();return;}
      configureText();
      stage.append(overlay);
      timer = setTimeout(settle,duration+150);
      root.dataset.xenIndexState = 'playing';
    };
    const ready = () => {
      if (image.complete) play();
      else {
        image.addEventListener('load',play,{once:true});
        image.addEventListener('error',settle,{once:true});
      }
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',ready,{once:true});
    else ready();
    document.addEventListener('visibilitychange',() => {if(document.hidden) settle();});
    addEventListener('pagehide',settle);
    if (reduced.addEventListener) reduced.addEventListener('change',settle);
    else reduced.addListener(settle);
  } catch (_) {settle();}
})();
// Back/forward cache is a fresh INDEX visit; restore through a new normal load.
addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
