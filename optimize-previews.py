"""Create WebP display copies without changing any original image.
Run: python optimize-previews.py (requires Pillow). Originals remain gallery targets.
"""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote
import hashlib
import io
import json
import re
import subprocess
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent
class Attributes(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.attrs = dict(attrs)

def attrs(tag):
    parser = Attributes(); parser.feed(tag); return parser.attrs

records = {}
page_totals = {}
pattern = r'(<a\b[^>]*class="gallery-item"[^>]*>)(<img\b[^>]*>)'
for page in sorted(ROOT.glob('*.html')):
    before = page.read_text()
    baseline = subprocess.run(['git', 'show', '7bbf6af:' + page.name], cwd=ROOT,
                              capture_output=True, text=True, check=True).stdout
    previous_sources = {unquote(attrs(a)['href']).removeprefix('./'):
                        unquote(attrs(i)['src']).removeprefix('./')
                        for a, i in re.findall(pattern, baseline)}
    totals = {'previous_display_bytes': 0, 'display_bytes': 0, 'placements': 0}
    def replace(match):
        anchor, tag = match.groups()
        original = unquote(attrs(anchor)['href']).removeprefix('./')
        current = previous_sources[original]
        source = ROOT / original
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        preview = 'xen-preview-' + digest[:16] + '.webp'
        if original not in records:
            with Image.open(source) as im:
                oriented = ImageOps.exif_transpose(im)
                original_size = oriented.size
                # Preserve readable long drawings: constrain width, not long-page height.
                if oriented.width > 1600:
                    oriented = oriented.resize((1600, round(oriented.height * 1600 / oriented.width)), Image.Resampling.LANCZOS)
                if oriented.mode not in ('RGB', 'RGBA'):
                    oriented = oriented.convert('RGBA' if 'transparency' in oriented.info else 'RGB')
                encoded = io.BytesIO()
                oriented.save(encoded, 'WEBP', quality=90, method=6,
                              icc_profile=im.info.get('icc_profile', b''))
                payload = encoded.getvalue()
                size = oriented.size
            if len(payload) < (ROOT / current).stat().st_size:
                # Publish complete files atomically, including on synced workspaces.
                temporary = ROOT / (preview + '.tmp')
                temporary.write_bytes(payload)
                temporary.replace(ROOT / preview)
                preview_bytes = len(payload)
            else:
                preview = current
                preview_bytes = (ROOT / current).stat().st_size
                with Image.open(ROOT / current) as im:
                    size = im.size
            records[original] = {'original': original, 'original_sha256': digest,
                'preview': preview, 'original_dimensions': list(original_size),
                'dimensions': list(size), 'original_bytes': source.stat().st_size,
                'preview_bytes': preview_bytes}
        row = records[original]
        preview = row['preview']
        totals['previous_display_bytes'] += (ROOT / current).stat().st_size
        totals['display_bytes'] += row['preview_bytes']; totals['placements'] += 1
        tag = re.sub(r'\bsrc="[^"]*"', 'src="./' + preview + '"', tag)
        tag = re.sub(r'\bwidth="[^"]*"', 'width="' + str(row['dimensions'][0]) + '"', tag)
        tag = re.sub(r'\bheight="[^"]*"', 'height="' + str(row['dimensions'][1]) + '"', tag)
        return anchor + tag
    after = re.sub(pattern, replace, before)
    if totals['placements']:
        page.write_text(after); page_totals[page.name] = totals
manifest = ROOT / 'asset-provenance.json'
data = json.loads(manifest.read_text())
for row in data['assets']:
    if row['file'] in records: row['preview'] = records[row['file']]['preview']
manifest.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
report = {'note': 'Display copies only. Original files, names and gallery hrefs preserved. No cropping or artwork changes.',
          'pages': page_totals, 'images': list(records.values())}
(ROOT / 'preview-optimization.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
print('Originals preserved:', len(records))
for page, totals in page_totals.items():
    print(page, round(totals['previous_display_bytes']/1048576, 2), '→', round(totals['display_bytes']/1048576, 2), 'MiB')
