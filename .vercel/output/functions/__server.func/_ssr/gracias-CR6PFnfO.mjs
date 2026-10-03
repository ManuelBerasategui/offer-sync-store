import { i as __toESM } from "../_runtime.mjs";
import { K as waLink, O as money, g as getBankInfo } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { G as Check, L as Copy } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, i as Route$7, p as useCart } from "./router-Cnd2hP15.mjs";
import { o as verifyOrderPayment } from "./orders.functions-EAdNjrjC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/gracias-CR6PFnfO.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function GraciasPage() {
	const { code, status, collection_status, payment_id, collection_id } = Route$7.useSearch();
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { config } = data;
	const cart = useCart();
	const bankInfo = getBankInfo(config);
	const [copiedField, setCopiedField] = (0, import_react.useState)(null);
	const [orderState, setOrderState] = (0, import_react.useState)({ estado: "cargando" });
	const copyToClipboard = (val, field) => {
		navigator.clipboard.writeText(val);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2e3);
	};
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		(async () => {
			if (!code) {
				setOrderState({ estado: "desconocido" });
				return;
			}
			const rawStatus = status || collection_status || "";
			try {
				const res = await verifyOrderPayment({ data: {
					code,
					status: rawStatus,
					collectionStatus: collection_status,
					paymentId: payment_id || collection_id
				} });
				if (!cancelled) {
					setOrderState({
						estado: res.estado,
						total: res.total,
						metodo: res.metodoPago
					});
					if (res.estado === "pagado") cart.clear();
				}
			} catch {
				if (!cancelled) {
					const isApproved = rawStatus.toLowerCase() === "approved";
					setOrderState({ estado: isApproved ? "pagado" : "pendiente" });
					if (isApproved) cart.clear();
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [
		code,
		status,
		collection_status
	]);
	const isApproved = orderState.estado === "pagado";
	const isLoading = orderState.estado === "cargando";
	const isPending = orderState.estado === "pendiente";
	const isRejected = orderState.estado === "rechazado" || orderState.estado === "desconocido";
	const isTransfer = orderState.metodo === "transferencia";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
		className: "flex min-h-screen items-center justify-center px-4 py-12 text-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md w-full",
			children: [
				isApproved ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block rounded-full bg-whatsapp/10 px-3 py-1 text-xs font-bold text-whatsapp uppercase tracking-wider mb-2",
						children: "✓ Pago Aprobado"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-4xl font-bold",
						children: "¡Gracias por tu compra!"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-muted-foreground",
						children: "Recibimos tu pago correctamente. Ya estamos preparando tu pedido y te contactaremos para coordinar el envío."
					})
				] }) : isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2",
						children: "⧗ Verificando pedido…"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-bold",
						children: "Procesando tu pedido"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-muted-foreground",
						children: "Estamos confirmando los detalles. Esto tarda solo unos segundos."
					})
				] }) : isPending ? isTransfer ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2",
						children: "⏳ Pedido Reservado"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-bold",
						children: "¡Tu pedido fue registrado!"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 text-left font-medium leading-relaxed",
						children: [
							"⚠️ ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Regla de reserva:" }),
							" Tu pedido y stock están reservados por ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "24 horas" }),
							". Por favor enviá el comprobante de transferencia a nuestro WhatsApp antes de que caduque el plazo; de lo contrario, la orden se cancelará automáticamente."
						]
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2",
						children: "⏳ Pago en Proceso"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-bold",
						children: "Pago en revisión"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-muted-foreground",
						children: "Tu pago con Mercado Pago está siendo procesado. En cuanto se acredite te avisaremos y prepararemos tu pedido."
					})
				] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive uppercase tracking-wider mb-2",
						children: "✕ Pago No Completado"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-bold text-foreground",
						children: "El pago no se completó"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-muted-foreground",
						children: "Mercado Pago no pudo procesar la transacción o la operación fue cancelada. Podés volver al carrito para reintentar."
					})
				] }),
				code && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-soft mt-6 p-4 text-left",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: "Número de pedido"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 font-mono text-2xl font-bold tracking-wide text-primary",
							children: code
						}),
						orderState.total && orderState.total > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm font-bold text-foreground",
							children: isApproved ? `Total abonado: ${money(orderState.total)}` : isTransfer ? `Total a transferir: ${money(orderState.total)}` : `Total: ${money(orderState.total)}`
						}) : null,
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-xs text-muted-foreground",
							children: "Guardá este código para hacer el seguimiento."
						}),
						isPending && isTransfer && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 border-t border-border/60 pt-3 text-xs space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "font-bold text-foreground",
									children: "Datos para realizar la transferencia:"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Alias: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "font-mono",
										children: bankInfo.alias
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => copyToClipboard(bankInfo.alias, "alias"),
										className: "flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground",
										children: [copiedField === "alias" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3" }), copiedField === "alias" ? "Copiado" : "Copiar"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 pr-2",
										children: ["CBU: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "font-mono break-all",
											children: bankInfo.cbu
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => copyToClipboard(bankInfo.cbu, "cbu"),
										className: "shrink-0 flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground",
										children: [copiedField === "cbu" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3" }), copiedField === "cbu" ? "Copiado" : "Copiar"]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-muted-foreground",
									children: ["Titular: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-foreground",
										children: bankInfo.titular
									})]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex flex-col gap-3",
					children: [isPending && isTransfer ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "btn-base w-full bg-whatsapp text-whatsapp-foreground font-bold shadow-md",
						href: waLink(config, `¡Hola! Adjunto el comprobante de transferencia para el pedido ${code ?? ""} por ${orderState.total ? money(orderState.total) : ""}.`),
						target: "_blank",
						rel: "noopener noreferrer",
						children: "Enviar comprobante por WhatsApp"
					}) : isRejected && !isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/carrito",
						className: "btn-base w-full grad-urgente text-primary-foreground",
						children: "Volver al carrito y reintentar"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/catalogo",
						className: "btn-base w-full grad-urgente text-primary-foreground",
						children: "Seguir comprando"
					}), (!isPending || !isTransfer) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						className: "btn-base w-full bg-whatsapp text-whatsapp-foreground",
						href: waLink(config, code ? `Consulta sobre pedido ${code}` : void 0),
						target: "_blank",
						rel: "noopener noreferrer",
						children: "Escribinos por WhatsApp"
					})]
				})
			]
		})
	});
}
//#endregion
export { GraciasPage as component };
