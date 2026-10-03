import { i as __toESM } from "../_runtime.mjs";
import { E as isYes, I as priceOf, S as isLongSleeve, l as categoriesOf, n as JERSEY_FAN_ML_TIERS, r as JERSEY_FAN_TIERS, x as isCamiseta } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { D as MessageCircle, X as ArrowDownUp, h as Search, j as LoaderCircle, n as X } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, o as SiteFooter, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { t as ProductCard } from "./ProductCard-DLhqgPx1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/catalogo-ChVljmNd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Catalogo() {
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { products, config } = data;
	const [search, setSearch] = (0, import_react.useState)("");
	const [cat, setCat] = (0, import_react.useState)("todas");
	const [sort, setSort] = (0, import_react.useState)("destacado");
	const [onlyTop, setOnlyTop] = (0, import_react.useState)(false);
	const [onlyOffers, setOnlyOffers] = (0, import_react.useState)(false);
	const PAGE_SIZE = 20;
	const [visibleCount, setVisibleCount] = (0, import_react.useState)(PAGE_SIZE);
	const [isLoadingMore, setIsLoadingMore] = (0, import_react.useState)(false);
	const sentinelRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		setVisibleCount(PAGE_SIZE);
	}, [
		search,
		cat,
		sort,
		onlyTop,
		onlyOffers
	]);
	const cats = (0, import_react.useMemo)(() => {
		const all = categoriesOf(products);
		const PINNED_FIRST = [
			"Bazar",
			"Zapatillas",
			"Tecnología"
		];
		const PINNED_LAST = ["Vapers"];
		const pinned = PINNED_FIRST.filter((c) => all.includes(c));
		const last = PINNED_LAST.filter((c) => all.includes(c));
		const rest = all.filter((c) => !PINNED_FIRST.includes(c) && !PINNED_LAST.includes(c));
		return [
			...pinned,
			...rest,
			...last
		];
	}, [products]);
	const list = (0, import_react.useMemo)(() => {
		const q = search.trim().toLowerCase();
		const filtered = products.filter((p) => {
			if (cat !== "todas" && (p.categoria ?? "").trim() !== cat) return false;
			if (q) {
				const nom = (p.nombre ?? "").toLowerCase();
				const cate = (p.categoria ?? "").toLowerCase();
				const desc = (p.descripcion ?? "").toLowerCase();
				if (!nom.includes(q) && !cate.includes(q) && !desc.includes(q)) return false;
			}
			if (onlyTop && (p.ventas_semana ?? 0) <= 0 && !isYes(p.destacado)) return false;
			if (onlyOffers && !isYes(p.oferta)) return false;
			return true;
		});
		const usdRate = Number(config?.["dolar_cotizacion"] ?? 0);
		const getSortPrice = (p) => {
			if (isCamiseta(p.categoria, p.nombre) && usdRate > 0) {
				const tiers = isLongSleeve(p.nombre) ? JERSEY_FAN_ML_TIERS : JERSEY_FAN_TIERS;
				return Math.round(tiers[0].unitUsd * 1.07 * usdRate);
			}
			return priceOf(p);
		};
		return [...filtered].sort((a, b) => {
			if (sort === "precio_asc") return getSortPrice(a) - getSortPrice(b);
			if (sort === "precio_desc") return getSortPrice(b) - getSortPrice(a);
			if (sort === "nombre") return (a.nombre ?? "").localeCompare(b.nombre ?? "");
			const ventasB = (b.ventas_semana ?? 0) - (a.ventas_semana ?? 0);
			if (ventasB !== 0) return ventasB;
			return (isYes(b.destacado) ? 1 : 0) - (isYes(a.destacado) ? 1 : 0);
		});
	}, [
		products,
		search,
		cat,
		sort,
		onlyTop,
		onlyOffers,
		config
	]);
	const visibleProducts = (0, import_react.useMemo)(() => {
		return list.slice(0, visibleCount);
	}, [list, visibleCount]);
	const hasMore = visibleCount < list.length;
	(0, import_react.useEffect)(() => {
		if (!hasMore) return;
		const el = sentinelRef.current;
		if (!el) return;
		const observer = new IntersectionObserver((entries) => {
			const first = entries[0];
			if (first && first.isIntersecting && !isLoadingMore) {
				setIsLoadingMore(true);
				setTimeout(() => {
					setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, list.length));
					setIsLoadingMore(false);
				}, 150);
			}
		}, { rootMargin: "350px 0px" });
		observer.observe(el);
		return () => observer.disconnect();
	}, [
		hasMore,
		isLoadingMore,
		list.length
	]);
	const chip = (active) => `shrink-0 rounded-full border px-3 py-1 text-xs font-semibold sm:px-3.5 sm:py-1.5 sm:text-xs transition-all whitespace-nowrap inline-flex items-center gap-1 ${active ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold" : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-border"}`;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-[1180px] px-3.5 py-5 sm:px-6 sm:py-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-3",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[2px] text-amber",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "grad-urgente h-0.5 w-3.5 rounded" }), "Todo el stock"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
								className: "text-2xl sm:text-4xl font-extrabold tracking-tight",
								children: "Catálogo completo"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-0.5 text-xs sm:text-sm text-muted-foreground",
								children: "Buscá por producto o categoría, filtrá y ordená según tu conveniencia."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "sticky top-[57px] z-30 -mx-3.5 mb-3 bg-background/95 px-3.5 py-2 backdrop-blur-md border-b border-border/40 shadow-xs sm:mx-0 sm:px-0 sm:border-0 sm:shadow-none",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative flex-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "search",
											value: search,
											onChange: (e) => setSearch(e.target.value),
											placeholder: "Buscar por producto o categoría...",
											className: "h-8.5 sm:h-9.5 w-full rounded-lg border border-input bg-card pl-8 pr-7 text-xs sm:text-sm outline-none focus:border-primary transition-colors"
										}),
										search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setSearch(""),
											className: "absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
										})
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative shrink-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: sort,
										onChange: (e) => setSort(e.target.value),
										className: "h-8.5 sm:h-9.5 rounded-lg border border-input bg-card pl-2.5 pr-6 text-[11px] sm:text-xs font-semibold outline-none focus:border-primary appearance-none cursor-pointer",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "destacado",
												children: "Más vendidos"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "precio_asc",
												children: "Menor precio"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "precio_desc",
												children: "Mayor precio"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "nombre",
												children: "Nombre A-Z"
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownUp, { className: "pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" })]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "no-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:flex-wrap",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: chip(cat === "todas" && !onlyOffers && !onlyTop),
										onClick: () => {
											setCat("todas");
											setOnlyOffers(false);
											setOnlyTop(false);
										},
										children: "Todas"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: chip(onlyOffers),
										onClick: () => setOnlyOffers((v) => !v),
										children: "Ofertas"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: chip(onlyTop),
										onClick: () => setOnlyTop((v) => !v),
										children: "Más vendidos"
									}),
									cats.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										className: chip(cat === c),
										onClick: () => setCat(c),
										children: c
									}, c))
								]
							})]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: list.length ? `Mostrando ${visibleProducts.length} de ${list.length} ${list.length === 1 ? "producto" : "productos"}` : "0 productos" })
					}),
					cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes("camiseta") && (() => {
						const phone = (config["whatsapp_individual"] ?? config["whatsapp_numero"] ?? "").replace(/\D/g, "");
						if (!phone) return null;
						const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent("Hola! Estaba viendo las camisetas en el catálogo y no encontré el modelo que buscaba. ¿Me podés ayudar?")}`;
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
							id: "banner-camisetas-whatsapp",
							href: waUrl,
							target: "_blank",
							rel: "noopener noreferrer",
							className: "mb-5 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3.5 transition-all hover:bg-primary/14 hover:border-primary/50 hover:shadow-sm sm:gap-4 sm:px-5 sm:py-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary sm:h-10 sm:w-10",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, {
										className: "h-4.5 w-4.5 sm:h-5 sm:w-5",
										fill: "currentColor"
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex-1 min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] font-bold uppercase tracking-wider text-primary sm:text-xs",
										children: "¿No encontrás lo que buscás?"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-0.5 text-xs text-foreground/80 sm:text-[13px]",
										children: [
											"Tenemos modelos que no siempre están en el catálogo online.",
											" ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-foreground",
												children: "Consultanos por WhatsApp"
											}),
											" y lo conseguimos."
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "shrink-0 rounded-xl bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 sm:px-4 sm:py-2 sm:text-xs",
									children: "Escribir →"
								})
							]
						});
					})(),
					list.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4",
							children: visibleProducts.map((p, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductCard, {
								p,
								config,
								index: i
							}, p.id ?? i))
						}),
						hasMore && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							ref: sentinelRef,
							className: "h-6 w-full"
						}),
						isLoadingMore && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "my-8 flex flex-col items-center justify-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs font-medium text-muted-foreground",
								children: "Cargando más productos..."
							})]
						}),
						!hasMore && list.length > PAGE_SIZE && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-10 flex items-center justify-center gap-3 text-xs font-semibold text-muted-foreground/60",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px w-12 bg-border/60" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Fin del catálogo" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-px w-12 bg-border/60" })
							]
						})
					] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "my-10 flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 p-8 text-center sm:p-12",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-6 w-6" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-bold text-foreground",
								children: "No encontramos productos"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 max-w-md text-xs sm:text-sm text-muted-foreground",
								children: search && cat !== "todas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									"No hay resultados para ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-semibold text-foreground",
										children: [
											"\"",
											search,
											"\""
										]
									}),
									" dentro de ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-semibold text-foreground",
										children: [
											"\"",
											cat,
											"\""
										]
									}),
									"."
								] }) : search ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									"No hay productos que coincidan con ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-semibold text-foreground",
										children: [
											"\"",
											search,
											"\""
										]
									}),
									"."
								] }) : "No hay productos disponibles con los filtros seleccionados."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-5 flex flex-wrap items-center justify-center gap-2",
								children: [search && cat !== "todas" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: () => setCat("todas"),
									className: "rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-xs transition hover:opacity-90 active:scale-95",
									children: [
										"Buscar \"",
										search,
										"\" en todas las categorías"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										setSearch("");
										setCat("todas");
										setOnlyOffers(false);
										setOnlyTop(false);
									},
									className: "rounded-lg border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition hover:bg-muted active:scale-95",
									children: "Limpiar filtros"
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-10 flex justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							className: "btn-base border border-border text-foreground",
							children: "← Volver al inicio"
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
//#endregion
export { Catalogo as component };
