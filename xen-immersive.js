/* Additive motion for the fifteen public pages. No text/media/link replacement. */
(() => {
  'use strict';
  const start = () => {
    const body = document.body;
    if (!body || body.classList.contains('xm-ready') || !('IntersectionObserver' in window)) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const compact = matchMedia('(max-width:700px)');
    const lowPower = navigator.connection?.saveData || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
    const allowed = () => !reduced.matches && !document.hidden && !suspended;
    const $ = selector => [...document.querySelectorAll(selector)];
    const active = new Set(), seen = new WeakSet(), targets = new Map(), animations = new Map();
    const tiltNodes = new Set();
    let suspended = false, scrollFrame = 0, pointerFrame = 0;
    let pointerNode = null, pointerRect = null, pointerX = 0, pointerY = 0;
    const add = (selector, options = {}) => $(selector).forEach(node => targets.set(node, {...targets.get(node),...options}));
    const decoration = (host, className) => {
      const el = document.createElement('span'); el.className = className;
      el.setAttribute('aria-hidden','true'); host.append(el); return el;
    };
    const run = (node, frames, options = {}) => {
      if (!node?.animate || !allowed() || node.contains(document.activeElement)) return;
      const animation = node.animate(frames,{duration:850,easing:'cubic-bezier(.2,.75,.2,1)',fill:'backwards',...options});
      animations.set(animation,node);
      animation.finished.then(() => { animations.delete(animation); animation.cancel(); },() => animations.delete(animation));
    };
    // The final state is always the default; nothing waits in an opacity:0 state.
    const color = getComputedStyle(body).backgroundColor.match(/[\d.]+/g);
    const dark = color && Number(color[0])+Number(color[1])+Number(color[2]) < 240;
    body.classList.add('xm-ready'); body.classList.toggle('xm-dark',Boolean(dark));
    const atmosphere = document.createElement('div'); atmosphere.className = 'xm-atmosphere'; atmosphere.setAttribute('aria-hidden','true');
    decoration(atmosphere,'xm-aura'); decoration(atmosphere,'xm-aura');
    body.prepend(atmosphere);

    // Shared titles/lines get light; existing observers retain entry ownership.
    add('main h1, main h2, main .rule, .design-project-line', {line:true});
    add('main .hero h1, main .cp-page-label, main .series-title, main .cp-section-heading', {light:true});
    add('main .gallery-item, main .work, .studio-service-link, .cp-field-entry, .sns-metric', {tilt:true});
    add('.creator-page .profile-portrait, .architecture-page .gallery-item, .space-page .gallery-item, .cinematic-page .work', {depth:true});
    add('.apparel-page .brand-visual .gallery-item', {ambient:true});
    add('.home-page .logo-stage', {ambient:true});
    add('.home-page .wheel', {ambient:true});
    // These pages have different HTML; fill their uncovered entry targets only.
    add('.price-category-heading, .price-category-nav > a, .price-overview, .price-summary-row', {reveal:true});
    add('.sns-section-heading, .sns-body, .sns-service-list > li, .sns-strength-list > li, .sns-fit-list > li', {reveal:true});
    add('.sns-metric', {reveal:true,light:true});
    add('.studio-values-summary > div', {light:true});
    // Keep overlays away from an embedded player's hit-testing/stacking context.
    for (const [node,options] of targets) {
      if (options.tilt) { node.classList.add('xm-tilt'); tiltNodes.add(node); }
      if (options.depth) node.classList.add('xm-depth');
      if (options.light || options.line || (options.tilt && !node.querySelector('iframe,.video-container'))) node.classList.add('xm-host');
      if (options.line && !node.matches('.rule,.design-project-line')) decoration(node,'xm-edge');
      if (options.light || (options.tilt && !node.querySelector('iframe,.video-container'))) decoration(node,'xm-sheen');
      if (options.light) node.classList.add('xm-light');
    }
    // Position-only decorations do not change first/last-child title typography.
    $('.cp-page-label').forEach(heading => {
      const first = heading.querySelector('span');
      if (first) [...heading.children].filter(n=>n.matches('.xm-edge,.xm-sheen')).forEach(n=>first.append(n));
    });
    $('.sound-section').slice(0,3).forEach(section => {
      const title = section.querySelector('h2');
      if (!title) return;
      section.classList.add('xm-host'); title.classList.add('xm-host');
      const spectrum = decoration(title,'xm-spectrum');
      for(let i=0;i<12;i++) {
        const bar = document.createElement('i'); bar.style.cssText=`--h:${25+(i*31)%76}%;--delay:${-i*.17}s`; spectrum.append(bar);
      }
      decoration(section,'xm-sound-glow'); targets.set(section,{ambient:true});
    });
    const wheel = document.querySelector('.home-page .wheel');
    const logo = wheel?.querySelector('.logo-stage');
    if (wheel) {
      decoration(wheel,'xm-trail');
      wheel.querySelectorAll('.orbit a').forEach(link => {
        const on = () => body.classList.add('xm-ring-selected');
        const off = () => body.classList.remove('xm-ring-selected');
        link.addEventListener('pointerenter',on); link.addEventListener('pointerleave',off);
        link.addEventListener('focus',on); link.addEventListener('blur',off);
      });
      if (logo) tiltNodes.add(logo);
    }
    $('main .studio-button, main .text-link, main .contact-toggle, main .price-toggle, main .sound-category-nav a, main .cp-jump a').forEach(node=>node.classList.add('xm-control'));

    function updateScroll() {
      scrollFrame = 0;
      if (!allowed()) return;
      const rows = [...active].filter(n=>targets.get(n)?.depth).map(node => {
        const r=node.getBoundingClientRect();
        return [node,Math.max(-1,Math.min(1,(innerHeight/2-r.top-r.height/2)/(innerHeight/2+r.height/2)))];
      });
      const distance = compact.matches || !fine.matches || lowPower ? 3 : 9;
      rows.forEach(([node,p]) => node.style.setProperty('--xm-depth',`${(p*distance).toFixed(2)}px`));
    }
    function scroll() { if (!scrollFrame && allowed() && active.size) scrollFrame=requestAnimationFrame(updateScroll); }
    function enter(node,index) {
      const options=targets.get(node);
      node.classList.add('xm-seen');
      if (seen.has(node)) return;
      seen.add(node);
      if (options.reveal && !node.hasAttribute('data-detail-motion')) {
        run(node,[{opacity:.08,transform:'translateY(18px)'},{opacity:1,transform:'none'}],{delay:Math.min(index*65,260)});
      }
      // New detail elements reuse the existing entry clock; give grid rows a cadence.
      if (node.matches('.gallery-item') && node.hasAttribute('data-detail-motion')) {
        node.style.setProperty('--detail-delay',`${Math.min(index%4*65,195)}ms`);
      }
    }
    const observer = new IntersectionObserver(entries => {
      let order=0;
      for(const entry of entries) {
        const node=entry.target;
        if(entry.isIntersecting) {
          active.add(node); node.classList.toggle('xm-active',allowed());
          if(allowed()) enter(node,order++);
        } else {
          active.delete(node); node.classList.remove('xm-active');
          for(const [animation,target] of animations) if(target===node) {animation.cancel();animations.delete(animation);}
        }
      }
      scroll();
    },{threshold:0,rootMargin:'0px 0px -8px 0px'});
    targets.forEach((_,node)=>observer.observe(node));

    function resetPointer() {
      if(pointerNode) {pointerNode.style.removeProperty('--xm-rotate');pointerNode.classList.remove('xm-pointed');}
      pointerNode=null; pointerRect=null;
      cancelAnimationFrame(pointerFrame); pointerFrame=0;
      logo?.style.removeProperty('rotate');
    }
    function pointerTick() {
      pointerFrame=0;
      if(!pointerNode || !pointerRect || !allowed() || !fine.matches) return;
      const x=Math.max(-1,Math.min(1,(pointerX-pointerRect.left)/pointerRect.width*2-1));
      const y=Math.max(-1,Math.min(1,(pointerY-pointerRect.top)/pointerRect.height*2-1));
      const angle=Math.min(4,Math.hypot(x,y)*3);
      const rotation=`${-y.toFixed(3)} ${x.toFixed(3)} 0 ${angle.toFixed(2)}deg`;
      if(pointerNode===logo) logo.style.rotate=rotation;
      else pointerNode.style.setProperty('--xm-rotate',rotation);
      pointerNode.classList.add('xm-pointed');
    }
    document.addEventListener('pointermove',event => {
      if(!allowed() || !fine.matches || lowPower || event.pointerType==='touch') return;
      const candidate=event.target.closest('.xm-tilt');
      const node=candidate || (wheel?.contains(event.target)?logo:null);
      if(node!==pointerNode) {
        resetPointer();
        if(node && tiltNodes.has(node)) {pointerNode=node;pointerRect=node.getBoundingClientRect();}
      }
      pointerX=event.clientX;pointerY=event.clientY;
      if(pointerNode && !pointerFrame) pointerFrame=requestAnimationFrame(pointerTick);
    },{passive:true});
    document.addEventListener('pointerleave',resetPointer);
    document.addEventListener('pointerdown',event=>{
      if(event.pointerType!=='touch' || !allowed()) return;
      const node=event.target.closest('.xm-tilt');
      if(node) run(node,[{scale:'1'},{scale:'.985'},{scale:'1'}],{duration:280});
    },{passive:true});
    body.addEventListener('focusin',event=>{
      for(const [animation,node] of animations) if(node.contains(event.target)) {animation.cancel();animations.delete(animation);}
    });
    function settle() {
      const paused=!allowed(); body.classList.toggle('xm-paused',paused);
      animations.forEach((_,animation)=>animation.cancel()); animations.clear();
      resetPointer(); cancelAnimationFrame(scrollFrame); scrollFrame=0;
      active.forEach(node=>{node.classList.toggle('xm-active',!paused); if(!paused) enter(node,0);});
      if(paused) $('.xm-depth').forEach(node=>node.style.removeProperty('--xm-depth'));
      else scroll();
    }
    addEventListener('scroll',()=>{resetPointer();scroll();},{passive:true});
    addEventListener('resize',()=>{resetPointer();scroll();},{passive:true});
    document.addEventListener('visibilitychange',settle);
    reduced.addEventListener('change',settle); fine.addEventListener('change',settle);
    addEventListener('pagehide',()=>{suspended=true;settle();});
    addEventListener('pageshow',()=>{suspended=false;settle();});
    settle();
  };
  if(document.readyState!=='complete') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
