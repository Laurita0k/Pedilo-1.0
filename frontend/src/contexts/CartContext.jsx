import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartContext = createContext(null);

const STORAGE_KEY = "pedilo_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = (item) => {
    // Each add is unique (could have different options) — push fresh line
    setItems((prev) => [
      ...prev,
      { ...item, lineId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
    ]);
  };

  const removeItem = (lineId) => {
    setItems((prev) => prev.filter((i) => i.lineId !== lineId));
  };

  const updateQty = (lineId, qty) => {
    setItems((prev) =>
      prev
        .map((i) => (i.lineId === lineId ? { ...i, quantity: Math.max(1, qty) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const clear = () => setItems([]);

  const { total, count } = useMemo(() => {
    let t = 0;
    let c = 0;
    for (const it of items) {
      const extras = (it.selectedOptions || []).reduce(
        (s, o) => s + (o.price_delta || 0),
        0
      );
      t += (it.basePrice + extras) * it.quantity;
      c += it.quantity;
    }
    return { total: t, count: c };
  }, [items]);

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQty, clear, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
