import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { A as MailCheck, Y as ArrowLeft, _ as RefreshCw, a as TriangleAlert, k as MailX } from "../_libs/lucide-react.mjs";
import { a as Route$8, d as storeQueryOptions, o as SiteFooter, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { r as resubscribeByToken, s as unsubscribeByToken } from "./newsletter.functions-DIz849kv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/desuscribir-DZN72IN_.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function DesuscribirPage() {
	const { token } = Route$8.useSearch();
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { config } = data;
	const [status, setStatus] = (0, import_react.useState)("idle");
	const [email, setEmail] = (0, import_react.useState)("");
	const [errorMessage, setErrorMessage] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		if (!token) {
			setStatus("error");
			setErrorMessage("No se proporcionó un enlace de desuscripción válido.");
			return;
		}
		const processUnsubscribe = async () => {
			setStatus("loading");
			try {
				const res = await unsubscribeByToken({ data: { token } });
				if (res.success) {
					setStatus("success");
					setEmail(res.email || "");
				} else {
					setStatus("error");
					setErrorMessage(res.error || "El enlace no es válido o ya caducó.");
				}
			} catch {
				setStatus("error");
				setErrorMessage("Ocurrió un error al procesar la solicitud.");
			}
		};
		processUnsubscribe();
	}, [token]);
	const handleResubscribe = async () => {
		if (!token) return;
		setStatus("loading");
		try {
			const res = await resubscribeByToken({ data: { token } });
			if (res.success) setStatus("resubscribed");
			else {
				setStatus("error");
				setErrorMessage(res.error || "No se pudo reactivar la suscripción.");
			}
		} catch {
			setStatus("error");
			setErrorMessage("Error al reactivar la suscripción.");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen flex flex-col bg-background text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex-1 flex items-center justify-center p-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full max-w-md bg-card border border-border rounded-2xl p-6 sm:p-8 text-center shadow-lg",
					children: [
						status === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-8 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "w-10 h-10 text-primary animate-spin mx-auto" }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-xl font-bold",
									children: "Procesando tu solicitud..."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: "Un momento por favor."
								})
							]
						}),
						status === "success" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-4 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MailX, { className: "w-8 h-8" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-2xl font-bold text-foreground",
									children: "Te has desuscrito"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-sm text-muted-foreground leading-relaxed",
									children: [
										"El correo ",
										email ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
											className: "text-foreground",
											children: email
										}) : "asociado",
										" ya no recibirá emails promocionales ni ofertas de Te Importamos."
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-4 space-y-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: handleResubscribe,
										className: "w-full py-2.5 px-4 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium transition",
										children: "¿Fue un error? Volver a suscribirme"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/",
										className: "inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:opacity-90 transition",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "w-4 h-4" }), " Volver a la Tienda"]
									})]
								})
							]
						}),
						status === "resubscribed" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-4 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MailCheck, { className: "w-8 h-8" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-2xl font-bold text-foreground",
									children: "¡Suscripción reactivada!"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground leading-relaxed",
									children: "Volverás a recibir nuestras ofertas exclusivas y novedades de importación."
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "pt-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
										to: "/catalogo",
										className: "inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-md hover:opacity-90 transition",
										children: "Ver Catálogo de Productos"
									})
								})
							]
						}),
						status === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "py-4 space-y-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "w-8 h-8" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-xl font-bold text-foreground",
									children: "Enlace no válido"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-muted-foreground",
									children: errorMessage
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "pt-4",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
										to: "/",
										className: "inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl border border-input bg-background hover:bg-muted text-sm font-medium transition",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "w-4 h-4" }), " Ir al inicio"]
									})
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
//#endregion
export { DesuscribirPage as component };
