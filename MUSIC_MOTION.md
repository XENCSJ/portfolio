# MUSIC update / 2026-10-24

The approved four-paragraph commentary for 空に溶ける replaces the old commentary verbatim. The carousel's arrow/dot controls and their row are removed. Side covers select the previous/next release; swipes and arrow keys work with 650 ms transitions. The existing seven-release pool, shuffled autoplay cadence, image sizes, end positions, release cards, lyrics, credits, links, pending labels, genre drawers, shared header and footer are preserved. Three static covers remain visible if JavaScript is unavailable.

`music-motion-preview.html` is a self-contained comparison page with original image bytes embedded. It is not loaded by `sound.html`. No entrance variant is selected for production.

| Variant | Duration | Entrance |
|---|---:|---|
| 01 Luminous Rise | 2.4 s | Central rise and staggered side emergence |
| 02 Prism Rotation | 2.6 s | 15-degree Y rotation and side slides |
| 03 Bloom Expansion | 2.2 s | 85% scale and side blur resolution |
| 04 Floating Gallery | 3.0 s | Different depths with restrained vertical drift |
| 05 Light Sweep Flow | 2.5 s | Dark veil lifts, one diagonal light pass |

All variants finish at the same geometry. Light is a separate layer. IntersectionObserver starts the first entrance once per document; only a selection or REPLAY repeats it. Carousel input cancels the entrance before changing slides. Reduced motion removes both entry motion and slide transitions.

## Validation

Run `npm install --no-save --package-lock=false playwright@1.56.1`, `npx playwright install --with-deps chromium webkit`, then `node verify-music-update.cjs`. The baseline commit must be available locally: `738d011e26d60e05ab9461e82492154c25593c9e`.

Checks include exact approved commentary; unchanged final geometry; seven-image loading; removed controls; side click, keyboard and drag navigation; 100 rapid changes; vertical gesture isolation; genre/commentary/lyrics/service drawers; five entry variants and REPLAY; interruptions; identical final stage pixels across all five; reduced motion; no-JS and deliberate script-failure fallbacks.

Locally verified: Chromium desktop 1440×1000 and mobile 390×844. WebKit and real iPhone Safari were not yet verified at the time of this source checkpoint. Test output records actual engine/profile results. Synthetic or emulated tests do not constitute real-device Safari testing. Existing media destination URLs are preserved; external playback is outside this regression test.
