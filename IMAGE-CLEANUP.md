# 復元画像の整理記録

対象コミット: `38fd386`、`0dfd968`、`3d2a15f`（Restore XEN portfolio images）。

11件の旧画像すべてについて整理済み画像との対応を確認しました。9件はバイト一致、2件は元画像と縮小版の記録から対応を検証しています。

| 旧ファイル（削除対象） | 保持する整理済みファイル | 判定 |
|---|---|---|
| `IMG_7102.PNG` | `APPAREL (6).PNG` | ファイル内容のGit blob完全一致 |
| `IMG_7657.jpg` | `SNAP (17).jpg` | 元画像のGit blob一致＋復元ファイルはその縮小版と一致 |
| `kabukicho66.jpg` | `DESIGN (9).jpg` | ファイル内容のGit blob完全一致 |
| `333.jpg` | `ARCHITECTURE (4).jpg` | ファイル内容のGit blob完全一致 |
| `49AF3C83-6867-404F-93E5-3244AA11B228.JPEG` | `SNAP (3).JPEG` | 元画像のGit blob一致＋復元ファイルはその縮小版と一致 |
| `IMG_7097.PNG` | `APPAREL (4).PNG` | ファイル内容のGit blob完全一致 |
| `IMG_7137.PNG` | `APPAREL (7).PNG` | ファイル内容のGit blob完全一致 |
| `ChatGPT Image 2026年9月9日 15_27_22.png` | `DESIGN (3).png` | ファイル内容のGit blob完全一致 |
| `Untitled-1 - 30-11-2025 02-08-56.png` | `SPACE (1).png` | ファイル内容のGit blob完全一致 |
| `WINERW.png` | `DESIGN (15).png` | ファイル内容のGit blob完全一致 |
| `page 22.jpg` | `SPACE (6).jpg` | ファイル内容のGit blob完全一致 |

## 参照修正と保護

- 修正・確認対象: `design.html`、`architecture.html`、`apparel.html`、`snap.html`、`space.html`。
- 現在の作業HTML・CSSから旧11ファイルへの参照は0件です。SNAPの表示用縮小版は保持し、拡大リンクは整理済みの元画像を参照します。
- `xen-logo.png` はINDEXと共通ヘッダーで引き続き使用し、内容を変更していません。
- ABOUT / APPAREL / ARCHITECTURE / ARTWORKS / DESIGN / SNAP / SPACEの整理済み画像はすべて保持します。
- `49AF3C83-6867-404F-93E5-3244AA11B228.JPEG` はmainでは既に `6b00520` で削除済みです。作業ブランチでも復活させません。
- 対応不明の旧画像: 0件。

## 保存状態

作業ブランチで11件すべての削除を完了し、GitHubから取得した `5b4bc65` のツリーで対象ファイルが0件であることを確認済みです。

参照修正: `4712c9c`、`d83193f`。削除コミット: `845fb5a`、`0ac2eb8`、`1458b3b`、`e75fadd`、`d648edf`、`451a7a5`、`d0d7799`、`4a66057`、`ccbd051`、`1ab4e40`、`5b4bc65`。

整理済み画像142件と `xen-logo.png` の計143ファイルは、基準コミットから内容が変わっていません。mainへの反映は未承認・未実施です。

全ページのスマホ表示・外部リンク・公開表示は未検証です。サイト全体の残項目は `REVISION-STATUS.md` を参照してください。
