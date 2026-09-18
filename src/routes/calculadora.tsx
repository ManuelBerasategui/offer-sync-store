import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Calculator, Plus, Trash2, Copy, Printer, Check } from "lucide-react";
import { SiteChrome } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";

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

  function copyForWhatsapp() {
    if (!quote) return;
    const multi = quote.items.length > 1;
    let msg = `*Cotización — ${quote.client}*\n\n`;

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
      msg += `\n*Total trayendo todo: ${fmt(quote.grandTotal)}*`;
    } else {
      const i = quote.itemsIsolated[0];
      msg += `• ${i.nombre} (x${i.cantidad}): ${fmt(i.unitPrice)} c/u puesto en Argentina\n`;
      msg += `\n*Total puesto en Argentina: ${fmt(quote.grandTotal)}*\n`;
      msg += `\n_(incluye flete, handling e impuestos)_`;
    }

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
      <main className="min-h-[80vh] py-8 sm:py-12 bg-background">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Header principal */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-3 border border-primary/20">
              <Calculator className="h-3.5 w-3.5" />
              <span>Herramienta Oficial de Cotización</span>
            </div>
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

          {/* Resultado / Comprobante */}
          {quote && (
            <div
              ref={resultRef}
              className="rounded-2xl border-2 border-primary/40 bg-card p-6 sm:p-8 shadow-md relative print:border-none print:shadow-none"
            >
              {/* Encabezado del comprobante */}
              <div className="flex items-start justify-between gap-4 border-b-2 border-foreground/90 pb-4 mb-6">
                <div>
                  <img
                    src="/businessicon-header.jpg?v=3"
                    alt="Te Importamos"
                    className="h-9 w-auto object-contain mb-2"
                  />
                  <h2 className="text-xl font-bold text-foreground">Comprobante de Cotización</h2>
                </div>
                <div className="text-right text-xs font-mono text-muted-foreground">
                  <div>COT-{Date.now().toString(36).toUpperCase()}</div>
                  <div>{new Date().toLocaleDateString("es-AR")}</div>
                </div>
              </div>

              {/* Cliente */}
              <div className="mb-6">
                <span className="block text-[11px] font-bold text-muted-foreground uppercase">Cliente</span>
                <span className="text-base font-semibold text-foreground">{quote.client}</span>
              </div>

              {/* Productos y Precio Unitario Puesto en Argentina */}
              <div className="mb-8">
                {multi && (
                  <>
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5 mb-2">
                      Productos por separado puestos en Argentina
                    </div>
                    <p className="text-xs text-muted-foreground italic mb-4">
                      Cada producto calculado de forma aislada, como si fuera el único artículo del envío.
                    </p>
                  </>
                )}

                <div className="space-y-4">
                  {quote.itemsIsolated.map((i) => (
                    <div key={i.id} className="rounded-xl border border-border bg-muted/15 p-4">
                      <div className="flex items-center justify-between text-sm font-semibold mb-2">
                        <span>
                          {i.nombre} <span className="text-xs text-muted-foreground font-normal">x{i.cantidad}</span>
                        </span>
                        <span className="font-mono">{fmt(i.total)}</span>
                      </div>
                      <div className="rounded-lg bg-primary/10 border-l-4 border-primary p-3">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Precio unitario puesto en Argentina
                        </span>
                        <span className="text-2xl font-black text-primary font-mono">{fmt(i.unitPrice)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose / Resumen */}
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border pb-1.5 mb-2">
                  {multi ? "Trayendo todos los productos juntos" : "Desglose de costos"}
                </div>
                {multi && (
                  <p className="text-xs text-muted-foreground italic mb-3">
                    Cálculo unificado compartiendo flete y handling entre todos los productos del pedido.
                  </p>
                )}

                <div className="divide-y divide-border text-sm">
                  {multi &&
                    quote.items.map((i) => (
                      <div key={i.id} className="flex justify-between py-2">
                        <span className="text-foreground">
                          {i.nombre} — FOB (x{i.cantidad})
                        </span>
                        <span className="font-mono text-muted-foreground">{fmt(i.cantidad * i.fob)}</span>
                      </div>
                    ))}

                  {!multi && (
                    <div className="flex justify-between py-2">
                      <span className="text-foreground">Costo mercadería (FOB)</span>
                      <span className="font-mono text-muted-foreground">{fmt(quote.totalFOB)}</span>
                    </div>
                  )}

                  {/* SOLAMENTE FLETE */}
                  <div className="flex justify-between py-2 font-medium">
                    <span className="text-foreground">Flete</span>
                    <span className="font-mono text-foreground">{fmt(quote.freightTotal)}</span>
                  </div>

                  <div className="flex justify-between py-2">
                    <span className="text-foreground">Handling</span>
                    <span className="font-mono text-muted-foreground">{fmt(quote.handlingTotal)}</span>
                  </div>

                  {/* SOLAMENTE IMPUESTOS */}
                  <div className="flex justify-between py-2 font-medium">
                    <span className="text-foreground">Impuestos</span>
                    <span className="font-mono text-foreground">{fmt(quote.taxesTotal)}</span>
                  </div>
                </div>

                {/* Gran Total */}
                <div className="mt-4 rounded-xl bg-foreground text-background p-4 sm:p-5 flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                    {multi ? "Total trayendo todo" : "Total puesto en Argentina"}
                  </span>
                  <span className="text-xl sm:text-3xl font-black font-mono">{fmt(quote.grandTotal)}</span>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-wrap gap-3 pt-3 border-t border-border print:hidden">
                <button
                  type="button"
                  onClick={copyForWhatsapp}
                  className="btn-base bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{copied ? "¡Copiado al portapapeles!" : "Copiar para WhatsApp"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="btn-base border border-border hover:bg-muted text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
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
