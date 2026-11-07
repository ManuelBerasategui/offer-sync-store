import { sanitizeImageUrl } from "@/lib/store";

/** Máximo de fotos extra por producto (la galería principal + estas). */
export const MAX_EXTRA_IMAGES = 60;
/** Largo máximo de la lista de precios que se muestra en la ficha. */
export const MAX_PRICE_LIST_CHARS = 2000;
const MAX_PRICE_LIST_LINES = 30;

/**
 * Limpia la lista de fotos extra que manda el panel: solo URLs http(s) válidas,
 * sin repetidas, sin la foto principal y como mucho MAX_EXTRA_IMAGES.
 */
export function sanitizeExtraImages(raw: unknown, mainImage?: string | null): string[] {
  if (!Array.isArray(raw)) return [];
  const main = sanitizeImageUrl(mainImage ?? "");
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string" || item.length > 2000) continue;
    const safe = sanitizeImageUrl(item);
    if (!safe || !/^https?:\/\//.test(safe)) continue;
    if (safe === main || out.includes(safe)) continue;
    out.push(safe);
    if (out.length >= MAX_EXTRA_IMAGES) break;
  }
  return out;
}

/** Fotos extra guardadas en el producto (campo expandido o dentro de metadata). */
export function extraImagesOf(product: Record<string, unknown>): string[] {
  const meta = product["metadata"];
  const raw =
    product["extra_images"] ??
    (meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)["extra_images"]
      : undefined);
  if (!Array.isArray(raw)) return [];
  return raw.map((u) => String(u ?? "").trim()).filter(Boolean);
}

/**
 * Normaliza el texto de la lista de precios: sin caracteres de control,
 * sin líneas vacías repetidas y con largo acotado. Se muestra siempre como texto plano.
 */
export function sanitizePriceList(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const lines = raw
    .slice(0, MAX_PRICE_LIST_CHARS)
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    .split("\n")
    .map((l) => l.trim().slice(0, 120))
    .filter(Boolean)
    .slice(0, MAX_PRICE_LIST_LINES);
  return lines.join("\n");
}

/** Renglones de la lista de precios del producto (vacío si no tiene). */
export function priceListOf(product: Record<string, unknown>): string[] {
  const meta = product["metadata"];
  const raw =
    product["price_list"] ??
    (meta && typeof meta === "object" && !Array.isArray(meta)
      ? (meta as Record<string, unknown>)["price_list"]
      : undefined);
  const clean = sanitizePriceList(raw);
  return clean ? clean.split("\n") : [];
}

/**
 * Lee el parámetro ?foto=N de la ficha (1 = primera foto). Devuelve el número
 * validado o undefined si no vino o no es un entero razonable.
 */
export function parseFotoParam(raw: unknown): number | undefined {
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,3}$/.test(raw) ? Number(raw) : NaN;
  return Number.isInteger(n) && n >= 1 && n <= MAX_EXTRA_IMAGES + 1 ? n : undefined;
}

/** Link a la ficha con una foto de la galería elegida (la vista previa muestra esa foto). */
export function galleryPhotoLink(siteUrl: string, productId: string, photoIndex: number): string {
  return `${siteUrl}/producto/${encodeURIComponent(productId)}?foto=${photoIndex + 1}`;
}

/**
 * Mensaje de WhatsApp para un producto con galería: manda el link a la foto elegida,
 * así en el chat aparece la imagen del modelo y se sabe cuál quiere sin preguntar.
 */
export function galleryWhatsappMessage(
  baseMsg: string,
  photoIndex: number,
  totalPhotos: number,
  photoLink?: string,
): string {
  if (totalPhotos <= 1 || photoIndex < 0 || photoIndex >= totalPhotos || !photoLink) return baseMsg;
  return `${baseMsg} Quiero este modelo: ${photoLink}`;
}
