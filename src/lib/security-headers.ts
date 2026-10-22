/**
 * Encabezados de seguridad para las respuestas del servidor (páginas y server functions).
 *
 * A propósito NO se restringe qué scripts o conexiones carga la página (script-src/connect-src):
 * PostHog, Mercado Pago y las imágenes siguen funcionando igual. Solo se agregan protecciones que
 * no bloquean recursos:
 * - HSTS: el navegador usa siempre HTTPS.
 * - frame-ancestors: nadie puede meter la tienda dentro de otra página (clickjacking), salvo la
 *   propia tienda, el editor de Lovable (su vista previa la muestra en un iframe) y PostHog
 *   (los heatmaps muestran la tienda dentro de su panel).
 * - nosniff, Referrer-Policy y Permissions-Policy (sin cámara, micrófono ni ubicación).
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000",
  "Content-Security-Policy":
    "frame-ancestors 'self' https://lovable.dev https://*.lovable.dev https://*.lovable.app https://*.lovableproject.com https://*.posthog.com",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

/** Devuelve la respuesta con los encabezados agregados, sin pisar los que ya tenga. */
export function withSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  let changed = false;
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) {
      headers.set(name, value);
      changed = true;
    }
  }
  // new Response() no acepta estados fuera de 200-599
  if (!changed || response.status < 200 || response.status > 599) return response;
  // 204/205/304 no pueden llevar cuerpo
  const nullBody = [204, 205, 304].includes(response.status);
  return new Response(nullBody ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
