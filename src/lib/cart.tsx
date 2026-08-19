import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { storeQueryOptions } from "./store-query";
import { findProduct, unitPriceFor } from "./store";

export type CartItem = {
  id: string;
  productId?: string | undefined;
  nombre: string;
  qty: number;
  unitPrice: number;
  imagen?: string | undefined;
  categoria?: string | undefined;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  total: number;
  add: (item: CartItem) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
};

type CartRow = {
  item_id: string;
  product_id: string | null;
  nombre: string;
  qty: number;
  unit_price: number;
  imagen: string | null;
  categoria: string | null;
};

const STORAGE_KEY = "ti_cart_v1";
const Ctx = createContext<CartCtx | null>(null);

function readGuestCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function toCartItem(row: CartRow): CartItem {
  return {
    id: row.item_id,
    productId: row.product_id ?? undefined,
    nombre: row.nombre,
    qty: row.qty,
    unitPrice: Number(row.unit_price),
    imagen: row.imagen ?? undefined,
    categoria: row.categoria ?? undefined,
  };
}

function toCartRow(userId: string, item: CartItem) {
  return {
    user_id: userId,
    item_id: item.id,
    product_id: item.productId ?? null,
    nombre: item.nombre,
    qty: item.qty,
    unit_price: item.unitPrice,
    imagen: item.imagen ?? null,
    categoria: item.categoria ?? null,
  };
}

function mergeItems(serverItems: CartItem[], guestItems: CartItem[]) {
  const merged = new Map(serverItems.map((item) => [item.id, item]));
  for (const item of guestItems) {
    const current = merged.get(item.id);
    merged.set(item.id, current ? { ...item, qty: current.qty + item.qty } : item);
  }
  return [...merged.values()];
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { data } = useQuery(storeQueryOptions);
  const { user, loading: authLoading } = useAuth();

  // Con sesión, la base es la fuente de verdad. Al ingresar se migran los ítems del invitado.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    if (!user) {
      setItems(readGuestCart());
      return () => {
        cancelled = true;
      };
    }

    void (async () => {
      const { data: rows, error } = await supabase
        .from("cart_items")
        .select("item_id, product_id, nombre, qty, unit_price, imagen, categoria")
        .eq("user_id", user.id);

      if (cancelled || error) return;
      const merged = mergeItems((rows ?? []).map(toCartItem), readGuestCart());
      setItems(merged);

      if (merged.length > 0) {
        await supabase.from("cart_items").upsert(merged.map((item) => toCartRow(user.id, item)), {
          onConflict: "user_id,item_id",
        });
      }
      localStorage.removeItem(STORAGE_KEY);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const resolvedItems = useMemo(() => {
    const products = data?.products;
    if (!products || products.length === 0) return items;

    return items.map((item) => {
      const product = findProduct(products, item.productId || item.id || item.nombre);
      if (!product) return item;
      const unitPrice = Math.round(unitPriceFor(product, item.qty));
      return unitPrice === item.unitPrice ? item : { ...item, unitPrice };
    });
  }, [items, data?.products]);

  const saveGuestCart = useCallback((next: CartItem[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // El carrito en memoria continúa disponible aunque localStorage esté bloqueado.
    }
  }, []);

  const add = useCallback(
    (item: CartItem) => {
      setItems((prev) => {
        const current = prev.find((entry) => entry.id === item.id);
        const next = current
          ? prev.map((entry) => (entry.id === item.id ? { ...item, qty: entry.qty + item.qty } : entry))
          : [...prev, item];
        const savedItem = next.find((entry) => entry.id === item.id)!;
        if (user) {
          void supabase.from("cart_items").upsert(toCartRow(user.id, savedItem), { onConflict: "user_id,item_id" });
        } else {
          saveGuestCart(next);
        }
        return next;
      });
    },
    [user, saveGuestCart],
  );

  const remove = useCallback(
    (id: string) =>
      setItems((prev) => {
        const next = prev.filter((item) => item.id !== id);
        if (user) void supabase.from("cart_items").delete().eq("user_id", user.id).eq("item_id", id);
        else saveGuestCart(next);
        return next;
      }),
    [user, saveGuestCart],
  );

  const setQty = useCallback(
    (id: string, qty: number) =>
      setItems((prev) => {
        const next = prev.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
        const updated = next.find((item) => item.id === id);
        if (user && updated) {
          void supabase.from("cart_items").upsert(toCartRow(user.id, updated), { onConflict: "user_id,item_id" });
        } else {
          saveGuestCart(next);
        }
        return next;
      }),
    [user, saveGuestCart],
  );

  const clear = useCallback(() => {
    setItems([]);
    if (user) void supabase.from("cart_items").delete().eq("user_id", user.id);
    else saveGuestCart([]);
  }, [user, saveGuestCart]);

  const value = useMemo<CartCtx>(
    () => ({
      items: resolvedItems,
      count: resolvedItems.reduce((total, item) => total + item.qty, 0),
      total: resolvedItems.reduce((total, item) => total + item.qty * item.unitPrice, 0),
      add,
      remove,
      setQty,
      clear,
    }),
    [resolvedItems, add, remove, setQty, clear],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
