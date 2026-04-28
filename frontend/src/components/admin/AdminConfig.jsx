import { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../../lib/api";
import { Save, Clock } from "lucide-react";

const DAYS = [
  { id: "mon", label: "Lunes" },
  { id: "tue", label: "Martes" },
  { id: "wed", label: "Miércoles" },
  { id: "thu", label: "Jueves" },
  { id: "fri", label: "Viernes" },
  { id: "sat", label: "Sábado" },
  { id: "sun", label: "Domingo" },
];

const OVERRIDE_OPTIONS = [
  { id: "auto", label: "Automático (según horario)" },
  { id: "open", label: "Forzar ABIERTO" },
  { id: "closed", label: "Forzar CERRADO" },
];

export default function AdminConfig() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/public/config").then((r) => setCfg(r.data)).catch(() => {});
  }, []);

  const save = async () => {
    if (!cfg) return;
    setLoading(true);
    try {
      // remove computed field before send
      const { is_open, ...body } = cfg;
      await api.put("/admin/config", body);
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (day, patch) => {
    setCfg({
      ...cfg,
      schedule: {
        ...cfg.schedule,
        [day]: { ...cfg.schedule[day], ...patch },
      },
    });
  };

  if (!cfg) return <p className="text-gray-500">Cargando…</p>;

  return (
    <div className="max-w-3xl flex flex-col gap-5" data-testid="admin-config">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-heading font-bold text-xl text-gray-900 mb-1">
          Datos del negocio
        </h2>
        <p className="text-sm text-gray-500 mb-5">
          Se muestran a tus clientes en la app.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre del negocio">
            <input data-testid="cfg-name" className="input" value={cfg.name}
              onChange={(e) => setCfg({ ...cfg, name: e.target.value })} />
          </Field>
          <Field label="Frase / slogan">
            <input data-testid="cfg-slogan" className="input" value={cfg.slogan}
              onChange={(e) => setCfg({ ...cfg, slogan: e.target.value })} />
          </Field>
          <Field label="Dirección">
            <input data-testid="cfg-address" className="input" value={cfg.address}
              onChange={(e) => setCfg({ ...cfg, address: e.target.value })} />
          </Field>
          <Field label="Zona de entrega">
            <input data-testid="cfg-zone" className="input" value={cfg.delivery_zone}
              onChange={(e) => setCfg({ ...cfg, delivery_zone: e.target.value })} />
          </Field>
          <Field label="Tiempo estimado de entrega">
            <input data-testid="cfg-time" className="input" value={cfg.delivery_time}
              onChange={(e) => setCfg({ ...cfg, delivery_time: e.target.value })}
              placeholder="ej: 30-45 min" />
          </Field>
          <Field label="Pedido mínimo ($)">
            <input data-testid="cfg-min" type="number" className="input" value={cfg.min_order}
              onChange={(e) => setCfg({ ...cfg, min_order: parseFloat(e.target.value || "0") })} />
          </Field>
          <Field label="WhatsApp (código país, sin + ni guiones)">
            <input data-testid="cfg-whatsapp" className="input" value={cfg.whatsapp_number}
              onChange={(e) => setCfg({ ...cfg, whatsapp_number: e.target.value.replace(/\D/g, "") })}
              placeholder="5492291570800" />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Clock size={18} className="text-primary" />
          <h2 className="font-heading font-bold text-xl text-gray-900">Horarios de atención</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Fuera de horario la tienda aparece como <strong>cerrada</strong> y no deja enviar pedidos.
        </p>

        <div className="mb-4">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
            Estado manual
          </label>
          <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {OVERRIDE_OPTIONS.map((o) => (
              <button
                key={o.id}
                data-testid={`override-${o.id}`}
                onClick={() => setCfg({ ...cfg, open_override: o.id })}
                className={`h-11 rounded-lg border-2 text-sm font-bold transition-all ${
                  cfg.open_override === o.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 text-gray-600 bg-white hover:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Estado actual: {cfg.is_open ? (
              <span className="text-green-600 font-bold">Abierto ✓</span>
            ) : (
              <span className="text-red-600 font-bold">Cerrado</span>
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {DAYS.map((d) => {
            const day = cfg.schedule?.[d.id] || { open: "", close: "", closed: "false" };
            const closed = String(day.closed).toLowerCase() === "true";
            return (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-2 p-3 border border-gray-100 rounded-lg"
                data-testid={`sched-row-${d.id}`}
              >
                <span className="w-24 font-bold text-sm text-gray-800">{d.label}</span>
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={closed}
                    onChange={(e) => updateDay(d.id, { closed: e.target.checked ? "true" : "false" })}
                    className="h-4 w-4 accent-primary"
                  />
                  Cerrado
                </label>
                <input
                  type="time"
                  disabled={closed}
                  value={day.open}
                  onChange={(e) => updateDay(d.id, { open: e.target.value })}
                  className="input w-28 h-9 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  data-testid={`sched-${d.id}-open`}
                />
                <span className="text-gray-400 text-xs">a</span>
                <input
                  type="time"
                  disabled={closed}
                  value={day.close}
                  onChange={(e) => updateDay(d.id, { close: e.target.value })}
                  className="input w-28 h-9 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                  data-testid={`sched-${d.id}-close`}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          data-testid="cfg-save"
          onClick={save}
          disabled={loading}
          className="h-11 px-5 rounded-lg bg-primary text-white font-bold flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
        >
          <Save size={16} /> {loading ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
      <style>{`.input{width:100%;height:42px;border:1px solid #E5E7EB;border-radius:10px;padding:0 14px;font-size:14px;font-weight:500;color:#111827;outline:none;background:#fff}.input:focus{border-color:#E53935;box-shadow:0 0 0 3px rgba(229,57,53,.15)}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}
