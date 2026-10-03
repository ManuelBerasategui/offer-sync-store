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
  return raw.replace(/\/+$/, "") || "https://teimportamosarg.com";
})();
