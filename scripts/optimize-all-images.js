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

const SUPABASE_URL = envVars.SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "store-images";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan variables de Supabase.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function driveFileId(url) {
  const value = String(url ?? "").trim();
  const match = value.match(/\/file\/d\/([\w-]+)/) || value.match(/[?&]id=([\w-]+)/) || value.match(/\/d\/([\w-]+)/);
  return match?.[1] ?? "";
}

async function processAndCompressImage(sourceUrl, destinationPath) {
  const fileId = driveFileId(sourceUrl);
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : sourceUrl;
  
  const response = await fetch(downloadUrl, {
    redirect: "follow",
    headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al descargar`);
  }

  const rawBuffer = Buffer.from(await response.arrayBuffer());
  const originalSize = rawBuffer.length;

  // Comprimir con sharp a WebP (máx 1200px manteniendo proporción)
  const compressedBuffer = await sharp(rawBuffer)
    .rotate() // Respeta orientación EXIF
    .resize({
      width: 1200,
      height: 1200,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();

  const compressedSize = compressedBuffer.length;

  const objectPath = `${destinationPath}.webp`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, compressedBuffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Error al subir a Supabase Storage: ${uploadError.message}`);
  }

  const { data: pubData } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  
  return {
    publicUrl: pubData.publicUrl,
    originalSize,
    compressedSize,
  };
}

async function runOptimization() {
  console.log("=== INICIANDO OPTIMIZACIÓN MASIVA DE IMÁGENES EN SUPABASE ===");

  let totalOriginal = 0;
  let totalCompressed = 0;
  let successCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  // 1. Productos
  const { data: products, error: prodErr } = await supabase.from("products").select("id, nombre, imagen_url, metadata");
  if (prodErr) throw prodErr;

  console.log(`\nProcesando ${products.length} productos...`);

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    if (!p.imagen_url || p.imagen_url.trim() === "") {
      skippedCount++;
      continue;
    }

    // Verificar si ya es una imagen optimizada con .webp en store-images/optimized/
    const isAlreadyOptimized = p.imagen_url.includes("/store-images/optimized/") && p.imagen_url.endsWith(".webp");
    if (isAlreadyOptimized) {
      skippedCount++;
      continue;
    }

    try {
      const destHash = createHash("sha256").update(String(p.id)).digest("hex").slice(0, 16);
      const urlHash = createHash("sha256").update(p.imagen_url).digest("hex").slice(0, 16);
      const destPath = `optimized/products/${destHash}_${urlHash}`;

      const res = await processAndCompressImage(p.imagen_url, destPath);
      
      const origKb = Math.round(res.originalSize / 1024);
      const compKb = Math.round(res.compressedSize / 1024);
      const savings = Math.round((1 - res.compressedSize / res.originalSize) * 100);

      totalOriginal += res.originalSize;
      totalCompressed += res.compressedSize;
      successCount++;

      // Actualizar DB
      const meta = { ...(p.metadata || {}), raw_imagen_url_backup: p.imagen_url };
      await supabase.from("products").update({
        imagen_url: res.publicUrl,
        metadata: meta,
      }).eq("id", p.id);

      console.log(`[${i + 1}/${products.length}] ✔ ${p.nombre?.slice(0, 30)}: ${origKb}KB -> ${compKb}KB (-${savings}%)`);
    } catch (err) {
      errorCount++;
      console.error("[%d/%d] Error en producto:", i + 1, products.length, String(p.nombre), err);
    }
  }

  // 2. Variantes
  const { data: variants, error: varErr } = await supabase.from("product_variants").select("id, product_id, color, imagen_url");
  if (!varErr && variants) {
    console.log(`\nProcesando ${variants.length} variantes...`);
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.imagen_url || v.imagen_url.trim() === "") {
        skippedCount++;
        continue;
      }

      if (v.imagen_url.includes("/store-images/optimized/") && v.imagen_url.endsWith(".webp")) {
        skippedCount++;
        continue;
      }

      try {
        const destHash = createHash("sha256").update(String(v.id)).digest("hex").slice(0, 16);
        const urlHash = createHash("sha256").update(v.imagen_url).digest("hex").slice(0, 16);
        const destPath = `optimized/variants/${destHash}_${urlHash}`;

        const res = await processAndCompressImage(v.imagen_url, destPath);

        const origKb = Math.round(res.originalSize / 1024);
        const compKb = Math.round(res.compressedSize / 1024);
        const savings = Math.round((1 - res.compressedSize / res.originalSize) * 100);

        totalOriginal += res.originalSize;
        totalCompressed += res.compressedSize;
        successCount++;

        await supabase.from("product_variants").update({
          imagen_url: res.publicUrl,
        }).eq("id", v.id);

        console.log(`[Var ${i + 1}/${variants.length}] ✔ Color ${v.color}: ${origKb}KB -> ${compKb}KB (-${savings}%)`);
      } catch (err) {
        errorCount++;
        console.error("[Var %d/%d] Error en variante:", i + 1, variants.length, String(v.color), err);
      }
    }
  }

  // 3. Banners
  const { data: banners, error: banErr } = await supabase.from("banners").select("id, titulo, imagen_url");
  if (!banErr && banners) {
    console.log(`\nProcesando ${banners.length} banners...`);
    for (let i = 0; i < banners.length; i++) {
      const b = banners[i];
      if (!b.imagen_url || b.imagen_url.trim() === "") {
        skippedCount++;
        continue;
      }

      if (b.imagen_url.includes("/store-images/optimized/") && b.imagen_url.endsWith(".webp")) {
        skippedCount++;
        continue;
      }

      try {
        const destHash = createHash("sha256").update(String(b.id)).digest("hex").slice(0, 16);
        const urlHash = createHash("sha256").update(b.imagen_url).digest("hex").slice(0, 16);
        const destPath = `optimized/banners/${destHash}_${urlHash}`;

        const res = await processAndCompressImage(b.imagen_url, destPath);

        const origKb = Math.round(res.originalSize / 1024);
        const compKb = Math.round(res.compressedSize / 1024);
        const savings = Math.round((1 - res.compressedSize / res.originalSize) * 100);

        totalOriginal += res.originalSize;
        totalCompressed += res.compressedSize;
        successCount++;

        await supabase.from("banners").update({
          imagen_url: res.publicUrl,
        }).eq("id", b.id);

        console.log(`[Banner ${i + 1}/${banners.length}] ✔ ${b.titulo}: ${origKb}KB -> ${compKb}KB (-${savings}%)`);
      } catch (err) {
        errorCount++;
        console.error("[Banner %d/%d] Error en banner:", i + 1, banners.length, String(b.titulo), err);
      }
    }
  }

  console.log("\n========================================================");
  console.log(`OPTIMIZACIÓN FINALIZADA`);
  console.log(`- Imágenes procesadas con éxito: ${successCount}`);
  console.log(`- Imágenes ya optimizadas / omitidas: ${skippedCount}`);
  console.log(`- Errores: ${errorCount}`);
  const totalOrigMb = (totalOriginal / (1024 * 1024)).toFixed(2);
  const totalCompMb = (totalCompressed / (1024 * 1024)).toFixed(2);
  const totalSavings = totalOriginal > 0 ? ((1 - totalCompressed / totalOriginal) * 100).toFixed(1) : 0;
  console.log(`- Peso original transferido: ${totalOrigMb} MB`);
  console.log(`- Peso comprimido final: ${totalCompMb} MB`);
  console.log(`- Ahorro de ancho de banda: ${totalSavings}%`);
  console.log("========================================================\n");
}

runOptimization().catch((err) => {
  console.error("Error fatal en optimización:", err);
  process.exit(1);
});
