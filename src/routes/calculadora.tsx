import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import { z } from "zod";
import { Calculator, Plus, Trash2, Copy, Printer, Check, MessageCircle } from "lucide-react";
import { SiteChrome } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { waLink } from "@/lib/store";
import { track, trackWhatsappClick } from "@/lib/analytics";
import { getImportUsdRate } from "@/lib/import-ai.functions";
import {
  addBusinessDays,
  calcDespachante,
  calcFleteMaritimo,
  calcGastosFijosBarco,
  calcHonorarios,
  DEFAULT_BARCO_GASTOS_FIJOS,
  DEFAULT_BARCO_USD_M3,
  DEFAULT_IMPUESTOS_BARCO_PCT,
  parseDespachanteTramos,
  readQuoteTerms,
  splitPayment,
  type DespachanteTramo,
} from "@/lib/quote-terms";

// Datos precargados (ej: desde la lectura de una captura en /importar). Valores inválidos se ignoran.
const calculadoraSearchSchema = z.object({
  nombre: z.string().trim().max(80).optional().catch(undefined),
  cantidad: z.coerce.number().int().positive().max(1_000_000).optional().catch(undefined),
  fob: z.coerce.number().positive().max(1_000_000).optional().catch(undefined),
  peso: z.coerce.number().positive().max(10_000).optional().catch(undefined),
});

export const Route = createFileRoute("/calculadora")({
  validateSearch: calculadoraSearchSchema,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Calculadora de Importaciones — Te Importamos" },
      { name: "description", content: "Cotizá en segundos tus productos puestos en Argentina con desglose de flete e impuestos." },
    ],
  }),
  component: CalculadoraPage,
});

type Item = {
  id: string;
  nombre: string;
  cantidad: number;
  fob: number;
  peso: number;
  /** Volumen total de este producto (todas las unidades) en m³. Solo se usa por barco. */
  volumen: number;
};

type Via = "aereo" | "maritimo";

function fmtM3(n: number) {
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 }) + " m³";
}

type QuoteResult = {
  client: string;
  items: Item[];
  itemsIsolated: (Item & {
    weight: number;
    fobTotal: number;
    freightCost: number;
    handling: number;
    honorarios: number;
    despachante: number;
    base: number;
    tax: number;
    total: number;
    unitPrice: number;
  })[];
  totalWeight: number;
  /** Volumen total en m³ (solo por barco). */
  totalVolume: number;
  /** % de impuestos aplicado según la vía. */
  impuestosPct: number;
  totalFOB: number;
  freightTotal: number;
  handlingTotal: number;
  /** Gastos fijos de barco con IVA incluido (0 por avión). */
  gastosFijosTotal: number;
  honorariosTotal: number;
  despachanteTotal: number;
  taxesTotal: number;
  grandTotal: number;
  /** La carga viaja en barco (flete por m³). */
  viaMaritima: boolean;
  rates: {
    fleteKg: number;
    handling: number;
    honorariosPct: number;
    honorariosTope: number;
    honorariosMin: number;
    despachanteTramos: DespachanteTramo[];
    impuestosPct: number;
    aereoFijo: number;
    aereoDesde: number;
    aereoHasta: number;
    barcoM3: number;
    impuestosBarcoPct: number;
    barcoGastosFijos: number;
    barcoDesde: number;
  };
};

/** Lee un número de site_config respetando el 0 (a diferencia de `|| default`). */
function numConfig(raw: string | undefined, fallback: number) {
  if (raw === undefined || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Montos de la importación: se calculan y se pagan en dólares. */
function fmt(n: number) {
  return "US$ " + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Equivalente en pesos con la cotización del admin (site_config.dolar_cotizacion). */
function fmtArs(usd: number, rate: number) {
  return "$" + Math.round(usd * rate).toLocaleString("es-AR");
}

export function CalculadoraPage() {
  const { data: storeData } = useSuspenseQuery(storeQueryOptions);
  const config = storeData.config ?? {};

  // Cotización del dólar: la "activa en Base de Datos" del admin (implícita en los precios de los
  // productos), la misma que se usa al leer capturas en pesos. Respaldo: dolar_cotizacion guardada.
  const { data: liveRate } = useQuery({
    queryKey: ["import-usd-rate"],
    queryFn: () => getImportUsdRate(),
    staleTime: 10 * 60 * 1000,
  });
  const usdRate = Math.max(0, liveRate || Number(config["dolar_cotizacion"]) || 0);
  const ars = (usd: number) => (usdRate > 0 ? fmtArs(usd, usdRate) : "");

  // Tarifas leídas de site_config con fallback
  const rates = {
    fleteKg: Number(config["calc_flete_kg"]) || 22,
    handling: Number(config["calc_handling"]) || 30,
    // Honorarios propios: % de la mercadería con tope (10% hasta US$ 250)
    honorariosPct: Number(config["calc_honorarios_pct"]) || 10,
    honorariosTope: Number(config["calc_honorarios_tope"]) || 250,
    // Piso para que una carga chica no termine pagando de más "de onda" (permite 0 = sin piso)
    honorariosMin: numConfig(config["calc_honorarios_min"], 30),
    // Gestión aduanera (despachante, Pedro): estimado por tramos según la mercadería
    despachanteTramos: parseDespachanteTramos(config["calc_despachante_tramos"]),
    impuestosPct: Number(config["calc_impuestos_pct"]) || 70,
    aereoFijo: Number(config["calc_aereo_fijo"]) || 950,
    aereoDesde: Number(config["calc_aereo_desde"]) || 50,
    aereoHasta: Number(config["calc_aereo_hasta"]) || 250,
    // Barco: flete por m³ e impuestos estimados propios (provisional)
    barcoM3: Number(config["calc_barco_m3"]) || DEFAULT_BARCO_USD_M3,
    impuestosBarcoPct: Number(config["calc_impuestos_barco_pct"]) || DEFAULT_IMPUESTOS_BARCO_PCT,
    // Gastos fijos por carga marítima, sin IVA (permite 0 = no se cobra)
    barcoGastosFijos: numConfig(config["calc_barco_gastos_fijos"], DEFAULT_BARCO_GASTOS_FIJOS),
    barcoDesde: Number(config["calc_barco_desde"]) || 250,
  };
  const terms = readQuoteTerms(config);

  const [client, setClient] = useState<string>("");
  const [via, setVia] = useState<Via>("aereo");
  const prefill = Route.useSearch();
  const hasPrefill = Boolean(prefill.cantidad && prefill.fob && prefill.peso);
  const [items, setItems] = useState<Item[]>([
    {
      id: "item-1",
      nombre: hasPrefill ? prefill.nombre || "Producto importado" : "",
      cantidad: hasPrefill ? (prefill.cantidad ?? 1) : 1,
      fob: hasPrefill ? (prefill.fob ?? 0) : 0,
      peso: hasPrefill ? (prefill.peso ?? 0) : 0,
      volumen: 0,
    },
  ]);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const resultRef = useRef<HTMLDivElement>(null);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, nombre: "", cantidad: 1, fob: 0, peso: 0, volumen: 0 },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.id !== id) : prev));
  }

  function updateItem(id: string, field: keyof Item, value: string | number) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          [field]: field === "nombre" ? value : Math.max(0, Number(value) || 0),
        };
      })
    );
  }

  // Flete según la vía:
  // - Barco: por volumen (m³ × tarifa por m³)
  // - Aéreo, rango 50 a 250 kg: aéreo fijo
  // - Aéreo, menos de 50 kg: flete por kg
  // Una carga aérea que pasa el umbral (barcoDesde) se cotiza por barco: hay que cargar los m³.
  const barcoThreshold = rates.barcoDesde > 0 ? rates.barcoDesde : 250;

  function calcFreightCost(weight: number, volumen: number, v: Via) {
    if (v === "maritimo") return calcFleteMaritimo(volumen, rates.barcoM3);
    if (rates.aereoHasta > 0 && weight >= rates.aereoDesde && weight <= rates.aereoHasta) {
      return rates.aereoFijo > 0 ? rates.aereoFijo : 950;
    }
    return rates.fleteKg * weight;
  }

  function handleCalculate() {
    const validItems = items.filter((i) => i.cantidad > 0);
    if (!validItems.length || validItems.some((i) => !i.nombre.trim())) {
      alert("Por favor completá el nombre, cantidad, precio FOB y peso de cada producto.");
      return;
    }

    const maritimo = via === "maritimo";
    if (maritimo && validItems.some((i) => !(i.volumen > 0))) {
      alert("Para cotizar por barco cargá el volumen total (m³) de cada producto. Lo pasa el proveedor como CBM.");
      return;
    }
    if (!maritimo && validItems.reduce((s, i) => s + i.cantidad * i.peso, 0) > barcoThreshold) {
      setVia("maritimo");
      setQuote(null);
      alert(
        `Esta carga supera los ${barcoThreshold} kg: viaja por barco y el flete se cobra por volumen. Cargá el volumen total (m³) de cada producto y volvé a cotizar.`,
      );
      return;
    }
    const impuestosPct = maritimo ? rates.impuestosBarcoPct : rates.impuestosPct;
    // Fijo por carga (no por m³): cada producto aislado lo paga entero; juntos, una sola vez.
    const gastosFijos = maritimo ? calcGastosFijosBarco(rates.barcoGastosFijos) : 0;

    const clientName = client.trim() || "Cliente";

    // Cálculo aislado (producto por separado)
    const itemsIsolated = validItems.map((i) => {
      const weight = i.cantidad * i.peso;
      const fobTotal = i.cantidad * i.fob;
      const freightCost = calcFreightCost(weight, i.volumen, via);
      const handling = rates.handling;
      const honorarios = calcHonorarios(fobTotal, rates.honorariosPct, rates.honorariosTope, rates.honorariosMin);
      const despachante = calcDespachante(fobTotal, rates.despachanteTramos);
      const base = fobTotal + freightCost + handling;
      const tax = base * (impuestosPct / 100);
      const total = base + tax + honorarios + despachante + gastosFijos;
      const unitPrice = i.cantidad > 0 ? total / i.cantidad : 0;
      return { ...i, weight, fobTotal, freightCost, handling, honorarios, despachante, base, tax, total, unitPrice };
    });

    // Cálculo combinado (todos juntos)
    const totalWeight = validItems.reduce((s, i) => s + i.cantidad * i.peso, 0);
    const totalFOB = validItems.reduce((s, i) => s + i.cantidad * i.fob, 0);
    const totalVolume = maritimo ? validItems.reduce((s, i) => s + i.volumen, 0) : 0;
    const freightTotal = calcFreightCost(totalWeight, totalVolume, via);
    const handlingTotal = rates.handling;
    const honorariosTotal = calcHonorarios(totalFOB, rates.honorariosPct, rates.honorariosTope, rates.honorariosMin);
    const despachanteTotal = calcDespachante(totalFOB, rates.despachanteTramos);
    const baseTotal = totalFOB + freightTotal + handlingTotal;
    const taxesTotal = baseTotal * (impuestosPct / 100);
    const grandTotal = baseTotal + taxesTotal + honorariosTotal + despachanteTotal + gastosFijos;

    const res: QuoteResult = {
      client: clientName,
      items: validItems,
      itemsIsolated,
      totalWeight,
      totalVolume,
      impuestosPct,
      totalFOB,
      freightTotal,
      handlingTotal,
      gastosFijosTotal: gastosFijos,
      honorariosTotal,
      despachanteTotal,
      taxesTotal,
      grandTotal,
      viaMaritima: maritimo,
      rates,
    };

    setQuote(res);
    track("import_quote_calculated", {
      productos: validItems.length,
      via,
      peso_total_kg: Math.round(totalWeight * 100) / 100,
      fob_total: Math.round(totalFOB),
      total: Math.round(grandTotal),
    });
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // Con datos precargados, mostrar la cotización directamente
  useEffect(() => {
    if (hasPrefill) handleCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function buildWhatsappMessage() {
    if (!quote) return "";
    const cleanClient = (quote.client || "").replace(/[\r\n\t]/g, " ").trim();
    const multi = quote.items.length > 1;
    let msg = `Hola! Te comparto la cotización para *${cleanClient}*:\n\n`;

    if (multi) {
      msg += `_Productos por separado (c/u aislado):_\n`;
      quote.itemsIsolated.forEach((i) => {
        msg += `• ${i.nombre} (x${i.cantidad}): ${fmt(i.unitPrice)} c/u${usdRate ? ` (≈ ${ars(i.unitPrice)})` : ""} puesto en Argentina — subtotal ${fmt(i.total)}\n`;
      });
      msg += `\n_Trayendo todos los productos juntos:_\n`;
      quote.items.forEach((i) => {
        msg += `• ${i.nombre} — FOB (x${i.cantidad}): ${fmt(i.cantidad * i.fob)}\n`;
      });
      msg += `• ${fleteLabel(quote)}: ${fmt(quote.freightTotal)}\n`;
      msg += `• Handling: ${fmt(quote.handlingTotal)}\n`;
      if (quote.gastosFijosTotal > 0) {
        msg += `• Gastos fijos de barco (IVA incluido): ${fmt(quote.gastosFijosTotal)}\n`;
      }
      msg += `• Honorarios: ${fmt(quote.honorariosTotal)}\n`;
      msg += `• Gestión aduanera (estimado): ${fmt(quote.despachanteTotal)}\n`;
      msg += `• Impuestos: ${fmt(quote.taxesTotal)}\n`;
      msg += `\n*Total trayendo todo: ${fmt(quote.grandTotal)}*${usdRate ? ` (≈ ${ars(quote.grandTotal)})` : ""}\n`;
    } else {
      const i = quote.itemsIsolated[0];
      if (i) {
        msg += `• ${i.nombre} (x${i.cantidad}): ${fmt(i.unitPrice)} c/u${usdRate ? ` (≈ ${ars(i.unitPrice)})` : ""} puesto en Argentina\n`;
      }
      msg += `\n*Total puesto en Argentina: ${fmt(quote.grandTotal)}*${usdRate ? ` (≈ ${ars(quote.grandTotal)})` : ""}\n`;
      msg += `_(incluye flete, handling, ${quote.gastosFijosTotal > 0 ? "gastos fijos de barco, " : ""}honorarios, gestión aduanera e impuestos)_\n`;
    }

    const pay = splitPayment(quote.grandTotal, terms.senaPct);
    msg += `\n*Cómo se paga:*\n`;
    if (terms.senaPct >= 100) {
      msg += `• 100% al confirmar: ${fmt(quote.grandTotal)}\n`;
    } else {
      msg += `• Seña ${terms.senaPct}% para confirmar: ${fmt(pay.sena)}\n`;
      msg += `• Resto ${100 - terms.senaPct}% ${terms.saldoCuando}: ${fmt(pay.saldo)}\n`;
    }
    msg += `\n*Plazo:* ${quoteDeliveryTime(quote)} puerta a puerta (${quote.viaMaritima ? "marítimo" : "aéreo"}).\n`;
    msg += `*Incluye:* ${terms.incluye.join("; ")}.\n`;
    msg += `*No incluye:* ${terms.noIncluye.join("; ")}.\n`;
    msg += `*Factura:* ${terms.factura}\n`;
    msg += `*Validez:* ${terms.validezDias} días hábiles (hasta el ${addBusinessDays(new Date(), terms.validezDias).toLocaleDateString("es-AR")}).\n`;
    msg += `*Demoras o aduana:* ${terms.demoras}\n`;
    msg += `\n*Nota:* El precio final es estimativo. Me gustaría confirmar el pedido y obtener el valor definitivo.`;
    return msg;
  }

  function fleteLabel(q: QuoteResult) {
    return q.viaMaritima ? `Flete marítimo (${fmtM3(q.totalVolume)})` : "Flete";
  }

  function quoteDeliveryTime(q: QuoteResult) {
    return q.viaMaritima ? terms.plazoMaritimo : terms.plazoAereo;
  }

  function handleConfirmWhatsapp() {
    const msg = buildWhatsappMessage();
    if (!msg) return;
    track("import_quote_whatsapp", { total: quote ? Math.round(quote.grandTotal) : null });
    trackWhatsappClick({ destino: "privado", ubicacion: "calculadora" });
    const url = waLink(config, msg);
    try {
      const parsed = new URL(url);
      if (
        parsed.protocol === "https:" &&
        (parsed.hostname === "wa.me" || parsed.hostname === "api.whatsapp.com")
      ) {
        window.open(parsed.href, "_blank", "noopener,noreferrer");
      }
    } catch {
      // URL inválida ignorada de forma segura
    }
  }

  function copyForWhatsapp() {
    const msg = buildWhatsappMessage();
    if (!msg) return;

    navigator.clipboard
      .writeText(msg)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      })
      .catch(() => alert("No se pudo copiar automáticamente."));
  }

  const multi = quote ? quote.items.length > 1 : false;
  const validUntil = addBusinessDays(new Date(), terms.validezDias).toLocaleDateString("es-AR");

  return (
    <SiteChrome config={config}>
      <main className="min-h-[80vh] py-8 sm:py-12 bg-background print:min-h-0 print:py-0">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 print:max-w-none print:px-0">
          {/* Header y Formulario (ocultos en PDF/impresión) */}
          <div className="no-print print:hidden">
            {/* Header principal */}
            <div className="text-center mb-8 sm:mb-10">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Calculadora de Importaciones
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Producto puesto en Argentina con flete internacional, handling, honorarios y gestión integral de aduana.
              </p>
            </div>

            {/* Formulario de carga */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-7 shadow-xs mb-8">
              <div className="mb-6">
                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Cliente o Referencia
                </label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="Nombre de la empresa o cliente"
                  className="input-base text-sm font-medium w-full sm:max-w-md"
                />
              </div>

              <div className="mb-6">
                <span className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Vía de transporte
                </span>
                <div className="inline-flex rounded-xl border border-border p-1 bg-muted/25" role="group">
                  {(
                    [
                      { id: "aereo", label: "✈️ Avión" },
                      { id: "maritimo", label: "🚢 Barco" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      aria-pressed={via === opt.id}
                      onClick={() => setVia(opt.id)}
                      className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-colors ${
                        via === opt.id
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  {via === "maritimo"
                    ? "Por barco el flete se cobra por volumen: cargá los m³ totales de cada producto (el CBM que pasa el proveedor)."
                    : `Por avión el flete se cobra por peso. Cargas de más de ${barcoThreshold} kg van por barco.`}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Productos a cotizar
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {via === "maritimo" ? "FOB unitario · volumen total del producto" : "FOB y peso unitarios"}
                  </span>
                </div>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1.2fr_1.2fr_auto] gap-2.5 items-end p-3 rounded-xl bg-muted/25 border border-border/60"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Producto #{idx + 1}
                      </label>
                      <input
                        type="text"
                        value={item.nombre}
                        onChange={(e) => updateItem(item.id, "nombre", e.target.value)}
                        placeholder="ej: Power Bank 20000mAh"
                        className="input-base text-xs font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad || ""}
                        onChange={(e) => updateItem(item.id, "cantidad", e.target.value)}
                        className="input-base text-xs font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">
                        FOB unit. (USD)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.fob || ""}
                        onChange={(e) => updateItem(item.id, "fob", e.target.value)}
                        placeholder="0.00"
                        className="input-base text-xs font-bold"
                      />
                    </div>

                    {via === "maritimo" ? (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Volumen total (m³)
                        </label>
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.volumen || ""}
                          onChange={(e) => updateItem(item.id, "volumen", e.target.value)}
                          placeholder="1.5"
                          className="input-base text-xs font-bold"
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase">
                          Peso unit. (kg)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.peso || ""}
                          onChange={(e) => updateItem(item.id, "peso", e.target.value)}
                          placeholder="0.20"
                          className="input-base text-xs font-bold"
                        />
                      </div>
                    )}

                    <div className="flex justify-end pb-0.5">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length <= 1}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-30"
                        title="Quitar producto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={addItem}
                  className="btn-base border border-dashed border-border hover:border-foreground/50 text-xs text-foreground font-semibold px-4 py-2 w-full sm:w-auto flex items-center justify-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar otro producto
                </button>

                <button
                  type="button"
                  onClick={handleCalculate}
                  className="btn-base bg-primary text-primary-foreground font-bold text-sm px-6 py-2.5 w-full sm:flex-1 hover:opacity-90 flex items-center justify-center gap-2 shadow-xs"
                >
                  <Calculator className="h-4 w-4" /> Generar cotización
                </button>
              </div>
            </div>
          </div>

          {/* Resultado / Comprobante */}
          {quote && (
            <div
              ref={resultRef}
              className="quote-print rounded-xl border border-border border-t-4 border-t-[#E8590F] bg-card p-6 sm:p-9 shadow-sm relative print:p-0 print:border-x-0 print:border-b-0 print:pt-3 print:shadow-none"
            >
              {/* Encabezado del comprobante */}
              <div className="flex items-end justify-between border-b-2 border-foreground/90 pb-3.5 mb-5 gap-4 print:pb-2 print:mb-3">
                <div className="flex flex-col gap-2">
                  <img
                    src="/businessicon-header.jpg?v=3"
                    alt="Te Importamos"
                    className="h-8.5 w-auto object-contain block max-h-9"
                  />
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    Cotización
                  </h2>
                </div>
                <div className="text-right text-xs font-mono text-muted-foreground whitespace-nowrap leading-relaxed">
                  <div>COT-{Date.now().toString(36).toUpperCase()}</div>
                  <div>Emitida: {new Date().toLocaleDateString("es-AR")}</div>
                  <div>Válida hasta: {validUntil}</div>
                </div>
              </div>

              {/* Cliente */}
              <div className="mb-6 print:mb-3">
                <span className="block font-mono text-[10.5px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">
                  CLIENTE
                </span>
                <span className="text-sm font-semibold text-foreground">{quote.client}</span>
              </div>

              {/* Productos y Precio Unitario Puesto en Argentina */}
              <div className="mb-5">
                {multi && (
                  <div className="mb-4">
                    <div className="font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-1">
                      Productos por separado puestos en Argentina
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Cada producto calculado de forma aislada, como si fuera el único artículo del envío.
                    </p>
                  </div>
                )}

                <div className="space-y-4 print:space-y-2">
                  {quote.itemsIsolated.map((i) => (
                    <div key={i.id} className="q-product-block">
                      <div className="flex justify-between items-baseline gap-2 mb-2">
                        <div className="text-sm sm:text-base font-bold text-foreground">
                          {i.nombre}
                          <span className="font-mono text-xs font-normal text-muted-foreground ml-2">
                            x{i.cantidad}
                          </span>
                        </div>
                        <div className="font-mono text-sm font-semibold text-foreground whitespace-nowrap">
                          {fmt(i.total)}
                        </div>
                      </div>

                      {/* Caja destacada de Precio Unitario */}
                      <div className="bg-[#FBEADD]/80 dark:bg-amber-950/25 border-l-4 border-[#E8590F] p-3.5 sm:p-4 mb-4 rounded-r-md print:p-2.5 print:mb-2">
                        <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#4B5A6B] dark:text-muted-foreground mb-1 font-medium">
                          PRECIO UNITARIO PUESTO EN ARGENTINA
                        </div>
                        <div
                          className="price-num font-price-clean font-bold text-3xl sm:text-4xl text-[#E8590F] tracking-tight leading-none print:text-3xl"
                          style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontVariantNumeric: "normal", fontFeatureSettings: "normal" }}
                        >
                          {fmt(i.unitPrice)}
                        </div>
                        {usdRate > 0 && (
                          <div className="mt-1.5 text-sm font-semibold text-foreground/80">
                            ≈ {ars(i.unitPrice)} c/u
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose / Resumen */}
              {multi ? (
                <div>
                  <div className="font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-1 mt-6">
                    Trayendo todos los productos
                  </div>
                  <p className="text-xs text-muted-foreground italic mb-3">
                    Cálculo unificado compartiendo flete y handling entre todos los productos del pedido.
                  </p>

                  <div className="divide-y divide-border/60 text-sm">
                    {quote.items.map((i) => (
                      <div key={i.id} className="flex justify-between py-2 text-sm">
                        <span className="text-foreground">
                          {i.nombre} — FOB (x{i.cantidad})
                        </span>
                        <span className="font-mono text-foreground">{fmt(i.cantidad * i.fob)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 text-sm font-medium">
                      <span className="text-foreground">{fleteLabel(quote)}</span>
                      <span className="font-mono text-foreground">{fmt(quote.freightTotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-foreground">Handling</span>
                      <span className="font-mono text-foreground">{fmt(quote.handlingTotal)}</span>
                    </div>
                    {quote.gastosFijosTotal > 0 && (
                      <div className="flex justify-between py-2 text-sm">
                        <span className="text-foreground">Gastos fijos de barco (IVA incluido)</span>
                        <span className="font-mono text-foreground">{fmt(quote.gastosFijosTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-foreground">Honorarios</span>
                      <span className="font-mono text-foreground">{fmt(quote.honorariosTotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-foreground">Gestión aduanera (estimado)</span>
                      <span className="font-mono text-foreground">{fmt(quote.despachanteTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-3 py-2 text-sm font-medium">
                      <span className="text-foreground">
                        Impuestos{" "}
                        <span className="font-normal text-muted-foreground">
                          (derechos, tasa, IVA y percepciones)
                        </span>
                      </span>
                      <span className="font-mono text-foreground">{fmt(quote.taxesTotal)}</span>
                    </div>
                  </div>

                  {/* Gran Total */}
                  <div className="mt-5 rounded-lg bg-foreground text-background p-4 sm:p-5 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider">
                      TOTAL TRAYENDO TODO
                    </span>
                    <span
                      className="price-num font-price-clean whitespace-nowrap text-2xl sm:text-3xl font-bold tracking-tight"
                      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontVariantNumeric: "normal", fontFeatureSettings: "normal" }}
                    >
                      {fmt(quote.grandTotal)}
                    </span>
                  </div>
                  {usdRate > 0 && (
                    <p className="mt-2 text-right text-sm font-semibold text-foreground">
                      ≈ {ars(quote.grandTotal)}
                    </p>
                  )}
                </div>
              ) : (
                <div className="mt-2">
                  <div className="font-mono text-xs text-[#4B5A6B] dark:text-muted-foreground space-y-1.5 py-2">
                    <div className="flex justify-between">
                      <span>Costo mercadería (FOB)</span>
                      <span>{fmt(quote.totalFOB)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{fleteLabel(quote)}</span>
                      <span>{fmt(quote.freightTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Handling</span>
                      <span>{fmt(quote.handlingTotal)}</span>
                    </div>
                    {quote.gastosFijosTotal > 0 && (
                      <div className="flex justify-between gap-3">
                        <span>Gastos fijos de barco (IVA incluido)</span>
                        <span>{fmt(quote.gastosFijosTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Honorarios</span>
                      <span>{fmt(quote.honorariosTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gestión aduanera (estimado)</span>
                      <span>{fmt(quote.despachanteTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span>Impuestos (derechos, tasa, IVA y percepciones)</span>
                      <span>{fmt(quote.taxesTotal)}</span>
                    </div>
                  </div>

                  {/* Total en una sola fila limpia como en la imagen */}
                  <div className="flex justify-between items-baseline pt-6 sm:pt-8 mt-2 print:pt-2 print:mt-1">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      TOTAL PUESTO EN ARGENTINA
                    </span>
                    <span
                      className="price-num font-price-clean whitespace-nowrap text-2xl sm:text-4xl font-bold text-foreground tracking-tight"
                      style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", fontVariantNumeric: "normal", fontFeatureSettings: "normal" }}
                    >
                      {fmt(quote.grandTotal)}
                    </span>
                  </div>
                  {usdRate > 0 && (
                    <p className="mt-1 text-right text-sm font-semibold text-foreground">
                      ≈ {ars(quote.grandTotal)}
                    </p>
                  )}
                </div>
              )}

              {/* Condiciones: cómo se paga, plazo, factura, qué no incluye, demoras/aduana */}
              {(() => {
                const pay = splitPayment(quote.grandTotal, terms.senaPct);
                const fullUpfront = terms.senaPct >= 100;
                return (
                  <div className="mt-7 print:mt-4">
                    <div className="font-mono text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border pb-1 mb-3">
                      Cómo seguimos
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border p-3.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Cómo se paga
                        </div>
                        {fullUpfront ? (
                          <div className="flex justify-between gap-3 text-sm">
                            <span className="text-foreground">100% al confirmar</span>
                            <span className="font-mono font-semibold text-foreground whitespace-nowrap">
                              {fmt(quote.grandTotal)}
                            </span>
                          </div>
                        ) : (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between gap-3">
                              <span className="text-foreground">
                                <span className="font-semibold">Seña {terms.senaPct}%</span>{" "}
                                <span className="text-muted-foreground">para confirmar</span>
                              </span>
                              <span className="font-mono font-semibold text-[#E8590F] whitespace-nowrap">
                                {fmt(pay.sena)}
                              </span>
                            </div>
                            <div className="flex justify-between gap-3">
                              <span className="text-foreground">
                                <span className="font-semibold">Resto {100 - terms.senaPct}%</span>{" "}
                                <span className="text-muted-foreground">{terms.saldoCuando}</span>
                              </span>
                              <span className="font-mono font-semibold text-foreground whitespace-nowrap">
                                {fmt(pay.saldo)}
                              </span>
                            </div>
                          </div>
                        )}
                        {usdRate > 0 && !fullUpfront && (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            Seña ≈ {ars(pay.sena)} · Resto ≈ {ars(pay.saldo)}
                          </p>
                        )}
                      </div>

                      <div className="rounded-lg border border-border p-3.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          Plazo de entrega
                        </div>
                        <div className="text-lg font-bold text-foreground leading-tight">
                          {quoteDeliveryTime(quote)}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Puerta a puerta, por envío {quote.viaMaritima ? "marítimo" : "aéreo"}, desde
                          que se confirma el pedido.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-1.5">
                          ✓ Incluye
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-foreground/80">
                          {terms.incluye.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-foreground mb-1.5">
                          ✕ No incluye
                        </div>
                        <ul className="list-disc pl-4 space-y-0.5 text-foreground/80">
                          {terms.noIncluye.map((line) => (
                            <li key={line}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <dl className="mt-4 space-y-2.5 text-xs leading-relaxed">
                      <div className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <dt className="font-semibold text-foreground">Factura</dt>
                        <dd className="text-foreground/80">{terms.factura}</dd>
                      </div>
                      <div className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <dt className="font-semibold text-foreground">Validez</dt>
                        <dd className="text-foreground/80">
                          {terms.validezDias} días hábiles (hasta el {validUntil}). Precios y plazos
                          estimativos, sujetos al tipo de cambio y a la operatoria de comercio exterior.
                        </dd>
                      </div>
                      <div className="sm:grid sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <dt className="font-semibold text-foreground">Demoras o aduana</dt>
                        <dd className="text-foreground/80">{terms.demoras}</dd>
                      </div>
                    </dl>
                  </div>
                );
              })()}

              {/* Aclaración precio estimativo (visible en pantalla y en PDF) */}
              <div className="mt-6 pt-3.5 border-t border-border/70 text-xs text-muted-foreground leading-relaxed print:mt-3 print:pt-2">
                <p className="text-[11.5px] sm:text-xs text-foreground/80">
                  <span className="font-semibold text-foreground">* Nota:</span> El precio final es estimativo. Si deseás obtener el valor definitivo o confirmar tu pedido, escribinos a WhatsApp.
                </p>
                {usdRate > 0 && (
                  <p className="mt-1.5 text-[11.5px] sm:text-xs">
                    Montos en dólares. Equivalente en pesos con dólar a {fmtArs(1, usdRate)}{" "}
                    (cotización del día).
                  </p>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap gap-3 pt-6 mt-6 border-t border-border print:hidden">
                <button
                  type="button"
                  onClick={handleConfirmWhatsapp}
                  className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Confirmar por WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={copyForWhatsapp}
                  className="btn-base border border-border hover:bg-muted text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "¡Copiado!" : "Copiar cotización"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-base border border-border hover:bg-muted text-xs font-semibold px-4 py-2 flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>Imprimir / Guardar PDF</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </SiteChrome>
  );
}
