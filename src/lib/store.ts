import type React from "react";

export type ProductVariant = {
  id: string;
  product_id: string;
  color: string;
  precio: number | string;
  precio_usd?: number | string | null;
  precio_base?: number | string | null;
  moneda_base?: "USD" | "ARS" | string | null;
  stock?: string | null;
  imagen_url?: string | null;
  talles_disponibles?: string[];
};

export type Product = {
  id?: string;
  nombre?: string;
  categoria?: string;
  precio?: string;
  precio_usd?: number | string | null;
  precio_base?: number | string | null;
  moneda_base?: "USD" | "ARS" | string | null;
  precio_oferta?: string;
  precio_oferta_usd?: number | string | null;
  precio_oferta_base?: number | string | null;
  moneda_oferta_base?: "USD" | "ARS" | string | null;
  imagen_url?: string;
  descripcion?: string;
  destacado?: string;
  oferta?: string;
  stock?: string;
  descuento?: string;
  color_predeterminado?: string | null;
  es_zapatilla?: boolean | string | null;
  ventas_semana?: number;
  variants?: ProductVariant[];
  [key: string]: string | number | boolean | ProductVariant[] | undefined | null | Record<string, unknown>;
};

export type Banner = {
  id?: string;
  titulo?: string;
  subtitulo?: string;
  imagen_url?: string;
  link?: string;
  activo?: string;
  precio?: string;
  precio_usd?: number | string | null;
  precio_base?: number | string | null;
  moneda_base?: "USD" | "ARS" | string | null;
  precio_actualizado_en?: string | null;
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

export const hasOffer = (p: Product) => isYes(p.oferta);

export function originalPriceOf(p: Product): number {
  return toNumber(p.precio);
}

export function priceOf(p: Product): number {
  if (hasOffer(p)) {
    const offerP = toNumber(p.precio_oferta);
    const regP = toNumber(p.precio);
    if (offerP > 0 && (regP <= 0 || offerP < regP)) {
      return offerP;
    }
    if (regP > 0) {
      return Math.round(regP * 0.9);
    }
    return offerP > 0 ? offerP : regP;
  }
  return toNumber(p.precio);
}

export function offerDiscountPct(p: Product): number {
  if (!hasOffer(p)) return 0;
  const orig = originalPriceOf(p);
  const cur = priceOf(p);
  if (orig > cur && orig > 0) {
    return Math.round(((orig - cur) / orig) * 100);
  }
  return 10;
}

export const DEFAULT_TRANSFER_DISCOUNT = 7;

export function transferDiscountPct(config?: SiteConfig): number {
  const custom = Number(config?.["transferencia_descuento_pct"]);
  return Number.isFinite(custom) && custom >= 0 && custom <= 50 ? custom : DEFAULT_TRANSFER_DISCOUNT;
}

export function transferPrice(price: number, discountPct = DEFAULT_TRANSFER_DISCOUNT): number {
  if (price <= 0) return 0;
  return Math.round(price * (1 - discountPct / 100));
}

export function getBankInfo(config?: SiteConfig) {
  return {
    alias: config?.["transferencia_alias"] || "teimportamos.mp",
    cbu: config?.["transferencia_cbu"] || "0000003100012345678901",
    titular: config?.["transferencia_titular"] || "Te Importamos Argentina",
    banco: config?.["transferencia_banco"] || "Mercado Pago / Banco",
    descuentoPct: transferDiscountPct(config),
  };
}

const ALLOWED_IMAGE_PROTOCOLS = new Set(["http:", "https:", "data:", "blob:"]);

/** Convierte links de Google Drive a una URL de imagen directa y valida protocolos seguros contra XSS. */
export function imageUrl(raw?: string | null): string {
  const url = (raw ?? "").trim();
  if (!url) return "";
  const m =
    url.match(/\/file\/d\/([\w-]+)/) ||
    url.match(/[?&]id=([\w-]+)/) ||
    url.match(/\/d\/([\w-]+)/);
  if (url.includes("drive.google.com") && m) {
    return `https://lh3.googleusercontent.com/d/${m[1]}=w1200`;
  }
  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }
  try {
    const parsed = new URL(url, "https://dummy-base.local");
    if (ALLOWED_IMAGE_PROTOCOLS.has(parsed.protocol)) {
      return url;
    }
  } catch {
    // invalid URL
  }
  return "";
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

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

export function sanitizeUrl(url?: string | null): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  try {
    const parsed = new URL(trimmed, "https://dummy-base.local");
    if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return trimmed;
    }
  } catch {
    // invalid URL
  }
  return "#";
}

export function waLink(config: SiteConfig, messageOrProduct?: string) {
  const phone = (config['whatsapp_individual'] ?? "").replace(/\D/g, "");
  let text = "Hola! Quiero hacer una consulta.";
  if (messageOrProduct) {
    if (
      messageOrProduct.startsWith("Hola") ||
      messageOrProduct.startsWith("¡Hola") ||
      messageOrProduct.startsWith("Consulta")
    ) {
      text = messageOrProduct;
    } else {
      text = `Hola! Te escribo por: ${messageOrProduct}`;
    }
  }
  return sanitizeUrl(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`);
}

export function categoriesOf(products: Product[]) {
  return [...new Set(products.map((p) => (p.categoria ?? "").trim()).filter(Boolean))];
}

/** Lee la columna "Whatsapp" de la planilla, sin importar mayúsculas ni espacios. */
export function isWhatsappOnly(p: Product) {
  if (priceOf(p) > 0) return false;
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
  const baseId = rawKey.split(":")[0]?.trim() || rawKey;
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

export function discountFor(p: Product, qty: number) {
  const tiers = tiersOf(p);
  let percent = 0;
  for (const t of tiers) if (qty >= t.units) percent = t.percent;
  // Tercer tramo global: 20+ unidades → mínimo 12% para TODOS los productos.
  if (qty >= 20) percent = Math.max(percent, 12);
  return percent;
}

export function unitPriceFor(p: Product, qty: number, basePrice = priceOf(p)) {
  return basePrice * (1 - discountFor(p, qty) / 100);
}

/* ---------- Suplementos: compra mínima (legado) ---------- */

export const SUPLEMENTOS_MIN = 250000;
export const SUPLEMENTOS_MSG =
  "La compra mínima para suplementos es de $250.000. Agregá más productos al carrito y llevate todo junto!";

export function isSuplemento(categoria?: string, nombre?: string) {
  const cat = String(categoria ?? "").toLowerCase().normalize("NFC");
  const nom = String(nombre ?? "").toLowerCase().normalize("NFC");
  const catKeywords = ["suplement", "nutricion", "proteina", "creatina"];
  const nameKeywords = [
    "suplemento", "creatina", "proteina", "protein", "whey",
    "bcaa", "glutamin", "colageno", "collagen", "pre entren",
    "pre-workout", "preworkout", "gainer", "multivitaminico", "star nutrition",
  ];
  if (catKeywords.some((kw) => cat.includes(kw))) return true;
  if (nameKeywords.some((kw) => nom.includes(kw))) return true;
  return false;
}

/* ---------- Mates: identificación canónica (uso interno / sugerencia de admin) ---------- */

/**
 * Heurística para detectar si un producto es un Mate por nombre/categoría.
 * YA NO SE USA EN RUNTIME para decidir MOQ — solo como sugerencia en el panel admin
 * y para retrocompatibilidad en tests legacy.
 * La fuente de verdad en runtime es `moq_group` (campo metadata del producto).
 */
export function isMate(nombre?: string, categoria?: string): boolean {
  const nom = String(nombre ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Si el nombre contiene 'kit', 'combo', 'set' o 'pack', NO es un mate individual (no aplica MOQ de mates)
  if (/(?:^|[\s,;/\-_(])(?:kit|combo|set|pack)(?:[\s,;/\-_)s]|$)/i.test(nom)) {
    return false;
  }

  const cat = String(categoria ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (cat === "mates" || cat === "mate") return true;

  return /(?:^|[\s,;/\-_(])mate(?:[\s,;/\-_)s]|$)/i.test(nom);
}

/* ---------- Reglas de categoría (descuentos y mínimos dinámicos) ---------- */

export type CategoryTier = { units: number; percent: number };

export type CategoryRule = {
  discountTiers: CategoryTier[];
  minUnits?: number;
  minAmount?: number;
};

/** Normaliza el nombre de una categoría para usarla como clave (remueve acentos y minúsculas) */
export const normCat = (s: string) => {
  const norm = String(s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (norm === "suplementacion" || norm === "suplemento") return "suplementos";
  if (norm === "perfume arabe" || norm === "perfume arabes") return "perfumes arabes";
  if (norm === "perfume disenador" || norm === "perfumes de disenador" || norm === "perfume de disenador") return "perfumes disenador";
  if (norm === "mate") return "mates";
  if (norm === "zapatilla") return "zapatillas";
  return norm;
};

export function getBaseCategory(rawCat: string): string {
  return String(rawCat ?? "").trim();
}

/** Lee las reglas por categoría desde site_config */
export function parseCategoryRules(config: SiteConfig): Record<string, CategoryRule> {
  const rules: Record<string, CategoryRule> = {};
  const getOrCreate = (cat: string): CategoryRule => {
    const key = normCat(cat);
    if (!rules[key]) rules[key] = { discountTiers: [] };
    return rules[key];
  };
  for (const [key, val] of Object.entries(config)) {
    const dm = key.match(/^cat_discount_(.+)$/i);
    const um = key.match(/^cat_min_units_(.+)$/i);
    const am = key.match(/^cat_min_amount_(.+)$/i);
    if (dm) {
      const rule = getOrCreate(dm[1]!);
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) rule.discountTiers = parsed;
      } catch { /* ignore */ }
    } else if (um) {
      const rule = getOrCreate(um[1]!);
      const n = Number(val); if (n > 0) rule.minUnits = n;
    } else if (am) {
      const rule = getOrCreate(am[1]!);
      const n = Number(val); if (n > 0) rule.minAmount = n;
    }
  }

  // Perfumes Árabes: descuentos por defecto (5u→5%, 10u→10%, 20u→12%)
  if (!rules["perfumes arabes"]?.discountTiers?.length) {
    rules["perfumes arabes"] = {
      ...rules["perfumes arabes"],
      discountTiers: [{ units: 5, percent: 5 }, { units: 10, percent: 10 }, { units: 20, percent: 12 }],
    };
  }

  // Perfumes Diseñador: descuentos por defecto (3u→5%, 7u→7%, 20u→12%)
  if (!rules["perfumes disenador"]?.discountTiers?.length) {
    rules["perfumes disenador"] = {
      ...rules["perfumes disenador"],
      discountTiers: [{ units: 3, percent: 5 }, { units: 7, percent: 7 }, { units: 20, percent: 12 }],
    };
  }

  // Mates: compra mínima obligatoria de 10 unidades.
  const matesExisting = rules["mates"];
  const { minAmount: _ignored, ...matesRuleBase } = matesExisting ?? { discountTiers: [] };
  rules["mates"] = {
    ...matesRuleBase,
    minUnits: 10,
    discountTiers: [{ units: 5, percent: 5 }, { units: 10, percent: 10 }, { units: 20, percent: 12 }],
  };

  // Eliminar categorías genéricas obsoletas o duplicadas si existen subcategorías específicas
  if (rules["perfumes arabes"]?.minUnits || rules["perfumes disenador"]?.minUnits) {
    delete rules["perfumes"];
    delete rules["perfume"];
  }
  delete rules["suplementacion"];
  delete rules["mate"];

  return rules;
}

export function categoryDiscountForUnits(tiers: CategoryTier[], totalUnits: number): number {
  let percent = 0;
  for (const tier of tiers ?? []) {
    if (totalUnits >= tier.units) percent = tier.percent;
  }
  // Tercer tramo global: 20+ unidades → mínimo 12% universal.
  if (totalUnits >= 20) percent = Math.max(percent, 12);
  return percent;
}

export function findRuleForCat(
  catNorm: string,
  rules: Record<string, CategoryRule>,
): { key: string; rule: CategoryRule } | undefined {
  if (!catNorm) return undefined;
  if (rules[catNorm]) return { key: catNorm, rule: rules[catNorm] };

  const catWithoutDe = catNorm.replace(/\bde\b\s*/gi, "").replace(/\s+/g, " ").trim();
  if (rules[catWithoutDe]) return { key: catWithoutDe, rule: rules[catWithoutDe] };

  const catPlural = catNorm.endsWith("s") ? catNorm : catNorm + "s";
  const catSingular = catNorm.endsWith("s") ? catNorm.slice(0, -1) : catNorm;
  if (rules[catPlural]) return { key: catPlural, rule: rules[catPlural] };
  if (rules[catSingular]) return { key: catSingular, rule: rules[catSingular] };

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

/* ---------- MOQ explícito por producto (fuente de verdad v2) ---------- */

/**
 * Lee el campo `moq_group` desde el metadata del producto.
 * Valores:
 *   "none"        → el producto no tiene MOQ aunque su nombre o categoría sugieran lo contrario
 *   "mates"       → acumula bajo la regla "mates" (mín 10 u.)
 *   "<ruleKey>"   → acumula bajo la regla indicada
 *   "" / null     → sin asignación manual; se aplica solo el match por categoría
 */
export function moqGroupOf(product: Record<string, unknown>): string | null {
  // Leer moq_group: primero top-level (metadata expandido), luego dentro de metadata raw
  const topMg = product["moq_group"];
  if (typeof topMg === "string") return topMg;
  const meta = product["metadata"];
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const mg = (meta as Record<string, unknown>)["moq_group"];
    if (typeof mg === "string") return mg;
  }
  return null;
}

/**
 * Información de MOQ para un producto dado.
 * Retorna null si el producto no tiene MOQ aplicable.
 * Retorna un objeto con group, minUnits y/o minAmount si tiene MOQ.
 *
 * Fuente de verdad: `metadata.moq_group` del producto.
 *   - "none"       → null (sin MOQ)
 *   - "<ruleKey>"  → busca la regla directamente
 *   - "" / null    → match por categoría (sin fallback de nombre)
 */
export type MoqInfo = {
  group: string;
  minUnits?: number | undefined;
  minAmount?: number | undefined;
};

export function hasMoq(
  product: Record<string, unknown>,
  catRules: Record<string, CategoryRule>,
): MoqInfo | null {
  const mg = moqGroupOf(product);

  // Explícito "none" → nunca tiene MOQ
  if (mg === "none") return null;

  // Explícito con clave de regla → lookup directo (no usa nombre ni categoría)
  if (mg && mg !== "") {
    const rule = catRules[mg];
    if (!rule) return null;
    if (!rule.minUnits && !rule.minAmount) return null;
    return { group: mg, minUnits: rule.minUnits, minAmount: rule.minAmount };
  }

  // Sin moq_group explícito → isMate fallback + match por categoría
  const nombre = String(product["nombre"] ?? "");
  const categoria = String(product["categoria"] ?? "");
  if (isMate(nombre, categoria)) {
    const matesRule = catRules["mates"];
    if (matesRule && (matesRule.minUnits || matesRule.minAmount)) {
      return { group: "mates", minUnits: matesRule.minUnits, minAmount: matesRule.minAmount };
    }
  }
  const catNorm = normCat(categoria);
  if (!catNorm) return null;
  const match = findRuleForCat(catNorm, catRules);
  if (!match) return null;
  if (!match.rule.minUnits && !match.rule.minAmount) return null;
  return { group: match.key, minUnits: match.rule.minUnits, minAmount: match.rule.minAmount };
}

/**
 * ¿La cantidad `qty` del producto cumple su MOQ?
 * Retorna true si no tiene MOQ o si qty >= minUnits (y precio * qty >= minAmount).
 */
export function meetsMoq(
  moqInfo: MoqInfo | null,
  qty: number,
  unitPrice = 0,
): boolean {
  if (!moqInfo) return true;
  if (moqInfo.minUnits && qty < moqInfo.minUnits) return false;
  if (moqInfo.minAmount && qty * unitPrice < moqInfo.minAmount) return false;
  return true;
}

export type CategoryMinViolation = {
  category: string;
  type: "units" | "amount";
  min: number;
  current: number;
};

/**
 * Retorna las violaciones de mínimos de compra para el carrito actual.
 *
 * v2: cada ítem puede tener `moq_group` explícito (leído desde metadata del producto).
 *   - moq_group === "none"    → ítem ignorado para cálculos de MOQ
 *   - moq_group === "<key>"   → se acumula bajo esa clave de regla directamente
 *   - moq_group === "" / null → match por categoría (sin fallback de nombre)
 */
export function checkCategoryMins(
  items: {
    categoria?: string | undefined;
    nombre?: string | undefined;
    moq_group?: string | null | undefined;
    qty: number;
    unitPrice: number;
  }[],
  rules: Record<string, CategoryRule>,
): CategoryMinViolation[] {
  const catUnits: Record<string, number> = {};
  const catAmount: Record<string, number> = {};

  for (const item of items) {
    const mg = item.moq_group ?? null;

    // moq_group explícito "none" → ignorar
    if (mg === "none") continue;

    let minRuleKey: string | undefined;

    if (mg && mg !== "") {
      // moq_group explícito con clave → usa directamente si la regla tiene mínimo
      const rule = rules[mg];
      if (rule && (rule.minUnits || rule.minAmount)) {
        minRuleKey = mg;
      }
    } else {
      // Sin asignación manual → match por categoría
      const raw = (item.categoria ?? "").trim();
      const catNorm = normCat(raw);
      const catWithoutDe = catNorm.replace(/\bde\b\s*/gi, "").replace(/\s+/g, " ").trim();

      let minRuleKeyLen = -1;
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
      // Fallback: isMate (detecta Mates por nombre/categoría)
      // Nota: introduce el falso positivo del kit, aceptado provisionalmente
      // hasta que todos los productos tengan moq_group explícito en admin.
      if (!minRuleKey && isMate(item.nombre ?? "", item.categoria ?? "")) {
        const matesRule = rules["mates"];
        if (matesRule && (matesRule.minUnits || matesRule.minAmount)) {
          minRuleKey = "mates";
        }
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

/* ---------- Productos WA-Only (zapatillas, vapers, remeras, etc.) ---------- */

export type WaOnlyReason = "zapatillas" | "vapers" | "remeras" | "china" | "whatsapp_only";

/**
 * Configuración centralizada por tipo de producto WA-only.
 * Añadir aquí nuevos tipos sin tocar ningún otro archivo.
 */
export const WA_ONLY_CONFIG: Record<
  WaOnlyReason,
  { btnText: string; waMsg: (nombre: string) => string; hidePrice?: boolean }
> = {
  zapatillas: {
    btnText: "Consultar talle y colores por WhatsApp",
    waMsg: (n) => `Hola, quiero consultar por el modelo ${n} de zapatillas.`,
    hidePrice: false,
  },
  vapers: {
    btnText: "Consultar precio y colores por WhatsApp",
    waMsg: (n) => `Hola, quiero consultar por el vaper ${n}.`,
    hidePrice: true,
  },
  remeras: {
    btnText: "Consultar talle y colores por WhatsApp",
    waMsg: (n) => `Hola, quiero consultar por la remera ${n}.`,
    hidePrice: false,
  },
  china: {
    btnText: "Consultar precio y disponibilidad al WhatsApp",
    waMsg: (n) => `Hola, quiero consultar precio y disponibilidad por el producto ${n}.`,
    hidePrice: true,
  },
  whatsapp_only: {
    btnText: "Consultar precio y disponibilidad al WhatsApp",
    waMsg: (n) => `Hola, quiero consultar precio y disponibilidad por el producto ${n}.`,
    hidePrice: true,
  },
};

/**
 * Retorna el motivo WA-only del producto, o null si es compra normal.
 * Compatible con el campo legacy `es_zapatilla` y con el nuevo `whatsapp_only_reason`.
 */
export function waOnlyReasonOf(product: Record<string, unknown>): WaOnlyReason | null {
  // 1. Campo nuevo: whatsapp_only_reason — puede estar en metadata (raw) o en top-level
  const checkReason = (val: unknown): WaOnlyReason | null => {
    if (typeof val === "string") {
      const clean = val.trim().toLowerCase();
      if (clean in WA_ONLY_CONFIG) return clean as WaOnlyReason;
      if (clean === "true" || clean === "si" || clean === "whatsapp" || clean === "china") {
        return "whatsapp_only";
      }
    }
    if (val === true) return "whatsapp_only";
    return null;
  };

  // Top-level (metadata expandido) — caso más común en runtime
  const topReason = checkReason(product["whatsapp_only_reason"]);
  if (topReason) return topReason;

  if (product["whatsapp_only"] === true || String(product["whatsapp_only"] ?? "").toLowerCase() === "true") {
    return "whatsapp_only";
  }

  // Dentro de metadata (raw, por si acaso)
  const meta = product["metadata"];
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    const m = meta as Record<string, unknown>;
    const metaReason = checkReason(m["whatsapp_only_reason"]);
    if (metaReason) return metaReason;
    if (m["whatsapp_only"] === true || String(m["whatsapp_only"] ?? "").toLowerCase() === "true") {
      return "whatsapp_only";
    }
    if (m["es_zapatilla"] === true || String(m["es_zapatilla"] ?? "").toLowerCase() === "true") {
      return "zapatillas";
    }
  }

  // Legacy: es_zapatilla top-level (retrocompatibilidad)
  if (product["es_zapatilla"] === true || String(product["es_zapatilla"] ?? "").toLowerCase() === "true") {
    return "zapatillas";
  }

  // Fallback por categoría: productos existentes sin whatsapp_only_reason en metadata
  const catRaw = String(product["categoria"] ?? "").toLowerCase().trim();
  if (catRaw === "vapers" || catRaw === "vaper") return "vapers";
  if (catRaw === "china" || catRaw === "productos china" || catRaw === "importacion china") return "china";

  return null;
}
