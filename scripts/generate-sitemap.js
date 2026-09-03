import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const BASE_URL = "https://teimportamosarg.com";

// Read .env if present
const envVars = { ...process.env };
try {
  const envPath = path.resolve(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1].trim();
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      envVars[key] = value;
    }
  }
} catch (e) {
  // Ignore
}

const SUPABASE_URL = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const SUPABASE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

async function generateSitemap() {
  console.log("Generando sitemap.xml...");
  const today = new Date().toISOString().split("T")[0];

  const urls = [
    { loc: `${BASE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${BASE_URL}/catalogo`, priority: "0.9", changefreq: "daily" },
  ];

  if (SUPABASE_URL && SUPABASE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
      
      // Fetch active products
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id, metadata");

      if (!pErr && products) {
        for (const p of products) {
          if (p.id) {
            const stock = p.metadata?.stock ?? p.stock;
            if (String(stock || "").toUpperCase() === "NO") continue;
            urls.push({
              loc: `${BASE_URL}/producto/${p.id}`,
              priority: "0.8",
              changefreq: "weekly",
              lastmod: today,
            });
          }
        }
        console.log(`✓ ${urls.length - 2} productos agregados al sitemap.`);
      } else if (pErr) {
        console.error("Error al obtener productos:", pErr.message);
      }

      // Fetch active banners/combos
      const { data: banners, error: bErr } = await supabase
        .from("banners")
        .select("id")
        .eq("activo", "SI");

      if (!bErr && banners) {
        banners.forEach((_, idx) => {
          urls.push({
            loc: `${BASE_URL}/combo/${idx}`,
            priority: "0.7",
            changefreq: "weekly",
          });
        });
        console.log(`✓ ${banners.length} combos/banners agregados al sitemap.`);
      }
    } catch (err) {
      console.warn("Advertencia al consultar Supabase para el sitemap:", err.message);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq || "weekly"}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  const publicDir = path.resolve(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const sitemapPath = path.join(publicDir, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`✅ Sitemap generado exitosamente en ${sitemapPath} con ${urls.length} URLs.`);
}

generateSitemap();
