/* Gold Border Tracing. Explicit card allowlist; no gallery/media-wide decoration. */
(() => {
  'use strict';
  const page = document.body;
  if (!page || page.dataset.goldTraceReady || !page.classList.contains('detail-page')) return;
  const candidates = {
    'studio-page': '.studio-service-link, .mvv-detail',
    'creator-page': '.cp-field-detail, .support-shell',
    'storybooks-page': '.work',
    'animation-page': '.work',
    'sound-page': '.sound-release-card',
    'cinematic-page': '.cinematic-work',
    'snap-page': '.gallery-description-card',
    'design-page': '.design-description',
    'apparel-page': '.base-product, .work',
    'architecture-page': '.arch-project',
    'space-page': '.space-feature',
    'artworks-page': '.gallery-description-card',
    'sns-management-page': '.sns-metrics, .sns-process-list > li, .sns-fit',
    'price-list-page': '.price-category-nav > a',
    'gold-trace-preview': '[data-gold-trace-demo]'
  };
  const key = Object.keys(candidates).find(name => page.classList.contains(name));
  if (!key) return; // INDEX is excluded by both body type and the page allowlist.
  page.dataset.goldTraceReady = 'true';
  const selector = candidates[key], ns = 'http://www.w3.org/2000/svg';
  const records = new Map();

  // Composite ancestor backgrounds: transparent cards on black are eligible;
  // white/light cards are never recolored or decorated.
  function isDark(node) {
    let rgb = [0, 0, 0], remaining = 1;
    for (let el = node; el && remaining > .001; el = el.parentElement) {
      const values = getComputedStyle(el).backgroundColor.match(/[\d.]+/g);
      if (!values || values.length < 3) continue;
      const alpha = values.length > 3 ? Number(values[3]) : 1;
      rgb = rgb.map((n, i) => n + Number(values[i]) * alpha * remaining);
      remaining *= 1 - alpha;
    }
    rgb = rgb.map(n => n + 255 * remaining);
    return Math.max(...rgb) < 90;
  }
  const number = n => Number.parseFloat(n) || 0;
  function radius(value, w, h, inset) {
    const parts = value.split(/\s+/);
    const px = (v, size) => v.endsWith('%') ? number(v) * size / 100 : number(v);
    return [Math.max(0, px(parts[0], w) - inset), Math.max(0, px(parts[1] || parts[0], h) - inset)];
  }
  function outline(w, h, style) {
    const i = 1.5, x = i, y = i, right = w - i, bottom = h - i;
    const radii = ['borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomRightRadius', 'borderBottomLeftRadius'].map(k => radius(style[k], w, h, i));
    radii.forEach(r => { if (!r[0] || !r[1]) { r[0] = 0; r[1] = 0; } });
    const [tl,tr,br,bl] = radii;
    const scale = Math.min(1, (w-2*i)/(tl[0]+tr[0]||1), (w-2*i)/(bl[0]+br[0]||1), (h-2*i)/(tl[1]+bl[1]||1), (h-2*i)/(tr[1]+br[1]||1));
    radii.forEach(r => { r[0] *= scale; r[1] *= scale; });
    const arc = (r, endX, endY) => r[0] && r[1] ? `A${r[0]} ${r[1]} 0 0 1 ${endX} ${endY}` : '';
    return `M${x+tl[0]} ${y}H${right-tr[0]}${arc(tr,right,y+tr[1])}V${bottom-br[1]}${arc(br,right-br[0],bottom)}H${x+bl[0]}${arc(bl,x,bottom-bl[1])}V${y+tl[1]}${arc(tl,x+tl[0],y)}Z`;
  }
  function measure(el, record, box) {
    const s = getComputedStyle(el);
    const width = box ? box.inlineSize : el.offsetWidth;
    const height = box ? box.blockSize : el.offsetHeight;
    if (width < 4 || height < 4) return;
    const d = outline(width, height, s);
    const signature = `${width}|${height}|${d}`;
    if (record.signature === signature) return;
    record.signature = signature;
    record.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    Object.assign(record.svg.style, {width:`${width}px`,height:`${height}px`,left:`${-number(s.borderLeftWidth)}px`,top:`${-number(s.borderTopWidth)}px`});
    record.paths.forEach(path => path.setAttribute('d', d));
  }
  // ResizeObserver follows real border-box sizes, including expanding disclosures.
  // No per-frame JS, interval, scroll handler or layout-changing wrapper.
  const resize = 'ResizeObserver' in window ? new ResizeObserver(entries => {
    for (const entry of entries) {
      const record = records.get(entry.target);
      if (record) measure(entry.target, record, entry.borderBoxSize?.[0]);
    }
  }) : null;
  function attach(el) {
    if (records.has(el) || !isDark(el)) return;
    const s = getComputedStyle(el);
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class','xen-gold-trace'); svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false'); svg.setAttribute('preserveAspectRatio','none');
    // Existing icon reveal scans svg > *. A group keeps its animation away
    // from these paths, without altering the site's original reveal code.
    const group = document.createElementNS(ns,'g'); svg.appendChild(group);
    const paths = ['base','glow','tail','head'].map(type => {
      const path = document.createElementNS(ns,'path');
      path.setAttribute('class',`gold-trace-${type}${type === 'base' ? '' : ' gold-trace-moving'}`);
      path.setAttribute('pathLength','1000'); group.appendChild(path); return path;
    });
    if (s.position === 'static') el.setAttribute('data-gold-trace-position','');
    el.setAttribute('data-gold-trace-active','');
    const record = {svg,paths}; records.set(el,record); el.appendChild(svg);
    measure(el,record); resize?.observe(el,{box:'border-box'});
  }
  document.querySelectorAll(selector).forEach(attach);
  if (!resize) {
    const refresh = () => records.forEach((r,el) => measure(el,r));
    window.addEventListener('resize',refresh,{passive:true});
    document.addEventListener('toggle',refresh,true);
  }
  // BASE replaces its product list asynchronously. Observe that one list only.
  const products = key === 'apparel-page' && document.querySelector('.base-products-grid');
  if (products) new MutationObserver(() => {
    records.forEach((r,el) => {if (!el.isConnected) {resize?.unobserve(el);records.delete(el);}});
    products.querySelectorAll('.base-product').forEach(attach);
  }).observe(products,{childList:true});
})();
