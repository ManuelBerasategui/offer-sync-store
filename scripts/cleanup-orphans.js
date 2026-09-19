import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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

const isDryRun = !process.argv.includes("--delete");

async function run() {
  console.log(`=== MODO: ${isDryRun ? "DRY-RUN (SIMULACIÓN - NO BORRA NADA)" : "ELIMINACIÓN REAL"} ===\n`);

  // 1. Recolectar todas las referencias de imágenes existentes en la DB
  const usedTokens = new Set();

  function addTokens(val) {
    if (!val) return;
    if (typeof val === "string") {
      // Extraer nombre del archivo (ej: 8dd02318-2100-4402-90f9-71e89ccea434.webp)
      const parts = val.split(/[/?#]/);
      for (const p of parts) {
        if (p.length > 5) {
          usedTokens.add(p.toLowerCase());
        }
      }
    } else if (typeof val === "object") {
      for (const k of Object.keys(val)) {
        addTokens(val[k]);
      }
    }
  }

  // Products
  const { data: products } = await supabase.from("products").select("*");
  (products || []).forEach(p => {
    addTokens(p.imagen_url);
    addTokens(p.metadata);
  });

  // Product Variants
  const { data: variants } = await supabase.from("product_variants").select("*");
  (variants || []).forEach(v => {
    addTokens(v.imagen_url);
  });

  // Banners
  const { data: banners } = await supabase.from("banners").select("*");
  (banners || []).forEach(b => {
    addTokens(b.imagen_url);
    addTokens(b.link);
  });

  // Site Config
  const { data: configs } = await supabase.from("site_config").select("*");
  (configs || []).forEach(c => {
    addTokens(c.valor);
  });

  console.log(`✓ Referencias y tokens de imágenes activas en DB extraídos: ${usedTokens.size}`);

  // 2. Revisar cada bucket
  const buckets = ["storage-images", "store-images"];
  let grandTotalOrphans = 0;
  let grandTotalBytes = 0;

  for (const bucketName of buckets) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Analizando bucket: [${bucketName}]`);
    console.log(`--------------------------------------------------`);

    const files = await listAllFiles(bucketName, "");
    console.log(`Total archivos en el bucket: ${files.length}`);

    const orphans = [];
    let bucketBytes = 0;
    let orphanBytes = 0;

    for (const f of files) {
      const size = f.metadata?.size || 0;
      bucketBytes += size;

      // Extraer el nombre base y partes de la ruta
      const fileName = f.path.split("/").pop().toLowerCase();
      const pathLower = f.path.toLowerCase();

      // ¿Está referenciado en la base de datos?
      let isUsed = false;
      if (usedTokens.has(fileName)) {
        isUsed = true;
      } else {
        for (const token of usedTokens) {
          if (token.length > 8 && (pathLower.includes(token) || fileName.includes(token))) {
            isUsed = true;
            break;
          }
        }
      }

      if (!isUsed) {
        orphans.push(f);
        orphanBytes += size;
      }
    }

    grandTotalOrphans += orphans.length;
    grandTotalBytes += orphanBytes;

    console.log(`Tamaño actual del bucket: ${(bucketBytes / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Archivos huérfanos a limpiar: ${orphans.length} (${(orphanBytes / 1024 / 1024).toFixed(2)} MB)`);

    if (orphans.length > 0) {
      if (isDryRun) {
        console.log(`[DRY-RUN] Se borrarían ${orphans.length} archivos en [${bucketName}] liberando ${(orphanBytes / 1024 / 1024).toFixed(2)} MB.`);
      } else {
        console.log(`[BORRANDO] Eliminando ${orphans.length} archivos en lotes de 50...`);
        const batchSize = 50;
        for (let i = 0; i < orphans.length; i += batchSize) {
          const batch = orphans.slice(i, i + batchSize).map(o => o.path);
          const { error: delErr } = await supabase.storage.from(bucketName).remove(batch);
          if (delErr) {
            console.error("Error borrando lote:", i, delErr.message);
          } else {
            process.stdout.write(`.`);
          }
        }
        console.log(`\n✓ Bucket [${bucketName}] limpiado con éxito.`);
      }
    }
  }

  console.log(`\n==================================================`);
  console.log(`RESUMEN FINAL:`);
  console.log(`Total archivos huérfanos encontrados: ${grandTotalOrphans}`);
  console.log(`Espacio total a liberar: ${(grandTotalBytes / 1024 / 1024).toFixed(2)} MB (${(grandTotalBytes / 1024 / 1024 / 1024).toFixed(2)} GB)`);
  if (isDryRun) {
    console.log(`\nPara ejecutar el borrado definitivo y liberar este espacio, corré:`);
    console.log(`node scripts/cleanup-orphans.js --delete`);
  } else {
    console.log(`\n¡Espacio liberado con éxito! Supabase actualizará las métricas en su próximo ciclo.`);
  }
  console.log(`==================================================`);
}

async function listAllFiles(bucketName, prefix = "") {
  let files = [];
  const { data, error } = await supabase.storage.from(bucketName).list(prefix, { limit: 1000 });
  if (error || !data) return files;

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
    if (!item.id && !item.metadata) {
      const subFiles = await listAllFiles(bucketName, fullPath);
      files = files.concat(subFiles);
    } else {
      files.push({ ...item, path: fullPath });
    }
  }
  return files;
}

run().catch(console.error);
