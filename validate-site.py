"""Run from the repository root: python validate-site.py. No packages required."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import json
import hashlib
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
    if name != 'index':
        assert '<nav class="shared-social"' not in source, name
    for ref in doc.refs:
        assert '不採用' not in unquote(ref), (name, ref)
        assert 'XENポートフォリオ画像の復元' not in unquote(ref), (name, ref)
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
subprocess.run(['node', '--check', str(ROOT / 'xen-motion.js')], check=True)

assets = json.loads((ROOT / 'asset-provenance.json').read_text())['assets']
for row in assets:
    assert (ROOT / row['file']).is_file(), row
    assert (ROOT / row['preview']).is_file(), row

# Display copies must never change a work's original image or target.
optimized = json.loads((ROOT / 'preview-optimization.json').read_text())
preview_map = {row['original']: row for row in optimized['images']}
for row in preview_map.values():
    assert hashlib.sha256((ROOT / row['original']).read_bytes()).hexdigest() == row['original_sha256'], row['original']
    assert (ROOT / row['preview']).stat().st_size == row['preview_bytes'], row['preview']
for name in PAGES:
    source = (ROOT / (name + '.html')).read_text()
    for target, image in re.findall(r'<a class="gallery-item" href="([^"]+)"[^>]*><img src="([^"]+)"', source):
        key = unquote(target).removeprefix('./')
        assert unquote(image).removeprefix('./') == preview_map[key]['preview'], (name, key)

pending = json.loads((ROOT / 'pending-content.json').read_text())
cinematic = (ROOT / 'cinematic.html').read_text()
assert len(pending['cinematic']) == 4
for work in pending['cinematic']:
    assert cinematic.count('data-work-key="' + work['key'] + '"') == 1
    assert work['url'] is None  # Do not replace missing footage with an unrelated work.
if pending['contact']['endpoint'] is None:
    for name in ('price-list', 'studio', 'sns-management'):
        source = (ROOT / (name + '.html')).read_text()
        assert re.search(r'<button[^>]*class="submit"[^>]*\bdisabled', source), name

# Opt-in reference typography must not change INDEX. SNS promotional text stays
# readable without an image, script-generated copy, or an external font request.
for name in PAGES:
    source = (ROOT / (name + '.html')).read_text()
    assert ('xen-reference.css' in source) == (name != 'index'), name
sns = (ROOT / 'sns-management.html').read_text()
for cls in ('stats-graphic', 'service-graphic', 'flow-graphic', 'audience-graphic'):
    panel = re.search(r'<(?:div|section) class="text-graphic[^\"]*' + cls + r'".*?</(?:div|section)>', sns, re.S)
    assert panel and not re.search(r'<(?:img|video|canvas|iframe)\b', panel[0]), cls
for phrase in ('4,000', '6,000', 'ワンストップでバズを再現', 'SNS運用を丸ごと任せたい'):
    assert phrase in sns, phrase
reference_css = (ROOT / 'xen-reference.css').read_text()
assert 'prefers-reduced-motion:reduce' in reference_css
assert not re.search(r'url\(', reference_css)
shared_css = (ROOT / 'xen-shared.css').read_text()
assert '.detail-page .video-container .thumb img' in shared_css
video_image_rule = re.search(r'\.detail-page \.video-container \.thumb img\s*\{([^}]+)', shared_css)[1]
assert 'object-fit: cover' in video_image_rule
assert 'width: 100%' in video_image_rule and 'height: 100%' in video_image_rule
assert re.search(r'\.video-container\s*\{[^}]*aspect-ratio:\s*16/9', shared_css)

for css in ROOT.glob('*.css'):
    for ref in re.findall(r'url\(["\']?([^\)"\']+)', css.read_text()):
        if not urlsplit(ref).scheme:
            assert (ROOT / unquote(ref)).is_file(), (css.name, ref)

print(f'PASS: {len(PAGES)} pages; internal references, IDs, menus, logo references, JS syntax')
print(f'PASS: {len(videos)} correctly categorized video players; {len(assets)} preserved gallery records; {gallery_count} image placements')
print(f'PASS: {len(preview_map)} original image hashes and display mappings; pending content isolated')
print('NOT COVERED: browser/mobile rendering, external responses, playback, form delivery, reference-copy parity.')
