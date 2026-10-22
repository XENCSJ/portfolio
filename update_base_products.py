"""Refresh the explicitly selected BASE products without changing their order."""
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

PAGE_SIZE = 100
PINNED_IDS = (163232279, 162561554, 160058456, 159175661, 157787639, 157783299, 156849283)
API_URL = "https://apiv2.thebase.com/api/items?visible=true&order=created&sort=desc&limit=100&offset=0"
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


def fetch_page(token, url, opener, sleep):
    for attempt in range(3):
        try:
            request = Request(url, headers={"Authorization": "Bearer " + token, "Accept": "application/json"})
            with opener.open(request, timeout=30) as response:
                payload = read_json(response)
                if not isinstance(payload, list) or len(payload) > PAGE_SIZE:
                    raise SyncError("Unexpected BASE response format; previous data preserved.")
                return payload
        except HTTPError as error:
            code = error.code
            error.close()
            if code == 401:
                raise SyncError("HTTP 401: BASE PAT expired or invalid. Replace BASE_API_TOKEN; previous data preserved.") from None
            if code == 403:
                raise SyncError("HTTP 403: check the BASE PAT items.read scope; previous data preserved.") from None
            if code != 429 and code < 500:
                raise SyncError(f"BASE HTTP {code}: request rejected; previous data preserved.") from None
        except (URLError, TimeoutError, OSError):
            pass
        if attempt < 2:
            sleep(2 ** (attempt + 1))
    raise SyncError("BASE unavailable (HTTP 429/5xx or network error) after three attempts; previous data preserved.")


def fetch_products(token, opener=None, sleep=time.sleep):
    token = token.strip()
    if not token or any(c.isspace() for c in token):
        raise SyncError("BASE_API_TOKEN is missing or invalid. Add the BASE v2 PAT to repository Actions secrets.")
    opener = opener or build_opener(NoRedirect())
    products, seen_pages = [], set()
    for offset in range(0, 1_000_001, PAGE_SIZE):
        url = API_URL.rsplit("=", 1)[0] + "=" + str(offset)
        page = fetch_page(token, url, opener, sleep)
        # Guard against a server ignoring offset; never publish a truncated catalog.
        signature = json.dumps(page, sort_keys=True, ensure_ascii=True)
        if page and signature in seen_pages:
            raise SyncError("BASE pagination repeated a page; previous data preserved.")
        seen_pages.add(signature)
        products.extend(page)
        if len(page) < PAGE_SIZE:
            return products
    raise SyncError("BASE pagination exceeded its supported range; previous data preserved.")


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
    if not isinstance(payload, list):
        raise SyncError("Unexpected BASE response format; previous data preserved.")
    items, ids = [], set()
    for item in payload:
        if not isinstance(item, dict) or type(item.get("visible")) is not bool:
            raise SyncError("BASE returned an unexpected visibility value; previous data preserved.")
        if not item["visible"]:
            continue
        product_id, name, price = item.get("id"), item.get("name"), item.get("price")
        created, stock, status = item.get("created_at"), item.get("stock"), item.get("sales_status")
        if (type(product_id) is not int or product_id < 1
                or not isinstance(name, str) or not name.strip() or len(name) > 1000
                or "price" not in item
                or (price is not None and (type(price) is not int or price < 0))
                or type(stock) is not int or stock < 0
                or status not in {"item_now_on_sale", "item_waiting_for_sale", "item_end_of_sale"}):
            raise SyncError("Invalid product fields; previous data preserved.")
        if product_id in ids:
            continue
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


def select_products(items):
    by_id = {item["id"]: item for item in items}
    if any(product_id not in by_id for product_id in PINNED_IDS):
        raise SyncError("One or more selected BASE products are unavailable; previous data preserved.")
    selected = [by_id[product_id] for product_id in PINNED_IDS]
    if any(item["price"] is None or not item["image_url"] for item in selected):
        raise SyncError("A selected BASE product has no verified price or image; previous data preserved.")
    return selected


def save_products(items, path=OUTPUT, public_count=None):
    public_count = len(items) if public_count is None else public_count
    items = select_products(items)
    previous = json.loads(path.read_text()) if path.exists() else {}
    if (previous.get("items") == items and previous.get("updated_at")
            and previous.get("public_count") == public_count
            and previous.get("source") == "BASE API v2"
            and previous.get("selection") == "fixed"):
        return False
    data = {"schema_version": 1, "selection": "fixed", "source": "BASE API v2", "shop_url": SHOP_URL,
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "public_count": public_count, "items": items}
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
        changed = save_products(items, public_count=len(items))
        message = (f"BASE v2 HTTP 200: verified {len(items)} unique public products across all pages; "
                   f"displaying the 6 selected products in fixed order; data {'updated' if changed else 'unchanged'}.")
        print(message)
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
                summary.write(message + "\n")
        if os.environ.get("GITHUB_OUTPUT"):
            with open(os.environ["GITHUB_OUTPUT"], "a") as output:
                output.write(f"changed={str(changed).lower()}\n")
    except SyncError as error:
        print(str(error), file=sys.stderr)
        if os.environ.get("GITHUB_ACTIONS") == "true":
            print("::error title=BASE product sync failed::" + str(error))
        if os.environ.get("GITHUB_STEP_SUMMARY"):
            with open(os.environ["GITHUB_STEP_SUMMARY"], "a") as summary:
                summary.write("BASE sync failed: " + str(error) + "\n")
        sys.exit(1)
    except Exception:
        # Do not emit arbitrary exceptions/response bodies that could contain credentials.
        print("Product synchronization failed; no unvalidated data was published.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
