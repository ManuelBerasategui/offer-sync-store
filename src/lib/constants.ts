/**
 * SITE_URL — canonical origin for this deployment.
 *
 * Set VITE_SITE_URL in your environment (Vercel/Cloudflare/local).
 * Falls back to the production domain so OG/JSON-LD tags are always valid.
 * Never has a trailing slash.
 */
export const SITE_URL: string = (() => {
  const raw = (import.meta.env["VITE_SITE_URL"] as string | undefined) ?? "";
  // Strip trailing slash so callers can always do `${SITE_URL}/path`
  // La tienda vive en www (teimportamosarg.com redirige a www): canónicos y sitemap tienen que
  // usar www, si no Google ve cada URL como "Página con redirección" y no la indexa
  const clean = raw.replace(/\/+$/, "").replace(/^https?:\/\/teimportamosarg\.com$/i, "https://www.teimportamosarg.com");
  return clean || "https://www.teimportamosarg.com";
})();
