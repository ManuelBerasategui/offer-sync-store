import { i as __toESM } from "../_runtime.mjs";
import { t as __exportAll } from "./rolldown-runtime-D7D4PA-g.mjs";
import { A as normCat, F as parseJerseyItem, G as unitPriceFor, I as priceOf, K as waLink, P as parseCategoryRules, S as isLongSleeve, b as imageUrl, c as calcJerseyUnitPrice, m as findRuleForCat, p as findProduct, u as categoryDiscountForUnits, x as isCamiseta } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { K as redirect, _ as createFileRoute, d as Scripts, f as HeadContent, g as lazyRouteComponent, h as Outlet, m as createRouter, v as createRootRouteWithContext, x as useRouter, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as getStoreData } from "./store.functions-DYWk1U4D.mjs";
import { t as supabase } from "./client-Bx8URvVl.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { i as QueryClientProvider, n as useSuspenseQuery, r as useQuery, t as queryOptions } from "../_libs/tanstack__react-query.mjs";
import { a as objectType, n as coerce, o as stringType, r as enumType } from "../_libs/zod.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { t as Analytics } from "../_libs/vercel__analytics.mjs";
import { D as MessageCircle, G as Check, K as Calculator, L as Copy, M as LayoutGrid, b as Plus, o as Trash2, r as User, u as ShoppingCart, y as Printer } from "../_libs/lucide-react.mjs";
import { i as Trigger, n as Portal, r as Root2, t as Content2 } from "../_libs/@radix-ui/react-popover+[...].mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/cart-BDT0SkP7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var EMPTY_SHIPPING = {
	nombre: "",
	dni: "",
	telefono: "",
	provincia: "",
	ciudad: "",
	codigo_postal: "",
	transporte: "Correo Argentino",
	sucursal_correo: ""
};
var Ctx$1 = (0, import_react.createContext)(null);
function AuthProvider({ children }) {
	const [session, setSession] = (0, import_react.useState)(null);
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const loadProfile = (0, import_react.useCallback)(async (userId) => {
		if (!userId) {
			setProfile(null);
			return;
		}
		const { data } = await supabase.from("profiles").select("nombre, dni, telefono, provincia, ciudad, codigo_postal, transporte, sucursal_correo").eq("id", userId).maybeSingle();
		setProfile(data ? {
			...EMPTY_SHIPPING,
			...data
		} : null);
	}, []);
	(0, import_react.useEffect)(() => {
		let initialLoaded = false;
		const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
			if (event === "INITIAL_SESSION" && initialLoaded) return;
			initialLoaded = true;
			setSession(next);
			setLoading(false);
			loadProfile(next?.user?.id);
		});
		supabase.auth.getSession().then(({ data }) => {
			if (initialLoaded) return;
			initialLoaded = true;
			setSession(data.session);
			setLoading(false);
			loadProfile(data.session?.user?.id);
		});
		return () => sub.subscription.unsubscribe();
	}, [loadProfile]);
	const adminEmails = ({
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/",
		"VITE_ADMIN_EMAILS": "admin@config.com",
		"VITE_MERCADOPAGO_PUBLIC_KEY": "APP_USR-8a4d2d6d-76d7-42a5-9ba7-8e18dc82534c",
		"VITE_SITE_URL": "https://teimportamosarg.com",
		"VITE_SUPABASE_PROJECT_ID": "dybzgnmghisqapdzgknv",
		"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_ibTb6R19YFR_X0Euw6n63g_Gn1K3teA",
		"VITE_SUPABASE_URL": "https://dybzgnmghisqapdzgknv.supabase.co"
	}["VITE_ADMIN_EMAILS"] || {
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/",
		"VITE_ADMIN_EMAILS": "admin@config.com",
		"VITE_MERCADOPAGO_PUBLIC_KEY": "APP_USR-8a4d2d6d-76d7-42a5-9ba7-8e18dc82534c",
		"VITE_SITE_URL": "https://teimportamosarg.com",
		"VITE_SUPABASE_PROJECT_ID": "dybzgnmghisqapdzgknv",
		"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_ibTb6R19YFR_X0Euw6n63g_Gn1K3teA",
		"VITE_SUPABASE_URL": "https://dybzgnmghisqapdzgknv.supabase.co"
	}["ADMIN_EMAILS"] || "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
	const defaultAdmins = ["admin@config.com", "admin@teimportamos.com"];
	const userEmail = session?.user?.email?.toLowerCase().trim();
	const isAdmin = Boolean(userEmail && (adminEmails.length > 0 ? adminEmails.includes(userEmail) : defaultAdmins.includes(userEmail)));
	const value = (0, import_react.useMemo)(() => ({
		user: session?.user ?? null,
		session,
		profile,
		loading,
		isAdmin,
		signOut: async () => {
			await supabase.auth.signOut();
		},
		refreshProfile: async () => loadProfile(session?.user?.id)
	}), [
		session,
		profile,
		loading,
		loadProfile,
		isAdmin
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ctx$1.Provider, {
		value,
		children
	});
}
function useAuth() {
	const ctx = (0, import_react.useContext)(Ctx$1);
	if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
	return ctx;
}
var storeQueryOptions = queryOptions({
	queryKey: ["store"],
	queryFn: () => getStoreData(),
	staleTime: 9e5,
	gcTime: 36e5,
	refetchOnWindowFocus: false,
	refetchOnReconnect: false
});
var Ctx = (0, import_react.createContext)(null);
function toCartItem(row) {
	return {
		id: row.item_id,
		productId: row.product_id ?? void 0,
		nombre: row.nombre,
		qty: row.qty,
		unitPrice: Number(row.unit_price),
		imagen: row.imagen ?? void 0,
		categoria: row.categoria ?? void 0,
		basePrice: row.base_price === null ? void 0 : Number(row.base_price),
		variantId: row.variant_id ?? void 0,
		variantColor: row.variant_color ?? void 0
	};
}
function toCartRow(userId, item) {
	return {
		user_id: userId,
		item_id: item.id,
		product_id: item.productId ?? null,
		nombre: item.nombre,
		qty: item.qty,
		unit_price: item.unitPrice,
		imagen: item.imagen ?? null,
		categoria: item.categoria ?? null,
		base_price: item.basePrice ?? null,
		variant_id: item.variantId ?? null,
		variant_color: item.variantColor ?? null
	};
}
var CART_STORAGE_KEY = "offer_sync_cart_items";
function loadLocalCart() {
	if (typeof window === "undefined") return [];
	try {
		const raw = localStorage.getItem(CART_STORAGE_KEY);
		return raw ? JSON.parse(raw) : [];
	} catch {
		return [];
	}
}
function saveLocalCart(items) {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
	} catch {}
}
function CartProvider({ children }) {
	const [items, setItems] = (0, import_react.useState)(() => loadLocalCart());
	const { data } = useQuery(storeQueryOptions);
	const { user, loading: authLoading } = useAuth();
	const hydratedRef = (0, import_react.useRef)(false);
	const userRef = (0, import_react.useRef)(user);
	(0, import_react.useEffect)(() => {
		userRef.current = user;
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (!hydratedRef.current) {
			hydratedRef.current = true;
			const local = loadLocalCart();
			if (local.length > 0) setItems(local);
		}
	}, []);
	(0, import_react.useEffect)(() => {
		if (authLoading) return;
		if (!user) {
			const local = loadLocalCart();
			setItems(local);
			return;
		}
		let cancelled = false;
		(async () => {
			const { data: rows, error } = await supabase.from("cart_items").select("item_id, product_id, nombre, qty, unit_price, imagen, categoria, base_price, variant_id, variant_color").eq("user_id", user.id);
			if (cancelled) return;
			if (error) {
				console.error("[cart] error loading cart from DB:", error);
				setItems(loadLocalCart());
				return;
			}
			const dbItems = (rows ?? []).map(toCartItem);
			const localItems = loadLocalCart();
			if (localItems.length > 0) {
				const mergedMap = /* @__PURE__ */ new Map();
				for (const item of dbItems) mergedMap.set(item.id, item);
				for (const item of localItems) {
					const existing = mergedMap.get(item.id);
					if (existing) mergedMap.set(item.id, {
						...existing,
						qty: existing.qty + item.qty
					});
					else mergedMap.set(item.id, item);
				}
				const merged = Array.from(mergedMap.values());
				setItems(merged);
				Promise.all(merged.map((item) => supabase.from("cart_items").upsert(toCartRow(user.id, item), { onConflict: "user_id,item_id" })));
				saveLocalCart([]);
			} else setItems(dbItems);
		})();
		return () => {
			cancelled = true;
		};
	}, [user?.id, authLoading]);
	const resolvedItems = (0, import_react.useMemo)(() => {
		const products = data?.products;
		const banners = data?.banners ?? [];
		const config = data?.config ?? {};
		if (!products || products.length === 0) return items;
		const catRules = parseCategoryRules(config);
		const catTotals = {};
		for (const item of items) {
			const catNorm = normCat(item.categoria ?? "");
			if (!catNorm) continue;
			const key = findRuleForCat(catNorm, catRules)?.key ?? catNorm;
			catTotals[key] = (catTotals[key] ?? 0) + item.qty;
		}
		const totalJerseyUnits = items.filter((i) => isCamiseta(i.categoria, i.nombre)).reduce((sum, i) => sum + i.qty, 0);
		const usdRate = Number(config["dolar_cotizacion"] ?? 0);
		return items.map((item) => {
			if (item.id.startsWith("combo-")) {
				const rawIdx = item.id.replace("combo-", "");
				const bannerIdx = !isNaN(Number(rawIdx)) ? Number(rawIdx) : -1;
				const banner = bannerIdx >= 0 && bannerIdx < banners.length ? banners[bannerIdx] : banners.find((b) => b.titulo?.trim().toLowerCase() === item.nombre?.trim().toLowerCase());
				const rawTiers = banner?.quantity_tiers ?? banner?.link;
				let tiers = null;
				if (Array.isArray(rawTiers) && rawTiers.length > 0) tiers = rawTiers;
				else if (typeof rawTiers === "string" && rawTiers.trim().startsWith("[")) try {
					const parsed = JSON.parse(rawTiers);
					if (Array.isArray(parsed) && parsed.length > 0) tiers = parsed;
				} catch {}
				const bannerBase = banner ? Number(banner.precio ?? 0) : 0;
				const baseP = bannerBase > 0 ? bannerBase : item.basePrice && item.basePrice > 0 ? item.basePrice : item.unitPrice;
				if (tiers) {
					const activeTier = [...tiers].sort((a, b) => b.units - a.units).find((t) => item.qty >= t.units);
					if (activeTier) {
						const newPrice = Math.round(activeTier.price);
						const rBase = Math.round(baseP);
						if (item.unitPrice === newPrice && item.basePrice === rBase) return item;
						return {
							...item,
							basePrice: rBase,
							unitPrice: newPrice
						};
					}
				}
				const rBase = Math.round(baseP);
				if (item.unitPrice === rBase && item.basePrice === rBase) return item;
				return {
					...item,
					basePrice: rBase,
					unitPrice: rBase
				};
			}
			if (isCamiseta(item.categoria, item.nombre)) {
				const { version, isExtraSize, badge } = parseJerseyItem(item);
				const effectiveQty = Math.max(item.qty, totalJerseyUnits);
				const { unitArs, baseArs } = calcJerseyUnitPrice({
					qty: effectiveQty,
					version,
					isExtraSize,
					badge,
					usdRate,
					isLongSleeve: isLongSleeve(item.nombre)
				});
				if (unitArs > 0) {
					if (item.unitPrice === unitArs && item.basePrice === baseArs) return item;
					return {
						...item,
						basePrice: baseArs,
						unitPrice: unitArs
					};
				}
				return item;
			}
			const product = (item.productId ? findProduct(products, item.productId) : void 0) ?? findProduct(products, item.id) ?? findProduct(products, item.nombre) ?? products.find((p) => item.id && String(item.id).startsWith(String(p.id) + "-")) ?? products.find((p) => item.nombre && p.nombre && item.nombre.toLowerCase().startsWith(p.nombre.toLowerCase()));
			if (!product) return item;
			if (isCamiseta(product.categoria, product.nombre)) {
				const { version, isExtraSize, badge } = parseJerseyItem(item);
				const effectiveQty = Math.max(item.qty, totalJerseyUnits);
				const { unitArs, baseArs } = calcJerseyUnitPrice({
					qty: effectiveQty,
					version,
					isExtraSize,
					badge,
					usdRate,
					isLongSleeve: isLongSleeve(item.nombre) || isLongSleeve(product.nombre)
				});
				if (unitArs > 0) {
					if (item.unitPrice === unitArs && item.basePrice === baseArs) return item;
					return {
						...item,
						categoria: product.categoria ?? "Camisetas",
						basePrice: baseArs,
						unitPrice: unitArs
					};
				}
				return item;
			}
			const catNorm = normCat(item.categoria ?? "");
			const match = catNorm ? findRuleForCat(catNorm, catRules) : void 0;
			const catRule = match?.rule;
			const ruleKey = match?.key;
			const base = item.basePrice && item.basePrice > 0 ? item.basePrice : priceOf(product);
			let unitPrice;
			if (Array.isArray(catRule?.discountTiers) && catRule.discountTiers.length > 0 && ruleKey) {
				const totalCatUnits = catTotals[ruleKey] ?? 0;
				const percent = categoryDiscountForUnits(catRule.discountTiers, totalCatUnits);
				unitPrice = Math.round(base * (1 - percent / 100));
			} else unitPrice = Math.round(unitPriceFor(product, item.qty, base));
			const rBase = Math.round(base);
			if (item.unitPrice === unitPrice && item.basePrice === rBase) return item;
			return {
				...item,
				basePrice: rBase,
				unitPrice
			};
		});
	}, [
		items,
		data?.products,
		data?.banners,
		data?.config
	]);
	const add = (0, import_react.useCallback)((item) => {
		setItems((prev) => {
			const next = prev.find((entry) => entry.id === item.id) ? prev.map((entry) => entry.id === item.id ? {
				...item,
				qty: entry.qty + item.qty
			} : entry) : [...prev, item];
			const savedItem = next.find((entry) => entry.id === item.id);
			const uid = userRef.current?.id;
			if (uid) supabase.from("cart_items").upsert(toCartRow(uid, savedItem), { onConflict: "user_id,item_id" }).then(({ error }) => {
				if (error) console.error("[cart] upsert error:", error);
			});
			else saveLocalCart(next);
			return next;
		});
	}, []);
	const remove = (0, import_react.useCallback)((id) => {
		setItems((prev) => {
			const next = prev.filter((item) => item.id !== id);
			const uid = userRef.current?.id;
			if (uid) supabase.from("cart_items").delete().eq("user_id", uid).eq("item_id", id).then(({ error }) => {
				if (error) console.error("[cart] delete error:", error);
			});
			else saveLocalCart(next);
			return next;
		});
	}, []);
	const setQty = (0, import_react.useCallback)((id, qty) => {
		setItems((prev) => {
			const next = prev.map((item) => item.id === id ? {
				...item,
				qty: Math.max(1, qty)
			} : item);
			const updated = next.find((item) => item.id === id);
			const uid = userRef.current?.id;
			if (uid && updated) supabase.from("cart_items").upsert(toCartRow(uid, updated), { onConflict: "user_id,item_id" }).then(({ error }) => {
				if (error) console.error("[cart] setQty upsert error:", error);
			});
			else saveLocalCart(next);
			return next;
		});
	}, []);
	const clear = (0, import_react.useCallback)(() => {
		setItems([]);
		saveLocalCart([]);
		const uid = userRef.current?.id;
		if (uid) supabase.from("cart_items").delete().eq("user_id", uid).then(({ error }) => {
			if (error) console.error("[cart] clear error:", error);
		});
	}, []);
	const value = (0, import_react.useMemo)(() => ({
		items: resolvedItems,
		count: resolvedItems.reduce((total, item) => total + item.qty, 0),
		total: resolvedItems.reduce((total, item) => total + item.qty * item.unitPrice, 0),
		add,
		remove,
		setQty,
		clear
	}), [
		resolvedItems,
		add,
		remove,
		setQty,
		clear
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ctx.Provider, {
		value,
		children
	});
}
function useCart() {
	const ctx = (0, import_react.useContext)(Ctx);
	if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
	return ctx;
}
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/constants-DZ9ChhUi.js
/**
* SITE_URL — canonical origin for this deployment.
*
* Set VITE_SITE_URL in your environment (Vercel/Cloudflare/local).
* Falls back to the production domain so OG/JSON-LD tags are always valid.
* Never has a trailing slash.
*/
var SITE_URL = (() => {
	return ({
		"BASE_URL": "/",
		"DEV": false,
		"MODE": "production",
		"PROD": true,
		"SSR": true,
		"TSS_DEV_SERVER": "false",
		"TSS_DEV_SSR_STYLES_BASEPATH": "/",
		"TSS_DEV_SSR_STYLES_ENABLED": "true",
		"TSS_DISABLE_CSRF_MIDDLEWARE_WARNING": "false",
		"TSS_INLINE_CSS_ENABLED": "false",
		"TSS_ROUTER_BASEPATH": "",
		"TSS_SERVER_FN_BASE": "/_serverFn/",
		"VITE_ADMIN_EMAILS": "admin@config.com",
		"VITE_MERCADOPAGO_PUBLIC_KEY": "APP_USR-8a4d2d6d-76d7-42a5-9ba7-8e18dc82534c",
		"VITE_SITE_URL": "https://teimportamosarg.com",
		"VITE_SUPABASE_PROJECT_ID": "dybzgnmghisqapdzgknv",
		"VITE_SUPABASE_PUBLISHABLE_KEY": "sb_publishable_ibTb6R19YFR_X0Euw6n63g_Gn1K3teA",
		"VITE_SUPABASE_URL": "https://dybzgnmghisqapdzgknv.supabase.co"
	}["VITE_SITE_URL"] ?? "").replace(/\/+$/, "") || "https://teimportamosarg.com";
})();
//#endregion
//#region node_modules/.nitro/vite/services/ssr/assets/router-Cnd2hP15.js
var styles_default = "/assets/styles-BnZMbFpp.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
	const message = error instanceof Response ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}` : error instanceof Error ? error.message : String(error);
	const stack = error instanceof Error ? error.stack : void 0;
	window.__lovableReportRuntimeError?.({
		message,
		...stack !== void 0 && { stack },
		filename: window.location.pathname
	});
}
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Página no encontrada"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground normal-case",
					children: "La página que buscás no existe o fue movida."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "btn-base grad-urgente text-primary-foreground",
						children: "Ir al inicio"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "Esta página no cargó"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground normal-case",
					children: "Algo salió mal. Probá recargar o volver al inicio."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "btn-base grad-urgente text-primary-foreground",
						children: "Reintentar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "btn-base border border-border text-foreground",
						children: "Ir al inicio"
					})]
				})
			]
		})
	});
}
var Route$14 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Te importamos — Productos importados al mejor precio" },
			{
				name: "description",
				content: "Tienda mayorista y minorista de productos importados. Ofertas del día, envíos a todo el país."
			},
			{
				property: "og:site_name",
				content: "Te importamos"
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				property: "og:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:image:secure_url",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:image:type",
				content: "image/jpeg"
			},
			{
				property: "og:image:width",
				content: "1000"
			},
			{
				property: "og:image:height",
				content: "1000"
			},
			{
				property: "og:image:alt",
				content: "Te importamos"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				name: "theme-color",
				content: "#ffffff"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "es-AR",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$14.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(CartProvider, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster$1, { position: "bottom-right" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Analytics, {})
		] }) })
	});
}
var $$splitComponentImporter$11 = () => import("./routes-Dj9EunMe.mjs");
var Route$13 = createFileRoute("/")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({
		meta: [
			{ title: "Te importamos — Ofertas del día en productos importados" },
			{
				name: "description",
				content: "Importamos de todo para que revendas: tecnología, bazar y perfumes con precio de importador. Comprá online con envíos a todo el país."
			},
			{
				property: "og:title",
				content: "Te importamos — Precio de importador"
			},
			{
				property: "og:description",
				content: "Ofertas del día en productos importados originales. Comprá online, ideal para revender."
			},
			{
				property: "og:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:image:secure_url",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				name: "twitter:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:url",
				content: `${SITE_URL}/`
			}
		],
		links: [{
			rel: "canonical",
			href: `${SITE_URL}/`
		}]
	}),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./auth-Dp7aT1h4.mjs");
var authSearchSchema = objectType({
	mode: enumType([
		"login",
		"register",
		"forgot"
	]).optional(),
	redirect: stringType().optional()
});
var Route$12 = createFileRoute("/auth")({
	validateSearch: authSearchSchema,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [
		{ title: "Iniciar sesión — Te importamos" },
		{
			name: "description",
			content: "Iniciá sesión o creá tu cuenta para comprar más rápido, guardar tus datos de envío y acceder a descuentos exclusivos."
		},
		{
			property: "og:title",
			content: "Iniciar sesión — Te importamos"
		},
		{
			property: "og:description",
			content: "Tu cuenta para comprar productos importados con envío a todo el país."
		},
		{
			property: "og:image",
			content: `${SITE_URL}/businessicon.jpg`
		},
		{
			property: "og:image:secure_url",
			content: `${SITE_URL}/businessicon.jpg`
		},
		{
			name: "twitter:image",
			content: `${SITE_URL}/businessicon.jpg`
		},
		{
			property: "og:url",
			content: `${SITE_URL}/auth`
		},
		{
			name: "robots",
			content: "noindex, nofollow"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var Popover = Root2;
var PopoverTrigger = Trigger;
var PopoverContent = import_react.forwardRef(({ className, align = "center", sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	align,
	sideOffset,
	className: cn("z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-popover-content-transform-origin)", className),
	...props
}) }));
PopoverContent.displayName = Content2.displayName;
var inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";
/** Botón de "Iniciar sesión" en el header con mini formulario desplegable. */
function HeaderAuth() {
	const { user, profile, signOut, isAdmin } = useAuth();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const submit = async (e) => {
		e.preventDefault();
		setError("");
		setLoading(true);
		try {
			const { error: err } = await supabase.auth.signInWithPassword({
				email,
				password
			});
			if (err) throw err;
			setOpen(false);
			setEmail("");
			setPassword("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "No pudimos iniciar sesión.");
		} finally {
			setLoading(false);
		}
	};
	if (user) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "flex items-center gap-1.5 rounded-full border border-border p-2 sm:px-3 sm:py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary",
				"aria-label": "Mi cuenta",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden sm:inline",
					children: profile?.nombre?.split(" ")[0] || "Mi cuenta"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
			align: "end",
			className: "w-64",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-sm font-semibold",
					children: profile?.nombre || user.email
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "truncate text-xs text-muted-foreground",
					children: user.email
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-3 flex flex-col gap-2",
					children: [
						isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/admin/ordenes",
							onClick: () => setOpen(false),
							className: "rounded-md bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 text-center",
							children: "⚙️ Panel Admin"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auth",
							onClick: () => setOpen(false),
							className: "text-xs font-semibold text-primary hover:underline",
							children: "Ver mis datos"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								signOut();
								setOpen(false);
							},
							className: "btn-base border border-border py-2 text-xs text-foreground",
							children: "Cerrar sesión"
						})
					]
				})
			]
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Popover, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PopoverTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "flex items-center gap-1.5 rounded-full border border-border p-2 sm:px-3 sm:py-2 text-xs font-bold text-foreground hover:border-primary hover:text-primary",
				"aria-label": "Iniciar sesión",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "hidden sm:inline",
					children: "Iniciar sesión"
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PopoverContent, {
			align: "end",
			className: "w-72",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-2.5",
				onSubmit: submit,
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: "Usuario (email)"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "email",
							required: true,
							className: inputClass,
							value: email,
							onChange: (e) => setEmail(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: "Contraseña"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "password",
							required: true,
							className: inputClass,
							value: password,
							onChange: (e) => setPassword(e.target.value)
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: loading,
						className: "btn-base grad-urgente mt-1 py-2 text-xs text-primary-foreground disabled:opacity-60",
						children: loading ? "Ingresando..." : "Iniciar sesión"
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-destructive",
						children: error
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-col items-start gap-1.5 text-[11px]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/auth",
					search: {
						mode: "register",
						redirect: typeof window !== "undefined" ? window.location.pathname + window.location.search : void 0
					},
					onClick: () => setOpen(false),
					className: "text-muted-foreground underline hover:text-primary",
					children: "¿No tenés cuenta? Registrarse"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/auth",
					search: {
						mode: "forgot",
						redirect: typeof window !== "undefined" ? window.location.pathname + window.location.search : void 0
					},
					onClick: () => setOpen(false),
					className: "text-muted-foreground underline hover:text-primary",
					children: "Olvidé mi contraseña"
				})]
			})]
		})]
	});
}
function SiteHeader({ config }) {
	const cart = useCart();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
		className: "sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md print:hidden",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-[1180px] items-center justify-between gap-1.5 px-2.5 py-2 sm:px-6 sm:py-3 min-w-0 w-full",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
				to: "/",
				"aria-label": "Ir al inicio",
				className: "flex shrink items-center min-w-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: "/businessicon-header.jpg?v=3",
					alt: "Te Importamos",
					className: "h-7 w-auto max-w-[125px] object-contain object-left xs:max-w-[155px] sm:h-10 sm:max-w-none"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex shrink-0 items-center gap-1 sm:gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("nav", {
						className: "mr-1 hidden items-center gap-6 text-sm font-semibold md:flex",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/",
								hash: "ofertas",
								className: "text-muted-foreground hover:text-primary",
								children: "Ofertas"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/catalogo",
								className: "text-muted-foreground hover:text-primary",
								children: "Catálogo"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/calculadora",
								className: "text-muted-foreground hover:text-primary",
								children: "Calculadora"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/",
								hash: "nosotros",
								className: "text-muted-foreground hover:text-primary",
								children: "Nosotros"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/",
								hash: "contacto",
								className: "text-muted-foreground hover:text-primary",
								children: "Contacto"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/catalogo",
						"aria-label": "Ver catálogo",
						className: "inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground hover:border-primary hover:text-primary md:hidden",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LayoutGrid, { className: "h-3.5 w-3.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Catálogo" })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/calculadora",
						"aria-label": "Calculadora de importaciones",
						className: "inline-flex items-center rounded-full border border-border px-2 py-1 text-xs font-semibold text-foreground hover:border-primary hover:text-primary md:hidden",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Calculadora" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeaderAuth, {}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/carrito",
						"aria-label": "Carrito",
						className: "relative rounded-full border border-border p-1.5 text-foreground hover:border-primary hover:text-primary sm:p-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingCart, { className: "h-4 w-4" }), cart.count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground",
							children: cart.count
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "btn-base hidden bg-whatsapp px-4 py-2.5 text-xs text-whatsapp-foreground sm:inline-flex",
						href: waLink(config),
						target: "_blank",
						rel: "noopener noreferrer",
						children: "WhatsApp"
					})
				]
			})]
		})
	});
}
function SiteFooter({ config }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", {
		className: "border-t border-border bg-surface px-4 py-10 text-center text-[13px] text-muted-foreground print:hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 font-display text-base text-foreground",
				children: "Te importamos"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Productos importados · Envíos a todo el país" }),
			config["instagram"] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1",
				children: config["instagram"]
			})
		]
	});
}
function SiteChrome({ config, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen flex-col bg-background text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex-1",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
var Route$11 = createFileRoute("/calculadora")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [{ title: "Calculadora de Importaciones — Te Importamos" }, {
		name: "description",
		content: "Cotizá en segundos tus productos puestos en Argentina con desglose de flete e impuestos."
	}] }),
	component: CalculadoraPage
});
function fmt(n) {
	return "$" + n.toLocaleString("es-AR", {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});
}
function CalculadoraPage() {
	const { data: storeData } = useSuspenseQuery(storeQueryOptions);
	const config = storeData.config ?? {};
	const rates = {
		fleteKg: Number(config["calc_flete_kg"]) || 22,
		handling: Number(config["calc_handling"]) || 30,
		honorarios: Number(config["calc_honorarios"]) || 220,
		impuestosPct: Number(config["calc_impuestos_pct"]) || 70,
		aereoFijo: Number(config["calc_aereo_fijo"]) || 950,
		aereoDesde: Number(config["calc_aereo_desde"]) || 50,
		aereoHasta: Number(config["calc_aereo_hasta"]) || 250,
		barcoFijo: Number(config["calc_barco_fijo"]) || 100,
		barcoDesde: Number(config["calc_barco_desde"]) || 250
	};
	const [client, setClient] = (0, import_react.useState)("");
	const [items, setItems] = (0, import_react.useState)([{
		id: "item-1",
		nombre: "",
		cantidad: 1,
		fob: 0,
		peso: 0
	}]);
	const [quote, setQuote] = (0, import_react.useState)(null);
	const [copied, setCopied] = (0, import_react.useState)(false);
	const resultRef = (0, import_react.useRef)(null);
	function addItem() {
		setItems((prev) => [...prev, {
			id: `item-${Date.now()}`,
			nombre: "",
			cantidad: 1,
			fob: 0,
			peso: 0
		}]);
	}
	function removeItem(id) {
		setItems((prev) => prev.length > 1 ? prev.filter((i) => i.id !== id) : prev);
	}
	function updateItem(id, field, value) {
		setItems((prev) => prev.map((it) => {
			if (it.id !== id) return it;
			return {
				...it,
				[field]: field === "nombre" ? value : Math.max(0, Number(value) || 0)
			};
		}));
	}
	function calcFreightCost(weight) {
		if (weight > (rates.barcoDesde > 0 ? rates.barcoDesde : 250)) return rates.barcoFijo > 0 ? rates.barcoFijo : 100;
		if (rates.aereoHasta > 0 && weight >= rates.aereoDesde && weight <= rates.aereoHasta) return rates.aereoFijo > 0 ? rates.aereoFijo : 950;
		return rates.fleteKg * weight;
	}
	function handleCalculate() {
		const validItems = items.filter((i) => i.cantidad > 0);
		if (!validItems.length || validItems.some((i) => !i.nombre.trim())) {
			alert("Por favor completá el nombre, cantidad, precio FOB y peso de cada producto.");
			return;
		}
		const clientName = client.trim() || "Cliente";
		const itemsIsolated = validItems.map((i) => {
			const weight = i.cantidad * i.peso;
			const fobTotal = i.cantidad * i.fob;
			const freightCost = calcFreightCost(weight);
			const handling = rates.handling;
			const honorarios = rates.honorarios;
			const base = fobTotal + freightCost + handling;
			const tax = base * (rates.impuestosPct / 100);
			const total = base + tax + honorarios;
			const unitPrice = i.cantidad > 0 ? total / i.cantidad : 0;
			return {
				...i,
				weight,
				fobTotal,
				freightCost,
				handling,
				honorarios,
				base,
				tax,
				total,
				unitPrice
			};
		});
		const totalWeight = validItems.reduce((s, i) => s + i.cantidad * i.peso, 0);
		const totalFOB = validItems.reduce((s, i) => s + i.cantidad * i.fob, 0);
		const freightTotal = calcFreightCost(totalWeight);
		const handlingTotal = rates.handling;
		const honorariosTotal = rates.honorarios;
		const baseTotal = totalFOB + freightTotal + handlingTotal;
		const taxesTotal = baseTotal * (rates.impuestosPct / 100);
		const res = {
			client: clientName,
			items: validItems,
			itemsIsolated,
			totalWeight,
			totalFOB,
			freightTotal,
			handlingTotal,
			honorariosTotal,
			taxesTotal,
			grandTotal: baseTotal + taxesTotal + honorariosTotal,
			rates
		};
		setQuote(res);
		setTimeout(() => {
			resultRef.current?.scrollIntoView({ behavior: "smooth" });
		}, 100);
	}
	function buildWhatsappMessage() {
		if (!quote) return "";
		const cleanClient = (quote.client || "").replace(/[\r\n\t]/g, " ").trim();
		const multi = quote.items.length > 1;
		let msg = `Hola! Te comparto la cotización para *${cleanClient}*:\n\n`;
		if (multi) {
			msg += `_Productos por separado (c/u aislado):_\n`;
			quote.itemsIsolated.forEach((i) => {
				msg += `• ${i.nombre} (x${i.cantidad}): ${fmt(i.unitPrice)} c/u puesto en Argentina — subtotal ${fmt(i.total)}\n`;
			});
			msg += `\n_Trayendo todos los productos juntos:_\n`;
			quote.items.forEach((i) => {
				msg += `• ${i.nombre} — FOB (x${i.cantidad}): ${fmt(i.cantidad * i.fob)}\n`;
			});
			msg += `• Flete: ${fmt(quote.freightTotal)}\n`;
			msg += `• Handling: ${fmt(quote.handlingTotal)}\n`;
			msg += `• Honorarios: ${fmt(quote.honorariosTotal)}\n`;
			msg += `• Impuestos: ${fmt(quote.taxesTotal)}\n`;
			msg += `\n*Total trayendo todo: ${fmt(quote.grandTotal)}*\n`;
		} else {
			const i = quote.itemsIsolated[0];
			if (i) msg += `• ${i.nombre} (x${i.cantidad}): ${fmt(i.unitPrice)} c/u puesto en Argentina\n`;
			msg += `\n*Total puesto en Argentina: ${fmt(quote.grandTotal)}*\n`;
			msg += `_(incluye flete, handling, honorarios e impuestos)_\n`;
		}
		msg += `\n*Nota:* El precio final es estimativo. Me gustaría confirmar el pedido y obtener el valor definitivo.`;
		return msg;
	}
	function handleConfirmWhatsapp() {
		const msg = buildWhatsappMessage();
		if (!msg) return;
		const url = waLink(config, msg);
		try {
			const parsed = new URL(url);
			if (parsed.protocol === "https:" && (parsed.hostname === "wa.me" || parsed.hostname === "api.whatsapp.com")) window.open(parsed.href, "_blank", "noopener,noreferrer");
		} catch {}
	}
	function copyForWhatsapp() {
		const msg = buildWhatsappMessage();
		if (!msg) return;
		navigator.clipboard.writeText(msg).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2500);
		}).catch(() => alert("No se pudo copiar automáticamente."));
	}
	const multi = quote ? quote.items.length > 1 : false;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteChrome, {
		config,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
			className: "min-h-[80vh] py-8 sm:py-12 bg-background print:min-h-0 print:py-0",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-3xl px-4 sm:px-6 print:max-w-none print:px-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "no-print print:hidden",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-center mb-8 sm:mb-10",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight",
							children: "Calculadora de Importaciones"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto",
							children: "Producto puesto en Argentina con flete internacional, handling, honorarios y gestión integral de aduana."
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs mb-8",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5",
									children: "Cliente o Referencia"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "text",
									value: client,
									onChange: (e) => setClient(e.target.value),
									placeholder: "Nombre de la empresa o cliente",
									className: "input-base text-sm font-medium w-full sm:max-w-md"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3 mb-6",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between pb-2 border-b border-border",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-bold uppercase tracking-wider text-muted-foreground",
										children: "Productos a cotizar"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] text-muted-foreground",
										children: "FOB y peso unitarios"
									})]
								}), items.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.2fr_1.2fr_auto] gap-2.5 items-end p-3 rounded-xl bg-muted/25 border border-border/60",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "text-[10px] font-bold text-muted-foreground uppercase",
												children: ["Producto #", idx + 1]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "text",
												value: item.nombre,
												onChange: (e) => updateItem(item.id, "nombre", e.target.value),
												placeholder: "ej: Power Bank 20000mAh",
												className: "input-base text-xs font-medium"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[10px] font-bold text-muted-foreground uppercase",
												children: "Cantidad"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												min: "1",
												value: item.cantidad || "",
												onChange: (e) => updateItem(item.id, "cantidad", e.target.value),
												className: "input-base text-xs font-bold"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[10px] font-bold text-muted-foreground uppercase",
												children: "FOB unit. (USD)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "0.01",
												min: "0",
												value: item.fob || "",
												onChange: (e) => updateItem(item.id, "fob", e.target.value),
												placeholder: "0.00",
												className: "input-base text-xs font-bold"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[10px] font-bold text-muted-foreground uppercase",
												children: "Peso unit. (kg)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "0.01",
												min: "0",
												value: item.peso || "",
												onChange: (e) => updateItem(item.id, "peso", e.target.value),
												placeholder: "0.20",
												className: "input-base text-xs font-bold"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex justify-end pb-0.5",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => removeItem(item.id),
												disabled: items.length <= 1,
												className: "rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30",
												title: "Quitar producto",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
											})
										})
									]
								}, item.id))]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col sm:flex-row items-center gap-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: addItem,
									className: "btn-base border border-dashed border-border hover:border-foreground/50 text-xs text-foreground font-semibold px-4 py-2 w-full sm:w-auto flex items-center justify-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), " + Agregar otro producto"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: handleCalculate,
									className: "btn-base bg-primary text-primary-foreground font-bold text-sm px-6 py-2.5 w-full sm:flex-1 hover:opacity-90 flex items-center justify-center gap-2 shadow-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "h-4 w-4" }), " Generar cotización"]
								})]
							})
						]
					})]
				}), quote && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					ref: resultRef,
					className: "rounded-xl border border-border border-t-4 border-t-[#E8590F] bg-card p-6 sm:p-9 shadow-sm relative print:border-none print:p-0 print:shadow-none",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-end justify-between border-b-2 border-foreground/90 pb-3.5 mb-5 gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-col gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: "/businessicon-header.jpg?v=3",
									alt: "Te Importamos",
									className: "h-8.5 w-auto object-contain block max-h-9"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-xl sm:text-2xl font-bold text-foreground tracking-tight",
									children: "Cotización"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-right text-xs font-mono text-muted-foreground whitespace-nowrap leading-relaxed",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: ["COT-", Date.now().toString(36).toUpperCase()] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: (/* @__PURE__ */ new Date()).toLocaleDateString("es-AR") })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block font-mono text-[10.5px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5",
								children: "CLIENTE"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-semibold text-foreground",
								children: quote.client
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-5",
							children: [multi && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-1",
									children: "Productos por separado puestos en Argentina"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground italic",
									children: "Cada producto calculado de forma aislada, como si fuera el único artículo del envío."
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-4",
								children: quote.itemsIsolated.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "q-product-block",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between items-baseline gap-2 mb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-sm sm:text-base font-bold text-foreground",
											children: [i.nombre, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "font-mono text-xs font-normal text-muted-foreground ml-2",
												children: ["x", i.cantidad]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-mono text-sm font-semibold text-foreground whitespace-nowrap",
											children: fmt(i.total)
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "bg-[#FBEADD]/80 dark:bg-amber-950/25 border-l-4 border-[#E8590F] p-3.5 sm:p-4 mb-4 rounded-r-md",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "font-mono text-[10.5px] uppercase tracking-wider text-[#4B5A6B] dark:text-muted-foreground mb-1 font-medium",
											children: "PRECIO UNITARIO PUESTO EN ARGENTINA"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "price-num font-price-clean font-bold text-3xl sm:text-4xl text-[#E8590F] tracking-tight leading-none",
											style: {
												fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
												fontVariantNumeric: "normal",
												fontFeatureSettings: "normal"
											},
											children: fmt(i.unitPrice)
										})]
									})]
								}, i.id))
							})]
						}),
						multi ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-1 mt-6",
								children: "Trayendo todos los productos"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground italic mb-3",
								children: "Cálculo unificado compartiendo flete y handling entre todos los productos del pedido."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "divide-y divide-border/60 text-sm",
								children: [
									quote.items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between py-2 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-foreground",
											children: [
												i.nombre,
												" — FOB (x",
												i.cantidad,
												")"
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-foreground",
											children: fmt(i.cantidad * i.fob)
										})]
									}, i.id)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between py-2 text-sm font-medium",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground",
											children: "Flete"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-foreground",
											children: fmt(quote.freightTotal)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between py-2 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground",
											children: "Handling"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-foreground",
											children: fmt(quote.handlingTotal)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between py-2 text-sm",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground",
											children: "Honorarios"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-foreground",
											children: fmt(quote.honorariosTotal)
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between py-2 text-sm font-medium",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-foreground",
											children: "Impuestos"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono text-foreground",
											children: fmt(quote.taxesTotal)
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 rounded-lg bg-foreground text-background p-4 sm:p-5 flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs uppercase tracking-wider",
									children: "TOTAL TRAYENDO TODO"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "price-num font-price-clean text-2xl sm:text-3xl font-bold tracking-tight",
									style: {
										fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
										fontVariantNumeric: "normal",
										fontFeatureSettings: "normal"
									},
									children: fmt(quote.grandTotal)
								})]
							})
						] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "font-mono text-xs text-[#4B5A6B] dark:text-muted-foreground space-y-1.5 py-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Costo mercadería (FOB)" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt(quote.totalFOB) })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Flete" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt(quote.freightTotal) })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Handling" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt(quote.handlingTotal) })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Honorarios" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt(quote.honorariosTotal) })]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Impuestos" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: fmt(quote.taxesTotal) })]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex justify-between items-baseline pt-6 sm:pt-8 mt-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-mono text-xs uppercase tracking-wider text-muted-foreground",
									children: "TOTAL PUESTO EN ARGENTINA"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "price-num font-price-clean text-2xl sm:text-4xl font-bold text-foreground tracking-tight",
									style: {
										fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
										fontVariantNumeric: "normal",
										fontFeatureSettings: "normal"
									},
									children: fmt(quote.grandTotal)
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 pt-3.5 border-t border-border/70 text-xs text-muted-foreground leading-relaxed",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11.5px] sm:text-xs text-foreground/80",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-semibold text-foreground",
									children: "* Nota:"
								}), " El precio final es estimativo. Si deseás obtener el valor definitivo o confirmar tu pedido, escribinos a WhatsApp."]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-3 pt-6 mt-6 border-t border-border print:hidden",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: handleConfirmWhatsapp,
									className: "btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Confirmar por WhatsApp" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: copyForWhatsapp,
									className: "btn-base border border-border hover:bg-muted text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer",
									children: [copied ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: copied ? "¡Copiado!" : "Copiar cotización" })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => window.print(),
									className: "btn-base border border-border hover:bg-muted text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Imprimir / Guardar PDF" })]
								})
							]
						})
					]
				})]
			})
		})
	});
}
var $$splitComponentImporter$9 = () => import("./carrito-n2IVaIhz.mjs");
/**
* Input de cantidad para el carrito con buffer de display.
* Permite borrar el campo y escribir números multi-dígito en mobile
* sin que el valor salte a 1 en cada keystroke.
*/
var Route$10 = createFileRoute("/carrito")({
	head: () => ({ meta: [
		{ title: "Carrito de compras — Te importamos" },
		{
			name: "description",
			content: "Revisá tu pedido mayorista antes de finalizar la compra."
		},
		{
			name: "twitter:image",
			content: `${SITE_URL}/businessicon.jpg`
		},
		{
			property: "og:url",
			content: `${SITE_URL}/carrito`
		},
		{
			name: "robots",
			content: "noindex, nofollow"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./catalogo-ChVljmNd.mjs");
var Route$9 = createFileRoute("/catalogo")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({
		meta: [
			{ title: "Catálogo completo — Te importamos" },
			{
				name: "description",
				content: "Buscá y filtrá todo el catálogo de productos importados: tecnología, bazar, perfumes y más. Ordená por precio o por más vendidos."
			},
			{
				property: "og:title",
				content: "Catálogo completo — Te importamos"
			},
			{
				property: "og:description",
				content: "Todo el stock de productos importados con búsqueda, filtros por categoría y orden por precio."
			},
			{
				property: "og:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:image:secure_url",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				name: "twitter:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:url",
				content: `${SITE_URL}/catalogo`
			}
		],
		links: [{
			rel: "canonical",
			href: `${SITE_URL}/catalogo`
		}],
		scripts: [{
			type: "application/ld+json",
			children: JSON.stringify({
				"@context": "https://schema.org",
				"@type": "BreadcrumbList",
				itemListElement: [{
					"@type": "ListItem",
					position: 1,
					name: "Inicio",
					item: `${SITE_URL}/`
				}, {
					"@type": "ListItem",
					position: 2,
					name: "Catálogo",
					item: `${SITE_URL}/catalogo`
				}]
			})
		}]
	}),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./desuscribir-DZN72IN_.mjs");
var unsubscribeSearchSchema = objectType({ token: stringType().optional() });
var Route$8 = createFileRoute("/desuscribir")({
	validateSearch: unsubscribeSearchSchema,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [{ title: "Desuscripción de ofertas — Te Importamos" }, {
		name: "robots",
		content: "noindex, nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./gracias-CR6PFnfO.mjs");
var graciasSearchSchema = objectType({
	code: stringType().optional(),
	status: stringType().optional(),
	collection_status: stringType().optional(),
	payment_id: coerce.string().optional(),
	collection_id: coerce.string().optional()
}).passthrough();
var Route$7 = createFileRoute("/gracias")({
	validateSearch: graciasSearchSchema,
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [
		{ title: "Estado de tu compra — Te importamos" },
		{
			name: "description",
			content: "Estado de tu pedido de productos importados. Te contactamos para coordinar el envío."
		},
		{
			property: "og:title",
			content: "Estado de tu compra — Te importamos"
		},
		{
			property: "og:description",
			content: "Confirmación de pedido y seguimiento de envío."
		},
		{
			property: "og:image",
			content: `${SITE_URL}/businessicon.jpg`
		},
		{
			property: "og:image:secure_url",
			content: `${SITE_URL}/businessicon.jpg`
		},
		{
			name: "twitter:image",
			content: `${SITE_URL}/businessicon.jpg`
		},
		{
			name: "robots",
			content: "noindex"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./reset-password-aktTn0tK.mjs");
var Route$6 = createFileRoute("/reset-password")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [{ title: "Restablecer contraseña — Te importamos" }, {
		name: "robots",
		content: "noindex, nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var Route$5 = createFileRoute("/admin/")({ loader: () => {
	throw redirect({ to: "/admin/productos" });
} });
var $$splitComponentImporter$4 = () => import("./admin.configuracion-DBXG2KaI.mjs");
var Route$4 = createFileRoute("/admin/configuracion")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [{ title: "Configuración de Categorías — Admin" }, {
		name: "robots",
		content: "noindex, nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./admin.ordenes-CbK9JyFj.mjs");
var Route$3 = createFileRoute("/admin/ordenes")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [{ title: "Panel de Órdenes — Admin" }, {
		name: "robots",
		content: "noindex, nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./admin.productos-DeT3zdyX.mjs");
var Route$2 = createFileRoute("/admin/productos")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({ meta: [{ title: "Panel de Productos — Admin" }, {
		name: "robots",
		content: "noindex, nofollow"
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./combo._index-CR0F9QOu.mjs");
var Route$1 = createFileRoute("/combo/$index")({
	loader: ({ context }) => {
		context.queryClient.ensureQueryData(storeQueryOptions);
	},
	head: () => ({
		meta: [
			{ title: "Combo en oferta — Te importamos" },
			{
				name: "description",
				content: "Comprá el combo completo para arrancar a revender: pack surtido de productos importados con precio de importador."
			},
			{
				property: "og:title",
				content: "Combo en oferta — Te importamos"
			},
			{
				property: "og:description",
				content: "Pack completo para revender, con pago online por MercadoPago."
			},
			{
				property: "og:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:image:secure_url",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				name: "twitter:image",
				content: `${SITE_URL}/businessicon.jpg`
			},
			{
				property: "og:url",
				content: `${SITE_URL}/`
			}
		],
		links: [{
			rel: "canonical",
			href: `${SITE_URL}/`
		}]
	}),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
/** Dado un array de tramos y una cantidad, devuelve el precio fijo aplicable (o null si no hay tramo). */
var $$splitComponentImporter = () => import("./producto._id-CAo1OYiF.mjs");
/** Galería de imágenes interactiva con miniaturas clickeables. */
var Route = createFileRoute("/producto/$id")({
	loader: async ({ context, params }) => {
		const data = await context.queryClient.ensureQueryData(storeQueryOptions);
		return { product: findProduct(data.products, params.id) };
	},
	head: ({ loaderData }) => {
		const product = loaderData?.product;
		const title = product?.nombre ? `${product.nombre} — Te importamos` : "Producto — Te importamos";
		const rawDesc = product?.descripcion?.replace(/[\r\n]+/g, " ").trim() || "";
		const description = rawDesc ? rawDesc.length > 160 ? rawDesc.slice(0, 157) + "..." : rawDesc : "Comprá online productos importados originales con descuentos por cantidad y envíos a todo el país.";
		const image = product?.imagen_url ? imageUrl(product.imagen_url) : void 0;
		const canonicalUrl = product?.id ? `${SITE_URL}/producto/${product.id}` : `${SITE_URL}/catalogo`;
		const price = product ? String(product.precio ?? "") : "";
		const category = product?.categoria?.trim();
		const productSchema = product ? {
			"@context": "https://schema.org",
			"@type": "Product",
			name: product.nombre,
			...image ? { image } : {},
			...description ? { description } : {},
			...category ? { category } : {},
			brand: {
				"@type": "Brand",
				name: "Te importamos"
			},
			offers: {
				"@type": "Offer",
				priceCurrency: "ARS",
				...price ? { price } : {},
				availability: "https://schema.org/InStock",
				itemCondition: "https://schema.org/NewCondition",
				url: canonicalUrl,
				seller: {
					"@type": "Organization",
					name: "Te importamos"
				},
				hasMerchantReturnPolicy: {
					"@type": "MerchantReturnPolicy",
					applicableCountry: "AR",
					returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted"
				}
			}
		} : null;
		const breadcrumbSchema = product ? {
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{
					"@type": "ListItem",
					position: 1,
					name: "Inicio",
					item: `${SITE_URL}/`
				},
				{
					"@type": "ListItem",
					position: 2,
					name: "Catálogo",
					item: `${SITE_URL}/catalogo`
				},
				...category ? [{
					"@type": "ListItem",
					position: 3,
					name: category,
					item: `${SITE_URL}/catalogo?categoria=${encodeURIComponent(category)}`
				}, {
					"@type": "ListItem",
					position: 4,
					name: product.nombre,
					item: canonicalUrl
				}] : [{
					"@type": "ListItem",
					position: 3,
					name: product.nombre,
					item: canonicalUrl
				}]
			]
		} : null;
		return {
			meta: [
				{ title },
				{
					name: "description",
					content: description
				},
				{
					property: "og:title",
					content: title
				},
				{
					property: "og:description",
					content: description
				},
				{
					property: "og:type",
					content: "product"
				},
				{
					property: "og:url",
					content: canonicalUrl
				},
				{
					name: "twitter:card",
					content: image ? "summary_large_image" : "summary"
				},
				{
					name: "twitter:title",
					content: title
				},
				{
					name: "twitter:description",
					content: description
				},
				...image ? [
					{
						property: "og:image",
						content: image
					},
					{
						property: "og:image:secure_url",
						content: image
					},
					{
						name: "twitter:image",
						content: image
					}
				] : [
					{
						property: "og:image",
						content: `${SITE_URL}/businessicon.jpg`
					},
					{
						property: "og:image:secure_url",
						content: `${SITE_URL}/businessicon.jpg`
					},
					{
						name: "twitter:image",
						content: `${SITE_URL}/businessicon.jpg`
					}
				]
			],
			links: [{
				rel: "canonical",
				href: canonicalUrl
			}],
			scripts: [...productSchema ? [{
				type: "application/ld+json",
				children: JSON.stringify(productSchema)
			}] : [], ...breadcrumbSchema ? [{
				type: "application/ld+json",
				children: JSON.stringify(breadcrumbSchema)
			}] : []]
		};
	},
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var IndexRoute = Route$13.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$14
});
var AuthRoute = Route$12.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$14
});
var CalculadoraRoute = Route$11.update({
	id: "/calculadora",
	path: "/calculadora",
	getParentRoute: () => Route$14
});
var CarritoRoute = Route$10.update({
	id: "/carrito",
	path: "/carrito",
	getParentRoute: () => Route$14
});
var CatalogoRoute = Route$9.update({
	id: "/catalogo",
	path: "/catalogo",
	getParentRoute: () => Route$14
});
var DesuscribirRoute = Route$8.update({
	id: "/desuscribir",
	path: "/desuscribir",
	getParentRoute: () => Route$14
});
var GraciasRoute = Route$7.update({
	id: "/gracias",
	path: "/gracias",
	getParentRoute: () => Route$14
});
var ResetPasswordRoute = Route$6.update({
	id: "/reset-password",
	path: "/reset-password",
	getParentRoute: () => Route$14
});
var AdminIndexRoute = Route$5.update({
	id: "/admin/",
	path: "/admin/",
	getParentRoute: () => Route$14
});
var rootRouteChildren = {
	IndexRoute,
	AuthRoute,
	CalculadoraRoute,
	CarritoRoute,
	CatalogoRoute,
	DesuscribirRoute,
	GraciasRoute,
	ResetPasswordRoute,
	AdminConfiguracionRoute: Route$4.update({
		id: "/admin/configuracion",
		path: "/admin/configuracion",
		getParentRoute: () => Route$14
	}),
	AdminOrdenesRoute: Route$3.update({
		id: "/admin/ordenes",
		path: "/admin/ordenes",
		getParentRoute: () => Route$14
	}),
	AdminProductosRoute: Route$2.update({
		id: "/admin/productos",
		path: "/admin/productos",
		getParentRoute: () => Route$14
	}),
	ComboIndexRoute: Route$1.update({
		id: "/combo/$index",
		path: "/combo/$index",
		getParentRoute: () => Route$14
	}),
	ProductoIdRoute: Route.update({
		id: "/producto/$id",
		path: "/producto/$id",
		getParentRoute: () => Route$14
	}),
	AdminIndexRoute
};
var routeTree = Route$14._addFileChildren(rootRouteChildren)._addFileTypes();
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
var getRouter = () => {
	const queryClient = new QueryClient({ defaultOptions: { queries: {
		staleTime: 3e5,
		gcTime: 9e5,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false
	} } });
	return createRouter({
		routeTree,
		context: { queryClient },
		scrollRestoration: true,
		defaultPreloadStaleTime: 3e5
	});
};
//#endregion
export { Route$8 as a, cn as c, storeQueryOptions as d, useAuth as f, Route$7 as i, Route$12 as l, Route as n, SiteFooter as o, useCart as p, Route$1 as r, SiteHeader as s, router_exports as t, EMPTY_SHIPPING as u };
