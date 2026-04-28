import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { Store, FolderTree, Package, PackageOpen, LogOut, ExternalLink, Receipt, Bell, BellOff } from "lucide-react";
import api from "../lib/api";
import AdminConfig from "../components/admin/AdminConfig";
import AdminCategories from "../components/admin/AdminCategories";
import AdminProducts from "../components/admin/AdminProducts";
import AdminCombos from "../components/admin/AdminCombos";
import AdminOrders from "../components/admin/AdminOrders";
import {
  primeAudio,
  playNewOrderChime,
  vibrate,
  ensureNotificationPermission,
  showDesktopNotification,
} from "../lib/notify";

const TABS = [
  { id: "orders", label: "Pedidos", icon: Receipt },
  { id: "config", label: "Negocio", icon: Store },
  { id: "categories", label: "Categorías", icon: FolderTree },
  { id: "products", label: "Productos", icon: Package },
  { id: "combos", label: "Combos", icon: PackageOpen },
];

const BASE_TITLE = "Pedilo · Admin";
const SOUND_KEY = "pedilo_sound_enabled";

export default function AdminDashboard() {
  const [tab, setTab] = useState("orders");
  const [pending, setPending] = useState(0);
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(SOUND_KEY) === "1"
  );
  const prevPendingRef = useRef(null);
  const firstLoadRef = useRef(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/admin/orders/stats");
        const newPending = data.pending || 0;
        const prev = prevPendingRef.current;

        // Fire chime only on subsequent polls, not on the first load
        if (!firstLoadRef.current && prev !== null && newPending > prev && soundOn) {
          const delta = newPending - prev;
          playNewOrderChime();
          vibrate([250, 100, 250]);
          showDesktopNotification(
            delta === 1 ? "Nuevo pedido en Pedilo" : `${delta} pedidos nuevos`,
            "Tocá para ver los detalles en el panel."
          );
          toast.success(
            delta === 1 ? "🔔 ¡Nuevo pedido!" : `🔔 ${delta} pedidos nuevos`,
            { duration: 6000 }
          );
        }

        prevPendingRef.current = newPending;
        firstLoadRef.current = false;
        setPending(newPending);
      } catch {
        /* noop */
      }
    };
    load();
    const i = setInterval(load, 15000);
    return () => clearInterval(i);
  }, [soundOn]);

  // Dynamic tab title: "(2) Pedilo · Admin"
  useEffect(() => {
    document.title = pending > 0 ? `(${pending}) ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [pending]);

  const toggleSound = async () => {
    if (!soundOn) {
      primeAudio();
      playNewOrderChime(); // short preview so the user hears it worked
      await ensureNotificationPermission();
      localStorage.setItem(SOUND_KEY, "1");
      setSoundOn(true);
      toast.success("Notificaciones activadas");
    } else {
      localStorage.setItem(SOUND_KEY, "0");
      setSoundOn(false);
      toast("Notificaciones desactivadas");
    }
  };

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
              data-testid="toggle-sound"
              onClick={toggleSound}
              title={soundOn ? "Sonido activado" : "Activar sonido de pedidos"}
              className={`h-9 px-3 rounded-lg text-xs font-bold flex items-center gap-1 border transition-all ${
                soundOn
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {soundOn ? <Bell size={14} /> : <BellOff size={14} />}
              <span className="hidden sm:inline">
                {soundOn ? "Sonido ON" : "Activar sonido"}
              </span>
            </button>
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
                    <span className="ml-1 h-5 min-w-[20px] px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
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
