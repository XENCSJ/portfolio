"""NEWS generator. Publication dates come from successful Pages deployments, never commits."""
from __future__ import annotations
import argparse, copy, hashlib, html, json, os, re, subprocess, urllib.request
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parent
JST = timezone(timedelta(hours=9))
# Keep historical category IDs and URLs stable; translate labels only at render time.
CATEGORY_TITLES = json.loads((ROOT / 'category-titles.json').read_text())
DISPLAY_CATEGORIES = {'SNAP': 'NEWS', 'ARTWORKS': 'NEWS', 'APPAREL': 'DESIGN', 'SPACE': 'ARCHITECTURE',
                      'SOUND': 'MUSIC', 'CINEMATIC': 'VIDEO', 'STORYBOOKS': 'NEWS', 'YOUTUBE': 'YouTube',
                      'WEBSITE': 'NEWS'}
PAGE_SIZE = 10
MAX_ARTICLES = 50
LOGO = './xen-header-logo.png'
CATEGORIES = ('SNAP', 'ARTWORKS', 'DESIGN', 'APPAREL', 'ARCHITECTURE', 'SPACE', 'SOUND', 'CINEMATIC', 'ANIMATION', 'STORYBOOKS', 'YOUTUBE', 'WEBSITE', 'VIDEO', 'MUSIC', 'EVENT', 'NEWS')
RELEASE_CATEGORIES = ('SOUND', 'CINEMATIC', 'ANIMATION', 'YOUTUBE', 'MUSIC', 'VIDEO')
AUTO = ('SNAP', 'ARTWORKS')
PIN_ID = 'website-renewal-20261020'
PIN = {'id': PIN_ID, 'date': '2026-10-20', 'category': 'WEBSITE', 'title': 'ホームページリニューアル', 'body': 'XEN CSJ公式サイトをリニューアルしました。各クリエイティブ領域の作品やサービスをより見やすく整理し、デザインやアニメーション、操作性を刷新しました。', 'url': 'https://xencsj.github.io/portfolio/'}

def read(name): return json.loads((ROOT / name).read_text())
def write(name, value):
    (ROOT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
def git(*args): return subprocess.check_output(['git', *args], cwd=ROOT).decode()
def jst_date(value):
    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if dt.tzinfo is None: raise ValueError('Publication timestamp needs timezone')
    return dt.astimezone(JST).date().isoformat()
def safe_url(value):
    return value == PIN['url'] or bool(re.fullmatch(r'\./[a-z0-9-]+\.html(?:#[a-zA-Z0-9_-]+)?', value)) or bool(re.fullmatch(r'https://youtu\.be/[A-Za-z0-9_-]{11}', value))
def validate_pin(pin):
    if pin != PIN: raise ValueError('Fixed renewal article changed; restore news-pinned.json')

def group_id(event):
    if event.get('article'):
        return event['id']
    return f"news-{event['date']}-{event['category'].lower()}"

def groups(events, today=None):
    today = today or datetime.now(JST).date().isoformat()
    grouped, seen = {}, set()
    # First verified publication owns an ID, even if reintroduced later.
    for e in sorted(events, key=lambda e: (e['date'], e.get('publishedAt', ''), e['id'])):
        if e['id'] == PIN_ID or e.get('pinned'): raise ValueError('Fixed article belongs only in news-pinned.json')
        date = e['date']
        if datetime.strptime(date, '%Y-%m-%d').date().isoformat() != date: raise ValueError('Invalid date')
        url = e.get('url', '')
        external = e.get('article') and re.fullmatch(r'https://[^\s]+', url) and urlsplit(url).hostname
        if e['category'] not in CATEGORIES or (url and not (safe_url(url) or external)) or not e.get('evidence'):
            raise ValueError('Invalid NEWS record')
        if e.get('publishedAt') and jst_date(e['publishedAt']) != date: raise ValueError('Date must be JST')
        if date > today: continue
        ids = set(e.get('contentIds', []))
        if not ids: raise ValueError('Use stable content IDs, even when count is unknown')
        fresh = {i for i in ids if (e['category'], i) not in seen}
        seen.update((e['category'], i) for i in ids)
        if not fresh: continue
        key = group_id(e)
        g = grouped.setdefault(key, {'id': key, 'date': date, 'category': e['category'], 'publishedAt': '', 'url': url, 'contentIds': set(), 'events': [], 'countKnown': True})
        g['contentIds'].update(fresh)
        g['events'].append(e)
        if e.get('thumbnail') and not g.get('thumbnail'):
            g['thumbnail'] = e['thumbnail']
        g['countKnown'] = g['countKnown'] and e.get('countKnown', True)
        g['publishedAt'] = max(g['publishedAt'], e.get('publishedAt', ''))
        if len(g['events']) > 1:
            if e['category'] == 'YOUTUBE': g['url'] = './creator.html#latest-videos'
            elif (ROOT / (e['category'].lower() + '.html')).is_file(): g['url'] = './' + e['category'].lower() + '.html'
            elif g['url'] != url: g['url'] = ''
    result = []
    nouns = {'SNAP': ('写真', '枚'), 'ARTWORKS': ('アートワーク', '作品'), 'CINEMATIC': ('映像作品', '本'), 'SOUND': ('音楽作品', '作品'), 'YOUTUBE': ('動画', '本'), 'DESIGN': ('デザイン作品', '点')}
    for g in grouped.values():
        g['count'] = len(g['contentIds']) if g['countKnown'] else None
        g['contentIds'] = sorted(g['contentIds'])
        entries = g.pop('events')
        noun, unit = nouns.get(g['category'], ('作品', '点'))
        if len(entries) == 1 and entries[0].get('title'):
            g['title'] = entries[0]['title']; g['body'] = entries[0].get('body', '')
            if entries[0].get('indexTitle'):
                g['indexTitle'] = entries[0]['indexTitle']
            if 'secondaryCategory' in entries[0]:
                secondary = entries[0]['secondaryCategory']
                if secondary not in CATEGORIES: raise ValueError('Invalid secondary NEWS category')
                g['secondaryCategory'] = secondary
        else:
            amount = f"を{g['count']}{unit}" if g['count'] is not None else 'を'
            g['title'] = f'新しい{noun}{amount}追加しました。'; g['body'] = ''
        result.append(g)
    return sorted(result, key=lambda g: (g['date'], g['publishedAt'], g['id']), reverse=True)

def articles(events, pin, today=None):
    """Keep all groups in the archive, including explicitly withdrawn notices."""
    validate_pin(pin)
    today = today or datetime.now(JST).date().isoformat()
    available = groups(events, today)
    by_event = {e['id']: e for e in events}
    by_group = {g['id']: g for g in available}
    withdrawn = set()
    for event in events:
        if not event.get('replacesEventId') or event['date'] > today: continue
        source = by_event.get(event['replacesEventId'])
        if source is None or source is event or source.get('replacesEventId'):
            raise ValueError('Replacement needs an earlier, unreplaced event')
        old, new = by_group.get(group_id(source)), by_group.get(group_id(event))
        if old is None or new is None: continue
        if (old['id'] == new['id'] or old['id'] in withdrawn or
                old['contentIds'] != sorted(source['contentIds']) or
                new['contentIds'] != sorted(event['contentIds'])):
            raise ValueError('Replacement must identify a single article')
        withdrawn.add(old['id'])
    if pin['date'] <= today:
        available.append(dict(pin))
    for item in available:
        item['listed'] = item['id'] not in withdrawn
        item['displayCategory'] = DISPLAY_CATEGORIES.get(item['category'], item['category'])
        if not item.get('thumbnail'):
            ids = item.get('contentIds', [])
            video = next((c[8:] for c in ids if re.fullmatch(r'youtube:[A-Za-z0-9_-]{11}', c)), None)
            image = next((c[6:] for c in ids if c.startswith('image:')), None)
            item['thumbnail'] = ('https://i.ytimg.com/vi/' + video + '/hqdefault.jpg' if video else
                                 './' + quote(image) if image else LOGO)
    return sorted(available, key=lambda g: (g['date'], g.get('publishedAt', ''), g['id']), reverse=True)

def paginate(archive):
    visible = [item for item in archive if item['listed']][:MAX_ARTICLES]
    return [visible[i:i + PAGE_SIZE] for i in range(0, len(visible), PAGE_SIZE)] or [[]]

class Gallery(HTMLParser):
    def __init__(self): super().__init__(); self.paths = set()
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag != 'a' or 'gallery-item' not in a.get('class', '').split(): return
        path = unquote(urlsplit(a.get('href', '')).path).removeprefix('./')
        if path and not path.startswith('/') and '..' not in Path(path).parts and re.search(r'\.(?:jpe?g|png|webp|avif)$', path, re.I): self.paths.add(path)

def tree_images(sha):
    images = {}
    for row in git('ls-tree', '-rz', sha).split('\0'):
        if not row: continue
        meta, path = row.split('\t', 1)
        if re.search(r'\.(?:jpe?g|png|webp|avif)$', path, re.I): images[path] = meta.split()[2]
    return images

def inventory(sha):
    images = tree_images(sha); data = {}
    for category in AUTO:
        p = Gallery(); p.feed(git('show', sha + ':' + category.lower() + '.html'))
        if not p.paths: raise ValueError('Gallery missing: manual review required for ' + category)
        if not p.paths <= images.keys(): raise ValueError('Gallery contains missing image assets')
        data[category] = {p: images[p] for p in sorted(p.paths)}
    return data

def scan(state, current, publication):
    """Pure delta processing; no writes. Conservative mixed add/remove detection."""
    state = copy.deepcopy(state)
    if publication['sha'] in state['processed']: return state, []
    events = []
    for cat in AUTO:
        before = state['inventory'][cat]; after = current[cat]
        added = set(after) - set(before); removed = set(before) - set(after)
        seen_paths = set(state['seenPaths']); seen_blobs = set(state['seenBlobs'])
        unique = {}
        for path in sorted(added):
            blob = after[path]
            if path not in seen_paths and blob not in seen_blobs:
                unique.setdefault(blob, path)
        if unique:
            ids = ['image:' + path for path in unique.values()]
            event = {'id': 'pages-' + publication['sha'] + '-' + cat.lower(), 'category': cat, 'date': jst_date(publication['publishedAt']), 'publishedAt': publication['publishedAt'], 'url': './' + cat.lower() + '.html', 'contentIds': ids, 'evidence': publication['evidence']}
            if removed:
                state['pending'].append(dict(event, reason='同じ公開で削除も検出。差し替えの可能性があるため管理登録で確認。'))
            else: events.append(event)
        state['seenPaths'] = sorted(seen_paths | set(after))
        state['seenBlobs'] = sorted(seen_blobs | set(after.values()))
    state['inventory'] = current
    state['processed'].append(publication['sha'])
    state['lastPublication'] = publication
    return state, events

def article_url(item):
    url = item.get('url')
    if url and url.startswith('./'):
        target = urlsplit(url)
        path = ROOT / unquote(target.path)
        if not path.is_file() or (target.fragment and not re.search(
                r"""\bid=["']""" + re.escape(target.fragment) + r"""["']""", path.read_text())):
            url = None
    return url

PIN_SVG = '<svg class="xen-news-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6"/></svg><span class="xen-news-sr">固定記事</span>'

def index_news_rows(archive):
    recent = [item for item in archive if item['listed'] and item['id'] != PIN_ID][:4]
    pinned = [item for item in archive if item['listed'] and item['id'] == PIN_ID]
    rows = []
    for item in recent + pinned:
        date = item['date']
        categories = [item['category']]
        if item.get('secondaryCategory'):
            categories.append(item['secondaryCategory'])
        label = ' / '.join(CATEGORY_TITLES.get(c.lower(), {}).get('en', c) for c in categories)
        pin = PIN_SVG if item['id'] == PIN_ID else ''
        body = ''.join(f'<span class="xen-news-body">{html.escape(part)}</span>'
                       for part in item.get('body', '').split('\n\n') if part)
        title = item.get('indexTitle', item['title'])
        url = article_url(item)
        tag = 'a' if url else 'div'
        href = f' href="{html.escape(url)}"' if url else ''
        arrow = '<span class="xen-news-arrow" aria-hidden="true"></span>' if url else ''
        rows.append(f'<li class="xen-news-item" data-news-id="{html.escape(item["id"])}">'
                    f'<{tag} class="xen-news-link"{href}><span class="xen-news-meta">'
                    f'<time class="xen-news-date" datetime="{date}">{date.replace("-", ".")}</time>'
                    f'<span class="xen-news-category" lang="en">{pin}{html.escape(label)}</span></span>'
                    f'<span class="xen-news-copy"><span class="xen-news-title">{html.escape(title)}</span>'
                    f'{body}</span>{arrow}</{tag}></li>')
    return '\n'.join(rows)

def replace_news_block(template, contents):
    block = '<!-- NEWS:GENERATED:START -->\n' + contents + '\n<!-- NEWS:GENERATED:END -->'
    result, count = re.subn(r'<!-- NEWS:GENERATED:START -->.*?<!-- NEWS:GENERATED:END -->', lambda _: block, template, flags=re.S)
    if count != 1: raise ValueError('Exactly one NEWS output block required')
    return result

def card(item):
    esc = html.escape
    date = item['date']
    thumb = item['thumbnail']
    logo = ' is-logo' if thumb == LOGO else ''
    url = article_url(item)
    title = item['title'].removesuffix('を公開しました。').removesuffix('を掲載しました。')
    if item['category'] == 'YOUTUBE':
        title = re.sub(r'^『(.+)』$', r'\1', title)
    title = re.sub(r'^新しい(.+?)を(\d+)(枚|作品|本|点)追加しました。$', r'\1を\2\3追加', title)
    tag = 'a' if url else 'div'
    href = f' href="{esc(url)}"' if url else ''
    return (f'<li data-news-id="{esc(item["id"])}"><{tag} class="news-card"{href}>'
            f'<span class="news-thumb{logo}"><img src="{esc(thumb)}" alt="" width="480" height="270" '
            'loading="lazy" decoding="async"></span><span class="news-copy">'
            f'<span class="news-meta"><time datetime="{date}">{date.replace("-", ".")}</time>'
            f'<span class="news-tag" lang="en">{esc(item["displayCategory"])}</span></span>'
            f'<span class="news-title">{esc(title)}</span></span></{tag}></li>')

def page_name(number):
    return 'news.html' if number == 1 else f'news-{number}.html'

SITE_URL = 'https://xencsj.github.io/portfolio/'

def news_metadata(number, items):
    title = 'NEWS | XEN Official Website' if number == 1 else f'NEWS（{number}ページ目） | XEN Official Website'
    description = 'XEN（ゼン）の作品公開、音楽、映像、イベントの最新情報を掲載。'
    if number > 1:
        description = f'XEN（ゼン）のお知らせ一覧、{number}ページ目。過去の作品公開や活動の記録を掲載。'
    if items:
        description += f'収録期間は{items[-1]["date"]}〜{items[0]["date"]}。'
    url = SITE_URL + page_name(number)
    image = urljoin(SITE_URL, items[0]['thumbnail'] if items else LOGO)
    return '\n'.join([
        '<!-- NEWS:META:START -->',
        f'<title>{title}</title>',
        f'<meta name="description" content="{description}">',
        f'<link rel="canonical" href="{url}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="XEN CSJ">',
        f'<meta property="og:title" content="{title}">',
        f'<meta property="og:description" content="{description}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{html.escape(image, quote=True)}">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<!-- NEWS:META:END -->',
    ])

def sitemap(page_count):
    paths = ['', 'what-is-xen.html', *(slug + '.html' for slug in CATEGORY_TITLES),
             *(page_name(n) for n in range(1, page_count + 1))]
    urls = ''.join(f'  <url><loc>{SITE_URL}{path}</loc></url>\n' for path in paths)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n')

def pager(number, count):
    def control(target, text, name, rel):
        if not 1 <= target <= count:
            return f'<span class="disabled" aria-disabled="true" aria-label="{name}">{text}</span>'
        return f'<a href="./{page_name(target)}#news-list" aria-label="{name}"{rel}>{text}</a>'
    links = [control(number - 1, '〈', '前のページ', ' rel="prev"')]
    for n in range(1, count + 1):
        links.append(f'<span aria-current="page" aria-label="{n}ページ目">{n}</span>' if n == number
                     else control(n, str(n), f'{n}ページ目', ''))
    links.append(control(number + 1, '〉', '次のページ', ' rel="next"'))
    return '<nav class="news-pages" aria-label="お知らせのページ切り替え">' + ''.join(links) + '</nav>'

def generate(check=False):
    archive = articles(read('news-events.json'), read('news-pinned.json'))
    pages = paginate(archive)
    template = (ROOT / 'news.html').read_text()
    files = {'news-archive.json': json.dumps(archive, ensure_ascii=False, indent=2) + '\n'}
    files['index.html'] = replace_news_block((ROOT / 'index.html').read_text(), index_news_rows(archive))
    for number, items in enumerate(pages, 1):
        listing = '<ul class="news-list">' + '\n'.join(card(e) for e in items) + '</ul>' if items else '<p>現在、お知らせはありません。</p>'
        result = replace_news_block(template, listing + '\n' + pager(number, len(pages)))
        result, count = re.subn(r'<!-- NEWS:META:START -->.*?<!-- NEWS:META:END -->',
                                lambda _: news_metadata(number, items), result, flags=re.S)
        if count != 1:
            raise ValueError('Expected one NEWS metadata block')
        files[page_name(number)] = result
    files['sitemap.xml'] = sitemap(len(pages))
    obsolete = [ROOT / page_name(n) for n in range(len(pages) + 1, MAX_ARTICLES // PAGE_SIZE + 1)
                if (ROOT / page_name(n)).exists()]
    for path in obsolete:
        if '<!-- NEWS:GENERATED:START -->' not in path.read_text():
            raise ValueError(f'Refusing to remove unrelated file {path.name}')
    for name, value in files.items():
        path = ROOT / name
        if path.exists() and value == path.read_text(): continue
        if check: raise ValueError(f'Run python news.py to refresh {name}')
        path.write_text(value)
    if check and obsolete: raise ValueError('Obsolete NEWS pages remain')
    for path in obsolete: path.unlink()
    return pages

def api(path, method='GET'):
    req = urllib.request.Request('https://api.github.com/repos/' + os.environ['GITHUB_REPOSITORY'] + '/' + path, method=method, headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28'})
    with urllib.request.urlopen(req, timeout=45) as r: return json.load(r)

def registered_event(r, publication):
    """An on-site addition date must never replace a verified music/video release date."""
    release = r.get('releaseDate')
    if r['category'] in RELEASE_CATEGORIES and not release:
        raise ValueError('Music/video registration needs verified releaseDate and releaseEvidence')
    date = jst_date(publication['publishedAt'])
    evidence = publication['evidence']
    if release:
        if datetime.strptime(release, '%Y-%m-%d').date().isoformat() != release or not r.get('releaseEvidence'):
            raise ValueError('Invalid or unsupported original release date')
        if release > date: raise ValueError('Work is not publicly released yet')
        date, evidence = release, {'release': r['releaseEvidence'], 'deployment': evidence}
    result = {'id': r['id'], 'category': r['category'], 'date': date,
              'sitePublishedAt': publication['publishedAt'], 'url': './'+r['page']+r.get('anchor',''),
              'contentIds': r['contentIds'], 'countKnown': r.get('countKnown',True), 'evidence': evidence}
    if not release: result['publishedAt'] = publication['publishedAt']
    for field in ('title', 'thumbnail', 'article'):
        if field in r: result[field] = r[field]
    return result

def refresh():
    """Read successful deployment statuses, then inspect that exact published Git tree."""
    state = read('news-state.json'); events = read('news-events.json')
    baseline = state['baselineSha']; cutoff = state['baselinePublishedAt']
    publications = []
    for page in range(1, 21):
        deployments = api(f'deployments?environment=github-pages&per_page=100&page={page}')
        if not deployments: break
        stop = False
        for d in deployments:
            if d['created_at'] < cutoff: stop = True; continue
            sha = d['sha']
            if sha in state['processed']: continue
            # Successful first-party Pages deployments only; no PR branch code execution.
            if d.get('ref') not in ('main', 'refs/heads/main', sha): continue
            if subprocess.run(['git','merge-base','--is-ancestor',baseline,sha], cwd=ROOT).returncode: continue
            if subprocess.run(['git','merge-base','--is-ancestor',sha,'HEAD'], cwd=ROOT).returncode: continue
            successes = [s for s in api(f'deployments/{d["id"]}/statuses?per_page=100') if s['state'] == 'success' and s.get('environment_url', '').rstrip('/') == PIN['url'].rstrip('/')]
            if not successes: continue
            s = min(successes, key=lambda s:s['created_at'])
            publications.append({'sha':sha, 'publishedAt':s['created_at'], 'evidence':s.get('log_url') or d['statuses_url']})
        if stop: break
    else: raise RuntimeError('Deployment history exceeds scan window; review before advancing')
    for p in sorted(publications, key=lambda p:p['publishedAt']):
        if p['sha'] in state['processed']: continue
        previous = state.get('lastPublication', {}).get('sha', baseline)
        # Do not treat a rollback or stale deployment as a new publication.
        if subprocess.run(['git','merge-base','--is-ancestor',previous,p['sha']], cwd=ROOT).returncode: continue
        # Optional explicit registrations: use stable IDs and a unique marker/asset on the published page.
        try: registrations = json.loads(git('show', p['sha'] + ':news-content.json'))
        except subprocess.CalledProcessError: registrations = []
        known = {e['id'] for e in events}
        current = inventory(p['sha'])
        # NEWS-only deployments must be a no-op: never create a bot-commit loop.
        if current == state['inventory'] and not any(r.get('status') == 'published' and r['id'] not in known for r in registrations): continue
        state, added = scan(state, current, p); events.extend(added)
        for r in registrations:
            if r['id'] in known or r.get('status') != 'published': continue
            if r['category'] not in CATEGORIES or not re.fullmatch(r'[a-z0-9-]+\.html', r['page']): raise ValueError('Invalid managed registration')
            source = git('show',p['sha'] + ':' + r['page'])
            if not r.get('marker') or r['marker'] not in source: raise ValueError('Registered work marker missing in deployed page')
            events.append(registered_event(r, p))
            known.add(r['id'])
    # Validate first; errors must not partially update files.
    articles(events, read('news-pinned.json'))
    write('news-state.json', state); write('news-events.json', events)
    generate()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--refresh', action='store_true'); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    if args.refresh: refresh()
    else: print(json.dumps(generate(args.check), ensure_ascii=False, indent=2))
