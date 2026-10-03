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

// Parámetros de ejecución configurables por variables de entorno
const APPLY = process.env.APPLY === "1";
const TARGET_CACHE_CONTROL = "31536000"; // 1 año en segundos
const MIN_SIZE_BYTES = parseInt(process.env.MIN_SIZE || "0", 10); // En bytes (ej: MIN_SIZE=50000 para >50KB)
const FILTER_PREFIX = (process.env.PREFIX || "").trim(); // Prefijo opcional (ej: PREFIX=products/ o PREFIX=optimized/)
const TARGET_BUCKET_NAME = (process.env.BUCKET || "").trim(); // Bucket específico opcional

/**
 * Lista todos los archivos de un bucket de forma recursiva
 */
async function listAllFiles(bucket, prefix = "") {
  let allFiles = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });

    if (error) {
      console.error("Error listando archivos en bucket:", bucket, "prefijo:", prefix, error.message);
      break;
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = !item.id || item.metadata === null;

      if (isFolder) {
        const subFiles = await listAllFiles(bucket, fullPath);
        allFiles = allFiles.concat(subFiles);
      } else {
        allFiles.push({
          bucket,
          path: fullPath,
          name: item.name,
          id: item.id,
          size: item.metadata?.size ?? 0,
          mimetype: item.metadata?.mimetype ?? "image/webp",
          cacheControl: item.metadata?.cacheControl ?? "",
        });
      }
    }

    if (data.length < limit) break;
    offset += limit;
  }

  return allFiles;
}

async function updateFile(bucket, file) {
  const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(file.path);
  if (downloadError || !blob) {
    console.error("Error descargando archivo:", file.path, downloadError?.message);
    return { success: false, error: downloadError?.message };
  }

  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = file.mimetype || blob.type || "image/webp";

  const { error: updateError } = await supabase.storage.from(bucket).update(file.path, buffer, {
    cacheControl: TARGET_CACHE_CONTROL,
    contentType,
    upsert: true,
  });

  if (updateError) {
    console.error("Error actualizando archivo:", file.path, updateError.message);
    return { success: false, error: updateError.message };
  }

  return { success: true, size: buffer.length };
}

async function run() {
  console.log("================================================================================");
  console.log("🛠️  SUPABASE STORAGE CACHE-CONTROL AUDIT & UPDATE SCRIPT");
  console.log("================================================================================");
  console.log("Modo:", APPLY ? "🚨 APLICAR CAMBIOS REALES (APPLY=1)" : "🔍 SIMULACIÓN / DRY-RUN (Sin modificar nada)");
  console.log("Filtro MIN_SIZE:", MIN_SIZE_BYTES > 0 ? `${(MIN_SIZE_BYTES / 1024).toFixed(1)} KB` : "Ninguno (todos los tamaños)");
  console.log("Filtro PREFIX:", FILTER_PREFIX || "Ninguno (todos los directorios)");
  console.log("Filtro BUCKET:", TARGET_BUCKET_NAME || "Todos los buckets públicos");
  console.log("================================================================================\n");

  const { data: buckets, error: bucketsErr } = await supabase.storage.listBuckets();
  if (bucketsErr) {
    console.error("Error listando buckets:", bucketsErr.message);
    process.exit(1);
  }

  const publicBuckets = buckets.filter((b) => b.public && (!TARGET_BUCKET_NAME || b.name === TARGET_BUCKET_NAME));
  console.log("Buckets a inspeccionar:", publicBuckets.map((b) => b.name).join(", "), "\n");

  let grandTotalScanned = 0;
  let grandTotalMatched = 0;
  let grandTotalAlreadyCached = 0;
  let grandTotalNeedsUpdate = 0;
  let grandTotalEgressBytes = 0;

  const candidateFiles = [];

  for (const bucket of publicBuckets) {
    console.log(`📂 Inspeccionando bucket [${bucket.name}]...`);
    const files = await listAllFiles(bucket.name, FILTER_PREFIX);
    grandTotalScanned += files.length;

    for (const f of files) {
      if (FILTER_PREFIX && !f.path.startsWith(FILTER_PREFIX)) continue;
      if (MIN_SIZE_BYTES > 0 && f.size < MIN_SIZE_BYTES) continue;

      grandTotalMatched++;
      const hasLongCache =
        f.cacheControl && (f.cacheControl.includes("31536000") || f.cacheControl.includes("max-age=31536000"));

      if (hasLongCache) {
        grandTotalAlreadyCached++;
      } else {
        grandTotalNeedsUpdate++;
        grandTotalEgressBytes += f.size;
        candidateFiles.push(f);
      }
    }
  }

  // Ordenar candidatos por tamaño decreciente para ver los más pesados
  candidateFiles.sort((a, b) => b.size - a.size);

  console.log("\n================================================================================");
  console.log("📊 RESULTADOS DE LA AUDITORÍA DE ARCHIVOS:");
  console.log(`   Total archivos escaneados:            ${grandTotalScanned}`);
  console.log(`   Archivos que coinciden con filtros:   ${grandTotalMatched}`);
  console.log(`   ✅ Ya tienen Cache-Control 1 año:     ${grandTotalAlreadyCached}`);
  console.log(`   ⚠️  Necesitan actualización:           ${grandTotalNeedsUpdate}`);
  console.log(`   📦 Peso total a descargar (egress):   ${(grandTotalEgressBytes / (1024 * 1024)).toFixed(2)} MB (${(grandTotalEgressBytes / (1024 * 1024 * 1024)).toFixed(4)} GB)`);
  console.log("================================================================================\n");

  if (candidateFiles.length > 0) {
    console.log("🔝 Top archivos candidatos a actualizar (más pesados):");
    const top = candidateFiles.slice(0, 10);
    top.forEach((f, idx) => {
      console.log(`   ${idx + 1}. [${f.bucket}] ${f.path} - ${(f.size / 1024).toFixed(1)} KB (Cache actual: ${f.cacheControl || "default 1h"})`);
    });
    if (candidateFiles.length > 10) {
      console.log(`   ... y ${candidateFiles.length - 10} archivos más.`);
    }
  } else {
    console.log("🎉 ¡Todos los archivos que coinciden con los filtros ya tienen el encabezado de 1 año!");
  }

  if (!APPLY) {
    console.log("\nℹ️  Ejecución en DRY-RUN completada. No se modificó ningún archivo.");
    console.log("   Para aplicar los cambios reales, ejecuta con: APPLY=1 node set-cache-control.mjs");
    return;
  }

  console.log("\n🚨 APLICANDO ACTUALIZACIONES A ARCHIVOS CANDIDATOS...");
  let updatedCount = 0;
  let failCount = 0;

  for (let i = 0; i < candidateFiles.length; i++) {
    const f = candidateFiles[i];
    process.stdout.write(`   [${i + 1}/${candidateFiles.length}] Actualizando ${f.path} (${(f.size / 1024).toFixed(1)} KB)... `);
    const res = await updateFile(f.bucket, f);
    if (res.success) {
      console.log("✅ OK");
      updatedCount++;
    } else {
      console.log("❌ Error");
      failCount++;
    }
  }

  console.log("\n🏁 Finalizado:");
  console.log(`   Actualizados exitosamente: ${updatedCount}`);
  console.log(`   Fallidos: ${failCount}`);
}

run().catch((err) => {
  console.error("Error fatal:", err.message);
  process.exit(1);
});
