import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const envFile = readFileSync(".env", "utf-8");
const env = {};
for (const line of envFile.split("\n")) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || "";
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value;
  }
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function getThumbUrl(originalUrl) {
  if (!originalUrl || !originalUrl.includes("/storage/v1/object/public/")) return null;
  const marker = "/storage/v1/object/public/";
  const idx = originalUrl.indexOf(marker);
  const path = originalUrl.slice(idx + marker.length);
  const parts = path.split("/");
  if (parts.length >= 3 && !parts.includes("thumbnails")) {
    const filename = parts.pop();
    return `${originalUrl.slice(0, idx + marker.length)}${parts.join("/")}/thumbnails/${filename}`;
  }
  return null;
}

async function run() {
  console.log("=================================================");
  console.log(" STORAGE IMAGES AUDIT: FULL VS THUMBNAILS ");
  console.log("=================================================\n");

  const { data: products } = await supabase
    .from("products")
    .select("id, nombre, categoria, imagen_url, destacado, oferta, stock, ventas_semana")
    .neq("stock", "NO");

  console.log(`Total active products in store: ${products.length}`);

  // Sample 10 products with images to measure exact Content-Length
  let totalFullSample = 0;
  let totalThumbSample = 0;
  let sampleCount = 0;
  let thumbFoundCount = 0;

  console.log("\nMeasuring sample images from Supabase Storage:");
  for (const p of products.slice(0, 15)) {
    if (!p.imagen_url || !p.imagen_url.includes(".supabase.co")) continue;
    const thumb = getThumbUrl(p.imagen_url);
    if (!thumb) continue;

    try {
      const [fullRes, thumbRes] = await Promise.all([
        fetch(p.imagen_url, { method: "HEAD" }),
        fetch(thumb, { method: "HEAD" }),
      ]);

      const fullSize = Number(fullRes.headers.get("content-length") || 0);
      const thumbSize = Number(thumbRes.headers.get("content-length") || 0);
      const fullCC = fullRes.headers.get("cache-control");
      const thumbCC = thumbRes.headers.get("cache-control");

      if (thumbRes.status === 200) thumbFoundCount++;
      if (fullSize > 0) {
        totalFullSample += fullSize;
        totalThumbSample += (thumbSize || (fullSize * 0.1));
        sampleCount++;
        console.log(`• ${p.nombre.slice(0, 30)}...`);
        console.log(`   Full: ${(fullSize / 1024).toFixed(1)} KB (CC: ${fullCC})`);
        console.log(`   Thumb: ${thumbRes.status === 200 ? `${(thumbSize / 1024).toFixed(1)} KB (CC: ${thumbCC})` : `MISS 404`}`);
      }
    } catch (e) {
      console.error("Fetch error:", e.message);
    }
  }

  const avgFullKB = sampleCount > 0 ? (totalFullSample / sampleCount / 1024) : 25;
  const avgThumbKB = sampleCount > 0 ? (totalThumbSample / sampleCount / 1024) : 2.5;

  console.log(`\nAverage Full Image Size: ${avgFullKB.toFixed(1)} KB`);
  console.log(`Average Thumbnail Size: ${avgThumbKB.toFixed(1)} KB`);
  console.log(`Ratio: ${(avgFullKB / avgThumbKB).toFixed(1)}x smaller (-${(((avgFullKB - avgThumbKB) / avgFullKB) * 100).toFixed(0)}%)\n`);

  // PAGE LOAD ANALYSIS
  // 1. Home Page (/)
  // - Top Offers: all products with oferta = 'SI'
  // - Banners: 5 combos
  // - Destacados: products with destacado = 'SI' or top sales
  const homeOffers = products.filter(p => String(p.oferta || "").toUpperCase() === "SI");
  const homeDestacados = products.filter(p => String(p.destacado || "").toUpperCase() === "SI");
  const homeEstimatedImages = Math.min(products.length, 8 + homeOffers.length + 5); // ~20-40 images on initial scroll

  console.log("-------------------------------------------------");
  console.log("ESTIMATED EGRESS PER PAGE LOAD (Cache Miss):");
  console.log("-------------------------------------------------");
  console.log(`\n1. HOME PAGE (/)`);
  console.log(`   • Images rendered: ~${homeEstimatedImages} images (combos, ofertas, destacados)`);
  console.log(`   • Current (Full Images): ${(homeEstimatedImages * avgFullKB).toFixed(1)} KB (${((homeEstimatedImages * avgFullKB) / 1024).toFixed(2)} MB)`);
  console.log(`   • With 160px Thumbnails: ${(homeEstimatedImages * avgThumbKB).toFixed(1)} KB (${((homeEstimatedImages * avgThumbKB) / 1024).toFixed(2)} MB)`);
  console.log(`   • SAVING per Home visit: -${((homeEstimatedImages * (avgFullKB - avgThumbKB)) / 1024).toFixed(2)} MB (-${(((avgFullKB - avgThumbKB) / avgFullKB) * 100).toFixed(0)}%)`);

  // 2. Catalog Page (/catalogo)
  // - Displays all 265 products (rendered in ProductCard grid, filtered client-side)
  const catalogImages = products.length;
  console.log(`\n2. CATALOG PAGE (/catalogo)`);
  console.log(`   • Images in catalog: ${catalogImages} product cards`);
  console.log(`   • If initial viewport loads 24 cards:`);
  console.log(`     - Current (Full Images): ${(24 * avgFullKB).toFixed(1)} KB (${((24 * avgFullKB) / 1024).toFixed(2)} MB)`);
  console.log(`     - With Thumbnails: ${(24 * avgThumbKB).toFixed(1)} KB (${((24 * avgThumbKB) / 1024).toFixed(2)} MB)`);
  console.log(`   • If user scrolls full catalog (${catalogImages} products):`);
  console.log(`     - Current (Full Images): ${(catalogImages * avgFullKB).toFixed(1)} KB (${((catalogImages * avgFullKB) / 1024).toFixed(2)} MB)`);
  console.log(`     - With Thumbnails: ${(catalogImages * avgThumbKB).toFixed(1)} KB (${((catalogImages * avgThumbKB) / 1024).toFixed(2)} MB)`);
  console.log(`     - SAVING on full catalog scroll: -${((catalogImages * (avgFullKB - avgThumbKB)) / 1024).toFixed(2)} MB (-${(((avgFullKB - avgThumbKB) / avgFullKB) * 100).toFixed(0)}%)`);

  console.log("\n=================================================\n");
}

run().catch(console.error);
