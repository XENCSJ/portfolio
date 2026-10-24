"""Render the approved graphic collection copy without paraphrasing.
Run after editing xen-graphic-content.json; source images are never transformed.
"""
from pathlib import Path
from html import escape as e
import json,re
ROOT=Path(__file__).resolve().parent
WORKS=json.loads((ROOT/'xen-graphic-content.json').read_text())['works']
LABELS={'front':'FRONT｜フロント','back':'BACK｜バック','detail':'DETAIL｜ディテール'}
def paragraphs(items,cls=''):
    return ''.join(f'<p{(" class="+chr(34)+cls+chr(34)) if cls else ""}>{e(t)}</p>' for t in items)
def print_sections(w):
    labels={'main':('01','FRONT','MAIN THEME','主題'),'manifesto':('02','BACK','MANIFESTO','思想'),'key':('03','BACK','KEY MESSAGE','核心')}
    parts=w['design_prints']
    indices=[i for part in parts for i in part['message_indices']]
    assert sorted(indices)==list(range(len(w['messages']))), f"Missing or duplicate English: {w['key']}"
    sections=[]
    for part in parts:
        role=part['role'];number,position,title,ja=labels[role]
        selected=part['message_indices']
        assert selected==sorted(selected), 'Preserve the original order within each print'
        en=' '.join(w['messages'][i][0] for i in selected)
        heading_id=f"graphic-{w['key']}-{role}-heading"
        enclass='xg-print-english xg-print-manifesto' if role=='manifesto' else 'xg-print-english'
        section=f'''<section class="xg-explanation xg-print-section" data-graphic-part="{role}" aria-labelledby="{heading_id}">
<p class="xg-print-location" lang="en">{number} / {position} PRINT</p>
<h3 id="{heading_id}"><span class="xg-print-heading-en" lang="en">{title}</span> <span lang="ja">— {ja}</span></h3>
<p class="{enclass}" lang="en">{e(en)}</p>
'''
        if role!='manifesto':
            assert len(selected)==1
            section+=f'<p class="xg-print-translation" lang="ja">{e(w["messages"][selected[0]][1])}</p>\n'
        section+=f'<p class="xg-print-concept" lang="ja">{e(part["concept"])}</p>\n</section>'
        sections.append(section)
    # No invented front English for works whose front print is motif-only.
    concept='' if any(part['role']=='main' for part in parts) else f'<section class="xg-explanation"><h3>CONCEPT<span>コンセプト</span></h3>{paragraphs(w["concept"])}</section>'
    return concept+'\n'+'\n'.join(sections)+'\n'
def gallery(w,context):
    prefix=f'{context}-{w["key"]}'
    imgs=''.join(f'<img src="{i["src"]}" alt="{e(w["name"])} {LABELS[i["view"]]}" width="1254" height="1254" loading="lazy" decoding="async" class="{("is-current" if n==0 else "")}" aria-hidden="{str(n!=0).lower()}">' for n,i in enumerate(w['images']))
    thumbs=''.join(f'<button type="button" data-graphic-thumb="{n}" aria-label="{LABELS[i["view"]]}を表示" aria-pressed="{str(n==0).lower()}"><img src="{i["src"]}" alt="" width="1254" height="1254" loading="lazy"><span>{LABELS[i["view"]].split("｜")[0]}</span></button>' for n,i in enumerate(w['images']))
    return f'''<div class="xg-gallery" data-graphic-gallery aria-label="{e(w['name'])}の作品画像"><div class="xg-stage" tabindex="0" role="group" aria-label="画像ギャラリー。左右の矢印キーで切り替え" aria-describedby="{prefix}-image-status">{imgs}</div><div class="xg-gallery-navigation"><button type="button" data-graphic-prev aria-label="前の画像">←</button><p id="{prefix}-image-status" data-graphic-image-status aria-live="polite">{LABELS['front']} · 1 / {len(w['images'])}</p><button type="button" data-graphic-next aria-label="次の画像">→</button></div><div class="xg-thumbnails">{thumbs}</div></div>'''
def dialog(w,context):
    is_shop=context=='shop'
    ident=f'graphic-{w["key"]}'
    title=w['title'] if is_shop else w['name']
    heading=f'<p class="xg-kicker">{w["number"]} / XEN GRAPHIC COLLECTION</p><h2 id="{ident}-title" tabindex="-1">{e(title)}</h2>'
    if is_shop:
        price=11000 if w['product_id']==160077299 else 9000
        content=f'''<p class="xg-catch">{e(w['catch'])}</p><p class="xg-overview">{e(w['summary'])}</p><p class="xg-price" data-graphic-price>¥{price:,} <small>（税込）</small></p><a class="xg-purchase" data-graphic-purchase href="{w['url']}" target="_blank" rel="noopener noreferrer">購入する ↗</a><details class="xg-concept" data-graphic-concept><summary aria-expanded="false" aria-controls="{ident}-copy">コンセプトを読む<span class="xg-disclosure-icon" aria-hidden="true">＋</span></summary><div class="xg-concept-panel" id="{ident}-copy"><div class="xg-approved-copy">{paragraphs(w['copy'].split(chr(10)+chr(10)))}</div></div></details><a class="xg-crosslink" href="./design.html#{ident}">デザインコンセプトを見る <span aria-hidden="true">↗</span></a>'''
    else:
        content=f'''<p class="xg-catch">{e(w['catch'])}</p>{print_sections(w)}<section class="xg-explanation"><h3>VISUAL DESIGN<span>視覚表現</span></h3><p>{e(w['visual'])}</p></section><section class="xg-explanation"><h3>SHOP<span>商品ページ</span></h3><a class="xg-crosslink" href="./apparel.html#{ident}">この作品の商品を見る <span aria-hidden="true">↗</span></a></section>'''
    return f'''<dialog class="xg-dialog xg-{context}-dialog" id="{ident}" data-graphic-dialog data-product-id="{w['product_id']}" data-graphic-cover="{w['images'][0]['src']}" data-graphic-name="{e(w['name'])}" style="--xg-accent:{w['color']}" aria-labelledby="{ident}-title"><div class="xg-dialog-bar"><span>{'SHOP / PRODUCT' if is_shop else 'DESIGN / WORK'}</span><button class="xg-close" type="button" data-graphic-close aria-label="詳細を閉じる">CLOSE <span aria-hidden="true">×</span></button></div><div class="xg-dialog-inner">{heading}<div class="xg-detail-grid"><section class="xg-gallery-section"><h3 class="xg-gallery-heading">GALLERY<span>作品画像</span></h3>{gallery(w,context)}</section><div class="xg-detail-copy">{content}</div></div></div></dialog>'''
def collection():
    cards=''.join(f'''<article class="xg-card" style="--xg-accent:{w['color']}" data-graphic-reveal><a href="#graphic-{w['key']}" class="xg-card-link" aria-haspopup="dialog"><div class="xg-card-image"><img src="{w['images'][0]['src']}" alt="{e(w['name'])} フロント" width="1254" height="1254" loading="lazy" decoding="async"></div><div class="xg-card-copy"><p class="xg-kicker">{w['number']} / GRAPHIC COLLECTION</p><h3>{e(w['name'])}</h3><p class="xg-catch">{e(w['catch'])}</p><p class="xg-overview">{e(w['summary'])}</p><span class="xg-card-cta">詳細を見る <span aria-hidden="true">↗</span></span></div></a></article>''' for w in WORKS)
    return f'''<section class="design-project xg-collection" id="xen-graphic-collection" aria-labelledby="xen-graphic-title"><div class="design-project-line" aria-hidden="true"></div><div class="design-project-heading"><p class="design-index">APPAREL / GRAPHIC DESIGN</p><h2 id="xen-graphic-title">XEN GRAPHIC COLLECTION</h2><p class="design-subtitle">思想を、身につけるアートへ。</p></div><div class="xg-intro">{paragraphs(['日々の行動、心のあり方、何気ない瞬間に宿る価値。','目には見えない思想や感情を、色彩・タイポグラフィ・グラフィックによって視覚化する。','XEN GRAPHIC COLLECTIONは、日常の中にある大切なメッセージを、身につけるアートとして表現した作品シリーズです。'])}</div><div class="xg-grid">{cards}</div><a class="contents-return" href="#design-contents">↑ 目次へ戻る</a></section>'''
def block(text,label,value,before):
    pattern=rf'<!-- {label}:START -->[\s\S]*?<!-- {label}:END -->'
    content=f'<!-- {label}:START -->\n{value}\n<!-- {label}:END -->'
    if re.search(pattern,text):return re.sub(pattern,lambda m:content,text)
    assert before in text,before
    return text.replace(before,content+'\n'+before,1)
for page,context in [('apparel.html','shop'),('design.html','design')]:
    path=ROOT/page;s=path.read_text()
    includes='<link rel="stylesheet" href="./xen-graphic-collection.css?v=20261024-1">\n<script defer src="./xen-graphic-collection.js?v=20261024-1"></script>\n<noscript><style>.xg-dialog{display:block;position:static;max-height:none;width:100%;margin:40px auto}.xg-dialog-bar,.xg-gallery-navigation,.xg-thumbnails{display:none}.xg-stage{aspect-ratio:auto}.xg-stage img{position:static;opacity:1}</style></noscript>'
    includes=includes.replace('xen-graphic-collection.js?v=20261024-1','xen-graphic-collection.js?v=20261025-images1')
    if context=='shop':includes=includes.replace('xen-graphic-collection.js?v=20261025-images1','xen-graphic-collection.js?v=20261025-character-first1')
    if context=='design':includes=includes.replace('xen-graphic-collection.css?v=20261024-1','xen-graphic-collection.css?v=20261024-structure1')
    s=block(s,'XEN-GRAPHIC-ASSETS',includes,'</head>')
    s=block(s,'XEN-GRAPHIC-DETAILS','\n'.join(dialog(w,context) for w in WORKS),'</body>')
    if context=='shop':
        w=WORKS[1]
        card=f'''<article class="base-product catalog-product" id="base-product-160077299" data-catalog-static data-after-product="159175661" data-shop-category="apparel"><a class="base-product-visual" href="#graphic-{w['key']}" aria-label="日日是好日の商品詳細を開く" aria-haspopup="dialog"><img src="{w['images'][0]['src']}" alt="日日是好日 スウェット" width="1254" height="1254" loading="lazy" decoding="async"></a><span class="base-product-brand">XEN</span><h3 class="base-product-name">日日是好日</h3><p class="base-product-price">¥11,000<span class="base-product-tax">（税込）</span></p><a class="base-product-cta" href="{w['url']}" target="_blank" rel="noopener noreferrer" aria-label="日日是好日 スウェット 購入する（新しいタブで開く）">購入する →</a><div class="base-product-links"></div></article>'''
        s=block(s,'XEN-GRAPHIC-SWEATSHIRT',card,'<article class="base-product catalog-product catalog-jewelry" id="lapis-lazuli-ring"')
    else:
        s=block(s,'XEN-GRAPHIC-COLLECTION',collection(),'<section class="design-project" id="apparel-graphics"')
        if 'href="#xen-graphic-collection"' not in s:
            needle='<li><a href="#apparel-graphics">'
            assert needle in s
            s=s.replace(needle,'<li><a href="#xen-graphic-collection"><span class="contents-project-label">XEN GRAPHIC COLLECTION<small class="contents-project-description" lang="ja">思想を、身につけるアートへ。</small></span><span aria-hidden="true">↘</span></a></li>'+needle,1)
    path.write_text(s)

# Reapply the shared SHOP/DESIGN image curation after regenerating approved copy.
from build_shop_gallery import render as render_shop_gallery
render_shop_gallery()
