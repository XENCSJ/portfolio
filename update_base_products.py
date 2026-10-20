"""Publish only the six newest public BASE products; never persist API responses."""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

API_URL = "https://apiv2.thebase.com/api/items?visible=true&order=created&sort=desc&limit=6&offset=0"
SHOP_URL = "https://xen.official.ec/"
PUBLIC_URL = "https://xencsj.github.io/portfolio/base-products.json"
OUTPUT = Path(__file__).resolve().with_name("base-products.json")
MAX_BYTES = 4_000_000


class SyncError(Exception):
    """Only fixed, non-sensitive messages may be used here."""


class NoRedirect(HTTPRedirectHandler):
    # In particular, never forward the Authorization header to another origin.
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def read_json(response):
    raw = response.read(MAX_BYTES + 1)
    if len(raw) > MAX_BYTES:
        raise SyncError("BASE response exceeded the size limit; previous data preserved.")
    try:
        return json.loads(raw)
    except (ValueError, UnicodeError):
        raise SyncError("Invalid JSON; previous data preserved.") from None


def fetch_products(token, opener=None, sleep=time.sleep):
    if not token or token != token.strip() or any(c.isspace() for c in token):
        raise SyncError("BASE_API_TOKEN is missing or invalid. Add the BASE v2 PAT to repository Actions secrets.")
    opener = opener or build_opener(NoRedirect())
    for attempt in range(3):
        try:
            request = Request(API_URL, headers={"Authorization": "Bearer " + token, "Accept": "application/json"})
            with opener.open(request, timeout=30) as response:
                return read_json(response)
        except HTTPError as error:
            code = error.code
            error.close()
            if code in (401, 403):
                raise SyncError("BASE authentication failed. Check the PAT expiry and items.read scope; previous data preserved.") from None
            if code != 429 and code < 500:
                raise SyncError("BASE rejected the request; previous data preserved.") from None
        except (URLError, TimeoutError, OSError):
            pass
        if attempt < 2:
            sleep(2 ** (attempt + 1))
    raise SyncError("BASE remained unavailable after three attempts; previous data preserved.")


def https_url(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = urlsplit(value)
        if (parsed.scheme == "https" and parsed.hostname and not parsed.username
                and not parsed.password and not any(c.isspace() for c in value)):
            return value
    except ValueError:
        pass
    return None


def normalize(payload):
    if not isinstance(payload, list) or len(payload) > 6:
        raise SyncError("Unexpected BASE response format; previous data preserved.")
    items, ids = [], set()
    for item in payload:
        if not isinstance(item, dict) or item.get("visible") is not True:
            raise SyncError("BASE returned an unexpected visibility value; previous data preserved.")
        product_id, name, price = item.get("id"), item.get("name"), item.get("price")
        created, stock, status = item.get("created_at"), item.get("stock"), item.get("sales_status")
        if (type(product_id) is not int or product_id < 1 or product_id in ids
                or not isinstance(name, str) or not name.strip() or len(name) > 1000
                or (price is not None and (type(price) is not int or price < 0))
                or type(stock) is not int or stock < 0
                or status not in {"item_now_on_sale", "item_waiting_for_sale", "item_end_of_sale"}):
            raise SyncError("Invalid product fields; previous data preserved.")
        try:
            date = datetime.fromisoformat(created.replace("Z", "+00:00"))
            if date.tzinfo is None:
                raise ValueError
        except (ValueError, TypeError, AttributeError):
            raise SyncError("Invalid creation date; previous data preserved.") from None
        images = item.get("images")
        if not isinstance(images, list):
            raise SyncError("Invalid product images; previous data preserved.")
        image_url = None
        if images:
            first = images[0]
            if not isinstance(first, dict):
                raise SyncError("Invalid product image; previous data preserved.")
            image_url = https_url(first.get("scaled_url")) or https_url(first.get("url"))
            if not image_url:
                raise SyncError("Invalid product image URL; previous data preserved.")
        ids.add(product_id)
        # Explicit allowlist: no descriptions, stock counts, identifiers, or API links.
        items.append({"id": product_id, "name": name.strip(), "price": price,
                      "url": f"{SHOP_URL}items/{product_id}", "image_url": image_url,
                      "created_at": date.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                      "available": stock > 0 and status == "item_now_on_sale",
                      "sales_status": status})
    items.sort(key=lambda x: (datetime.fromisoformat(x["created_at"].replace("Z", "+00:00")), x["id"]), reverse=True)
    return items


def save_products(items, path=OUTPUT):
    previous = json.loads(path.read_text()) if path.exists() else {}
    if previous.get("items") == items and previous.get("updated_at"):
        return False
    data = {"schema_version": 1, "source": "BASE API v2", "shop_url": SHOP_URL,
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "items": items}
    temp_path = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as out:
            temp_path = Path(out.name)
            json.dump(data, out, ensure_ascii=False, indent=2)
            out.write("\n")
        temp_path.replace(path)
    finally:
        if temp_path and temp_path.exists():
            temp_path.unlink()
    return True


def verify_public():
    expected = json.loads(OUTPUT.read_text())
    for attempt in range(18):
        try:
            req = Request(PUBLIC_URL + "?check=" + str(time.time_ns()), headers={"Cache-Control": "no-cache"})
            with build_opener(NoRedirect()).open(req, timeout=20) as response:
                if read_json(response) == expected:
                    print("Public product JSON matches the committed data.")
                    return
        except (HTTPError, URLError, TimeoutError, OSError, SyncError):
            pass
        if attempt < 17:
            time.sleep(10)
    raise SyncError("The expected product JSON is not yet visible on GitHub Pages.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--verify-public", action="store_true")
    args = parser.parse_args()
    try:
        if args.verify_public:
            verify_public()
            return
        items = normalize(fetch_products(os.environ.get("BASE_API_TOKEN", "")))
        changed = save_products(items)
        message = f"BASE v2: verified {len(items)} public products; data {'updated' if changed else 'unchanged'}."
        print(message)
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
                summary.write(message + "\n")
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as output:
                output.write(f"changed={str(changed).lower()}\n")
    except SyncError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        # Do not emit arbitrary exceptions/response bodies that could contain credentials.
        print("Product synchronization failed; no unvalidated data was published.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
