import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Component, Fragment, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, X, Upload, ChevronDown, ChevronUp, PackagePlus,
  Flame, Sparkles, Percent, Save, Tag, Search, Check, RefreshCw, Zap, TrendingDown,
  DollarSign, Coins, ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { AdminHeader } from "@/components/AdminHeader";
import { storeQueryOptions } from "@/lib/store-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminProducts,
  upsertAdminProduct,
  updateProductPrice,
  deleteAdminProduct,
  uploadAdminProductImage,
  getAdminBanners,
  upsertAdminBanner,
  deleteAdminBanner,
  bulkUpdateAdminStock,
  updateVariantStock,
  calcArsFromUsd,
  type ProductInput,
  type VariantInput,
  type BannerInput,
} from "@/lib/products.functions";
import type { Product, Banner } from "@/lib/store";
import { money, toNumber, FALLBACK_IMAGE, imageUrl, isMate, waOnlyReasonOf, transferPrice, transferDiscountPct } from "@/lib/store";

export const Route = createFileRoute("/admin/productos")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Panel de Productos — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminProductosPage,
});

/* ───────────────────────────────────────────────────────── */
/*  Helpers                                                  */
/* ───────────────────────────────────────────────────────── */

const emptyProduct = (): ProductInput => ({
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
  variants: [],
});

function productToInput(p: Product): ProductInput {
  const tiers: { units: number; percent: number }[] = [];
  const pRec = p as Record<string, unknown>;
  const meta = pRec["metadata"];
  if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    for (const [k, v] of Object.entries(meta as Record<string, unknown>)) {
      const uMatch = k.match(/(\d+)/);
      const pMatch = String(v ?? "").match(/(\d+(?:\.\d+)?)/);
      if (uMatch && pMatch) {
        tiers.push({ units: Number(uMatch[1]), percent: Number(pMatch[1]) });
      }
    }
  }

  const rawTipo = String(pRec["tipo_talles"] ?? "NINGUNO").toUpperCase();
  const tipo_talles: "ZAPATILLAS" | "ROPA" | "NINGUNO" =
    rawTipo === "ZAPATILLAS" ? "ZAPATILLAS" : rawTipo === "ROPA" ? "ROPA" : "NINGUNO";

  const rawTalles = pRec["talles_disponibles"];
  const talles_disponibles: string[] = Array.isArray(rawTalles)
    ? (rawTalles as string[])
    : typeof rawTalles === "string"
      ? rawTalles.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  return {
    id: String(p.id ?? ""),
    nombre: String(p.nombre ?? ""),
    categoria: String(p.categoria ?? ""),
    precio: String(p.precio ?? ""),
    precio_usd: String(pRec["precio_usd"] ?? ""),
    precio_base: pRec["precio_base"] !== undefined && pRec["precio_base"] !== null ? String(pRec["precio_base"]) : "",
    moneda_base: String(pRec["moneda_base"] ?? "USD"),
    precio_oferta: String(p.precio_oferta ?? ""),
    precio_oferta_usd: String(pRec["precio_oferta_usd"] ?? ""),
    precio_oferta_base: pRec["precio_oferta_base"] !== undefined && pRec["precio_oferta_base"] !== null ? String(pRec["precio_oferta_base"]) : "",
    moneda_oferta_base: String(pRec["moneda_oferta_base"] ?? "USD"),
    descripcion: String(p.descripcion ?? ""),
    destacado: String(p.destacado ?? "NO"),
    oferta: String(p.oferta ?? "NO"),
    stock: String(p.stock ?? "SI"),
    descuento: String(p.descuento ?? "NO"),
    // Fuente única: whatsapp_only_reason. Retrocompat: si es_zapatilla=true y no hay reason, usar "zapatillas"
    whatsapp_only_reason: waOnlyReasonOf(pRec) ?? "",
    moq_group: typeof pRec["moq_group"] === "string" ? pRec["moq_group"] : "",
    color_predeterminado: p.color_predeterminado ?? "",
    imagen_url: p.imagen_url ?? "",
    tipo_talles,
    talles_disponibles,
    tiers: tiers.sort((a, b) => a.units - b.units),
    variants: (p.variants ?? []).map((v) => {
      const vRec = v as Record<string, unknown>;
      return {
        id: String(v.id ?? ""),
        color: String(v.color ?? ""),
        precio: String(v.precio ?? ""),
        precio_usd: String(vRec["precio_usd"] ?? ""),
        precio_base: vRec["precio_base"] !== undefined && vRec["precio_base"] !== null ? String(vRec["precio_base"]) : "",
        moneda_base: String(vRec["moneda_base"] ?? "USD"),
        stock: String(v.stock ?? "SI"),
        imagen_url: v.imagen_url ?? "",
        talles_disponibles: v.talles_disponibles ?? [],
      };
    }),
  };
}

/* ───────────────────────────────────────────────────────── */
/*  Componente de zona de drag & drop para imagen            */
/* ───────────────────────────────────────────────────────── */

function ImageDropzone({
  value,
  onChange,
  bucket,
  folder,
  label = "Arrastrá una imagen, un enlace web o haz clic para subir",
}: {
  value: string;
  onChange: (url: string) => void;
  bucket: string;
  folder: string;
  label?: string;
}) {
  const { user, session } = useAuth();
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setErrorMsg("El archivo seleccionado debe ser una imagen (JPG, PNG, WebP).");
      return;
    }
    setUploading(true);
    setErrorMsg("");
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `${folder}/${crypto.randomUUID()}.${ext}`;

      // Intentar primero subida por cliente
      const { error: clientErr } = await supabase.storage.from(bucket).upload(filename, file, { upsert: true });
      if (!clientErr) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
        onChange(data.publicUrl);
        setUploading(false);
        return;
      }

      // Si falla por políticas de Supabase RLS, usar la función admin del servidor (base64)
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const res = await uploadAdminProductImage({
          data: {
            email: user?.email ?? "",
            token: session?.access_token ?? "",
            filename,
            base64,
            bucket,
          },
        });
        if (res.publicUrl) {
          onChange(res.publicUrl);
        } else {
          setErrorMsg(res.error ?? "No se pudo guardar la imagen.");
        }
        setUploading(false);
      };
      reader.onerror = () => {
        setErrorMsg("Error al leer el archivo.");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Error al subir imagen:", err);
      setErrorMsg("No se pudo subir la imagen.");
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          setErrorMsg("");

          const file = e.dataTransfer.files[0];
          if (file) {
            void uploadFile(file);
            return;
          }

          // Si el usuario arrastró una imagen desde otra web/pestaña
          const textUrl =
            e.dataTransfer.getData("text/uri-list") ||
            e.dataTransfer.getData("text/plain") ||
            e.dataTransfer.getData("URL");

          if (textUrl && (textUrl.startsWith("http://") || textUrl.startsWith("https://") || textUrl.startsWith("data:image"))) {
            onChange(textUrl.trim());
          } else {
            setErrorMsg("No se detectó una imagen válida al arrastrar.");
          }
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/30"
        }`}
        style={{ minHeight: 120 }}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
          }}
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="text-xs font-semibold">Subiendo imagen...</span>
          </div>
        ) : value ? (
          <div className="relative group w-full flex flex-col items-center gap-2">
            <img
              src={value}
              alt="Vista previa"
              className="h-28 max-w-full rounded-lg object-contain border border-border shadow-xs"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
            <span className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors">
              Hacé clic o arrastrá para cambiar la imagen
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <Upload className="h-6 w-6 text-primary/70" />
            <span className="text-xs font-medium">{label}</span>
          </div>
        )}
      </div>
      {errorMsg && <p className="text-xs text-destructive font-semibold">{errorMsg}</p>}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Modal dedicado para Edición Exclusiva de Precios         */
/* ───────────────────────────────────────────────────────── */

function PriceModal({
  product,
  onClose,
  onSaved,
  userEmail,
  userToken,
  dolarRate = 1500,
  roundingIncrement = 10,
  markupPercentage = 0,
}: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
  userEmail: string;
  userToken: string;
  dolarRate?: number;
  roundingIncrement?: number;
  markupPercentage?: number;
}) {
  const pRec = product as Record<string, unknown>;
  const initialMoneda: "USD" | "ARS" =
    String(pRec["moneda_base"] ?? "").toUpperCase() === "ARS" ? "ARS" : "USD";

  const getInitialBase = () => {
    if (pRec["precio_base"] !== null && pRec["precio_base"] !== undefined && Number(pRec["precio_base"]) > 0) {
      return String(pRec["precio_base"]);
    }
    if (initialMoneda === "ARS") {
      const num = toNumber(product.precio);
      return num > 0 ? String(Math.round(num / 1.07)) : "";
    }
    const numUsd = Number(product.precio_usd) || (dolarRate > 0 ? toNumber(product.precio) / dolarRate : 0);
    return numUsd > 0 ? String(Math.round((numUsd / 1.07) * 100) / 100) : "";
  };

  const [sourceCurrency, setSourceCurrency] = useState<"USD" | "ARS">(initialMoneda);
  const [basePrice, setBasePrice] = useState<string>(getInitialBase());

  const isOfferInit = String(product.oferta ?? "").trim().toUpperCase() === "SI";
  const [hasOffer, setHasOffer] = useState<boolean>(isOfferInit);
  const [offerSourceCurrency, setOfferSourceCurrency] = useState<"USD" | "ARS">(
    String(pRec["moneda_oferta_base"] ?? "").toUpperCase() === "ARS" ? "ARS" : "USD"
  );

  const getInitialOfferBase = () => {
    if (pRec["precio_oferta_base"] !== null && pRec["precio_oferta_base"] !== undefined && Number(pRec["precio_oferta_base"]) > 0) {
      return String(pRec["precio_oferta_base"]);
    }
    if (offerSourceCurrency === "ARS") {
      const num = toNumber(product.precio_oferta);
      return num > 0 ? String(Math.round(num / 1.07)) : "";
    }
    const numUsd = Number(product.precio_oferta_usd) || (dolarRate > 0 ? toNumber(product.precio_oferta) / dolarRate : 0);
    return numUsd > 0 ? String(Math.round((numUsd / 1.07) * 100) / 100) : "";
  };

  const [offerBasePrice, setOfferBasePrice] = useState<string>(getInitialOfferBase());

  // Variantes
  const [variantsState, setVariantsState] = useState(
    (product.variants ?? []).map((v) => {
      const vRec = v as Record<string, unknown>;
      const vMoneda: "USD" | "ARS" =
        String(vRec["moneda_base"] ?? "").toUpperCase() === "ARS" ? "ARS" : "USD";
      const vBase =
        vRec["precio_base"] !== null && vRec["precio_base"] !== undefined && Number(vRec["precio_base"]) > 0
          ? String(vRec["precio_base"])
          : "";
      return {
        id: v.id,
        color: v.color,
        hasCustom: Boolean(vBase),
        sourceCurrency: vMoneda,
        basePrice: vBase,
      };
    })
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Cálculos en vivo para el precio principal
  const numBase = Number(basePrice.replace(/[^\d.-]/g, "")) || 0;
  const surchargeAmt = numBase > 0 ? (sourceCurrency === "USD" ? Math.round(numBase * 0.07 * 100) / 100 : Math.round(numBase * 0.07)) : 0;
  
  let finalUsd = 0;
  let finalArs = 0;

  if (numBase > 0) {
    if (sourceCurrency === "USD") {
      finalUsd = Math.round(numBase * 1.07 * 100) / 100;
      finalArs = calcArsFromUsd(finalUsd, dolarRate, markupPercentage, roundingIncrement, 1);
    } else {
      finalArs = Math.round(numBase * 1.07);
      finalUsd = dolarRate > 0 ? Math.round((finalArs / dolarRate) * 100) / 100 : 0;
    }
  }

  // Cálculos en vivo para el precio de oferta
  const numOfferBase = Number(offerBasePrice.replace(/[^\d.-]/g, "")) || 0;
  const offerSurchargeAmt = numOfferBase > 0 ? (offerSourceCurrency === "USD" ? Math.round(numOfferBase * 0.07 * 100) / 100 : Math.round(numOfferBase * 0.07)) : 0;
  let finalOfferUsd = 0;
  let finalOfferArs = 0;

  if (hasOffer && numOfferBase > 0) {
    if (offerSourceCurrency === "USD") {
      finalOfferUsd = Math.round(numOfferBase * 1.07 * 100) / 100;
      finalOfferArs = calcArsFromUsd(finalOfferUsd, dolarRate, markupPercentage, roundingIncrement, 1);
    } else {
      finalOfferArs = Math.round(numOfferBase * 1.07);
      finalOfferUsd = dolarRate > 0 ? Math.round((finalOfferArs / dolarRate) * 100) / 100 : 0;
    }
  }

  async function handleSavePrice() {
    // Productos WA-only no requieren precio (se consulta por WhatsApp)
    const isWaOnly = Boolean(pRec["whatsapp_only_reason"]);
    if (!isWaOnly && numBase <= 0) {
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
      const res = await updateProductPrice({
        data: {
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
            basePrice: v.hasCustom && Number(v.basePrice) > 0 ? Number(v.basePrice) : null,
          })),
        },
      });

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

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="relative my-4 sm:my-8 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0 bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/10 p-2 text-primary">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Editar Precios
              </h2>
              <p className="text-xs text-muted-foreground truncate max-w-[320px] sm:max-w-md">
                {product.nombre}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-5 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-2.5 text-sm text-destructive font-medium">
              {error}
            </div>
          )}

          {/* Selector de Moneda Fuente */}
          <div className="rounded-2xl bg-muted/30 border border-border/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                1. Moneda Base de Entrada
              </label>
              <span className="text-[11px] text-muted-foreground">
                Cotización: 1 USDT = <strong>{money(dolarRate)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (sourceCurrency !== "USD") {
                    setSourceCurrency("USD");
                    if (numBase > 0 && dolarRate > 0) {
                      setBasePrice(String(Math.round((numBase / dolarRate) * 100) / 100));
                    }
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${
                  sourceCurrency === "USD"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <span>💵 Dólares (USDT)</span>
                {sourceCurrency === "USD" && <Check className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (sourceCurrency !== "ARS") {
                    setSourceCurrency("ARS");
                    if (numBase > 0 && dolarRate > 0) {
                      setBasePrice(String(Math.round(numBase * dolarRate)));
                    }
                  }
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${
                  sourceCurrency === "ARS"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                <span>🇦🇷 Pesos (ARS)</span>
                {sourceCurrency === "ARS" && <Check className="h-3.5 w-3.5" />}
              </button>
            </div>

            {/* Input Precio Base */}
            <div>
              <label className="label-sm">
                Precio Base ({sourceCurrency === "USD" ? "u$d sin recargo" : "$ sin recargo"}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                  {sourceCurrency === "USD" ? "u$d" : "$"}
                </span>
                <input
                  className="input-base pl-11 text-base font-semibold"
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  placeholder={sourceCurrency === "USD" ? "Ej: 50" : "Ej: 80000"}
                  autoFocus
                />
              </div>
            </div>

            {/* Desglose en vivo de cálculo */}
            {numBase > 0 && (
              <div className="rounded-xl bg-card border border-border p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Costo base ingresado:</span>
                  <span>{sourceCurrency === "USD" ? `u$d ${numBase.toFixed(2)}` : money(numBase)}</span>
                </div>
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Recargo tienda (+7%):
                  </span>
                  <span>+ {sourceCurrency === "USD" ? `u$d ${surchargeAmt.toFixed(2)}` : money(surchargeAmt)}</span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex items-center justify-between font-bold text-foreground text-sm">
                  <span>Precio final en Tienda:</span>
                  <div className="text-right">
                    <span className="text-primary">{money(finalArs)}</span>
                    <span className="text-xs text-muted-foreground ml-2">(u$d {finalUsd.toFixed(2)})</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sección Precio de Oferta */}
          <div className="rounded-2xl bg-muted/30 border border-border/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-primary fill-primary" /> 2. Precio de Oferta (Opcional)
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-foreground">
                <input
                  type="checkbox"
                  checked={hasOffer}
                  onChange={(e) => setHasOffer(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary accent-primary"
                />
                Activar oferta
              </label>
            </div>

            {hasOffer && (
              <div className="space-y-3 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOfferSourceCurrency("USD")}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      offerSourceCurrency === "USD"
                        ? "bg-primary/20 text-primary border-primary"
                        : "bg-card text-muted-foreground border-border"
                    }`}
                  >
                    Oferta en USD
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferSourceCurrency("ARS")}
                    className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                      offerSourceCurrency === "ARS"
                        ? "bg-primary/20 text-primary border-primary"
                        : "bg-card text-muted-foreground border-border"
                    }`}
                  >
                    Oferta en ARS
                  </button>
                </div>

                <div>
                  <label className="label-sm">
                    Precio Base de Oferta ({offerSourceCurrency === "USD" ? "u$d" : "$"})
                  </label>
                  <input
                    className="input-base"
                    value={offerBasePrice}
                    onChange={(e) => setOfferBasePrice(e.target.value)}
                    placeholder={offerSourceCurrency === "USD" ? "Ej: 40" : "Ej: 64000"}
                  />
                </div>

                {numOfferBase > 0 && (
                  <div className="rounded-xl bg-card border border-border p-2.5 text-xs flex items-center justify-between">
                    <span className="text-muted-foreground">Oferta final (+7%):</span>
                    <span className="font-bold text-primary">
                      {money(finalOfferArs)} <span className="text-muted-foreground font-normal">(u$d {finalOfferUsd.toFixed(2)})</span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sección Precios de Variantes de Color */}
          {variantsState.length > 0 && (
            <div className="rounded-2xl bg-muted/30 border border-border/80 p-4 space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                3. Precios de Variantes de Color ({variantsState.length})
              </label>

              <div className="space-y-2.5">
                {variantsState.map((v, idx) => {
                  const vNumBase = Number(String(v.basePrice).replace(/[^\d.-]/g, "")) || 0;
                  const vFinalUsd = v.sourceCurrency === "USD" ? Math.round(vNumBase * 1.07 * 100) / 100 : (dolarRate > 0 ? Math.round((Math.round(vNumBase * 1.07) / dolarRate) * 100) / 100 : 0);
                  const vFinalArs = v.sourceCurrency === "USD" ? calcArsFromUsd(vFinalUsd, dolarRate, markupPercentage, roundingIncrement, 1) : Math.round(vNumBase * 1.07);

                  return (
                    <div key={v.id || idx} className="rounded-xl border border-border bg-card p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-foreground">{v.color}</span>
                        <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={v.hasCustom}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setVariantsState((prev) =>
                                prev.map((item, i) =>
                                  i === idx
                                    ? { ...item, hasCustom: checked, basePrice: checked ? (item.basePrice || basePrice) : "" }
                                    : item
                                )
                              );
                            }}
                            className="h-3.5 w-3.5 rounded border-border accent-primary"
                          />
                          Precio personalizado
                        </label>
                      </div>

                      {v.hasCustom ? (
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div>
                            <label className="label-sm">Moneda</label>
                            <select
                              className="input-base text-xs py-1"
                              value={v.sourceCurrency}
                              onChange={(e) => {
                                const val = e.target.value as "USD" | "ARS";
                                setVariantsState((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, sourceCurrency: val } : item))
                                );
                              }}
                            >
                              <option value="USD">USD (u$d)</option>
                              <option value="ARS">ARS ($)</option>
                            </select>
                          </div>
                          <div>
                            <label className="label-sm">Precio Base ({v.sourceCurrency})</label>
                            <input
                              className="input-base text-xs py-1"
                              value={v.basePrice}
                              onChange={(e) => {
                                const val = e.target.value;
                                setVariantsState((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, basePrice: val } : item))
                                );
                              }}
                              placeholder="Ej: 50"
                            />
                          </div>
                          {vNumBase > 0 && (
                            <div className="col-span-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                              Final (+7%): <strong>{money(vFinalArs)}</strong> (u$d {vFinalUsd.toFixed(2)})
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          Hereda el precio general del producto ({money(finalArs)})
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5 bg-muted/20 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="btn-base border border-border bg-card hover:bg-muted text-foreground px-4 py-2 text-xs font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSavePrice()}
            disabled={saving}
            className="btn-base bg-primary text-primary-foreground hover:opacity-90 px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            <span>{saving ? "Guardando..." : "Guardar Precios"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Modal de formulario de producto (General)               */
/* ───────────────────────────────────────────────────────── */

function ProductModal({
  initial,
  onClose,
  onSaved,
  onOpenPriceModal,
  userEmail,
  userToken,
  dolarRate = 1500,
  roundingIncrement = 10,
  markupPercentage = 0,
}: {
  initial: ProductInput;
  onClose: () => void;
  onSaved: () => void;
  onOpenPriceModal?: (p: ProductInput) => void;
  userEmail: string;
  userToken: string;
  dolarRate?: number;
  roundingIncrement?: number;
  markupPercentage?: number;
}) {
  const [form, setForm] = useState<ProductInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof ProductInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePriceUsdChange = (val: string) => {
    const numUsd = Number(val.replace(/[^\d.-]/g, ""));
    const calculatedArs =
      numUsd > 0 && dolarRate > 0
        ? calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1.07)
        : "";
    setForm((prev) => ({
      ...prev,
      precio_usd: val,
      precio_base: val,
      moneda_base: "USD",
      ...(calculatedArs ? { precio: String(calculatedArs) } : {}),
    }));
  };

  const handlePriceArsChange = (val: string) => {
    const numArs = Number(val.replace(/[^\d.-]/g, ""));
    let calculatedUsd = "";
    if (numArs > 0 && dolarRate > 0) {
      const effArs = Math.round(numArs * 1.07);
      calculatedUsd = String(Math.round((effArs / dolarRate) * 100) / 100);
    }
    setForm((prev) => ({
      ...prev,
      precio: val,
      precio_base: val,
      moneda_base: "ARS",
      ...(calculatedUsd !== "" ? { precio_usd: calculatedUsd } : {}),
    }));
  };

  const handlePriceOfertaUsdChange = (val: string) => {
    const numUsd = Number(val.replace(/[^\d.-]/g, ""));
    const calculatedArs =
      numUsd > 0 && dolarRate > 0
        ? calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1.07)
        : "";
    setForm((prev) => ({
      ...prev,
      precio_oferta_usd: val,
      precio_oferta_base: val,
      moneda_oferta_base: "USD",
      precio_oferta: val.trim() ? (calculatedArs ? String(calculatedArs) : (prev.precio_oferta ?? "")) : "",
    }));
  };

  const handlePriceOfertaArsChange = (val: string) => {
    const numArs = Number(val.replace(/[^\d.-]/g, ""));
    let calculatedUsd = "";
    if (numArs > 0 && dolarRate > 0) {
      const effArs = Math.round(numArs * 1.07);
      calculatedUsd = String(Math.round((effArs / dolarRate) * 100) / 100);
    }
    setForm((prev) => ({
      ...prev,
      precio_oferta: val,
      precio_oferta_base: val,
      moneda_oferta_base: "ARS",
      precio_oferta_usd: val.trim() ? (calculatedUsd !== "" ? calculatedUsd : (prev.precio_oferta_usd ?? "")) : "",
    }));
  };

  const updateVariantPriceUsd = (i: number, val: string) => {
    const numUsd = Number(val.replace(/[^\d.-]/g, ""));
    const calculatedArs =
      numUsd > 0 && dolarRate > 0
        ? calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1.07)
        : "";
    setForm((prev) => ({
      ...prev,
      variants: (prev.variants ?? []).map((v, idx) =>
        idx === i
          ? {
              ...v,
              precio_usd: val,
              precio_base: val,
              moneda_base: "USD",
              ...(calculatedArs ? { precio: String(calculatedArs) } : {}),
            }
          : v
      ),
    }));
  };

  const updateVariantPriceArs = (i: number, val: string) => {
    const numArs = Number(val.replace(/[^\d.-]/g, ""));
    let calculatedUsd = "";
    if (numArs > 0 && dolarRate > 0) {
      const effArs = Math.round(numArs * 1.07);
      calculatedUsd = String(Math.round((effArs / dolarRate) * 100) / 100);
    }
    setForm((prev) => ({
      ...prev,
      variants: (prev.variants ?? []).map((v, idx) =>
        idx === i
          ? {
              ...v,
              precio: val,
              precio_base: val,
              moneda_base: "ARS",
              ...(calculatedUsd !== "" ? { precio_usd: calculatedUsd } : {}),
            }
          : v
      ),
    }));
  };

  const addVariant = () =>
    setForm((prev) => ({
      ...prev,
      variants: [...(prev.variants ?? []), { color: "", precio: "", precio_usd: "", stock: "SI", imagen_url: "", talles_disponibles: [] }],
    }));

  const removeVariant = (i: number) =>
    setForm((prev) => ({ ...prev, variants: (prev.variants ?? []).filter((_, idx) => idx !== i) }));

  const updateVariant = (i: number, field: keyof VariantInput, value: any) =>
    setForm((prev) => ({
      ...prev,
      variants: (prev.variants ?? []).map((v, idx) => (idx === i ? { ...v, [field]: value } : v)),
    }));

  const addTier = () =>
    setForm((prev) => ({ ...prev, tiers: [...(prev.tiers ?? []), { units: 0, percent: 0 }] }));

  const removeTier = (i: number) =>
    setForm((prev) => ({ ...prev, tiers: (prev.tiers ?? []).filter((_, idx) => idx !== i) }));

  const updateTier = (i: number, field: "units" | "percent", value: number) =>
    setForm((prev) => ({
      ...prev,
      tiers: (prev.tiers ?? []).map((t, idx) => (idx === i ? { ...t, [field]: value } : t)),
    }));

  async function handleSave() {
    const hasName = Boolean(form.nombre.trim());
    if (!hasName) {
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
      const res = await upsertAdminProduct({
        data: { email: userEmail, token: userToken, product: form },
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-black/60 p-2 sm:p-4 backdrop-blur-sm">
      <div className="relative my-4 sm:my-8 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card shadow-2xl overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 shrink-0 bg-muted/30">
          <h2 className="text-base sm:text-lg font-bold">
            {form.id ? "Editar datos del producto" : "Nuevo producto"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-4 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
          )}

          {/* Imagen principal */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Imagen principal</label>
            <ImageDropzone
              value={form.imagen_url ?? ""}
              onChange={(url) => set("imagen_url", url)}
              bucket="storage-images"
              folder="products"
            />
          </div>

          {/* Campos básicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="col-span-1 sm:col-span-2">
              <label className="label-sm">{form.whatsapp_only_reason === "zapatillas" ? "Modelo *" : "Nombre *"}</label>
              <input
                className="input-base"
                value={form.nombre}
                onChange={(e) => set("nombre", e.target.value)}
                placeholder={form.whatsapp_only_reason === "zapatillas" ? "Modelo de zapatilla" : "Nombre del producto"}
              />
            </div>
            <div>
              <label className="label-sm">Categoría</label>
              <input className="input-base" value={form.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Ej: Suplementos" />
            </div>
            {!form.whatsapp_only_reason && (
              <div>
                <label className="label-sm">Color predeterminado</label>
                <input className="input-base" value={form.color_predeterminado ?? ""} onChange={(e) => set("color_predeterminado", e.target.value)} placeholder="Ej: Negro" />
              </div>
            )}

            {/* Banner y Toggle WhatsApp Only */}
            <div className="col-span-1 sm:col-span-2">
              <div
                onClick={() => {
                  const isCurrentlyWa = Boolean(form.whatsapp_only_reason);
                  setForm((prev) => ({
                    ...prev,
                    whatsapp_only_reason: isCurrentlyWa ? "" : "china",
                  }));
                }}
                className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer transition-all ${
                  form.whatsapp_only_reason === "china" || form.whatsapp_only_reason === "whatsapp_only"
                    ? "border-emerald-500/50 bg-emerald-500/10 shadow-xs"
                    : form.whatsapp_only_reason
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-surface/50 hover:bg-surface"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">💬</span>
                  <div>
                    <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      Venta exclusiva por WhatsApp (China / WhatsApp Only)
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Oculta la compra directa en la tienda y redirige al cliente a consultar por WhatsApp. El precio es opcional.
                    </p>
                  </div>
                </div>
                <div
                  className={`h-5 w-9 rounded-full p-0.5 transition-colors shrink-0 ${
                    Boolean(form.whatsapp_only_reason) ? "bg-emerald-600" : "bg-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      Boolean(form.whatsapp_only_reason) ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SECCIÓN DE PRECIOS:
                - Si es edición (form.id): muestra tarjeta informativa con botón dedicado "Editar precio"
                - Si es alta nueva (!form.id): muestra los inputs de carga inicial */}
            {form.id ? (
              <div className="col-span-1 sm:col-span-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                      <Coins className="h-4 w-4" /> Precios Actuales en Tienda
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Precio ARS:</span>{" "}
                        <strong className="text-foreground">
                          {form.precio && Number(form.precio) > 0 ? money(form.precio) : "Sin precio fijo (Por WhatsApp)"}
                        </strong>
                      </div>
                      {form.precio_usd && (
                        <div>
                          <span className="text-xs text-muted-foreground">Precio USDT:</span>{" "}
                          <strong className="text-foreground">u$d {Number(form.precio_usd).toFixed(2)}</strong>
                        </div>
                      )}
                      {form.precio_base && (
                        <div>
                          <span className="text-xs text-muted-foreground">Base ingresada:</span>{" "}
                          <span className="text-xs font-semibold text-muted-foreground">
                            {form.moneda_base === "ARS" ? money(form.precio_base) : `u$d ${form.precio_base}`}
                          </span>
                        </div>
                      )}
                    </div>
                    {form.precio_oferta && String(form.oferta).toUpperCase() === "SI" && (
                      <div className="mt-2 text-xs text-primary font-semibold flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5 fill-primary" />
                        Oferta activa: {money(form.precio_oferta)} {form.precio_oferta_usd ? `(u$d ${form.precio_oferta_usd})` : ""}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenPriceModal) {
                        onOpenPriceModal(form);
                      }
                    }}
                    className="btn-base bg-primary text-primary-foreground hover:opacity-90 px-3.5 py-2 text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-sm"
                  >
                    <DollarSign className="h-4 w-4" /> Modificar precio
                  </button>
                </div>
                <p className="mt-2.5 text-[11px] text-muted-foreground">
                  ℹ️ Para proteger tus márgenes, editar los datos del producto (nombre, stock, fotos, etc.) nunca altera ni recalcula los precios.
                </p>
              </div>
            ) : (
              <>
                {Boolean(form.whatsapp_only_reason) && (
                  <div className="col-span-1 sm:col-span-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                    💬 <strong>Modo WhatsApp Only activado:</strong> Los precios son opcionales. Podés dejarlos vacíos y en la tienda se mostrará <em>"Consultar precio y disponibilidad al WhatsApp"</em>.
                  </div>
                )}
                <div>
                  <label className="label-sm">Precio Base USD (u$d {form.whatsapp_only_reason ? "- opcional" : ""})</label>
                  <input className="input-base" value={form.precio_usd ?? ""} onChange={(e) => handlePriceUsdChange(e.target.value)} placeholder={form.whatsapp_only_reason ? "Opcional (Ej: 50)" : "Ej: 50"} />
                  {(() => { const raw = Number(String(form.precio_usd ?? "").replace(/[^\d.-]/g, "")); return raw > 0 ? (
                    <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span>Precio final (+7%): <strong>u$d {(Math.round(raw * 1.07 * 100) / 100).toFixed(2)}</strong></span>
                    </div>
                  ) : null; })()}
                  {Boolean(form.precio_usd?.trim()) && dolarRate > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      <Zap className="h-3 w-3 shrink-0" />
                      <span>Actualiza pesos a <strong>{money(calcArsFromUsd(form.precio_usd ?? "", dolarRate, markupPercentage, roundingIncrement, 1.07))}</strong></span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="label-sm">Precio Base ARS ($ {form.whatsapp_only_reason ? "- opcional" : ""})</label>
                  <input className="input-base" value={form.precio} onChange={(e) => handlePriceArsChange(e.target.value)} placeholder={form.whatsapp_only_reason ? "Opcional (Ej: 80000)" : "Ej: 80000"} />
                  {(() => { const raw = Number(String(form.precio ?? "").replace(/[^\d.-]/g, "")); return raw > 0 && !form.precio_usd?.trim() ? (
                    <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <Sparkles className="h-3 w-3 shrink-0" />
                      <span>Precio final ARS (+7%): <strong>${Math.round(raw * 1.07).toLocaleString("es-AR")}</strong></span>
                    </div>
                  ) : null; })()}
                </div>
                <div>
                  <label className="label-sm">Precio oferta Base USD (u$d - opcional)</label>
                  <input className="input-base" value={form.precio_oferta_usd ?? ""} onChange={(e) => handlePriceOfertaUsdChange(e.target.value)} placeholder="Ej: 40" />
                </div>
                <div>
                  <label className="label-sm">Precio oferta Base ARS (opcional)</label>
                  <input className="input-base" value={form.precio_oferta ?? ""} onChange={(e) => handlePriceOfertaArsChange(e.target.value)} placeholder="Ej: 64000" />
                </div>
              </>
            )}

            <div className="col-span-1 sm:col-span-2">
              <label className="label-sm">Descripción</label>
              <textarea className="input-base min-h-[80px] resize-y" value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} placeholder="Descripción del producto..." />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            {/* Selector: tipo de venta (compra normal vs. WA-only) */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo de venta</label>
              <select
                id="whatsapp_only_reason_selector"
                value={form.whatsapp_only_reason ?? ""}
                onChange={(e) => {
                  const reason = e.target.value;
                  // Auto-set tipo_talles según el tipo de venta WA-only
                  const autoTalles: "ZAPATILLAS" | "ROPA" | "NINGUNO" =
                    reason === "zapatillas" ? "ZAPATILLAS" :
                    reason === "remeras"    ? "ROPA"       : "NINGUNO";
                  setForm((prev) => ({
                    ...prev,
                    whatsapp_only_reason: reason,
                    ...(reason
                      ? { tipo_talles: autoTalles }
                      : {}),
                  }));
                }}
                className="input-base text-sm py-1.5"
              >
                <option value="">Compra normal (carrito y checkout)</option>
                <option value="china">China / WhatsApp Only — Consultar precio y disponibilidad</option>
                <option value="vapers">Vapers — solo por WhatsApp</option>
                <option value="zapatillas">Zapatillas — solo por WhatsApp</option>
                <option value="remeras">Remeras — solo por WhatsApp</option>
              </select>
            </div>
            {/* Selector de MOQ (Compra mínima) */}
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Compra mínima</label>
              <select
                id="moq_group_selector"
                value={form.moq_group ?? ""}
                onChange={(e) => set("moq_group", e.target.value)}
                className="input-base text-sm py-1.5"
              >
                <option value="">Automático (por categoría)</option>
                <option value="none">Sin mínimo de compra</option>
                <option value="mates">Mates — mín. 10 unidades</option>
                <option value="perfumes arabes">Perfumes Árabes — mín. 5 u.</option>
                <option value="perfumes disenador">Perfumes Diseñador — mín. 3 u.</option>
              </select>
              {isMate(form.nombre, form.categoria) && !form.moq_group && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  ⚠ El nombre sugiere que es un Mate. Confirmá o corregí el mínimo.
                </p>
              )}
            </div>
            {(["destacado", "oferta", "stock"] as const).map((field) => (
              <label key={field} className="flex cursor-pointer items-center gap-2 text-sm font-medium capitalize">
                <div
                  onClick={() => set(field, form[field] === "SI" ? "NO" : "SI")}
                  className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                    form[field] === "SI" ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      form[field] === "SI" ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </div>
                <span>{field}</span>
              </label>
            ))}
          </div>

          {/* Descuento por cantidad */}
          <div className="rounded-xl border border-border p-4 bg-muted/20">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="text-sm font-bold text-foreground">Descuento por cantidad</span>
                <p className="text-xs text-muted-foreground">Configurá escalas de descuento progresivas.</p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="btn-base bg-primary/10 text-primary hover:bg-primary/20 text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar escala
              </button>
            </div>

            {form.tiers && form.tiers.length > 0 ? (
              <div className="space-y-2">
                {form.tiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground min-w-[70px]">Desde</span>
                    <input
                      type="number"
                      min="1"
                      className="input-base w-24 text-center text-xs py-1"
                      value={tier.units || ""}
                      onChange={(e) => updateTier(idx, "units", Number(e.target.value))}
                      placeholder="U."
                    />
                    <span className="text-xs text-muted-foreground">unidades:</span>
                    <div className="relative flex-1 max-w-[120px]">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="input-base pr-6 text-center text-xs py-1"
                        value={tier.percent || ""}
                        onChange={(e) => updateTier(idx, "percent", Number(e.target.value))}
                        placeholder="%"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                    </div>
                    <span className="text-xs text-muted-foreground">OFF</span>
                    <button
                      type="button"
                      onClick={() => removeTier(idx)}
                      className="rounded-lg p-1 text-destructive hover:bg-destructive/10 ml-auto"
                      title="Eliminar escala"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">Sin escalas configuradas.</p>
            )}
          </div>

          {/* Tipo de Talles y Talles Disponibles */}
          {/* Tipo de talles se oculta para productos WA-only (zapatillas/vapers/remeras) */}
          {!form.whatsapp_only_reason && <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/20">
            <div>
              <label className="label-sm mb-1 block">Tipo de talles</label>
              <div className="flex flex-wrap gap-2">
                {(["NINGUNO", "ZAPATILLAS", "ROPA"] as const).map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => {
                      set("tipo_talles", tipo);
                      if (tipo === "NINGUNO") {
                        set("talles_disponibles", []);
                      }
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
                      form.tipo_talles === tipo
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-card text-muted-foreground border-border hover:bg-muted"
                    }`}
                  >
                    {tipo === "NINGUNO" ? "Sin talles" : tipo === "ZAPATILLAS" ? "👟 Zapatillas (35-45)" : "👕 Ropa (XS-XXXL)"}
                  </button>
                ))}
              </div>
            </div>

            {form.tipo_talles && form.tipo_talles !== "NINGUNO" && (
              <div>
                <label className="label-sm mb-1.5 block">
                  Talles disponibles para el producto general ({form.tipo_talles === "ZAPATILLAS" ? "Números" : "Letras"})
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {(form.tipo_talles === "ZAPATILLAS"
                    ? ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]
                    : ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
                  ).map((talle) => {
                    const normalizedCurrent = (form.talles_disponibles ?? []).map((t) => String(t).trim());
                    const active = normalizedCurrent.includes(talle);
                    return (
                      <button
                        key={talle}
                        type="button"
                        onClick={() => {
                          const next = active
                            ? normalizedCurrent.filter((t) => t !== talle)
                            : [...normalizedCurrent, talle];
                          set("talles_disponibles", next);
                        }}
                        className={`h-8 min-w-9 rounded-lg px-2 text-xs font-bold transition-all border ${
                          active
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-xs"
                            : "bg-card text-muted-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {talle} {active ? "✓" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>}

          {/* Variantes de color */}
          {!form.whatsapp_only_reason && <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Variantes de color</label>
              <button type="button" onClick={addVariant} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
                <Plus className="h-3 w-3" /> Agregar
              </button>
            </div>
            <div className="space-y-3">
              {(form.variants ?? []).map((v, i) => (
                <div key={i} className="rounded-xl border border-border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Variante #{i + 1}</span>
                    <button type="button" onClick={() => removeVariant(i)} className="text-destructive hover:opacity-70">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="label-sm">Color</label>
                      <input className="input-base" value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} placeholder="Ej: Rojo" />
                    </div>
                    <div>
                      <label className="label-sm">Stock (SI / NO)</label>
                      <input className="input-base" value={String(v.stock ?? "SI")} onChange={(e) => updateVariant(i, "stock", e.target.value)} />
                    </div>
                    
                    {/* Precios de variante solo en alta nueva */}
                    {!form.id ? (
                      <>
                        <div>
                          <label className="label-sm">Precio Base USD (u$d - opcional)</label>
                          <input className="input-base" value={String(v.precio_usd ?? "")} onChange={(e) => updateVariantPriceUsd(i, e.target.value)} placeholder="Ej: 50 (opcional)" />
                          {(() => { const raw = Number(String(v.precio_usd ?? "").replace(/[^\d.-]/g, "")); return raw > 0 ? (
                            <div className="mt-1 flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Sparkles className="h-2.5 w-2.5 shrink-0" />
                              <span>Final (+7%): <strong>u$d {(Math.round(raw * 1.07 * 100) / 100).toFixed(2)}</strong></span>
                            </div>
                          ) : null; })()}
                        </div>
                        <div>
                          <label className="label-sm">Precio Base ARS (opcional)</label>
                          <input className="input-base" value={String(v.precio ?? "")} onChange={(e) => updateVariantPriceArs(i, e.target.value)} placeholder="Ej: 80000 (opcional)" />
                          {!v.precio_usd && (() => { const raw = Number(String(v.precio ?? "").replace(/[^\d.-]/g, "")); return raw > 0 ? (
                            <div className="mt-1 flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <Sparkles className="h-2.5 w-2.5 shrink-0" />
                              <span>Final (+7%): <strong>${Math.round(raw * 1.07).toLocaleString("es-AR")}</strong></span>
                            </div>
                          ) : null; })()}
                        </div>
                      </>
                    ) : (
                      <div className="col-span-1 sm:col-span-2 flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-muted/60 text-muted-foreground border border-border/60">
                        <span>Precio actual en tienda: <strong className="text-foreground">{money(v.precio)}</strong> {v.precio_usd ? `(u$d ${v.precio_usd})` : ""}</span>
                        <span className="text-[11px] text-primary font-medium">Editá precios desde "Modificar precio"</span>
                      </div>
                    )}
                  </div>
                  {form.tipo_talles && form.tipo_talles !== "NINGUNO" && (
                    <div className="mt-2 mb-3 space-y-1">
                      <label className="label-sm">Talles en stock para variante {v.color || `Nro ${i + 1}`}</label>
                      <div className="flex flex-wrap gap-1">
                        {(form.tipo_talles === "ZAPATILLAS"
                          ? ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"]
                          : ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
                        ).map((talle) => {
                          const normalizedCurrent = (v.talles_disponibles ?? []).map((t) => String(t).trim());
                          const active = normalizedCurrent.includes(talle);
                          return (
                            <button
                              key={talle}
                              type="button"
                              onClick={() => {
                                const next = active
                                  ? normalizedCurrent.filter((t) => t !== talle)
                                  : [...normalizedCurrent, talle];
                                updateVariant(i, "talles_disponibles", next);
                              }}
                              className={`h-7 min-w-8 rounded-md px-1.5 text-[10px] font-bold transition-all border ${
                                active
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-xs"
                                  : "bg-muted/40 text-muted-foreground/60 border-border opacity-60 hover:opacity-100"
                              }`}
                            >
                               {talle} {active ? "✓" : ""}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <label className="label-sm mb-1 block">Imagen de variante</label>
                  <ImageDropzone
                    value={v.imagen_url ?? ""}
                    onChange={(url) => updateVariant(i, "imagen_url", url)}
                    bucket="storage-images"
                    folder="products-VARIANTES"
                    label="Arrastrá imagen de variante"
                  />
                </div>
              ))}
            </div>
          </div>}

          {/* Descuentos por cantidad */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Descuentos por cantidad</label>
              <button type="button" onClick={addTier} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10">
                <Plus className="h-3 w-3" /> Agregar tier
              </button>
            </div>
            <div className="space-y-2">
              {(form.tiers ?? []).map((t, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    type="number" min={1}
                    className="input-base w-20 sm:w-24"
                    value={t.units || ""}
                    onChange={(e) => updateTier(i, "units", Number(e.target.value))}
                    placeholder="Unidades"
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground">unid. →</span>
                  <input
                    type="number" min={0} max={100} step={0.5}
                    className="input-base w-20 sm:w-24"
                    value={t.percent || ""}
                    onChange={(e) => updateTier(i, "percent", Number(e.target.value))}
                    placeholder="% desc."
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground">%</span>
                  <button type="button" onClick={() => removeTier(i)} className="text-destructive hover:opacity-70 p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(form.tiers ?? []).length === 0 && (
                <p className="text-xs text-muted-foreground">Sin descuentos por cantidad.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <button onClick={onClose} className="btn-base bg-muted text-foreground hover:bg-muted/70">Cancelar</button>
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-base bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando..." : form.id ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Componentes para Panel de Ofertas del Día                */
/* ───────────────────────────────────────────────────────── */

function ActiveOfferCard({
  product,
  userEmail,
  userToken,
  onSaved,
  dolarRate = 1500,
  roundingIncrement = 10,
  markupPercentage = 0,
}: {
  product: Product;
  userEmail: string;
  userToken: string;
  onSaved: () => Promise<void>;
  dolarRate?: number;
  roundingIncrement?: number;
  markupPercentage?: number;
}) {
  const [precioOferta, setPrecioOferta] = useState(String(product.precio_oferta ?? ""));
  const [precioOfertaUsd, setPrecioOfertaUsd] = useState(
    String((product as Record<string, unknown>)["precio_oferta_usd"] ?? "")
  );
  const [saving, setSaving] = useState(false);

  const basePrice = toNumber(product.precio);
  const offerPrice = toNumber(precioOferta);
  const discountPct =
    basePrice > 0 && offerPrice > 0 && offerPrice < basePrice
      ? Math.round(((basePrice - offerPrice) / basePrice) * 100)
      : 0;

  const handleOfferUsdChange = (val: string) => {
    setPrecioOfertaUsd(val);
    const numUsd = Number(val.replace(/[^\d.-]/g, ""));
    if (numUsd > 0 && dolarRate > 0) {
      const calculatedArs = calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1);
      setPrecioOferta(String(calculatedArs));
    } else if (!val.trim()) {
      setPrecioOferta("");
    }
  };

  const applyPreset = (pct: number) => {
    const baseArs = toNumber(product.precio);
    const baseUsd = toNumber(String((product as Record<string, unknown>)["precio_usd"] ?? ""));
    if (baseUsd > 0) {
      const newUsd = Math.round(baseUsd * (1 - pct / 100) * 100) / 100;
      handleOfferUsdChange(String(newUsd));
    } else if (baseArs > 0) {
      setPrecioOferta(String(Math.round(baseArs * (1 - pct / 100))));
    }
  };

  async function handleSave() {
    setSaving(true);
    try {
      const input = productToInput(product);
      input.oferta = "SI";
      input.precio_oferta = precioOferta;
      input.precio_oferta_usd = precioOfertaUsd;
      const res = await upsertAdminProduct({ data: { email: userEmail, token: userToken, product: input } });
      if (res.error) {
        toast.error(res.error);
      } else {
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
      const res = await upsertAdminProduct({ data: { email: userEmail, token: userToken, product: input } });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.info(`"${product.nombre}" quitado de Ofertas del Día.`);
        await onSaved();
      }
    } catch {
      toast.error("Error al quitar la oferta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-card p-4 sm:p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src={product.imagen_url || FALLBACK_IMAGE}
          alt={product.nombre ?? ""}
          className="h-16 w-16 rounded-xl object-cover border border-border shrink-0"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              🔥 Oferta Activa
            </span>
            {discountPct > 0 && (
              <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold">
                -{discountPct}% OFF
              </span>
            )}
            <span className="text-xs text-muted-foreground">{product.categoria}</span>
          </div>
          <h3 className="font-bold text-sm sm:text-base text-foreground mt-1 truncate">{product.nombre}</h3>
          <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
            <span>Precio lista: <strong className="text-foreground">{money(product.precio)}</strong></span>
          </div>
        </div>
      </div>

      {/* Control de Precios & Presets */}
      <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground">Calcular:</span>
          {[10, 15, 20, 25, 30, 40, 50].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPreset(pct)}
              className="rounded-md bg-muted hover:bg-primary/20 hover:text-primary px-2 py-0.5 text-[11px] font-bold transition-colors"
            >
              -{pct}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">USD:</span>
            <input
              type="text"
              value={precioOfertaUsd}
              onChange={(e) => handleOfferUsdChange(e.target.value)}
              placeholder="Precio USD"
              className="input-base text-xs py-1.5 w-24"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">ARS:</span>
            <input
              type="text"
              value={precioOferta}
              onChange={(e) => setPrecioOferta(e.target.value)}
              placeholder="Precio ARS"
              className="input-base text-xs py-1.5 w-28 font-bold text-primary"
            />
          </div>

          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="btn-base bg-primary text-primary-foreground text-xs py-1.5 px-3 hover:opacity-90 flex items-center gap-1 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> Guardar
          </button>
          <button
            onClick={() => void handleRemove()}
            disabled={saving}
            className="btn-base bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs py-1.5 px-2.5 disabled:opacity-50"
            title="Quitar de ofertas"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function CandidateOfferCard({
  product,
  userEmail,
  userToken,
  onSaved,
  dolarRate = 1500,
  roundingIncrement = 10,
  markupPercentage = 0,
}: {
  product: Product;
  userEmail: string;
  userToken: string;
  onSaved: () => Promise<void>;
  dolarRate?: number;
  roundingIncrement?: number;
  markupPercentage?: number;
}) {
  const [precioOferta, setPrecioOferta] = useState("");
  const [precioOfertaUsd, setPrecioOfertaUsd] = useState("");
  const [saving, setSaving] = useState(false);

  const basePrice = toNumber(product.precio);
  const offerPrice = toNumber(precioOferta);
  const discountPct =
    basePrice > 0 && offerPrice > 0 && offerPrice < basePrice
      ? Math.round(((basePrice - offerPrice) / basePrice) * 100)
      : 0;

  const handleOfferUsdChange = (val: string) => {
    setPrecioOfertaUsd(val);
    const numUsd = Number(val.replace(/[^\d.-]/g, ""));
    if (numUsd > 0 && dolarRate > 0) {
      const calculatedArs = calcArsFromUsd(numUsd, dolarRate, markupPercentage, roundingIncrement, 1);
      setPrecioOferta(String(calculatedArs));
    } else if (!val.trim()) {
      setPrecioOferta("");
    }
  };

  const applyPreset = (pct: number) => {
    const baseArs = toNumber(product.precio);
    const baseUsd = toNumber(String((product as Record<string, unknown>)["precio_usd"] ?? ""));
    if (baseUsd > 0) {
      const newUsd = Math.round(baseUsd * (1 - pct / 100) * 100) / 100;
      handleOfferUsdChange(String(newUsd));
    } else if (baseArs > 0) {
      setPrecioOferta(String(Math.round(baseArs * (1 - pct / 100))));
    }
  };

  async function handleActivate() {
    setSaving(true);
    try {
      const input = productToInput(product);
      input.oferta = "SI";
      if (precioOferta) input.precio_oferta = precioOferta;
      if (precioOfertaUsd) input.precio_oferta_usd = precioOfertaUsd;
      const res = await upsertAdminProduct({ data: { email: userEmail, token: userToken, product: input } });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`¡"${product.nombre}" agregado a Ofertas del Día!`);
        await onSaved();
      }
    } catch {
      toast.error("Error al activar la oferta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs hover:border-primary/40 transition-all">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src={product.imagen_url || FALLBACK_IMAGE}
          alt={product.nombre ?? ""}
          className="h-14 w-14 rounded-xl object-cover border border-border shrink-0"
          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
        />
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground font-medium">{product.categoria}</span>
          <h3 className="font-bold text-sm sm:text-base text-foreground truncate">{product.nombre}</h3>
          <div className="text-xs text-muted-foreground mt-0.5">
            <span>Precio lista: <strong className="text-foreground">{money(product.precio)}</strong></span>
          </div>
        </div>
      </div>

      <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] font-medium text-muted-foreground">Descuento:</span>
          {[10, 15, 20, 25, 30, 40, 50].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => applyPreset(pct)}
              className="rounded-md bg-muted hover:bg-primary/20 hover:text-primary px-2 py-0.5 text-[11px] font-bold transition-colors"
            >
              -{pct}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">USD:</span>
            <input
              type="text"
              value={precioOfertaUsd}
              onChange={(e) => handleOfferUsdChange(e.target.value)}
              placeholder="Precio USD"
              className="input-base text-xs py-1.5 w-24"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">ARS:</span>
            <input
              type="text"
              value={precioOferta}
              onChange={(e) => setPrecioOferta(e.target.value)}
              placeholder="Precio ARS"
              className="input-base text-xs py-1.5 w-28 font-bold text-primary"
            />
          </div>

          <button
            onClick={() => void handleActivate()}
            disabled={saving}
            className="btn-base bg-primary text-primary-foreground text-xs py-1.5 px-3 hover:opacity-90 flex items-center gap-1 disabled:opacity-50"
          >
            <Flame className="h-3.5 w-3.5 fill-primary-foreground" />
            Activar Oferta
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  ErrorBoundary para proteger el panel de combos           */
/* ───────────────────────────────────────────────────────── */

class ComboPanelBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMsg: "" };
  }
  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, errorMsg: error instanceof Error ? error.message : String(error) };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-destructive">Ocurrió un error al cargar el panel de combos.</p>
          <p className="text-xs text-muted-foreground">{this.state.errorMsg}</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMsg: "" })}
            className="btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ───────────────────────────────────────────────────────── */
/*  Gestión Simplificada de Combos / Packs en Oferta         */
/* ───────────────────────────────────────────────────────── */

function ComboBuilderPanel({
  userEmail,
  userToken,
  initialBanners = [],
  onRefresh,
  dolarRate = 1500,
  roundingIncrement = 10,
  markupPercentage = 0,
}: {
  userEmail: string;
  userToken: string;
  initialBanners?: Banner[];
  onRefresh: () => Promise<void>;
  dolarRate?: number;
  roundingIncrement?: number;
  markupPercentage?: number;
}) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerInput | null>(null);

  // Form State
  const [comboTitle, setComboTitle] = useState("");
  const [comboSubtitle, setComboSubtitle] = useState("");
  const [comboImage, setComboImage] = useState("");
  const [sourceCurrency, setSourceCurrency] = useState<"USD" | "ARS">("USD");
  const [basePrice, setBasePrice] = useState("");
  const [saving, setSaving] = useState(false);

  // Cálculos en vivo
  const numBase = Number(basePrice.replace(/[^\d.-]/g, "")) || 0;
  const surchargeAmt =
    numBase > 0
      ? sourceCurrency === "USD"
        ? Math.round(numBase * 0.07 * 100) / 100
        : Math.round(numBase * 0.07)
      : 0;

  let finalUsd = 0;
  let finalArs = 0;

  if (numBase > 0) {
    if (sourceCurrency === "USD") {
      finalUsd = Math.round(numBase * 1.07 * 100) / 100;
      finalArs = calcArsFromUsd(finalUsd, dolarRate, markupPercentage, roundingIncrement, 1);
    } else {
      finalArs = Math.round(numBase * 1.07);
      finalUsd = dolarRate > 0 ? Math.round((finalArs / dolarRate) * 100) / 100 : 0;
    }
  }

  const discPct = 7;
  const tPrice = transferPrice(finalArs, discPct);

  async function loadBanners() {
    if (!userEmail || !userToken) return;
    setLoadingBanners(true);
    try {
      const res = await getAdminBanners({ data: { email: userEmail, token: userToken } });
      if (res && Array.isArray(res.banners)) setBanners(res.banners);
    } catch {
      toast.error("Error al cargar las ofertas de combos.");
    } finally {
      setLoadingBanners(false);
    }
  }

  useEffect(() => {
    if (userEmail && userToken) {
      void loadBanners();
    }
  }, [userEmail, userToken]);

  function resetForm() {
    setComboTitle("");
    setComboSubtitle("");
    setComboImage("");
    setSourceCurrency("USD");
    setBasePrice("");
    setCreating(false);
    setEditingBanner(null);
  }

  function handleEditClick(b: Banner) {
    const isArs = String(b.moneda_base ?? "").toUpperCase() === "ARS";
    const curr: "USD" | "ARS" = isArs ? "ARS" : "USD";
    setSourceCurrency(curr);

    let baseVal = "";
    if (b.precio_base !== null && b.precio_base !== undefined && Number(b.precio_base) > 0) {
      baseVal = String(b.precio_base);
    } else if (curr === "ARS") {
      const p = toNumber(b.precio);
      baseVal = p > 0 ? String(Math.round(p / 1.07)) : "";
    } else {
      const pUsd = Number(b.precio_usd) || (dolarRate > 0 ? toNumber(b.precio) / dolarRate : 0);
      baseVal = pUsd > 0 ? String(Math.round((pUsd / 1.07) * 100) / 100) : "";
    }

    setEditingBanner({
      id: b.id,
      titulo: b.titulo ?? "",
      subtitulo: b.subtitulo ?? "",
      imagen_url: b.imagen_url ?? "",
      precio: String(b.precio ?? ""),
      precio_base: b.precio_base,
      moneda_base: b.moneda_base,
      precio_usd: b.precio_usd,
      activo: b.activo ?? "SI",
    });
    setComboTitle(b.titulo ?? "");
    setComboSubtitle(b.subtitulo ?? "");
    setComboImage(b.imagen_url ?? "");
    setBasePrice(baseVal);
    setCreating(true);
  }

  async function handleSaveCombo() {
    if (!comboTitle.trim()) {
      toast.error("Ingresá el título de la oferta.");
      return;
    }
    if (numBase <= 0) {
      toast.error("Ingresá un precio base válido mayor a 0.");
      return;
    }

    setSaving(true);
    try {
      const bannerInput: BannerInput = {
        id: editingBanner?.id,
        titulo: comboTitle,
        subtitulo: comboSubtitle,
        imagen_url: comboImage,
        precio: String(finalArs),
        precio_base: numBase,
        moneda_base: sourceCurrency,
        precio_usd: finalUsd > 0 ? finalUsd : null,
        activo: "SI",
      };

      const res = await upsertAdminBanner({ data: { email: userEmail, token: userToken, banner: bannerInput } });
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(`¡Oferta "${comboTitle}" guardada correctamente!`);
        resetForm();
        await loadBanners();
        await onRefresh();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar la oferta.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCombo(id: string, title: string) {
    if (!confirm(`¿Eliminar la oferta "${title}"?`)) return;
    try {
      const res = await deleteAdminBanner({ data: { email: userEmail, token: userToken, bannerId: id } });
      if (res.error) toast.error(res.error);
      else {
        toast.info("Oferta eliminada.");
        await loadBanners();
        await onRefresh();
      }
    } catch {
      toast.error("Error al eliminar la oferta.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-muted/40 p-4 rounded-2xl border border-border">
        <div>
          <h3 className="font-bold text-base text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Combos y Packs en Oferta ({banners.length})
          </h3>
          <p className="text-xs text-muted-foreground">
            Cargá fácilmente en USD o ARS: el sistema aplica el 7% de recargo automáticamente, actualiza los precios según la cotización del dólar y muestra el precio con descuento por transferencia.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => {
              resetForm();
              setCreating(true);
            }}
            className="btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Crear Oferta / Combo
          </button>
        )}
      </div>

      {/* Formulario Completo de Ofertas */}
      {creating && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 shadow-md space-y-5 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
              <Flame className="h-5 w-5 fill-primary" />
              {editingBanner ? "Editar Oferta / Combo" : "Nueva Oferta del Día (Foto + Precios)"}
            </h3>
            <button onClick={resetForm} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label-sm">Nombre de la Oferta / Combo *</label>
              <input
                type="text"
                value={comboTitle}
                onChange={(e) => setComboTitle(e.target.value)}
                placeholder="Ej: Combo mayorista bazar o Combo mate más indumentaria"
                className="input-base"
              />
            </div>

            {/* Selector de Moneda Base */}
            <div className="rounded-xl border border-border bg-surface/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-primary" />
                  Moneda Base del Precio de Oferta
                </label>
                <span className="text-[11px] text-muted-foreground">
                  Cotización: 1 USD = <strong>{money(dolarRate)}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (sourceCurrency !== "USD") {
                      setSourceCurrency("USD");
                      if (numBase > 0 && dolarRate > 0) {
                        setBasePrice(String(Math.round((numBase / dolarRate) * 100) / 100));
                      }
                    }
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${
                    sourceCurrency === "USD"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <span>💵 Dólares (USD)</span>
                  {sourceCurrency === "USD" && <Check className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (sourceCurrency !== "ARS") {
                      setSourceCurrency("ARS");
                      if (numBase > 0 && dolarRate > 0) {
                        setBasePrice(String(Math.round(numBase * dolarRate)));
                      }
                    }
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all border ${
                    sourceCurrency === "ARS"
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <span>🇦🇷 Pesos (ARS)</span>
                  {sourceCurrency === "ARS" && <Check className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div>
                <label className="label-sm">
                  Precio Base de Oferta ({sourceCurrency === "USD" ? "u$d sin recargo" : "$ sin recargo"}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">
                    {sourceCurrency === "USD" ? "u$d" : "$"}
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder={sourceCurrency === "USD" ? "Ej: 100" : "Ej: 120000"}
                    className="input-base pl-12 font-bold text-base"
                  />
                </div>
              </div>

              {/* Tarjeta de cálculo en vivo */}
              {numBase > 0 && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Precio base ingresado:</span>
                    <span className="font-semibold text-foreground">
                      {sourceCurrency === "USD" ? `u$d ${numBase}` : money(numBase)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Recargo pasarela (+7%):</span>
                    <span className="font-semibold text-foreground">
                      {sourceCurrency === "USD" ? `+u$d ${surchargeAmt}` : `+${money(surchargeAmt)}`}
                    </span>
                  </div>
                  <div className="border-t border-border/60 pt-1.5 flex justify-between items-center">
                    <span className="font-semibold text-foreground">Precio Lista / Mercado Pago (+7%):</span>
                    <span className="font-bold text-foreground">
                      {money(finalArs)} {finalUsd > 0 ? `(u$d ${finalUsd})` : ""}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-emerald-500/10 p-2 rounded-md border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    <span className="font-bold flex items-center gap-1">
                      <Percent className="h-3.5 w-3.5" /> Precio con {discPct}% OFF Transferencia:
                    </span>
                    <span className="font-bold text-sm tabular-nums">
                      {money(tPrice)}
                    </span>
                  </div>
                  {sourceCurrency === "USD" && (
                    <p className="text-[10px] text-muted-foreground text-right pt-0.5">
                      Cotización aplicada: ${dolarRate} ARS/USD
                    </p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="label-sm">Foto de la Oferta (Subí la foto creada con IA o arrastrá el archivo)</label>
              <ImageDropzone
                value={comboImage}
                onChange={(url) => setComboImage(url)}
                bucket="storage-images"
                folder="combos"
                label="Arrastrá la foto generada por IA o haz clic para subir"
              />
            </div>

            <div>
              <label className="label-sm">Descripción o lo que incluye la oferta (opcional)</label>
              <textarea
                value={comboSubtitle}
                onChange={(e) => setComboSubtitle(e.target.value)}
                placeholder="Ej: Incluye 10 productos de bazar surtidos + envío sin cargo..."
                className="input-base min-h-[90px] resize-y text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" onClick={resetForm} className="btn-base bg-muted text-foreground hover:bg-muted/70">
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSaveCombo()}
              disabled={saving || numBase <= 0}
              className="btn-base bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Guardando..." : "Publicar Oferta del Día"}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Combos Existentes */}
      {loadingBanners ? (
        <p className="text-xs text-muted-foreground text-center py-8">Cargando ofertas...</p>
      ) : banners.length === 0 ? (
        <div className="py-10 text-center border border-dashed rounded-2xl border-border bg-card/40 space-y-2">
          <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Todavía no tenés ofertas de combos cargadas.</p>
          <button
            onClick={() => {
              resetForm();
              setCreating(true);
            }}
            className="btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90"
          >
            Crear primera oferta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b, idx) => {
            const bPrice = toNumber(b.precio);
            const bDiscPct = 7;
            const bTransfer = transferPrice(bPrice, bDiscPct);
            const isUsd = String(b.moneda_base ?? "").toUpperCase() === "USD";

            return (
              <div
                key={b.id ?? idx}
                className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs hover:border-primary/40 transition-all"
              >
                <img
                  src={imageUrl(b.imagen_url) || FALLBACK_IMAGE}
                  alt={b.titulo ?? ""}
                  className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-contain p-1.5 bg-surface border border-border shrink-0"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Oferta del Día
                    </span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      {isUsd ? "Base USD" : "Base ARS"}
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-foreground truncate">{b.titulo}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{b.subtitulo}</p>

                  <div className="pt-1 space-y-0.5">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-lg font-bold text-primary tabular-nums">
                        {money(bTransfer)}
                      </span>
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                        {bDiscPct}% OFF Transf.
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      o <span className="font-semibold text-foreground/80">{money(bPrice)}</span> con Mercado Pago
                      {b.precio_usd ? ` (u$d ${b.precio_usd})` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleEditClick(b)}
                      className="btn-base bg-muted hover:bg-muted/80 text-foreground text-xs py-1 px-2.5 flex items-center gap-1"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                    <button
                      onClick={() => void handleDeleteCombo(String(b.id ?? idx), b.titulo ?? "Combo")}
                      className="btn-base bg-destructive/10 text-destructive hover:bg-destructive hover:text-white text-xs py-1 px-2.5 flex items-center gap-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Eliminar
                    </button>
                    <Link
                      to="/combo/$index"
                      params={{ index: String(idx) }}
                      className="btn-base border border-border text-xs py-1 px-2.5 text-muted-foreground hover:text-foreground ml-auto"
                    >
                      Ver en tienda →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function OfertasDelDiaPanel({
  products,
  initialBanners = [],
  userEmail,
  userToken,
  onRefresh,
  dolarRate = 1500,
  roundingIncrement = 10,
  markupPercentage = 0,
}: {
  products: Product[];
  initialBanners?: Banner[];
  userEmail: string;
  userToken: string;
  onRefresh: () => Promise<void>;
  dolarRate?: number;
  roundingIncrement?: number;
  markupPercentage?: number;
}) {
  const [subTab, setSubTab] = useState<"activas" | "combos" | "agregar">("activas");
  const [search, setSearch] = useState("");
  const [clearingAll, setClearingAll] = useState(false);

  const activeOffers = useMemo(() => {
    return products.filter((p) => String(p.oferta ?? "").trim().toUpperCase() === "SI");
  }, [products]);

  const filteredActiveOffers = useMemo(() => {
    if (!search.trim()) return activeOffers;
    const q = search.toLowerCase();
    return activeOffers.filter(
      (p) =>
        String(p.nombre ?? "").toLowerCase().includes(q) ||
        String(p.categoria ?? "").toLowerCase().includes(q)
    );
  }, [activeOffers, search]);

  const candidateProducts = useMemo(() => {
    const nonOffers = products.filter((p) => String(p.oferta ?? "").trim().toUpperCase() !== "SI");
    if (!search.trim()) return nonOffers;
    const q = search.toLowerCase();
    return nonOffers.filter(
      (p) =>
        String(p.nombre ?? "").toLowerCase().includes(q) ||
        String(p.categoria ?? "").toLowerCase().includes(q)
    );
  }, [products, search]);

  async function handleClearAllOffers() {
    if (activeOffers.length === 0) return;
    if (!confirm(`¿Seguro que querés quitar la etiqueta de Oferta del Día de los ${activeOffers.length} productos en oferta?`)) return;
    setClearingAll(true);
    try {
      let count = 0;
      for (const p of activeOffers) {
        const input = productToInput(p);
        input.oferta = "NO";
        await upsertAdminProduct({ data: { email: userEmail, token: userToken, product: input } });
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

  return (
    <div className="space-y-6">
      {/* Banner promocional admin */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card p-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/20 px-2.5 py-1 text-xs font-bold text-primary flex items-center gap-1 uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5 fill-primary" /> Panel de Ofertas del Día
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 border border-emerald-500/20">
                {activeOffers.length} {activeOffers.length === 1 ? "oferta activa" : "ofertas activas"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground">Gestioná los Productos en Promoción</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
              Los productos marcados en este panel se mostrarán inmediatamente en la sección{" "}
              <strong className="text-primary">"Ofertas del Día"</strong> de la tienda con su precio de lista tachado y el distintivo de descuento.
            </p>
          </div>

          {activeOffers.length > 0 && (
            <button
              onClick={() => void handleClearAllOffers()}
              disabled={clearingAll}
              className="btn-base bg-destructive/10 text-destructive hover:bg-destructive hover:text-white text-xs font-semibold px-4 py-2 flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {clearingAll ? "Desactivando..." : "Desactivar todas las ofertas"}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs de ofertas */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border flex-wrap">
          <button
            onClick={() => { setSubTab("activas"); setSearch(""); }}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === "activas"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-primary fill-primary/20" />
            Ofertas por Producto
            <span className="rounded-full bg-primary/10 text-primary text-[10px] px-1.5 py-0.2 font-bold">
              {activeOffers.length}
            </span>
          </button>
          <button
            onClick={() => { setSubTab("combos"); setSearch(""); }}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === "combos"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Armador de Combos & Packs
          </button>
          <button
            onClick={() => { setSubTab("agregar"); setSearch(""); }}
            className={`rounded-lg px-3.5 py-2 text-xs font-bold transition-all flex items-center gap-1.5 ${
              subTab === "agregar"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Plus className="h-3.5 w-3.5 text-primary" />
            Poner Producto en Oferta
            <span className="rounded-full bg-muted text-muted-foreground text-[10px] px-1.5 py-0.2 font-bold">
              {candidateProducts.length}
            </span>
          </button>
        </div>

        {/* Buscador dentro de panel */}
        {subTab !== "combos" && (
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={subTab === "activas" ? "Buscar entre ofertas..." : "Buscar producto del catálogo..."}
              className="input-base text-xs pl-9 py-2"
            />
          </div>
        )}
      </div>

      {/* Contenido subtab */}
      {subTab === "combos" ? (
        <ComboPanelBoundary>
          <ComboBuilderPanel
            initialBanners={initialBanners}
            userEmail={userEmail}
            userToken={userToken}
            onRefresh={onRefresh}
            dolarRate={dolarRate}
            roundingIncrement={roundingIncrement}
            markupPercentage={markupPercentage}
          />
        </ComboPanelBoundary>
      ) : subTab === "activas" ? (
        filteredActiveOffers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center rounded-2xl border border-dashed border-border bg-card/50">
            <Flame className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground font-medium">
              {search ? "No hay ofertas activas que coincidan con la búsqueda." : "No tenés ofertas del día activas."}
            </p>
            <button
              onClick={() => { setSubTab("agregar"); setSearch(""); }}
              className="btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90 mt-1 flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Poner productos en oferta
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredActiveOffers.map((p) => (
              <ActiveOfferCard
                key={String(p.id)}
                product={p}
                userEmail={userEmail}
                userToken={userToken}
                onSaved={onRefresh}
              />
            ))}
          </div>
        )
      ) : (
        candidateProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-center rounded-2xl border border-dashed border-border bg-card/50">
            <Check className="h-10 w-10 text-emerald-500/50" />
            <p className="text-sm text-muted-foreground font-medium">
              {search ? "No se encontraron productos en el catálogo." : "¡Todos los productos ya están cargados como oferta!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {candidateProducts.map((p) => (
              <CandidateOfferCard
                key={String(p.id)}
                product={p}
                userEmail={userEmail}
                userToken={userToken}
                onSaved={onRefresh}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Página principal                                         */
/* ───────────────────────────────────────────────────────── */

function AdminProductosPage() {
  const { data: storeData } = useSuspenseQuery(storeQueryOptions);
  const { config, banners: initialBanners } = storeData;
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ProductInput | null>(null);
  const [priceModalProduct, setPriceModalProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "ofertas">("todos");
  const [dolarRate, setDolarRate] = useState<number>(1500);
  const [roundingIncrement, setRoundingIncrement] = useState<number>(10);
  const [markupPercentage, setMarkupPercentage] = useState<number>(0);

  const userEmail = user?.email ?? "";
  const userToken = session?.access_token ?? "";
  const userId = user?.id;

  async function loadProducts(isInitial = false) {
    if (isInitial || products.length === 0) {
      setLoading(true);
    }
    setError("");
    try {
      const email = user?.email ?? "";
      const token = session?.access_token ?? "";
      const res = await getAdminProducts({ data: { email, token } });
      if (res.error) {
        if (products.length === 0) {
          setError(res.error);
        } else {
          toast.error(res.error);
        }
        if (res.error.toLowerCase().includes("acceso denegado")) {
          setIsAuthorized(false);
          void navigate({ to: "/", replace: true });
        }
      } else {
        setIsAuthorized(true);
        setProducts(res.products);
        if (res.dolarRate) setDolarRate(res.dolarRate);
        if (res.roundingIncrement) setRoundingIncrement(res.roundingIncrement);
        if (res.markupPercentage !== undefined) setMarkupPercentage(res.markupPercentage);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar.";
      if (products.length === 0) {
        setError(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!userId) {
        void navigate({ to: "/", replace: true });
      } else {
        void loadProducts(true);
      }
    }
  }, [authLoading, userId]);

  async function handleDelete(id: string) {
    if (!confirm("¿Seguro que querés eliminar este producto? Se borrarán también sus variantes.")) return;
    setDeletingId(id);
    try {
      const res = await deleteAdminProduct({ data: { email: userEmail, token: userToken, productId: id } });
      if (res.error) alert(res.error);
      else setProducts((prev) => prev.filter((p) => String(p.id) !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = products.filter((p) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      String(p.nombre ?? "").toLowerCase().includes(term) ||
      String(p.categoria ?? "").toLowerCase().includes(term)
    );
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedVariants, setExpandedVariants] = useState<Record<string, boolean>>({});
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const ADMIN_PAGE_SIZE = 20;
  const [adminPage, setAdminPage] = useState(1);
  // Resetear página al cambiar el buscador
  useEffect(() => { setAdminPage(1); }, [search]);

  const adminTotalPages = Math.max(1, Math.ceil(filtered.length / ADMIN_PAGE_SIZE));
  const paginatedFiltered = filtered.slice((adminPage - 1) * ADMIN_PAGE_SIZE, adminPage * ADMIN_PAGE_SIZE);

  const toggleSelectAll = () => {
    const allFilteredIds = paginatedFiltered.map((p) => String(p.id ?? ""));
    const allSelected = allFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleExpandVariants = (id: string) => {
    setExpandedVariants((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  async function handleBulkStock(stock: "SI" | "NO") {
    if (selectedIds.length === 0) return;
    setBulkUpdating(true);
    try {
      const res = await bulkUpdateAdminStock({
        data: { email: userEmail, token: userToken, productIds: selectedIds, stock },
      });
      if (res.error) {
        toast.error(res.error);
      } else {
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

  async function handleToggleVariantStock(variantId: string, currentStock: string) {
    const nextStock = String(currentStock ?? "SI").toUpperCase() === "NO" ? "SI" : "NO";
    try {
      const res = await updateVariantStock({
        data: { email: userEmail, token: userToken, variantId, stock: nextStock },
      });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`Variante actualizada a "${nextStock === "SI" ? "Con stock" : "Sin stock"}".`);
        await loadProducts();
      }
    } catch {
      toast.error("Error al actualizar variante.");
    }
  }

  const activeOffersCount = products.filter(
    (p) => String(p.oferta ?? "").trim().toUpperCase() === "SI"
  ).length;

  if (authLoading || !user || isAuthorized === false) return null;

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-3 py-4 sm:px-6 sm:py-8">
        <AdminHeader
          title="Productos y Ofertas"
          subtitle="Gestión de catálogo, precios y promociones de la tienda."
          currentRoute="productos"
          actions={
            <button
              onClick={() => setModal(emptyProduct())}
              className="btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold sm:px-4 sm:py-2 sm:text-sm"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Nuevo producto</span>
            </button>
          }
        />

        {/* Navigation Tabs Interas (Catálogo vs Ofertas) */}
        <div className="mt-4 flex border-b border-border">
          <button
            onClick={() => setActiveTab("todos")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:py-3 sm:text-sm ${
              activeTab === "todos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <PackagePlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>Catálogo General</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] sm:text-xs font-semibold">
              {products.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("ofertas")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-bold transition-all sm:px-4 sm:py-3 sm:text-sm ${
              activeTab === "ofertas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary fill-primary/20" />
            <span>Ofertas del Día</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold ${
                activeOffersCount > 0
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {activeOffersCount}
            </span>
          </button>
        </div>

        {/* Estado */}
        {loading && products.length === 0 && (
          <p className="mt-8 text-center text-sm text-muted-foreground">Cargando productos...</p>
        )}
        {error && products.length === 0 && (
          <div className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {(!loading || products.length > 0) && (
          <div className="mt-6">
            {activeTab === "ofertas" ? (
              <OfertasDelDiaPanel
                products={products}
                initialBanners={initialBanners}
                userEmail={userEmail}
                userToken={userToken}
                onRefresh={loadProducts}
                dolarRate={dolarRate}
                roundingIncrement={roundingIncrement}
                markupPercentage={markupPercentage}
              />
            ) : (
              <div className="space-y-6">
                {/* Buscador */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <input
                    className="input-base w-full max-w-sm"
                    placeholder="Buscar por nombre o categoría..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {filtered.length > 0 && (
                    <p className="text-xs text-muted-foreground shrink-0">
                      {filtered.length} producto{filtered.length !== 1 ? "s" : ""}
                      {adminTotalPages > 1 && (
                        <span className="ml-1 text-muted-foreground/70">
                          — pág. {adminPage}/{adminTotalPages}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Tabla de productos */}
                <div className="overflow-x-auto rounded-2xl border border-border bg-card">
                  {filtered.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-16 text-center">
                      <PackagePlus className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        {search ? "Ningún producto coincide con la búsqueda." : "Todavía no hay productos cargados."}
                      </p>
                      {!search && (
                        <button
                          onClick={() => setModal(emptyProduct())}
                          className="btn-base bg-primary text-primary-foreground hover:opacity-90 mt-2"
                        >
                          Crear primer producto
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th className="px-3 py-3 text-center w-10">
                            <input
                              type="checkbox"
                              checked={paginatedFiltered.length > 0 && paginatedFiltered.every((p) => selectedIds.includes(String(p.id)))}
                              onChange={toggleSelectAll}
                              className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
                              title="Seleccionar todos en esta página"
                            />
                          </th>
                          <th className="px-3 py-3 text-left font-semibold text-muted-foreground sm:px-4">Imagen</th>
                          <th className="px-3 py-3 text-left font-semibold text-muted-foreground sm:px-4">Nombre</th>
                          <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">Categoría</th>
                          <th className="hidden px-4 py-3 text-right font-semibold text-muted-foreground sm:table-cell">Precio</th>
                          <th className="px-3 py-3 text-center font-semibold text-muted-foreground sm:px-4">Estado</th>
                          <th className="px-3 py-3 text-right font-semibold text-muted-foreground sm:px-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {paginatedFiltered.map((p) => {
                          const pid = String(p.id ?? "");
                          const isOffer = String(p.oferta ?? "").trim().toUpperCase() === "SI";
                          const isSelected = selectedIds.includes(pid);
                          const isExpanded = Boolean(expandedVariants[pid]);
                          const variantsList = p.variants ?? [];

                          return (
                            <Fragment key={pid}>
                              <tr className={`hover:bg-muted/20 transition-colors ${isSelected ? "bg-primary/5" : ""}`}>
                                <td className="px-3 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelectOne(pid)}
                                    className="h-4 w-4 rounded border-border text-primary accent-primary cursor-pointer"
                                  />
                                </td>
                                <td
                                  className="px-3 py-3 sm:px-4 cursor-pointer"
                                  onClick={() => setModal(productToInput(p))}
                                >
                                  <img
                                    src={p.imagen_url || FALLBACK_IMAGE}
                                    alt={p.nombre}
                                    className="h-10 w-10 rounded-lg object-cover hover:opacity-80 transition-opacity"
                                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                  />
                                </td>
                                <td className="px-3 py-3 sm:px-4 font-medium max-w-[180px] sm:max-w-none">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap cursor-pointer hover:text-primary transition-colors" onClick={() => setModal(productToInput(p))}>
                                      <span>{p.nombre}</span>
                                      {isOffer && (
                                        <span className="rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 border border-primary/20 shrink-0">
                                          <Flame className="h-3 w-3 fill-primary" /> Oferta
                                        </span>
                                      )}
                                      {(() => {
                                        const r = waOnlyReasonOf(p as unknown as Record<string, unknown>);
                                        if (!r) return null;
                                        return (
                                          <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 border border-emerald-500/20 shrink-0">
                                            💬 WA Only
                                          </span>
                                        );
                                      })()}
                                    </div>
                                    
                                    {/* Precio en Celular */}
                                    <div className="text-xs font-bold text-primary sm:hidden">
                                      {(() => {
                                        const r = waOnlyReasonOf(p as unknown as Record<string, unknown>);
                                        const isHidden = r ? WA_ONLY_CONFIG[r]?.hidePrice : false;
                                        if (isHidden || !p.precio || toNumber(p.precio) <= 0) {
                                          return <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">💬 Por WhatsApp</span>;
                                        }
                                        if (isOffer && p.precio_oferta) {
                                          return (
                                            <span className="flex items-center gap-1">
                                              <span>{money(p.precio_oferta)}</span>
                                              <span className="line-through text-[10px] text-muted-foreground font-normal">{money(p.precio)}</span>
                                            </span>
                                          );
                                        }
                                        return <span>{money(p.precio)}</span>;
                                      })()}
                                    </div>

                                    {/* Botón para desplegar variantes de colores */}
                                    {variantsList.length > 0 && (
                                      <div className="mt-0.5">
                                        <button
                                          type="button"
                                          onClick={() => toggleExpandVariants(pid)}
                                          className="inline-flex items-center gap-1 rounded-md bg-muted/80 hover:bg-primary/20 hover:text-primary px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors"
                                        >
                                          <span>🎨 {variantsList.length} colores</span>
                                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{p.categoria}</td>
                                <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                                  {(() => {
                                    const r = waOnlyReasonOf(p as unknown as Record<string, unknown>);
                                    const isHidden = r ? WA_ONLY_CONFIG[r]?.hidePrice : false;
                                    if (isHidden || !p.precio || toNumber(p.precio) <= 0) {
                                      return <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">💬 Por WhatsApp</span>;
                                    }
                                    if (isOffer && p.precio_oferta) {
                                      return (
                                        <div className="flex flex-col items-end">
                                          <span className="font-bold text-primary">{money(p.precio_oferta)}</span>
                                          <span className="line-through text-[11px] text-muted-foreground">{money(p.precio)}</span>
                                        </div>
                                      );
                                    }
                                    return money(p.precio);
                                  })()}
                                </td>
                                <td className="px-3 py-3 sm:px-4 text-center">
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${String(p.stock ?? "").toUpperCase() === "NO" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                                    {String(p.stock ?? "SI").toUpperCase() === "NO" ? "Sin stock" : "Con stock"}
                                  </span>
                                </td>
                                <td className="px-3 py-3 sm:px-4">
                                  <div className="flex items-center justify-end gap-1 sm:gap-1.5">
                                    <button
                                      onClick={() => setPriceModalProduct(p)}
                                      className="rounded-lg p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                                      title="Editar precio"
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => setModal(productToInput(p))}
                                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                      title="Editar datos del producto"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => void handleDelete(pid)}
                                      disabled={deletingId === pid}
                                      className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Sub-fila de Variantes de Color */}
                              {isExpanded && variantsList.length > 0 && (
                                <tr className="bg-muted/30">
                                  <td colSpan={7} className="px-4 py-3 border-t border-dashed border-border/80">
                                    <div className="space-y-2">
                                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Variantes de color ({variantsList.length}):
                                      </p>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                        {variantsList.map((v) => {
                                          const isVarNoStock = String(v.stock ?? "SI").toUpperCase() === "NO";
                                          return (
                                            <div
                                              key={v.id}
                                              className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2 px-3 text-xs shadow-xs"
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                {v.imagen_url && (
                                                  <img
                                                    src={v.imagen_url}
                                                    alt={v.color}
                                                    className="h-7 w-7 rounded-lg object-cover border border-border shrink-0"
                                                    onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                                  />
                                                )}
                                                <div className="min-w-0">
                                                  <p className="font-bold text-foreground truncate">{v.color}</p>
                                                  <p className="text-[10px] text-muted-foreground">{money(v.precio)}</p>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => void handleToggleVariantStock(v.id, String(v.stock ?? "SI"))}
                                                className={`rounded-full px-2.5 py-1 text-[10px] font-bold transition-all shrink-0 ${
                                                  isVarNoStock
                                                    ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
                                                    : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20"
                                                }`}
                                              >
                                                {isVarNoStock ? "Sin stock" : "Con stock"}
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </Fragment>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Paginación admin */}
                    {adminTotalPages > 1 && (
                      <div className="flex items-center justify-center gap-1.5 flex-wrap border-t border-border px-4 py-3 bg-muted/20">
                        <button
                          onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                          disabled={adminPage === 1}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          ← Anterior
                        </button>
                        {Array.from({ length: adminTotalPages }, (_, i) => i + 1)
                          .filter((n) => n === 1 || n === adminTotalPages || Math.abs(n - adminPage) <= 2)
                          .reduce<(number | "...")[]>((acc, n, idx, arr) => {
                            if (idx > 0 && (arr[idx - 1] as number) < n - 1) acc.push("...");
                            acc.push(n);
                            return acc;
                          }, [])
                          .map((item, idx) =>
                            item === "..." ? (
                              <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-xs">…</span>
                            ) : (
                              <button
                                key={item}
                                onClick={() => setAdminPage(item as number)}
                                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                                  adminPage === item
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                {item}
                              </button>
                            )
                          )}
                        <button
                          onClick={() => setAdminPage((p) => Math.min(adminTotalPages, p + 1))}
                          disabled={adminPage === adminTotalPages}
                          className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          Siguiente →
                        </button>
                      </div>
                    )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barra Flotante de Acciones Masivas */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 rounded-2xl border border-border bg-card/95 backdrop-blur-md px-3.5 py-2.5 sm:px-5 sm:py-3 shadow-2xl max-w-[95vw]">
          <span className="text-xs font-bold text-foreground shrink-0">
            {selectedIds.length} {selectedIds.length === 1 ? "seleccionado" : "seleccionados"}
          </span>
          <div className="h-4 w-px bg-border shrink-0" />
          <button
            onClick={() => void handleBulkStock("SI")}
            disabled={bulkUpdating}
            className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3 flex items-center gap-1 shrink-0 disabled:opacity-50"
          >
            🟢 Con stock
          </button>
          <button
            onClick={() => void handleBulkStock("NO")}
            disabled={bulkUpdating}
            className="btn-base bg-red-600 hover:bg-red-700 text-white text-xs py-1.5 px-3 flex items-center gap-1 shrink-0 disabled:opacity-50"
          >
            🔴 Sin stock
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted shrink-0"
            title="Deseleccionar todos"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <SiteFooter config={config} />

      {/* Modal de Producto General */}
      {modal && (
        <ProductModal
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={() => void loadProducts()}
          onOpenPriceModal={(formInput) => {
            setModal(null);
            const found = products.find((pr) => String(pr.id) === String(formInput.id));
            if (found) {
              setPriceModalProduct(found);
            } else {
              setPriceModalProduct(formInput as unknown as Product);
            }
          }}
          userEmail={userEmail}
          userToken={userToken}
          dolarRate={dolarRate}
          roundingIncrement={roundingIncrement}
          markupPercentage={markupPercentage}
        />
      )}

      {/* Modal Dedicado de Edición de Precios */}
      {priceModalProduct && (
        <PriceModal
          product={priceModalProduct}
          onClose={() => setPriceModalProduct(null)}
          onSaved={() => {
            setPriceModalProduct(null);
            void loadProducts();
          }}
          userEmail={userEmail}
          userToken={userToken}
          dolarRate={dolarRate}
          roundingIncrement={roundingIncrement}
          markupPercentage={markupPercentage}
        />
      )}
    </div>
  );
}
