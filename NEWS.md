# NEWS management

INDEX is generated from `news-events.json`. Show the newest four date/category groups, then `news-pinned.json`. The fixed article is exactly the approved 2026-10-20 announcement; the generator never writes its file and validation rejects accidental changes. Historical NEWS remains in `news-events.json`, `news-archive.json`, and the untouched migration copy `news-legacy.json`.

## Publication and automation

`Update verified NEWS` runs after a successful `pages-build-deployment` on main. It reads GitHub deployment success statuses, examines the exact deployed Git tree, and uses the successful publication timestamp in JST. Commit timestamps and file modification times are never publication dates. Failed deployments and unpublished branches are excluded.

SNAP and ARTWORKS: add image files and gallery links normally. Pure additions are detected automatically. An uploaded but unlinked image does not count. Stable paths and Git blob identities prevent reorders, re-adding known assets and identical copies from creating new NEWS. Changes to existing image paths do not count. Additions accompanied by removals are held in `news-state.json` → `pending`; confirm new works via the managed registration below. The initial state conservatively recognizes all existing image paths and hashes, so previously uploaded but never displayed old files also require registration.

The workflow groups same-day/category additions, preserves earlier content identities, regenerates only the marked NEWS block in INDEX, commits only NEWS files, and explicitly requests a Pages build. A NEWS-only deployment has no content delta and stops without another commit. Conflicts with concurrent main changes fail safely; rerun the workflow after resolving them. No force push is used.

## Managed registration for other categories

DESIGN, APPAREL, ARCHITECTURE, SPACE, SOUND, CINEMATIC, ANIMATION, STORYBOOKS and YOUTUBE have differing work structures, so do not guess from image or iframe changes. Add a record to `news-content.json` in the same commit as a genuinely new work:

```json
[
  {
    "id": "cinematic-example-stable-id",
    "status": "published",
    "category": "CINEMATIC",
    "page": "cinematic.html",
    "marker": "UNIQUE_VIDEO_ID_IN_THE_PAGE",
    "contentIds": ["youtube:UNIQUE_VIDEO_ID_IN_THE_PAGE"],
    "countKnown": true,
    "releaseDate": "2026-10-10",
    "releaseEvidence": "OFFICIAL_RELEASE_PAGE_URL"
  }
]
```

Use a permanent work ID, not a timestamp. `marker` must identify that work in the deployed HTML (a unique video ID, image URL or HTML id). Multiple images of one work share one content ID; different works need different IDs. For a new version or replacement of the same work, retain its ID and do not add an announcement. For a photo batch, list the unique photo IDs. Optional `anchor` begins with `#`; optional `title` supplies a concise announcement. Use `countKnown:false` when the work count cannot be confirmed. SNAP/ARTWORKS/DESIGN and other site additions receive the successful deployment date. SOUND/CINEMATIC/ANIMATION/YOUTUBE require an editor-verified `releaseDate` (YYYY-MM-DD, JST) and `releaseEvidence`; the generator refuses to substitute the site-addition date. For any category, a supplied verified original release date takes priority. The work must still exist in a successful deployment before registration. Dates later than site publication are rejected. Never enter guessed dates. Preserve completed registrations to avoid reuse of IDs.

Independent important announcements require an editor-verified event in `news-events.json`, with a permanent ID, evidence and a verified date. Do not edit the fixed article. Run `python news.py` after intentional event edits.

## Requested YouTube article replacement (2026-10-20 JST)

The homepage slot previously occupied by `legacy-2` now displays `legacy-4`, using `replacesEventId: "legacy-2"` on the replacement event. Its actual YouTube publication date was confirmed in the expanded video description as **2026-09-03**, and its link is `https://youtu.be/Df4ekWvuGng`. This explicit substitution preserves the other three visible articles and the fifth renewal article even though the replacement's release date is older than another archived video. It is not a second pinned article: future NEWS still displaces the oldest selected slot normally. The original notice remains only in the historical registry/archive. The generator applies the substitution on every run and deduplicates the already registered replacement video. Dates and other historical notices are unchanged.

## Verification and recovery

- `python -m unittest -v test_news.py`
- `python news.py --check`
- `node --check xen-news.js`
- `Update verified NEWS` → Run workflow reconciles successful deployments after an interrupted run. It uses the same evidence and deduplication rules.

Generated HTML works without JavaScript; `xen-news.js` only adds a scroll reveal. CSS is scoped to NEWS, has visible keyboard focus, touch-sized links and reduced-motion support. No third-party NEWS API or browser-side credentials are used.

## Initial audit (2026-10-20 JST)

| Date | Category | Verified addition |
| --- | --- | --- |
| 2026-10-19 | ARTWORKS | 7 new gallery works |
| 2026-10-16 | SNAP | 11 + 2 + 141 = 154 photos, grouped into one item |
| 2025-07-16 / 2025-11-04 / 2025-11-05 | CINEMATIC | 4 videos, original YouTube release dates; outside latest four |
| 2026-10-10 | YOUTUBE | Verified Puroland publication notice |
| 2026-09-24 | YOUTUBE | Verified Study With Me publication notice |
| 2026-10-20 | WEBSITE | Fixed renewal notice |

`news-audit.json` and event evidence contain the reviewed commit IDs and observed successful deployment timestamps. SOUND Spotify album additions reuse already listed works; recent copy, layout, rearrangement and removal changes on other pages were excluded. Older release notices retain their previously verified original release dates. No unverifiable historical dates were invented.

The fixed title is exactly `ホームページリニューアル`. A normal record may not use the fixed ID or pinned state. The 2026-10-20 audit corrected the earlier CINEMATIC site-addition dates using official YouTube metadata; `news-release-audit.json` retains all 19 checked release timestamps.
