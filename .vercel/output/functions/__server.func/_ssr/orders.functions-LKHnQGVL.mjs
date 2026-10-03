import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { t as createServerRpc } from "./createServerRpc-prIP6Hrh.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders.functions-LKHnQGVL.js
var text = (v, max = 120) => String(v ?? "").trim().slice(0, max);
function makeCode() {
	const d = /* @__PURE__ */ new Date();
	return `TI-${`${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}
function cleanShipping(s) {
	return {
		nombre: text(s?.nombre),
		dni: text(s?.dni, 20),
		telefono: text(s?.telefono, 30),
		email: text(s?.email, 160),
		provincia: text(s?.provincia, 60),
		ciudad: text(s?.ciudad, 80),
		codigo_postal: text(s?.codigo_postal, 12),
		transporte: text(s?.transporte, 40) || "Correo Argentino",
		sucursal_correo: text(s?.sucursal_correo, 160)
	};
}
function cleanItems(items) {
	if (!Array.isArray(items) || items.length === 0) return [];
	return items.slice(0, 50).map((i) => ({
		nombre: text(i.nombre),
		qty: Math.max(1, Math.min(9999, Math.round(Number(i.qty) || 1))),
		unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0)),
		...i.productId ? { productId: text(i.productId, 100) } : {}
	}));
}
/**
* Se ejecuta cuando el usuario vuelve de Mercado Pago.
* Busca la orden pendiente por código, consulta el estado real en la API de MP,
* y si está aprobado actualiza el estado a "pagado".
* Nunca necesita reconstruir datos de envío o items desde MP.
*/
var verifyOrderPayment_createServerFn_handler = createServerRpc({
	id: "6081a76b4f4d681bf232c7434bb4cd5a9fd4673b57e2c33c3a4a7d86ea883938",
	name: "verifyOrderPayment",
	filename: "src/lib/orders.functions.ts"
}, (opts) => verifyOrderPayment.__executeServer(opts));
var verifyOrderPayment = createServerFn({ method: "POST" }).validator((data) => ({
	code: data.code ? text(data.code, 60) : void 0,
	status: text(data.status || data.collectionStatus, 40),
	paymentId: data.paymentId ? text(data.paymentId, 60) : void 0
})).handler(verifyOrderPayment_createServerFn_handler, async ({ data }) => {
	if (!data.code) return { estado: "desconocido" };
	if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
		console.error("Variables de Supabase no configuradas en el servidor.");
		return { estado: "desconocido" };
	}
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	const { data: order } = await supabaseAdmin.from("orders").select("id, order_code, estado, total, metodo_pago, nombre, email, telefono, dni, provincia, ciudad, codigo_postal, transporte, sucursal_correo, items").eq("order_code", data.code).maybeSingle();
	if (order?.estado === "pagado") return {
		orderCode: order.order_code,
		estado: "pagado",
		total: Number(order.total),
		metodoPago: order.metodo_pago ?? void 0
	};
	const mpToken = process.env["MERCADOPAGO_ACCESS_TOKEN"];
	if (!mpToken) {
		console.error("MERCADOPAGO_ACCESS_TOKEN no configurado.");
		return { estado: "desconocido" };
	}
	let mpStatus;
	if (data.paymentId) try {
		const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.paymentId}`, { headers: { authorization: `Bearer ${mpToken}` } });
		if (mpRes.ok) mpStatus = (await mpRes.json()).status;
		else console.error(`MP payment lookup failed [${mpRes.status}]: ${await mpRes.text()}`);
	} catch (err) {
		console.error("Error consultando MP:", err);
	}
	if (!mpStatus) mpStatus = data.status?.toLowerCase();
	if (mpStatus === "pending" || mpStatus === "in_process" || mpStatus === "authorized") return {
		...order?.order_code ? { orderCode: order.order_code } : {},
		estado: "pendiente",
		...order?.total ? { total: Number(order.total) } : {},
		metodoPago: order?.metodo_pago ?? void 0
	};
	if (mpStatus !== "approved") return {
		estado: "rechazado",
		metodoPago: order?.metodo_pago ?? void 0
	};
	if (order) {
		const finalMetodo = order.metodo_pago === "tarjeta" ? "tarjeta" : "mercadopago";
		const { error: updErr } = await supabaseAdmin.from("orders").update({
			estado: "pagado",
			metodo_pago: finalMetodo
		}).eq("id", order.id);
		if (updErr) console.error("Error al actualizar orden a pagado:", updErr);
		const { data: fullOrder } = await supabaseAdmin.from("orders").select("user_id, nombre, dni, telefono, provincia, ciudad, codigo_postal, transporte, sucursal_correo").eq("id", order.id).maybeSingle();
		if (fullOrder?.user_id) await supabaseAdmin.from("profiles").upsert({
			id: fullOrder.user_id,
			nombre: fullOrder.nombre,
			dni: fullOrder.dni,
			telefono: fullOrder.telefono,
			provincia: fullOrder.provincia,
			ciudad: fullOrder.ciudad,
			codigo_postal: fullOrder.codigo_postal,
			transporte: fullOrder.transporte,
			sucursal_correo: fullOrder.sucursal_correo
		}, { onConflict: "id" });
		try {
			let mpCouponCode;
			let mpCouponDiscount;
			try {
				const { data: usage } = await supabaseAdmin.from("coupon_usages").select("coupon_code, discount_amount").eq("order_code", order.order_code).maybeSingle();
				if (usage) {
					mpCouponCode = usage.coupon_code;
					mpCouponDiscount = Number(usage.discount_amount) || void 0;
				}
			} catch {}
			const { notifyNewOrder } = await import("./email.functions-DAoj8YjB.mjs");
			const mpItems = Array.isArray(order.items) ? order.items.map((i) => ({
				nombre: i.nombre ?? "",
				qty: Number(i.qty) || 1,
				unitPrice: Number(i.unitPrice) || 0
			})) : [];
			await notifyNewOrder({
				orderCode: order.order_code,
				total: Number(order.total),
				metodoPago: finalMetodo === "tarjeta" ? "tarjeta" : "mercadopago",
				shipping: {
					nombre: order.nombre ?? "",
					email: order.email ?? "",
					telefono: order.telefono ?? "",
					dni: order.dni ?? void 0,
					provincia: order.provincia ?? void 0,
					ciudad: order.ciudad ?? void 0,
					codigo_postal: order.codigo_postal ?? void 0,
					transporte: order.transporte ?? void 0,
					sucursal_correo: order.sucursal_correo ?? void 0
				},
				items: mpItems,
				couponCode: mpCouponCode,
				couponDiscountAmount: mpCouponDiscount
			});
		} catch (e) {
			console.error("[email] Error enviando notificación de MP:", e);
		}
		return {
			orderCode: order.order_code,
			estado: "pagado",
			total: Number(order.total),
			metodoPago: finalMetodo
		};
	}
	console.warn(`Borrador no encontrado para code=${data.code}, registrando pago mínimo.`);
	return {
		orderCode: data.code,
		estado: "pagado"
	};
});
var getAdminPaidOrders_createServerFn_handler = createServerRpc({
	id: "7a19204dc5ea7c8d03cfe69cbff80503551f4432040d965cff121021fe3364a4",
	name: "getAdminPaidOrders",
	filename: "src/lib/orders.functions.ts"
}, (opts) => getAdminPaidOrders.__executeServer(opts));
var getAdminPaidOrders = createServerFn({ method: "POST" }).validator((data) => ({
	email: text(data?.email, 160).toLowerCase(),
	token: text(data?.token, 2e3)
})).handler(getAdminPaidOrders_createServerFn_handler, async ({ data }) => {
	if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) return {
		orders: [],
		error: "Variables de Supabase no configuradas en el servidor."
	};
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	const adminEmails = (process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
	let requestingEmail = data.email ? data.email.toLowerCase().trim() : "";
	if (data.token) {
		const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
		if (userData?.user?.email) requestingEmail = userData.user.email.toLowerCase().trim();
	}
	if (!requestingEmail) return {
		orders: [],
		error: "Acceso denegado: Debés iniciar sesión como administrador."
	};
	if (adminEmails.length > 0) {
		if (!adminEmails.includes(requestingEmail)) return {
			orders: [],
			error: "Acceso denegado: El email no tiene permisos de administrador."
		};
	} else if (!["admin@config.com", "admin@teimportamos.com"].includes(requestingEmail)) return {
		orders: [],
		error: "Acceso denegado: Configurá ADMIN_EMAILS en el archivo .env."
	};
	const { data: rows, error } = await supabaseAdmin.from("orders").select("*").eq("estado", "pagado").order("created_at", { ascending: false });
	if (error) {
		console.error("Error al consultar órdenes:", error);
		return {
			orders: [],
			error: "No se pudieron obtener las órdenes de la base de datos."
		};
	}
	if (rows) {
		const b = JSON.stringify(rows).length;
		console.info(`[OrdersQuery] Paid orders size: ${(b / 1024).toFixed(2)} KB (${b} B, ${rows.length} rows)`);
	}
	return { orders: (rows ?? []).map((row) => ({
		id: String(row.id),
		order_code: String(row.order_code ?? ""),
		created_at: String(row.created_at ?? ""),
		estado: String(row.estado ?? "pagado"),
		metodo_pago: row.metodo_pago ? String(row.metodo_pago) : null,
		total: Number(row.total) || 0,
		nombre: String(row.nombre ?? ""),
		dni: String(row.dni ?? ""),
		telefono: String(row.telefono ?? ""),
		email: String(row.email ?? ""),
		provincia: String(row.provincia ?? ""),
		ciudad: String(row.ciudad ?? ""),
		codigo_postal: String(row.codigo_postal ?? ""),
		transporte: String(row.transporte ?? "Correo Argentino"),
		sucursal_correo: String(row.sucursal_correo ?? ""),
		items: Array.isArray(row.items) ? row.items : []
	})) };
});
var getAdminReservedOrders_createServerFn_handler = createServerRpc({
	id: "1db69a946c0eb96bb3dfa4c44343b2038088b2a3f3cdc457f9b07897c4e351b4",
	name: "getAdminReservedOrders",
	filename: "src/lib/orders.functions.ts"
}, (opts) => getAdminReservedOrders.__executeServer(opts));
var getAdminReservedOrders = createServerFn({ method: "POST" }).validator((data) => ({
	email: text(data?.email, 160).toLowerCase(),
	token: text(data?.token, 2e3)
})).handler(getAdminReservedOrders_createServerFn_handler, async ({ data }) => {
	if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) return {
		orders: [],
		error: "Variables de Supabase no configuradas en el servidor."
	};
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	const adminEmails = (process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
	let requestingEmail = data.email ? data.email.toLowerCase().trim() : "";
	if (data.token) {
		const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
		if (userData?.user?.email) requestingEmail = userData.user.email.toLowerCase().trim();
	}
	if (!requestingEmail) return {
		orders: [],
		error: "Acceso denegado: Debés iniciar sesión como administrador."
	};
	if (adminEmails.length > 0) {
		if (!adminEmails.includes(requestingEmail)) return {
			orders: [],
			error: "Acceso denegado: El email no tiene permisos de administrador."
		};
	} else if (!["admin@config.com", "admin@teimportamos.com"].includes(requestingEmail)) return {
		orders: [],
		error: "Acceso denegado: Configurá ADMIN_EMAILS en el archivo .env."
	};
	const { data: rows, error } = await supabaseAdmin.from("orders").select("*").eq("estado", "pendiente").order("created_at", { ascending: false });
	if (error) {
		console.error("Error al consultar órdenes reservadas:", error);
		return {
			orders: [],
			error: "No se pudieron obtener las órdenes reservadas."
		};
	}
	if (rows) {
		const b = JSON.stringify(rows).length;
		console.info(`[OrdersQuery] Reserved orders size: ${(b / 1024).toFixed(2)} KB (${b} B, ${rows.length} rows)`);
	}
	return { orders: (rows ?? []).map((row) => ({
		id: String(row.id),
		order_code: String(row.order_code ?? ""),
		created_at: String(row.created_at ?? ""),
		estado: String(row.estado ?? "pendiente"),
		metodo_pago: row.metodo_pago ? String(row.metodo_pago) : null,
		total: Number(row.total) || 0,
		nombre: String(row.nombre ?? ""),
		dni: String(row.dni ?? ""),
		telefono: String(row.telefono ?? ""),
		email: String(row.email ?? ""),
		provincia: String(row.provincia ?? ""),
		ciudad: String(row.ciudad ?? ""),
		codigo_postal: String(row.codigo_postal ?? ""),
		transporte: String(row.transporte ?? "Correo Argentino"),
		sucursal_correo: String(row.sucursal_correo ?? ""),
		items: Array.isArray(row.items) ? row.items : []
	})) };
});
var updateOrderStatus_createServerFn_handler = createServerRpc({
	id: "ce3247af923fb83e1b50e04a2d3399abe6b8ac7e9c8330b2019de9668492b17f",
	name: "updateOrderStatus",
	filename: "src/lib/orders.functions.ts"
}, (opts) => updateOrderStatus.__executeServer(opts));
var updateOrderStatus = createServerFn({ method: "POST" }).validator((data) => ({
	orderCode: text(data.orderCode, 40),
	estado: text(data.estado, 40),
	token: data.token ? text(data.token, 4e3) : void 0,
	email: data.email ? text(data.email, 254) : void 0
})).handler(updateOrderStatus_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
	let requestingEmail = data.email?.toLowerCase().trim();
	if (data.token) {
		const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
		if (userData?.user?.email) requestingEmail = userData.user.email.toLowerCase().trim();
	}
	if (!requestingEmail) return {
		status: "error",
		message: "Acceso denegado: Debés iniciar sesión."
	};
	if (adminEmails.length > 0) {
		if (!adminEmails.includes(requestingEmail)) return {
			status: "error",
			message: "Acceso denegado: Sin permisos de admin."
		};
	}
	const { error } = await supabaseAdmin.from("orders").update({ estado: data.estado }).eq("order_code", data.orderCode);
	if (error) {
		console.error("Error al actualizar estado de orden:", error);
		return {
			status: "error",
			message: "No se pudo actualizar el estado de la orden."
		};
	}
	return { status: "success" };
});
var deleteAdminOrder_createServerFn_handler = createServerRpc({
	id: "743df13d7e04edbc6f053b2f4564fbe817fadafd647b83c6231d5854f970d82e",
	name: "deleteAdminOrder",
	filename: "src/lib/orders.functions.ts"
}, (opts) => deleteAdminOrder.__executeServer(opts));
var deleteAdminOrder = createServerFn({ method: "POST" }).validator((data) => ({
	orderId: data.orderId ? text(data.orderId, 60) : void 0,
	orderCode: text(data.orderCode, 60),
	token: data.token ? text(data.token, 4e3) : void 0,
	email: data.email ? text(data.email, 254) : void 0
})).handler(deleteAdminOrder_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	const adminEmails = (process.env["ADMIN_EMAILS"] || process.env["VITE_ADMIN_EMAILS"] || "").toLowerCase().split(",").map((e) => e.trim()).filter(Boolean);
	let requestingEmail = data.email?.toLowerCase().trim() || "";
	if (data.token) {
		const { data: userData } = await supabaseAdmin.auth.getUser(data.token);
		if (userData?.user?.email) requestingEmail = userData.user.email.toLowerCase().trim();
	}
	if (!requestingEmail) return {
		status: "error",
		message: "Acceso denegado: Debés iniciar sesión como administrador."
	};
	if (adminEmails.length > 0) {
		if (!adminEmails.includes(requestingEmail)) return {
			status: "error",
			message: "Acceso denegado: Sin permisos de administrador."
		};
	} else if (!["admin@config.com", "admin@teimportamos.com"].includes(requestingEmail)) return {
		status: "error",
		message: "Acceso denegado: Configurá ADMIN_EMAILS en el archivo .env."
	};
	const query = supabaseAdmin.from("orders").delete();
	const { error } = data.orderId ? await query.eq("id", data.orderId) : await query.eq("order_code", data.orderCode);
	if (error) {
		console.error("Error al eliminar orden de la DB:", error);
		return {
			status: "error",
			message: "No se pudo eliminar la orden de la base de datos."
		};
	}
	return { status: "success" };
});
var createTransferOrder_createServerFn_handler = createServerRpc({
	id: "7f43dc7f4d6958b39ba9c949bdd13b4fc232edd74db3ff3fa401fd99dbb36566",
	name: "createTransferOrder",
	filename: "src/lib/orders.functions.ts"
}, (opts) => createTransferOrder.__executeServer(opts));
var createTransferOrder = createServerFn({ method: "POST" }).validator((data) => ({
	shipping: cleanShipping(data.shipping),
	items: cleanItems(data.items),
	userId: data.userId ? text(data.userId, 64) : void 0,
	couponCode: data.couponCode ? text(data.couponCode, 40).toUpperCase().trim() : void 0
})).handler(createTransferOrder_createServerFn_handler, async ({ data }) => {
	const { supabaseAdmin } = await import("./client.server-KzwUIAkW.mjs");
	if (data.userId && (!data.shipping.email || !data.shipping.email.includes("@"))) try {
		const { data: userData } = await supabaseAdmin.auth.admin.getUserById(data.userId);
		if (userData?.user?.email) data.shipping.email = userData.user.email.trim();
	} catch (err) {
		console.error("Error al obtener email del usuario en transferencia:", err);
	}
	let total = 0;
	let items = [];
	let couponDiscountAmount = 0;
	let validCouponApplied = null;
	try {
		const [{ data: dbProducts }, { data: dbConfig }] = await Promise.all([supabaseAdmin.from("products").select("id,nombre,categoria,precio,precio_usd,precio_base,moneda_base,precio_oferta,precio_oferta_usd,precio_oferta_base,moneda_oferta_base,oferta,stock,descuento"), supabaseAdmin.from("site_config").select("clave,valor")]);
		if (!dbProducts || dbProducts.length === 0) return {
			status: "error",
			message: "No se pudieron obtener los productos de la base de datos."
		};
		const configMap = {};
		for (const row of dbConfig ?? []) if (row.clave && row.valor) configMap[row.clave] = row.valor;
		const { normCat, parseCategoryRules, findRuleForCat, findProduct, priceOf, unitPriceFor, categoryDiscountForUnits, checkCategoryMins, transferPrice, transferDiscountPct } = await import("./store-DppLUI8p.mjs").then((n) => n.z).then((n) => n.B);
		const catRules = parseCategoryRules(configMap);
		const catTotals = {};
		for (const item of data.items) {
			const prod = findProduct(dbProducts, item.nombre);
			if (prod) {
				const catNorm = normCat(prod.categoria ?? "");
				const match = catNorm ? findRuleForCat(catNorm, catRules) : void 0;
				if (match) catTotals[match.key] = (catTotals[match.key] ?? 0) + item.qty;
			}
		}
		const minViolations = checkCategoryMins(data.items, dbProducts, catRules);
		if (minViolations.length > 0) {
			const v = minViolations[0];
			return {
				status: "error",
				message: v.type === "amount" ? `No se cumple el mínimo de compra para ${v.category} ($${v.min.toLocaleString("es-AR")}).` : `No se cumple el mínimo de compra para ${v.category} (${v.min} unidades).`
			};
		}
		items = data.items.map((item) => {
			const prod = findProduct(dbProducts, item.nombre);
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
				unitPrice: unitPrice > 0 ? unitPrice : item.unitPrice
			};
		});
		total = transferPrice(items.reduce((a, i) => a + i.qty * i.unitPrice, 0), transferDiscountPct(configMap));
		if (data.couponCode && data.userId) {
			const isCouponActive = (configMap["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI";
			const promoCode = (configMap["promo_cupon_codigo"] ?? "TEIMPORTAMOS").toUpperCase().trim();
			if (isCouponActive && data.couponCode === promoCode) {
				const usedKeyUser = `coupon_usage_${promoCode}_${data.userId}`;
				const usedKeyEmail = data.shipping.email ? `coupon_usage_${promoCode}_${data.shipping.email.trim().toLowerCase()}` : "";
				if (!Boolean(configMap[usedKeyUser] || usedKeyEmail && configMap[usedKeyEmail])) {
					const filterParts = [`user_id.eq.${data.userId}`];
					if (data.shipping.email) filterParts.push(`user_email.ilike.${data.shipping.email.trim().toLowerCase()}`);
					try {
						const { data: usages } = await supabaseAdmin.from("coupon_usages").select("id").eq("coupon_code", promoCode).or(filterParts.join(",")).limit(1);
						if (!usages || usages.length === 0) {
							const couponPct = Number(configMap["promo_cupon_descuento_pct"]) || 5;
							couponDiscountAmount = Math.round(total * (couponPct / 100));
							total = Math.max(1, total - couponDiscountAmount);
							validCouponApplied = promoCode;
						}
					} catch {
						const couponPct = Number(configMap["promo_cupon_descuento_pct"]) || 5;
						couponDiscountAmount = Math.round(total * (couponPct / 100));
						total = Math.max(1, total - couponDiscountAmount);
						validCouponApplied = promoCode;
					}
				}
			}
		}
	} catch (err) {
		console.error("Error revalidando items en transferencia:", err);
		return {
			status: "error",
			message: "No pudimos validar los precios de tu pedido. Por favor recargá la página e intentalo nuevamente."
		};
	}
	if (items.length === 0 || total <= 0) return {
		status: "error",
		message: "No se pudieron calcular los totales del pedido. Por favor recargá la página."
	};
	const orderCode = makeCode();
	try {
		const { error } = await supabaseAdmin.from("orders").insert({
			order_code: orderCode,
			user_id: data.userId ?? null,
			...data.shipping,
			items,
			total,
			estado: "pendiente",
			metodo_pago: "transferencia"
		});
		if (error) {
			console.error("Error al registrar la orden por transferencia:", error);
			return {
				status: "error",
				message: "No pudimos registrar tu pedido. Probá de nuevo en unos minutos."
			};
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
				console.error("Error registrando uso de cupón en coupon_usages:", couponErr);
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
				console.error("Error registrando uso de cupón en site_config:", scErr);
			}
		}
		if (data.userId) await supabaseAdmin.from("profiles").upsert({
			id: data.userId,
			nombre: data.shipping.nombre,
			dni: data.shipping.dni,
			telefono: data.shipping.telefono,
			provincia: data.shipping.provincia,
			ciudad: data.shipping.ciudad,
			codigo_postal: data.shipping.codigo_postal,
			transporte: data.shipping.transporte,
			sucursal_correo: data.shipping.sucursal_correo
		}, { onConflict: "id" });
		try {
			const { notifyNewOrder } = await import("./email.functions-DAoj8YjB.mjs");
			await notifyNewOrder({
				orderCode,
				total,
				metodoPago: "transferencia",
				shipping: data.shipping,
				items,
				couponCode: validCouponApplied || void 0,
				couponDiscountAmount: couponDiscountAmount || void 0
			});
		} catch (e) {
			console.error("[email] Error enviando notificación de transferencia:", e);
		}
		return {
			status: "success",
			orderCode,
			total
		};
	} catch (err) {
		console.error("Error al registrar orden por transferencia:", err);
		return {
			status: "error",
			message: "No pudimos registrar tu pedido. Probá de nuevo."
		};
	}
});
//#endregion
export { createTransferOrder_createServerFn_handler, deleteAdminOrder_createServerFn_handler, getAdminPaidOrders_createServerFn_handler, getAdminReservedOrders_createServerFn_handler, updateOrderStatus_createServerFn_handler, verifyOrderPayment_createServerFn_handler };
