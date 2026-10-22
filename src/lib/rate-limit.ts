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
    hits.delete(key);
    hits.set(key, recent);
    // Si se llena, se descartan las IPs más viejas (no todo: borrar todo permitía resetear los
    // contadores mandando miles de IPs inventadas)
    if (hits.size > 5000) {
      for (const old of [...hits.keys()].slice(0, 1000)) hits.delete(old);
    }
    return false;
  };
}

/**
 * IP del cliente según la plataforma. Solo se confía en el encabezado que pone el proxy de cada una:
 * en Vercel, x-real-ip / x-forwarded-for (Vercel los pisa); cf-connecting-ip lo podría mandar el
 * propio cliente para esquivar el límite. En Cloudflare es al revés.
 */
export function clientIpFrom(headers: Headers, onVercel = Boolean(process.env["VERCEL"])): string {
  const xff = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = onVercel
    ? headers.get("x-real-ip") || headers.get("x-vercel-forwarded-for") || xff
    : headers.get("cf-connecting-ip") || headers.get("x-real-ip") || xff;
  return ip?.trim() || "desconocida";
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
