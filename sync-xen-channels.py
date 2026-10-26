"""Keep CREATOR's static, no-JS channel copy in sync with shared verified data.
Run after editing xen-channels.json. Existing accordion markup/layout is preserved.
The three discovery channels are shared; AMBER TALES remains CREATOR-only.
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
        if channel.get('tagline'):
            body=re.sub(r'(<p class="xc-tagline">).*?(</p>)',lambda n:n[1]+html.escape(channel['tagline'])+n[2],body,flags=re.S)
        paragraphs=iter(channel.get('descriptionParagraphs',[channel['descriptionShort']]))
        body=re.sub(r'(<p class="xc-description[^"]*">).*?(</p>)',lambda n:n[1]+html.escape(next(paragraphs))+n[2],body,flags=re.S)
        body=re.sub(r'(<a class="xc-link" href=")[^"]+',lambda n:n[1]+html.escape(channel['url'],quote=True),body)
        for cls,key in [('xc-logo','avatar'),('xc-banner','banner')]:
            body=re.sub(r'(<img class="'+cls+r'[^"]*" src=")[^"]+',lambda n:n[1]+html.escape(channel[key],quote=True),body)
        return m[1]+body+m[3]
    source,count=re.subn(pattern,render,source,flags=re.S)
    if count!=1:raise ValueError('Expected one CREATOR channel: '+channel['creatorId'])
path.write_text(source)
