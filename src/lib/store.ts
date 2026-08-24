import type React from "react";

export type ProductVariant = {
  id: string;
  product_id: string;
  color: string;
  precio: number | string;
  precio_usd?: number | string | null;
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

/** Busca el producto por id (tolerando espacios y formato compuesto id:var:talle) o por nombre. */
export function findProduct(products: Product[], key: string) {
  const rawKey = String(key ?? "").trim();
  if (!rawKey) return undefined;

  // Extraer el ID base si la clave tiene formato id:variantId:talle
  const baseId = rawKey.split(":")[0]?.trim() || rawKey;

  // Limpiar sufijos como (Presentación: ...) o (Talle: ...) del nombre si la clave viene como nombre de ítem
  const cleanName = rawKey.replace(/\s*\((?:Presentación|Talle):[^)]+\)/gi, "").trim();

  return (
    products.find((p) => String(p.id ?? "").trim() === rawKey) ??
    products.find((p) => String(p.id ?? "").trim() === baseId) ??
    products.find((p) => slug(p.id) === slug(baseId)) ??
    products.find((p) => slug(p.nombre) === slug(rawKey)) ??
    products.find((p) => slug(p.nombre) === slug(cleanName)) ??
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

/** ¿La categoría o nombre del producto (o del ítem del carrito) corresponde a suplementos? */
export function isSuplemento(categoria?: string, nombre?: string) {
  const cat = String(categoria ?? "").toLowerCase().normalize("NFC");
  const nom = String(nombre ?? "").toLowerCase().normalize("NFC");

  const catKeywords = ["suplement", "nutricion", "proteina", "creatina"];
  const nameKeywords = [
    "suplemento", "creatina", "proteina", "protein", "whey",
    "bcaa", "glutamin", "colageno", "collagen", "pre entren",
    "pre-workout", "preworkout", "gainer", "multivitaminico", "star nutrition"
  ];

  if (catKeywords.some((kw) => cat.includes(kw))) return true;
  if (nameKeywords.some((kw) => nom.includes(kw))) return true;

  return false;
}

/* ---------- Reglas de categoría (descuentos y mínimos dinámicos) ---------- */

export type CategoryTier = { units: number; percent: number };

export type CategoryRule = {
  discountTiers: CategoryTier[];
  minUnits?: number;
  minAmount?: number;
};

/** Normaliza el nombre de una categoría para usarla como clave (remueve acentos y minúsculas) */
export const normCat = (s: string) =>
  String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/** Devuelve la categoría limpia para administración */
export function getBaseCategory(rawCat: string): string {
  return String(rawCat ?? "").trim();
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
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) rule.discountTiers = parsed;
      } catch { /* ignore */ }
    } else if (um) {
      const rule = getOrCreate(normCat(um[1]!));
      const n = Number(val); if (n > 0) rule.minUnits = n;
    } else if (am) {
      const rule = getOrCreate(normCat(am[1]!));
      const n = Number(val); if (n > 0) rule.minAmount = n;
    }
  }

  // Reglas de descuento por defecto para Perfumes Árabes (5u -> 5%, 10u -> 10%)
  if (!rules["perfumes arabes"]?.discountTiers?.length && !rules["perfumes arabe"]?.discountTiers?.length) {
    const arabesDefault: CategoryRule = {
      ...rules["perfumes arabes"],
      discountTiers: [
        { units: 5, percent: 5 },
        { units: 10, percent: 10 },
      ],
    };
    rules["perfumes arabes"] = arabesDefault;
    rules["perfumes arabe"] = arabesDefault;
  }

  // Reglas de descuento por defecto para Perfumes Diseñador (3u -> 5%, 7u -> 7%)
  if (
    !rules["perfumes de disenador"]?.discountTiers?.length &&
    !rules["perfumes disenador"]?.discountTiers?.length
  ) {
    const disenadorDefault: CategoryRule = {
      ...rules["perfumes de disenador"],
      discountTiers: [
        { units: 3, percent: 5 },
        { units: 7, percent: 7 },
      ],
    };
    rules["perfumes de disenador"] = disenadorDefault;
    rules["perfumes disenador"] = disenadorDefault;
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
 * Soporta match exacto, sin "de", singular/plural y prefijo.
 */
export function findRuleForCat(
  catNorm: string,
  rules: Record<string, CategoryRule>,
): { key: string; rule: CategoryRule } | undefined {
  if (!catNorm) return undefined;
  if (rules[catNorm]) return { key: catNorm, rule: rules[catNorm] };

  // Variante quitando "de"
  const catWithoutDe = catNorm.replace(/\bde\b\s*/gi, "").replace(/\s+/g, " ").trim();
  if (rules[catWithoutDe]) return { key: catWithoutDe, rule: rules[catWithoutDe] };

  // Variante singular/plural
  const catPlural = catNorm.endsWith("s") ? catNorm : catNorm + "s";
  const catSingular = catNorm.endsWith("s") ? catNorm.slice(0, -1) : catNorm;
  if (rules[catPlural]) return { key: catPlural, rule: rules[catPlural] };
  if (rules[catSingular]) return { key: catSingular, rule: rules[catSingular] };

  // Match por prefijo (el prefijo más largo gana)
  let best: { key: string; rule: CategoryRule } | undefined;
  for (const [ruleKey, rule] of Object.entries(rules)) {
    const cleanRuleKey = ruleKey.replace(/\bde\b\s*/gi, "").replace(/\s+/g, " ").trim();
    if (
      (catNorm.startsWith(ruleKey) || (cleanRuleKey && catWithoutDe.startsWith(cleanRuleKey))) &&
      (!best || ruleKey.length > best.key.length)
    ) {
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
    const catNorm = normCat(raw);

    // Busca la regla con mínimo (minUnits o minAmount) más aplicable para este ítem.
    // Recorre todas las reglas y elige la que tenga mínimo y mejor match (más larga).
    let minRuleKey: string | undefined;
    let minRuleKeyLen = -1;
    const catWithoutDe = catNorm.replace(/\bde\b\s*/gi, "").replace(/\s+/g, " ").trim();

    for (const [ruleKey, rule] of Object.entries(rules)) {
      if (!rule.minUnits && !rule.minAmount) continue;
      const cleanRuleKey = ruleKey.replace(/\bde\b\s*/gi, "").replace(/\s+/g, " ").trim();
      const matches =
        catNorm === ruleKey ||
        catWithoutDe === ruleKey ||
        catWithoutDe === cleanRuleKey ||
        catNorm.startsWith(ruleKey) ||
        catWithoutDe.startsWith(cleanRuleKey);
      if (matches && ruleKey.length > minRuleKeyLen) {
        minRuleKey = ruleKey;
        minRuleKeyLen = ruleKey.length;
      }
    }

    if (minRuleKey) {
      catUnits[minRuleKey] = (catUnits[minRuleKey] ?? 0) + item.qty;
      catAmount[minRuleKey] = (catAmount[minRuleKey] ?? 0) + item.qty * item.unitPrice;
    }
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
