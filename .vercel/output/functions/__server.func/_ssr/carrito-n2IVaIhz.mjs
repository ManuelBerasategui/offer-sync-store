import { i as __toESM } from "../_runtime.mjs";
import { A as normCat, B as thumbnailUrl, K as waLink, M as onImageError, N as originalPriceOf, O as money, P as parseCategoryRules, d as checkCategoryMins, j as offerDiscountPct, k as moqGroupOf, m as findRuleForCat, p as findProduct, u as categoryDiscountForUnits, w as isSuplemento, y as hasOffer } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { E as Minus, b as Plus, l as Sparkles, n as X, s as Tag } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, f as useAuth, o as SiteFooter, p as useCart, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { v as validatePromoCoupon } from "./products.functions-BgXArIxF.mjs";
import { t as CheckoutFlow } from "./CheckoutFlow-watkGXkm.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/carrito-n2IVaIhz.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
/**
* Input de cantidad para el carrito con buffer de display.
* Permite borrar el campo y escribir números multi-dígito en mobile
* sin que el valor salte a 1 en cada keystroke.
*/
function CartQtyInput({ itemId, qty, nombre, onDecrease, onIncrease, onSetQty }) {
	const [buffer, setBuffer] = (0, import_react.useState)(String(qty));
	(0, import_react.useEffect)(() => {
		setBuffer(String(qty));
	}, [qty]);
	const commit = (val) => {
		const parsed = parseInt(val.trim(), 10);
		if (!isNaN(parsed) && parsed > 0) {
			onSetQty(parsed);
			setBuffer(String(parsed));
		} else setBuffer(String(qty));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center rounded-lg border border-border bg-surface",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": `Restar una unidad de ${nombre}`,
				onClick: onDecrease,
				className: "flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all rounded-l-md",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-3 w-3" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "text",
				inputMode: "numeric",
				pattern: "[0-9]*",
				"aria-label": `Cantidad de ${nombre}`,
				value: buffer,
				onChange: (e) => {
					const raw = e.target.value.replace(/\D/g, "");
					setBuffer(raw);
				},
				onBlur: (e) => commit(e.target.value),
				onKeyDown: (e) => {
					if (e.key === "Enter") e.currentTarget.blur();
				},
				className: "h-7 w-11 bg-transparent text-center text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 select-all"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": `Sumar una unidad de ${nombre}`,
				onClick: onIncrease,
				className: "flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95 transition-all rounded-r-md",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3" })
			})
		]
	});
}
function CarritoPage() {
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { products, config, banners = [] } = data;
	const cart = useCart();
	const { user, session } = useAuth();
	const [couponInput, setCouponInput] = (0, import_react.useState)("");
	const [appliedCoupon, setAppliedCoupon] = (0, import_react.useState)(null);
	const [couponLoading, setCouponLoading] = (0, import_react.useState)(false);
	const [couponError, setCouponError] = (0, import_react.useState)("");
	const [couponSuccess, setCouponSuccess] = (0, import_react.useState)("");
	const couponPct = appliedCoupon?.discountPct ?? 0;
	const couponDiscountAmount = couponPct > 0 ? Math.round(cart.total * (couponPct / 100)) : 0;
	async function handleApplyCoupon(e) {
		if (e) e.preventDefault();
		const code = couponInput.trim().toUpperCase();
		if (!code) {
			setCouponError("Ingresá un código promocional.");
			return;
		}
		if (!user) {
			setCouponError("Debés iniciar sesión con tu cuenta para reclamar el cupón.");
			return;
		}
		setCouponLoading(true);
		setCouponError("");
		setCouponSuccess("");
		try {
			const res = await validatePromoCoupon({ data: {
				code,
				userId: user.id,
				email: user.email ?? "",
				...session?.access_token ? { token: session.access_token } : {}
			} });
			if (!res.valid || res.error) {
				setCouponError(res.error || "El código no es válido.");
				setAppliedCoupon(null);
			} else {
				const validCode = res.code || code;
				const disc = res.discountPct || 5;
				setAppliedCoupon({
					code: validCode,
					discountPct: disc
				});
				setCouponSuccess(`¡Descuento aplicado! (${disc}% OFF)`);
				setCouponError("");
			}
		} catch {
			setCouponError("Error al validar el cupón.");
		} finally {
			setCouponLoading(false);
		}
	}
	function handleRemoveCoupon() {
		setAppliedCoupon(null);
		setCouponInput("");
		setCouponSuccess("");
		setCouponError("");
	}
	const cartItemsWithCat = (0, import_react.useMemo)(() => {
		return cart.items.map((i) => {
			const prod = (i.productId ? findProduct(products, i.productId) : void 0) ?? findProduct(products, i.id) ?? findProduct(products, i.nombre) ?? products.find((p) => i.id && String(i.id).startsWith(String(p.id) + "-")) ?? products.find((p) => i.nombre && p.nombre && i.nombre.toLowerCase().startsWith(p.nombre.toLowerCase()));
			const cat = i.categoria || prod?.categoria || "";
			const rawComboIdx = i.id.startsWith("combo-") ? i.id.replace("combo-", "") : null;
			const comboBanner = rawComboIdx !== null && !isNaN(Number(rawComboIdx)) ? banners[Number(rawComboIdx)] : banners.find((b) => b.titulo?.trim().toLowerCase() === i.nombre.trim().toLowerCase());
			const resolvedImg = i.imagen || comboBanner?.imagen_url || prod?.imagen_url || void 0;
			return {
				...i,
				categoria: cat,
				imagen: resolvedImg
			};
		});
	}, [
		cart.items,
		products,
		banners
	]);
	const items = cartItemsWithCat.map((i) => ({
		nombre: i.nombre,
		qty: i.qty,
		unitPrice: i.unitPrice,
		productId: i.productId
	}));
	const catRules = parseCategoryRules(config);
	const matesRuleMatch = findRuleForCat(normCat("Mates"), catRules);
	const matesUnits = cartItemsWithCat.reduce((sum, item) => {
		const prod = item.productId ? findProduct(products, item.productId) : findProduct(products, item.id) ?? findProduct(products, item.nombre);
		return sum + ((prod ? moqGroupOf(prod) : null) === "mates" ? item.qty : 0);
	}, 0);
	const matesDiscountPct = matesRuleMatch ? categoryDiscountForUnits(matesRuleMatch.rule.discountTiers, matesUnits) : 0;
	const dynamicViolations = checkCategoryMins(cartItemsWithCat.map((i) => {
		if (i.id.startsWith("combo-")) return {
			nombre: i.nombre,
			categoria: i.categoria,
			moq_group: "none",
			qty: i.qty,
			unitPrice: i.unitPrice
		};
		const prod = i.productId ? findProduct(products, i.productId) : findProduct(products, i.id) ?? findProduct(products, i.nombre);
		const moq_group = prod ? moqGroupOf(prod) ?? void 0 : void 0;
		return {
			nombre: i.nombre,
			categoria: i.categoria,
			moq_group,
			qty: i.qty,
			unitPrice: i.unitPrice
		};
	}), catRules).filter((v) => normCat(v.category) !== normCat("Suplementos"));
	const totalSuplementos = cartItemsWithCat.filter((i) => isSuplemento(i.categoria, i.nombre)).reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
	const minSuplementos = catRules[normCat("Suplementos")]?.minAmount || 25e4;
	const suplementosViolation = totalSuplementos > 0 && totalSuplementos < minSuplementos ? {
		category: "Suplementación",
		type: "amount",
		min: minSuplementos,
		current: totalSuplementos
	} : null;
	const minViolations = suplementosViolation ? [suplementosViolation, ...dynamicViolations] : dynamicViolations;
	const hasViolations = minViolations.length > 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold tracking-tight",
					children: "Tu carrito"
				}), cart.items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 rounded-2xl border border-border bg-card p-8 text-center sm:p-12",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-muted-foreground",
						children: "Tu carrito está vacío."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/catalogo",
						className: "btn-base grad-urgente mt-4 inline-block text-primary-foreground",
						children: "Ver catálogo"
					})]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-6 divide-y divide-border rounded-xl border border-border bg-card",
						children: cartItemsWithCat.map((i) => {
							const prod = (i.productId ? findProduct(products, i.productId) : void 0) ?? findProduct(products, i.id) ?? findProduct(products, i.nombre) ?? products.find((p) => i.id && String(i.id).startsWith(String(p.id) + "-")) ?? products.find((p) => i.nombre && p.nombre && i.nombre.toLowerCase().startsWith(p.nombre.toLowerCase()));
							isSuplemento(i.categoria, i.nombre);
							const isCombo = i.id.startsWith("combo-");
							const rawComboIndex = isCombo ? i.id.replace("combo-", "") : null;
							const comboBanner = rawComboIndex !== null && !isNaN(Number(rawComboIndex)) ? banners[Number(rawComboIndex)] : banners.find((b) => b.titulo?.trim().toLowerCase() === i.nombre.trim().toLowerCase());
							const comboIndex = rawComboIndex !== null && !isNaN(Number(rawComboIndex)) && banners[Number(rawComboIndex)] ? rawComboIndex : comboBanner ? String(banners.indexOf(comboBanner)) : null;
							const rawImg = i.imagen || comboBanner?.imagen_url || prod?.imagen_url;
							const itemImage = thumbnailUrl(rawImg) || "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2371717a'%3ESin imagen%3C/text%3E%3C/svg%3E";
							const prodHasOffer = prod ? hasOffer(prod) : false;
							const prodOrigPrice = prod && prodHasOffer ? originalPriceOf(prod) : 0;
							prod && prodHasOffer && offerDiscountPct(prod);
							const displayOrigPrice = i.basePrice && i.unitPrice < i.basePrice ? i.basePrice : prodHasOffer && prodOrigPrice > i.unitPrice ? prodOrigPrice : 0;
							const displayDiscountPct = displayOrigPrice > 0 ? Math.round((displayOrigPrice - i.unitPrice) / displayOrigPrice * 100) : 0;
							const isOfferDiscount = prodHasOffer && prodOrigPrice > i.unitPrice && !(i.basePrice && i.unitPrice < i.basePrice);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4",
								children: [prod?.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/producto/$id",
									params: { id: String(prod.id) },
									className: "flex min-w-0 flex-1 items-center gap-3 group cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: itemImage,
										alt: i.nombre,
										className: "h-12 w-12 shrink-0 rounded-lg object-contain bg-surface p-1 border border-border/50 sm:h-14 sm:w-14 transition-transform group-hover:scale-105",
										referrerPolicy: "no-referrer",
										onError: onImageError(rawImg)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-sm font-semibold sm:text-base text-foreground group-hover:text-primary transition-colors",
											children: i.nombre
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5",
											children: [
												displayOrigPrice > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "line-through text-[11px] opacity-75",
													children: money(displayOrigPrice)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-semibold text-foreground",
													children: [money(i.unitPrice), " c/u"]
												}),
												displayDiscountPct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: `text-[10px] font-bold px-1.5 py-0.5 rounded ${isOfferDiscount ? "text-red-600 dark:text-red-400 bg-red-500/10" : "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"}`,
													children: isOfferDiscount ? `🔥 -${displayDiscountPct}% OFF` : `${displayDiscountPct}% OFF x cantidad`
												})
											]
										})]
									})]
								}) : isCombo && comboIndex !== null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/combo/$index",
									params: { index: comboIndex },
									className: "flex min-w-0 flex-1 items-center gap-3 group cursor-pointer",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: itemImage,
										alt: i.nombre,
										className: "h-12 w-12 shrink-0 rounded-lg object-contain bg-surface p-1 border border-border/50 sm:h-14 sm:w-14 transition-transform group-hover:scale-105",
										referrerPolicy: "no-referrer",
										onError: onImageError(rawImg)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20 uppercase shrink-0",
												children: "Combo"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "truncate text-sm font-semibold sm:text-base text-foreground group-hover:text-primary transition-colors",
												children: i.nombre
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5",
											children: [
												i.basePrice && i.unitPrice < i.basePrice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "line-through text-[11px] opacity-75",
													children: money(i.basePrice)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-semibold text-foreground",
													children: [money(i.unitPrice), " c/u"]
												}),
												i.basePrice && i.unitPrice < i.basePrice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded",
													children: [Math.round((i.basePrice - i.unitPrice) / i.basePrice * 100), "% OFF x cantidad"]
												})
											]
										})]
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex min-w-0 flex-1 items-center gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: itemImage,
										alt: i.nombre,
										className: "h-12 w-12 shrink-0 rounded-lg object-contain bg-surface p-1 border border-border/50 sm:h-14 sm:w-14",
										referrerPolicy: "no-referrer",
										onError: onImageError(rawImg)
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "truncate text-sm font-semibold sm:text-base",
											children: i.nombre
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap mt-0.5",
											children: [
												i.basePrice && i.unitPrice < i.basePrice && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "line-through text-[11px] opacity-75",
													children: money(i.basePrice)
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-semibold text-foreground",
													children: [money(i.unitPrice), " c/u"]
												}),
												i.basePrice && i.unitPrice < i.basePrice && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded",
													children: [Math.round((i.basePrice - i.unitPrice) / i.basePrice * 100), "% OFF x cantidad"]
												})
											]
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex shrink-0 items-center justify-between gap-3 sm:justify-end",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartQtyInput, {
											itemId: i.id,
											qty: i.qty,
											nombre: i.nombre,
											onDecrease: () => cart.setQty(i.id, i.qty - 1),
											onIncrease: () => cart.setQty(i.id, i.qty + 1),
											onSetQty: (q) => cart.setQty(i.id, q)
										}, i.id),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "w-20 shrink-0 text-right tabular-nums text-sm font-bold sm:w-24",
											children: money(i.unitPrice * i.qty)
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => cart.remove(i.id),
											className: "shrink-0 text-xs font-semibold text-muted-foreground hover:text-destructive",
											children: "Quitar"
										})
									]
								})]
							}, i.id);
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 rounded-xl border border-primary/20 bg-card p-4 shadow-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 mb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs font-bold uppercase tracking-wider text-foreground",
								children: "Código de descuento"
							})]
						}), !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-surface p-3 text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-muted-foreground",
								children: "💡 ¿Tenés un cupón de descuento? Iniciá sesión con tu cuenta para canjearlo."
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
								to: "/auth",
								search: {
									mode: "login",
									redirect: "/carrito"
								},
								className: "shrink-0 font-bold text-primary hover:underline",
								children: "Iniciar sesión →"
							})]
						}) : appliedCoupon ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-emerald-600" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs font-bold text-emerald-700 dark:text-emerald-400",
									children: [
										"¡Cupón ",
										appliedCoupon.code,
										" aplicado!"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-[11px] text-muted-foreground",
									children: [appliedCoupon.discountPct, "% OFF adicional en el total de tu pedido"]
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: handleRemoveCoupon,
								className: "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" }), " Quitar"]
							})]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							onSubmit: handleApplyCoupon,
							className: "flex flex-col gap-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										placeholder: "Ingresá tu código de descuento",
										value: couponInput,
										onChange: (e) => setCouponInput(e.target.value.toUpperCase()),
										className: "input-base font-mono uppercase text-xs tracking-wider"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										disabled: couponLoading || !couponInput.trim(),
										className: "btn-base bg-primary text-primary-foreground text-xs font-bold px-4 hover:opacity-90 disabled:opacity-50",
										children: couponLoading ? "Validando..." : "Aplicar"
									})]
								}),
								couponError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs font-semibold text-destructive mt-1",
									children: ["⚠️ ", couponError]
								}),
								couponSuccess && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs font-semibold text-emerald-600 mt-1",
									children: ["✓ ", couponSuccess]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-5",
						children: [
							matesUnits > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-semibold text-foreground",
									children: [
										"Mates: ",
										matesUnits,
										" unidad",
										matesUnits !== 1 ? "es" : ""
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-primary",
									children: matesDiscountPct > 0 ? `${matesDiscountPct}% OFF aplicado` : "5% OFF desde 5 unidades"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-muted-foreground font-medium",
									children: "Subtotal de lista:"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums font-semibold text-foreground",
									children: money(cart.total)
								})]
							}),
							appliedCoupon && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between text-xs text-emerald-600 font-semibold",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
									"Descuento (",
									appliedCoupon.discountPct,
									"% OFF):"
								] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "tabular-nums",
									children: ["-", money(couponDiscountAmount)]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[11px] text-muted-foreground pt-1 border-t border-border/40",
								children: "El precio final según tu método de pago se muestra en el checkout ↓"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: hasViolations ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-4",
							children: minViolations.map((v, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-soft border border-amber-500/30 bg-amber-500/5 p-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-sm font-semibold text-amber-700 dark:text-amber-400",
										children: ["⚠️ ", v.type === "amount" ? `El pedido mínimo en ${v.category} es de ${money(v.min)}` : `El pedido mínimo en ${v.category} es de ${v.min} unidad${v.min !== 1 ? "es" : ""}`]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1.5 text-xs text-muted-foreground",
										children: v.type === "amount" ? `Llevás ${money(v.current)} en ${v.category}. Necesitás agregar ${money(v.min - v.current)} más.` : (() => {
											const miss = v.min - v.current;
											return `Llevás ${v.current} unidad${v.current !== 1 ? "es" : ""} de ${v.category}. Te falta${miss !== 1 ? "n" : ""} ${miss} para alcanzar el mínimo de ${v.min}.`;
										})()
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/catalogo",
										className: "btn-base grad-urgente mt-4 text-primary-foreground",
										children: "Seguir comprando"
									})
								]
							}, idx))
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckoutFlow, {
							items,
							total: cart.total,
							appliedCoupon
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "btn-base mt-3 w-full bg-whatsapp text-whatsapp-foreground",
						href: waLink(config),
						target: "_blank",
						rel: "noopener noreferrer",
						children: "Contactar por WhatsApp"
					})
				] })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
//#endregion
export { CarritoPage as component };
