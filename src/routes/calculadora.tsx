import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Calculator, Plus, Trash2, Copy, Printer, Check, MessageCircle } from "lucide-react";
import { SiteChrome } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { waLink } from "@/lib/store";

export const Route = createFileRoute("/calculadora")({
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
};

type QuoteResult = {
  client: string;
  items: Item[];
  itemsIsolated: (Item & {
    weight: number;
    fobTotal: number;
    freightCost: number;
    handling: number;
    base: number;
    tax: number;
    total: number;
    unitPrice: number;
  })[];
  totalWeight: number;
  totalFOB: number;
  freightTotal: number;
  handlingTotal: number;
  taxesTotal: number;
  grandTotal: number;
  rates: {
    fleteKg: number;
    handling: number;
    impuestosPct: number;
    aereoFijo: number;
    aereoDesde: number;
    aereoHasta: number;
    barcoFijo: number;
    barcoDesde: number;
  };
};

function fmt(n: number) {
  return "$" + n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CalculadoraPage() {
  const { data: storeData } = useSuspenseQuery(storeQueryOptions);
  const config = storeData.config ?? {};

  // Tarifas leídas de site_config con fallback
  const rates = {
    fleteKg: Number(config["calc_flete_kg"]) || 22,
    handling: Number(config["calc_handling"]) || 30,
    impuestosPct: Number(config["calc_impuestos_pct"]) || 70,
    aereoFijo: Number(config["calc_aereo_fijo"]) || 950,
    aereoDesde: Number(config["calc_aereo_desde"]) || 50,
    aereoHasta: Number(config["calc_aereo_hasta"]) || 250,
    barcoFijo: Number(config["calc_barco_fijo"]) || 100,
    barcoDesde: Number(config["calc_barco_desde"]) || 250,
  };

  const [client, setClient] = useState<string>("");
  const [items, setItems] = useState<Item[]>([
    { id: "item-1", nombre: "", cantidad: 1, fob: 0, peso: 0 },
  ]);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const resultRef = useRef<HTMLDivElement>(null);

  function addItem() {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, nombre: "", cantidad: 1, fob: 0, peso: 0 },
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

  // Decide flete para un peso determinado:
  // - Si pasa 250 kg (barcoDesde): barco fijo (100 USD)
  // - Si está en rango 50 a 250 kg: aéreo fijo
  // - Menor a 50 kg: flete por kg
  function calcFreightCost(weight: number) {
    const barcoThreshold = rates.barcoDesde > 0 ? rates.barcoDesde : 250;
    if (weight > barcoThreshold) {
      return rates.barcoFijo > 0 ? rates.barcoFijo : 100;
    }
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

    const clientName = client.trim() || "Cliente";

    // Cálculo aislado (producto por separado)
    const itemsIsolated = validItems.map((i) => {
      const weight = i.cantidad * i.peso;
      const fobTotal = i.cantidad * i.fob;
      const freightCost = calcFreightCost(weight);
      const handling = rates.handling;
      const base = fobTotal + freightCost + handling;
      const tax = base * (rates.impuestosPct / 100);
      const total = base + tax;
      const unitPrice = i.cantidad > 0 ? total / i.cantidad : 0;
      return { ...i, weight, fobTotal, freightCost, handling, base, tax, total, unitPrice };
    });

    // Cálculo combinado (todos juntos)
    const totalWeight = validItems.reduce((s, i) => s + i.cantidad * i.peso, 0);
    const totalFOB = validItems.reduce((s, i) => s + i.cantidad * i.fob, 0);
    const freightTotal = calcFreightCost(totalWeight);
    const handlingTotal = rates.handling;
    const baseTotal = totalFOB + freightTotal + handlingTotal;
    const taxesTotal = baseTotal * (rates.impuestosPct / 100);
    const grandTotal = baseTotal + taxesTotal;

    const res: QuoteResult = {
      client: clientName,
      items: validItems,
      itemsIsolated,
      totalWeight,
      totalFOB,
      freightTotal,
      handlingTotal,
      taxesTotal,
      grandTotal,
      rates,
    };

    setQuote(res);
    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function buildWhatsappMessage() {
    if (!quote) return "";
    const multi = quote.items.length > 1;
    let msg = `Hola! Te comparto la cotización para *${quote.client}*:\n\n`;

    if (multi) {
      msg += `_Productos por separado (c/u aislado):_\n`;
      quote.itemsIsolated.forEach((i) => {
        msg += `• ${i.nombre} (x${i.cantidad}): ${fmt(i.unitPrice)} c/u puesto en Argentina — subtotal ${fmt(i.total)}\n`;
      });
      msg += `\n_Trayendo todos los productos juntos:_\n`;
      quote.items.forEach((i) => {
        msg += `• ${i.nombre} — FOB (x${i.cantidad}): ${fmt(i.cantidad * i.fob)}\n`;
      });
      msg += `• Flete: ${fmt(quote.freightTotal)}\n`;
      msg += `• Handling: ${fmt(quote.handlingTotal)}\n`;
      msg += `• Impuestos: ${fmt(quote.taxesTotal)}\n`;
      msg += `\n*Total trayendo todo: ${fmt(quote.grandTotal)}*\n`;
    } else {
      const i = quote.itemsIsolated[0];
      msg += `• ${i.nombre} (x${i.cantidad}): ${fmt(i.unitPrice)} c/u puesto en Argentina\n`;
      msg += `\n*Total puesto en Argentina: ${fmt(quote.grandTotal)}*\n`;
      msg += `_(incluye flete, handling e impuestos)_\n`;
    }

    msg += `\n*Nota:* El precio final es estimativo. Me gustaría confirmar el pedido y obtener el valor definitivo.`;
    return msg;
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
                Producto puesto en Argentina con flete internacional, handling y gestión integral de aduana.
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

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Productos a cotizar
                  </span>
                  <span className="text-[11px] text-muted-foreground">FOB y peso unitarios</span>
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
                  <Plus className="h-3.5 w-3.5" /> + Agregar otro producto
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
              className="rounded-xl border border-border border-t-4 border-t-[#E8590F] bg-card p-6 sm:p-9 shadow-sm relative print:border-none print:p-0 print:shadow-none"
            >
              {/* Encabezado del comprobante */}
              <div className="flex items-end justify-between border-b-2 border-foreground/90 pb-3.5 mb-5 gap-4">
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
                  <div>{new Date().toLocaleDateString("es-AR")}</div>
                </div>
              </div>

              {/* Cliente */}
              <div className="mb-6">
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

                <div className="space-y-4">
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
                      <div className="bg-[#FBEADD]/80 dark:bg-amber-950/25 border-l-4 border-[#E8590F] p-3.5 sm:p-4 mb-4 rounded-r-md">
                        <div className="font-mono text-[10.5px] uppercase tracking-wider text-[#4B5A6B] dark:text-muted-foreground mb-1 font-medium">
                          PRECIO UNITARIO PUESTO EN ARGENTINA
                        </div>
                        <div
                          className="price-num font-price-clean font-bold text-3xl sm:text-4xl text-[#E8590F] tracking-tight leading-none"
                        >
                          {fmt(i.unitPrice)}
                        </div>
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
                      <span className="text-foreground">Flete</span>
                      <span className="font-mono text-foreground">{fmt(quote.freightTotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm">
                      <span className="text-foreground">Handling</span>
                      <span className="font-mono text-foreground">{fmt(quote.handlingTotal)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm font-medium">
                      <span className="text-foreground">Impuestos</span>
                      <span className="font-mono text-foreground">{fmt(quote.taxesTotal)}</span>
                    </div>
                  </div>

                  {/* Gran Total */}
                  <div className="mt-5 rounded-lg bg-foreground text-background p-4 sm:p-5 flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider">
                      TOTAL TRAYENDO TODO
                    </span>
                    <span className="price-num font-price-clean text-2xl sm:text-3xl font-bold tracking-tight">
                      {fmt(quote.grandTotal)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-2">
                  <div className="font-mono text-xs text-[#4B5A6B] dark:text-muted-foreground space-y-1.5 py-2">
                    <div className="flex justify-between">
                      <span>Costo mercadería (FOB)</span>
                      <span>{fmt(quote.totalFOB)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flete</span>
                      <span>{fmt(quote.freightTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Handling</span>
                      <span>{fmt(quote.handlingTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Impuestos</span>
                      <span>{fmt(quote.taxesTotal)}</span>
                    </div>
                  </div>

                  {/* Total en una sola fila limpia como en la imagen */}
                  <div className="flex justify-between items-baseline pt-6 sm:pt-8 mt-2">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      TOTAL PUESTO EN ARGENTINA
                    </span>
                    <span className="price-num font-price-clean text-2xl sm:text-4xl font-bold text-foreground tracking-tight">
                      {fmt(quote.grandTotal)}
                    </span>
                  </div>
                </div>
              )}

              {/* Aclaración precio estimativo (visible en pantalla y en PDF) */}
              <div className="mt-6 pt-3.5 border-t border-border/70 text-xs text-muted-foreground leading-relaxed">
                <p className="text-[11.5px] sm:text-xs text-foreground/80">
                  <span className="font-semibold text-foreground">* Nota:</span> El precio final es estimativo. Si deseás obtener el valor definitivo o confirmar tu pedido, escribinos a WhatsApp.
                </p>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap gap-3 pt-6 mt-6 border-t border-border print:hidden">
                <a
                  href={waLink(config, buildWhatsappMessage())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>Confirmar por WhatsApp</span>
                </a>
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
