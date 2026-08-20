import type React from "react";

export type ProductVariant = {
  id: string;
  product_id: string;
  color: string;
  precio: number | string;
  stock?: string | null;
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
  variants?: ProductVariant[];
  [key: string]: string | ProductVariant[] | undefined;
};

export type Banner = {
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
    if (key.trim().toLowerCase().replace(/\s+/g, "") === "whatsapp") return isYes(value);
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

/* ---------- Suplementos: compra mínima ---------- */

export const SUPLEMENTOS_MIN = 250000;

export const SUPLEMENTOS_MSG =
  "La compra mínima para suplementos es de $250.000. Agregá más productos al carrito y llevate todo junto!";

/** ¿La categoría del producto (o del ítem del carrito) es suplementos? */
export function isSuplemento(categoria?: string) {
  return String(categoria ?? "")
    .toLowerCase()
    .includes("suplemento");
}
