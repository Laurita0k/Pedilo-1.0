from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# -------------------- Setup --------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="Pedilo API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# -------------------- Auth Helpers --------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="No autenticado")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Tipo de token inválido")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


# -------------------- Models --------------------
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProductOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price_delta: float = 0.0  # e.g. +500 for cheddar, 0 for "sin tomate"


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CategoryCreate(BaseModel):
    name: str
    order: int = 0


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    price: float
    image: str = ""
    category_id: str
    options: List[ProductOption] = []
    active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProductCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    image: str = ""
    category_id: str
    options: List[ProductOption] = []
    active: bool = True
    order: int = 0


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category_id: Optional[str] = None
    options: Optional[List[ProductOption]] = None
    active: Optional[bool] = None
    order: Optional[int] = None


class ComboItem(BaseModel):
    product_id: str
    product_name: str  # snapshot
    quantity: int = 1


class Combo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    price: float
    image: str = ""
    items: List[ComboItem] = []
    options: List[ProductOption] = []
    active: bool = True
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ComboCreate(BaseModel):
    name: str
    description: str = ""
    price: float
    image: str = ""
    items: List[ComboItem] = []
    options: List[ProductOption] = []
    active: bool = True
    order: int = 0


class ComboUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    items: Optional[List[ComboItem]] = None
    options: Optional[List[ProductOption]] = None
    active: Optional[bool] = None
    order: Optional[int] = None


class BusinessConfig(BaseModel):
    name: str = "Lo de Juan"
    slogan: str = "menos vueltas, más pedidos"
    address: str = ""
    delivery_zone: str = ""
    delivery_time: str = "30-45 min"
    min_order: float = 0.0
    whatsapp_number: str = ""


# -------------------- Auth Routes --------------------
@api_router.post("/auth/login")
async def login(body: LoginRequest, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña inválidos")

    token = create_access_token(user["id"], user["email"])
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=60 * 60 * 12,
        path="/",
    )
    return {"id": user["id"], "email": user["email"], "name": user.get("name", "Admin"), "role": user.get("role", "admin"), "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key="access_token", path="/")
    return {"success": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# -------------------- Public Routes --------------------
@api_router.get("/public/config")
async def public_config():
    cfg = await db.config.find_one({"_id": "business"}, {"_id": 0})
    if not cfg:
        cfg = BusinessConfig().model_dump()
    return cfg


@api_router.get("/public/categories")
async def public_categories():
    items = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


@api_router.get("/public/products")
async def public_products():
    items = await db.products.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(1000)
    return items


@api_router.get("/public/combos")
async def public_combos():
    items = await db.combos.find({"active": True}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


# -------------------- Admin: Config --------------------
@api_router.put("/admin/config")
async def update_config(cfg: BusinessConfig, user: dict = Depends(get_current_user)):
    await db.config.update_one(
        {"_id": "business"},
        {"$set": cfg.model_dump()},
        upsert=True,
    )
    return cfg.model_dump()


# -------------------- Admin: Categories --------------------
@api_router.get("/admin/categories")
async def admin_list_categories(user: dict = Depends(get_current_user)):
    items = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


@api_router.post("/admin/categories")
async def admin_create_category(body: CategoryCreate, user: dict = Depends(get_current_user)):
    cat = Category(**body.model_dump())
    doc = cat.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.categories.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/categories/{cat_id}")
async def admin_update_category(cat_id: str, body: CategoryUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Sin cambios")
    res = await db.categories.update_one({"id": cat_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    cat = await db.categories.find_one({"id": cat_id}, {"_id": 0})
    return cat


@api_router.delete("/admin/categories/{cat_id}")
async def admin_delete_category(cat_id: str, user: dict = Depends(get_current_user)):
    res = await db.categories.delete_one({"id": cat_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    # cascade: remove products of this category (or reassign) -> we delete
    await db.products.delete_many({"category_id": cat_id})
    return {"success": True}


# -------------------- Admin: Products --------------------
@api_router.get("/admin/products")
async def admin_list_products(user: dict = Depends(get_current_user)):
    items = await db.products.find({}, {"_id": 0}).sort("order", 1).to_list(2000)
    return items


@api_router.post("/admin/products")
async def admin_create_product(body: ProductCreate, user: dict = Depends(get_current_user)):
    prod = Product(**body.model_dump())
    doc = prod.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.products.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/products/{prod_id}")
async def admin_update_product(prod_id: str, body: ProductUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Sin cambios")
    res = await db.products.update_one({"id": prod_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    prod = await db.products.find_one({"id": prod_id}, {"_id": 0})
    return prod


@api_router.delete("/admin/products/{prod_id}")
async def admin_delete_product(prod_id: str, user: dict = Depends(get_current_user)):
    res = await db.products.delete_one({"id": prod_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return {"success": True}


# -------------------- Admin: Combos --------------------
@api_router.get("/admin/combos")
async def admin_list_combos(user: dict = Depends(get_current_user)):
    items = await db.combos.find({}, {"_id": 0}).sort("order", 1).to_list(500)
    return items


@api_router.post("/admin/combos")
async def admin_create_combo(body: ComboCreate, user: dict = Depends(get_current_user)):
    combo = Combo(**body.model_dump())
    doc = combo.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.combos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.put("/admin/combos/{combo_id}")
async def admin_update_combo(combo_id: str, body: ComboUpdate, user: dict = Depends(get_current_user)):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Sin cambios")
    res = await db.combos.update_one({"id": combo_id}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    combo = await db.combos.find_one({"id": combo_id}, {"_id": 0})
    return combo


@api_router.delete("/admin/combos/{combo_id}")
async def admin_delete_combo(combo_id: str, user: dict = Depends(get_current_user)):
    res = await db.combos.delete_one({"id": combo_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Combo no encontrado")
    return {"success": True}


# -------------------- Seed --------------------
async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@pedilo.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "pedilo123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        user_doc = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Juan (Dueño)",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(user_doc)
        logger.info(f"Admin seeded: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info(f"Admin password updated: {admin_email}")


async def seed_config():
    existing = await db.config.find_one({"_id": "business"})
    if not existing:
        cfg = BusinessConfig(
            name="Lo de Juan",
            slogan="menos vueltas, más pedidos",
            address="Av. Siempreviva 742",
            delivery_zone="Tandil centro y barrios cercanos",
            delivery_time="30-45 min",
            min_order=3000.0,
            whatsapp_number="5492291570800",
        ).model_dump()
        cfg["_id"] = "business"
        await db.config.insert_one(cfg)
        logger.info("Business config seeded")


async def seed_sample_data():
    if await db.categories.count_documents({}) > 0:
        return

    # Categories
    cats_seed = [
        {"name": "Pollos", "order": 1},
        {"name": "Hamburguesas", "order": 2},
        {"name": "Milanesas", "order": 3},
        {"name": "Empanadas", "order": 4},
    ]
    cat_ids = {}
    for c in cats_seed:
        cat = Category(**c).model_dump()
        cat["created_at"] = cat["created_at"].isoformat()
        await db.categories.insert_one(cat)
        cat_ids[c["name"]] = cat["id"]

    # Products
    prods_seed = [
        {
            "name": "Pollo entero al spiedo",
            "description": "Pollo jugoso asado al spiedo con hierbas.",
            "price": 7500,
            "image": "https://images.pexels.com/photos/31023374/pexels-photo-31023374.jpeg",
            "category_id": cat_ids["Pollos"],
            "order": 1,
            "options": [
                {"id": str(uuid.uuid4()), "name": "Agregar papas fritas", "price_delta": 1200},
                {"id": str(uuid.uuid4()), "name": "Agregar ensalada rusa", "price_delta": 900},
            ],
        },
        {
            "name": "Medio pollo con papas",
            "description": "Medio pollo al spiedo + papas fritas.",
            "price": 5200,
            "image": "https://images.pexels.com/photos/31023374/pexels-photo-31023374.jpeg",
            "category_id": cat_ids["Pollos"],
            "order": 2,
            "options": [],
        },
        {
            "name": "Hamburguesa Completa",
            "description": "Carne 150g, lechuga, tomate, queso, huevo.",
            "price": 4200,
            "image": "https://images.pexels.com/photos/13893924/pexels-photo-13893924.jpeg",
            "category_id": cat_ids["Hamburguesas"],
            "order": 1,
            "options": [
                {"id": str(uuid.uuid4()), "name": "Sin tomate", "price_delta": 0},
                {"id": str(uuid.uuid4()), "name": "Sin lechuga", "price_delta": 0},
                {"id": str(uuid.uuid4()), "name": "Agregar cheddar", "price_delta": 500},
                {"id": str(uuid.uuid4()), "name": "Agregar huevo", "price_delta": 300},
                {"id": str(uuid.uuid4()), "name": "Agregar panceta", "price_delta": 600},
            ],
        },
        {
            "name": "Hamburguesa Doble",
            "description": "Doble carne, doble cheddar, panceta.",
            "price": 5800,
            "image": "https://images.pexels.com/photos/13893924/pexels-photo-13893924.jpeg",
            "category_id": cat_ids["Hamburguesas"],
            "order": 2,
            "options": [
                {"id": str(uuid.uuid4()), "name": "Sin cebolla", "price_delta": 0},
                {"id": str(uuid.uuid4()), "name": "Agregar huevo", "price_delta": 300},
            ],
        },
        {
            "name": "Milanesa Napolitana",
            "description": "Milanesa con jamón, queso y salsa de tomate.",
            "price": 6200,
            "image": "https://images.unsplash.com/photo-1657205937945-a7cff935d223",
            "category_id": cat_ids["Milanesas"],
            "order": 1,
            "options": [
                {"id": str(uuid.uuid4()), "name": "Con papas fritas", "price_delta": 1200},
                {"id": str(uuid.uuid4()), "name": "Con puré", "price_delta": 1000},
            ],
        },
        {
            "name": "Docena de empanadas",
            "description": "Mixtas: carne, pollo, jamón y queso.",
            "price": 8400,
            "image": "https://images.pexels.com/photos/37025257/pexels-photo-37025257.jpeg",
            "category_id": cat_ids["Empanadas"],
            "order": 1,
            "options": [],
        },
        {
            "name": "Media docena de empanadas",
            "description": "6 empanadas a elección.",
            "price": 4500,
            "image": "https://images.pexels.com/photos/37025257/pexels-photo-37025257.jpeg",
            "category_id": cat_ids["Empanadas"],
            "order": 2,
            "options": [],
        },
    ]
    product_ids_by_name = {}
    for p in prods_seed:
        prod = Product(**p).model_dump()
        prod["created_at"] = prod["created_at"].isoformat()
        await db.products.insert_one(prod)
        product_ids_by_name[p["name"]] = prod["id"]

    # Combo
    combo_items = [
        {"product_id": product_ids_by_name["Pollo entero al spiedo"], "product_name": "Pollo entero al spiedo", "quantity": 1},
        {"product_id": product_ids_by_name["Docena de empanadas"], "product_name": "Docena de empanadas", "quantity": 1},
    ]
    combo = Combo(
        name="Combo Familiar",
        description="Pollo entero + docena de empanadas mixtas. Ideal para 4 personas.",
        price=14500,
        image="https://images.pexels.com/photos/7258492/pexels-photo-7258492.jpeg",
        items=[ComboItem(**ci) for ci in combo_items],
        options=[
            ProductOption(id=str(uuid.uuid4()), name="Agregar Coca 1.5L", price_delta=2200),
            ProductOption(id=str(uuid.uuid4()), name="Agregar papas fritas", price_delta=1500),
        ],
        order=1,
    ).model_dump()
    combo["created_at"] = combo["created_at"].isoformat()
    await db.combos.insert_one(combo)
    logger.info("Sample data seeded")


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.categories.create_index("id", unique=True)
    await db.products.create_index("id", unique=True)
    await db.combos.create_index("id", unique=True)
    await seed_admin()
    await seed_config()
    await seed_sample_data()


@app.on_event("shutdown")
async def shutdown():
    client.close()


@api_router.get("/")
async def root():
    return {"service": "Pedilo API", "status": "ok"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_origin_regex=".*",
    allow_methods=["*"],
    allow_headers=["*"],
)
