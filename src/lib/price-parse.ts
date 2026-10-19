/**
 * Convierte un precio escrito con cualquier formato a número, sin depender de la IA:
 * - con coma y punto, el último que aparece es el decimal ("1,894.63" → 1894.63; "1.894,63" → 1894.63)
 * - con un solo separador seguido de 3 dígitos, es de miles ("1,894" / "1.894" → 1894)
 * - con un solo separador seguido de 1 o 2 dígitos, es decimal ("4,50" / "4.5" → 4.5)
 */
export function parsePrice(v: unknown): number {
  if (typeof v === "number") return v;
  const raw = String(v ?? "").replace(/[^\d.,]/g, "");
  if (!raw) return NaN;
  const lastDot = raw.lastIndexOf(".");
  const lastComma = raw.lastIndexOf(",");
  let normalized: string;
  if (lastDot >= 0 && lastComma >= 0) {
    const dec = lastDot > lastComma ? "." : ",";
    const thousands = dec === "." ? "," : ".";
    normalized = raw.split(thousands).join("").replace(dec, ".");
  } else if (lastDot >= 0 || lastComma >= 0) {
    const sep = lastDot >= 0 ? "." : ",";
    const parts = raw.split(sep);
    const tail = parts[parts.length - 1] ?? "";
    normalized = parts.length > 2 || tail.length === 3 ? parts.join("") : parts.join(".");
  } else {
    normalized = raw;
  }
  return Number(normalized);
}

/**
 * Detecta la moneda en el texto de un precio tal como se ve en Alibaba ("ARS 1,894.63", "US$4.50").
 * Devuelve null si no hay ninguna marca de moneda o solo "$" (ambiguo).
 */
export function detectCurrency(v: unknown): string | null {
  const t = String(v ?? "").toUpperCase();
  if (/\bARS\b|AR\$|\bARS\$/.test(t)) return "ARS";
  if (/US\$|U\$S|\bUSD\b/.test(t)) return "USD";
  if (/€|\bEUR\b/.test(t)) return "EUR";
  if (/R\$|\bBRL\b/.test(t)) return "BRL";
  if (/¥|\bCNY\b|\bRMB\b/.test(t)) return "CNY";
  if (/£|\bGBP\b/.test(t)) return "GBP";
  return null;
}

/**
 * Descarta precios probablemente cortados o mal leídos: ordenados por cantidad, un rango que cuesta
 * menos del 30% del rango anterior (ej: "ARS 44" después de "ARS 1,210.02") no es un descuento real.
 */
export function dropSuspiciousTiers<T extends { min_qty: number; price_usd: number }>(
  tiers: T[],
): T[] {
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  const kept: T[] = [];
  for (const t of sorted) {
    const prev = kept[kept.length - 1];
    if (prev && t.price_usd < prev.price_usd * 0.3) continue;
    kept.push(t);
  }
  return kept;
}
