# APPAREL / BASE API v2

The APPAREL catalog uses the official BASE v2 API and a Personal Access Token (PAT).
The legacy `BASE_CLIENT_ID` / `BASE_CLIENT_SECRET` secrets and OAuth callback are not modified or used.

## Configuration

- Repository Actions secret: `BASE_API_TOKEN`.
- Value: a BASE v2 PAT for the XEN shop, with `items.read` scope. Enter the value directly into GitHub, never into chat or a committed file.
- Existing secrets must not be overwritten without owner authorization. Renew an expired PAT through BASE and update its GitHub secret when necessary; this workflow does not renew credentials.
- Workflow: **Refresh BASE products**; manual dispatch or hourly at minute 23 (UTC, every hour also in JST). GitHub schedules can be delayed.
- Current Pages configuration is branch-based. The workflow explicitly requests a Pages build after a successful sync, then compares the published JSON with the checked-out data. A bot push alone is insufficient to publish.

## Data and display

`GET https://apiv2.thebase.com/api/items?visible=true&order=created&sort=desc&limit=6&offset=0`

Public products only, newest creation date first, maximum six. Sold-out public products remain visible with a label. Fewer than six products are shown without fabricated cards. A valid empty API list removes all catalog cards. A null price links to the store without inventing a price; a missing/broken image uses a plain XEN placeholder.

`base-products.json` contains only the display allowlist: ID, name, tax-inclusive price in yen, public shop link, first image, creation date, availability flag and sales status. No raw API response, product descriptions, internal identifiers, stock counts, customer or order data is written. `updated_at` records the last content update; unchanged successful checks are recorded in the Actions summary without creating another commit.

The initial JSON intentionally has no products and no successful-update timestamp. It is replaced only after an authenticated API fetch succeeds. Its presence does not mean integration is verified.

The page reads the public JSON with no credentials, uses safe DOM text insertion, and links only to `https://xen.official.ec/items/{id}`. Desktop: three columns; mobile up to 650px: two columns. Existing gallery, films, media, header, footer and animation assets are preserved.

## Failure handling and verification

- Missing/expired PAT or missing scope: fail with a fixed redacted message; do not change product data.
- 429, server/network failures: three attempts with bounded waits.
- Malformed/oversized response, hidden items, invalid IDs/prices/dates/images: reject the response before atomically replacing the public JSON.
- Redirects from the API are refused so Authorization is never forwarded elsewhere.
- API failures never modify the existing file or start publication. Last successful products remain visible.
- Concurrent main changes: rebase; conflicts fail the run. Never force-push or overwrite other files.
- History: Actions run result/summary plus Git history for actual product changes. No token values or raw API errors are logged.

Run `python -m unittest -v test_base_products.py` and `node --check xen-base-products.js`. Browser fixture checks are `node verify-base-products.cjs` with a local server on port 8765 and Playwright installed. Test fixtures are intercepted only inside the browser checks and are never written to public product JSON.

After adding the PAT, dispatch **Refresh BASE products**, confirm its refresh job succeeds, and verify real product cards, images, prices, links and `base-products.json` on the public site. Until then, live API acquisition and real six-product rendering are unverified.

Official reference: https://apiv2.thebase.com/docs/endpoints/get-api-items/
