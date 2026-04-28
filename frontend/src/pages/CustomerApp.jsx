import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useCart } from "../contexts/CartContext";
import { MapPin, Clock, ShoppingBag, Plus, Settings } from "lucide-react";
import CustomizationDrawer from "../components/CustomizationDrawer";
import FloatingCart from "../components/FloatingCart";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABELS = {
  mon: "lunes",
  tue: "martes",
  wed: "miércoles",
  thu: "jueves",
  fri: "viernes",
  sat: "sábado",
  sun: "domingo",
};

function nextOpenHint(config) {
  if (!config?.schedule) return "";
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const idx = (now.getDay() + 6 + i) % 7; // JS: 0=Sun; our keys start at Mon
    const key = DAY_KEYS[idx];
    const d = config.schedule[key];
    if (!d || String(d.closed).toLowerCase() === "true" || !d.open) continue;
    if (i === 0) return `Abre hoy ${d.open}`;
    if (i === 1) return `Abre mañana ${d.open}`;
    return `Abre ${DAY_LABELS[key]} ${d.open}`;
  }
  return "";
}


export default function CustomerApp() {
  const navigate = useNavigate();
  const { addItem, count } = useCart();

  const [config, setConfig] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [combos, setCombos] = useState([]);
  const [activeCat, setActiveCat] = useState("combos");
  const [selected, setSelected] = useState(null); // { type, item }
  const sectionRefs = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const [cfg, cats, prods, cmbs] = await Promise.all([
          api.get("/public/config"),
          api.get("/public/categories"),
          api.get("/public/products"),
          api.get("/public/combos"),
        ]);
        setConfig(cfg.data);
        setCategories(cats.data);
        setProducts(prods.data);
        setCombos(cmbs.data);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const productsByCategory = useMemo(() => {
    const map = {};
    for (const p of products) {
      if (!map[p.category_id]) map[p.category_id] = [];
      map[p.category_id].push(p);
    }
    return map;
  }, [products]);

  const scrollTo = (key) => {
    setActiveCat(key);
    const el = sectionRefs.current[key];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleAdd = (type, item) => {
    if ((item.options || []).length === 0) {
      addItem({
        type,
        refId: item.id,
        name: item.name,
        basePrice: item.price,
        image: item.image,
        quantity: 1,
        selectedOptions: [],
      });
    } else {
      setSelected({ type, item });
    }
  };

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="app-shell w-full max-w-md bg-white min-h-screen relative pb-28" data-testid="customer-app-shell">
        {/* Header */}
        <header
          className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-5 py-4"
          data-testid="customer-header"
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl font-heading font-extrabold text-primary tracking-tight">
                  Pedilo
                </h1>
                <span className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold">
                  {config?.name || "Lo de Juan"}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 font-medium italic">
                {config?.slogan || "menos vueltas, más pedidos"}
              </p>
            </div>
            <button
              data-testid="admin-link"
              onClick={() => navigate("/admin/login")}
              className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 active:scale-95 transition-all"
              aria-label="Admin"
            >
              <Settings size={16} />
            </button>
          </div>

          {/* Info strip */}
          {config && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 rounded-full px-3 py-1.5">
                <Clock size={12} className="text-primary" />
                <span className="font-medium truncate">
                  {config.delivery_time}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600 bg-gray-50 rounded-full px-3 py-1.5">
                <MapPin size={12} className="text-secondary" />
                <span className="font-medium truncate">
                  {config.delivery_zone || "Envíos en zona"}
                </span>
              </div>
            </div>
          )}

          {config && config.is_open === false && (
            <div
              data-testid="closed-banner"
              className="mt-3 px-3 py-2 rounded-xl bg-red-50 border border-red-100 text-red-700 text-xs font-semibold flex items-center gap-2"
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>
                Cerrado ahora · {nextOpenHint(config) || "Probá más tarde"}
              </span>
            </div>
          )}
        </header>

        {/* Category pills */}
        <nav
          className="sticky top-[120px] z-40 bg-white border-b border-gray-50 no-scrollbar overflow-x-auto"
          data-testid="category-nav"
        >
          <div className="flex gap-2 px-5 py-3 w-max">
            {combos.length > 0 && (
              <button
                data-testid="cat-pill-combos"
                onClick={() => scrollTo("combos")}
                className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCat === "combos"
                    ? "bg-secondary text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                🔥 Combos
              </button>
            )}
            {categories.map((c) => (
              <button
                key={c.id}
                data-testid={`cat-pill-${c.id}`}
                onClick={() => scrollTo(c.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                  activeCat === c.id
                    ? "bg-primary text-white shadow-md"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Combos */}
        {combos.length > 0 && (
          <section
            ref={(el) => (sectionRefs.current["combos"] = el)}
            className="px-5 pt-6 pb-2"
            data-testid="section-combos"
          >
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-xl font-heading font-bold text-gray-900">
                Combos del día
              </h2>
              <span className="text-[11px] uppercase tracking-widest text-secondary font-bold">
                Ahorrá más
              </span>
            </div>
            <div className="flex flex-col gap-4">
              {combos.map((c) => (
                <ComboCard
                  key={c.id}
                  combo={c}
                  onAdd={() => handleAdd("combo", c)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Category sections */}
        {categories.map((cat) => {
          const items = productsByCategory[cat.id] || [];
          if (items.length === 0) return null;
          return (
            <section
              key={cat.id}
              ref={(el) => (sectionRefs.current[cat.id] = el)}
              className="px-5 pt-6 pb-2"
              data-testid={`section-${cat.id}`}
            >
              <h2 className="text-xl font-heading font-bold text-gray-900 mb-3">
                {cat.name}
              </h2>
              <div className="flex flex-col gap-3">
                {items.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onAdd={() => handleAdd("product", p)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        {products.length === 0 && combos.length === 0 && (
          <div className="px-5 py-16 text-center text-gray-500" data-testid="empty-menu">
            <ShoppingBag className="mx-auto mb-3 text-gray-300" size={48} />
            <p className="font-semibold">El menú todavía no está cargado.</p>
            <p className="text-sm mt-1">
              Volvé en un rato o contactá al local.
            </p>
          </div>
        )}

        {/* Footer spacer */}
        <div className="h-10" />

        {count > 0 && <FloatingCart onCheckout={() => navigate("/checkout")} />}
      </div>

      {selected && (
        <CustomizationDrawer
          type={selected.type}
          item={selected.item}
          onClose={() => setSelected(null)}
          onConfirm={(payload) => {
            addItem(payload);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function ProductCard({ product, onAdd }) {
  return (
    <div
      className="flex gap-3 p-3 border border-gray-100 rounded-2xl bg-white active:bg-gray-50 transition-colors"
      data-testid={`product-card-${product.id}`}
    >
      <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ShoppingBag size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-heading font-bold text-gray-900 leading-tight">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mt-1">
              {product.description}
            </p>
          )}
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-base font-bold text-gray-900">
            ${product.price.toLocaleString("es-AR")}
          </span>
          <button
            data-testid={`add-product-${product.id}`}
            onClick={onAdd}
            className="h-9 px-4 rounded-full bg-primary text-white text-sm font-bold flex items-center gap-1 shadow-md shadow-primary/20 active:scale-95 transition-all"
          >
            <Plus size={14} strokeWidth={3} />
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function ComboCard({ combo, onAdd }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-secondary/20 bg-gradient-to-br from-white to-orange-50"
      data-testid={`combo-card-${combo.id}`}
    >
      <span className="absolute top-0 right-0 bg-secondary text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl tracking-wider uppercase z-10">
        Combo
      </span>
      <div className="flex gap-3 p-3">
        <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {combo.image ? (
            <img
              src={combo.image}
              alt={combo.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ShoppingBag size={24} />
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col justify-between min-w-0">
          <div>
            <h3 className="font-heading font-bold text-gray-900 text-lg leading-tight">
              {combo.name}
            </h3>
            {combo.description && (
              <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                {combo.description}
              </p>
            )}
            {combo.items?.length > 0 && (
              <ul className="mt-2 text-[11px] text-gray-600 space-y-0.5">
                {combo.items.slice(0, 3).map((it, idx) => (
                  <li key={idx}>
                    • {it.quantity}x {it.product_name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex justify-between items-center mt-2">
            <span className="text-lg font-bold text-secondary">
              ${combo.price.toLocaleString("es-AR")}
            </span>
            <button
              data-testid={`add-combo-${combo.id}`}
              onClick={onAdd}
              className="h-9 px-4 rounded-full bg-secondary text-white text-sm font-bold flex items-center gap-1 shadow-md shadow-secondary/30 active:scale-95 transition-all"
            >
              <Plus size={14} strokeWidth={3} />
              Agregar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
