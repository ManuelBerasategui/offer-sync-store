import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Plus, Pencil, Trash2, X, Upload, ChevronDown, ChevronUp, PackagePlus,
} from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminProducts,
  upsertAdminProduct,
  deleteAdminProduct,
  uploadAdminProductImage,
  type ProductInput,
  type VariantInput,
} from "@/lib/products.functions";
import type { Product } from "@/lib/store";
import { money, toNumber, FALLBACK_IMAGE } from "@/lib/store";

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
/*  Página principal                                         */
/* ───────────────────────────────────────────────────────── */

function AdminProductosPage() {
  const { data: storeData } = useSuspenseQuery(storeQueryOptions);
  const { config } = storeData;
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<ProductInput | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
            <h1 className="mt-2 text-2xl font-bold">Gestión de Productos</h1>
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

        {/* Buscador */}
        <div className="mt-6">
          <input
            className="input-base w-full max-w-sm"
            placeholder="Buscar por nombre o categoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Estado */}
        {loading && <p className="mt-8 text-center text-sm text-muted-foreground">Cargando productos...</p>}
        {error && <div className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

        {/* Tabla de productos */}
        {!loading && !error && (
          <div className="mt-6 overflow-x-auto rounded-2xl border border-border bg-card">
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
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground sm:px-4">Stock</th>
                    <th className="px-3 py-3 text-right font-semibold text-muted-foreground sm:px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
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
                        {p.nombre}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{p.categoria}</td>
                      <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {money(p.precio)}
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
                  ))}
                </tbody>
              </table>
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
