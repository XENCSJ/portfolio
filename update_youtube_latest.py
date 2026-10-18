"""Official APIs only; unknown content types fail closed before writing public data."""
import datetime as dt
import json
import os
from pathlib import Path
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / 'youtube-latest.json'
DATA_API = 'https://www.googleapis.com/youtube/v3/'
ANALYTICS_API = 'https://youtubeanalytics.googleapis.com/v2/reports'
VIDEO_ID = re.compile(r'^[A-Za-z0-9_-]{11}$')


class UpdateError(Exception):
    pass


def request_json(url, *, token=None, form=None):
    headers = {'Accept': 'application/json'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    data = None
    if form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, data=data, headers=headers)
            with urllib.request.urlopen(req, timeout=25) as response:
                result = json.load(response)
            if not isinstance(result, dict) or 'error' in result:
                raise UpdateError('API returned an invalid response; cached data unchanged.')
            return result
        except urllib.error.HTTPError as exc:
            # Never log response bodies, request URLs, credentials, or private metadata.
            if exc.code in (429, 500, 502, 503, 504) and attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise UpdateError(f'API HTTP {exc.code}; check authorization/quota. Cached data unchanged.') from None
        except (urllib.error.URLError, TimeoutError, ValueError):
            if attempt < 2:
                time.sleep(2 ** attempt)
                continue
            raise UpdateError('API network/JSON failure; cached data unchanged.') from None


def access_token():
    names = ['YOUTUBE_OAUTH_CLIENT_ID', 'YOUTUBE_OAUTH_CLIENT_SECRET', 'YOUTUBE_OAUTH_REFRESH_TOKEN']
    missing = [name for name in names if not os.environ.get(name)]
    if missing:
        raise UpdateError('Missing GitHub Actions Secrets: ' + ', '.join(missing))
    result = request_json('https://oauth2.googleapis.com/token', form={
        'client_id': os.environ[names[0]], 'client_secret': os.environ[names[1]],
        'refresh_token': os.environ[names[2]], 'grant_type': 'refresh_token'})
    token = result.get('access_token')
    if not isinstance(token, str) or not token:
        raise UpdateError('OAuth did not return an access token.')
    return token


def data_api(token, resource, **params):
    return request_json(DATA_API + resource + '?' + urllib.parse.urlencode(params), token=token)


def items_from(response):
    items = response.get('items')
    if not isinstance(items, list):
        raise UpdateError('Incomplete API response; cached data unchanged.')
    return items


def iso_time(value):
    try:
        result = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
        if result.tzinfo is None:
            raise ValueError
        return result
    except (TypeError, ValueError, AttributeError):
        raise UpdateError('Invalid timestamp; cached data unchanged.') from None


def resolve_channel(token):
    channels = items_from(data_api(token, 'channels', part='contentDetails', forHandle='@xen_csj'))
    if len(channels) != 1:
        raise UpdateError('Could not uniquely resolve @xen_csj.')
    channel = channels[0]
    mine = items_from(data_api(token, 'channels', part='id', mine='true', maxResults=50))
    if channel['id'] not in {item['id'] for item in mine}:
        raise UpdateError('OAuth account/channel does not own @xen_csj; choose the correct channel.')
    return channel['id'], channel['contentDetails']['relatedPlaylists']['uploads']


def uploaded_ids(token, playlist):
    ids, seen_tokens, page = [], set(), ''
    for _ in range(100):
        result = data_api(token, 'playlistItems', part='contentDetails', playlistId=playlist,
                          maxResults=50, **({'pageToken': page} if page else {}))
        for item in items_from(result):
            video_id = item.get('contentDetails', {}).get('videoId', '')
            if not VIDEO_ID.fullmatch(video_id):
                raise UpdateError('Invalid upload ID; cached data unchanged.')
            ids.append(video_id)
        page = result.get('nextPageToken')
        if not page:
            return list(dict.fromkeys(ids))
        if page in seen_tokens:
            raise UpdateError('Repeated API page token; cached data unchanged.')
        seen_tokens.add(page)
    raise UpdateError('Upload scan exceeded 5000 entries; no partial list will be published.')


def is_public_candidate(video, channel_id, now):
    snippet, status = video.get('snippet', {}), video.get('status', {})
    if snippet.get('channelId') != channel_id or status.get('privacyStatus') != 'public':
        return False
    if status.get('uploadStatus') != 'processed':
        return False
    if snippet.get('liveBroadcastContent') != 'none' or video.get('liveStreamingDetails'):
        return False  # Includes completed livestreams and scheduled streams.
    return iso_time(snippet.get('publishedAt')) <= now


def analytics_types(token, channel_id, ids, now):
    params = {'ids': 'channel==' + channel_id, 'startDate': '2019-01-01',
              'endDate': now.date().isoformat(), 'metrics': 'views',
              'dimensions': 'video,creatorContentType', 'filters': 'video==' + ','.join(ids),
              'maxResults': 200, 'startIndex': 1}
    result = request_json(ANALYTICS_API + '?' + urllib.parse.urlencode(params), token=token)
    headers = [header.get('name') for header in result.get('columnHeaders', [])]
    if not all(name in headers for name in ('video', 'creatorContentType', 'views')):
        raise UpdateError('Unexpected Analytics report schema; cached data unchanged.')
    rows = result.get('rows', [])
    if not isinstance(rows, list) or len(rows) >= 200:
        raise UpdateError('Incomplete Analytics report; cached data unchanged.')
    found = {video_id: set() for video_id in ids}
    for row in rows:
        if len(row) != len(headers):
            raise UpdateError('Malformed Analytics row; cached data unchanged.')
        video_id, content_type, views = (row[headers.index(name)] for name in ('video', 'creatorContentType', 'views'))
        if video_id not in found or not isinstance(views, (int, float)):
            raise UpdateError('Unexpected Analytics result; cached data unchanged.')
        if views > 0:
            found[video_id].add(content_type)
    return found


def select_latest(candidates, types):
    selected = []
    ordered = sorted(candidates, key=lambda v: (iso_time(v['snippet']['publishedAt']), v['id']), reverse=True)
    for video in ordered:
        kinds = types.get(video['id'], set())
        if kinds == {'VIDEO_ON_DEMAND'}:
            selected.append(video)
            if len(selected) == 4:
                return selected
        elif kinds and kinds <= {'SHORTS', 'LIVE_STREAM', 'STORY'}:
            continue
        else:
            # Never skip an unknown newer video and falsely label older videos "latest".
            raise UpdateError('Content type pending or ambiguous for public video ' + video['id'] +
                              '; inspect YouTube Studio Videos/Shorts/Live. Cached data unchanged.')
    return selected


def public_item(video):
    snippet, status = video['snippet'], video['status']
    thumbnails = snippet.get('thumbnails', {})
    thumbnail = next((thumbnails[key].get('url') for key in ('maxres', 'medium', 'standard', 'high', 'default')
                      if thumbnails.get(key, {}).get('url')), None)
    parsed = urllib.parse.urlparse(thumbnail or '')
    if parsed.scheme != 'https' or parsed.hostname not in ('i.ytimg.com', 'img.youtube.com'):
        raise UpdateError('Missing/invalid thumbnail; cached data unchanged.')
    title = snippet.get('title')
    if not isinstance(title, str) or not title.strip() or not VIDEO_ID.fullmatch(video['id']):
        raise UpdateError('Invalid public metadata; cached data unchanged.')
    if not isinstance(status.get('embeddable'), bool) or not isinstance(status.get('madeForKids'), bool):
        raise UpdateError('Missing playback status; cached data unchanged.')
    return {'id': video['id'], 'title': title, 'url': 'https://www.youtube.com/watch?v=' + video['id'],
            'thumbnail': thumbnail, 'publishedAt': snippet['publishedAt'],
            'embeddable': status['embeddable'], 'madeForKids': status['madeForKids']}


def save_verified(channel_id, videos, now, path=OUTPUT):
    data = {'schemaVersion': 1, 'status': 'verified', 'channelUrl': 'https://www.youtube.com/@xen_csj',
            'channelId': channel_id, 'items': [public_item(video) for video in videos]}
    if path.exists():
        old = json.loads(path.read_text())
        previous = old.pop('validatedAt', None)
        # No commit for unchanged data. A 20-day renewal is required for the 30-day cache policy.
        if old == data and previous and dt.timedelta(0) <= now - iso_time(previous) < dt.timedelta(days=20):
            return False
    data['validatedAt'] = now.isoformat().replace('+00:00', 'Z')
    temporary = path.with_suffix('.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)
    return True


def main():
    token = access_token()
    now = dt.datetime.now(dt.timezone.utc)
    channel_id, playlist = resolve_channel(token)
    ids = uploaded_ids(token, playlist)
    candidates = []
    for offset in range(0, len(ids), 50):
        result = data_api(token, 'videos', part='snippet,status,liveStreamingDetails', id=','.join(ids[offset:offset+50]))
        candidates.extend(v for v in items_from(result) if is_public_candidate(v, channel_id, now))
    candidates.sort(key=lambda v: (iso_time(v['snippet']['publishedAt']), v['id']), reverse=True)
    kinds, chosen = {}, []
    for offset in range(0, len(candidates), 50):
        batch = candidates[offset:offset+50]
        kinds.update(analytics_types(token, channel_id, [v['id'] for v in batch], now))
        chosen = select_latest(candidates[:offset+50], kinds)
        if len(chosen) == 4:
            break
    changed = save_verified(channel_id, chosen, now)
    print(('Updated' if changed else 'Unchanged') + f': {len(chosen)} verified public regular videos.')


if __name__ == '__main__':
    try:
        main()
    except (UpdateError, KeyError, TypeError, ValueError, OSError) as exc:
        print(str(exc) if isinstance(exc, UpdateError) else 'Validation failed; cached data unchanged.', file=sys.stderr)
        sys.exit(1)
