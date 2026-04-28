"""Pedilo iteration 2 tests: Orders, Business Hours, Image Upload, Product Images."""
import io
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://rotis-pedilo.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@pedilo.com"
ADMIN_PASSWORD = "pedilo123"


# -------- Fixtures --------
@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(session):
    r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Login failed: {r.status_code} {r.text}")
    return r.json().get("token")


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


@pytest.fixture
def sample_item(session):
    prods = session.get(f"{API}/public/products").json()
    assert prods, "need seeded products"
    p = prods[0]
    return {
        "type": "product",
        "ref_id": p["id"],
        "name": p["name"],
        "base_price": p["price"],
        "image": p.get("image", ""),
        "quantity": 2,
        "selected_options": [],
        "line_total": p["price"] * 2,
    }


# -------- Orders (public create) --------
class TestOrdersPublic:
    def test_create_order_success(self, session, sample_item):
        payload = {
            "items": [sample_item],
            "total": sample_item["line_total"],
            "address": "Av. Siempreviva 742",
            "notes": "TEST_order",
            "payment_method": "efectivo",
            "customer_name": "TEST_User",
        }
        r = session.post(f"{API}/public/orders", json=payload)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["status"] == "pending"
        assert order["address"] == payload["address"]
        assert order["total"] == payload["total"]
        assert "id" in order
        assert "_id" not in order
        assert len(order["items"]) == 1

    def test_create_order_empty_items(self, session):
        r = session.post(f"{API}/public/orders", json={
            "items": [], "total": 0, "address": "x",
        })
        assert r.status_code == 400

    def test_create_order_empty_address(self, session, sample_item):
        r = session.post(f"{API}/public/orders", json={
            "items": [sample_item], "total": 100, "address": "   ",
        })
        assert r.status_code == 400


# -------- Orders (admin) --------
class TestOrdersAdmin:
    def test_admin_requires_auth(self, session):
        assert requests.get(f"{API}/admin/orders").status_code == 401
        assert requests.get(f"{API}/admin/orders/stats").status_code == 401

    def test_list_filter_update_delete(self, session, auth_headers, sample_item):
        # create an order
        payload = {
            "items": [sample_item],
            "total": sample_item["line_total"],
            "address": "TEST_addr",
        }
        r = session.post(f"{API}/public/orders", json=payload)
        assert r.status_code == 200
        order_id = r.json()["id"]

        # list all
        r = session.get(f"{API}/admin/orders", headers=auth_headers)
        assert r.status_code == 200
        assert any(o["id"] == order_id for o in r.json())

        # filter pending
        r = session.get(f"{API}/admin/orders?status=pending", headers=auth_headers)
        assert r.status_code == 200
        assert all(o["status"] == "pending" for o in r.json())
        assert any(o["id"] == order_id for o in r.json())

        # confirm
        r = session.put(f"{API}/admin/orders/{order_id}", json={"status": "confirmed"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["status"] == "confirmed"

        # filter pending should now exclude
        r = session.get(f"{API}/admin/orders?status=pending", headers=auth_headers)
        assert all(o["id"] != order_id for o in r.json())

        # invalid status rejected
        r = session.put(f"{API}/admin/orders/{order_id}", json={"status": "invalid"}, headers=auth_headers)
        assert r.status_code == 400

        # transition to delivered
        r = session.put(f"{API}/admin/orders/{order_id}", json={"status": "delivered"}, headers=auth_headers)
        assert r.status_code == 200

        # delete
        r = session.delete(f"{API}/admin/orders/{order_id}", headers=auth_headers)
        assert r.status_code == 200
        # verify 404 after delete
        r = session.put(f"{API}/admin/orders/{order_id}", json={"status": "pending"}, headers=auth_headers)
        assert r.status_code == 404

    def test_stats(self, session, auth_headers, sample_item):
        # create one to move the needle
        r = session.post(f"{API}/public/orders", json={
            "items": [sample_item], "total": sample_item["line_total"], "address": "TEST_stats_addr",
        })
        oid = r.json()["id"]
        try:
            r = session.get(f"{API}/admin/orders/stats", headers=auth_headers)
            assert r.status_code == 200
            stats = r.json()
            for k in ("today_count", "today_total", "pending"):
                assert k in stats
            assert stats["today_count"] >= 1
            assert stats["today_total"] >= sample_item["line_total"]
            assert stats["pending"] >= 1
        finally:
            session.delete(f"{API}/admin/orders/{oid}", headers=auth_headers)


# -------- Business Hours --------
class TestBusinessHours:
    @pytest.fixture
    def saved_config(self, session, auth_headers):
        """Snapshot and restore the business config around each test."""
        before = session.get(f"{API}/public/config").json()
        before.pop("is_open", None)
        yield before
        session.put(f"{API}/admin/config", json=before, headers=auth_headers)

    def test_public_config_has_fields(self, session):
        cfg = session.get(f"{API}/public/config").json()
        assert "is_open" in cfg
        assert isinstance(cfg["is_open"], bool)
        assert "schedule" in cfg
        assert set(cfg["schedule"].keys()) >= {"mon", "tue", "wed", "thu", "fri", "sat", "sun"}
        for day, v in cfg["schedule"].items():
            assert "open" in v and "close" in v and "closed" in v
        assert "open_override" in cfg
        assert cfg["open_override"] in ("auto", "open", "closed")

    def test_override_open(self, session, auth_headers, saved_config):
        new = dict(saved_config)
        new["open_override"] = "open"
        r = session.put(f"{API}/admin/config", json=new, headers=auth_headers)
        assert r.status_code == 200
        cfg = session.get(f"{API}/public/config").json()
        assert cfg["open_override"] == "open"
        assert cfg["is_open"] is True

    def test_override_closed(self, session, auth_headers, saved_config):
        new = dict(saved_config)
        new["open_override"] = "closed"
        r = session.put(f"{API}/admin/config", json=new, headers=auth_headers)
        assert r.status_code == 200
        cfg = session.get(f"{API}/public/config").json()
        assert cfg["open_override"] == "closed"
        assert cfg["is_open"] is False

    def test_auto_today_closed(self, session, auth_headers, saved_config):
        """Set today's schedule closed=true and verify is_open=false in auto mode."""
        from datetime import datetime
        from zoneinfo import ZoneInfo
        tz = ZoneInfo(saved_config.get("timezone") or "America/Argentina/Buenos_Aires")
        day_keys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        today = day_keys[datetime.now(tz).weekday()]

        new = dict(saved_config)
        new["open_override"] = "auto"
        new["schedule"] = {**saved_config["schedule"]}
        new["schedule"][today] = {**new["schedule"][today], "closed": "true"}
        r = session.put(f"{API}/admin/config", json=new, headers=auth_headers)
        assert r.status_code == 200
        cfg = session.get(f"{API}/public/config").json()
        assert cfg["open_override"] == "auto"
        assert cfg["is_open"] is False


# -------- Product with images list --------
class TestProductImages:
    def test_create_update_product_with_images(self, session, auth_headers):
        # need a category
        r = session.post(f"{API}/admin/categories",
                         json={"name": f"TEST_ImgCat_{uuid.uuid4().hex[:6]}", "order": 77},
                         headers=auth_headers)
        cat_id = r.json()["id"]
        try:
            imgs = ["https://example.com/a.jpg", "https://example.com/b.jpg"]
            r = session.post(f"{API}/admin/products", json={
                "name": f"TEST_ImgProd_{uuid.uuid4().hex[:6]}",
                "price": 1000,
                "category_id": cat_id,
                "image": imgs[0],
                "images": imgs,
            }, headers=auth_headers)
            assert r.status_code == 200, r.text
            prod = r.json()
            assert prod["images"] == imgs
            pid = prod["id"]

            new_imgs = imgs + ["https://example.com/c.jpg"]
            r = session.put(f"{API}/admin/products/{pid}", json={"images": new_imgs}, headers=auth_headers)
            assert r.status_code == 200
            assert r.json()["images"] == new_imgs

            # verify via GET
            prods = session.get(f"{API}/admin/products", headers=auth_headers).json()
            match = next(p for p in prods if p["id"] == pid)
            assert match["images"] == new_imgs

            session.delete(f"{API}/admin/products/{pid}", headers=auth_headers)
        finally:
            session.delete(f"{API}/admin/categories/{cat_id}", headers=auth_headers)


# -------- Image Upload & File Serve --------
def _png_bytes():
    # 1x1 PNG
    return bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
        "89000000097048597300000b1300000b1301009a9c180000000d49444154789c"
        "63f8cffa3f0005fe02fe41a733590000000049454e44ae426082"
    )


class TestImageUpload:
    def test_upload_requires_auth(self, session):
        r = requests.post(f"{API}/upload/image",
                          files={"file": ("t.png", _png_bytes(), "image/png")})
        assert r.status_code == 401

    def test_upload_and_serve(self, session, auth_token):
        files = {"file": ("test.png", _png_bytes(), "image/png")}
        headers = {"Authorization": f"Bearer {auth_token}"}
        r = requests.post(f"{API}/upload/image", files=files, headers=headers)
        if r.status_code == 503:
            pytest.skip("Object storage unavailable (EMERGENT_LLM_KEY/init failed)")
        assert r.status_code == 200, r.text
        body = r.json()
        assert "url" in body and "path" in body
        assert body["url"].startswith("/api/files/")
        assert body["path"].startswith("pedilo/images/")
        assert body["path"].endswith(".png")

        # fetch (public, no auth)
        full_url = f"{BASE_URL}{body['url']}"
        r2 = requests.get(full_url)
        assert r2.status_code == 200, f"serve failed: {r2.status_code}"
        assert r2.headers.get("Content-Type", "").startswith("image/")
        assert "cache-control" in {k.lower() for k in r2.headers.keys()}
        assert len(r2.content) > 0

    def test_serve_missing_file_404(self, session):
        r = requests.get(f"{API}/files/pedilo/images/{uuid.uuid4()}.png")
        assert r.status_code == 404
