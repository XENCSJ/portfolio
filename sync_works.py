"""Synchronize published work blocks with a durable catalog and the existing NEWS UI.

Standard library only. HTML is edited by inserting identity attributes in start tags;
the surrounding source, typography, scripts and layout are never reserialized.
"""
from __future__ import annotations
import argparse
import copy
import hashlib
import html
import json
import re
import subprocess
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import news

ROOT = Path(__file__).resolve().parent
PAGES = ('index', 'studio', 'creator', 'storybooks', 'animation', 'sound',
         'cinematic', 'snap', 'design', 'apparel', 'architecture', 'space',
         'artworks', 'sns-management', 'price-list')
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
BLOCKS = {'work', 'sound-song', 'design-project', 'arch-project'}
WORK_PAGES = {'sound', 'cinematic', 'animation', 'storybooks', 'snap', 'design',
              'apparel', 'architecture', 'space', 'artworks'}
SONG = 'sound:tochu-no-mamade'


class Node:
    def __init__(self, tag='', attrs=None, parent=None, offset=0, raw=''):
        self.tag, self.attrs, self.parent = tag, attrs or {}, parent
        self.offset, self.raw, self.children, self.text = offset, raw, [], []

    def walk(self):
        yield self
        for child in self.children:
            yield from child.walk()

    def ancestors(self):
        p = self.parent
        while p:
            yield p
            p = p.parent

    def label(self):
        return ' '.join(' '.join(self.text).split())


class Document(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source, self.root = source, Node()
        self.stack = [self.root]
        self.lines = [0]
        for m in re.finditer('\n', source):
            self.lines.append(m.end())
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        line, column = self.getpos()
        node = Node(tag, dict(attrs), self.stack[-1], self.lines[line-1]+column,
                    self.get_starttag_text())
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, 0, -1):
            if self.stack[i].tag == tag:
                del self.stack[i:]
                break

    def handle_data(self, value):
        for n in self.stack:
            n.text.append(value)


def classes(node):
    return set(node.attrs.get('class', '').split())


def assets(node):
    values = []
    for n in node.walk():
        a = n.attrs
        value = a.get('data-youtube-id') or a.get('data-video-id')
        if value and re.fullmatch(r'[\w-]{11}', value):
            values.append('youtube:' + value)
        for key in ('src', 'href', 'data-src'):
            url = a.get(key, '')
            match = re.search(r'(?:youtube(?:-nocookie)?\.com/embed/|youtu\.be/)([\w-]{11})', url)
            if match:
                values.append('youtube:' + match[1])
            match = re.search(r'open\.spotify\.com/(?:embed/)?(album|track)/([A-Za-z0-9]+)', url)
            if match:
                values.append('spotify:' + match[1] + ':' + match[2])
            if n.tag == 'a' and 'gallery-item' in classes(n) and key == 'href':
                values.append('image:' + unquote(urlsplit(url).path).removeprefix('./'))
    # A cover can identify a standalone song without a streaming link.
    if not values:
        for n in node.walk():
            if n.tag == 'img' and n.attrs.get('src'):
                values.append('image:' + unquote(urlsplit(n.attrs['src']).path).removeprefix('./'))
    return sorted(set(values))


def title(node):
    a = node.attrs
    if a.get('data-work-title'):
        return a['data-work-title']
    for n in node.walk():
        if n.tag in ('h2', 'h3') and n.label():
            return n.label()
    return (a.get('aria-label', '').removesuffix('を拡大') or
            next((n.attrs.get('alt') for n in node.walk() if n.attrs.get('alt')), '') or
            next((n.attrs.get('title') for n in node.walk() if n.attrs.get('title')), ''))


def work_status(node):
    for n in (node, *node.ancestors()):
        if n.attrs.get('data-work-status') in ('draft', 'private', 'archived'):
            return n.attrs['data-work-status']
        if 'hidden' in n.attrs or n.attrs.get('aria-hidden') == 'true':
            return 'draft'
    status = node.attrs.get('data-work-status', 'published')
    if status != 'published':
        raise ValueError('Unknown data-work-status: ' + status)
    return status


def discover(sources):
    """Read real work containers; never announce arbitrary changed text or files."""
    found, rewritten, ids = [], {}, set()
    for page, source in sources.items():
        doc = Document(source)
        nodes = list(doc.root.walk())
        selected = set()
        edits = []
        html_ids = {n.attrs['id'] for n in nodes if n.attrs.get('id')}
        for n in nodes:
            a, c = n.attrs, classes(n)
            parents = list(n.ancestors())
            if not any(p.tag == 'main' for p in parents):
                continue
            if any(p in selected or p.tag in ('template', 'noscript', 'header', 'footer', 'nav') for p in parents):
                continue
            explicit = bool(a.get('data-work-id'))
            block = bool(c & BLOCKS)
            if page == 'space' and 'project-group' in c:
                block = True
            if page == 'creator' and 'project-group' in c and any(p.attrs.get('id') == 'concept-project' for p in parents):
                block = True
            gallery = 'gallery-item' in c and page in WORK_PAGES - {'apparel'}
            if not (explicit or block or gallery):
                continue
            selected.add(n)
            media = assets(n)
            if not media and not explicit:
                if 'project-group' in c:
                    selected.remove(n)
                    continue
                raise ValueError(f'{page}: work block has no stable identity; add data-work-id')
            category = a.get('data-work-category', page.upper())
            if category not in news.CATEGORIES:
                raise ValueError('Unknown work category: ' + category)
            key = a.get('id') or a.get('data-work-key') or a.get('aria-labelledby', '').split(' ')[0]
            identity = a.get('data-work-id') or (page + ':' + key if key else page + ':' + hashlib.sha256('|'.join(media).encode()).hexdigest()[:20])
            if identity in ids:
                raise ValueError('Duplicate work ID: ' + identity + '; give a new work its own ID')
            ids.add(identity)
            anchor = a.get('id')
            added = ''
            if not anchor:
                anchor = 'work-' + hashlib.sha256(identity.encode()).hexdigest()[:16]
                if anchor in html_ids:
                    raise ValueError('Duplicate work anchor: ' + anchor)
                html_ids.add(anchor)
                added += ' id="' + anchor + '"'
            if not explicit:
                added += ' data-work-id="' + html.escape(identity, quote=True) + '"'
            if added:
                pos = n.offset + len(n.raw) - (2 if n.raw.endswith('/>') else 1)
                edits.append((pos, added))
            label = title(n)
            if not label:
                raise ValueError('Work title missing: ' + identity)
            found.append({'id': identity, 'title': label, 'category': category,
                          'page': page + '.html', 'url': './' + page + '.html#' + anchor,
                          'status': work_status(n), 'contentIds': media or [identity],
                          'type': 'NEW RELEASE'})
        for pos, added in sorted(edits, reverse=True):
            source = source[:pos] + added + source[pos:]
        rewritten[page] = source
    return found, rewritten


def inventory(sources, products, videos):
    works, output = discover(sources)
    if 'data-base-products' in sources.get('apparel', ''):
        for p in products.get('items', []):
            identity = 'base:' + str(p['id'])
            works.append({'id': identity, 'title': p['name'], 'category': 'APPAREL',
                          'page': 'apparel.html', 'url': './apparel.html#base-products-title',
                          'status': p.get('status', 'published'), 'contentIds': [identity],
                          'type': 'NEW RELEASE'})
    # The creator's latest videos are rendered from this JSON, not static iframes.
    for v in videos.get('items', []):
        identity = 'youtube:' + v['id']
        works.append({'id': identity, 'title': v['title'], 'category': 'YOUTUBE',
                      'page': 'creator.html', 'url': 'https://youtu.be/' + v['id'],
                      'status': v.get('status', 'published'), 'contentIds': [identity],
                      'type': 'NEW RELEASE'})
    return works, output


def reconcile(catalog, current, events, publication, baseline=False):
    """Only a first successful publication announces an ID; edits never reset it."""
    catalog, events = copy.deepcopy(catalog), copy.deepcopy(events)
    records = {r['id']: r for r in catalog['works']}
    known_media = {c for r in records.values() if r.get('publishedAt') or r.get('baseline')
                   for c in r.get('aliases', r['contentIds'])}
    known_media.update(c for e in events for c in e.get('contentIds', []))
    active = set()
    for work in current:
        wid = work['id']
        if work['status'] not in ('published', 'draft', 'private', 'archived'):
            raise ValueError('Invalid publication status: ' + work['status'])
        if wid in active:
            raise ValueError('Duplicate catalog work: ' + wid)
        active.add(wid)
        previous = records.get(wid)
        new = previous is None
        if new:
            previous = dict(work, publishedAt=None, baseline=baseline,
                            aliases=list(work['contentIds']))
            records[wid] = previous
        old_media = set(previous.get('aliases', previous['contentIds']))
        previous.update(work)
        previous['aliases'] = sorted(old_media | set(work['contentIds']))
        if work['status'] != 'published' or previous.get('publishedAt') or previous.get('baseline'):
            continue
        if not publication:
            raise ValueError('New publication requires a successful deployment timestamp')
        news.jst_date(publication['publishedAt'])
        previous['publishedAt'] = publication['publishedAt']
        previous['evidence'] = publication['evidence']
        # A second placement/identical copy of a known work is not a new release.
        repeated = bool(set(work['contentIds']) & known_media)
        known_media.update(work['contentIds'])
        if repeated:
            previous['duplicatePlacement'] = True
            continue
        events.append({'id': 'work-' + hashlib.sha256(wid.encode()).hexdigest()[:20],
                       'workId': wid, 'date': news.jst_date(publication['publishedAt']),
                       'publishedAt': publication['publishedAt'], 'category': work['category'],
                       'title': work['title'], 'type': 'NEW RELEASE', 'url': work['url'],
                       'status': 'published', 'contentIds': work['contentIds'],
                       'countKnown': True, 'evidence': publication['evidence']})
    for wid, r in records.items():
        if wid not in active:
            r['status'] = 'archived'
    for e in events:
        r = records.get(e.get('workId'))
        if r:
            e.update(title=r['title'], url=r['url'], status=r['status'])
    catalog['works'] = sorted(records.values(), key=lambda r: r['id'])
    return catalog, events


def local_inventory():
    return inventory({p: (ROOT / (p + '.html')).read_text() for p in PAGES},
                     news.read('base-products.json'), news.read('youtube-latest.json'))


def save(catalog, events, output):
    news.select(events, news.read('news-pinned.json'))
    for page, source in output.items():
        (ROOT / (page + '.html')).write_text(source)
    news.write('works.json', catalog)
    news.write('news-events.json', events)
    news.generate()


def bootstrap():
    if (ROOT / 'works.json').exists():
        raise ValueError('Catalog already exists; never reset the baseline')
    current, output = local_inventory()
    catalog = {'schemaVersion': 1, 'baselineSha': news.git('rev-parse', 'HEAD').strip(), 'works': []}
    catalog, events = reconcile(catalog, current, news.read('news-events.json'), None, baseline=True)
    # The existing song notice must be corrected using its actual deployment,
    # not the later announcement/commit date. The refresh resolves this evidence.
    for r in catalog['works']:
        if r['id'] == SONG:
            r['baseline'] = False
            r['needsFirstPublication'] = True
    save(catalog, events, output)


def publications(catalog):
    result = []
    cutoff = catalog.get('lastPublication', {}).get('publishedAt', '2026-10-21T00:00:00Z')
    if any(r.get('needsFirstPublication') for r in catalog['works']):
        cutoff = '2026-10-21T00:00:00Z'
    for page in range(1, 21):
        rows = news.api(f'deployments?environment=github-pages&per_page=100&page={page}')
        if not rows:
            break
        for d in rows:
            if d['created_at'] < cutoff:
                return sorted(result, key=lambda p:p['publishedAt'])
            if d.get('ref') not in ('main', 'refs/heads/main', d['sha']):
                continue
            if subprocess.run(['git', 'merge-base', '--is-ancestor', d['sha'], 'HEAD'], cwd=ROOT, capture_output=True).returncode:
                continue
            if not any(r.get('needsFirstPublication') for r in catalog['works']) and subprocess.run(
                    ['git', 'merge-base', '--is-ancestor', catalog.get('lastPublication', {}).get('sha', catalog['baselineSha']), d['sha']],
                    cwd=ROOT, capture_output=True).returncode:
                continue
            statuses = news.api(f'deployments/{d["id"]}/statuses?per_page=100')
            success = [s for s in statuses if s['state'] == 'success' and
                       s.get('environment_url', '').rstrip('/') == news.PIN['url'].rstrip('/')]
            if success:
                s = min(success, key=lambda s:s['created_at'])
                result.append({'sha': d['sha'], 'publishedAt': s['created_at'],
                               'evidence': s.get('log_url') or d['statuses_url']})
    else:
        raise ValueError('Deployment history exceeds scan window')
    return sorted(result, key=lambda p:p['publishedAt'])


def refresh():
    catalog, events = news.read('works.json'), news.read('news-events.json')
    deployed = publications(catalog)
    if not deployed:
        raise ValueError('No successful Pages publication found')
    # Repair the previously manual notice from the first successful deployed tree.
    song = next(r for r in catalog['works'] if r['id'] == SONG)
    if song.get('needsFirstPublication'):
        first = next((p for p in deployed if 'id="tochu-no-mamade"' in news.git('show', p['sha'] + ':sound.html')), None)
        if not first:
            raise ValueError('Cannot verify the first song publication')
        song.update(publishedAt=first['publishedAt'], evidence=first['evidence'])
        song.pop('needsFirstPublication')
        notice = next(e for e in events if 'sound:tochu-no-mamade' in e['contentIds'])
        notice.update(workId=SONG, date=news.jst_date(first['publishedAt']),
                      publishedAt=first['publishedAt'], evidence=first['evidence'],
                      title=song['title'], type='NEW RELEASE', status='published')
    # Walk successful deployments in order so a missed run cannot lose additions.
    last = catalog.get('lastPublication')
    for pub in deployed:
        base = last['sha'] if last else catalog['baselineSha']
        if pub['sha'] == base or subprocess.run(['git', 'merge-base', '--is-ancestor', base, pub['sha']], cwd=ROOT, capture_output=True).returncode:
            continue
        sources = {p: news.git('show', pub['sha'] + ':' + p + '.html') for p in PAGES}
        works, _ = inventory(sources, json.loads(news.git('show', pub['sha'] + ':base-products.json')),
                             json.loads(news.git('show', pub['sha'] + ':youtube-latest.json')))
        updated, new_events = reconcile(catalog, works, events, pub)
        # Do not advance for identity-only/NEWS-only changes: no bot commit loop.
        if updated != catalog or new_events != events:
            catalog, events = updated, new_events
            catalog['lastPublication'] = pub
            last = pub
    current, output = local_inventory()
    # Never publish a snapshot that was not actually deployed. Only add anchors to
    # the same content that was inspected above; a concurrent push must retry.
    latest_sources = {p: news.git('show', deployed[-1]['sha'] + ':' + p + '.html') for p in PAGES}
    latest, _ = inventory(latest_sources, json.loads(news.git('show', deployed[-1]['sha'] + ':base-products.json')),
                          json.loads(news.git('show', deployed[-1]['sha'] + ':youtube-latest.json')))
    if current != latest:
        raise ValueError('main has unpublished work changes; wait for its successful Pages build')
    save(catalog, events, output)


def check():
    current, output = local_inventory()
    # Discovery itself validates new work IDs, titles and duplicates, even on PRs.
    if len({r['id'] for r in current}) != len(current):
        raise ValueError('Duplicate work IDs')
    catalog = news.read('works.json')
    if len({r['id'] for r in catalog['works']}) != len(catalog['works']):
        raise ValueError('Duplicate catalog IDs')
    return {p: sum(w['page'] == p + '.html' for w in current) for p in PAGES}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--bootstrap', action='store_true')
    parser.add_argument('--refresh', action='store_true')
    args = parser.parse_args()
    if args.bootstrap:
        bootstrap()
    elif args.refresh:
        refresh()
    else:
        print(json.dumps(check(), ensure_ascii=False, indent=2))
