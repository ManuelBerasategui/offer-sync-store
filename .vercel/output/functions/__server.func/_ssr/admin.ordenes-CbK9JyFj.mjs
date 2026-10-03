import { i as __toESM } from "../_runtime.mjs";
import { O as money, R as sanitizeUrl } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { B as CircleCheck, D as MessageCircle, F as DollarSign, G as Check, L as Copy, T as PackageCheck, _ as RefreshCw, d as ShoppingBag, h as Search, o as Trash2, q as Building2, z as Clock } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, f as useAuth, o as SiteFooter, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { t as AdminHeader } from "./AdminHeader-BLhPJ18f.mjs";
import { a as updateOrderStatus, i as getAdminReservedOrders, n as deleteAdminOrder, r as getAdminPaidOrders } from "./orders.functions-EAdNjrjC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.ordenes-CbK9JyFj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminOrdenesPage() {
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { config } = data;
	const { user, session, loading: authLoading } = useAuth();
	const [isAuthorized, setIsAuthorized] = (0, import_react.useState)(null);
	const [tab, setTab] = (0, import_react.useState)("reservadas");
	const [subFilter, setSubFilter] = (0, import_react.useState)("all");
	const [paidOrders, setPaidOrders] = (0, import_react.useState)([]);
	const [reservedOrders, setReservedOrders] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)("");
	const [search, setSearch] = (0, import_react.useState)("");
	const [copiedId, setCopiedId] = (0, import_react.useState)(null);
	const [deleteOrderCode, setDeleteOrderCode] = (0, import_react.useState)(null);
	const [deleteConfirmOpen, setDeleteConfirmOpen] = (0, import_react.useState)(false);
	const [deleting, setDeleting] = (0, import_react.useState)(false);
	const userId = user?.id;
	const authPayload = {
		email: user?.email ?? "",
		token: session?.access_token ?? ""
	};
	const loadOrders = async (isInitial = false) => {
		if (isInitial || paidOrders.length === 0 && reservedOrders.length === 0) setLoading(true);
		setError("");
		try {
			const [paidRes, reservedRes] = await Promise.all([getAdminPaidOrders({ data: authPayload }), getAdminReservedOrders({ data: authPayload })]);
			if (paidRes.error) {
				if (paidRes.error.toLowerCase().includes("acceso denegado")) {
					setIsAuthorized(false);
					navigate({
						to: "/",
						replace: true
					});
					return;
				}
				setError(paidRes.error);
			} else {
				setIsAuthorized(true);
				setPaidOrders(paidRes.orders ?? []);
			}
			if (!reservedRes.error) setReservedOrders(reservedRes.orders ?? []);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Error al cargar las órdenes.";
			setError(msg);
		} finally {
			setLoading(false);
		}
	};
	(0, import_react.useEffect)(() => {
		if (!authLoading) {
			if (!userId) navigate({
				to: "/",
				replace: true
			});
			else loadOrders(true);
		}
	}, [authLoading, userId]);
	const activeOrders = tab === "pagadas" ? paidOrders : reservedOrders;
	const methodCounts = (0, import_react.useMemo)(() => {
		return {
			all: activeOrders.length,
			transfer: activeOrders.filter((o) => (o.metodo_pago ?? "").toLowerCase() === "transferencia").length,
			card: activeOrders.filter((o) => (o.metodo_pago ?? "").toLowerCase() === "tarjeta").length,
			mp: activeOrders.filter((o) => (o.metodo_pago ?? "").toLowerCase() === "mercadopago").length
		};
	}, [activeOrders]);
	const filteredOrders = (0, import_react.useMemo)(() => {
		let list = activeOrders;
		if (subFilter !== "all") list = list.filter((o) => (o.metodo_pago ?? "").toLowerCase() === subFilter);
		if (!search.trim()) return list;
		const term = search.toLowerCase().trim();
		return list.filter((o) => {
			const codeMatch = o.order_code.toLowerCase().includes(term);
			const nameMatch = o.nombre.toLowerCase().includes(term);
			const dniMatch = o.dni.toLowerCase().includes(term);
			const emailMatch = o.email.toLowerCase().includes(term);
			const cityMatch = o.ciudad.toLowerCase().includes(term);
			const itemMatch = o.items.some((i) => i.nombre.toLowerCase().includes(term));
			return codeMatch || nameMatch || dniMatch || emailMatch || cityMatch || itemMatch;
		});
	}, [
		activeOrders,
		subFilter,
		search
	]);
	const stats = (0, import_react.useMemo)(() => {
		const totalVentas = filteredOrders.reduce((sum, o) => sum + o.total, 0);
		const totalListPrice = filteredOrders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty * i.unitPrice, 0), 0);
		const totalDescuentos = Math.max(0, totalListPrice - totalVentas);
		const count = filteredOrders.length;
		return {
			totalVentas,
			totalListPrice,
			totalDescuentos,
			count,
			promedio: count > 0 ? Math.round(totalVentas / count) : 0
		};
	}, [filteredOrders]);
	const handleStatusChange = async (orderCode, newStatus) => {
		try {
			if ((await updateOrderStatus({ data: {
				orderCode,
				estado: newStatus,
				token: session?.access_token ?? "",
				email: user?.email ?? ""
			} })).status === "success") {
				const updater = (prev) => prev.map((o) => o.order_code === orderCode ? {
					...o,
					estado: newStatus
				} : o);
				setPaidOrders(updater);
				setReservedOrders(updater);
			}
		} catch (err) {
			console.error("Error actualizando orden:", err);
		}
	};
	const handleDeleteOrder = async () => {
		if (!deleteOrderCode) return;
		setDeleting(true);
		try {
			if ((await deleteAdminOrder({ data: {
				orderCode: deleteOrderCode,
				token: session?.access_token ?? "",
				email: user?.email ?? ""
			} })).status === "success") {
				const remover = (prev) => prev.filter((o) => o.order_code !== deleteOrderCode);
				setPaidOrders(remover);
				setReservedOrders(remover);
			}
		} catch (err) {
			console.error("Error eliminando orden:", err);
		} finally {
			setDeleting(false);
			setDeleteConfirmOpen(false);
			setDeleteOrderCode(null);
		}
	};
	const copyShippingLabel = (order) => {
		const text = `DESTINATARIO: ${order.nombre}
DNI: ${order.dni}
TELÉFONO: ${order.telefono}
EMAIL: ${order.email}
DIRECCIÓN: ${order.ciudad}, ${order.provincia} (CP: ${order.codigo_postal})
TRANSPORTE: ${order.transporte}
SUCURSAL: ${order.sucursal_correo}
ORDEN: ${order.order_code}
TOTAL: ${money(order.total)}`;
		navigator.clipboard.writeText(text).then(() => {
			setCopiedId(order.id);
			setTimeout(() => setCopiedId(null), 2e3);
		});
	};
	const formatFecha = (iso) => {
		if (!iso) return "";
		try {
			return new Date(iso).toLocaleString("es-AR", {
				day: "2-digit",
				month: "2-digit",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit"
			});
		} catch {
			return iso;
		}
	};
	const getWaClientLink = (order) => {
		const phone = order.telefono.replace(/\D/g, "");
		if (!phone) return null;
		const cleanPhone = phone.startsWith("54") ? phone : `549${phone}`;
		const text = encodeURIComponent(`Hola ${order.nombre}! Te escribimos de Te importamos sobre tu pedido ${order.order_code}.`);
		return sanitizeUrl(`https://wa.me/${cleanPhone}?text=${text}`);
	};
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (!authLoading && !user) navigate({
			to: "/",
			replace: true
		});
	}, [
		authLoading,
		user,
		navigate
	]);
	if (!authLoading && (!user || isAuthorized === false)) {
		if (typeof window !== "undefined") window.location.replace("/");
		return null;
	}
	if (authLoading || isAuthorized === null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen bg-background flex items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-[1180px] px-3 py-4 sm:px-6 sm:py-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminHeader, {
						title: "Órdenes",
						subtitle: "Gestión de ventas y etiquetas de envío de la tienda.",
						currentRoute: "ordenes",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => void loadOrders(),
							disabled: loading,
							className: "btn-base border border-border bg-surface hover:border-primary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground sm:px-4 sm:py-2 sm:text-sm disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: `h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Actualizar" })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex gap-1 rounded-xl border border-border bg-surface p-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setTab("reservadas");
								setSearch("");
							},
							className: `flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === "reservadas" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-4 w-4" }),
								"Pendientes / Reservadas",
								reservedOrders.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `rounded-full px-2 py-0.5 text-[11px] font-bold ${tab === "reservadas" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted text-muted-foreground"}`,
									children: reservedOrders.length
								})
							]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setTab("pagadas");
								setSearch("");
							},
							className: `flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all ${tab === "pagadas" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, { className: "h-4 w-4" }),
								"Pagadas",
								paidOrders.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `rounded-full px-2 py-0.5 text-[11px] font-bold ${tab === "pagadas" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`,
									children: paidOrders.length
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSubFilter("all"),
								className: `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${subFilter === "all" ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"}`,
								children: [
									"Todas (",
									methodCounts.all,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSubFilter("transferencia"),
								className: `whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${subFilter === "transferencia" ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3 w-3" }),
									"Transferencia (",
									methodCounts.transfer,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSubFilter("tarjeta"),
								className: `whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${subFilter === "tarjeta" ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"}`,
								children: [
									"💳 Tarjeta (",
									methodCounts.card,
									")"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setSubFilter("mercadopago"),
								className: `whitespace-nowrap flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${subFilter === "mercadopago" ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-surface text-muted-foreground border-border hover:text-foreground hover:bg-muted/50"}`,
								children: [
									"🔵 Mercado Pago (",
									methodCounts.mp,
									")"
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 grid grid-cols-3 gap-2 sm:gap-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-soft flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex h-7 w-7 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-3.5 w-3.5 sm:h-6 sm:w-6" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate",
											children: tab === "pagadas" ? "Recaudado (neto)" : "Reservado (neto)"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-xs sm:text-2xl font-bold tracking-tight text-foreground truncate",
											children: money(stats.totalVentas)
										}),
										stats.totalDescuentos > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "hidden sm:block text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5",
											children: [
												"-",
												money(stats.totalDescuentos),
												" en descuentos"
											]
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-soft flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex h-7 w-7 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-primary/10 text-primary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, { className: "h-3.5 w-3.5 sm:h-6 sm:w-6" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate",
										children: "Pedidos"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs sm:text-2xl font-bold tracking-tight text-foreground",
										children: stats.count
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "card-soft flex flex-col sm:flex-row items-center sm:items-start gap-1.5 sm:gap-4 p-2.5 sm:p-5 text-center sm:text-left",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "flex h-7 w-7 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShoppingBag, { className: "h-3.5 w-3.5 sm:h-6 sm:w-6" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[9px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate",
										children: "Promedio (neto)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs sm:text-2xl font-bold tracking-tight text-foreground truncate",
										children: money(stats.promedio)
									})]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 sm:mt-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5 sm:px-4 sm:py-3 shadow-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground shrink-0" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								placeholder: "Buscar cliente, DNI, email o código TI-...",
								value: search,
								onChange: (e) => setSearch(e.target.value),
								className: "w-full bg-transparent text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none"
							}),
							search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => setSearch(""),
								className: "text-xs font-bold text-muted-foreground hover:text-foreground shrink-0",
								children: "Limpiar"
							})
						]
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 sm:mt-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-semibold text-destructive",
						children: error
					}),
					loading && activeOrders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-16 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inline-block h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-4 text-sm font-semibold text-muted-foreground",
							children: "Cargando órdenes desde la base de datos..."
						})]
					}) : filteredOrders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 rounded-xl border border-border bg-surface py-12 text-center",
						children: [
							tab === "reservadas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "mx-auto h-10 w-10 text-muted-foreground/50" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackageCheck, { className: "mx-auto h-10 w-10 text-muted-foreground/50" }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "mt-3 text-base font-bold text-foreground",
								children: tab === "reservadas" ? "No hay órdenes pendientes" : "No hay órdenes pagadas"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-1 text-xs text-muted-foreground",
								children: search ? "No encontramos ninguna orden que coincida con tu búsqueda." : tab === "reservadas" ? "No hay órdenes pendientes con el filtro seleccionado." : "Aún no se han registrado pagos completados."
							})
						]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4 sm:mt-6 flex flex-col gap-4 sm:gap-6",
						children: filteredOrders.map((order) => {
							const waClient = getWaClientLink(order);
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `card-soft overflow-hidden p-3.5 sm:p-6 border shadow-sm transition-all hover:border-primary/50 ${order.estado === "pendiente" ? "border-amber-500/30" : "border-border"}`,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-2.5 border-b border-border pb-3 sm:pb-4 sm:flex-row sm:items-center sm:justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center gap-1.5 sm:gap-3",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-mono text-sm sm:text-base font-bold text-primary bg-primary/10 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-lg",
												children: order.order_code
											}),
											order.estado === "pagado" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase",
												children: "✓ Pagado"
											}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "rounded-md bg-amber-500/15 px-2 py-0.5 text-[11px] sm:text-xs font-bold text-amber-700 dark:text-amber-400 uppercase",
												children: "⏳ Pendiente"
											}),
											order.metodo_pago && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-1 rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] sm:text-xs text-muted-foreground capitalize",
												children: [
													order.metodo_pago === "transferencia" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-3 w-3 text-emerald-600" }),
													order.metodo_pago === "tarjeta" && "💳 ",
													order.metodo_pago === "mercadopago" && "🔵 ",
													order.metodo_pago
												]
											})
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-0",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-[11px] sm:text-xs text-muted-foreground font-medium",
											children: formatFecha(order.created_at)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-lg sm:text-xl font-extrabold text-foreground tabular-nums",
											children: money(order.total)
										})]
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-4 grid gap-4 md:grid-cols-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-col justify-between rounded-xl bg-surface/50 p-3.5 sm:p-4 border border-border/60",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
											className: "text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3",
											children: "Datos del Cliente y Envío"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1 text-xs sm:text-sm",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-bold text-foreground text-sm sm:text-base",
													children: order.nombre
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-muted-foreground",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "font-semibold text-foreground",
															children: "DNI:"
														}),
														" ",
														order.dni || "No especificado"
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-muted-foreground break-all",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "font-semibold text-foreground",
															children: "Email:"
														}),
														" ",
														order.email
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-muted-foreground",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "font-semibold text-foreground",
															children: "Teléfono:"
														}),
														" ",
														order.telefono
													]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "mt-2.5 pt-2.5 border-t border-border/60 text-xs leading-relaxed",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "font-semibold text-foreground",
															children: [
																order.ciudad,
																", ",
																order.provincia,
																" ",
																order.codigo_postal ? `(CP: ${order.codigo_postal})` : ""
															]
														}),
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "mt-1 text-muted-foreground",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "font-bold text-foreground",
																	children: "Transporte:"
																}),
																" ",
																order.transporte
															]
														}),
														order.sucursal_correo && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "text-muted-foreground",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "font-bold text-foreground",
																	children: "Sucursal:"
																}),
																" ",
																order.sucursal_correo
															]
														})
													]
												})
											]
										})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-3.5 pt-3 border-t border-border flex flex-col sm:flex-row flex-wrap gap-2",
											children: [
												order.estado === "pendiente" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => void handleStatusChange(order.order_code, "pagado"),
													className: "btn-base w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 flex items-center gap-1.5 shadow-sm",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-3.5 w-3.5" }), "Marcar como Pagado"]
												}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => void handleStatusChange(order.order_code, "pendiente"),
													className: "btn-base w-full sm:w-auto justify-center border border-border bg-background hover:bg-surface text-xs font-semibold py-2 px-3 text-muted-foreground",
													children: "Revertir a Pendiente"
												}),
												waClient && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
													href: sanitizeUrl(waClient),
													target: "_blank",
													rel: "noopener noreferrer",
													className: "btn-base w-full sm:w-auto justify-center bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#128C7E] dark:text-[#25D366] text-xs font-semibold py-2 px-3 flex items-center gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-3.5 w-3.5" }), "WhatsApp Cliente"]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													onClick: () => copyShippingLabel(order),
													className: "btn-base w-full sm:w-auto justify-center border border-border bg-background hover:bg-surface text-xs font-semibold py-2 px-3 flex items-center gap-1.5 text-foreground",
													children: copiedId === order.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5 text-emerald-500" }), "¡Copiado!"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3.5 w-3.5" }), "Copiar Datos de Envío"] })
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => {
														setDeleteOrderCode(order.order_code);
														setDeleteConfirmOpen(true);
													},
													className: "btn-base w-full sm:w-auto justify-center bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30 text-xs font-semibold py-2 px-3 flex items-center gap-1.5 sm:ml-auto",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" }), "Eliminar Venta"]
												})
											]
										})]
									}), (() => {
										const itemsSubtotal = order.items.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
										const descuento = Math.max(0, itemsSubtotal - order.total);
										const hasDiscount = descuento > 0;
										return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl bg-surface/50 p-3.5 sm:p-4 border border-border/60 flex flex-col justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", {
												className: "text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 sm:mb-3",
												children: [
													"Productos Comprados (",
													order.items.reduce((acc, i) => acc + i.qty, 0),
													" u.)"
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "divide-y divide-border/60",
												children: order.items.map((item, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 sm:gap-0 text-xs sm:text-sm",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "min-w-0",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
															className: "font-semibold text-foreground leading-snug break-words",
															children: item.nombre
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "text-[11px] text-muted-foreground",
															children: [
																item.qty,
																" x ",
																money(item.unitPrice)
															]
														})]
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-bold text-foreground tabular-nums shrink-0 text-xs sm:text-sm sm:pl-2",
														children: money(item.qty * item.unitPrice)
													})]
												}, idx))
											})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-3.5 pt-3 border-t border-border space-y-1.5",
												children: [hasDiscount && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between items-center text-xs text-muted-foreground",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Subtotal de lista" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "tabular-nums line-through",
														children: money(itemsSubtotal)
													})]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between items-center text-xs font-semibold text-emerald-600 dark:text-emerald-400",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Descuento aplicado" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
														className: "tabular-nums",
														children: ["-", money(descuento)]
													})]
												})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex justify-between items-center text-xs sm:text-sm font-bold pt-1 border-t border-border/60",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "text-muted-foreground",
														children: "Total cobrado"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: `text-base sm:text-lg tabular-nums ${hasDiscount ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`,
														children: money(order.total)
													})]
												})]
											})]
										});
									})()]
								})]
							}, order.id);
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config }),
			deleteConfirmOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center p-4",
				role: "dialog",
				"aria-modal": "true",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 bg-black/60 backdrop-blur-sm",
					onClick: () => {
						if (!deleting) {
							setDeleteConfirmOpen(false);
							setDeleteOrderCode(null);
						}
					}
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10 w-full max-w-sm rounded-2xl border border-red-500/30 bg-background shadow-2xl p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-3 mb-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-5 w-5 text-red-500" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-base font-bold text-foreground",
								children: "Eliminar Venta"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Esta acción no se puede deshacer."
							})] })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground mb-1",
							children: "¿Estás seguro de que querés eliminar la orden"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm font-bold text-foreground mb-5 font-mono",
							children: [deleteOrderCode, "?"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setDeleteConfirmOpen(false);
									setDeleteOrderCode(null);
								},
								disabled: deleting,
								className: "btn-base flex-1 justify-center border border-border bg-surface hover:bg-muted text-sm font-semibold py-2.5 text-foreground disabled:opacity-50",
								children: "Cancelar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void handleDeleteOrder(),
								disabled: deleting,
								className: "btn-base flex-1 justify-center bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 flex items-center gap-2 disabled:opacity-60",
								children: deleting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" }), " Eliminando..."] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }), " Eliminar"] })
							})]
						})
					]
				})]
			})
		]
	});
}
//#endregion
export { AdminOrdenesPage as component };
