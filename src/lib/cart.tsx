import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { storeQueryOptions } from "./store-query";
import {
  findProduct,
  unitPriceFor,
  priceOf,
  parseCategoryRules,
  categoryDiscountForUnits,
  findRuleForCat,
  normCat,
} from "./store";

export type CartItem = {
  id: string;
  productId?: string | undefined;
  nombre: string;
  qty: number;
  unitPrice: number;
  /** Precio de lista de la variante; permite recalcular descuentos por cantidad. */
  basePrice?: number | undefined;
  variantId?: string | undefined;
  variantColor?: string | undefined;
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
  base_price: number | null;
  variant_id: string | null;
  variant_color: string | null;
};

const Ctx = createContext<CartCtx | null>(null);

function toCartItem(row: CartRow): CartItem {
  return {
    id: row.item_id,
    productId: row.product_id ?? undefined,
    nombre: row.nombre,
    qty: row.qty,
    unitPrice: Number(row.unit_price),
    imagen: row.imagen ?? undefined,
    categoria: row.categoria ?? undefined,
    basePrice: row.base_price === null ? undefined : Number(row.base_price),
    variantId: row.variant_id ?? undefined,
    variantColor: row.variant_color ?? undefined,
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
    base_price: item.basePrice ?? null,
    variant_id: item.variantId ?? null,
    variant_color: item.variantColor ?? null,
  };
}

const CART_STORAGE_KEY = "offer_sync_cart_items";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const { data } = useQuery(storeQueryOptions);
  const { user, loading: authLoading } = useAuth();

  // Limpiar cualquier residuo de localStorage previo al montar
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(CART_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  }, []);

  // Ref siempre actualizado al usuario más reciente.
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // Sincronización con base de datos únicamente cuando el usuario está autenticado.
  // Sin cuenta, el carrito no tiene persistencia (se reinicia en F5).
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data: rows, error } = await supabase
        .from("cart_items")
        .select("item_id, product_id, nombre, qty, unit_price, imagen, categoria, base_price, variant_id, variant_color")
        .eq("user_id", user.id);

      if (cancelled) return;
      if (error) {
        console.error("[cart] error loading cart from DB:", error);
        return;
      }
      const dbItems = (rows ?? []).map(toCartItem);
      setItems(dbItems);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, authLoading]);

  const resolvedItems = useMemo(() => {
    const products = data?.products;
    const config = data?.config ?? {};
    if (!products || products.length === 0) return items;

    const catRules = parseCategoryRules(config);

    // Agrupa por clave de regla (no categoría exacta) — subcategorías quedan juntas
    const catTotals: Record<string, number> = {};
    for (const item of items) {
      const catNorm = normCat(item.categoria ?? "");
      if (!catNorm) continue;
      const match = findRuleForCat(catNorm, catRules);
      const key = match?.key ?? catNorm;
      catTotals[key] = (catTotals[key] ?? 0) + item.qty;
    }

    return items.map((item) => {
      const product = findProduct(products, item.productId || item.id || item.nombre);
      if (!product) return item;

      const catNorm = normCat(item.categoria ?? "");
      const match = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
      const catRule = match?.rule;
      const ruleKey = match?.key;

      let unitPrice: number;
      if (Array.isArray(catRule?.discountTiers) && catRule.discountTiers.length > 0 && ruleKey) {
        // Descuento de categoría: reemplaza al individual del producto
        const totalCatUnits = catTotals[ruleKey] ?? 0;
        const percent = categoryDiscountForUnits(catRule.discountTiers, totalCatUnits);
        const base = item.basePrice ?? priceOf(product);
        unitPrice = Math.round(base * (1 - percent / 100));
      } else {
        // Fallback: descuento individual por cantidad del producto
        unitPrice = Math.round(unitPriceFor(product, item.qty, item.basePrice));
      }

      return unitPrice === item.unitPrice ? item : { ...item, unitPrice };
    });
  }, [items, data?.products, data?.config]);

  const add = useCallback((item: CartItem) => {
    setItems((prev) => {
      const current = prev.find((entry) => entry.id === item.id);
      const next = current
        ? prev.map((entry) => (entry.id === item.id ? { ...item, qty: entry.qty + item.qty } : entry))
        : [...prev, item];
      const savedItem = next.find((entry) => entry.id === item.id)!;
      const uid = userRef.current?.id;
      if (uid) {
        void supabase
          .from("cart_items")
          .upsert(toCartRow(uid, savedItem), { onConflict: "user_id,item_id" })
          .then(({ error }) => {
            if (error) console.error("[cart] upsert error:", error);
          });
      }
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      const uid = userRef.current?.id;
      if (uid) {
        void supabase
          .from("cart_items")
          .delete()
          .eq("user_id", uid)
          .eq("item_id", id)
          .then(({ error }) => {
            if (error) console.error("[cart] delete error:", error);
          });
      }
      return next;
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setItems((prev) => {
      const next = prev.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item));
      const updated = next.find((item) => item.id === id);
      const uid = userRef.current?.id;
      if (uid && updated) {
        void supabase
          .from("cart_items")
          .upsert(toCartRow(uid, updated), { onConflict: "user_id,item_id" })
          .then(({ error }) => {
            if (error) console.error("[cart] setQty upsert error:", error);
          });
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    const uid = userRef.current?.id;
    if (uid) {
      void supabase
        .from("cart_items")
        .delete()
        .eq("user_id", uid)
        .then(({ error }) => {
          if (error) console.error("[cart] clear error:", error);
        });
    }
  }, []);

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
