/**
 * Elimina una categoría completa: productos, variantes y sus fotos en Storage
 * (original + /thumbnails/ + /thumbnails-md/). No borra fotos que sigan usadas
 * por otro producto, variante o combo.
 *
 * Uso:
 *   node scripts/delete-category.mjs vapers            → simulación (no borra nada)
 *   node scripts/delete-category.mjs vapers --delete   → eliminación real
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
const envVars = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const eq = line.indexOf("=");
  if (eq <= 0) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  envVars[key] = value;
}

const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

const target = (process.argv[2] ?? "").trim().toLowerCase();
const isDryRun = !process.argv.includes("--delete");
if (!target || target.startsWith("--")) {
  console.error("Indicá la categoría. Ej: node scripts/delete-category.mjs vapers");
  process.exit(1);
}

const MARKER = "/storage/v1/object/public/";

function parseStorageUrl(raw) {
  if (typeof raw !== "string") return null;
  const idx = raw.indexOf(MARKER);
  if (idx === -1) return null;
  const after = raw.substring(idx + MARKER.length).split(/[?#]/)[0];
  const slash = after.indexOf("/");
  if (slash === -1) return null;
  return { bucket: after.substring(0, slash), objectPath: decodeURIComponent(after.substring(slash + 1)) };
}

function variantPaths(objectPath) {
  const parts = objectPath.split("/");
  const fileName = parts.pop();
  return [
    objectPath,
    [...parts, "thumbnails", fileName].join("/"),
    [...parts, "thumbnails-md", fileName].join("/"),
  ];
}

function collectUrls(val, out) {
  if (!val) return;
  if (typeof val === "string") {
    if (val.includes(MARKER)) out.add(val.trim());
  } else if (Array.isArray(val)) {
    val.forEach((v) => collectUrls(v, out));
  } else if (typeof val === "object") {
    Object.values(val).forEach((v) => collectUrls(v, out));
  }
}

async function fetchAll(table, columns) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function run() {
  console.log(`=== MODO: ${isDryRun ? "SIMULACIÓN (no borra nada)" : "ELIMINACIÓN REAL"} ===\n`);

  const products = await fetchAll("products", "id,nombre,categoria,imagen_url,metadata");
  const variants = await fetchAll("product_variants", "id,product_id,imagen_url");
  const banners = await fetchAll("banners", "id,imagen_url,link");

  const categories = new Map();
  for (const p of products) {
    const c = String(p.categoria ?? "").trim();
    categories.set(c, (categories.get(c) ?? 0) + 1);
  }
  const matchedCats = [...categories.keys()].filter((c) => c.toLowerCase() === target);
  if (matchedCats.length === 0) {
    console.log(`No hay categoría "${target}". Categorías existentes:`);
    for (const [c, n] of categories) console.log(`  - "${c}" (${n})`);
    return;
  }

  const doomed = products.filter((p) => matchedCats.includes(String(p.categoria ?? "").trim()));
  const doomedIds = new Set(doomed.map((p) => String(p.id)));
  const doomedVariants = variants.filter((v) => doomedIds.has(String(v.product_id)));

  // URLs de las fotos a borrar
  const doomedUrls = new Set();
  doomed.forEach((p) => { collectUrls(p.imagen_url, doomedUrls); collectUrls(p.metadata, doomedUrls); });
  doomedVariants.forEach((v) => collectUrls(v.imagen_url, doomedUrls));

  // Fotos que se siguen usando en otro lado (no se tocan)
  const keepUrls = new Set();
  products.filter((p) => !doomedIds.has(String(p.id))).forEach((p) => {
    collectUrls(p.imagen_url, keepUrls); collectUrls(p.metadata, keepUrls);
  });
  variants.filter((v) => !doomedIds.has(String(v.product_id))).forEach((v) => collectUrls(v.imagen_url, keepUrls));
  banners.forEach((b) => { collectUrls(b.imagen_url, keepUrls); collectUrls(b.link, keepUrls); });
  const keepKeys = new Set();
  for (const u of keepUrls) {
    const parsed = parseStorageUrl(u);
    if (parsed) keepKeys.add(`${parsed.bucket}::${parsed.objectPath}`);
  }

  const filesByBucket = new Map();
  let shared = 0;
  for (const u of doomedUrls) {
    const parsed = parseStorageUrl(u);
    if (!parsed) continue;
    if (keepKeys.has(`${parsed.bucket}::${parsed.objectPath}`)) { shared++; continue; }
    if (!filesByBucket.has(parsed.bucket)) filesByBucket.set(parsed.bucket, new Set());
    variantPaths(parsed.objectPath).forEach((p) => filesByBucket.get(parsed.bucket).add(p));
  }
  const totalFiles = [...filesByBucket.values()].reduce((n, s) => n + s.size, 0);

  console.log(`Categoría: ${matchedCats.map((c) => `"${c}"`).join(", ")}`);
  console.log(`Productos: ${doomed.length}`);
  doomed.forEach((p) => console.log(`  - ${p.nombre}`));
  console.log(`Variantes: ${doomedVariants.length}`);
  console.log(`Fotos referenciadas: ${doomedUrls.size} (compartidas con otros, se conservan: ${shared})`);
  console.log(`Archivos de Storage a borrar (incl. miniaturas, algunas pueden no existir): ${totalFiles}`);

  if (isDryRun) {
    console.log(`\nSimulación terminada. Para borrar de verdad: node scripts/delete-category.mjs ${target} --delete`);
    return;
  }

  const ids = [...doomedIds];
  for (let i = 0; i < ids.length; i += 100) {
    const batch = ids.slice(i, i + 100);
    const { error: vErr } = await supabase.from("product_variants").delete().in("product_id", batch);
    if (vErr) throw vErr;
    const { error: pErr } = await supabase.from("products").delete().in("id", batch);
    if (pErr) throw pErr;
  }
  console.log(`\n✔ Borrados ${ids.length} productos y ${doomedVariants.length} variantes.`);

  let removed = 0;
  for (const [bucket, set] of filesByBucket) {
    const paths = [...set];
    for (let i = 0; i < paths.length; i += 100) {
      const { data, error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) console.warn("[Storage] Error en bucket:", bucket, error.message);
      else removed += data?.length ?? 0;
    }
  }
  console.log(`✔ Borrados ${removed} archivos de Storage.`);
}

run().catch((err) => {
  console.error("Error:", err?.message ?? err);
  process.exit(1);
});
