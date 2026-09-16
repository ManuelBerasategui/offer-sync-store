import { createServerFn } from "@tanstack/react-start";
import type { Banner, Product, SiteConfig, StoreData } from "./store";
import { supabase } from "@/integrations/supabase/client";

export const getStoreData = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreData> => {
    try {
      const [productsResult, variantsResult, bannersResult, configResult] = await Promise.all([
        // La consulta principal no depende de la tabla opcional de variantes.
        // Así, un error de relación/caché de Supabase nunca deja el catálogo vacío.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('products').select('*').neq('stock', 'NO'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('product_variants').select('*'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('banners').select('*').eq('activo', 'SI'),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).from('site_config').select('*'),
      ]);

      if (productsResult.error) throw productsResult.error;
      if (variantsResult.error) {
        console.warn("No se pudieron cargar las variantes de color:", variantsResult.error.message);
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
        // Expand metadata back onto the product object
        const meta = typeof p.metadata === 'object' && p.metadata !== null ? p.metadata as Record<string, unknown> : {};
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
        if (typeof raw.quantity_tiers === "string" && raw.quantity_tiers.length > 0) {
          try { quantity_tiers = JSON.parse(raw.quantity_tiers); } catch { /* ignorar JSON inválido */ }
        }
        return { ...raw, quantity_tiers } as Banner;
      });

      const config: SiteConfig = {};
      for (const row of configRaw ?? []) {
        const r = row as { clave?: string; valor?: string };
        if (r.clave) config[r.clave] = r.valor ?? "";
      }

      return { products, banners, config };
    } catch (error) {
      console.error("Error fetching store data from Supabase:", error);
      return { products: [], banners: [], config: {} };
    }
  },
);
