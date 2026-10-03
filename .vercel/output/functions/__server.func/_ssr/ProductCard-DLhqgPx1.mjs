import { B as thumbnailUrl, I as priceOf, M as onImageError, N as originalPriceOf, O as money, S as isLongSleeve, T as isWhatsappOnly, U as transferDiscountPct, V as tiersOf, W as transferPrice, j as offerDiscountPct, n as JERSEY_FAN_ML_TIERS, q as waOnlyReasonOf, r as JERSEY_FAN_TIERS, s as WA_ONLY_CONFIG, x as isCamiseta, y as hasOffer } from "./store-DppLUI8p.mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ProductCard-DLhqgPx1.js
var import_jsx_runtime = require_jsx_runtime();
function ProductCard({ p, config, index = 0 }) {
	const isCamisetaProd = isCamiseta(p.categoria, p.nombre);
	const isML = isCamisetaProd && isLongSleeve(p.nombre);
	const usdRate = Number(config?.["dolar_cotizacion"] ?? 0);
	const fanTiers = isML ? JERSEY_FAN_ML_TIERS : JERSEY_FAN_TIERS;
	const minJerseyUsd = fanTiers[fanTiers.length - 1]?.unitUsd ?? (isML ? 16 : 12);
	const baseJerseyUsd = fanTiers[0]?.unitUsd ?? (isML ? 22.5 : 18.5);
	const minJerseyArs = usdRate > 0 ? Math.round(minJerseyUsd * 1.07 * usdRate) : null;
	const baseJerseyArs = usdRate > 0 ? Math.round(baseJerseyUsd * 1.07 * usdRate) : null;
	const offer = hasOffer(p);
	const offerPct = offer ? offerDiscountPct(p) : 0;
	const consultar = isWhatsappOnly(p);
	const waOnlyReason = waOnlyReasonOf(p);
	const isWaPriceHidden = waOnlyReason ? Boolean(WA_ONLY_CONFIG[waOnlyReason]?.hidePrice) : false;
	const basePrice = priceOf(p);
	const origPrice = originalPriceOf(p);
	const isDiscounted = offer && origPrice > basePrice;
	const hidePrice = isWaPriceHidden || basePrice <= 0 || isNaN(basePrice);
	const tiers = tiersOf(p);
	const maxTier = tiers.length > 0 ? tiers[tiers.length - 1] : null;
	const maxPercent = !hidePrice && !consultar ? Math.max(maxTier?.percent ?? 12, 12) : null;
	const discPct = transferDiscountPct(config);
	const tPrice = transferPrice(basePrice, discPct);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-[0_10px_30px_-18px_oklch(0_0_0/0.35)]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/producto/$id",
			params: { id: String(p.id ?? p.nombre ?? "") },
			className: "relative block aspect-square bg-surface",
			children: [offer && !consultar && !hidePrice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "absolute left-2 top-2 z-10 rounded-md bg-red-600 px-2 py-1 text-[10px] font-extrabold uppercase text-white shadow-sm flex items-center gap-1",
				children: ["🔥 ", offerPct > 0 ? `-${offerPct}% OFF` : "OFERTA"]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: thumbnailUrl(p.imagen_url, "md") || "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2371717a'%3ESin imagen%3C/text%3E%3C/svg%3E",
				alt: p.nombre ?? "Producto",
				width: 320,
				height: 320,
				loading: index < 6 ? void 0 : "lazy",
				decoding: index < 6 ? void 0 : "async",
				fetchPriority: index < 6 ? "high" : void 0,
				referrerPolicy: "no-referrer",
				className: "h-full w-full object-contain p-2",
				onError: onImageError(p.imagen_url)
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-1 flex-col gap-1 p-3 sm:p-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground",
					children: p.categoria || "General"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/producto/$id",
					params: { id: String(p.id ?? p.nombre ?? "") },
					className: "font-sans text-[15px] font-semibold normal-case leading-snug tracking-normal hover:text-primary line-clamp-2",
					children: p.nombre
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-auto pt-2",
					children: isCamisetaProd ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline gap-1.5 flex-wrap",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
									children: "Desde"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums text-lg font-bold text-foreground",
									children: minJerseyArs ? money(minJerseyArs) : "Ver escala"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400",
									children: "Mayorista"
								}),
								isML && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400",
									children: "Manga Larga"
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] text-muted-foreground mt-0.5",
							children: baseJerseyArs ? `10 u. a ${money(baseJerseyArs)} c/u` : "Venta desde 10 u."
						})]
					}) }) : hidePrice || consultar ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-sm font-semibold text-muted-foreground",
						children: waOnlyReason === "china" || waOnlyReason === "whatsapp_only" ? "Consultar por WhatsApp" : "Consultá el precio"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col",
						children: [
							isDiscounted && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 text-xs text-muted-foreground mb-0.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "line-through tabular-nums",
									children: money(origPrice)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-[10px] font-bold text-red-600 dark:text-red-400",
									children: [
										"-",
										offerPct,
										"% OFF"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-1.5 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums text-lg font-bold text-foreground",
									children: money(tPrice)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400",
									children: [discPct, "% OFF Transf."]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-muted-foreground",
								children: [
									"o ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-foreground/80",
										children: money(basePrice)
									}),
									" con Mercado Pago"
								]
							})
						]
					}), maxPercent !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "mt-1.5 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary",
						children: [
							"🎁 Hasta ",
							maxPercent,
							"% OFF x mayor"
						]
					})] })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/producto/$id",
					params: { id: String(p.id ?? p.nombre ?? "") },
					className: "btn-base mt-2 w-full bg-foreground px-3 py-2.5 text-[11px] text-background",
					children: isCamisetaProd ? "Ver opciones y precios" : "Ver producto"
				})
			]
		})]
	});
}
//#endregion
export { ProductCard as t };
