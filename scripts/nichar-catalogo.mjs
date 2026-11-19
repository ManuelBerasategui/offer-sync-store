/**
 * Achica el catálogo a los productos que más se venden: el resto queda con stock "NO"
 * (no se muestra, pero NO se borra de la base) y se apagan los combos (activo "NO").
 *
 * Antes de tocar nada guarda un backup con el stock/activo de cada fila, para volver atrás.
 *
 * Uso:
 *   node scripts/nichar-catalogo.mjs                      → simulación (no cambia nada)
 *   node scripts/nichar-catalogo.mjs --apply              → aplica y guarda backup en scripts/backups/
 *   node scripts/nichar-catalogo.mjs --restore <backup>   → vuelve stock/activo a como estaban
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const envVars = {};
for (const line of fs.readFileSync(path.resolve(process.cwd(), ".env"), "utf8").split("\n")) {
  const eq = line.indexOf("=");
  if (eq <= 0) continue;
  let value = line.slice(eq + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  envVars[line.slice(0, eq).trim()] = value;
}
const supabase = createClient(envVars.SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY);

/** Productos que quedan visibles (por id). */
const KEEP = {
  // Mallas
  "8f487a29-7cd4-435b-a1b1-0578a0011f58": "Mallas Retro y Billabong",
  // Zapatillas
  "4bf7bbbc-793a-494c-b0f7-7ca984d1f30d": "Vans Skate",
  "8ae3fd00-de99-45d2-bb45-34da19c606cd": "New Balance 530",
  "3e124874-d1b3-4367-9559-f28294bcc695": "Nike Jordan Air 1 Low",
  // Camisetas 26-27: Argentina, Boca, River, Real Madrid, Brasil, Liverpool
  "e3cbd511-1274-45c2-8fb0-824867acf9d9": "Argentina local",
  "337b2b4c-f1b6-4ef8-8103-e1a3c715b74a": "Argentina visitante (jugador)",
  "d0abf0b5-3e6c-42f1-b117-d3116c12cb35": "Argentina edición especial (jugador)",
  "5e816d56-790b-4aa8-841d-45bbd7e8be18": "Boca local",
  "b865324c-6a63-474c-bc91-980d6883e559": "River principal manga larga",
  "6aa6efc4-2ad7-4f25-a84c-99cf22c07a3e": "Real Madrid edición especial blanco",
  "2cbb52cd-371c-4be5-b7c7-f3e212fcf96a": "Real Madrid manga larga",
  "6cac9c5f-1fef-4413-a33c-d4bc5f1ae53b": "Brasil edición especial",
  "50acab14-22b8-4d23-a6cf-76e0d4dae6f6": "Liverpool edición especial",
  // JBL réplicas y originales
  "142": "JBL Go 4 réplica",
  "150": "JBL Go 4 Pro réplica",
  "148": "JBL Flip 6 réplica",
  "151": "JBL Go 4 original colores",
  "8d7148c4-331b-4d2f-9032-d9aeb0f64639": "JBL Flip 6 original",
  "3583236d-6172-4421-a1f5-6af9fc2177ec": "JBL Flip 7 original",
  // Bazar / tecnología
  "e0b92b6b-dd0d-41b4-bb2c-96c3e62279d7": "Stanley Quencher 1.2L",
  "d3ffb11d-3bea-471f-94b0-6b6e0df8d484": "NFC para reseñas de Google",
  // Perfumes árabes: vendidos en la web
  "24": "Armaf Club de Nuit Untold",
  "67": "Lattafa Fakhar Rose",
  "40": "Rasasi Hawas Black",
  "23": "Armaf Club de Nuit Sillage",
  "87": "Armaf Odyssey Mandarin Sky",
  "86": "Armaf Odyssey Spectra",
  // Perfumes árabes: más populares (Yara, Khamrah y 9PM son los más pedidos del rubro)
  "65": "Lattafa Yara Pink",
  "57": "Lattafa Khamrah",
  "29": "Afnan 9PM Black",
  "39": "Lattafa Asad",
  "41": "Rasasi Hawas For Him",
  "53": "Lattafa Badee Al Oud For Glory",
  "59": "Lattafa Khamrah Qahwa",
  "44": "Rasasi Hawas Ice Blue",
  "64": "Lattafa Yara Tous",
};

/** Productos nuevos creados después (shorts por curva, etc.): se respetan si existen. */
const KEEP_PREFIXES = ["short-nba-"];

/** Combos que siguen prendidos hasta que existan sus productos sueltos (por título). */
const KEEP_COMBOS = new Set([]);

const isKept = (id) => Object.hasOwn(KEEP, String(id)) || KEEP_PREFIXES.some((p) => String(id).startsWith(p));

const args = process.argv.slice(2);
const restoreIdx = args.indexOf("--restore");

if (restoreIdx !== -1) {
  const file = args[restoreIdx + 1];
  if (!file) throw new Error("Indicá el archivo de backup");
  const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const { id, stock } of backup.products) {
    const { error } = await supabase.from("products").update({ stock }).eq("id", id);
    if (error) throw error;
  }
  for (const { id, activo } of backup.banners) {
    const { error } = await supabase.from("banners").update({ activo }).eq("id", id);
    if (error) throw error;
  }
  console.log(`Restaurados ${backup.products.length} productos y ${backup.banners.length} combos.`);
  process.exit(0);
}

const apply = args.includes("--apply");

const { data: products, error: pErr } = await supabase.from("products").select("id,nombre,categoria,stock");
if (pErr) throw pErr;
const { data: banners, error: bErr } = await supabase.from("banners").select("id,titulo,activo");
if (bErr) throw bErr;

const missing = Object.keys(KEEP).filter((id) => !products.some((p) => String(p.id) === id));
if (missing.length) throw new Error(`Ids de KEEP que no existen: ${missing.join(", ")}`);

const toHide = products.filter((p) => !isKept(p.id) && String(p.stock).toUpperCase() !== "NO");
const toShow = products.filter((p) => isKept(p.id) && String(p.stock).toUpperCase() === "NO");
const combosOff = banners.filter(
  (b) => String(b.activo).toUpperCase() !== "NO" && !KEEP_COMBOS.has(String(b.titulo ?? "").trim()),
);

console.log(`Quedan visibles: ${products.filter((p) => isKept(p.id)).length}`);
console.log(`A ocultar: ${toHide.length} | a mostrar: ${toShow.length} | combos a apagar: ${combosOff.length}`);
for (const p of toShow) console.log(`  + ${p.nombre}`);

if (!apply) {
  console.log("\nSimulación. Correr con --apply para aplicar.");
  process.exit(0);
}

const backupDir = path.resolve(process.cwd(), "scripts/backups");
fs.mkdirSync(backupDir, { recursive: true });
const backupFile = path.join(backupDir, `catalogo-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(
  backupFile,
  JSON.stringify(
    {
      products: products.map(({ id, stock }) => ({ id, stock })),
      banners: banners.map(({ id, activo }) => ({ id, activo })),
    },
    null,
    1,
  ),
);
console.log(`Backup: ${backupFile}`);

const hideIds = toHide.map((p) => p.id);
for (let i = 0; i < hideIds.length; i += 100) {
  const { error } = await supabase.from("products").update({ stock: "NO" }).in("id", hideIds.slice(i, i + 100));
  if (error) throw error;
}
if (toShow.length) {
  const { error } = await supabase.from("products").update({ stock: "SI" }).in("id", toShow.map((p) => p.id));
  if (error) throw error;
}
if (combosOff.length) {
  const { error } = await supabase.from("banners").update({ activo: "NO" }).in("id", combosOff.map((b) => b.id));
  if (error) throw error;
}
console.log("Listo.");
