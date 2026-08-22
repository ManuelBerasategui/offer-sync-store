import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Component, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, X, Upload, ChevronDown, ChevronUp, PackagePlus,
  Flame, Sparkles, Percent, Save, Tag, Search, Check, RefreshCw, Zap, TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminProducts,
  upsertAdminProduct,
  deleteAdminProduct,
  uploadAdminProductImage,
  getAdminBanners,
  upsertAdminBanner,
  deleteAdminBanner,
  type ProductInput,
  type VariantInput,
  type BannerInput,
} from "@/lib/products.functions";
import type { Product, Banner } from "@/lib/store";
import { money, toNumber, FALLBACK_IMAGE, imageUrl } from "@/lib/store";

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

function emptyProduct(): ProductInput {
  return {
    nombre: "",
    categoria: "",
    precio: "",
    precio_usd: "",
    precio_oferta: "",
    precio_oferta_usd: "",
    descripcion: "",
    destacado: "NO",
    oferta: "NO",
    stock: "SI",
    descuento: "NO",
    color_predeterminado: "",
    imagen_url: "",
    tipo_talles: "NINGUNO",
    talles_disponibles: [],
    tiers: [],
    variants: [],
  };
}

function productToInput(p: Product): ProductInput {
  const tiers: { units: number; percent: number }[] = [];
  for (const [key, value] of Object.entries(p)) {
    const m = key.match(/^(\d+)\s*unidad/i);
    if (m) {
      const percent = Number(String(value ?? "").replace(/[^0-9.,]/g, "").replace(",", ".")) || 0;
      const units = Number(m[1]);
      if (units > 0 && percent > 0) tiers.push({ units, percent });
    }
  }

  const pRec = p as Record<string, unknown>;
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
    precio_oferta: String(p.precio_oferta ?? ""),
    precio_oferta_usd: String(pRec["precio_oferta_usd"] ?? ""),
    descripcion: String(p.descripcion ?? ""),
    destacado: String(p.destacado ?? "NO"),
    oferta: String(p.oferta ?? "NO"),
    stock: String(p.stock ?? "SI"),
    descuento: String(p.descuento ?? "NO"),
    color_predeterminado: p.color_predeterminado ?? "",
    imagen_url: p.imagen_url ?? "",
    tipo_talles,
    talles_disponibles,
    tiers: tiers.sort((a, b) => a.units - b.units),
    variants: (p.variants ?? []).map((v) => ({
      id: String(v.id ?? ""),
      color: String(v.color ?? ""),
      precio: String(v.precio ?? ""),
      stock: String(v.stock ?? "SI"),
      imagen_url: v.imagen_url ?? "",
      talles_disponibles: v.talles_disponibles ?? [],
    })),
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
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-xs">Subiendo e integrando imagen...</span>
          </div>
        ) : value ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={value}
              alt="Vista previa"
              className="h-24 w-24 rounded-xl object-cover shadow-sm border border-border"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
            <span className="text-xs text-muted-foreground">Clic o arrastrá para cambiar</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-6 w-6 text-primary/70" />
            <span className="text-xs text-center">{label}</span>
          </div>
        )}
      </div>

      {/* Input secundario para pegar enlace directo */}
      <div className="flex items-center gap-2">
        <input
          type="url"
          className="input-base text-xs py-1.5"
          placeholder="O pegá un enlace directo de imagen (https://...)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {errorMsg && <p className="text-xs text-destructive font-semibold">{errorMsg}</p>}
    </div>
  );
}

/* ───────────────────────────────────────────────────────── */
/*  Modal de formulario de producto                         */
/* ───────────────────────────────────────────────────────── */

function ProductModal({
  initial,
  onClose,
  onSaved,
  userEmail,
  userToken,
}: {
  initial: ProductInput;
  onClose: () => void;
  onSaved: () => void;
  userEmail: string;
  userToken: string;
}) {
  const [form, setForm] = useState<ProductInput>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (field: keyof ProductInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const addVariant = () =>
    setForm((prev) => ({
      ...prev,
      variants: [...(prev.variants ?? []), { color: "", precio: "", stock: "SI", imagen_url: "", talles_disponibles: [] }],
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
    const hasPriceUsd = Boolean(form.precio_usd?.trim());
    const hasPriceArs = Boolean(form.precio?.trim());

    if (!hasName || (!hasPriceUsd && !hasPriceArs)) {
      setError("El nombre y al menos un precio (USD o ARS) son obligatorios.");
      return;
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
      <div className="relative my-4 sm:my-8 w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-card shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-4 shrink-0">
          <h2 className="text-base sm:text-lg font-bold">
            {form.id ? "Editar producto" : "Nuevo producto"}
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
              <label className="label-sm">Nombre *</label>
              <input className="input-base" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Nombre del producto" />
            </div>
            <div>
              <label className="label-sm">Categoría</label>
              <input className="input-base" value={form.categoria} onChange={(e) => set("categoria", e.target.value)} placeholder="Ej: Suplementos" />
            </div>
            <div>
              <label className="label-sm">Color predeterminado</label>
              <input className="input-base" value={form.color_predeterminado ?? ""} onChange={(e) => set("color_predeterminado", e.target.value)} placeholder="Ej: Negro" />
            </div>
            <div>
              <label className="label-sm">Precio USD * (u$d)</label>
              <input className="input-base" value={form.precio_usd ?? ""} onChange={(e) => set("precio_usd", e.target.value)} placeholder="Ej: 150" />
            </div>
            <div>
              <label className="label-sm">Precio oferta USD (u$d)</label>
              <input className="input-base" value={form.precio_oferta_usd ?? ""} onChange={(e) => set("precio_oferta_usd", e.target.value)} placeholder="Ej: 120" />
            </div>
            <div>
              <label className="label-sm">Precio ARS (opcional)</label>
              <input className="input-base" value={form.precio} onChange={(e) => set("precio", e.target.value)} placeholder="Ej: 150000" />
            </div>
            <div>
              <label className="label-sm">Precio oferta ARS</label>
              <input className="input-base" value={form.precio_oferta ?? ""} onChange={(e) => set("precio_oferta", e.target.value)} placeholder="Ej: 120000" />
            </div>
            <div className="col-span-1 sm:col-span-2 rounded-xl bg-muted/40 p-3 border border-border/60">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5 text-primary" /> Atajo para precio de oferta:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[10, 15, 20, 25, 30, 40, 50, 70].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        set("oferta", "SI");
                        const baseArs = toNumber(form.precio);
                        const baseUsd = toNumber(form.precio_usd);
                        if (baseArs > 0) {
                          set("precio_oferta", String(Math.round(baseArs * (1 - pct / 100))));
                        }
                        if (baseUsd > 0) {
                          set("precio_oferta_usd", String(Math.round(baseUsd * (1 - pct / 100))));
                        }
                      }}
                      className="rounded-lg bg-primary/10 hover:bg-primary/20 text-primary px-2 py-1 text-xs font-bold transition-all"
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="label-sm">Descripción</label>
              <textarea className="input-base min-h-[80px] resize-y" value={form.descripcion ?? ""} onChange={(e) => set("descripcion", e.target.value)} placeholder="Descripción del producto..." />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            {(["destacado", "oferta", "stock"] as const).map((field) => (
              <label key={field} className="flex cursor-pointer items-center gap-2 text-sm font-medium capitalize">
                <div
                  onClick={() => set(field, form[field] === "SI" ? "NO" : "SI")}
                  className={`relative h-5 w-9 rounded-full transition-colors ${form[field] === "SI" ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${form[field] === "SI" ? "left-4" : "left-0.5"}`} />
                </div>
                {field}
              </label>
            ))}
          </div>

          {/* Configuración de Talles (Zapatillas / Ropa) */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
              Configuración de Talles (Stock por talle)
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  set("tipo_talles", "NINGUNO");
                  set("talles_disponibles", []);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  (form.tipo_talles ?? "NINGUNO") === "NINGUNO"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                Sin talles
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultShoes = ["35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"];
                  set("tipo_talles", "ZAPATILLAS");
                  if (!form.talles_disponibles || form.talles_disponibles.length === 0) {
                    set("talles_disponibles", defaultShoes);
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  form.tipo_talles === "ZAPATILLAS"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                👟 Es Zapatilla
              </button>
              <button
                type="button"
                onClick={() => {
                  const defaultClothes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];
                  set("tipo_talles", "ROPA");
                  if (!form.talles_disponibles || form.talles_disponibles.length === 0) {
                    set("talles_disponibles", defaultClothes);
                  }
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  form.tipo_talles === "ROPA"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-muted"
                }`}
              >
                👕 Es Ropa
              </button>
            </div>

            {form.tipo_talles && form.tipo_talles !== "NINGUNO" && (
              <div className="mt-3 space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Hacé clic en los talles para marcar si están <strong className="text-emerald-600">EN STOCK (verde)</strong> o <strong className="text-muted-foreground">SIN STOCK (gris)</strong>:
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
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
                        className={`h-9 min-w-10 rounded-lg px-2.5 text-xs font-bold transition-all border ${
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
          </div>

          {/* Variantes de color */}
          <div>
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
                      <label className="label-sm">Precio</label>
                      <input className="input-base" value={String(v.precio)} onChange={(e) => updateVariant(i, "precio", e.target.value)} placeholder="Ej: 15000" />
                    </div>
                    <div className="col-span-1 sm:col-span-2">
                      <label className="label-sm">Stock (SI / NO)</label>
                      <input className="input-base" value={String(v.stock ?? "SI")} onChange={(e) => updateVariant(i, "stock", e.target.value)} />
                    </div>
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
          </div>

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
}: {
  product: Product;
  userEmail: string;
  userToken: string;
  onSaved: () => Promise<void>;
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

  const applyPreset = (pct: number) => {
    const baseArs = toNumber(product.precio);
    const baseUsd = toNumber(String((product as Record<string, unknown>)["precio_usd"] ?? ""));
    if (baseArs > 0) setPrecioOferta(String(Math.round(baseArs * (1 - pct / 100))));
    if (baseUsd > 0) setPrecioOfertaUsd(String(Math.round(baseUsd * (1 - pct / 100))));
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
            <span className="text-xs font-semibold text-muted-foreground">ARS:</span>
            <input
              type="text"
              value={precioOferta}
              onChange={(e) => setPrecioOferta(e.target.value)}
              placeholder="Precio ARS"
              className="input-base text-xs py-1.5 w-28 font-bold text-primary"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-muted-foreground">USD:</span>
            <input
              type="text"
              value={precioOfertaUsd}
              onChange={(e) => setPrecioOfertaUsd(e.target.value)}
              placeholder="Precio USD"
              className="input-base text-xs py-1.5 w-24"
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
}: {
  product: Product;
  userEmail: string;
  userToken: string;
  onSaved: () => Promise<void>;
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

  const applyPreset = (pct: number) => {
    const baseArs = toNumber(product.precio);
    const baseUsd = toNumber(String((product as Record<string, unknown>)["precio_usd"] ?? ""));
    if (baseArs > 0) setPrecioOferta(String(Math.round(baseArs * (1 - pct / 100))));
    if (baseUsd > 0) setPrecioOfertaUsd(String(Math.round(baseUsd * (1 - pct / 100))));
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
          <span className="text-[11px] text-muted-foreground font-semibold">{product.categoria}</span>
          <h3 className="font-bold text-sm text-foreground truncate">{product.nombre}</h3>
          <p className="text-xs font-semibold text-primary mt-0.5">Precio lista: {money(product.precio)}</p>
        </div>
      </div>

      <div className="w-full sm:w-auto flex flex-col gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-[11px] text-muted-foreground font-medium">Atajo dto:</span>
          {[10, 15, 20, 25, 30, 50].map((pct) => (
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
          <input
            type="text"
            value={precioOferta}
            onChange={(e) => setPrecioOferta(e.target.value)}
            placeholder="Precio oferta ARS"
            className="input-base text-xs py-1.5 w-32"
          />
          {discountPct > 0 && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md">
              -{discountPct}%
            </span>
          )}
          <button
            onClick={() => void handleActivate()}
            disabled={saving}
            className="btn-base bg-primary text-primary-foreground text-xs py-1.5 px-3 hover:opacity-90 flex items-center gap-1 disabled:opacity-50 ml-auto sm:ml-0"
          >
            <Flame className="h-3.5 w-3.5" /> Poner en Oferta
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
}: {
  userEmail: string;
  userToken: string;
  initialBanners?: Banner[];
  onRefresh: () => Promise<void>;
}) {
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerInput | null>(null);

  // Form State Simplificado
  const [comboTitle, setComboTitle] = useState("");
  const [comboSubtitle, setComboSubtitle] = useState("");
  const [comboPrice, setComboPrice] = useState("");
  const [comboImage, setComboImage] = useState("");
  const [saving, setSaving] = useState(false);

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
    setComboPrice("");
    setComboImage("");
    setCreating(false);
    setEditingBanner(null);
  }

  async function handleSaveCombo() {
    if (!comboTitle.trim() || !comboPrice.trim()) {
      toast.error("Ingresá el nombre y el precio de la oferta.");
      return;
    }

    setSaving(true);
    try {
      const bannerInput: BannerInput = {
        id: editingBanner?.id,
        titulo: comboTitle,
        subtitulo: comboSubtitle,
        imagen_url: comboImage,
        precio: comboPrice,
        activo: "SI",
      };

      const res = await upsertAdminBanner({ data: { email: userEmail, token: userToken, banner: bannerInput } });
      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success(`¡Oferta "${comboTitle}" guardada correctamente!`);
        resetForm();
        await loadBanners();
        await onRefresh();
      }
    } catch {
      toast.error("Error al guardar la oferta.");
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
            Cargá fácilmente la foto generada por IA, el título (ej: "Combo mayorista bazar") y el precio especial para tus ofertas de la tienda.
          </p>
        </div>
        {!creating && (
          <button
            onClick={() => { resetForm(); setCreating(true); }}
            className="btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90 flex items-center gap-1.5 shrink-0"
          >
            <Plus className="h-4 w-4" /> Crear Oferta / Combo
          </button>
        )}
      </div>

      {/* Formulario Simplificado */}
      {creating && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 sm:p-6 shadow-md space-y-5 max-w-2xl mx-auto">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="font-bold text-lg flex items-center gap-2 text-primary">
              <Flame className="h-5 w-5 fill-primary" />
              {editingBanner ? "Editar Oferta / Combo" : "Nueva Oferta del Día (Foto + Precio)"}
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

            <div>
              <label className="label-sm">Precio Especial de Oferta (ARS) *</label>
              <input
                type="text"
                value={comboPrice}
                onChange={(e) => setComboPrice(e.target.value)}
                placeholder="Ej: 120000"
                className="input-base font-bold text-primary text-base"
              />
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
              disabled={saving}
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
            onClick={() => { resetForm(); setCreating(true); }}
            className="btn-base bg-primary text-primary-foreground text-xs py-2 px-4 hover:opacity-90"
          >
            Crear primera oferta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b, idx) => (
            <div key={b.id ?? idx} className="flex flex-col sm:flex-row items-start gap-4 rounded-2xl border border-border bg-card p-4 shadow-xs hover:border-primary/40 transition-all">
              <img
                src={imageUrl(b.imagen_url) || FALLBACK_IMAGE}
                alt={b.titulo ?? ""}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl object-cover border border-border shrink-0"
                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
              />
              <div className="flex-1 min-w-0 space-y-1">
                <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  Oferta del Día
                </span>
                <h4 className="font-bold text-base text-foreground truncate">{b.titulo}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{b.subtitulo}</p>
                <p className="text-lg font-bold text-primary pt-1">{money(b.precio)}</p>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => {
                      setEditingBanner({
                        id: b.id,
                        titulo: b.titulo ?? "",
                        subtitulo: b.subtitulo ?? "",
                        imagen_url: b.imagen_url ?? "",
                        precio: String(b.precio ?? ""),
                        activo: b.activo ?? "SI",
                      });
                      setComboTitle(b.titulo ?? "");
                      setComboSubtitle(b.subtitulo ?? "");
                      setComboPrice(String(b.precio ?? ""));
                      setComboImage(b.imagen_url ?? "");
                      setCreating(true);
                    }}
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
          ))}
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
}: {
  products: Product[];
  initialBanners?: Banner[];
  userEmail: string;
  userToken: string;
  onRefresh: () => Promise<void>;
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"todos" | "ofertas">("todos");

  const userEmail = user?.email ?? "";
  const userToken = session?.access_token ?? "";

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await getAdminProducts({ data: { email: userEmail, token: userToken } });
      if (res.error) {
        setError(res.error);
        if (res.error.toLowerCase().includes("acceso denegado")) {
          setIsAuthorized(false);
          void navigate({ to: "/", replace: true });
        }
      } else {
        setIsAuthorized(true);
        setProducts(res.products);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        void navigate({ to: "/", replace: true });
      } else {
        void loadProducts();
      }
    }
  }, [authLoading, user, session]);

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

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              Panel Admin
            </span>
            <h1 className="mt-2 text-2xl font-bold">Gestión de Productos y Ofertas</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/admin/ordenes"
              className="btn-base bg-muted text-foreground hover:bg-muted/70 text-sm"
            >
              Ver órdenes
            </Link>
            <Link
              to="/admin/configuracion"
              className="btn-base bg-muted text-foreground hover:bg-muted/70 text-sm"
            >
              Configuración
            </Link>
            <button
              onClick={() => setModal(emptyProduct())}
              className="btn-base bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Nuevo producto
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex border-b border-border">
          <button
            onClick={() => setActiveTab("todos")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "todos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <PackagePlus className="h-4 w-4" />
            Catálogo General
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
              {products.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("ofertas")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition-all ${
              activeTab === "ofertas"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Flame className="h-4 w-4 text-primary fill-primary/20" />
            Ofertas del Día
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-bold ${
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
        {loading && <p className="mt-8 text-center text-sm text-muted-foreground">Cargando productos...</p>}
        {error && <div className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        {!loading && !error && (
          <div className="mt-6">
            {activeTab === "ofertas" ? (
              <OfertasDelDiaPanel
                products={products}
                initialBanners={initialBanners}
                userEmail={userEmail}
                userToken={userToken}
                onRefresh={loadProducts}
              />
            ) : (
              <div className="space-y-6">
                {/* Buscador */}
                <div>
                  <input
                    className="input-base w-full max-w-sm"
                    placeholder="Buscar por nombre o categoría..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
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
                    <table className="w-full min-w-[480px] text-sm">
                      <thead className="border-b border-border bg-muted/50">
                        <tr>
                          <th className="px-3 py-3 text-left font-semibold text-muted-foreground sm:px-4">Imagen</th>
                          <th className="px-3 py-3 text-left font-semibold text-muted-foreground sm:px-4">Nombre</th>
                          <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">Categoría</th>
                          <th className="hidden px-4 py-3 text-right font-semibold text-muted-foreground sm:table-cell">Precio</th>
                          <th className="px-3 py-3 text-center font-semibold text-muted-foreground sm:px-4">Estado</th>
                          <th className="px-3 py-3 text-right font-semibold text-muted-foreground sm:px-4">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filtered.map((p) => {
                          const isOffer = String(p.oferta ?? "").trim().toUpperCase() === "SI";
                          return (
                            <tr key={String(p.id)} className="hover:bg-muted/20 transition-colors">
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
                              <td
                                className="px-3 py-3 sm:px-4 font-medium cursor-pointer hover:text-primary transition-colors max-w-[150px] sm:max-w-none truncate sm:whitespace-normal"
                                onClick={() => setModal(productToInput(p))}
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span>{p.nombre}</span>
                                  {isOffer && (
                                    <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold flex items-center gap-0.5 border border-primary/20">
                                      <Flame className="h-3 w-3 fill-primary" /> Oferta
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{p.categoria}</td>
                              <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                                {isOffer && p.precio_oferta ? (
                                  <div className="flex flex-col items-end">
                                    <span className="font-bold text-primary">{money(p.precio_oferta)}</span>
                                    <span className="line-through text-[11px] text-muted-foreground">{money(p.precio)}</span>
                                  </div>
                                ) : (
                                  money(p.precio)
                                )}
                              </td>
                              <td className="px-3 py-3 sm:px-4 text-center">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${String(p.stock ?? "").toUpperCase() === "NO" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                                  {String(p.stock ?? "SI").toUpperCase() === "NO" ? "Sin stock" : "Con stock"}
                                </span>
                              </td>
                              <td className="px-3 py-3 sm:px-4">
                                <div className="flex items-center justify-end gap-1 sm:gap-2">
                                  <button
                                    onClick={() => setModal(productToInput(p))}
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => void handleDelete(String(p.id))}
                                    disabled={deletingId === String(p.id)}
                                    className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-40"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <SiteFooter config={config} />

      {/* Modal */}
      {modal && (
        <ProductModal
          initial={modal}
          onClose={() => setModal(null)}
          onSaved={() => void loadProducts()}
          userEmail={userEmail}
          userToken={userToken}
        />
      )}
    </div>
  );
}
