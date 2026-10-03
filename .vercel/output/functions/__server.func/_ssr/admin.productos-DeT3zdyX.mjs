import { i as __toESM } from "../_runtime.mjs";
import { B as thumbnailUrl, C as isMate, H as toNumber, I as priceOf, L as sanitizeImageUrl, M as onImageError, N as originalPriceOf, O as money, S as isLongSleeve, W as transferPrice, b as imageUrl, q as waOnlyReasonOf, t as FALLBACK_IMAGE, x as isCamiseta } from "./store-DppLUI8p.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { b as useNavigate, y as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { t as supabase } from "./client-Bx8URvVl.mjs";
import { n as useSuspenseQuery } from "../_libs/tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { F as DollarSign, G as Check, P as Flame, R as Coins, S as Pencil, V as ChevronUp, W as ChevronDown, _ as RefreshCw, b as Plus, g as Save, h as Search, i as Upload, l as Sparkles, n as X, o as Trash2, s as Tag, t as Zap, w as PackagePlus, x as Percent } from "../_libs/lucide-react.mjs";
import { d as storeQueryOptions, f as useAuth, o as SiteFooter, s as SiteHeader } from "./router-Cnd2hP15.mjs";
import { t as AdminHeader } from "./AdminHeader-BLhPJ18f.mjs";
import { a as deleteAdminProduct, f as updateProductPrice, g as upsertAdminProduct, h as upsertAdminBanner, i as deleteAdminBanner, l as importYupooAlbum, m as uploadAdminProductImage, n as bulkUpdateAdminStock, o as getAdminBanners, p as updateVariantStock, r as calcArsFromUsd, s as getAdminProducts, t as bulkDeleteAdminProducts, u as parseYupooPage } from "./products.functions-BgXArIxF.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/admin.productos-DeT3zdyX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function formatBytes(bytes, decimals = 1) {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = [
		"B",
		"KB",
		"MB",
		"GB"
	];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
async function compressImageFile(file, options = {}) {
	const { maxWidth = 900, maxHeight = 900, quality = .8 } = options;
	const originalSize = file.size;
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(/* @__PURE__ */ new Error("No se pudo leer el archivo de imagen."));
		reader.onload = () => {
			const img = new Image();
			img.onerror = () => reject(/* @__PURE__ */ new Error("No se pudo cargar la imagen para compresión."));
			img.onload = () => {
				let width = img.width;
				let height = img.height;
				if (width > maxWidth || height > maxHeight) {
					const ratio = Math.min(maxWidth / width, maxHeight / height);
					width = Math.round(width * ratio);
					height = Math.round(height * ratio);
				}
				const canvas = document.createElement("canvas");
				canvas.width = width;
				canvas.height = height;
				const ctx = canvas.getContext("2d", { alpha: true });
				if (!ctx) {
					reject(/* @__PURE__ */ new Error("No se pudo inicializar el contexto de canvas."));
					return;
				}
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = "high";
				ctx.drawImage(img, 0, 0, width, height);
				canvas.toBlob((blob) => {
					if (!blob) {
						reject(/* @__PURE__ */ new Error("Error al generar el archivo comprimido WebP."));
						return;
					}
					const newFileName = `${file.name.replace(/\.[^/.]+$/, "")}.webp`;
					const compressedFile = new File([blob], newFileName, {
						type: "image/webp",
						lastModified: Date.now()
					});
					const base64 = canvas.toDataURL("image/webp", quality);
					const compressedSize = blob.size;
					const savingsPct = originalSize > 0 ? Math.max(0, Math.round((1 - compressedSize / originalSize) * 100)) : 0;
					resolve({
						file: compressedFile,
						base64,
						originalSize,
						compressedSize,
						savingsPct,
						width,
						height
					});
				}, "image/webp", quality);
			};
			img.src = reader.result;
		};
		reader.readAsDataURL(file);
	});
}
function resolveSafeImageUrl(raw, fallback = FALLBACK_IMAGE, thumb = false) {
	if (!raw || typeof raw !== "string") return fallback;
	let processed;
	if (thumb === "md") processed = thumbnailUrl(raw, "md");
	else if (thumb === "sm" || thumb === true) processed = thumbnailUrl(raw, "sm");
	else processed = imageUrl(raw);
	if (!processed) return fallback;
	if (processed.startsWith("data:image/")) return processed;
	if (processed.startsWith("/api/img?")) return processed;
	if (processed.startsWith("/") && !processed.startsWith("//")) return processed;
	try {
		const u = new URL(processed);
		if (u.protocol === "https:" || u.protocol === "http:") return u.href;
	} catch {}
	return fallback;
}
function SafeImage({ rawSrc, src, fallback = FALLBACK_IMAGE, alt = "", thumb = false, className, onError, ...rest }) {
	const targetRaw = rawSrc || src;
	const [resolvedSrc, setResolvedSrc] = (0, import_react.useState)(() => resolveSafeImageUrl(targetRaw, fallback, thumb));
	(0, import_react.useEffect)(() => {
		setResolvedSrc(resolveSafeImageUrl(targetRaw, fallback, thumb));
	}, [
		targetRaw,
		fallback,
		thumb
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
		src: resolvedSrc,
		alt: alt ?? void 0,
		className,
		onError: (e) => {
			if (thumb) {
				const fullSafe = resolveSafeImageUrl(targetRaw, fallback, false);
				if (resolvedSrc !== fullSafe) {
					setResolvedSrc(fullSafe);
					return;
				}
			}
			if (resolvedSrc !== fallback) setResolvedSrc(fallback);
			onError?.(e);
		},
		...rest
	});
}
var emptyProduct = () => ({
	nombre: "",
	categoria: "",
	precio: "",
	precio_usd: "",
	precio_base: "",
	moneda_base: "USD",
	precio_oferta: "",
	precio_oferta_usd: "",
	precio_oferta_base: "",
	moneda_oferta_base: "USD",
	descripcion: "",
	destacado: "NO",
	oferta: "NO",
	stock: "SI",
	descuento: "NO",
	whatsapp_only_reason: "",
	moq_group: "",
	color_predeterminado: "",
	imagen_url: "",
	tipo_talles: "NINGUNO",
	talles_disponibles: [],
	tiers: [],
	variants: []
});
function productToInput(p) {
	const tiers = [];
	const pRec = p;
	const meta = pRec["metadata"];
	if (meta && typeof meta === "object" && !Array.isArray(meta)) for (const [k, v] of Object.entries(meta)) {
		const uMatch = k.match(/(\d+)/);
		const pMatch = String(v ?? "").match(/(\d+(?:\.\d+)?)/);
		if (uMatch && pMatch) tiers.push({
			units: Number(uMatch[1]),
			percent: Number(pMatch[1])
		});
	}
	const rawTipo = String(pRec["tipo_talles"] ?? "NINGUNO").toUpperCase();
	const tipo_talles = rawTipo === "ZAPATILLAS" ? "ZAPATILLAS" : rawTipo === "ROPA" ? "ROPA" : "NINGUNO";
	const rawTalles = pRec["talles_disponibles"];
	const talles_disponibles = Array.isArray(rawTalles) ? rawTalles : typeof rawTalles === "string" ? rawTalles.split(",").map((t) => t.trim()).filter(Boolean) : [];
	return {
		id: String(p.id ?? ""),
		nombre: String(p.nombre ?? ""),
		categoria: String(p.categoria ?? ""),
		precio: String(p.precio ?? ""),
		precio_usd: String(pRec["precio_usd"] ?? ""),
		precio_base: pRec["precio_base"] !== void 0 && pRec["precio_base"] !== null ? String(pRec["precio_base"]) : "",
		moneda_base: String(pRec["moneda_base"] ?? "USD"),
		precio_oferta: String(p.precio_oferta ?? ""),
		precio_oferta_usd: String(pRec["precio_oferta_usd"] ?? ""),
		precio_oferta_base: pRec["precio_oferta_base"] !== void 0 && pRec["precio_oferta_base"] !== null ? String(pRec["precio_oferta_base"]) : "",
		moneda_oferta_base: String(pRec["moneda_oferta_base"] ?? "USD"),
		descripcion: String(p.descripcion ?? ""),
		destacado: String(p.destacado ?? "NO"),
		oferta: String(p.oferta ?? "NO"),
		stock: String(p.stock ?? "SI"),
		descuento: String(p.descuento ?? "NO"),
		whatsapp_only_reason: waOnlyReasonOf(pRec) ?? "",
		moq_group: typeof pRec["moq_group"] === "string" ? pRec["moq_group"] : "",
		color_predeterminado: p.color_predeterminado ?? "",
		imagen_url: p.imagen_url ?? "",
		tipo_talles,
		talles_disponibles,
		tiers: tiers.sort((a, b) => a.units - b.units),
		variants: (p.variants ?? []).map((v) => {
			const vRec = v;
			return {
				id: String(v.id ?? ""),
				color: String(v.color ?? ""),
				precio: String(v.precio ?? ""),
				precio_usd: String(vRec["precio_usd"] ?? ""),
				precio_base: vRec["precio_base"] !== void 0 && vRec["precio_base"] !== null ? String(vRec["precio_base"]) : "",
				moneda_base: String(vRec["moneda_base"] ?? "USD"),
				stock: String(v.stock ?? "SI"),
				imagen_url: v.imagen_url ?? "",
				talles_disponibles: v.talles_disponibles ?? []
			};
		})
	};
}
function ImageDropzone({ value, onChange, bucket, folder, label = "Arrastrá una imagen, un enlace web o haz clic para subir" }) {
	const { user, session } = useAuth();
	const [dragging, setDragging] = (0, import_react.useState)(false);
	const [uploading, setUploading] = (0, import_react.useState)(false);
	const [errorMsg, setErrorMsg] = (0, import_react.useState)("");
	const [optimizedStats, setOptimizedStats] = (0, import_react.useState)(null);
	const inputRef = (0, import_react.useRef)(null);
	async function uploadFile(file) {
		if (!file.type.startsWith("image/")) {
			setErrorMsg("El archivo seleccionado debe ser una imagen (JPG, PNG, WebP).");
			return;
		}
		setUploading(true);
		setErrorMsg("");
		setOptimizedStats(null);
		try {
			const compressed = await compressImageFile(file, {
				maxWidth: 900,
				maxHeight: 900,
				quality: .8
			});
			setOptimizedStats({
				orig: compressed.originalSize,
				comp: compressed.compressedSize,
				pct: compressed.savingsPct
			});
			const filename = `${folder}/${crypto.randomUUID()}.webp`;
			const { error: clientErr } = await supabase.storage.from(bucket).upload(filename, compressed.file, {
				contentType: "image/webp",
				cacheControl: "31536000",
				upsert: false
			});
			if (!clientErr) {
				const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
				onChange(data.publicUrl);
				setUploading(false);
				return;
			}
			const res = await uploadAdminProductImage({ data: {
				email: user?.email ?? "",
				token: session?.access_token ?? "",
				filename,
				base64: compressed.base64,
				bucket,
				contentType: "image/webp"
			} });
			if (res.publicUrl) onChange(res.publicUrl);
			else setErrorMsg(res.error ?? "No se pudo guardar la imagen.");
			setUploading(false);
		} catch (err) {
			console.error("Error al subir imagen:", err);
			setErrorMsg(err instanceof Error ? err.message : "No se pudo subir la imagen.");
			setUploading(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			onDragOver: (e) => {
				e.preventDefault();
				setDragging(true);
			},
			onDragLeave: () => setDragging(false),
			onDrop: (e) => {
				e.preventDefault();
				setDragging(false);
				setErrorMsg("");
				const file = e.dataTransfer.files[0];
				if (file) {
					uploadFile(file);
					return;
				}
				const textUrl = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain") || e.dataTransfer.getData("URL");
				if (textUrl && (textUrl.startsWith("http://") || textUrl.startsWith("https://") || textUrl.startsWith("data:image"))) onChange(textUrl.trim());
				else setErrorMsg("No se detectó una imagen válida al arrastrar.");
			},
			onClick: () => inputRef.current?.click(),
			className: `relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}`,
			style: { minHeight: 120 },
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: inputRef,
				type: "file",
				accept: "image/*",
				className: "sr-only",
				onChange: (e) => {
					const f = e.target.files?.[0];
					if (f) uploadFile(f);
				}
			}), uploading ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-2 text-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-6 w-6 animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-semibold",
					children: "Subiendo imagen..."
				})]
			}) : value ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative group w-full flex flex-col items-center gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: imageUrl(value),
						alt: "Vista previa",
						className: "h-28 max-w-full rounded-lg object-contain border border-border shadow-xs",
						onError: (e) => {
							e.target.style.display = "none";
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-[11px] text-muted-foreground group-hover:text-primary transition-colors",
						children: "Hacé clic o arrastrá para cambiar la imagen"
					}),
					optimizedStats && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
						children: [
							"✨ WebP: ",
							formatBytes(optimizedStats.orig),
							" ➔ ",
							formatBytes(optimizedStats.comp),
							" (-",
							optimizedStats.pct,
							"%)"
						]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-2 text-center text-muted-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-6 w-6 text-primary/70" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-xs font-medium",
					children: label
				})]
			})]
		}), errorMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-xs text-destructive font-semibold",
			children: errorMsg
		})]
	});
}
function PriceModal({ product, onClose, onSaved, userEmail, userToken, dolarRate = 1500, roundingIncrement = 10, markupPercentage = 0 }) {
	const pRec = product;
	const initialMoneda = String(pRec["moneda_base"] ?? "").toUpperCase() === "ARS" ? "ARS" : "USD";
	const getInitialBase = () => {
		if (pRec["precio_base"] !== null && pRec["precio_base"] !== void 0 && Number(pRec["precio_base"]) > 0) return String(pRec["precio_base"]);
		if (initialMoneda === "ARS") {
			const num = toNumber(product.precio);
			return num > 0 ? String(Math.round(num / 1.07)) : "";
		}
		const numUsd = Number(product.precio_usd) || (dolarRate > 0 ? toNumber(product.precio) / dolarRate : 0);
		return numUsd > 0 ? String(Math.round(numUsd / 1.07 * 100) / 100) : "";
	};
	const [sourceCurrency, setSourceCurrency] = (0, import_react.useState)(initialMoneda);
	const [basePrice, setBasePrice] = (0, import_react.useState)(getInitialBase());
	const isOfferInit = String(product.oferta ?? "").trim().toUpperCase() === "SI";
	const [hasOffer, setHasOffer] = (0, import_react.useState)(isOfferInit);
	const [offerSourceCurrency, setOfferSourceCurrency] = (0, import_react.useState)(String(pRec["moneda_oferta_base"] ?? "").toUpperCase() === "ARS" ? "ARS" : "USD");
	const getInitialOfferBase = () => {
		if (pRec["precio_oferta_base"] !== null && pRec["precio_oferta_base"] !== void 0 && Number(pRec["precio_oferta_base"]) > 0) return String(pRec["precio_oferta_base"]);
		if (offerSourceCurrency === "ARS") {
			const num = toNumber(product.precio_oferta);
			return num > 0 ? String(Math.round(num / 1.07)) : "";
		}
		const numUsd = Number(product.precio_oferta_usd) || (dolarRate > 0 ? toNumber(product.precio_oferta) / dolarRate : 0);
		return numUsd > 0 ? String(Math.round(numUsd / 1.07 * 100) / 100) : "";
	};
	const [offerBasePrice, setOfferBasePrice] = (0, import_react.useState)(getInitialOfferBase());
	const [variantsState, setVariantsState] = (0, import_react.useState)((product.variants ?? []).map((v) => {
		const vRec = v;
		const vMoneda = String(vRec["moneda_base"] ?? "").toUpperCase() === "ARS" ? "ARS" : "USD";
		const vBase = vRec["precio_base"] !== null && vRec["precio_base"] !== void 0 && Number(vRec["precio_base"]) > 0 ? String(vRec["precio_base"]) : "";
		return {
			id: v.id,
			color: v.color,
			hasCustom: Boolean(vBase),
			sourceCurrency: vMoneda,
			basePrice: vBase
		};
	}));
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const numBase = Number(basePrice.replace(/[^\d.-]/g, "")) || 0;
	const surchargeAmt = numBase > 0 ? sourceCurrency === "USD" ? Math.round(numBase * .07 * 100) / 100 : Math.round(numBase * .07) : 0;
	let finalUsd = 0;
	let finalArs = 0;
	if (numBase > 0) {
		if (sourceCurrency === "USD") {
			finalUsd = Math.round(numBase * 1.07 * 100) / 100;
			finalArs = calcArsFromUsd(finalUsd, dolarRate, markupPercentage, roundingIncrement, 1);
		} else {
			finalArs = Math.round(numBase * 1.07);
			finalUsd = dolarRate > 0 ? Math.round(finalArs / dolarRate * 100) / 100 : 0;
		}
	}
	const numOfferBase = Number(offerBasePrice.replace(/[^\d.-]/g, "")) || 0;
	numOfferBase > 0 && (offerSourceCurrency === "USD" ? Math.round(numOfferBase * .07 * 100) / 100 : Math.round(numOfferBase * .07));
	let finalOfferUsd = 0;
	let finalOfferArs = 0;
	if (hasOffer && numOfferBase > 0) {
		if (offerSourceCurrency === "USD") {
			finalOfferUsd = Math.round(numOfferBase * 1.07 * 100) / 100;
			finalOfferArs = calcArsFromUsd(finalOfferUsd, dolarRate, markupPercentage, roundingIncrement, 1);
		} else {
			finalOfferArs = Math.round(numOfferBase * 1.07);
			finalOfferUsd = dolarRate > 0 ? Math.round(finalOfferArs / dolarRate * 100) / 100 : 0;
		}
	}
	async function handleSavePrice() {
		if (!Boolean(pRec["whatsapp_only_reason"]) && numBase <= 0) {
			setError("El precio base principal debe ser mayor a 0.");
			return;
		}
		if (hasOffer && numOfferBase <= 0) {
			setError("Si la oferta está activada, debés ingresar un precio base de oferta.");
			return;
		}
		setSaving(true);
		setError("");
		try {
			const res = await updateProductPrice({ data: {
				email: userEmail,
				token: userToken,
				productId: String(product.id),
				sourceCurrency,
				basePrice: numBase,
				hasOffer,
				offerSourceCurrency,
				offerBasePrice: hasOffer ? numOfferBase : null,
				variants: variantsState.map((v) => ({
					id: v.id,
					color: v.color,
					sourceCurrency: v.sourceCurrency,
					basePrice: v.hasCustom && Number(v.basePrice) > 0 ? Number(v.basePrice) : null
				}))
			} });
			if (res.error) {
				setError(res.error);
				return;
			}
			toast.success("Precios actualizados con éxito.");
			onSaved();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al guardar el precio.");
		} finally {
			setSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-sm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative my-4 sm:my-8 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-b border-border px-5 py-4 shrink-0 bg-muted/40",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl bg-primary/10 p-2 text-primary",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "h-5 w-5" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-base sm:text-lg font-bold text-foreground",
							children: "Editar Precios"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs text-muted-foreground truncate max-w-[320px] sm:max-w-md",
							children: product.nombre
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "rounded-lg p-1.5 text-muted-foreground hover:bg-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-5 px-5 py-5 overflow-y-auto flex-1",
					children: [
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive font-medium",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl bg-muted/30 border border-border/80 p-4 space-y-3",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-bold uppercase tracking-wider text-muted-foreground",
										children: "1. Moneda Base de Entrada"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "text-[11px] text-muted-foreground",
										children: ["Cotización: 1 USDT = ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(dolarRate) })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-2 gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											if (sourceCurrency !== "USD") {
												setSourceCurrency("USD");
												if (numBase > 0 && dolarRate > 0) setBasePrice(String(Math.round(numBase / dolarRate * 100) / 100));
											}
										},
										className: `flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${sourceCurrency === "USD" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:bg-muted"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "💵 Dólares (USDT)" }), sourceCurrency === "USD" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" })]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											if (sourceCurrency !== "ARS") {
												setSourceCurrency("ARS");
												if (numBase > 0 && dolarRate > 0) setBasePrice(String(Math.round(numBase * dolarRate)));
											}
										},
										className: `flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${sourceCurrency === "ARS" ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-card text-muted-foreground border-border hover:bg-muted"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🇦🇷 Pesos (ARS)" }), sourceCurrency === "ARS" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" })]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "label-sm",
									children: [
										"Precio Base (",
										sourceCurrency === "USD" ? "u$d sin recargo" : "$ sin recargo",
										") *"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground",
										children: sourceCurrency === "USD" ? "u$d" : "$"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "input-base pl-11 text-base font-semibold",
										value: basePrice,
										onChange: (e) => setBasePrice(e.target.value),
										placeholder: sourceCurrency === "USD" ? "Ej: 50" : "Ej: 80000",
										autoFocus: true
									})]
								})] }),
								numBase > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "rounded-xl bg-card border border-border p-3 space-y-2 text-xs",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between text-muted-foreground",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Costo base ingresado:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: sourceCurrency === "USD" ? `u$d ${numBase.toFixed(2)}` : money(numBase) })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "flex items-center gap-1",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), " Recargo tienda (+7%):"]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["+ ", sourceCurrency === "USD" ? `u$d ${surchargeAmt.toFixed(2)}` : money(surchargeAmt)] })]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-px bg-border my-1" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between font-bold text-foreground text-sm",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Precio final en Tienda:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "text-right",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-primary",
													children: money(finalArs)
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-xs text-muted-foreground ml-2",
													children: [
														"(u$d ",
														finalUsd.toFixed(2),
														")"
													]
												})]
											})]
										})
									]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl bg-muted/30 border border-border/80 p-4 space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-4 w-4 text-primary fill-primary" }), " 2. Precio de Oferta (Opcional)"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: hasOffer,
										onChange: (e) => setHasOffer(e.target.checked),
										className: "h-4 w-4 rounded border-border text-primary accent-primary"
									}), "Activar oferta"]
								})]
							}), hasOffer && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-3 pt-1",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setOfferSourceCurrency("USD"),
											className: `py-1.5 text-xs font-bold rounded-lg border transition-all ${offerSourceCurrency === "USD" ? "bg-primary/20 text-primary border-primary" : "bg-card text-muted-foreground border-border"}`,
											children: "Oferta en USD"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setOfferSourceCurrency("ARS"),
											className: `py-1.5 text-xs font-bold rounded-lg border transition-all ${offerSourceCurrency === "ARS" ? "bg-primary/20 text-primary border-primary" : "bg-card text-muted-foreground border-border"}`,
											children: "Oferta en ARS"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "label-sm",
										children: [
											"Precio Base de Oferta (",
											offerSourceCurrency === "USD" ? "u$d" : "$",
											")"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "input-base",
										value: offerBasePrice,
										onChange: (e) => setOfferBasePrice(e.target.value),
										placeholder: offerSourceCurrency === "USD" ? "Ej: 40" : "Ej: 64000"
									})] }),
									numOfferBase > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-xl bg-card border border-border p-2.5 text-xs flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: "Oferta final (+7%):"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "font-bold text-primary",
											children: [
												money(finalOfferArs),
												" ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "text-muted-foreground font-normal",
													children: [
														"(u$d ",
														finalOfferUsd.toFixed(2),
														")"
													]
												})
											]
										})]
									})
								]
							})]
						}),
						variantsState.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-2xl bg-muted/30 border border-border/80 p-4 space-y-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "text-xs font-bold uppercase tracking-wider text-muted-foreground block",
								children: [
									"3. Precios de Variantes de Color (",
									variantsState.length,
									")"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2.5",
								children: variantsState.map((v, idx) => {
									const vNumBase = Number(String(v.basePrice).replace(/[^\d.-]/g, "")) || 0;
									const vFinalUsd = v.sourceCurrency === "USD" ? Math.round(vNumBase * 1.07 * 100) / 100 : dolarRate > 0 ? Math.round(Math.round(vNumBase * 1.07) / dolarRate * 100) / 100 : 0;
									const vFinalArs = v.sourceCurrency === "USD" ? calcArsFromUsd(vFinalUsd, dolarRate, markupPercentage, roundingIncrement, 1) : Math.round(vNumBase * 1.07);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-xl border border-border bg-card p-3 space-y-2 text-xs",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-bold text-foreground",
												children: v.color
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
												className: "flex items-center gap-1.5 cursor-pointer text-muted-foreground",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "checkbox",
													checked: v.hasCustom,
													onChange: (e) => {
														const checked = e.target.checked;
														setVariantsState((prev) => prev.map((item, i) => i === idx ? {
															...item,
															hasCustom: checked,
															basePrice: checked ? item.basePrice || basePrice : ""
														} : item));
													},
													className: "h-3.5 w-3.5 rounded border-border accent-primary"
												}), "Precio personalizado"]
											})]
										}), v.hasCustom ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-2 gap-2 pt-1",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "label-sm",
													children: "Moneda"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
													className: "input-base text-xs py-1",
													value: v.sourceCurrency,
													onChange: (e) => {
														const val = e.target.value;
														setVariantsState((prev) => prev.map((item, i) => i === idx ? {
															...item,
															sourceCurrency: val
														} : item));
													},
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "USD",
														children: "USD (u$d)"
													}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
														value: "ARS",
														children: "ARS ($)"
													})]
												})] }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
													className: "label-sm",
													children: [
														"Precio Base (",
														v.sourceCurrency,
														")"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "input-base text-xs py-1",
													value: v.basePrice,
													onChange: (e) => {
														const val = e.target.value;
														setVariantsState((prev) => prev.map((item, i) => i === idx ? {
															...item,
															basePrice: val
														} : item));
													},
													placeholder: "Ej: 50"
												})] }),
												vNumBase > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "col-span-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium",
													children: [
														"Final (+7%): ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(vFinalArs) }),
														" (u$d ",
														vFinalUsd.toFixed(2),
														")"
													]
												})
											]
										}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[11px] text-muted-foreground italic",
											children: [
												"Hereda el precio general del producto (",
												money(finalArs),
												")"
											]
										})]
									}, v.id || idx);
								})
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5 bg-muted/20 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						disabled: saving,
						className: "btn-base border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-semibold",
						children: "Cancelar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void handleSavePrice(),
						disabled: saving,
						className: "btn-base bg-primary text-primary-foreground hover:opacity-90 px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50",
						children: [saving ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: saving ? "Guardando..." : "Guardar Precios" })]
					})]
				})
			]
		})
	});
}
function ProductModal({ initial, onClose, onSaved, onOpenPriceModal, userEmail, userToken, dolarRate = 1500, roundingIncrement = 10, markupPercentage = 0 }) {
	const [form, setForm] = (0, import_react.useState)(initial);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)("");
	const set = (field, value) => setForm((prev) => ({
		...prev,
		[field]: value
	}));
	(0, import_react.useEffect)(() => {
		if (!isCamiseta(form.categoria, form.nombre)) return;
		setForm((prev) => ({
			...prev,
			moq_group: prev.moq_group || "camisetas",
			tipo_talles: prev.tipo_talles === "NINGUNO" || !prev.tipo_talles ? "ROPA" : prev.tipo_talles,
			talles_disponibles: !prev.talles_disponibles || prev.talles_disponibles.length === 0 ? [
				"S",
				"M",
				"L",
				"XL",
				"2XL",
				"3XL",
				"4XL"
			] : prev.talles_disponibles,
			moneda_base: prev.moneda_base || "USD"
		}));
	}, [form.categoria, form.nombre]);
	const handlePriceUsdChange = (val) => {
		const numUsd = Number(val.replace(/[^\d.-]/g, ""));
		const calculatedArs = numUsd > 0 && dolarRate > 0 ? calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1.07) : "";
		setForm((prev) => ({
			...prev,
			precio_usd: val,
			precio_base: val,
			moneda_base: "USD",
			...calculatedArs ? { precio: String(calculatedArs) } : {}
		}));
	};
	const handlePriceArsChange = (val) => {
		const numArs = Number(val.replace(/[^\d.-]/g, ""));
		let calculatedUsd = "";
		if (numArs > 0 && dolarRate > 0) {
			const effArs = Math.round(numArs * 1.07);
			calculatedUsd = String(Math.round(effArs / dolarRate * 100) / 100);
		}
		setForm((prev) => ({
			...prev,
			precio: val,
			precio_base: val,
			moneda_base: "ARS",
			...calculatedUsd !== "" ? { precio_usd: calculatedUsd } : {}
		}));
	};
	const handlePriceOfertaUsdChange = (val) => {
		const numUsd = Number(val.replace(/[^\d.-]/g, ""));
		const calculatedArs = numUsd > 0 && dolarRate > 0 ? calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1.07) : "";
		setForm((prev) => ({
			...prev,
			precio_oferta_usd: val,
			precio_oferta_base: val,
			moneda_oferta_base: "USD",
			precio_oferta: val.trim() ? calculatedArs ? String(calculatedArs) : prev.precio_oferta ?? "" : ""
		}));
	};
	const handlePriceOfertaArsChange = (val) => {
		const numArs = Number(val.replace(/[^\d.-]/g, ""));
		let calculatedUsd = "";
		if (numArs > 0 && dolarRate > 0) {
			const effArs = Math.round(numArs * 1.07);
			calculatedUsd = String(Math.round(effArs / dolarRate * 100) / 100);
		}
		setForm((prev) => ({
			...prev,
			precio_oferta: val,
			precio_oferta_base: val,
			moneda_oferta_base: "ARS",
			precio_oferta_usd: val.trim() ? calculatedUsd !== "" ? calculatedUsd : prev.precio_oferta_usd ?? "" : ""
		}));
	};
	const updateVariantPriceUsd = (i, val) => {
		const numUsd = Number(val.replace(/[^\d.-]/g, ""));
		const calculatedArs = numUsd > 0 && dolarRate > 0 ? calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1.07) : "";
		setForm((prev) => ({
			...prev,
			variants: (prev.variants ?? []).map((v, idx) => idx === i ? {
				...v,
				precio_usd: val,
				precio_base: val,
				moneda_base: "USD",
				...calculatedArs ? { precio: String(calculatedArs) } : {}
			} : v)
		}));
	};
	const updateVariantPriceArs = (i, val) => {
		const numArs = Number(val.replace(/[^\d.-]/g, ""));
		let calculatedUsd = "";
		if (numArs > 0 && dolarRate > 0) {
			const effArs = Math.round(numArs * 1.07);
			calculatedUsd = String(Math.round(effArs / dolarRate * 100) / 100);
		}
		setForm((prev) => ({
			...prev,
			variants: (prev.variants ?? []).map((v, idx) => idx === i ? {
				...v,
				precio: val,
				precio_base: val,
				moneda_base: "ARS",
				...calculatedUsd !== "" ? { precio_usd: calculatedUsd } : {}
			} : v)
		}));
	};
	const addVariant = () => setForm((prev) => ({
		...prev,
		variants: [...prev.variants ?? [], {
			color: "",
			precio: "",
			precio_usd: "",
			stock: "SI",
			imagen_url: "",
			talles_disponibles: []
		}]
	}));
	const removeVariant = (i) => setForm((prev) => ({
		...prev,
		variants: (prev.variants ?? []).filter((_, idx) => idx !== i)
	}));
	const updateVariant = (i, field, value) => setForm((prev) => ({
		...prev,
		variants: (prev.variants ?? []).map((v, idx) => idx === i ? {
			...v,
			[field]: value
		} : v)
	}));
	const addTier = () => setForm((prev) => ({
		...prev,
		tiers: [...prev.tiers ?? [], {
			units: 0,
			percent: 0
		}]
	}));
	const removeTier = (i) => setForm((prev) => ({
		...prev,
		tiers: (prev.tiers ?? []).filter((_, idx) => idx !== i)
	}));
	const updateTier = (i, field, value) => setForm((prev) => ({
		...prev,
		tiers: (prev.tiers ?? []).map((t, idx) => idx === i ? {
			...t,
			[field]: value
		} : t)
	}));
	async function handleSave() {
		if (!Boolean(form.nombre.trim())) {
			setError("El nombre del producto es obligatorio.");
			return;
		}
		if (!form.id && !form.whatsapp_only_reason) {
			const hasPriceUsd = Boolean(form.precio_usd?.trim());
			const hasPriceArs = Boolean(form.precio?.trim());
			if (!hasPriceUsd && !hasPriceArs) {
				setError("Al dar de alta un producto, debés ingresar al menos un precio (USD o ARS).");
				return;
			}
		}
		setSaving(true);
		setError("");
		try {
			const res = await upsertAdminProduct({ data: {
				email: userEmail,
				token: userToken,
				product: form
			} });
			if (res.error) {
				setError(res.error);
				return;
			}
			onSaved();
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Error al guardar.");
		} finally {
			setSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-sm",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative my-4 sm:my-8 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card shadow-2xl overflow-hidden border border-border",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-muted/30",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-base sm:text-lg font-bold",
						children: form.id ? "Editar datos del producto" : "Nuevo producto"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "rounded-lg p-1.5 text-muted-foreground hover:bg-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-6 px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1",
					children: [
						error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive",
							children: error
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground",
							children: "Imagen principal"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageDropzone, {
							value: form.imagen_url ?? "",
							onChange: (url) => set("imagen_url", url),
							bucket: "storage-images",
							folder: "products"
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "col-span-1 sm:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "label-sm",
										children: form.whatsapp_only_reason === "zapatillas" ? "Modelo *" : "Nombre *"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "input-base",
										value: form.nombre,
										onChange: (e) => set("nombre", e.target.value),
										placeholder: form.whatsapp_only_reason === "zapatillas" ? "Modelo de zapatilla" : "Nombre del producto"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "label-sm",
										children: "Categoría"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "input-base",
										list: "admin-categories-datalist",
										value: form.categoria,
										onChange: (e) => set("categoria", e.target.value),
										placeholder: "Ej: Camisetas, Suplementos..."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
										id: "admin-categories-datalist",
										children: Array.from(/* @__PURE__ */ new Set([
											"Camisetas",
											"Zapatillas",
											"Tecnología",
											"Perfumes Árabes",
											"Perfumes Diseñador",
											"Bazar",
											"Mates",
											"Suplementos"
										])).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c }, c))
									}),
									isCamiseta(form.categoria, form.nombre) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2.5 space-y-1",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "👕" }),
													" Categoría ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Camisetas" }),
													" detectada — configuración automática aplicada:"
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
												className: "text-[10px] text-emerald-700 dark:text-emerald-400 space-y-0.5 pl-4 list-disc",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
														"Talles: ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "S · M · L · XL · 2XL · 3XL · 4XL" }),
														" (tipo Ropa)"
													] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["Mínimo de compra: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "10 unidades" })] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
														"Precio en: ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "USD" }),
														" (recargo 7% aplicado automáticamente)"
													] }),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: ["UI especial: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "selector Fan / Jugador + escala 10–500 u." })] })
												]
											}),
											isLongSleeve(form.nombre) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-[10px] font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🧤" }),
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Manga Larga" }),
														" detectada — se usará la escala de precios ML:"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 pl-3",
													children: "Jugador: $24.50 → $18.00 · Fan: $22.50 → $16.00 (según cantidad)"
												})]
											})
										]
									})
								] }),
								!form.whatsapp_only_reason && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
									className: "label-sm",
									children: "Color predeterminado"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "input-base",
									value: form.color_predeterminado ?? "",
									onChange: (e) => set("color_predeterminado", e.target.value),
									placeholder: "Ej: Negro"
								})] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "col-span-1 sm:col-span-2",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										onClick: () => {
											const isCurrentlyWa = Boolean(form.whatsapp_only_reason);
											setForm((prev) => ({
												...prev,
												whatsapp_only_reason: isCurrentlyWa ? "" : "china"
											}));
										},
										className: `flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${form.whatsapp_only_reason === "china" || form.whatsapp_only_reason === "whatsapp_only" ? "border-emerald-500/50 bg-emerald-500/10 shadow-xs" : form.whatsapp_only_reason ? "border-primary/40 bg-primary/5" : "border-border bg-surface/50 hover:bg-surface"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-2.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "text-xl",
												children: "💬"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-xs font-bold text-foreground flex items-center gap-1.5",
												children: "Venta exclusiva por WhatsApp (China / WhatsApp Only)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "text-[11px] text-muted-foreground",
												children: "Oculta la compra directa en la tienda y redirige al cliente a consultar por WhatsApp. El precio es opcional."
											})] })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: `h-5 w-9 rounded-full p-0.5 transition-colors shrink-0 ${Boolean(form.whatsapp_only_reason) ? "bg-emerald-600" : "bg-muted-foreground/30"}`,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-4 w-4 rounded-full bg-white transition-transform ${Boolean(form.whatsapp_only_reason) ? "translate-x-4" : "translate-x-0"}` })
										})]
									})
								}),
								form.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "col-span-1 sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-xs",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex flex-wrap items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "h-4 w-4" }), " Precios Actuales en Tienda"]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-2 flex flex-wrap items-center gap-4 text-sm",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-xs text-muted-foreground",
															children: "Precio ARS:"
														}),
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
															className: "text-foreground",
															children: form.precio && Number(form.precio) > 0 ? money(form.precio) : "Sin precio fijo (Por WhatsApp)"
														})
													] }),
													form.precio_usd && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-xs text-muted-foreground",
															children: "Precio USDT:"
														}),
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
															className: "text-foreground",
															children: ["u$d ", Number(form.precio_usd).toFixed(2)]
														})
													] }),
													form.precio_base && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-xs text-muted-foreground",
															children: "Base ingresada:"
														}),
														" ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-xs font-semibold text-muted-foreground",
															children: form.moneda_base === "ARS" ? money(form.precio_base) : `u$d ${form.precio_base}`
														})
													] })
												]
											}),
											form.precio_oferta && String(form.oferta).toUpperCase() === "SI" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-2 text-xs text-primary font-semibold flex items-center gap-1.5",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3.5 w-3.5 fill-primary" }),
													"Oferta activa: ",
													money(form.precio_oferta),
													" ",
													form.precio_oferta_usd ? `(u$d ${form.precio_oferta_usd})` : ""
												]
											})
										] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												if (onOpenPriceModal) onOpenPriceModal(form);
											},
											className: "btn-base bg-primary text-primary-foreground hover:opacity-90 px-3.5 py-2 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-4 w-4" }), " Modificar precio"]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-2.5 text-[11px] text-muted-foreground",
										children: "ℹ️ Para proteger tus márgenes, editar los datos del producto (nombre, stock, fotos, etc.) nunca altera ni recalcula los precios."
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
									Boolean(form.whatsapp_only_reason) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "col-span-1 sm:col-span-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium",
										children: [
											"💬 ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "Modo WhatsApp Only activado:" }),
											" Los precios son opcionales. Podés dejarlos vacíos y en la tienda se mostrará ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("em", { children: "\"Consultar precio y disponibilidad al WhatsApp\"" }),
											"."
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "label-sm",
											children: [
												"Precio Base USD (u$d ",
												form.whatsapp_only_reason ? "- opcional" : "",
												")"
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: "input-base",
											value: form.precio_usd ?? "",
											onChange: (e) => handlePriceUsdChange(e.target.value),
											placeholder: form.whatsapp_only_reason ? "Opcional (Ej: 50)" : "Ej: 50"
										}),
										(() => {
											const raw = Number(String(form.precio_usd ?? "").replace(/[^\d.-]/g, ""));
											return raw > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1.5 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Precio final (+7%): ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["u$d ", (Math.round(raw * 1.07 * 100) / 100).toFixed(2)] })] })]
											}) : null;
										})(),
										Boolean(form.precio_usd?.trim()) && dolarRate > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3 w-3 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Actualiza pesos a ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(calcArsFromUsd(form.precio_usd ?? "", dolarRate, markupPercentage, roundingIncrement, 1.07)) })] })]
										})
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "label-sm",
											children: [
												"Precio Base ARS ($ ",
												form.whatsapp_only_reason ? "- opcional" : "",
												")"
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											className: "input-base",
											value: form.precio,
											onChange: (e) => handlePriceArsChange(e.target.value),
											placeholder: form.whatsapp_only_reason ? "Opcional (Ej: 80000)" : "Ej: 80000"
										}),
										(() => {
											const raw = Number(String(form.precio ?? "").replace(/[^\d.-]/g, ""));
											return raw > 0 && !form.precio_usd?.trim() ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1.5 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Precio final ARS (+7%): ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["$", Math.round(raw * 1.07).toLocaleString("es-AR")] })] })]
											}) : null;
										})()
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "label-sm",
										children: "Precio oferta Base USD (u$d - opcional)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "input-base",
										value: form.precio_oferta_usd ?? "",
										onChange: (e) => handlePriceOfertaUsdChange(e.target.value),
										placeholder: "Ej: 40"
									})] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "label-sm",
										children: "Precio oferta Base ARS (opcional)"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										className: "input-base",
										value: form.precio_oferta ?? "",
										onChange: (e) => handlePriceOfertaArsChange(e.target.value),
										placeholder: "Ej: 64000"
									})] })
								] }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "col-span-1 sm:col-span-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "label-sm",
										children: "Descripción"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
										className: "input-base min-h-[80px] resize-y",
										value: form.descripcion ?? "",
										onChange: (e) => set("descripcion", e.target.value),
										placeholder: "Descripción del producto..."
									})]
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "text-xs font-bold uppercase tracking-wider text-muted-foreground",
										children: "Tipo de venta"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										id: "whatsapp_only_reason_selector",
										value: form.whatsapp_only_reason ?? "",
										onChange: (e) => {
											const reason = e.target.value;
											const autoTalles = reason === "zapatillas" ? "ZAPATILLAS" : reason === "remeras" ? "ROPA" : "NINGUNO";
											setForm((prev) => ({
												...prev,
												whatsapp_only_reason: reason,
												...reason ? { tipo_talles: autoTalles } : {}
											}));
										},
										className: "input-base text-sm py-1.5",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "",
												children: "Compra normal (carrito y checkout)"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "china",
												children: "China / WhatsApp Only — Consultar precio y disponibilidad"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "vapers",
												children: "Vapers — solo por WhatsApp"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "zapatillas",
												children: "Zapatillas — solo por WhatsApp"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
												value: "remeras",
												children: "Remeras — solo por WhatsApp"
											})
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col gap-1 min-w-[220px]",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
											className: "text-xs font-bold uppercase tracking-wider text-muted-foreground",
											children: "Compra mínima"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
											id: "moq_group_selector",
											value: form.moq_group ?? "",
											onChange: (e) => set("moq_group", e.target.value),
											className: "input-base text-sm py-1.5",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "",
													children: "Automático (por categoría)"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "none",
													children: "Sin mínimo de compra"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "camisetas",
													children: "Camisetas — mín. 10 unidades"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "mates",
													children: "Mates — mín. 10 unidades"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "perfumes arabes",
													children: "Perfumes Árabes — mín. 5 u."
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
													value: "perfumes disenador",
													children: "Perfumes Diseñador — mín. 3 u."
												})
											]
										}),
										isMate(form.nombre, form.categoria) && !form.moq_group && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[11px] text-amber-600 dark:text-amber-400 mt-0.5",
											children: "⚠ El nombre sugiere que es un Mate. Confirmá o corregí el mínimo."
										})
									]
								}),
								[
									"destacado",
									"oferta",
									"stock"
								].map((field) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex cursor-pointer items-center gap-2 text-sm font-medium capitalize",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										onClick: () => set(field, form[field] === "SI" ? "NO" : "SI"),
										className: `h-5 w-9 rounded-full p-0.5 transition-colors ${form[field] === "SI" ? "bg-primary" : "bg-muted-foreground/30"}`,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `h-4 w-4 rounded-full bg-white transition-transform ${form[field] === "SI" ? "translate-x-4" : "translate-x-0"}` })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: field })]
								}, field))
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border p-4 bg-muted/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mb-3 flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-sm font-bold text-foreground",
									children: "Descuento por cantidad"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground",
									children: "Configurá escalas de descuento progresivas."
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									type: "button",
									onClick: addTier,
									className: "btn-base bg-primary/10 text-primary hover:bg-primary/20 text-xs py-1 px-2.5 flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), " Agregar escala"]
								})]
							}), form.tiers && form.tiers.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "space-y-2",
								children: form.tiers.map((tier, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-muted-foreground min-w-[70px]",
											children: "Desde"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: "1",
											className: "input-base w-24 text-center text-xs py-1",
											value: tier.units || "",
											onChange: (e) => updateTier(idx, "units", Number(e.target.value)),
											placeholder: "U."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-muted-foreground",
											children: "unidades:"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "relative flex-1 max-w-[120px]",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												type: "number",
												step: "0.1",
												min: "0",
												max: "100",
												className: "input-base pr-6 text-center text-xs py-1",
												value: tier.percent || "",
												onChange: (e) => updateTier(idx, "percent", Number(e.target.value)),
												placeholder: "%"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground",
												children: "%"
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-xs text-muted-foreground",
											children: "OFF"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => removeTier(idx),
											className: "rounded-lg p-1 text-destructive hover:bg-destructive/10 ml-auto",
											title: "Eliminar escala",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" })
										})
									]
								}, idx))
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground italic",
								children: "Sin escalas configuradas."
							})]
						}),
						!form.whatsapp_only_reason && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-3 rounded-xl border border-border p-4 bg-muted/20",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "label-sm mb-1 block",
								children: "Tipo de talles"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2",
								children: [
									"NINGUNO",
									"ZAPATILLAS",
									"ROPA"
								].map((tipo) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => {
										set("tipo_talles", tipo);
										if (tipo === "NINGUNO") set("talles_disponibles", []);
									},
									className: `rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${form.tipo_talles === tipo ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-card text-muted-foreground border-border hover:bg-muted"}`,
									children: tipo === "NINGUNO" ? "Sin talles" : tipo === "ZAPATILLAS" ? "👟 Zapatillas (35-45)" : "👕 Ropa (XS-XXXL)"
								}, tipo))
							})] }), form.tipo_talles && form.tipo_talles !== "NINGUNO" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "label-sm mb-1.5 block",
								children: [
									"Talles disponibles para el producto general (",
									form.tipo_talles === "ZAPATILLAS" ? "Números" : "Letras",
									")"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1.5",
								children: (form.tipo_talles === "ZAPATILLAS" ? [
									"35",
									"36",
									"37",
									"38",
									"39",
									"40",
									"41",
									"42",
									"43",
									"44",
									"45"
								] : [
									"XS",
									"S",
									"M",
									"L",
									"XL",
									"XXL",
									"XXXL"
								]).map((talle) => {
									const normalizedCurrent = (form.talles_disponibles ?? []).map((t) => String(t).trim());
									const active = normalizedCurrent.includes(talle);
									return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											const next = active ? normalizedCurrent.filter((t) => t !== talle) : [...normalizedCurrent, talle];
											set("talles_disponibles", next);
										},
										className: `h-8 min-w-9 rounded-lg px-2 text-xs font-bold transition-all border ${active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-xs" : "bg-card text-muted-foreground border-border hover:bg-muted"}`,
										children: [
											talle,
											" ",
											active ? "✓" : ""
										]
									}, talle);
								})
							})] })]
						}),
						!form.whatsapp_only_reason && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
								children: "Variantes de color"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: addVariant,
								className: "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3" }), " Agregar"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "space-y-3",
							children: (form.variants ?? []).map((v, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-border bg-muted/30 p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mb-2 flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-xs font-semibold text-muted-foreground",
											children: ["Variante #", i + 1]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => removeVariant(i),
											className: "text-destructive hover:opacity-70",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "label-sm",
												children: "Color"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												className: "input-base",
												value: v.color,
												onChange: (e) => updateVariant(i, "color", e.target.value),
												placeholder: "Ej: Rojo"
											})] }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
												className: "label-sm",
												children: "Stock (SI / NO)"
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
												className: "input-base",
												value: String(v.stock ?? "SI"),
												onChange: (e) => updateVariant(i, "stock", e.target.value)
											})] }),
											!form.id ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "label-sm",
													children: "Precio Base USD (u$d - opcional)"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "input-base",
													value: String(v.precio_usd ?? ""),
													onChange: (e) => updateVariantPriceUsd(i, e.target.value),
													placeholder: "Ej: 50 (opcional)"
												}),
												(() => {
													const raw = Number(String(v.precio_usd ?? "").replace(/[^\d.-]/g, ""));
													return raw > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "mt-1 flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-2.5 w-2.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Final (+7%): ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["u$d ", (Math.round(raw * 1.07 * 100) / 100).toFixed(2)] })] })]
													}) : null;
												})()
											] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
													className: "label-sm",
													children: "Precio Base ARS (opcional)"
												}),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													className: "input-base",
													value: String(v.precio ?? ""),
													onChange: (e) => updateVariantPriceArs(i, e.target.value),
													placeholder: "Ej: 80000 (opcional)"
												}),
												!v.precio_usd && (() => {
													const raw = Number(String(v.precio ?? "").replace(/[^\d.-]/g, ""));
													return raw > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "mt-1 flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-2.5 w-2.5 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Final (+7%): ", /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: ["$", Math.round(raw * 1.07).toLocaleString("es-AR")] })] })]
													}) : null;
												})()
											] })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "col-span-1 sm:col-span-2 flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-muted/60 text-muted-foreground border border-border/60",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
													"Precio actual en tienda: ",
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
														className: "text-foreground",
														children: money(v.precio)
													}),
													" ",
													v.precio_usd ? `(u$d ${v.precio_usd})` : ""
												] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-[11px] text-primary font-medium",
													children: "Editá precios desde \"Modificar precio\""
												})]
											})
										]
									}),
									form.tipo_talles && form.tipo_talles !== "NINGUNO" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-2 mb-3 space-y-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "label-sm",
											children: ["Talles en stock para variante ", v.color || `Nro ${i + 1}`]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "flex flex-wrap gap-1",
											children: (form.tipo_talles === "ZAPATILLAS" ? [
												"35",
												"36",
												"37",
												"38",
												"39",
												"40",
												"41",
												"42",
												"43",
												"44",
												"45"
											] : [
												"XS",
												"S",
												"M",
												"L",
												"XL",
												"XXL",
												"XXXL"
											]).map((talle) => {
												const normalizedCurrent = (v.talles_disponibles ?? []).map((t) => String(t).trim());
												const active = normalizedCurrent.includes(talle);
												return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
													type: "button",
													onClick: () => {
														const next = active ? normalizedCurrent.filter((t) => t !== talle) : [...normalizedCurrent, talle];
														updateVariant(i, "talles_disponibles", next);
													},
													className: `h-7 min-w-8 rounded-md px-1.5 text-[10px] font-bold transition-all border ${active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-xs" : "bg-muted/40 text-muted-foreground/60 border-border opacity-60 hover:opacity-100"}`,
													children: [
														talle,
														" ",
														active ? "✓" : ""
													]
												}, talle);
											})
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										className: "label-sm mb-1 block",
										children: "Imagen de variante"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageDropzone, {
										value: v.imagen_url ?? "",
										onChange: (url) => updateVariant(i, "imagen_url", url),
										bucket: "storage-images",
										folder: "products-VARIANTES",
										label: "Arrastrá imagen de variante"
									})
								]
							}, i))
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-2 flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
								children: "Descuentos por cantidad"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: addTier,
								className: "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3" }), " Agregar tier"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [(form.tiers ?? []).map((t, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex flex-wrap items-center gap-2",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: 1,
										className: "input-base w-20 sm:w-24",
										value: t.units || "",
										onChange: (e) => updateTier(i, "units", Number(e.target.value)),
										placeholder: "Unidades"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs sm:text-sm text-muted-foreground",
										children: "unid. →"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: 0,
										max: 100,
										step: .5,
										className: "input-base w-20 sm:w-24",
										value: t.percent || "",
										onChange: (e) => updateTier(i, "percent", Number(e.target.value)),
										placeholder: "% desc."
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs sm:text-sm text-muted-foreground",
										children: "%"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => removeTier(i),
										className: "text-destructive hover:opacity-70 p-1",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
									})
								]
							}, i)), (form.tiers ?? []).length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Sin descuentos por cantidad."
							})]
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-end gap-3 border-t border-border px-4 py-3 sm:px-6 sm:py-4 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "btn-base bg-muted text-foreground hover:bg-muted/70",
						children: "Cancelar"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void handleSave(),
						disabled: saving,
						className: "btn-base bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50",
						children: saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear producto"
					})]
				})
			]
		})
	});
}
function ActiveOfferCard({ product, userEmail, userToken, onSaved, dolarRate = 1500, roundingIncrement = 10, markupPercentage = 0 }) {
	const [precioOferta, setPrecioOferta] = (0, import_react.useState)(() => {
		const pOff = String(product.precio_oferta ?? "").trim();
		if (pOff && toNumber(pOff) > 0) return pOff;
		const base = toNumber(product.precio);
		return base > 0 ? String(Math.round(base * .9)) : "";
	});
	const [precioOfertaUsd, setPrecioOfertaUsd] = (0, import_react.useState)(() => {
		const pUsd = String(product["precio_oferta_usd"] ?? "").trim();
		if (pUsd && toNumber(pUsd) > 0) return pUsd;
		const baseUsd = toNumber(String(product["precio_usd"] ?? ""));
		return baseUsd > 0 ? String(Math.round(baseUsd * .9 * 100) / 100) : "";
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	const basePrice = toNumber(product.precio);
	const offerPrice = toNumber(precioOferta);
	const discountPct = basePrice > 0 && offerPrice > 0 && offerPrice < basePrice ? Math.round((basePrice - offerPrice) / basePrice * 100) : 0;
	const handleOfferUsdChange = (val) => {
		setPrecioOfertaUsd(val);
		const numUsd = Number(val.replace(/[^\d.-]/g, ""));
		if (numUsd > 0 && dolarRate > 0) {
			const calculatedArs = calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1);
			setPrecioOferta(String(calculatedArs));
		} else if (!val.trim()) setPrecioOferta("");
	};
	const applyPreset = (pct) => {
		const baseArs = toNumber(product.precio);
		const baseUsd = toNumber(String(product["precio_usd"] ?? ""));
		if (baseUsd > 0) {
			const newUsd = Math.round(baseUsd * (1 - pct / 100) * 100) / 100;
			handleOfferUsdChange(String(newUsd));
		} else if (baseArs > 0) setPrecioOferta(String(Math.round(baseArs * (1 - pct / 100))));
	};
	async function handleSave() {
		setSaving(true);
		try {
			const input = productToInput(product);
			input.oferta = "SI";
			input.precio_oferta = precioOferta;
			input.precio_oferta_usd = precioOfertaUsd;
			const res = await upsertAdminProduct({ data: {
				email: userEmail,
				token: userToken,
				product: input
			} });
			if (res.error) toast.error(res.error);
			else {
				toast.success(`Oferta guardada para ${product.nombre}`);
				await onSaved();
			}
		} catch {
			toast.error("Error al guardar la oferta.");
		} finally {
			setSaving(false);
		}
	}
	async function handleRemove() {
		setSaving(true);
		try {
			const input = productToInput(product);
			input.oferta = "NO";
			const res = await upsertAdminProduct({ data: {
				email: userEmail,
				token: userToken,
				product: input
			} });
			if (res.error) toast.error(res.error);
			else {
				toast.info(`"${product.nombre}" quitado de Ofertas del Día.`);
				await onSaved();
			}
		} catch {
			toast.error("Error al quitar la oferta.");
		} finally {
			setSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-all",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafeImage, {
				rawSrc: product.imagen_url,
				alt: product.nombre ?? "",
				thumb: true,
				className: "h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-border shadow-xs shrink-0",
				onError: onImageError(product.imagen_url)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2 flex-wrap",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
								children: "🔥 Oferta Activa"
							}),
							discountPct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold",
								children: [
									"-",
									discountPct,
									"% OFF"
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-xs text-muted-foreground",
								children: product.categoria
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-bold text-sm sm:text-base text-foreground mt-1 truncate",
						children: product.nombre
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground mt-0.5 flex items-center gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Precio lista: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-foreground",
							children: money(product.precio)
						})] })
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full sm:w-auto flex flex-col gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-medium text-muted-foreground",
					children: "Calcular:"
				}), [
					10,
					15,
					20,
					25,
					30,
					40,
					50
				].map((pct) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => applyPreset(pct),
					className: "rounded-md bg-muted hover:bg-primary/20 hover:text-primary px-2 py-0.5 text-[11px] font-bold transition-colors",
					children: [
						"-",
						pct,
						"%"
					]
				}, pct))]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 flex-wrap",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-semibold text-muted-foreground",
							children: "USD:"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: precioOfertaUsd,
							onChange: (e) => handleOfferUsdChange(e.target.value),
							placeholder: "Precio USD",
							className: "input-base text-xs py-1.5 w-24"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-semibold text-muted-foreground",
							children: "ARS:"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: precioOferta,
							onChange: (e) => setPrecioOferta(e.target.value),
							placeholder: "Precio ARS",
							className: "input-base text-xs py-1.5 w-28 font-bold text-primary"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => void handleSave(),
						disabled: saving,
						className: "btn-base bg-primary text-primary-foreground text-xs py-1.5 px-3 hover:opacity-90 flex items-center gap-1 disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-3.5 w-3.5" }), " Guardar"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void handleRemove(),
						disabled: saving,
						className: "btn-base bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs py-1.5 px-2.5 disabled:opacity-50",
						title: "Quitar de ofertas",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
					})
				]
			})]
		})]
	});
}
function CandidateOfferCard({ product, userEmail, userToken, onSaved, dolarRate = 1500, roundingIncrement = 10, markupPercentage = 0 }) {
	const [precioOferta, setPrecioOferta] = (0, import_react.useState)(() => {
		const baseArs = toNumber(product.precio);
		return baseArs > 0 ? String(Math.round(baseArs * .9)) : "";
	});
	const [precioOfertaUsd, setPrecioOfertaUsd] = (0, import_react.useState)(() => {
		const baseUsd = toNumber(String(product["precio_usd"] ?? ""));
		return baseUsd > 0 ? String(Math.round(baseUsd * .9 * 100) / 100) : "";
	});
	const [saving, setSaving] = (0, import_react.useState)(false);
	const basePrice = toNumber(product.precio);
	const offerPrice = toNumber(precioOferta);
	basePrice > 0 && offerPrice > 0 && offerPrice < basePrice && Math.round((basePrice - offerPrice) / basePrice * 100);
	const handleOfferUsdChange = (val) => {
		setPrecioOfertaUsd(val);
		const numUsd = Number(val.replace(/[^\d.-]/g, ""));
		if (numUsd > 0 && dolarRate > 0) {
			const calculatedArs = calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1);
			setPrecioOferta(String(calculatedArs));
		} else if (!val.trim()) setPrecioOferta("");
	};
	const applyPreset = (pct) => {
		const baseArs = toNumber(product.precio);
		const baseUsd = toNumber(String(product["precio_usd"] ?? ""));
		if (baseUsd > 0) {
			const newUsd = Math.round(baseUsd * (1 - pct / 100) * 100) / 100;
			handleOfferUsdChange(String(newUsd));
		} else if (baseArs > 0) setPrecioOferta(String(Math.round(baseArs * (1 - pct / 100))));
	};
	async function handleActivate() {
		setSaving(true);
		try {
			const input = productToInput(product);
			input.oferta = "SI";
			const baseArs = toNumber(product.precio);
			input.precio_oferta = precioOferta || (baseArs > 0 ? String(Math.round(baseArs * .9)) : "");
			if (precioOfertaUsd) input.precio_oferta_usd = precioOfertaUsd;
			else {
				const baseUsd = toNumber(String(product["precio_usd"] ?? ""));
				if (baseUsd > 0) input.precio_oferta_usd = String(Math.round(baseUsd * .9 * 100) / 100);
			}
			const res = await upsertAdminProduct({ data: {
				email: userEmail,
				token: userToken,
				product: input
			} });
			if (res.error) toast.error(res.error);
			else {
				toast.success(`¡"${product.nombre}" agregado a Ofertas del Día con descuento!`);
				await onSaved();
			}
		} catch {
			toast.error("Error al activar la oferta.");
		} finally {
			setSaving(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs hover:border-primary/40 transition-all",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3 min-w-0 flex-1",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafeImage, {
				rawSrc: product.imagen_url,
				alt: product.nombre ?? "",
				thumb: true,
				className: "h-16 w-16 sm:h-20 sm:w-20 rounded-xl object-cover border border-border shadow-xs shrink-0",
				onError: onImageError(product.imagen_url)
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-xs text-muted-foreground font-medium",
						children: product.categoria
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-bold text-sm sm:text-base text-foreground truncate",
						children: product.nombre
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-muted-foreground mt-0.5",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["Precio lista: ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
							className: "text-foreground",
							children: money(product.precio)
						})] })
					})
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full sm:w-auto flex flex-col gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-1 flex-wrap",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-[11px] font-medium text-muted-foreground",
					children: "Descuento:"
				}), [
					10,
					15,
					20,
					25,
					30,
					40,
					50
				].map((pct) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => applyPreset(pct),
					className: "rounded-md bg-muted hover:bg-primary/20 hover:text-primary px-2 py-0.5 text-[11px] font-bold transition-colors",
					children: [
						"-",
						pct,
						"%"
					]
				}, pct))]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 flex-wrap",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-semibold text-muted-foreground",
							children: "USD:"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: precioOfertaUsd,
							onChange: (e) => handleOfferUsdChange(e.target.value),
							placeholder: "Precio USD",
							className: "input-base text-xs py-1.5 w-24"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "text-xs font-semibold text-muted-foreground",
							children: "ARS:"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "text",
							value: precioOferta,
							onChange: (e) => setPrecioOferta(e.target.value),
							placeholder: "Precio ARS",
							className: "input-base text-xs py-1.5 w-28 font-bold text-primary"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => void handleActivate(),
						disabled: saving,
						className: "btn-base bg-primary text-primary-foreground text-xs py-1.5 px-3 hover:opacity-90 flex items-center gap-1 disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3.5 w-3.5 fill-primary-foreground" }), "Activar Oferta"]
					})
				]
			})]
		})]
	});
}
var ComboPanelBoundary = class extends import_react.Component {
	constructor(props) {
		super(props);
		this.state = {
			hasError: false,
			errorMsg: ""
		};
	}
	static getDerivedStateFromError(error) {
		return {
			hasError: true,
			errorMsg: error instanceof Error ? error.message : String(error)
		};
	}
	render() {
		if (this.state.hasError) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold text-destructive",
					children: "Ocurrió un error al cargar el panel de combos."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: this.state.errorMsg
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => this.setState({
						hasError: false,
						errorMsg: ""
					}),
					className: "btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90",
					children: "Reintentar"
				})
			]
		});
		return this.props.children;
	}
};
function ComboBuilderPanel({ userEmail, userToken, initialBanners = [], onRefresh, dolarRate = 1500, roundingIncrement = 10, markupPercentage = 0 }) {
	const [banners, setBanners] = (0, import_react.useState)(initialBanners);
	const [loadingBanners, setLoadingBanners] = (0, import_react.useState)(false);
	const [creating, setCreating] = (0, import_react.useState)(false);
	const [editingBanner, setEditingBanner] = (0, import_react.useState)(null);
	const [comboTitle, setComboTitle] = (0, import_react.useState)("");
	const [comboSubtitle, setComboSubtitle] = (0, import_react.useState)("");
	const [comboImage, setComboImage] = (0, import_react.useState)("");
	const [sourceCurrency, setSourceCurrency] = (0, import_react.useState)("USD");
	const [basePrice, setBasePrice] = (0, import_react.useState)("");
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [comboTiers, setComboTiers] = (0, import_react.useState)([]);
	const [hasTiers, setHasTiers] = (0, import_react.useState)(false);
	const numBase = Number(basePrice.replace(/[^\d.-]/g, "")) || 0;
	const surchargeAmt = numBase > 0 ? sourceCurrency === "USD" ? Math.round(numBase * .07 * 100) / 100 : Math.round(numBase * .07) : 0;
	let finalUsd = 0;
	let finalArs = 0;
	if (numBase > 0) {
		if (sourceCurrency === "USD") {
			finalUsd = Math.round(numBase * 1.07 * 100) / 100;
			finalArs = calcArsFromUsd(finalUsd, dolarRate, markupPercentage, roundingIncrement, 1);
		} else {
			finalArs = Math.round(numBase * 1.07);
			finalUsd = dolarRate > 0 ? Math.round(finalArs / dolarRate * 100) / 100 : 0;
		}
	}
	const discPct = 7;
	const tPrice = transferPrice(finalArs, discPct);
	async function loadBanners() {
		if (!userEmail || !userToken) return;
		setLoadingBanners(true);
		try {
			const res = await getAdminBanners({ data: {
				email: userEmail,
				token: userToken
			} });
			if (res && Array.isArray(res.banners)) setBanners(res.banners);
		} catch {
			toast.error("Error al cargar las ofertas de combos.");
		} finally {
			setLoadingBanners(false);
		}
	}
	(0, import_react.useEffect)(() => {
		if (userEmail && userToken) loadBanners();
	}, [userEmail, userToken]);
	(0, import_react.useEffect)(() => {
		if (initialBanners && initialBanners.length > 0 && banners.length === 0) setBanners(initialBanners);
	}, [initialBanners]);
	function resetForm() {
		setComboTitle("");
		setComboSubtitle("");
		setComboImage("");
		setSourceCurrency("USD");
		setBasePrice("");
		setCreating(false);
		setEditingBanner(null);
		setComboTiers([]);
		setHasTiers(false);
	}
	function handleEditClick(b) {
		const curr = String(b.moneda_base ?? "").toUpperCase() === "ARS" ? "ARS" : "USD";
		setSourceCurrency(curr);
		let baseVal = "";
		if (b.precio_base !== null && b.precio_base !== void 0 && Number(b.precio_base) > 0) baseVal = String(b.precio_base);
		else if (curr === "ARS") {
			const p = toNumber(b.precio);
			baseVal = p > 0 ? String(Math.round(p / 1.07)) : "";
		} else {
			const pUsd = Number(b.precio_usd) || (dolarRate > 0 ? toNumber(b.precio) / dolarRate : 0);
			baseVal = pUsd > 0 ? String(Math.round(pUsd / 1.07 * 100) / 100) : "";
		}
		setEditingBanner({
			...b.id !== void 0 ? { id: b.id } : {},
			titulo: b.titulo ?? "",
			subtitulo: b.subtitulo ?? "",
			imagen_url: b.imagen_url ?? "",
			precio: String(b.precio ?? ""),
			precio_base: b.precio_base ?? null,
			moneda_base: b.moneda_base ?? null,
			precio_usd: b.precio_usd ?? null,
			activo: b.activo ?? "SI"
		});
		setComboTitle(b.titulo ?? "");
		setComboSubtitle(b.subtitulo ?? "");
		setComboImage(b.imagen_url ?? "");
		setBasePrice(baseVal);
		const rawTiers = b.quantity_tiers ?? b.link;
		let existingTiers = [];
		if (Array.isArray(rawTiers) && rawTiers.length > 0) existingTiers = rawTiers;
		else if (typeof rawTiers === "string" && rawTiers.trim().startsWith("[")) try {
			const parsed = JSON.parse(rawTiers);
			if (Array.isArray(parsed) && parsed.length > 0) existingTiers = parsed;
		} catch {}
		setComboTiers(existingTiers.map((t) => ({
			units: t.units,
			priceStr: t.price > 0 ? String(Math.round(t.price / 1.07)) : ""
		})));
		setHasTiers(existingTiers.length > 0);
		setCreating(true);
	}
	async function handleSaveCombo() {
		if (!comboTitle.trim()) {
			toast.error("Ingresá el título del combo.");
			return;
		}
		if (numBase <= 0) {
			toast.error("Ingresá un precio base válido mayor a 0.");
			return;
		}
		setSaving(true);
		try {
			const validTiers = comboTiers.filter((t) => Number(t.units) >= 2 && Number(t.priceStr) > 0).sort((a, b) => a.units - b.units).map((t) => ({
				units: t.units,
				price: Math.round(Number(t.priceStr) * 1.07)
			}));
			const bannerInput = {
				...editingBanner?.id !== void 0 ? { id: editingBanner.id } : {},
				titulo: comboTitle,
				subtitulo: comboSubtitle,
				imagen_url: comboImage,
				precio: String(finalArs),
				precio_base: numBase,
				moneda_base: sourceCurrency,
				precio_usd: finalUsd > 0 ? finalUsd : null,
				activo: "SI",
				quantity_tiers: validTiers.length > 0 ? validTiers : null
			};
			const res = await upsertAdminBanner({ data: {
				email: userEmail,
				token: userToken,
				banner: bannerInput
			} });
			if (res?.error) toast.error(res.error);
			else {
				toast.success(`¡Combo "${comboTitle}" guardado correctamente!`);
				resetForm();
				await loadBanners();
				await onRefresh();
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Error al guardar el combo.");
		} finally {
			setSaving(false);
		}
	}
	async function handleDeleteCombo(id, title) {
		if (!confirm(`¿Eliminar el combo "${title}"?`)) return;
		try {
			const res = await deleteAdminBanner({ data: {
				email: userEmail,
				token: userToken,
				bannerId: id
			} });
			if (res.error) toast.error(res.error);
			else {
				toast.info("Combo eliminado.");
				await loadBanners();
				await onRefresh();
			}
		} catch {
			toast.error("Error al eliminar el combo.");
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/40 p-4 rounded-2xl border border-border",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
					className: "font-bold text-base text-foreground flex items-center gap-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary" }),
						" Combos y Packs (",
						banners.length,
						")"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Creá combos con precio unitario y descuentos por cantidad opcionales (tramos de precio con cantidad mínima)."
				})] }), !creating && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => {
						resetForm();
						setCreating(true);
					},
					className: "btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90 flex items-center gap-1.5 shrink-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Crear Nuevo Combo"]
				})]
			}),
			creating && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 shadow-md space-y-5 max-w-2xl mx-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between border-b border-border pb-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
							className: "font-bold text-lg flex items-center gap-2 text-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-primary" }), editingBanner ? "Editar Combo" : "Nuevo Combo (Foto + Precios + Descuentos)"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: resetForm,
							className: "rounded-lg p-1.5 text-muted-foreground hover:bg-muted",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "label-sm",
								children: "Nombre del Combo *"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "text",
								value: comboTitle,
								onChange: (e) => setComboTitle(e.target.value),
								placeholder: "Ej: Combo Ropa, Combo Mate + Indumentaria, etc.",
								className: "input-base"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-border bg-surface/60 p-3.5 space-y-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
											className: "text-xs font-bold text-foreground flex items-center gap-1.5",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Coins, { className: "h-4 w-4 text-primary" }), "Moneda Base del Combo"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[11px] text-muted-foreground",
											children: ["Cotización: 1 USD = ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: money(dolarRate) })]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "grid grid-cols-2 gap-2",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												if (sourceCurrency !== "USD") {
													setSourceCurrency("USD");
													if (numBase > 0 && dolarRate > 0) setBasePrice(String(Math.round(numBase / dolarRate * 100) / 100));
												}
											},
											className: `flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${sourceCurrency === "USD" ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-card text-muted-foreground border-border hover:bg-muted"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "💵 Dólares (USD)" }), sourceCurrency === "USD" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" })]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												if (sourceCurrency !== "ARS") {
													setSourceCurrency("ARS");
													if (numBase > 0 && dolarRate > 0) setBasePrice(String(Math.round(numBase * dolarRate)));
												}
											},
											className: `flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${sourceCurrency === "ARS" ? "bg-primary text-primary-foreground border-primary shadow-xs" : "bg-card text-muted-foreground border-border hover:bg-muted"}`,
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🇦🇷 Pesos (ARS)" }), sourceCurrency === "ARS" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" })]
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "label-sm",
										children: [
											"Precio Base del Combo (",
											sourceCurrency === "USD" ? "u$d sin recargo" : "$ sin recargo",
											") *"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold",
											children: sourceCurrency === "USD" ? "u$d" : "$"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											inputMode: "decimal",
											value: basePrice,
											onChange: (e) => setBasePrice(e.target.value),
											placeholder: sourceCurrency === "USD" ? "Ej: 100" : "Ej: 120000",
											className: "input-base pl-12 font-bold text-base"
										})]
									})] }),
									numBase > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-2",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-muted-foreground",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Precio base ingresado:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-foreground",
													children: sourceCurrency === "USD" ? `u$d ${numBase}` : money(numBase)
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center text-muted-foreground",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Recargo pasarela (+7%):" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-foreground",
													children: sourceCurrency === "USD" ? `+u$d ${surchargeAmt}` : `+${money(surchargeAmt)}`
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "border-t border-border/60 pt-1.5 flex justify-between items-center",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-semibold text-foreground",
													children: "Precio Lista / Mercado Pago (1 unidad):"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-bold text-foreground",
													children: [
														money(finalArs),
														" ",
														finalUsd > 0 ? `(u$d ${finalUsd})` : ""
													]
												})]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex justify-between items-center bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20 text-emerald-700 dark:text-emerald-300",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
													className: "font-bold flex items-center gap-1",
													children: [
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Percent, { className: "h-3.5 w-3.5" }),
														" Precio con ",
														discPct,
														"% OFF Transferencia:"
													]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "font-bold text-sm tabular-nums",
													children: money(tPrice)
												})]
											}),
											sourceCurrency === "USD" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "text-[10px] text-muted-foreground text-right pt-0.5",
												children: [
													"Cotización aplicada: $",
													dolarRate,
													" ARS/USD"
												]
											})
										]
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "label-sm",
								children: "Foto del Combo (Subí la foto creada con IA o arrastrá el archivo)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImageDropzone, {
								value: comboImage,
								onChange: (url) => setComboImage(url),
								bucket: "storage-images",
								folder: "combos",
								label: "Arrastrá la foto generada por IA o haz clic para subir"
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
										className: "text-xs font-bold text-foreground flex items-center gap-1.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tag, { className: "h-4 w-4 text-primary" }), "🎁 Descuento por Cantidad (opcional)"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-[11px] text-muted-foreground mt-0.5",
										children: "Definí a partir de cuántas unidades y a qué precio unitario queda este combo."
									})] }), comboTiers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										onClick: () => {
											setComboTiers([]);
											setHasTiers(false);
										},
										className: "text-[11px] text-destructive hover:underline font-semibold",
										children: "Quitar descuentos"
									})]
								}), comboTiers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-dashed border-border bg-card/60",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "text-xs text-muted-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Sin descuentos por cantidad cargados." }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-[11px] text-muted-foreground/70",
											children: [
												"Se venderá a precio regular de 1 unidad: ",
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: finalArs > 0 ? money(finalArs) : "precio lista" }),
												"."
											]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => {
											setHasTiers(true);
											const p1 = numBase > 0 ? Math.round(numBase * .94) : 31e3;
											const p2 = numBase > 0 ? Math.round(numBase * .86) : 28e3;
											setComboTiers([{
												units: 3,
												priceStr: String(p1)
											}, {
												units: 5,
												priceStr: String(p2)
											}]);
										},
										className: "btn-base bg-primary text-primary-foreground text-xs py-2 px-3.5 hover:opacity-90 flex items-center gap-1.5 shrink-0 font-bold",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), " + Cargar Descuento por Cantidad"]
									})]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "space-y-3",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "grid grid-cols-[85px_130px_1fr_auto] gap-2 px-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Cantidad mín." }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Precio unitario" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "A qué precio queda" }),
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
											]
										}),
										comboTiers.map((tier, idx) => {
											const numTierBase = Number(tier.priceStr) || 0;
											const tierFinalArs = numTierBase > 0 ? Math.round(numTierBase * 1.07) : 0;
											const discountPct = finalArs > 0 && tierFinalArs > 0 && tierFinalArs < finalArs ? Math.round((1 - tierFinalArs / finalArs) * 100) : 0;
											const diff = finalArs > 0 && tierFinalArs > 0 ? finalArs - tierFinalArs : 0;
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "grid grid-cols-[85px_130px_1fr_auto] gap-2 items-center bg-card p-2 rounded-xl border border-border",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "relative",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "absolute left-2 top-2 text-[11px] text-muted-foreground font-semibold",
															children: "u."
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
															type: "number",
															min: 2,
															value: tier.units,
															onChange: (e) => {
																const updated = [...comboTiers];
																const cur = updated[idx];
																if (!cur) return;
																const rawUnits = e.target.value;
																updated[idx] = {
																	units: rawUnits === "" ? 2 : Math.max(2, Number(rawUnits)),
																	priceStr: cur.priceStr
																};
																setComboTiers(updated);
															},
															className: "input-base pl-6 text-xs font-bold",
															placeholder: "3"
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "relative",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "absolute left-2.5 top-2 text-[11px] text-muted-foreground font-semibold",
															children: "$"
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
															type: "text",
															inputMode: "decimal",
															value: tier.priceStr,
															onChange: (e) => {
																const updated = [...comboTiers];
																const cur = updated[idx];
																if (!cur) return;
																const raw = e.target.value.replace(/[^\d]/g, "");
																updated[idx] = {
																	units: cur.units,
																	priceStr: raw
																};
																setComboTiers(updated);
															},
															className: "input-base pl-6 text-xs font-bold",
															placeholder: "Precio base s/recargo"
														})]
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-xs truncate",
														children: tierFinalArs > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex flex-col gap-0.5",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																className: "flex items-center gap-1.5 flex-wrap",
																children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																	className: "font-bold text-primary",
																	children: [money(tierFinalArs), "/u."]
																}), discountPct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																	className: "rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-[10px] px-1.5 py-0.5",
																	children: [
																		discountPct,
																		"% OFF (-",
																		money(diff),
																		")"
																	]
																})]
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "text-[10px] text-muted-foreground",
																children: "+7% recargo incluido"
															})]
														}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: "text-[11px] text-muted-foreground italic",
															children: "Ingresá el precio base"
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														type: "button",
														onClick: () => setComboTiers(comboTiers.filter((_, i) => i !== idx)),
														className: "rounded-lg p-1.5 text-destructive hover:bg-destructive/10 transition-colors",
														title: "Eliminar tramo",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
													})
												]
											}, idx);
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											type: "button",
											onClick: () => {
												const lastTier = comboTiers[comboTiers.length - 1];
												const newUnits = lastTier ? lastTier.units + 2 : 3;
												const lastBase = lastTier ? Number(lastTier.priceStr) : 0;
												const newPriceBase = lastBase > 0 ? Math.round(lastBase * .95) : numBase > 0 ? Math.round(numBase * .9) : 0;
												setComboTiers([...comboTiers, {
													units: newUnits,
													priceStr: newPriceBase > 0 ? String(newPriceBase) : ""
												}]);
											},
											className: "btn-base border border-dashed border-primary/50 text-primary text-xs py-2 px-3 hover:bg-primary/10 flex items-center gap-1.5 w-full justify-center font-bold",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), " + Agregar otro tramo de precio"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
												className: "font-bold text-primary flex items-center gap-1.5",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "🎁" }), " Así se verá en la tienda:"]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "mt-1.5 space-y-1 text-xs",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-muted-foreground",
													children: [
														"• 1 unidad: ",
														/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
															className: "text-foreground",
															children: money(finalArs)
														}),
														" (precio default)"
													]
												}), [...comboTiers].sort((a, b) => a.units - b.units).map((t, i) => {
													const tBase = Number(t.priceStr) || 0;
													const tFinal = tBase > 0 ? Math.round(tBase * 1.07) : 0;
													const pct = finalArs > 0 && tFinal > 0 && tFinal < finalArs ? Math.round((1 - tFinal / finalArs) * 100) : 0;
													return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "flex items-center gap-2",
														children: [
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																"• Llevando ",
																t.units,
																" u. o más:"
															] }),
															/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
																className: "text-primary font-bold",
																children: [tFinal > 0 ? money(tFinal) : "–", " cada una"]
															}),
															pct > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 py-0.2 text-[10px] font-bold",
																children: [pct, "% OFF"]
															})
														]
													}, i);
												})]
											})]
										})
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "label-sm",
								children: "Descripción o lo que incluye el Combo (opcional)"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								value: comboSubtitle,
								onChange: (e) => setComboSubtitle(e.target.value),
								placeholder: "Ej: Incluye 10 productos de bazar surtidos + envío sin cargo...",
								className: "input-base min-h-[90px] resize-y text-xs"
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-end gap-3 pt-4 border-t border-border",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							onClick: resetForm,
							className: "btn-base bg-muted text-foreground hover:bg-muted/70",
							children: "Cancelar"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => void handleSaveCombo(),
							disabled: saving || numBase <= 0,
							className: "btn-base bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), saving ? "Guardando..." : "Publicar Combo"]
						})]
					})
				]
			}),
			loadingBanners ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted-foreground text-center py-8",
				children: "Cargando ofertas..."
			}) : banners.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "py-10 text-center border border-dashed rounded-2xl border-border bg-card/40 space-y-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-8 w-8 text-muted-foreground/40 mx-auto" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-medium text-muted-foreground",
						children: "Todavía no tenés ofertas de combos cargadas."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							resetForm();
							setCreating(true);
						},
						className: "btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90",
						children: "Crear primera oferta"
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 gap-4",
				children: banners.map((b, idx) => {
					const bPrice = toNumber(b.precio);
					const bDiscPct = 7;
					const bTransfer = transferPrice(bPrice, bDiscPct);
					const isUsd = String(b.moneda_base ?? "").toUpperCase() === "USD";
					const hasQtyTiers = Array.isArray(b.quantity_tiers) && b.quantity_tiers.length > 0;
					return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs hover:border-primary/40 transition-all",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafeImage, {
							rawSrc: b.imagen_url,
							alt: b.titulo ?? "",
							className: "h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-contain p-1.5 bg-surface border border-border shrink-0",
							onError: onImageError(b.imagen_url)
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex-1 min-w-0 space-y-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-1.5 flex-wrap",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
											children: "Combo"
										}),
										hasQtyTiers && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold flex items-center gap-1",
											children: [
												"🎁 ",
												b.quantity_tiers?.length,
												" tramos desc."
											]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground",
											children: isUsd ? "Base USD" : "Base ARS"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "font-bold text-base text-foreground truncate",
									children: b.titulo
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-muted-foreground line-clamp-2 whitespace-pre-line",
									children: b.subtitulo
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "pt-1 space-y-0.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-baseline gap-1.5 flex-wrap",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-lg font-bold text-primary tabular-nums",
											children: money(bTransfer)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400",
											children: [bDiscPct, "% OFF Transf."]
										})]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-[11px] text-muted-foreground",
										children: [
											"o ",
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "font-semibold text-foreground/80",
												children: money(bPrice)
											}),
											" con Mercado Pago",
											b.precio_usd ? ` (u$d ${b.precio_usd})` : ""
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2 pt-2",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => handleEditClick(b),
											className: "btn-base bg-muted hover:bg-muted/80 text-foreground text-xs py-1 px-2.5 flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-3.5 w-3.5" }), " Editar"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: () => void handleDeleteCombo(String(b.id ?? idx), b.titulo ?? "Combo"),
											className: "btn-base bg-destructive/10 text-destructive hover:bg-destructive hover:text-white text-xs py-1 px-2.5 flex items-center gap-1",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" }), " Eliminar"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
											to: "/combo/$index",
											params: { index: String(idx) },
											className: "btn-base border border-border text-xs py-1 px-2.5 text-muted-foreground hover:text-foreground ml-auto",
											children: "Ver en tienda →"
										})
									]
								})
							]
						})]
					}, b.id ?? idx);
				})
			})
		]
	});
}
function OfertasDelDiaPanel({ products, userEmail, userToken, onRefresh, dolarRate = 1500, roundingIncrement = 10, markupPercentage = 0 }) {
	const [subTab, setSubTab] = (0, import_react.useState)("activas");
	const [search, setSearch] = (0, import_react.useState)("");
	const [clearingAll, setClearingAll] = (0, import_react.useState)(false);
	const activeOffers = (0, import_react.useMemo)(() => {
		return products.filter((p) => String(p.oferta ?? "").trim().toUpperCase() === "SI");
	}, [products]);
	const filteredActiveOffers = (0, import_react.useMemo)(() => {
		if (!search.trim()) return activeOffers;
		const q = search.toLowerCase();
		return activeOffers.filter((p) => String(p.nombre ?? "").toLowerCase().includes(q) || String(p.categoria ?? "").toLowerCase().includes(q));
	}, [activeOffers, search]);
	const [candidates, setCandidates] = (0, import_react.useState)([]);
	const [loadingCandidates, setLoadingCandidates] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (subTab !== "agregar") return;
		let cancelled = false;
		setLoadingCandidates(true);
		const timer = setTimeout(async () => {
			try {
				const res = await getAdminProducts({ data: {
					email: userEmail,
					token: userToken,
					search: search.trim() || void 0,
					pageSize: 30
				} });
				if (!cancelled && res.products) setCandidates(res.products.filter((p) => String(p.oferta ?? "").trim().toUpperCase() !== "SI"));
			} catch {} finally {
				if (!cancelled) setLoadingCandidates(false);
			}
		}, 300);
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [
		subTab,
		search,
		userEmail,
		userToken
	]);
	const candidateProducts = subTab === "agregar" ? candidates : [];
	async function handleClearAllOffers() {
		if (activeOffers.length === 0) return;
		if (!confirm(`¿Seguro que querés quitar la etiqueta de Oferta del Día de los ${activeOffers.length} productos en oferta?`)) return;
		setClearingAll(true);
		try {
			let count = 0;
			for (const p of activeOffers) {
				const input = productToInput(p);
				input.oferta = "NO";
				await upsertAdminProduct({ data: {
					email: userEmail,
					token: userToken,
					product: input
				} });
				count++;
			}
			toast.success(`${count} ofertas desactivadas correctamente.`);
			await onRefresh();
		} catch {
			toast.error("Ocurrió un error al desactivar las ofertas.");
		} finally {
			setClearingAll(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-sm",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col md:flex-row items-start md:items-center justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rounded-full bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-wider",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3.5 w-3.5 fill-primary" }), " Panel de Ofertas del Día"]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/20",
									children: [
										activeOffers.length,
										" ",
										activeOffers.length === 1 ? "oferta activa" : "ofertas activas"
									]
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
								className: "text-xl font-bold text-foreground",
								children: "Gestioná los Productos en Promoción"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs sm:text-sm text-muted-foreground max-w-2xl",
								children: [
									"Los productos marcados en este panel se mostrarán inmediatamente en la sección",
									" ",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", {
										className: "text-primary",
										children: "\"Ofertas del Día\""
									}),
									" de la tienda con su precio de lista tachado y el distintivo de descuento."
								]
							})
						]
					}), activeOffers.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => void handleClearAllOffers(),
						disabled: clearingAll,
						className: "btn-base bg-destructive/10 text-destructive hover:bg-destructive hover:text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" }), clearingAll ? "Desactivando..." : "Desactivar todas las ofertas"]
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border flex-wrap",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setSubTab("activas");
							setSearch("");
						},
						className: `rounded-lg px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${subTab === "activas" ? "bg-card text-foreground shadow-xs border border-border" : "text-muted-foreground hover:text-foreground"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3.5 w-3.5 text-primary fill-primary/20" }),
							"Ofertas Activas",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-primary/10 text-primary text-[10px] px-1.5 py-0.2 font-bold",
								children: activeOffers.length
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setSubTab("agregar");
							setSearch("");
						},
						className: `rounded-lg px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${subTab === "agregar" ? "bg-card text-foreground shadow-xs border border-border" : "text-muted-foreground hover:text-foreground"}`,
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5 text-primary" }),
							"Poner Producto en Oferta",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "rounded-full bg-muted text-muted-foreground text-[10px] px-1.5 py-0.2 font-bold",
								children: candidateProducts.length
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative w-full sm:w-72",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "text",
						value: search,
						onChange: (e) => setSearch(e.target.value),
						placeholder: subTab === "activas" ? "Buscar entre ofertas..." : "Buscar producto del catálogo...",
						className: "input-base text-xs pl-9 py-2"
					})]
				})]
			}),
			subTab === "activas" ? filteredActiveOffers.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-3 py-14 text-center rounded-2xl border border-dashed border-border bg-card/50",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-10 w-10 text-muted-foreground/30" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted-foreground font-medium",
						children: search ? "No hay ofertas activas que coincidan con la búsqueda." : "No tenés ofertas del día activas."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => {
							setSubTab("agregar");
							setSearch("");
						},
						className: "btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90 mt-1 flex items-center gap-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Poner productos en oferta"]
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: filteredActiveOffers.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActiveOfferCard, {
					product: p,
					userEmail,
					userToken,
					onSaved: onRefresh
				}, String(p.id)))
			}) : candidateProducts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex flex-col items-center gap-3 py-14 text-center rounded-2xl border border-dashed border-border bg-card/50",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-10 w-10 text-emerald-500/50" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground font-medium",
					children: search ? "No se encontraron productos en el catálogo." : "¡Todos los productos ya están cargados como oferta!"
				})]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-3",
				children: candidateProducts.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CandidateOfferCard, {
					product: p,
					userEmail,
					userToken,
					onSaved: onRefresh
				}, String(p.id)))
			})
		]
	});
}
function YupooImporter({ userEmail, userToken, existingCategories = [], onImported }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [url, setUrl] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [maxImages, setMaxImages] = (0, import_react.useState)("8");
	const [searching, setSearching] = (0, import_react.useState)(false);
	const [importing, setImporting] = (0, import_react.useState)(false);
	const [albums, setAlbums] = (0, import_react.useState)([]);
	const [searchError, setSearchError] = (0, import_react.useState)("");
	const [importDone, setImportDone] = (0, import_react.useState)(false);
	const allSelected = albums.length > 0 && albums.every((a) => a.selected);
	const someSelected = albums.some((a) => a.selected);
	const selectedCount = albums.filter((a) => a.selected).length;
	const importedCount = albums.filter((a) => a.status === "ok").length;
	async function handleSearch() {
		if (!url.trim()) return;
		setSearching(true);
		setSearchError("");
		setAlbums([]);
		setImportDone(false);
		try {
			const res = await parseYupooPage({ data: {
				email: userEmail,
				token: userToken,
				url: url.trim(),
				password: password.trim()
			} });
			if (res.error) setSearchError(res.error);
			else setAlbums((res.albums ?? []).map((a) => ({
				...a,
				thumbnail: sanitizeImageUrl(a.thumbnail),
				selected: true,
				status: "idle",
				statusMsg: ""
			})));
		} catch (e) {
			setSearchError(e instanceof Error ? e.message : "Error al buscar.");
		} finally {
			setSearching(false);
		}
	}
	async function handleImport() {
		const toImport = albums.filter((a) => a.selected && a.status !== "ok");
		if (toImport.length === 0) return;
		setImporting(true);
		setImportDone(false);
		for (const album of toImport) {
			setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
				...a,
				status: "pending",
				statusMsg: "Importando…"
			} : a));
			try {
				const res = await importYupooAlbum({ data: {
					email: userEmail,
					token: userToken,
					albumUrl: album.albumUrl,
					title: album.title,
					coverUrl: album.thumbnail,
					password: password.trim(),
					maxImages: Number(maxImages) || 8,
					category: category.trim()
				} });
				if (res.error) {
					const isDup = res.error.startsWith("Duplicado:");
					setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
						...a,
						status: isDup ? "duplicate" : "error",
						statusMsg: res.error ?? "Error"
					} : a));
				} else setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
					...a,
					status: "ok",
					statusMsg: `✅ ${res.imageCount} foto${res.imageCount !== 1 ? "s" : ""}`
				} : a));
			} catch (e) {
				setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
					...a,
					status: "error",
					statusMsg: e instanceof Error ? e.message : "Error"
				} : a));
			}
		}
		setImporting(false);
		setImportDone(true);
		onImported();
	}
	async function handleRetryFailed() {
		const failedAlbums = albums.filter((a) => a.status === "error");
		if (failedAlbums.length === 0) return;
		setAlbums((prev) => prev.map((a) => a.status === "error" ? {
			...a,
			status: "idle",
			statusMsg: "",
			selected: true
		} : a));
		setImportDone(false);
		setImporting(true);
		for (const album of failedAlbums) {
			setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
				...a,
				status: "pending",
				statusMsg: "Reintentando…"
			} : a));
			try {
				const res = await importYupooAlbum({ data: {
					email: userEmail,
					token: userToken,
					albumUrl: album.albumUrl,
					title: album.title,
					coverUrl: album.thumbnail,
					password: password.trim(),
					maxImages: Number(maxImages) || 8,
					category: category.trim()
				} });
				if (res.error) {
					const isDup = res.error.startsWith("Duplicado:");
					setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
						...a,
						status: isDup ? "duplicate" : "error",
						statusMsg: res.error ?? "Error"
					} : a));
				} else setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
					...a,
					status: "ok",
					statusMsg: `✅ ${res.imageCount} foto${res.imageCount !== 1 ? "s" : ""}`
				} : a));
			} catch (e) {
				setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
					...a,
					status: "error",
					statusMsg: e instanceof Error ? e.message : "Error"
				} : a));
			}
		}
		setImporting(false);
		setImportDone(true);
		onImported();
	}
	const statusIcon = (s) => {
		if (s === "pending") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "inline-block h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" });
		if (s === "ok") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-emerald-500",
			children: "✅"
		});
		if (s === "duplicate") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			title: "Duplicado",
			children: "🟡"
		});
		if (s === "error") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-red-500",
			children: "❌"
		});
		return null;
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mb-6 rounded-2xl border border-border bg-card overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			type: "button",
			onClick: () => setOpen((v) => !v),
			className: "flex w-full items-center justify-between px-4 py-3 sm:px-5 sm:py-4 text-left",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-lg",
					children: "🇨🇳"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-bold text-foreground",
					children: "Importar de Yupoo"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: "Cargá productos en bulk asignando categoría propia y modo WhatsApp automático"
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "text-muted-foreground",
				children: open ? "▲" : "▼"
			})]
		}), open && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "border-t border-border px-4 py-4 sm:px-5 sm:py-5 space-y-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.2fr_auto_auto]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "label-sm",
							children: "URL de Yupoo *"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "yupoo-url",
							className: "input-base",
							placeholder: "https://16620059194.x.yupoo.com/search/album?q=boca",
							value: url,
							onChange: (e) => setUrl(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter") handleSearch();
							}
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
								className: "label-sm",
								children: "Categoría para estos productos *"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								id: "yupoo-category",
								className: "input-base",
								list: "yupoo-categories-list",
								placeholder: "Ej: Camisetas, Zapatillas China...",
								value: category,
								onChange: (e) => setCategory(e.target.value)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
								id: "yupoo-categories-list",
								children: Array.from(/* @__PURE__ */ new Set([
									"China",
									"Camisetas",
									"Zapatillas",
									"Ropa",
									"Accesorios",
									...existingCategories
								])).map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: c }, c))
							})
						] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "label-sm",
							children: "Contraseña"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "yupoo-password",
							className: "input-base",
							placeholder: "Ej: 111333",
							value: password,
							onChange: (e) => setPassword(e.target.value)
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
							className: "label-sm",
							children: "Máx fotos"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							id: "yupoo-max-images",
							type: "number",
							min: 1,
							max: 50,
							className: "input-base w-24",
							placeholder: "8",
							value: maxImages,
							onChange: (e) => setMaxImages(e.target.value)
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 rounded-xl bg-muted/40 border border-border/70 px-3.5 py-2.5 text-xs text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "text-base",
						children: "💡"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
						"Categoría destino: ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", {
							className: "text-foreground font-semibold",
							children: [
								"\"",
								category.trim() || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-amber-500",
									children: "sin categoría"
								}),
								"\""
							]
						}),
						". Cada producto se creará con el botón ",
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\"Consultar por WhatsApp\"" }),
						" y precio a consultar."
					] })]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					id: "yupoo-search-btn",
					type: "button",
					disabled: !url.trim() || !category.trim() || searching,
					onClick: () => void handleSearch(),
					className: "btn-base bg-primary text-primary-foreground flex items-center gap-2 disabled:opacity-50",
					children: searching ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" }), "Buscando…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: "🔍 Buscar productos" })
				}),
				searchError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-400",
					children: searchError
				}),
				albums.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs font-semibold text-muted-foreground",
								children: [
									albums.length,
									" producto",
									albums.length !== 1 ? "s" : "",
									" encontrado",
									albums.length !== 1 ? "s" : "",
									selectedCount !== albums.length && ` · ${selectedCount} seleccionado${selectedCount !== 1 ? "s" : ""}`
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-foreground",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: allSelected,
									onChange: (e) => setAlbums((prev) => prev.map((a) => ({
										...a,
										selected: e.target.checked
									}))),
									className: "h-3.5 w-3.5 rounded accent-primary"
								}), "Seleccionar todos"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "max-h-72 overflow-y-auto rounded-xl border border-border divide-y divide-border",
							children: albums.map((album) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: `flex items-center gap-3 px-3 py-2 transition-colors ${album.status === "ok" ? "bg-emerald-50/50 dark:bg-emerald-950/20" : album.status === "error" ? "bg-red-50/50 dark:bg-red-950/20" : ""}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: album.selected,
										disabled: album.status === "ok" || importing,
										onChange: (e) => setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
											...a,
											selected: e.target.checked
										} : a)),
										className: "h-4 w-4 rounded accent-primary shrink-0"
									}),
									album.thumbnail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafeImage, {
										rawSrc: album.thumbnail,
										alt: "",
										referrerPolicy: "no-referrer",
										className: "h-12 w-12 rounded-lg object-cover shrink-0 border border-border bg-muted",
										onError: (e) => {
											e.currentTarget.style.display = "none";
										}
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-12 w-12 rounded-lg bg-muted shrink-0" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex-1 min-w-0 space-y-0.5",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "text",
											value: album.title,
											disabled: album.status === "ok" || importing,
											onChange: (e) => setAlbums((prev) => prev.map((a) => a.albumUrl === album.albumUrl ? {
												...a,
												title: e.target.value
											} : a)),
											className: "w-full bg-transparent text-xs font-semibold text-foreground focus:bg-background focus:outline-hidden focus:ring-1 focus:ring-primary rounded px-1.5 py-0.5 border border-transparent hover:border-border transition-colors truncate",
											title: "Click para editar el nombre traducido antes de importar"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-[10px] text-muted-foreground truncate px-1.5",
											children: album.albumUrl
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex items-center gap-1.5 shrink-0",
										children: [statusIcon(album.status), album.statusMsg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: `text-[10px] font-semibold ${album.status === "error" ? "text-red-500" : album.status === "ok" ? "text-emerald-600" : "text-muted-foreground"}`,
											children: album.statusMsg
										})]
									})
								]
							}, album.albumUrl))
						}),
						importing && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-xs text-muted-foreground",
								children: [
									"Importando ",
									importedCount,
									" de ",
									selectedCount,
									"…"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-1.5 w-full rounded-full bg-muted overflow-hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "h-full bg-primary rounded-full transition-all duration-300",
									style: { width: `${selectedCount > 0 ? importedCount / selectedCount * 100 : 0}%` }
								})
							})]
						}),
						importDone && (() => {
							const failedCount = albums.filter((a) => a.status === "error").length;
							const dupCount = albums.filter((a) => a.status === "duplicate").length;
							return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [
									failedCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2 flex items-center justify-between gap-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
											className: "text-xs text-red-700 dark:text-red-400 font-semibold",
											children: [
												"❌ ",
												failedCount,
												" producto",
												failedCount !== 1 ? "s" : "",
												" no se pudo importar."
											]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											disabled: importing,
											onClick: () => void handleRetryFailed(),
											className: "shrink-0 rounded-lg bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5",
											children: importing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" }), "Reintentando…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: ["🔁 Reintentar ", failedCount === 1 ? "ese" : `los ${failedCount}`] })
										})]
									}),
									dupCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400 font-semibold",
										children: [
											"🟡 ",
											dupCount,
											" producto",
											dupCount !== 1 ? "s omitidos" : " omitido",
											" — ya existían con el mismo nombre."
										]
									}),
									failedCount === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold",
										children: [
											"✅ Importación completa: ",
											importedCount,
											" producto",
											importedCount !== 1 ? "s" : "",
											" importado",
											importedCount !== 1 ? "s" : "",
											" con éxito."
										]
									})
								]
							});
						})(),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							id: "yupoo-import-btn",
							type: "button",
							disabled: !someSelected || importing,
							onClick: () => void handleImport(),
							className: "btn-base bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 disabled:opacity-50",
							children: importing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" }), "Importando…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
								"📥 Importar ",
								selectedCount,
								" producto",
								selectedCount !== 1 ? "s" : ""
							] })
						})
					]
				})
			]
		})]
	});
}
function AdminProductosPage() {
	const { data: storeData } = useSuspenseQuery(storeQueryOptions);
	const { config, banners: initialBanners } = storeData;
	const { user, session, loading: authLoading } = useAuth();
	const navigate = useNavigate();
	const [isAuthorized, setIsAuthorized] = (0, import_react.useState)(null);
	const [products, setProducts] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [error, setError] = (0, import_react.useState)("");
	const [modal, setModal] = (0, import_react.useState)(null);
	const [priceModalProduct, setPriceModalProduct] = (0, import_react.useState)(null);
	const [deletingId, setDeletingId] = (0, import_react.useState)(null);
	const [search, setSearch] = (0, import_react.useState)("");
	const [activeTab, setActiveTab] = (0, import_react.useState)("todos");
	const [dolarRate, setDolarRate] = (0, import_react.useState)(1500);
	const [roundingIncrement, setRoundingIncrement] = (0, import_react.useState)(10);
	const [markupPercentage, setMarkupPercentage] = (0, import_react.useState)(0);
	const [totalProductsCount, setTotalProductsCount] = (0, import_react.useState)(0);
	const [adminTotalPages, setAdminTotalPages] = (0, import_react.useState)(1);
	const [activeOffersCount, setActiveOffersCount] = (0, import_react.useState)(0);
	const [categoriesList, setCategoriesList] = (0, import_react.useState)([]);
	const [offersProducts, setOffersProducts] = (0, import_react.useState)([]);
	const isFirstMount = (0, import_react.useRef)(true);
	const existingCategories = (0, import_react.useMemo)(() => {
		if (categoriesList.length > 0) return categoriesList;
		return Array.from(new Set(products.map((p) => String(p.categoria ?? "").trim()).filter(Boolean))).sort();
	}, [categoriesList, products]);
	const userEmail = user?.email ?? "";
	const userToken = session?.access_token ?? "";
	const userId = user?.id;
	const ADMIN_PAGE_SIZE = 20;
	const [adminPage, setAdminPage] = (0, import_react.useState)(1);
	async function loadProducts(opts) {
		const isInitial = opts?.isInitial ?? false;
		const targetPage = opts?.page ?? adminPage;
		const targetSearch = opts?.search !== void 0 ? opts.search : search;
		if (isInitial || products.length === 0) setLoading(true);
		setError("");
		try {
			const email = user?.email ?? "";
			const token = session?.access_token ?? "";
			const res = await getAdminProducts({ data: {
				email,
				token,
				page: targetPage,
				pageSize: ADMIN_PAGE_SIZE,
				search: targetSearch.trim() || void 0
			} });
			if (res.error) {
				if (products.length === 0) setError(res.error);
				else toast.error(res.error);
				if (res.error.toLowerCase().includes("acceso denegado")) {
					setIsAuthorized(false);
					navigate({
						to: "/",
						replace: true
					});
				}
			} else {
				setIsAuthorized(true);
				setProducts(res.products);
				if (typeof res.totalCount === "number") setTotalProductsCount(res.totalCount);
				if (typeof res.totalPages === "number") setAdminTotalPages(res.totalPages);
				if (typeof res.activeOffersCount === "number") setActiveOffersCount(res.activeOffersCount);
				if (Array.isArray(res.existingCategories)) setCategoriesList(res.existingCategories);
				if (res.dolarRate) setDolarRate(res.dolarRate);
				if (res.roundingIncrement) setRoundingIncrement(res.roundingIncrement);
				if (res.markupPercentage !== void 0) setMarkupPercentage(res.markupPercentage);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Error al cargar.";
			if (products.length === 0) setError(msg);
			else toast.error(msg);
		} finally {
			setLoading(false);
		}
	}
	async function loadOffers() {
		try {
			const email = user?.email ?? "";
			const token = session?.access_token ?? "";
			const res = await getAdminProducts({ data: {
				email,
				token,
				offerOnly: true,
				fetchAll: true
			} });
			if (!res.error) {
				setOffersProducts(res.products);
				if (typeof res.activeOffersCount === "number") setActiveOffersCount(res.activeOffersCount);
			}
		} catch {}
	}
	(0, import_react.useEffect)(() => {
		if (!authLoading) {
			if (!userId) navigate({
				to: "/",
				replace: true
			});
			else loadProducts({
				isInitial: true,
				page: 1
			});
		}
	}, [authLoading, userId]);
	(0, import_react.useEffect)(() => {
		if (activeTab === "ofertas" && userId && !authLoading) loadOffers();
	}, [
		activeTab,
		userId,
		authLoading
	]);
	(0, import_react.useEffect)(() => {
		if (isFirstMount.current) {
			isFirstMount.current = false;
			return;
		}
		const timer = setTimeout(() => {
			setAdminPage(1);
			loadProducts({
				page: 1,
				search
			});
		}, 350);
		return () => clearTimeout(timer);
	}, [search]);
	const handlePageChange = (newPage) => {
		const p = Math.max(1, Math.min(adminTotalPages, newPage));
		setAdminPage(p);
		loadProducts({
			page: p,
			search
		});
	};
	async function handleDelete(id) {
		if (!confirm("¿Seguro que querés eliminar este producto? Se borrarán también sus variantes.")) return;
		setDeletingId(id);
		try {
			const res = await deleteAdminProduct({ data: {
				email: userEmail,
				token: userToken,
				productId: id
			} });
			if (res.error) alert(res.error);
			else await loadProducts({
				page: adminPage,
				search
			});
		} finally {
			setDeletingId(null);
		}
	}
	const [selectedIds, setSelectedIds] = (0, import_react.useState)([]);
	const [expandedVariants, setExpandedVariants] = (0, import_react.useState)({});
	const [bulkUpdating, setBulkUpdating] = (0, import_react.useState)(false);
	const paginatedFiltered = products;
	const toggleSelectAll = () => {
		const allFilteredIds = paginatedFiltered.map((p) => String(p.id ?? ""));
		if (allFilteredIds.every((id) => selectedIds.includes(id))) setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
		else setSelectedIds((prev) => [.../* @__PURE__ */ new Set([...prev, ...allFilteredIds])]);
	};
	const toggleSelectOne = (id) => {
		setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
	};
	const toggleExpandVariants = (id) => {
		setExpandedVariants((prev) => ({
			...prev,
			[id]: !prev[id]
		}));
	};
	async function handleBulkStock(stock) {
		if (selectedIds.length === 0) return;
		setBulkUpdating(true);
		try {
			const res = await bulkUpdateAdminStock({ data: {
				email: userEmail,
				token: userToken,
				productIds: selectedIds,
				stock
			} });
			if (res.error) toast.error(res.error);
			else {
				toast.success(`Stock actualizado a "${stock === "SI" ? "Con stock" : "Sin stock"}" en ${selectedIds.length} productos.`);
				setSelectedIds([]);
				await loadProducts();
			}
		} catch {
			toast.error("Error al actualizar el stock masivo.");
		} finally {
			setBulkUpdating(false);
		}
	}
	const [confirmBulkDelete, setConfirmBulkDelete] = (0, import_react.useState)(false);
	const [bulkDeleting, setBulkDeleting] = (0, import_react.useState)(false);
	async function handleBulkDelete() {
		if (selectedIds.length === 0) return;
		setBulkDeleting(true);
		try {
			const res = await bulkDeleteAdminProducts({ data: {
				email: userEmail,
				token: userToken,
				productIds: selectedIds
			} });
			if (res.error) toast.error(res.error);
			else {
				const count = res.count ?? selectedIds.length;
				toast.success(`${count} producto${count === 1 ? "" : "s"} eliminado${count === 1 ? "" : "s"} permanentemente de la base de datos.`);
				setProducts((prev) => prev.filter((p) => !selectedIds.includes(String(p.id))));
				setSelectedIds([]);
				setConfirmBulkDelete(false);
				await loadProducts();
			}
		} catch {
			toast.error("Error al eliminar los productos seleccionados de la base de datos.");
		} finally {
			setBulkDeleting(false);
		}
	}
	async function handleToggleVariantStock(variantId, currentStock) {
		const nextStock = String(currentStock ?? "SI").toUpperCase() === "NO" ? "SI" : "NO";
		try {
			const res = await updateVariantStock({ data: {
				email: userEmail,
				token: userToken,
				variantId,
				stock: nextStock
			} });
			if (res.error) toast.error(res.error);
			else {
				toast.success(`Variante actualizada a "${nextStock === "SI" ? "Con stock" : "Sin stock"}".`);
				await loadProducts();
			}
		} catch {
			toast.error("Error al actualizar variante.");
		}
	}
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
						title: "Productos y Ofertas",
						subtitle: "Gestión de catálogo, precios y promociones de la tienda.",
						currentRoute: "productos",
						actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => setModal(emptyProduct()),
							className: "btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Nuevo producto" })]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(YupooImporter, {
							userEmail,
							userToken,
							existingCategories,
							onImported: () => void loadProducts()
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-4 flex border-b border-border overflow-x-auto",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveTab("todos"),
								className: `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:py-3 sm:text-sm shrink-0 ${activeTab === "todos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackagePlus, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Catálogo General" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-full bg-muted px-2 py-0.5 text-[10px] sm:text-xs font-semibold",
										children: totalProductsCount
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveTab("combos"),
								className: `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:py-3 sm:text-sm shrink-0 ${activeTab === "combos" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Combos" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] sm:text-xs font-bold",
										children: initialBanners.length
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => setActiveTab("ofertas"),
								className: `flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:py-3 sm:text-sm shrink-0 ${activeTab === "ofertas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary fill-primary/20" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ofertas del Día" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: `rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold ${activeOffersCount > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`,
										children: activeOffersCount
									})
								]
							})
						]
					}),
					loading && products.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-8 text-center text-sm text-muted-foreground",
						children: "Cargando productos..."
					}),
					error && products.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive",
						children: error
					}),
					activeTab === "combos" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ComboPanelBoundary, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ComboBuilderPanel, {
							initialBanners,
							userEmail,
							userToken,
							onRefresh: loadProducts,
							dolarRate,
							roundingIncrement,
							markupPercentage
						}) })
					}),
					(!loading || products.length > 0) && activeTab !== "combos" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-6",
						children: activeTab === "ofertas" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OfertasDelDiaPanel, {
							products: offersProducts,
							userEmail,
							userToken,
							onRefresh: loadOffers,
							dolarRate,
							roundingIncrement,
							markupPercentage
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-6",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between gap-3 flex-wrap",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									className: "input-base w-full max-w-sm",
									placeholder: "Buscar por nombre o categoría...",
									value: search,
									onChange: (e) => setSearch(e.target.value)
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center gap-2",
									children: [selectedIds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										onClick: () => setConfirmBulkDelete(true),
										disabled: bulkDeleting,
										className: "btn-base bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs py-1.5 px-3 flex items-center gap-1.5 font-semibold rounded-xl shadow-xs transition-colors shrink-0",
										title: "Eliminar productos seleccionados de la base de datos",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
											"Eliminar ",
											selectedIds.length,
											" de la DB"
										] })]
									}), totalProductsCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-muted-foreground shrink-0",
										children: [
											totalProductsCount,
											" producto",
											totalProductsCount !== 1 ? "s" : "",
											adminTotalPages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
												className: "ml-1 text-muted-foreground/70",
												children: [
													"— pág. ",
													adminPage,
													"/",
													adminTotalPages
												]
											})
										]
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "overflow-x-auto rounded-2xl border border-border bg-card",
								children: products.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex flex-col items-center gap-3 py-16 text-center",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PackagePlus, { className: "h-10 w-10 text-muted-foreground/40" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "text-sm text-muted-foreground",
											children: search ? "Ningún producto coincide con la búsqueda." : "Todavía no hay productos cargados."
										}),
										!search && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setModal(emptyProduct()),
											className: "btn-base bg-primary text-primary-foreground hover:opacity-90 mt-2",
											children: "Crear primer producto"
										})
									]
								}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
									className: "w-full min-w-[480px] text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
										className: "border-b border-border bg-muted/50",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "px-3 py-3 text-center w-10",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
													type: "checkbox",
													checked: paginatedFiltered.length > 0 && paginatedFiltered.every((p) => selectedIds.includes(String(p.id))),
													onChange: toggleSelectAll,
													className: "h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer",
													title: "Seleccionar todos en esta página"
												})
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "px-3 py-3 text-left font-semibold text-muted-foreground sm:px-4 w-24 sm:w-28",
												children: "Imagen"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "px-3 py-3 text-left font-semibold text-muted-foreground sm:px-4",
												children: "Nombre"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell",
												children: "Categoría"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "hidden px-3 py-3 text-right font-semibold text-muted-foreground sm:table-cell",
												children: "Precio Base"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "hidden px-4 py-3 text-right font-semibold text-muted-foreground sm:table-cell",
												children: "Precio"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "px-3 py-3 text-center font-semibold text-muted-foreground sm:px-4",
												children: "Estado"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
												className: "px-3 py-3 text-right font-semibold text-muted-foreground sm:px-4",
												children: "Acciones"
											})
										] })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", {
										className: "divide-y divide-border",
										children: paginatedFiltered.map((p) => {
											const pid = String(p.id ?? "");
											const isOffer = String(p.oferta ?? "").trim().toUpperCase() === "SI";
											const isCamisetaProd = isCamiseta(p.categoria, p.nombre);
											const isML = isCamisetaProd && isLongSleeve(p.nombre);
											const effPrice = priceOf(p);
											const origPrice = originalPriceOf(p);
											const isDiscounted = isOffer && origPrice > effPrice && effPrice > 0;
											const isSelected = selectedIds.includes(pid);
											const isExpanded = Boolean(expandedVariants[pid]);
											const variantsList = p.variants ?? [];
											return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
												className: `hover:bg-muted/20 transition-colors ${isSelected ? "bg-primary/5" : ""}`,
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "px-3 py-3 text-center",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
															type: "checkbox",
															checked: isSelected,
															onChange: () => toggleSelectOne(pid),
															className: "h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "px-3 py-3 sm:px-4 cursor-pointer align-middle",
														onClick: () => setModal(productToInput(p)),
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "relative h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 rounded-xl overflow-hidden border border-border/80 bg-muted/40 shadow-xs group/img shrink-0",
															children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafeImage, {
																rawSrc: p.imagen_url,
																alt: p.nombre,
																thumb: true,
																className: "h-full w-full object-cover transition-transform duration-300 group-hover/img:scale-105",
																onError: onImageError(p.imagen_url)
															})
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "px-3 py-3 sm:px-4 font-medium max-w-[180px] sm:max-w-none",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex flex-col gap-1",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	className: "flex items-center gap-1.5 flex-wrap cursor-pointer hover:text-primary transition-colors",
																	onClick: () => setModal(productToInput(p)),
																	children: [
																		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: p.nombre }),
																		isOffer && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																			className: "rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 border border-primary/20 shrink-0",
																			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3 w-3 fill-primary" }), " Oferta"]
																		}),
																		isML && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-bold border border-amber-500/30 shrink-0",
																			children: "🧤 Manga Larga"
																		})
																	]
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																	className: "text-xs font-bold text-primary sm:hidden",
																	children: isDiscounted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																		className: "flex items-center gap-1",
																		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: money(effPrice) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																			className: "line-through text-[10px] text-muted-foreground font-normal",
																			children: money(origPrice)
																		})]
																	}) : isCamisetaProd && effPrice <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																		className: "flex items-center gap-1",
																		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: dolarRate > 0 ? money(Math.round((isML ? 22.5 : 18.5) * 1.07 * dolarRate)) : `u$d ${isML ? "22.50" : "18.50"}` }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																			className: "text-[10px] text-muted-foreground font-normal",
																			children: [
																				"(",
																				isML ? "Manga Larga" : "Mayorista",
																				")"
																			]
																		})]
																	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: money(origPrice || effPrice) })
																}),
																variantsList.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
																	className: "mt-0.5",
																	children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
																		type: "button",
																		onClick: () => toggleExpandVariants(pid),
																		className: "inline-flex items-center gap-1 rounded-md bg-muted/80 hover:bg-primary/20 hover:text-primary px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors",
																		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
																			"🎨 ",
																			variantsList.length,
																			" colores"
																		] }), isExpanded ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-3 w-3" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-3 w-3" })]
																	})
																})
															]
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "hidden px-4 py-3 text-muted-foreground sm:table-cell",
														children: p.categoria
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "hidden px-3 py-3 text-right tabular-nums text-muted-foreground sm:table-cell",
														children: (() => {
															const pR = p;
															const bVal = pR["precio_base"] !== null && pR["precio_base"] !== void 0 ? Number(pR["precio_base"]) : null;
															const bCurr = String(pR["moneda_base"] ?? "USD").toUpperCase();
															return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																type: "button",
																onClick: () => setPriceModalProduct(p),
																className: "group/pb inline-flex flex-col items-end hover:opacity-80 transition-opacity text-right",
																title: "Hacé clic para editar precio base y márgenes",
																children: bVal && bVal > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "font-semibold text-foreground text-xs underline decoration-dotted decoration-primary/50 group-hover/pb:text-primary",
																	children: bCurr === "ARS" ? money(bVal) : `u$d ${bVal.toFixed(2)}`
																}) : isCamisetaProd ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																	className: "font-semibold text-foreground text-xs underline decoration-dotted decoration-primary/50 group-hover/pb:text-primary",
																	children: ["u$d ", isML ? "22.50" : "18.50"]
																}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																	className: "text-[11px] text-muted-foreground/80 italic group-hover/pb:text-primary",
																	children: "Sin base"
																})
															});
														})()
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell",
														children: isDiscounted ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex flex-col items-end",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "font-bold text-primary",
																children: money(effPrice)
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "line-through text-[11px] text-muted-foreground",
																children: money(origPrice)
															})]
														}) : isCamisetaProd && effPrice <= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex flex-col items-end",
															children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
																className: "font-bold text-foreground text-xs",
																children: dolarRate > 0 ? money(Math.round((isML ? 22.5 : 18.5) * 1.07 * dolarRate)) : `u$d ${isML ? "22.50" : "18.50"}`
															}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
																className: "text-[10px] text-muted-foreground",
																children: ["Escala ", isML ? "Manga Larga" : "Mayorista"]
															})]
														}) : money(origPrice || effPrice)
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "px-3 py-3 sm:px-4 text-center",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
															className: `rounded-full px-2 py-0.5 text-xs font-semibold ${String(p.stock ?? "").toUpperCase() === "NO" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`,
															children: String(p.stock ?? "SI").toUpperCase() === "NO" ? "Sin stock" : "Con stock"
														})
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
														className: "px-3 py-3 sm:px-4",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
															className: "flex items-center justify-end gap-1 sm:gap-1.5",
															children: [
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => setPriceModalProduct(p),
																	className: "rounded-lg p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors",
																	title: "Editar precio",
																	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DollarSign, { className: "h-4 w-4" })
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => setModal(productToInput(p)),
																	className: "rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors",
																	title: "Editar datos del producto",
																	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
																}),
																/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																	onClick: () => void handleDelete(pid),
																	disabled: deletingId === pid,
																	className: "rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40",
																	title: "Eliminar",
																	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
																})
															]
														})
													})
												]
											}), isExpanded && variantsList.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", {
												className: "bg-muted/30",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
													colSpan: 8,
													className: "px-4 py-3 border-t border-dashed border-border/80",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
														className: "space-y-2",
														children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
															className: "text-[11px] font-bold uppercase tracking-wider text-muted-foreground",
															children: [
																"Variantes de color (",
																variantsList.length,
																"):"
															]
														}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
															className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2",
															children: variantsList.map((v) => {
																const isVarNoStock = String(v.stock ?? "SI").toUpperCase() === "NO";
																return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																	className: "flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2 px-3 text-xs shadow-xs",
																	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																		className: "flex items-center gap-2 min-w-0",
																		children: [v.imagen_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SafeImage, {
																			rawSrc: v.imagen_url,
																			alt: v.color,
																			thumb: true,
																			className: "h-10 w-10 sm:h-11 sm:w-11 rounded-lg object-cover border border-border shrink-0",
																			onError: onImageError(v.imagen_url)
																		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
																			className: "min-w-0",
																			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																				className: "font-bold text-foreground truncate",
																				children: v.color
																			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
																				className: "text-[10px] text-muted-foreground",
																				children: money(v.precio)
																			})]
																		})]
																	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
																		type: "button",
																		onClick: () => void handleToggleVariantStock(v.id, String(v.stock ?? "SI")),
																		className: `rounded-full px-2.5 py-1 text-[10px] font-bold transition-all shrink-0 ${isVarNoStock ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"}`,
																		children: isVarNoStock ? "Sin stock" : "Con stock"
																	})]
																}, v.id);
															})
														})]
													})
												})
											})] }, pid);
										})
									})]
								}), adminTotalPages > 1 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-center gap-1.5 flex-wrap border-t border-border px-4 py-3 bg-muted/20",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handlePageChange(adminPage - 1),
											disabled: adminPage === 1,
											className: "rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
											children: "← Anterior"
										}),
										Array.from({ length: adminTotalPages }, (_, i) => i + 1).filter((n) => n === 1 || n === adminTotalPages || Math.abs(n - adminPage) <= 2).reduce((acc, n, idx, arr) => {
											if (idx > 0 && arr[idx - 1] < n - 1) acc.push("...");
											acc.push(n);
											return acc;
										}, []).map((item, idx) => item === "..." ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "px-1 text-muted-foreground text-xs",
											children: "…"
										}, `ellipsis-${idx}`) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handlePageChange(item),
											className: `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${adminPage === item ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`,
											children: item
										}, item)),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => handlePageChange(adminPage + 1),
											disabled: adminPage === adminTotalPages,
											className: "rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors",
											children: "Siguiente →"
										})
									]
								})] })
							})]
						})
					})
				]
			}),
			selectedIds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-3.5 py-2.5 sm:px-5 sm:py-3 shadow-2xl max-w-[95vw] flex-wrap justify-center sm:justify-start",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "text-xs font-bold text-foreground shrink-0",
						children: [
							selectedIds.length,
							" ",
							selectedIds.length === 1 ? "seleccionado" : "seleccionados"
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-4 w-px bg-border shrink-0 hidden sm:block" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void handleBulkStock("SI"),
						disabled: bulkUpdating || bulkDeleting,
						className: "btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3 flex items-center gap-1 shrink-0 disabled:opacity-50 font-medium",
						children: "🟢 Con stock"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => void handleBulkStock("NO"),
						disabled: bulkUpdating || bulkDeleting,
						className: "btn-base bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3 flex items-center gap-1 shrink-0 disabled:opacity-50 font-medium",
						children: "🔴 Sin stock"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setConfirmBulkDelete(true),
						disabled: bulkUpdating || bulkDeleting,
						className: "btn-base bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 disabled:opacity-50 font-semibold shadow-xs transition-colors",
						title: "Eliminar de la DB los productos seleccionados",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
							"Eliminar de la DB (",
							selectedIds.length,
							")"
						] })]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => setSelectedIds([]),
						className: "rounded-lg p-1 text-muted-foreground hover:bg-muted shrink-0",
						title: "Deseleccionar todos",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})
				]
			}),
			confirmBulkDelete && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative w-full max-w-md rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "rounded-xl bg-destructive/10 p-2.5 text-destructive shrink-0",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-6 w-6" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
									className: "text-base font-bold text-foreground",
									children: [
										"¿Eliminar ",
										selectedIds.length,
										" ",
										selectedIds.length === 1 ? "producto" : "productos",
										" de la DB?"
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-destructive font-medium",
									children: "⚠️ Esta acción borrará permanentemente de la base de datos estos productos y todas sus variantes asociadas."
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "max-h-40 overflow-y-auto rounded-xl border border-border bg-muted/30 p-2.5 space-y-1 text-xs",
							children: [products.filter((p) => selectedIds.includes(String(p.id))).slice(0, 10).map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center gap-2 truncate",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-1.5 w-1.5 rounded-full bg-destructive shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "truncate font-medium text-foreground",
									children: p.nombre
								})]
							}, p.id)), selectedIds.length > 10 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "text-[11px] text-muted-foreground/70 italic pl-3.5",
								children: [
									"... y ",
									selectedIds.length - 10,
									" más"
								]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-end gap-2 pt-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => setConfirmBulkDelete(false),
								disabled: bulkDeleting,
								className: "btn-base bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 text-xs px-3.5 py-2 font-semibold",
								children: "Cancelar"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								onClick: () => void handleBulkDelete(),
								disabled: bulkDeleting,
								className: "btn-base bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs px-3.5 py-2 flex items-center gap-1.5 font-semibold disabled:opacity-50 shadow-xs",
								children: bulkDeleting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Eliminando..." })] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Sí, eliminar de la DB" })] })
							})]
						})
					]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteFooter, { config }),
			modal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProductModal, {
				initial: modal,
				onClose: () => setModal(null),
				onSaved: () => void loadProducts(),
				onOpenPriceModal: (formInput) => {
					setModal(null);
					const found = products.find((pr) => String(pr.id) === String(formInput.id));
					if (found) setPriceModalProduct(found);
					else setPriceModalProduct(formInput);
				},
				userEmail,
				userToken,
				dolarRate,
				roundingIncrement,
				markupPercentage
			}),
			priceModalProduct && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriceModal, {
				product: priceModalProduct,
				onClose: () => setPriceModalProduct(null),
				onSaved: () => {
					setPriceModalProduct(null);
					loadProducts();
				},
				userEmail,
				userToken,
				dolarRate,
				roundingIncrement,
				markupPercentage
			})
		]
	});
}
//#endregion
export { AdminProductosPage as component };
