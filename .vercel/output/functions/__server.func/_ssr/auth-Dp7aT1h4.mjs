import { i as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as supabase } from "./client-Bx8URvVl.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { d as storeQueryOptions, f as useAuth, l as Route$12, o as SiteFooter, s as SiteHeader, u as EMPTY_SHIPPING } from "./router-Cnd2hP15.mjs";
import { o as syncNewUserSubscriber } from "./newsletter.functions-DIz849kv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/auth-Dp7aT1h4.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function getSafeRedirect(target) {
	if (!target) return "/";
	const trimmed = target.trim();
	if (trimmed.startsWith("/") && !trimmed.startsWith("//") && !trimmed.startsWith("/\\")) return trimmed;
	return "/";
}
var inputClass = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";
var MAX_FIELD_LENGTH = 40;
var MAX_EMAIL_LENGTH = 254;
var MAX_PASSWORD_LENGTH = 72;
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
function validateShippingData(form) {
	if (Object.values(form).some((value) => value.length > MAX_FIELD_LENGTH)) return `Cada dato de perfil puede tener hasta ${MAX_FIELD_LENGTH} caracteres.`;
	if (BASE_FIELDS.some((field) => !form[field.key].trim()) || !form.sucursal_correo.trim()) return "Completá todos los datos de envío.";
	if (!/^\d{7,8}$/.test(form.dni.trim())) return "El DNI debe contener entre 7 y 8 números (sin puntos ni letras).";
	if (form.telefono.replace(/\D/g, "").length < 8) return "Ingresá un número de teléfono válido con característica.";
	return null;
}
function AuthPage() {
	const { data } = useSuspenseQuery(storeQueryOptions);
	const { config } = data;
	const search = Route$12.useSearch();
	const navigate = useNavigate();
	const { user, profile, signOut, refreshProfile, isAdmin } = useAuth();
	const mode = search.mode ?? "login";
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [form, setForm] = (0, import_react.useState)(EMPTY_SHIPPING);
	const [msg, setMsg] = (0, import_react.useState)("");
	const [error, setError] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [editingProfile, setEditingProfile] = (0, import_react.useState)(false);
	const [profileForm, setProfileForm] = (0, import_react.useState)(EMPTY_SHIPPING);
	const [profileError, setProfileError] = (0, import_react.useState)("");
	const [profileMsg, setProfileMsg] = (0, import_react.useState)("");
	const [savingProfile, setSavingProfile] = (0, import_react.useState)(false);
	const [acceptMarketing, setAcceptMarketing] = (0, import_react.useState)(true);
	const [recovering, setRecovering] = (0, import_react.useState)(false);
	const [recoveryDone, setRecoveryDone] = (0, import_react.useState)(false);
	const [newPassword, setNewPassword] = (0, import_react.useState)("");
	const [confirmPassword, setConfirmPassword] = (0, import_react.useState)("");
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((event) => {
			if (event === "PASSWORD_RECOVERY") setRecovering(true);
		});
		if (new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery") setRecovering(true);
		return () => sub.subscription.unsubscribe();
	}, []);
	(0, import_react.useEffect)(() => {
		if (!editingProfile) setProfileForm({
			...EMPTY_SHIPPING,
			...profile
		});
	}, [profile, editingProfile]);
	const goToMode = (next) => {
		setError("");
		setMsg("");
		navigate({
			to: "/auth",
			search: {
				mode: next,
				redirect: search.redirect
			},
			replace: true
		});
	};
	const submit = async (e) => {
		e.preventDefault();
		setError("");
		setMsg("");
		setLoading(true);
		try {
			if (mode === "login") {
				const { error: err } = await supabase.auth.signInWithPassword({
					email,
					password
				});
				if (err) {
					if (err.message.includes("Email not confirmed")) throw new Error("Debés confirmar tu casilla de correo electrónico antes de iniciar sesión. Revisá tu email (y la carpeta de Spam).");
					if (err.message.includes("Invalid login credentials")) throw new Error("Email o contraseña incorrectos.");
					throw err;
				}
				const target = getSafeRedirect(search.redirect);
				if (target !== "/") window.location.assign(target);
				else navigate({ to: "/" });
				return;
			}
			if (mode === "register") {
				if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");
				if (password.length > MAX_PASSWORD_LENGTH) throw new Error(`La contraseña puede tener hasta ${MAX_PASSWORD_LENGTH} caracteres.`);
				const shippingError = validateShippingData(form);
				if (shippingError) throw new Error(shippingError);
				if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new Error("Ingresá un correo electrónico válido (ej: nombre@gmail.com).");
				if (email.length > MAX_EMAIL_LENGTH) throw new Error("El email es demasiado largo.");
				const { data: signupData, error: err } = await supabase.auth.signUp({
					email,
					password,
					options: {
						emailRedirectTo: `${window.location.origin}/auth`,
						data: { ...form }
					}
				});
				if (err) throw err;
				syncNewUserSubscriber({ data: {
					email: email.trim(),
					nombre: form.nombre,
					acceptMarketing
				} });
				if (signupData.session) {
					const target = getSafeRedirect(search.redirect);
					if (target !== "/") window.location.assign(target);
					else navigate({ to: "/" });
					return;
				}
				navigate({
					to: "/auth",
					search: {
						mode: "login",
						redirect: search.redirect
					},
					replace: true
				});
				setMsg("¡Cuenta creada con éxito! Ya podés iniciar sesión con tu email y contraseña.");
				return;
			}
			const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
			if (err) throw err;
			setMsg("Te enviamos un mail para restablecer tu contraseña.");
		} catch (err) {
			setError(err instanceof Error ? err.message : "No pudimos completar la operación.");
		} finally {
			setLoading(false);
		}
	};
	const saveProfile = async (e) => {
		e.preventDefault();
		setProfileError("");
		setProfileMsg("");
		const validationError = validateShippingData(profileForm);
		if (validationError) {
			setProfileError(validationError);
			return;
		}
		if (!user) return;
		setSavingProfile(true);
		try {
			const { error: err } = await supabase.from("profiles").upsert({
				id: user.id,
				...profileForm
			});
			if (err) throw err;
			await refreshProfile();
			setProfileMsg("Tus datos se guardaron correctamente.");
			setEditingProfile(false);
		} catch (err) {
			setProfileError(err instanceof Error ? err.message : "No pudimos guardar tus datos. Probá de nuevo.");
		} finally {
			setSavingProfile(false);
		}
	};
	const submitNewPassword = async (e) => {
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
			setRecoveryDone(true);
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
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "mx-auto max-w-[460px] px-4 py-12 sm:px-6",
				children: recovering ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-soft p-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "font-sans text-xl font-bold normal-case tracking-tight",
						children: "Elegí tu nueva contraseña"
					}), recoveryDone ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-sm text-whatsapp",
						children: "¡Contraseña actualizada!"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							setRecovering(false);
							navigate({ to: "/" });
						},
						className: "btn-base grad-urgente text-primary-foreground mt-4",
						children: "Continuar"
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						className: "mt-5 flex flex-col gap-4",
						onSubmit: submitNewPassword,
						children: [
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
									onChange: (e) => setNewPassword(e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex flex-col gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
									children: "Repetir contraseña"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "password",
									required: true,
									minLength: 6,
									maxLength: MAX_PASSWORD_LENGTH,
									className: inputClass,
									value: confirmPassword,
									onChange: (e) => setConfirmPassword(e.target.value)
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "submit",
								disabled: loading,
								className: "btn-base grad-urgente text-primary-foreground disabled:opacity-60",
								children: loading ? "Guardando..." : "Guardar nueva contraseña"
							}),
							error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-destructive",
								children: error
							})
						]
					})]
				}) : user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-soft p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-sans text-xl font-bold normal-case tracking-tight",
							children: "Mi cuenta"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-muted-foreground",
							children: user.email
						}),
						editingProfile ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "mt-5 flex flex-col gap-4",
							onSubmit: saveProfile,
							children: [
								BASE_FIELDS.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
										children: field.label
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										required: true,
										className: inputClass,
										value: profileForm[field.key],
										type: field.key === "telefono" ? "tel" : "text",
										inputMode: field.key === "dni" ? "numeric" : field.key === "telefono" ? "tel" : void 0,
										maxLength: field.key === "dni" ? 8 : MAX_FIELD_LENGTH,
										onChange: (e) => {
											let value = e.target.value;
											if (field.key === "dni") value = value.replace(/\D/g, "").slice(0, 8);
											if (field.key === "telefono") value = value.replace(/[^\d+()\-\s]/g, "");
											setProfileForm({
												...profileForm,
												[field.key]: value
											});
										}
									})]
								}, field.key)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
										children: "Transporte"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										required: true,
										className: inputClass,
										value: profileForm.transporte,
										onChange: (e) => setProfileForm({
											...profileForm,
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
										children: profileForm.transporte === "Vía Cargo" ? "Suc. Vía Cargo más cercana" : "Suc. Correo Argentino más cercana"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										required: true,
										className: inputClass,
										maxLength: MAX_FIELD_LENGTH,
										value: profileForm.sucursal_correo,
										onChange: (e) => setProfileForm({
											...profileForm,
											sucursal_correo: e.target.value
										})
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "submit",
										disabled: savingProfile,
										className: "btn-base grad-urgente flex-1 text-primary-foreground disabled:opacity-60",
										children: savingProfile ? "Guardando..." : "Guardar cambios"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setEditingProfile(false);
											setProfileError("");
										},
										className: "btn-base border border-border text-foreground",
										children: "Cancelar"
									})]
								}),
								profileError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-destructive",
									children: profileError
								})
							]
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							profile && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
								className: "mt-4 space-y-1 text-sm text-muted-foreground",
								children: [
									BASE_FIELDS.map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-semibold text-foreground",
											children: [field.label, ":"]
										}),
										" ",
										profile[field.key] || "—"
									] }, field.key)),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-foreground",
											children: "Transporte:"
										}),
										" ",
										profile.transporte || "—"
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "font-semibold text-foreground",
											children: "Sucursal:"
										}),
										" ",
										profile.sucursal_correo || "—"
									] })
								]
							}),
							profileMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "mt-4 text-sm text-whatsapp",
								children: profileMsg
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => {
									setProfileForm({
										...EMPTY_SHIPPING,
										...profile
									});
									setProfileMsg("");
									setEditingProfile(true);
								},
								className: "btn-base mt-5 w-full border border-border text-foreground",
								children: "Editar perfil"
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 flex flex-col gap-3",
							children: [
								search.redirect && search.redirect !== "/" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
									href: getSafeRedirect(search.redirect),
									className: "btn-base grad-urgente text-center text-primary-foreground font-bold shadow-md hover:opacity-95",
									children: "← Volver a mi compra"
								}),
								isAdmin && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/admin/ordenes",
									className: "btn-base bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-center",
									children: "📦 Panel de Órdenes Pagadas"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/catalogo",
									className: "btn-base border border-border text-foreground text-center",
									children: "Seguir comprando"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => void signOut(),
									className: "btn-base border border-border text-foreground",
									children: "Cerrar sesión"
								})
							]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "card-soft p-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "font-sans text-xl font-bold normal-case tracking-tight",
							children: mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear cuenta" : "Recuperar contraseña"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
							className: "mt-5 flex flex-col gap-4",
							onSubmit: submit,
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
										children: "Usuario (email)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "email",
										required: true,
										className: inputClass,
										maxLength: MAX_EMAIL_LENGTH,
										value: email,
										onChange: (e) => setEmail(e.target.value)
									})]
								}),
								mode !== "forgot" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground",
										children: "Contraseña"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "password",
										required: true,
										minLength: 6,
										className: inputClass,
										maxLength: MAX_PASSWORD_LENGTH,
										value: password,
										onChange: (e) => setPassword(e.target.value)
									})]
								}),
								mode === "register" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
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
												required: true,
												className: inputClass,
												value: form[f.key],
												type: f.key === "telefono" ? "tel" : "text",
												inputMode: f.key === "dni" ? "numeric" : f.key === "telefono" ? "tel" : void 0,
												maxLength: f.key === "dni" ? 8 : MAX_FIELD_LENGTH,
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
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex items-start gap-2.5 cursor-pointer pt-1 pb-1 select-none",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: acceptMarketing,
											onChange: (e) => setAcceptMarketing(e.target.checked),
											className: "mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary accent-primary cursor-pointer"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-muted-foreground leading-snug",
											children: "Deseo recibir ofertas exclusivas, cupones de descuento y novedades de importación por email"
										})]
									})
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "submit",
									disabled: loading,
									className: "btn-base grad-urgente text-primary-foreground disabled:opacity-60",
									children: loading ? "Enviando..." : mode === "login" ? "Iniciar sesión" : mode === "register" ? "Crear mi cuenta" : "Enviar mail de recuperación"
								}),
								error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-destructive",
									children: error
								}),
								msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm text-whatsapp",
									children: msg
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-5 flex flex-col items-start gap-2 text-xs",
							children: [mode === "login" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => goToMode("register"),
								className: "underline text-muted-foreground hover:text-primary",
								children: "¿No tenés cuenta? Registrarse"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => goToMode("forgot"),
								className: "underline text-muted-foreground hover:text-primary",
								children: "¿Olvidaste tu contraseña?"
							})] }), mode !== "login" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => goToMode("login"),
								className: "underline text-muted-foreground hover:text-primary",
								children: "Ya tengo cuenta: iniciar sesión"
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config })
		]
	});
}
//#endregion
export { AuthPage as component };
