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

## Song commentary and shared disclosures

All song commentary uses the same disclosure design and independent animation as lyrics. Keep this order: card title, gold rule, cover, repeated title, artist, credit when registered, Spotify disclosure, YouTube disclosure, commentary disclosure, lyrics disclosure. Do not add an empty disclosure or invent missing commentary.

Use this structure for each new commentary, replacing `unique-song-about-panel` with a unique ID and inserting the approved prose:

```html
<details class="sound-accordion sound-about-accordion">
  <summary class="sound-accordion-toggle" aria-controls="unique-song-about-panel">
    <span class="sound-accordion-label-open">楽曲解説を見る</span>
    <span class="sound-accordion-label-close">楽曲解説を閉じる</span>
    <span class="sound-accordion-icon" aria-hidden="true"></span>
  </summary>
  <div class="sound-accordion-panel" id="unique-song-about-panel">
    <div class="song-description"><p>Approved commentary text.</p></div>
  </div>
</details>
```

- Omit `open` and `name`: each disclosure starts collapsed and opens independently.
- Do not repeat ABOUT THIS SONG or a Japanese subtitle; the summary is the label.
- Preserve every word and punctuation mark. Join commentary paragraphs into one continuous paragraph without manual `<br>` tags, blank lines, or extra whitespace. These rules apply only to commentary, never to lyrics.
- `.song-description` supplies left alignment, responsive 14–16px type, 1.85 line height, natural wrapping, and no paragraph spacing. The shared script accepts both this structure and existing lyric markup.
- Verify both open/close labels and plus/minus icons, independent disclosure states, keyboard operation, reduced motion, no-JavaScript native behavior, and no horizontal overflow at PC and phone widths.

## Release cards and slideshow (2026-10-23)

Every `.sound-release-card` owns its title, unchanged artwork, `data-spotify-url` and `data-youtube-url`. Keep both `.sound-media-accordion` rows even when the URL is empty; their panels stay empty without placeholders. Adding a verified URL on the card populates an empty panel through `xen-sound-catalog.js`. Keep links and player destinations synchronized when changing an existing URL.

Register a verified jacket with `data-slideshow="true"`. The slideshow reads cards directly, shuffles complete cycles, avoids consecutive repeats, starts at five-second intervals and supports swipe, arrows, pause, visibility pause and reduced motion. Images use contain inside square frames, never cropping or stretching. Cards for NIGHT'S AWAKENING, Deep Sleep and Celestial Lake retain their existing video thumbnails and are excluded from the jacket slideshow until formal jackets are supplied.

Spotify links from the slideshow come only from the matching card. Blank URLs never navigate. Do not add listening buttons, embeds or availability messages to the slideshow.
