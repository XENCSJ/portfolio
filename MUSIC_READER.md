# MUSIC reader — 2026-10-25

Scope: all eight release cards in sound.html. The original HTML remains the content source and non-JavaScript fallback. Four existing descriptions and four lyric texts are moved, never rewritten or reformatted. Each dialog returns their original DOM nodes on close. The carousel code, eight jackets, three genre disclosures, header and footer are unchanged.

The native modal dialog keeps artwork, metadata, the five service icons and two accessible tabs stationary; only the active text panel scrolls. Arrow keys, Home/End, Escape, focus return and viewport-height adaptations are included. Existing Spotify/YouTube players remain available within ABOUT THE SONG. Missing text is explicitly labelled 未掲載. Unverified URLs remain empty and cannot navigate. Brand artwork is not recolored or dimmed; pending state is conveyed by a separate 準備中 label and aria-disabled.

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

NOVA PULSE's three added URLs match both the existing LISTEN & DOWNLOAD section and the distributor's release record at https://big-up.style/6EmHEAIHB1 (retrieved 2026-10-25 JST). BLUE SLEEP's two existing individual videos remain in its reader; neither is silently reused as an album-level YouTube destination. Unknown state does not claim that a release does not exist.

## Official icon assets (original bytes)

- Spotify: https://developer.spotify.com/images/guidelines/design/2024-spotify-logo-icon.zip — Primary_Logo_Green_RGB.svg
- Apple Music: official identity guide https://marketing.services.apple/apple-music-identity-guidelines → https://apple.co/am-icon-2020 — RGB/Small/Apple_Music_Icon_RGB_sm_073120.svg
- YouTube: https://brand.youtube/youtube-icon/ → https://www.gstatic.com/marketing-cms/78/29/3e68a1414bb28d0b7e47b44c3c91/youtube-icon.zip — Digital/01 Red/yt_icon_red_digital.png
- LINE MUSIC: https://music.line.me/top/logo/ → https://vos.line-scdn.net/lmj-scdn/assets/web/logo/png.zip — Symbol/LINE_MUSIC_Symbol_260303_green.png
- YouTube Music: official service page https://music.youtube.com/ → https://music.youtube.com/img/favicon_144.png

## Verification

Run node verify-music-reader.cjs with Playwright Chromium and WebKit installed. Optional MUSIC_BASE_URL points to the published site. The 22 browser/viewport cases cover 1920, 1440, 1280, 1024, 768, 430, 390, 375 and 320 widths, short screens and landscape. Each case opens all eight releases, tests tab/scroll/focus behavior, validates exact content preservation and icon loading, verifies the release link matrix, genre disclosure and carousel navigation. Screenshots/results are written to music-reader-qa/. Physical iPhone Safari and audio delivery through third-party services require separate device/network verification.
