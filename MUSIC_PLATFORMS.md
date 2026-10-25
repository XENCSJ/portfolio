# MUSIC platform directory — 2026-10-25 JST

The platform update changes only the lower STREAMING and DOWNLOAD directory. A subsequently requested integration also corrects PURPLE AWAKE album labels and restores the fixed reader layout; see below. All 23 entries (12 streaming, 11 download), their order, 14 release URLs and 9 unverified states are retained. DOWNLOAD did not contain dヒッツ; no extra availability or listing is invented. The source snapshot and URLs are in music-platforms-inventory.json. Jacket-level white icons and their service-row implementation remain unchanged.

## Layout

Four columns below 1000px; six columns from 1000px, within the existing MUSIC content width. Each section spans that width, stacked vertically with a quiet divider. All entry borders, backgrounds, radii and shadows are removed. Logos use intrinsic aspect ratios with contain; labels wrap inside their columns. Most marks are capped at 52px on phones / 68px on desktop; wide mora artwork and clear-space-sensitive Spotify/OTOTOY have individual optical sizing. All links have at least 44px targets, a keyboard focus outline and subdued text-only feedback. Unverified entries are noninteractive and explicitly say リンク未確認; artwork is neither dimmed nor recolored. Repeated calls to action and arrows are removed.

## Replaced artwork (10 directory entries)

Brand marks remain the property of their owners. No tracing, generated logos, CSS color filters, background removal or inferred cutouts are used.

| Service | Asset / provenance | Treatment |
|---|---|---|
| Spotify | xen-platform-spotify.svg; https://developer.spotify.com/documentation/design → https://developer.spotify.com/images/guidelines/design/2024-spotify-logo-icon.zip, Primary_Logo_Green_RGB.svg | Unchanged SVG; green on black, reserved clear space, above 21px minimum. |
| Apple Music | existing xen-sound-apple-music.svg; https://marketing.services.apple/apple-music-identity-guidelines → https://apple.co/am-icon-2020 | Original official color music-note icon; replaces incorrect standalone Apple mark. No animation. |
| LINE MUSIC | existing xen-sound-line-music.png; https://music.line.me/top/logo/ → https://vos.line-scdn.net/lmj-scdn/assets/web/logo/png.zip | Unchanged official green symbol. |
| YouTube Music | existing xen-music-youtube-music.png; https://music.youtube.com/img/favicon_144.png, recorded in MUSIC_READER.md | Reuses existing transparent service-owned asset; no alteration. A broader standalone promotional usage grant was not independently established. |
| Amazon Music Unlimited / Amazon Music Prime / Amazon digital store | xen-platform-amazon.svg; https://artists.amazonmusic.com/brand-guidelines → https://amazonmusic.app.box.com/s/8eswutew4d093jo7450682oj1qntlysz/file/1668816124517 | Original Amazon_Music_Logo_Stacked_RGB_White+Music_Cyan_MASTER.svg; official compact-placement alternative on dark backgrounds. No plan-specific claims changed. |
| iTunes Store | xen-platform-itunes.png; https://marketing.services.apple/itunes-identity-guidelines → official itunes-store-icon.zip | PNG losslessly exported from the provided ITunes_Store_Icon.psd composite at native 1920×1920; original color, alpha and rounded shape preserved, no pixel edits or resizing. |
| mora | xen-platform-mora.png; https://mora.jp/etc/logo → https://mora.jp/pc/etc/img/mora_logotype_a.zip, mora_logo02/mora_c.png | Original white-on-transparent alternative, chosen for contrast on black. No recoloring. |
| OTOTOY | xen-platform-ototoy.svg; https://ototoy.jp/about/logo → https://imgs.ototoy.jp/about/resources/ototoy-block-green.zip | Original green block SVG, clear space and minimum size retained. |

Apple/iTunes credits appear once below the directory. Links still target NOVA PULSE, not service homepages.

## Retained marks / incomplete transparency

The original distributor assets originate from https://big-up.style/6EmHEAIHB1 under /pc/assets/images/linkups/store-logos/. Their history was checked (asset introduction 9728d41fc3155dc31837f36c24bf3358f99f0ff9).

- AWA and NetEase Cloud Music already contain alpha transparency and retain their native brand shapes (three entries combined).
- **Ten entries retain existing background-bearing artwork:** Rakuten Music, KKBOX, dヒッツ powered by レコチョク, TikTok, オリミュウストア, mu-mo, レコチョク, ドワンゴジェイピー, mysound, music.jp STORE.
- Suitable transparent replacements with applicable reuse conditions were not verified for those ten. Official pages were inspected where reachable; no third-party imitation packs were substituted. Rakuten's public press kit is restricted to reporting use with advance application. TikTok's developer guide requires prior written permission. Existing supplied marks are retained under the owner's explicit fallback instruction; this does not assert a newly obtained license.
- A remaining square belonging to one of these source images is **not** an added card. Full removal of every image-embedded background is incomplete. The opaque designs were not guessed, cut, masked, filtered or redrawn.

## Verification

Run node verify-music-platforms.cjs with Playwright 1.56.1 Chromium and WebKit. The dedicated workflow covers 1920×1080, 1440×900, 1280×800, 1024×768, 768×1024, 375×667, 390×844, 430×932 and 320×568 in both engines (18 cases). It checks all 23 image loads, intrinsic proportions, removed card styling, wrapping/no overflow, exact URLs, noninteractive unknown states, keyboard focus and column counts. MUSIC regression checks cover 40 unchanged white jacket icons, eight works, carousel navigation, genre controls, BLUE SLEEP's grouped videos, seven playback drawers and reader tabs/close.

Physical iPhone Safari and third-party audio/video playback are not simulated by these checks. External embeds are blocked during deterministic UI tests. Screenshots and machine-readable results are emitted to music-platforms-qa/.

## Integrated album name and fixed reader update

PURPLE AWAKE replaces the album label in the main card, genre index and jacket alt text. The carousel derives its name from the card. The historical #nights-awakening anchor, existing links, jacket and artist remain stable; NIGHT'S AWAKENING stays on the YouTube iframe and play control. PURPLE AWAKE has no published prose/lyrics, so no empty details action is invented.

Removed the conflicting continuous-reader CSS override. The dialog is viewport-bounded and non-scrolling, with a fixed toolbar/identity and a min-height:0 text column; only the active text panel scrolls. Phones account for safe areas and reduce artwork at short heights; desktop uses two columns. Tabs reset the newly selected panel to the top. The original content nodes are borrowed/restored intact; no distribution icons are inserted into the reader. Four published readers and four releases without published text use the same content-availability rules.

The extended verification covers 11 viewport/height combinations per engine (22 cases), including 390×500 and 812×375. Every published reader is checked for fixed geometry during scrolling, square artwork, viewport containment, usable text height, reading to the final line, tab reset, close control and exact source restoration. Album names, original YouTube title/URL and genre navigation are also asserted. Physical iPhone Safari remains unverified.
