import type React from "react";

export type ProductVariant = {
  id: string;
  product_id: string;
  color: string;
  precio: number | string;
  stock?: string | null;
  imagen_url?: string | null;
  talles_disponibles?: string[];
};

export type Product = {
  id?: string;
  nombre?: string;
  categoria?: string;
  precio?: string;
  precio_oferta?: string;
  imagen_url?: string;
  descripcion?: string;
  destacado?: string;
  oferta?: string;
  stock?: string;
  descuento?: string;
  color_predeterminado?: string | null;
  ventas_semana?: number;
  variants?: ProductVariant[];
  [key: string]: string | number | ProductVariant[] | undefined | null;
};

export type Banner = {
  id?: string;
  titulo?: string;
  subtitulo?: string;
  imagen_url?: string;
  link?: string;
  activo?: string;
  precio?: string;
};

export type SiteConfig = Record<string, string>;

export type StoreData = {
  products: Product[];
  banners: Banner[];
  config: SiteConfig;
};

export const isYes = (v?: string) => String(v ?? "").trim().toUpperCase() === "SI";

export const toNumber = (v?: string) =>
  Number(String(v ?? "").replace(/[^\d.-]/g, "")) || 0;

export const money = (v?: string | number) =>
  "$" + Math.round(typeof v === "number" ? v : toNumber(v)).toLocaleString("es-AR");

export const hasOffer = (p: Product) => isYes(p.oferta) && toNumber(p.precio_oferta) > 0;

export const priceOf = (p: Product) =>
  hasOffer(p) ? toNumber(p.precio_oferta) : toNumber(p.precio);

/** Convierte links de Google Drive a una URL de imagen directa. */
export function imageUrl(raw?: string) {
  const url = (raw ?? "").trim();
  if (!url) return "";
  const m =
    url.match(/\/file\/d\/([\w-]+)/) ||
    url.match(/[?&]id=([\w-]+)/) ||
    url.match(/\/d\/([\w-]+)/);
  if (url.includes("drive.google.com") && m) {
    return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  }
  return url;
}

/** Extrae el id de un archivo de Google Drive, si el link es de Drive. */
export function driveId(raw?: string) {
  const url = (raw ?? "").trim();
  if (!url.includes("drive.google.com") && !url.includes("googleusercontent.com")) return "";
  const m =
    url.match(/\/file\/d\/([\w-]+)/) ||
    url.match(/[?&]id=([\w-]+)/) ||
    url.match(/\/d\/([\w-]+)/);
  return m ? m[1]! : "";
}

/** Maneja el error de carga probando otras variantes de URL de Drive. */
export function onImageError(raw?: string) {
  return (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const id = driveId(raw);
    const step = Number(img.dataset['retry'] ?? "0");
    const variants = id
      ? [
          `https://drive.google.com/thumbnail?id=${id}&sz=w1200`,
          `https://lh3.googleusercontent.com/d/${id}=s1200`,
        ]
      : [];
    if (step < variants.length) {
      img.dataset['retry'] = String(step + 1);
      img.src = variants[step]!;
      return;
    }
    img.src = FALLBACK_IMAGE;
  };
}

export const FALLBACK_IMAGE =
  "https://placehold.co/600x600/f4f4f5/71717a?text=Sin+imagen";

export function waLink(config: SiteConfig, productName?: string) {
  const phone = (config['whatsapp_individual'] ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(
    productName ? `Hola! Te escribo por: ${productName}` : "Hola! Quiero hacer una consulta.",
  );
  return `https://wa.me/${phone}?text=${text}`;
}

export function categoriesOf(products: Product[]) {
  return [...new Set(products.map((p) => (p.categoria ?? "").trim()).filter(Boolean))];
}

/** Lee la columna "Whatsapp" de la planilla, sin importar mayúsculas ni espacios. */
export function isWhatsappOnly(p: Product) {
  for (const [key, value] of Object.entries(p)) {
    if (key.trim().toLowerCase().replace(/\s+/g, "") === "whatsapp") return isYes(typeof value === "string" ? value : undefined);
  }
  return false;
}

const slug = (v?: string) =>
  String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Busca el producto por id (tolerando espacios) o por nombre, para que no falle si movés celdas. */
export function findProduct(products: Product[], key: string) {
  const k = String(key ?? "").trim();
  return (
    products.find((p) => String(p.id ?? "").trim() === k) ??
    products.find((p) => slug(p.id) === slug(k)) ??
    products.find((p) => slug(p.nombre) === slug(k)) ??
    undefined
  );
}


/* ---------- Descuentos por cantidad ---------- */

export type Tier = { units: number; percent: number };

/** Lee las columnas tipo "5 unidades" = "2.50%" de la planilla. */
export function tiersOf(p: Product): Tier[] {
  if (!isYes(p.descuento)) return [];
  const tiers: Tier[] = [];
  for (const [key, value] of Object.entries(p)) {
    const m = key.match(/^(\d+)\s*unidad/i);
    if (!m) continue;
    const percent = Number(String(value ?? "").replace(/[^\d.,]/g, "").replace(",", ".")) || 0;
    const units = Number(m[1]);
    if (units > 0 && percent > 0) tiers.push({ units, percent });
  }
  return tiers.sort((a, b) => a.units - b.units);
}

/** Porcentaje de descuento que corresponde a esa cantidad. */
export function discountFor(p: Product, qty: number) {
  const tiers = tiersOf(p);
  let percent = 0;
  for (const t of tiers) if (qty >= t.units) percent = t.percent;
  return percent;
}

export function unitPriceFor(p: Product, qty: number, basePrice = priceOf(p)) {
  const base = basePrice;
  return base * (1 - discountFor(p, qty) / 100);
}

/* ---------- Suplementos: compra mínima (legado) ---------- */

export const SUPLEMENTOS_MIN = 250000;

export const SUPLEMENTOS_MSG =
  "La compra mínima para suplementos es de $250.000. Agregá más productos al carrito y llevate todo junto!";

/** ¿La categoría del producto (o del ítem del carrito) es suplementos? */
export function isSuplemento(categoria?: string) {
  return String(categoria ?? "")
    .toLowerCase()
    .includes("suplemento");
}

/* ---------- Reglas de categoría (descuentos y mínimos dinámicos) ---------- */

export type CategoryTier = { units: number; percent: number };

export type CategoryRule = {
  discountTiers: CategoryTier[];
  minUnits?: number;
  minAmount?: number;
};

/** Normaliza el nombre de una categoría para usarla como clave */
export const normCat = (s: string) =>
  String(s ?? "").trim().toLowerCase().normalize("NFC");

/** Agrupa subcategorías conocidas en su categoría base (ej: "Perfumes Arabes" -> "Perfumes") */
export function getBaseCategory(rawCat: string): string {
  const clean = String(rawCat ?? "").trim();
  const lower = clean.toLowerCase().normalize("NFC");
  if (lower.startsWith("perfume")) return "Perfumes";
  if (lower.startsWith("suplement")) return "Suplementos";
  if (lower.startsWith("zapatilla")) return "Zapatillas";
  return clean;
}

/** Lee las reglas por categoría desde site_config */
export function parseCategoryRules(config: SiteConfig): Record<string, CategoryRule> {
  const rules: Record<string, CategoryRule> = {};
  const getOrCreate = (cat: string): CategoryRule => {
    if (!rules[cat]) rules[cat] = { discountTiers: [] };
    return rules[cat];
  };
  for (const [key, val] of Object.entries(config)) {
    const dm = key.match(/^cat_discount_(.+)$/i);
    const um = key.match(/^cat_min_units_(.+)$/i);
    const am = key.match(/^cat_min_amount_(.+)$/i);
    if (dm) {
      const rule = getOrCreate(normCat(dm[1]!));
      try { rule.discountTiers = JSON.parse(val); } catch { /* ignore */ }
    } else if (um) {
      const rule = getOrCreate(normCat(um[1]!));
      const n = Number(val); if (n > 0) rule.minUnits = n;
    } else if (am) {
      const rule = getOrCreate(normCat(am[1]!));
      const n = Number(val); if (n > 0) rule.minAmount = n;
    }
  }
  return rules;
}

/** % de descuento de categoría dado el total de unidades en carrito */
export function categoryDiscountForUnits(tiers: CategoryTier[], totalUnits: number): number {
  let percent = 0;
  for (const tier of tiers ?? []) {
    if (totalUnits >= tier.units) percent = tier.percent;
  }
  return percent;
}

/**
 * Busca la regla más aplicable para una categoría.
 * Primero intenta match exacto; si no, busca por prefijo (más específico gana).
 * Ej: "perfumes árabe" encuentra la regla "perfumes".
 */
export function findRuleForCat(
  catNorm: string,
  rules: Record<string, CategoryRule>,
): { key: string; rule: CategoryRule } | undefined {
  if (rules[catNorm]) return { key: catNorm, rule: rules[catNorm] };
  // Prefix match: el prefijo más largo gana
  let best: { key: string; rule: CategoryRule } | undefined;
  for (const [ruleKey, rule] of Object.entries(rules)) {
    if (catNorm.startsWith(ruleKey) && (!best || ruleKey.length > best.key.length)) {
      best = { key: ruleKey, rule };
    }
  }
  return best;
}

export type CategoryMinViolation = {
  category: string;   // nombre para mostrar
  type: "units" | "amount";
  min: number;
  current: number;
};

/**
 * Retorna las violaciones de mínimos de compra para el carrito actual.
 * Las subcategorías (ej. "Perfumes Árabe") se agrupan bajo la regla padre ("Perfumes").
 */
export function checkCategoryMins(
  items: { categoria?: string; qty: number; unitPrice: number }[],
  rules: Record<string, CategoryRule>,
): CategoryMinViolation[] {
  // Acumula totales agrupados por la clave de regla (no por la categoría exacta del ítem)
  const catUnits: Record<string, number> = {};
  const catAmount: Record<string, number> = {};

  for (const item of items) {
    const raw = (item.categoria ?? "").trim();
    if (!raw) continue;
    const match = findRuleForCat(normCat(raw), rules);
    if (!match) continue; // sin regla configurada para esta categoría
    catUnits[match.key] = (catUnits[match.key] ?? 0) + item.qty;
    catAmount[match.key] = (catAmount[match.key] ?? 0) + item.qty * item.unitPrice;
  }

  const violations: CategoryMinViolation[] = [];
  for (const [key, rule] of Object.entries(rules)) {
    const units = catUnits[key] ?? 0;
    if (units === 0) continue;
    // Display: capitaliza la clave de regla (ej "perfumes" → "Perfumes")
    const display = key.charAt(0).toUpperCase() + key.slice(1);
    if (rule.minUnits && units < rule.minUnits) {
      violations.push({ category: display, type: "units", min: rule.minUnits, current: units });
    }
    const amount = catAmount[key] ?? 0;
    if (rule.minAmount && amount < rule.minAmount) {
      violations.push({ category: display, type: "amount", min: rule.minAmount, current: amount });
    }
  }
  return violations;
}
