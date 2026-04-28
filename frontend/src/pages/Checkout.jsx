import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Plus, Minus, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useCart } from "../contexts/CartContext";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, updateQty, removeItem, clear } = useCart();
  const [config, setConfig] = useState(null);
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [payment, setPayment] = useState("efectivo");
  const [cashAmount, setCashAmount] = useState("");

  useEffect(() => {
    api.get("/public/config").then((r) => setConfig(r.data)).catch(() => {});
  }, []);

  const minOrder = config?.min_order || 0;
  const meetsMin = total >= minOrder;

  const formatLine = (it) => {
    const extras = (it.selectedOptions || []).reduce(
      (s, o) => s + (o.price_delta || 0),
      0
    );
    const unit = it.basePrice + extras;
    return unit * it.quantity;
  };

  const buildWhatsAppMessage = () => {
    const lines = [];
    lines.push(`Hola! Quiero hacer este pedido a *${config?.name || "Lo de Juan"}*:\n`);
    items.forEach((it) => {
      const opts = (it.selectedOptions || []).map((o) => o.name).join(", ");
      const tag = it.type === "combo" ? "🍱 COMBO" : "•";
      lines.push(
        `${tag} ${it.quantity}x ${it.name}${opts ? ` (${opts})` : ""} — $${formatLine(it).toLocaleString("es-AR")}`
      );
    });
    lines.push("");
    lines.push(`*Total: $${total.toLocaleString("es-AR")}*`);
    lines.push(`📍 Dirección: ${address}`);
    lines.push(
      `💳 Pago: ${payment === "efectivo" ? `Efectivo${cashAmount ? ` (abono con $${cashAmount})` : ""}` : "Transferencia"}`
    );
    if (notes.trim()) lines.push(`📝 Notas: ${notes}`);
    return lines.join("\n");
  };

  const handleSend = async () => {
    if (items.length === 0) {
      toast.error("Tu carrito está vacío");
      return;
    }
    if (!address.trim()) {
      toast.error("Ingresá tu dirección de entrega");
      return;
    }
    if (!meetsMin) {
      toast.error(`Pedido mínimo $${minOrder.toLocaleString("es-AR")}`);
      return;
    }
    if (config && config.is_open === false) {
      toast.error("La tienda está cerrada en este momento");
      return;
    }
    const phone = (config?.whatsapp_number || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("El local aún no configuró su WhatsApp");
      return;
    }

    // Persist order first (so the admin sees it even if WhatsApp is not sent)
    const orderItems = items.map((it) => {
      const extras = (it.selectedOptions || []).reduce((s, o) => s + (o.price_delta || 0), 0);
      return {
        type: it.type,
        ref_id: it.refId,
        name: it.name,
        base_price: it.basePrice,
        image: it.image || "",
        quantity: it.quantity,
        selected_options: (it.selectedOptions || []).map((o) => ({
          id: o.id,
          name: o.name,
          price_delta: o.price_delta || 0,
        })),
        line_total: (it.basePrice + extras) * it.quantity,
      };
    });

    try {
      await api.post("/public/orders", {
        items: orderItems,
        total,
        address,
        notes,
        payment_method: payment,
        cash_amount: cashAmount || null,
      });
    } catch (e) {
      // Non-blocking: even if persistence fails, still allow WhatsApp send
      console.error("Order persist failed", e);
    }

    const msg = encodeURIComponent(buildWhatsAppMessage());
    const url = `https://wa.me/${phone}?text=${msg}`;
    window.open(url, "_blank");
    toast.success("Pedido enviado por WhatsApp");
    clear();
    setTimeout(() => navigate("/"), 800);
  };

  return (
    <div className="min-h-screen bg-white flex justify-center">
      <div className="app-shell w-full max-w-md bg-white min-h-screen pb-40" data-testid="checkout-page">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex items-center gap-3">
          <button
            data-testid="checkout-back"
            onClick={() => navigate("/")}
            className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 active:scale-95 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="font-heading font-bold text-lg text-gray-900">Tu pedido</h1>
            <p className="text-[11px] text-gray-500">Revisá antes de enviar</p>
          </div>
        </header>

        {items.length === 0 ? (
          <div className="px-5 py-20 text-center text-gray-500" data-testid="empty-cart">
            <p className="font-semibold">Tu carrito está vacío</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 text-primary font-bold underline"
            >
              Volver al menú
            </button>
          </div>
        ) : (
          <>
            {/* Items */}
            <section className="px-5 py-4">
              <div className="flex flex-col gap-3">
                {items.map((it) => {
                  const lineTotal = formatLine(it);
                  return (
                    <div
                      key={it.lineId}
                      className="flex gap-3 p-3 border border-gray-100 rounded-2xl bg-white"
                      data-testid={`cart-line-${it.lineId}`}
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {it.image && (
                          <img
                            src={it.image}
                            alt={it.name}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between gap-2">
                          <h4 className="font-heading font-bold text-sm text-gray-900 leading-tight truncate">
                            {it.type === "combo" ? "🍱 " : ""}
                            {it.name}
                          </h4>
                          <button
                            data-testid={`remove-${it.lineId}`}
                            onClick={() => removeItem(it.lineId)}
                            className="text-gray-400 hover:text-primary"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {it.selectedOptions?.length > 0 && (
                          <p className="text-[11px] text-gray-500 mt-0.5">
                            {it.selectedOptions.map((o) => o.name).join(", ")}
                          </p>
                        )}
                        <div className="flex justify-between items-center mt-2">
                          <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                            <button
                              data-testid={`dec-${it.lineId}`}
                              onClick={() => updateQty(it.lineId, it.quantity - 1)}
                              className="h-7 w-7 rounded-full bg-white shadow-sm flex items-center justify-center"
                            >
                              <Minus size={12} strokeWidth={3} />
                            </button>
                            <span className="font-bold text-sm w-4 text-center">
                              {it.quantity}
                            </span>
                            <button
                              data-testid={`inc-${it.lineId}`}
                              onClick={() => updateQty(it.lineId, it.quantity + 1)}
                              className="h-7 w-7 rounded-full bg-white shadow-sm flex items-center justify-center"
                            >
                              <Plus size={12} strokeWidth={3} />
                            </button>
                          </div>
                          <span className="font-bold text-sm text-gray-900">
                            ${lineTotal.toLocaleString("es-AR")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Address + Payment */}
            <section className="px-5 py-2 flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  Dirección de entrega
                </label>
                <input
                  data-testid="address-input"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Calle Falsa 123, Dpto 2B"
                  className="mt-1.5 w-full h-12 rounded-xl border border-gray-200 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">
                  Notas (opcional)
                </label>
                <textarea
                  data-testid="notes-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Tocá timbre fuerte, sin sal, etc."
                  rows={2}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">
                  Forma de pago
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "efectivo", label: "Efectivo" },
                    { id: "transferencia", label: "Transferencia" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      data-testid={`pay-${p.id}`}
                      onClick={() => setPayment(p.id)}
                      className={`h-12 rounded-xl border-2 font-bold text-sm transition-all ${
                        payment === p.id
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-gray-200 text-gray-600 bg-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {payment === "efectivo" && (
                  <input
                    data-testid="cash-amount"
                    type="text"
                    inputMode="numeric"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="¿Con cuánto abonás? (opcional)"
                    className="mt-2 w-full h-11 rounded-xl border border-gray-200 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  />
                )}
              </div>
            </section>

            {/* Totals + Send */}
            <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-4">
              <div className="pointer-events-auto w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-2xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
                    Total
                  </span>
                  <span className="font-heading text-2xl font-extrabold text-gray-900">
                    ${total.toLocaleString("es-AR")}
                  </span>
                </div>
                {minOrder > 0 && !meetsMin && (
                  <p className="text-[11px] text-primary font-semibold mb-2 text-right">
                    Pedido mínimo: ${minOrder.toLocaleString("es-AR")}
                  </p>
                )}
                <button
                  data-testid="send-whatsapp"
                  onClick={handleSend}
                  disabled={!meetsMin || !address.trim() || (config && config.is_open === false)}
                  className="w-full h-14 rounded-full bg-[#25D366] text-white font-heading font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <MessageCircle size={20} strokeWidth={2.4} />
                  {config && config.is_open === false ? "Tienda cerrada" : "Enviar pedido por WhatsApp"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
