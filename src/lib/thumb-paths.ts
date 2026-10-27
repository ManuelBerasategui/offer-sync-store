/**
 * Rutas de las miniaturas de una imagen de Supabase Storage.
 *
 * Deben coincidir con thumbnailUrl() en store.ts: misma carpeta, subcarpeta "thumbnails" (160px)
 * o "thumbnails-md" (320px) y EXACTAMENTE el mismo nombre de archivo que la imagen original.
 * Si el nombre no coincide, la tienda no encuentra la miniatura y carga la foto completa.
 */
export const THUMB_SIZES = { sm: 160, md: 320 } as const;

export function thumbObjectPaths(objectPath: string): { sm: string; md: string } {
  const parts = objectPath.split("/");
  const fileName = parts.pop() ?? "";
  const dir = parts.length ? `${parts.join("/")}/` : "";
  return { sm: `${dir}thumbnails/${fileName}`, md: `${dir}thumbnails-md/${fileName}` };
}

/** Separa una URL pública de Storage en bucket y ruta del objeto. null si no es de Storage. */
export function parseStoragePublicUrl(raw: string): { bucket: string; objectPath: string } | null {
  try {
    const { pathname } = new URL(raw.trim());
    const marker = "/storage/v1/object/public/";
    if (!pathname.startsWith(marker)) return null;
    const after = decodeURIComponent(pathname.slice(marker.length));
    const slash = after.indexOf("/");
    if (slash <= 0) return null;
    const bucket = after.slice(0, slash);
    const objectPath = after.slice(slash + 1);
    if (!objectPath || objectPath.includes("..")) return null;
    // No generar miniaturas de miniaturas
    if (/(^|\/)thumbnails(-md)?\//.test(objectPath)) return null;
    return { bucket, objectPath };
  } catch {
    return null;
  }
}
