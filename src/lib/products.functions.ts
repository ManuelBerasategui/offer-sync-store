import { createServerFn } from "@tanstack/react-start";
import type { Banner, Product, ProductVariant } from "@/lib/store";

const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);


/* ─── Tipos de entrada ─────────────────────────────────── */

export type CategoryRuleInput = {
  category: string;
  discountTiers: { units: number; percent: number }[];
  minType: "none" | "units" | "amount";
  minValue: number;
};

export type VariantInput = {
  id?: string; // presente si ya existe en la DB
  color: string;
  precio?: number | string;
  precio_usd?: number | string;
  precio_base?: number | string;
  moneda_base?: "USD" | "ARS" | string;
  stock?: string | null;
  imagen_url?: string | null;
  talles_disponibles?: string[];
  precio_modified?: boolean;
  precio_usd_modified?: boolean;
};

export type ProductInput = {
  id?: string; // presente si es edición
  nombre: string;
  categoria: string;
  precio: string;
  precio_usd?: string;
  precio_base?: number | string;
  moneda_base?: "USD" | "ARS" | string;
  precio_oferta?: string;
  precio_oferta_usd?: string;
  precio_oferta_base?: number | string;
  moneda_oferta_base?: "USD" | "ARS" | string;
  descripcion?: string;
  destacado?: string;
  oferta?: string;
  stock?: string;
  descuento?: string;
  color_predeterminado?: string | null;
  es_zapatilla?: boolean;
  imagen_url?: string | null;
  tipo_talles?: "ZAPATILLAS" | "ROPA" | "NINGUNO";
  talles_disponibles?: string[];
  /** Tiers: [{ units: 5, percent: 2.5 }, ...] */
  tiers?: { units: number; percent: number }[];
  variants?: VariantInput[];
  precio_modified?: boolean;
  precio_usd_modified?: boolean;
  precio_oferta_modified?: boolean;
  precio_oferta_usd_modified?: boolean;
  /**
   * Grupo de MOQ explicito. Fuente de verdad para la logica de compra minima.
   * "none"       -> sin minimo (anula cualquier deteccion automatica)
   * "mates"      -> minimo de 10 unidades de Mates
   * ""           -> sin asignacion manual (usa match por categoria)
   */
  moq_group?: string;
  /**
   * Tipo de producto WA-only. Si está presente, oculta compra directa
   * y muestra solo un botón de WhatsApp con texto y mensaje específico.
   * Valores: "zapatillas" | "vapers" | "remeras" | "" (compra normal)
   */
  whatsapp_only_reason?: string;
};

/* ─── Helper de autorización ───────────────────────────── */

async function assertAdmin(email?: string, token?: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const adminEmailsRaw = process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "";
  const adminEmails = adminEmailsRaw
    .toLowerCase()
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  let requestingEmail = email ? email.toLowerCase().trim() : "";
  if (token) {
    const { data: userData } = await supabaseAdmin.auth.getUser(token);
    if (userData?.user?.email) requestingEmail = userData.user.email.toLowerCase().trim();
  }

  if (!requestingEmail) throw new Error("Acceso denegado: no autenticado.");

  const allowed =
    adminEmails.length > 0
      ? adminEmails.includes(requestingEmail)
      : ["admin@config.com", "admin@teimportamos.com"].includes(requestingEmail);

  if (!allowed) throw new Error("Acceso denegado: sin permisos de administrador.");

  return supabaseAdmin;
}

export function calcArsFromUsd(
  usd: number | string,
  rate: number,
  markupPct = 0,
  increment = 10,
  surcharge = 1
): number {
  const numUsd = typeof usd === "number" ? usd : Number(String(usd).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(numUsd) || numUsd <= 0 || !rate || rate <= 0) return 0;
  const baseUsdWithSurcharge = numUsd * surcharge;
  const markup = markupPct / 100;
  if (increment > 1) {
    return Math.ceil((baseUsdWithSurcharge * rate * (1 + markup)) / increment) * increment;
  }
  return Math.round(baseUsdWithSurcharge * rate * (1 + markup));
}

/* ─── Listar todos los productos (admin, con variantes) ── */

export const getAdminProducts = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
  }))
  .handler(async ({ data }): Promise<{
    products: Product[];
    dolarRate?: number;
    roundingIncrement?: number;
    markupPercentage?: number;
    error?: string;
  }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);

      const [productsRes, variantsRes, pricingRes] = await Promise.all([
        supabaseAdmin.from("products").select("*").order("nombre"),
        supabaseAdmin.from("product_variants").select("*"),
        (supabaseAdmin as any).from("pricing_settings").select("last_rate, markup_percentage, rounding_increment").eq("id", true).maybeSingle(),
      ]);

      if (productsRes.error) throw productsRes.error;

      let dolarRate = 0;
      let roundingIncrement = 10;
      let markupPercentage = 0;

      if (pricingRes?.data) {
        if (Number(pricingRes.data.last_rate) > 0) dolarRate = Number(pricingRes.data.last_rate);
        if (Number(pricingRes.data.rounding_increment) > 0) roundingIncrement = Number(pricingRes.data.rounding_increment);
        if (pricingRes.data.markup_percentage !== undefined) markupPercentage = Number(pricingRes.data.markup_percentage);
      }

      if (!dolarRate) {
        try {
          const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3000) });
          if (apiRes.ok) {
            const apiData = (await apiRes.json()) as { venta?: number };
            if (apiData?.venta && apiData.venta > 0) dolarRate = Math.round(apiData.venta);
          }
        } catch {}
      }

      if (!dolarRate) {
        const { data: cfgRow } = await (supabaseAdmin as any)
          .from("site_config")
          .select("valor")
          .eq("clave", "dolar_cotizacion")
          .maybeSingle();
        dolarRate = Number(cfgRow?.valor) > 0 ? Number(cfgRow?.valor) : 1500;
      }

      const variantsByProduct = new Map<string, ProductVariant[]>();
      for (const v of variantsRes.data ?? []) {
        const pid = String(v.product_id ?? "");
        if (!pid) continue;
        const list = variantsByProduct.get(pid) ?? [];
        list.push(v as ProductVariant);
        variantsByProduct.set(pid, list);
      }

      const products: Product[] = (productsRes.data ?? []).map((p) => {
        const meta = typeof p.metadata === "object" && p.metadata !== null ? p.metadata as Record<string, unknown> : {};
        const { metadata, ...rest } = p;
        const linkedVariants = variantsByProduct.get(String(p.id ?? "")) ?? [];
        const variants = linkedVariants.map((v) => {
          const colorClean = String(v.color ?? "").trim();
          const colorKey = `talles_color_${colorClean.toLowerCase().normalize("NFC").replace(/\s+/g, "_")}`;
          const rawTalles = meta[colorKey];
          const talles_disponibles: string[] = Array.isArray(rawTalles)
            ? (rawTalles as string[])
            : typeof rawTalles === "string" && rawTalles.length > 0
              ? rawTalles.split(",").map((t) => t.trim()).filter(Boolean)
              : [];
          return { ...v, talles_disponibles };
        });
        return { ...meta, ...rest, variants } as Product;
      });

      return { products, dolarRate, roundingIncrement, markupPercentage };
    } catch (err) {
      return { products: [], error: err instanceof Error ? err.message : "Error al cargar productos." };
    }
  });

/* ─── Crear / actualizar un producto con variantes ──────── */

export const upsertAdminProduct = createServerFn({ method: "POST" })
  .validator(
    (data: { email?: string; token?: string; product: ProductInput }) => ({
      email: str(data?.email, 160).toLowerCase(),
      token: str(data?.token, 2000),
      product: data.product,
    }),
  )
  .handler(async ({ data }): Promise<{ id?: string; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      const p = data.product;

      // Construir metadata de descuentos y talles
      const metadata: Record<string, string> = {};
      if (p.es_zapatilla) {
        metadata["es_zapatilla"] = "true";
      }
      // moq_group: persistir siempre (incluido "none" y "") para anular defaults.
      // Solo omitir si no fue tocado por el admin (undefined).
      if (p.moq_group !== undefined) {
        metadata["moq_group"] = p.moq_group;
      }
      // whatsapp_only_reason: fuente de verdad para flujo WA-only
      if (p.whatsapp_only_reason !== undefined) {
        metadata["whatsapp_only_reason"] = p.whatsapp_only_reason;
        // Retrocompatibilidad: sincronizar con es_zapatilla legacy
        if (p.whatsapp_only_reason === "zapatillas") {
          metadata["es_zapatilla"] = "true";
        } else {
          metadata["es_zapatilla"] = "";
        }
      }
      for (const tier of p.tiers ?? []) {
        if (tier.units > 0 && tier.percent > 0) {
          metadata[`${tier.units} unidades`] = `${tier.percent}%`;
        }
      }
      if (p.tipo_talles && p.tipo_talles !== "NINGUNO") {
        metadata["tipo_talles"] = p.tipo_talles;
        metadata["talles_disponibles"] = Array.isArray(p.talles_disponibles)
          ? p.talles_disponibles.join(",")
          : String(p.talles_disponibles ?? "");
      }

      if (p.variants) {
        for (const v of p.variants) {
          const colorClean = String(v.color ?? "").trim();
          if (colorClean && v.talles_disponibles && v.talles_disponibles.length > 0) {
            const key = `talles_color_${colorClean.toLowerCase().normalize("NFC").replace(/\s+/g, "_")}`;
            metadata[key] = v.talles_disponibles.map((t) => String(t).trim()).filter(Boolean).join(",");
          }
        }
      }

      const parsePrice = (val: string | number | undefined | null) => {
        if (val === undefined || val === null) return null;
        const cleaned = String(val).replace(/[^\d.-]/g, "").trim();
        if (cleaned === "") return null;
        const num = Number(cleaned);
        return isNaN(num) ? null : num;
      };

      // Cotización dólar y configuración de redondeo/markup desde pricing_settings
      let rate = 0;
      let markup = 0;
      let increment = 10;

      try {
        const { data: pSettings } = await (supabaseAdmin as any)
          .from("pricing_settings")
          .select("last_rate, markup_percentage, rounding_increment")
          .eq("id", true)
          .maybeSingle();

        if (pSettings) {
          if (Number(pSettings.last_rate) > 0) rate = Number(pSettings.last_rate);
          if (pSettings.markup_percentage !== undefined) markup = Number(pSettings.markup_percentage) / 100;
          if (Number(pSettings.rounding_increment) > 0) increment = Number(pSettings.rounding_increment);
        }
      } catch {}

      if (!rate) {
        try {
          const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3000) });
          if (apiRes.ok) {
            const apiData = (await apiRes.json()) as { venta?: number };
            if (apiData?.venta && apiData.venta > 0) {
              rate = Math.round(apiData.venta);
            }
          }
        } catch {}
      }

      if (!rate) {
        const { data: cfgRow } = await (supabaseAdmin as any)
          .from("site_config")
          .select("valor")
          .eq("clave", "dolar_cotizacion")
          .maybeSingle();
        rate = Number(cfgRow?.valor) > 0 ? Number(cfgRow?.valor) : 1500;
      }

      const arsFromUsd = (usd: number) => {
        if (increment > 1) {
          return Math.ceil((usd * rate * (1 + markup)) / increment) * increment;
        }
        return Math.round(usd * rate * (1 + markup));
      };

      const isNew = !p.id;

      let row: Record<string, unknown>;

      if (isNew) {
        // AL CREAR PRODUCTO NUEVO:
        // Se calcula precio base y precio final con recargo 7%
        const rawPriceUsd = parsePrice(p.precio_usd ?? p.precio_base);
        const rawPriceArs = parsePrice(p.precio);

        let priceBase: number | null = null;
        let monedaBase: string = "USD";
        let priceUsd: number | null = null;
        let priceArs: number | null = null;

        if (rawPriceUsd !== null && rawPriceUsd > 0) {
          priceBase = rawPriceUsd;
          monedaBase = "USD";
          priceUsd = Math.round(rawPriceUsd * 1.07 * 100) / 100;
          priceArs = arsFromUsd(priceUsd);
        } else if (rawPriceArs !== null && rawPriceArs > 0) {
          priceBase = rawPriceArs;
          monedaBase = "ARS";
          priceArs = Math.round(rawPriceArs * 1.07);
          priceUsd = rate > 0 ? Math.round((priceArs / rate) * 100) / 100 : null;
        }

        const rawPriceOfertaUsd = parsePrice(p.precio_oferta_usd ?? p.precio_oferta_base);
        const rawPriceOfertaArs = parsePrice(p.precio_oferta);
        let priceOfertaBase: number | null = null;
        let monedaOfertaBase: string | null = null;
        let priceOfertaUsd: number | null = null;
        let priceOfertaArs: number | null = null;

        if (rawPriceOfertaUsd !== null && rawPriceOfertaUsd > 0) {
          priceOfertaBase = rawPriceOfertaUsd;
          monedaOfertaBase = "USD";
          priceOfertaUsd = Math.round(rawPriceOfertaUsd * 1.07 * 100) / 100;
          priceOfertaArs = arsFromUsd(priceOfertaUsd);
        } else if (rawPriceOfertaArs !== null && rawPriceOfertaArs > 0) {
          priceOfertaBase = rawPriceOfertaArs;
          monedaOfertaBase = "ARS";
          priceOfertaArs = Math.round(rawPriceOfertaArs * 1.07);
          priceOfertaUsd = rate > 0 ? Math.round((priceOfertaArs / rate) * 100) / 100 : null;
        }

        row = {
          nombre: p.nombre,
          categoria: p.categoria,
          precio_base: priceBase,
          moneda_base: monedaBase,
          precio: priceArs,
          precio_usd: priceUsd,
          precio_oferta_base: priceOfertaBase,
          moneda_oferta_base: monedaOfertaBase,
          precio_oferta: priceOfertaArs,
          precio_oferta_usd: priceOfertaUsd,
          descripcion: p.descripcion ?? "",
          destacado: p.destacado ?? "NO",
          oferta: p.oferta ?? "NO",
          stock: p.stock ?? "SI",
          descuento: (p.tiers?.length ?? 0) > 0 ? "SI" : "NO",
          color_predeterminado: p.color_predeterminado ?? null,
          imagen_url: p.imagen_url ?? null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        };
      } else {
        // EN EDICIÓN GENERAL DE PRODUCTO EXISTENTE:
        // NO se tocan ni recalculan las columnas de precio bajo ninguna circunstancia
        row = {
          nombre: p.nombre,
          categoria: p.categoria,
          descripcion: p.descripcion ?? "",
          destacado: p.destacado ?? "NO",
          oferta: p.oferta ?? "NO",
          stock: p.stock ?? "SI",
          descuento: (p.tiers?.length ?? 0) > 0 ? "SI" : "NO",
          color_predeterminado: p.color_predeterminado ?? null,
          imagen_url: p.imagen_url ?? null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
        };
      }

      let productId: string;

      if (p.id) {
        // Actualizar datos generales
        const { error } = await supabaseAdmin.from("products").update(row).eq("id", p.id);
        if (error) throw error;
        productId = p.id;
      } else {
        // Crear
        const newId = crypto.randomUUID();
        const { data: inserted, error } = await supabaseAdmin
          .from("products")
          .insert({ id: newId, ...row })
          .select("id")
          .single();
        if (error) throw error;
        productId = String(inserted.id);
      }

      // Gestionar variantes: si es creación o edición general
      if (p.variants !== undefined) {
        // Leer variantes existentes para conservar precios si ya existían
        const { data: existingVariants } = await supabaseAdmin
          .from("product_variants")
          .select("*")
          .eq("product_id", productId);

        const existingMap = new Map((existingVariants ?? []).map((v) => [v.color.toLowerCase().trim(), v]));

        // Borrar las existentes
        await supabaseAdmin.from("product_variants").delete().eq("product_id", productId);

        // Insertar las nuevas
        if (p.variants.length > 0) {
          const variantRows = p.variants.map((v) => {
            const colorKey = String(v.color ?? "").toLowerCase().trim();
            const existing = existingMap.get(colorKey);

            let vBase = existing?.precio_base ?? null;
            let vMoneda = existing?.moneda_base ?? "USD";
            let vPriceUsd = existing?.precio_usd ?? null;
            let vPriceArs = existing?.precio ?? 0;

            if (isNew) {
              const rawVPriceUsd = parsePrice(v.precio_usd ?? v.precio_base);
              const rawVPriceArs = parsePrice(v.precio);

              if (rawVPriceUsd !== null && rawVPriceUsd > 0) {
                vBase = rawVPriceUsd;
                vMoneda = "USD";
                vPriceUsd = Math.round(rawVPriceUsd * 1.07 * 100) / 100;
                vPriceArs = arsFromUsd(vPriceUsd);
              } else if (rawVPriceArs !== null && rawVPriceArs > 0) {
                vBase = rawVPriceArs;
                vMoneda = "ARS";
                vPriceArs = Math.round(rawVPriceArs * 1.07);
                vPriceUsd = rate > 0 ? Math.round((vPriceArs / rate) * 100) / 100 : null;
              } else {
                vBase = (row.precio_base as number) ?? null;
                vMoneda = (row.moneda_base as string) ?? "USD";
                vPriceUsd = (row.precio_usd as number) ?? null;
                vPriceArs = (row.precio as number) ?? 0;
              }
            } else if (!existing) {
              // Nueva variante agregada durante edición: toma el precio del producto padre
              const parentPriceUsd = parsePrice(p.precio_usd);
              const parentPriceArs = parsePrice(p.precio);
              vBase = p.precio_base ? Number(p.precio_base) : (parentPriceUsd ?? null);
              vMoneda = (p.moneda_base as string) ?? "USD";
              vPriceUsd = parentPriceUsd ?? null;
              vPriceArs = parentPriceArs ?? 0;
            }

            return {
              id: crypto.randomUUID(),
              product_id: productId,
              color: String(v.color ?? "").trim(),
              precio_base: vBase,
              moneda_base: vMoneda,
              precio: vPriceArs,
              precio_usd: vPriceUsd,
              stock: v.stock ?? "SI",
              imagen_url: v.imagen_url ?? null,
            };
          });

          const { error: vErr } = await supabaseAdmin.from("product_variants").insert(variantRows);
          if (vErr) throw vErr;
        }
      }

      return { id: productId };
    } catch (err) {
      console.error("Error in upsertAdminProduct:", err);
      const msg = (err as any)?.message || (err as any)?.details || String(err);
      return { error: `Error al guardar: ${msg}` };
    }
  });

/* ─── Actualizar exclusivamente precios (Admin, Modal de Precio) ── */

export const updateProductPrice = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email?: string;
      token?: string;
      productId: string;
      sourceCurrency: "USD" | "ARS";
      basePrice: number;
      hasOffer?: boolean;
      offerSourceCurrency?: "USD" | "ARS";
      offerBasePrice?: number | null;
      variants?: {
        id?: string;
        color: string;
        sourceCurrency?: "USD" | "ARS";
        basePrice?: number | null;
      }[];
    }) => ({
      email: str(data?.email, 160).toLowerCase(),
      token: str(data?.token, 2000),
      productId: str(data?.productId, 100),
      sourceCurrency: data?.sourceCurrency === "ARS" ? ("ARS" as const) : ("USD" as const),
      basePrice: Number(data?.basePrice) || 0,
      hasOffer: Boolean(data?.hasOffer),
      offerSourceCurrency: data?.offerSourceCurrency === "ARS" ? ("ARS" as const) : ("USD" as const),
      offerBasePrice: data?.offerBasePrice !== null && data?.offerBasePrice !== undefined ? Number(data.offerBasePrice) : null,
      variants: Array.isArray(data?.variants)
        ? data.variants.map((v) => ({
            id: v.id ? str(v.id, 100) : undefined,
            color: str(v.color, 100),
            sourceCurrency: v.sourceCurrency === "ARS" ? ("ARS" as const) : ("USD" as const),
            basePrice: v.basePrice !== null && v.basePrice !== undefined ? Number(v.basePrice) : null,
          }))
        : undefined,
    }),
  )
  .handler(async ({ data }): Promise<{ success?: boolean; untouched?: boolean; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);

      if (!data.productId) throw new Error("ID de producto no provisto.");
      if (data.basePrice <= 0) throw new Error("El precio base debe ser mayor a 0.");

      // Leer settings de cotización
      let rate = 1500;
      let markup = 0;
      let increment = 10;

      try {
        const { data: pSettings } = await (supabaseAdmin as any)
          .from("pricing_settings")
          .select("last_rate, markup_percentage, rounding_increment")
          .eq("id", true)
          .maybeSingle();

        if (pSettings) {
          if (Number(pSettings.last_rate) > 0) rate = Number(pSettings.last_rate);
          if (pSettings.markup_percentage !== undefined) markup = Number(pSettings.markup_percentage) / 100;
          if (Number(pSettings.rounding_increment) > 0) increment = Number(pSettings.rounding_increment);
        }
      } catch {}

      if (!rate) {
        try {
          const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3000) });
          if (apiRes.ok) {
            const apiData = (await apiRes.json()) as { venta?: number };
            if (apiData?.venta && apiData.venta > 0) rate = Math.round(apiData.venta);
          }
        } catch {}
      }

      if (!rate) {
        const { data: cfgRow } = await (supabaseAdmin as any)
          .from("site_config")
          .select("valor")
          .eq("clave", "dolar_cotizacion")
          .maybeSingle();
        rate = Number(cfgRow?.valor) > 0 ? Number(cfgRow?.valor) : 1500;
      }

      const arsFromUsd = (usd: number) => {
        if (increment > 1) {
          return Math.ceil((usd * rate * (1 + markup)) / increment) * increment;
        }
        return Math.round(usd * rate * (1 + markup));
      };

      // 1. Calcular precio principal a partir del precio base + 7%
      let finalUsd: number;
      let finalArs: number;

      if (data.sourceCurrency === "USD") {
        finalUsd = Math.round(data.basePrice * 1.07 * 100) / 100;
        finalArs = arsFromUsd(finalUsd);
      } else {
        finalArs = Math.round(data.basePrice * 1.07);
        finalUsd = rate > 0 ? Math.round((finalArs / rate) * 100) / 100 : 0;
      }

      // 2. Calcular precio de oferta si aplica
      let finalOfferUsd: number | null = null;
      let finalOfferArs: number | null = null;
      let offerBase: number | null = null;
      let offerMoneda: string | null = null;

      if (data.hasOffer && data.offerBasePrice && data.offerBasePrice > 0) {
        offerBase = data.offerBasePrice;
        offerMoneda = data.offerSourceCurrency;

        if (data.offerSourceCurrency === "USD") {
          finalOfferUsd = Math.round(data.offerBasePrice * 1.07 * 100) / 100;
          finalOfferArs = arsFromUsd(finalOfferUsd);
        } else {
          finalOfferArs = Math.round(data.offerBasePrice * 1.07);
          finalOfferUsd = rate > 0 ? Math.round((finalOfferArs / rate) * 100) / 100 : null;
        }
      }

      const productUpdate: Record<string, unknown> = {
        precio_base: data.basePrice,
        moneda_base: data.sourceCurrency,
        precio_usd: finalUsd,
        precio: String(finalArs),
        oferta: data.hasOffer ? "SI" : "NO",
        precio_oferta_base: offerBase,
        moneda_oferta_base: offerMoneda,
        precio_oferta_usd: finalOfferUsd,
        precio_oferta: finalOfferArs !== null ? String(finalOfferArs) : null,
        precio_actualizado_en: new Date().toISOString(),
      };

      const { error: prodErr } = await supabaseAdmin
        .from("products")
        .update(productUpdate)
        .eq("id", data.productId);

      if (prodErr) throw prodErr;

      // 3. Actualizar precios de variantes si corresponde
      if (data.variants && data.variants.length > 0) {
        for (const v of data.variants) {
          let vBase = v.basePrice && v.basePrice > 0 ? v.basePrice : data.basePrice;
          let vMoneda = v.basePrice && v.basePrice > 0 ? (v.sourceCurrency || data.sourceCurrency) : data.sourceCurrency;
          let vFinalUsd: number;
          let vFinalArs: number;

          if (vMoneda === "USD") {
            vFinalUsd = Math.round(vBase * 1.07 * 100) / 100;
            vFinalArs = arsFromUsd(vFinalUsd);
          } else {
            vFinalArs = Math.round(vBase * 1.07);
            vFinalUsd = rate > 0 ? Math.round((vFinalArs / rate) * 100) / 100 : 0;
          }

          const vUpdate = {
            precio_base: vBase,
            moneda_base: vMoneda,
            precio_usd: vFinalUsd,
            precio: vFinalArs,
            precio_actualizado_en: new Date().toISOString(),
          };

          if (v.id) {
            await supabaseAdmin.from("product_variants").update(vUpdate).eq("id", v.id);
          } else {
            await supabaseAdmin
              .from("product_variants")
              .update(vUpdate)
              .eq("product_id", data.productId)
              .eq("color", v.color);
          }
        }
      }

      return { success: true };
    } catch (err) {
      console.error("Error in updateProductPrice:", err);
      return { error: err instanceof Error ? err.message : "Error al actualizar precios." };
    }
  });

/* ─── Eliminar un producto (y sus variantes en cascada) ── */

export const deleteAdminProduct = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string; productId: string }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
    productId: str(data?.productId, 100),
  }))
  .handler(async ({ data }): Promise<{ error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);

      // Variantes primero (FK)
      await supabaseAdmin.from("product_variants").delete().eq("product_id", data.productId);
      const { error } = await supabaseAdmin.from("products").delete().eq("id", data.productId);
      if (error) throw error;

      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Error al eliminar el producto." };
    }
  });

/* ─── Subir imagen de producto (Admin, bypass RLS) ─────── */

export const uploadAdminProductImage = createServerFn({ method: "POST" })
  .validator(
    (data: { email?: string; token?: string; filename: string; base64: string; bucket?: string }) => ({
      email: str(data?.email, 160).toLowerCase(),
      token: str(data?.token, 2000),
      filename: str(data?.filename, 200),
      base64: data?.base64 ?? "",
      bucket: str(data?.bucket, 60) || "storage-images",
    }),
  )
  .handler(async ({ data }): Promise<{ publicUrl?: string; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);

      // Convertir base64 a buffer
      const base64Data = data.base64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const bucketName = data.bucket || "storage-images";

      // Crear bucket si no existe
      try {
        const { data: buckets } = await supabaseAdmin.storage.listBuckets();
        if (!buckets?.some((b) => b.name === bucketName)) {
          await supabaseAdmin.storage.createBucket(bucketName, { public: true });
        }
      } catch {}

      const { error: uploadErr } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(data.filename, buffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const { data: pubData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(data.filename);
      return { publicUrl: pubData.publicUrl };
    } catch (err) {
      console.error("Error al subir imagen:", err);
      return { error: err instanceof Error ? err.message : "Error al subir la imagen." };
    }
  });

/* ─── Guardar reglas de categoría en site_config ─────────── */

export const upsertCategoryRules = createServerFn({ method: "POST" })
  .validator(
    (data: {
      email?: string;
      token?: string;
      rules: CategoryRuleInput[];
      dolarCotizacion?: number;
      bankInfo?: {
        alias?: string;
        cbu?: string;
        titular?: string;
        banco?: string;
        descuentoPct?: number;
      };
      resendConfig?: {
        apiKey?: string;
        from?: string;
      };
      couponConfig?: {
        activo?: boolean;
        codigo?: string;
        descuentoPct?: number;
      };
    }) => ({
      email: str(data?.email, 160).toLowerCase(),
      token: str(data?.token, 2000),
      rules: data.rules,
      dolarCotizacion: data.dolarCotizacion,
      bankInfo: data.bankInfo,
      resendConfig: data.resendConfig,
      couponConfig: data.couponConfig,
    }),
  )
  .handler(async ({ data }): Promise<{ error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);

      // Borra todas las reglas de categoría existentes
      const { error: delErr } = await supabaseAdmin
        .from("site_config")
        .delete()
        .like("clave", "cat_%");
      if (delErr) throw delErr;

      // Construye filas nuevas
      const rows: { clave: string; valor: string }[] = [];
      for (const rule of data.rules) {
        const cat = rule.category.trim().toLowerCase().normalize("NFC");
        if (!cat) continue;
        const validTiers = rule.discountTiers
          .filter((t) => t.units > 0 && t.percent > 0)
          .sort((a, b) => a.units - b.units);
        if (validTiers.length > 0) {
          rows.push({ clave: `cat_discount_${cat}`, valor: JSON.stringify(validTiers) });
        }
        if (rule.minType === "units" && rule.minValue > 0) {
          rows.push({ clave: `cat_min_units_${cat}`, valor: String(rule.minValue) });
        }
        if (rule.minType === "amount" && rule.minValue > 0) {
          rows.push({ clave: `cat_min_amount_${cat}`, valor: String(rule.minValue) });
        }
      }

      if (data.dolarCotizacion && data.dolarCotizacion > 0) {
        await (supabaseAdmin as any).from("site_config").upsert(
          { clave: "dolar_cotizacion", valor: String(data.dolarCotizacion) },
          { onConflict: "clave" }
        );
      }

      if (data.bankInfo) {
        const bankRows = [
          { clave: "transferencia_alias", valor: data.bankInfo.alias ?? "teimportamos.mp" },
          { clave: "transferencia_cbu", valor: data.bankInfo.cbu ?? "" },
          { clave: "transferencia_titular", valor: data.bankInfo.titular ?? "" },
          { clave: "transferencia_banco", valor: data.bankInfo.banco ?? "" },
          { clave: "transferencia_descuento_pct", valor: String(data.bankInfo.descuentoPct ?? 7) },
        ];
        for (const bRow of bankRows) {
          await (supabaseAdmin as any).from("site_config").upsert(bRow, { onConflict: "clave" });
        }
      }

      if (data.resendConfig) {
        if (data.resendConfig.apiKey) {
          await (supabaseAdmin as any).from("site_config").upsert(
            { clave: "resend_api_key", valor: data.resendConfig.apiKey.trim() },
            { onConflict: "clave" }
          );
        }
        if (data.resendConfig.from) {
          await (supabaseAdmin as any).from("site_config").upsert(
            { clave: "resend_from", valor: data.resendConfig.from.trim() },
            { onConflict: "clave" }
          );
        }
      }

      if (data.couponConfig) {
        const couponRows = [
          {
            clave: "promo_cupon_activo",
            valor: data.couponConfig.activo ? "SI" : "NO",
          },
          {
            clave: "promo_cupon_codigo",
            valor: (data.couponConfig.codigo || "TEIMPORTAMOS").trim().toUpperCase(),
          },
          {
            clave: "promo_cupon_descuento_pct",
            valor: String(data.couponConfig.descuentoPct ?? 5),
          },
        ];
        for (const cRow of couponRows) {
          const { error: cErr } = await (supabaseAdmin as any)
            .from("site_config")
            .upsert(cRow, { onConflict: "clave" });
          if (cErr) throw cErr;
        }
      }

      if (rows.length > 0) {
        const { error: insErr } = await (supabaseAdmin as any).from("site_config").insert(rows);
        if (insErr) throw insErr;
      }

      return {};
    } catch (err) {
      console.error("Error in upsertCategoryRules:", err);
      return { error: err instanceof Error ? err.message : "Error al guardar reglas." };
    }
  });

/**
 * Valida si un código promocional es válido, activo y si el usuario aún no lo utilizó.
 */
export const validatePromoCoupon = createServerFn({ method: "POST" })
  .validator(
    (data: { code: string; userId?: string; email?: string; token?: string }) => ({
      code: str(data.code, 40).toUpperCase().trim(),
      userId: data.userId ? str(data.userId, 60) : undefined,
      email: data.email ? str(data.email, 160).toLowerCase().trim() : undefined,
      token: data.token ? str(data.token, 4000) : undefined,
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      valid: boolean;
      discountPct?: number;
      code?: string;
      error?: string;
    }> => {
      try {
        if (!data.code) {
          return { valid: false, error: "Ingresá un código promocional." };
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Verificar autenticación
        let verifiedUserId = data.userId;
        let verifiedEmail = data.email;

        if (data.token) {
          const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
          if (userData?.user) {
            verifiedUserId = userData.user.id;
            verifiedEmail = userData.user.email ?? verifiedEmail;
          }
        }

        if (!verifiedUserId) {
          return {
            valid: false,
            error: "Debés iniciar sesión con tu cuenta para reclamar el cupón.",
          };
        }

        // 2. Obtener configuración de cupones desde site_config
        const { data: configRows } = await supabaseAdmin.from("site_config").select("*");
        const configMap: Record<string, string> = {};
        for (const row of configRows ?? []) {
          if (row.clave && row.valor) configMap[row.clave] = row.valor;
        }

        const isCouponActive = (configMap["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI";
        if (!isCouponActive) {
          return {
            valid: false,
            error: "El cupón promocional no está activo o ya finalizó su periodo de vigencia.",
          };
        }

        const validCode = (configMap["promo_cupon_codigo"] ?? "TEIMPORTAMOS").toUpperCase().trim();
        if (data.code !== validCode) {
          return {
            valid: false,
            error: "El código promocional ingresado no es válido.",
          };
        }

        const discountPct = Number(configMap["promo_cupon_descuento_pct"]) || 5;

        // 3. Verificar si el usuario ya consumió el cupón en site_config
        const userUsageKey = `coupon_usage_${validCode}_${verifiedUserId}`;
        const emailUsageKey = verifiedEmail ? `coupon_usage_${validCode}_${verifiedEmail.trim().toLowerCase()}` : "";
        if (configMap[userUsageKey] || (emailUsageKey && configMap[emailUsageKey])) {
          return {
            valid: false,
            error: "Ya utilizaste este código de descuento en una compra anterior (válido 1 sola vez por cuenta).",
          };
        }

        // 4. Verificar si el usuario ya consumió el cupón en coupon_usages
        const filterParts: string[] = [`user_id.eq.${verifiedUserId}`];
        if (verifiedEmail) {
          filterParts.push(`user_email.ilike.${verifiedEmail.trim().toLowerCase()}`);
        }

        try {
          const { data: usageRows } = await supabaseAdmin
            .from("coupon_usages")
            .select("id")
            .eq("coupon_code", validCode)
            .or(filterParts.join(","))
            .limit(1);

          if (usageRows && usageRows.length > 0) {
            return {
              valid: false,
              error: "Ya utilizaste este código de descuento en una compra anterior (válido 1 sola vez por cuenta).",
            };
          }
        } catch (usageErr) {
          console.warn("Error consultando coupon_usages:", usageErr);
        }

        return {
          valid: true,
          code: validCode,
          discountPct,
        };
      } catch (err) {
        console.error("Error validando cupón promocional:", err);
        return {
          valid: false,
          error: "Error al validar el cupón. Probá nuevamente.",
        };
      }
    },
  );

/**
 * Consulta la cantidad de usos del cupón para el panel de administración.
 */
export const getCouponUsagesSummary = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
  }))
  .handler(async ({ data }): Promise<{ count: number; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      let count = 0;
      try {
        const { count: dbCount } = await supabaseAdmin
          .from("coupon_usages")
          .select("*", { count: "exact", head: true });
        if (typeof dbCount === "number") count = dbCount;
      } catch {
        // ignore
      }

      const { data: scRows } = await supabaseAdmin
        .from("site_config")
        .select("clave")
        .like("clave", "coupon_usage_%");

      const distinctUsers = new Set<string>();
      for (const row of scRows ?? []) {
        if (row.clave) distinctUsers.add(row.clave);
      }

      return { count: Math.max(count, Math.ceil(distinctUsers.size / 2)) };
    } catch (err) {
      return { count: 0, error: err instanceof Error ? err.message : "Error" };
    }
  });

export const testAdminResendEmail = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string; targetEmail?: string }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
    targetEmail: str(data?.targetEmail, 160).toLowerCase(),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    try {
      await assertAdmin(data.email, data.token);
      const { sendTestOrderEmail } = await import("@/lib/email.functions");
      return await sendTestOrderEmail(data.targetEmail || data.email);
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : "Error de autorización.",
      };
    }
  });

/**
 * Activa o desactiva instantáneamente el cupón de descuento desde el panel admin.
 */
export const setPromoCouponActive = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string; active: boolean }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
    active: Boolean(data?.active),
  }))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      const valor = data.active ? "SI" : "NO";
      const { error } = await (supabaseAdmin as any)
        .from("site_config")
        .upsert({ clave: "promo_cupon_activo", valor }, { onConflict: "clave" });
      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error("Error actualizando estado del cupón:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error al actualizar estado del cupón.",
      };
    }
  });

/* ─── Tipos e Integración para Combos / Banners en Oferta ─── */

export type BannerInput = {
  id?: string;
  titulo: string;
  subtitulo?: string;
  imagen_url?: string;
  link?: string;
  activo?: string;
  precio: string;
  precio_base?: number | string | null;
  moneda_base?: "USD" | "ARS" | string | null;
  precio_usd?: number | string | null;
  precio_actualizado_en?: string | null;
};

export const getAdminBanners = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
  }))
  .handler(async ({ data }): Promise<{ banners: Banner[]; dolarRate?: number; roundingIncrement?: number; markupPercentage?: number; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      const [bannersRes, pricingRes] = await Promise.all([
        supabaseAdmin.from("banners").select("*"),
        (supabaseAdmin as any).from("pricing_settings").select("last_rate, markup_percentage, rounding_increment").eq("id", true).maybeSingle(),
      ]);
      if (bannersRes.error) throw bannersRes.error;

      let dolarRate = 0;
      let roundingIncrement = 10;
      let markupPercentage = 0;

      if (pricingRes?.data) {
        if (Number(pricingRes.data.last_rate) > 0) dolarRate = Number(pricingRes.data.last_rate);
        if (Number(pricingRes.data.rounding_increment) > 0) roundingIncrement = Number(pricingRes.data.rounding_increment);
        if (pricingRes.data.markup_percentage !== undefined) markupPercentage = Number(pricingRes.data.markup_percentage);
      }

      if (!dolarRate) {
        try {
          const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3000) });
          if (apiRes.ok) {
            const apiData = (await apiRes.json()) as { venta?: number };
            if (apiData?.venta && apiData.venta > 0) dolarRate = Math.round(apiData.venta);
          }
        } catch {}
      }

      return {
        banners: (bannersRes.data ?? []) as Banner[],
        dolarRate: dolarRate || 1500,
        roundingIncrement,
        markupPercentage,
      };
    } catch (err) {
      return { banners: [], error: err instanceof Error ? err.message : "Error al cargar combos." };
    }
  });

export const upsertAdminBanner = createServerFn({ method: "POST" })
  .validator(
    (data: { email?: string; token?: string; banner: BannerInput }) => ({
      email: str(data?.email, 160).toLowerCase(),
      token: str(data?.token, 2000),
      banner: data.banner,
    })
  )
  .handler(async ({ data }): Promise<{ id?: string; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      const b = data.banner;

      const fullRow: Record<string, unknown> = {
        titulo: b.titulo,
        subtitulo: b.subtitulo ?? "",
        imagen_url: b.imagen_url ?? "",
        link: b.link ?? "",
        activo: b.activo ?? "SI",
        precio: String(b.precio ?? "0"),
        precio_base: b.precio_base !== undefined && b.precio_base !== null && b.precio_base !== "" ? Number(b.precio_base) : null,
        moneda_base: b.moneda_base ?? "USD",
        precio_usd: b.precio_usd !== undefined && b.precio_usd !== null && b.precio_usd !== "" ? Number(b.precio_usd) : null,
        precio_actualizado_en: new Date().toISOString(),
      };

      const basicRow: Record<string, unknown> = {
        titulo: b.titulo,
        subtitulo: b.subtitulo ?? "",
        imagen_url: b.imagen_url ?? "",
        link: b.link ?? "",
        activo: b.activo ?? "SI",
        precio: String(b.precio ?? "0"),
      };

      if (b.id) {
        let { error } = await supabaseAdmin.from("banners").update(fullRow).eq("id", b.id);
        if (error) {
          console.warn("Retrying banner update with basic columns:", error.message);
          const retry = await supabaseAdmin.from("banners").update(basicRow).eq("id", b.id);
          if (retry.error) throw retry.error;
        }
        return { id: b.id };
      } else {
        const newId = crypto.randomUUID();
        // 1. Intento completo con UUID
        let { data: ins, error } = await supabaseAdmin
          .from("banners")
          .insert({ id: newId, ...fullRow })
          .select("id")
          .single();

        // 2. Si falla por columnas nuevas no migradas, reintentar con basicRow y UUID
        if (error) {
          console.warn("Retrying banner insert with basic columns:", error.message);
          const retryBasic = await supabaseAdmin
            .from("banners")
            .insert({ id: newId, ...basicRow })
            .select("id")
            .single();
          ins = retryBasic.data;
          error = retryBasic.error;
        }

        // 3. Si falla por ID serial / autogenerado, reintentar sin ID
        if (error) {
          console.warn("Retrying banner insert without custom ID:", error.message);
          const retryNoId = await supabaseAdmin
            .from("banners")
            .insert(basicRow)
            .select("id")
            .single();
          ins = retryNoId.data;
          error = retryNoId.error;
        }

        if (error) throw error;
        return { id: String(ins?.id ?? newId) };
      }
    } catch (err) {
      console.error("Error in upsertAdminBanner:", err);
      return { error: err instanceof Error ? err.message : "Error al guardar el combo." };
    }
  });

export const deleteAdminBanner = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string; bannerId: string }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
    bannerId: str(data?.bannerId, 100),
  }))
  .handler(async ({ data }): Promise<{ error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      const { error } = await supabaseAdmin.from("banners").delete().eq("id", data.bannerId);
      if (error) throw error;
      return {};
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Error al eliminar el combo." };
    }
  });

/* ─── Actualización masiva de stock y variantes ────────────────── */

export const bulkUpdateAdminStock = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string; productIds: string[]; stock: "SI" | "NO" }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
    productIds: Array.isArray(data?.productIds) ? data.productIds.map((id) => str(id, 100)) : [],
    stock: data?.stock === "NO" ? ("NO" as const) : ("SI" as const),
  }))
  .handler(async ({ data }): Promise<{ success?: boolean; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      if (data.productIds.length === 0) return { success: true };

      // 1. Obtener productos para actualizar sus metadata de talles si aplica
      const { data: prods, error: fetchErr } = await supabaseAdmin
        .from("products")
        .select("id, metadata")
        .in("id", data.productIds);

      if (fetchErr) throw fetchErr;

      const defaultShoes = "35,36,37,38,39,40,41,42,43,44,45";
      const defaultClothes = "XS,S,M,L,XL,XXL,XXXL";

      for (const p of prods ?? []) {
        const meta = (p.metadata as Record<string, string> | null) ?? {};
        const tipo = String(meta["tipo_talles"] ?? "").toUpperCase();

        if (tipo === "ZAPATILLAS" || tipo === "ROPA") {
          const updatedMeta = { ...meta };
          if (data.stock === "NO") {
            updatedMeta["talles_disponibles"] = "";
          } else {
            updatedMeta["talles_disponibles"] = tipo === "ZAPATILLAS" ? defaultShoes : defaultClothes;
          }
          await supabaseAdmin
            .from("products")
            .update({ stock: data.stock, metadata: updatedMeta })
            .eq("id", p.id);
        } else {
          await supabaseAdmin
            .from("products")
            .update({ stock: data.stock })
            .eq("id", p.id);
        }
      }

      // 2. Actualizar también todas las variantes de color pertenecientes a estos productos
      await supabaseAdmin
        .from("product_variants")
        .update({ stock: data.stock })
        .in("product_id", data.productIds);

      return { success: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Error al actualizar stock masivo." };
    }
  });

export const updateVariantStock = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string; variantId: string; stock: "SI" | "NO" }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
    variantId: str(data?.variantId, 100),
    stock: data?.stock === "NO" ? ("NO" as const) : ("SI" as const),
  }))
  .handler(async ({ data }): Promise<{ success?: boolean; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      const { error } = await supabaseAdmin
        .from("product_variants")
        .update({ stock: data.stock })
        .eq("id", data.variantId);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Error al actualizar stock de la variante." };
    }
  });


