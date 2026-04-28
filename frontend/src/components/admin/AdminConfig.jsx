import { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../../lib/api";
import { Save } from "lucide-react";

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
      await api.put("/admin/config", cfg);
      toast.success("Configuración guardada");
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail) || "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!cfg) return <p className="text-gray-500">Cargando…</p>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-3xl" data-testid="admin-config">
      <h2 className="font-heading font-bold text-xl text-gray-900 mb-1">
        Datos del negocio
      </h2>
      <p className="text-sm text-gray-500 mb-5">
        Todo esto se muestra a tus clientes en la app.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field label="Nombre del negocio" testid="cfg-name">
          <input
            data-testid="cfg-name"
            className="input"
            value={cfg.name}
            onChange={(e) => setCfg({ ...cfg, name: e.target.value })}
          />
        </Field>
        <Field label="Frase / slogan">
          <input
            data-testid="cfg-slogan"
            className="input"
            value={cfg.slogan}
            onChange={(e) => setCfg({ ...cfg, slogan: e.target.value })}
          />
        </Field>
        <Field label="Dirección">
          <input
            data-testid="cfg-address"
            className="input"
            value={cfg.address}
            onChange={(e) => setCfg({ ...cfg, address: e.target.value })}
          />
        </Field>
        <Field label="Zona de entrega">
          <input
            data-testid="cfg-zone"
            className="input"
            value={cfg.delivery_zone}
            onChange={(e) => setCfg({ ...cfg, delivery_zone: e.target.value })}
          />
        </Field>
        <Field label="Tiempo estimado de entrega">
          <input
            data-testid="cfg-time"
            className="input"
            value={cfg.delivery_time}
            onChange={(e) => setCfg({ ...cfg, delivery_time: e.target.value })}
            placeholder="ej: 30-45 min"
          />
        </Field>
        <Field label="Pedido mínimo ($)">
          <input
            data-testid="cfg-min"
            type="number"
            className="input"
            value={cfg.min_order}
            onChange={(e) => setCfg({ ...cfg, min_order: parseFloat(e.target.value || "0") })}
          />
        </Field>
        <Field label="WhatsApp (incluir código país, sin + ni guiones)">
          <input
            data-testid="cfg-whatsapp"
            className="input"
            value={cfg.whatsapp_number}
            onChange={(e) =>
              setCfg({ ...cfg, whatsapp_number: e.target.value.replace(/\D/g, "") })
            }
            placeholder="54922915700800"
          />
        </Field>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          data-testid="cfg-save"
          onClick={save}
          disabled={loading}
          className="h-11 px-5 rounded-lg bg-primary text-white font-bold flex items-center gap-2 shadow-md shadow-primary/20 disabled:opacity-50"
        >
          <Save size={16} /> {loading ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
      <style>{`.input{width:100%;height:42px;border:1px solid #E5E7EB;border-radius:10px;padding:0 14px;font-size:14px;font-weight:500;color:#111827;outline:none}.input:focus{border-color:#E53935;box-shadow:0 0 0 3px rgba(229,57,53,.15)}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">
        {label}
      </span>
      {children}
    </label>
  );
}
