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
    def test_A_initial_four_plus_pin(self):
        shown=news.select([e for e in news.read('news-events.json') if e['id'].startswith(('legacy-', 'historical-'))],news.read('news-pinned.json'),NOW)
        self.assertEqual(len(shown),5);self.assertEqual(shown[-1]['id'],news.PIN_ID)
        self.assertEqual([x['category'] for x in shown],['ARTWORKS','SNAP','CINEMATIC','YOUTUBE','WEBSITE'])
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

if __name__=='__main__':unittest.main()
