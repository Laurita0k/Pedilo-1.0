import { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { API, formatApiErrorDetail } from "../../lib/api";
import { Clock, Package, CheckCircle2, Truck, XCircle, Trash2, ChevronDown, ChevronUp, Phone } from "lucide-react";

const STATUS = [
  { id: "pending", label: "Nuevo", color: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock },
  { id: "confirmed", label: "Preparando", color: "bg-blue-100 text-blue-800 border-blue-200", icon: Package },
  { id: "delivered", label: "Entregado", color: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle2 },
  { id: "cancelled", label: "Cancelado", color: "bg-gray-100 text-gray-600 border-gray-200", icon: XCircle },
];

const STATUS_BY_ID = Object.fromEntries(STATUS.map((s) => [s.id, s]));

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [stats, setStats] = useState({ today_count: 0, today_total: 0, pending: 0 });

  const load = async () => {
    try {
      const [o, s] = await Promise.all([
        api.get("/admin/orders" + (filter !== "all" ? `?status=${filter}` : "")),
        api.get("/admin/orders/stats"),
      ]);
      setOrders(o.data);
      setStats(s.data);
    } catch (e) {
      toast.error("Error cargando pedidos");
    }
  };

  useEffect(() => {
    load();
    const i = setInterval(load, 20000); // poll every 20s
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const setStatus = async (id, status) => {
    try {
      await api.put(`/admin/orders/${id}`, { status });
      toast.success("Estado actualizado");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar pedido?")) return;
    try {
      await api.delete(`/admin/orders/${id}`);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div data-testid="admin-orders">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Pedidos de hoy" value={stats.today_count} accent="text-primary" />
        <StatCard
          label="Facturado hoy"
          value={`$${Number(stats.today_total || 0).toLocaleString("es-AR")}`}
          accent="text-green-600"
        />
        <StatCard label="Pendientes" value={stats.pending} accent="text-amber-600" badge={stats.pending > 0} />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
        {[{ id: "all", label: "Todos" }, ...STATUS].map((f) => (
          <button
            key={f.id}
            data-testid={`orders-filter-${f.id}`}
            onClick={() => setFilter(f.id)}
            className={`h-9 px-4 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
              filter === f.id
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {orders.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-xl">
            No hay pedidos {filter !== "all" ? "con este estado" : "todavía"}.
          </p>
        ) : (
          orders.map((o) => {
            const st = STATUS_BY_ID[o.status] || STATUS[0];
            const Icon = st.icon;
            const open = expanded === o.id;
            return (
              <div
                key={o.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                data-testid={`order-${o.id}`}
              >
                <button
                  onClick={() => setExpanded(open ? null : o.id)}
                  className="w-full flex items-center gap-3 p-4 text-left"
                >
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.color} flex items-center gap-1`}>
                    <Icon size={12} />
                    {st.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading font-bold text-gray-900 truncate">
                      #{o.id.slice(0, 6).toUpperCase()} · ${Number(o.total).toLocaleString("es-AR")}
                    </p>
                    <p className="text-[11px] text-gray-500 truncate">
                      {formatTime(o.created_at)} · {o.items.length} items · {o.address}
                    </p>
                  </div>
                  {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>
                {open && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/60 text-sm">
                    <ul className="flex flex-col gap-1.5 mb-3">
                      {o.items.map((it, idx) => (
                        <li key={idx} className="flex justify-between gap-2">
                          <span>
                            {it.type === "combo" ? "🍱 " : ""}
                            <strong>{it.quantity}x</strong> {it.name}
                            {it.selected_options?.length > 0 && (
                              <span className="text-gray-500">
                                {" "}
                                ({it.selected_options.map((o) => o.name).join(", ")})
                              </span>
                            )}
                          </span>
                          <span className="font-bold whitespace-nowrap">
                            ${Number(it.line_total).toLocaleString("es-AR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="text-xs text-gray-600 space-y-1 mb-3 border-t border-gray-200 pt-3">
                      <p>
                        <strong>Pago:</strong>{" "}
                        {o.payment_method === "efectivo" ? `Efectivo${o.cash_amount ? ` (abona con $${o.cash_amount})` : ""}` : "Transferencia"}
                      </p>
                      {o.notes && <p><strong>Notas:</strong> {o.notes}</p>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {o.status !== "confirmed" && o.status !== "delivered" && (
                        <ActionBtn
                          testid={`order-confirm-${o.id}`}
                          onClick={() => setStatus(o.id, "confirmed")}
                          icon={Package}
                          label="Preparando"
                          color="bg-blue-600"
                        />
                      )}
                      {o.status !== "delivered" && (
                        <ActionBtn
                          testid={`order-deliver-${o.id}`}
                          onClick={() => setStatus(o.id, "delivered")}
                          icon={Truck}
                          label="Entregado"
                          color="bg-green-600"
                        />
                      )}
                      {o.status !== "cancelled" && (
                        <ActionBtn
                          testid={`order-cancel-${o.id}`}
                          onClick={() => setStatus(o.id, "cancelled")}
                          icon={XCircle}
                          label="Cancelar"
                          color="bg-gray-600"
                        />
                      )}
                      <button
                        data-testid={`order-delete-${o.id}`}
                        onClick={() => remove(o.id)}
                        className="h-9 px-3 rounded-lg text-red-600 hover:bg-red-50 font-bold text-xs flex items-center gap-1"
                      >
                        <Trash2 size={13} /> Eliminar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent, badge }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 relative">
      {badge && (
        <span className="absolute top-3 right-3 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
      )}
      <p className="text-[11px] uppercase tracking-widest font-bold text-gray-500">{label}</p>
      <p className={`font-heading font-extrabold text-2xl mt-1 ${accent}`}>{value}</p>
    </div>
  );
}

function ActionBtn({ onClick, icon: Icon, label, color, testid }) {
  return (
    <button
      data-testid={testid}
      onClick={onClick}
      className={`h-9 px-3 rounded-lg ${color} text-white font-bold text-xs flex items-center gap-1 shadow-sm hover:opacity-90 active:scale-95 transition`}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
