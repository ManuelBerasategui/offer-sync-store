import type { CartItem } from "@/lib/cart";

const KEY = "ti_checkout_items_v1";

export function saveCheckoutItems(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function loadCheckoutItems(): CartItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearCheckoutItems() {
  localStorage.removeItem(KEY);
}
