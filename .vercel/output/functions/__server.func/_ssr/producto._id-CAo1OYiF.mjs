import { i as __toESM } from "../_runtime.mjs";
import { A as normCat, B as thumbnailUrl, D as meetsMoq, G as unitPriceFor, I as priceOf, K as waLink, M as onImageError, N as originalPriceOf, O as money, P as parseCategoryRules, R as sanitizeUrl, S as isLongSleeve, T as isWhatsappOnly, U as transferDiscountPct, V as tiersOf, W as transferPrice, a as JERSEY_PLAYER_TIERS, b as imageUrl, c as calcJerseyUnitPrice, d as checkCategoryMins, f as discountFor, h as galleryImages, i as JERSEY_PLAYER_ML_TIERS, j as offerDiscountPct, k as moqGroupOf, m as findRuleForCat, n as JERSEY_FAN_ML_TIERS, o as SUPLEMENTOS_MSG, p as findProduct, q as waOnlyReasonOf, r as JERSEY_FAN_TIERS, s as WA_ONLY_CONFIG, u as categoryDiscountForUnits, v as hasMoq, w as isSuplemento, x as isCamiseta, y as hasOffer } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { B as CircleCheck } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, n as Route, o as SiteFooter, p as useCart, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { a as DialogFooter, i as DialogDescription, n as Dialog, o as DialogHeader, r as DialogContent, s as DialogTitle, t as CheckoutFlow } from "./CheckoutFlow-watkGXkm.mjs";
import { i as Stars, n as REVIEWS } from "./Social-C2yjfee4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/producto._id-CAo1OYiF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function JerseyProductUI({ product, talles, config }) {
	const productName = product.nombre ?? "Camiseta";
	const cart = useCart();
	const navigate = useNavigate();
	const [selectedTalle, setSelectedTalle] = (0, import_react.useState)(talles[0] ?? "S");
	const [talleError, setTalleError] = (0, import_react.useState)(false);
	const [version, setVersion] = (0, import_react.useState)("fan");
	const [badge, setBadge] = (0, import_react.useState)("no");
	const [qty, setQty] = (0, import_react.useState)(10);
	const [qtyStr, setQtyStr] = (0, import_react.useState)("10");
	const [showCheckout, setShowCheckout] = (0, import_react.useState)(false);
	const [addedToCart, setAddedToCart] = (0, import_react.useState)(false);
	const isML = isLongSleeve(productName);
	const tiers = isML ? version === "player" ? JERSEY_PLAYER_ML_TIERS : JERSEY_FAN_ML_TIERS : version === "player" ? JERSEY_PLAYER_TIERS : JERSEY_FAN_TIERS;
	const activeTier = [...tiers].sort((a, b) => b.qty - a.qty).find((t) => qty >= t.qty) ?? tiers[0];
	const nextTier = [...tiers].sort((a, b) => a.qty - b.qty).find((t) => t.qty > qty);
	const usdRate = Number(config["dolar_cotizacion"] ?? 0);
	const badgeExtraArs = badge === "yes" ? usdRate > 0 ? Math.round(1.07 * usdRate) : 0 : 0;
	const isExtraSize = selectedTalle === "3XL" || selectedTalle === "4XL";
	const extraSizeArs = isExtraSize ? usdRate > 0 ? Math.round(1.07 * usdRate) : 0 : 0;
	const unitArs = usdRate > 0 ? Math.round(activeTier.unitUsd * 1.07 * usdRate) + extraSizeArs + badgeExtraArs : null;
	const totalArs = unitArs !== null ? unitArs * qty : null;
	const fullItemName = `${productName} (Talle: ${selectedTalle || "S"} - ${version === "player" ? "Versión Jugador (Personalizado Nombre y Número)" : "Versión Fan (Sin personalizar)"}${badge === "yes" ? " - Con Badge" : ""})`;
	const phone = (config["whatsapp_individual"] ?? config["whatsapp_numero"] ?? "5493418051515").replace(/\D/g, "");
	/** Abre WhatsApp para coordinar el badge deseado y cerrar la venta */
	function handleBadgeWhatsApp() {
		const talleStr = selectedTalle || talles[0] || "S";
		const versionStr = version === "player" ? "Jugador (Personalizado Nombre y Número)" : "Fan (Sin personalizar)";
		const priceStr = unitArs !== null ? ` — $${unitArs.toLocaleString("es-AR")} c/u` : "";
		const totalStr = totalArs !== null ? ` — Total: $${totalArs.toLocaleString("es-AR")}` : "";
		const msg = `Hola! Quiero que tenga el siguiente badge para la camiseta: ${productName}\n• Talle: ${talleStr}\n• Versión: ${versionStr}\n• Cantidad: ${qty} unidades${priceStr}${totalStr}`;
		const href = sanitizeUrl(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
		if (href) window.open(href, "_blank", "noopener,noreferrer");
	}
	/** Selecciona badge y abre WhatsApp para coordinar el modelo deseado */
	function handleSelectBadgeYes() {
		setBadge("yes");
		handleBadgeWhatsApp();
	}
	/** Arma el mensaje de WhatsApp con todos los datos del pedido */
	function buildWaMessage() {
		const talleStr = selectedTalle || talles[0] || "S";
		const versionStr = version === "player" ? "Jugador (Personalizado Nombre y Número)" : "Fan (Sin personalizar)";
		const badgeStr = badge === "yes" ? "Sí (con badge oficial)" : "No";
		const qtyStr = String(qty);
		const priceStr = unitArs !== null ? ` — $${unitArs.toLocaleString("es-AR")} c/u` : "";
		const totalStr = totalArs !== null ? ` — Total: $${totalArs.toLocaleString("es-AR")}` : "";
		return `Hola! Quiero hacer un pedido de camisetas:\n🏷️ Producto: ${productName}\n📐 Talle: ${talleStr}\n⚽ Versión: ${versionStr}\n🏅 Badge: ${badgeStr}\n📦 Cantidad: ${qtyStr} unidades${priceStr}${totalStr}`;
	}
	function handleWhatsApp() {
		const talleToUse = selectedTalle || talles[0] || "S";
		if (!selectedTalle) setSelectedTalle(talleToUse);
		const msg = buildWaMessage();
		const href = sanitizeUrl(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
		if (href) window.open(href, "_blank", "noopener,noreferrer");
	}
	function handleBuyNow() {
		if (qty < 10) return;
		const talleToUse = selectedTalle || talles[0] || "S";
		if (!selectedTalle) setSelectedTalle(talleToUse);
		setShowCheckout(true);
	}
	function handleAddToCart() {
		const talleToUse = selectedTalle || talles[0] || "S";
		if (!selectedTalle) setSelectedTalle(talleToUse);
		const currentQty = Math.max(10, parseInt(qtyStr, 10) || qty || 10);
		const fullItem = `${productName} (Talle: ${talleToUse} - ${version === "player" ? "Versión Jugador (Personalizado Nombre y Número)" : "Versión Fan (Sin personalizar)"}${badge === "yes" ? " - Con Badge" : ""})`;
		const { unitArs: calculatedUnit, baseArs: calculatedBase } = calcJerseyUnitPrice({
			qty: currentQty,
			version,
			isExtraSize,
			badge,
			usdRate,
			isLongSleeve: isML
		});
		const finalUnit = calculatedUnit > 0 ? calculatedUnit : unitArs ?? 0;
		const finalBase = calculatedBase > 0 ? calculatedBase : unitArs ?? 0;
		cart.add({
			id: `${product.id}-${version}-${talleToUse}-${badge}`,
			productId: String(product.id),
			nombre: fullItem,
			unitPrice: finalUnit,
			basePrice: finalBase,
			qty: currentQty,
			imagen: product.imagen_url ? imageUrl(product.imagen_url) : void 0,
			categoria: product.categoria ?? "Camisetas"
		});
		setAddedToCart(true);
		navigate({ to: "/carrito" });
	}
	if (showCheckout) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-bold text-foreground",
				children: "Completar compra de camisetas"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setShowCheckout(false),
				className: "text-xs text-muted-foreground hover:text-foreground font-semibold",
				children: "← Volver a opciones"
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckoutFlow, {
			items: [{
				nombre: fullItemName,
				qty,
				unitPrice: unitArs ?? 0,
				productId: product.id
			}],
			total: totalArs ?? 0,
			onBack: () => setShowCheckout(false)
		})]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-5 sm:gap-6 min-w-0 w-full max-w-full",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3.5 sm:p-5 shadow-sm min-w-0 w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex items-start justify-between gap-3 flex-wrap",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 w-full",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5 flex-wrap mb-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-primary/20 text-primary px-2.5 py-0.5 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wide border border-primary/30",
									children: "⚡ Mínimo 10 u. Mayorista"
								}), activeTier.qty > 10 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[10px] sm:text-[11px] font-bold",
									children: [
										"🔥 Tramo ",
										activeTier.qty,
										"+ u. aplicado"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-2 mt-1 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-2xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums",
									children: unitArs !== null ? `$${unitArs.toLocaleString("es-AR")}` : "—"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs sm:text-sm font-semibold text-muted-foreground",
									children: "/ unidad"
								})]
							}),
							totalArs !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground mt-1.5",
								children: [
									"Total por ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-bold text-foreground",
										children: [qty, " u."]
									}),
									": ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-bold text-primary",
										children: ["$", totalArs.toLocaleString("es-AR")]
									})
								]
							})
						]
					})
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-2 mb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: "Talle *"
						}), selectedTalle && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 truncate max-w-[170px]",
							children: ["Seleccionado: ", selectedTalle]
						})]
					}),
					talles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold text-destructive",
						children: "Sin talles disponibles en este momento."
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 min-w-0 w-full",
						children: talles.map((t) => {
							const isXtra = t === "3XL" || t === "4XL";
							const isSelected = selectedTalle === t;
							const extraPrice = usdRate > 0 ? Math.round(1.07 * usdRate) : 0;
							const extraLabel = extraPrice > 0 ? `+$${extraPrice.toLocaleString("es-AR")}` : "+1 USD";
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => {
									setSelectedTalle(t);
									setTalleError(false);
								},
								className: ["h-11 sm:h-12 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center relative active:scale-95 px-1 min-w-0", isSelected ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30" : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50"].join(" "),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs sm:text-sm font-black leading-tight",
									children: t
								}), isXtra && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-[8px] sm:text-[9px] font-semibold leading-none mt-0.5 truncate max-w-full ${isSelected ? "text-primary-foreground/90" : "text-amber-600 dark:text-amber-400"}`,
									children: extraLabel
								})]
							}, t);
						})
					}),
					talleError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs font-semibold text-destructive",
						children: "⚠️ Por favor elegí tu talle antes de continuar."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground block mb-2",
						children: "Personalización (Nombre y Número)"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 min-w-0 w-full",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							id: "jersey-version-fan",
							onClick: () => setVersion("fan"),
							className: ["w-full rounded-xl p-3 sm:p-3.5 text-left transition-all border flex items-start justify-between gap-2.5 active:scale-[0.99] min-w-0", version === "fan" ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary" : "bg-background border-border hover:border-primary/40"].join(" "),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xl shrink-0",
											children: "👕"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-bold text-foreground",
											children: "Versión Fan"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground mt-1",
										children: "Sin nombre ni número (lisa)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold text-primary mt-1.5",
										children: "Desde $18.50 USD"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `mt-1 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${version === "fan" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`,
								children: version === "fan" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs",
									children: "✓"
								})
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							id: "jersey-version-player",
							onClick: () => setVersion("player"),
							className: ["w-full rounded-xl p-3 sm:p-3.5 text-left transition-all border flex items-start justify-between gap-2.5 active:scale-[0.99] min-w-0", version === "player" ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary" : "bg-background border-border hover:border-primary/40"].join(" "),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0 flex-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xl shrink-0",
											children: "✏️"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-sm font-bold text-foreground",
											children: "Versión Jugador"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground mt-1",
										children: "Personalizado (Nombre y Número)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold text-primary mt-1.5",
										children: "Desde $20.50 USD"
									})
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `mt-1 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${version === "player" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`,
								children: version === "player" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs",
									children: "✓"
								})
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60",
						children: version === "player" ? "✏️ Versión Jugador — luego de mandar el comprobante indicanos cómo la querés personalizar" : "👕 Versión Fan — camiseta lisa sin personalización"
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
						className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground block mb-2",
						children: "Badge / Parche Oficial"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2 sm:gap-2.5 min-w-0 w-full",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							id: "jersey-badge-no",
							onClick: () => setBadge("no"),
							className: ["h-16 rounded-xl border-2 p-2 sm:p-2.5 font-bold transition-all flex items-center gap-2 active:scale-[0.98] min-w-0", badge === "no" ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-background text-foreground hover:border-primary/40"].join(" "),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xl sm:text-2xl shrink-0",
								children: "🚫"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-left min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs font-bold leading-tight truncate",
									children: "Sin Badge"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[10px] font-normal text-muted-foreground mt-0.5 truncate",
									children: "Versión lisa"
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							id: "jersey-badge-yes",
							onClick: handleSelectBadgeYes,
							className: ["h-16 rounded-xl border-2 p-2 sm:p-2.5 font-bold transition-all flex items-center gap-2 active:scale-[0.98] min-w-0", badge === "yes" ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-background text-foreground hover:border-primary/40"].join(" "),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xl sm:text-2xl shrink-0",
								children: "🏆"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "text-left min-w-0 flex-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-xs font-bold leading-tight truncate",
									children: "Con Badge"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "block text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5 truncate",
									children: usdRate > 0 ? `+${money(Math.round(1.07 * usdRate))}` : "+US$1.00"
								})]
							})]
						})]
					}),
					badge === "yes" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-bold flex items-center gap-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "✓" }),
									" Badge seleccionado (+",
									usdRate > 0 ? money(Math.round(1.07 * usdRate)) : "US$1.00",
									" c/u)"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-emerald-700 dark:text-emerald-400",
								children: "Para coordinar qué badge querés y cerrar la venta, lo coordinamos directamente por WhatsApp."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: handleBadgeWhatsApp,
								className: "mt-2 inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 underline hover:opacity-80",
								children: "Abrir WhatsApp para coordinar el badge →"
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between mb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							htmlFor: "jersey-qty-input",
							className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: "Cantidad a pedir"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs text-primary font-bold",
							children: "Mínimo 10 unidades"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-4 gap-1.5 mb-2.5 min-w-0 w-full",
						children: [
							10,
							20,
							50,
							100
						].map((quickQty) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setQty(quickQty);
								setQtyStr(String(quickQty));
							},
							className: `py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${qty === quickQty ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-muted/50 border-border text-foreground hover:border-primary/40"}`,
							children: [quickQty, " u."]
						}, quickQty))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								id: "jersey-qty-minus",
								onClick: () => {
									const next = Math.max(10, qty - 1);
									setQty(next);
									setQtyStr(String(next));
								},
								disabled: qty <= 10,
								className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-xl font-bold hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95",
								children: "-"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "jersey-qty-input",
								type: "number",
								min: 10,
								max: 5e3,
								value: qtyStr,
								onChange: (e) => {
									const val = e.target.value;
									setQtyStr(val);
									const num = parseInt(val, 10);
									if (!isNaN(num) && num >= 1) setQty(num);
								},
								onBlur: () => {
									const num = parseInt(qtyStr, 10);
									const valid = isNaN(num) || num < 10 ? 10 : num;
									setQty(valid);
									setQtyStr(String(valid));
								},
								className: "h-11 flex-1 min-w-0 rounded-xl border border-input bg-background text-center text-lg font-black focus:border-primary outline-none"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								id: "jersey-qty-plus",
								onClick: () => {
									const next = qty + 1;
									setQty(next);
									setQtyStr(String(next));
								},
								className: "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-xl font-bold hover:bg-muted transition active:scale-95",
								children: "+"
							})
						]
					}),
					nextTier && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-xl p-2.5",
						children: [
							"💡 Llevás ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-bold text-foreground",
								children: [qty, " u."]
							}),
							" (tramo ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-bold text-foreground",
								children: [activeTier.qty, "+ u."]
							}),
							")",
							" — ",
							"¡Sumando ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "font-bold text-primary",
								children: [nextTier.qty - qty, " u. más"]
							}),
							" accedés al precio de ",
							nextTier.qty,
							" u.!"
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between mb-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: "Escala de precios por volumen"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[11px] text-muted-foreground hidden sm:inline",
							children: "Tocá cualquier tramo para seleccionarlo"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-border overflow-hidden divide-y divide-border bg-card shadow-sm min-w-0 w-full",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-3 bg-muted/60 px-2.5 sm:px-3.5 py-2 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Tramo" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-center",
									children: "Precio c/u"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-right",
									children: "Total tramo"
								})
							]
						}), tiers.map((tier) => {
							const isTierActive = activeTier.qty === tier.qty;
							const arsBaseUnit = usdRate > 0 ? Math.round(tier.unitUsd * 1.07 * usdRate) : null;
							const arsUnitWithExtras = arsBaseUnit !== null ? arsBaseUnit + extraSizeArs + badgeExtraArs : null;
							const arsTotalForTier = arsUnitWithExtras !== null ? arsUnitWithExtras * tier.qty : null;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								id: `jersey-tier-${tier.qty}`,
								onClick: () => {
									setQty(tier.qty);
									setQtyStr(String(tier.qty));
								},
								className: ["w-full grid grid-cols-3 px-2.5 sm:px-3.5 py-2.5 text-left transition-colors items-center active:bg-muted text-xs sm:text-sm", isTierActive ? "bg-primary/10 font-bold" : "hover:bg-muted/40"].join(" "),
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: `text-xs sm:text-sm font-bold ${isTierActive ? "text-primary" : "text-foreground"}`,
											children: [tier.qty, " u."]
										}), isTierActive && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[9px] sm:text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold leading-none shrink-0",
											children: "✓"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `text-center text-xs sm:text-sm tabular-nums font-semibold ${isTierActive ? "text-primary" : "text-foreground"}`,
										children: arsUnitWithExtras !== null ? `$${arsUnitWithExtras.toLocaleString("es-AR")}` : "—"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `text-right text-xs sm:text-sm tabular-nums font-bold ${isTierActive ? "text-primary font-black" : "text-foreground"}`,
										children: arsTotalForTier !== null ? `$${arsTotalForTier.toLocaleString("es-AR")}` : "—"
									})
								]
							}, tier.qty);
						})]
					}),
					usdRate <= 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-[11px] text-amber-600 font-semibold",
						children: "⚠️ Consultá el precio en ARS por WhatsApp."
					})
				]
			}),
			selectedTalle && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4 text-xs shadow-sm min-w-0 w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-extrabold text-primary text-xs uppercase tracking-wider mb-2.5",
						children: "📋 Resumen de tu selección:"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid grid-cols-2 gap-2 text-foreground mb-3 min-w-0",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-background/80 rounded-lg p-2 border border-border/50 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-muted-foreground block",
									children: "Talle"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-bold text-xs truncate block",
									children: [
										selectedTalle,
										" ",
										isExtraSize && "(+1 USD)"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-background/80 rounded-lg p-2 border border-border/50 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-muted-foreground block",
									children: "Versión"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-xs truncate block",
									children: version === "player" ? "Jugador (Personalizado)" : "Fan"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-background/80 rounded-lg p-2 border border-border/50 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-muted-foreground block",
									children: "Badge"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "font-bold text-xs truncate block",
									children: badge === "yes" ? "Con Badge 🏆" : "Sin Badge"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-background/80 rounded-lg p-2 border border-border/50 min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[10px] text-muted-foreground block",
									children: "Cantidad"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-bold text-xs truncate block",
									children: [qty, " unidades"]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between pt-2 border-t border-primary/20 gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] text-muted-foreground block",
								children: "Precio unitario"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold text-sm text-foreground",
								children: unitArs !== null ? `$${unitArs.toLocaleString("es-AR")}` : "—"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-right min-w-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] text-muted-foreground block",
								children: "Total estimado"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-black text-base sm:text-lg text-primary",
								children: totalArs !== null ? `$${totalArs.toLocaleString("es-AR")}` : "—"
							})]
						})]
					})
				]
			}),
			badge === "yes" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2.5 min-w-0 w-full",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 sm:p-4 text-xs text-emerald-800 dark:text-emerald-300 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-bold flex items-center gap-1.5 text-sm text-emerald-900 dark:text-emerald-200",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "💬" }), " Los pedidos con Badge se coordinan y cierran por WhatsApp"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-emerald-700 dark:text-emerald-400 leading-relaxed",
							children: "Te confirmamos modelos de parches disponibles, precio final y método de pago directamente por chat para asegurar que recibas el parche exacto."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						id: "btn-jersey-whatsapp-badge",
						onClick: handleBadgeWhatsApp,
						className: "btn-base w-full bg-whatsapp text-whatsapp-foreground flex items-center justify-center gap-2 font-bold hover:opacity-90 transition-opacity py-3.5 px-3 text-sm sm:text-base shadow-md active:scale-[0.98] text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							xmlns: "http://www.w3.org/2000/svg",
							className: "h-5 w-5 shrink-0",
							viewBox: "0 0 24 24",
							fill: "currentColor",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "truncate",
							children: "Coordinar con Badge por WhatsApp"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => setBadge("no"),
						className: "text-xs text-muted-foreground hover:text-foreground text-center underline py-1 transition-colors",
						children: "← Comprar sin badge directamente por la web"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-2.5 min-w-0 w-full",
				children: [
					qty < 10 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-xs min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-bold text-destructive",
							children: "⚠️ Mínimo 10 unidades"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-0.5 text-muted-foreground",
							children: [
								"Llevás ",
								qty,
								" ",
								qty === 1 ? "unidad" : "unidades",
								". Necesitás al menos ",
								10 - qty,
								" más para poder comprar."
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						id: "btn-jersey-comprar-ya",
						disabled: qty < 10,
						onClick: handleBuyNow,
						className: `btn-base w-full font-bold transition-all text-sm sm:text-base py-3.5 px-3 shadow-sm active:scale-[0.98] text-center ${qty < 10 ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground border border-border" : "grad-urgente text-primary-foreground hover:shadow-md"}`,
						children: qty < 10 ? `Mínimo 10 unidades (tenés ${qty})` : `Comprar ya (${qty} u. — $${(totalArs ?? 0).toLocaleString("es-AR")})`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						id: "btn-jersey-add-cart",
						disabled: qty < 10,
						onClick: qty < 10 ? void 0 : handleAddToCart,
						className: `btn-base w-full font-bold transition py-3 px-3 text-sm sm:text-base active:scale-[0.98] text-center ${qty < 10 ? "opacity-40 cursor-not-allowed border border-border text-muted-foreground" : "border-2 border-primary text-primary hover:bg-primary/10"}`,
						children: addedToCart ? "✓ ¡Agregado al carrito!" : `🛒 Agregar al carrito (${qty} u.)`
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						id: "btn-jersey-whatsapp",
						onClick: handleWhatsApp,
						className: "btn-base w-full bg-whatsapp text-whatsapp-foreground flex items-center justify-center gap-2 font-semibold hover:opacity-90 transition-opacity py-3 px-3 text-sm sm:text-base active:scale-[0.98] text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", {
							xmlns: "http://www.w3.org/2000/svg",
							className: "h-5 w-5 shrink-0",
							viewBox: "0 0 24 24",
							fill: "currentColor",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" })
						}), "Consultar / Pedir por WhatsApp"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-center text-xs text-muted-foreground -mt-1",
				children: "Te confirmamos disponibilidad y precio final en ARS."
			})
		]
	});
}
/** Galería de imágenes interactiva con miniaturas clickeables. */
function ProductGallery({ images, productName, selectedVariantImage }) {
	const allImages = selectedVariantImage ? [selectedVariantImage, ...images.filter((u) => u !== selectedVariantImage)] : images;
	const [activeIdx, setActiveIdx] = (0, import_react.useState)(0);
	(0, import_react.useEffect)(() => {
		setActiveIdx(0);
	}, [selectedVariantImage]);
	const current = allImages[activeIdx] ?? allImages[0] ?? "";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col gap-2 min-w-0 w-full max-w-full",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-border bg-surface lg:sticky lg:top-24",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
				src: imageUrl(current) || "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2371717a'%3ESin imagen%3C/text%3E%3C/svg%3E",
				alt: `${productName} — foto ${activeIdx + 1}`,
				decoding: "async",
				referrerPolicy: "no-referrer",
				className: "aspect-square w-full bg-surface object-contain p-3 transition-opacity duration-200",
				onError: onImageError(current)
			}, current)
		}), allImages.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mx-auto flex w-full max-w-[460px] gap-2 overflow-x-auto pb-1 no-scrollbar min-w-0",
			children: allImages.map((url, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setActiveIdx(i),
				"aria-label": `Ver foto ${i + 1}`,
				className: ["shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-lg border-2 overflow-hidden bg-surface transition-all", i === activeIdx ? "border-primary shadow-md scale-105" : "border-border opacity-60 hover:opacity-100 hover:border-primary/50"].join(" "),
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: thumbnailUrl(url) || "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2371717a'%3ESin imagen%3C/text%3E%3C/svg%3E",
					alt: `Miniatura ${i + 1}`,
					loading: "lazy",
					referrerPolicy: "no-referrer",
					className: "h-full w-full object-contain p-0.5"
				})
			}, url + i))
		})]
	});
}
function stripTrailingColor(name, color) {
	const trimmedName = name.trim();
	const trimmedColor = color.trim();
	if (!trimmedColor) return trimmedName;
	if (trimmedName.toLowerCase().endsWith(trimmedColor.toLowerCase())) {
		let withoutColor = trimmedName.slice(0, trimmedName.length - trimmedColor.length).trimEnd();
		if (withoutColor.endsWith("-") || withoutColor.endsWith("—")) withoutColor = withoutColor.slice(0, -1).trimEnd();
		return withoutColor;
	}
	return trimmedName;
}
function ProductoPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { products, config } = data;
	const cart = useCart();
	const product = findProduct(products, id);
	const [qty, setQty] = (0, import_react.useState)(1);
	const [qtyStr, setQtyStr] = (0, import_react.useState)("1");
	const [custom, setCustom] = (0, import_react.useState)(false);
	const [showCheckout, setShowCheckout] = (0, import_react.useState)(false);
	const [showMin, setShowMin] = (0, import_react.useState)(false);
	const tiers = (0, import_react.useMemo)(() => product ? tiersOf(product) : [], [product]);
	const variants = product?.variants ?? [];
	const [selectedVariantId, setSelectedVariantId] = (0, import_react.useState)("");
	const [selectedTalle, setSelectedTalle] = (0, import_react.useState)("");
	const [talleError, setTalleError] = (0, import_react.useState)(false);
	const isCamisetaProd = isCamiseta(product?.categoria, product?.nombre);
	if (!product) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto max-w-[1180px] px-4 py-20 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-3xl",
					children: "Producto no encontrado"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/catalogo",
					className: "btn-base grad-urgente mt-6 text-primary-foreground",
					children: "Ver catálogo"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
	const productRec = product;
	const rawTipo = String(productRec["tipo_talles"] ?? "NINGUNO").toUpperCase();
	const hasTalles = rawTipo === "ZAPATILLAS" || rawTipo === "ROPA";
	const waOnlyReason = waOnlyReasonOf(productRec);
	const consultar = isWhatsappOnly(product);
	const rawDefaultColor = product.color_predeterminado;
	const defaultColor = rawDefaultColor == null || rawDefaultColor === "null" ? "" : String(rawDefaultColor).trim();
	const rawTalles = productRec["talles_disponibles"];
	const productTalles = Array.isArray(rawTalles) ? rawTalles : typeof rawTalles === "string" ? rawTalles.split(",").map((t) => t.trim()).filter(Boolean) : [];
	const hasDefaultInVariants = defaultColor ? variants.some((v) => (v?.color ?? "").trim().toLowerCase() === defaultColor.toLowerCase()) : false;
	const allVariants = (0, import_react.useMemo)(() => {
		if (!defaultColor) return variants;
		if (hasDefaultInVariants) return variants;
		return [{
			id: "default_base",
			product_id: String(product.id ?? ""),
			color: defaultColor,
			precio: priceOf(product),
			stock: product.stock ?? null,
			imagen_url: product.imagen_url ?? null,
			talles_disponibles: productTalles
		}, ...variants];
	}, [
		defaultColor,
		variants,
		hasDefaultInVariants,
		product,
		productTalles
	]);
	const usesColors = allVariants.length > 0;
	const defaultVariant = defaultColor ? allVariants.find((variant) => (variant?.color ?? "").trim().toLowerCase() === defaultColor.toLowerCase()) ?? allVariants[0] : allVariants[0];
	const selectedVariant = (usesColors ? allVariants.find((variant) => String(variant.id) === selectedVariantId) : void 0) ?? defaultVariant;
	const availableTalles = selectedVariant && selectedVariant.talles_disponibles && selectedVariant.talles_disponibles.length > 0 ? selectedVariant.talles_disponibles : productTalles;
	const baseName = defaultColor ? stripTrailingColor(product.nombre ?? "Producto", defaultColor) : product.nombre ?? "Producto";
	const displayName = selectedVariant ? `${baseName} ${selectedVariant.color}`.trim() : product.nombre ?? "Producto";
	const isOffer = hasOffer(product);
	const offerPct = isOffer ? offerDiscountPct(product) : 0;
	const rawBasePrice = selectedVariant ? Number(selectedVariant.precio) : Number(product.precio ?? 0);
	const basePrice = isOffer ? selectedVariant && selectedVariant.id !== "default_base" ? Math.round(rawBasePrice * (1 - offerPct / 100)) : priceOf(product) : selectedVariant ? Number(selectedVariant.precio) : priceOf(product);
	const origPrice = selectedVariant ? Number(selectedVariant.precio) : originalPriceOf(product);
	const isOfferDiscounted = isOffer && origPrice > basePrice;
	const displayNameWithTalle = selectedTalle ? `${displayName} (Talle: ${selectedTalle})` : displayName;
	const selectedImage = selectedVariant?.imagen_url || product.imagen_url;
	const catRules = (0, import_react.useMemo)(() => parseCategoryRules(config), [config]);
	const categoryRuleMatch = (0, import_react.useMemo)(() => {
		const category = normCat(product.categoria ?? "");
		return category ? findRuleForCat(category, catRules) : void 0;
	}, [product.categoria, catRules]);
	const categoryPercent = categoryRuleMatch?.rule.discountTiers?.length ? categoryDiscountForUnits(categoryRuleMatch.rule.discountTiers, qty) : 0;
	const percent = categoryPercent || discountFor(product, qty);
	const unit = categoryPercent > 0 ? Math.round(basePrice * (1 - categoryPercent / 100)) : unitPriceFor(product, qty, basePrice);
	const total = unit * qty;
	const cartItem = {
		id: `${String(product.id ?? product.nombre ?? "")}:${selectedVariant?.id === "default_base" ? "" : selectedVariant?.id ?? ""}:${selectedTalle ?? ""}`,
		productId: product.id ? String(product.id) : void 0,
		nombre: displayNameWithTalle,
		qty,
		unitPrice: Math.round(unit),
		basePrice,
		variantId: selectedVariant?.id === "default_base" ? void 0 : selectedVariant?.id,
		variantColor: selectedVariant?.color,
		imagen: imageUrl(selectedImage),
		categoria: product.categoria ?? ""
	};
	const existingInCart = (0, import_react.useMemo)(() => {
		return cart.items.find((i) => i.id === cartItem.id || i.productId && String(i.productId) === String(product.id) && (!i.variantId || i.variantId === selectedVariant?.id) || i.nombre === displayNameWithTalle || i.nombre === displayName);
	}, [
		cart.items,
		cartItem.id,
		product.id,
		selectedVariant?.id,
		displayNameWithTalle,
		displayName
	]);
	const hasSyncedCartQty = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (existingInCart && existingInCart.qty > 0 && !hasSyncedCartQty.current) {
			hasSyncedCartQty.current = true;
			setQty(existingInCart.qty);
			setQtyStr(String(existingInCart.qty));
			if (![
				1,
				3,
				5,
				10
			].includes(existingInCart.qty)) setCustom(true);
		}
	}, [existingInCart]);
	const suplemento = isSuplemento(product.categoria);
	const categoryMinViolation = checkCategoryMins([{
		nombre: product.nombre,
		categoria: product.categoria,
		moq_group: moqGroupOf(product) ?? void 0,
		qty,
		unitPrice: unit
	}], catRules)[0];
	const bloqueaCompra = suplemento && total < 25e4 || Boolean(categoryMinViolation);
	const minDialogTitle = categoryMinViolation ? `Compra mínima de ${categoryMinViolation.category}` : "Compra mínima de suplementos";
	const minDialogDescription = categoryMinViolation ? `Llevás ${categoryMinViolation.current} unidad${categoryMinViolation.current !== 1 ? "es" : ""}. Te faltan ${categoryMinViolation.min - categoryMinViolation.current} para alcanzar el mínimo de ${categoryMinViolation.min}.` : SUPLEMENTOS_MSG;
	const moqInfo = hasMoq(product, catRules);
	const moqMet = meetsMoq(moqInfo, qty, basePrice);
	const moqMissing = moqInfo?.minUnits ? Math.max(0, moqInfo.minUnits - qty) : 0;
	String(product.stock ?? "SI").trim().toUpperCase();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen w-full max-w-full overflow-x-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-[1180px] w-full px-4 py-8 sm:px-6 sm:py-12 overflow-x-hidden min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between gap-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/catalogo",
							className: "text-sm font-semibold text-muted-foreground hover:text-primary transition-colors",
							children: "← Volver al catálogo"
						}), cart.count > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/carrito",
							className: "text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20",
							children: [
								"🛒 Volver al carrito (",
								cart.count,
								" u.) →"
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 grid gap-8 lg:grid-cols-2 lg:items-start min-w-0 w-full max-w-full",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductGallery, {
							images: galleryImages(product),
							productName: product.nombre ?? "Producto",
							selectedVariantImage: selectedVariant?.imagen_url
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "min-w-0 w-full max-w-full",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground",
									children: product.categoria || "General"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "mt-2 font-sans text-[clamp(20px,5vw,36px)] font-bold normal-case tracking-tight break-words",
									children: displayName
								}),
								!isCamisetaProd && (consultar || waOnlyReason && (WA_ONLY_CONFIG[waOnlyReason]?.hidePrice || unit <= 0) || unit <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-4 text-sm font-semibold text-muted-foreground",
									children: "Consultá el precio y disponibilidad por WhatsApp."
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-4 flex flex-col gap-1.5",
										children: [
											isOfferDiscounted && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 flex-wrap",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider",
													children: [
														"🔥 Oferta del día -",
														offerPct,
														"% OFF"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-sm text-muted-foreground line-through tabular-nums",
													children: ["Antes ", money(origPrice)]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex flex-wrap items-baseline gap-2",
												children: [
													percent > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "tabular-nums text-base text-muted-foreground line-through",
														children: money(basePrice)
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "tabular-nums text-3xl font-bold text-foreground",
														children: money(transferPrice(unit, transferDiscountPct(config)))
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400",
														children: [transferDiscountPct(config), "% OFF con Transferencia"]
													}),
													percent > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "text-xs font-bold text-primary",
														children: [
															"(",
															percent,
															"% OFF x volumen)"
														]
													})
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs text-muted-foreground",
												children: [
													"o ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-semibold text-foreground/80",
														children: money(unit)
													}),
													" con Mercado Pago"
												]
											})
										]
									}),
									(() => {
										const moqDisplay = hasMoq(product, catRules);
										if (moqDisplay?.minUnits) {
											const groupLabel = moqDisplay.group.charAt(0).toUpperCase() + moqDisplay.group.slice(1);
											const minText = `${moqDisplay.minUnits} unidades`;
											const mixMsg = moqDisplay.group === "mates" ? "Podés combinar distintos modelos de Mates en tu carrito hasta alcanzar el mínimo." : "Podés armar surtido con distintos productos de esta categoría para alcanzar el mínimo.";
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-foreground",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start gap-2.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-base shrink-0 mt-0.5",
														children: "ℹ️"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0 flex-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm",
															children: [
																"Compra mínima para ",
																groupLabel,
																": ",
																minText
															]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "mt-0.5 text-muted-foreground leading-relaxed text-[11px] sm:text-xs",
															children: mixMsg
														})]
													})]
												})
											});
										}
										if (moqDisplay?.minAmount) {
											const groupLabel = moqDisplay.group.charAt(0).toUpperCase() + moqDisplay.group.slice(1);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-foreground",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start gap-2.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-base shrink-0 mt-0.5",
														children: "ℹ️"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0 flex-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm",
															children: [
																"Compra mínima para ",
																groupLabel,
																": ",
																money(moqDisplay.minAmount)
															]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "mt-0.5 text-muted-foreground leading-relaxed text-[11px] sm:text-xs",
															children: "Podés combinar distintos productos de esta categoría en tu carrito hasta alcanzar el mínimo."
														})]
													})]
												})
											});
										}
										if (isSuplemento(product.categoria, product.nombre)) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-foreground",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-start gap-2.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-base shrink-0 mt-0.5",
													children: "ℹ️"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "min-w-0 flex-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
														className: "font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm",
														children: ["Compra mínima para Suplementos: ", money(25e4)]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
														className: "mt-0.5 text-muted-foreground leading-relaxed text-[11px] sm:text-xs",
														children: [
															"Podés combinar distintos suplementos en tu carrito hasta alcanzar los ",
															money(25e4),
															"."
														]
													})]
												})]
											})
										});
										return null;
									})(),
									(() => {
										const catNorm = normCat(product.categoria ?? "");
										const ruleMatch = catNorm ? findRuleForCat(catNorm, catRules) : void 0;
										const rule = ruleMatch?.rule;
										if (rule?.discountTiers?.length && ruleMatch) {
											const categoryName = ruleMatch.key.charAt(0).toUpperCase() + ruleMatch.key.slice(1);
											const allTiers = rule.discountTiers.some((t) => t.units >= 20) ? rule.discountTiers : [...rule.discountTiers, {
												units: 20,
												percent: 12
											}];
											[...allTiers].sort((a, b) => b.units - a.units).find((t) => qty >= t.units);
											const nextCatTier = [...allTiers].sort((a, b) => a.units - b.units).find((t) => t.units > qty);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs text-foreground",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start gap-2.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-base shrink-0 mt-0.5",
														children: "🎁"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0 flex-1",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
																className: "font-bold text-primary text-xs sm:text-sm",
																children: [
																	"Descuento por cantidad en ",
																	categoryName,
																	":"
																]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
																className: "mt-1.5 space-y-1 text-muted-foreground text-[11px] sm:text-xs",
																children: allTiers.map((tier) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
																	className: "flex items-center gap-1.5",
																	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																		className: "font-semibold text-foreground",
																		children: [
																			"Llevando ",
																			tier.units,
																			" u. o más:"
																		]
																	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																		className: "font-bold text-primary",
																		children: [tier.percent, "% OFF"]
																	})]
																}, tier.units))
															}),
															nextCatTier ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
																className: "mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "shrink-0",
																	children: "💡"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																	"Llevá ",
																	/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
																		className: "text-foreground",
																		children: [
																			nextCatTier.units - qty,
																			" unidad",
																			nextCatTier.units - qty !== 1 ? "es" : "",
																			" más"
																		]
																	}),
																	" para activar el ",
																	/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
																		className: "text-primary",
																		children: [nextCatTier.percent, "% OFF"]
																	}),
																	". Podés combinar distintos productos de ",
																	categoryName,
																	"."
																] })]
															}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
																className: "mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground",
																children: [
																	"Podés combinar distintos productos de ",
																	categoryName,
																	" en tu carrito."
																]
															})
														]
													})]
												})
											});
										}
										if (tiers.length > 0) {
											const catName = product.categoria ? product.categoria.trim() : "este producto";
											[...tiers].sort((a, b) => b.units - a.units).find((t) => qty >= t.units);
											const nextProdTier = [...tiers].sort((a, b) => a.units - b.units).find((t) => t.units > qty);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs text-foreground",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-start gap-2.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-base shrink-0 mt-0.5",
														children: "🎁"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0 flex-1",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
																className: "font-bold text-primary text-xs sm:text-sm",
																children: [
																	"Descuento por cantidad en ",
																	catName,
																	":"
																]
															}),
															/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
																className: "mt-1.5 space-y-1 text-muted-foreground text-[11px] sm:text-xs",
																children: tiers.map((tier) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
																	className: "flex items-center gap-1.5",
																	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																		className: "font-semibold text-foreground",
																		children: [
																			"Llevando ",
																			tier.units,
																			" u. o más:"
																		]
																	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																		className: "font-bold text-primary",
																		children: [tier.percent, "% OFF"]
																	})]
																}, tier.units))
															}),
															nextProdTier ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
																className: "mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "shrink-0",
																	children: "💡"
																}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																	"Llevá ",
																	/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
																		className: "text-foreground",
																		children: [
																			nextProdTier.units - qty,
																			" unidad",
																			nextProdTier.units - qty !== 1 ? "es" : "",
																			" más"
																		]
																	}),
																	" para activar el ",
																	/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
																		className: "text-primary",
																		children: [nextProdTier.percent, "% OFF"]
																	}),
																	" automático."
																] })]
															}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																className: "mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground",
																children: "Descuento automático por volumen al agregar al carrito."
															})
														]
													})]
												})
											});
										}
										return null;
									})()
								] })),
								!isCamisetaProd && !consultar && !waOnlyReason && usesColors && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-6",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: "color",
										className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
										children: "Elegir color"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
										id: "color",
										value: selectedVariant?.id ?? "",
										onChange: (e) => {
											setSelectedVariantId(e.target.value);
											setSelectedTalle("");
											setTalleError(false);
										},
										className: "mt-2 w-full max-w-[320px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary",
										children: allVariants.map((variant) => {
											const vPrice = Number(variant.precio);
											const effPrice = isOffer ? Math.round(vPrice * (1 - offerPct / 100)) : vPrice;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
												value: String(variant.id),
												children: [
													variant.color,
													" — ",
													money(effPrice)
												]
											}, variant.id ?? variant.color);
										})
									})]
								}),
								!isCamisetaProd && !consultar && !waOnlyReason && hasTalles && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-6",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between mb-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
												children: [
													"Elegí tu talle ",
													rawTipo === "ZAPATILLAS" ? "(Zapatillas)" : "(Ropa)",
													" *"
												]
											}), selectedTalle && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-xs font-bold text-emerald-600",
												children: ["Talle: ", selectedTalle]
											})]
										}),
										availableTalles.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-semibold text-destructive",
											children: "Sin talles con stock disponible en este momento."
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-2",
											children: availableTalles.map((talle) => {
												return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => {
														setSelectedTalle(talle);
														setTalleError(false);
													},
													className: `h-10 min-w-11 rounded-lg px-3 text-xs font-bold transition-all border ${selectedTalle === talle ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105" : "bg-background text-foreground border-border hover:border-primary/50"}`,
													children: talle
												}, talle);
											})
										}),
										talleError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-2 text-xs font-semibold text-destructive",
											children: "⚠️ Por favor elegí tu talle antes de continuar."
										})
									]
								}),
								isCamisetaProd && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-6",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(JerseyProductUI, {
										product,
										talles: availableTalles.length > 0 ? availableTalles : [
											"S",
											"M",
											"L",
											"XL",
											"XXL",
											"3XL",
											"4XL"
										],
										config
									})
								}),
								!isCamisetaProd && !consultar && !waOnlyReason && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-6",
									children: [
										tiers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mb-1 text-xs font-semibold text-muted-foreground",
											children: "Llevá más, pagá menos!"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											htmlFor: "qty-input",
											className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
											children: "Cantidad"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-2 flex items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													id: "qty-decrement",
													"aria-label": "Reducir cantidad",
													onClick: () => {
														const next = Math.max(1, qty - 1);
														setQty(next);
														setQtyStr(String(next));
													},
													className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-lg font-bold text-foreground transition hover:bg-muted active:scale-95",
													children: "−"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													id: "qty-input",
													type: "number",
													inputMode: "numeric",
													pattern: "[0-9]*",
													min: 1,
													value: qtyStr,
													onChange: (e) => {
														const raw = e.target.value.replace(/[^0-9]/g, "");
														setQtyStr(raw);
														const parsed = parseInt(raw, 10);
														if (!isNaN(parsed) && parsed >= 1) setQty(parsed);
													},
													onBlur: () => {
														const parsed = parseInt(qtyStr, 10);
														const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;
														setQty(clamped);
														setQtyStr(String(clamped));
													},
													onFocus: (e) => e.target.select(),
													className: "h-10 w-20 rounded-lg border border-input bg-background px-3 text-center text-sm font-semibold outline-none focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													id: "qty-increment",
													"aria-label": "Aumentar cantidad",
													onClick: () => {
														const next = qty + 1;
														setQty(next);
														setQtyStr(String(next));
													},
													className: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-lg font-bold text-foreground transition hover:bg-muted active:scale-95",
													children: "+"
												})
											]
										})
									]
								}),
								!isCamisetaProd && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "mt-6 flex flex-col gap-3",
									children: consultar || waOnlyReason ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										className: "btn-base w-full bg-whatsapp text-whatsapp-foreground",
										href: waOnlyReason ? sanitizeUrl(`https://wa.me/5493418051515?text=${encodeURIComponent(WA_ONLY_CONFIG[waOnlyReason].waMsg(product.nombre ?? ""))}`) : waLink(config, product.nombre),
										target: "_blank",
										rel: "noopener noreferrer",
										children: waOnlyReason ? WA_ONLY_CONFIG[waOnlyReason].btnText : "Consultar por WhatsApp"
									}) : showCheckout ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckoutFlow, {
										items: [{
											nombre: cartItem.nombre,
											qty,
											unitPrice: cartItem.unitPrice
										}],
										total,
										onBack: () => setShowCheckout(false)
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
										moqInfo && !moqMet && moqInfo.minUnits && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "font-bold text-amber-700 dark:text-amber-400",
												children: ["Compra mínima de ", moqInfo.group.charAt(0).toUpperCase() + moqInfo.group.slice(1)]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "mt-0.5 text-muted-foreground",
												children: [
													"Llevás ",
													qty,
													" unidad",
													qty !== 1 ? "es" : "",
													". Te falta",
													moqMissing !== 1 ? "n" : "",
													" ",
													moqMissing,
													" para alcanzar el mínimo de ",
													moqInfo.minUnits,
													"."
												]
											})]
										}),
										(() => {
											const disabled = moqInfo != null && !moqMet || bloqueaCompra;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												id: "btn-comprar-ya",
												disabled,
												onClick: () => {
													if (hasTalles && !selectedTalle) {
														setTalleError(true);
														return;
													}
													if (bloqueaCompra) {
														setShowMin(true);
														return;
													}
													setShowCheckout(true);
												},
												className: `btn-base w-full transition-all font-semibold ${disabled ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground border border-border" : "grad-urgente text-primary-foreground hover:shadow-md"}`,
												children: hasTalles && !selectedTalle ? "Elegí tu talle para comprar" : moqInfo && !moqMet && moqInfo.minUnits ? `Mínimo ${moqInfo.minUnits} unidades para comprar ya` : bloqueaCompra ? `Mínimo requerido para compra directa` : "Comprar ya"
											});
										})(),
										existingInCart && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-center text-xs font-semibold text-primary",
											children: [
												"✓ Ya tenés ",
												existingInCart.qty,
												" ",
												existingInCart.qty === 1 ? "unidad" : "unidades",
												" en tu carrito"
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											id: "btn-agregar-carrito",
											onClick: () => {
												if (hasTalles && !selectedTalle) {
													setTalleError(true);
													return;
												}
												if (existingInCart) cart.setQty(existingInCart.id, qty);
												else cart.add(cartItem);
												navigate({ to: "/carrito" });
											},
											className: "btn-base w-full border border-border text-foreground hover:border-primary hover:text-primary transition-colors font-semibold",
											children: existingInCart ? "Actualizar cantidad en carrito" : "Agregar al carrito (armar surtido)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-center text-xs text-muted-foreground",
											children: "Pagá con transferencia o con Mercado Pago."
										})
									] })
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-12 max-w-3xl",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "font-sans text-xl font-bold normal-case tracking-tight",
							children: "Descripción"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-[15px] leading-relaxed text-muted-foreground",
							children: product.descripcion || "Producto importado original. Consultanos por más detalles."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
						className: "mt-12 max-w-4xl",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2 mb-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-sans text-xl sm:text-2xl font-bold normal-case tracking-tight",
								children: "Reseñas de compradores mayoristas"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs sm:text-sm text-muted-foreground mt-0.5",
								children: "Experiencias reales de revendedores que compran en nuestro catálogo."
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5" }), " Clientes verificados"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3",
							children: REVIEWS.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-soft p-4 flex flex-col justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2 mb-2.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${r.avatarBg} text-xs font-bold text-white shadow-xs`,
											children: r.name.slice(0, 2).toUpperCase()
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-bold text-foreground leading-none",
											children: r.name
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[10px] text-muted-foreground mt-0.5",
											children: r.location
										})] })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stars, { value: r.stars })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-xs text-muted-foreground leading-relaxed",
									children: [
										"“",
										r.text,
										"”"
									]
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/80",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium truncate max-w-[160px]",
										children: r.role
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "shrink-0",
										children: r.date
									})]
								})]
							}, r.name))
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "btn-base mt-10 w-full bg-whatsapp text-whatsapp-foreground sm:w-auto sm:px-10",
						href: waLink(config, product.nombre),
						target: "_blank",
						rel: "noopener noreferrer",
						children: "Contactar por WhatsApp"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted-foreground",
						children: "Consultanos por stock, envíos o descuentos por cantidad."
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: showMin,
				onOpenChange: setShowMin,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: minDialogTitle }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: minDialogDescription })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogFooter, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => {
						cart.add(cartItem);
						navigate({ to: "/carrito" });
					},
					className: "btn-base grad-urgente text-primary-foreground",
					children: "Agregar al carrito"
				}) })] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
//#endregion
export { ProductoPage as component };
