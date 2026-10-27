/* Progressive INDEX choreography. Never controls the logo, orbit clock or navigation. */
(() => {
  'use strict';
  function init() {
    const body = document.querySelector('body.home-page');
    const wheel = body?.querySelector('.wheel');
    if (!wheel || body.dataset.ximReady) return;
    body.dataset.ximReady = '20261027';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const fine = matchMedia('(hover:hover) and (pointer:fine)');
    const active = new Map(), seen = new WeakSet();
    const ease = 'cubic-bezier(.22,1,.36,1)';
    let suspended = false, heroVisible = true, frame = 0, accentAngle = 0;
    let pointerX = 0, pointerY = 0;
    const canPlay = () => !reduce.matches && !document.hidden && !suspended;
    const make = (tag, cls, parent) => {
      const node = document.createElement(tag); node.className = cls;
      if (parent) parent.append(node);
      return node;
    };
    function animate(node, frames, delay = 0, duration = 750) {
      if (!node || !canPlay() || !node.animate || node.contains(document.activeElement) ||
          node.closest('a,button')?.contains(document.activeElement)) return;
      const animation = node.animate(frames, {duration, delay, easing:ease, fill:'backwards'});
      active.set(animation, node);
      animation.finished.then(() => {active.delete(animation); animation.cancel();}, () => active.delete(animation));
    }
    function reveal(node, delay = 0, distance = 18) {
      animate(node, [{opacity:0,transform:`translate3d(0,${distance}px,0)`}, {opacity:1,transform:'none'}], delay);
    }
    function type(node, delay = 0) {
      if (!node) return;
      // Only English direct text nodes are split. SVG icons and Japanese stay intact.
      if (!node.querySelector('.xim-type')) {
        [...node.childNodes].filter(n => n.nodeType === Node.TEXT_NODE && /[A-Za-z]/.test(n.textContent)).forEach(text => {
          const wrap = make('span','xim-type');
          const readable = make('span','xim-sr',wrap); readable.textContent = text.textContent;
          const visual = make('span','xim-visual',wrap); visual.setAttribute('aria-hidden','true');
          text.textContent.split(/(\s+)/).forEach(word => {
            if (/^\s+$/.test(word)) {visual.append(document.createTextNode(word)); return;}
            const group = make('span','xim-word',visual);
            [...word].forEach(letter => {make('span','xim-letter',group).textContent = letter;});
          });
          text.replaceWith(wrap);
        });
      }
      const letters = [...node.querySelectorAll('.xim-letter')];
      letters.forEach((letter,i) => animate(letter,
        [{opacity:0,transform:`translate3d(${Math.min((letters.length-i)*.10,1.2)}em,16px,0)`}, {opacity:1,transform:'none'}],
        delay + Math.min(i,12)*35, 700));
    }
    function rule(host, vertical = false) {
      if (!host) return null;
      const cls = vertical ? 'xim-rule-vertical' : 'xim-rule-horizontal';
      let line = host.querySelector(`:scope > .${cls}`);
      if (!line) {
        host.classList.add('xim-rule-host',vertical ? 'xim-has-vertical' : 'xim-has-horizontal');
        line = make('span',`xim-rule ${cls}`,host); line.setAttribute('aria-hidden','true');
      }
      animate(line,[{transform:vertical?'scaleY(0)':'scaleX(0)'},{transform:'none'}],0,950);
      return line;
    }
    const ambient = make('div','xim-ambient'); ambient.setAttribute('aria-hidden','true');
    make('i','',ambient); make('i','',ambient); body.prepend(ambient);
    const ns = 'http://www.w3.org/2000/svg';
    const ring = document.createElementNS(ns,'svg');
    ring.setAttribute('class','xim-orbit-frame'); ring.setAttribute('viewBox','0 0 600 600');
    ring.setAttribute('aria-hidden','true'); ring.setAttribute('focusable','false');
    const circle = (cls) => {
      const c = document.createElementNS(ns,'circle');
      Object.entries({class:cls,cx:300,cy:300,r:291}).forEach(([k,v]) => c.setAttribute(k,v));
      ring.append(c); return c;
    };
    const accent = circle('xim-orbit-accent'); accent.setAttribute('stroke-dasharray','62 1767');
    wheel.prepend(ring);
    let first = false;
    try {
      first = !sessionStorage.getItem('xen-index-dynamic-seen');
      sessionStorage.setItem('xen-index-dynamic-seen','1');
    } catch (_) { first = performance.getEntriesByType('navigation')[0]?.type === 'navigate'; }
    if (first) {
      animate(ambient,[{opacity:0},{opacity:1}],100,1400);
      const cta = body.querySelector('.xen-index-discovery > a');
      reveal(cta,1050,18); type(cta?.querySelector('span'),1250);
      reveal(body.querySelector('.xen-header-cart'),80,6);
      reveal(body.querySelector('.xen-header-toggle'),140,6);
    }
    function enter(node, order) {
      if (seen.has(node)) return;
      seen.add(node);
      const delay = Math.min(order,5)*70;
      if (!canPlay()) return;
      if (node.matches('.xen-news-label')) {
        type(node.querySelector('h2')); reveal(node.querySelector('p'),180,12); rule(node);
        rule(body.querySelector('.xen-news-list'),true);
      } else if (node.matches('.xen-news-item')) {
        reveal(node.querySelector('.xen-news-date'),delay,12);
        reveal(node.querySelector('.xen-news-category'),delay+60,12);
        reveal(node.querySelector('.xen-news-copy'),delay+120,18);
        if (node.previousElementSibling) rule(node);
      } else if (node.matches('.index-category,.index-directory > .index-link')) {
        if (node.matches('.index-category')) rule(node);
        rule(node.querySelector('.index-items,.index-single-label'),true);
        const title = node.querySelector('.index-heading > .index-en,.index-category-label > .index-en');
        type(title,delay); reveal(title?.querySelector('.index-icon'),delay,12);
        reveal(node.querySelector('.index-heading > .index-ja,.index-category-label > .index-ja'),delay+160,12);
        reveal(node.querySelector('.index-single-label'),delay+140,12);
      } else if (node.matches('.index-items .index-link')) {
        // Keep English and Japanese in their original two rows and hit target.
        reveal(node.querySelector('.index-en'),delay,16);
        reveal(node.querySelector('.index-ja'),delay+90,12);
        const icon = node.querySelector('.index-icon');
        animate(icon,[{opacity:0,transform:'translateX(6px)'},{opacity:1,transform:'none'}],delay+40,650);
      } else if (node.matches('.studio-heading')) {
        type(node.querySelector('.title-en'),delay);
      } else reveal(node,delay,16);
    }
    const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting);
      visible.sort((a,b)=>a.boundingClientRect.top-b.boundingClientRect.top);
      visible.forEach((entry,i) => {observer.unobserve(entry.target); enter(entry.target,i);});
    },{rootMargin:'0px 0px 48px 0px',threshold:0}) : null;
    const registered = new WeakSet();
    function register() {
      body.querySelectorAll('.xen-news-label,.xen-news-item,.index-category,.index-directory > .index-link,.index-items .index-link,.studio-heading,.home-ja,.xen-back-top,.xen-powered,.xen-copyright').forEach(node => {
        if (registered.has(node)) return;
        registered.add(node);
        if (observer && !reduce.matches) observer.observe(node); else seen.add(node);
      });
    }
    register();
    // NEWS may be regenerated. Observe additions only, never rewrite news data or links.
    const news = body.querySelector('.xen-news-list');
    if (news) new MutationObserver(register).observe(news,{childList:true});
    function select(link) {
      if (!link || !canPlay()) return;
      const r = link.getBoundingClientRect(), w = wheel.getBoundingClientRect();
      const angle = Math.atan2(r.top+r.height/2-w.top-w.height/2,r.left+r.width/2-w.left-w.width/2)*180/Math.PI-6;
      accentAngle += ((angle-accentAngle+180)%360+360)%360-180;
      accent.style.transform = `rotate(${accentAngle}deg)`; ring.setAttribute('data-active','');
    }
    const orbit = wheel.querySelector('.orbit');
    orbit?.addEventListener('pointerover',e=>{if(fine.matches) select(e.target.closest('a'));});
    orbit?.addEventListener('pointerleave',()=>ring.removeAttribute('data-active'));
    orbit?.addEventListener('focusin',e=>select(e.target.closest('a')));
    orbit?.addEventListener('focusout',()=>ring.removeAttribute('data-active'));
    orbit?.addEventListener('pointerdown',e=>select(e.target.closest('a')),{passive:true});
    const clearAccent = () => ring.removeAttribute('data-active');
    orbit?.addEventListener('pointerup',clearAccent,{passive:true});
    orbit?.addEventListener('pointercancel',clearAccent,{passive:true});
    function updateAmbient() {
      frame = 0;
      if (!canPlay() || !heroVisible) return;
      ambient.style.setProperty('--xim-x',`${pointerX}px`);
      ambient.style.setProperty('--xim-y',`${pointerY-Math.min(scrollY,800)*.025}px`);
    }
    const schedule = () => {if(!frame && canPlay() && heroVisible) frame=requestAnimationFrame(updateAmbient);};
    body.querySelector('.hero')?.addEventListener('pointermove',event=>{
      if (!fine.matches || event.pointerType !== 'mouse') return;
      pointerX=(event.clientX/innerWidth-.5)*10; pointerY=(event.clientY/innerHeight-.5)*8; schedule();
    },{passive:true});
    body.querySelector('.hero')?.addEventListener('pointerleave',()=>{pointerX=pointerY=0;schedule();});
    addEventListener('scroll',schedule,{passive:true});
    function pause() {body.classList.toggle('xim-paused',!canPlay()||!heroVisible);}
    if ('IntersectionObserver' in window) new IntersectionObserver(entries=>{
      heroVisible=entries[0].isIntersecting; pause(); if(heroVisible) schedule();
    },{rootMargin:'80px'}).observe(body.querySelector('.hero'));
    function settle() {
      active.forEach((node,animation)=>animation.cancel()); active.clear();
      cancelAnimationFrame(frame); frame=0; clearAccent(); pause();
    }
    // Focus and press always expose the full link immediately, including an early CTA tap.
    const expose = event => {
      const control = event.target.closest('a,button');
      for (const [animation,node] of active) if (node.contains(event.target)||control?.contains(node)) {
        animation.cancel(); active.delete(animation);
      }
    };
    body.addEventListener('focusin',expose); body.addEventListener('pointerdown',expose,{passive:true});
    reduce.addEventListener('change',()=>{settle(); if(reduce.matches) observer?.disconnect(); else register();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden) settle(); else pause();});
    addEventListener('pagehide',()=>{suspended=true;settle();});
    addEventListener('pageshow',()=>{suspended=false;pause();});
    pause();
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();