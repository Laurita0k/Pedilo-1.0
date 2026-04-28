import { useEffect, useState } from "react";
import { toast } from "sonner";
import api, { formatApiErrorDetail } from "../../lib/api";
import { Plus, Trash2, Pencil, Check, X, ArrowUp, ArrowDown } from "lucide-react";

export default function AdminCategories() {
  const [cats, setCats] = useState([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/admin/categories");
      setCats(data);
    } catch (e) {
      toast.error("Error cargando categorías");
    }
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newName.trim()) return;
    try {
      await api.post("/admin/categories", { name: newName.trim(), order: cats.length + 1 });
      setNewName("");
      toast.success("Categoría creada");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const remove = async (id) => {
    if (!window.confirm("¿Eliminar categoría y todos sus productos?")) return;
    try {
      await api.delete(`/admin/categories/${id}`);
      toast.success("Eliminada");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const saveEdit = async (id) => {
    try {
      await api.put(`/admin/categories/${id}`, { name: editName });
      setEditingId(null);
      toast.success("Actualizada");
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const move = async (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= cats.length) return;
    const a = cats[idx],
      b = cats[target];
    try {
      await Promise.all([
        api.put(`/admin/categories/${a.id}`, { order: b.order }),
        api.put(`/admin/categories/${b.id}`, { order: a.order }),
      ]);
      load();
    } catch (e) {
      toast.error("Error reordenando");
    }
  };

  return (
    <div className="max-w-3xl" data-testid="admin-categories">
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <h2 className="font-heading font-bold text-xl text-gray-900 mb-1">Categorías</h2>
        <p className="text-sm text-gray-500 mb-4">Creá, editá y reordená las categorías del menú.</p>
        <div className="flex gap-2">
          <input
            data-testid="cat-new-name"
            className="flex-1 h-11 border border-gray-200 rounded-lg px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            placeholder="Nombre de la categoría (ej: Pizzas)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <button
            data-testid="cat-create"
            onClick={create}
            className="h-11 px-4 rounded-lg bg-primary text-white font-bold flex items-center gap-1 shadow-md shadow-primary/20"
          >
            <Plus size={16} /> Crear
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {cats.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm">Sin categorías todavía.</p>
        ) : (
          cats.map((c, idx) => (
            <div
              key={c.id}
              className="flex items-center gap-3 px-5 py-3 border-b border-gray-100 last:border-0"
              data-testid={`cat-row-${c.id}`}
            >
              <div className="flex flex-col">
                <button
                  className="h-6 w-6 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
                  disabled={idx === 0}
                  onClick={() => move(idx, -1)}
                  data-testid={`cat-up-${c.id}`}
                >
                  <ArrowUp size={14} className="mx-auto" />
                </button>
                <button
                  className="h-6 w-6 rounded hover:bg-gray-100 text-gray-400 disabled:opacity-30"
                  disabled={idx === cats.length - 1}
                  onClick={() => move(idx, 1)}
                  data-testid={`cat-down-${c.id}`}
                >
                  <ArrowDown size={14} className="mx-auto" />
                </button>
              </div>
              {editingId === c.id ? (
                <>
                  <input
                    className="flex-1 h-10 border border-gray-200 rounded-lg px-3 text-sm"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <button
                    onClick={() => saveEdit(c.id)}
                    className="h-9 w-9 rounded-lg bg-green-500 text-white flex items-center justify-center"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="h-9 w-9 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-semibold text-gray-900">{c.name}</span>
                  <button
                    data-testid={`cat-edit-${c.id}`}
                    onClick={() => {
                      setEditingId(c.id);
                      setEditName(c.name);
                    }}
                    className="h-9 w-9 rounded-lg hover:bg-gray-100 text-gray-500 flex items-center justify-center"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    data-testid={`cat-delete-${c.id}`}
                    onClick={() => remove(c.id)}
                    className="h-9 w-9 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center"
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
