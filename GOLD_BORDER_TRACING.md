# Soft Fade Up Reveal — 2026-10-23

Gold Border Tracing was retired across the fifteen production pages. `studio.html` is the current STUDIO page; no `about.html` exists in this repository.

The former SVG injection, ResizeObserver, dark-surface detection, moving stroke layers, looping keyframes and product-list border observer have been removed. `xen-gold-border.js` and `.css` intentionally contain comments only, so stale cached HTML cannot start the removed effect. No production page loads them.

`xen-immersive.js` is the single shared content entrance component: opacity 0–1, translateY 16–0px, 700ms, cubic-bezier(0.22, 1, 0.36, 1), 120ms stagger in visual top-left order. IntersectionObserver unobserves each target after its first entry. Nested card content is excluded. Dynamically loaded product and video cards join the same observer. Content is visible without JavaScript or IntersectionObserver. Reduced motion, keyboard focus and page suspension settle ongoing animations.

Removed card frames:
- CREATOR: the four profile facts, activity disclosures and support card.
- STUDIO: service links and MVV detail card.
- APPAREL: product and film cards; product buttons and links are retained.
- STORYBOOKS / ANIMATION / CINEMATIC: work cards.
- SOUND: release cards, with covers and players kept together.
- SNAP / ARTWORKS: description cards.
- DESIGN: description cards.
- ARCHITECTURE / SPACE: project cards.
- SNS MANAGEMENT: metrics, process and fit cards.
- PRICE LIST: navigation and price cards.
- INDEX: existing content entrances use the shared specification; its logo artwork and category ring are preserved.

Local standalone entrance observers in APPAREL, DESIGN and ARCHITECTURE were removed. K18 text, icons, necessary heading rules, native controls and logo artwork remain intact.

`gold-border-preview.html` now provides a noindex responsive preview of the published pages at 1280, 768, 390 and 320 CSS pixels, including a read-only DOM audit. It no longer contains the retired border demo.
