import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as supabase } from "./client-Bx8URvVl.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { d as storeQueryOptions, o as SiteFooter, s as SiteHeader } from "./router-Cnd2hP15.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/reset-password-aktTn0tK.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";
var MAX_PASSWORD_LENGTH = 72;
function ResetPasswordPage() {
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { config } = data;
	const navigate = useNavigate();
	const [checkingSession, setCheckingSession] = (0, import_react.useState)(true);
	const [hasValidSession, setHasValidSession] = (0, import_react.useState)(false);
	const [newPassword, setNewPassword] = (0, import_react.useState)("");
	const [confirmPassword, setConfirmPassword] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [done, setDone] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		let mounted = true;
		const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
			if (!mounted) return;
			if (event === "PASSWORD_RECOVERY" || session) {
				setHasValidSession(true);
				setCheckingSession(false);
			}
		});
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (!mounted) return;
			const hash = window.location.hash || "";
			const search = window.location.search || "";
			const isRecovery = Boolean(session) || hash.includes("type=recovery") || hash.includes("access_token") || search.includes("code=");
			setHasValidSession(isRecovery);
			setCheckingSession(false);
		});
		return () => {
			mounted = false;
			sub.subscription.unsubscribe();
		};
	}, []);
	const handleSubmit = async (e) => {
		e.preventDefault();
		setError("");
		if (newPassword.length < 6) {
			setError("La contraseña debe tener al menos 6 caracteres.");
			return;
		}
		if (newPassword.length > MAX_PASSWORD_LENGTH) {
			setError(`La contraseña puede tener hasta ${MAX_PASSWORD_LENGTH} caracteres.`);
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Las contraseñas no coinciden.");
			return;
		}
		setLoading(true);
		try {
			const { error: err } = await supabase.auth.updateUser({ password: newPassword });
			if (err) throw err;
			setDone(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : "No pudimos actualizar la contraseña.");
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-[460px] px-4 py-12 sm:px-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-soft p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-sans text-xl font-bold normal-case tracking-tight text-foreground",
						children: "Restablecer contraseña"
					}), checkingSession ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "py-10 text-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "inline-block h-7 w-7 animate-spin rounded-full border-3 border-primary border-t-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-xs text-muted-foreground",
							children: "Verificando enlace de seguridad..."
						})]
					}) : done ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 font-semibold",
							children: "✓ ¡Tu contraseña se actualizó con éxito!"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => navigate({ to: "/" }),
							className: "btn-base grad-urgente text-primary-foreground w-full shadow-md",
							children: "Ir a la tienda"
						})]
					}) : !hasValidSession ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-muted-foreground",
							children: "El enlace de recuperación es inválido, ya fue utilizado o ha expirado."
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/auth",
							search: { mode: "forgot" },
							className: "btn-base grad-urgente text-primary-foreground w-full inline-flex items-center justify-center text-center shadow-md",
							children: "Solicitar un nuevo enlace"
						})]
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-5 flex flex-col gap-4",
						onSubmit: handleSubmit,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Ingresá tu nueva contraseña para acceder a tu cuenta."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex flex-col gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
									children: "Nueva contraseña"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "password",
									required: true,
									minLength: 6,
									maxLength: MAX_PASSWORD_LENGTH,
									className: inputClass,
									value: newPassword,
									onChange: (e) => setNewPassword(e.target.value),
									placeholder: "Al menos 6 caracteres"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex flex-col gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
									children: "Repetir nueva contraseña"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "password",
									required: true,
									minLength: 6,
									maxLength: MAX_PASSWORD_LENGTH,
									className: inputClass,
									value: confirmPassword,
									onChange: (e) => setConfirmPassword(e.target.value),
									placeholder: "Repetí la contraseña"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: loading,
								className: "btn-base grad-urgente text-primary-foreground disabled:opacity-60 shadow-md",
								children: loading ? "Guardando..." : "Guardar nueva contraseña"
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs font-semibold text-destructive",
								children: error
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6 text-center",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "text-xs font-semibold text-muted-foreground hover:text-foreground",
						children: "← Volver al inicio"
					})
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
//#endregion
export { ResetPasswordPage as component };
