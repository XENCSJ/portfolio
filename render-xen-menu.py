"""Render the shared bilingual menu, preserving each page's verified link targets.

Run from any directory with: python render-xen-menu.py
Only the menu, contact label, and shared asset versions are updated.
"""
from html import escape
from html.parser import HTMLParser
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
VERSION = "20261017-menu4"
ABOUT = [("STUDIO", "スタジオ"), ("CREATOR", "クリエイター")]
WORKS = [
    ("STORYBOOKS", "ストーリーブック"), ("ANIMATION", "アニメーション"),
    ("SOUND", "音楽"), ("CINEMATIC", "映像"), ("SNAP", "写真"),
    ("DESIGN", "デザイン"), ("APPAREL", "アパレル"),
    ("ARCHITECTURE", "建築"), ("SPACE", "空間"),
    ("ARTWORKS", "アートワーク"), ("SNS MANAGEMENT", "SNS運用"),
]


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.current = None

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.current = [dict(attrs), ""]

    def handle_data(self, data):
        if self.current is not None:
            self.current[1] += data

    def handle_endtag(self, tag):
        if tag == "a" and self.current is not None:
            self.links.append(self.current)
            self.current = None


def label(en, ja):
    return f'<span class="xen-menu-en" lang="en">{escape(en)}</span><span class="xen-menu-ja" lang="ja">{escape(ja)}</span>'


def render(path):
    source = path.read_text()
    match = re.search(r'<nav\b[^>]*\bid="xen-menu"[^>]*>.*?</nav>', source, re.S)
    if not match:
        raise ValueError(f"Missing shared menu: {path.name}")
    parser = Links()
    parser.feed(match.group())
    targets = {}
    for attrs, text in parser.links:
        # The first label is English in both the previous and new markup.
        for en, _ in [("INDEX", ""), *ABOUT, *WORKS, ("PRICE LIST", "")]:
            if text.strip().startswith(en):
                targets[en] = attrs
    page_links = Links()
    page_links.feed(source)
    contacts = [attrs for attrs, _ in page_links.links
                if "xen-contact-primary" in attrs.get("class", "").split()]
    if not contacts:
        # INDEX keeps consultation in the menu after its duplicate footer is removed.
        contacts = [attrs for attrs, text in parser.links
                    if text.strip().startswith("CONTACT")]
    if not contacts or len({a.get("href") for a in contacts}) != 1:
        raise ValueError(f"Missing or ambiguous consultation target: {path.name}")

    def link(en, ja, attrs, class_name="xen-menu-link"):
        if not attrs.get("href"):
            raise ValueError(f"Missing existing link for {en}: {path.name}")
        kept = {k: v for k, v in attrs.items()
                if k in ("href", "target", "rel", "aria-current")}
        attributes = " ".join(f'{k}="{escape(v, quote=True)}"' for k, v in kept.items())
        return f'<a class="{class_name}" {attributes}>{label(en, ja)}</a>'

    def group(en, ja, items, group_id):
        heading = f'<h2 class="xen-menu-heading" id="{group_id}">{label(en, ja)}</h2>'
        links = "".join(f'<li>{link(e, j, targets[e])}</li>' for e, j in items)
        return f'<section class="xen-menu-category" aria-labelledby="{group_id}">{heading}<ul class="xen-menu-items">{links}</ul></section>'

    parts = [link("INDEX", "トップページ", targets["INDEX"], "xen-menu-link xen-menu-index")]
    parts.append(group("ABOUT XEN", "XENについて", ABOUT, "xen-menu-about"))
    parts.append(group("WORKS", "制作・作品", WORKS, "xen-menu-works"))
    for en, ja, attrs in [("PRICE LIST", "料金一覧", targets["PRICE LIST"]),
                          ("CONTACT", "制作相談・お問い合わせ", contacts[0])]:
        item = link(en, ja, attrs, "xen-menu-link xen-menu-category-link")
        parts.append(f'<section class="xen-menu-category"><h2 class="xen-menu-heading">{item}</h2></section>')
    menu = '<nav class="xen-menu" id="xen-menu" aria-label="サイトメニュー" tabindex="-1" hidden>\n' + "\n".join(parts) + '\n</nav>'
    result = source[:match.start()] + menu + source[match.end():]
    result = result.replace("Instagramで問い合わせる", "制作相談")
    for asset in ("xen-ui.css", "xen-header.js"):
        result = re.sub(r'\./' + re.escape(asset) + r'(?:\?v=[^"\s]+)?', f'./{asset}?v={VERSION}', result)
    if result != source:
        path.write_text(result)
        print(path.name)


if __name__ == "__main__":
    for page in sorted(ROOT.glob("*.html")):
        render(page)
