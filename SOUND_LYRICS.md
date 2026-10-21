# SOUND public lyrics

All releases with lyrics use the shared `xen-sound.css` and `xen-sound.js`.

- Keep the production original unchanged. In the public HTML, separate structure labels and performance directions from the sung text.
- Use `.sound-lyric-section` for each stanza group. Put lyrics in `<p>` elements, retaining every character and explicit `<br>` line break. Separate paragraphs remain separate paragraphs. Do not run a bracket-based or word-based replacement on lyrics.
- Production labels belong in a dedicated element with `data-lyric-label hidden aria-hidden="true"`. Existing direct `<h4>` children of `.sound-lyric-section` are also treated as metadata. Their text is retained in source and hidden along with their decorative lines, regardless of case, numbering, language, or instruction wording.
- Do not use these hidden labels as `aria-labelledby` targets. Intentional sung bracketed words belong in lyric paragraphs and remain visible.
- Wrap nonempty lyrics in `.sound-lyrics-accordion` using the existing `summary.sound-lyrics-toggle`, `.sound-lyrics-label-open`, `.sound-lyrics-label-close`, `.sound-lyrics-icon`, and `.sound-lyrics-panel` structure. Use unique panel IDs and matching `aria-controls` for every release. Omit the `open` attribute so lyrics start collapsed.
- The common script enhances every matching accordion independently, including both opening and closing animations. Without JavaScript, native `<details>` remains usable. Reduced-motion preferences are respected.
- Do not add an accordion for a release without lyrics. No script creates accordions or invents lyrics.

Publication check: compare lyric paragraph text and `<br>` positions with the original; open every accordion; check hidden labels, paragraph spacing, centered text, and horizontal overflow at desktop and mobile widths. Verify the cover, credit, song commentary, players, and other releases are unchanged.
