import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";

import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import { money, waLink } from "@/lib/store";
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

  const [orderState, setOrderState] = useState<{
    estado: "pagado" | "pendiente" | "rechazado" | "desconocido" | "cargando";
    total?: number | undefined;
  }>({ estado: "cargando" });

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
            // Usamos payment_id o collection_id (MP envía ambos, el que llegue sirve)
            paymentId: payment_id || collection_id,
          },
        });
        if (!cancelled) {
          setOrderState({ estado: res.estado, total: res.total });
          if (res.estado === "pagado") {
            cart.clear();
          }
        }
      } catch {
        if (!cancelled) {
          // Si el estado enviado directamente en URL o tarjeta era approved
          const isApproved = (rawStatus.toLowerCase() === "approved");
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
  const isRejected = !isApproved && !isLoading;

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
              Recibimos tu pago correctamente. Ya estamos preparando tu pedido y te contactaremos para coordinar el envío.
            </p>
          </>
        ) : isLoading ? (
          <>
            <span className="inline-block rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
              ⧗ Verificando pago…
            </span>
            <h1 className="text-3xl font-bold">Procesando tu pedido</h1>
            <p className="mt-4 text-muted-foreground">
              Estamos confirmando el pago con Mercado Pago. Esto tarda solo unos segundos.
            </p>
          </>
        ) : (
          <>
            <span className="inline-block rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive uppercase tracking-wider mb-2">
              ✕ Pago No Completado
            </span>
            <h1 className="text-3xl font-bold text-foreground">El pago no se completó</h1>
            <p className="mt-4 text-muted-foreground">
              Mercado Pago no pudo procesar la transacción o la operación fue cancelada. Podés volver al carrito para reintentar.
            </p>
          </>
        )}

        {code && (
          <div className="card-soft mt-6 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              Número de pedido
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{code}</p>
            {orderState.total && orderState.total > 0 ? (
              <p className="mt-1 text-xs font-bold text-foreground">
                Total: {money(orderState.total)}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              Guardalo, te va a servir para hacer el seguimiento.
            </p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3">
          {isRejected && !isLoading ? (
            <Link to="/carrito" className="btn-base w-full grad-urgente text-primary-foreground">
              Volver al carrito y reintentar
            </Link>
          ) : (
            <Link to="/catalogo" className="btn-base w-full grad-urgente text-primary-foreground">
              Seguir comprando
            </Link>
          )}

          <p className="mt-4 text-sm text-muted-foreground">
            Por cualquier consulta o para enviar comprobante:
          </p>
          <a
            className="btn-base w-full bg-whatsapp text-whatsapp-foreground"
            href={waLink(config, code ? `Consulta sobre pedido ${code}` : undefined)}
            target="_blank"
            rel="noreferrer"
          >
            Escribinos por WhatsApp
          </a>
        </div>
      </div>
    </main>
  );
}

