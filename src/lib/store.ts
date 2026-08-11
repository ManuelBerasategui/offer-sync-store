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
};

export type Banner = {
  titulo?: string;
  subtitulo?: string;
  imagen_url?: string;
  link?: string;
  activo?: string;
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

export const money = (v?: string) => "$" + toNumber(v).toLocaleString("es-AR");

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
    return `https://lh3.googleusercontent.com/d/${m[1]}=w800`;
  }
  return url;
}

export const FALLBACK_IMAGE =
  "https://placehold.co/600x600/1c1c1f/f3ede0?text=Sin+imagen";

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
