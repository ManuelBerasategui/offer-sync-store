/**
 * verify-thumbnails.mjs
 *
 * For every active product / variant / banner image stored in Supabase Storage:
 *   1. Check /thumbnails/   (160px sm) → must return 200 + max-age=31536000
 *   2. Check /thumbnails-md/ (320px md) → must return 200 + max-age=31536000
 *
 * Prints a full list of MISSING URLs and exits 1 if any are absent.
 *
 * Usage:
 *   node scripts/verify-thumbnails.mjs
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ── env ──────────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), ".env");
const envVars = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (!m) continue;
    const k = m[1].trim();
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    envVars[k] = v;
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || envVars.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing from .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const CONCURRENCY = 30;
const REQUIRED_CC_SECONDS = 31536000;

// ── helpers ───────────────────────────────────────────────────────────────────
function parseStorageUrl(raw) {
  if (!raw || typeof raw !== "string") return null;
  const marker = "/storage/v1/object/public/";
  const idx = raw.indexOf(marker);
  if (idx === -1) return null;
  const after = raw.slice(idx + marker.length);
  const sep = after.indexOf("/");
  if (sep === -1) return null;
  return {
    bucket: after.slice(0, sep),
    objectPath: after.slice(sep + 1),
    base: raw.slice(0, idx + marker.length),
  };
}

function insertFolder(objectPath, folder) {
  // e.g. "productos/img.webp" → "productos/thumbnails/img.webp"
  const parts = objectPath.split("/");
  const filename = parts.pop();
  return [...parts, folder, filename].join("/");
}

function extractMaxAge(ccHeader) {
  if (!ccHeader) return 0;
  const m = ccHeader.match(/max-age\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

async function headCheck(directUrl, proxyBase) {
  try {
    // 1. Direct storage check (file existence)
    const storageRes = await fetch(directUrl, { method: "HEAD" });
    const storageCc = storageRes.headers.get("cache-control") || "";

    // 2. Proxied delivery check (how the app actually delivers images with CDN caching)
    let proxyRes = null;
    let proxyCc = "";
    if (proxyBase) {
      const pUrl = `${proxyBase}/api/img?url=${encodeURIComponent(directUrl)}`;
      proxyRes = await fetch(pUrl, { method: "HEAD" });
      proxyCc = proxyRes.headers.get("cache-control") || "";
    }

    return {
      storageStatus: storageRes.status,
      storageCc,
      proxyStatus: proxyRes ? proxyRes.status : storageRes.status,
      proxyCc,
      maxAge: proxyRes ? extractMaxAge(proxyCc) : extractMaxAge(storageCc),
    };
  } catch (e) {
    return {
      storageStatus: 0,
      storageCc: "",
      proxyStatus: 0,
      proxyCc: "",
      maxAge: 0,
      error: e.message,
    };
  }
}

// ── batch runner ──────────────────────────────────────────────────────────────
async function runBatch(items, fn, concurrency) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const res = await Promise.all(batch.map(fn));
    results.push(...res);
    process.stdout.write(`\r  Checked: ${Math.min(i + concurrency, items.length)}/${items.length}   `);
  }
  console.log();
  return results;
}

const PROXY_BASE = process.env.PROXY_BASE || "https://www.teimportamosarg.com";

// ── main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log("=".repeat(72));
  console.log(" THUMBNAIL VERIFICATION AUDIT");
  console.log(" Checks: /thumbnails/ (sm) AND /thumbnails-md/ (md)");
  console.log(" 1. Supabase Storage: HTTP 200 existence");
  console.log(` 2. App CDN Proxy (${PROXY_BASE}): HTTP 200 + Cache-Control max-age>=31536000`);
  console.log("=".repeat(72));

  // 1. Collect all image URLs from DB
  console.log("\n📥 Fetching images from DB (products, variants, banners)...");
  const [prodsRes, varsRes, bansRes] = await Promise.all([
    supabase.from("products").select("id, nombre, imagen_url").not("imagen_url", "is", null),
    supabase.from("product_variants").select("id, product_id, imagen_url").not("imagen_url", "is", null),
    supabase.from("banners").select("id, titulo, imagen_url").not("imagen_url", "is", null),
  ]);

  if (prodsRes.error) { console.error("products error:", prodsRes.error.message); process.exit(1); }
  if (varsRes.error)  { console.error("variants error:", varsRes.error.message); process.exit(1); }
  if (bansRes.error)  { console.error("banners error:", bansRes.error.message); process.exit(1); }

  console.log(`  products:        ${prodsRes.data.length} rows`);
  console.log(`  product_variants: ${varsRes.data.length} rows`);
  console.log(`  banners:          ${bansRes.data.length} rows`);

  // Deduplicate Storage URLs (ignore Google Drive / external)
  const urlSet = new Set();
  for (const r of [...prodsRes.data, ...varsRes.data, ...bansRes.data]) {
    if (r.imagen_url) urlSet.add(r.imagen_url.trim());
  }

  const storageItems = [];
  for (const url of urlSet) {
    const parsed = parseStorageUrl(url);
    if (!parsed) continue; // skip Drive / external
    // Skip URLs that already point INTO a thumbnail subfolder (shouldn't happen in DB)
    if (parsed.objectPath.includes("/thumbnails/") || parsed.objectPath.includes("/thumbnails-md/")) continue;
    storageItems.push({
      originalUrl: url,
      smUrl: `${parsed.base}${parsed.bucket}/${insertFolder(parsed.objectPath, "thumbnails")}`,
      mdUrl: `${parsed.base}${parsed.bucket}/${insertFolder(parsed.objectPath, "thumbnails-md")}`,
      bucket: parsed.bucket,
      objectPath: parsed.objectPath,
    });
  }

  console.log(`\n  Unique Supabase Storage images: ${storageItems.length}`);
  console.log(`  (Skipped non-storage / already-thumbnail URLs)`);

  // 2. Check all sm URLs
  console.log(`\n🔍 Checking /thumbnails/ (sm 160px) — ${storageItems.length} URLs...`);
  const smResults = await runBatch(storageItems, async (item) => {
    const r = await headCheck(item.smUrl, PROXY_BASE);
    return { item, ...r };
  }, CONCURRENCY);

  // 3. Check all md URLs
  console.log(`🔍 Checking /thumbnails-md/ (md 320px) — ${storageItems.length} URLs...`);
  const mdResults = await runBatch(storageItems, async (item) => {
    const r = await headCheck(item.mdUrl, PROXY_BASE);
    return { item, ...r };
  }, CONCURRENCY);

  // 4. Classify
  const smStorageMissing = smResults.filter(r => r.storageStatus !== 200);
  const smProxyMissing   = smResults.filter(r => r.proxyStatus !== 200);
  const smProxyBadCC     = smResults.filter(r => r.proxyStatus === 200 && r.maxAge < REQUIRED_CC_SECONDS);
  const smOk             = smResults.filter(r => r.storageStatus === 200 && r.proxyStatus === 200 && r.maxAge >= REQUIRED_CC_SECONDS);

  const mdStorageMissing = mdResults.filter(r => r.storageStatus !== 200);
  const mdProxyMissing   = mdResults.filter(r => r.proxyStatus !== 200);
  const mdProxyBadCC     = mdResults.filter(r => r.proxyStatus === 200 && r.maxAge < REQUIRED_CC_SECONDS);
  const mdOk             = mdResults.filter(r => r.storageStatus === 200 && r.proxyStatus === 200 && r.maxAge >= REQUIRED_CC_SECONDS);

  // 5. Report
  console.log("\n" + "=".repeat(72));
  console.log("RESULTS");
  console.log("=".repeat(72));

  console.log(`\n/thumbnails/ (sm 160px):`);
  console.log(`  📦 Storage 200 OK:            ${smResults.filter(r => r.storageStatus === 200).length}/${storageItems.length}`);
  console.log(`  🌐 CDN Proxy 200 OK + CC≥1yr: ${smOk.length}/${storageItems.length}`);
  console.log(`  ❌ Missing in Storage:        ${smStorageMissing.length}`);
  console.log(`  ⚠️  Proxy non-200 or bad CC:   ${smProxyMissing.length + smProxyBadCC.length}`);

  console.log(`\n/thumbnails-md/ (md 320px):`);
  console.log(`  📦 Storage 200 OK:            ${mdResults.filter(r => r.storageStatus === 200).length}/${storageItems.length}`);
  console.log(`  🌐 CDN Proxy 200 OK + CC≥1yr: ${mdOk.length}/${storageItems.length}`);
  console.log(`  ❌ Missing in Storage:        ${mdStorageMissing.length}`);
  console.log(`  ⚠️  Proxy non-200 or bad CC:   ${mdProxyMissing.length + mdProxyBadCC.length}`);

  // 6. Detail lists
  if (smStorageMissing.length > 0) {
    console.log(`\n--- /thumbnails/ MISSING IN STORAGE (${smStorageMissing.length}) ---`);
    for (const r of smStorageMissing) {
      console.log(`  [${r.storageStatus}] ${r.item.smUrl}`);
    }
  }
  if (mdStorageMissing.length > 0) {
    console.log(`\n--- /thumbnails-md/ MISSING IN STORAGE (${mdStorageMissing.length}) ---`);
    for (const r of mdStorageMissing) {
      console.log(`  [${r.storageStatus}] ${r.item.mdUrl}`);
    }
  }

  // 7. Summary sample
  if (smOk.length > 0) {
    const sample = smOk[0];
    console.log(`\n--- Sample /thumbnails/ response ---`);
    console.log(`  Storage URL:   ${sample.item.smUrl}`);
    console.log(`  Storage Status: ${sample.storageStatus}`);
    console.log(`  Proxy Status:   ${sample.proxyStatus}`);
    console.log(`  Proxy CC:       ${sample.proxyCc}`);
  }
  if (mdOk.length > 0) {
    const sample = mdOk[0];
    console.log(`\n--- Sample /thumbnails-md/ response ---`);
    console.log(`  Storage URL:   ${sample.item.mdUrl}`);
    console.log(`  Storage Status: ${sample.storageStatus}`);
    console.log(`  Proxy Status:   ${sample.proxyStatus}`);
    console.log(`  Proxy CC:       ${sample.proxyCc}`);
  }

  const missingTotal = smStorageMissing.length + mdStorageMissing.length;
  console.log("\n" + "=".repeat(72));
  if (missingTotal === 0 && smProxyBadCC.length === 0 && mdProxyBadCC.length === 0) {
    console.log("✅ ALL CLEAN — 100% of thumbnails exist in Storage and serve max-age=31536000 via CDN proxy");
  } else {
    console.log(`❌ Problems found: Storage missing=${missingTotal}, Proxy bad CC=${smProxyBadCC.length + mdProxyBadCC.length}`);
  }
  console.log("=".repeat(72) + "\n");

  process.exit(missingTotal > 0 ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
