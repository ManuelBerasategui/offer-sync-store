import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import crypto from "crypto";

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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan variables de entorno de Supabase.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setupTables() {
  console.log("Verificando / configurando tablas de newsletter...");

  // Sync users from auth.users or profiles into newsletter_subscribers if table exists
  try {
    const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
    if (!uErr && users?.users) {
      console.log(`Encontrados ${users.users.length} usuarios en Supabase Auth.`);
      for (const u of users.users) {
        if (!u.email) continue;
        const nombre = u.user_metadata?.nombre || u.user_metadata?.name || u.email.split("@")[0];
        const token = crypto.randomBytes(16).toString("hex");

        await supabase.from("newsletter_subscribers").upsert(
          {
            email: u.email.toLowerCase().trim(),
            nombre,
            is_active: true,
            unsubscribe_token: token,
          },
          { onConflict: "email", ignoreDuplicates: true }
        );
      }
      console.log("✓ Usuarios sincronizados con la lista de suscriptores.");
    }
  } catch (err) {
    console.log("Nota al sincronizar usuarios:", err.message);
  }
}

setupTables();
