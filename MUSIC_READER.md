# MUSIC reader — 2026-10-25

Scope: all eight release cards in sound.html. The original HTML remains the content source and non-JavaScript fallback. Four existing descriptions and four lyric texts are moved without changing their text, paragraph markup or line breaks. Each dialog returns their original DOM nodes on close. The carousel code, eight jackets, three genre disclosures, header and footer are unchanged.

The native modal dialog keeps artwork, metadata, the five service icons and available text navigation stationary; only the active text panel scrolls. Arrow keys, Home/End, Escape, focus return and viewport-height adaptations are included. Existing Spotify/YouTube players are independent page sections outside the reader. Missing/whitespace/known placeholder text produces no tab or panel. If both texts are missing there is no VIEW DETAILS button; a single text uses a heading without a tablist. Unverified URLs remain empty and cannot navigate. Brand artwork is not recolored or dimmed; pending state is conveyed by a separate 準備中 label and aria-disabled.

## Release URL state

| Release | Spotify | Apple Music | YouTube | LINE MUSIC | YouTube Music |
|---|---|---|---|---|---|
| 途中のままで | pending | pending | pending | pending | pending |
| ひかりのありか | pending | pending | pending | pending | pending |
| 新しい輪郭 | pending | pending | pending | pending | pending |
| 空に溶ける | pending | pending | pending | pending | pending |
| VOID TO FORM | existing album | pending | pending | pending | pending |
| NOVA PULSE | existing album | verified release | existing video | verified release | verified release |
| NIGHT’S AWAKENING | pending | pending | existing video | pending | pending |
| BLUE SLEEP | existing album | pending | pending | pending | pending |

NOVA PULSE's three added URLs match both the existing LISTEN & DOWNLOAD section and the distributor's release record at https://big-up.style/6EmHEAIHB1 (retrieved 2026-10-25 JST). BLUE SLEEP's two differently titled videos (Deep Sleep / Celestial Lake) are preserved in a separate AMBIENT / CHILL VIDEOS section; they are not asserted to be BLUE SLEEP videos or reused as its YouTube destination. Unknown state does not claim that a release does not exist.

## Official icon assets (original bytes)

- Spotify: https://developer.spotify.com/images/guidelines/design/2024-spotify-logo-icon.zip — Primary_Logo_Black_RGB.svg → xen-music-spotify-black.svg
- Apple Music: official identity guide https://marketing.services.apple/apple-music-identity-guidelines → https://apple.co/am-icon-2020 — AppleMusic_Icon_BlackandWhite/SVG/Small/Apple_Music_Icon_blk_sm_073120.svg → xen-music-apple-black.svg
- YouTube: https://brand.youtube/youtube-icon/ → https://www.gstatic.com/marketing-cms/89/d9/cf95c4f345709f4998dc581221b0/youtube-icon.zip — Digital/02 Almost Black/yt_icon_almostblack_digital.png → xen-music-youtube-black.png
- LINE MUSIC: https://music.line.me/top/logo/ → https://vos.line-scdn.net/lmj-scdn/assets/web/logo/png.zip — Symbol/LINE_MUSIC_Symbol_260303_black.png → xen-music-line-black.png
- YouTube Music: official service page https://music.youtube.com/ → https://music.youtube.com/img/favicon_144.png

Apple Music retains the official black icon’s original outer shape. The YouTube Music icon remains the existing official color asset: an approved black replacement and its usage conditions were not verified, so full five-icon monochrome is explicitly incomplete. No CSS recoloring or fabricated mark is used. Service names and status labels follow a shared five-column layout.

## Adding releases

Use the existing card data URL attributes. Empty or invalid destinations become disabled labels. Put published copy in `.song-description` and `.sound-song-lyrics`; omit absent content. Put actual existing players inside `.music-playback > .music-playback-item[data-service]` on their own release, outside the text details. Do not invent players from unknown URLs. The reader detects zero, one or two valid text entries automatically.

## Verification

Run node verify-music-reader.cjs with Playwright Chromium and WebKit installed. Optional MUSIC_BASE_URL points to the published site. The 22 browser/viewport cases cover 1920, 1440, 1280, 1024, 768, 430, 390, 375 and 320 widths, short screens and landscape. Each case checks all eight releases, opens the four releases with published text, tests tab/scroll/focus behavior, validates exact content preservation and icon loading, verifies the release link matrix, genre disclosure and carousel navigation. Screenshots/results are written to music-reader-qa/. Ten additional future-content cases check about-only, lyrics-only, whitespace, placeholders and valid text containing the word 未掲載. Physical iPhone Safari and audio delivery through third-party services require separate device/network verification.


## Confirmed fixed-reader contract — restored 2026-10-28

This is a behavior restoration, not a redesign. All current catalogue content, service URLs, assets, genre/player disclosures and shared animations remain the current main version. Only the text-reader implementation from the last pre-regression main commit is restored.

### Verified cause

- Last main commit retaining the fixed reader: `5c06e607c6624c967bed21098bc5739bfc5fe849`.
- Regression: `9d1bbaa2af964ee1d34e97fc8fc830fdbd944144` (2026-10-27 05:09 JST), a 13-file CREATOR / INDEX / DISCOVER / MUSIC integration change.
- `xen-music-reader.js`: removed the native dialog, stationary toolbar/close control, borrowed-content restoration and body position/scroll restoration; generated per-release inline `details.music-text-drawer` instead.
- `xen-music-reader.css`: added inline drawer styles; the original `#music-reader` flex/min-height/overflow styles remained but no longer matched a generated dialog. This was direct replacement of MUSIC behavior, not a demonstrated cross-page CSS collision.
- `sound.html`: changed both reader asset versions to `20261027-inline-details1`.
- Later `5b30450` and `756a164` changed regression expectations to inline drawers. The dedicated reader workflow still targeted only an old work branch, so main/shared-style updates did not automatically run it.
- Git history establishes the code change. It does not establish why the change was considered authorized.

### Invariants for future changes

Keep one shared `#music-reader` modal for every release with published text. Its toolbar and bilingual ABOUT THE SONG / 楽曲解説 and LYRICS / 歌詞 labels remain outside the scrolling panel. Preserve the bounded viewport height, flex column, non-shrinking controls, `min-height:0`, panel `overflow-y:auto`, and overscroll containment. Do not move the scrolling responsibility to the dialog or page. Native modal top-layer behavior keeps the close control above the background; no new z-index or !important override is needed.

Opening locks the page using its saved scroll offset; closing via the button or Escape restores body styles, original content nodes, scroll position and opener focus. Lyrics retain their exact HTML, authored line/paragraph breaks and centered alignment. The reader uses MUSIC-specific selectors and must remain excluded from shared entrance motion.

Current inventory: eight releases, four with both published texts (途中のままで, ひかりのありか, 新しい輪郭, 空に溶ける); the other four have no published reader text and keep their existing no-button behavior. 遠くへ is absent from current main and is not fabricated or added.

### Required regression checks

`node verify-music-reader.cjs` runs Chromium and WebKit at eleven viewport sizes plus five future-content fixtures per engine. It verifies heading/close coordinates before and after actual panel scrolling, bottom reachability, overscroll/background locking, exact content restoration, click/Escape close, focus and page-position restoration, portrait/landscape resizing, service links/icons, carousel and genre/player behavior. Single-text short-content fixtures preserve the same fixed header/panel structure.

The workflow now runs on main and pull requests for HTML/JS/CSS changes, including shared UI edits. The main published job first verifies exact deployed bytes for sound.html and both reader assets, then runs the same browser checks against GitHub Pages. WebKit with mobile emulation is automated coverage; physical iPhone Safari and real finger gestures require separate device verification.
