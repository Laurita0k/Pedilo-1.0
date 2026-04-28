import { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../../lib/api";
import { uploadImage } from "../../lib/upload";
import { Plus, Trash2, Pencil, X, Power, Save } from "lucide-react";

const EMPTY = {
  name: "",
  description: "",
  price: 0,
  image: "",
  items: [],
  options: [],
  active: true,
  order: 0,
};

export default function AdminCombos() {
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const [c, p] = await Promise.all([
        api.get("/admin/combos"),
        api.get("/admin/products"),
      ]);
      setCombos(c.data);
      setProducts(p.data);
    } catch {
      toast.error("Error cargando combos");
    }
  };
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!editing.name || editing.price <= 0 || editing.items.length === 0) {
      toast.error("Completá nombre, precio y al menos un producto");
      return;
    }
    try {
      const payload = {
        ...editing,
        items: editing.items.map((it) => ({
          product_id: it.product_id,
          product_name:
            products.find((p) => p.id === it.product_id)?.name || it.product_name,
          quantity: it.quantity,
        })),
      };
      if (editing.id) await api.put(`/admin/combos/${editing.id}`, payload);
      else await api.post("/admin/combos", payload);
      setEditing(null);
      toast.success("Guardado");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar combo?")) return;
    try {
      await api.delete(`/admin/combos/${id}`);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const toggleActive = async (c) => {
    try {
      await api.put(`/admin/combos/${c.id}`, { active: !c.active });
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  return (
    <div data-testid="admin-combos">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-bold text-xl text-gray-900">Combos</h2>
          <p className="text-sm text-gray-500">Agrupá productos y ofrecé promos.</p>
        </div>
        <button
          data-testid="combo-new"
          onClick={() => {
            if (products.length === 0) {
              toast.error("Primero creá al menos un producto");
              return;
            }
            setEditing({ ...EMPTY });
          }}
          className="h-10 px-4 rounded-lg bg-secondary text-white font-bold flex items-center gap-1 shadow-md shadow-secondary/20"
        >
          <Plus size={16} /> Nuevo combo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {combos.length === 0 ? (
          <p className="col-span-2 p-8 text-center text-gray-500 text-sm bg-white border border-gray-200 rounded-xl">
            Aún no creaste combos.
          </p>
        ) : (
          combos.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              data-testid={`combo-card-admin-${c.id}`}
            >
              <div className="flex gap-3 p-4">
                <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {c.image && <img src={c.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between gap-2">
                    <h3 className="font-heading font-bold text-gray-900 truncate">{c.name}</h3>
                    <span className="text-sm font-bold text-secondary">
                      ${c.price.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{c.description}</p>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    {c.items.length} productos · {c.options?.length || 0} opciones
                  </p>
                </div>
              </div>
              <div className="flex border-t border-gray-100">
                <button
                  onClick={() => toggleActive(c)}
                  className={`flex-1 h-10 text-xs font-bold flex items-center justify-center gap-1 ${
                    c.active ? "text-green-600" : "text-gray-400"
                  }`}
                >
                  <Power size={12} /> {c.active ? "Activo" : "Inactivo"}
                </button>
                <button
                  data-testid={`combo-edit-${c.id}`}
                  onClick={() => setEditing({ ...c })}
                  className="flex-1 h-10 text-xs font-bold text-gray-700 flex items-center justify-center gap-1 border-l border-gray-100"
                >
                  <Pencil size={12} /> Editar
                </button>
                <button
                  data-testid={`combo-delete-${c.id}`}
                  onClick={() => remove(c.id)}
                  className="flex-1 h-10 text-xs font-bold text-red-500 flex items-center justify-center gap-1 border-l border-gray-100"
                >
                  <Trash2 size={12} /> Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <ComboEditor
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
          products={products}
        />
      )}
    </div>
  );
}

function ComboEditor({ value, onChange, onClose, onSave, products }) {
  const [uploading, setUploading] = useState(false);
  const handleImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange({ ...value, image: url });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const addItem = () => {
    if (products.length === 0) return;
    onChange({
      ...value,
      items: [
        ...value.items,
        { product_id: products[0].id, product_name: products[0].name, quantity: 1 },
      ],
    });
  };
  const updateItem = (i, patch) => {
    const arr = [...value.items];
    arr[i] = { ...arr[i], ...patch };
    onChange({ ...value, items: arr });
  };
  const removeItem = (i) =>
    onChange({ ...value, items: value.items.filter((_, idx) => idx !== i) });

  const addOpt = () =>
    onChange({
      ...value,
      options: [
        ...(value.options || []),
        { id: `tmp-${Date.now()}`, name: "", price_delta: 0 },
      ],
    });
  const updateOpt = (i, patch) => {
    const arr = [...value.options];
    arr[i] = { ...arr[i], ...patch };
    onChange({ ...value, options: arr });
  };
  const removeOpt = (i) =>
    onChange({ ...value, options: value.options.filter((_, idx) => idx !== i) });

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="combo-editor">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-heading font-bold text-lg text-gray-900">
            {value.id ? "Editar combo" : "Nuevo combo"}
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre del combo">
            <input
              data-testid="ce-name"
              className="input"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </Field>
          <Field label="Precio total ($)">
            <input
              data-testid="ce-price"
              type="number"
              className="input"
              value={value.price}
              onChange={(e) => onChange({ ...value, price: parseFloat(e.target.value || "0") })}
            />
          </Field>
          <Field label="Descripción" className="md:col-span-2">
            <textarea
              data-testid="ce-description"
              className="input min-h-[72px] py-2"
              rows={3}
              value={value.description}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
            />
          </Field>
          <Field label="Imagen" className="md:col-span-2">
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="https://…"
                value={value.image?.startsWith("data:") || value.image?.includes("/api/files/") ? "" : value.image}
                onChange={(e) => onChange({ ...value, image: e.target.value })}
              />
              <label className="h-[42px] px-3 rounded-lg border border-gray-200 text-sm font-bold flex items-center cursor-pointer hover:bg-gray-50">
                {uploading ? "Subiendo…" : "Subir"}
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
            </div>
            {value.image && (
              <img
                src={value.image}
                alt=""
                className="mt-2 h-24 w-24 rounded-lg object-cover border border-gray-200"
              />
            )}
          </Field>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                Productos incluidos
              </label>
              <button
                data-testid="ce-add-item"
                onClick={addItem}
                className="text-xs font-bold text-secondary flex items-center gap-1"
              >
                <Plus size={12} /> Agregar producto
              </button>
            </div>
            {value.items.length === 0 && (
              <p className="text-sm text-gray-400">Agregá los productos que forman este combo.</p>
            )}
            <div className="flex flex-col gap-2">
              {value.items.map((it, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select
                    data-testid={`ce-item-prod-${i}`}
                    className="input flex-1"
                    value={it.product_id}
                    onChange={(e) => updateItem(i, { product_id: e.target.value })}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    data-testid={`ce-item-qty-${i}`}
                    type="number"
                    min={1}
                    className="input w-20"
                    value={it.quantity}
                    onChange={(e) => updateItem(i, { quantity: parseInt(e.target.value || "1") })}
                  />
                  <button
                    onClick={() => removeItem(i)}
                    className="h-[42px] w-[42px] rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                Opciones adicionales
              </label>
              <button
                onClick={addOpt}
                className="text-xs font-bold text-secondary flex items-center gap-1"
              >
                <Plus size={12} /> Agregar opción
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {value.options?.map((o, i) => (
                <div key={o.id || i} className="flex gap-2 items-center">
                  <input
                    className="input flex-1"
                    placeholder="Nombre opción"
                    value={o.name}
                    onChange={(e) => updateOpt(i, { name: e.target.value })}
                  />
                  <input
                    type="number"
                    className="input w-32"
                    placeholder="+$"
                    value={o.price_delta}
                    onChange={(e) => updateOpt(i, { price_delta: parseFloat(e.target.value || "0") })}
                  />
                  <button
                    onClick={() => removeOpt(i)}
                    className="h-[42px] w-[42px] rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={value.active}
              onChange={(e) => onChange({ ...value, active: e.target.checked })}
              className="h-4 w-4 accent-primary"
            />
            <span className="text-sm text-gray-700 font-semibold">Activo (visible en la tienda)</span>
          </label>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="h-11 px-4 rounded-lg bg-gray-100 text-gray-700 font-bold">
            Cancelar
          </button>
          <button
            data-testid="ce-save"
            onClick={onSave}
            className="h-11 px-5 rounded-lg bg-secondary text-white font-bold flex items-center gap-2 shadow-md shadow-secondary/30"
          >
            <Save size={16} /> Guardar
          </button>
        </div>
        <style>{`.input{width:100%;height:42px;border:1px solid #E5E7EB;border-radius:10px;padding:0 14px;font-size:14px;font-weight:500;color:#111827;outline:none;background:#fff}.input:focus{border-color:#FF7043;box-shadow:0 0 0 3px rgba(255,112,67,.18)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-xs font-bold text-gray-600 uppercase tracking-widest">{label}</span>
      {children}
    </label>
  );
}
