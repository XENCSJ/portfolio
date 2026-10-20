/* The browser reads only public JSON; BASE credentials stay in GitHub Actions. */
(() => {
  'use strict';
  const root = document.querySelector('[data-base-products]');
  if (!root) return;
  const grid = root.querySelector('[data-base-grid]');
  const status = root.querySelector('[data-base-status]');
  const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
  const secureURL = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url : null;
    } catch (_) { return null; }
  };
  function validate(data) {
    if (data?.schema_version !== 1 || data.shop_url !== 'https://xen.official.ec/' ||
        !Array.isArray(data.items) || data.items.length > 6) throw new Error('Invalid catalog');
    const ids = new Set();
    for (const item of data.items) {
      const url = secureURL(item.url);
      if (!Number.isSafeInteger(item.id) || item.id < 1 || ids.has(item.id) ||
          typeof item.name !== 'string' || !item.name.trim() ||
          (item.price !== null && (!Number.isSafeInteger(item.price) || item.price < 0)) ||
          !url || url.origin !== 'https://xen.official.ec' || url.pathname !== `/items/${item.id}` || url.search || url.hash ||
          (item.image_url !== null && !secureURL(item.image_url)) ||
          typeof item.available !== 'boolean' ||
          !['item_now_on_sale', 'item_waiting_for_sale', 'item_end_of_sale'].includes(item.sales_status)) {
        throw new Error('Invalid product');
      }
      ids.add(item.id);
    }
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  }
  function card(item) {
    const article = element('article', 'base-product');
    const link = element('a', 'base-product-link');
    link.href = item.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    const visual = element('div', 'base-product-visual');
    const placeholder = element('span', 'base-product-placeholder', 'XEN');
    placeholder.setAttribute('aria-hidden', 'true');
    visual.append(placeholder);
    if (item.image_url) {
      const img = document.createElement('img');
      img.alt = ''; // The adjacent product name labels the same link.
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 640;
      img.height = 640;
      img.addEventListener('error', () => { img.remove(); }, { once: true });
      img.src = item.image_url;
      visual.append(img);
    }
    const copy = element('div', 'base-product-copy');
    copy.append(element('h3', 'base-product-name', item.name));
    const price = element('p', 'base-product-price', item.price === null ? '価格はストアでご確認ください' : yen.format(item.price));
    if (item.price !== null) price.append(element('span', 'base-product-tax', '税込'));
    copy.append(price);
    if (!item.available) {
      const label = item.sales_status === 'item_waiting_for_sale' ? 'COMING SOON' :
        item.sales_status === 'item_end_of_sale' ? '販売終了' : 'SOLD OUT';
      copy.append(element('span', 'base-product-state', label));
    }
    link.append(visual, copy);
    article.append(link);
    return article;
  }
  async function load() {
    root.setAttribute('aria-busy', 'true');
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      let data;
      try {
        const response = await fetch('./base-products.json', { cache: 'no-cache', signal: controller.signal });
        if (!response.ok) throw new Error('Catalog unavailable');
        data = await response.json();
      } finally { clearTimeout(timer); }
      validate(data);
      const cards = document.createDocumentFragment();
      data.items.forEach(item => cards.append(card(item)));
      grid.replaceChildren(cards);
      status.hidden = data.items.length > 0;
      if (!data.items.length) status.textContent = data.updated_at ?
        '現在、公開中の商品はありません。' : '最新の商品は公式ストアでご覧いただけます。';
    } catch (_) {
      // Never erase already rendered cards on a failed refresh.
      if (!grid.children.length) {
        status.hidden = false;
        status.textContent = '商品情報を読み込めませんでした。公式ストアでご覧ください。';
      }
    } finally { root.setAttribute('aria-busy', 'false'); }
  }
  load();
})();
