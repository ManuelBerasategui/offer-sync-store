import { createServerFn } from "@tanstack/react-start";

import { fotoCodigo } from "@/lib/store";
import { assertAdmin } from "./admin-auth";
import { MAX_EXTRA_IMAGES } from "./product-gallery";
import { invalidateStoreCache } from "./store.functions";

/**
 * Fotos de las mallas (cada foto = un modelo que el cliente puede elegir).
 * Sección aparte del panel para subir modelos nuevos y bajar los que no tienen stock
 * sin tocar el resto del producto (precio, curvas, descripción).
 */
export const MALLAS_PRODUCT_ID = "8f487a29-7cd4-435b-a1b1-0578a0011f58";

/** Máximo de fotos: la principal + las extra que admite la galería. */
const MAX_FOTOS = MAX_EXTRA_IMAGES + 1;
const STORAGE_BUCKETS = new Set(["storage-images", "store-images"]);
const PUBLIC_MARKER = "/storage/v1/object/public/";

/** Solo se aceptan fotos públicas del Storage de la tienda (nada de links externos). */
export function isStoreStorageImage(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 600) return false;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!parsed.hostname.toLowerCase().endsWith(".supabase.co")) return false;
  if (parsed.search || parsed.hash) return false;
  if (!parsed.pathname.startsWith(PUBLIC_MARKER)) return false;
  const parts = parsed.pathname.slice(PUBLIC_MARKER.length).split("/");
  const bucket = parts[0] ?? "";
  if (!STORAGE_BUCKETS.has(bucket) || parts.length < 2) return false;
  if (parts.some((p) => p === "" || p === "." || p === "..")) return false;
  return true;
}

export type MallaFoto = { url: string; codigo: string };

function fotosOf(row: { imagen_url?: string | null; metadata?: unknown }): string[] {
  const meta =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const extra = Array.isArray(meta["extra_images"]) ? (meta["extra_images"] as unknown[]) : [];
  const all = [row.imagen_url, ...extra].map((u) => String(u ?? "").trim()).filter(Boolean);
  return [...new Set(all)];
}

const authValidator = (data: { email?: string; token?: string }) => ({
  email: String(data?.email ?? "")
    .slice(0, 160)
    .toLowerCase(),
  token: String(data?.token ?? "").slice(0, 2000),
});

export const getMallasFotos = createServerFn({ method: "POST" })
  .validator(authValidator)
  .handler(async ({ data }): Promise<{ fotos?: MallaFoto[]; nombre?: string; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      const { data: row, error } = await (supabaseAdmin as any)
        .from("products")
        .select("nombre,imagen_url,metadata")
        .eq("id", MALLAS_PRODUCT_ID)
        .maybeSingle();
      if (error) throw error;
      if (!row) return { error: "No se encontró el producto de mallas." };
      return {
        nombre: String(row.nombre ?? ""),
        fotos: fotosOf(row).map((url) => ({ url, codigo: fotoCodigo(url) })),
      };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudieron cargar las fotos." };
    }
  });

/**
 * Guarda la lista completa de fotos en el orden dado (la primera queda como principal).
 * No borra archivos del Storage: una foto que se baja se puede volver a subir.
 */
export const setMallasFotos = createServerFn({ method: "POST" })
  .validator((data: { email?: string; token?: string; fotos?: unknown }) => {
    const raw = Array.isArray(data?.fotos) ? data.fotos.slice(0, MAX_FOTOS + 1) : [];
    return { ...authValidator(data), fotos: raw };
  })
  .handler(async ({ data }): Promise<{ ok?: boolean; error?: string }> => {
    try {
      const supabaseAdmin = await assertAdmin(data.email, data.token);
      if (data.fotos.length > MAX_FOTOS) return { error: `Máximo ${MAX_FOTOS} fotos.` };
      if (!data.fotos.every(isStoreStorageImage)) {
        return {
          error: "Hay una foto que no es de la tienda. Recargá la página y probá de nuevo.",
        };
      }
      const fotos = [...new Set(data.fotos as string[])];
      if (fotos.length === 0) return { error: "Tiene que quedar al menos una foto." };

      const { data: row, error } = await (supabaseAdmin as any)
        .from("products")
        .select("metadata")
        .eq("id", MALLAS_PRODUCT_ID)
        .maybeSingle();
      if (error) throw error;
      if (!row) return { error: "No se encontró el producto de mallas." };

      const meta =
        row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
          ? { ...(row.metadata as Record<string, unknown>) }
          : {};
      meta["extra_images"] = fotos.slice(1);

      const { error: upErr } = await (supabaseAdmin as any)
        .from("products")
        .update({ imagen_url: fotos[0], metadata: meta })
        .eq("id", MALLAS_PRODUCT_ID);
      if (upErr) throw upErr;

      await invalidateStoreCache();
      return { ok: true };
    } catch (err) {
      return { error: err instanceof Error ? err.message : "No se pudieron guardar las fotos." };
    }
  });
