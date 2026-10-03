import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

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

async function exportBackup() {
  console.log("Fetching all products (id, nombre, metadata)...");
  const { data, error } = await supabase
    .from("products")
    .select("id, nombre, metadata")
    .order("id");

  if (error) {
    console.error("Error fetching products:", error);
    process.exit(1);
  }

  mkdirSync("backups", { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backups/products-metadata-backup-${timestamp}.json`;
  const latestFilename = "backups/products-metadata-backup.json";

  const content = JSON.stringify(data, null, 2);
  writeFileSync(filename, content, "utf8");
  writeFileSync(latestFilename, content, "utf8");

  console.log(`Successfully backed up ${data.length} products to:`);
  console.log(` - ${filename}`);
  console.log(` - ${latestFilename}`);
  console.log(`File size: ${(Buffer.byteLength(content, "utf8") / 1024).toFixed(1)} KB`);
}

exportBackup();
