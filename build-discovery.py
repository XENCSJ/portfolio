"""Refresh the existing page's static navigation and no-JS content from its data.

Header/footer, logo and approved detail copy remain the existing source of truth.
Run after editing xen-discovery-data.json; no network dependency at startup.
"""
from pathlib import Path
from html import escape as esc
import json
import re

root = Path(__file__).resolve().parent
data = json.loads((root / 'xen-discovery-data.json').read_text())
nodes = data['nodes']
themes = nodes['home']['children']
paths = {
    'identity': '<circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/>',
    'philosophy': '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5Z"/>',
    'creation': '<path d="m13 3 8 8-6 10-8-4L3 9Z M3 9l7 3m-3 5 3-5m3-9-3 9"/><circle cx="11" cy="12" r="1.5"/>',
    'connection': '<circle cx="5" cy="6" r="2.5"/><circle cx="19" cy="7" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="m7.5 6.2 9 .6M6.2 8.2l4.6 8.6m6.9-7.6-4.5 7.6"/>',
}

def icon(theme):
    return f'<svg class="xd-icon" viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">{paths[theme]}</svg>'

def link(href, label):
    attrs = ' target="_blank" rel="noopener noreferrer"' if href.startswith('https:') else ''
    return f'<a href="{esc(href, quote=True)}"{attrs}>{esc(label)}</a>'

cards = []
fallback = []
for i, theme in enumerate(themes, 1):
    n = nodes[theme]
    cards.append(f'''<a class="xd-theme" data-node="{theme}" href="#{theme}" aria-label="{n['ja']} — {n['caption']}">
<span class="xd-word-no">0{i}</span>{icon(theme)}<span class="xd-word-ja">{n['ja']}</span><span class="xd-word-en" lang="en">{n['title']}</span><span class="xd-caption">{n['caption']}</span><span class="xd-arrow" aria-hidden="true">↗</span></a>''')
    content = []
    def items(ids):
        for id in ids:
            node = nodes[id]
            if node.get('children'):
                items(node['children'])
                continue
            more = ''.join(f'<h4>{esc(m["title"])}</h4><p>{esc(m["text"])}</p>' for m in node.get('more', []))
            content.append(f'<details><summary>{esc(node["ja"])} <small>{esc(node["title"])}</small></summary><p>{esc(node["text"])}</p>{more}{link(node["href"], node["title"]+" ↗")}</details>')
    items(n['children'])
    fallback.append(f'<section id="{theme}" class="xd-fallback-theme"><h2>{n["ja"]}</h2><p>{esc(n["overview"])}</p>{"".join(content)}</section>')

explorer = f'''<div class="xd-explorer">
<section class="xd-stage" aria-label="4つのテーマからXENを知る" data-branch="home">
<div class="xd-orbit" aria-hidden="true"></div>
<div class="xd-center"><div class="xd-logo-wrap"><img class="xd-logo" src="./XEN_logo_fixed_black.svg" alt="XEN" width="2232" height="2293" fetchpriority="high"></div></div>
<nav class="xd-words" aria-label="テーマを選ぶ">{''.join(cards)}</nav>
</section><p class="xd-status xd-sr" aria-live="polite" aria-atomic="true"></p>
</div>
<div class="xd-fallback">{''.join(fallback)}</div>
<script type="application/json" id="xd-data">{json.dumps(data, ensure_ascii=False).replace('<', chr(92)+'u003c')}</script>'''

page = root / 'what-is-xen.html'
html = page.read_text()
html = re.sub(r'<div class="xd-explorer".*?</main>', lambda _: explorer+'\n</main>', html, flags=re.S)
html = re.sub(r'<div class="xd-intro">.*?</div>', '<div class="xd-intro"><p class="xd-kicker">XEN | CREATIVE STUDIO JAPAN</p><h1>WHAT IS XEN?</h1><p class="xd-copy">気になるテーマから、XENを知る。</p></div>', html, flags=re.S)
html = re.sub(r'<dialog class="xd-dialog".*?</dialog>', '<dialog id="xd-dialog" class="xd-dialog" aria-labelledby="xd-detail-title"><div class="xd-dialog-head"><button type="button" class="xd-detail-back" hidden>← 概要へ</button><span class="xd-location"></span><button type="button" class="xd-close" aria-label="詳細を閉じてテーマ選択へ戻る">閉じる ×</button></div><div class="xd-detail-scroll"><div class="xd-detail-content"></div></div></dialog>', html, flags=re.S)
html = html.replace('xen-discovery.css?v=20261025-discovery1', 'xen-discovery.css?v=20261026-intuitive1').replace('xen-discovery.js?v=20261025-discovery1','xen-discovery.js?v=20261026-intuitive1')
html = html.replace('人物・思想・創作・つながりを、漂う言葉から探索するインタラクティブな入口。', '人物・思想・創作・つながりを、4つのテーマから知るインタラクティブな入口。')
page.write_text(html)
