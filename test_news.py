import copy, unittest
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
    def test_category_labels_preserve_internal_ids_and_urls(self):
        for category, label in [('SOUND', 'MUSIC'), ('ARTWORKS', 'ART GALLERY')]:
            record = dict(news.PIN, category=category, url='./' + category.lower() + '.html')
            before = copy.deepcopy(record)
            markup = news.markup([record])
            self.assertIn('lang="en">' + label + '</span>', markup)
            self.assertIn('href="' + record['url'] + '"', markup)
            self.assertEqual(record, before)

    def test_requested_youtube_replacement_survives_regeneration(self):
        events = [e for e in news.read('news-events.json') if e['id'].startswith(('legacy-', 'historical-'))]
        shown = news.select(events, news.PIN, NOW)
        target = shown[3]
        self.assertEqual(target['date'], '2026-09-03')
        self.assertEqual(target['url'], 'https://youtu.be/Df4ekWvuGng')
        self.assertEqual(target['title'], '『ちいかわって結局なに？知識0で「ちいかわパーク」に行ったら、まんまとハマった』を公開しました。')
        self.assertEqual([e['date'] for e in shown[:3]], ['2026-10-19', '2026-10-16', '2026-10-10'])
        self.assertEqual(shown[-1], dict(news.PIN, pinned=True))
        self.assertNotIn('youtube:X3DrK_IgSzg', [c for e in shown for c in e.get('contentIds', [])])
        self.assertEqual(sum('youtube:Df4ekWvuGng' in e.get('contentIds', []) for e in shown), 1)
        self.assertEqual(news.select(copy.deepcopy(events), news.PIN, NOW), shown)
        newer = news.select(events + [event('new-art', 'ARTWORKS')], news.PIN, NOW)
        self.assertEqual(len(newer), 5)
        self.assertEqual(newer[-1], shown[-1])
        self.assertNotIn(target, newer)
    def test_youtube_links_are_restricted(self):
        self.assertTrue(news.safe_url('https://youtu.be/Df4ekWvuGng'))
        for url in ['javascript:alert(1)', 'https://youtu.be.evil.test/Df4ekWvuGng', 'https://youtu.be/Df4ekWvuGng?redirect=evil']:
            self.assertFalse(news.safe_url(url))
    def test_replacement_deduplicates_existing_history(self):
        events = [e for e in news.read('news-events.json') if e['id'] in ('legacy-2', 'legacy-4')]
        shown = news.select(events, news.PIN, NOW)
        self.assertEqual(len(shown), 2)
        self.assertEqual(shown[0]['url'], 'https://youtu.be/Df4ekWvuGng')
    def test_A_initial_four_plus_pin(self):
        shown=news.select([e for e in news.read('news-events.json') if e['id'].startswith(('legacy-', 'historical-'))],news.read('news-pinned.json'),NOW)
        self.assertEqual(len(shown),5);self.assertEqual(shown[-1]['id'],news.PIN_ID)
        self.assertEqual([x['category'] for x in shown],['ARTWORKS','SNAP','YOUTUBE','YOUTUBE','WEBSITE'])
    def test_original_release_date_overrides_site_addition(self):
        r=dict(id='film',category='CINEMATIC',page='cinematic.html',contentIds=['youtube:film'],releaseDate='2025-11-04',releaseEvidence='official-release-page')
        e=news.registered_event(r,publication())
        self.assertEqual(e['date'],'2025-11-04')
        self.assertEqual(e['sitePublishedAt'],publication()['publishedAt'])
        self.assertEqual(news.groups([e],NOW)[0]['date'],'2025-11-04')
        del r['releaseDate']
        with self.assertRaises(ValueError):news.registered_event(r,publication())
    def test_fixed_article_cannot_enter_normal_registry(self):
        with self.assertRaises(ValueError):news.select([dict(news.PIN,contentIds=['renewal'],evidence='test')],news.PIN,NOW)
    def test_fixed_title_exact(self):
        self.assertEqual(news.PIN['title'],'ホームページリニューアル')
    def test_B_new_event_evicts_oldest_only(self):
        events=[event(i,date='2026-10-'+str(10+i)) for i in range(4)]
        old=news.select(events,news.PIN,NOW)
        new=news.select(events+[event('new')],news.PIN,NOW)
        self.assertEqual(len(new),5);self.assertEqual(new[-1],old[-1]);self.assertNotIn(old[3]['id'],[e['id'] for e in new])
    def test_C_twenty_photos_one_news(self):
        s=state();current=copy.deepcopy(s['inventory']);current['SNAP'].update({f'new{i}.jpg':f'blob{i}' for i in range(20)})
        after,added=news.scan(s,current,publication());shown=news.groups(added,NOW)
        self.assertEqual(len(shown),1);self.assertEqual(shown[0]['count'],20)
        again,extra=news.scan(after,current,publication());self.assertEqual(extra,[]);self.assertEqual(again,after)
    def test_D_same_day_different_categories(self):
        self.assertEqual(len(news.groups([event(1),event(2,'ARTWORKS')],NOW)),2)
    def test_E_pin_never_mutated(self):
        pin=news.read('news-pinned.json');before=copy.deepcopy(pin)
        for i in range(5): news.select([event(i),event(i)],pin,NOW)
        self.assertEqual(pin,before);self.assertEqual(pin,news.PIN)
        pin['date']='2026-10-21'
        with self.assertRaises(ValueError):news.select([],pin,NOW)
    def test_fewer_than_four_no_empty_slots(self):
        for n in range(4):self.assertEqual(len(news.select([event(i,date='2026-10-'+str(10+i)) for i in range(n)],news.PIN,NOW)),n+1)
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
    def test_safe_markup(self):
        e=dict(news.PIN,title='<script>alert(1)</script>')
        self.assertNotIn('<script>',news.markup([e]));self.assertIn('&lt;script&gt;',news.markup([e]))
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
