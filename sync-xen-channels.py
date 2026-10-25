"""Keep CREATOR's static, no-JS channel copy in sync with shared verified data.
Run after editing xen-channels.json. Existing accordion markup/layout is preserved.
XEN CSJ is the discovery main-channel entry; AMBER TALES remains CREATOR-only.
"""
import json,re,html
from pathlib import Path
root=Path(__file__).resolve().parent
path=root/'creator.html';source=path.read_text()
for channel in json.loads((root/'xen-channels.json').read_text()):
    if not channel.get('creatorId'):continue
    pattern=r'(<details\b[^>]*id="'+re.escape(channel['creatorId'])+r'"[^>]*>)(.*?)(</details>)'
    def render(m):
        body=m[2]
        for cls,key in [('xc-tagline','tagline'),('xc-description','descriptionShort')]:
            body=re.sub(r'(<p class="'+cls+r'">).*?(</p>)',lambda n:n[1]+html.escape(channel[key])+n[2],body,flags=re.S)
        body=re.sub(r'(<a class="xc-link" href=")[^"]+',lambda n:n[1]+html.escape(channel['url'],quote=True),body)
        for cls,key in [('xc-logo','avatar'),('xc-banner','banner')]:
            body=re.sub(r'(<img class="'+cls+r'" src=")[^"]+',lambda n:n[1]+html.escape(channel[key],quote=True),body)
        return m[1]+body+m[3]
    source,count=re.subn(pattern,render,source,flags=re.S)
    if count!=1:raise ValueError('Expected one CREATOR channel: '+channel['creatorId'])
path.write_text(source)
