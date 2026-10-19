import { useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
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

function rangeLabel(t: Tier) {
  return t.max_qty ? `${t.min_qty}–${t.max_qty} u.` : `${t.min_qty}+ u.`;
}

/**
 * El cliente sube una captura de la publicación de Alibaba; la IA lee los precios por cantidad y el peso,
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

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Subí una imagen (captura de pantalla).");
      return;
    }
    setError("");
    setResult(null);
    setLoading(true);
    track("import_screenshot_uploaded");
    try {
      const compressed = await compressImageFile(file, {
        maxWidth: 1400,
        maxHeight: 2400,
        quality: 0.85,
      });
      // El navegador puede no soportar WebP y devolver PNG: tomar el tipo real del data URL
      const match = /^data:(image\/(?:webp|png|jpeg));base64,(.+)$/.exec(compressed.base64);
      if (!match?.[1] || !match[2]) throw new Error("formato");
      const res = await readAlibabaScreenshot({
        data: { mediaType: match[1] as "image/webp" | "image/png" | "image/jpeg", data: match[2] },
      });
      track("import_screenshot_result", {
        ok: res.ok,
        rangos: res.tiers?.length ?? 0,
        con_peso: res.peso_unitario_kg != null,
      });
      if (!res.ok) {
        setError(res.error ?? "No pudimos leer la captura.");
        return;
      }
      setResult(res);
      const firstMin = res.tiers?.[0]?.min_qty;
      setQty(firstMin ? String(firstMin) : "");
      setPeso(res.peso_unitario_kg != null ? String(res.peso_unitario_kg) : "");
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
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      {!result && (
        <>
          <button
            type="button"
            disabled={loading}
            onClick={() => inputRef.current?.click()}
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
                  Subir captura
                </span>
                <span className="text-xs text-muted-foreground">
                  De la publicación de Alibaba, donde se vean los precios por cantidad
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
          {!pesoNum && (
            <p className="mt-2 text-xs text-muted-foreground">
              No vimos el peso en la captura.{" "}
              <button type="button" onClick={onShowGuide} className="font-semibold text-primary">
                ¿Dónde lo encuentro?
              </button>
            </p>
          )}

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
            <RotateCcw className="h-3.5 w-3.5" /> Subir otra captura
          </button>
        </div>
      )}
    </div>
  );
}
