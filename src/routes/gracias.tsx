import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { z } from "zod";

import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import { waLink } from "@/lib/store";

const graciasSearchSchema = z.object({
  code: z.string().optional(),
});

export const Route = createFileRoute("/gracias")({
  validateSearch: graciasSearchSchema,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "¡Gracias por tu compra! — Te importamos" },
      {
        name: "description",
        content:
          "Recibimos tu pedido de productos importados. Te contactamos para coordinar el envío.",
      },
      { property: "og:title", content: "¡Gracias por tu compra! — Te importamos" },
      {
        property: "og:description",
        content: "Pedido confirmado. Coordinamos el envío por WhatsApp.",
      },
    ],
  }),
  component: GraciasPage,
});

function GraciasPage() {
  const { code } = Route.useSearch();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const cart = useCart();
  useEffect(() => {
    cart.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-4xl">¡Gracias por tu compra!</h1>
        <p className="mt-4 text-muted-foreground">
          Recibimos tu pedido. Te escribimos para coordinar el envío.
        </p>

        {code && (
          <div className="card-soft mt-6 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
              Número de pedido
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-wide">{code}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Guardalo, te va a servir para hacer un seguimiento.
            </p>
          </div>
        )}

        <Link to="/catalogo" className="btn-base grad-urgente mt-8 text-primary-foreground">
          Seguir comprando
        </Link>

        <p className="mt-6 text-sm text-muted-foreground">
          Por cualquier consulta, no dudes en escribirnos
        </p>
        <a
          className="btn-base mt-2 w-full bg-whatsapp text-whatsapp-foreground"
          href={waLink(config, code ? `Pedido ${code}` : undefined)}
          target="_blank"
          rel="noreferrer"
        >
          Escribinos por WhatsApp
        </a>
      </div>
    </main>
  );
}
