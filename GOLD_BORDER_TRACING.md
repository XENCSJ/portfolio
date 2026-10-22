# Gold Border Tracing — approval pending

Base: `077381064420b5b0d2cc98c32fe04987eefea4c2` (2026-10-23 JST). Work branch: `work/gold-border-tracing-20261023`. Do not merge or publish until XEN approves the HTML preview.

The 14 detail pages load `xen-gold-border.css` and `xen-gold-border.js`. INDEX and all previously shared CSS/JS are unchanged. Existing HTML differs only by two resource tags. STUDIO's current canonical file is `studio.html`; `about.html` does not exist in the current repository.

The brief excludes light backgrounds and standalone image/video framing. Consequently 48 existing dark content containers across five pages receive the decoration; the other nine pages retain their current appearance. No background, padding, size, text, image, link, order, menu or media source is changed.

| Page | Active containers | Count |
| --- | --- | ---: |
| STUDIO | 10 service links; MVV detail area (visible when expanded) | 11 |
| CREATOR | Profile facts; 10 field detail panels; support panel | 12 |
| STORYBOOKS | Excluded: light work cards | 0 |
| ANIMATION | Excluded: light work cards | 0 |
| MUSIC / sound.html | Excluded: seven white release cards | 0 |
| CINEMATIC | Excluded: light work cards | 0 |
| SNAP | Excluded: photo-only gallery | 0 |
| DESIGN | Excluded: white descriptions; artwork itself is untouched | 0 |
| APPAREL | Six BASE product cards; three work cards | 9 |
| ARCHITECTURE | Excluded: white project areas; photographs untouched | 0 |
| SPACE | Excluded: white feature areas | 0 |
| ART GALLERY / artworks.html | Excluded: image-only gallery | 0 |
| SNS MANAGEMENT | Results panel; five workflow cards; FOR YOU panel | 7 |
| PRICE LIST | Nine dark category cards; white plan rows excluded | 9 |

## Implementation

Closed SVG paths use physical border-box dimensions and all four computed corner radii. `pathLength=1000` normalizes one revolution, and the dash pattern moves from 0 to -1000 with `linear infinite`. `--gold-trace-duration: 7s` is the single speed control. Separate base, glow, tail and bright-head paths provide a restrained metallic trace without blur filters or per-frame JavaScript.

Original borders retain their width and are made transparent after successful attachment, preventing duplicate borders and box-model changes. The SVG is absolute, aria-hidden, non-focusable, and pointer-events:none. ResizeObserver follows disclosure and responsive size changes; without it, resize and toggle events refresh the geometry. BASE's specific product grid is observed for list replacements. No timers or broad document mutation observer are added.

The inner SVG group prevents the existing STUDIO icon reveal (`svg > *`) from taking control of the new stroke animation. Original hover background/text/icon motion and scroll-reveal logic are retained. Reduced motion and printing show the fixed border only.

## Review and verification

`gold-border-preview.html` is a standalone, offline shape demo with standard, wide, tall, rounded and parallel cards plus an expanding disclosure. A separately delivered review HTML contains the shape demo, a 390px phone view and all fourteen actual-page snapshots with inline site CSS/JS. External media still require network access. The review artifact is not the live published site.

`verify-gold-border.cjs` runs layout comparison at 1440/390/320px against the base commit, menu controls on all 15 pages, all SOUND disclosures, all 37 price disclosures, CREATOR field disclosures, MVV geometry, continuous stroke motion, reduced motion, resizing and a loop-seam check. Requires Playwright Chromium; optionally set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Outputs `gold-border-qa/`.

Validation uses Chromium with local assets; external embeds are blocked during the deterministic layout run. It does not establish real iPhone/Safari playback or low-end device frame rates. Public Pages checks remain pending owner approval and publication. The legacy `validate-site.py` currently fails its INDEX menu assertion on the unchanged base INDEX; the focused layout/menu checks and NEWS/BASE/YouTube data unit tests are reported separately.

Before merging, reconcile any newer main updates and recheck affected pages. Do not replace main with an old full-site upload.
