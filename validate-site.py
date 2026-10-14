"""Run from the repository root: python validate-site.py. No packages required."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import json
import re
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parent
PAGES = ['index', 'studio', 'creator', 'storybooks', 'animation', 'sound',
         'cinematic', 'snap', 'design', 'apparel', 'architecture', 'space',
         'artworks', 'sns-management', 'price-list']

class Document(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.refs, self.ids, self.images, self.text = [], [], [], []
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'):
            self.ids.append(attrs['id'])
        for key in ('href', 'src'):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if tag == 'img' and attrs.get('src'):
            assert 'alt' in attrs, attrs
            self.images.append(attrs)

videos = []
gallery_count = 0
for name in PAGES:
    path = ROOT / (name + '.html')
    source = path.read_text()
    doc = Document(source)
    assert len(doc.ids) == len(set(doc.ids)), (name, 'duplicate IDs')
    assert source.count('<h1') == 1, (name, 'H1 count')
    menu = re.findall(r'<nav class="xen-menu".*?</nav>', source, re.S)
    assert len(menu) == 1 and menu[0].count('<a ') == len(PAGES), name
    assert source.count('aria-current="page"') == 1, name
    assert 'src="./xen-logo.png"' in source, name
    for ref in doc.refs:
        assert '不採用' not in unquote(ref), (name, ref)
        parsed = urlsplit(ref)
        if not parsed.scheme and parsed.path:
            assert (ROOT / unquote(parsed.path)).is_file(), (name, ref)
        if ref.startswith('#'):
            assert ref[1:] in doc.ids, (name, ref)
    for script in re.findall(r'<script>(.*?)</script>', source, re.S):
        with tempfile.NamedTemporaryFile(suffix='.js', mode='w') as f:
            f.write(script)
            f.flush()
            subprocess.run(['node', '--check', f.name], check=True, capture_output=True)
    videos += [{'page': name + '.html', 'id': v}
               for v in re.findall(r'data-video-id="([^"]+)"', source)]
    gallery_count += source.count('class="gallery-item"')

expected = json.loads((ROOT / 'video-categories.json').read_text())
key = lambda row: (row['page'], row['id'])
assert sorted(videos, key=key) == sorted(expected, key=key)
assert [v['id'] for v in videos if v['page'] == 'apparel.html'] == [
    'OvsxT_ngrWg', 'PQs_Ii2_hI8', 'yBNfm0PbP4Y']
assert not any(v['page'] == 'cinematic.html' for v in videos)
# The reference order and official oEmbed titles exposed reversed video mappings.
approved_order = {
    'storybooks.html': ['DslArGmxy7A', 'jRWWBQFSa2w', 'i4rhhybpecs'],
    'animation.html': ['qQzOTZhiruE', '-aHdK3AyMd0', 'N4FiRqQciWE', 'epB9CUXdP_E'],
    'apparel.html': ['OvsxT_ngrWg', 'PQs_Ii2_hI8', 'yBNfm0PbP4Y'],
}
for page, ids in approved_order.items():
    assert [v['id'] for v in videos if v['page'] == page] == ids, page
metadata = json.loads((ROOT / 'youtube-metadata-check.json').read_text())['videos']
assert len(metadata) == 15 and all(v.get('status') == 200 for v in metadata)
subprocess.run(['node', '--check', str(ROOT / 'xen-video.js')], check=True)
subprocess.run(['node', '--check', str(ROOT / 'xen-shared.js')], check=True)

assets = json.loads((ROOT / 'asset-provenance.json').read_text())['assets']
for row in assets:
    assert (ROOT / row['file']).is_file(), row
    assert (ROOT / row['preview']).is_file(), row

for css in ROOT.glob('*.css'):
    for ref in re.findall(r'url\(["\']?([^\)"\']+)', css.read_text()):
        if not urlsplit(ref).scheme:
            assert (ROOT / unquote(ref)).is_file(), (css.name, ref)

print(f'PASS: {len(PAGES)} pages; internal references, IDs, menus, logo references, JS syntax')
print(f'PASS: {len(videos)} correctly categorized video players; {len(assets)} preserved gallery records; {gallery_count} image placements')
print('NOT COVERED: browser/mobile rendering, external responses, playback, form delivery, reference-copy parity.')
