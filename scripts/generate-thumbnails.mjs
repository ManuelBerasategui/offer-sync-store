import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// 1. Cargar variables de entorno de forma segura (sin hardcodear secretos)
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
  console.error("Error: SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY faltan en .env o entorno.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Parámetros de ejecución
const APPLY = process.env.APPLY === "1";
const TARGET_CACHE_CONTROL = "31536000"; // 1 año
const THUMB_SIZE = 160; // 160x160 px para miniaturas

/**
 * Obtiene el path relativo de storage y el bucket desde una URL pública
 */
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

/**
 * Deriva el nombre del thumbnail a partir del objectPath
 * ej: "products/abc.webp" -> "products/thumbnails/abc.webp"
 */
function getThumbnailPath(objectPath) {
  const parts = objectPath.split("/");
  const fileName = parts.pop();
  return [...parts, "thumbnails", fileName].join("/");
}

async function run() {
  console.log("================================================================================");
  console.log("🖼️  GENERADOR DE MINIATURAS (160px WebP) - EGRESS AUDIT & TOOL");
  console.log("================================================================================");
  console.log("Modo:", APPLY ? "🚨 APLICAR CAMBIOS REALES (APPLY=1)" : "🔍 SIMULACIÓN / DRY-RUN (Sin modificar nada)");
  console.log("Tamaño de miniatura objetivo:", `${THUMB_SIZE}x${THUMB_SIZE}px WebP`);
  console.log("Cache-Control asignado:", TARGET_CACHE_CONTROL);
  console.log("================================================================================\n");

  // 1. Obtener todas las imágenes activas del catálogo (productos, variantes, banners)
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

  console.log("Total imágenes únicas referenciadas en BD:", uniqueUrls.size);

  const storageImages = [];
  for (const url of uniqueUrls) {
    const parsed = parseStorageUrl(url);
    if (parsed) {
      storageImages.push({
        originalUrl: url,
        bucket: parsed.bucket,
        objectPath: parsed.objectPath,
        thumbPath: getThumbnailPath(parsed.objectPath),
      });
    }
  }

  console.log("Imágenes alojadas en Supabase Storage:", storageImages.length, "\n");

  // 2. Verificar existencia de miniaturas ya creadas en cada bucket
  console.log("🔍 Verificando miniaturas existentes en buckets...");
  const bucketsToCheck = [...new Set(storageImages.map((s) => s.bucket))];
  const existingFilesByBucket = new Map();

  for (const b of bucketsToCheck) {
    const existing = new Set();
    let offset = 0;
    const limit = 100;
    while (true) {
      const { data, error } = await supabase.storage.from(b).list("", { limit, offset });
      if (error || !data || data.length === 0) break;
      for (const item of data) {
        if (!item.id) {
          // Si es subcarpeta, listar dentro
          const sub = await supabase.storage.from(b).list(item.name, { limit: 1000 });
          (sub.data || []).forEach((s) => {
            existing.add(`${item.name}/${s.name}`);
            if (!s.id) {
              // Sub-subcarpeta (ej: products/thumbnails/...)
              // Se detectará en sublistados según corresponda
            }
          });
        } else {
          existing.add(item.name);
        }
      }
      if (data.length < limit) break;
      offset += limit;
    }
    existingFilesByBucket.set(b, existing);
  }

  const pending = [];
  let alreadyExistCount = 0;

  for (const img of storageImages) {
    // Verificar si el thumbnail ya existe
    const parts = img.thumbPath.split("/");
    const folder = parts.slice(0, -1).join("/");
    const filename = parts[parts.length - 1];

    const { data: checkData } = await supabase.storage.from(img.bucket).list(folder, {
      limit: 10,
      search: filename,
    });

    const exists = checkData && checkData.some((f) => f.name === filename);
    if (exists) {
      alreadyExistCount++;
    } else {
      pending.push(img);
    }
  }

  // Estimar el tamaño de descarga consultando metadatos HEAD
  console.log("\n⚖️  Calculando peso estimado de descarga para generar miniaturas...");
  let estimatedTotalBytes = 0;
  let sampleCount = 0;

  // Hacemos HEAD a una muestra para obtener el promedio exacto de peso
  const samples = pending.slice(0, 15);
  for (const s of samples) {
    try {
      const headRes = await fetch(s.originalUrl, { method: "HEAD" });
      const len = parseInt(headRes.headers.get("content-length") || "0", 10);
      if (len > 0) {
        estimatedTotalBytes += len;
        sampleCount++;
      }
    } catch {
      // ignore
    }
  }

  const avgBytes = sampleCount > 0 ? estimatedTotalBytes / sampleCount : 35 * 1024; // ~35KB default
  const totalDownloadBytes = pending.length * avgBytes;
  const totalDownloadMB = totalDownloadBytes / (1024 * 1024);
  const totalDownloadGB = totalDownloadMB / 1024;

  console.log("\n================================================================================");
  console.log("📊 RESULTADOS DEL ANÁLISIS DE MINIATURAS:");
  console.log(`   Total imágenes activas analizadas:  ${storageImages.length}`);
  console.log(`   ✅ Miniaturas ya existentes:        ${alreadyExistCount}`);
  console.log(`   ⏳ Miniaturas faltantes:            ${pending.length}`);
  console.log(`   📦 Peso promedio por original:      ${(avgBytes / 1024).toFixed(1)} KB`);
  console.log(`   🚀 Egress necesario de descarga:    ${totalDownloadMB.toFixed(2)} MB (${totalDownloadGB.toFixed(4)} GB)`);
  console.log("================================================================================\n");

  if (pending.length > 0) {
    console.log("Top 5 imágenes que recibirán miniatura:");
    pending.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i + 1}. [${p.bucket}] ${p.objectPath} ➔ ${p.thumbPath}`);
    });
  }

  if (!APPLY) {
    console.log("\nℹ️  Ejecución en DRY-RUN completada. No se descargó ni subió ninguna miniatura.");
    console.log("   Para generarlas en storage, se debe ejecutar con: APPLY=1 node scripts/generate-thumbnails.mjs");
    return;
  }

  console.log("\n🚨 Invocando generación con Sharp y subida...");
  const sharp = (await import("sharp")).default;
  let successCount = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    try {
      process.stdout.write(`   [${i + 1}/${pending.length}] Procesando ${item.objectPath}... `);
      const res = await fetch(item.originalUrl);
      if (!res.ok) {
        console.log("❌ Error descargando original");
        continue;
      }
      const arrayBuf = await res.arrayBuffer();
      const thumbBuf = await sharp(Buffer.from(arrayBuf))
        .rotate()
        .resize({ width: THUMB_SIZE, height: THUMB_SIZE, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();

      const { error: upErr } = await supabase.storage.from(item.bucket).upload(item.thumbPath, thumbBuf, {
        contentType: "image/webp",
        cacheControl: TARGET_CACHE_CONTROL,
        upsert: false,
      });

      if (upErr) {
        console.log("❌ Error subiendo:", upErr.message);
      } else {
        console.log(`✅ OK (${(thumbBuf.length / 1024).toFixed(1)} KB)`);
        successCount++;
      }
    } catch (err) {
      console.log("❌ Excepción:", err.message);
    }
  }

  console.log("\n🏁 Finalizado:");
  console.log(`   Miniaturas creadas exitosamente: ${successCount}`);
}

run().catch((err) => {
  console.error("Error inesperado:", err.message);
  process.exit(1);
});
