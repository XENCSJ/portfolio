/* The browser reads only public JSON; BASE credentials stay in GitHub Actions. */
(() => {
  'use strict';
  const root = document.querySelector('[data-base-products]');
  const related = [...document.querySelectorAll('[data-related-product]')];
  if (!root && !related.length) return;
  const roots = [root, ...related].filter(Boolean);
  const designTargets = { 157787639: 'shirowashi', 157783299: 'takoleo', 156849283: 'kuro-usagi' };
  const pinnedIds = [163232279, 162561554, 160058456, 159175661, 157787639, 157783299, 156849283, 156850693, 156851036, 156851056];
  // SHOP display order is independent of the scheduled BASE feed and DESIGN cards.
  const shopIds = [163232279, 162561554, 159175661, 157787639, 157783299, 156849283, 156850693, 156851036, 156851056];
  // User-supplied APPAREL images, 2026-10-23 JST. Versioned names avoid stale caches.
  const apparelImages = {
    156850693: './xen-apparel-signet-ring-20261023-8a2ce834d1.jpg',
    156851036: './xen-apparel-sculpted-choker-20261023-7605c8856a.jpg'
  };
  // DESIGN artwork is curated independently of the scheduled BASE product feed.
  const relatedImages = {
    157783299: './xen-design-takoleo-back-20261024-ef9126a3be.jpeg'
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
    const imageURL = relatedImages[item.id] || item.image_url;
    if (imageURL) {
      const img = document.createElement('img');
      img.alt = ''; // The adjacent product name labels the same link.
      img.loading = 'lazy';
      img.decoding = 'async';
      img.width = 640;
      img.height = 640;
      img.addEventListener('error', () => { img.remove(); }, { once: true });
      img.src = imageURL;
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
    // Preserve the approved jewelry display names and images.
    const title = sculpted ? `K18 Sculpted ${kind === 'choker' ? 'Choker' : 'Bangle'}` : item.name;
    const jewelry = sculpted || item.id === 156850693;
    const article = element('article', `base-product catalog-product${jewelry ? ' catalog-jewelry' : ''}`);
    article.id = `base-product-${item.id}`;
    article.dataset.shopCategory = jewelry ? 'jewelry' : 'apparel';
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
    if (jewelry) links.append(jewelryDesignLink(item, title));
    if (designTargets[item.id]) {
      const designLink = element('a', 'base-product-design-link', 'キャラクターデザインを見る →');
      designLink.href = `./design.html#${designTargets[item.id]}`;
      links.append(designLink);
    }
    // Keep purchase visible below the DESIGN link; preserve every other card's order.
    article.append(visual, brand, name, price, ...(jewelry ? [links, purchase] : [purchase, links]));
    return article;
  }
  function jewelryDesignLink(item, title) {
    const targets = { 156850693: 'k18-signet-ring', 156851036: 'product', 156851056: 'product' };
    const target = targets[item.id];
    const link = element('a', 'base-product-design-link', '詳細を見る →');
    link.href = `./design.html#${target}`;
    link.setAttribute('aria-label', `${title} の詳細を見る（DESIGNページ）`);
    return link;
  }
  function initializeShop(section) {
    if (!section.hasAttribute('data-shop-catalog')) return;
    const tablist = section.querySelector('[role="tablist"]');
    const tabs = [...tablist.querySelectorAll('[data-shop-filter]')];
    const grid = section.querySelector('[data-base-grid]');
    const cards = [...grid.children];
    const status = section.querySelector('[data-shop-status]');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const active = new Set();
    let current = 'all';
    const settle = () => { active.forEach(animation => animation.cancel()); active.clear(); };
    function select(tab, initial = false) {
      const category = tab.dataset.shopFilter;
      if (!initial && category === current) return;
      current = category;
      settle();
      tabs.forEach(button => {
        const selected = button === tab;
        button.setAttribute('aria-selected', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
      grid.setAttribute('aria-labelledby', tab.id);
      let count = 0;
      cards.forEach(card => {
        card.hidden = category !== 'all' && card.dataset.shopCategory !== category;
        if (card.hidden) return;
        const index = count++;
        if (reduced.matches || !card.animate || document.hidden) return;
        const animation = card.animate([
          { opacity: 0, transform: 'translateY(12px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 400, delay: index * 55, easing: 'ease-out', fill: 'backwards' });
        active.add(animation);
        animation.finished.then(() => { active.delete(animation); animation.cancel(); }, () => active.delete(animation));
      });
      status.textContent = `${tab.textContent}：${count}商品`;
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => select(tab));
      tab.addEventListener('keydown', event => {
        const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        tabs[next].focus();
        select(tabs[next]);
      });
    });
    // If a product anchor is followed while filtering, reveal the existing card.
    addEventListener('hashchange', () => {
      const target = cards.find(card => `#${card.id}` === location.hash);
      if (target?.hidden) { select(tabs[0]); target.scrollIntoView({ block: 'start', behavior: 'instant' }); }
    });
    section.addEventListener('focusin', event => { if (event.target.closest('.catalog-product')) settle(); });
    reduced.addEventListener('change', () => { if (reduced.matches) settle(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
    addEventListener('pagehide', settle);
    tablist.hidden = false;
    select(tabs[0], true);
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
        const items = isRelated ? data.items.filter(item => item.id === Number(section.dataset.relatedProduct)) : shopIds.map(id => data.items.find(item => item.id === id));
        const cards = document.createDocumentFragment();
        items.forEach(item => cards.append(card(item, isRelated)));
        const grid = section.querySelector('[data-base-grid]');
        // Unreleased local designs have no BASE ID, price or purchase URL.
        // Keep these cards across feed refreshes without adding them to BASE data.
        const localCards = [...grid.children].filter(node => node.hasAttribute('data-catalog-static'));
        grid.replaceChildren(cards, ...localCards);
        // Locally verified collection products keep their position without changing the BASE feed.
        localCards.forEach(card => {
          const after = document.getElementById(`base-product-${card.dataset.afterProduct}`);
          if (after && grid.contains(after)) after.after(card);
        });
        section.querySelector('[data-base-status]').hidden = true;
        if (!isRelated) initializeShop(section);
      });
      // Product anchors are inserted after the initial document navigation.
      if (root && /^#(?:base-product-\d+|lapis-lazuli-ring)$/.test(location.hash)) {
        const target = document.getElementById(location.hash.slice(1));
        if (target && root.contains(target)) target.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    } catch (_) {
      // Never erase already rendered cards on a failed refresh.
      roots.forEach(section => {
        if (!section.querySelector('[data-base-grid] > :not([data-catalog-static])')) {
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
