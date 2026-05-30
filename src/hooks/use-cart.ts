/**
 * use-cart.ts
 * Hook de carrinho/orçamento persistido no localStorage.
 * Escopo por marca (brandSlug) para não misturar carrinhos de marcas diferentes.
 */

import { useState, useEffect, useCallback } from "react";

export type CartItem = {
  productId: string;
  productName: string;
  productSlug: string;
  image?: string;
  selectedSize?: string;
  selectedColor?: string;
  selectedColorName?: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
};

export type CartState = {
  brandSlug: string;
  brandId: string;
  items: CartItem[];
};

function storageKey(brandSlug: string) {
  return `cart:${brandSlug}`;
}

function loadCart(brandSlug: string): CartItem[] {
  try {
    const raw = localStorage.getItem(storageKey(brandSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCart(brandSlug: string, items: CartItem[]) {
  try {
    localStorage.setItem(storageKey(brandSlug), JSON.stringify(items));
  } catch {}
}

export function useCart(brandSlug: string) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart(brandSlug));
  const [open, setOpen] = useState(false);

  // Sincroniza com localStorage
  useEffect(() => {
    saveCart(brandSlug, items);
  }, [items, brandSlug]);

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      // Verifica se já existe item idêntico (mesmo produto + tamanho + cor)
      const key = `${item.productId}|${item.selectedSize ?? ""}|${item.selectedColor ?? ""}`;
      const existing = prev.find(
        (i) =>
          `${i.productId}|${i.selectedSize ?? ""}|${i.selectedColor ?? ""}` === key,
      );
      if (existing) {
        return prev.map((i) =>
          `${i.productId}|${i.selectedSize ?? ""}|${i.selectedColor ?? ""}` === key
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        );
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, qty: number) => {
    if (qty < 1) return;
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, quantity: qty } : item)));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const total = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    items,
    total,
    count,
    open,
    setOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  };
}
