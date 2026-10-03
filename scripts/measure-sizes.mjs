import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Load .env
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

const url = env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(url, key);

function byteLen(obj) {
  return Buffer.byteLength(JSON.stringify(obj || ""), "utf8");
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function measure() {
  console.log("=========================================================");
  console.log(" REAL MEASUREMENTS OF POSTGREST / SUPABASE QUERY SIZES ");
  console.log("=========================================================\n");

  // ------------------------------------------------------------------
  // 1. PUBLIC CATALOG (store.functions.ts)
  // ------------------------------------------------------------------
  console.log("--- 1. PUBLIC CATALOG (store.functions.ts) ---");
  const pCurrentCols = "id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,imagen_url,descripcion,destacado,oferta,stock,descuento,color_predeterminado,metadata";
  const pOptNoMetaCols = "id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,imagen_url,descripcion,destacado,oferta,stock,descuento,color_predeterminado";
  const pMinimalCols = "id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,imagen_url,destacado,oferta,stock,descuento,color_predeterminado";

  const [pCurrentRes, pNoMetaRes, pMinimalRes, vCurrentRes, bCurrentRes, cCurrentRes] = await Promise.all([
    supabase.from("products").select(pCurrentCols).neq("stock", "NO"),
    supabase.from("products").select(pOptNoMetaCols).neq("stock", "NO"),
    supabase.from("products").select(pMinimalCols).neq("stock", "NO"),
    supabase.from("product_variants").select("id,product_id,color,precio,precio_usd,precio_base,moneda_base,stock,imagen_url").neq("stock", "NO"),
    supabase.from("banners").select("*").eq("activo", "SI"),
    supabase.from("site_config").select("clave,valor"),
  ]);

  const pCurrentSize = byteLen(pCurrentRes.data);
  const pNoMetaSize = byteLen(pNoMetaRes.data);
  const pMinimalSize = byteLen(pMinimalRes.data);
  const vCurrentSize = byteLen(vCurrentRes.data);
  const bCurrentSize = byteLen(bCurrentRes.data);
  const cCurrentSize = byteLen(cCurrentRes.data);
  const totalCatalogCurrent = pCurrentSize + vCurrentSize + bCurrentSize + cCurrentSize;

  console.log(`• Products (current: 19 cols incl. metadata): ${pCurrentRes.data?.length} rows, ${formatBytes(pCurrentSize)} (${pCurrentSize} B)`);
  console.log(`• Products WITHOUT metadata: ${pNoMetaRes.data?.length} rows, ${formatBytes(pNoMetaSize)} (${pNoMetaSize} B)  -> delta: -${formatBytes(pCurrentSize - pNoMetaSize)} (-${(((pCurrentSize - pNoMetaSize)/pCurrentSize)*100).toFixed(1)}%)`);
  console.log(`• Products WITHOUT metadata & WITHOUT descripcion: ${pMinimalRes.data?.length} rows, ${formatBytes(pMinimalSize)} (${pMinimalSize} B)  -> delta: -${formatBytes(pCurrentSize - pMinimalSize)} (-${(((pCurrentSize - pMinimalSize)/pCurrentSize)*100).toFixed(1)}%)`);
  console.log(`• Product Variants (public, stock!=NO): ${vCurrentRes.data?.length} rows, ${formatBytes(vCurrentSize)} (${vCurrentSize} B)`);
  console.log(`• Banners (activo=SI): ${bCurrentRes.data?.length} rows, ${formatBytes(bCurrentSize)} (${bCurrentSize} B)`);
  console.log(`• Site Config (clave,valor): ${cCurrentRes.data?.length} rows, ${formatBytes(cCurrentSize)} (${cCurrentSize} B)`);
  console.log(`\n  TOTAL Public Catalog payload (current): ${formatBytes(totalCatalogCurrent)}`);
  console.log(`  TOTAL Public Catalog payload (no metadata): ${formatBytes(pNoMetaSize + vCurrentSize + bCurrentSize + cCurrentSize)}`);
  console.log(`  TOTAL Public Catalog payload (no metadata, no descripcion): ${formatBytes(pMinimalSize + vCurrentSize + bCurrentSize + cCurrentSize)}\n`);

  // Analyze metadata content across products
  let totalMetaBytes = 0;
  let metaKeyBytes = {};
  for (const p of (pCurrentRes.data || [])) {
    if (p.metadata) {
      totalMetaBytes += byteLen(p.metadata);
      for (const [k, v] of Object.entries(p.metadata)) {
        const b = Buffer.byteLength(JSON.stringify(v) || "", "utf8") + k.length;
        metaKeyBytes[k] = (metaKeyBytes[k] || 0) + b;
      }
    }
  }
  console.log(`  Metadata breakdown: total ${formatBytes(totalMetaBytes)} across ${(pCurrentRes.data||[]).length} products.`);
  console.log("  Top metadata keys by total wire size:");
  const sortedKeys = Object.entries(metaKeyBytes).sort((a, b) => b[1] - a[1]);
  for (const [k, b] of sortedKeys) {
    console.log(`    - "${k}": ${formatBytes(b)} (${b} B)`);
  }
  console.log("\n");

  // ------------------------------------------------------------------
  // 2. ORDERS (both queries in orders.functions.ts)
  // ------------------------------------------------------------------
  console.log("--- 2. ORDERS (admin queries) ---");
  const [ordersPaidAll, ordersPendingAll] = await Promise.all([
    supabase.from("orders").select("*").eq("estado", "pagado").order("created_at", { ascending: false }),
    supabase.from("orders").select("*").eq("estado", "pendiente").order("created_at", { ascending: false }),
  ]);

  const paidRows = ordersPaidAll.data || [];
  const pendingRows = ordersPendingAll.data || [];
  const paidAllSize = byteLen(paidRows);
  const pendingAllSize = byteLen(pendingRows);

  console.log(`• Orders PAGADO (select *): ${paidRows.length} rows, ${formatBytes(paidAllSize)} (${paidAllSize} B)`);
  console.log(`• Orders PENDIENTE (select *): ${pendingRows.length} rows, ${formatBytes(pendingAllSize)} (${pendingAllSize} B)`);

  // Check columns present in orders table
  if (paidRows.length > 0 || pendingRows.length > 0) {
    const sample = paidRows[0] || pendingRows[0];
    console.log(`  Columns present in orders row: ${Object.keys(sample).join(", ")}`);
  }

  // Explicit columns used by AdminOrder:
  const orderExplicitCols = "id,order_code,created_at,estado,metodo_pago,total,nombre,dni,telefono,email,provincia,ciudad,codigo_postal,transporte,sucursal_correo,items";
  const [ordersPaidExplicit, ordersPendingExplicit] = await Promise.all([
    supabase.from("orders").select(orderExplicitCols).eq("estado", "pagado").order("created_at", { ascending: false }),
    supabase.from("orders").select(orderExplicitCols).eq("estado", "pendiente").order("created_at", { ascending: false }),
  ]);

  const paidExpSize = byteLen(ordersPaidExplicit.data);
  const pendingExpSize = byteLen(ordersPendingExplicit.data);
  console.log(`• Orders PAGADO (explicit cols): ${formatBytes(paidExpSize)} (saved ${formatBytes(paidAllSize - paidExpSize)})`);
  console.log(`• Orders PENDIENTE (explicit cols): ${formatBytes(pendingExpSize)} (saved ${formatBytes(pendingAllSize - pendingExpSize)})`);

  // Simulated pagination (e.g. limit 20 or 50)
  const [ordersPaidPage20, ordersPaidPage50] = await Promise.all([
    supabase.from("orders").select(orderExplicitCols).eq("estado", "pagado").order("created_at", { ascending: false }).range(0, 19),
    supabase.from("orders").select(orderExplicitCols).eq("estado", "pagado").order("created_at", { ascending: false }).range(0, 49),
  ]);
  console.log(`• Orders PAGADO page of 20 (explicit cols): ${formatBytes(byteLen(ordersPaidPage20.data))}`);
  console.log(`• Orders PAGADO page of 50 (explicit cols): ${formatBytes(byteLen(ordersPaidPage50.data))}`);
  console.log("\n");

  // ------------------------------------------------------------------
  // 3. getAdminProducts (products.functions.ts)
  // ------------------------------------------------------------------
  console.log("--- 3. getAdminProducts ---");
  const sampleP = (await supabase.from("products").select("*").limit(1)).data?.[0];
  if (sampleP) {
    console.log(`  Columns present in products table (${Object.keys(sampleP).length} cols): ${Object.keys(sampleP).join(", ")}`);
  }

  // The actual columns getAdminProducts uses in the table/list:
  const adminColsWithDesc = "id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,imagen_url,destacado,oferta,stock,descuento,color_predeterminado,ventas_semana,descripcion";
  const adminColsNoDesc = "id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,imagen_url,destacado,oferta,stock,descuento,color_predeterminado,ventas_semana";

  const [adminPSelectAllPage20, adminPSelectAllTotal, adminPExplicitPage20, adminPNoDescPage20] = await Promise.all([
    supabase.from("products").select("*", { count: "exact" }).order("nombre").range(0, 19),
    supabase.from("products").select("*").order("nombre"),
    supabase.from("products").select(adminColsWithDesc).order("nombre").range(0, 19),
    supabase.from("products").select(adminColsNoDesc).order("nombre").range(0, 19),
  ]);

  if (adminPExplicitPage20.error) console.error("Admin explicit error:", adminPExplicitPage20.error);
  if (adminPNoDescPage20.error) console.error("Admin no desc error:", adminPNoDescPage20.error);

  const adminPage20Size = byteLen(adminPSelectAllPage20.data);
  const adminTotalSize = byteLen(adminPSelectAllTotal.data);
  const adminExplicitSize = byteLen(adminPExplicitPage20.data);
  const adminNoDescSize = byteLen(adminPNoDescPage20.data);

  console.log(`• Admin Products total rows in DB: ${adminPSelectAllTotal.data?.length}`);
  console.log(`• Admin Products Full Table (select *): ${formatBytes(adminTotalSize)} (${adminTotalSize} B)`);
  console.log(`• Admin Products Page 20 (select *): ${formatBytes(adminPage20Size)} (${adminPage20Size} B)`);
  console.log(`• Admin Products Page 20 (explicit WITH descripcion): ${formatBytes(adminExplicitSize)} (${adminExplicitSize} B) -> saves ${formatBytes(adminPage20Size - adminExplicitSize)} (-${(((adminPage20Size - adminExplicitSize)/adminPage20Size)*100).toFixed(1)}%)`);
  console.log(`• Admin Products Page 20 (explicit WITHOUT descripcion): ${formatBytes(adminNoDescSize)} (${adminNoDescSize} B) -> saves ${formatBytes(adminPage20Size - adminNoDescSize)} (-${(((adminPage20Size - adminNoDescSize)/adminPage20Size)*100).toFixed(1)}%)`);
  console.log("\n");

  // ------------------------------------------------------------------
  // 4. product_variants
  // ------------------------------------------------------------------
  console.log("--- 4. product_variants ---");
  const [vSelectAll, vExplicit] = await Promise.all([
    supabase.from("product_variants").select("*"),
    supabase.from("product_variants").select("id,product_id,color,precio,precio_usd,precio_base,moneda_base,stock,imagen_url"),
  ]);

  const vAllSize = byteLen(vSelectAll.data);
  const vExpSize = byteLen(vExplicit.data);
  console.log(`• product_variants (select *): ${vSelectAll.data?.length} rows, ${formatBytes(vAllSize)} (${vAllSize} B)`);
  console.log(`• product_variants (explicit cols): ${vSelectAll.data?.length} rows, ${formatBytes(vExpSize)} (${vExpSize} B) -> delta: -${formatBytes(vAllSize - vExpSize)} (-${(((vAllSize - vExpSize)/vAllSize)*100).toFixed(1)}%)`);
  if (vSelectAll.data?.length) {
    console.log(`  Columns present in product_variants: ${Object.keys(vSelectAll.data[0]).join(", ")}`);
  }
  console.log("\n");

  // ------------------------------------------------------------------
  // 5. newsletter_campaigns, site_config, banners
  // ------------------------------------------------------------------
  console.log("--- 5. newsletter_campaigns, site_config, banners ---");
  const sampleB = (await supabase.from("banners").select("*").limit(1)).data?.[0];
  if (sampleB) {
    console.log(`  Columns present in banners table (${Object.keys(sampleB).length} cols): ${Object.keys(sampleB).join(", ")}`);
  }
  const bannerCols = "id,titulo,subtitulo,imagen_url,link,activo,precio,quantity_tiers";
  const [bannersAll, bannersExplicit] = await Promise.all([
    supabase.from("banners").select("*"),
    supabase.from("banners").select(bannerCols),
  ]);
  console.log(`• banners (select *): ${bannersAll.data?.length ?? 0} rows, ${formatBytes(byteLen(bannersAll.data))}`);
  console.log(`• banners (explicit: ${bannerCols}): ${bannersExplicit.data?.length ?? 0} rows, ${formatBytes(byteLen(bannersExplicit.data))}`);

  const [cfgAll, cfgExplicit] = await Promise.all([
    supabase.from("site_config").select("*"),
    supabase.from("site_config").select("clave,valor"),
  ]);
  console.log(`• site_config (select *): ${cfgAll.data?.length ?? 0} rows, ${formatBytes(byteLen(cfgAll.data))}`);
  console.log(`• site_config (clave,valor): ${cfgExplicit.data?.length ?? 0} rows, ${formatBytes(byteLen(cfgExplicit.data))}`);
  console.log("\n=========================================================\n");
}

measure().catch(console.error);
