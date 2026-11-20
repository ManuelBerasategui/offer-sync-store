import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, RefreshCw, Star, Trash2, Undo2 } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { AdminHeader } from "@/components/AdminHeader";
import { storeQueryOptions } from "@/lib/store-query";
import { useAuth } from "@/hooks/useAuth";
import { compressImageFile } from "@/lib/image-compressor";
import { uploadAdminProductImage } from "@/lib/products.functions";
import {
  getMallasFotos,
  setMallasFotos,
  MALLAS_PRODUCT_ID,
  type MallaFoto,
} from "@/lib/mallas.functions";
import { fotoCodigo, thumbnailUrl, onImageError, FALLBACK_IMAGE } from "@/lib/store";

export const Route = createFileRoute("/admin/mallas")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [{ title: "Fotos de mallas — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminMallasPage,
});

/** Subidas en paralelo, de a pocas para no saturar el servidor. */
const UPLOAD_CONCURRENCY = 3;

function AdminMallasPage() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const { user, session, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [fotos, setFotos] = useState<MallaFoto[]>([]);
  const [removed, setRemoved] = useState<MallaFoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const userId = user?.id;
  const auth = { email: user?.email ?? "", token: session?.access_token ?? "" };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getMallasFotos({ data: auth });
      if (res.error) {
        if (res.error.toLowerCase().includes("acceso denegado")) {
          setIsAuthorized(false);
          return;
        }
        setError(res.error);
        setIsAuthorized(true);
        return;
      }
      setIsAuthorized(true);
      setFotos(res.fotos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las fotos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!userId) {
      void navigate({ to: "/", replace: true });
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId]);

  /** Guarda la lista completa; si falla, vuelve a la anterior. */
  const save = async (next: MallaFoto[], okMsg: string): Promise<boolean> => {
    const prev = fotos;
    setFotos(next);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const res = await setMallasFotos({ data: { ...auth, fotos: next.map((f) => f.url) } });
      if (res.error) {
        setFotos(prev);
        setError(res.error);
        return false;
      }
      setNotice(okMsg);
      return true;
    } catch (err) {
      setFotos(prev);
      setError(err instanceof Error ? err.message : "No se pudo guardar.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const bajar = async (foto: MallaFoto) => {
    if (fotos.length <= 1) {
      setError("Tiene que quedar al menos una foto.");
      return;
    }
    const ok = await save(
      fotos.filter((f) => f.url !== foto.url),
      'Modelo bajado de la tienda. Podés volver a subirlo desde "Bajados".',
    );
    if (ok) setRemoved((r) => [foto, ...r.filter((f) => f.url !== foto.url)]);
  };

  const volverASubir = async (foto: MallaFoto) => {
    const ok = await save([...fotos, foto], "Modelo vuelto a la tienda.");
    if (ok) setRemoved((r) => r.filter((f) => f.url !== foto.url));
  };

  const hacerPrincipal = (foto: MallaFoto) =>
    void save([foto, ...fotos.filter((f) => f.url !== foto.url)], "Foto principal cambiada.");

  const subir = async (files: File[]) => {
    const imgs = files.filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) {
      setError("Elegí fotos (JPG, PNG o WebP).");
      return;
    }
    setError("");
    setNotice("");
    setProgress({ done: 0, total: imgs.length });
    const subidas: MallaFoto[] = [];
    const fallidas: string[] = [];
    let cursor = 0;
    const worker = async () => {
      while (cursor < imgs.length) {
        const file = imgs[cursor++]!;
        try {
          const compressed = await compressImageFile(file, {
            maxWidth: 900,
            maxHeight: 900,
            quality: 0.8,
          });
          const res = await uploadAdminProductImage({
            data: {
              ...auth,
              filename: `products/${crypto.randomUUID()}.webp`,
              base64: compressed.base64,
              bucket: "storage-images",
              contentType: "image/webp",
            },
          });
          if (res.publicUrl)
            subidas.push({ url: res.publicUrl, codigo: fotoCodigo(res.publicUrl) });
          else fallidas.push(file.name);
        } catch {
          fallidas.push(file.name);
        }
        setProgress((p) => (p ? { ...p, done: p.done + 1 } : p));
      }
    };
    await Promise.all(Array.from({ length: Math.min(UPLOAD_CONCURRENCY, imgs.length) }, worker));
    setProgress(null);
    if (subidas.length > 0) {
      await save(
        [...fotos, ...subidas],
        `${subidas.length} modelo${subidas.length !== 1 ? "s" : ""} nuevo${subidas.length !== 1 ? "s" : ""} en la tienda.`,
      );
    }
    if (fallidas.length > 0) {
      setError(`No se pudieron subir: ${fallidas.join(", ")}`);
    }
  };

  if (!authLoading && (!user || isAuthorized === false)) {
    if (typeof window !== "undefined") window.location.replace("/");
    return null;
  }

  if (authLoading || isAuthorized === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const busy = saving || progress !== null;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-3 py-4 sm:px-6 sm:py-8">
        <AdminHeader
          title="Fotos de mallas"
          subtitle="Cada foto es un modelo que el cliente puede elegir. Subí los nuevos y bajá los que no tienen stock."
          currentRoute="mallas"
          actions={
            <button
              onClick={() => void load()}
              disabled={loading || busy}
              className="btn-base border border-border bg-surface hover:border-primary flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-foreground sm:px-4 sm:py-2 sm:text-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Actualizar</span>
            </button>
          }
        />

        {/* Subir */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (!busy && e.dataTransfer.files.length > 0)
              void subir(Array.from(e.dataTransfer.files));
          }}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center transition ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-surface"
          }`}
        >
          <ImagePlus className="h-8 w-8 text-primary" />
          <p className="text-sm font-bold text-foreground">Subir modelos nuevos</p>
          <p className="text-xs text-muted-foreground">
            Arrastrá las fotos acá o tocá el botón. Podés elegir varias juntas.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            className="btn-base mt-1 bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {progress ? `Subiendo ${progress.done}/${progress.total}…` : "Elegir fotos"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              e.target.value = "";
              if (files.length > 0) void subir(files);
            }}
          />
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive"
          >
            {error}
          </p>
        )}
        {notice && !error && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400"
          >
            {notice}
          </p>
        )}

        {/* En la tienda */}
        <div className="mt-6 flex items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">En la tienda ({fotos.length})</h2>
          <a
            href={`/producto/${MALLAS_PRODUCT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-primary hover:underline"
          >
            Ver el producto →
          </a>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          El número es el que ve el cliente; el código (Cód) es el que aparece en la orden y no
          cambia aunque saques o agregues fotos.
        </p>

        {loading ? (
          <div className="mt-6 flex justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {fotos.map((f, i) => (
              <li key={f.url} className="overflow-hidden rounded-xl border border-border bg-card">
                <div className="relative aspect-square bg-surface">
                  <img
                    src={thumbnailUrl(f.url, "md") || FALLBACK_IMAGE}
                    alt={`Modelo ${i + 1}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={onImageError(f.url)}
                  />
                  <span className="absolute left-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-bold text-foreground">
                    N° {i + 1}
                  </span>
                  {i === 0 && (
                    <span className="absolute right-2 top-2 rounded-md bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      Principal
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5 p-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Cód: {f.codigo}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void bajar(f)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-destructive/40 px-2 py-1.5 text-xs font-bold text-destructive transition hover:bg-destructive/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Sin stock
                  </button>
                  {i > 0 && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => hacerPrincipal(f)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-border px-2 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary disabled:opacity-50"
                    >
                      <Star className="h-3.5 w-3.5" /> Hacer principal
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Bajados en esta sesión: se pueden volver a poner */}
        {removed.length > 0 && (
          <>
            <h2 className="mt-8 text-lg font-bold text-foreground">Bajados ({removed.length})</h2>
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
              {removed.map((f) => (
                <li
                  key={f.url}
                  className="overflow-hidden rounded-xl border border-border bg-card opacity-80"
                >
                  <img
                    src={thumbnailUrl(f.url, "sm") || FALLBACK_IMAGE}
                    alt={`Cód ${f.codigo}`}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full object-cover grayscale"
                    onError={onImageError(f.url)}
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void volverASubir(f)}
                    className="flex w-full items-center justify-center gap-1 px-1 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/10 disabled:opacity-50"
                  >
                    <Undo2 className="h-3 w-3" /> Volver
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
