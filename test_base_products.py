import copy
import io
import json
from pathlib import Path
import tempfile
import unittest
from urllib.error import HTTPError, URLError
from unittest.mock import Mock, patch

import update_base_products as sync


def product(product_id=123, **changes):
    item = {"id": product_id, "name": "XEN T-SHIRT", "price": 8800,
            "visible": True, "stock": 2, "sales_status": "item_now_on_sale",
            "created_at": "2026-10-20T10:00:00Z",
            "images": [{"url": "https://example.com/image.jpg", "scaled_url": "https://example.com/image.jpg?w=640"}],
            "identifier": "PRIVATE-SKU", "detail": "PRIVATE-DESCRIPTION",
            "_links": {"private": "DO-NOT-PUBLISH"}}
    item.update(changes)
    return item


class ProductsTest(unittest.TestCase):
    def test_newest_public_six_and_allowlisted_output(self):
        items = sync.normalize([product(n) for n in range(1, 7)])
        self.assertEqual([x["id"] for x in items], [6, 5, 4, 3, 2, 1])
        self.assertEqual(items[0]["url"], "https://xen.official.ec/items/6")
        self.assertEqual(items[0]["price"], 8800)
        self.assertNotIn("PRIVATE", json.dumps(items))
        self.assertNotIn("stock", items[0])
        self.assertEqual(len(items), 6)

    def test_empty_catalog_is_valid_and_clears_unpublished_products(self):
        self.assertEqual(sync.normalize([]), [])

    def test_sold_out_missing_price_and_image(self):
        item = sync.normalize([product(stock=0, price=None, images=[])])[0]
        self.assertFalse(item["available"])
        self.assertIsNone(item["price"])
        self.assertIsNone(item["image_url"])
        item = sync.normalize([product(sales_status="item_waiting_for_sale")])[0]
        self.assertFalse(item["available"])

    def test_invalid_payload_never_replaces_last_success(self):
        bad = [{}, {"items": []}, [product(visible=False)], [product(visible=1)],
               [product(price=-10)], [product(price=True)], [product(id=True)],
               [product(created_at="bad")], [product(created_at="2026-01-01")],
               [product(), product()], [product(images=[{"url": "javascript:alert(1)"}])],
               [product(n) for n in range(1, 8)]]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            sync.save_products(sync.normalize([product()]), path)
            original = path.read_bytes()
            for payload in bad:
                with self.subTest(payload=payload), self.assertRaises(sync.SyncError):
                    sync.save_products(sync.normalize(payload), path)
                self.assertEqual(path.read_bytes(), original)

    def test_unchanged_data_does_not_create_commits(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            items = sync.normalize([product()])
            self.assertTrue(sync.save_products(items, path))
            original = path.read_bytes()
            self.assertFalse(sync.save_products(items, path))
            self.assertEqual(path.read_bytes(), original)
            self.assertTrue(sync.save_products([], path))
            self.assertEqual(json.loads(path.read_text())["items"], [])

    def test_failed_atomic_replace_keeps_previous_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            sync.save_products(sync.normalize([product()]), path)
            original = path.read_bytes()
            with patch.object(Path, "replace", side_effect=OSError), self.assertRaises(OSError):
                sync.save_products([], path)
            self.assertEqual(path.read_bytes(), original)
            self.assertEqual(len(list(Path(tmp).iterdir())), 1)

    def test_token_only_sent_as_header_to_fixed_official_endpoint(self):
        opener = Mock()
        opener.open.return_value = io.BytesIO(b'[]')
        self.assertEqual(sync.fetch_products("TEST-ONLY-TOKEN", opener), [])
        request = opener.open.call_args.args[0]
        self.assertEqual(request.full_url, sync.API_URL)
        self.assertEqual(request.get_header("Authorization"), "Bearer TEST-ONLY-TOKEN")
        self.assertNotIn("TEST-ONLY-TOKEN", request.full_url)
        self.assertIn("visible=true", request.full_url)
        self.assertIsNone(sync.NoRedirect().redirect_request(None, None, 302, None, None, "https://example.com"))

    def test_missing_token_and_auth_errors_are_redacted(self):
        opener = Mock()
        with self.assertRaises(sync.SyncError):
            sync.fetch_products("", opener)
        opener.open.assert_not_called()
        for code in [401, 403, 302, 400]:
            opener = Mock()
            opener.open.side_effect = HTTPError("https://example.com/SECRET", code, "SECRET", {}, None)
            with self.assertRaises(sync.SyncError) as cm:
                sync.fetch_products("SECRET", opener)
            self.assertNotIn("SECRET", str(cm.exception))
            self.assertEqual(opener.open.call_count, 1)

    def test_transient_errors_retry_then_preserve(self):
        for failure in [HTTPError(sync.API_URL, 429, "SECRET", {}, None), URLError("SECRET")]:
            opener, sleep = Mock(), Mock()
            opener.open.side_effect = failure
            with self.assertRaises(sync.SyncError) as cm:
                sync.fetch_products("SECRET", opener, sleep)
            self.assertNotIn("SECRET", str(cm.exception))
            self.assertEqual(opener.open.call_count, 3)
            self.assertEqual(sleep.call_count, 2)

    def test_malformed_json_is_redacted(self):
        with self.assertRaises(sync.SyncError) as cm:
            sync.read_json(io.BytesIO(b'SECRET-invalid-json'))
        self.assertNotIn("SECRET", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
