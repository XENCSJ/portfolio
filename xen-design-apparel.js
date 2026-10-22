/* Native details supplies keyboard and no-JavaScript behavior. Animate its panel only. */
(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-design-apparel]').forEach(details => {
    const summary = details.querySelector('summary');
    const panel = details.querySelector('.design-apparel-panel');
    const label = summary.querySelector('[data-apparel-label]');
    const icon = summary.querySelector('[data-apparel-icon]');
    let intendedOpen = details.open;
    let animation = null;
    const update = () => {
      summary.setAttribute('aria-expanded', String(intendedOpen));
      label.textContent = intendedOpen ? 'アパレルを閉じる' : 'アパレルを見る';
      icon.textContent = intendedOpen ? '−' : '＋';
    };
    const finish = () => {
      details.open = intendedOpen;
      panel.style.removeProperty('height');
      panel.style.removeProperty('overflow');
      animation = null;
    };
    update();
    summary.addEventListener('click', event => {
      event.preventDefault();
      const start = details.open ? panel.getBoundingClientRect().height : 0;
      if (animation) animation.cancel();
      intendedOpen = !intendedOpen;
      update();
      if (reduced.matches || !panel.animate) { finish(); return; }
      details.open = true;
      panel.style.height = `${start}px`;
      panel.style.overflow = 'hidden';
      const end = intendedOpen ? panel.scrollHeight : 0;
      animation = panel.animate([{ height:`${start}px` }, { height:`${end}px` }], {
        duration:320,easing:'cubic-bezier(.25,.1,.25,1)',fill:'both'
      });
      const current = animation;
      current.onfinish = () => {
        if (animation !== current) return;
        current.cancel();
        finish();
      };
    });
    // Respect a preference change while an opening or closing animation is running.
    reduced.addEventListener('change', () => {
      if (!reduced.matches || !animation) return;
      animation.cancel();
      finish();
    });
  });
})();
