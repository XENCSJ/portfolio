# STUDIO five logo sets — 2026-10-23

Source inspected through Web GitHub: main `05da15cc98e50ef5b24ded41474065ffd667975f`.
The current STUDIO is `studio.html`; the requested legacy `about.html` returns 404.
No navigation or old URL behavior is changed by this animation-only update.

| Set | INDEX source | STUDIO derivative | Duration |
| --- | --- | --- | --- |
| 01 | original / Precision Trace | Exact original outline order, timing and solid reveal across ZEN / symbol / NEZ | 2.5s |
| 02 | sequential-trace | Same ordered contours and per-part fill | 2.8s |
| 03 | soft-reveal | Same gradual full outline and soft solid fade | 3.5s |
| 04 | reverse-trace | Same reversed path order and drawing direction | 3.0s |
| 05 | dual-reveal | Same edge-to-center delay and opposing stroke directions | 3.2s |

The original image and all 23 exact contour paths are retained. The original
evenodd clip also retains the six triangular holes. No transform, scaling,
shape interpolation or stroke-width change is applied. All three rows share
one animation clock. Trace and transitional fill use K18 `#C5A059`; the final
surface retains the existing K18 gradient with `#C5A059` base stops. The former
repeating highlight is now static at its existing starting position.

Normal navigation selects once with unbiased uint32 rejection and modulo 5
(20% each); Math.random is the fallback. There are no scroll/click replays.
Reduced motion, missing controller/CSS and initialization failures retain the
completed artwork. Finite opacity animations also restore the completed
artwork if JavaScript cleanup fails. Page hiding settles the logo; a bfcache
restore remains complete, without replaying.

## Backup / rollback

`studio-logo-before-20261023.zip` contains the unmodified source HTML, existing
logo animation CSS/JS and SVG. Removing the two new asset references from
`studio.html` restores the old animation; all existing files remain untouched.

## Review

`studio-motion-preview.html` provides five set buttons, replay, PC and phone
widths, and optional fixed frames. A separate review copy permits validation
before applying the two asset references to the public STUDIO page.

The real page accepts `?xen-studio-set=1` through `5`. Normal URLs are random.
For deliberate still-frame inspection only, append `&xen-studio-frame=0.5`
(0–1). This pauses the shared clock only when a valid forced set is also given.
Ordinary visitors receive one finite animation and no preview controls.

Static checks confirm byte-identical existing files except the two STUDIO
asset references, all 23 source paths and original timings, evenodd clipping,
and unchanged SVG dimensions and artwork. Rendered results are recorded in the
completion report. Viewport simulation is not a physical device/Safari test.
