import { n as createServerFn, r as getServerFnById, t as TSS_SERVER_FUNCTION } from "./server-BSCRlM9_.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/store.functions-DYWk1U4D.js
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
/**
* CAPA 2: Cloudflare Cache API.
* Compartida entre todos los isolates paralelos del mismo datacenter.
* Impacto adicional: elimina fetches redundantes entre instancias paralelas.
*/
var CF_CACHE_KEY = "https://teimportamosarg.com/__store_data_v1__";
/** Intenta leer de Cloudflare Cache API. Retorna null si no está disponible o expiró. */
/** Escribe en Cloudflare Cache API. No-op si no está disponible. */
/** Ejecuta las 4 queries a Supabase y construye el StoreData. */
var getStoreData = createServerFn({ method: "GET" }).handler(createSsrRpc("d967006a173800329904c483ca68b3958a45b6eb76398bf4f52fae605c1a4735"));
/**
* Invalida ambas capas de caché del store.
* Llamar después de modificar productos, banners o configuración en el admin.
*/
async function invalidateStoreCache() {
	try {
		if (typeof caches !== "undefined") await caches.default.delete(CF_CACHE_KEY);
	} catch {}
}
createServerFn({ method: "POST" }).handler(createSsrRpc("8f4f897912f984c825b1eae80ffc3ad77f73565965a5cebc07e33e140e061cc6"));
//#endregion
export { getStoreData as n, invalidateStoreCache as r, createSsrRpc as t };
