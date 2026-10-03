import { i as __toESM } from "../_runtime.mjs";
import { K as waLink, O as money, R as sanitizeUrl, U as transferDiscountPct, W as transferPrice, g as getBankInfo } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as createServerFn } from "./server-BSCRlM9_.mjs";
import { t as createSsrRpc } from "./store.functions-DYWk1U4D.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { G as Check, I as CreditCard, L as Copy, m as Send, n as X, q as Building2 } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { c as cn, d as storeQueryOptions, f as useAuth, p as useCart } from "./router-Cnd2hP15.mjs";
import { t as createTransferOrder } from "./orders.functions-EAdNjrjC.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/CheckoutFlow-watkGXkm.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Dialog = Dialog$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
/**
* Crea la preferencia de pago en Mercado Pago Y guarda la orden en Supabase
* con estado "pendiente". Cuando MP confirma el pago,
* verifyOrderPayment la actualiza a "pagado".
*/
var createCheckout = createServerFn({ method: "POST" }).validator((data) => {
	if (!data || !Array.isArray(data.items) || data.items.length === 0) throw new Error("Carrito vacío");
	const s = data.shipping ?? {};
	return {
		origin: String(data.origin ?? "").slice(0, 200),
		userId: data.userId ? String(data.userId).slice(0, 60) : void 0,
		couponCode: data.couponCode ? String(data.couponCode).slice(0, 40).toUpperCase().trim() : void 0,
		shipping: {
			nombre: String(s.nombre ?? "").slice(0, 120),
			dni: String(s.dni ?? "").slice(0, 20),
			telefono: String(s.telefono ?? "").slice(0, 30),
			email: String(s.email ?? "").slice(0, 160),
			provincia: String(s.provincia ?? "").slice(0, 60),
			ciudad: String(s.ciudad ?? "").slice(0, 80),
			codigo_postal: String(s.codigo_postal ?? "").slice(0, 12),
			transporte: String(s.transporte ?? "Correo Argentino").slice(0, 40),
			sucursal_correo: String(s.sucursal_correo ?? "").slice(0, 160)
		},
		items: data.items.slice(0, 50).map((i) => ({
			nombre: String(i.nombre ?? "Producto").slice(0, 120),
			qty: Math.max(1, Math.min(9999, Math.round(Number(i.qty) || 1))),
			unitPrice: Math.max(1, Math.round(Number(i.unitPrice) || 0))
		}))
	};
}).handler(createSsrRpc("554a960b24acfd968c885ec765fbc00947cea309407272cee465bd60f52590de"));
var inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";
var MAX_FIELD_LENGTH = 40;
var MAX_EMAIL_LENGTH = 254;
var BASE_FIELDS = [
	{
		key: "nombre",
		label: "Nombre y apellido"
	},
	{
		key: "dni",
		label: "DNI"
	},
	{
		key: "telefono",
		label: "Teléfono"
	},
	{
		key: "email",
		label: "Email",
		type: "email"
	},
	{
		key: "provincia",
		label: "Provincia"
	},
	{
		key: "ciudad",
		label: "Ciudad"
	},
	{
		key: "codigo_postal",
		label: "Código postal"
	}
];
var EMPTY = {
	nombre: "",
	dni: "",
	telefono: "",
	email: "",
	provincia: "",
	ciudad: "",
	codigo_postal: "",
	transporte: "Correo Argentino",
	sucursal_correo: ""
};
/**
* Flujo de pre-pago: 1) datos de envío (autocompletados si hay sesión) 2) pago
* (Transferencia con descuento o Mercado Pago Checkout Pro).
*/
function CheckoutFlow({ items, total, appliedCoupon, onBack }) {
	const { user, profile } = useAuth();
	const navigate = useNavigate();
	const cart = useCart();
	const { data: storeData } = useSuspenseQuery(storeQueryOptions);
	const config = storeData?.config;
	const [step, setStep] = (0, import_react.useState)("shipping");
	const [paymentMethod, setPaymentMethod] = (0, import_react.useState)("transfer");
	const [form, setForm] = (0, import_react.useState)(EMPTY);
	const [showLoginPrompt, setShowLoginPrompt] = (0, import_react.useState)(false);
	const [promptShown, setPromptShown] = (0, import_react.useState)(false);
	const [mpLoading, setMpLoading] = (0, import_react.useState)(false);
	const [transferLoading, setTransferLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [copiedField, setCopiedField] = (0, import_react.useState)(null);
	const bankInfo = (0, import_react.useMemo)(() => getBankInfo(config), [config]);
	const discPct = (0, import_react.useMemo)(() => transferDiscountPct(config), [config]);
	const couponDiscountPct = appliedCoupon?.discountPct ?? 0;
	const couponCode = appliedCoupon?.code;
	const finalTransferTotal = (0, import_react.useMemo)(() => {
		const baseTransfer = transferPrice(total, discPct);
		if (!couponDiscountPct) return baseTransfer;
		return Math.max(1, baseTransfer - Math.round(baseTransfer * (couponDiscountPct / 100)));
	}, [
		total,
		discPct,
		couponDiscountPct
	]);
	const finalMpTotal = (0, import_react.useMemo)(() => {
		if (!couponDiscountPct) return total;
		return Math.max(1, total - Math.round(total * (couponDiscountPct / 100)));
	}, [total, couponDiscountPct]);
	(0, import_react.useEffect)(() => {
		if (user?.email) setForm((prev) => ({
			...prev,
			email: prev.email || user.email || ""
		}));
	}, [user]);
	(0, import_react.useEffect)(() => {
		if (user && profile) setForm((prev) => ({
			nombre: profile.nombre || prev.nombre,
			dni: profile.dni || prev.dni,
			telefono: profile.telefono || prev.telefono,
			email: user.email || prev.email,
			provincia: profile.provincia || prev.provincia,
			ciudad: profile.ciudad || prev.ciudad,
			codigo_postal: profile.codigo_postal || prev.codigo_postal,
			transporte: profile.transporte || prev.transporte || "Correo Argentino",
			sucursal_correo: profile.sucursal_correo || prev.sucursal_correo
		}));
	}, [user, profile]);
	(0, import_react.useEffect)(() => {
		if (!user && !promptShown) {
			const t = setTimeout(() => {
				setShowLoginPrompt(true);
				setPromptShown(true);
			}, 600);
			return () => clearTimeout(t);
		}
	}, [user, promptShown]);
	const canSubmit = (0, import_react.useMemo)(() => form.nombre.trim() && form.dni.trim() && form.telefono.trim() && form.email.trim() && form.provincia.trim() && form.ciudad.trim() && form.codigo_postal.trim() && form.transporte.trim() && form.sucursal_correo.trim(), [form]);
	const copyToClipboard = (textToCopy, field) => {
		if (!navigator?.clipboard) return;
		navigator.clipboard.writeText(textToCopy);
		setCopiedField(field);
		setTimeout(() => setCopiedField(null), 2e3);
	};
	const handleNextStep = (e) => {
		e.preventDefault();
		if (!canSubmit) return;
		const dniDigits = form.dni.replace(/\D/g, "");
		if (dniDigits.length < 7 || dniDigits.length > 9) {
			setError("El DNI debe tener entre 7 y 9 números.");
			return;
		}
		if (form.codigo_postal.replace(/\D/g, "").length < 4) {
			setError("El Código Postal debe tener al menos 4 dígitos.");
			return;
		}
		if (form.telefono.replace(/\D/g, "").length < 8) {
			setError("Ingresá un número de teléfono válido con caracteristica.");
			return;
		}
		setError("");
		setStep("payment");
	};
	const confirmTransfer = async () => {
		setError("");
		setTransferLoading(true);
		try {
			const res = await createTransferOrder({ data: {
				items,
				shipping: form,
				userId: user?.id,
				couponCode: couponCode || void 0
			} });
			if (res.status === "success" && res.orderCode) {
				cart.clear();
				const finalAmount = res.total ?? finalTransferTotal;
				const couponText = couponCode ? ` (con cupón ${couponCode})` : "";
				const waMsg = `¡Hola! Acabo de hacer el pedido ${res.orderCode} por ${money(finalAmount)} mediante Transferencia Bancaria${couponText}. Adjunto el comprobante de pago.`;
				const waUrl = waLink(config ?? {}, waMsg);
				window.open(sanitizeUrl(waUrl), "_blank", "noopener,noreferrer");
				navigate({
					to: "/gracias",
					search: {
						code: res.orderCode,
						status: "pending"
					}
				});
			} else setError(res.message ?? "No pudimos registrar tu pedido. Probá de nuevo.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al procesar el pedido.");
		} finally {
			setTransferLoading(false);
		}
	};
	const goMercadoPago = async () => {
		setError("");
		setMpLoading(true);
		try {
			const res = await createCheckout({ data: {
				items,
				shipping: form,
				origin: window.location.origin,
				userId: user?.id,
				couponCode: couponCode || void 0
			} });
			if (res.url) {
				const safeUrl = sanitizeUrl(res.url);
				if (safeUrl !== "#") window.location.href = safeUrl;
				else setError("URL de pago no válida.");
			} else setError(res.error ?? "No pudimos iniciar el pago.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "No pudimos iniciar el pago. Probá de nuevo.");
		} finally {
			setMpLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "card-soft p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[1px]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: step === "shipping" ? "text-primary" : "text-muted-foreground",
						children: "1. Tus datos"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-muted-foreground",
						children: "→"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: step === "payment" ? "text-primary" : "text-muted-foreground",
						children: "2. Pago"
					})
				]
			}),
			step === "shipping" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "flex flex-col gap-3",
				onSubmit: handleNextStep,
				children: [
					user && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "rounded-lg bg-primary/10 px-3 py-2 text-xs font-semibold text-primary",
						children: "Completamos tus datos automáticamente con tu cuenta."
					}),
					BASE_FIELDS.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1.5",
						children: [
							f.key === "dni" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Ahora te pedimos unos datos para hacer el envío directo a domicilio."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
								children: f.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: f.type ?? "text",
								inputMode: f.key === "dni" ? "numeric" : f.key === "telefono" ? "tel" : void 0,
								maxLength: f.key === "dni" ? 8 : f.key === "email" ? MAX_EMAIL_LENGTH : MAX_FIELD_LENGTH,
								required: true,
								className: inputClass,
								value: form[f.key],
								onChange: (e) => {
									let val = e.target.value;
									if (f.key === "dni") val = val.replace(/\D/g, "").slice(0, 8);
									if (f.key === "telefono") val = val.replace(/[^\d+()\-\s]/g, "");
									setForm({
										...form,
										[f.key]: val
									});
								}
							})
						]
					}, f.key)),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: "Transporte"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							required: true,
							className: inputClass,
							value: form.transporte,
							onChange: (e) => setForm({
								...form,
								transporte: e.target.value
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "Correo Argentino",
								children: "Correo Argentino"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "Vía Cargo",
								children: "Vía Cargo"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
						className: "flex flex-col gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
							children: form.transporte === "Vía Cargo" ? "Suc. Vía Cargo más cercana" : "Suc. Correo Argentino más cercana"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							required: true,
							className: inputClass,
							maxLength: MAX_FIELD_LENGTH,
							value: form.sucursal_correo,
							onChange: (e) => setForm({
								...form,
								sucursal_correo: e.target.value
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "submit",
						disabled: !canSubmit,
						className: "btn-base grad-urgente mt-2 text-primary-foreground disabled:opacity-60",
						children: "Continuar al pago"
					}),
					onBack && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onBack,
						className: "mt-1 w-full rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-surface-hover hover:border-primary/50 active:scale-95",
						children: "← Volver al producto"
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-destructive",
						children: error
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col gap-5",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setPaymentMethod("transfer"),
						className: `flex flex-col items-start rounded-xl border p-3 text-left transition-all ${paymentMethod === "transfer" ? "border-emerald-600 bg-emerald-500/10 shadow-sm" : "border-border bg-card hover:border-border/80"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: `h-4 w-4 ${paymentMethod === "transfer" ? "text-emerald-600" : "text-muted-foreground"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold",
									children: "Transferencia"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "mt-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400",
								children: [discPct, "% OFF"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 tabular-nums text-sm font-bold text-foreground",
								children: money(finalTransferTotal)
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => setPaymentMethod("mercadopago"),
						className: `flex flex-col items-start rounded-xl border p-3 text-left transition-all ${paymentMethod === "mercadopago" ? "border-[#009ee3] bg-[#009ee3]/10 shadow-sm" : "border-border bg-card hover:border-border/80"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreditCard, { className: `h-4 w-4 ${paymentMethod === "mercadopago" ? "text-[#009ee3]" : "text-muted-foreground"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold",
									children: "Mercado Pago"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 text-[10px] text-muted-foreground",
								children: "Precio de lista"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "mt-1 tabular-nums text-sm font-bold text-foreground",
								children: money(finalMpTotal)
							})
						]
					})]
				}), paymentMethod === "transfer" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-bold uppercase tracking-[1px] text-emerald-700 dark:text-emerald-400",
									children: "Total a pagar (Transferencia)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums text-2xl font-bold text-foreground",
									children: money(finalTransferTotal)
								})]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2.5 rounded-xl border border-border bg-card p-4 text-xs",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
									children: "Datos para transferir:"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between border-b border-border/50 pb-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Alias: "
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-mono font-bold text-foreground select-all",
										children: bankInfo.alias
									})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => copyToClipboard(bankInfo.alias, "alias"),
										className: "flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80",
										children: copiedField === "alias" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 text-emerald-600" }), " Copiado"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3" }), " Copiar"] })
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between border-b border-border/50 pb-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 pr-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: "CBU / CVU: "
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-mono font-bold text-foreground select-all break-all",
											children: bankInfo.cbu
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => copyToClipboard(bankInfo.cbu, "cbu"),
										className: "shrink-0 flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground hover:bg-secondary/80",
										children: copiedField === "cbu" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3 w-3 text-emerald-600" }), " Copiado"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3" }), " Copiar"] })
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between border-b border-border/50 pb-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Titular:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-foreground",
										children: bankInfo.titular
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Banco / Entidad:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-semibold text-foreground",
										children: bankInfo.banco
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed font-medium",
							children: [
								"⏳ ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Tu pedido está reservado:" }),
								" Tenés ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "24 horas" }),
								" para enviar el comprobante de pago; de lo contrario, la orden se cancelará automáticamente para liberar el stock."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: confirmTransfer,
							disabled: transferLoading,
							className: "btn-base grad-urgente flex items-center justify-center gap-2 text-primary-foreground disabled:opacity-60",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" }), transferLoading ? "Registrando pedido..." : "Confirmar pedido y enviar comprobante"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setStep("shipping"),
							className: "text-xs font-semibold text-muted-foreground hover:text-primary text-center",
							children: "← Volver a mis datos"
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-destructive",
							children: error
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-baseline justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm font-semibold uppercase tracking-[1px] text-muted-foreground",
								children: "Total a pagar (Mercado Pago)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline gap-2",
								children: [appliedCoupon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs line-through text-muted-foreground",
									children: money(total)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "tabular-nums text-xl font-bold text-foreground",
									children: money(finalMpTotal)
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-[#009ee3]/30 bg-[#009ee3]/5 p-4 text-xs space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-semibold text-foreground",
								children: "Pagá de forma 100% segura con Mercado Pago"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-muted-foreground leading-relaxed",
								children: "Serás redirigido al Checkout oficial de Mercado Pago para pagar con tarjeta de crédito, débito, saldo en cuenta o en efectivo."
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: goMercadoPago,
							disabled: mpLoading,
							className: "btn-base bg-[#009ee3] hover:bg-[#0089c7] text-white disabled:opacity-60 transition-colors",
							children: mpLoading ? "Redirigiendo a Mercado Pago..." : "Pagar con Mercado Pago"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: () => setStep("shipping"),
							className: "text-xs font-semibold text-muted-foreground hover:text-primary text-center",
							children: "← Volver a mis datos"
						}),
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-destructive",
							children: error
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: showLoginPrompt,
				onOpenChange: setShowLoginPrompt,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: "¿Querés obtener descuentos exclusivos?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, { children: "Iniciá sesión y tus datos de envío se completan solos en cada compra." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => setShowLoginPrompt(false),
					className: "btn-base border border-border text-foreground",
					children: "Continuar sin cuenta"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/auth",
					search: {
						mode: "login",
						redirect: typeof window !== "undefined" ? window.location.pathname + window.location.search : void 0
					},
					className: "btn-base grad-urgente text-primary-foreground",
					children: "Iniciar sesión"
				})] })] })
			})
		]
	});
}
//#endregion
export { DialogFooter as a, DialogDescription as i, Dialog as n, DialogHeader as o, DialogContent as r, DialogTitle as s, CheckoutFlow as t };
