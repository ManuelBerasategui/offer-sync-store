/**
 * Generación de miniaturas en el servidor (sharp).
 *
 * Las tarjetas de producto y combo piden la miniatura de 320px; si no existe, el navegador termina
 * cargando la foto completa, que pesa varias veces más y suma egress de Supabase en cada visita.
 */
import { THUMB_SIZES, thumbObjectPaths } from "./thumb-paths";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AdminClient = any;

/** Genera y sube las miniaturas de 160px y 320px de una imagen. Devuelve cuántas se subieron. */
export async function uploadThumbnails(
  supabaseAdmin: AdminClient,
  bucket: string,
  objectPath: string,
  source: Buffer | ArrayBuffer,
): Promise<number> {
  const sharp = (await import("sharp")).default;
  const input = Buffer.isBuffer(source) ? source : Buffer.from(source);
  const paths = thumbObjectPaths(objectPath);
  let uploaded = 0;
  for (const size of ["sm", "md"] as const) {
    try {
      const px = THUMB_SIZES[size];
      const buf = await sharp(input)
        .rotate()
        .resize({ width: px, height: px, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      const { error } = await supabaseAdmin.storage.from(bucket).upload(paths[size], buf, {
        contentType: "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });
      if (!error) uploaded++;
      else console.warn("[thumbs] no se pudo subir", paths[size], error.message);
    } catch (err) {
      console.warn("[thumbs] no se pudo generar", paths[size], err);
    }
  }
  return uploaded;
}
