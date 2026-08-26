import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { createHash } from "crypto";

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
// Este script se ejecuta solamente desde una máquina de administración.
// Nunca uses la clave pública para importar datos: obligaría a abrir escrituras
// anónimas en las tablas.
const SUPABASE_KEY = envVars["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env.");
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
    throw new Error(`No se pudo leer la planilla ${tab}: ${error instanceof Error ? error.message : error}`);
  }
}

const hasValue = (row) => Object.values(row).some((v) => String(v ?? "").trim() !== "");
const isNote = (v) => /^notas?\s*:/i.test(String(v ?? "").trim());
// En la planilla: Variantes = "Negro: 55000 | Blanco: 58000".
// También acepta JSON: [{"color":"Negro","precio":55000,"imagen_url":"https://..."}].
function parseVariants(value, productId) {
  const raw = String(value ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((v) => ({
          product_id: productId,
          color: String(v.color ?? "").trim(),
          precio: Number(v.precio),
          imagen_url: String(v.imagen_url ?? "").trim() || null,
        }))
        .filter((v) => v.color && Number.isFinite(v.precio) && v.precio >= 0);
    }
  } catch {
    // Formato compacto de planilla, procesado abajo.
  }
  return raw.split("|").flatMap((entry) => {
    const [color, price] = entry.split(":");
    const amount = String(price ?? "").replace(/[^\d.,-]/g, "");
    // Formato argentino: 55.000 o 55.000,50.
    const precio = Number(
      amount.includes(",") ? amount.replace(/\./g, "").replace(",", ".") : amount.replace(/\./g, ""),
    );
    const cleanColor = String(color ?? "").trim();
    return cleanColor && Number.isFinite(precio) && precio >= 0
      ? [{ product_id: productId, color: cleanColor, precio }]
      : [];
  });
}
const deterministicUuid = (value) => {
  const hash = createHash('sha256').update(value).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};

async function run() {
  console.log("Descargando datos de Google Sheets...");
  const [productsRaw, bannersRaw, configRaw] = await Promise.all([
    fetchTab(TABS.productos),
    fetchTab(TABS.banners),
    fetchTab(TABS.config),
  ]);

  if (!productsRaw.length || !configRaw.length) {
    throw new Error("Google Sheets devolvió datos incompletos; la migración se canceló para no sobrescribir Supabase.");
  }

  // Solo sincronizamos variantes si la planilla realmente las administra.
  // Así, una carga manual hecha en Supabase no se borra al importar el catálogo.
  const syncVariantsFromSheet = productsRaw.some((row) =>
    Object.keys(row).some((key) => ["variantes", "colores"].includes(key.trim().toLowerCase())),
  );
  const variants = [];
  const products = productsRaw.filter(
    (p) =>
      hasValue(p) &&
      !isNote(p.id) &&
      String(p.nombre ?? "").trim() !== ""
  ).map((p) => {
    // Separar campos estándar y metadata
    const stdFields = ["id", "nombre", "categoria", "precio", "precio_oferta", "imagen_url", "descripcion", "destacado", "oferta", "stock", "descuento"];
    const std = {};
    const metadata = {};
    
    // Asignar ID si falta
    if (!p.id || !String(p.id).trim()) p.id = String(p.nombre).toLowerCase().replace(/[^a-z0-9]+/g, '-');

    for (const [k, v] of Object.entries(p)) {
      if (["variantes", "colores"].includes(k.trim().toLowerCase())) continue;
      if (stdFields.includes(k.toLowerCase())) {
        std[k.toLowerCase()] = v;
      } else {
        metadata[k] = v;
      }
    }
    
    const product = { ...std, metadata };
    variants.push(...parseVariants(p.variantes ?? p.colores, product.id));
    return product;
  });

  const banners = bannersRaw.filter(
    (b) =>
      hasValue(b) &&
      !isNote(b.titulo) &&
      String(b.titulo ?? "").trim() !== ""
  ).map((b, index) => ({
    // Un UUID determinístico permite ejecutar la migración más de una vez sin
    // duplicar banners, aunque la tabla use UUID como clave primaria.
    id: deterministicUuid(`${index}:${b.titulo}:${b.imagen_url}`),
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

  console.log(`Procesados: ${products.length} productos, ${variants.length} variantes, ${banners.length} banners, ${config.length} configs.`);
  console.log("Subiendo a Supabase...");

  const { error: pErr } = await supabase.from('products').upsert(products);
  if (pErr) throw new Error(`Error insertando productos: ${pErr.message}`);
  console.log("Productos insertados exitosamente.");

  // Si existe la columna de variantes, la planilla es su fuente de verdad.
  // Sin esa columna se preservan las variantes administradas en Supabase.
  const productIds = products.map((p) => p.id);
  if (syncVariantsFromSheet && productIds.length) {
    const { error: deleteVariantsError } = await supabase
      .from("product_variants")
      .delete()
      .in("product_id", productIds);
    if (deleteVariantsError) throw new Error(`Error actualizando variantes: ${deleteVariantsError.message}`);
  }
  if (syncVariantsFromSheet && variants.length) {
    const { error: variantsError } = await supabase.from("product_variants").insert(variants);
    if (variantsError) throw new Error(`Error insertando variantes: ${variantsError.message}`);
  }

  const { error: bErr } = await supabase.from('banners').upsert(banners);
  if (bErr) throw new Error(`Error insertando banners: ${bErr.message}`);
  console.log("Banners insertados exitosamente.");

  const { error: cErr } = await supabase.from('site_config').upsert(config);
  if (cErr) throw new Error(`Error insertando config: ${cErr.message}`);
  console.log("Configuraciones insertadas exitosamente.");

  const [{ count: productCount, error: productCountError }, { count: bannerCount, error: bannerCountError }, { count: configCount, error: configCountError }] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase.from('banners').select('*', { count: 'exact', head: true }),
    supabase.from('site_config').select('*', { count: 'exact', head: true }),
  ]);
  if (productCountError || bannerCountError || configCountError) {
    throw new Error(`No se pudo verificar la migración: ${productCountError?.message ?? bannerCountError?.message ?? configCountError?.message}`);
  }
  console.log(`Migración verificada: ${productCount} productos, ${bannerCount} banners, ${configCount} configuraciones en Supabase.`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
