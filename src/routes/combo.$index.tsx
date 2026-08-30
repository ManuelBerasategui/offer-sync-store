import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import {
  FALLBACK_IMAGE,
  imageUrl,
  onImageError,
  money,
  toNumber,
  waLink,
  transferPrice,
  transferDiscountPct,
} from "@/lib/store";

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
  const [showCheckout, setShowCheckout] = useState(false);

  const banner = banners[Number(index)];

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

  const basePrice = toNumber(banner.precio);
  const discPct = transferDiscountPct(config);
  const tPrice = transferPrice(basePrice, discPct);

  const item = {
    id: `combo-${index}`,
    nombre: banner.titulo ?? "Combo",
    qty: 1,
    unitPrice: Math.round(basePrice),
    basePrice: Math.round(basePrice),
    imagen: imageUrl(banner.imagen_url),
  };

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Volver al inicio
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center overflow-hidden rounded-xl border border-border bg-surface p-4">
            <img
              src={imageUrl(banner.imagen_url) || FALLBACK_IMAGE}
              alt={banner.titulo ?? "Combo en oferta"}
              referrerPolicy="no-referrer"
              className="h-full w-full object-contain"
              onError={onImageError(banner.imagen_url)}
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
              {(banner.subtitulo ?? "")
                .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
                .trim()}
            </p>

            {basePrice > 0 && (
              <div className="mt-6 rounded-2xl border border-border/80 bg-surface/40 p-4 sm:p-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="tabular-nums text-3xl sm:text-4xl font-extrabold text-foreground">
                      {money(tPrice)}
                    </span>
                    <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      {discPct}% OFF Transferencia
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    o <span className="font-semibold text-foreground/80">{money(basePrice)}</span> con tarjeta o Mercado Pago
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {showCheckout ? (
                <CheckoutFlow
                  items={[{ nombre: item.nombre, qty: 1, unitPrice: item.unitPrice }]}
                  total={item.unitPrice}
                />
              ) : (
                <>
                  <button
                    onClick={() => setShowCheckout(true)}
                    disabled={basePrice <= 0}
                    className="btn-base grad-urgente text-primary-foreground disabled:opacity-60"
                  >
                    Comprar ya
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
                </>
              )}
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
