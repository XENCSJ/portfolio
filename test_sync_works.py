import copy
import unittest
from unittest.mock import patch
import news
import sync_works as sync

PUB = {'sha': 'test-success', 'publishedAt': '2026-10-22T00:00:00Z', 'evidence': 'fixture:successful-pages-deployment'}

def fixture(identity='test-song', status='published', title='テスト作品'):
    return f'<main><article class="sound-song" id="{identity}" data-work-status="{status}"><h3>{title}</h3><img src="{identity}.jpg"><p>解説</p></article></main>'

class SyncTests(unittest.TestCase):
    def test_add_edit_hide_republish_delete_and_idempotence(self):
        source = {'sound': fixture()}
        works, stamped = sync.discover(source)
        catalog, events = sync.reconcile({'works': []}, works, [], PUB)
        self.assertEqual(len(news.groups(events, '2026-10-23')), 1)
        self.assertEqual(events[0]['title'], 'テスト作品')
        self.assertEqual(events[0]['url'], './sound.html#test-song')
        modified = {k:v.replace('解説', '修正済みの長い解説').replace('test-song.jpg', 'corrected-link.jpg') for k,v in stamped.items()}
        edited, _ = sync.discover(modified)
        updated, same = sync.reconcile(catalog, edited, events, dict(PUB, publishedAt='2026-10-22T01:00:00Z'))
        self.assertEqual(len(same), 1)
        self.assertEqual(same[0]['publishedAt'], PUB['publishedAt'])
        hidden, _ = sync.discover({'sound': modified['sound'].replace('data-work-status="published"', 'data-work-status="private"')})
        hidden_catalog, hidden_events = sync.reconcile(updated, hidden, same, PUB)
        self.assertEqual(news.groups(hidden_events, '2026-10-23'), [])
        restored, restored_events = sync.reconcile(hidden_catalog, edited, hidden_events, PUB)
        self.assertEqual(len(restored_events), 1)
        self.assertEqual(len(news.groups(restored_events, '2026-10-23')), 1)
        again, again_events = sync.reconcile(restored, edited, restored_events, PUB)
        self.assertEqual((again, again_events), (restored, restored_events))
        removed, removed_events = sync.reconcile(again, [], again_events, PUB)
        self.assertEqual(news.groups(removed_events, '2026-10-23'), [])

    def test_draft_is_announced_only_when_first_published(self):
        works, _ = sync.discover({'sound': fixture(status='draft')})
        cat, events = sync.reconcile({'works': []}, works, [], PUB)
        self.assertEqual(events, [])
        works[0]['status'] = 'published'
        cat, events = sync.reconcile(cat, works, events, PUB)
        self.assertEqual(len(events), 1)

    def test_all_work_categories_and_explicit_other_pages(self):
        for page in sync.PAGES:
            markup = f'<main><article data-work-id="fixture:{page}" data-work-category="{page.upper()}"><h3>New</h3><p>Work</p></article></main>'
            works, updated = sync.discover({page: markup})
            cat, events = sync.reconcile({'works': []}, works, [], PUB)
            self.assertEqual(len(events), 1, page)
            self.assertEqual(events[0]['category'], page.upper())
            self.assertIn('id="work-', updated[page])

    def test_repeated_ids_rejected_and_repeated_media_deduplicated(self):
        with self.assertRaisesRegex(ValueError, 'Duplicate'):
            sync.discover({'sound': fixture().replace('</main>', fixture()+'</main>')})
        first, _ = sync.discover({'sound': fixture()})
        cat, events = sync.reconcile({'works': []}, first, [], PUB)
        duplicate = dict(first[0], id='another-placement')
        _, events = sync.reconcile(cat, first+[duplicate], events, PUB)
        self.assertEqual(len(events), 1)

    def test_two_releases_same_day_keep_titles_links_and_timestamp_order(self):
        works, _ = sync.discover({'sound': fixture('one')})
        cat, events = sync.reconcile({'works': []}, works, [], PUB)
        second, _ = sync.discover({'sound': fixture('two')})
        cat, events = sync.reconcile(cat, works+second, events, dict(PUB, publishedAt='2026-10-22T01:00:00Z'))
        shown = news.select(events, news.PIN, '2026-10-23')
        self.assertEqual([e['url'] for e in shown[:2]], ['./sound.html#two', './sound.html#one'])
        self.assertEqual(len(shown), 3)

    def test_legacy_baseline_and_non_work_edits_never_create_news(self):
        works, _ = sync.discover({'sound': fixture()})
        cat, events = sync.reconcile({'works': []}, works, [], None, baseline=True)
        self.assertEqual(events, [])
        cat, events = sync.reconcile(cat, works, events, PUB)
        self.assertEqual(events, [])
        current, _ = sync.discover({'studio': '<main><h1>New title</h1><p>typo fix</p><img src="logo.png"></main>'})
        self.assertEqual(current, [])

    def test_existing_site_15_pages_and_layout_preserved(self):
        current, output = sync.local_inventory()
        self.assertGreater(len(current), 250)
        self.assertEqual(set(output), set(sync.PAGES))
        _, again = sync.discover(output)
        for page, source in output.items():
            self.assertEqual(source, again[page], page)
        ids = [r['id'] for r in current]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(sum(r['id'] == sync.SONG for r in current), 1)

    def test_no_successful_deployment_cannot_write(self):
        with patch.object(sync, 'publications', return_value=[]), patch.object(sync, 'save') as save:
            with self.assertRaisesRegex(ValueError, 'No successful'):
                sync.refresh()
            save.assert_not_called()

    def test_metadata_and_gallery_generation_preserve_exact_markup(self):
        source = '<main><a class="gallery-item" href="./new.jpg"><img src="thumb.jpg" alt="新作"></a></main>'
        works, out = sync.discover({'snap':source})
        stripped = __import__('re').sub(r' (?:id|data-work-id)="[^"]+"', '', out['snap'])
        self.assertEqual(source, stripped)
        self.assertEqual(works[0]['contentIds'], ['image:new.jpg'])

    def test_products_and_dynamic_youtube(self):
        works, _ = sync.inventory({'apparel':'<main data-base-products></main>'},
            {'items':[{'id':123,'name':'商品','status':'private'}]},
            {'items':[{'id':'abcdefghijk','title':'映像'}]})
        cat, events = sync.reconcile({'works':[]}, works, [], PUB)
        self.assertEqual(len(events),1)
        self.assertEqual(events[0]['category'],'YOUTUBE')

    def test_refresh_pipeline_new_html_only_then_no_commit_loop(self):
        sources = {p:(sync.ROOT / (p+'.html')).read_text() for p in sync.PAGES}
        sources['sound'] = sources['sound'].replace('</main>', fixture('pipeline-new')+'</main>')
        products, videos = news.read('base-products.json'), news.read('youtube-latest.json')
        current, output = sync.inventory(sources, products, videos)
        data = {'works.json':news.read('works.json'),'news-events.json':news.read('news-events.json')}
        def git(*args):
            name = args[1].split(':',1)[1]
            if name=='base-products.json': return __import__('json').dumps(products)
            if name=='youtube-latest.json': return __import__('json').dumps(videos)
            return sources[name.removesuffix('.html')]
        def save(cat, events, rendered):
            data.update({'works.json':copy.deepcopy(cat),'news-events.json':copy.deepcopy(events)})
        with patch.object(sync,'publications',return_value=[PUB]), patch.object(sync,'local_inventory',return_value=(current,output)), patch.object(news,'git',side_effect=git), patch.object(news,'read',side_effect=data.__getitem__), patch.object(sync,'save',side_effect=save), patch.object(sync.subprocess,'run') as run:
            run.return_value.returncode=0
            sync.refresh()
            self.assertEqual(sum(e.get('workId')=='sound:pipeline-new' for e in data['news-events.json']),1)
            first = copy.deepcopy(data)
            sync.refresh()
            self.assertEqual(data,first)

if __name__ == '__main__':
    unittest.main()
