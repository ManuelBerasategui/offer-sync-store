import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Cargar variables de entorno
const envPath = path.resolve(process.cwd(), ".env");
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envVars[key] = value;
  }
}

const supabaseUrl = process.env.SUPABASE_URL || envVars.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltan en .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const APPLY = process.env.APPLY === "1";
const TARGET_CACHE_CONTROL = "31536000"; // 1 año
const THUMB_MD_SIZE = 320; // 320x320 px para cards

function parseStorageUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;
  const marker = "/storage/v1/object/public/";
  const idx = rawUrl.indexOf(marker);
  if (idx === -1) return null;

  const after = rawUrl.substring(idx + marker.length);
  const slashIdx = after.indexOf("/");
  if (slashIdx === -1) return null;

  const bucket = after.substring(0, slashIdx);
  const objectPath = after.substring(slashIdx + 1);
  return { bucket, objectPath };
}

function getThumbnailMdPath(objectPath) {
  const parts = objectPath.split("/");
  const fileName = parts.pop();
  return [...parts, "thumbnails-md", fileName].join("/");
}

async function run() {
  console.log("================================================================================");
  console.log("🖼️  GENERADOR DE MINIATURAS MEDIUM (320px WebP) - DRY RUN / TOOL");
  console.log("================================================================================");
  console.log("Modo:", APPLY ? "🚨 APLICAR CAMBIOS REALES (APPLY=1)" : "🔍 SIMULACIÓN / DRY-RUN (Sin modificar nada)");
  console.log("Tamaño de miniatura objetivo:", `${THUMB_MD_SIZE}x${THUMB_MD_SIZE}px WebP`);
  console.log("Carpeta destino:", "thumbnails-md/");
  console.log("Cache-Control asignado:", TARGET_CACHE_CONTROL);
  console.log("================================================================================\n");

  console.log("📥 Recolectando imágenes del catálogo en base de datos...");
  const [prodsRes, varsRes, bansRes] = await Promise.all([
    supabase.from("products").select("id, nombre, imagen_url").not("imagen_url", "is", null),
    supabase.from("product_variants").select("id, product_id, imagen_url").not("imagen_url", "is", null),
    supabase.from("banners").select("id, titulo, imagen_url").not("imagen_url", "is", null),
  ]);

  const uniqueUrls = new Set();
  (prodsRes.data || []).forEach((p) => p.imagen_url && uniqueUrls.add(p.imagen_url.trim()));
  (varsRes.data || []).forEach((v) => v.imagen_url && uniqueUrls.add(v.imagen_url.trim()));
  (bansRes.data || []).forEach((b) => b.imagen_url && uniqueUrls.add(b.imagen_url.trim()));

  const storageImages = [];
  for (const url of uniqueUrls) {
    const parsed = parseStorageUrl(url);
    if (parsed) {
      storageImages.push({
        originalUrl: url,
        bucket: parsed.bucket,
        objectPath: parsed.objectPath,
        thumbMdPath: getThumbnailMdPath(parsed.objectPath),
      });
    }
  }

  console.log(`Total imágenes activas en Storage: ${storageImages.length}`);

  // Verificar cuáles ya existen en thumbnails-md/ haciendo HEAD requests rápidos
  console.log("🔍 Verificando cuántas miniaturas 320px ya existen en Storage...");
  let alreadyExists = 0;
  let missing = [];

  const BATCH_CHECK = 20;
  for (let i = 0; i < storageImages.length; i += BATCH_CHECK) {
    const batch = storageImages.slice(i, i + BATCH_CHECK);
    await Promise.all(
      batch.map(async (img) => {
        const thumbUrl = `${supabaseUrl}/storage/v1/object/public/${img.bucket}/${img.thumbMdPath}`;
        try {
          const res = await fetch(thumbUrl, { method: "HEAD" });
          if (res.status === 200) {
            alreadyExists++;
          } else {
            missing.push(img);
          }
        } catch {
          missing.push(img);
        }
      })
    );
  }

  console.log(`• Ya existentes en /thumbnails-md/: ${alreadyExists}`);
  console.log(`• Faltantes por generar: ${missing.length}`);

  // Estimación de descarga de originales para generar
  // Promedio medido de imagen original: ~32 KB
  const avgOrigKB = 32.2;
  const estimatedDownloadMB = (missing.length * avgOrigKB) / 1024;
  const estimatedDownloadGB = estimatedDownloadMB / 1024;

  console.log("\n--------------------------------------------------------------------------------");
  console.log("📊 ESTIMACIÓN DE EGRESS PARA EL BACKFILL (APPLY=1):");
  console.log(`• Imágenes a procesar: ${missing.length}`);
  console.log(`• Descarga estimada de originales: ~${estimatedDownloadMB.toFixed(2)} MB (${estimatedDownloadGB.toFixed(4)} GB)`);
  console.log("--------------------------------------------------------------------------------\n");

  if (!APPLY) {
    console.log("💡 Para ejecutar la generación real de las miniaturas 320px WebP, ejecutá:");
    console.log("   APPLY=1 node scripts/generate-thumbnails-md.mjs\n");
    return;
  }

  console.log(`🚀 Iniciando generación de ${missing.length} miniaturas de 320px WebP...`);
  const sharp = (await import("sharp")).default;
  let processed = 0;
  let errors = 0;

  for (const img of missing) {
    processed++;
    try {
      const res = await fetch(img.originalUrl);
      if (!res.ok) {
        console.warn(`[${processed}/${missing.length}] Falló descarga original: ${img.originalUrl} (${res.status})`);
        errors++;
        continue;
      }
      const arrayBuf = await res.arrayBuffer();
      const inputBuffer = Buffer.from(arrayBuf);

      const thumbBuffer = await sharp(inputBuffer)
        .rotate()
        .resize({ width: THUMB_MD_SIZE, height: THUMB_MD_SIZE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toBuffer();

      const { error: upErr } = await supabase.storage
        .from(img.bucket)
        .upload(img.thumbMdPath, thumbBuffer, {
          contentType: "image/webp",
          cacheControl: TARGET_CACHE_CONTROL,
          upsert: true,
        });

      if (upErr) {
        console.warn("[%d/%d] Error al subir %s: %s", processed, missing.length, img.thumbMdPath, String(upErr.message));
        errors++;
      } else {
        if (processed % 25 === 0 || processed === missing.length) {
          console.log("[%d/%d] Generada: %s (%s KB)", processed, missing.length, img.thumbMdPath, (thumbBuffer.length / 1024).toFixed(1));
        }
      }
    } catch (e) {
      console.error("[%d/%d] Excepción procesando %s: %s", processed, missing.length, img.objectPath, String(e.message));
      errors++;
    }
  }

  console.log("\n================================================================================");
  console.log("✅ PROCESO COMPLETADO");
  console.log(`• Miniaturas creadas con éxito: ${processed - errors}`);
  console.log(`• Errores: ${errors}`);
  console.log("================================================================================\n");
}

run().catch(console.error);
