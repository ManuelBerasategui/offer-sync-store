import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import { createCheckout } from "@/lib/checkout.functions";
import { FALLBACK_IMAGE, money, waLink } from "@/lib/store";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const checkout = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await createCheckout({
        data: {
          items: cart.items.map((i) => ({ nombre: i.nombre, qty: i.qty, unitPrice: i.unitPrice })),
          origin: window.location.origin,
        },
      });
      if (res.url) window.location.href = res.url;
      else setError(res.error ?? "No pudimos iniciar el pago.");
    } catch {
      setError("No pudimos iniciar el pago. Probá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

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
                    <p className="font-mono text-sm text-muted-foreground">
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
                  <p className="w-24 shrink-0 text-right font-mono text-sm font-bold">
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

            <div className="mt-6 card-soft p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold uppercase tracking-[1px] text-muted-foreground">
                  Total
                </span>
                <span className="font-mono text-2xl font-bold">{money(cart.total)}</span>
              </div>
              <button
                onClick={checkout}
                disabled={loading}
                className="btn-base grad-urgente mt-4 w-full text-primary-foreground disabled:opacity-60"
              >
                {loading ? "Redirigiendo..." : "Pagar con MercadoPago"}
              </button>
              {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
              <a
                className="btn-base mt-3 w-full bg-whatsapp text-whatsapp-foreground"
                href={waLink(config)}
                target="_blank"
                rel="noreferrer"
              >
                Contactar por WhatsApp
              </a>
            </div>
          </>
        )}
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
