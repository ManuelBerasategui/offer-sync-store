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
  return {
    id: String(p.id ?? ""),
    nombre: String(p.nombre ?? ""),
    categoria: String(p.categoria ?? ""),
    precio: String(p.precio ?? ""),
    precio_usd: String((p as Record<string, unknown>).precio_usd ?? ""),
    precio_oferta: String(p.precio_oferta ?? ""),
    precio_oferta_usd: String((p as Record<string, unknown>).precio_oferta_usd ?? ""),
    descripcion: String(p.descripcion ?? ""),
    destacado: String(p.destacado ?? "NO"),
    oferta: String(p.oferta ?? "NO"),
    stock: String(p.stock ?? "SI"),
    descuento: String(p.descuento ?? "NO"),
    color_predeterminado: p.color_predeterminado ?? "",
    imagen_url: p.imagen_url ?? "",
    tiers: tiers.sort((a, b) => a.units - b.units),
    variants: (p.variants ?? []).map((v) => ({
      id: String(v.id ?? ""),
      color: String(v.color ?? ""),
      precio: String(v.precio ?? ""),
      stock: String(v.stock ?? "SI"),
      imagen_url: v.imagen_url ?? "",
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
  label = "Arrastrá o hacé clic para subir imagen",
}: {
  value: string;
  onChange: (url: string) => void;
  bucket: string;
  folder: string;
  label?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(filename, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(filename);
      onChange(data.publicUrl);
    } catch (err) {
      console.error("Error al subir imagen:", err);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) void uploadFile(file);
      }}
      onClick={() => inputRef.current?.click()}
      className={`relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
      }`}
      style={{ minHeight: 120 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadFile(f); }}
      />
      {uploading ? (
        <div className="flex flex-col items-center gap-2 text-primary">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-xs">Subiendo...</span>
        </div>
      ) : value ? (
        <div className="flex flex-col items-center gap-2">
          <img src={value} alt="preview" className="h-20 w-20 rounded-lg object-cover" onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }} />
          <span className="text-xs text-muted-foreground">Clic o arrastrá para cambiar</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Upload className="h-6 w-6" />
          <span className="text-xs text-center">{label}</span>
        </div>
      )}
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
      variants: [...(prev.variants ?? []), { color: "", precio: "", stock: "SI", imagen_url: "" }],
    }));

  const removeVariant = (i: number) =>
    setForm((prev) => ({ ...prev, variants: prev.variants?.filter((_, idx) => idx !== i) }));

  const updateVariant = (i: number, field: keyof VariantInput, value: string) =>
    setForm((prev) => ({
      ...prev,
      variants: prev.variants?.map((v, idx) => (idx === i ? { ...v, [field]: value } : v)),
    }));

  const addTier = () =>
    setForm((prev) => ({ ...prev, tiers: [...(prev.tiers ?? []), { units: 0, percent: 0 }] }));

  const removeTier = (i: number) =>
    setForm((prev) => ({ ...prev, tiers: prev.tiers?.filter((_, idx) => idx !== i) }));

  const updateTier = (i: number, field: "units" | "percent", value: number) =>
    setForm((prev) => ({
      ...prev,
      tiers: prev.tiers?.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)),
    }));

  async function handleSave() {
    if (!form.nombre.trim() || !form.precio.trim()) {
      setError("Nombre y precio son obligatorios.");
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-8 w-full max-w-2xl rounded-2xl bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold">
            {form.id ? "Editar producto" : "Nuevo producto"}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-6 px-6 py-5">
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
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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
            <div className="col-span-2">
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
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="label-sm">Color</label>
                      <input className="input-base" value={v.color} onChange={(e) => updateVariant(i, "color", e.target.value)} placeholder="Ej: Rojo" />
                    </div>
                    <div>
                      <label className="label-sm">Precio</label>
                      <input className="input-base" value={String(v.precio)} onChange={(e) => updateVariant(i, "precio", e.target.value)} placeholder="Ej: 15000" />
                    </div>
                    <div className="col-span-2">
                      <label className="label-sm">Stock (SI / NO)</label>
                      <input className="input-base" value={String(v.stock ?? "SI")} onChange={(e) => updateVariant(i, "stock", e.target.value)} />
                    </div>
                  </div>
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
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="number" min={1}
                    className="input-base w-24"
                    value={t.units || ""}
                    onChange={(e) => updateTier(i, "units", Number(e.target.value))}
                    placeholder="Unidades"
                  />
                  <span className="text-sm text-muted-foreground">unidades →</span>
                  <input
                    type="number" min={0} max={100} step={0.5}
                    className="input-base w-24"
                    value={t.percent || ""}
                    onChange={(e) => updateTier(i, "percent", Number(e.target.value))}
                    placeholder="% desc."
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                  <button type="button" onClick={() => removeTier(i)} className="text-destructive hover:opacity-70">
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
        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
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
          <div className="flex items-center gap-3">
            <Link
              to="/admin/ordenes"
              className="btn-base bg-muted text-foreground hover:bg-muted/70 text-sm"
            >
              Ver órdenes
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
            className="input-base max-w-sm"
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
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
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
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Imagen</th>
                    <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nombre</th>
                    <th className="hidden px-4 py-3 text-left font-semibold text-muted-foreground sm:table-cell">Categoría</th>
                    <th className="hidden px-4 py-3 text-right font-semibold text-muted-foreground sm:table-cell">Precio</th>
                    <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Stock</th>
                    <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr key={String(p.id)} className="hover:bg-muted/20 transition-colors">
                      <td
                        className="px-4 py-3 cursor-pointer"
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
                        className="px-4 py-3 font-medium cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setModal(productToInput(p))}
                      >
                        {p.nombre}
                      </td>
                      <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">{p.categoria}</td>
                      <td className="hidden px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                        {money(p.precio)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${String(p.stock ?? "").toUpperCase() === "NO" ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-600"}`}>
                          {String(p.stock ?? "SI").toUpperCase() === "NO" ? "Sin stock" : "Con stock"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
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
