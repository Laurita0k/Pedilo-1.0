import { ShoppingBag } from "lucide-react";
import { useCart } from "../contexts/CartContext";

export default function FloatingCart({ onCheckout }) {
  const { count, total } = useCart();
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pointer-events-none px-4 pb-4"
      data-testid="floating-cart-wrapper"
    >
      <div className="pointer-events-auto w-full max-w-md">
        <button
          data-testid="floating-cart-btn"
          onClick={onCheckout}
          className="w-full h-14 rounded-full bg-primary text-white flex items-center justify-between px-5 cart-glow active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingBag size={22} strokeWidth={2.2} />
              <span className="absolute -top-2 -right-2 bg-white text-primary text-[11px] font-extrabold h-5 min-w-[20px] px-1 rounded-full flex items-center justify-center shadow">
                {count}
              </span>
            </div>
            <span className="font-heading font-bold text-base">Ver pedido</span>
          </div>
          <span className="font-bold">${total.toLocaleString("es-AR")}</span>
        </button>
      </div>
    </div>
  );
}
