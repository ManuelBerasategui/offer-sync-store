import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { B as CircleCheck, H as ChevronRight, U as ChevronLeft, c as Star, v as Quote } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/Social-C2yjfee4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var REVIEWS = [
	{
		name: "Martina G.",
		location: "Rosario, Santa Fe",
		role: "Revendedora de Bazar & Mates",
		stars: 5,
		date: "Hace 3 días",
		text: "La atención de los chicos es impecable. Me mostraron fotos reales de todo el stock antes de cerrar el pedido y al otro día ya estaba despachado. Súper prolijos.",
		avatarBg: "from-orange-500 to-amber-600"
	},
	{
		name: "Nicolás P.",
		location: "Córdoba Capital",
		role: "Emprendedor Tech",
		stars: 5,
		date: "Hace 1 semana",
		text: "Compré un surtido de 10 parlantes y auriculares JBL. El margen de reventa que te queda es excelente y las cajas llegaron selladas y en perfecto estado.",
		avatarBg: "from-blue-500 to-indigo-600"
	},
	{
		name: "Julieta R.",
		location: "CABA, Buenos Aires",
		role: "Tienda de Perfumería",
		stars: 5,
		date: "Hace 2 semanas",
		text: "Excelente predisposición para asesorar y armar pedidos surtidos. Los perfumes árabes son 100% originales con todos sus sellos. Muy recomendables.",
		avatarBg: "from-emerald-500 to-teal-600"
	},
	{
		name: "Federico A.",
		location: "Mendoza",
		role: "Comprador Mayorista",
		stars: 5,
		date: "Hace 2 semanas",
		text: "Ya es la cuarta vez que les compro y siempre cumplen al pie de la letra con los tiempos. Te pasan el código de seguimiento de Correo Argentino al toque.",
		avatarBg: "from-purple-500 to-pink-600"
	},
	{
		name: "Camila V.",
		location: "Mar del Plata",
		role: "Revendedora de Indumentaria",
		stars: 5,
		date: "Hace 3 semanas",
		text: "Tenía dudas porque era mi primera compra grande y me respondieron todo con mucha paciencia. Llegó todo embalado de diez y la calidad es tremenda.",
		avatarBg: "from-rose-500 to-red-600"
	},
	{
		name: "Gonzalo M.",
		location: "San Miguel de Tucumán",
		role: "Local de Accesorios",
		stars: 5,
		date: "Hace 1 mes",
		text: "Da gusto trabajar con gente seria. Precios reales de importador, cero vueltas para coordinar y en dos días ya tenía las encomiendas en el local.",
		avatarBg: "from-amber-500 to-orange-600"
	}
];
function Stars({ value }) {
	const full = Math.floor(value);
	const hasHalf = value % 1 !== 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-center gap-1",
		"aria-label": `${value} estrellas de 5`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center text-amber-400",
			children: Array.from({ length: 5 }).map((_, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: `h-4 w-4 ${idx < full ? "fill-amber-400 text-amber-400" : idx === full && hasHalf ? "fill-amber-400/50 text-amber-400" : "fill-muted/30 text-muted-foreground/30"}` }, idx))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "ml-1 text-xs font-bold text-foreground",
			children: value.toFixed(1)
		})]
	});
}
function ReviewsCarousel() {
	const [active, setActive] = (0, import_react.useState)(0);
	const [isPaused, setIsPaused] = (0, import_react.useState)(false);
	const timerRef = (0, import_react.useRef)(null);
	const next = () => setActive((prev) => (prev + 1) % REVIEWS.length);
	const prev = () => setActive((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);
	(0, import_react.useEffect)(() => {
		if (isPaused) return;
		timerRef.current = setInterval(next, 5e3);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
		};
	}, [isPaused]);
	const current = REVIEWS[active];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mx-auto mt-12 max-w-2xl px-2",
		onMouseEnter: () => setIsPaused(true),
		onMouseLeave: () => setIsPaused(false),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative overflow-hidden rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-sm p-6 sm:p-8 text-left shadow-lg transition-all duration-300",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Quote, { className: "absolute right-6 top-6 h-12 w-12 text-primary/10 -rotate-12 pointer-events-none" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${current.avatarBg} text-sm font-black text-white shadow-sm ring-2 ring-background`,
							children: current.name.slice(0, 2).toUpperCase()
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-bold text-sm sm:text-base text-foreground",
								children: current.name
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3 w-3" }), " Verificado"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-xs text-muted-foreground",
							children: [
								current.role,
								" · ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "opacity-80",
									children: current.location
								})
							]
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col items-end gap-0.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stars, { value: current.stars }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[10px] text-muted-foreground",
							children: current.date
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-4 text-sm sm:text-[15px] leading-relaxed text-foreground/90 font-medium min-h-[56px] flex items-center",
					children: [
						"“",
						current.text,
						"”"
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex items-center justify-between pt-4 border-t border-border/50",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex items-center gap-1.5",
						children: REVIEWS.map((r, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							"aria-label": `Ver opinión de ${r.name}`,
							onClick: () => setActive(idx),
							className: `h-2 rounded-full transition-all duration-300 ${idx === active ? "w-8 bg-primary shadow-xs" : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"}`
						}, r.name))
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: prev,
							"aria-label": "Opinión anterior",
							className: "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover hover:border-primary/50 text-foreground transition-all active:scale-95",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronLeft, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: next,
							"aria-label": "Siguiente opinión",
							className: "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover hover:border-primary/50 text-foreground transition-all active:scale-95",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4" })
						})]
					})]
				})
			]
		})
	});
}
var STEPS = [
	{
		n: "01",
		title: "Elegís tus productos",
		text: "Navegás el catálogo, ves precios por unidad y los descuentos por cantidad."
	},
	{
		n: "02",
		title: "Comprás online",
		text: "Pagás a través de MercadoPago (Checkout Pro) o por transferencia bancaria."
	},
	{
		n: "03",
		title: "Preparamos el pedido",
		text: "Controlamos cada producto y te confirmamos el despacho el mismo día."
	},
	{
		n: "04",
		title: "Recibís y revendés",
		text: "Enviamos a todo el país. Vos ponés tu precio y te queda el margen."
	}
];
function HowItWorks() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "px-4 py-16 sm:px-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-[1180px]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-8 text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-sans text-[clamp(24px,6vw,36px)] font-semibold uppercase tracking-tight",
					children: "Cómo trabajar con nosotros"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mx-auto mt-3 max-w-lg text-sm text-muted-foreground",
					children: "Cuatro pasos simples para arrancar a revender productos importados."
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
				children: STEPS.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-soft p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "font-mono text-xs font-bold text-primary",
							children: s.n
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "mt-2 font-sans text-base font-bold normal-case tracking-normal",
							children: s.title
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm leading-relaxed text-muted-foreground",
							children: s.text
						})
					]
				}, s.n))
			})]
		})
	});
}
//#endregion
export { Stars as i, REVIEWS as n, ReviewsCarousel as r, HowItWorks as t };
