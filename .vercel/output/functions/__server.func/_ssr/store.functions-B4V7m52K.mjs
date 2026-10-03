import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { t as supabase } from "./client-Bx8URvVl.mjs";
import { t as createServerRpc } from "./createServerRpc-prIP6Hrh.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store.functions-B4V7m52K.js
var _moduleCache = null;
var MODULE_CACHE_TTL_MS = 72e5;
/**
* CAPA 2: Cloudflare Cache API.
* Compartida entre todos los isolates paralelos del mismo datacenter.
* Impacto adicional: elimina fetches redundantes entre instancias paralelas.
*/
var CF_CACHE_KEY = "https://teimportamosarg.com/__store_data_v1__";
var CF_CACHE_TTL_SECONDS = 7200;
/** Intenta leer de Cloudflare Cache API. Retorna null si no está disponible o expiró. */
async function readCfCache() {
	try {
		if (typeof caches === "undefined") return null;
		const cached = await caches.default.match(CF_CACHE_KEY);
		if (!cached) return null;
		return await cached.json();
	} catch {
		return null;
	}
}
/** Escribe en Cloudflare Cache API. No-op si no está disponible. */
async function writeCfCache(data) {
	try {
		if (typeof caches === "undefined") return;
		await caches.default.put(CF_CACHE_KEY, new Response(JSON.stringify(data), { headers: {
			"Content-Type": "application/json",
			"Cache-Control": `public, max-age=${CF_CACHE_TTL_SECONDS}`
		} }));
	} catch {}
}
/** Ejecuta las 4 queries a Supabase y construye el StoreData. */
async function fetchFromSupabase() {
	const [productsResult, variantsResult, bannersResult, configResult] = await Promise.all([
		supabase.from("products").select("id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,imagen_url,descripcion,destacado,oferta,stock,descuento,color_predeterminado,metadata").neq("stock", "NO"),
		supabase.from("product_variants").select("id,product_id,color,precio,precio_usd,precio_base,moneda_base,stock,imagen_url").neq("stock", "NO"),
		supabase.from("banners").select("*").eq("activo", "SI"),
		supabase.from("site_config").select("clave,valor")
	]);
	if (productsResult.error) throw productsResult.error;
	if (variantsResult.error) console.warn("No se pudieron cargar las variantes de color:", variantsResult.error.message);
	if (bannersResult.error) console.warn("No se pudieron cargar los banners:", bannersResult.error.message);
	const productsRaw = productsResult.data;
	const bannersRaw = bannersResult.data;
	const configRaw = configResult.data;
	const variantsByProduct = /* @__PURE__ */ new Map();
	for (const variant of variantsResult.data ?? []) {
		const productId = String(variant.product_id ?? "");
		if (!productId) continue;
		const current = variantsByProduct.get(productId) ?? [];
		current.push(variant);
		variantsByProduct.set(productId, current);
	}
	const products = (productsRaw ?? []).map((p) => {
		const rawMeta = typeof p.metadata === "object" && p.metadata !== null ? { ...p.metadata } : {};
		delete rawMeta.raw_imagen_url_backup;
		delete rawMeta.original_imagen_url;
		const meta = rawMeta;
		const { metadata, ...rest } = p;
		const variants = (variantsByProduct.get(String(p.id ?? "")) ?? []).filter((v) => {
			const stock = typeof v === "object" && v !== null ? v.stock : void 0;
			return String(stock ?? "").trim().toUpperCase() !== "NO";
		}).map((v) => {
			const vObj = v;
			const colorKey = `talles_color_${String(vObj.color ?? "").trim().toLowerCase().normalize("NFC").replace(/\s+/g, "_")}`;
			const rawTalles = meta[colorKey];
			const talles_disponibles = Array.isArray(rawTalles) ? rawTalles : typeof rawTalles === "string" && rawTalles.length > 0 ? rawTalles.split(",").map((t) => t.trim()).filter(Boolean) : [];
			return {
				...vObj,
				talles_disponibles
			};
		});
		return {
			...meta,
			...rest,
			variants
		};
	});
	const banners = (bannersRaw ?? []).map((raw) => {
		let quantity_tiers = null;
		const candidate = raw.quantity_tiers || raw.link;
		if (Array.isArray(candidate) && candidate.length > 0) quantity_tiers = candidate;
		else if (typeof candidate === "string" && candidate.trim().startsWith("[")) try {
			const parsed = JSON.parse(candidate);
			if (Array.isArray(parsed) && parsed.length > 0) quantity_tiers = parsed;
		} catch {}
		return {
			...raw,
			quantity_tiers
		};
	});
	const config = {};
	for (const row of configRaw ?? []) {
		const r = row;
		if (r.clave) config[r.clave] = r.valor ?? "";
	}
	return {
		products,
		banners,
		config
	};
}
var getStoreData_createServerFn_handler = createServerRpc({
	id: "d967006a173800329904c483ca68b3958a45b6eb76398bf4f52fae605c1a4735",
	name: "getStoreData",
	filename: "src/lib/store.functions.ts"
}, (opts) => getStoreData.__executeServer(opts));
var getStoreData = createServerFn({ method: "GET" }).handler(getStoreData_createServerFn_handler, async () => {
	try {
		const now = Date.now();
		if (_moduleCache && _moduleCache.expiresAt > now) {
			console.info("[StoreCache] HIT_L1 (memory isolate)");
			return _moduleCache.data;
		}
		const cfCached = await readCfCache();
		if (cfCached) {
			console.info("[StoreCache] HIT_L2 (Cloudflare Cache API)");
			_moduleCache = {
				data: cfCached,
				expiresAt: now + MODULE_CACHE_TTL_MS
			};
			return cfCached;
		}
		console.warn("[StoreCache] MISS -> fetching Supabase DB");
		const data = await fetchFromSupabase();
		const rawBytes = JSON.stringify(data).length;
		console.info(`[StoreCache] Supabase payload: ${(rawBytes / 1024).toFixed(1)} KB (${rawBytes} B, ${data.products.length} products)`);
		_moduleCache = {
			data,
			expiresAt: now + MODULE_CACHE_TTL_MS
		};
		writeCfCache(data);
		return data;
	} catch (error) {
		console.error("Error fetching store data from Supabase:", error);
		if (_moduleCache) {
			console.warn("Usando store data cacheado como fallback tras error de Supabase.");
			return _moduleCache.data;
		}
		return {
			products: [],
			banners: [],
			config: {}
		};
	}
});
async function invalidateStoreCache() {
	_moduleCache = null;
	try {
		if (typeof caches !== "undefined") await caches.default.delete(CF_CACHE_KEY);
	} catch {}
}
var invalidateStoreCacheFn_createServerFn_handler = createServerRpc({
	id: "8f4f897912f984c825b1eae80ffc3ad77f73565965a5cebc07e33e140e061cc6",
	name: "invalidateStoreCacheFn",
	filename: "src/lib/store.functions.ts"
}, (opts) => invalidateStoreCacheFn.__executeServer(opts));
var invalidateStoreCacheFn = createServerFn({ method: "POST" }).handler(invalidateStoreCacheFn_createServerFn_handler, async () => {
	await invalidateStoreCache();
	return { success: true };
});
//#endregion
export { getStoreData_createServerFn_handler, invalidateStoreCacheFn_createServerFn_handler };
