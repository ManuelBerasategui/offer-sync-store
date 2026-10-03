import { i as __toESM } from "../_runtime.mjs";
import { A as normCat, B as thumbnailUrl, E as isYes, H as toNumber, K as waLink, M as onImageError, O as money, P as parseCategoryRules, R as sanitizeUrl, U as transferDiscountPct, W as transferPrice, y as hasOffer } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { D as MessageCircle, H as ChevronRight, J as ArrowRight, K as Calculator, N as Instagram, O as Mail, P as Flame, U as ChevronLeft } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, o as SiteFooter, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { t as ProductCard } from "./ProductCard-DLhqgPx1.mjs";
import { r as ReviewsCarousel, t as HowItWorks } from "./Social-C2yjfee4.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Dj9EunMe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Home() {
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { products, banners, config } = data;
	const combosScrollRef = (0, import_react.useRef)(null);
	const scrollCombos = (dir) => {
		const el = combosScrollRef.current;
		if (!el) return;
		el.scrollBy({
			left: dir === "left" ? -380 : 380,
			behavior: "smooth"
		});
	};
	const ofertasDelDia = products.filter((p) => hasOffer(p));
	const conVentas = [...products].filter((p) => (p.ventas_semana ?? 0) > 0).sort((a, b) => (b.ventas_semana ?? 0) - (a.ventas_semana ?? 0));
	const masVendidos = [];
	const seenIds = /* @__PURE__ */ new Set();
	for (const p of conVentas) {
		if (masVendidos.length >= 3) break;
		const id = String(p.id ?? p.nombre ?? "");
		if (!seenIds.has(id)) {
			seenIds.add(id);
			masVendidos.push(p);
		}
	}
	if (masVendidos.length < 3) {
		const destacados = products.filter((p) => isYes(p.destacado));
		for (const p of destacados) {
			if (masVendidos.length >= 3) break;
			const id = String(p.id ?? p.nombre ?? "");
			if (!seenIds.has(id)) {
				seenIds.add(id);
				masVendidos.push(p);
			}
		}
	}
	if (masVendidos.length < 3) for (const p of products) {
		if (masVendidos.length >= 3) break;
		const id = String(p.id ?? p.nombre ?? "");
		if (!seenIds.has(id)) {
			seenIds.add(id);
			masVendidos.push(p);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-surface to-surface px-4 pt-10 pb-8 text-center sm:px-6 sm:pt-20 sm:pb-16",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						"aria-hidden": true,
						className: "pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						"aria-hidden": true,
						className: "pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "relative mb-4 sm:mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3 w-3 opacity-70" }), "Precios de Importador"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
						className: "relative mx-auto max-w-4xl text-[clamp(40px,12vw,84px)] leading-[0.95]",
						children: [
							"Importamos",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: "para que revendas"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("hr", { className: "relative mx-auto mt-5 sm:mt-7 w-28 sm:w-40 border-t border-border/70" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mx-auto mt-4 sm:mt-5 flex items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-medium text-muted-foreground/90",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Envíos a todo el país" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								"aria-hidden": true,
								className: "text-muted-foreground/40",
								children: "•"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Productos originales" })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/catalogo",
							className: "btn-base grad-urgente inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-black uppercase tracking-wide text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95 w-full sm:w-auto",
							children: "Ver Catálogo Mayorista"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/calculadora",
							className: "btn-base border border-border bg-card/80 backdrop-blur-xs hover:bg-muted text-foreground inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Calculator, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Calculadora de Importaciones" })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "relative mt-2 text-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							href: "#minimos",
							className: "text-[11px] font-medium text-muted-foreground/80 transition-colors hover:text-muted-foreground active:scale-95",
							children: ["Aplican mínimos de compra según categoría. ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-bold",
								children: "Ver ↓"
							})]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "mas-vendidos",
				className: "relative overflow-hidden bg-gradient-to-b from-surface via-surface to-primary/5 px-4 py-14 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"aria-hidden": true,
					className: "pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto max-w-[1180px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
							title: "Más vendidos",
							sub: "Los tres productos que más salen esta semana."
						}),
						masVendidos.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative -mx-4 sm:mx-0",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-0 ${masVendidos.length === 1 ? "justify-center" : ""}`,
								children: masVendidos.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `snap-center shrink-0 ${masVendidos.length === 1 ? "w-full max-w-[300px]" : "w-[72vw] max-w-[280px] sm:w-[260px]"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
										p,
										config,
										index: i
									})
								}, p.id ?? i))
							}), masVendidos.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-surface to-transparent sm:block" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-8 flex justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/catalogo",
								className: "btn-base grad-urgente group inline-flex w-full items-center justify-center gap-2 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:px-12",
								children: ["Ver más", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" })]
							})
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "ofertas",
				className: "relative overflow-hidden px-4 pt-6 pb-12 sm:px-6 sm:pt-12 sm:pb-16",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"aria-hidden": true,
					className: "pointer-events-none absolute -top-16 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto max-w-[1180px]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
							title: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["Ofertas ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-primary",
								children: "del día"
							})] }),
							sub: "Precios exclusivos que renovamos todos los días. Válidos solo por hoy."
						}),
						banners.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-8",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-3.5 flex items-center justify-between gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5 flex-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20",
										children: "Combos"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" })]
								}), banners.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "hidden sm:flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: (e) => {
											e.preventDefault();
											e.stopPropagation();
											scrollCombos("left");
										},
										"aria-label": "Deslizar combo anterior",
										className: "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover hover:border-primary/50 text-foreground transition-all active:scale-95 shadow-xs cursor-pointer",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: (e) => {
											e.preventDefault();
											e.stopPropagation();
											scrollCombos("right");
										},
										"aria-label": "Deslizar combo siguiente",
										className: "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover hover:border-primary/50 text-foreground transition-all active:scale-95 shadow-xs cursor-pointer",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" })
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative group -mx-4 sm:mx-0",
								children: [
									banners.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: (e) => {
											e.preventDefault();
											e.stopPropagation();
											scrollCombos("left");
										},
										"aria-label": "Deslizar hacia la izquierda",
										className: "absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground shadow-md hover:bg-surface hover:border-primary transition-all active:scale-95 cursor-pointer",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: (e) => {
											e.preventDefault();
											e.stopPropagation();
											scrollCombos("right");
										},
										"aria-label": "Deslizar hacia la derecha",
										className: "absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground shadow-md hover:bg-surface hover:border-primary transition-all active:scale-95 cursor-pointer",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" })
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										ref: combosScrollRef,
										className: `no-scrollbar flex gap-4 overflow-x-auto px-4 sm:px-0 scroll-smooth ${banners.length === 1 ? "justify-center" : ""}`,
										children: banners.map((b, i) => {
											const basePrice = toNumber(b.precio);
											const discPct = transferDiscountPct(config);
											const tPrice = transferPrice(basePrice, discPct);
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
												to: "/combo/$index",
												params: { index: String(i) },
												className: `group/card relative flex flex-col shrink-0 overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/30 ${banners.length === 1 ? "w-full max-w-[440px]" : "w-[85vw] max-w-[380px] sm:w-[360px] shrink-0"}`,
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "relative aspect-square w-full overflow-hidden bg-surface flex items-center justify-center",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
														src: thumbnailUrl(b.imagen_url, "md") || "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f4f4f5'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='16' fill='%2371717a'%3ESin imagen%3C/text%3E%3C/svg%3E",
														alt: b.titulo ?? "",
														width: 380,
														height: 380,
														loading: "lazy",
														decoding: "async",
														referrerPolicy: "no-referrer",
														className: "h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105",
														onError: onImageError(b.imagen_url)
													}), Array.isArray(b.quantity_tiers) && b.quantity_tiers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "absolute bottom-2 left-2 rounded-md bg-background/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30 shadow-xs",
														children: "🎁 Descuento x cantidad"
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex flex-1 flex-col justify-between gap-2 border-t border-border bg-card p-3.5 sm:p-4",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
														className: "font-bold text-sm sm:text-base text-foreground leading-snug group-hover/card:text-primary transition-colors line-clamp-1",
														children: b.titulo
													}), basePrice > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex flex-col sm:flex-row sm:items-baseline justify-between gap-1",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-baseline gap-1.5 flex-wrap",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "tabular-nums text-base sm:text-lg font-bold text-primary",
																children: money(tPrice)
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400",
																children: [discPct, "% OFF Transf."]
															})]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
															className: "text-[11px] text-muted-foreground",
															children: [
																"o ",
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "font-semibold text-foreground/80",
																	children: money(basePrice)
																}),
																" con Mercado Pago"
															]
														})]
													})]
												})]
											}, i);
										})
									}),
									banners.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-background to-transparent sm:block" })
								]
							})]
						}),
						ofertasDelDia.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-8",
							children: [banners.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-3.5 flex items-center gap-2.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20",
									children: "Productos"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative -mx-4 sm:mx-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: `no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-0 ${ofertasDelDia.length === 1 ? "justify-center" : ""}`,
									children: ofertasDelDia.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: `snap-center shrink-0 ${ofertasDelDia.length === 1 ? "w-full max-w-[300px]" : "w-[72vw] max-w-[280px] sm:w-[260px]"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
											p,
											config,
											index: i
										})
									}, p.id ?? i))
								}), ofertasDelDia.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-background to-transparent sm:block" })]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-8 flex justify-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/catalogo",
								className: "btn-base grad-urgente group inline-flex w-full items-center justify-center gap-2 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:px-12",
								children: ["Ver más", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" })]
							})
						})
					]
				})]
			}),
			(() => {
				const catRules = parseCategoryRules(config);
				const canonicalCategories = [
					{
						key: "tecnologia",
						label: "Tecnología",
						defaultDesc: "5 unidades",
						icon: "🎧"
					},
					{
						key: "perfumes arabes",
						label: "Perfumes Árabes",
						defaultDesc: "5 unidades",
						icon: "🧴"
					},
					{
						key: "perfumes disenador",
						label: "Perfumes Diseñador",
						defaultDesc: "3 unidades",
						icon: "💎"
					},
					{
						key: "bazar",
						label: "Bazar",
						defaultDesc: "5 unidades",
						icon: "🏪"
					},
					{
						key: "mates",
						label: "Mates",
						defaultDesc: "10 unidades",
						icon: "🧉"
					},
					{
						key: "camisetas",
						label: "Camisetas",
						defaultDesc: "10 unidades",
						icon: "👕"
					},
					{
						key: "suplementos",
						label: "Suplementación",
						defaultDesc: "$250.000",
						icon: "⚡"
					},
					{
						key: "zapatillas",
						label: "Zapatillas",
						defaultDesc: "3 unidades",
						icon: "👟"
					}
				];
				const minItems = [];
				const seenKeys = /* @__PURE__ */ new Set();
				for (const cat of canonicalCategories) {
					const rule = catRules[cat.key];
					let desc = cat.defaultDesc;
					if (rule?.minUnits) desc = `${rule.minUnits} unidades`;
					else if (rule?.minAmount) desc = `${money(rule.minAmount)}`;
					minItems.push({
						label: cat.label,
						desc,
						icon: cat.icon
					});
					seenKeys.add(cat.key);
				}
				for (const [key, rule] of Object.entries(catRules)) {
					const norm = normCat(key);
					if (seenKeys.has(norm)) continue;
					if (norm === "perfumes" || norm === "perfume") continue;
					if (rule.minUnits) {
						seenKeys.add(norm);
						const label = key.charAt(0).toUpperCase() + key.slice(1);
						minItems.push({
							label,
							desc: `${rule.minUnits} unidades`,
							icon: "📦"
						});
					} else if (rule.minAmount) {
						seenKeys.add(norm);
						const label = key.charAt(0).toUpperCase() + key.slice(1);
						minItems.push({
							label,
							desc: `${money(rule.minAmount)}`,
							icon: "💰"
						});
					}
				}
				if (minItems.length === 0) return null;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
					id: "minimos",
					className: "px-4 py-10 sm:px-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mx-auto max-w-[1180px]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/5 via-amber-500/[0.03] to-transparent p-5 sm:p-7",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-sans text-base sm:text-lg font-bold tracking-tight",
									children: "Mínimos de compra por categoría"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground mt-0.5",
									children: "Para ciertas categorías aplicamos un mínimo de compra. Podés combinar productos de la misma categoría para llegar al mínimo."
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-4",
								children: minItems.map((it) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2.5 rounded-xl border border-border bg-card/70 px-3 py-2.5 shadow-2xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xl shrink-0",
										children: it.icon
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs font-bold truncate text-foreground",
											children: it.label
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-muted-foreground truncate",
											children: it.desc
										})]
									})]
								}, it.label))
							})]
						})
					})
				});
			})(),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "nosotros",
				className: "relative overflow-hidden border-y border-border px-4 py-16 text-center sm:px-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						"aria-hidden": true,
						className: "absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						"aria-hidden": true,
						className: "pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mx-auto max-w-2xl",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "font-sans text-[clamp(24px,6vw,38px)] font-semibold uppercase tracking-tight text-foreground/90",
								children: "Importamos para que vos revendas"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground sm:text-base",
								children: "Somos un equipo dedicado a traer productos importados de tecnología, bazar, perfumes y mucho más"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: "#contacto",
								className: "btn-base grad-urgente group mt-8 inline-flex items-center gap-2 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg",
								children: ["Emprendé hoy", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReviewsCarousel, {})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HowItWorks, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				id: "contacto",
				className: "relative overflow-hidden bg-gradient-to-b from-primary/5 via-surface to-surface px-4 py-14 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					"aria-hidden": true,
					className: "pointer-events-none absolute -top-16 right-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative mx-auto max-w-[1180px]",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectionHead, {
						title: "Contactanos",
						sub: "Escribinos por el formulario o directo por WhatsApp. Respondemos rápido."
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "grid gap-8 lg:grid-cols-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ContactForm, { config }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "card-soft flex flex-col gap-4 border-l-4 border-primary p-6 shadow-sm",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "font-sans text-lg font-bold normal-case tracking-normal",
									children: "Grupo mayorista de WhatsApp"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "Sumate al grupo para recibir las listas de precios y las ofertas antes que nadie."
								}),
								config["whatsapp_grupo"] && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									className: "btn-base bg-whatsapp text-whatsapp-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg",
									href: sanitizeUrl(config["whatsapp_grupo"]),
									target: "_blank",
									rel: "noopener noreferrer",
									children: "Entrar al grupo"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									className: "btn-base border border-primary/30 text-foreground transition-colors duration-200 hover:bg-primary/5",
									href: waLink(config),
									target: "_blank",
									rel: "noopener noreferrer",
									children: "Escribirnos directo"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-2 space-y-2 text-sm text-muted-foreground",
									children: [
										config["whatsapp_individual"] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "flex items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4 text-primary" }),
												"+",
												config["whatsapp_individual"]
											]
										}),
										config["email"] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4 text-primary" }), config["email"]]
										}),
										config["instagram"] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Instagram, { className: "h-4 w-4 text-primary" }), config["instagram"]]
										})
									]
								})
							]
						})]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
function SectionHead({ title, sub, icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-7",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-1 w-10 rounded-full bg-primary" }), icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-primary",
					children: icon
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-[clamp(24px,7vw,40px)]",
				children: title
			}),
			sub && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-md text-sm text-muted-foreground",
				children: sub
			})
		]
	});
}
function ContactForm({ config }) {
	const [nombre, setNombre] = (0, import_react.useState)("");
	const [contacto, setContacto] = (0, import_react.useState)("");
	const [mensaje, setMensaje] = (0, import_react.useState)("");
	const phone = (config["whatsapp_individual"] ?? "").replace(/\D/g, "");
	const onSubmit = (e) => {
		e.preventDefault();
		const text = encodeURIComponent(`Hola! Soy ${nombre}.\nContacto: ${contacto}\n${mensaje}`);
		window.open(sanitizeUrl(`https://wa.me/${phone}?text=${text}`), "_blank", "noopener,noreferrer");
	};
	const inputClass = "rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
		className: "card-soft flex flex-col gap-4 p-6 shadow-sm",
		onSubmit,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex flex-col gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
					children: "Nombre"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: inputClass,
					required: true,
					value: nombre,
					onChange: (e) => setNombre(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex flex-col gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
					children: "Email o WhatsApp"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					className: inputClass,
					required: true,
					value: contacto,
					onChange: (e) => setContacto(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
				className: "flex flex-col gap-1.5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
					children: "Mensaje"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					className: `${inputClass} min-h-28`,
					required: true,
					placeholder: "Contanos qué estás buscando...",
					value: mensaje,
					onChange: (e) => setMensaje(e.target.value)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "submit",
				className: "btn-base grad-urgente text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg",
				children: "Enviar mensaje"
			})
		]
	});
}
//#endregion
export { Home as component };
