# XEN CSJ revision checkpoint — 2026-10-14

**In progress. Not approved for main or publication.**

Repository: `XENCSJ/portfolio`
Work branch: `work/xen-csj-latest-20261014`
Baseline: `592666b7f5fb36fa8c19ddde6570dbd030b92990`

The current INDEX links to STUDIO, CREATOR, eleven work categories and PRICE LIST.
The fourteen supplied completion references depict those fourteen lower pages.
There are therefore fifteen HTML files including INDEX, following the user's earlier
“最新構成で” instruction. No page is being deleted to reduce that count.

## Preservation and completed foundation

- All files and images already present on baseline main are retained unchanged, except the requested HTML changes.
- Common header references `xen-logo.png`, the exact current INDEX PNG. The PNG is unchanged.
- Three-line menu, close state, Escape/outside/focus handling, current-page marker and fifteen navigation links are implemented.
- Lower pages have the five existing official SNS destinations; INDEX retains all eight existing external links.
- Existing source copy, price data and fifteen video placements are preserved. APPAREL videos stay in APPAREL.
- 119 original gallery files are reused under their current GitHub filenames, verified by identical Git blob content.
- Ten original gallery files absent from the current uploads are retained from the previous source checkpoint.
- SNAP uses optimized preview copies and links to full originals. Original image files are not overwritten.
- No path containing `不採用` is referenced. The source repository has no such directory.
- `asset-provenance.json` records original names, current paths, categories and preview paths.

## Page-by-page status

| Page | Applied in this checkpoint | Remaining before completion |
|---|---|---|
| INDEX | Existing layout, logo, copy and eight links retained; common header/menu | Browser and mobile display verification |
| STUDIO | Common components; existing philosophy/workflow copy | Reference hero/workflow/contact images, additional exact copy, FAQ and working form destination |
| CREATOR | Existing biography and selected video retained | Reference portrait/lounge sections, exact additional copy and image order |
| STORYBOOKS | Three original videos, titles, copy and order retained | Reference display comparison and playback verification |
| ANIMATION | Four original videos, titles, copy and order retained | Reference display comparison and playback verification |
| SOUND | Four original videos, streaming links and channel categories retained | NOVA PULSE/distribution images and exact Spotify album embed from reference |
| CINEMATIC | Separate page and shared components | Four correct video URLs are absent from available source; APPAREL URLs must not be substituted |
| SNAP | 23 images retained; optimized previews and original enlargement links | Exact reference order and browser/mobile verification |
| DESIGN | 25 original images and existing text retained; corrected file references | Reference project grouping/order and additional exact project descriptions |
| APPAREL | 11 original images and three correct videos retained | Reference ordering, shop and MEDIA grouping |
| ARCHITECTURE | 30 original images and text retained | Reference grouping/order and additional exact descriptions |
| SPACE | Nine original images and text retained | Reference grouping, chair drawing/floor-plan source images and additional exact descriptions |
| ARTWORKS | 24 original image files and text retained | Reference mosaic/order and browser/mobile verification |
| SNS MANAGEMENT | Seven original image files and text retained | Reference order, exact service copy and working form destination |
| PRICE LIST | Existing prices, service text and form fields retained | Reference comparison and working form destination |

## Verification status

Static checks passed for all fifteen HTML files:

- Local HTML/CSS/image references resolve, including URL-encoded filenames with leading spaces.
- One H1, unique element IDs, one fifteen-link menu and one current-page marker per page.
- Inline JavaScript passes `node --check`.
- All 129 gallery image placements decode successfully.
- Existing YouTube IDs and order are unchanged from the saved preparation checkpoint.
- INDEX logo is byte-for-byte identical to baseline main.

**Not yet verified:** browser rendering, real mobile widths, external link responses,
video playback, form delivery, complete reference-copy/image parity and published-site pages.
The current form has no configured destination; it must not claim successful submission.

## Resume procedure

1. Fetch the work branch and main; inspect new commits before editing.
2. Continue from the latest saved work-branch commit. Do not regenerate already corrected files from old templates.
3. Resolve the remaining rows above; preserve all baseline images/copy/links.
4. Commit each completed unit and update this status file with actual verification evidence.
5. Present reviewable changes and ask for explicit main approval.
6. Only after that approval, merge/publish and verify every public page.
