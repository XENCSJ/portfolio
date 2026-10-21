# YouTube pre-play UI

Shared assets: `xen-cinema.css` and `xen-cinema.js`.
They only style the contents of an existing `.video-container` or the icon in
an existing CREATOR `.xen-latest-play` button. Do not change outside dimensions,
spacing, titles, links, grids, or animation rules when reusing this component.

For a new video, copy the internal pattern in `storybooks.html`: preserve the
original official iframe and its URL/title/attributes in
`<template data-xen-youtube>`, followed by a native button with class
`xen-cinema-cover`, an accessible “TITLE を再生” label, and the existing thumbnail.
Include the two shared assets once. Keep an external source link and a
`noscript` iframe fallback. For dynamically inserted templates, call
`window.XENCinema.enhance()` after insertion; it is idempotent.

No live iframe is created until the button is activated. Its original video
ID and URL parameters are retained; autoplay=1, playsinline=1, controls=1 and
enablejsapi=1 are applied. No forced mute is added. The optional official API
observes errors and blocked autoplay; it never retries blocked playback or
overlays the official controls. Errors replace the failed iframe inside the
same slot with a retry button and a YouTube link. Existing source links remain
available if the API cannot load.

CREATOR's four cards keep their existing dialog playback. At the inspected
1363px desktop viewport they are about 238×134px. APPAREL's existing film slots
are about 237×133px. These are below YouTube's documented 200×200 minimum.
The 2026-10-21 change does not enlarge them or change any grid. CREATOR inline
playback is therefore unresolved under the strict no-layout-change requirement;
small existing inline slots also retain a documented size limitation. Resolve
that requirement conflict with the owner before changing presentation.

Reference: https://developers.google.com/youtube/player_parameters
Reference: https://developers.google.com/youtube/iframe_api_reference

Inventory: STORYBOOKS 3, ANIMATION 4, MUSIC (sound.html) 4, CINEMATIC 4,
APPAREL 3, CREATOR 4; total 22. The other nine canonical pages have no embedded
YouTube player. Ordinary YouTube links and Spotify embeds remain unchanged.
