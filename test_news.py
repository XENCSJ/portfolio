import copy, json, tempfile, unittest
from datetime import date, timedelta
from pathlib import Path
from unittest.mock import patch
import news

NOW = '2026-10-20'
def event(i, category='SNAP', date='2026-10-20', ids=None):
    return {'id':str(i),'category':category,'date':date,'contentIds':ids or [str(i)],'url':'./'+category.lower()+'.html','evidence':'test-fixture'}
def state():
    return {'inventory':{'SNAP':{'old.jpg':'old'},'ARTWORKS':{'art.jpg':'art'}},'seenPaths':['old.jpg','art.jpg'],'seenBlobs':['old','art'],'processed':['baseline'],'pending':[]}
def publication():
    return {'sha':'published','publishedAt':'2026-10-19T15:01:00Z','evidence':'successful-pages-deployment'}

class NewsTests(unittest.TestCase):
    def test_archive_labels_and_safe_markup(self):
        records = [dict(event('design'), title='<script>x</script>'), event('art','ARTWORKS')]
        archive = news.articles(records, news.PIN, NOW)
        for item in archive:
            self.assertEqual(item['displayCategory'], 'NEWS')
            self.assertTrue(item['thumbnail'])
            self.assertNotIn('<script>', news.card(item))
        self.assertTrue(any('&lt;script&gt;' in news.card(item) for item in archive))

    def test_replaced_article_is_only_in_history(self):
        archive = news.articles(news.read('news-events.json'), news.PIN)
        shown = [item for page in news.paginate(archive) for item in page]
        self.assertTrue(any('youtube:X3DrK_IgSzg' in e.get('contentIds', []) for e in archive))
        self.assertFalse(any('youtube:X3DrK_IgSzg' in e.get('contentIds', []) for e in shown))
        self.assertEqual(sum('youtube:Df4ekWvuGng' in e.get('contentIds', []) for e in shown), 1)
        self.assertEqual([e['date'] for e in shown], sorted((e['date'] for e in shown), reverse=True))

    def test_generated_files_at_limit_and_after_removal(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'news.html').write_text((news.ROOT / 'news.html').read_text())
            (root / 'news-pinned.json').write_text(json.dumps(news.PIN))
            events = []
            with patch.object(news, 'ROOT', root):
                # The protected renewal is also a dated article and consumes one slot.
                for i in range(50):
                    day = (date(2025, 1, 1) + timedelta(days=i)).isoformat()
                    events.append(dict(event(f'post-{i:02}', 'EVENT', day), article=True, url=''))
                    if i not in (48, 49): continue
                    (root / 'news-events.json').write_text(json.dumps(events))
                    pages = news.generate()
                    self.assertEqual([len(page) for page in pages], [10]*5)
                    self.assertEqual(len(news.read('news-archive.json')), len(events)+1)
                    html = (root / 'news-5.html').read_text()
                    self.assertEqual(html.count('data-news-id='), 10)
                    self.assertNotIn('rel="next"', html)
                    self.assertEqual('data-news-id="post-00"' in html, i == 48)
                    self.assertEqual(news.read('news-events.json'), events)
                (root / 'news-events.json').write_text(json.dumps(events[:9]))
                news.generate()
                self.assertFalse((root / 'news-2.html').exists())
                self.assertFalse((root / 'news-5.html').exists())
                news.generate(check=True)

    def test_youtube_links_are_restricted(self):
        self.assertTrue(news.safe_url('https://youtu.be/Df4ekWvuGng'))
        for url in ['javascript:alert(1)', 'https://youtu.be.evil.test/Df4ekWvuGng', 'https://youtu.be/Df4ekWvuGng?redirect=evil']:
            self.assertFalse(news.safe_url(url))
    def test_page_boundaries_and_archive_retention(self):
        for count, sizes in [(0, [0]), (1,[1]), (10,[10]), (11,[10,1]), (50,[10]*5), (51,[10]*5)]:
            # Many independent announcements may share the same date and category.
            events = [dict(event(f'item-{i:03}', 'EVENT', '2026-10-01'), article=True,
                           title=f'Event {i}', url='') for i in range(count)]
            before = copy.deepcopy(events)
            archive = news.articles(events, news.PIN, '2026-10-02')
            pages = news.paginate(archive)
            self.assertEqual([len(page) for page in pages], sizes)
            self.assertEqual(len(archive), count)
            self.assertEqual(events, before)
            flat = [item['id'] for page in pages for item in page]
            self.assertEqual(flat, [item['id'] for item in archive[:50]])
            if count == 51:
                self.assertNotIn(archive[-1]['id'], flat)
                self.assertNotIn('href=', news.card(archive[0]))
            for n in range(1, len(pages)+1):
                markup = news.pager(n, len(pages))
                self.assertEqual(markup.count('aria-current="page"'), 1)
                self.assertEqual('rel="prev"' in markup, n > 1)
                self.assertEqual('rel="next"' in markup, n < len(pages))
                self.assertEqual(markup.count('ページ目'), len(pages))

    def test_original_release_date_overrides_site_addition(self):
        r=dict(id='film',category='CINEMATIC',page='cinematic.html',contentIds=['youtube:film'],releaseDate='2025-11-04',releaseEvidence='official-release-page')
        e=news.registered_event(r,publication())
        self.assertEqual(e['date'],'2025-11-04')
        self.assertEqual(e['sitePublishedAt'],publication()['publishedAt'])
        self.assertEqual(news.groups([e],NOW)[0]['date'],'2025-11-04')
        del r['releaseDate']
        with self.assertRaises(ValueError):news.registered_event(r,publication())
    def test_fixed_article_cannot_enter_normal_registry(self):
        with self.assertRaises(ValueError):news.articles([dict(news.PIN,contentIds=['renewal'],evidence='test')],news.PIN,NOW)
    def test_fixed_title_exact(self):
        self.assertEqual(news.PIN['title'],'ホームページリニューアル')
    def test_C_twenty_photos_one_news(self):
        s=state();current=copy.deepcopy(s['inventory']);current['SNAP'].update({f'new{i}.jpg':f'blob{i}' for i in range(20)})
        after,added=news.scan(s,current,publication());shown=news.groups(added,NOW)
        self.assertEqual(len(shown),1);self.assertEqual(shown[0]['count'],20)
        again,extra=news.scan(after,current,publication());self.assertEqual(extra,[]);self.assertEqual(again,after)
    def test_D_same_day_different_categories(self):
        self.assertEqual(len(news.groups([event(1),event(2,'ARTWORKS')],NOW)),2)
    def test_E_pin_never_mutated(self):
        pin=news.read('news-pinned.json');before=copy.deepcopy(pin)
        for i in range(5): news.articles([event(i),event(i)],pin,NOW)
        self.assertEqual(pin,before);self.assertEqual(pin,news.PIN)
        pin['date']='2026-10-21'
        with self.assertRaises(ValueError):news.articles([],pin,NOW)
    def test_same_day_merge_and_duplicate_ids(self):
        g=news.groups([event(1,ids=['a','b']),event(2,ids=['b','c'])],NOW)
        self.assertEqual(len(g),1);self.assertEqual(g[0]['count'],3)
    def test_reorder_copy_and_image_replacement_no_news(self):
        s=state();current=copy.deepcopy(s['inventory']);current['SNAP']['old.jpg']='edited'
        self.assertEqual(news.scan(s,current,publication())[1],[])
    def test_replacement_new_path_needs_review(self):
        s=state();current=copy.deepcopy(s['inventory']);current['SNAP']={'new.jpg':'new'}
        after,added=news.scan(s,current,publication());self.assertEqual(added,[]);self.assertEqual(len(after['pending']),1)
    def test_renamed_identical_image_not_counted(self):
        s=state();current=copy.deepcopy(s['inventory']);current['SNAP']['copy.jpg']='old'
        self.assertEqual(news.scan(s,current,publication())[1],[])
    def test_removed_reintroduced_image_not_counted(self):
        s=state();s['inventory']['SNAP']={};current=copy.deepcopy(s['inventory']);current['SNAP']['old.jpg']='old'
        self.assertEqual(news.scan(s,current,publication())[1],[])
    def test_unknown_counts_omitted(self):
        e=event(1);e['countKnown']=False
        self.assertIsNone(news.groups([e],NOW)[0]['count']);self.assertNotIn('1',news.groups([e],NOW)[0]['title'])
    def test_jst_midnight_and_future(self):
        self.assertEqual(news.jst_date('2026-10-19T15:00:00Z'),'2026-10-20')
        self.assertEqual(news.groups([event(1,date='2026-10-21')],NOW),[])
    def test_failed_or_unpublished_data_not_date_stamped(self):
        with self.assertRaises(ValueError):news.jst_date('2026-10-20T10:00:00')
        e=event(1);del e['evidence']
        with self.assertRaises(ValueError):news.groups([e],NOW)
    def test_output_is_current(self):news.generate(check=True)
    def test_news_only_deployment_does_not_start_commit_loop(self):
        s=state();s.update(baselineSha='baseline',baselinePublishedAt='2026-10-19T00:00:00Z')
        d={'id':1,'sha':'published','ref':'main','created_at':'2026-10-19T15:00:00Z','statuses_url':'statuses'}
        def api(path):
            if '/statuses' in path:return [{'state':'success','environment_url':news.PIN['url'],'created_at':'2026-10-19T15:01:00Z','log_url':'log'}]
            return [d] if path.endswith('&page=1') else []
        data={'news-state.json':s,'news-events.json':[],'news-pinned.json':news.PIN}
        writes={}
        with patch.object(news,'api',side_effect=api),patch.object(news,'read',side_effect=data.__getitem__),patch.object(news,'write',side_effect=lambda k,v:writes.update({k:v})),patch.object(news,'inventory',return_value=s['inventory']),patch.object(news,'git',return_value='[]'),patch.object(news.subprocess,'run') as run,patch.object(news,'generate'):
            run.return_value.returncode=0;news.refresh()
        self.assertEqual(writes['news-state.json'],s)
        self.assertEqual(writes['news-events.json'],[])
    def test_failed_deployment_never_scans_content(self):
        s=state();s.update(baselineSha='baseline',baselinePublishedAt='2026-10-19T00:00:00Z')
        d={'id':1,'sha':'failed','ref':'main','created_at':'2026-10-19T15:00:00Z'}
        def api(path):
            if '/statuses' in path:return [{'state':'failure'}]
            return [d] if path.endswith('&page=1') else []
        data={'news-state.json':s,'news-events.json':[],'news-pinned.json':news.PIN}
        with patch.object(news,'api',side_effect=api),patch.object(news,'read',side_effect=data.__getitem__),patch.object(news,'write'),patch.object(news,'inventory') as inv,patch.object(news.subprocess,'run') as run,patch.object(news,'generate'):
            run.return_value.returncode=0;news.refresh();inv.assert_not_called()

if __name__=='__main__':unittest.main()
