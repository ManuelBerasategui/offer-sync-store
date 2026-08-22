import { createServerFn } from "@tanstack/react-start";
import type { Product, ProductVariant } from "@/lib/store";

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
  precio: number | string;
  stock?: string | null;
  imagen_url?: string | null;
  talles_disponibles?: string[];
};

export type ProductInput = {
  id?: string; // presente si es edición
  nombre: string;
  categoria: string;
  precio: string;
  precio_usd?: string;
  precio_oferta?: string;
  precio_oferta_usd?: string;
  descripcion?: string;
  destacado?: string;
  oferta?: string;
  stock?: string;
  descuento?: string;
  color_predeterminado?: string | null;
  imagen_url?: string | null;
  tipo_talles?: "ZAPATILLAS" | "ROPA" | "NINGUNO";
  talles_disponibles?: string[];
  /** Tiers: [{ units: 5, percent: 2.5 }, ...] */
  tiers?: { units: number; percent: number }[];
  variants?: VariantInput[];
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

/* ─── Listar todos los productos (admin, con variantes) ── */

export const getAdminProducts = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string }) => ({
    email: str(data?.email, 160).toLowerCase(),
    token: str(data?.token, 2000),
  }))
  .handler(async ({ data }): Promise<{ products: Product[]; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);

      const [productsRes, variantsRes] = await Promise.all([
        supabaseAdmin.from("products").select("*").order("nombre"),
        supabaseAdmin.from("product_variants").select("*"),
      ]);

      if (productsRes.error) throw productsRes.error;

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
        return { ...rest, ...meta, variants } as Product;
      });

      return { products };
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

      // Cotización dólar USDT Cripto en vivo para cálculo inicial si no se ingresó precio ARS manual
      let rate = 0;
      try {
        const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3000) });
        if (apiRes.ok) {
          const apiData = (await apiRes.json()) as { venta?: number };
          if (apiData?.venta && apiData.venta > 0) {
            rate = Math.round(apiData.venta);
          }
        }
      } catch {
        // Fallback a site_config si falla la API
      }

      if (!rate) {
        const { data: cfgRow } = await (supabaseAdmin as any)
          .from("site_config")
          .select("valor")
          .eq("clave", "dolar_cotizacion")
          .maybeSingle();
        rate = Number(cfgRow?.valor) > 0 ? Number(cfgRow?.valor) : 1500;
      }

      const priceUsd = parsePrice(p.precio_usd);
      const priceArs = parsePrice(p.precio) ?? (priceUsd !== null ? Math.round(priceUsd * rate) : null);
      const priceOfertaUsd = parsePrice(p.precio_oferta_usd);
      const priceOfertaArs = parsePrice(p.precio_oferta) ?? (priceOfertaUsd !== null ? Math.round(priceOfertaUsd * rate) : null);

      const row = {
        nombre: p.nombre,
        categoria: p.categoria,
        precio: priceArs,
        precio_usd: priceUsd,
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

      let productId: string;

      if (p.id) {
        // Actualizar
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

      // Gestionar variantes: reemplazar todas las del producto
      if (p.variants !== undefined) {
        // Borrar las existentes
        await supabaseAdmin.from("product_variants").delete().eq("product_id", productId);

        // Insertar las nuevas
        if (p.variants.length > 0) {
          const variantRows = p.variants.map((v) => ({
            id: crypto.randomUUID(),
            product_id: productId,
            color: String(v.color ?? "").trim(),
            precio: parsePrice(v.precio),
            stock: v.stock ?? "SI",
            imagen_url: v.imagen_url ?? null,
          }));
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
    (data: { email?: string; token?: string; rules: CategoryRuleInput[]; dolarCotizacion?: number }) => ({
      email: str(data?.email, 160).toLowerCase(),
      token: str(data?.token, 2000),
      rules: data.rules,
      dolarCotizacion: data.dolarCotizacion,
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
