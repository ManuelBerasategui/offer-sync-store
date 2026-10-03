import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { t as createSsrRpc } from "./store.functions-DYWk1U4D.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/orders.functions-EAdNjrjC.js
var text = (v, max = 120) => String(v ?? "").trim().slice(0, max);
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
var verifyOrderPayment = createServerFn({ method: "POST" }).validator((data) => ({
	code: data.code ? text(data.code, 60) : void 0,
	status: text(data.status || data.collectionStatus, 40),
	paymentId: data.paymentId ? text(data.paymentId, 60) : void 0
})).handler(createSsrRpc("6081a76b4f4d681bf232c7434bb4cd5a9fd4673b57e2c33c3a4a7d86ea883938"));
var getAdminPaidOrders = createServerFn({ method: "POST" }).validator((data) => ({
	email: text(data?.email, 160).toLowerCase(),
	token: text(data?.token, 2e3)
})).handler(createSsrRpc("7a19204dc5ea7c8d03cfe69cbff80503551f4432040d965cff121021fe3364a4"));
/**
* Retorna las órdenes reservadas: pendientes de pago por transferencia bancaria.
* Solo incluye estado="pendiente" con metodo_pago="transferencia".
*/
var getAdminReservedOrders = createServerFn({ method: "POST" }).validator((data) => ({
	email: text(data?.email, 160).toLowerCase(),
	token: text(data?.token, 2e3)
})).handler(createSsrRpc("1db69a946c0eb96bb3dfa4c44343b2038088b2a3f3cdc457f9b07897c4e351b4"));
/**
* Actualiza el estado de una orden (ej: de 'pendiente' a 'pagado') desde el panel de administración.
*/
var updateOrderStatus = createServerFn({ method: "POST" }).validator((data) => ({
	orderCode: text(data.orderCode, 40),
	estado: text(data.estado, 40),
	token: data.token ? text(data.token, 4e3) : void 0,
	email: data.email ? text(data.email, 254) : void 0
})).handler(createSsrRpc("ce3247af923fb83e1b50e04a2d3399abe6b8ac7e9c8330b2019de9668492b17f"));
/**
* Elimina una orden de la base de datos (por ejemplo, pedidos por transferencia no completados o cancelados).
*/
var deleteAdminOrder = createServerFn({ method: "POST" }).validator((data) => ({
	orderId: data.orderId ? text(data.orderId, 60) : void 0,
	orderCode: text(data.orderCode, 60),
	token: data.token ? text(data.token, 4e3) : void 0,
	email: data.email ? text(data.email, 254) : void 0
})).handler(createSsrRpc("743df13d7e04edbc6f053b2f4564fbe817fadafd647b83c6231d5854f970d82e"));
/**
* Registra una orden de pago por Transferencia Bancaria con el descuento aplicado.
*/
var createTransferOrder = createServerFn({ method: "POST" }).validator((data) => ({
	shipping: cleanShipping(data.shipping),
	items: cleanItems(data.items),
	userId: data.userId ? text(data.userId, 64) : void 0,
	couponCode: data.couponCode ? text(data.couponCode, 40).toUpperCase().trim() : void 0
})).handler(createSsrRpc("7f43dc7f4d6958b39ba9c949bdd13b4fc232edd74db3ff3fa401fd99dbb36566"));
//#endregion
export { updateOrderStatus as a, getAdminReservedOrders as i, deleteAdminOrder as n, verifyOrderPayment as o, getAdminPaidOrders as r, createTransferOrder as t };
