import { i as __toESM } from "../_runtime.mjs";
import { A as normCat, O as money, P as parseCategoryRules, _ as getBaseCategory } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as useQueryClient, n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { b as Plus, g as Save, n as X, p as Settings2 } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, f as useAuth, o as SiteFooter, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { t as AdminHeader } from "./AdminHeader-BLhPJ18f.mjs";
import { _ as upsertCategoryRules, c as getCouponUsagesSummary, d as testAdminResendEmail, s as getAdminProducts } from "./products.functions-BgXArIxF.mjs";
import { a as sendNextCampaignBatch, i as sendCampaignTestEmail, n as getCampaignsSummary, t as createNewsletterCampaign } from "./newsletter.functions-DIz849kv.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.configuracion-DBXG2KaI.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AdminConfiguracionPage() {
	const { data: storeData } = useSuspenseQuery(storeQueryOptions);
	const { config } = storeData;
	const { user, session, loading: authLoading } = useAuth();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [isAuthorized, setIsAuthorized] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const [successMsg, setSuccessMsg] = (0, import_react.useState)("");
	const [categories, setCategories] = (0, import_react.useState)([]);
	const [rules, setRules] = (0, import_react.useState)({});
	const [dolarRate, setDolarRate] = (0, import_react.useState)(config["dolar_cotizacion"] ?? "1500");
	const [liveUsdt, setLiveUsdt] = (0, import_react.useState)(null);
	const [dbDolarRate, setDbDolarRate] = (0, import_react.useState)(null);
	const [bankAlias, setBankAlias] = (0, import_react.useState)(config["transferencia_alias"] ?? "teimportamos.mp");
	const [bankCbu, setBankCbu] = (0, import_react.useState)(config["transferencia_cbu"] ?? "0000003100012345678901");
	const [bankTitular, setBankTitular] = (0, import_react.useState)(config["transferencia_titular"] ?? "Te Importamos Argentina");
	const [bankBanco, setBankBanco] = (0, import_react.useState)(config["transferencia_banco"] ?? "Mercado Pago");
	const [bankDiscountPct, setBankDiscountPct] = (0, import_react.useState)(config["transferencia_descuento_pct"] ?? "7");
	const [resendApiKey, setResendApiKey] = (0, import_react.useState)(config["resend_api_key"] ?? "");
	const [resendFrom, setResendFrom] = (0, import_react.useState)(config["resend_from"] ?? "Te Importamos <noreply@teimportamosarg.com>");
	const [testingEmail, setTestingEmail] = (0, import_react.useState)(false);
	const [testEmailMsg, setTestEmailMsg] = (0, import_react.useState)(null);
	const [couponActive, setCouponActive] = (0, import_react.useState)((config["promo_cupon_activo"] ?? "SI").toUpperCase() === "SI");
	const [couponCode, setCouponCode] = (0, import_react.useState)(config["promo_cupon_codigo"] ?? "TEIMPORTAMOS");
	const [couponDiscountPct, setCouponDiscountPct] = (0, import_react.useState)(config["promo_cupon_descuento_pct"] ?? "5");
	const [couponUsageCount, setCouponUsageCount] = (0, import_react.useState)(null);
	const [testEmailTarget, setTestEmailTarget] = (0, import_react.useState)("");
	const [calcFleteKg, setCalcFleteKg] = (0, import_react.useState)(config["calc_flete_kg"] ?? "22");
	const [calcHandling, setCalcHandling] = (0, import_react.useState)(config["calc_handling"] ?? "30");
	const [calcHonorarios, setCalcHonorarios] = (0, import_react.useState)(config["calc_honorarios"] ?? "220");
	const [calcImpuestosPct, setCalcImpuestosPct] = (0, import_react.useState)(config["calc_impuestos_pct"] ?? "70");
	const [calcAereoFijo, setCalcAereoFijo] = (0, import_react.useState)(config["calc_aereo_fijo"] ?? "950");
	const [calcAereoDesde, setCalcAereoDesde] = (0, import_react.useState)(config["calc_aereo_desde"] ?? "50");
	const [calcAereoHasta, setCalcAereoHasta] = (0, import_react.useState)(config["calc_aereo_hasta"] ?? "250");
	const [calcBarcoFijo, setCalcBarcoFijo] = (0, import_react.useState)(config["calc_barco_fijo"] ?? "100");
	const [calcBarcoDesde, setCalcBarcoDesde] = (0, import_react.useState)(config["calc_barco_desde"] ?? "250");
	const [newsletterSummary, setNewsletterSummary] = (0, import_react.useState)(null);
	const [batchSize, setBatchSize] = (0, import_react.useState)(50);
	const [sendingBatch, setSendingBatch] = (0, import_react.useState)(false);
	const [testCampaignEmail, setTestCampaignEmail] = (0, import_react.useState)("manuelberasategui1@gmail.com");
	const [sendingCampaignTest, setSendingCampaignTest] = (0, import_react.useState)(false);
	const [batchMsg, setBatchMsg] = (0, import_react.useState)(null);
	const [showNewCampaignModal, setShowNewCampaignModal] = (0, import_react.useState)(false);
	const [creatingCampaign, setCreatingCampaign] = (0, import_react.useState)(false);
	const [campaignForm, setCampaignForm] = (0, import_react.useState)({
		subject: "",
		headline: "",
		content: "",
		cta_text: "Ver Ofertas en la Tienda",
		cta_url: "https://teimportamosarg.com/catalogo",
		coupon_code: ""
	});
	async function loadNewsletterData() {
		try {
			const summary = await getCampaignsSummary();
			setNewsletterSummary(summary);
		} catch {}
	}
	(0, import_react.useEffect)(() => {
		fetch("https://dolarapi.com/v1/dolares/cripto").then((res) => res.json()).then((data) => {
			if (data?.venta) setLiveUsdt(Math.round(data.venta));
		}).catch(() => {});
		loadNewsletterData();
	}, []);
	const userId = user?.id;
	const userEmail = user?.email ?? "";
	const userToken = session?.access_token ?? "";
	async function loadCategories(isInitial = false) {
		if (isInitial || categories.length === 0) setLoading(true);
		setError("");
		try {
			const email = user?.email ?? "";
			const token = session?.access_token ?? "";
			const res = await getAdminProducts({ data: {
				email,
				token
			} });
			if (res.error) {
				if (categories.length === 0) setError(res.error);
				if (res.error.toLowerCase().includes("acceso denegado")) {
					setIsAuthorized(false);
					navigate({
						to: "/",
						replace: true
					});
				}
				return;
			}
			setIsAuthorized(true);
			getCouponUsagesSummary({ data: {
				email,
				token
			} }).then((res) => {
				if (typeof res?.count === "number") setCouponUsageCount(res.count);
			}).catch(() => {});
			loadNewsletterData();
			const prodsWithBoth = res.products.filter((p) => {
				const ars = Number(p.precio) || 0;
				const usd = Number(p.precio_usd) || 0;
				return ars > 0 && usd >= 1;
			});
			if (prodsWithBoth.length > 0) {
				const totalArs = prodsWithBoth.reduce((acc, p) => acc + Number(p.precio), 0);
				const totalUsd = prodsWithBoth.reduce((acc, p) => acc + Number(p.precio_usd), 0);
				const rate = Math.round(totalArs / totalUsd);
				setDbDolarRate(rate);
			}
			const existing = parseCategoryRules(config);
			const baseCatsFromProds = res.products.map((p) => (p.categoria ?? "").trim()).filter(Boolean).map(getBaseCategory);
			const canonicalNames = {
				"mates": "Mates",
				"perfumes arabes": "Perfumes Árabes",
				"perfumes disenador": "Perfumes Diseñador",
				"suplementos": "Suplementación",
				"tecnologia": "Tecnología",
				"zapatillas": "Zapatillas"
			};
			const catMap = /* @__PURE__ */ new Map();
			for (const c of [...baseCatsFromProds, ...Object.keys(existing)]) {
				const norm = normCat(c);
				if (norm === "perfumes" || norm === "perfume" || norm === "suplementacion" || norm === "mate") continue;
				if (!catMap.has(norm)) {
					const canonical = canonicalNames[norm] ?? c.charAt(0).toUpperCase() + c.slice(1);
					catMap.set(norm, canonical);
				}
			}
			const catList = Array.from(catMap.values());
			setCategories(catList);
			const initialRules = {};
			for (const [norm, disp] of catMap.entries()) {
				const r = existing[norm];
				initialRules[disp] = {
					displayName: disp,
					discountTiers: r?.discountTiers?.length ? r.discountTiers.map((t) => ({
						units: t.units,
						percent: t.percent
					})) : [],
					minType: r?.minType ?? "none",
					minValue: r?.minValue ? String(r.minValue) : ""
				};
			}
			setRules(initialRules);
		} catch (err) {
			if (categories.length === 0) setError(err instanceof Error ? err.message : "Error al cargar categorías.");
		} finally {
			setLoading(false);
		}
	}
	const initialLoadedRef = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (!authLoading) {
			if (!userId) navigate({
				to: "/",
				replace: true
			});
			else if (!initialLoadedRef.current) {
				initialLoadedRef.current = true;
				loadCategories(true);
			}
		}
	}, [
		authLoading,
		userId,
		navigate
	]);
	async function handleSave() {
		setSaving(true);
		setError("");
		setSuccessMsg("");
		try {
			const ruleInputs = Object.entries(rules).map(([_, r]) => ({
				category: r.displayName,
				discountTiers: r.discountTiers.map((t) => ({
					units: Number(t.units) || 0,
					percent: Number(t.percent) || 0
				})).filter((t) => t.units > 0 && t.percent > 0).sort((a, b) => a.units - b.units),
				minType: r.minType,
				minValue: Number(r.minValue) || 0
			}));
			const res = await upsertCategoryRules({ data: {
				email: userEmail,
				token: userToken,
				rules: ruleInputs,
				dolarCotizacion: Number(dolarRate) || 1500,
				bankInfo: {
					alias: bankAlias,
					cbu: bankCbu,
					titular: bankTitular,
					banco: bankBanco,
					descuentoPct: Number(bankDiscountPct) || 7
				},
				resendConfig: {
					apiKey: resendApiKey,
					from: resendFrom
				},
				couponConfig: {
					activo: couponActive,
					codigo: couponCode,
					descuentoPct: Number(couponDiscountPct) || 5
				},
				calculatorRates: {
					fleteKg: Number(calcFleteKg) || 22,
					handling: Number(calcHandling) || 30,
					honorarios: Number(calcHonorarios) || 220,
					impuestosPct: Number(calcImpuestosPct) || 70,
					aereoFijo: Number(calcAereoFijo) || 950,
					aereoDesde: Number(calcAereoDesde) || 50,
					aereoHasta: Number(calcAereoHasta) || 250,
					barcoFijo: Number(calcBarcoFijo) || 100,
					barcoDesde: Number(calcBarcoDesde) || 250
				}
			} });
			if (res.error) {
				setError(res.error);
				return;
			}
			queryClient.invalidateQueries({ queryKey: ["store"] });
			setSuccessMsg("¡Configuración guardada correctamente!");
			setTimeout(() => setSuccessMsg(""), 4e3);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al guardar.");
		} finally {
			setSaving(false);
		}
	}
	async function handleTestEmail() {
		setTestingEmail(true);
		setTestEmailMsg(null);
		try {
			await handleSave();
			const target = testEmailTarget.trim() || userEmail;
			const res = await testAdminResendEmail({ data: {
				email: userEmail,
				token: userToken,
				targetEmail: target
			} });
			setTestEmailMsg({
				success: res.success,
				text: res.message
			});
		} catch (err) {
			setTestEmailMsg({
				success: false,
				text: err instanceof Error ? err.message : "Error al enviar email de prueba."
			});
		} finally {
			setTestingEmail(false);
		}
	}
	async function handleCreateCampaign(e) {
		e.preventDefault();
		setCreatingCampaign(true);
		setError("");
		try {
			const res = await createNewsletterCampaign({ data: campaignForm });
			if (res.success) {
				setShowNewCampaignModal(false);
				setCampaignForm({
					subject: "",
					headline: "",
					content: "",
					cta_text: "Ver Ofertas en la Tienda",
					cta_url: "https://teimportamosarg.com/catalogo",
					coupon_code: ""
				});
				setBatchMsg({
					success: true,
					text: "¡Campaña creada con éxito! Ya podés enviar la primera tanda."
				});
				await loadNewsletterData();
			} else setError(res.error || "Error al crear la campaña.");
		} catch (err) {
			setError(err?.message || "Error al crear la campaña.");
		} finally {
			setCreatingCampaign(false);
		}
	}
	async function handleSendBatch(campaignId) {
		setSendingBatch(true);
		setBatchMsg(null);
		try {
			const res = await sendNextCampaignBatch({ data: {
				campaignId,
				batchSize
			} });
			setBatchMsg({
				success: res.success,
				text: res.message || (res.success ? "Tanda enviada correctamente." : res.error || "Error al enviar tanda.")
			});
			await loadNewsletterData();
		} catch (err) {
			setBatchMsg({
				success: false,
				text: err?.message || "Error al procesar la tanda."
			});
		} finally {
			setSendingBatch(false);
		}
	}
	async function handleSendCampaignTest(campaignId) {
		if (!testCampaignEmail.trim()) {
			setBatchMsg({
				success: false,
				text: "Ingresá un correo de prueba válido."
			});
			return;
		}
		setSendingCampaignTest(true);
		setBatchMsg(null);
		try {
			const res = await sendCampaignTestEmail({ data: {
				campaignId,
				targetEmail: testCampaignEmail.trim()
			} });
			setBatchMsg({
				success: res.success,
				text: res.message || res.error || "Email de prueba enviado."
			});
		} catch (err) {
			setBatchMsg({
				success: false,
				text: err?.message || "Error al enviar email de prueba."
			});
		} finally {
			setSendingCampaignTest(false);
		}
	}
	if (!authLoading && (!user || isAuthorized === false)) {
		if (typeof window !== "undefined") window.location.replace("/");
		return null;
	}
	if (authLoading || isAuthorized === null || loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen bg-background flex items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen bg-background",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteHeader, { config: storeData.config }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-[900px] px-3 py-4 sm:px-6 sm:py-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AdminHeader, {
						title: "Configuración de Tienda",
						subtitle: "Transferencias bancarias, cotizaciones y reglas de categoría.",
						currentRoute: "configuracion",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => void handleSave(),
							disabled: saving,
							className: "btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: saving ? "Guardando..." : "Guardar todo" })]
						})
					}),
					error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mb-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive",
						children: error
					}),
					successMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 font-semibold",
						children: ["✓ ", successMsg]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 rounded-2xl border border-primary/30 bg-card p-3.5 sm:p-5 shadow-xs",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-3 mb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xl",
									children: "🎟️"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-base font-bold flex items-center gap-2 text-foreground",
									children: "Cupón Promocional de Lanzamiento"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Válido 1 sola vez por cuenta registrada. Podés desactivarlo manualmente en cualquier momento."
								})] })]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-3 bg-surface border border-border px-3 py-1.5 rounded-xl",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-semibold text-foreground",
									children: couponActive ? "🟢 Cupón ACTIVO" : "⚪ Cupón APAGADO"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									role: "switch",
									"aria-checked": couponActive,
									onClick: () => setCouponActive(!couponActive),
									className: `relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${couponActive ? "bg-primary" : "bg-muted"}`,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${couponActive ? "translate-x-5" : "translate-x-0"}` })
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3 items-end",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-muted-foreground",
										children: "Código del cupón"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										className: "input-base font-mono uppercase font-bold tracking-wider text-primary",
										value: couponCode,
										onChange: (e) => setCouponCode(e.target.value.toUpperCase()),
										placeholder: "TEIMPORTAMOS"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-muted-foreground",
										children: "Descuento (%)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: 1,
											max: 90,
											className: "input-base w-24 font-bold text-primary",
											value: couponDiscountPct,
											onChange: (e) => setCouponDiscountPct(e.target.value)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-semibold text-muted-foreground",
											children: "% OFF en el total"
										})]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl border border-border/80 bg-surface/50 p-2.5 flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs text-muted-foreground",
										children: "Canjes registrados:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-bold text-foreground tabular-nums",
										children: couponUsageCount !== null ? `${couponUsageCount} cuenta${couponUsageCount !== 1 ? "s" : ""}` : "—"
									})]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 rounded-2xl border border-emerald-500/30 bg-card p-3.5 sm:p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-2 mb-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-base font-bold flex items-center gap-2 text-foreground",
									children: "🏦 Datos de Transferencia Bancaria (Checkout con Descuento)"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground mb-4",
								children: "Estos datos se mostrarán a los clientes al momento de pagar por transferencia en la web."
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 gap-3 sm:grid-cols-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex flex-col gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-semibold text-muted-foreground",
											children: "Alias"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											className: "input-base",
											value: bankAlias,
											onChange: (e) => setBankAlias(e.target.value),
											placeholder: "ej: teimportamos.mp"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex flex-col gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-semibold text-muted-foreground",
											children: "CBU / CVU"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											className: "input-base font-mono",
											value: bankCbu,
											onChange: (e) => setBankCbu(e.target.value),
											placeholder: "ej: 00000031000..."
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex flex-col gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-semibold text-muted-foreground",
											children: "Titular de la cuenta"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											className: "input-base",
											value: bankTitular,
											onChange: (e) => setBankTitular(e.target.value),
											placeholder: "ej: Manuel Berasategui"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex flex-col gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-semibold text-muted-foreground",
											children: "Banco / Billetera"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											className: "input-base",
											value: bankBanco,
											onChange: (e) => setBankBanco(e.target.value),
											placeholder: "ej: Mercado Pago"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "flex flex-col gap-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs font-semibold text-muted-foreground",
											children: "Descuento por Transferencia (%)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												min: 0,
												max: 50,
												className: "input-base w-24 font-bold text-emerald-600",
												value: bankDiscountPct,
												onChange: (e) => setBankDiscountPct(e.target.value)
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xs font-semibold text-muted-foreground",
												children: "% OFF en checkout"
											})]
										})]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 rounded-2xl border border-border bg-card p-3.5 sm:p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap items-center justify-between gap-2 mb-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-base font-bold flex items-center gap-2",
									children: "✉️ Notificaciones de Compras por Email (Resend)"
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground mb-4",
								children: "Configurá tu API Key de Resend para despachar las notificaciones de ventas a los administradores y la confirmación de compra al cliente."
							}),
							testEmailMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `mb-4 rounded-xl p-3 text-xs font-medium border ${testEmailMsg.success ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`,
								children: testEmailMsg.text
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-muted-foreground",
										children: "Resend API Key (re_...)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "password",
										className: "input-base",
										value: resendApiKey,
										onChange: (e) => setResendApiKey(e.target.value),
										placeholder: "re_1234567890abcdef..."
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-muted-foreground",
										children: "Remitente (From)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "text",
										className: "input-base",
										value: resendFrom,
										onChange: (e) => setResendFrom(e.target.value),
										placeholder: "Te Importamos <noreply@teimportamosarg.com>"
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-end gap-2 pt-3 border-t border-border/60",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1 flex-1 min-w-[220px]",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-muted-foreground",
										children: "Probar envío de confirmación de compra a:"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "email",
										className: "input-base",
										value: testEmailTarget,
										onChange: (e) => setTestEmailTarget(e.target.value),
										placeholder: userEmail || "cliente@ejemplo.com"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void handleTestEmail(),
									disabled: testingEmail || saving,
									className: "rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors shrink-0",
									children: testingEmail ? "Enviando prueba..." : "Enviar email de prueba al cliente"
								})]
							}),
							(config["last_email_error"] || config["last_email_success"]) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 space-y-1.5 pt-2 border-t border-border/40 text-[11px]",
								children: [config["last_email_success"] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-emerald-600 dark:text-emerald-400 font-medium",
									children: ["✓ Último envío exitoso: ", config["last_email_success"]]
								}), config["last_email_error"] && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
									className: "text-destructive font-mono bg-destructive/10 p-2 rounded-lg break-all",
									children: ["⚠️ Último error de Resend: ", config["last_email_error"]]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 rounded-2xl border border-primary/30 bg-card p-3.5 sm:p-5 shadow-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-3 mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xl",
										children: "📧"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
										className: "text-base font-bold flex items-center gap-2 text-foreground",
										children: "Campañas de Email Promocionales (Envíos por Tandas)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground",
										children: "Enviá ofertas a tus clientes registrados respetando el límite diario de Resend (100/día) con tracking anti-duplicados y desuscripción obligatoria."
									})] })]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-3 bg-surface border border-border px-3 py-1.5 rounded-xl text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: "Suscriptores:"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-emerald-600 dark:text-emerald-400",
											children: [newsletterSummary?.activeSubscribersCount ?? "—", " activos"]
										}),
										newsletterSummary && newsletterSummary.unsubscribedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-muted-foreground",
											children: [
												"(",
												newsletterSummary.unsubscribedCount,
												" desuscritos)"
											]
										})
									]
								})]
							}),
							batchMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `my-3 rounded-xl p-3 text-xs font-medium border ${batchMsg.success ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20" : "bg-destructive/10 text-destructive border-destructive/20"}`,
								children: batchMsg.text
							}),
							newsletterSummary?.activeCampaign ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 rounded-xl border border-border/80 bg-surface/50 p-4 space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center justify-between gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full",
												children: "Campaña Activa en Curso"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
												className: "text-sm font-bold text-foreground mt-1",
												children: newsletterSummary.activeCampaign.subject
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs text-muted-foreground",
												children: [
													"Título: \"",
													newsletterSummary.activeCampaign.headline,
													"\"",
													newsletterSummary.activeCampaign.coupon_code ? ` • Cupón: ${newsletterSummary.activeCampaign.coupon_code}` : ""
												]
											})
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setShowNewCampaignModal(true),
											className: "text-xs font-semibold text-muted-foreground hover:text-foreground underline",
											children: "+ Reemplazar con nueva campaña"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1.5 pt-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-between text-xs font-semibold",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-muted-foreground",
												children: "Progreso de entrega:"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "text-foreground",
												children: [
													newsletterSummary.activeCampaign.sent_count,
													" / ",
													newsletterSummary.activeCampaign.total_target,
													" enviados (",
													Math.round(newsletterSummary.activeCampaign.sent_count / Math.max(1, newsletterSummary.activeCampaign.total_target) * 100),
													"%)"
												]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "w-full h-3 bg-muted rounded-full overflow-hidden",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "h-full bg-primary transition-all duration-500 rounded-full",
												style: { width: `${Math.min(100, Math.round(newsletterSummary.activeCampaign.sent_count / Math.max(1, newsletterSummary.activeCampaign.total_target) * 100))}%` }
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs font-semibold text-muted-foreground",
													children: "Tamaño de tanda:"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "flex gap-1",
													children: [
														30,
														50,
														80
													].map((sz) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => setBatchSize(sz),
														className: `px-2.5 py-1 text-xs font-bold rounded-lg border transition ${batchSize === sz ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground border-border hover:bg-muted"}`,
														children: sz
													}, sz))
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[11px] text-muted-foreground",
													children: "correos por día"
												})
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => void handleSendBatch(newsletterSummary.activeCampaign.id),
											disabled: sendingBatch || newsletterSummary.pendingInActiveCampaign <= 0,
											className: "btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 text-xs font-bold px-4 py-2 disabled:opacity-50",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: sendingBatch ? "Enviando tanda..." : newsletterSummary.pendingInActiveCampaign <= 0 ? "✅ Todos los clientes alcanzados" : `🚀 Enviar tanda de hoy (${Math.min(batchSize, newsletterSummary.pendingInActiveCampaign)} correos)` })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-end gap-2 pt-3 border-t border-border/60 bg-muted/30 -mx-4 -mb-3 p-3.5 rounded-b-xl",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex flex-col gap-1 flex-1 min-w-[220px]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-[11px] font-semibold text-muted-foreground flex items-center gap-1",
												children: "🧪 Probar campaña antes de enviar (sin afectar a clientes):"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "email",
												className: "input-base text-xs",
												value: testCampaignEmail,
												onChange: (e) => setTestCampaignEmail(e.target.value),
												placeholder: "manuelberasategui1@gmail.com"
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => void handleSendCampaignTest(newsletterSummary.activeCampaign.id),
											disabled: sendingCampaignTest,
											className: "rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors shrink-0",
											children: sendingCampaignTest ? "Enviando prueba..." : "Enviar prueba a mi correo"
										})]
									})
								]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 rounded-xl border border-dashed border-border p-6 text-center space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "No hay ninguna campaña activa en este momento. Podés crear una para promocionar nuevos productos o descuentos."
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => setShowNewCampaignModal(true),
									className: "btn-base bg-primary text-primary-foreground hover:opacity-90 text-xs font-bold px-4 py-2 inline-flex items-center gap-2",
									children: "+ Crear Nueva Campaña Promocional"
								})]
							}),
							showNewCampaignModal && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-4 rounded-xl border border-primary/40 bg-card p-4 space-y-4",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between pb-2 border-b border-border",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-sm font-bold text-foreground",
										children: "Redactar Nueva Campaña de Email"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => setShowNewCampaignModal(false),
										className: "text-xs text-muted-foreground hover:text-foreground",
										children: "✕ Cerrar"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
									onSubmit: handleCreateCampaign,
									className: "space-y-3 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-2 gap-3",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex flex-col gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-muted-foreground",
													children: "Asunto del Email *"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													required: true,
													className: "input-base",
													value: campaignForm.subject,
													onChange: (e) => setCampaignForm({
														...campaignForm,
														subject: e.target.value
													}),
													placeholder: "ej: 🔥 ¡Llegaron novedades a Te Importamos! 20% OFF"
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex flex-col gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-muted-foreground",
													children: "Título Principal (dentro del correo) *"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "text",
													required: true,
													className: "input-base",
													value: campaignForm.headline,
													onChange: (e) => setCampaignForm({
														...campaignForm,
														headline: e.target.value
													}),
													placeholder: "ej: Nuevos ingresos de electrónica y perfumería"
												})]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "flex flex-col gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-muted-foreground",
												children: "Mensaje / Oferta *"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
												required: true,
												rows: 4,
												className: "input-base resize-y",
												value: campaignForm.content,
												onChange: (e) => setCampaignForm({
													...campaignForm,
													content: e.target.value
												}),
												placeholder: "Escribí el cuerpo del correo. Podés usar párrafos separados para que se vea limpio."
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-1 sm:grid-cols-3 gap-3",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: "flex flex-col gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-semibold text-muted-foreground",
														children: "Cupón opcional"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "text",
														className: "input-base font-mono uppercase font-bold text-primary",
														value: campaignForm.coupon_code,
														onChange: (e) => setCampaignForm({
															...campaignForm,
															coupon_code: e.target.value.toUpperCase()
														}),
														placeholder: "ej: PROMO10"
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: "flex flex-col gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-semibold text-muted-foreground",
														children: "Texto del Botón CTA"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "text",
														className: "input-base",
														value: campaignForm.cta_text,
														onChange: (e) => setCampaignForm({
															...campaignForm,
															cta_text: e.target.value
														}),
														placeholder: "Ver Ofertas en la Tienda"
													})]
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: "flex flex-col gap-1",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
														className: "font-semibold text-muted-foreground",
														children: "Enlace del Botón (URL)"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														type: "url",
														className: "input-base",
														value: campaignForm.cta_url,
														onChange: (e) => setCampaignForm({
															...campaignForm,
															cta_url: e.target.value
														}),
														placeholder: "https://teimportamosarg.com/catalogo"
													})]
												})
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex justify-end gap-2 pt-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setShowNewCampaignModal(false),
												className: "px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted font-semibold",
												children: "Cancelar"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "submit",
												disabled: creatingCampaign,
												className: "btn-base bg-primary text-primary-foreground font-bold hover:opacity-90 disabled:opacity-50",
												children: creatingCampaign ? "Guardando..." : "Activar Campaña"
											})]
										})
									]
								})]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 rounded-2xl border border-border bg-card p-3.5 sm:p-5",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2 mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-base font-bold flex items-center gap-2",
									children: "💵 Cotización del Dólar"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-wrap gap-2",
									children: [dbDolarRate !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 border border-blue-500/20",
										children: ["🗄️ Cotización activa en Base de Datos: ", money(dbDolarRate)]
									}), liveUsdt !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
										children: ["⚡ Dólar Cripto / USDT Binance en vivo: ", money(liveUsdt)]
									})]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground mb-3",
								children: [
									"Al guardar un producto en dólares con precio ARS vacío, se usa automáticamente la cotización USDT Binance (",
									liveUsdt ? money(liveUsdt) : "en vivo",
									") para la carga inicial hasta que tu sincronizador actualice la Base de Datos (",
									dbDolarRate ? money(dbDolarRate) : "cotización activa",
									")."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-sm font-semibold text-muted-foreground",
										children: "$"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: 1,
										className: "input-base w-36 font-bold",
										value: dolarRate,
										onChange: (e) => setDolarRate(e.target.value),
										placeholder: "1500"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-semibold text-muted-foreground",
										children: "ARS por USD (Resguardo manual)"
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-6 rounded-2xl border border-primary/30 bg-card p-3.5 sm:p-5 shadow-xs",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center justify-between gap-2 mb-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "text-base font-bold flex items-center gap-2 text-foreground",
									children: "🚢 Tarifas Calculadora de Importaciones (Solo Admin)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-bold border border-primary/20",
									children: "Panel de Control"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground mb-4",
								children: [
									"Configuración de las tarifas base utilizadas por la ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Calculadora de Importaciones" }),
									" para cotizaciones de clientes. Los clientes nunca verán estos costos internos ni porcentajes, únicamente verán \"Flete\" e \"Impuestos\"."
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[11px] font-bold text-muted-foreground uppercase",
											children: "Flete USD/kg (menor a 50kg)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-bold text-muted-foreground",
												children: "u$d"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "0.5",
												className: "input-base text-xs font-bold",
												value: calcFleteKg,
												onChange: (e) => setCalcFleteKg(e.target.value),
												placeholder: "22"
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[11px] font-bold text-muted-foreground uppercase",
											children: "Handling fijo por envío"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-bold text-muted-foreground",
												children: "u$d"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "1",
												className: "input-base text-xs font-bold",
												value: calcHandling,
												onChange: (e) => setCalcHandling(e.target.value),
												placeholder: "30"
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[11px] font-bold text-muted-foreground uppercase",
											children: "Honorarios fijos por envío"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-bold text-muted-foreground",
												children: "u$d"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "1",
												className: "input-base text-xs font-bold",
												value: calcHonorarios,
												onChange: (e) => setCalcHonorarios(e.target.value),
												placeholder: "220"
											})]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-[11px] font-bold text-muted-foreground uppercase",
											children: "Impuestos (%)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-sm font-bold text-muted-foreground",
												children: "%"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "1",
												className: "input-base text-xs font-bold",
												value: calcImpuestosPct,
												onChange: (e) => setCalcImpuestosPct(e.target.value),
												placeholder: "70"
											})]
										})]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t border-dashed border-border pt-3 mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
									className: "text-xs font-bold text-foreground mb-2 flex items-center gap-1.5",
									children: "✈️ Tramo Aéreo Fijo (ej. 50 a 250 kg)"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] font-bold text-muted-foreground uppercase",
												children: "Costo Aéreo Fijo (USD)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-bold text-muted-foreground",
													children: "u$d"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													step: "10",
													className: "input-base text-xs font-bold",
													value: calcAereoFijo,
													onChange: (e) => setCalcAereoFijo(e.target.value),
													placeholder: "950"
												})]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] font-bold text-muted-foreground uppercase",
												children: "Rango desde (kg)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "1",
												className: "input-base text-xs font-bold",
												value: calcAereoDesde,
												onChange: (e) => setCalcAereoDesde(e.target.value),
												placeholder: "50"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] font-bold text-muted-foreground uppercase",
												children: "Rango hasta (kg)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "1",
												className: "input-base text-xs font-bold",
												value: calcAereoHasta,
												onChange: (e) => setCalcAereoHasta(e.target.value),
												placeholder: "250"
											})]
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "border-t border-dashed border-border pt-3 bg-muted/20 p-3 rounded-xl",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "text-xs font-bold text-primary mb-1.5 flex items-center gap-1.5",
										children: "🚢 Tramo Marítimo (Barco: si supera los 250 kg)"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-muted-foreground mb-2",
										children: "Si la carga supera los 250 kg (o el umbral configurado), se transporta por barco con una tarifa plana fija."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] font-bold text-muted-foreground uppercase",
												children: "Flete Barco Fijo (USD)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-bold text-muted-foreground",
													children: "u$d"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													step: "10",
													className: "input-base text-xs font-bold border-primary/40 focus:border-primary",
													value: calcBarcoFijo,
													onChange: (e) => setCalcBarcoFijo(e.target.value),
													placeholder: "100"
												})]
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "space-y-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "text-[11px] font-bold text-muted-foreground uppercase",
												children: "Aplica a partir de (kg)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-bold text-muted-foreground",
													children: "kg"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													step: "1",
													className: "input-base text-xs font-bold",
													value: calcBarcoDesde,
													onChange: (e) => setCalcBarcoDesde(e.target.value),
													placeholder: "250"
												})]
											})]
										})]
									})
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-5",
						children: categories.map((cat) => {
							const key = normCat(cat);
							const rule = rules[key];
							if (!rule) return null;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-2xl border border-border bg-card p-3.5 sm:p-5 space-y-4 sm:space-y-5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings2, { className: "h-4 w-4 text-primary/70 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
											className: "text-base font-bold",
											children: cat
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between mb-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
											children: "Descuentos por cantidad (total de la categoría en carrito)"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => addTier(key),
											className: "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3" }), " Agregar"]
										})]
									}), rule.discountTiers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-muted-foreground italic",
										children: "Sin descuentos configurados."
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "space-y-2",
										children: rule.discountTiers.map((tier, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-wrap items-center gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													min: 1,
													className: "input-base w-24",
													value: tier.units || "",
													onChange: (e) => updateTier(key, i, "units", Number(e.target.value)),
													placeholder: "Unidades"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs text-muted-foreground",
													children: "unid. →"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													min: 0,
													max: 100,
													step: .5,
													className: "input-base w-24",
													value: tier.percent || "",
													onChange: (e) => updateTier(key, i, "percent", Number(e.target.value)),
													placeholder: "% desc."
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs text-muted-foreground",
													children: "%"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
													type: "button",
													onClick: () => removeTier(key, i),
													className: "text-destructive hover:opacity-70 p-1",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
												})
											]
										}, i))
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2",
											children: "Mínimo de compra"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-2 mb-3",
											children: [
												"none",
												"units",
												"amount"
											].map((opt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setRule(key, {
													minType: opt,
													minValue: opt === "none" ? "" : rule.minValue
												}),
												className: `rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${rule.minType === opt ? "bg-primary text-primary-foreground border-primary" : "bg-background text-foreground border-border hover:bg-muted"}`,
												children: opt === "none" ? "Sin mínimo" : opt === "units" ? "Mínimo unidades" : "Mínimo monto ($)"
											}, opt))
										}),
										rule.minType !== "none" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2 flex-wrap",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "number",
													min: 1,
													className: "input-base w-40",
													value: rule.minValue,
													onChange: (e) => setRule(key, { minValue: e.target.value }),
													placeholder: rule.minType === "units" ? "Ej: 3" : "Ej: 250000"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-xs text-muted-foreground",
													children: rule.minType === "units" ? "unidades" : "ARS"
												}),
												rule.minValue && Number(rule.minValue) > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-xs font-semibold text-emerald-600",
													children: ["→ ", rule.minType === "amount" ? money(Number(rule.minValue)) : `${rule.minValue} unidades`]
												})
											]
										})
									] })
								]
							}, key);
						})
					}),
					categories.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-center text-sm text-muted-foreground py-12",
						children: "No hay categorías de productos activas aún."
					}),
					categories.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-8 flex justify-end",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => void handleSave(),
							disabled: saving,
							className: "btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2 disabled:opacity-50",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), saving ? "Guardando..." : "Guardar configuración"]
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config: storeData.config })
		]
	});
}
//#endregion
export { AdminConfiguracionPage as component };
