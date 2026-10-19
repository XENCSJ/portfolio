/* XEN CSJ GA4: internal navigation only. External clicks and page views
   belong to GA4 automatic/enhanced measurement; never send them twice. */
(() => {
  'use strict';
  if (window.__xenAnalyticsBound) return;
  window.__xenAnalyticsBound = true;

  const measurementId = 'G-E7KV6PL3GD';
  const basePath = new URL('./', window.location.href).pathname;
  const works = new Set([
    'storybooks.html', 'animation.html', 'sound.html', 'cinematic.html',
    'snap.html', 'design.html', 'apparel.html', 'architecture.html',
    'space.html', 'artworks.html', 'sns-management.html'
  ]);

  const placement = (link) => {
    if (link.closest('.xen-menu')) return 'menu';
    if (link.closest('.xen-footer, footer')) return 'footer';
    if (link.closest('.orbit, .wheel')) return 'orbit';
    if (link.closest('#creative-index')) return 'index';
    return 'content';
  };

  const track = (event) => {
    if (event.type === 'auxclick' && event.button !== 1) return;
    if (event.type === 'click' && event.button !== 0) return;
    const target = event.target;
    const link = target && target.closest ? target.closest('a[href]') : null;
    if (!link || link.hasAttribute('download')) return;
    let destination;
    try { destination = new URL(link.getAttribute('href'), window.location.href); }
    catch (_) { return; }
    if (destination.origin !== window.location.origin) return;

    let eventName;
    if (destination.pathname === basePath + 'studio.html' &&
        ['#contact', '#studio-contact'].includes(destination.hash)) {
      eventName = 'xen_contact_click';
    } else {
      const file = destination.pathname.slice(basePath.length);
      if (!destination.pathname.startsWith(basePath) || !works.has(file) ||
          destination.pathname === window.location.pathname) return;
      eventName = 'xen_work_click';
    }

    // Do not send link text, query strings, form fields, or contact details.
    // Do not cancel, delay, redirect, or otherwise change navigation.
    if (typeof window.gtag !== 'function') return;
    try {
      window.gtag('event', eventName, {
        send_to: measurementId,
        destination_page: destination.pathname,
        link_placement: placement(link),
        transport_type: 'beacon'
      });
    } catch (_) { /* Analytics must never interrupt the site's controls. */ }
  };

  // Delegation also covers links added by existing site scripts.
  document.addEventListener('click', track, {capture: true, passive: true});
  document.addEventListener('auxclick', track, {capture: true, passive: true});
})();
