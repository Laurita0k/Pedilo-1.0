"""Pedilo API tests: public, auth, admin CRUD (categories/products/combos/config)."""
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


# -------- Public Endpoints --------
class TestPublic:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_public_config(self, session):
        r = session.get(f"{API}/public/config")
        assert r.status_code == 200
        data = r.json()
        assert data.get("name") == "Lo de Juan"
        assert data.get("whatsapp_number") == "5492291570800"

    def test_public_categories(self, session):
        r = session.get(f"{API}/public/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 4
        names = [c["name"] for c in data]
        for expected in ["Pollos", "Hamburguesas", "Milanesas", "Empanadas"]:
            assert expected in names

    def test_public_products(self, session):
        r = session.get(f"{API}/public/products")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 7
        # ensure no _id leak
        for p in data:
            assert "_id" not in p
            assert "id" in p
            assert "name" in p
            assert "price" in p

    def test_public_combos(self, session):
        r = session.get(f"{API}/public/combos")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert any(c["name"] == "Combo Familiar" for c in data)


# -------- Auth --------
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert "token" in d and len(d["token"]) > 10
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "admin"
        # cookie set
        assert "access_token" in r.cookies

    def test_login_invalid(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrongpass"})
        assert r.status_code == 401

    def test_login_unknown_email(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "nope@nope.com", "password": "x"})
        assert r.status_code == 401

    def test_me_with_token(self, session, auth_headers):
        r = session.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert "password_hash" not in d

    def test_me_without_auth(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# -------- Unauthorized admin access --------
class TestAdminUnauthorized:
    @pytest.mark.parametrize("path,method", [
        ("/admin/categories", "GET"),
        ("/admin/categories", "POST"),
        ("/admin/products", "GET"),
        ("/admin/products", "POST"),
        ("/admin/combos", "GET"),
        ("/admin/combos", "POST"),
        ("/admin/config", "PUT"),
    ])
    def test_unauthenticated_returns_401(self, path, method):
        r = requests.request(method, f"{API}{path}", json={})
        assert r.status_code == 401, f"{method} {path} expected 401, got {r.status_code}"


# -------- Admin Categories CRUD --------
class TestCategoriesCRUD:
    def test_full_crud_cycle(self, session, auth_headers):
        # CREATE
        name = f"TEST_Cat_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/admin/categories", json={"name": name, "order": 99}, headers=auth_headers)
        assert r.status_code == 200, r.text
        created = r.json()
        assert created["name"] == name
        cat_id = created["id"]

        # GET (list -> verify persisted)
        r = session.get(f"{API}/admin/categories", headers=auth_headers)
        assert r.status_code == 200
        assert any(c["id"] == cat_id for c in r.json())

        # UPDATE
        new_name = name + "_upd"
        r = session.put(f"{API}/admin/categories/{cat_id}", json={"name": new_name}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["name"] == new_name

        # DELETE
        r = session.delete(f"{API}/admin/categories/{cat_id}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json().get("success") is True

        # verify gone
        r = session.get(f"{API}/admin/categories", headers=auth_headers)
        assert all(c["id"] != cat_id for c in r.json())

    def test_update_nonexistent(self, session, auth_headers):
        r = session.put(f"{API}/admin/categories/nope-{uuid.uuid4()}", json={"name": "x"}, headers=auth_headers)
        assert r.status_code == 404

    def test_delete_nonexistent(self, session, auth_headers):
        r = session.delete(f"{API}/admin/categories/nope-{uuid.uuid4()}", headers=auth_headers)
        assert r.status_code == 404


# -------- Admin Products CRUD --------
class TestProductsCRUD:
    def test_full_crud_cycle(self, session, auth_headers):
        # need a category
        cat_name = f"TEST_PCat_{uuid.uuid4().hex[:6]}"
        r = session.post(f"{API}/admin/categories", json={"name": cat_name, "order": 50}, headers=auth_headers)
        assert r.status_code == 200
        cat_id = r.json()["id"]

        try:
            payload = {
                "name": f"TEST_Prod_{uuid.uuid4().hex[:6]}",
                "description": "test product",
                "price": 1234.5,
                "category_id": cat_id,
                "options": [{"name": "Extra", "price_delta": 100.0}],
                "active": True,
                "order": 1,
            }
            r = session.post(f"{API}/admin/products", json=payload, headers=auth_headers)
            assert r.status_code == 200, r.text
            prod = r.json()
            prod_id = prod["id"]
            assert prod["price"] == 1234.5
            assert len(prod["options"]) == 1

            # public products should include it
            r = session.get(f"{API}/public/products")
            assert any(p["id"] == prod_id for p in r.json())

            # UPDATE
            r = session.put(f"{API}/admin/products/{prod_id}", json={"price": 9999.0, "active": False}, headers=auth_headers)
            assert r.status_code == 200
            assert r.json()["price"] == 9999.0
            assert r.json()["active"] is False

            # public products should now exclude (active False)
            r = session.get(f"{API}/public/products")
            assert all(p["id"] != prod_id for p in r.json())

            # DELETE
            r = session.delete(f"{API}/admin/products/{prod_id}", headers=auth_headers)
            assert r.status_code == 200
        finally:
            # cleanup: delete category (cascade removes any products)
            session.delete(f"{API}/admin/categories/{cat_id}", headers=auth_headers)


# -------- Admin Combos CRUD --------
class TestCombosCRUD:
    def test_full_crud_cycle(self, session, auth_headers):
        # get an existing product from public
        prods = session.get(f"{API}/public/products").json()
        assert prods, "Need seeded products"
        p = prods[0]

        payload = {
            "name": f"TEST_Combo_{uuid.uuid4().hex[:6]}",
            "description": "test combo",
            "price": 9999.0,
            "items": [{"product_id": p["id"], "product_name": p["name"], "quantity": 2}],
            "options": [],
            "active": True,
            "order": 99,
        }
        r = session.post(f"{API}/admin/combos", json=payload, headers=auth_headers)
        assert r.status_code == 200, r.text
        combo = r.json()
        combo_id = combo["id"]
        assert combo["price"] == 9999.0
        assert combo["items"][0]["quantity"] == 2

        # UPDATE
        r = session.put(f"{API}/admin/combos/{combo_id}", json={"price": 11111.0}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["price"] == 11111.0

        # DELETE
        r = session.delete(f"{API}/admin/combos/{combo_id}", headers=auth_headers)
        assert r.status_code == 200


# -------- Admin Config --------
class TestAdminConfig:
    def test_update_config_persists(self, session, auth_headers):
        # get current
        before = session.get(f"{API}/public/config").json()

        new_cfg = {
            "name": before.get("name", "Lo de Juan"),
            "slogan": "TEST_SLOGAN_" + uuid.uuid4().hex[:6],
            "address": before.get("address", ""),
            "delivery_zone": before.get("delivery_zone", ""),
            "delivery_time": before.get("delivery_time", "30-45 min"),
            "min_order": before.get("min_order", 0.0),
            "whatsapp_number": before.get("whatsapp_number", "5492291570800"),
        }
        r = session.put(f"{API}/admin/config", json=new_cfg, headers=auth_headers)
        assert r.status_code == 200, r.text

        # verify via public
        r = session.get(f"{API}/public/config")
        assert r.json()["slogan"] == new_cfg["slogan"]

        # restore
        session.put(f"{API}/admin/config", json=before, headers=auth_headers)
