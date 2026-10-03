import { A as normCat, F as parseJerseyItem, G as unitPriceFor, I as priceOf, P as parseCategoryRules, S as isLongSleeve, c as calcJerseyUnitPrice, d as checkCategoryMins, m as findRuleForCat, p as findProduct, u as categoryDiscountForUnits, x as isCamiseta } from "./store-DppLUI8p.mjs";
import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { t as createServerRpc } from "./createServerRpc-prIP6Hrh.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/checkout.functions-BEv_nVL5.js
/**
* Orígenes permitidos para back_urls de MercadoPago (CWE-601 — Open Redirect).
* data.origin viene del cliente y NO se puede confiar en él sin validación.
*/
var ALLOWED_ORIGINS = /* @__PURE__ */ new Set(["https://www.teimportamosarg.com", "https://teimportamosarg.com"]);
var FALLBACK_ORIGIN = "https://www.teimportamosarg.com";
function safeOrigin(raw) {
	try {
		const parsed = new URL(raw);
		const normalized = `${parsed.protocol}//${parsed.host}`;
		return ALLOWED_ORIGINS.has(normalized) ? normalized : FALLBACK_ORIGIN;
	} catch {
		return FALLBACK_ORIGIN;
	}
}
async function revalidateOrderItems(supabaseAdmin, rawItems) {
	try {
		const [{ data: dbProducts }, { data: dbConfigRows }] = await Promise.all([supabaseAdmin.from("products").select("id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,oferta,stock,descuento"), supabaseAdmin.from("site_config").select("clave,valor")]);
		if (!dbProducts || dbProducts.length === 0) return {
			validatedItems: [],
			total: 0,
			error: "No se pudieron obtener los productos de la base de datos."
		};
		const configObj = {};
		if (Array.isArray(dbConfigRows)) {
			for (const row of dbConfigRows) if (row.clave && row.valor !== void 0) configObj[row.clave] = String(row.valor);
		}
		const catRules = parseCategoryRules(configObj);
		const catTotals = {};
		const itemsWithCat = [];
		for (const item of rawItems) {
			const prod = findProduct(dbProducts, item.nombre);
			const cat = prod?.categoria ?? "";
			const catNorm = normCat(cat);
			if (catNorm) {
				const key = findRuleForCat(catNorm, catRules)?.key ?? catNorm;
				catTotals[key] = (catTotals[key] ?? 0) + item.qty;
			}
			const baseP = prod ? priceOf(prod) : item.unitPrice;
			itemsWithCat.push({
				categoria: cat,
				qty: item.qty,
				unitPrice: baseP
			});
		}
		const violations = checkCategoryMins(itemsWithCat, catRules);
		if (violations.length > 0) {
			const v = violations[0];
			return {
				validatedItems: [],
				total: 0,
				error: v.type === "amount" ? `No se cumple el mínimo de compra para ${v.category} ($${v.min.toLocaleString("es-AR")}).` : `No se cumple el mínimo de compra para ${v.category} (${v.min} unidades).`
			};
		}
		const { isSuplemento, SUPLEMENTOS_MIN } = await import("./store-DppLUI8p.mjs").then((n) => n.z).then((n) => n.B);
		const minSuplementos = catRules[normCat("Suplementos")]?.minAmount || SUPLEMENTOS_MIN;
		const supTotal = rawItems.filter((i) => {
			const prod = findProduct(dbProducts, i.nombre);
			return isSuplemento(prod?.categoria, i.nombre);
		}).reduce((a, i) => a + i.qty * i.unitPrice, 0);
		if (supTotal > 0 && supTotal < minSuplementos) return {
			validatedItems: [],
			total: 0,
			error: `No se cumple el mínimo de compra para Suplementos ($${minSuplementos.toLocaleString("es-AR")}).`
		};
		const totalJerseyUnits = rawItems.filter((i) => {
			const prod = findProduct(dbProducts, i.nombre);
			return isCamiseta(prod?.categoria, prod?.nombre) || isCamiseta(void 0, i.nombre);
		}).reduce((sum, i) => sum + i.qty, 0);
		const usdRate = Number(configObj["dolar_cotizacion"] ?? 0);
		const validatedItems = rawItems.map((item) => {
			const prod = findProduct(dbProducts, item.nombre);
			if (prod && isCamiseta(prod.categoria, prod.nombre) || isCamiseta(void 0, item.nombre)) {
				const { version, isExtraSize, badge } = parseJerseyItem(item);
				const effectiveQty = Math.max(item.qty, totalJerseyUnits);
				const { unitArs } = calcJerseyUnitPrice({
					qty: effectiveQty,
					version,
					isExtraSize,
					badge,
					usdRate,
					isLongSleeve: isLongSleeve(item.nombre) || (prod ? isLongSleeve(prod.nombre) : false)
				});
				return {
					nombre: item.nombre,
					qty: item.qty,
					unitPrice: unitArs > 0 ? unitArs : item.unitPrice,
					...item.productId ? { productId: item.productId } : {}
				};
			}
			if (!prod) return item;
			const catNorm = normCat(prod.categoria ?? "");
			const match = catNorm ? findRuleForCat(catNorm, catRules) : void 0;
			const catRule = match?.rule;
			const ruleKey = match?.key;
			let unitPrice;
			if (catRule?.discountTiers?.length && ruleKey) {
				const totalCatUnits = catTotals[ruleKey] ?? 0;
				const percent = categoryDiscountForUnits(catRule.discountTiers, totalCatUnits);
				const base = priceOf(prod);
				unitPrice = Math.round(base * (1 - percent / 100));
			} else unitPrice = Math.round(unitPriceFor(prod, item.qty));
			return {
				nombre: item.nombre,
				qty: item.qty,
				unitPrice: unitPrice > 0 ? unitPrice : item.unitPrice,
				...item.productId ? { productId: item.productId } : {}
			};
		});
		return {
			validatedItems,
			total: validatedItems.reduce((a, i) => a + i.qty * i.unitPrice, 0)
		};
	} catch (err) {
		console.error("Error al revalidar items en el servidor:", err);
		return {
			validatedItems: rawItems,
			total: rawItems.reduce((a, i) => a + i.qty * i.unitPrice, 0)
		};
	}
}
/**
* Crea la preferencia de pago en Mercado Pago Y guarda la orden en Supabase
* con estado "pendiente". Cuando MP confirma el pago,
* verifyOrderPayment la actualiza a "pagado".
*/
var createCheckout_createServerFn_handler = createServerRpc({
	id: "554a960b24acfd968c885ec765fbc00947cea309407272cee465bd60f52590de",
	name: "createCheckout",
	filename: "src/lib/checkout.functions.ts"
}, (opts) => createCheckout.__executeServer(opts));
var createCheckout = createServerFn({ method: "POST" }).validator((data) => {
	if (!data || !Array.isArray(data.items) || data.items.length === 0) throw new Error("Carrito vacío");
	const s = data.shipping ?? {};
	return {
		origin: String(data.origin ?? "").slice(0, 200),
		userId: data.userId ? String(data.userId).slice(0, 60) : void 0,
		couponCode: data.couponCode ? String(data.couponCode).slice(0, 40).toUpperCase().trim() : void 0,
		shipping: {
			nombre: String(s.nombre ?? "").slice(0, 120),
			dni: String(s.dni ?? "").slice(0, 20),
			telefono: String(s.telefono ?? "").slice(0, 30),
			email: String(s.email ?? "").slice(0, 160),
			provincia: String(s.provincia ?? "").slice(0, 60),
			ciudad: String(s.ciudad ?? "").slice(0, 80),
			codigo_postal: String(s.codigo_postal ?? "").slice(0, 12),
			transporte: String(s.transporte ?? "Correo Argentino").slice(0, 40),
			sucursal_correo: String(s.sucursal_correo ?? "").slice(0, 160)
		},
		items: data.items.slice(0, 50).map((i) => ({
			nombre: String(i.nombre ?? "Producto").slice(0, 120),
			qty: Math.max(1, Math.min(9999, Math.round(Number(i.qty) || 1))),
			unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0))
		}))
	};
}).handler(createCheckout_createServerFn_handler, async ({ data }) => {
	const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
	if (!mpToken) return { error: "Falta configurar MercadoPago. Escribinos por WhatsApp para completar tu compra." };
	if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
		console.error("Supabase no está configurado para crear la orden pendiente.");
		return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
	}
	let items = [];
	let total = 0;
	let couponDiscountAmount = 0;
	let validCouponApplied = null;
	try {
		const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
		if (data.userId && (!data.shipping.email || !data.shipping.email.includes("@"))) try {
			const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.userId);
			if (userData?.user?.email) data.shipping.email = userData.user.email.trim();
		} catch (err) {
			console.error("Error al obtener email del usuario en checkout:", err);
		}
		const validation = await revalidateOrderItems(supabaseAdmin, data.items);
		if (validation.error) return { error: validation.error };
		items = validation.validatedItems;
		total = validation.total;
		if (data.couponCode && data.userId) {
			const { data: dbConfigRows } = await supabaseAdmin.from("site_config").select("clave,valor");
			const configObj = {};
			for (const row of dbConfigRows ?? []) if (row.clave && row.valor !== void 0) configObj[row.clave] = String(row.valor);
			const isCouponActive = (configObj["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI";
			const promoCode = (configObj["promo_cupon_codigo"] ?? "TEIMPORTAMOS").toUpperCase().trim();
			if (isCouponActive && data.couponCode === promoCode) {
				const usedKeyUser = `coupon_usage_${promoCode}_${data.userId}`;
				const usedKeyEmail = data.shipping.email ? `coupon_usage_${promoCode}_${data.shipping.email.trim().toLowerCase()}` : "";
				if (!Boolean(configObj[usedKeyUser] || usedKeyEmail && configObj[usedKeyEmail])) {
					const filterParts = [`user_id.eq.${data.userId}`];
					if (data.shipping.email) filterParts.push(`user_email.ilike.${data.shipping.email.trim().toLowerCase()}`);
					try {
						const { data: usages } = await supabaseAdmin.from("coupon_usages").select("id").eq("coupon_code", promoCode).or(filterParts.join(",")).limit(1);
						if (!usages || usages.length === 0) {
							const couponPct = Number(configObj["promo_cupon_descuento_pct"]) || 5;
							validCouponApplied = promoCode;
							items = items.map((i) => ({
								...i,
								unitPrice: Math.max(1, Math.round(i.unitPrice * (1 - couponPct / 100)))
							}));
							const discountedTotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
							couponDiscountAmount = Math.max(0, total - discountedTotal);
							total = discountedTotal;
						}
					} catch {
						const couponPct = Number(configObj["promo_cupon_descuento_pct"]) || 5;
						validCouponApplied = promoCode;
						items = items.map((i) => ({
							...i,
							unitPrice: Math.max(1, Math.round(i.unitPrice * (1 - couponPct / 100)))
						}));
						const discountedTotal = items.reduce((a, i) => a + i.qty * i.unitPrice, 0);
						couponDiscountAmount = Math.max(0, total - discountedTotal);
						total = discountedTotal;
					}
				}
			}
		}
	} catch (err) {
		console.error("Error al revalidar la orden:", err);
		return { error: "No pudimos validar los precios de tu carrito. Por favor recargá la página e intentalo nuevamente." };
	}
	if (items.length === 0 || total <= 0) return { error: "No se pudieron calcular los totales de tu orden. Por favor recargá la página." };
	const d = /* @__PURE__ */ new Date();
	const orderCode = `TI-${`${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
	try {
		const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
		const { error } = await supabaseAdmin.from("orders").insert({
			order_code: orderCode,
			user_id: data.userId ?? null,
			...data.shipping,
			items,
			total,
			estado: "pendiente",
			metodo_pago: "mercadopago"
		});
		if (error) {
			console.error("Error al guardar orden pendiente:", error);
			return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
		}
		if (validCouponApplied) {
			try {
				await supabaseAdmin.from("coupon_usages").insert({
					user_id: data.userId ?? null,
					user_email: (data.shipping.email ?? "").trim().toLowerCase(),
					coupon_code: validCouponApplied,
					order_code: orderCode,
					discount_amount: couponDiscountAmount
				});
			} catch (couponErr) {
				console.error("Error registrando uso de cupón en MP:", couponErr);
			}
			try {
				const payload = JSON.stringify({
					orderCode,
					email: (data.shipping.email ?? "").trim().toLowerCase(),
					discount: couponDiscountAmount,
					at: (/* @__PURE__ */ new Date()).toISOString()
				});
				if (data.userId) await supabaseAdmin.from("site_config").upsert({
					clave: `coupon_usage_${validCouponApplied}_${data.userId}`,
					valor: payload
				}, { onConflict: "clave" });
				if (data.shipping.email) await supabaseAdmin.from("site_config").upsert({
					clave: `coupon_usage_${validCouponApplied}_${data.shipping.email.trim().toLowerCase()}`,
					valor: payload
				}, { onConflict: "clave" });
			} catch (scErr) {
				console.error("Error registrando uso de cupón en site_config (MP):", scErr);
			}
		}
	} catch (err) {
		console.error("Error al guardar orden pendiente:", err);
		return { error: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos." };
	}
	const origin = safeOrigin(data.origin);
	const successUrl = `${origin}/gracias?code=${encodeURIComponent(orderCode)}`;
	const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
		method: "POST",
		headers: {
			authorization: `Bearer ${mpToken}`,
			"content-type": "application/json"
		},
		body: JSON.stringify({
			items: items.map((i) => ({
				title: i.nombre,
				quantity: i.qty,
				unit_price: i.unitPrice,
				currency_id: "ARS"
			})),
			external_reference: orderCode,
			back_urls: {
				success: successUrl,
				pending: successUrl,
				failure: `${origin}/carrito`
			},
			auto_return: "approved",
			payer: {
				name: data.shipping.nombre,
				email: data.shipping.email
			}
		})
	});
	const body = await res.text();
	if (!res.ok) {
		console.error(`MercadoPago error [${res.status}]: ${body}`);
		return { error: "No pudimos iniciar el pago. Probá de nuevo o escribinos por WhatsApp." };
	}
	const json = JSON.parse(body);
	const url = json.init_point ?? json.sandbox_init_point;
	return url ? { url } : { error: "No pudimos obtener el enlace de pago. Probá de nuevo." };
});
//#endregion
export { createCheckout_createServerFn_handler };
