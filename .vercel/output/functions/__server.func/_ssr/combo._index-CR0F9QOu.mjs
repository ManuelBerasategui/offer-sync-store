import { i as __toESM } from "../_runtime.mjs";
import { H as toNumber, K as waLink, M as onImageError, O as money, U as transferDiscountPct, W as transferPrice, b as imageUrl } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { E as Minus, b as Plus } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, o as SiteFooter, p as useCart, r as Route$1, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { t as CheckoutFlow } from "./CheckoutFlow-watkGXkm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/combo._index-CR0F9QOu.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/** Dado un array de tramos y una cantidad, devuelve el precio fijo aplicable (o null si no hay tramo). */
function priceForQty(tiers, qty) {
	const sorted = [...tiers].sort((a, b) => b.units - a.units);
	for (const tier of sorted) if (qty >= tier.units) return tier.price;
	return null;
}
function ComboPage() {
	const { index } = Route$1.useParams();
	const navigate = useNavigate();
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { banners, config } = data;
	const cart = useCart();
	const [showCheckout, setShowCheckout] = (0, import_react.useState)(false);
	const [qty, setQty] = (0, import_react.useState)(1);
	const banner = banners[Number(index)];
	if (!banner) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-[1180px] px-4 py-20 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl",
					children: "Combo no disponible"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "btn-base grad-urgente mt-6 text-primary-foreground",
					children: "Ir al inicio"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
	const basePrice = toNumber(banner.precio);
	const discPct = transferDiscountPct(config);
	const rawTiers = banner.quantity_tiers ?? banner.link;
	const tiers = (0, import_react.useMemo)(() => {
		if (Array.isArray(rawTiers) && rawTiers.length > 0) return rawTiers;
		if (typeof rawTiers === "string" && rawTiers.trim().startsWith("[")) try {
			const parsed = JSON.parse(rawTiers);
			if (Array.isArray(parsed) && parsed.length > 0) return parsed;
		} catch {}
		return null;
	}, [rawTiers]);
	const unitListPrice = (0, import_react.useMemo)(() => {
		if (tiers) {
			const tierPrice = priceForQty(tiers, qty);
			if (tierPrice !== null) return tierPrice;
		}
		return basePrice;
	}, [
		tiers,
		qty,
		basePrice
	]);
	const unitTransferPrice = transferPrice(unitListPrice, discPct);
	const totalListPrice = unitListPrice * qty;
	const totalTransferPrice = unitTransferPrice * qty;
	const item = {
		id: `combo-${index}`,
		nombre: banner.titulo ?? "Combo",
		qty,
		unitPrice: Math.round(unitListPrice),
		basePrice: Math.round(basePrice),
		imagen: banner.imagen_url || imageUrl(banner.imagen_url)
	};
	const sortedTiers = (0, import_react.useMemo)(() => {
		return tiers ? [...tiers].sort((a, b) => a.units - b.units) : [];
	}, [tiers]);
	(0, import_react.useMemo)(() => {
		if (!tiers) return null;
		return [...tiers].sort((a, b) => b.units - a.units).find((t) => qty >= t.units) ?? null;
	}, [tiers, qty]);
	const nextTier = (0, import_react.useMemo)(() => {
		if (!tiers) return null;
		return sortedTiers.find((t) => t.units > qty) ?? null;
	}, [
		tiers,
		sortedTiers,
		qty
	]);
	const unitSavings = basePrice > unitListPrice ? basePrice - unitListPrice : 0;
	unitSavings * qty;
	const savingsPct = basePrice > 0 && unitSavings > 0 ? Math.round(unitSavings / basePrice * 100) : 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/",
					className: "text-sm font-semibold text-muted-foreground hover:text-primary",
					children: "← Volver al inicio"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 grid gap-8 lg:grid-cols-2 lg:items-start",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface lg:sticky lg:top-24",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: imageUrl(banner.imagen_url) || "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2371717a'%3ESin imagen%3C/text%3E%3C/svg%3E",
							alt: banner.titulo ?? "Combo en oferta",
							decoding: "async",
							referrerPolicy: "no-referrer",
							className: "h-full w-full object-cover",
							onError: onImageError(banner.imagen_url)
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground",
							children: "Combo en oferta"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "mt-3 font-sans text-[clamp(24px,6vw,36px)] font-bold normal-case tracking-tight",
							children: banner.titulo
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground",
							children: (banner.subtitulo ?? "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim()
						}),
						basePrice > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 flex flex-col gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-baseline gap-2",
								children: [
									unitSavings > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tabular-nums text-base text-muted-foreground line-through",
										children: money(transferPrice(basePrice, discPct))
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "tabular-nums text-3xl font-bold text-foreground",
										children: money(unitTransferPrice)
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400",
										children: [discPct, "% OFF con Transferencia"]
									}),
									savingsPct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs font-bold text-primary",
										children: [
											"(",
											savingsPct,
											"% OFF x volumen)"
										]
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: [
									"o ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-foreground/80",
										children: money(unitListPrice)
									}),
									" con Mercado Pago"
								]
							})]
						}),
						tiers && sortedTiers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs text-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-start gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-base shrink-0 mt-0.5",
									children: "🎁"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0 flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "font-bold text-primary text-xs sm:text-sm",
											children: "Descuento por cantidad en este combo:"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
											className: "mt-1.5 space-y-1 text-muted-foreground text-[11px] sm:text-xs",
											children: sortedTiers.map((tier) => {
												const tierSavings = basePrice > tier.price ? basePrice - tier.price : 0;
												const tierPct = basePrice > 0 && tierSavings > 0 ? Math.round(tierSavings / basePrice * 100) : 0;
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
													className: "flex items-center gap-1.5 flex-wrap",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "font-semibold text-foreground",
														children: [
															"• Llevando ",
															tier.units,
															" u. o más:"
														]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-bold text-primary",
														children: tierPct > 0 ? `${tierPct}% OFF` : ""
													})]
												}, tier.units);
											})
										}),
										nextTier ? (() => {
											const nextSavings = basePrice > nextTier.price ? basePrice - nextTier.price : 0;
											const nextPct = basePrice > 0 && nextSavings > 0 ? Math.round(nextSavings / basePrice * 100) : 0;
											return nextPct > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "shrink-0",
													children: "💡"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Llevá ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
														className: "text-foreground",
														children: [
															nextTier.units - qty,
															" unidad",
															nextTier.units - qty !== 1 ? "es" : "",
															" más"
														]
													}),
													" para activar el",
													" ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
														className: "text-primary",
														children: [nextPct, "% OFF"]
													}),
													"."
												] })]
											}) : null;
										})() : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground",
											children: "Descuento automático por volumen al agregar al carrito."
										})
									]
								})]
							})
						}),
						basePrice > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
									children: "Cantidad"
								}), qty > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "text-xs font-semibold text-muted-foreground",
									children: [
										"Total: ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-foreground",
											children: money(totalTransferPrice)
										}),
										" (Transf.) /",
										" ",
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-foreground/80",
											children: money(totalListPrice)
										})
									]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 flex items-center gap-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setQty((q) => Math.max(1, q - 1)),
										disabled: qty <= 1,
										className: "flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 transition-colors",
										"aria-label": "Reducir cantidad",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-4 w-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "min-w-[2rem] text-center text-lg font-bold tabular-nums",
										children: qty
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setQty((q) => q + 1),
										className: "flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:border-primary hover:text-primary transition-colors",
										"aria-label": "Aumentar cantidad",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-xs text-muted-foreground font-medium",
										children: [
											"(",
											money(unitTransferPrice),
											" c/u transf.)"
										]
									})
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-6 flex flex-col gap-3",
							children: showCheckout ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckoutFlow, {
								items: [{
									nombre: item.nombre,
									qty,
									unitPrice: item.unitPrice
								}],
								total: item.unitPrice * qty
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setShowCheckout(true),
								disabled: basePrice <= 0,
								className: "btn-base grad-urgente text-primary-foreground disabled:opacity-60",
								children: "Comprar ya"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									cart.add(item);
									navigate({ to: "/carrito" });
								},
								className: "btn-base border border-border text-foreground hover:border-primary hover:text-primary",
								children: "Agregar al carrito"
							})] })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
							className: "btn-base mt-6 w-full bg-whatsapp text-whatsapp-foreground",
							href: waLink(config, banner.titulo),
							target: "_blank",
							rel: "noopener noreferrer",
							children: "Contactar por WhatsApp"
						})
					] })]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
//#endregion
export { ComboPage as component };
