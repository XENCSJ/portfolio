/* Select once, before the first paint. Equal buckets; no storage or dependencies. */
(() => {
  'use strict';
  const names = ['original', 'sequential-trace', 'soft-reveal', 'reverse-trace', 'dual-reveal'];
  const root = document.documentElement;
  let index = 0;
  try {
    const forced = new URLSearchParams(location.search).get('xen-preview-set');
    if (/^[1-5]$/.test(forced || '')) index = Number(forced) - 1;
    else if (window.crypto?.getRandomValues) {
      const sample = new Uint32Array(1);
      // Reject the single excess value instead of introducing modulo bias.
      do { crypto.getRandomValues(sample); } while (sample[0] === 4294967295);
      index = sample[0] % 5;
    } else index = Math.floor(Math.random() * 5);
  } catch (_) { index = Math.floor(Math.random() * 5); }
  root.dataset.xenIndexSet = names[index];
})();
