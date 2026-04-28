import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Store, FolderTree, Package, PackageOpen, LogOut, ExternalLink, Receipt } from "lucide-react";
import api from "../lib/api";
import AdminConfig from "../components/admin/AdminConfig";
import AdminCategories from "../components/admin/AdminCategories";
import AdminProducts from "../components/admin/AdminProducts";
import AdminCombos from "../components/admin/AdminCombos";
import AdminOrders from "../components/admin/AdminOrders";

const TABS = [
  { id: "orders", label: "Pedidos", icon: Receipt },
  { id: "config", label: "Negocio", icon: Store },
  { id: "categories", label: "Categorías", icon: FolderTree },
  { id: "products", label: "Productos", icon: Package },
  { id: "combos", label: "Combos", icon: PackageOpen },
];

export default function AdminDashboard() {
  const [tab, setTab] = useState("orders");
  const [pending, setPending] = useState(0);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/admin/orders/stats");
        setPending(data.pending || 0);
      } catch {
        /* noop */
      }
    };
    load();
    const i = setInterval(load, 20000);
    return () => clearInterval(i);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center font-heading font-extrabold">
              P
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-lg text-gray-900 leading-none">
                Pedilo · Admin
              </h1>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="preview-shop"
              onClick={() => navigate("/")}
              className="hidden sm:flex h-9 px-3 rounded-lg border border-gray-200 text-gray-700 text-xs font-bold items-center gap-1 hover:bg-gray-50"
            >
              <ExternalLink size={14} />
              Ver tienda
            </button>
            <button
              data-testid="admin-logout"
              onClick={handleLogout}
              className="h-9 px-3 rounded-lg bg-gray-900 text-white text-xs font-bold flex items-center gap-1 hover:bg-gray-800"
            >
              <LogOut size={14} />
              Salir
            </button>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              const showBadge = t.id === "orders" && pending > 0;
              return (
                <button
                  key={t.id}
                  data-testid={`tab-${t.id}`}
                  onClick={() => setTab(t.id)}
                  className={`h-11 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap relative ${
                    active
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  <Icon size={16} />
                  {t.label}
                  {showBadge && (
                    <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                      {pending}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-6">
        {tab === "orders" && <AdminOrders />}
        {tab === "config" && <AdminConfig />}
        {tab === "categories" && <AdminCategories />}
        {tab === "products" && <AdminProducts />}
        {tab === "combos" && <AdminCombos />}
      </main>
    </div>
  );
}
