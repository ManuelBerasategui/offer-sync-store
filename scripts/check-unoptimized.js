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

async function check() {
  const { data: products } = await supabase.from("products").select("id, nombre, imagen_url, metadata");
  const { data: variants } = await supabase.from("product_variants").select("id, product_id, imagen_url");

  let yupooCount = 0;
  let nonWebpCount = 0;
  let alreadyOptimizedCount = 0;

  for (const p of products || []) {
    const url = p.imagen_url || "";
    if (url.includes("yupoo")) yupooCount++;
    if (url.includes("/optimized/") && url.endsWith(".webp")) {
      alreadyOptimizedCount++;
    } else if (url) {
      nonWebpCount++;
    }
  }

  console.log(`Productos totales: ${products?.length || 0}`);
  console.log(`Productos con Yupoo: ${yupooCount}`);
  console.log(`Productos ya optimizados: ${alreadyOptimizedCount}`);
  console.log(`Productos pendientes de optimizar: ${nonWebpCount}`);
}

check().catch(console.error);
