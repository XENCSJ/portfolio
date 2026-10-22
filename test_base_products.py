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


def selected_products(**changes):
    return sync.normalize([product(n, **changes) for n in sync.PINNED_IDS])


class ProductsTest(unittest.TestCase):
    def test_public_records_are_normalized_with_allowlisted_output(self):
        items = sync.normalize([product(n) for n in range(1, 7)])
        self.assertEqual([x["id"] for x in items], [6, 5, 4, 3, 2, 1])
        self.assertEqual(items[0]["url"], "https://xen.official.ec/items/6")
        self.assertEqual(items[0]["price"], 8800)
        self.assertNotIn("PRIVATE", json.dumps(items))
        self.assertNotIn("stock", items[0])
        self.assertEqual(len(items), 6)

    def test_all_pages_sorted_before_selected_are_saved(self):
        opener = Mock()
        # The newest product is deliberately on the second page.
        older = [product(n, created_at="2026-01-01T00:00:00Z") for n in range(1, 101)]
        newer = [product(101), product(102, visible=False), product(1)] + [product(n) for n in sync.PINNED_IDS]
        opener.open.side_effect = [io.BytesIO(json.dumps(page).encode()) for page in [older, newer]]
        items = sync.normalize(sync.fetch_products("TEST-ONLY-TOKEN", opener))
        self.assertEqual(len(items), 101 + len(sync.PINNED_IDS))
        self.assertEqual(items[0]["id"], sync.PINNED_IDS[0])
        urls = [call.args[0].full_url for call in opener.open.call_args_list]
        self.assertTrue(urls[0].endswith("offset=0"))
        self.assertTrue(urls[1].endswith("offset=100"))
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            sync.save_products(items, path)
            data = json.loads(path.read_text())
            self.assertEqual(data["public_count"], 101 + len(sync.PINNED_IDS))
            self.assertEqual([item["id"] for item in data["items"]], list(sync.PINNED_IDS))

    def test_exact_page_requires_empty_final_page(self):
        opener = Mock()
        full = [product(n) for n in range(1, 101)]
        opener.open.side_effect = [io.BytesIO(json.dumps(full).encode()), io.BytesIO(b"[]")]
        self.assertEqual(len(sync.fetch_products("TEST-ONLY-TOKEN", opener)), 100)
        self.assertEqual(opener.open.call_count, 2)

    def test_second_page_failure_preserves_existing_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            sync.save_products(selected_products(), path)
            original = path.read_bytes()
            opener = Mock()
            full = [product(n) for n in range(1, 101)]
            opener.open.side_effect = [io.BytesIO(json.dumps(full).encode()),
                                      HTTPError(sync.API_URL, 401, "SECRET", {}, None)]
            with self.assertRaises(sync.SyncError):
                sync.save_products(sync.normalize(sync.fetch_products("TEST-ONLY-TOKEN", opener)), path)
            self.assertEqual(path.read_bytes(), original)

    def test_duplicate_and_hidden_items_are_excluded(self):
        items = sync.normalize([product(1), product(1), product(2, visible=False), product(3)])
        self.assertEqual([item["id"] for item in items], [3, 1])

    def test_missing_price_and_repeating_page_are_rejected(self):
        item = product()
        del item["price"]
        with self.assertRaises(sync.SyncError):
            sync.normalize([item])
        full = [product(n) for n in range(1, 101)]
        opener = Mock()
        opener.open.side_effect = [io.BytesIO(json.dumps(full).encode()), io.BytesIO(json.dumps(full).encode())]
        with self.assertRaises(sync.SyncError):
            sync.fetch_products("TEST-ONLY-TOKEN", opener)

    def test_empty_api_response_normalizes_without_writing(self):
        self.assertEqual(sync.normalize([]), [])

    def test_sold_out_missing_price_and_image(self):
        item = sync.normalize([product(stock=0, price=None, images=[])])[0]
        self.assertFalse(item["available"])
        self.assertIsNone(item["price"])
        self.assertIsNone(item["image_url"])
        item = sync.normalize([product(sales_status="item_waiting_for_sale")])[0]
        self.assertFalse(item["available"])

    def test_invalid_payload_never_replaces_last_success(self):
        bad = [{}, {"items": []}, [product(visible=1)],
               [product(price=-10)], [product(price=True)], [product(id=True)],
               [product(created_at="bad")], [product(created_at="2026-01-01")],
               [product(images=[{"url": "javascript:alert(1)"}])]]
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            sync.save_products(selected_products(), path)
            original = path.read_bytes()
            for payload in bad:
                with self.subTest(payload=payload), self.assertRaises(sync.SyncError):
                    sync.save_products(sync.normalize(payload), path)
                self.assertEqual(path.read_bytes(), original)

    def test_unchanged_data_does_not_create_commits(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            items = selected_products()
            self.assertTrue(sync.save_products(items, path))
            original = path.read_bytes()
            self.assertFalse(sync.save_products(items, path))
            self.assertEqual(path.read_bytes(), original)
            with self.assertRaises(sync.SyncError):
                sync.save_products([], path)
            self.assertEqual(path.read_bytes(), original)

    def test_failed_atomic_replace_keeps_previous_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"base-products.json"
            sync.save_products(selected_products(), path)
            original = path.read_bytes()
            with patch.object(Path, "replace", side_effect=OSError), self.assertRaises(OSError):
                sync.save_products(selected_products(price=9999), path)
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

    def test_fixed_selection_ignores_newer_products_and_api_order(self):
        items = selected_products() + sync.normalize([product(999999999)])
        self.assertEqual([x['id'] for x in sync.select_products(items[::-1])], list(sync.PINNED_IDS))

    def test_incomplete_selected_data_preserves_all_selected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/'base-products.json'
            sync.save_products(selected_products(), path)
            original = path.read_bytes()
            for items in [selected_products()[:-1], [], selected_products(price=None), selected_products(images=[])]:
                with self.assertRaises(sync.SyncError):
                    sync.save_products(items, path)
                self.assertEqual(path.read_bytes(), original)

    def test_secret_surrounding_whitespace_is_trimmed(self):
        opener = Mock()
        opener.open.return_value = io.BytesIO(b'[]')
        sync.fetch_products('  TEST-ONLY-TOKEN\n', opener)
        self.assertEqual(opener.open.call_args.args[0].get_header('Authorization'), 'Bearer TEST-ONLY-TOKEN')

    def test_malformed_json_is_redacted(self):
        with self.assertRaises(sync.SyncError) as cm:
            sync.read_json(io.BytesIO(b'SECRET-invalid-json'))
        self.assertNotIn("SECRET", str(cm.exception))


if __name__ == "__main__":
    unittest.main()
