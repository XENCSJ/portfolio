"""Rebuild image-reference audit. Visual judgments are explicit, never inferred from filenames."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlsplit
import json,csv,hashlib,re,subprocess
ROOT=Path(__file__).resolve().parent
PAGES=['index','studio','creator','storybooks','animation','sound','cinematic','snap','design','apparel','architecture','space','artworks','sns-management','price-list']
PRE={x['preview']:x['original'] for x in json.loads((ROOT/'preview-optimization.json').read_text())['images']}
PROV={x['file']:x['original'] for x in json.loads((ROOT/'asset-provenance.json').read_text())['assets']}
class Doc(HTMLParser):
 def __init__(self):super().__init__();self.images=[];self.a={};self.h='';self.heading=False
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if t=='a':self.a=a
  if t in ('h1','h2','h3'):self.heading=True;self.h=''
  if t=='img' and a.get('src'):
   src=a['src'];path=unquote(urlsplit(src).path).removeprefix('./');remote=bool(urlsplit(src).scheme)
   key=src.split('/')[-2] if remote else PRE.get(path,path)
   self.images.append(dict(key=key,src=src,href=self.a.get('href',''),order=len(self.images)+1,section=self.h,remote=remote))
 def handle_endtag(self,t):
  if t=='a':self.a={}
  if t in ('h1','h2','h3'):self.heading=False
 def handle_data(self,d):
  if self.heading:self.h+=d
# Reference order excludes the shared header and embedded-player UI avatars.
REF={}
def seq(page,items):REF[page]=[dict(key=k,position=str(i+1),description=d) for i,(k,d) in enumerate(items)]
def F(cat,num,ext):return f'{cat} ({num}).{ext}'
seq('creator',[(F(' ABOUT',2,'PNG'),'プロフィール／黒いジャケットの人物'),(F(' ABOUT',6,'PNG'),'XEN／壁面の立体ロゴ'),(F(' ABOUT',13,'jpg'),'ラウンジ外観・昼'),(F(' ABOUT',9,'jpg'),'DAY 1／緑の内装'),(F(' ABOUT',8,'jpg'),'DAY 2／淡いピンクの内装'),(F(' ABOUT',3,'jpg'),'DAY 3／青い内装'),(F(' ABOUT',16,'jpg'),'NIGHT 1／赤紫の内装'),(F(' ABOUT',6,'jpg'),'NIGHT 2／紫の内装'),(F(' ABOUT',10,'jpg'),'NIGHT 3／金色の内装'),(F(' ABOUT',5,'jpg'),'アフターパーティー1／カウンター正面'),(F(' ABOUT',3,'png'),'アフターパーティー2／カウンターと右壁'),(F(' ABOUT',1,'PNG'),'CREATION SUPPORT／応援する画像')])
seq('apparel',[(F('APPAREL',4,'PNG'),'メイン／壁面立体ロゴ・縦構図'),(None,'メイン2／黒パーカー背面・大きな白いXENロゴ'),(F('APPAREL',10,'PNG'),'商品左／黒Tシャツ'),(F('APPAREL',9,'PNG'),'商品中央／黒パーカー正面'),(F('APPAREL',8,'PNG'),'商品右／黒ハット'),('OvsxT_ngrWg','COLLECTION 2023／金色の背景・黒Tシャツ'),('PQs_Ii2_hI8','COLLECTION 2024／青いスーツと青銀の文字'),('yBNfm0PbP4Y','SIGNATURE 2025／金色の文字と人物'),(F('APPAREL',1,'png'),'MEDIA左／番組紹介コラージュ'),(F('APPAREL',2,'png'),'MEDIA右／灰色パーカー')])
seq('design',[(F('DESIGN',15,'png'),'ワインラベル／2本のボトル'),(F('DESIGN',8,'jpg'),'動物病院／夜の店舗'),(F('DESIGN',7,'jpg'),'動物病院／ロゴ・名刺一覧'),(F('DESIGN',14,'PNG'),'動物病院／カードを持つ手'),(F('DESIGN',4,'jpg'),'Suica／緑の広告一覧'),(F('DESIGN',5,'jpg'),'Suica／緑のカード'),(F('DESIGN',3,'png'),'SHIROWASHI／白い鳥'),(F('DESIGN',4,'png'),'KUROUSAGI／黒背景のうさぎ'),(F('DESIGN',5,'png'),'TAKOLEO／ライオンのキャラクター'),(F('DESIGN',2,'PNG'),'店舗ブランド／木質の店頭'),(F('DESIGN',10,'PNG'),'SAKELAND／発光ロゴ'),(F('DESIGN',11,'PNG'),'黒Tシャツ／KABUKICHOプリント'),(F('DESIGN',1,'png'),'アパレル／作業服の設計図'),(F('DESIGN',13,'PNG'),'アパレル／作業服着用写真'),(F('DESIGN',9,'PNG'),'ジュエリー左／黒い服'),(F('DESIGN',6,'PNG'),'ジュエリー中央／白いシャツ'),(None,'ジュエリー右／青背景の金色G字ロゴ'),(F('DESIGN',12,'PNG'),'テキスタイル柄一覧'),(F('DESIGN',2,'jpg'),'Tシャツ柄一覧')])
arch=[]
for nums,ext,desc in [([3,7,8,6,5],'PNG','建築作品集'),([4,5],'jpg','集合住宅図面・計画'),([9],'png','集合住宅夜景'),([1],'jpg','円形建築計画ボード'),([4,1],'PNG','円形建築の中庭・外観'),([3,6],'jpg','公共建築ボード・完成写真')]:
 arch.extend((F('ARCHITECTURE',n,ext),desc+f'／{n}') for n in nums)
arch.extend((F('ARCHITECTURE-S',n,'jpg'),'建築ドローイング／'+str(i+1)) for i,n in enumerate([1,3,2]))
arch.extend((F('ARCHITECTURE',n,'PNG'),'建築CG・模型／'+str(i+1)) for i,n in enumerate([10,11]))
for n,desc in [(5,'写真1段左／PARCO外観'),(6,'写真1段右／歌舞伎町の門'),(7,'写真2段左／ガラス建築内部'),(9,'写真2段右／夜の交差点'),(2,'写真3段左／「焼」の店頭'),(1,'写真3段右／落書きの壁'),(4,'写真4段左／ステッカーの標識'),(8,'写真4段右／ステッカーの柵')]:arch.append((F('ARCHITECTURE-P',n,'jpg'),desc))
seq('architecture',arch)
seq('space',[(F('SPACE',5,'jpg'),'空間デザイン1／夕景スクリーン'),(F('SPACE',2,'jpg'),'空間デザイン2／黒い石壁の廊下'),(F('SPACE',4,'jpg'),'インスタレーション1／青紫の街路'),(F('SPACE',1,'jpg'),'インスタレーション2／ピンクの街路・図解ボード'),(None,'家具／Gently chairの設計図'),(F('SPACE',3,'png'),'家具／白い椅子と女性'),(F('SPACE',3,'jpg'),'照明／ASANOHA計画ボード'),(F('SPACE',1,'png'),'照明／街路の灯り'),('IMG_8369.PNG','内装設計／彩色された2つの平面図'),(None,'商業コンセプト／段床・座席の構成図'),(F('SPACE',6,'jpg'),'商業空間／段床と人々の完成イメージ')])
# SNAP positions are row/column as seen, left to right. Repeated content in the reference is recorded, not silently duplicated in HTML.
snaprows=[[(F('SNAP',1,'JPEG'),'黒髪・傾いた上半身'),(F('SNAP',1,'jpg'),'水色の柄シャツ'),(None,'黄色い窓前・青いコートの全身'),(F('SNAP',9,'jpg'),'手を顔に添えた女性')],[(None,'金髪・黒服・赤い壁'),(None,'青い反射空間・両手を広げた人物'),(F('SNAP',15,'jpg'),'黒髪人物・手前に光')],[(F('SNAP',18,'jpg'),'ピンクのスーツ・顔前に青い光'),(None,'金髪・黒い眼鏡・黒服'),(F('SNAP',5,'jpg'),'金色の光・黒いキャップ'),(F('SNAP',12,'jpg'),'両手を頬に添えた女性'),(F('SNAP',3,'jpg'),'金色と紫の光・黒服')],[(F('SNAP',14,'jpg'),'黒いスーツ・右向き'),(F('SNAP',6,'jpg'),'腕を額の上に置いた女性'),(None,'街路・白い上着と黒いスカート'),(None,'緑の背景・赤い上着の全身')],[(None,'黒いスーツ・片腕を上げた人物'),(F('SNAP',16,'jpg'),'白いスーツ・金色の光'),(None,'紫の光・眼鏡に手を添えた人物')],[(None,'緑の階段・青い服で座る人物'),(None,'黒いノースリーブの女性'),(None,'格子背景・白い服で横たわる人物')],[(F('SNAP',11,'jpg'),'黒い服・金色の背景'),(None,'赤紫のシャツ・傾いた人物'),(F('SNAP',8,'jpg'),'黒い服の女性・片手を額へ'),(F('SNAP',3,'JPEG'),'紫のネオン・片手を上げた人物'),(F('SNAP',18,'jpg'),'ピンクのスーツ（3段左と同じ構図）'),(None,'通路・柄スカートの全身')],[(F('SNAP',17,'jpg'),'両手を頬に添えた黒髪人物'),(None,'階段・黒服・手を口元に添えた人物'),(None,'階段・白いロングコートの全身'),(F('SNAP',20,'jpg'),'黒い服・青い車のそば')],[(None,'金色の背景・黒い服の人物'),(None,'黄色い背景・手を顎に添えた人物'),(F('SNAP',13,'jpg'),'縞模様の服の女性'),(F('SNAP',10,'jpg'),'赤い光の線・黒服'),(None,'黄色い背景・灰色の上着の全身')],[(None,'花のそば・白い服の全身'),(F('SNAP',7,'jpg'),'階段・黒い柄シャツ'),(None,'黒髪の人物の顔・暗い背景'),(None,'白いドア・黒いロングドレス')],[(F('SNAP',4,'jpg'),'灰色の服・横向き'),(None,'ピンク髪・灰色の服'),(None,'緑の服・金色の光')],[(None,'黒と白の柄スカート・屋外'),(None,'金髪の横顔・淡いシャツ'),(None,'金髪・青い柄ジャケット'),(None,'青い階段・黒服の全身')],[(None,'黒いスーツ・手を顎に添えた人物'),(F('SNAP',2,'jpg'),'屋外の3人'),(None,'白いシャツ・振り返る人物')]]
REF['snap']=[dict(key=k,position=f'{r+1}段{c+1}列',description=d) for r,row in enumerate(snaprows) for c,(k,d) in enumerate(row)]
art=[[(10,'jpg','青緑の球状文字'),(None,None,'ピンクのムーボ群'),(None,None,'赤黒の抽象画')],[(14,'jpg','金色のひまわり'),(5,'jpg','青い猫'),(2,'jpg','金色の花')],[(17,'jpg','ミラノ大聖堂'),(12,'jpg','木の角を持つ鹿'),(9,'jpg','赤いリンゴの塔')],[(8,'jpg','雨の傘の人物'),(13,'jpg','都市のシルエット'),(3,'jpg','カラフルな人物画')],[(7,'jpg','モスクの水彩'),(7,'png','クローバーの子'),(None,None,'緑のハート型クローバー')],[(6,'jpg','色彩の鷲'),(4,'png','ピンクのキャラクター'),(1,'jpg','道化師')],[(4,'jpg','虎・ハートの尻尾'),(None,None,'青紫の城'),(5,'png','緑の昆虫の子')],[(None,None,'炎のライオン'),(15,'jpg','誕生日ケーキの塔'),(2,'png','ヤドカリ')],[(None,None,'翼を広げた青紫の鳥'),(None,None,'金色の葉と420'),(None,None,'淡色の花')],[(6,'png','かぼちゃの子'),(None,None,'銀河のタツノオトシゴ'),(11,'jpg','銀河の猫')],[(None,None,'黒金の立体的な抽象画'),(3,'png','青紫の魚'),(1,'png','赤緑の幾何学模様（透明部は白背景）')],[(16,'jpg','ノートルダム大聖堂'),(None,None,'白金の花・光'),(None,None,'黒地の銀色の光')]]
REF['artworks']=[dict(key=F('ARTWORKS',n,e) if n else None,position=f'作品{r+1}段{c+1}列',description=d) for r,row in enumerate(art) for c,(n,e,d) in enumerate(row)]
for r,row in enumerate([['金色ZEN縦型A','金色ZEN縦型B','金色の円形エンブレム'],['銀色ZEN縦型','金色XEN横文字','金色の葉XEN A'],['金色の葉XEN B','金色の葉XEN C','細い金色XEN'],['装飾付きXEN','幾何学線のXEN','星形枠のXEN']]):
 for c,d in enumerate(row):REF['artworks'].append(dict(key=None,position=f'ロゴ{r+1}段{c+1}列',description=d))
seq('sns-management',[(None,'冒頭／YouTube 4,000万・TikTok 6,000万・総再生1億の紫画像'),(None,'サービス上段／企画から撮影・編集・運用まで'),(None,'サービス下段／企画・撮影・編集・分析・改善'),('IMG_8560.PNG','実績／黒地と赤文字の一覧'),('IMG_6339.JPG','実績／3本の人物動画'),('IMG_8563.PNG','YouTubeショート実績一覧'),('IMG_8562.PNG','TikTok実績一覧'),(None,'こんな方に最適／紫の画像')])
seq('studio',[(None,'冒頭／金色のロゴ・波紋・MISSION/VISION/VALUE'),('4BGaAOZJiKc','VOID TO FORM／灰色の煙と立体ロゴ'),(None,'WORKFLOW／6工程のアイコン画像'),(None,'CONTACT／考える人物と制作領域アイコン')])
seq('storybooks',[('DslArGmxy7A','よつばのしー／花畑とクローバーの子'),('jRWWBQFSa2w','ちいさなミラ／夕景の浜辺とヤドカリ'),('i4rhhybpecs','パキー／かぼちゃの子')])
seq('animation',[('qQzOTZhiruE','ムーボ／ピンクのキャラクター群'),('-aHdK3AyMd0','BROKEN CYCLE／赤いカーテンと人物'),('N4FiRqQciWE','SILENT REBELLION／ネオンと黒い人物'),('epB9CUXdP_E','LIFE STAIRS／紫の階段と渦')])
seq('sound',[(None,'冒頭／NOVA PULSE紹介画像・右側の説明'),(None,'Spotify／VOID TO FORMのアルバム表示'),(None,'配信サービスのアイコン一覧（元の分割単位未確定）'),('TpUbm4xbmVc','MUSIC 1／紫の立体ロゴ'),('uqQI6369VYg','MUSIC 2／紫の都市'),('-_Z0oOPnfvE','Sleep BGM 1／青い島とSLEEP'),('t2sB0oOTOAA','Sleep BGM 2／湖とSLEEP')])
seq('cinematic',[(None,'ストリート30秒／屋上の人物・SAMPLE'),(None,'キレイ30秒／青い背景の人物・SAMPLE'),(None,'ストリート90秒／紫の手すりと人物・SAMPLE'),(None,'キレイ60秒／街の光と人物・SAMPLE')])
REF['price-list']=[];REF['index']=[]
FILES={'studio':'IMG_8766(1).jpeg','creator':'IMG_8768.jpeg','storybooks':'IMG_8777.jpeg','animation':'IMG_8779.jpeg','sound':'IMG_8781.jpeg','cinematic':'IMG_8783.jpeg','snap':'IMG_8785.jpeg','design':'IMG_8788.jpeg','apparel':'IMG_8790.jpeg','architecture':'IMG_8792.jpeg','space':'IMG_8794.jpeg','artworks':'IMG_8796.jpeg','sns-management':'IMG_8798.jpeg','price-list':'IMG_8759(1).png'}
# The 17:56 instruction explicitly replaces promotional text images with real text.
TEXT_REPLACEMENTS = {
 ('sns-management','1'): ('.stats-graphic','文字化済み／実績の文言一致'),
 ('sns-management','2'): ('.service-graphic','文字化済み／サービスの文言一致'),
 ('sns-management','3'): ('.flow-graphic','文字化済み／5工程の文言一致'),
 ('sns-management','8'): ('.audience-graphic','文字化済み／対象者の文言一致'),
 ('studio','1'): ('.gold-graphic','文字化済み／MISSION等の小文字本文は未確定'),
 ('studio','3'): ('.workflow-graphic','文字化済み／6工程と説明を反映'),
 ('studio','4'): ('.contact-graphic','文字化済み／追加本文は未確定'),
 ('sound','1'): ('.nova-graphic','文字化済み／NOVA PULSE紹介本文は未確定'),
 ('creator','12'): ('.support-graphic','文字化済み／元画像と支援URL保持'),
}
FILES={page: 'IMG_'+number+suffix for page,number,suffix in [
 ('studio','8766','(2).jpeg'),('creator','8768','(1).jpeg'),('storybooks','8777','(1).jpeg'),
 ('animation','8779','(1).jpeg'),('sound','8781','(1).jpeg'),('cinematic','8783','(1).jpeg'),
 ('snap','8785','(1).jpeg'),('design','8788','(1).jpeg'),('apparel','8790','(1).jpeg'),
 ('architecture','8792','(1).jpeg'),('space','8794','(1).jpeg'),('artworks','8796','(1).jpeg'),
 ('sns-management','8798','(1).jpeg'),('price-list','8759','(2).png')]}
rows=[];used=set();counts={}
for page in PAGES:
 doc=Doc();doc.feed((ROOT/(page+'.html')).read_text());taken=set()
 for im in doc.images:
  key=im['key'];matches=[(i,x) for i,x in enumerate(REF[page]) if x['key']==key and i not in taken]
  row={'ページ名':page.upper(),'掲載順':str(im['order']),'正式ファイル名':key,'GitHub保存パス':('/'+key if not im['remote'] else '外部配信／GitHub保存なし'),'HTML参照先':page+'.html :: img[src="'+im['src']+'"]','元画像リンク':im['href'],'見本位置':'','内容・判定根拠':'','照合結果':'','旧記録名':PROV.get(key,''),'完成見本':FILES.get(page,'INDEX既存HTML'),'元画像SHA256':''}
  if not im['remote']:
   used.add(key);row['元画像SHA256']=hashlib.sha256((ROOT/key).read_bytes()).hexdigest()
   assert subprocess.run(['git','cat-file','-e','origin/main:'+key],cwd=ROOT,capture_output=True).returncode==0,key
  if key=='xen-logo.png':
   row.update({'見本位置':'共通ヘッダー' if im['order']==1 else 'INDEX中央','内容・判定根拠':'INDEXの正式PNGを参照。共通使用による重複。','照合結果':'正式PNG指定と一致'})
  elif matches:
   i,ref=matches[0];taken.add(i);row.update({'見本位置':ref['position'],'内容・判定根拠':ref['description'],'照合結果':'内容一致・順序対応済み'})
   if im['remote']:
    row['照合結果']='同作品のサムネイル一致（埋め込みUI・トリミング差あり）'
    row['正式ファイル名']='hqdefault.jpg（YouTube ID: '+key+'）'
   if key=='DslArGmxy7A':row['照合結果']='同作品／見本と表示フレーム差';row['内容・判定根拠']+='。見本は後ろ姿、現在の公式サムネイルは正面。URLは維持。'
   if key=='SNAP (3).jpg':row['照合結果']='構図一致／色調の採用版未確定';row['内容・判定根拠']+='。SNAP (19).jpgは同じ構図の色調違い。'
  else:
   row.update({'見本位置':'特定できず','内容・判定根拠':'現在の掲載素材を保持。見本に同じ掲載箇所を特定できない。','照合結果':'掲載位置未確定・現状保持'})
   if key=='SNAP (19).jpg':row['内容・判定根拠']='SNAP (3).jpgと同じ構図・色調違い。見本の採用版が未確定のため両ファイル保持。'
  if key=='IMG_8369.PNG':row['内容・判定根拠']+=' 同じファイルをARCHITECTUREとSPACEで重複使用。SPACE見本とは一致、ARCHITECTURE見本での採用位置は未確定のため保持。'
  rows.append(row)
 for i,ref in enumerate(REF[page]):
  if i in taken:continue
  replacement=TEXT_REPLACEMENTS.get((page,ref['position']))
  if replacement:
   selector,status=replacement
   if ref['key']: used.add(ref['key'])
   rows.append({'ページ名':page.upper(),'掲載順':'文字ブロック','正式ファイル名':ref['key'] or 'HTMLテキスト（画像なし）','GitHub保存パス':('/'+ref['key'] if ref['key'] else '/'+page+'.html + /xen-reference.css'),'HTML参照先':page+'.html :: '+selector,'元画像リンク':'./%20ABOUT%20%281%29.PNG' if page=='creator' else '', '見本位置':ref['position'],'内容・判定根拠':ref['description']+'。2026-10-14追加指示により文字とCSSへ置換。画像ファイルを推測で代用しない。','照合結果':status,'旧記録名':'','完成見本':FILES[page],'元画像SHA256':hashlib.sha256((ROOT/ref['key']).read_bytes()).hexdigest() if ref['key'] else ''})
   continue
  repeat=ref['key'] is not None
  rows.append({'ページ名':page.upper(),'掲載順':'未配置','正式ファイル名':ref['key'] or '未特定','GitHub保存パス':('/'+ref['key'] if repeat else '未特定'),'HTML参照先':'該当参照なし','元画像リンク':'','見本位置':ref['position'],'内容・判定根拠':ref['description'],'照合結果':'見本内の重複・追加掲載の意図未確定' if repeat else '対応素材未特定・推測配置なし','旧記録名':'','完成見本':FILES[page],'元画像SHA256':''})
 counts[page]={'html_images':len(doc.images),'reference_content_slots':len(REF[page])}
# A duplicate rendering was removed, while its original file and high-resolution link remain.
rows.append({'ページ名':'ARCHITECTURE','掲載順':'別サイズの元画像リンク','正式ファイル名':'DSC02248-.jpg','GitHub保存パス':'/DSC02248-.jpg','HTML参照先':'architecture.html :: a[href="./DSC02248-.jpg"]','元画像リンク':'./DSC02248-.jpg','見本位置':'写真3段左／内容23','内容・判定根拠':'ARCHITECTURE-P (2).jpgと同じ店頭写真。比較画像300×200でRGB平均差0.27〜0.33/255。重複画像表示を統合し、高解像度リンクを保持。','照合結果':'重複表示修正済み・ファイル保持','旧記録名':'DSC02248-.jpg','完成見本':FILES['architecture'],'元画像SHA256':hashlib.sha256((ROOT/'DSC02248-.jpg').read_bytes()).hexdigest()})
# Record unreferenced organized images too. Never infer publication authorization from their mere presence.
unreferenced=[]
for p in sorted(ROOT.iterdir()):
 if p.suffix.lower() not in ['.png','.jpg','.jpeg'] or p.name.startswith('snap-preview-') or p.name in used or p.name=='DSC02248-.jpg':continue
 unreferenced.append(p.name)
 rows.append({'ページ名':'CREATOR / 保管素材','掲載順':'未配置','正式ファイル名':p.name,'GitHub保存パス':'/'+p.name,'HTML参照先':'該当参照なし','元画像リンク':'','見本位置':'特定できず','内容・判定根拠':'ラウンジの別構図・別配色。ファイルは保持。','照合結果':'見本内の採用箇所未確定','旧記録名':PROV.get(p.name,''),'完成見本':FILES['creator'],'元画像SHA256':hashlib.sha256(p.read_bytes()).hexdigest()})
# Prohibited assets and missing local references must fail rather than get a match label.
for row in rows:
 for col in ['正式ファイル名','GitHub保存パス','HTML参照先']:
  assert '不採用' not in row[col] and 'XENポートフォリオ画像の復元' not in row[col],row
meta={'date':'2026-10-14','source_main':subprocess.check_output(['git','rev-parse','origin/main'],cwd=ROOT,text=True).strip(),'scope':'15 HTML pages; 14 reference screenshots; all authored img elements, reference-only material slots, alternate source link and unused organized assets','method':'Visual comparison of complete reference screenshots and category contact sheets; exact source/preview mapping and Git object existence separately verified. Existence alone is never treated as visual agreement. Transparent artwork composited on white for comparison.','limits':['以前のカテゴリー別ファイル名一覧の原本は今回の資料検索では回収できていません。旧記録名は既存asset-provenance.jsonに由来し、元一覧との完全一致を意味しません。','小さい完成見本（幅110〜565px、料金表860px）から判別できる内容・順序の照合です。高解像度の同一性・未読本文の復元ではありません。','YouTube埋め込み内のチャンネルアバター・再生アイコン、共通フッターのインラインSVGはHTML画像ファイルではないため除外。','見本の合成ボードは元画像1点として扱います。ボード内の個別写真・アイコン分割の元ファイルは未確定。'],'changes':['SNAP: 確定した見本位置に合わせ、SNAP (18).jpgを3段左相当の順序へ移動。掲載23枚とリンクをすべて保持。未特定の2.JPEG・19.jpgは末尾で保持。','ARCHITECTURE: 同じ店頭写真の二重表示を1回に統合。DSC02248-.jpgは削除せず高解像度リンクを保持。'],'counts':counts,'unreferenced_files':unreferenced,'rows':rows}
(ROOT/'image-reference-audit.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
with (ROOT/'image-reference-audit.csv').open('w',encoding='utf-8-sig',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
from collections import Counter
print('Rows',len(rows),'statuses',dict(Counter(x['照合結果'] for x in rows)))
print('Images',sum(x['html_images'] for x in counts.values()),'reference slots',sum(x['reference_content_slots'] for x in counts.values()))
