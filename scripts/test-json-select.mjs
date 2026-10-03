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

async function test() {
  console.log("Testing PostgREST JSON selection features:");
  
  // Test 1: arrow operator in select
  const t1 = await supabase.from("products").select("id,es_zap:metadata->>es_zapatilla").limit(1);
  console.log("1. metadata->>es_zapatilla:", t1.data, t1.error?.message);

  const { data } = await supabase.from("products").select("id,metadata");
  let rawCount = 0;
  let origCount = 0;
  let extraCount = 0;
  for (const p of data || []) {
    if (p.metadata?.raw_imagen_url_backup) rawCount++;
    if (p.metadata?.original_imagen_url) origCount++;
    if (p.metadata?.extra_images) extraCount++;
  }
  console.log("Products with raw_imagen_url_backup:", rawCount);
  console.log("Products with original_imagen_url:", origCount);
  console.log("Products with extra_images:", extraCount);
  console.log("Total products:", data?.length);
}

test();
