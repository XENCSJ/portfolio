"""NEWS generator. Publication dates come from successful Pages deployments, never commits."""
from __future__ import annotations
import argparse, copy, hashlib, html, json, os, re, subprocess, urllib.request
from datetime import datetime, timezone, timedelta
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
JST = timezone(timedelta(hours=9))
# Keep historical category IDs and URLs stable; translate labels only at render time.
CATEGORY_TITLES = json.loads((ROOT / 'category-titles.json').read_text())
CATEGORIES = ('SNAP', 'ARTWORKS', 'DESIGN', 'APPAREL', 'ARCHITECTURE', 'SPACE', 'SOUND', 'CINEMATIC', 'ANIMATION', 'STORYBOOKS', 'YOUTUBE', 'WEBSITE', 'CREATOR', 'STUDIO', 'INDEX', 'SNS-MANAGEMENT', 'PRICE-LIST')
RELEASE_CATEGORIES = ('SOUND', 'CINEMATIC', 'ANIMATION', 'YOUTUBE')
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

def groups(events, today=None):
    today = today or datetime.now(JST).date().isoformat()
    grouped, seen = {}, set()
    # First verified publication owns an ID, even if reintroduced later.
    for e in sorted(events, key=lambda e: (e['date'], e.get('publishedAt', ''), e['id'])):
        if e.get('status', 'published') != 'published': continue
        if e['id'] == PIN_ID or e.get('pinned'): raise ValueError('Fixed article belongs only in news-pinned.json')
        date = e['date']
        if datetime.strptime(date, '%Y-%m-%d').date().isoformat() != date: raise ValueError('Invalid date')
        if e['category'] not in CATEGORIES or not safe_url(e['url']) or not e.get('evidence'): raise ValueError('Invalid NEWS record')
        if e.get('publishedAt') and jst_date(e['publishedAt']) != date: raise ValueError('Date must be JST')
        if date > today: continue
        ids = set(e.get('contentIds', []))
        if not ids: raise ValueError('Use stable content IDs, even when count is unknown')
        fresh = {i for i in ids if (e['category'], i) not in seen}
        seen.update((e['category'], i) for i in ids)
        if not fresh: continue
        # Named new releases retain their own title and direct link. Historical
        # photo batches keep their approved date/category grouping.
        key = (date, e['category'], e.get('workId', ''))
        group_id = 'news-' + date + '-' + e['category'].lower()
        if e.get('workId'): group_id += '-' + hashlib.sha256(e['workId'].encode()).hexdigest()[:12]
        g = grouped.setdefault(key, {'id': group_id, 'date': date, 'category': e['category'], 'publishedAt': '', 'url': e['url'], 'contentIds': set(), 'events': [], 'countKnown': True})
        if e.get('type'): g['type'] = e['type']
        g['contentIds'].update(fresh)
        g['events'].append(e)
        g['countKnown'] = g['countKnown'] and e.get('countKnown', True)
        g['publishedAt'] = max(g['publishedAt'], e.get('publishedAt', ''))
        if len(g['events']) > 1: g['url'] = './creator.html#latest-videos' if e['category'] == 'YOUTUBE' else './' + e['category'].lower() + '.html'
    result = []
    nouns = {'SNAP': ('写真', '枚'), 'ARTWORKS': ('アートワーク', '作品'), 'CINEMATIC': ('映像作品', '本'), 'SOUND': ('音楽作品', '作品'), 'YOUTUBE': ('動画', '本'), 'DESIGN': ('デザイン作品', '点')}
    for g in grouped.values():
        g['count'] = len(g['contentIds']) if g['countKnown'] else None
        g['contentIds'] = sorted(g['contentIds'])
        entries = g.pop('events')
        noun, unit = nouns.get(g['category'], ('作品', '点'))
        if len(entries) == 1 and entries[0].get('title'):
            g['title'] = entries[0]['title']; g['body'] = entries[0].get('body', '')
        else:
            amount = f"を{g['count']}{unit}" if g['count'] is not None else 'を'
            g['title'] = f'新しい{noun}{amount}追加しました。'; g['body'] = ''
        result.append(g)
    return sorted(result, key=lambda g: (g['date'], g['publishedAt'], g['id']), reverse=True)

def select(events, pin, today=None):
    validate_pin(pin)
    grouped = groups(events, today)
    by_event = {e['id']: e for e in events}
    by_key = {(g['date'], g['category']): g for g in grouped}
    replacements = {}
    for e in events:
        if not e.get('replacesEventId'): continue
        source = by_event.get(e['replacesEventId'])
        if source is None or source is e or source.get('replacesEventId'):
            raise ValueError('Replacement needs an existing, unreplaced event')
        old = by_key.get((source['date'], source['category']))
        new = by_key.get((e['date'], e['category']))
        if old is None or new is None: continue
        if old['contentIds'] != sorted(source['contentIds']) or new['contentIds'] != sorted(e['contentIds']):
            raise ValueError('Replacement must identify a single article')
        if old['id'] in replacements or old['id'] == new['id']:
            raise ValueError('Ambiguous article replacement')
        replacements[old['id']] = new
    # Keep the replaced article's selection slot; show the replacement's actual date.
    # History stays intact, and future additions still evict the oldest selected slot.
    selected, seen = [], set()
    for group in grouped:
        item = replacements.get(group['id'], group)
        if item['id'] in seen: continue
        selected.append(item); seen.add(item['id'])
        if len(selected) == 4: break
    selected.sort(key=lambda g: (g['date'], g['publishedAt'], g['id']), reverse=True)
    return selected + [dict(pin, pinned=True)]

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

PIN_SVG = '<svg class="xen-news-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m9 3 6 0-1 6 4 4v2H6v-2l4-4-1-6ZM12 15v6"/></svg><span class="xen-news-sr">固定記事</span>'
def markup(items):
    rows = []
    for e in items:
        esc = lambda v: html.escape(str(v), quote=True)
        pin = PIN_SVG if e.get('pinned') else ''
        body = '<span class="xen-news-body">' + esc(e['body']) + '</span>' if e.get('body') else ''
        # Reuse the existing category/body slots; no new layout or CSS.
        label = CATEGORY_TITLES.get(e['category'].lower(), {}).get('en', e['category'])
        if e.get('type') and not body: body = '<span class="xen-news-body" lang="en">' + esc(e['type']) + '</span>'
        rows.append(f'<li class="xen-news-item" data-news-id="{esc(e["id"])}"><a class="xen-news-link" href="{esc(e["url"])}"><span class="xen-news-meta"><time class="xen-news-date" datetime="{e["date"]}">{e["date"].replace("-", ".")}</time><span class="xen-news-category" lang="en">{pin}{esc(label)}</span></span><span class="xen-news-copy"><span class="xen-news-title">{esc(e["title"])}</span>{body}</span><span class="xen-news-arrow" aria-hidden="true"></span></a></li>')
    return '\n'.join(rows)

def generate(check=False):
    pin = read('news-pinned.json'); events = read('news-events.json')
    items = select(events, pin)
    index = (ROOT / 'index.html').read_text()
    output, n = re.subn(r'<!-- NEWS:GENERATED:START -->.*?<!-- NEWS:GENERATED:END -->', '<!-- NEWS:GENERATED:START -->\n' + markup(items) + '\n<!-- NEWS:GENERATED:END -->', index, flags=re.S)
    if n != 1: raise ValueError('Exactly one NEWS output block required')
    archive = json.dumps(groups(events), ensure_ascii=False, indent=2) + '\n'
    if check:
        if output != index or archive != (ROOT / 'news-archive.json').read_text(): raise ValueError('Run python news.py to refresh generated output')
    else:
        (ROOT / 'index.html').write_text(output)
        (ROOT / 'news-archive.json').write_text(archive)
    return items

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
    if r.get('title'): result['title'] = r['title']
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
    select(events, read('news-pinned.json'))
    write('news-state.json', state); write('news-events.json', events)
    generate()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(); parser.add_argument('--refresh', action='store_true'); parser.add_argument('--check', action='store_true'); args = parser.parse_args()
    if args.refresh:
        from sync_works import refresh as refresh_works
        refresh_works()
    else: print(json.dumps(generate(args.check), ensure_ascii=False, indent=2))
