import { createServerFn } from "@tanstack/react-start";
import type { Banner, Product, SiteConfig, StoreData } from "./store";
import { supabase } from "@/integrations/supabase/client";

export const getStoreData = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreData> => {
    try {
      const [{ data: productsRaw }, { data: bannersRaw }, { data: configRaw }] = await Promise.all([
        supabase.from('products').select('*').neq('stock', 'NO'),
        supabase.from('banners').select('*').eq('activo', 'SI'),
        supabase.from('site_config').select('*'),
      ]);

      const products: Product[] = (productsRaw ?? []).map(p => {
        // Expand metadata back onto the product object
        const meta = typeof p.metadata === 'object' && p.metadata !== null ? p.metadata : {};
        const { metadata, ...rest } = p;
        return { ...rest, ...meta } as Product;
      });

      const banners: Banner[] = (bannersRaw ?? []) as Banner[];

      const config: SiteConfig = {};
      for (const row of (configRaw ?? [])) {
        if (row.clave) config[row.clave] = row.valor ?? "";
      }

      return { products, banners, config };
    } catch (error) {
      console.error("Error fetching store data from Supabase:", error);
      return { products: [], banners: [], config: {} };
    }
  },
);
