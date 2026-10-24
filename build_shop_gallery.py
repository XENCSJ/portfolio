"""Render the same curated image arrays in SHOP and DESIGN, preserving their copy."""
from pathlib import Path
from html import escape
import json
import re

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / 'xen-shop-gallery.json').read_text())
PRODUCTS = DATA['products']
CHARACTERS = DATA.get('characters', {})


def gallery(key, product, context='shop'):
    images = product['images']
    prefix = f'{context}-{key}'
    slides, thumbs = [], []
    for n, image in enumerate(images):
        current = n == 0
        label = escape(image['label'])
        slides.append(
            f'<img src="{image["src"]}" alt="{escape(product["name"])} {label}" '
            f'width="{image["width"]}" height="{image["height"]}" loading="lazy" decoding="async" '
            f'class="{"is-current" if current else ""}" aria-hidden="{str(not current).lower()}">')
        thumbs.append(
            f'<button type="button" data-graphic-thumb="{n}" aria-label="{label}を表示" '
            f'aria-pressed="{str(current).lower()}"><img src="{image["thumbnail"]}" alt="" '
            f'width="192" height="192" loading="lazy" decoding="async"><span>{n+1}</span></button>')
    return (
        f'<div class="xg-gallery xsg-gallery" data-graphic-gallery aria-label="{escape(product["name"])}の商品画像">'
        f'<div class="xg-stage" tabindex="0" role="group" aria-label="画像ギャラリー。左右スワイプまたは矢印キーで切り替え" '
        f'aria-describedby="{prefix}-image-status">{"".join(slides)}</div>'
        f'<div class="xg-gallery-navigation"><button type="button" data-graphic-prev aria-label="前の画像">←</button>'
        f'<p id="{prefix}-image-status" data-graphic-image-status aria-live="polite">{escape(images[0]["label"])} · 1 / {len(images)}</p>'
        f'<button type="button" data-graphic-next aria-label="次の画像">→</button></div>'
        f'<div class="xg-thumbnails">{"".join(thumbs)}</div>'
        '<button type="button" class="xsg-enlarge" data-shop-enlarge aria-haspopup="dialog">画像を拡大する ＋</button></div>')


def character_dialog(key, product):
    ident = f'character-{key}'
    name = escape(product['name'])
    return (
        f'<dialog class="xg-dialog xg-shop-dialog" id="{ident}" data-graphic-dialog data-graphic-preserve-cover '
        f'data-graphic-cover="{product["images"][0]["src"]}" data-graphic-feed-index="1" '
        f'data-product-id="{product["product_id"]}" data-graphic-name="{name}" style="--xg-accent:#c9b58b" aria-labelledby="{ident}-title">'
        '<div class="xg-dialog-bar"><span>SHOP / PRODUCT</span><button class="xg-close" type="button" data-graphic-close '
        'aria-label="詳細を閉じる">CLOSE <span aria-hidden="true">×</span></button></div>'
        f'<div class="xg-dialog-inner"><h2 id="{ident}-title" tabindex="-1">{name}</h2><div class="xg-detail-grid">'
        '<section class="xg-gallery-section"><h3 class="xg-gallery-heading">GALLERY<span>商品画像</span></h3>'
        f'{gallery(key, product)}</section><div class="xg-detail-copy">'
        f'<p class="xg-price" data-graphic-price>¥{product["price"]:,} <small>（税込）</small></p>'
        f'<a class="xg-purchase" data-graphic-purchase href="{product["url"]}" target="_blank" rel="noopener noreferrer">購入する ↗</a>'
        f'<a class="xg-crosslink" href="./design.html#{key}">キャラクターデザインを見る <span aria-hidden="true">↗</span></a>'
        '</div></div></div></dialog>')


def render_page(filename, context):
    path = ROOT / filename
    text = path.read_text()
    for key, product in PRODUCTS.items():
        pattern = rf'<dialog\b[^>]*id="graphic-{re.escape(key)}"[\s\S]*?</dialog>'
        matches = list(re.finditer(pattern, text))
        assert len(matches) == 1, key
        original = matches[0].group()
        updated = re.sub(r'data-graphic-cover="[^"]+"', f'data-graphic-cover="{product["images"][0]["src"]}"', original)
        updated, count = re.subn(r'<div class="xg-gallery(?: xsg-gallery)?"[\s\S]*?</section>',
                                 lambda _: gallery(key, product, context) + '</section>', updated, count=1)
        assert count == 1, key
        text = text.replace(original, updated, 1)
        if context == 'shop':
            # Only the sweatshirt card is static; the other three use the existing feed renderer.
            pattern = rf'(<article\b[^>]*id="base-product-{product["product_id"]}"[\s\S]*?<img )[^>]+>'
        else:
            pattern = rf'(<a href="#graphic-{re.escape(key)}" class="xg-card-link"[^>]*><div class="xg-card-image"><img )[^>]+>'
        image = product['images'][0]
        text = re.sub(pattern, lambda m: m[1] + f'src="{image["src"]}" alt="{escape(product["name"])} グラフィック" '
                      f'width="{image["width"]}" height="{image["height"]}" loading="lazy" decoding="async">', text, count=1)
    if context == 'shop':
        block = '<!-- XEN-CHARACTER-GALLERIES:START -->\n' + '\n'.join(
            character_dialog(key, product) for key, product in CHARACTERS.items()) + '\n<!-- XEN-CHARACTER-GALLERIES:END -->'
        if '<!-- XEN-CHARACTER-GALLERIES:START -->' in text:
            text = re.sub(r'<!-- XEN-CHARACTER-GALLERIES:START -->[\s\S]*?<!-- XEN-CHARACTER-GALLERIES:END -->', lambda _: block, text)
        else:
            text = text.replace('</body>', block + '\n</body>', 1)
    assets = ('<!-- XEN-SHOP-GALLERY:START -->\n'
              '<link rel="stylesheet" href="./xen-shop-gallery.css?v=20261024-3">\n'
              '<script defer src="./xen-shop-gallery.js?v=20261024-3"></script>\n'
              '<!-- XEN-SHOP-GALLERY:END -->')
    if '<!-- XEN-SHOP-GALLERY:START -->' in text:
        text = re.sub(r'<!-- XEN-SHOP-GALLERY:START -->[\s\S]*?<!-- XEN-SHOP-GALLERY:END -->', lambda _: assets, text)
    else:
        text = text.replace('<!-- XEN-GRAPHIC-ASSETS:END -->', '<!-- XEN-GRAPHIC-ASSETS:END -->\n' + assets, 1)
    path.write_text(text)


def render():
    render_page('apparel.html', 'shop')
    render_page('design.html', 'design')


if __name__ == '__main__':
    render()
