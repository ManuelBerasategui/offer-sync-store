/**
 * Destino seguro para redirigir después del login: solo rutas de esta misma tienda.
 *
 * Los navegadores ignoran tabs y saltos de línea en las URLs, así que "/\t/evil.com" terminaba
 * siendo "//evil.com" (otro sitio). Por eso se rechazan los caracteres de control y las barras
 * invertidas, y además se resuelve la URL para confirmar que queda en el mismo origen.
 */
export function getSafeRedirect(target?: string | null): string {
  const trimmed = String(target ?? "").trim();
  if (!trimmed) return "/";
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed)) return "/";
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  try {
    const base = "https://tienda.invalid";
    const url = new URL(trimmed, base);
    if (url.origin !== base) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
