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
    return (TITLES[slug]["en"], TITLES[slug].get("navigationJa", TITLES[slug].get("navigationJa", TITLES[slug].get("navigationJa", TITLES[slug]["ja"]))), "./" + slug + ".html")
ABOUT = [("DISCOVER XEN", "XENを知る", "./what-is-xen.html")] + [category(slug) for slug in ("studio", "creator")]
WORKS = [category(slug) for slug in TITLES if slug not in ("studio", "creator", "price-list")]
NEWS = ("NEWS", "お知らせ・最新情報", "./news.html")
GROUPS = [NEWS, ("ABOUT XEN", "XENについて", ABOUT), ("WORKS", "制作・作品", WORKS),
          ("PRICING", "料金案内", "./price-list.html"),
          ("CONTACT", "制作相談", "./studio.html#contact")]


def label(en, ja, prefix):
    en_text = escape(en) + ('<span aria-hidden="true"> ↗</span>' if en == "CONTACT" and prefix == "xen-menu" else "")
    return f'<span class="{prefix}-en" lang="en">{en_text}</span><span class="{prefix}-ja" lang="ja">{escape(ja)}</span>'


def directory_news_link():
    en, ja, href = NEWS
    ja = ja.replace("・", "・<wbr>")
    icon = ('<svg class="index-icon" data-icon="newspaper" xmlns="http://www.w3.org/2000/svg" '
            'width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            'stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
            '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h5v5H6zM14 8h4m-4 4h4M6 16h12"/></svg>')
    return (f'<a class="index-link index-category-link" href="{href}"><span class="index-category-label">'
            f'<span class="index-en" lang="en">{icon}{en}</span><span class="index-ja" lang="ja">{ja}</span></span>'
            '<span class="index-single-label"><span class="index-destination-en" lang="en">VIEW NEWS</span>'
            '<span class="index-destination-ja" lang="ja">お知らせを見る</span></span><span class="arrow" aria-hidden="true">↗</span></a>')


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
            title = directory_news_link() if directory and en == NEWS[0] else link((en, ja, entries), prefix + "-category-link")
            items = ""
        else:
            title = label(en, ja, prefix)
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
