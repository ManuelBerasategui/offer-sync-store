import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { r as invalidateStoreCache } from "./store.functions-DYWk1U4D.mjs";
import { t as createServerRpc } from "./createServerRpc-prIP6Hrh.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/products.functions-B6pQw0YQ.js
var str = (v, max = 2e3) => String(v ?? "").slice(0, max);
async function assertAdmin(email, token) {
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	const adminEmails = (process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
	let requestingEmail = email ? email.toLowerCase().trim() : "";
	if (token) {
		const { data: userData } = await supabaseAdmin.auth.getUser(token);
		if (userData?.user?.email) requestingEmail = userData.user.email.toLowerCase().trim();
	}
	if (!requestingEmail) throw new Error("Acceso denegado: no autenticado.");
	if (!(adminEmails.length > 0 ? adminEmails.includes(requestingEmail) : ["admin@config.com", "admin@teimportamos.com"].includes(requestingEmail))) throw new Error("Acceso denegado: sin permisos de administrador.");
	return supabaseAdmin;
}
var getAdminProducts_createServerFn_handler = createServerRpc({
	id: "63dca7bdf94d16710d79005fe4d62aa8ece1b7ae5078dca9aa66593a5c5177bc",
	name: "getAdminProducts",
	filename: "src/lib/products.functions.ts"
}, (opts) => getAdminProducts.__executeServer(opts));
var getAdminProducts = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	page: data?.page ? Math.max(1, Number(data.page)) : void 0,
	pageSize: data?.pageSize ? Math.max(1, Math.min(100, Number(data.pageSize))) : void 0,
	search: typeof data?.search === "string" ? str(data.search, 100).trim() : void 0,
	category: typeof data?.category === "string" ? str(data.category, 100).trim() : void 0,
	offerOnly: Boolean(data?.offerOnly),
	fetchAll: Boolean(data?.fetchAll)
})).handler(getAdminProducts_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		let query = supabaseAdmin.from("products").select("*", { count: "exact" }).order("nombre");
		if (data.search) {
			const sanitizedSearch = data.search.replace(/[,()]/g, " ").trim();
			if (sanitizedSearch) query = query.or(`nombre.ilike.%${sanitizedSearch}%,categoria.ilike.%${sanitizedSearch}%`);
		}
		if (data.category) query = query.eq("categoria", data.category);
		if (data.offerOnly) query = query.eq("oferta", "SI");
		const isPaginated = !data.fetchAll && (data.page !== void 0 || data.pageSize !== void 0);
		const page = isPaginated ? data.page ?? 1 : 1;
		const pageSize = isPaginated ? data.pageSize ?? 20 : void 0;
		if (isPaginated && pageSize) {
			const from = (page - 1) * pageSize;
			const to = from + pageSize - 1;
			query = query.range(from, to);
		}
		const [productsRes, pricingRes, offersCountRes, catsRes] = await Promise.all([
			query,
			supabaseAdmin.from("pricing_settings").select("last_rate, markup_percentage, rounding_increment").eq("id", true).maybeSingle(),
			supabaseAdmin.from("products").select("id", {
				count: "exact",
				head: true
			}).eq("oferta", "SI"),
			supabaseAdmin.from("products").select("categoria").not("categoria", "is", null)
		]);
		const productsResTyped = productsRes;
		if (productsResTyped.error) throw productsResTyped.error;
		if (productsResTyped.data) {
			const b = JSON.stringify(productsResTyped.data).length;
			console.info(`[AdminProducts] Products query size: ${(b / 1024).toFixed(2)} KB (${b} B, ${productsResTyped.data.length} rows, isPaginated: ${isPaginated})`);
		}
		const totalCount = productsResTyped.count ?? (productsResTyped.data ?? []).length;
		const totalPages = pageSize ? Math.max(1, Math.ceil(totalCount / pageSize)) : 1;
		const activeOffersCount = offersCountRes?.count ?? 0;
		const existingCategories = Array.from(new Set((catsRes?.data ?? []).map((r) => String(r.categoria ?? "").trim()).filter(Boolean))).sort();
		const productIds = (productsResTyped.data ?? []).map((p) => p.id).filter(Boolean);
		let variantsData = [];
		if (productIds.length > 0) {
			const variantsRes = await supabaseAdmin.from("product_variants").select("*").in("product_id", productIds);
			if (variantsRes.error) throw variantsRes.error;
			variantsData = variantsRes.data ?? [];
			const vb = JSON.stringify(variantsData).length;
			console.info(`[AdminProducts] Variants query size: ${(vb / 1024).toFixed(2)} KB (${vb} B, ${variantsData.length} rows)`);
		}
		let dolarRate = 0;
		let roundingIncrement = 10;
		let markupPercentage = 0;
		if (pricingRes?.data) {
			if (Number(pricingRes.data.last_rate) > 0) dolarRate = Number(pricingRes.data.last_rate);
			if (Number(pricingRes.data.rounding_increment) > 0) roundingIncrement = Number(pricingRes.data.rounding_increment);
			if (pricingRes.data.markup_percentage !== void 0) markupPercentage = Number(pricingRes.data.markup_percentage);
		}
		if (!dolarRate) try {
			const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3e3) });
			if (apiRes.ok) {
				const apiData = await apiRes.json();
				if (apiData?.venta && apiData.venta > 0) dolarRate = Math.round(apiData.venta);
			}
		} catch {}
		if (!dolarRate) {
			const { data: cfgRow } = await supabaseAdmin.from("site_config").select("valor").eq("clave", "dolar_cotizacion").maybeSingle();
			dolarRate = Number(cfgRow?.valor) > 0 ? Number(cfgRow?.valor) : 1500;
		}
		const variantsByProduct = /* @__PURE__ */ new Map();
		for (const v of variantsData) {
			const pid = String(v.product_id ?? "");
			if (!pid) continue;
			const list = variantsByProduct.get(pid) ?? [];
			list.push(v);
			variantsByProduct.set(pid, list);
		}
		return {
			products: (productsResTyped.data ?? []).map((p) => {
				const meta = typeof p.metadata === "object" && p.metadata !== null ? p.metadata : {};
				const { metadata, ...rest } = p;
				const variants = (variantsByProduct.get(String(p.id ?? "")) ?? []).map((v) => {
					const colorKey = `talles_color_${String(v.color ?? "").trim().toLowerCase().normalize("NFC").replace(/\s+/g, "_")}`;
					const rawTalles = meta[colorKey];
					const talles_disponibles = Array.isArray(rawTalles) ? rawTalles : typeof rawTalles === "string" && rawTalles.length > 0 ? rawTalles.split(",").map((t) => t.trim()).filter(Boolean) : [];
					return {
						...v,
						talles_disponibles
					};
				});
				return {
					...meta,
					...rest,
					variants
				};
			}),
			totalCount,
			totalPages,
			page,
			pageSize,
			activeOffersCount,
			existingCategories,
			dolarRate,
			roundingIncrement,
			markupPercentage
		};
	} catch (err) {
		return {
			products: [],
			totalCount: 0,
			totalPages: 1,
			error: err instanceof Error ? err.message : "Error al cargar productos."
		};
	}
});
var upsertAdminProduct_createServerFn_handler = createServerRpc({
	id: "6260d02f0e3675dad00e4584026dd115c1a4924d85330f35d9ca440cd668cd77",
	name: "upsertAdminProduct",
	filename: "src/lib/products.functions.ts"
}, (opts) => upsertAdminProduct.__executeServer(opts));
var upsertAdminProduct = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	product: data.product
})).handler(upsertAdminProduct_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		const p = data.product;
		const metadata = {};
		if (p.es_zapatilla) metadata["es_zapatilla"] = "true";
		if (p.moq_group !== void 0) metadata["moq_group"] = p.moq_group;
		if (p.whatsapp_only_reason !== void 0) {
			metadata["whatsapp_only_reason"] = p.whatsapp_only_reason;
			if (p.whatsapp_only_reason === "zapatillas") metadata["es_zapatilla"] = "true";
			else metadata["es_zapatilla"] = "";
		}
		for (const tier of p.tiers ?? []) if (tier.units > 0 && tier.percent > 0) metadata[`${tier.units} unidades`] = `${tier.percent}%`;
		if (p.tipo_talles && p.tipo_talles !== "NINGUNO") {
			metadata["tipo_talles"] = p.tipo_talles;
			metadata["talles_disponibles"] = Array.isArray(p.talles_disponibles) ? p.talles_disponibles.join(",") : String(p.talles_disponibles ?? "");
		}
		if (p.variants) for (const v of p.variants) {
			const colorClean = String(v.color ?? "").trim();
			if (colorClean && v.talles_disponibles && v.talles_disponibles.length > 0) {
				const key = `talles_color_${colorClean.toLowerCase().normalize("NFC").replace(/\s+/g, "_")}`;
				metadata[key] = v.talles_disponibles.map((t) => String(t).trim()).filter(Boolean).join(",");
			}
		}
		const parsePrice = (val) => {
			if (val === void 0 || val === null) return null;
			const cleaned = String(val).replace(/[^\d.-]/g, "").trim();
			if (cleaned === "") return null;
			const num = Number(cleaned);
			return isNaN(num) ? null : num;
		};
		let rate = 0;
		let markup = 0;
		let increment = 10;
		try {
			const { data: pSettings } = await supabaseAdmin.from("pricing_settings").select("last_rate, markup_percentage, rounding_increment").eq("id", true).maybeSingle();
			if (pSettings) {
				if (Number(pSettings.last_rate) > 0) rate = Number(pSettings.last_rate);
				if (pSettings.markup_percentage !== void 0) markup = Number(pSettings.markup_percentage) / 100;
				if (Number(pSettings.rounding_increment) > 0) increment = Number(pSettings.rounding_increment);
			}
		} catch {}
		if (!rate) try {
			const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3e3) });
			if (apiRes.ok) {
				const apiData = await apiRes.json();
				if (apiData?.venta && apiData.venta > 0) rate = Math.round(apiData.venta);
			}
		} catch {}
		if (!rate) {
			const { data: cfgRow } = await supabaseAdmin.from("site_config").select("valor").eq("clave", "dolar_cotizacion").maybeSingle();
			rate = Number(cfgRow?.valor) > 0 ? Number(cfgRow?.valor) : 1500;
		}
		const arsFromUsd = (usd) => {
			if (increment > 1) return Math.ceil(usd * rate * (1 + markup) / increment) * increment;
			return Math.round(usd * rate * (1 + markup));
		};
		if (p.imagen_url) p.imagen_url = await optimizeImageOnServer(supabaseAdmin, p.imagen_url, "products");
		if (p.variants && p.variants.length > 0) {
			for (const v of p.variants) if (v.imagen_url) v.imagen_url = await optimizeImageOnServer(supabaseAdmin, v.imagen_url, "variants");
		}
		const isNew = !p.id;
		let row;
		if (isNew) {
			const rawPriceUsd = parsePrice(p.precio_usd ?? p.precio_base);
			const rawPriceArs = parsePrice(p.precio);
			let priceBase = null;
			let monedaBase = "USD";
			let priceUsd = null;
			let priceArs = null;
			if (rawPriceUsd !== null && rawPriceUsd > 0) {
				priceBase = rawPriceUsd;
				monedaBase = "USD";
				priceUsd = Math.round(rawPriceUsd * 1.07 * 100) / 100;
				priceArs = arsFromUsd(priceUsd);
			} else if (rawPriceArs !== null && rawPriceArs > 0) {
				priceBase = rawPriceArs;
				monedaBase = "ARS";
				priceArs = Math.round(rawPriceArs * 1.07);
				priceUsd = rate > 0 ? Math.round(priceArs / rate * 100) / 100 : null;
			}
			const rawPriceOfertaUsd = parsePrice(p.precio_oferta_usd ?? p.precio_oferta_base);
			const rawPriceOfertaArs = parsePrice(p.precio_oferta);
			let priceOfertaBase = null;
			let monedaOfertaBase = null;
			let priceOfertaUsd = null;
			let priceOfertaArs = null;
			if (rawPriceOfertaUsd !== null && rawPriceOfertaUsd > 0) {
				priceOfertaBase = rawPriceOfertaUsd;
				monedaOfertaBase = "USD";
				priceOfertaUsd = Math.round(rawPriceOfertaUsd * 1.07 * 100) / 100;
				priceOfertaArs = arsFromUsd(priceOfertaUsd);
			} else if (rawPriceOfertaArs !== null && rawPriceOfertaArs > 0) {
				priceOfertaBase = rawPriceOfertaArs;
				monedaOfertaBase = "ARS";
				priceOfertaArs = Math.round(rawPriceOfertaArs * 1.07);
				priceOfertaUsd = rate > 0 ? Math.round(priceOfertaArs / rate * 100) / 100 : null;
			}
			row = {
				nombre: p.nombre,
				categoria: p.categoria,
				precio_base: priceBase,
				moneda_base: monedaBase,
				precio: priceArs,
				precio_usd: priceUsd,
				precio_oferta_base: priceOfertaBase,
				moneda_oferta_base: monedaOfertaBase,
				precio_oferta: priceOfertaArs,
				precio_oferta_usd: priceOfertaUsd,
				descripcion: p.descripcion ?? "",
				destacado: p.destacado ?? "NO",
				oferta: p.oferta ?? "NO",
				stock: p.stock ?? "SI",
				descuento: (p.tiers?.length ?? 0) > 0 ? "SI" : "NO",
				color_predeterminado: p.color_predeterminado ?? null,
				imagen_url: p.imagen_url ?? null,
				metadata: Object.keys(metadata).length > 0 ? metadata : null
			};
		} else {
			row = {
				nombre: p.nombre,
				categoria: p.categoria,
				descripcion: p.descripcion ?? "",
				destacado: p.destacado ?? "NO",
				oferta: p.oferta ?? "NO",
				stock: p.stock ?? "SI",
				descuento: (p.tiers?.length ?? 0) > 0 ? "SI" : "NO",
				color_predeterminado: p.color_predeterminado ?? null,
				imagen_url: p.imagen_url ?? null,
				metadata: Object.keys(metadata).length > 0 ? metadata : null
			};
			if (p.precio_oferta !== void 0) row.precio_oferta = p.precio_oferta ? String(p.precio_oferta) : null;
			if (p.precio_oferta_usd !== void 0) row.precio_oferta_usd = p.precio_oferta_usd ? Number(p.precio_oferta_usd) : null;
			if (p.precio_oferta_base !== void 0) row.precio_oferta_base = p.precio_oferta_base ? Number(p.precio_oferta_base) : null;
			if (p.moneda_oferta_base !== void 0) row.moneda_oferta_base = p.moneda_oferta_base || null;
		}
		let productId;
		if (p.id) {
			const { error } = await supabaseAdmin.from("products").update(row).eq("id", p.id);
			if (error) throw error;
			productId = p.id;
		} else {
			const newId = crypto.randomUUID();
			const { data: inserted, error } = await supabaseAdmin.from("products").insert({
				id: newId,
				...row
			}).select("id").single();
			if (error) throw error;
			productId = String(inserted.id);
		}
		if (p.variants !== void 0) {
			const { data: existingVariants } = await supabaseAdmin.from("product_variants").select("*").eq("product_id", productId);
			const existingMap = new Map((existingVariants ?? []).map((v) => [v.color.toLowerCase().trim(), v]));
			await supabaseAdmin.from("product_variants").delete().eq("product_id", productId);
			if (p.variants.length > 0) {
				const variantRows = p.variants.map((v) => {
					const colorKey = String(v.color ?? "").toLowerCase().trim();
					const existing = existingMap.get(colorKey);
					let vBase = existing?.precio_base ?? null;
					let vMoneda = existing?.moneda_base ?? "USD";
					let vPriceUsd = existing?.precio_usd ?? null;
					let vPriceArs = existing?.precio ?? 0;
					if (isNew) {
						const rawVPriceUsd = parsePrice(v.precio_usd ?? v.precio_base);
						const rawVPriceArs = parsePrice(v.precio);
						if (rawVPriceUsd !== null && rawVPriceUsd > 0) {
							vBase = rawVPriceUsd;
							vMoneda = "USD";
							vPriceUsd = Math.round(rawVPriceUsd * 1.07 * 100) / 100;
							vPriceArs = arsFromUsd(vPriceUsd);
						} else if (rawVPriceArs !== null && rawVPriceArs > 0) {
							vBase = rawVPriceArs;
							vMoneda = "ARS";
							vPriceArs = Math.round(rawVPriceArs * 1.07);
							vPriceUsd = rate > 0 ? Math.round(vPriceArs / rate * 100) / 100 : null;
						} else {
							vBase = row.precio_base ?? null;
							vMoneda = row.moneda_base ?? "USD";
							vPriceUsd = row.precio_usd ?? null;
							vPriceArs = row.precio ?? 0;
						}
					} else if (!existing) {
						const parentPriceUsd = parsePrice(p.precio_usd);
						const parentPriceArs = parsePrice(p.precio);
						vBase = p.precio_base ? Number(p.precio_base) : parentPriceUsd ?? null;
						vMoneda = p.moneda_base ?? "USD";
						vPriceUsd = parentPriceUsd ?? null;
						vPriceArs = parentPriceArs ?? 0;
					}
					return {
						id: crypto.randomUUID(),
						product_id: productId,
						color: String(v.color ?? "").trim(),
						precio_base: vBase,
						moneda_base: vMoneda,
						precio: vPriceArs,
						precio_usd: vPriceUsd,
						stock: v.stock ?? "SI",
						imagen_url: v.imagen_url ?? null
					};
				});
				const { error: vErr } = await supabaseAdmin.from("product_variants").insert(variantRows);
				if (vErr) throw vErr;
			}
		}
		await invalidateStoreCache();
		return { id: productId };
	} catch (err) {
		console.error("Error in upsertAdminProduct:", err);
		return { error: `Error al guardar: ${err?.message || err?.details || String(err)}` };
	}
});
var updateProductPrice_createServerFn_handler = createServerRpc({
	id: "e16788a51c33121a1633d532be8d6ec8e5d2ae0ea43fee788b47a98b99c40007",
	name: "updateProductPrice",
	filename: "src/lib/products.functions.ts"
}, (opts) => updateProductPrice.__executeServer(opts));
var updateProductPrice = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	productId: str(data?.productId, 100),
	sourceCurrency: data?.sourceCurrency === "ARS" ? "ARS" : "USD",
	basePrice: Number(data?.basePrice) || 0,
	hasOffer: Boolean(data?.hasOffer),
	offerSourceCurrency: data?.offerSourceCurrency === "ARS" ? "ARS" : "USD",
	offerBasePrice: data?.offerBasePrice !== null && data?.offerBasePrice !== void 0 ? Number(data.offerBasePrice) : null,
	variants: Array.isArray(data?.variants) ? data.variants.map((v) => ({
		id: v.id ? str(v.id, 100) : void 0,
		color: str(v.color, 100),
		sourceCurrency: v.sourceCurrency === "ARS" ? "ARS" : "USD",
		basePrice: v.basePrice !== null && v.basePrice !== void 0 ? Number(v.basePrice) : null
	})) : void 0
})).handler(updateProductPrice_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		if (!data.productId) throw new Error("ID de producto no provisto.");
		if (data.basePrice <= 0) throw new Error("El precio base debe ser mayor a 0.");
		let rate = 1500;
		let markup = 0;
		let increment = 10;
		try {
			const { data: pSettings } = await supabaseAdmin.from("pricing_settings").select("last_rate, markup_percentage, rounding_increment").eq("id", true).maybeSingle();
			if (pSettings) {
				if (Number(pSettings.last_rate) > 0) rate = Number(pSettings.last_rate);
				if (pSettings.markup_percentage !== void 0) markup = Number(pSettings.markup_percentage) / 100;
				if (Number(pSettings.rounding_increment) > 0) increment = Number(pSettings.rounding_increment);
			}
		} catch {}
		if (!rate) try {
			const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3e3) });
			if (apiRes.ok) {
				const apiData = await apiRes.json();
				if (apiData?.venta && apiData.venta > 0) rate = Math.round(apiData.venta);
			}
		} catch {}
		if (!rate) {
			const { data: cfgRow } = await supabaseAdmin.from("site_config").select("valor").eq("clave", "dolar_cotizacion").maybeSingle();
			rate = Number(cfgRow?.valor) > 0 ? Number(cfgRow?.valor) : 1500;
		}
		const arsFromUsd = (usd) => {
			if (increment > 1) return Math.ceil(usd * rate * (1 + markup) / increment) * increment;
			return Math.round(usd * rate * (1 + markup));
		};
		let finalUsd;
		let finalArs;
		if (data.sourceCurrency === "USD") {
			finalUsd = Math.round(data.basePrice * 1.07 * 100) / 100;
			finalArs = arsFromUsd(finalUsd);
		} else {
			finalArs = Math.round(data.basePrice * 1.07);
			finalUsd = rate > 0 ? Math.round(finalArs / rate * 100) / 100 : 0;
		}
		let finalOfferUsd = null;
		let finalOfferArs = null;
		let offerBase = null;
		let offerMoneda = null;
		if (data.hasOffer && data.offerBasePrice && data.offerBasePrice > 0) {
			offerBase = data.offerBasePrice;
			offerMoneda = data.offerSourceCurrency;
			if (data.offerSourceCurrency === "USD") {
				finalOfferUsd = Math.round(data.offerBasePrice * 1.07 * 100) / 100;
				finalOfferArs = arsFromUsd(finalOfferUsd);
			} else {
				finalOfferArs = Math.round(data.offerBasePrice * 1.07);
				finalOfferUsd = rate > 0 ? Math.round(finalOfferArs / rate * 100) / 100 : null;
			}
		}
		const productUpdate = {
			precio_base: data.basePrice,
			moneda_base: data.sourceCurrency,
			precio_usd: finalUsd,
			precio: String(finalArs),
			oferta: data.hasOffer ? "SI" : "NO",
			precio_oferta_base: offerBase,
			moneda_oferta_base: offerMoneda,
			precio_oferta_usd: finalOfferUsd,
			precio_oferta: finalOfferArs !== null ? String(finalOfferArs) : null,
			precio_actualizado_en: (/* @__PURE__ */ new Date()).toISOString()
		};
		const { error: prodErr } = await supabaseAdmin.from("products").update(productUpdate).eq("id", data.productId);
		if (prodErr) throw prodErr;
		if (data.variants && data.variants.length > 0) for (const v of data.variants) {
			const vBase = v.basePrice && v.basePrice > 0 ? v.basePrice : data.basePrice;
			const vMoneda = v.basePrice && v.basePrice > 0 ? v.sourceCurrency || data.sourceCurrency : data.sourceCurrency;
			let vFinalUsd;
			let vFinalArs;
			if (vMoneda === "USD") {
				vFinalUsd = Math.round(vBase * 1.07 * 100) / 100;
				vFinalArs = arsFromUsd(vFinalUsd);
			} else {
				vFinalArs = Math.round(vBase * 1.07);
				vFinalUsd = rate > 0 ? Math.round(vFinalArs / rate * 100) / 100 : 0;
			}
			const vUpdate = {
				precio_base: vBase,
				moneda_base: vMoneda,
				precio_usd: vFinalUsd,
				precio: vFinalArs,
				precio_actualizado_en: (/* @__PURE__ */ new Date()).toISOString()
			};
			if (v.id) await supabaseAdmin.from("product_variants").update(vUpdate).eq("id", v.id);
			else await supabaseAdmin.from("product_variants").update(vUpdate).eq("product_id", data.productId).eq("color", v.color);
		}
		await invalidateStoreCache();
		return { success: true };
	} catch (err) {
		console.error("Error in updateProductPrice:", err);
		return { error: err instanceof Error ? err.message : "Error al actualizar precios." };
	}
});
function parseSupabaseStorageUrl(url) {
	if (!url || typeof url !== "string") return null;
	const markerPublic = "/storage/v1/object/public/";
	const markerSign = "/storage/v1/object/sign/";
	let idx = url.indexOf(markerPublic);
	let offset = 26;
	if (idx === -1) {
		idx = url.indexOf(markerSign);
		offset = 24;
	}
	if (idx === -1) return null;
	const remainder = url.slice(idx + offset);
	const slashIdx = remainder.indexOf("/");
	if (slashIdx === -1) return null;
	const bucket = remainder.slice(0, slashIdx).trim();
	const rawPath = remainder.slice(slashIdx + 1).split(/[?#]/)[0].trim();
	if (!bucket || !rawPath) return null;
	try {
		return {
			bucket,
			path: decodeURIComponent(rawPath)
		};
	} catch {
		return {
			bucket,
			path: rawPath
		};
	}
}
function getDownloadableUrl(url) {
	const trimmed = String(url ?? "").trim();
	if (trimmed.indexOf("drive.google.com") !== -1) {
		const fileDIdx = trimmed.indexOf("/file/d/");
		if (fileDIdx !== -1) {
			const rest = trimmed.slice(fileDIdx + 8);
			const nextSlash = rest.indexOf("/");
			const id = nextSlash === -1 ? rest.split(/[?#]/)[0] : rest.slice(0, nextSlash);
			if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
		}
		const idIdx = trimmed.indexOf("id=");
		if (idIdx !== -1) {
			const id = trimmed.slice(idIdx + 3).split(/[&#]/)[0];
			if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
		}
	}
	return trimmed;
}
function isOptimizedStorageUrl(url) {
	if (!url || typeof url !== "string") return false;
	const trimmed = url.trim();
	if (!(trimmed.includes("/storage/v1/object/public/") || trimmed.includes("/storage/v1/object/sign/"))) return false;
	return trimmed.split(/[?#]/)[0].toLowerCase().endsWith(".webp");
}
async function optimizeImageOnServer(supabaseAdmin, url, folder = "products") {
	if (!url || typeof url !== "string") return url ?? "";
	const trimmed = url.trim();
	if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) return trimmed;
	if (isOptimizedStorageUrl(trimmed)) return trimmed;
	try {
		const downloadUrl = getDownloadableUrl(trimmed);
		const headers = {
			accept: "image/avif,image/webp,image/*,*/*;q=0.8",
			"user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
		};
		if (trimmed.includes("yupoo.com")) headers["referer"] = "https://photo.yupoo.com/";
		const res = await fetch(downloadUrl, {
			headers,
			signal: AbortSignal.timeout(15e3)
		});
		if (!res.ok) {
			console.warn("[Optimize] Error al descargar imagen para optimizar:", res.status, trimmed);
			return trimmed;
		}
		const rawBuffer = Buffer.from(await res.arrayBuffer());
		if (rawBuffer.length === 0) return trimmed;
		const sharp = (await import("sharp")).default;
		const compressedBuffer = await sharp(rawBuffer).rotate().resize({
			width: 900,
			height: 900,
			fit: "inside",
			withoutEnlargement: true
		}).webp({
			quality: 80,
			effort: 4
		}).toBuffer();
		let thumbBuffer = null;
		try {
			thumbBuffer = await sharp(rawBuffer).rotate().resize({
				width: 160,
				height: 160,
				fit: "inside",
				withoutEnlargement: true
			}).webp({
				quality: 80,
				effort: 4
			}).toBuffer();
		} catch {}
		const bucketName = "store-images";
		const fileId = crypto.randomUUID();
		const filename = `${folder}/${fileId}.webp`;
		const thumbFilename = `${folder}/thumbnails/${fileId}.webp`;
		try {
			const { data: buckets } = await supabaseAdmin.storage.listBuckets();
			if (!buckets?.some((b) => b.name === bucketName)) await supabaseAdmin.storage.createBucket(bucketName, { public: true });
		} catch {}
		const { error: upErr } = await supabaseAdmin.storage.from(bucketName).upload(filename, compressedBuffer, {
			contentType: "image/webp",
			cacheControl: "31536000",
			upsert: false
		});
		if (upErr) {
			console.warn("[Optimize] Error al subir imagen optimizada al bucket:", bucketName, upErr.message);
			return trimmed;
		}
		if (thumbBuffer) supabaseAdmin.storage.from(bucketName).upload(thumbFilename, thumbBuffer, {
			contentType: "image/webp",
			cacheControl: "31536000",
			upsert: false
		}).catch(() => {});
		const { data: pubData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filename);
		if (pubData?.publicUrl) {
			const oldStorage = parseSupabaseStorageUrl(trimmed);
			if (oldStorage && oldStorage.path !== filename) supabaseAdmin.storage.from(oldStorage.bucket).remove([oldStorage.path]).catch(() => {});
			return pubData.publicUrl;
		}
	} catch (err) {
		console.warn("[Optimize] No se pudo optimizar la imagen con sharp, conservando original:", err instanceof Error ? err.message : String(err));
	}
	return trimmed;
}
/**
* Recolecta todas las URLs de imágenes asociadas a un conjunto de productos (imagen principal,
* extra_images en metadata y variantes).
*/
async function collectProductImages(supabaseAdmin, productIds) {
	if (!productIds || productIds.length === 0) return [];
	const [prodsRes, varsRes] = await Promise.all([supabaseAdmin.from("products").select("imagen_url, metadata").in("id", productIds), supabaseAdmin.from("product_variants").select("imagen_url").in("product_id", productIds)]);
	const urls = /* @__PURE__ */ new Set();
	for (const p of prodsRes.data ?? []) {
		if (typeof p.imagen_url === "string" && p.imagen_url.trim()) urls.add(p.imagen_url.trim());
		if (p.metadata && typeof p.metadata === "object") {
			const meta = p.metadata;
			const extra = meta["extra_images"];
			if (Array.isArray(extra)) {
				for (const item of extra) if (typeof item === "string" && item.trim()) urls.add(item.trim());
			}
			for (const val of Object.values(meta)) if (typeof val === "string" && val.includes("/storage/v1/object/")) urls.add(val.trim());
		}
	}
	for (const v of varsRes.data ?? []) if (typeof v.imagen_url === "string" && v.imagen_url.trim()) urls.add(v.imagen_url.trim());
	return Array.from(urls);
}
/**
* Elimina las fotos de los buckets de Supabase Storage correspondientes,
* verificando de forma segura que ningún otro producto o banner activo las siga usando.
*/
async function deleteImagesFromStorage(supabaseAdmin, imageUrls) {
	if (!imageUrls || imageUrls.length === 0) return;
	const filesByBucket = /* @__PURE__ */ new Map();
	for (const url of imageUrls) {
		const parsed = parseSupabaseStorageUrl(url);
		if (!parsed) continue;
		if (!filesByBucket.has(parsed.bucket)) filesByBucket.set(parsed.bucket, /* @__PURE__ */ new Set());
		filesByBucket.get(parsed.bucket).add(parsed.path);
	}
	if (filesByBucket.size === 0) return;
	try {
		const [remProds, remVars, banners] = await Promise.all([
			supabaseAdmin.from("products").select("imagen_url"),
			supabaseAdmin.from("product_variants").select("imagen_url"),
			supabaseAdmin.from("banners").select("imagen_url")
		]);
		const activeKeys = /* @__PURE__ */ new Set();
		const registerActive = (u) => {
			const parsed = parseSupabaseStorageUrl(u);
			if (parsed) activeKeys.add(`${parsed.bucket}::${parsed.path}`);
		};
		(remProds.data ?? []).forEach((p) => registerActive(p.imagen_url));
		(remVars.data ?? []).forEach((v) => registerActive(v.imagen_url));
		(banners.data ?? []).forEach((b) => registerActive(b.imagen_url));
		for (const [bucket, pathSet] of filesByBucket.entries()) {
			const pathsToDelete = [];
			for (const p of pathSet) if (!activeKeys.has(`${bucket}::${p}`)) pathsToDelete.push(p);
			if (pathsToDelete.length > 0) for (let i = 0; i < pathsToDelete.length; i += 50) {
				const batch = pathsToDelete.slice(i, i + 50);
				const { error } = await supabaseAdmin.storage.from(bucket).remove(batch);
				if (error) console.warn("[Storage] Error al eliminar lote de fotos en bucket:", bucket, batch.length, error.message);
			}
		}
	} catch (storageErr) {
		console.warn("[Storage] Error no bloqueante al limpiar fotos del storage:", storageErr);
	}
}
var deleteAdminProduct_createServerFn_handler = createServerRpc({
	id: "33f8e26a870b8cd0f9915e42f81a7424c08b148b60f99c7b98a630bc6868796a",
	name: "deleteAdminProduct",
	filename: "src/lib/products.functions.ts"
}, (opts) => deleteAdminProduct.__executeServer(opts));
var deleteAdminProduct = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	productId: str(data?.productId, 100)
})).handler(deleteAdminProduct_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		const imageUrls = await collectProductImages(supabaseAdmin, [data.productId]);
		await supabaseAdmin.from("product_variants").delete().eq("product_id", data.productId);
		const { error } = await supabaseAdmin.from("products").delete().eq("id", data.productId);
		if (error) throw error;
		if (imageUrls.length > 0) await deleteImagesFromStorage(supabaseAdmin, imageUrls);
		await invalidateStoreCache();
		return {};
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Error al eliminar el producto." };
	}
});
var bulkDeleteAdminProducts_createServerFn_handler = createServerRpc({
	id: "342ab30ce7873a26573b8b4f1ab0cb2445a8ea911dd599d8b32f4f1ca2f086f0",
	name: "bulkDeleteAdminProducts",
	filename: "src/lib/products.functions.ts"
}, (opts) => bulkDeleteAdminProducts.__executeServer(opts));
var bulkDeleteAdminProducts = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	productIds: Array.isArray(data?.productIds) ? data.productIds.map((id) => str(id, 200)).filter(Boolean) : []
})).handler(bulkDeleteAdminProducts_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		if (data.productIds.length === 0) return {
			success: true,
			count: 0
		};
		const imageUrls = await collectProductImages(supabaseAdmin, data.productIds);
		try {
			await supabaseAdmin.from("product_variants").delete().in("product_id", data.productIds);
		} catch (err) {
			console.warn("Aviso al limpiar variantes de productos eliminados:", err);
		}
		const { error: prodErr } = await supabaseAdmin.from("products").delete().in("id", data.productIds);
		if (prodErr) throw prodErr;
		if (imageUrls.length > 0) await deleteImagesFromStorage(supabaseAdmin, imageUrls);
		await invalidateStoreCache();
		return {
			success: true,
			count: data.productIds.length
		};
	} catch (err) {
		console.error("Error in bulkDeleteAdminProducts:", err);
		return { error: err instanceof Error ? err.message : "Error al eliminar productos de la base de datos." };
	}
});
var uploadAdminProductImage_createServerFn_handler = createServerRpc({
	id: "45d200092fe3415ee9edf5769ceeb45d4ea8aab97640f003c02c548380e9f574",
	name: "uploadAdminProductImage",
	filename: "src/lib/products.functions.ts"
}, (opts) => uploadAdminProductImage.__executeServer(opts));
var uploadAdminProductImage = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	filename: str(data?.filename, 200),
	base64: data?.base64 ?? "",
	bucket: str(data?.bucket, 60) || "storage-images",
	contentType: str(data?.contentType, 60)
})).handler(uploadAdminProductImage_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		const base64Data = data.base64.replace(/^data:image\/\w+;base64,/, "");
		const buffer = Buffer.from(base64Data, "base64");
		const bucketName = data.bucket || "storage-images";
		let cleanFilename = (data.filename || "").trim().replace(/^\/+/, "");
		const folder = cleanFilename.includes("/") ? cleanFilename.substring(0, cleanFilename.lastIndexOf("/")) : "products";
		const baseName = cleanFilename.includes("/") ? cleanFilename.substring(cleanFilename.lastIndexOf("/") + 1) : cleanFilename;
		let filename = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(baseName) ? `${folder}/${baseName}` : `${folder}/${crypto.randomUUID()}_${baseName || "image.webp"}`;
		let cType = data.contentType || "image/webp";
		let uploadBuffer = buffer;
		try {
			const sharp = (await import("sharp")).default;
			uploadBuffer = await sharp(buffer).rotate().resize({
				width: 900,
				height: 900,
				fit: "inside",
				withoutEnlargement: true
			}).webp({
				quality: 80,
				effort: 4
			}).toBuffer();
			cType = "image/webp";
			if (!filename.toLowerCase().endsWith(".webp")) filename = filename.replace(/\.[^.]+$/, "") + ".webp";
		} catch (sharpErr) {
			console.warn("[Upload] Aviso al comprimir con sharp:", sharpErr);
			if (!cType) {
				if (filename.endsWith(".webp")) cType = "image/webp";
				else if (filename.endsWith(".png")) cType = "image/png";
				else if (filename.endsWith(".gif")) cType = "image/gif";
				else cType = "image/jpeg";
			}
		}
		try {
			const { data: buckets } = await supabaseAdmin.storage.listBuckets();
			if (!buckets?.some((b) => b.name === bucketName)) await supabaseAdmin.storage.createBucket(bucketName, { public: true });
		} catch {}
		const { error: uploadErr } = await supabaseAdmin.storage.from(bucketName).upload(filename, uploadBuffer, {
			contentType: cType,
			cacheControl: "31536000",
			upsert: false
		});
		if (uploadErr) throw uploadErr;
		const { data: pubData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filename);
		return { publicUrl: pubData.publicUrl };
	} catch (err) {
		console.error("Error al subir imagen:", err);
		return { error: err instanceof Error ? err.message : "Error al subir la imagen." };
	}
});
var upsertCategoryRules_createServerFn_handler = createServerRpc({
	id: "f0db6b401048fa798f276cb808a4b040a31d1474c02663a9a6965b90857256df",
	name: "upsertCategoryRules",
	filename: "src/lib/products.functions.ts"
}, (opts) => upsertCategoryRules.__executeServer(opts));
var upsertCategoryRules = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	rules: data.rules,
	dolarCotizacion: data.dolarCotizacion,
	bankInfo: data.bankInfo,
	resendConfig: data.resendConfig,
	couponConfig: data.couponConfig,
	calculatorRates: data.calculatorRates
})).handler(upsertCategoryRules_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		const { error: delErr } = await supabaseAdmin.from("site_config").delete().like("clave", "cat_%");
		if (delErr) throw delErr;
		const rows = [];
		for (const rule of data.rules) {
			const cat = rule.category.trim().toLowerCase().normalize("NFC");
			if (!cat) continue;
			const validTiers = rule.discountTiers.filter((t) => t.units > 0 && t.percent > 0).sort((a, b) => a.units - b.units);
			if (validTiers.length > 0) rows.push({
				clave: `cat_discount_${cat}`,
				valor: JSON.stringify(validTiers)
			});
			if (rule.minType === "units" && rule.minValue > 0) rows.push({
				clave: `cat_min_units_${cat}`,
				valor: String(rule.minValue)
			});
			if (rule.minType === "amount" && rule.minValue > 0) rows.push({
				clave: `cat_min_amount_${cat}`,
				valor: String(rule.minValue)
			});
		}
		if (data.dolarCotizacion && data.dolarCotizacion > 0) await supabaseAdmin.from("site_config").upsert({
			clave: "dolar_cotizacion",
			valor: String(data.dolarCotizacion)
		}, { onConflict: "clave" });
		if (data.bankInfo) {
			const bankRows = [
				{
					clave: "transferencia_alias",
					valor: data.bankInfo.alias ?? "teimportamos.mp"
				},
				{
					clave: "transferencia_cbu",
					valor: data.bankInfo.cbu ?? ""
				},
				{
					clave: "transferencia_titular",
					valor: data.bankInfo.titular ?? ""
				},
				{
					clave: "transferencia_banco",
					valor: data.bankInfo.banco ?? ""
				},
				{
					clave: "transferencia_descuento_pct",
					valor: String(data.bankInfo.descuentoPct ?? 7)
				}
			];
			for (const bRow of bankRows) await supabaseAdmin.from("site_config").upsert(bRow, { onConflict: "clave" });
		}
		if (data.resendConfig) {
			if (data.resendConfig.apiKey) await supabaseAdmin.from("site_config").upsert({
				clave: "resend_api_key",
				valor: data.resendConfig.apiKey.trim()
			}, { onConflict: "clave" });
			if (data.resendConfig.from) await supabaseAdmin.from("site_config").upsert({
				clave: "resend_from",
				valor: data.resendConfig.from.trim()
			}, { onConflict: "clave" });
		}
		if (data.couponConfig) {
			const couponRows = [
				{
					clave: "promo_cupon_activo",
					valor: data.couponConfig.activo ? "SI" : "NO"
				},
				{
					clave: "promo_cupon_codigo",
					valor: (data.couponConfig.codigo || "TEIMPORTAMOS").trim().toUpperCase()
				},
				{
					clave: "promo_cupon_descuento_pct",
					valor: String(data.couponConfig.descuentoPct ?? 5)
				}
			];
			for (const cRow of couponRows) await supabaseAdmin.from("site_config").upsert(cRow, { onConflict: "clave" });
		}
		if (data.calculatorRates) {
			const calcRows = [
				{
					clave: "calc_flete_kg",
					valor: String(data.calculatorRates.fleteKg ?? 22)
				},
				{
					clave: "calc_handling",
					valor: String(data.calculatorRates.handling ?? 30)
				},
				{
					clave: "calc_honorarios",
					valor: String(data.calculatorRates.honorarios ?? 220)
				},
				{
					clave: "calc_impuestos_pct",
					valor: String(data.calculatorRates.impuestosPct ?? 70)
				},
				{
					clave: "calc_aereo_fijo",
					valor: String(data.calculatorRates.aereoFijo ?? 950)
				},
				{
					clave: "calc_aereo_desde",
					valor: String(data.calculatorRates.aereoDesde ?? 50)
				},
				{
					clave: "calc_aereo_hasta",
					valor: String(data.calculatorRates.aereoHasta ?? 250)
				},
				{
					clave: "calc_barco_fijo",
					valor: String(data.calculatorRates.barcoFijo ?? 100)
				},
				{
					clave: "calc_barco_desde",
					valor: String(data.calculatorRates.barcoDesde ?? 250)
				}
			];
			for (const row of calcRows) await supabaseAdmin.from("site_config").upsert(row, { onConflict: "clave" });
		}
		if (rows.length > 0) {
			const { error: insErr } = await supabaseAdmin.from("site_config").insert(rows);
			if (insErr) throw insErr;
		}
		await invalidateStoreCache();
		return {};
	} catch (err) {
		console.error("Error in upsertCategoryRules:", err);
		return { error: err instanceof Error ? err.message : "Error al guardar reglas." };
	}
});
var validatePromoCoupon_createServerFn_handler = createServerRpc({
	id: "854d2d92b3f8f0474351a06b3fa503a327af9e5237d8105d07ae8da00d0304c1",
	name: "validatePromoCoupon",
	filename: "src/lib/products.functions.ts"
}, (opts) => validatePromoCoupon.__executeServer(opts));
var validatePromoCoupon = createServerFn({ method: "POST" }).validator((data) => ({
	code: str(data.code, 40).toUpperCase().trim(),
	userId: data.userId ? str(data.userId, 60) : void 0,
	email: data.email ? str(data.email, 160).toLowerCase().trim() : void 0,
	token: data.token ? str(data.token, 4e3) : void 0
})).handler(validatePromoCoupon_createServerFn_handler, async ({ data }) => {
	try {
		if (!data.code) return {
			valid: false,
			error: "Ingresá un código promocional."
		};
		const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
		let verifiedUserId = data.userId;
		let verifiedEmail = data.email;
		if (data.token) {
			const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
			if (userData?.user) {
				verifiedUserId = userData.user.id;
				verifiedEmail = userData.user.email ?? verifiedEmail;
			}
		}
		if (!verifiedUserId) return {
			valid: false,
			error: "Debés iniciar sesión con tu cuenta para reclamar el cupón."
		};
		const { data: configRows } = await supabaseAdmin.from("site_config").select("*");
		const configMap = {};
		for (const row of configRows ?? []) if (row.clave && row.valor) configMap[row.clave] = row.valor;
		if (!((configMap["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI")) return {
			valid: false,
			error: "El cupón promocional no está activo o ya finalizó su periodo de vigencia."
		};
		const validCode = (configMap["promo_cupon_codigo"] ?? "TEIMPORTAMOS").toUpperCase().trim();
		if (data.code !== validCode) return {
			valid: false,
			error: "El código promocional ingresado no es válido."
		};
		const discountPct = Number(configMap["promo_cupon_descuento_pct"]) || 5;
		const userUsageKey = `coupon_usage_${validCode}_${verifiedUserId}`;
		const emailUsageKey = verifiedEmail ? `coupon_usage_${validCode}_${verifiedEmail.trim().toLowerCase()}` : "";
		if (configMap[userUsageKey] || emailUsageKey && configMap[emailUsageKey]) return {
			valid: false,
			error: "Ya utilizaste este código de descuento en una compra anterior (válido 1 sola vez por cuenta)."
		};
		const filterParts = [`user_id.eq.${verifiedUserId}`];
		if (verifiedEmail) filterParts.push(`user_email.ilike.${verifiedEmail.trim().toLowerCase()}`);
		try {
			const { data: usageRows } = await supabaseAdmin.from("coupon_usages").select("id").eq("coupon_code", validCode).or(filterParts.join(",")).limit(1);
			if (usageRows && usageRows.length > 0) return {
				valid: false,
				error: "Ya utilizaste este código de descuento en una compra anterior (válido 1 sola vez por cuenta)."
			};
		} catch (usageErr) {
			console.warn("Error consultando coupon_usages:", usageErr);
		}
		return {
			valid: true,
			code: validCode,
			discountPct
		};
	} catch (err) {
		console.error("Error validando cupón promocional:", err);
		return {
			valid: false,
			error: "Error al validar el cupón. Probá nuevamente."
		};
	}
});
var getCouponUsagesSummary_createServerFn_handler = createServerRpc({
	id: "bc57a9a95eab34c83f5095fc719cb6d8f7d5df96c8e15e8ecdff4c8ad7305589",
	name: "getCouponUsagesSummary",
	filename: "src/lib/products.functions.ts"
}, (opts) => getCouponUsagesSummary.__executeServer(opts));
var getCouponUsagesSummary = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3)
})).handler(getCouponUsagesSummary_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		let count = 0;
		try {
			const { count: dbCount } = await supabaseAdmin.from("coupon_usages").select("*", {
				count: "exact",
				head: true
			});
			if (typeof dbCount === "number") count = dbCount;
		} catch {}
		const { data: scRows } = await supabaseAdmin.from("site_config").select("clave").like("clave", "coupon_usage_%");
		const distinctUsers = /* @__PURE__ */ new Set();
		for (const row of scRows ?? []) if (row.clave) distinctUsers.add(row.clave);
		return { count: Math.max(count, Math.ceil(distinctUsers.size / 2)) };
	} catch (err) {
		return {
			count: 0,
			error: err instanceof Error ? err.message : "Error"
		};
	}
});
var testAdminResendEmail_createServerFn_handler = createServerRpc({
	id: "8fe58ff15eb2e561b41b0403b33a87523e3dc7eb987ce475c0eb3410c23d427c",
	name: "testAdminResendEmail",
	filename: "src/lib/products.functions.ts"
}, (opts) => testAdminResendEmail.__executeServer(opts));
var testAdminResendEmail = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	targetEmail: str(data?.targetEmail, 160).toLowerCase()
})).handler(testAdminResendEmail_createServerFn_handler, async ({ data }) => {
	try {
		await assertAdmin(data.email, data.token);
		const { sendTestOrderEmail } = await import("./email.functions-DAoj8YjB.mjs");
		return await sendTestOrderEmail(data.targetEmail || data.email);
	} catch (err) {
		return {
			success: false,
			message: err instanceof Error ? err.message : "Error de autorización."
		};
	}
});
var getAdminBanners_createServerFn_handler = createServerRpc({
	id: "c1844a2834abb2f0b7bffcdc067115ca45e88e9793d502a91e80ad3b19350d03",
	name: "getAdminBanners",
	filename: "src/lib/products.functions.ts"
}, (opts) => getAdminBanners.__executeServer(opts));
var getAdminBanners = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3)
})).handler(getAdminBanners_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		const [bannersRes, pricingRes] = await Promise.all([supabaseAdmin.from("banners").select("*"), supabaseAdmin.from("pricing_settings").select("last_rate, markup_percentage, rounding_increment").eq("id", true).maybeSingle()]);
		if (bannersRes.error) throw bannersRes.error;
		let dolarRate = 0;
		let roundingIncrement = 10;
		let markupPercentage = 0;
		if (pricingRes?.data) {
			if (Number(pricingRes.data.last_rate) > 0) dolarRate = Number(pricingRes.data.last_rate);
			if (Number(pricingRes.data.rounding_increment) > 0) roundingIncrement = Number(pricingRes.data.rounding_increment);
			if (pricingRes.data.markup_percentage !== void 0) markupPercentage = Number(pricingRes.data.markup_percentage);
		}
		if (!dolarRate) try {
			const apiRes = await fetch("https://dolarapi.com/v1/dolares/cripto", { signal: AbortSignal.timeout(3e3) });
			if (apiRes.ok) {
				const apiData = await apiRes.json();
				if (apiData?.venta && apiData.venta > 0) dolarRate = Math.round(apiData.venta);
			}
		} catch {}
		return {
			banners: (bannersRes.data ?? []).map((raw) => {
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
			}),
			dolarRate: dolarRate || 1500,
			roundingIncrement,
			markupPercentage
		};
	} catch (err) {
		return {
			banners: [],
			error: err instanceof Error ? err.message : "Error al cargar combos."
		};
	}
});
var upsertAdminBanner_createServerFn_handler = createServerRpc({
	id: "6ae12117933882980086caf47798caa8215796c2fd7dbedf065b24769a26aa2f",
	name: "upsertAdminBanner",
	filename: "src/lib/products.functions.ts"
}, (opts) => upsertAdminBanner.__executeServer(opts));
var upsertAdminBanner = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	banner: data.banner
})).handler(upsertAdminBanner_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		const b = data.banner;
		const tiersJson = Array.isArray(b.quantity_tiers) && b.quantity_tiers.length > 0 ? JSON.stringify(b.quantity_tiers) : null;
		const fullRow = {
			titulo: b.titulo,
			subtitulo: b.subtitulo ?? "",
			imagen_url: b.imagen_url ?? "",
			link: tiersJson ?? b.link ?? "",
			activo: b.activo ?? "SI",
			precio: String(b.precio ?? "0"),
			precio_base: b.precio_base !== void 0 && b.precio_base !== null && b.precio_base !== "" ? Number(b.precio_base) : null,
			moneda_base: b.moneda_base ?? "USD",
			precio_usd: b.precio_usd !== void 0 && b.precio_usd !== null && b.precio_usd !== "" ? Number(b.precio_usd) : null,
			precio_actualizado_en: (/* @__PURE__ */ new Date()).toISOString(),
			quantity_tiers: tiersJson
		};
		const basicRow = {
			titulo: b.titulo,
			subtitulo: b.subtitulo ?? "",
			imagen_url: b.imagen_url ?? "",
			link: tiersJson ?? b.link ?? "",
			activo: b.activo ?? "SI",
			precio: String(b.precio ?? "0")
		};
		if (b.id) {
			const { error } = await supabaseAdmin.from("banners").update(fullRow).eq("id", b.id);
			if (error) {
				console.warn("Retrying banner update with basic columns:", error.message);
				const retry = await supabaseAdmin.from("banners").update(basicRow).eq("id", b.id);
				if (retry.error) throw retry.error;
			}
			await invalidateStoreCache();
			return { id: b.id };
		} else {
			const newId = crypto.randomUUID();
			let { data: ins, error } = await supabaseAdmin.from("banners").insert({
				id: newId,
				...fullRow
			}).select("id").single();
			if (error) {
				console.warn("Retrying banner insert with basic columns:", error.message);
				const retryBasic = await supabaseAdmin.from("banners").insert({
					id: newId,
					...basicRow
				}).select("id").single();
				ins = retryBasic.data;
				error = retryBasic.error;
			}
			if (error) {
				console.warn("Retrying banner insert without custom ID:", error.message);
				const retryNoId = await supabaseAdmin.from("banners").insert(basicRow).select("id").single();
				ins = retryNoId.data;
				error = retryNoId.error;
			}
			if (error) throw error;
			await invalidateStoreCache();
			return { id: String(ins?.id ?? newId) };
		}
	} catch (err) {
		console.error("Error in upsertAdminBanner:", err);
		return { error: err instanceof Error ? err.message : "Error al guardar el combo." };
	}
});
var deleteAdminBanner_createServerFn_handler = createServerRpc({
	id: "cbfd4f5cd9746db9487c49783400e817a94c8a8a7d58782bd61b9f12d886b41b",
	name: "deleteAdminBanner",
	filename: "src/lib/products.functions.ts"
}, (opts) => deleteAdminBanner.__executeServer(opts));
var deleteAdminBanner = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	bannerId: str(data?.bannerId, 100)
})).handler(deleteAdminBanner_createServerFn_handler, async ({ data }) => {
	try {
		const { error } = await (await assertAdmin(data.email, data.token)).from("banners").delete().eq("id", data.bannerId);
		if (error) throw error;
		await invalidateStoreCache();
		return {};
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Error al eliminar el combo." };
	}
});
var bulkUpdateAdminStock_createServerFn_handler = createServerRpc({
	id: "5ce925605bf62477c3ee4f80a1cb916cab3cdc2d46be3dbf324bcfe7c17f5ccb",
	name: "bulkUpdateAdminStock",
	filename: "src/lib/products.functions.ts"
}, (opts) => bulkUpdateAdminStock.__executeServer(opts));
var bulkUpdateAdminStock = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	productIds: Array.isArray(data?.productIds) ? data.productIds.map((id) => str(id, 100)) : [],
	stock: data?.stock === "NO" ? "NO" : "SI"
})).handler(bulkUpdateAdminStock_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		if (data.productIds.length === 0) return { success: true };
		const { data: prods, error: fetchErr } = await supabaseAdmin.from("products").select("id, metadata").in("id", data.productIds);
		if (fetchErr) throw fetchErr;
		const defaultShoes = "35,36,37,38,39,40,41,42,43,44,45";
		const defaultClothes = "XS,S,M,L,XL,XXL,XXXL";
		for (const p of prods ?? []) {
			const meta = p.metadata ?? {};
			const tipo = String(meta["tipo_talles"] ?? "").toUpperCase();
			if (tipo === "ZAPATILLAS" || tipo === "ROPA") {
				const updatedMeta = { ...meta };
				if (data.stock === "NO") updatedMeta["talles_disponibles"] = "";
				else updatedMeta["talles_disponibles"] = tipo === "ZAPATILLAS" ? defaultShoes : defaultClothes;
				await supabaseAdmin.from("products").update({
					stock: data.stock,
					metadata: updatedMeta
				}).eq("id", p.id);
			} else await supabaseAdmin.from("products").update({ stock: data.stock }).eq("id", p.id);
		}
		await supabaseAdmin.from("product_variants").update({ stock: data.stock }).in("product_id", data.productIds);
		await invalidateStoreCache();
		return { success: true };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Error al actualizar stock masivo." };
	}
});
var updateVariantStock_createServerFn_handler = createServerRpc({
	id: "9136b1bf5c50183bb5672a8824c016a8deefe2a9d600b8905c1d658565e272d3",
	name: "updateVariantStock",
	filename: "src/lib/products.functions.ts"
}, (opts) => updateVariantStock.__executeServer(opts));
var updateVariantStock = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	variantId: str(data?.variantId, 100),
	stock: data?.stock === "NO" ? "NO" : "SI"
})).handler(updateVariantStock_createServerFn_handler, async ({ data }) => {
	try {
		const { error } = await (await assertAdmin(data.email, data.token)).from("product_variants").update({ stock: data.stock }).eq("id", data.variantId);
		if (error) throw error;
		await invalidateStoreCache();
		return { success: true };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Error al actualizar stock de la variante." };
	}
});
/**
* Helpers internos para Yupoo scraping.
* Trabajan con fetch nativo (compatible con Cloudflare Workers).
*/
/** Valida que la URL pertenezca estrictamente a un hostname de Yupoo (anti-SSRF / CWE-918). */
function assertYupooUrl(rawUrl) {
	let parsed;
	try {
		parsed = new URL(rawUrl.trim());
	} catch {
		throw new Error("URL de Yupoo inválida.");
	}
	if (parsed.protocol !== "https:") throw new Error("La URL debe usar HTTPS.");
	const hostname = parsed.hostname.toLowerCase();
	if (!hostname.endsWith(".yupoo.com") || hostname.startsWith(".")) throw new Error("La URL debe pertenecer a un dominio Yupoo (*.yupoo.com).");
	return parsed;
}
var YUPOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
/** Intenta autenticarse con contraseña en un store Yupoo. Retorna la cookie de sesión o null. */
async function yupooAuth(baseUrl, password) {
	try {
		const pageRes = await fetch(baseUrl, {
			headers: { "User-Agent": YUPOO_UA },
			redirect: "follow",
			signal: AbortSignal.timeout(1e4)
		});
		const csrfMatch = (await pageRes.text()).match(/name="_csrf"\s+value="([^"]+)"/);
		const csrf = csrfMatch ? csrfMatch[1] : "";
		const authUrl = `${new URL(baseUrl).origin}/password`;
		const body = new URLSearchParams({ password });
		if (csrf) body.set("_csrf", csrf);
		const rawCookies = (await fetch(authUrl, {
			method: "POST",
			headers: {
				"User-Agent": YUPOO_UA,
				"Content-Type": "application/x-www-form-urlencoded",
				Referer: baseUrl,
				Cookie: pageRes.headers.get("set-cookie")?.split(";")[0] ?? ""
			},
			body: body.toString(),
			redirect: "manual",
			signal: AbortSignal.timeout(1e4)
		})).headers.get("set-cookie") ?? "";
		if (rawCookies) return rawCookies.split(/,(?=[^ ])/g).map((c) => c.trim().split(";")[0] ?? "").filter(Boolean).join("; ");
		return null;
	} catch {
		return null;
	}
}
/** Extrae el título limpio del álbum del HTML de la página. */
function extractAlbumTitle(html) {
	const specificMatch = html.match(/class="showalbumheader__gallerytitle"[^>]*>([^<]+)</);
	if (specificMatch) return specificMatch[1].trim();
	const titleMatches = [...html.matchAll(/class="[^"]*title[^"]*"[^>]*>([^<]+)</gi)];
	for (const m of titleMatches) {
		const t = m[1].trim();
		if (t && !t.includes("|") && t.length > 2 && t.length < 200) return t;
	}
	const titleTag = html.match(/<title>([^<]+)<\/title>/i);
	if (titleTag) return titleTag[1].split("|")[0].trim();
	return "";
}
var translationCache = /* @__PURE__ */ new Map();
/**
* Traduce texto con caracteres chinos/asiáticos a español automáticamente.
* Usa múltiples proveedores en cascada (Google clients5, AndroidTranslate, MyMemory, gtx)
* con memoria caché para garantizar 100% de disponibilidad y evitar bloqueos (HTTP 429).
* Aplica correcciones automáticas para terminología común de indumentaria deportiva.
*/
async function translateChineseToSpanish(text) {
	const clean = String(text ?? "").trim();
	if (!clean) return "";
	if (!/[\u4e00-\u9fa5]/.test(clean)) return clean;
	if (translationCache.has(clean)) return translationCache.get(clean);
	let translated = "";
	if (!translated) try {
		const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=es&q=${encodeURIComponent(clean)}`;
		const res = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(5e3)
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data) && data[0]) {
				const trans = Array.isArray(data[0]) ? data[0][0] : data[0];
				if (typeof trans === "string" && trans.trim()) translated = trans.trim();
			}
		}
	} catch {}
	if (!translated) try {
		const url = `https://translate.google.com/translate_a/single?client=at&dt=t&dj=1&hl=es&ie=UTF-8&oe=UTF-8&sl=auto&tl=es&q=${encodeURIComponent(clean)}`;
		const res = await fetch(url, {
			headers: { "User-Agent": "AndroidTranslate/5.3.0.RC02.130475354-53000263 5.1 phone TRANSLATE_OPM5_TEST_1" },
			signal: AbortSignal.timeout(5e3)
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data?.sentences) && data.sentences[0]?.trans) translated = data.sentences.map((s) => s.trans || "").join("").trim();
		}
	} catch {}
	if (!translated) try {
		const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=zh|es`;
		const res = await fetch(url, { signal: AbortSignal.timeout(5e3) });
		if (res.ok) {
			const data = await res.json();
			if (data?.responseData?.translatedText && typeof data.responseData.translatedText === "string") {
				const t = data.responseData.translatedText.trim();
				if (t && !t.includes("MYMEMORY WARNING")) translated = t;
			}
		}
	} catch {}
	if (!translated) try {
		const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=es&dt=t&q=${encodeURIComponent(clean)}`;
		const res = await fetch(url, {
			headers: { "User-Agent": "Mozilla/5.0" },
			signal: AbortSignal.timeout(5e3)
		});
		if (res.ok) {
			const data = await res.json();
			if (Array.isArray(data?.[0])) translated = data[0].map((item) => Array.isArray(item) && typeof item[0] === "string" ? item[0] : "").join("").trim();
		}
	} catch {}
	if (!translated) translated = clean;
	else translated = translated.replace(/segundo invitado/gi, "Tercera").replace(/primer invitado/gi, "Segunda").replace(/tercer invitado/gi, "Tercera").replace(/invitado/gi, "Visitante").replace(/pasajero/gi, "Visitante").replace(/\s+/g, " ").trim();
	translationCache.set(clean, translated);
	return translated;
}
function toYupooHighRes(url) {
	if (!url) return "";
	return (url.startsWith("//") ? `https:${url}` : url).replace(/\/(?:small|medium|square|thumb)\.([a-zA-Z0-9]+)/i, "/big.$1");
}
function getYupooPhotoId(url) {
	try {
		const parts = new URL(url.startsWith("//") ? `https:${url}` : url).pathname.split("/").filter(Boolean);
		if (parts.length >= 2) return parts[parts.length - 2] ?? null;
	} catch {
		const m = url.match(/\/([a-zA-Z0-9_-]+)\/(?:small|medium|big|square|thumb|original|\d+)\.[a-zA-Z]+/i);
		if (m) return m[1];
	}
	return null;
}
function extractAlbumCover(html) {
	const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
	if (ogMatch && ogMatch[1]) {
		const raw = ogMatch[1].trim();
		if (raw && !raw.includes("logo") && !raw.includes("avatar")) return toYupooHighRes(raw.startsWith("//") ? `https:${raw}` : raw);
	}
	const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
	if (twMatch && twMatch[1]) {
		const raw = twMatch[1].trim();
		if (raw && !raw.includes("logo") && !raw.includes("avatar")) return toYupooHighRes(raw.startsWith("//") ? `https:${raw}` : raw);
	}
	const coverMatch = html.match(/class="[^"]*(?:showalbumheader__gallerycover|album__cover|cover__img)[^"]*"[^>]+(?:data-origin-src|data-src|src)=["']([^"']+)["']/i) || html.match(/(?:data-origin-src|data-src|src)=["']([^"']+)["'][^>]+class="[^"]*(?:showalbumheader__gallerycover|album__cover|cover__img)[^"]*"/i);
	if (coverMatch && coverMatch[1]) {
		const raw = coverMatch[1].trim();
		return toYupooHighRes(raw.startsWith("//") ? `https:${raw}` : raw);
	}
	const jsonMatch = html.match(/"(?:cover|cover_url|cover_path|cover_image)"\s*:\s*"([^"]+)"/i);
	if (jsonMatch && jsonMatch[1]) {
		const raw = jsonMatch[1].replace(/\\/g, "").trim();
		if (raw.includes("photo.yupoo.com") || raw.startsWith("http") || raw.startsWith("//")) return toYupooHighRes(raw.startsWith("//") ? `https:${raw}` : raw);
	}
	return "";
}
function prioritizeCoverImage(images, coverUrl) {
	if (!coverUrl) return images;
	const targetCover = toYupooHighRes(coverUrl);
	const targetPhotoId = getYupooPhotoId(coverUrl);
	const matchIdx = images.findIndex((img) => {
		if (img === coverUrl || img === targetCover) return true;
		if (targetPhotoId) {
			const imgId = getYupooPhotoId(img);
			if (imgId && imgId === targetPhotoId) return true;
		}
		return false;
	});
	if (matchIdx > 0) return [images[matchIdx], ...images.filter((_, i) => i !== matchIdx)];
	else if (matchIdx === 0) return images;
	else {
		if (targetCover && (targetCover.startsWith("http://") || targetCover.startsWith("https://"))) return [targetCover, ...images];
		return images;
	}
}
/** Extrae todas las URLs de imágenes de alta resolución de un álbum Yupoo. */
function extractAlbumImages(html) {
	const urls = [];
	const regex = /data-origin-src="([^"]+)"/g;
	let m;
	while ((m = regex.exec(html)) !== null) {
		const raw = m[1].trim();
		const url = raw.startsWith("//") ? `https:${raw}` : raw;
		if (url.startsWith("http://") || url.startsWith("https://")) urls.push(url);
	}
	if (urls.length === 0) {
		const fallbackRegex = /(?:data-src|data-original|src)=["']((?:https?:)?\/\/photo\.yupoo\.com[^"']+)["']/gi;
		while ((m = fallbackRegex.exec(html)) !== null) {
			const raw = m[1].trim();
			const url = raw.startsWith("//") ? `https:${raw}` : raw;
			if (url.startsWith("http://") || url.startsWith("https://")) urls.push(toYupooHighRes(url));
		}
	}
	return [...new Set(urls)];
}
/** Extrae los links de álbumes individuales, su portada y su título de una página de búsqueda/galería Yupoo. */
function extractAlbumLinks(html, baseOrigin) {
	const results = [];
	const seen = /* @__PURE__ */ new Set();
	const tagRegex = /<a\b([^>]*?href=["'](\/albums\/\d+[^"']*?)["'][^>]*?)>([\s\S]*?)<\/a>/gi;
	let m;
	while ((m = tagRegex.exec(html)) !== null) {
		const fullTagAttributes = m[1];
		const path = m[2];
		const innerContent = m[3];
		const albumUrl = `${baseOrigin}${path}`;
		if (seen.has(albumUrl)) continue;
		seen.add(albumUrl);
		let rawTitle = "";
		const titleAttr = fullTagAttributes.match(/title=["']([^"']+)["']/i);
		if (titleAttr && titleAttr[1]) {
			const candidate = titleAttr[1].trim();
			if (candidate && !candidate.toLowerCase().includes("yupoo") && candidate.length > 2) rawTitle = candidate;
		}
		if (!rawTitle) {
			const textTitle = innerContent.match(/class=["'][^"']*(?:text_overflow|album__title|gallerytitle)[^"']*["'][^>]*>([^<]+)</i);
			if (textTitle && textTitle[1]) rawTitle = textTitle[1].trim();
		}
		let thumbnail = "";
		const thumbMatch = innerContent.match(/(?:data-origin-src|data-src|data-original)=["']([^"']+)["']/i) || innerContent.match(/src=["']((?:https?:)?\/\/photo\.yupoo\.com[^"']+)["']/i);
		if (thumbMatch && thumbMatch[1]) try {
			const raw = thumbMatch[1].trim();
			thumbnail = toYupooHighRes(raw.startsWith("//") ? `https:${raw}` : raw);
		} catch {}
		results.push({
			albumUrl,
			thumbnail,
			rawTitle
		});
	}
	if (results.length === 0) {
		const albumRegex = /href="(\/albums\/\d+[^"]*?)"/g;
		while ((m = albumRegex.exec(html)) !== null) {
			const albumUrl = `${baseOrigin}${m[1]}`;
			if (seen.has(albumUrl)) continue;
			seen.add(albumUrl);
			const idx = m.index;
			const block = html.slice(Math.max(0, idx - 400), idx + 600);
			const titleAttr = block.match(/title=["']([^"']+)["']/i);
			const rawTitle = titleAttr && titleAttr[1] && titleAttr[1].length > 2 ? titleAttr[1].trim() : "";
			const thumbMatch = block.match(/(?:data-origin-src|data-src|data-original)=["']([^"']+)["']/i) || block.match(/src=["']((?:https?:)?\/\/photo\.yupoo\.com[^"']+)["']/i);
			let thumbnail = "";
			if (thumbMatch && thumbMatch[1]) try {
				const raw = thumbMatch[1].trim();
				thumbnail = toYupooHighRes(raw.startsWith("//") ? `https:${raw}` : raw);
			} catch {}
			results.push({
				albumUrl,
				thumbnail,
				rawTitle
			});
		}
	}
	return results;
}
var parseYupooPage_createServerFn_handler = createServerRpc({
	id: "75004676fb89703378d81a34da901d6382e69d2b26040034aa04e17e814a14bd",
	name: "parseYupooPage",
	filename: "src/lib/products.functions.ts"
}, (opts) => parseYupooPage.__executeServer(opts));
var parseYupooPage = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	url: str(data?.url, 500).trim(),
	password: str(data?.password ?? "", 100).trim()
})).handler(parseYupooPage_createServerFn_handler, async ({ data }) => {
	try {
		await assertAdmin(data.email, data.token);
		const rawUrl = data.url;
		let parsed;
		try {
			parsed = assertYupooUrl(rawUrl);
		} catch (e) {
			return { error: e instanceof Error ? e.message : "URL inválida." };
		}
		const origin = parsed.origin;
		let sessionCookie = "";
		if (data.password) sessionCookie = await yupooAuth(rawUrl, data.password) ?? "";
		const headers = { "User-Agent": YUPOO_UA };
		if (sessionCookie) headers["Cookie"] = sessionCookie;
		if (/\/albums\/\d+/.test(parsed.pathname)) {
			const html = await (await fetch(rawUrl, {
				headers,
				signal: AbortSignal.timeout(15e3)
			})).text();
			const rawTitle = extractAlbumTitle(html);
			const title = await translateChineseToSpanish(rawTitle) || rawTitle || "Producto sin título";
			const albumCover = extractAlbumCover(html);
			return { albums: [{
				albumUrl: rawUrl,
				title,
				thumbnail: prioritizeCoverImage(extractAlbumImages(html), albumCover)[0] ?? albumCover ?? ""
			}] };
		}
		const rawAlbums = extractAlbumLinks(await (await fetch(rawUrl, {
			headers,
			signal: AbortSignal.timeout(15e3)
		})).text(), origin);
		if (rawAlbums.length === 0) return { error: "No se encontraron álbumes en la página. Verificá la URL y la contraseña." };
		const toFetch = rawAlbums.slice(0, 30);
		const albums = [];
		for (const item of toFetch) {
			let rawTitle = item.rawTitle;
			let thumbnail = item.thumbnail;
			if (!rawTitle || !thumbnail) try {
				const aHtml = await (await fetch(item.albumUrl, {
					headers,
					signal: AbortSignal.timeout(6e3)
				})).text();
				if (!rawTitle) rawTitle = extractAlbumTitle(aHtml);
				if (!thumbnail) {
					const albumCover = extractAlbumCover(aHtml);
					thumbnail = prioritizeCoverImage(extractAlbumImages(aHtml), albumCover)[0] || albumCover;
				}
			} catch {}
			if (!rawTitle) rawTitle = decodeURIComponent(item.albumUrl.split("/").pop() ?? "Producto");
			const title = await translateChineseToSpanish(rawTitle) || rawTitle;
			albums.push({
				albumUrl: item.albumUrl,
				title,
				thumbnail: thumbnail || ""
			});
		}
		return { albums };
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Error al procesar la página de Yupoo." };
	}
});
var importYupooAlbum_createServerFn_handler = createServerRpc({
	id: "39df01384e0331f2b03058c08d3ca0109ab5784174f7e1a12471658a3548cdc5",
	name: "importYupooAlbum",
	filename: "src/lib/products.functions.ts"
}, (opts) => importYupooAlbum.__executeServer(opts));
var importYupooAlbum = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	albumUrl: str(data?.albumUrl, 500).trim(),
	title: str(data?.title, 300).trim(),
	coverUrl: str(data?.coverUrl, 1e3).trim(),
	password: str(data?.password ?? "", 100).trim(),
	category: str(data?.category, 100).trim(),
	maxImages: Math.min(Math.max(Number(data?.maxImages ?? 8) || 8, 1), 50)
})).handler(importYupooAlbum_createServerFn_handler, async ({ data }) => {
	try {
		const supabaseAdmin = await assertAdmin(data.email, data.token);
		let safeAlbumUrl;
		try {
			safeAlbumUrl = assertYupooUrl(data.albumUrl);
		} catch (e) {
			return { error: e instanceof Error ? e.message : "URL inválida." };
		}
		let sessionCookie = "";
		if (data.password) sessionCookie = await yupooAuth(safeAlbumUrl.href, data.password) ?? "";
		const headers = { "User-Agent": YUPOO_UA };
		if (sessionCookie) headers["Cookie"] = sessionCookie;
		const res = await fetch(safeAlbumUrl.href, {
			headers,
			signal: AbortSignal.timeout(15e3)
		});
		if (!res.ok) return { error: `Error al acceder al álbum: HTTP ${res.status}` };
		const html = await res.text();
		const rawTitle = data.title || extractAlbumTitle(html) || "Producto Yupoo";
		const title = await translateChineseToSpanish(rawTitle) || rawTitle;
		const albumCover = extractAlbumCover(html);
		const bestCover = data.coverUrl || albumCover;
		const imageUrls = prioritizeCoverImage(extractAlbumImages(html), bestCover).slice(0, data.maxImages);
		if (imageUrls.length === 0) return { error: "No se encontraron imágenes en el álbum." };
		{
			const { data: existing } = await supabaseAdmin.from("products").select("id, nombre").ilike("nombre", title.trim()).limit(1).maybeSingle();
			if (existing) return { error: `Duplicado: ya existe un producto con el nombre "${existing.nombre}". Omitido.` };
		}
		const bucketName = "storage-images";
		try {
			const { data: buckets } = await supabaseAdmin.storage.listBuckets();
			if (!buckets?.some((b) => b.name === bucketName)) await supabaseAdmin.storage.createBucket(bucketName, { public: true });
		} catch {}
		const uploadedUrls = [];
		for (const imgUrl of imageUrls) try {
			const imgRes = await fetch(imgUrl, {
				headers: {
					"User-Agent": YUPOO_UA,
					Referer: data.albumUrl
				},
				signal: AbortSignal.timeout(15e3)
			});
			if (!imgRes.ok) continue;
			const buffer = await imgRes.arrayBuffer();
			if (buffer.byteLength === 0) continue;
			const ct = (imgRes.headers.get("content-type") ?? "image/jpeg").split(";")[0]?.trim() || "image/jpeg";
			const ext = ct === "image/webp" ? "webp" : ct === "image/png" ? "png" : "jpg";
			const fileId = crypto.randomUUID();
			const filename = `yupoo/${fileId}.${ext}`;
			const thumbFilename = `yupoo/thumbnails/${fileId}.webp`;
			const { error: uploadErr } = await supabaseAdmin.storage.from(bucketName).upload(filename, buffer, {
				contentType: ct,
				cacheControl: "31536000",
				upsert: false
			});
			if (uploadErr) continue;
			try {
				const sharp = (await import("sharp")).default;
				const thumbBuf = await sharp(Buffer.from(buffer)).rotate().resize({
					width: 160,
					height: 160,
					fit: "inside",
					withoutEnlargement: true
				}).webp({
					quality: 80,
					effort: 4
				}).toBuffer();
				supabaseAdmin.storage.from(bucketName).upload(thumbFilename, thumbBuf, {
					contentType: "image/webp",
					cacheControl: "31536000",
					upsert: false
				}).catch(() => {});
			} catch {}
			const { data: pubData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(filename);
			if (pubData.publicUrl) uploadedUrls.push(pubData.publicUrl);
		} catch {}
		if (uploadedUrls.length === 0) return { error: "No se pudo subir ninguna imagen del álbum." };
		const imagen_url = uploadedUrls[0];
		const extra_images = uploadedUrls.slice(1);
		const targetCategory = data.category || "";
		const metadata = {
			whatsapp_only_reason: "china",
			extra_images: extra_images.length > 0 ? extra_images : void 0,
			yupoo_url: data.albumUrl,
			source: "yupoo",
			imported_from: "yupoo"
		};
		const newId = crypto.randomUUID();
		const { data: inserted, error: insertErr } = await supabaseAdmin.from("products").insert({
			id: newId,
			nombre: title,
			categoria: targetCategory,
			precio: null,
			precio_usd: null,
			descripcion: "",
			destacado: "NO",
			oferta: "NO",
			stock: "SI",
			imagen_url,
			metadata
		}).select("id").single();
		if (insertErr) throw insertErr;
		await invalidateStoreCache();
		return {
			productId: String(inserted.id),
			nombre: title,
			imageCount: uploadedUrls.length
		};
	} catch (err) {
		return { error: err instanceof Error ? err.message : "Error al importar el álbum." };
	}
});
//#endregion
export { bulkDeleteAdminProducts_createServerFn_handler, bulkUpdateAdminStock_createServerFn_handler, deleteAdminBanner_createServerFn_handler, deleteAdminProduct_createServerFn_handler, getAdminBanners_createServerFn_handler, getAdminProducts_createServerFn_handler, getCouponUsagesSummary_createServerFn_handler, importYupooAlbum_createServerFn_handler, parseYupooPage_createServerFn_handler, testAdminResendEmail_createServerFn_handler, updateProductPrice_createServerFn_handler, updateVariantStock_createServerFn_handler, uploadAdminProductImage_createServerFn_handler, upsertAdminBanner_createServerFn_handler, upsertAdminProduct_createServerFn_handler, upsertCategoryRules_createServerFn_handler, validatePromoCoupon_createServerFn_handler };
