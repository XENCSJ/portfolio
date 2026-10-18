# CREATOR / YouTube映像作品4本

## 現状

- ユーザーが指定した4本を、指定された順番で固定表示する方式。
- 動画ID: `Df4ekWvuGng` → `5AQmdt1HvXI` → `IykFCu-sYKk` → `X3DrK_IgSzg`。
- タイトル・チャンネル名・サムネイルURLはYouTube公式oEmbedで取得。
- `youtube-latest.json` の `status: curated` / `source: owner_selection` は所有者指定を示す。公開日時やAnalytics分類を確認済みとは扱わない。
- 追加先は `creator.html` の XEN FREQUENCY LOUNGE の後、CREATION SUPPORT の前。既存の共通CSS・ヘッダー・フッターは変更しない。
- 最新動画の自動取得は未稼働。OAuth 3 Secretsを設定し、Actions Variablesの `YOUTUBE_AUTO_UPDATE_ENABLED` を `true` にした場合のみ取得ジョブが動く。
- 自動更新を有効にするまでは指定の4本を保持。6時間ごとのワークフローはチェックのみ実行し、動画を差し替えない。

## 固定表示と自動取得の区別

固定表示は、ユーザーが提供したYouTube URLの一覧を保持する。通常動画の自動分類・新着順の取得が成功したという意味ではない。以降のAPI説明は、認証設定後に有効化できる自動取得の仕様。

## 分類方式

YouTube Data API v3の公開VideoリソースにはShorts判定フラグがない。動画時間、サムネイルの比率、URLのリダイレクト、非公開のUI用API、スクレイピングでは判定しない。

YouTube Analytics APIの `creatorContentType` を動画IDごとに確認し、`VIDEO_ON_DEMAND` だけを採用。`SHORTS`、`LIVE_STREAM`、`STORY` は除外する。分類なし、`UNSPECIFIED`、複数種類が混在する場合は更新を停止して前回の正常なJSONを保持する。

公開直後・視聴実績がない動画ではAnalyticsの集計がまだ返らない場合がある。6時間ごとに再確認するが、投稿後6時間以内の掲載は保証できない。未分類の新しい動画を飛ばして、古い4本を最新として新規公開することもしない。

分類待ちを避けたい場合の確認可能な代替は、YouTube Studioで通常動画と確認した動画だけを専用再生リストに追加して、そのリストを公式Data APIで取得する方式。これは手動分類が必要な別運用なので、この変更には無断で組み込んでいない。

## 必要な認証設定

同じGoogle CloudプロジェクトでYouTube Data API v3とYouTube Analytics APIを有効化し、@xen_csjの所有チャンネルでOAuth同意を行う。

読み取り専用スコープ:

- `https://www.googleapis.com/auth/youtube.readonly`
- `https://www.googleapis.com/auth/yt-analytics.readonly`

GitHub → Settings → Secrets and variables → Actionsに以下を保存する。値をチャット、HTML、JS、コミット、ログへ書かない。

| Secret | 値 |
| --- | --- |
| `YOUTUBE_OAUTH_CLIENT_ID` | Google OAuthクライアントID |
| `YOUTUBE_OAUTH_CLIENT_SECRET` | 同じOAuthクライアントのシークレット |
| `YOUTUBE_OAUTH_REFRESH_TOKEN` | 上記の2スコープを承認した対象チャンネルのオフライン更新トークン |

APIキーだけではAnalyticsの分類は取得できない。OAuth同意画面のテスト状態、更新トークンの有効期限・失効条件を確認すること。別のGoogle/ブランドアカウントで認可した場合、取得スクリプトはチャンネル所有確認で停止する。

## 自動更新と失敗時の動作

- cron `17 */6 * * *`（UTC）、日本時間 03:17 / 09:17 / 15:17 / 21:17。GitHub側の遅延・スケジュール停止条件により時刻は保証されない。
- チャンネル全アップロードをページング（上限5000本、超過時停止）。公開状態・公開日時・処理完了・ライブ履歴を確認してからAnalytics分類を行う。
- 公開日時順の最大4本だけを公開JSONに保存。APIレスポンスの私的な統計情報・非公開動画情報は保存しない。
- HTTP 429/一時的5xx/ネットワーク失敗は最大3回まで。権限・割当量エラーは安全に停止する。
- 全取得・分類・検証が成功してからファイルを置換する。失敗で正常なJSONを空にしない。
- 内容が同じなら通常はコミットしない。APIキャッシュの30日更新条件を守るため、20日を過ぎた正常な再確認時だけ検証日時を更新する。30日以上再確認できなければフロント側は古いデータを表示しない。
- JSONだけをコミット。最新mainをrebaseし、競合・push拒否時は停止。force pushしない。
- 現在のPagesはmain/rootのブランチ公開。GITHUB_TOKENのpushだけに依存せず、Pages Build APIを明示的に呼び出す。ビルド完了まで確認し、失敗はActionsで報告する。このAPI経路は本番認証後に実行検証が必要。
- 手動実行は `Refresh latest YouTube videos` → Run workflow。`publish=false` が検証専用、mainで `publish=true` が保存・公開。作業ブランチからの実行は公開しない。
- ワークフローは既定ブランチに存在して初めてスケジュール実行される。取得ジョブは上記の有効化変数がtrueになるまでスキップする。

## 表示と再生

PCは4列、800px以下は2列。16:9を保ち、画像を引き伸ばさず表示。タイトルは2行まで、全文をリンクのtitleとアクセシブルな再生名に残す。

最初の表示ではiframeを読み込まない。再生クリック時だけ16:9のダイアログにYouTubeの埋め込みを生成する。閉じるとiframeを除去し、元のボタンへフォーカスを戻す。YouTubeへの直接リンクを常時用意する。

Safari等でユーザー操作後の自動再生が制限された場合はYouTubeプレーヤーの再生ボタンを押す。プレーヤーの最小寸法を満たせない374px未満の画面、埋め込み禁止、子ども向け指定の動画はYouTubeへ直接移動する。

## 自動取得を有効にする前の残作業

1. 3 Secretsを安全に設定し、@xen_csjのOAuthチャンネル所有を確認。
2. 実APIで4本のID・タイトル・サムネイル・日時・分類を確認。YouTube Studioの「動画」一覧と比較。
3. 新しい未分類動画がある場合は保留理由を解消。通常動画が4本未満なら存在する分だけ。
4. PCおよびiPhone Safariの2列表示、改行、横スクロール、クリック再生、失敗時リンクを確認。
5. 有効化変数をtrueにし、検証専用の手動実行を確認。その後、公開を伴う手動更新・Pages Build API・実公開JSONを確認。
6. Actionsの成功URL・コミットID・実際の動画4本・PC/スマホの確認結果を記録する。

ローカル確認: `python -m unittest -v test_youtube_latest.py` / `node --check xen-latest-videos.js`

## 公式資料

- https://developers.google.com/youtube/data/reference/rest/v3/videos
- https://developers.google.com/youtube/analytics/dimensions#creatorContentType
- https://developers.google.com/youtube/analytics/channel_reports （動画フィルターとディメンションの組合せ）
- https://developers.google.com/youtube/analytics/reference/reports/query
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/iframe_api_reference
- https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow
- https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build
