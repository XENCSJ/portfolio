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

- Organized images and the INDEX logo remain unchanged. The later authorized cleanup of eleven restored duplicates is tracked separately in IMAGE-CLEANUP.md.
- Common header references `xen-logo.png`, the exact current INDEX PNG. The PNG is unchanged.
- Three-line menu, close state, Escape/outside/focus handling, current-page marker and fifteen navigation links are implemented.
- Lower pages have the five existing official SNS destinations; INDEX retains all eight existing external links.
- Existing source copy, price data and fifteen video placements are preserved. APPAREL videos stay in APPAREL. The old ABOUT film now belongs to STUDIO, as shown in the supplied STUDIO reference.
- 119 original gallery files are reused under their current GitHub filenames, verified by identical Git blob content.
- Ten original gallery files absent from the current uploads are retained from the previous source checkpoint.
- SNAP uses optimized preview copies and links to full originals. Original image files are not overwritten.
- No path containing `不採用` is referenced. The source repository has no such directory.
- `asset-provenance.json` records original names, current paths, categories and preview paths.

## Page-by-page status

| Page | Applied in this checkpoint | Remaining before completion |
|---|---|---|
| INDEX | Existing layout, logo, copy and eight links retained; common header/menu | Browser and mobile display verification |
| STUDIO | Common components; existing philosophy/workflow copy; reference film restored | Reference hero/workflow/contact images, additional exact copy, FAQ and working form destination |
| CREATOR | Existing biography; portrait, logo/facade, day/night/lounge/support images restored | Exact additional biography/lounge copy and full reference comparison |
| STORYBOOKS | Three original videos, titles, copy and order retained | Reference display comparison and playback verification |
| ANIMATION | Four original videos, titles, copy and order retained | Reference display comparison and playback verification |
| SOUND | Four original videos, streaming links and channel categories retained | NOVA PULSE/distribution images and exact Spotify album embed from reference |
| CINEMATIC | Separate page and shared components | Four correct video URLs are absent from available source; APPAREL URLs must not be substituted |
| SNAP | All 23 available images retained; optimized previews, full originals and reference subset ordering | Additional photos visible only in reference, full order and browser/mobile verification |
| DESIGN | All 25 images and existing text retained; reference project grouping applied; organized paths used | Additional exact project descriptions and full reference comparison |
| APPAREL | All 11 images and three correct videos retained; product/shop/MEDIA sections added | Reference black hoodie image is absent from current assets; remaining reference comparison |
| ARCHITECTURE | All 30 original images and text retained; reference project groups restored | Additional exact descriptions and full reference comparison |
| SPACE | All nine images and text retained; reference project grouping applied | Chair drawing/commercial concept source images and additional exact descriptions; floor plan has now been recovered and added |
| ARTWORKS | All 24 available image files retained; three-column mosaic and reference subset ordering | Additional artwork/logo files visible only in reference; full visual comparison |
| SNS MANAGEMENT | All seven original image files retained; reference performance figures and groups added | Missing purple hero/service graphics, exact additional service copy and working form destination |
| PRICE LIST | Existing prices, service text and form fields retained | Reference comparison and working form destination |

## Verification status

Static checks passed for all fifteen HTML files:

- Local HTML/CSS/image references resolve, including URL-encoded filenames with leading spaces.
- One H1, unique element IDs, one fifteen-link menu and one current-page marker per page.
- Inline JavaScript passes `node --check`.
- All 143 unique local images currently displayed across the pages decode successfully. The original 129 gallery asset records are retained.
- All existing YouTube IDs are retained, with category order unchanged. The ABOUT film is now in STUDIO; APPAREL remains separate from CINEMATIC. Players load on request and retain direct YouTube links.
- INDEX logo is byte-for-byte identical to baseline main.

**Not yet verified:** browser rendering, real mobile widths, four external link responses,
video playback, form delivery, complete reference-copy/image parity and published-site pages.
The current form has no configured destination; it must not claim successful submission.

The supplied reference screenshots are only 110–565 pixels wide (PRICE LIST: 860 pixels). Several long project descriptions cannot be transcribed reliably from those images. Exact content or the original site/HTML is needed; it has not been invented. NOVA PULSE/distributor graphics, the STUDIO hero/workflow/contact graphics, the APPAREL black hoodie image, the SPACE chair/commercial diagrams, the SNS hero/service graphics, and additional SNAP/ARTWORKS files are absent from the available source assets.

## External link checks — 2026-10-14

- 37 of 41 unique external URLs returned HTTP 2xx to HEAD requests.
- `https://youtube.com/@xen_vyx`: HTTP 404 to both HEAD and GET; retain the configured URL pending confirmation.
- `https://x.com/xen_csj`: HTTP 503.
- `https://xen.official.ec/` and `https://doneru.jp/xen_510/login`: HTTP 403.
- These responses do not verify playback, authenticated access or form delivery. No configured link was silently removed or replaced.
- Full results: `external-link-check.json`.

## Saved work

- `4712c9c`: remote foundation checkpoint (shared components, preserved assets, initial static checks).
- `d83193f`: reference image groups, restored CREATOR assets, organized paths and known video players.
- `845fb5a` through `5b4bc65`: eleven verified duplicate image deletions saved on GitHub.
- `5173a43`: final available-source layout pass: ARCHITECTURE/SNAP/ARTWORKS/SNS MANAGEMENT groups, SPACE floor plan and SOUND series. All original works remain available.
- Main advanced to `70d3128` while work continued. Its deletion of `.nojekyll` and `49AF3C83-6867-404F-93E5-3244AA11B228.JPEG` must remain in the final merge.

## Resume procedure

1. Fetch the work branch and main; inspect new commits before editing.
2. Continue from the latest saved work-branch commit. Do not regenerate already corrected files from old templates.
3. Resolve the remaining rows above; preserve all baseline images/copy/links.
4. Commit each completed unit and update this status file with actual verification evidence.
5. Present reviewable changes and ask for explicit main approval.
6. Only after that approval, merge/publish and verify every public page.
