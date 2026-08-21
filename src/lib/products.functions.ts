import { createServerFn } from "@tanstack/react-start";
import type { Product, ProductVariant } from "@/lib/store";

const str = (v: unknown, max = 2000) => String(v ?? "").slice(0, max);


/* ─── Tipos de entrada ─────────────────────────────────── */

export type VariantInput = {
  id?: string; // presente si ya existe en la DB
  color: string;
  precio: number | string;
  stock?: string | null;
  imagen_url?: string | null;
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
        const meta = typeof p.metadata === "object" && p.metadata !== null ? p.metadata : {};
        const { metadata, ...rest } = p;
        return { ...rest, ...meta, variants: variantsByProduct.get(String(p.id ?? "")) ?? [] } as Product;
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

      // Construir metadata de descuentos
      const metadata: Record<string, string> = {};
      for (const tier of p.tiers ?? []) {
        if (tier.units > 0 && tier.percent > 0) {
          metadata[`${tier.units} unidades`] = `${tier.percent}%`;
        }
      }

      const row = {
        nombre: p.nombre,
        categoria: p.categoria,
        precio: p.precio,
        precio_usd: p.precio_usd ?? null,
        precio_oferta: p.precio_oferta ?? "",
        precio_oferta_usd: p.precio_oferta_usd ?? null,
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
        const { data: inserted, error } = await supabaseAdmin
          .from("products")
          .insert(row)
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
            product_id: productId,
            color: v.color,
            precio: v.precio,
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
