# APPAREL / BASE API v2

The APPAREL catalog uses the official BASE v2 API and a Personal Access Token (PAT).
The legacy `BASE_CLIENT_ID` / `BASE_CLIENT_SECRET` secrets and OAuth callback are not modified or used.

## Configuration

- Repository Actions secret: `BASE_API_TOKEN`.
- Value: a BASE v2 PAT for the XEN shop, with `items.read` scope. Enter the value directly into GitHub, never into chat or a committed file.
- Existing secrets must not be overwritten without owner authorization. Renew an expired PAT through BASE and update its GitHub secret when necessary; this workflow does not renew credentials.
- Workflow: **Refresh BASE products**; manual dispatch or four times daily at 00:00, 06:00, 12:00 and 18:00 JST (`0 3,9,15,21 * * *` in UTC). These are scheduled times; GitHub can delay or drop scheduled runs during heavy load. A manual run is available for recovery.
- Current Pages configuration is branch-based. The workflow explicitly requests a Pages build after a successful sync, then compares the published JSON with the checked-out data. A bot push alone is insufficient to publish.

## Data and display

`GET https://apiv2.thebase.com/api/items?visible=true&order=created&sort=desc&limit=100&offset=0`

Fetch all public-product pages using `offset += 100` until a page has fewer than 100 entries. The response is an array. Validate public records and select exactly these IDs, in this order:

1. 163232279
2. 162561554
3. 160058456
4. 159175661
5. 157787639
6. 157783299
7. 156849283 (くろうさぎ; added at owner request on 2026-10-23 JST)

Newer products never replace this selection. Changing the selected IDs requires owner approval. Missing/hidden selected products, missing prices/images, malformed responses and API failures abort the update and preserve the complete previous JSON. Sold-out selected products stay in position and receive a status label. A successful empty response does not clear the catalog.

The initial six records were checked against the official BASE product pages on 2026-10-21 JST, with `source: BASE official product pages`; unknown creation dates remain null. A successful authenticated refresh replaces them with verified API data and sets `source: BASE API v2`. The first HTTP-200 refresh must be verified separately; bootstrap data is not evidence of API success.

`base-products.json` contains only public display fields. The browser never receives credentials. The frontend checks all seven IDs and their order before rendering and uses safe text insertion. Both desktop and mobile use three columns and three rows, square product images, and two-line clamped product names. The former LOGO T-SHIRT / LOGO HOODIE / BUCKET HAT cards and duplicate store CTA were removed. The brand visual, APPAREL FILMS, media, header, footer and animation assets are unchanged. The single store link sits below the catalog.

## Failure handling and verification

- Missing/expired PAT or missing scope: fail with a fixed redacted message; do not change product data.
- 429, server/network failures: three attempts with bounded waits.
- Malformed/oversized response, invalid visibility values, invalid IDs/prices/dates/images: reject the response before atomically replacing the public JSON.
- Redirects from the API are refused so Authorization is never forwarded elsewhere.
- API failures never modify the existing file or start publication. Last successful products remain visible.
- Concurrent main changes: rebase; conflicts fail the run. Never force-push or overwrite other files.
- History: Actions run result/summary plus Git history for actual product changes. No token values or raw API errors are logged.

Run `python -m unittest -v test_base_products.py` and `node --check xen-base-products.js`. Browser fixture checks are `node verify-base-products.cjs` with a local server on port 8765 and Playwright installed. Test fixtures are intercepted only inside the browser checks and are never written to public product JSON.

After adding the PAT, dispatch **Refresh BASE products**, confirm its refresh job succeeds, and verify real product cards, images, prices, links and `base-products.json` on the public site. Until then, live API acquisition and real selected-product rendering are unverified.

Official reference: https://apiv2.thebase.com/docs/endpoints/get-api-items/

## PAT renewal and failure notifications

Use the requested 90-day renewal policy: reissue the PAT before 90 days, and before the expiry shown in BASE Developers if that date is earlier. The current API documentation states that each PAT has its own expiry; the value shown in BASE Developers is authoritative. This integration cannot read a stored GitHub secret or determine its issue date. It does not automatically issue or renew PATs.

1. In BASE Developers, issue a replacement PAT for the XEN shop with `items.read`.
2. Open repository Settings → Secrets and variables → Actions → `BASE_API_TOKEN` → Edit. Paste the replacement directly in GitHub and save. Never put it in chat, screenshots, files or workflow logs.
3. Open Actions → **Refresh BASE products** → Run workflow → main. Confirm both jobs succeed, the summary reports HTTP 200 and total/displayed counts, and the published JSON verification succeeds.
4. Check APPAREL product images, names, prices and BASE links. Only then consider the renewal verified.

HTTP 401 produces a redacted Actions error annotation, a failed run and a failure summary, without replacing the last successful JSON. Other API/schema errors also fail the run. To receive GitHub's native notifications, enable Web and/or Email for Actions in your personal notification settings; selecting “Only notify for failed workflows” avoids success notifications. Notification delivery depends on that account setting and is not verified merely by committing this workflow. The account that edits the schedule receives its scheduled-workflow notifications when enabled.

References:
- API authentication/expiry: https://apiv2.thebase.com/docs/
- Scheduled-run timing: https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
- Notification setup: https://docs.github.com/en/subscriptions-and-notifications/how-tos/managing-github-actions-notifications

## KURO USAGI addition (2026-10-23 JST)

The seventh product uses the supplied official URL, verified name, ¥13,000 price and official product image. Its creation date remains null until the authenticated refresh supplies it. Existing six records are retained; the mixed source label describes this bootstrap accurately. DESIGN adds the same animated APPAREL COLLECTION disclosure as the other characters, with links in both directions.
