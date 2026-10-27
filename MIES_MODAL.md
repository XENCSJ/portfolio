# Mies detail and FUTURE destination

Source baseline: eb8393f82b4dfa52c028b2daf2543e1c5dd7eb08 (2026-10-27).

- Reuse FUTURE modal CSS unchanged. The new dialog uses its 640px desktop width, gold border, close control and 280ms / 180ms, 6px motion.
- Preserve CREATIVE ORIGIN text, photo and all 12 CREATOR sections. The existing name gains a dialog trigger; the small arrow is CSS content.
- The requested breathing-architecture work is absent from architecture.html. It is present in creator.html inside CONCEPT PROJECT. The link therefore targets creator.html#breathing-architecture and opens only that existing archive. ARCHITECTURE is unchanged. Relocation was not authorized by a clarification response.
- Existing portrait: xen-artwork-20261023-03.jpg (1254 × 1254), confirmed by artwork label and lettering inside the image. Existing anchor: artworks.html#artwork-20261023-03. The existing catalog description is reused; year and technique are not invented. Gallery records, randomization and exclusions are unchanged.
- No usable photographic portrait of Mies was found in the repository. No external portrait has been added. The artwork remains at the end, as requested.

## Media provenance

- creator-creative-origin-barcelona-pavilion.jpeg (1535 × 1025): existing user-designated photo already in CREATIVE ORIGIN; reused unmodified. No independent photographer/license metadata exists in the repository; no broader rights claim is made.
- mies-barcelona-chair-cl3phact0.jpg (1512 × 2016): unmodified original, Cl3phact0, 7 November 2022, CC BY-SA 4.0. Source: https://commons.wikimedia.org/wiki/File:Barcelona_Chair_Barcelona_Pavilion.jpg . Original: https://upload.wikimedia.org/wikipedia/commons/7/74/Barcelona_Chair_Barcelona_Pavilion.jpg . Visible attribution and license link are included. SHA-1: 83d8f9abc436dae499606de7e3f2f66ffb144908.
- xen-artwork-20261023-03.jpg: existing XEN artwork, reused without cropping or modification at the user's request.

## Text references

- https://www.moma.org/artists/7166-ludwig-mies-van-der-rohe
- https://miesbcn.com/the-pavilion/
- https://www.knoll.com/barcelona-chair

The Pavilion explanation credits Lilly Reich and distinguishes the 1929 design from the 1986 reconstruction. Sources checked 2026-10-27.

## Verification

`node verify-mies.cjs` tests Chromium at 320/375/390/430/768/1024/1440px and WebKit at 390/1440px, with both regular and reduced motion. `MIES_BASE_URL` selects a live site. Screenshots and JSON results are written to `mies-evidence/`.
