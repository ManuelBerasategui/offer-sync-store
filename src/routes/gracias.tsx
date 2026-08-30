import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import { z } from "zod";

import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import { money, waLink, getBankInfo } from "@/lib/store";
import { verifyOrderPayment } from "@/lib/orders.functions";

const graciasSearchSchema = z
  .object({
    code: z.string().optional(),
    status: z.string().optional(),
    collection_status: z.string().optional(),
    // MP puede enviar estos como números — los convertimos a string para no perderlos
    payment_id: z.coerce.string().optional(),
    collection_id: z.coerce.string().optional(),
  })
  .passthrough();

export const Route = createFileRoute("/gracias")({
  validateSearch: graciasSearchSchema,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Estado de tu compra — Te importamos" },
      {
        name: "description",
        content:
          "Estado de tu pedido de productos importados. Te contactamos para coordinar el envío.",
      },
      { property: "og:title", content: "Estado de tu compra — Te importamos" },
      {
        property: "og:description",
        content: "Confirmación de pedido y seguimiento de envío.",
      },
    ],
  }),
  component: GraciasPage,
});

function GraciasPage() {
  const { code, status, collection_status, payment_id, collection_id } = Route.useSearch();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const cart = useCart();
  const bankInfo = getBankInfo(config);

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [orderState, setOrderState] = useState<{
    estado: "pagado" | "pendiente" | "rechazado" | "desconocido" | "cargando";
    total?: number | undefined;
    metodo?: string | undefined;
  }>({ estado: "cargando" });

  const copyToClipboard = (val: string, field: string) => {
    void navigator.clipboard.writeText(val);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!code) {
        setOrderState({ estado: "desconocido" });
        return;
      }

      // Si viene parámetro de status desde Mercado Pago o si se pago por tarjeta
      const rawStatus = status || collection_status || "";
      try {
        const res = await verifyOrderPayment({
          data: {
            code,
            status: rawStatus,
            collectionStatus: collection_status,
            paymentId: payment_id || collection_id,
          },
        });
        if (!cancelled) {
          setOrderState({ estado: res.estado, total: res.total, metodo: res.metodoPago });
          if (res.estado === "pagado") {
            cart.clear();
          }
        }
      } catch {
        if (!cancelled) {
          const isApproved = rawStatus.toLowerCase() === "approved";
          setOrderState({ estado: isApproved ? "pagado" : "pendiente" });
          if (isApproved) cart.clear();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, status, collection_status]);

  const isApproved = orderState.estado === "pagado";
  const isLoading = orderState.estado === "cargando";
  const isPending = orderState.estado === "pendiente";
  const isRejected = orderState.estado === "rechazado" || orderState.estado === "desconocido";
  const isTransfer = orderState.metodo === "transferencia";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12 text-center">
      <div className="max-w-md w-full">
        {isApproved ? (
          <>
            <span className="inline-block rounded-full bg-whatsapp/10 px-3 py-1 text-xs font-bold text-whatsapp uppercase tracking-wider mb-2">
              ✓ Pago Aprobado
            </span>
            <h1 className="text-4xl font-bold">¡Gracias por tu compra!</h1>
            <p className="mt-4 text-muted-foreground">
              Recibimos tu pago correctamente. Ya estamos preparando tu pedido y te contactaremos
              para coordinar el envío.
            </p>
          </>
        ) : isLoading ? (
          <>
            <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              ⧗ Verificando pedido…
            </span>
            <h1 className="text-3xl font-bold">Procesando tu pedido</h1>
            <p className="mt-4 text-muted-foreground">
              Estamos confirmando los detalles. Esto tarda solo unos segundos.
            </p>
          </>
        ) : isPending ? (
          isTransfer ? (
            <>
              <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                ⏳ Pedido Reservado
              </span>
              <h1 className="text-3xl font-bold">¡Tu pedido fue registrado!</h1>
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-300 text-left font-medium leading-relaxed">
                ⚠️ <strong>Regla de reserva:</strong> Tu pedido y stock están reservados por <strong>24 horas</strong>. Por favor enviá el comprobante de transferencia a nuestro WhatsApp antes de que caduque el plazo; de lo contrario, la orden se cancelará automáticamente.
              </div>
            </>
          ) : (
            <>
              <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">
                ⏳ Pago en Proceso
              </span>
              <h1 className="text-3xl font-bold">Pago en revisión</h1>
              <p className="mt-4 text-muted-foreground">
                Tu pago con tarjeta / Mercado Pago está siendo procesado. En cuanto se acredite te avisaremos y prepararemos tu pedido.
              </p>
            </>
          )
        ) : (
          <>
            <span className="inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive uppercase tracking-wider mb-2">
              ✕ Pago No Completado
            </span>
            <h1 className="text-3xl font-bold text-foreground">El pago no se completó</h1>
            <p className="mt-4 text-muted-foreground">
              Mercado Pago no pudo procesar la transacción o la operación fue cancelada. Podés
              volver al carrito para reintentar.
            </p>
          </>
        )}

        {code && (
          <div className="card-soft mt-6 p-4 text-left">
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              Número de pedido
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-primary">{code}</p>
            {orderState.total && orderState.total > 0 ? (
              <p className="mt-1 text-sm font-bold text-foreground">
                {isApproved
                  ? `Total abonado: ${money(orderState.total)}`
                  : isTransfer
                    ? `Total a transferir: ${money(orderState.total)}`
                    : `Total: ${money(orderState.total)}`}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Guardá este código para hacer el seguimiento.
            </p>

            {isPending && isTransfer && (
              <div className="mt-4 border-t border-border/60 pt-3 text-xs space-y-2">
                <p className="font-bold text-foreground">Datos para realizar la transferencia:</p>
                <div className="flex items-center justify-between">
                  <span>Alias: <strong className="font-mono">{bankInfo.alias}</strong></span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankInfo.alias, "alias")}
                    className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground"
                  >
                    {copiedField === "alias" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copiedField === "alias" ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="min-w-0 pr-2">CBU: <strong className="font-mono break-all">{bankInfo.cbu}</strong></span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(bankInfo.cbu, "cbu")}
                    className="shrink-0 flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground"
                  >
                    {copiedField === "cbu" ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copiedField === "cbu" ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="text-muted-foreground">Titular: <strong className="text-foreground">{bankInfo.titular}</strong></p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {isPending && isTransfer ? (
            <a
              className="btn-base w-full bg-whatsapp text-whatsapp-foreground font-bold shadow-md"
              href={waLink(
                config,
                `¡Hola! Adjunto el comprobante de transferencia para el pedido ${code ?? ""} por ${orderState.total ? money(orderState.total) : ""}. (Reserva 24 hs)`
              )}
              target="_blank"
              rel="noreferrer"
            >
              Enviar comprobante por WhatsApp
            </a>
          ) : isRejected && !isLoading ? (
            <Link to="/carrito" className="btn-base w-full grad-urgente text-primary-foreground">
              Volver al carrito y reintentar
            </Link>
          ) : (
            <Link to="/catalogo" className="btn-base w-full grad-urgente text-primary-foreground">
              Seguir comprando
            </Link>
          )}

          {(!isPending || !isTransfer) && (
            <a
              className="btn-base w-full bg-whatsapp text-whatsapp-foreground"
              href={waLink(config, code ? `Consulta sobre pedido ${code}` : undefined)}
              target="_blank"
              rel="noreferrer"
            >
              Escribinos por WhatsApp
            </a>
          )}
        </div>
      </div>
    </main>
  );
}
