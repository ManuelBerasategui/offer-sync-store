import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const envPath = path.resolve(process.cwd(), ".env");
const envVars = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (!match) continue;
  const key = match[1].trim();
  let value = match[2].trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  envVars[key] = value;
}

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);
const TARGET_BUCKET = "store-images";

function driveFileId(url) {
  const value = String(url ?? "").trim();
  const match = value.match(/\/file\/d\/([\w-]+)/) || value.match(/[?&]id=([\w-]+)/) || value.match(/\/d\/([\w-]+)/);
  return match?.[1] ?? "";
}

// Extraer bucket y path relativo de una URL de Supabase Storage para poder borrarla
function parseSupabaseStorageUrl(url) {
  if (!url || typeof url !== "string") return null;
  const match = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
  if (match) {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  }
  return null;
}

async function compressAndUpload(sourceUrl, destSubfolder, uniqueKey) {
  const fileId = driveFileId(sourceUrl);
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : sourceUrl;

  const res = await fetch(downloadUrl, {
    headers: {
      accept: "image/avif,image/webp,image/*,*/*;q=0.8",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      referer: "https://photo.yupoo.com/",
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al descargar ${sourceUrl.slice(0, 80)}`);
  }

  const rawBuffer = Buffer.from(await res.arrayBuffer());
  const originalSize = rawBuffer.length;

  // Comprimir con sharp a WebP: máx 900x900, 80% calidad (ideal para tienda e-commerce)
  const compressedBuffer = await sharp(rawBuffer)
    .rotate() // respeta orientación EXIF de celulares
    .resize({
      width: 900,
      height: 900,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();

  const compressedSize = compressedBuffer.length;

  const keyHash = createHash("sha256").update(uniqueKey).digest("hex").slice(0, 16);
  const urlHash = createHash("sha256").update(sourceUrl).digest("hex").slice(0, 16);
  const objectPath = `optimized/${destSubfolder}/${keyHash}_${urlHash}.webp`;

  const { error: upErr } = await supabase.storage.from(TARGET_BUCKET).upload(objectPath, compressedBuffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });

  if (upErr) {
    throw new Error(`Upload error en Supabase: ${upErr.message}`);
  }

  const { data: pubData } = supabase.storage.from(TARGET_BUCKET).getPublicUrl(objectPath);

  // Si la imagen original estaba en Supabase Storage, borrarla para no dejar basura de 5MB
  const oldStorage = parseSupabaseStorageUrl(sourceUrl);
  if (oldStorage && !sourceUrl.includes("/optimized/")) {
    await supabase.storage.from(oldStorage.bucket).remove([oldStorage.path]);
  }

  return {
    publicUrl: pubData.publicUrl,
    originalSize,
    compressedSize,
  };
}

async function main() {
  console.log("==========================================================");
  console.log("🚀 INICIANDO COMPRESIÓN MASIVA A WEBP (YUPPO + PRODUCTOS)");
  console.log("==========================================================\n");

  let totalSavedBytes = 0;
  let optimizedCount = 0;
  let errorCount = 0;

  // 1. PRODUCTOS
  const { data: products } = await supabase.from("products").select("id, nombre, imagen_url, metadata");
  console.log(`Analizando ${products?.length || 0} productos...`);

  for (let i = 0; i < (products || []).length; i++) {
    const p = products[i];
    const url = p.imagen_url || "";

    // Si ya está optimizada con WebP en store-images/optimized/, saltear
    if (url.includes("/store-images/optimized/") && url.endsWith(".webp")) {
      continue;
    }

    if (!url.startsWith("http")) {
      continue;
    }

    try {
      const res = await compressAndUpload(url, "products", String(p.id));
      const origKb = Math.round(res.originalSize / 1024);
      const compKb = Math.round(res.compressedSize / 1024);
      const savingsPct = Math.round((1 - res.compressedSize / res.originalSize) * 100);
      totalSavedBytes += (res.originalSize - res.compressedSize);
      optimizedCount++;

      // Actualizar producto con nueva URL optimizada
      let updatedMetadata = p.metadata || {};
      if (typeof updatedMetadata === "object") {
        updatedMetadata.raw_imagen_url_backup = url;
      }

      // Revisar si metadata tiene extra_images (Yupoo suele guardar varias)
      if (Array.isArray(updatedMetadata?.extra_images)) {
        const newExtra = [];
        for (let j = 0; j < updatedMetadata.extra_images.length; j++) {
          const exUrl = updatedMetadata.extra_images[j];
          if (exUrl && exUrl.startsWith("http") && !exUrl.includes("/optimized/")) {
            try {
              const exRes = await compressAndUpload(exUrl, "products_extra", `${p.id}_extra_${j}`);
              totalSavedBytes += (exRes.originalSize - exRes.compressedSize);
              newExtra.push(exRes.publicUrl);
            } catch {
              newExtra.push(exUrl);
            }
          } else {
            newExtra.push(exUrl);
          }
        }
        updatedMetadata.extra_images = newExtra;
      }

      await supabase.from("products").update({
        imagen_url: res.publicUrl,
        metadata: updatedMetadata,
      }).eq("id", p.id);

      console.log(`[P ${i + 1}/${products.length}] ✔ ${p.nombre?.slice(0, 35)}: ${origKb}KB -> ${compKb}KB (-${savingsPct}%)`);
    } catch (err) {
      errorCount++;
      console.error("[P Error optimizando producto]:", i + 1, p.nombre, err.message);
    }
  }

  // 2. VARIANTES
  const { data: variants } = await supabase.from("product_variants").select("id, product_id, color, imagen_url");
  console.log(`\nAnalizando ${variants?.length || 0} variantes...`);

  for (let i = 0; i < (variants || []).length; i++) {
    const v = variants[i];
    const url = v.imagen_url || "";

    if (url.includes("/store-images/optimized/") && url.endsWith(".webp")) {
      continue;
    }

    if (!url.startsWith("http")) {
      continue;
    }

    try {
      const res = await compressAndUpload(url, "variants", String(v.id));
      const origKb = Math.round(res.originalSize / 1024);
      const compKb = Math.round(res.compressedSize / 1024);
      const savingsPct = Math.round((1 - res.compressedSize / res.originalSize) * 100);
      totalSavedBytes += (res.originalSize - res.compressedSize);
      optimizedCount++;

      await supabase.from("product_variants").update({
        imagen_url: res.publicUrl,
      }).eq("id", v.id);

      console.log(`[V ${i + 1}/${variants.length}] ✔ Variante ${v.color}: ${origKb}KB -> ${compKb}KB (-${savingsPct}%)`);
    } catch (err) {
      errorCount++;
      console.error("[V Error optimizando variante]:", i + 1, v.color, err.message);
    }
  }

  console.log("\n==========================================================");
  console.log("🎉 OPTIMIZACIÓN COMPLETADA CON ÉXITO");
  console.log(`Total imágenes procesadas a WebP: ${optimizedCount}`);
  console.log(`Total peso ahorrado: ${(totalSavedBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Errores: ${errorCount}`);
  console.log("==========================================================");
}

main().catch(console.error);
