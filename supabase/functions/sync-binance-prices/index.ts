import { createClient } from "npm:@supabase/supabase-js@2";

type BinanceAdvertisement = { adv?: { price?: string } };
type BinanceResponse = { data?: BinanceAdvertisement[] };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) return JSON.parse(keys).default as string;
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
}

function parseArs(value: unknown) {
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  return Number(digits) || 0;
}

function median(values: number[]) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

async function binanceP2pRate() {
  // BUY significa que el comercio compra USDT con ARS: refleja el costo de reposición.
  const response = await fetch("https://c2c.binance.com/bapi/c2c/v2/friendly/c2c/adv/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ page: 1, rows: 10, payTypes: [], asset: "USDT", tradeType: "BUY", fiat: "ARS", merchantCheck: false }),
  });
  if (!response.ok) throw new Error(`Binance P2P respondió HTTP ${response.status}`);
  const payload = (await response.json()) as BinanceResponse;
  const rates = (payload.data ?? [])
    .map((item) => Number(item.adv?.price))
    .filter((rate) => Number.isFinite(rate) && rate > 0)
    .sort((a, b) => a - b)
    .slice(0, 5);
  if (rates.length < 3) throw new Error("Binance P2P no devolvió suficientes ofertas de USDT/ARS.");
  return { rate: median(rates), offers: rates };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método no permitido." }, 405);
  const expectedSecret = Deno.env.get("PRICE_SYNC_CRON_SECRET");
  if (!expectedSecret || request.headers.get("x-price-sync-secret") !== expectedSecret) {
    return json({ error: "No autorizado." }, 401);
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, secretKey());
    const { data: settings, error: settingsError } = await supabase
      .from("pricing_settings")
      .select("enabled, markup_percentage, rounding_increment")
      .eq("id", true)
      .single();
    if (settingsError) throw new Error(`No se pudo leer la configuración: ${settingsError.message}`);
    if (!settings.enabled) return json({ skipped: true, reason: "Sincronización desactivada." });

    const { rate, offers } = await binanceP2pRate();
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, precio, precio_usd, precio_oferta, precio_oferta_usd");
    if (productsError) throw new Error(`No se pudieron leer productos: ${productsError.message}`);

    const markup = Number(settings.markup_percentage) / 100;
    const increment = Number(settings.rounding_increment);
    const now = new Date().toISOString();
    const updates = (products ?? []).flatMap((product) => {
      const baseUsd = Number(product.precio_usd) || parseArs(product.precio) / rate;
      if (!Number.isFinite(baseUsd) || baseUsd <= 0) return [];
      const price = Math.ceil((baseUsd * rate * (1 + markup)) / increment) * increment;
      const offerArs = parseArs(product.precio_oferta);
      const offerUsd = Number(product.precio_oferta_usd) || (offerArs > 0 ? offerArs / rate : 0);
      const offerUpdate = offerUsd > 0
        ? {
            precio_oferta: String(Math.ceil((offerUsd * rate * (1 + markup)) / increment) * increment),
            precio_oferta_usd: Number(offerUsd.toFixed(6)),
          }
        : {};
      return [{ id: product.id, precio: String(price), precio_usd: Number(baseUsd.toFixed(6)), precio_actualizado_en: now, ...offerUpdate }];
    });
    if (updates.length) {
      // No usamos upsert: Postgres valida las columnas NOT NULL antes de resolver
      // el conflicto y products.nombre no forma parte de esta actualización.
      for (let offset = 0; offset < updates.length; offset += 20) {
        const batch = updates.slice(offset, offset + 20);
        const results = await Promise.all(
          batch.map((product) =>
            supabase
              .from("products")
              .update({
                precio: product.precio,
                precio_usd: product.precio_usd,
                ...(product.precio_oferta ? { precio_oferta: product.precio_oferta } : {}),
                ...(product.precio_oferta_usd ? { precio_oferta_usd: product.precio_oferta_usd } : {}),
                precio_actualizado_en: product.precio_actualizado_en,
              })
              .eq("id", product.id),
          ),
        );
        const updateError = results.find((result) => result.error)?.error;
        if (updateError) throw new Error(`No se pudieron actualizar los precios: ${updateError.message}`);
      }
    }

    const { error: saveError } = await supabase.from("pricing_settings").update({
      last_rate: rate,
      last_rate_at: now,
      last_source_payload: { offers, method: "median_lowest_five_buy_offers", updated_at: now },
      updated_at: now,
    }).eq("id", true);
    if (saveError) throw new Error(`No se pudo guardar la cotización: ${saveError.message}`);
    return json({ updated: updates.length, rate, roundingIncrement: increment, markupPercentage: Number(settings.markup_percentage) });
  } catch (error) {
    console.error(error);
    return json({ error: error instanceof Error ? error.message : "Error inesperado." }, 500);
  }
});
