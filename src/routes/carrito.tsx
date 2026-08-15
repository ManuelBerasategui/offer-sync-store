import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import {
  FALLBACK_IMAGE,
  SUPLEMENTOS_MIN,
  SUPLEMENTOS_MSG,
  isSuplemento,
  money,
  waLink,
} from "@/lib/store";

export const Route = createFileRoute("/carrito")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Tu carrito — Te importamos" },
      {
        name: "description",
        content: "Revisá tu pedido y pagá online con MercadoPago. Envíos a todo el país.",
      },
      { property: "og:title", content: "Tu carrito — Te importamos" },
      { property: "og:description", content: "Finalizá tu compra de productos importados." },
    ],
  }),
  component: CarritoPage,
});

function CarritoPage() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { config } = data;
  const cart = useCart();

  const items = cart.items.map((i) => ({ nombre: i.nombre, qty: i.qty, unitPrice: i.unitPrice }));

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[900px] px-4 py-10 sm:px-6">
        <h1 className="text-[clamp(28px,7vw,40px)]">Tu carrito</h1>

        {cart.items.length === 0 ? (
          <div className="mt-8 card-soft p-8 text-center">
            <p className="text-muted-foreground">Todavía no agregaste productos.</p>
            <Link to="/catalogo" className="btn-base grad-urgente mt-6 text-primary-foreground">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 flex flex-col gap-3">
              {cart.items.map((i) => (
                <li key={i.id} className="card-soft flex items-center gap-3 p-3">
                  <img
                    src={i.imagen || FALLBACK_IMAGE}
                    alt={i.nombre}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{i.nombre}</p>
                    <p className="tabular-nums text-sm text-muted-foreground">
                      {money(i.unitPrice)} c/u
                    </p>
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={i.qty}
                    onChange={(e) => cart.setQty(i.id, Number(e.target.value) || 1)}
                    className="w-16 rounded-lg border border-input bg-background px-2 py-1.5 text-sm outline-none focus:border-primary"
                  />
                  <p className="w-24 shrink-0 text-right tabular-nums text-sm font-bold">
                    {money(i.unitPrice * i.qty)}
                  </p>
                  <button
                    onClick={() => cart.remove(i.id)}
                    className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex items-baseline justify-between rounded-xl border border-border bg-card p-5">
              <span className="text-sm font-semibold uppercase tracking-[1px] text-muted-foreground">
                Total
              </span>
              <span className="tabular-nums text-2xl font-bold">{money(cart.total)}</span>
            </div>

            <div className="mt-4">
              {suplementosTotal > 0 && suplementosTotal < SUPLEMENTOS_MIN ? (
                <div className="card-soft p-5">
                  <p className="text-sm font-semibold text-foreground">{SUPLEMENTOS_MSG}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Llevás {money(suplementosTotal)} en suplementos.
                  </p>
                  <Link
                    to="/catalogo"
                    className="btn-base grad-urgente mt-4 text-primary-foreground"
                  >
                    Seguir comprando
                  </Link>
                </div>
              ) : (
                <CheckoutFlow items={items} total={cart.total} />
              )}
            </div>

            <a
              className="btn-base mt-3 w-full bg-whatsapp text-whatsapp-foreground"
              href={waLink(config)}
              target="_blank"
              rel="noreferrer"
            >
              Contactar por WhatsApp
            </a>
          </>
        )}
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
