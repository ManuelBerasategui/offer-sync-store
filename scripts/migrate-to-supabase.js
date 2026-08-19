import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Cargar variables de entorno desde .env manualmente
const envPath = path.resolve(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = {};
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    let value = match[2].trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    envVars[key] = value;
  }
}

const SUPABASE_URL = envVars["SUPABASE_URL"];
const SUPABASE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Falta SUPABASE_SERVICE_ROLE_KEY en el .env. Es necesario para saltar RLS e insertar los datos.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SHEET_ID = "18YOF7ac4l5hX7LFX5QsnO1eq3zAAmAfQWUfVl_xINhg";
const TABS = { productos: "Productos", banners: "Banners", config: "Config" };

const tabUrl = (tab) => `https://opensheet.elk.sh/${SHEET_ID}/${encodeURIComponent(tab)}`;

async function fetchTab(tab) {
  try {
    const res = await fetch(tabUrl(tab), { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`${tab}: HTTP ${res.status}`);
    const rows = await res.json();
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.error("No se pudo leer la planilla", tab, error);
    return [];
  }
}

const hasValue = (row) => Object.values(row).some((v) => String(v ?? "").trim() !== "");
const isNote = (v) => /^notas?\s*:/i.test(String(v ?? "").trim());

async function run() {
  console.log("Descargando datos de Google Sheets...");
  const [productsRaw, bannersRaw, configRaw] = await Promise.all([
    fetchTab(TABS.productos),
    fetchTab(TABS.banners),
    fetchTab(TABS.config),
  ]);

  const products = productsRaw.filter(
    (p) =>
      hasValue(p) &&
      !isNote(p.id) &&
      String(p.nombre ?? "").trim() !== "" &&
      String(p.stock ?? "SI").trim().toUpperCase() !== "NO"
  ).map((p) => {
    // Separar campos estándar y metadata
    const stdFields = ["id", "nombre", "categoria", "precio", "precio_oferta", "imagen_url", "descripcion", "destacado", "oferta", "stock", "descuento"];
    const std = {};
    const metadata = {};
    
    // Asignar ID si falta
    if (!p.id || !String(p.id).trim()) p.id = String(p.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-');

    for (const [k, v] of Object.entries(p)) {
      if (stdFields.includes(k.toLowerCase())) {
        std[k.toLowerCase()] = v;
      } else {
        metadata[k] = v;
      }
    }
    
    return { ...std, metadata };
  });

  const banners = bannersRaw.filter(
    (b) =>
      hasValue(b) &&
      !isNote(b.titulo) &&
      String(b.titulo ?? "").trim() !== "" &&
      String(b.activo ?? "SI").trim().toUpperCase() !== "NO"
  ).map(b => ({
    titulo: b.titulo,
    subtitulo: b.subtitulo,
    imagen_url: b.imagen_url,
    link: b.link,
    activo: b.activo,
    precio: b.precio
  }));

  const config = [];
  for (const row of configRaw) {
    const key = String(row.clave ?? "").trim();
    const value = String(row.valor ?? "").trim();
    if (key && !isNote(key)) {
      config.push({ clave: key, valor: value });
    }
  }

  console.log(`Procesados: ${products.length} productos, ${banners.length} banners, ${config.length} configs.`);
  console.log("Subiendo a Supabase...");

  // Para poder insertar con la public key, las tablas deben tener RLS temporalmente deshabilitado 
  // o permitir INSERTS públicos. Suponiendo que aplicaste la migración correctamente.
  
  const { error: pErr } = await supabase.from('products').upsert(products);
  if (pErr) console.error("Error insertando productos:", pErr);
  else console.log("Productos insertados exitosamente.");

  const { error: bErr } = await supabase.from('banners').insert(banners);
  if (bErr) console.error("Error insertando banners:", bErr);
  else console.log("Banners insertados exitosamente.");

  const { error: cErr } = await supabase.from('site_config').upsert(config);
  if (cErr) console.error("Error insertando config:", cErr);
  else console.log("Configuraciones insertadas exitosamente.");
  
  console.log("Migración completada.");
}

run();
