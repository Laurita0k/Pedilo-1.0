import { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../../lib/api";
import { Plus, Trash2, Pencil, X, Power, Save } from "lucide-react";

const EMPTY_PRODUCT = {
  name: "",
  description: "",
  price: 0,
  image: "",
  category_id: "",
  options: [],
  active: true,
  order: 0,
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [cats, setCats] = useState([]);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        api.get("/admin/products"),
        api.get("/admin/categories"),
      ]);
      setProducts(p.data);
      setCats(c.data);
    } catch {
      toast.error("Error cargando productos");
    }
  };
  useEffect(() => {
    load();
  }, []);

  const startNew = () => {
    if (cats.length === 0) {
      toast.error("Primero creá al menos una categoría");
      return;
    }
    setEditing({ ...EMPTY_PRODUCT, category_id: cats[0].id });
  };

  const save = async () => {
    if (!editing.name || editing.price <= 0 || !editing.category_id) {
      toast.error("Completá nombre, precio y categoría");
      return;
    }
    try {
      if (editing.id) {
        await api.put(`/admin/products/${editing.id}`, editing);
      } else {
        await api.post("/admin/products", editing);
      }
      setEditing(null);
      toast.success("Guardado");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar producto?")) return;
    try {
      await api.delete(`/admin/products/${id}`);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const toggleActive = async (p) => {
    try {
      await api.put(`/admin/products/${p.id}`, { active: !p.active });
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const catName = (id) => cats.find((c) => c.id === id)?.name || "—";

  return (
    <div data-testid="admin-products">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-bold text-xl text-gray-900">Productos</h2>
          <p className="text-sm text-gray-500">Gestioná el menú completo.</p>
        </div>
        <button
          data-testid="product-new"
          onClick={startNew}
          className="h-10 px-4 rounded-lg bg-primary text-white font-bold flex items-center gap-1 shadow-md shadow-primary/20"
        >
          <Plus size={16} /> Nuevo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-3 px-5 py-3 text-[11px] uppercase tracking-widest font-bold text-gray-500 border-b border-gray-100 bg-gray-50">
          <div className="col-span-5">Producto</div>
          <div className="col-span-3">Categoría</div>
          <div className="col-span-2">Precio</div>
          <div className="col-span-2 text-right">Acciones</div>
        </div>
        {products.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm">Aún no hay productos.</p>
        ) : (
          products.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-gray-100 last:border-0 items-center"
              data-testid={`product-row-${p.id}`}
            >
              <div className="col-span-5 flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {p.image && <img src={p.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-gray-500 truncate">{p.description}</p>
                </div>
              </div>
              <div className="col-span-3 text-sm text-gray-600">{catName(p.category_id)}</div>
              <div className="col-span-2 font-bold text-gray-900">
                ${p.price.toLocaleString("es-AR")}
              </div>
              <div className="col-span-2 flex justify-end gap-1">
                <button
                  data-testid={`product-toggle-${p.id}`}
                  onClick={() => toggleActive(p)}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                    p.active ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"
                  }`}
                  title={p.active ? "Activo" : "Desactivado"}
                >
                  <Power size={14} />
                </button>
                <button
                  data-testid={`product-edit-${p.id}`}
                  onClick={() => setEditing({ ...p })}
                  className="h-8 w-8 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                >
                  <Pencil size={14} />
                </button>
                <button
                  data-testid={`product-delete-${p.id}`}
                  onClick={() => remove(p.id)}
                  className="h-8 w-8 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editing && (
        <ProductEditor
          value={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
          cats={cats}
        />
      )}
    </div>
  );
}

function ProductEditor({ value, onChange, onClose, onSave, cats }) {
  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ ...value, image: ev.target.result });
    reader.readAsDataURL(file);
  };

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
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="product-editor">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-heading font-bold text-lg text-gray-900">
            {value.id ? "Editar producto" : "Nuevo producto"}
          </h3>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Nombre">
            <input
              data-testid="pe-name"
              className="input"
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
            />
          </Field>
          <Field label="Precio ($)">
            <input
              data-testid="pe-price"
              type="number"
              className="input"
              value={value.price}
              onChange={(e) => onChange({ ...value, price: parseFloat(e.target.value || "0") })}
            />
          </Field>
          <Field label="Categoría">
            <select
              data-testid="pe-category"
              className="input"
              value={value.category_id}
              onChange={(e) => onChange({ ...value, category_id: e.target.value })}
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Orden">
            <input
              type="number"
              className="input"
              value={value.order}
              onChange={(e) => onChange({ ...value, order: parseInt(e.target.value || "0") })}
            />
          </Field>
          <Field label="Descripción" className="md:col-span-2">
            <textarea
              data-testid="pe-description"
              className="input min-h-[72px] py-2"
              rows={3}
              value={value.description}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
            />
          </Field>
          <Field label="Imagen (URL o subir)" className="md:col-span-2">
            <div className="flex gap-2">
              <input
                data-testid="pe-image-url"
                className="input flex-1"
                placeholder="https://…"
                value={value.image?.startsWith("data:") ? "" : value.image}
                onChange={(e) => onChange({ ...value, image: e.target.value })}
              />
              <label className="h-[42px] px-3 rounded-lg border border-gray-200 text-sm font-bold flex items-center cursor-pointer hover:bg-gray-50">
                Subir
                <input
                  data-testid="pe-image-file"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImage}
                />
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
                Opciones de personalización
              </label>
              <button
                data-testid="pe-add-opt"
                onClick={addOpt}
                className="text-xs font-bold text-primary flex items-center gap-1"
              >
                <Plus size={12} /> Agregar opción
              </button>
            </div>
            {value.options?.length === 0 && (
              <p className="text-sm text-gray-400">Sin opciones. Ej: "sin tomate", "agregar cheddar +500"</p>
            )}
            <div className="flex flex-col gap-2">
              {value.options?.map((o, i) => (
                <div key={o.id || i} className="flex gap-2 items-center">
                  <input
                    data-testid={`pe-opt-name-${i}`}
                    className="input flex-1"
                    placeholder="Nombre opción"
                    value={o.name}
                    onChange={(e) => updateOpt(i, { name: e.target.value })}
                  />
                  <input
                    data-testid={`pe-opt-delta-${i}`}
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
          <button
            onClick={onClose}
            className="h-11 px-4 rounded-lg bg-gray-100 text-gray-700 font-bold"
          >
            Cancelar
          </button>
          <button
            data-testid="pe-save"
            onClick={onSave}
            className="h-11 px-5 rounded-lg bg-primary text-white font-bold flex items-center gap-2 shadow-md shadow-primary/20"
          >
            <Save size={16} /> Guardar
          </button>
        </div>
        <style>{`.input{width:100%;height:42px;border:1px solid #E5E7EB;border-radius:10px;padding:0 14px;font-size:14px;font-weight:500;color:#111827;outline:none;background:#fff}.input:focus{border-color:#E53935;box-shadow:0 0 0 3px rgba(229,57,53,.15)}`}</style>
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
