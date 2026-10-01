import { createServerFn } from "@tanstack/react-start";
import type { Banner, Product, SiteConfig, StoreData } from "./store";
import { supabase } from "@/integrations/supabase/client";

/**
 * CAPA 1: In-memory cache a nivel de módulo del Worker.
 * El isolate de Cloudflare es long-lived y comparte esta variable entre requests
 * consecutivos en el mismo Worker. TTL: 5 minutos.
 * Impacto esperado: -85% de fetches a Supabase DB dentro del mismo isolate.
 */
interface ModuleCache {
  data: StoreData;
  expiresAt: number;
}
let _moduleCache: ModuleCache | null = null;
const MODULE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos (invalida al guardar en admin)

/**
 * CAPA 2: Cloudflare Cache API.
 * Compartida entre todos los isolates paralelos del mismo datacenter.
 * Impacto adicional: elimina fetches redundantes entre instancias paralelas.
 */
const CF_CACHE_KEY = "https://teimportamosarg.com/__store_data_v1__";
const CF_CACHE_TTL_SECONDS = 600; // 10 minutos

/** Intenta leer de Cloudflare Cache API. Retorna null si no está disponible o expiró. */
async function readCfCache(): Promise<StoreData | null> {
  try {
    if (typeof caches === "undefined") return null;
    const cache = caches.default;
    const cached = await cache.match(CF_CACHE_KEY);
    if (!cached) return null;
    return (await cached.json()) as StoreData;
  } catch {
    return null;
  }
}

/** Escribe en Cloudflare Cache API. No-op si no está disponible. */
async function writeCfCache(data: StoreData): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    const cache = caches.default;
    await cache.put(
      CF_CACHE_KEY,
      new Response(JSON.stringify(data), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": `public, max-age=${CF_CACHE_TTL_SECONDS}`,
        },
      }),
    );
  } catch {
    // No bloquear si el cache falla
  }
}

/** Ejecuta las 4 queries a Supabase y construye el StoreData. */
async function fetchFromSupabase(): Promise<StoreData> {
  const [productsResult, variantsResult, bannersResult, configResult] = await Promise.all([
    // Solo columnas necesarias para el frontend — reduce egress de Supabase DB.
    // La consulta principal no depende de la tabla opcional de variantes.
    // Así, un error de relación/caché de Supabase nunca deja el catálogo vacío.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('products').select('id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,imagen_url,descripcion,destacado,oferta,stock,descuento,color_predeterminado,metadata').neq('stock', 'NO'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('product_variants').select('id,product_id,color,precio,precio_usd,precio_base,moneda_base,stock,imagen_url'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('banners').select('*').eq('activo', 'SI'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('site_config').select('clave,valor'),
  ]);

  if (productsResult.error) throw productsResult.error;
  if (variantsResult.error) {
    console.warn("No se pudieron cargar las variantes de color:", variantsResult.error.message);
  }
  if (bannersResult.error) {
    console.warn("No se pudieron cargar los banners:", bannersResult.error.message);
  }

  const productsRaw = productsResult.data;
  const bannersRaw = bannersResult.data;
  const configRaw = configResult.data;

  const variantsByProduct = new Map<string, unknown[]>();
  for (const variant of variantsResult.data ?? []) {
    const productId = String(variant.product_id ?? "");
    if (!productId) continue;
    const current = variantsByProduct.get(productId) ?? [];
    current.push(variant);
    variantsByProduct.set(productId, current);
  }

  const products: Product[] = (productsRaw ?? []).map((p: any) => {
    // Expand metadata back onto the product object sin URLs de backup pesadas
    const rawMeta = typeof p.metadata === 'object' && p.metadata !== null ? { ...(p.metadata as Record<string, unknown>) } : {};
    delete rawMeta.raw_imagen_url_backup;
    delete rawMeta.original_imagen_url;
    const meta = rawMeta;
    const { metadata, ...rest } = p;
    const linkedVariants = variantsByProduct.get(String(p.id ?? "")) ?? [];
    const variants = linkedVariants
      .filter((v) => {
        const stock = typeof v === "object" && v !== null ? (v as { stock?: unknown }).stock : undefined;
        return String(stock ?? '').trim().toUpperCase() !== 'NO';
      })
      .map((v) => {
        const vObj = v as { id?: unknown; product_id?: unknown; color?: unknown; precio?: unknown; stock?: unknown; imagen_url?: unknown };
        const colorClean = String(vObj.color ?? '').trim();
        const colorKey = `talles_color_${colorClean.toLowerCase().normalize("NFC").replace(/\s+/g, '_')}`;
        const rawTalles = meta[colorKey];
        const talles_disponibles: string[] = Array.isArray(rawTalles)
          ? (rawTalles as string[])
          : typeof rawTalles === 'string' && rawTalles.length > 0
            ? rawTalles.split(',').map(t => t.trim()).filter(Boolean)
            : [];
        return { ...vObj, talles_disponibles };
      });
    return { ...meta, ...rest, variants } as Product;
  });

  const banners: Banner[] = (bannersRaw ?? []).map((raw: any) => {
    let quantity_tiers: Banner["quantity_tiers"] = null;
    const candidate = raw.quantity_tiers || raw.link;
    if (Array.isArray(candidate) && candidate.length > 0) {
      quantity_tiers = candidate;
    } else if (typeof candidate === "string" && candidate.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(candidate);
        if (Array.isArray(parsed) && parsed.length > 0) {
          quantity_tiers = parsed;
        }
      } catch { /* ignorar JSON inválido */ }
    }
    return { ...raw, quantity_tiers } as Banner;
  });

  const config: SiteConfig = {};
  for (const row of configRaw ?? []) {
    const r = row as { clave?: string; valor?: string };
    if (r.clave) config[r.clave] = r.valor ?? "";
  }

  return { products, banners, config };
}

export const getStoreData = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreData> => {
    try {
      const now = Date.now();

      // Capa 1: in-memory cache del módulo (mismo isolate, acceso instantáneo)
      if (_moduleCache && _moduleCache.expiresAt > now) {
        return _moduleCache.data;
      }

      // Capa 2: Cloudflare Cache API (compartida entre isolates del datacenter)
      const cfCached = await readCfCache();
      if (cfCached) {
        // Refrescar también el module cache para evitar llamadas repetidas a CF Cache
        _moduleCache = { data: cfCached, expiresAt: now + MODULE_CACHE_TTL_MS };
        return cfCached;
      }

      // Cache miss: ir a Supabase
      const data = await fetchFromSupabase();

      // Guardar en ambas capas de caché
      _moduleCache = { data, expiresAt: now + MODULE_CACHE_TTL_MS };
      // No awaitar la escritura en CF cache para no bloquear la respuesta
      void writeCfCache(data);

      return data;
    } catch (error) {
      console.error("Error fetching store data from Supabase:", error);
      // Si el caché anterior es válido aunque expirado, usarlo como fallback
      if (_moduleCache) {
        console.warn("Usando store data cacheado como fallback tras error de Supabase.");
        return _moduleCache.data;
      }
      return { products: [], banners: [], config: {} };
    }
  },
);

/**
 * Invalida ambas capas de caché del store.
 * Llamar después de modificar productos, banners o configuración en el admin.
 */
export async function invalidateStoreCache(): Promise<void> {
  _moduleCache = null;
  try {
    if (typeof caches !== "undefined") {
      await caches.default.delete(CF_CACHE_KEY);
    }
  } catch {
    // No bloquear si falla
  }
}

export const invalidateStoreCacheFn = createServerFn({ method: "POST" }).handler(
  async () => {
    await invalidateStoreCache();
    return { success: true };
  },
);

