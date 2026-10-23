# INDEX five animation sets — 2026-10-23

Baseline / rollback source: `09e2498784abf577892d549a16304c59ce91ed5b`.
The original index and every linked local CSS / JS were backed up before editing.
The original source remains available in this commit's parent history.

## Scope and preservation

Only `index.html` loads the three new motion files. Original logo SVG paths,
image, size, stage, all 15 bilingual category anchors and positions, header,
cart, drawer, NEWS and lower content are unchanged.

The original `xen-index-precision-trace` CSS, `xen-index-menu-reveal` CSS,
and `xen-index-precision-trace-control` JavaScript bodies are byte-identical.
The original control block is stored as an inert script and executed verbatim
only when ORIGINAL is selected. Derivative controllers do not run in ORIGINAL.
The original timings are 2.5 seconds for the logo, and 0.4 seconds / 0.12 seconds
stagger for the labels. No animation library or external dependency was added.

Original block SHA-256:

- Precision CSS: `4a68831ec0ccd66ca78ed39383aa583c267dda410a3f3b547dbabf45b954106d`
- Original JS: `511ba07ffd5e83d7941ea7461acf2d9cebbf69e8c99d8456a6ee11ecd3efc77e`
- Label CSS: `7e440b83d01f950fc02f0120be9fc03a36077d1532a10f276191680eac4a6ac3`

## Sets

| Set | Name | Logo / text | Duration |
| --- | --- | --- | --- |
| 01 | original | Existing precision outline / existing stagger | Unchanged |
| 02 | sequential-trace | Ordered original subpaths, per-part fill / clockwise from INDEX | 2.8s |
| 03 | soft-reveal | Gradual full outline and solid fade / gentle cascade | 3.5s |
| 04 | reverse-trace | Reversed part order and stroke direction / counterclockwise from INDEX | 3.0s |
| 05 | dual-reveal | Side parts before center, both stroke directions / near-opposing pairs | 3.2s |

Two specification conflicts were identified during implementation and the
optional clarification returned no selections. The highest-priority instruction,
complete preservation of ORIGINAL, was followed: the existing 65-second orbit
rotation and ORIGINAL's existing tap replay remain. Entrance animations finish;
they do not cycle automatically. Derivatives autoplay once per document.

There are 15 unequally spaced categories. Exact diametric pairs cannot be made
without changing placement. DUAL selects seven closest available opposing pairs
from the final existing offsets, followed by the remaining single category.
Neither wording, geometry nor DOM order is changed.

## Selection / resilience

A synchronous head selector chooses once per document, with five equal buckets.
Crypto random uint32 values use rejection of 4294967295 before modulo 5, avoiding
modulo bias. Math.random is the fallback. No set changes during playback.
Back/forward cache restores reload the document for a new selection.

Reduced motion shows the completed artwork immediately. No JavaScript shows all
labels immediately. Failure to load the controller leaves the artwork and links
visible. Finite CSS animations restore the complete image even if cleanup fails.
Overlays have no pointer events; all 15 original anchors remain usable.

## Preview

Open `index-motion-preview.html`. Five buttons and replay reload the real INDEX
inside an iframe. Width options include 390, 430 and 1440 pixels. No controls are
inserted into INDEX. `index.html?xen-preview-set=1` through `5` are fixed test URLs;
normal INDEX URLs use random selection.

## Validation

- Chromium: every set at 320, 390, 430 and 1440px, during and after playback.
- Logo and category geometry unchanged during playback; bilingual text shares
  the same anchor animation; no transforms are applied to category labels.
- Final DOM geometry, styles, all 15 hrefs and NEWS match the baseline.
- At 390px, all five completed screenshots match the baseline pixel-for-pixel.
- Actual category click and all 15 local destinations checked.
- Reduced motion, JavaScript disabled and controller load failure checked.
- No uncaught JavaScript errors or horizontal overflow in those tests.
- Preview selection and replay tested independently of random selection.
- Selection mapping: 10,000 sequential input values map to exactly 2,000 per set;
  the rejected uint32 boundary is tested separately. This is an algorithm test,
  not a claim that a small real-world sample will be evenly distributed.

WebKit could not start: system libraries are missing and dependency installation
is unavailable in this environment. Real Safari, Edge, iPhone Safari/Chrome and
Android Chrome are not verified; viewport simulation is not a real device test.
External analytics requests are blocked during local QA, so these checks concern
site JavaScript and layout, not the availability of third-party analytics.

Reproduce from the repository root with Playwright installed:

```sh
node verify-index-motion.cjs
# Optional, on a machine with WebKit dependencies:
XEN_TEST_ENGINES=webkit node verify-index-motion.cjs
```

The script reads the baseline via git and writes captures and JSON results to
`../index-motion-qa` (override with `XEN_QA_OUTPUT`). It expects
`CODEX_PRIMARY_RUNTIME_NODE_MODULES` to locate the available Playwright runtime.
