/**
 * Límite simple de pedidos por IP, en memoria de cada instancia del servidor.
 *
 * No es un límite global exacto (cada instancia lleva su cuenta y se reinicia con cada deploy),
 * pero corta el abuso automatizado básico: crear cientos de pedidos falsos, probar cupones, etc.
 */
export function createRateLimiter(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>();
  return function isLimited(key: string): boolean {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs);
    if (recent.length >= opts.max) {
      hits.set(key, recent);
      return true;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return false;
  };
}

/** IP del cliente según los encabezados del proxy (Vercel / Cloudflare). */
export function clientIpFrom(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "desconocida"
  );
}

/** IP del pedido en curso dentro de una server function. */
export async function currentClientIp(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    return clientIpFrom(getRequest().headers);
  } catch {
    return "desconocida";
  }
}

export const RATE_LIMIT_MSG = "Hiciste muchos intentos seguidos. Probá de nuevo en un rato.";
