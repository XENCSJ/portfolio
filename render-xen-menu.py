"""Generate every header and INDEX directory from one navigation definition.
Run: python render-xen-menu.py. Committed HTML also preserves the shared data.
"""
from html import escape
from pathlib import Path
import re
import json

ROOT = Path(__file__).resolve().parent
VERSION = "20261017-unified5"
HOME = ("INDEX", "トップページ", "./index.html")
# Stable URL stems are separate from the canonical display labels.
TITLES = json.loads((ROOT / "category-titles.json").read_text())
def category(slug):
    return (TITLES[slug]["en"], TITLES[slug].get("navigationJa", TITLES[slug].get("navigationJa", TITLES[slug]["ja"])), "./" + slug + ".html")
ABOUT = [("DISCOVER XEN", "XENを知る", "./what-is-xen.html")] + [category(slug) for slug in ("studio", "creator")]
WORKS = [category(slug) for slug in TITLES if slug not in ("studio", "creator", "price-list")]
GROUPS = [("ABOUT XEN", "XENについて", ABOUT), ("WORKS", "制作・作品", WORKS),
          ("PRICING", "料金案内", "./price-list.html"),
          ("CONTACT", "制作相談", "./studio.html#contact")]


def label(en, ja, prefix):
    en_text = escape(en) + ('<span aria-hidden="true"> ↗</span>' if en == "CONTACT" and prefix == "xen-menu" else "")
    return f'<span class="{prefix}-en" lang="en">{en_text}</span><span class="{prefix}-ja" lang="ja">{escape(ja)}</span>'


def navigation(page, directory=False):
    prefix = "index" if directory else "xen-menu"
    def link(item, extra=""):
        en, ja, href = item
        current = ' aria-current="page"' if href == "./" + page else ""
        arrow = '<span class="arrow" aria-hidden="true">↗</span>' if directory else ""
        return f'<a class="{prefix}-link {extra}" href="{href}"{current}>{label(en, ja, prefix)}{arrow}</a>'
    parts = [link(HOME, prefix + "-home")]
    for en, ja, entries in GROUPS:
        if isinstance(entries, str):
            title = link((en, ja, entries), prefix + "-category-link")
            items = ""
        else:
            title = label(en, ja, prefix)
            entries = [item for item in entries if not (directory and item[0] == "DISCOVER XEN")]
            items = '<ul class="' + prefix + '-items">' + "".join('<li>' + link(item) + '</li>' for item in entries) + '</ul>'
        parts.append(f'<section class="{prefix}-category"><h2 class="{prefix}-heading">{title}</h2>{items}</section>')
    return "\n".join(parts)


def render(path):
    source = path.read_text()
    menu = '<nav class="xen-menu" id="xen-menu" aria-label="サイトメニュー" tabindex="-1" hidden>\n' + navigation(path.name) + '\n</nav>'
    header = ('<header class="xen-header" id="xen-site-header">'
              '<a class="xen-header-home" href="./index.html" aria-label="XEN INDEXへ">'
              '<img class="xen-header-logo" src="./xen-header-logo.png" alt="XEN" width="6731" height="1520" fetchpriority="high" decoding="async"></a>'
              '<a class="xen-header-cart" href="https://xen.official.ec/" target="_blank" rel="noopener noreferrer" aria-label="XEN公式オンラインショップ（新しいタブで開く）">'
              '<img src="./xen-header-cart.png" alt="" width="56" height="51"></a>'
              '<button class="xen-header-toggle" type="button" aria-label="メニューを開く" aria-controls="xen-menu" aria-expanded="false">'
              '<span></span><span></span><span></span></button>' + menu + '</header>')
    result, count = re.subn(r'<header\b[^>]*id="xen-site-header"[^>]*>.*?</header>', lambda _: header, source, flags=re.S)
    if count != 1:
        raise ValueError(f"Expected one shared header: {path.name}")
    if path.name == "index.html":
        start = result.index('<section class="index" id="creative-index">')
        depth = 0
        for tag in re.finditer(r'</?section\b[^>]*>', result[start:]):
            depth += -1 if tag.group().startswith('</') else 1
            if depth == 0:
                end = start + tag.end()
                break
        else:
            raise ValueError("Unclosed INDEX directory")
        directory = ('<section class="index" id="creative-index">'
                     '<h1 class="section-label studio-heading"><span class="title-en">XEN | CREATIVE STUDIO JAPAN</span></h1>'
                     '<span class="home-ja">ホーム・作品一覧</span>'
                     '<nav class="index-directory" aria-label="カテゴリー一覧">' + navigation(path.name, True) + '</nav></section>')
        result = result[:start] + directory + result[end:]
    for asset in ("xen-ui.css", "xen-header.css", "xen-header.js", "xen-footer.css", "xen-sound.css"):
        result = re.sub(r'\./' + re.escape(asset) + r'(?:\?v=[^"\s]+)?', f'./{asset}?v={VERSION}', result)
    if result != source:
        path.write_text(result)
        print(path.name)


if __name__ == "__main__":
    for page in sorted(ROOT.glob("*.html")):
        render(page)
