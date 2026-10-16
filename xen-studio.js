/* Page-owned progressive enhancement: content and native details work without JS. */
(() => {
  const page = document.querySelector('body.studio-page');
  if (!page) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const activeAnimations = new Set();
  const animate = (node, frames, options) => {
    if (reduced.matches || !node.animate) return null;
    const animation = node.animate(frames, options);
    activeAnimations.add(animation);
    animation.finished.then(() => activeAnimations.delete(animation), () => activeAnimations.delete(animation));
    return animation;
  };
  let revealObserver;
  if ('IntersectionObserver' in window && !reduced.matches) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        revealObserver.unobserve(entry.target);
        // Never obscure a control the keyboard user has already reached.
        if (entry.target.contains(document.activeElement)) return;
        animate(entry.target, [{opacity:0, transform:'translateY(10px)'}, {opacity:1, transform:'translateY(0)'}], {
          duration:560, delay:parseFloat(getComputedStyle(entry.target).getPropertyValue('--studio-delay')) || 0,
          easing:'cubic-bezier(.22,.68,0,1)', fill:'backwards'
        });
      });
    }, {threshold:0, rootMargin:'0px 0px -20px 0px'});
    page.querySelectorAll('.studio-workflow > li').forEach((node,index) => {
      node.style.setProperty('--studio-delay', `${Math.min(index*70,280)}ms`);
    });
    page.querySelectorAll('[data-studio-reveal]').forEach(node => revealObserver.observe(node));
  }

  // Native summary handles Enter / Space. Animate opening AND closing without
  // max-height truncation; retain each FAQ's independent expanded state.
  const faqControllers = [];
  page.querySelectorAll('.studio-faq-item').forEach(details => {
    const summary = details.querySelector('summary');
    const answer = details.querySelector('.studio-faq-answer');
    let animation;
    let expanded = details.open;
    const finish = () => {
      animation?.cancel(); animation = null;
      details.open = expanded;
      details.style.height = '';
      details.classList.remove('is-closing');
      answer.inert = !expanded;
    };
    summary.addEventListener('click', event => {
      if (reduced.matches || !details.animate) return;
      event.preventDefault();
      const from = details.getBoundingClientRect().height;
      animation?.cancel();
      expanded = !expanded;
      details.open = true;
      details.classList.toggle('is-closing', !expanded);
      answer.inert = !expanded;
      details.style.height = '';
      const border = parseFloat(getComputedStyle(details).borderBottomWidth) || 0;
      const to = expanded ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height + border;
      details.style.height = `${from}px`;
      animation = animate(details, [{height:`${from}px`}, {height:`${to}px`}], {
        duration:240, easing:'cubic-bezier(.22,.68,0,1)', fill:'both'
      });
      if (animation) animation.onfinish = finish;
      else finish();
    });
    details.addEventListener('toggle', () => {
      if (!animation) { expanded = details.open; answer.inert = !expanded; }
    });
    faqControllers.push({finish});
  });

  // Only read timeline geometry while visible; one passive scroll callback per frame.
  const timeline = page.querySelector('.studio-timeline');
  const steps = Array.from(page.querySelectorAll('.studio-workflow > li'));
  const nodes = steps.map(step => step.querySelector('.studio-step-number'));
  const vertical = matchMedia('(max-width: 900px)');
  let inView = false;
  let frame = 0;
  const clamp = value => Math.max(0, Math.min(1, value));
  const updateTimeline = () => {
    frame = 0;
    if (!timeline || !nodes.length) return;
    const bounds = timeline.getBoundingClientRect();
    const first = nodes[0].getBoundingClientRect();
    const last = nodes[nodes.length-1].getBoundingClientRect();
    const lineEnd = bounds.bottom - last.top - last.height/2;
    timeline.style.setProperty('--studio-track-end', `${Math.max(0,lineEnd)}px`);
    let progress;
    if (reduced.matches) progress = 1;
    else if (vertical.matches) {
      progress = clamp((innerHeight*.6 - first.top - first.height/2) / Math.max(1,last.top-first.top));
    } else {
      progress = clamp((innerHeight*.86 - first.top) / Math.max(1,innerHeight*.42));
    }
    timeline.style.setProperty('--studio-progress', String(progress));
    let current = 0;
    if (vertical.matches) {
      nodes.forEach((node,i) => { if(node.getBoundingClientRect().top + 22 <= innerHeight*.6) current=i; });
    } else current = Math.floor(progress*(steps.length-1));
    steps.forEach((step,i) => {
      step.classList.toggle('is-reached', reduced.matches || i<=current);
      step.classList.toggle('is-current', !reduced.matches && i===current);
      if (!reduced.matches && i===current) step.setAttribute('aria-current','step');
      else step.removeAttribute('aria-current');
    });
  };
  const queue = () => { if (!frame && inView) frame = requestAnimationFrame(updateTimeline); };
  if (timeline) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        inView = entries[0].isIntersecting;
        if(inView) queue();
      }, {rootMargin:'80px 0px'}).observe(timeline);
    } else inView = true;
    window.addEventListener('scroll',queue,{passive:true});
    window.addEventListener('resize',() => {
      faqControllers.forEach(controller=>controller.finish());
      updateTimeline();
    },{passive:true});
    if ('ResizeObserver' in window) new ResizeObserver(queue).observe(timeline);
    updateTimeline();
  }
  reduced.addEventListener('change', () => {
    if(reduced.matches) {
      revealObserver?.disconnect();
      faqControllers.forEach(controller=>controller.finish());
      activeAnimations.forEach(animation=>animation.cancel());
      activeAnimations.clear();
    }
    updateTimeline();
  });
  window.addEventListener('pageshow',() => {
    faqControllers.forEach(controller=>controller.finish());
    updateTimeline();
  });
})();
