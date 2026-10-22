# 新規作品とNEWSの自動連動

## 運用

作品ページへ通常の作品枠を追加してmainへ反映すると、GitHub Pagesの公開成功後に `Update verified NEWS` が作品を検出します。`works.json` を自動同期し、既存のINDEX NEWS欄・アーカイブを生成して、もう一度Pagesを更新します。NEWSの個別編集や `news-content.json` への手作業の二重登録は不要です。

- 通常の作品カード（`.work` / `.sound-song`）、DESIGNの `.design-project`、建築の `.arch-project`、SPACEの `.project-group`、独立したギャラリー画像を自動検出。
- APPARELは掲載中の `base-products.json` 商品ID、CREATORの最新YouTubeは `youtube-latest.json` 動画IDを検出。
- INDEX・STUDIO・CREATOR・SNS MANAGEMENT・PRICE LISTを含む全15ページを検査。サービス説明・プロフィール写真・価格表の変更は作品追加として数えません。
- 独自構造の新しい作品枠は、その枠に `data-work-id="category:permanent-name"` と必要に応じて `data-work-title="作品名"` を付けます。新しい構造を追加する場合は `sync_works.py` の検出対象も拡張してください。HTMLの任意の変更の意味を推測する方式ではありません。
- 自動付与された `data-work-id` と `id` は同じ作品の修正・差し替え時に維持します。新しい作品を既存カードからコピーする場合は `data-work-id` と `id` を削除するか、新しい一意な値に変更してください。同一IDを二つ作ると検査が失敗します。
- 解説・タイトル・配色・並び順・画像リンク・動画リンクの修正はIDを保持し、公開日時を更新せず、NEWS件数を増やしません。
- 下書きは作品枠に `data-work-status="draft"`、非公開は `private`、終了は `archived` を指定。NEWSから除外します。静的HTMLの実際の表示も隠す場合は `hidden` を併用してください（秘密情報のアクセス制御ではありません）。`published` または属性の省略で公開。下書きからの初回公開だけ新着になり、再公開では日付を更新しません。
- 作品枠を削除した場合は台帳をarchivedに変更し、対応する新着を除外。台帳のID履歴を削除しないでください。

## データと日付

`works.json` は一元化した自動生成台帳です。固有ID、タイトル、カテゴリー、リンク、公開状態、初回公開日時、公開成功の証拠、既知のコンテンツIDを保持します。生成元は実際に成功したPagesデプロイのHTMLと商品・動画JSONです。失敗したデプロイ、未公開ブランチ、未公開のmain差分には日付を付けません。

新着の日付は **XEN CSJサイトで初めて公開に成功した日時（JST）** です。配信サービスの楽曲発売日・外部動画の初公開日とは区別します。既存の歴史記事に記録された確認済みの外部公開日はそのまま維持します。

移行前から掲載されている作品には `baseline: true` を設定し、新着を一斉に作りません。確認できない過去の初回公開日時は `publishedAt: null` とし、推測しません。

『途中のままで』は、main追加コミット `8061a6a71d40fd0104676d54ec37a632c9983316` のPages成功記録により **2026-10-21 21:43:27 JST** と確認済みです。元の手動告知1件をこの日付・タイトル・種別 `NEW RELEASE` に修正し、重複登録しません。

証拠: https://github.com/XENCSJ/portfolio/actions/runs/39601512901/job/119227293594

## NEWS表示

既存のHTML/CSS構造を利用し、通常記事4枠＋固定のリニューアル記事を維持します。新しい作品は作品ごとにタイトルと直接リンクを保持し、公開日時の降順に表示します。固定記事は既存どおり最下部です。以前の写真バッチや指定済みの記事置換は履歴として保持します。`NEW RELEASE` は既存の本文スロットで表示し、CSS・余白・アニメーションは変更していません。

`news-events.json` と `news-archive.json` は生成履歴。`news-state.json`、`news-content.json`、`news-legacy.json` は旧方式の履歴で、現在の同期処理では使用・更新しません。`news-pinned.json` は固定記事です。

## 検証・復旧

```sh
python news.py
python -m unittest -v test_news.py test_sync_works.py
python sync_works.py
python news.py --check
node --check xen-news.js
```

公開履歴を使った実同期はGitHub Actionsの `Update verified NEWS` → Run workflow、または認証済み環境の `python sync_works.py --refresh`（`GITHUB_REPOSITORY`、`GH_TOKEN` が必要）。APIトークンをHTMLやJSONに保存しません。

生成済みNEWSの不一致で同期が止まらないよう、検査ジョブは生成を先に実行します。同期は成功したデプロイを順番に追跡し、NEWSだけの公開には新規コミットを作りません。mainの同時更新があった場合は上書きせず停止し、次の公開成功イベントで再実行します。

テストの追加・修正・非公開作品はメモリ上のfixtureのみです。公開HTML・台帳・アーカイブには残しません。
