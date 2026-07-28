"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  cartStorageKey,
  parseCart,
  setCartQuantity,
  type CartLine,
} from "@/lib/cart/cart";

type CartContextValue = {
  items: CartLine[];
  itemCount: number;
  ready: boolean;
  addItem: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setItems(parseCart(window.localStorage.getItem(cartStorageKey)));
      setReady(true);
    }, 0);

    function syncCart(event: StorageEvent) {
      if (event.key === cartStorageKey) {
        setItems(parseCart(event.newValue));
      }
    }
    window.addEventListener("storage", syncCart);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  }, [items, ready]);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((current) => setCartQuantity(current, productId, quantity));
  }, []);

  const addItem = useCallback((productId: string, quantity = 1) => {
    setItems((current) => {
      const existing = current.find((line) => line.productId === productId);
      return setCartQuantity(current, productId, (existing?.quantity ?? 0) + quantity);
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => setCartQuantity(current, productId, 0));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);
  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      itemCount,
      ready,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
    }),
    [addItem, clearCart, itemCount, items, ready, removeItem, setQuantity],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
