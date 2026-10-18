import copy
import datetime as dt
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import update_youtube_latest as updater

NOW = dt.datetime(2026, 10, 19, tzinfo=dt.timezone.utc)
CHANNEL = 'test_channel'


def video(number, *, privacy='public', live='none', archive=False):
    item = {'id': f'test{number:07d}', 'snippet': {
        'title': f'Test video {number}', 'channelId': CHANNEL,
        'publishedAt': f'2026-10-{number:02d}T00:00:00Z', 'liveBroadcastContent': live,
        'thumbnails': {'medium': {'url': 'https://i.ytimg.com/vi/test/default.jpg'}}},
        'status': {'privacyStatus': privacy, 'uploadStatus': 'processed', 'embeddable': True, 'madeForKids': False}}
    if archive:
        item['liveStreamingDetails'] = {'actualEndTime': '2026-10-10T00:00:00Z'}
    return item


class LatestVideosTests(unittest.TestCase):
    def test_public_completed_regular_candidates_only(self):
        for item in [video(1, privacy='private'), video(2, privacy='unlisted'),
                     video(3, live='live'), video(4, live='upcoming'), video(5, archive=True), video(20)]:
            self.assertFalse(updater.is_public_candidate(item, CHANNEL, NOW))
        self.assertTrue(updater.is_public_candidate(video(1), CHANNEL, NOW))
        self.assertFalse(updater.is_public_candidate(video(1), 'other', NOW))

    def test_latest_four_sorted_and_shorts_excluded_without_duration(self):
        candidates = [video(n) for n in [1, 6, 4, 2, 5, 3]]
        types = {v['id']: {'VIDEO_ON_DEMAND'} for v in candidates}
        types[video(6)['id']] = {'SHORTS'}
        chosen = updater.select_latest(candidates, types)
        self.assertEqual([v['id'] for v in chosen], [video(n)['id'] for n in [5, 4, 3, 2]])

    def test_unknown_new_video_blocks_instead_of_showing_wrong_latest_four(self):
        candidates = [video(n) for n in range(1, 7)]
        types = {v['id']: {'VIDEO_ON_DEMAND'} for v in candidates[:-1]}
        with self.assertRaises(updater.UpdateError):
            updater.select_latest(candidates, types)

    def test_conflicting_types_block_publication(self):
        with self.assertRaises(updater.UpdateError):
            updater.select_latest([video(1)], {video(1)['id']: {'SHORTS', 'VIDEO_ON_DEMAND'}})

    def test_fewer_than_four_and_known_short_only(self):
        self.assertEqual(len(updater.select_latest([video(1)], {video(1)['id']: {'VIDEO_ON_DEMAND'}})), 1)
        self.assertEqual(updater.select_latest([video(1)], {video(1)['id']: {'SHORTS'}}), [])

    def test_data_does_not_change_on_identical_refresh(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'latest.json'
            self.assertTrue(updater.save_verified(CHANNEL, [video(1)], NOW, path))
            previous = path.read_bytes()
            self.assertFalse(updater.save_verified(CHANNEL, [video(1)], NOW + dt.timedelta(hours=6), path))
            self.assertEqual(path.read_bytes(), previous)
            self.assertTrue(updater.save_verified(CHANNEL, [video(1)], NOW + dt.timedelta(days=21), path))

    def test_invalid_data_leaves_good_file_intact(self):
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / 'latest.json'
            updater.save_verified(CHANNEL, [video(1)], NOW, path)
            previous = path.read_bytes()
            broken = video(2)
            broken['snippet']['thumbnails'] = {}
            with self.assertRaises(updater.UpdateError):
                updater.save_verified(CHANNEL, [broken], NOW, path)
            self.assertEqual(path.read_bytes(), previous)

    def test_api_failure_never_reaches_write(self):
        with patch.object(updater, 'access_token', side_effect=updater.UpdateError('API unavailable')):
            with patch.object(updater, 'save_verified') as write:
                with self.assertRaises(updater.UpdateError):
                    updater.main()
                write.assert_not_called()

    def test_analytics_column_order_and_zero_view_unclassified(self):
        response = {'columnHeaders': [{'name': n} for n in ['views','creatorContentType','video']],
                    'rows': [[3, 'VIDEO_ON_DEMAND', video(1)['id']], [0, 'VIDEO_ON_DEMAND', video(2)['id']]]}
        with patch.object(updater, 'request_json', return_value=response):
            types = updater.analytics_types('not_a_real_token', CHANNEL, [video(1)['id'],video(2)['id']], NOW)
        self.assertEqual(types[video(1)['id']], {'VIDEO_ON_DEMAND'})
        self.assertEqual(types[video(2)['id']], set())


if __name__ == '__main__':
    unittest.main()
