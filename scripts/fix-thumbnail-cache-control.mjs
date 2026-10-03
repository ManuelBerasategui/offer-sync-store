/**
 * fix-thumbnail-cache-control.mjs
 *
 * Re-uploads every file found under /thumbnails/ or /thumbnails-md/ subfolders
 * with cacheControl: "31536000" so Supabase Storage CDN serves
 * Cache-Control: max-age=31536000, s-maxage=31536000, immutable.
 *
 * Dry-run by default. Set APPLY=1 to apply.
 *
 * Usage:
 *   node scripts/fix-thumbnail-cache-control.mjs          # dry-run
 *   APPLY=1 node scripts/fix-thumbnail-cache-control.mjs  # apply
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// ── env ───────────────────────────────────────────────────────────────────────
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
  console.error("ERROR: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const APPLY = process.env.APPLY === "1";
const CONCURRENCY = 8; // conservative: download + upload pairs
const TARGET_CC = "31536000";
const REQUIRED_MAX_AGE = 31536000;

// ── helpers ───────────────────────────────────────────────────────────────────
async function listRecursive(bucket, prefix = "") {
  const all = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit, offset });
    if (error) { console.error("list error", bucket, prefix, error.message); break; }
    if (!data || data.length === 0) break;
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      const isFolder = !item.id || item.metadata === null;
      if (isFolder) {
        const sub = await listRecursive(bucket, fullPath);
        all.push(...sub);
      } else {
        all.push({
          bucket,
          path: fullPath,
          name: item.name,
          mimetype: item.metadata?.mimetype ?? "image/webp",
          cacheControl: item.metadata?.cacheControl ?? "",
          size: item.metadata?.size ?? 0,
        });
      }
    }
    if (data.length < limit) break;
    offset += limit;
  }
  return all;
}

function isThumbnailPath(filePath) {
  return filePath.includes("/thumbnails/") || filePath.includes("/thumbnails-md/");
}

function ccMaxAge(ccStr) {
  const m = (ccStr || "").match(/max-age\s*=\s*(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

async function processFile(item, idx, total) {
  const { data: blob, error: dlErr } = await supabase.storage.from(item.bucket).download(item.path);
  if (dlErr || !blob) {
    console.warn(`  [${idx}/${total}] DOWNLOAD FAIL ${item.path}: ${dlErr?.message}`);
    return { success: false };
  }
  const buffer = Buffer.from(await blob.arrayBuffer());
  const ct = item.mimetype || "image/webp";

  const { error: upErr } = await supabase.storage.from(item.bucket).update(item.path, buffer, {
    cacheControl: TARGET_CC,
    contentType: ct,
    upsert: true,
  });

  if (upErr) {
    console.warn(`  [${idx}/${total}] UPLOAD FAIL ${item.path}: ${upErr.message}`);
    return { success: false };
  }

  if (idx % 25 === 0 || idx === total) {
    console.log(`  [${idx}/${total}] ✅ ${item.path} (${(buffer.length / 1024).toFixed(1)} KB)`);
  }
  return { success: true, bytes: buffer.length };
}

// ── main ──────────────────────────────────────────────────────────────────────
async function run() {
  console.log("=".repeat(72));
  console.log(" FIX THUMBNAIL CACHE-CONTROL");
  console.log(` Mode: ${APPLY ? "🚨 APPLY (APPLY=1)" : "🔍 DRY-RUN"}`);
  console.log(` Target folders: /thumbnails/ and /thumbnails-md/`);
  console.log(` Sets: Cache-Control: max-age=${TARGET_CC}, s-maxage=${TARGET_CC}, immutable`);
  console.log("=".repeat(72) + "\n");

  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) { console.error("listBuckets:", bErr.message); process.exit(1); }
  const publicBuckets = buckets.filter(b => b.public);
  console.log(`Public buckets: ${publicBuckets.map(b => b.name).join(", ")}\n`);

  // 1. Collect all files in thumbnail subfolders
  console.log("📥 Listing all thumbnail files (recursive)...");
  let allThumbFiles = [];
  for (const b of publicBuckets) {
    process.stdout.write(`  scanning ${b.name}...`);
    const files = await listRecursive(b.name);
    const thumbFiles = files.filter(f => isThumbnailPath(f.path));
    console.log(` ${thumbFiles.length} thumbnail files`);
    allThumbFiles.push(...thumbFiles);
  }

  // 2. Separate: already OK vs needs fix
  const needsFix = allThumbFiles.filter(f => ccMaxAge(f.cacheControl) < REQUIRED_MAX_AGE);
  const alreadyOk = allThumbFiles.length - needsFix.length;

  console.log(`\nTotal thumbnail files found: ${allThumbFiles.length}`);
  console.log(`  ✅ Already have CC max-age≥1yr: ${alreadyOk}`);
  console.log(`  ❌ Need cache-control fix:      ${needsFix.length}`);

  const totalBytes = needsFix.reduce((s, f) => s + f.size, 0);
  console.log(`  📦 Estimated egress to re-upload: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

  if (needsFix.length === 0) {
    console.log("\n🎉 All thumbnail files already have correct Cache-Control. Nothing to do.");
    return;
  }

  if (!APPLY) {
    console.log("\n💡 Dry-run complete. To apply, run:");
    console.log("   $env:APPLY='1'; node scripts/fix-thumbnail-cache-control.mjs; $env:APPLY=''");
    return;
  }

  // 3. Apply: download → update with correct cacheControl
  console.log(`\n🚀 Re-uploading ${needsFix.length} files to fix Cache-Control...`);
  let ok = 0;
  let failed = 0;
  let totalBytesProcessed = 0;

  // Batch with limited concurrency
  for (let i = 0; i < needsFix.length; i += CONCURRENCY) {
    const batch = needsFix.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((item, j) => processFile(item, i + j + 1, needsFix.length))
    );
    for (const r of results) {
      if (r.success) { ok++; totalBytesProcessed += r.bytes ?? 0; }
      else failed++;
    }
  }

  console.log("\n" + "=".repeat(72));
  console.log("COMPLETED");
  console.log(`  ✅ Fixed: ${ok}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📦 Bytes re-uploaded: ${(totalBytesProcessed / 1024 / 1024).toFixed(2)} MB`);
  console.log("=".repeat(72) + "\n");

  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
