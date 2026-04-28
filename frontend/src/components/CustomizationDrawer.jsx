import { useState } from "react";
import { X, Plus, Minus } from "lucide-react";

export default function CustomizationDrawer({ type, item, onClose, onConfirm }) {
  const [selected, setSelected] = useState([]);
  const [quantity, setQuantity] = useState(1);

  const toggle = (opt) => {
    setSelected((prev) =>
      prev.find((o) => o.id === opt.id)
        ? prev.filter((o) => o.id !== opt.id)
        : [...prev, opt]
    );
  };

  const extras = selected.reduce((s, o) => s + (o.price_delta || 0), 0);
  const lineTotal = (item.price + extras) * quantity;

  const handleConfirm = () => {
    onConfirm({
      type,
      refId: item.id,
      name: item.name,
      basePrice: item.price,
      image: item.image,
      quantity,
      selectedOptions: selected,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 animate-fade-in"
      onClick={onClose}
      data-testid="customization-drawer"
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl pb-6 animate-slide-up max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-heading font-bold text-lg text-gray-900">
              {item.name}
            </h3>
            <p className="text-xs text-gray-500">Personalizá tu pedido</p>
          </div>
          <button
            data-testid="close-drawer"
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {(item.image || item.images?.length > 0) && (
            <div className="mb-4 -mx-6 px-6">
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {[item.image, ...(item.images || [])]
                  .filter(Boolean)
                  .filter((v, i, a) => a.indexOf(v) === i)
                  .map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      className="h-36 w-44 rounded-xl object-cover flex-shrink-0 border border-gray-100"
                    />
                  ))}
              </div>
            </div>
          )}
          {item.options?.length > 0 ? (
            <>
              <p className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-2">
                Opciones
              </p>
              <div className="flex flex-col divide-y divide-gray-100">
                {item.options.map((opt) => {
                  const isSel = selected.find((o) => o.id === opt.id);
                  return (
                    <label
                      key={opt.id}
                      data-testid={`opt-${opt.id}`}
                      className="flex items-center justify-between py-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={!!isSel}
                          onChange={() => toggle(opt)}
                          className="h-5 w-5 rounded accent-primary"
                        />
                        <span className="text-sm text-gray-800 font-medium">
                          {opt.name}
                        </span>
                      </div>
                      {opt.price_delta > 0 && (
                        <span className="text-sm font-bold text-primary">
                          +${opt.price_delta.toLocaleString("es-AR")}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              Este ítem no tiene opciones adicionales.
            </p>
          )}
        </div>

        <div className="px-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Cantidad</span>
            <div className="flex items-center gap-3 bg-gray-100 rounded-full p-1">
              <button
                data-testid="qty-decrease"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 active:scale-90 transition"
              >
                <Minus size={14} strokeWidth={3} />
              </button>
              <span className="font-bold text-gray-900 w-5 text-center" data-testid="qty-display">
                {quantity}
              </span>
              <button
                data-testid="qty-increase"
                onClick={() => setQuantity((q) => q + 1)}
                className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700 active:scale-90 transition"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
          </div>

          <button
            data-testid="confirm-add"
            onClick={handleConfirm}
            className="w-full h-14 bg-primary text-white rounded-full font-heading font-bold text-base flex items-center justify-between px-6 shadow-lg shadow-primary/30 active:scale-[0.98] transition-transform"
          >
            <span>Agregar al pedido</span>
            <span>${lineTotal.toLocaleString("es-AR")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
