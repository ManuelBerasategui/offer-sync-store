import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { t as createSsrRpc } from "./store.functions-DYWk1U4D.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/products.functions-BgXArIxF.js
var str = (v, max = 2e3) => String(v ?? "").slice(0, max);
function calcArsFromUsd(usd, rate, markupPct = 0, increment = 10, surcharge = 1) {
	const numUsd = typeof usd === "number" ? usd : Number(String(usd).replace(/[^\d.-]/g, ""));
	if (!Number.isFinite(numUsd) || numUsd <= 0 || !rate || rate <= 0) return 0;
	const baseUsdWithSurcharge = numUsd * surcharge;
	const markup = markupPct / 100;
	if (increment > 1) return Math.ceil(baseUsdWithSurcharge * rate * (1 + markup) / increment) * increment;
	return Math.round(baseUsdWithSurcharge * rate * (1 + markup));
}
var getAdminProducts = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	page: data?.page ? Math.max(1, Number(data.page)) : void 0,
	pageSize: data?.pageSize ? Math.max(1, Math.min(100, Number(data.pageSize))) : void 0,
	search: typeof data?.search === "string" ? str(data.search, 100).trim() : void 0,
	category: typeof data?.category === "string" ? str(data.category, 100).trim() : void 0,
	offerOnly: Boolean(data?.offerOnly),
	fetchAll: Boolean(data?.fetchAll)
})).handler(createSsrRpc("63dca7bdf94d16710d79005fe4d62aa8ece1b7ae5078dca9aa66593a5c5177bc"));
var upsertAdminProduct = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	product: data.product
})).handler(createSsrRpc("6260d02f0e3675dad00e4584026dd115c1a4924d85330f35d9ca440cd668cd77"));
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
})).handler(createSsrRpc("e16788a51c33121a1633d532be8d6ec8e5d2ae0ea43fee788b47a98b99c40007"));
/**
* Recolecta todas las URLs de imágenes asociadas a un conjunto de productos (imagen principal,
* extra_images en metadata y variantes).
*/
/**
* Elimina las fotos de los buckets de Supabase Storage correspondientes,
* verificando de forma segura que ningún otro producto o banner activo las siga usando.
*/
var deleteAdminProduct = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	productId: str(data?.productId, 100)
})).handler(createSsrRpc("33f8e26a870b8cd0f9915e42f81a7424c08b148b60f99c7b98a630bc6868796a"));
var bulkDeleteAdminProducts = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	productIds: Array.isArray(data?.productIds) ? data.productIds.map((id) => str(id, 200)).filter(Boolean) : []
})).handler(createSsrRpc("342ab30ce7873a26573b8b4f1ab0cb2445a8ea911dd599d8b32f4f1ca2f086f0"));
var uploadAdminProductImage = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	filename: str(data?.filename, 200),
	base64: data?.base64 ?? "",
	bucket: str(data?.bucket, 60) || "storage-images",
	contentType: str(data?.contentType, 60)
})).handler(createSsrRpc("45d200092fe3415ee9edf5769ceeb45d4ea8aab97640f003c02c548380e9f574"));
var upsertCategoryRules = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	rules: data.rules,
	dolarCotizacion: data.dolarCotizacion,
	bankInfo: data.bankInfo,
	resendConfig: data.resendConfig,
	couponConfig: data.couponConfig,
	calculatorRates: data.calculatorRates
})).handler(createSsrRpc("f0db6b401048fa798f276cb808a4b040a31d1474c02663a9a6965b90857256df"));
/**
* Valida si un código promocional es válido, activo y si el usuario aún no lo utilizó.
*/
var validatePromoCoupon = createServerFn({ method: "POST" }).validator((data) => ({
	code: str(data.code, 40).toUpperCase().trim(),
	userId: data.userId ? str(data.userId, 60) : void 0,
	email: data.email ? str(data.email, 160).toLowerCase().trim() : void 0,
	token: data.token ? str(data.token, 4e3) : void 0
})).handler(createSsrRpc("854d2d92b3f8f0474351a06b3fa503a327af9e5237d8105d07ae8da00d0304c1"));
/**
* Consulta la cantidad de usos del cupón para el panel de administración.
*/
var getCouponUsagesSummary = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3)
})).handler(createSsrRpc("bc57a9a95eab34c83f5095fc719cb6d8f7d5df96c8e15e8ecdff4c8ad7305589"));
var testAdminResendEmail = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	targetEmail: str(data?.targetEmail, 160).toLowerCase()
})).handler(createSsrRpc("8fe58ff15eb2e561b41b0403b33a87523e3dc7eb987ce475c0eb3410c23d427c"));
var getAdminBanners = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3)
})).handler(createSsrRpc("c1844a2834abb2f0b7bffcdc067115ca45e88e9793d502a91e80ad3b19350d03"));
var upsertAdminBanner = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	banner: data.banner
})).handler(createSsrRpc("6ae12117933882980086caf47798caa8215796c2fd7dbedf065b24769a26aa2f"));
var deleteAdminBanner = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	bannerId: str(data?.bannerId, 100)
})).handler(createSsrRpc("cbfd4f5cd9746db9487c49783400e817a94c8a8a7d58782bd61b9f12d886b41b"));
var bulkUpdateAdminStock = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	productIds: Array.isArray(data?.productIds) ? data.productIds.map((id) => str(id, 100)) : [],
	stock: data?.stock === "NO" ? "NO" : "SI"
})).handler(createSsrRpc("5ce925605bf62477c3ee4f80a1cb916cab3cdc2d46be3dbf324bcfe7c17f5ccb"));
var updateVariantStock = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	variantId: str(data?.variantId, 100),
	stock: data?.stock === "NO" ? "NO" : "SI"
})).handler(createSsrRpc("9136b1bf5c50183bb5672a8824c016a8deefe2a9d600b8905c1d658565e272d3"));
/** Extrae todas las URLs de imágenes de alta resolución de un álbum Yupoo. */
/** Extrae los links de álbumes individuales, su portada y su título de una página de búsqueda/galería Yupoo. */
var parseYupooPage = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	url: str(data?.url, 500).trim(),
	password: str(data?.password ?? "", 100).trim()
})).handler(createSsrRpc("75004676fb89703378d81a34da901d6382e69d2b26040034aa04e17e814a14bd"));
var importYupooAlbum = createServerFn({ method: "POST" }).validator((data) => ({
	email: str(data?.email, 160).toLowerCase(),
	token: str(data?.token, 2e3),
	albumUrl: str(data?.albumUrl, 500).trim(),
	title: str(data?.title, 300).trim(),
	coverUrl: str(data?.coverUrl, 1e3).trim(),
	password: str(data?.password ?? "", 100).trim(),
	category: str(data?.category, 100).trim(),
	maxImages: Math.min(Math.max(Number(data?.maxImages ?? 8) || 8, 1), 50)
})).handler(createSsrRpc("39df01384e0331f2b03058c08d3ca0109ab5784174f7e1a12471658a3548cdc5"));
//#endregion
export { upsertCategoryRules as _, deleteAdminProduct as a, getCouponUsagesSummary as c, testAdminResendEmail as d, updateProductPrice as f, upsertAdminProduct as g, upsertAdminBanner as h, deleteAdminBanner as i, importYupooAlbum as l, uploadAdminProductImage as m, bulkUpdateAdminStock as n, getAdminBanners as o, updateVariantStock as p, calcArsFromUsd as r, getAdminProducts as s, bulkDeleteAdminProducts as t, parseYupooPage as u, validatePromoCoupon as v };
