/**
 * Image Proxy con Edge Caching para Vercel CDN y navegadores.
 * Intercepta imágenes de Supabase Storage y las sirve con cabeceras de caché agresivas
 * (1 año immutable), reduciendo el Cached Egress de Supabase en más de un 95%.
 */

const ALLOWED_CONTENT_TYPES = new Set([
  "image/webp",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/svg+xml",
  "image/avif",
]);

/**
 * Valida estrictamente que la URL pertenezca a Supabase Storage público (anti-SSRF / CWE-918).
 * Retorna un objeto URL ya parseado y normalizado si es válido, o null si no lo es.
 * Usar el objeto URL retornado (nunca el string original) elimina el taint flow.
 */
export function isAllowedProxyUrl(targetUrlStr: string): URL | null {
  if (!targetUrlStr || typeof targetUrlStr !== "string") return null;
  let parsed: URL;
  try {
    parsed = new URL(targetUrlStr.trim());
  } catch {
    return null;
  }

  // Protocolo estrictamente HTTPS
  if (parsed.protocol !== "https:") return null;

  // Solo subdominios válidos de supabase.co — previene bypass con subdominio malicioso
  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith(".supabase.co") || hostname.startsWith(".")) return null;

  // Solo rutas de objetos públicos de storage (no auth, no REST, no admin)
  if (!parsed.pathname.startsWith("/storage/v1/object/public/")) return null;

  // Retornar el objeto URL normalizado — jamás el string crudo del usuario
  return parsed;
}

/**
 * Maneja la petición al proxy de imágenes aplicando Edge Caching para Vercel / CDN.
 */
export async function handleImageProxy(request: Request): Promise<Response> {
  // Solo permitir métodos de lectura seguros
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }

  const reqUrl = new URL(request.url);
  const targetUrlStr = reqUrl.searchParams.get("url");

  if (!targetUrlStr) {
    return new Response("Missing url parameter", { status: 400 });
  }

  // safeUrl es un objeto URL ya validado y normalizado — corta el taint flow del input del usuario
  const safeUrl = isAllowedProxyUrl(targetUrlStr);
  if (!safeUrl) {
    return new Response("Forbidden target URL", { status: 403 });
  }

  try {
    const upstreamHeaders = new Headers();
    // Reenviar encabezados condicionales si existen
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch) upstreamHeaders.set("if-none-match", ifNoneMatch);

    const ifModifiedSince = request.headers.get("if-modified-since");
    if (ifModifiedSince) upstreamHeaders.set("if-modified-since", ifModifiedSince);

    // Usar safeUrl.href (objeto URL normalizado) — NUNCA targetUrlStr (string crudo del usuario)
    const upstreamRes = await fetch(safeUrl.href, {
      method: request.method,
      headers: upstreamHeaders,
      signal: AbortSignal.timeout(10000),
    });

    if (upstreamRes.status === 304) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control":
            "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
          "CDN-Cache-Control": "public, max-age=31536000, immutable",
          "Vercel-CDN-Cache-Control": "public, max-age=31536000, immutable",
          Vary: "Accept",
        },
      });
    }

    if (!upstreamRes.ok) {
      return new Response(`Upstream error: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
      });
    }

    const rawContentType = upstreamRes.headers.get("content-type") || "image/webp";
    const contentType = rawContentType.split(";")[0].trim().toLowerCase();

    // Validar tipo de contenido seguro
    const safeContentType = ALLOWED_CONTENT_TYPES.has(contentType) ? contentType : "image/webp";

    const resHeaders = new Headers();
    // Cache headers agresivos para Vercel Edge Network y el navegador (1 año immutable)
    resHeaders.set(
      "Cache-Control",
      "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
    );
    resHeaders.set("CDN-Cache-Control", "public, max-age=31536000, immutable");
    resHeaders.set("Vercel-CDN-Cache-Control", "public, max-age=31536000, immutable");
    resHeaders.set("Content-Type", safeContentType);
    resHeaders.set("X-Content-Type-Options", "nosniff");
    resHeaders.set("Content-Security-Policy", "default-src 'none'");
    resHeaders.set("Vary", "Accept");

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) resHeaders.set("Content-Length", contentLength);

    const etag = upstreamRes.headers.get("etag");
    if (etag) resHeaders.set("ETag", etag);

    const lastModified = upstreamRes.headers.get("last-modified");
    if (lastModified) resHeaders.set("Last-Modified", lastModified);

    return new Response(upstreamRes.body, {
      status: 200,
      headers: resHeaders,
    });
  } catch (err) {
    console.error("Image proxy fetch failed:", err);
    return new Response("Image proxy failed", { status: 502 });
  }
}
