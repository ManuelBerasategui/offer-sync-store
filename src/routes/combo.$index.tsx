import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import { createCheckout } from "@/lib/checkout.functions";
import { FALLBACK_IMAGE, imageUrl, money, toNumber, waLink } from "@/lib/store";

export const Route = createFileRoute("/combo/$index")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Combo en oferta — Te importamos" },
      {
        name: "description",
        content:
          "Comprá el combo completo para arrancar a revender: pack surtido de productos importados con precio de importador.",
      },
      { property: "og:title", content: "Combo en oferta — Te importamos" },
      {
        property: "og:description",
        content: "Pack completo para revender, con pago online por MercadoPago.",
      },
    ],
  }),
  component: ComboPage,
});

function ComboPage() {
  const { index } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { banners, config } = data;
  const cart = useCart();

  const banner = banners[Number(index)];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!banner) {
    return (
      <div className="min-h-screen">
        <SiteHeader config={config} />
        <div className="mx-auto max-w-[1180px] px-4 py-20 text-center">
          <h1 className="text-3xl">Combo no disponible</h1>
          <Link to="/" className="btn-base grad-urgente mt-6 text-primary-foreground">
            Ir al inicio
          </Link>
        </div>
        <SiteFooter config={config} />
      </div>
    );
  }

  const price = toNumber(banner.precio);
  const item = {
    id: `combo-${index}`,
    nombre: banner.titulo ?? "Combo",
    qty: 1,
    unitPrice: Math.round(price),
    imagen: imageUrl(banner.imagen_url),
  };

  const buyNow = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await createCheckout({
        data: { items: [{ nombre: item.nombre, qty: 1, unitPrice: item.unitPrice }], origin: window.location.origin },
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

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Volver al inicio
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-xl border border-border bg-surface">
            <img
              src={imageUrl(banner.imagen_url) || FALLBACK_IMAGE}
              alt={banner.titulo ?? "Combo en oferta"}
              referrerPolicy="no-referrer"
              className="aspect-[4/3] w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
          </div>

          <div>
            <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground">
              Combo en oferta
            </span>
            <h1 className="mt-3 font-sans text-[clamp(24px,6vw,36px)] font-bold normal-case tracking-tight">
              {banner.titulo}
            </h1>
            <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">
              {(banner.subtitulo ?? "").replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim()}
            </p>

            {price > 0 && (
              <p className="mt-6 font-mono text-3xl font-bold text-foreground">{money(price)}</p>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={buyNow}
                disabled={loading || price <= 0}
                className="btn-base grad-urgente text-primary-foreground disabled:opacity-60"
              >
                {loading ? "Redirigiendo..." : "Comprar ya"}
              </button>
              <button
                onClick={() => {
                  cart.add(item);
                  navigate({ to: "/carrito" });
                }}
                className="btn-base border border-border text-foreground hover:border-primary hover:text-primary"
              >
                Agregar al carrito
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <a
              className="btn-base mt-6 w-full bg-whatsapp text-whatsapp-foreground"
              href={waLink(config, banner.titulo)}
              target="_blank"
              rel="noreferrer"
            >
              Contactar por WhatsApp
            </a>
          </div>
        </div>
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
