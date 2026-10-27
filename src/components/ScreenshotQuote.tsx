import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState, type ReactNode } from "react";
import { ImageUp, Loader2, RotateCcw } from "lucide-react";

import { compressImageFile } from "@/lib/image-compressor";
import { readAlibabaScreenshot, type QuoteFromScreenshot } from "@/lib/import-ai.functions";
import { track } from "@/lib/analytics";

type Tier = NonNullable<QuoteFromScreenshot["tiers"]>[number];

/** Precio por unidad que corresponde a una cantidad: el rango con mayor mínimo que no supere la cantidad. */
function priceForQty(tiers: Tier[], qty: number): Tier | undefined {
  const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);
  let match = sorted[0];
  for (const t of sorted) if (qty >= t.min_qty) match = t;
  return match;
}

const MAX_FILES = 3;

function rangeLabel(t: Tier) {
  return t.max_qty ? `${t.min_qty}–${t.max_qty} u.` : `${t.min_qty}+ u.`;
}

/**
 * El cliente sube capturas de la publicación de Alibaba (precios y peso suelen estar en lugares distintos,
 * así que acepta varias o agregar una después); la IA lee los precios por cantidad y el peso,
 * y con eso se precarga la calculadora. Pensado para quien no sabe qué precio o peso cargar.
 */
export function ScreenshotQuote({ onShowGuide }: { onShowGuide: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<QuoteFromScreenshot | null>(null);
  const [qty, setQty] = useState("");
  const [peso, setPeso] = useState("");

  // "nueva" reemplaza lo leído; "agregar" completa lo que faltaba (ej: la captura del peso)
  const modeRef = useRef<"nueva" | "agregar">("nueva");

  function pick(mode: "nueva" | "agregar") {
    modeRef.current = mode;
    inputRef.current?.click();
  }

  async function toPayload(file: File) {
    const compressed = await compressImageFile(file, {
      maxWidth: 1400,
      maxHeight: 2400,
      quality: 0.85,
    });
    // El navegador puede no soportar WebP y devolver PNG: tomar el tipo real del data URL
    const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/.exec(compressed.base64);
    if (!match?.[1] || !match[2]) throw new Error("formato");
    return { mediaType: match[1] as "image/webp" | "image/png" | "image/jpeg", data: match[2] };
  }

  async function onFiles(list: FileList | null) {
    const files = Array.from(list ?? []).slice(0, MAX_FILES);
    if (!files.length) return;
    if (files.some((f) => !f.type.startsWith("image/"))) {
      setError("Subí imágenes (capturas de pantalla).");
      return;
    }
    const mode = modeRef.current;
    const prev = mode === "agregar" ? result : null;
    setError("");
    setLoading(true);
    track("import_screenshot_uploaded", { capturas: files.length, modo: mode });
    try {
      const images = await Promise.all(files.map(toPayload));
      const res = await readAlibabaScreenshot({ data: { images } });
      track("import_screenshot_result", {
        ok: res.ok,
        capturas: files.length,
        modo: mode,
        rangos: res.tiers?.length ?? 0,
        con_peso: res.peso_unitario_kg != null,
      });
      if (!res.ok) {
        setError(res.error ?? "No pudimos leer la captura.");
        return;
      }
      // Combinar con lo ya leído: se conservan los precios anteriores y se completa lo que faltaba
      const merged: QuoteFromScreenshot = {
        ok: true,
        producto: prev?.producto || res.producto || null,
        tiers: prev?.tiers?.length ? prev.tiers : (res.tiers ?? []),
        // La conversión de moneda acompaña a los precios que se conservan
        conversion: prev?.tiers?.length ? (prev.conversion ?? null) : (res.conversion ?? null),
        peso_unitario_kg: res.peso_unitario_kg ?? prev?.peso_unitario_kg ?? null,
      };
      setResult(merged);
      if (!prev?.tiers?.length) {
        const firstMin = merged.tiers?.[0]?.min_qty;
        setQty(firstMin ? String(firstMin) : "");
      }
      if (merged.peso_unitario_kg != null) setPeso(String(merged.peso_unitario_kg));
    } catch {
      setError("No pudimos procesar la imagen. Probá con otra captura.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const tiers = useMemo(() => result?.tiers ?? [], [result]);
  const qtyNum = Math.max(0, Math.floor(Number(qty) || 0));
  const pesoNum = Math.max(0, Number(String(peso).replace(",", ".")) || 0);
  const tier = qtyNum ? priceForQty(tiers, qtyNum) : undefined;
  const minQty = tiers[0]?.min_qty ?? 0;
  const belowMin = qtyNum > 0 && qtyNum < minQty;

  function goToCalculator() {
    if (!tier || !qtyNum || !pesoNum) return;
    track("import_screenshot_to_calculator", { cantidad: qtyNum, fob: tier.price_usd });
    void navigate({
      to: "/calculadora",
      search: {
        nombre: result?.producto || "Producto de Alibaba",
        cantidad: qtyNum,
        fob: tier.price_usd,
        peso: pesoNum,
      },
    });
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void onFiles(e.target.files)}
      />

      {!result && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => pick("nueva")}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-8 text-center transition-colors hover:bg-primary/10 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm font-bold text-foreground">Leyendo la captura…</span>
                <span className="text-xs text-muted-foreground">Tarda unos segundos</span>
              </>
            ) : (
              <>
                <ImageUp className="h-8 w-8 text-primary" />
                <span className="text-base font-black uppercase text-foreground">
                  Subir capturas
                </span>
                <span className="text-xs text-muted-foreground">
                  Podés elegir hasta 3 juntas: una con los precios por cantidad y otra con el peso
                </span>
              </>
            )}
          </button>
          {error && <p className="mt-3 text-sm font-medium text-destructive">{error}</p>}
        </>
      )}

      {result && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Leímos esto
          </p>
          {result.producto && (
            <p className="mt-1 text-base font-bold text-foreground">{result.producto}</p>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={`${t.min_qty}-${t.max_qty}`}
                className={`rounded-lg border px-3 py-2 text-center ${
                  tier === t ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <p className="text-[11px] text-muted-foreground">{rangeLabel(t)}</p>
                <p className="text-sm font-bold tabular-nums text-foreground">US$ {t.price_usd}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">
                ¿Cuántas unidades?
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">
                Peso por unidad (kg)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="Ej: 0,15"
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
          </div>

          {belowMin && (
            <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              El proveedor vende desde {minQty} unidades.
            </p>
          )}
          {result.conversion && tiers.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Alibaba mostraba los precios en pesos: los pasamos a dólares con dólar a $
              {result.conversion.cotizacion.toLocaleString("es-AR")}. Para más precisión, poné la
              moneda de Alibaba en USD.
            </p>
          )}

          {tiers.length === 0 && (
            <MissingPiece
              text="Falta la captura de los precios por cantidad (arriba de todo en la publicación)."
              button="Subir captura de los precios"
              loading={loading}
              onClick={() => pick("agregar")}
            />
          )}
          {!pesoNum && (
            <MissingPiece
              text='Falta el peso. Está más abajo, en "Embalaje y entrega" (Packaging & delivery).'
              button="Subir captura del peso"
              loading={loading}
              onClick={() => pick("agregar")}
              extra={
                <button type="button" onClick={onShowGuide} className="font-semibold text-primary">
                  ¿Dónde lo encuentro?
                </button>
              }
            />
          )}
          {error && <p className="mt-2 text-sm font-medium text-destructive">{error}</p>}

          <button
            type="button"
            disabled={!tier || !qtyNum || !pesoNum}
            onClick={goToCalculator}
            className="btn-base grad-urgente mt-4 w-full text-primary-foreground disabled:opacity-50"
          >
            Ver precio puesto en Argentina
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setError("");
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 text-sm font-semibold text-muted-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Empezar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

function MissingPiece({
  text,
  button,
  loading,
  onClick,
  extra,
}: {
  text: string;
  button: string;
  loading: boolean;
  onClick: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-primary/50 bg-primary/5 p-3">
      <p className="text-xs text-muted-foreground">
        {text} {extra}
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={onClick}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-card px-3 py-2.5 text-sm font-bold text-primary disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
        {loading ? "Leyendo…" : button}
      </button>
    </div>
  );
}
