/* The browser reads only public JSON; BASE credentials stay in GitHub Actions. */
(() => {
  'use strict';
  const root = document.querySelector('[data-base-products]');
  const related = [...document.querySelectorAll('[data-related-product]')];
  if (!root && !related.length) return;
  const roots = [root, ...related].filter(Boolean);
  const designTargets = { 157787639: 'shirowashi', 157783299: 'takoleo', 156849283: 'kuro-usagi' };
  const pinnedIds = [163232279, 162561554, 160058456, 159175661, 157787639, 157783299, 156849283, 156850693, 156851036, 156851056];
  // APPAREL display choices are independent of the scheduled BASE feed.
  const apparelExcludedIds = new Set([160058456]);
  // Main images observed on the official BASE product pages on 2026-10-23 JST.
  const apparelImages = {
    156850693: './xen-apparel-signet-ring-base-20261023.jpg',
    156851036: './xen-apparel-sculpted-choker-base-20261023.jpg'
  };
  const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' });
  const amount = new Intl.NumberFormat('en-US', { useGrouping: true, maximumFractionDigits: 0 });
  const priceLabel = value => `¥${amount.format(value)}`;
  const secureURL = value => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url : null;
    } catch (_) { return null; }
  };
  function validate(data) {
    if (data?.schema_version !== 1 || data.shop_url !== 'https://xen.official.ec/' ||
        !Array.isArray(data.items) || data.items.length !== pinnedIds.length ||
        data.items.some((item, index) => item.id !== pinnedIds[index])) throw new Error('Invalid catalog');
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
  function card(item, isRelated = false) {
    if (!isRelated) return catalogCard(item);
    const article = element('article', 'base-product');
    if (!isRelated) article.id = `base-product-${item.id}`;
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
      img.src = !isRelated && apparelImages[item.id] ? apparelImages[item.id] : item.image_url;
      visual.append(img);
    }
    const copy = element('div', 'base-product-copy');
    copy.append(element('span', 'base-product-brand', 'XEN'));
    const name = element('h3', 'base-product-name', item.name);
    name.title = item.name;
    copy.append(name);
    const price = element('p', 'base-product-price', item.price === null ? '価格はストアでご確認ください' : yen.format(item.price));
    if (item.price !== null) price.append(element('span', 'base-product-tax', '（税込）'));
    copy.append(price);
    if (!item.available) {
      const label = item.sales_status === 'item_waiting_for_sale' ? 'COMING SOON' :
        item.sales_status === 'item_end_of_sale' ? '販売終了' : 'SOLD OUT';
      copy.append(element('span', 'base-product-state', label));
    }
    // The whole card is one accessible link; do not nest an interactive button.
    copy.append(element('span', 'base-product-cta', !isRelated && item.available ? '購入する →' : '商品を見る →'));
    link.append(visual, copy);
    article.append(link);
    if (!isRelated && designTargets[item.id]) {
      const designLink = element('a', 'base-product-design-link', 'キャラクターデザインを見る →');
      designLink.href = `./design.html#${designTargets[item.id]}`;
      article.append(designLink);
    }
    return article;
  }
  function catalogCard(item) {
    const sculpted = [156851036, 156851056].includes(item.id);
    const kind = item.id === 156851036 ? 'choker' : 'bangle';
    // Preserve the approved display names, images and description for the two drawers.
    const title = sculpted ? `K18 Sculpted ${kind === 'choker' ? 'Choker' : 'Bangle'}` : item.name;
    const article = element('article', 'base-product catalog-product');
    article.id = `base-product-${item.id}`;
    const visual = element('a', 'base-product-visual');
    visual.href = item.url;
    visual.target = '_blank';
    visual.rel = 'noopener noreferrer';
    visual.setAttribute('aria-label', `${title} 商品ページ（新しいタブで開く）`);
    const imageURL = apparelImages[item.id] || (sculpted ? `./xen-jewelry-${kind}-white.jpg` : item.image_url);
    const placeholder = element('span', 'base-product-placeholder', 'XEN');
    placeholder.setAttribute('aria-hidden', 'true');
    visual.append(placeholder);
    if (imageURL) {
      const img = document.createElement('img');
      img.src = imageURL;
      img.alt = title;
      img.width = img.height = 640;
      img.loading = 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', () => { img.remove(); }, { once: true });
      visual.append(img);
    }
    const brand = element('span', 'base-product-brand', 'XEN');
    const name = element('h3', 'base-product-name', title);
    name.title = title;
    const price = element('p', 'base-product-price', item.price === null ? '価格はストアでご確認ください' : priceLabel(item.price));
    if (item.price !== null) price.append(element('span', 'base-product-tax', '（税込）'));
    if (!item.available) price.append(element('span', 'base-product-state', item.sales_status === 'item_waiting_for_sale' ? 'COMING SOON' : item.sales_status === 'item_end_of_sale' ? '販売終了' : 'SOLD OUT'));
    const purchase = element('a', 'base-product-cta', '購入する →');
    purchase.href = item.url;
    purchase.target = '_blank';
    purchase.rel = 'noopener noreferrer';
    purchase.setAttribute('aria-label', `${title} 購入する（新しいタブで開く）`);
    const links = element('div', 'base-product-links');
    if (sculpted || item.id === 156850693) links.append(jewelryDetails(item, title));
    if (designTargets[item.id]) {
      const designLink = element('a', 'base-product-design-link', 'キャラクターデザインを見る →');
      designLink.href = `./design.html#${designTargets[item.id]}`;
      links.append(designLink);
    }
    article.append(visual, brand, name, price, purchase, links);
    return article;
  }
  function jewelryDetails(item, title) {
    const details = element('details', 'jewelry-details');
    details.setAttribute('data-jewelry', '');
    const summary = document.createElement('summary');
    const panelId = `apparel-jewelry-${item.id}`;
    summary.setAttribute('aria-controls', panelId);
    summary.setAttribute('aria-expanded', 'false');
    const action = element('span', 'jewelry-action', 'VIEW DETAILS ');
    const icon = element('span', 'jewelry-icon', '＋');
    icon.setAttribute('data-apparel-icon', '');
    icon.setAttribute('aria-hidden', 'true');
    action.append(icon);
    summary.append(action);
    const panel = element('div', 'jewelry-panel');
    panel.id = panelId;
    const inner = element('div', 'jewelry-inner');
    inner.append(element('h3', 'jewelry-detail-title', title));
    inner.append(element('p', 'jewelry-description', item.id === 156850693
      ? 'K18イエローゴールドを使用した、XENのシンボル刻印入りシグネットリング。約10.6gの重量感とボリュームのあるフォルムが特徴です。'
      : 'K18特有の深い黄金色と、滑らかな鏡面仕上げが、光の角度によって流れるような表情をつくり出します。'));
    const price = element('p', 'base-product-price', item.price === null ? '価格はストアでご確認ください' : priceLabel(item.price));
    if (item.price !== null) price.append(element('span', 'base-product-tax', '（税込）'));
    inner.append(price);
    const store = element('a', 'jewelry-store', 'ONLINE STORE ↗');
    store.href = item.url;
    store.target = '_blank';
    store.rel = 'noopener noreferrer';
    store.setAttribute('aria-label', `${title} ONLINE STORE（新しいタブで開く）`);
    inner.append(store);
    panel.append(inner);
    details.append(summary, panel);
    return details;
  }
  async function load() {
    roots.forEach(section => section.setAttribute('aria-busy', 'true'));
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
      roots.forEach(section => {
        const isRelated = section.hasAttribute('data-related-product');
        const items = isRelated ? data.items.filter(item => item.id === Number(section.dataset.relatedProduct)) : data.items.filter(item => !apparelExcludedIds.has(item.id));
        const cards = document.createDocumentFragment();
        items.forEach(item => cards.append(card(item, isRelated)));
        section.querySelector('[data-base-grid]').replaceChildren(cards);
        section.querySelector('[data-base-status]').hidden = true;
      });
      // Product anchors are inserted after the initial document navigation.
      if (root && /^#base-product-\d+$/.test(location.hash)) {
        const target = document.getElementById(location.hash.slice(1));
        if (target && root.contains(target)) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    } catch (_) {
      // Never erase already rendered cards on a failed refresh.
      roots.forEach(section => {
        if (!section.querySelector('[data-base-grid]').children.length) {
          const status = section.querySelector('[data-base-status]');
          status.hidden = false;
          status.textContent = '商品情報を読み込めませんでした。';
          const fallback = element('a', 'base-products-fallback', '公式ストアで見る →');
          fallback.href = 'https://xen.official.ec/';
          fallback.target = '_blank';
          fallback.rel = 'noopener noreferrer';
          status.append(document.createTextNode(' '), fallback);
        }
      });
    } finally { roots.forEach(section => section.setAttribute('aria-busy', 'false')); }
  }
  load();
})();
