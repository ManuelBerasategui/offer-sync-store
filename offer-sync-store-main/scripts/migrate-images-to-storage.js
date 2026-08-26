import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
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

const SUPABASE_URL = envVars.SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "store-images";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function driveFileId(url) {
  const value = String(url ?? "").trim();
  const match = value.match(/\/file\/d\/([\w-]+)/) || value.match(/[?&]id=([\w-]+)/) || value.match(/\/d\/([\w-]+)/);
  return match?.[1] ?? "";
}

function isSupabaseStorageUrl(url) {
  return /\/storage\/v1\/object\/(?:public|sign)\//i.test(String(url ?? ""));
}

function isExternalImage(url) {
  const value = String(url ?? "").trim();
  return /^https?:\/\//i.test(value) && !isSupabaseStorageUrl(value);
}

function extensionFor(contentType) {
  const type = contentType.split(";", 1)[0].toLowerCase();
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" })[type] ?? "jpg";
}

async function ensureBucket() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw new Error(`No se pudieron leer los buckets: ${listError.message}`);
  if (buckets?.some((bucket) => bucket.id === BUCKET)) return;

  const { error } = await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: "20MB" });
  if (error && !/already exists/i.test(error.message)) throw new Error(`No se pudo crear el bucket: ${error.message}`);
}

async function copyExternalImage(sourceUrl, destination) {
  const fileId = driveFileId(sourceUrl);
  const downloadUrl = fileId ? `https://drive.google.com/uc?export=download&id=${fileId}` : sourceUrl;
  const response = await fetch(downloadUrl, { redirect: "follow", headers: { accept: "image/avif,image/webp,image/*,*/*;q=0.8" } });
  if (!response.ok) throw new Error(`El origen respondió HTTP ${response.status}`);
  const contentType = response.headers.get("content-type")?.split(";", 1)[0].toLowerCase() ?? "";
  if (!contentType.startsWith("image/")) throw new Error(`El origen no entregó una imagen (${contentType || "sin content-type"}).`);

  const objectPath = `${destination}.${extensionFor(contentType)}`;
  const { error } = await supabase.storage.from(BUCKET).upload(objectPath, await response.arrayBuffer(), {
    contentType,
    cacheControl: "31536000",
    upsert: true,
  });
  if (error) throw new Error(`No se pudo subir a Storage: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
}

async function migrateProducts() {
  const { data, error } = await supabase.from("products").select("id, imagen_url, metadata");
  if (error) throw new Error(`No se pudieron leer productos: ${error.message}`);
  let copied = 0;
  let failed = 0;
  for (const product of data ?? []) {
    if (!isExternalImage(product.imagen_url)) continue;
    try {
      const source = product.imagen_url;
      const sourceHash = createHash("sha256").update(source).digest("hex");
      const url = await copyExternalImage(source, `products/${createHash("sha256").update(product.id).digest("hex")}/${sourceHash}`);
      const metadata = { ...(product.metadata ?? {}), original_imagen_url: source };
      const { error: updateError } = await supabase.from("products").update({ imagen_url: url, metadata }).eq("id", product.id);
      if (updateError) throw new Error(`No se pudo actualizar el producto: ${updateError.message}`);
      copied++;
      console.log(`Producto migrado: ${product.id}`);
    } catch (error) {
      failed++;
      console.error(`Producto no migrado (${product.id}): ${error instanceof Error ? error.message : error}`);
    }
  }
  return { copied, failed };
}

async function migrateBanners() {
  const { data, error } = await supabase.from("banners").select("id, imagen_url");
  if (error) throw new Error(`No se pudieron leer banners: ${error.message}`);
  let copied = 0;
  let failed = 0;
  for (const banner of data ?? []) {
    if (!isExternalImage(banner.imagen_url)) continue;
    try {
      const sourceHash = createHash("sha256").update(banner.imagen_url).digest("hex");
      const url = await copyExternalImage(banner.imagen_url, `banners/${banner.id}/${sourceHash}`);
      const { error: updateError } = await supabase.from("banners").update({ imagen_url: url }).eq("id", banner.id);
      if (updateError) throw new Error(`No se pudo actualizar el banner: ${updateError.message}`);
      copied++;
      console.log(`Banner migrado: ${banner.id}`);
    } catch (error) {
      failed++;
      console.error(`Banner no migrado (${banner.id}): ${error instanceof Error ? error.message : error}`);
    }
  }
  return { copied, failed };
}

async function run() {
  await ensureBucket();
  const products = await migrateProducts();
  const banners = await migrateBanners();
  console.log(`Migración de imágenes terminada: ${products.copied} productos y ${banners.copied} banners copiados; ${products.failed + banners.failed} fallidos.`);
  if (products.failed || banners.failed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
