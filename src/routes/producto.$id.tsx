import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import { createCheckout } from "@/lib/checkout.functions";
import {
  FALLBACK_IMAGE,
  discountFor,
  hasOffer,
  imageUrl,
  money,
  priceOf,
  tiersOf,
  unitPriceFor,
  waLink,
} from "@/lib/store";

export const Route = createFileRoute("/producto/$id")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Producto — Te importamos" },
      {
        name: "description",
        content:
          "Comprá online productos importados originales con descuentos por cantidad y envíos a todo el país.",
      },
      { property: "og:title", content: "Producto — Te importamos" },
      {
        property: "og:description",
        content: "Comprá online con MercadoPago. Descuentos por cantidad para revendedores.",
      },
    ],
  }),
  component: ProductoPage,
});

const REVIEWS = [
  { name: "Martina G.", stars: 5, text: "Excelente servicio, me llegó todo perfecto. Sigo trabajando con ellos." },
  { name: "Nicolás P.", stars: 4.5, text: "Muy buena calidad y respondieron todas mis dudas al toque." },
  { name: "Julieta R.", stars: 5, text: "Compré por mayor para revender y se vendió todo en una semana." },
];

function ProductoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, config } = data;
  const cart = useCart();

  const product = products.find((p) => String(p.id ?? "") === id);

  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const tiers = useMemo(() => (product ? tiersOf(product) : []), [product]);

  if (!product) {
    return (
      <div className="min-h-screen">
        <SiteHeader config={config} />
        <div className="mx-auto max-w-[1180px] px-4 py-20 text-center">
          <h1 className="text-3xl">Producto no encontrado</h1>
          <Link to="/catalogo" className="btn-base grad-urgente mt-6 text-primary-foreground">
            Ver catálogo
          </Link>
        </div>
        <SiteFooter config={config} />
      </div>
    );
  }

  const percent = discountFor(product, qty);
  const unit = unitPriceFor(product, qty);
  const total = unit * qty;

  const cartItem = {
    id: String(product.id ?? product.nombre ?? ""),
    nombre: product.nombre ?? "Producto",
    qty,
    unitPrice: Math.round(unit),
    imagen: imageUrl(product.imagen_url),
  };

  const buyNow = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await createCheckout({
        data: {
          items: [{ nombre: cartItem.nombre, qty, unitPrice: cartItem.unitPrice }],
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

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/catalogo" className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-xl border border-border bg-surface">
            <img
              src={imageUrl(product.imagen_url) || FALLBACK_IMAGE}
              alt={product.nombre ?? "Producto"}
              referrerPolicy="no-referrer"
              className="aspect-square w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
              {product.categoria || "General"}
            </p>
            <h1 className="mt-2 font-sans text-[clamp(24px,6vw,36px)] font-bold normal-case tracking-tight">
              {product.nombre}
            </h1>

            <div className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="font-mono text-3xl font-bold text-foreground">{money(unit)}</span>
              {(percent > 0 || hasOffer(product)) && (
                <span className="font-mono text-base text-muted-foreground line-through">
                  {money(percent > 0 ? priceOf(product) : product.precio)}
                </span>
              )}
              {percent > 0 && (
                <span className="rounded-md bg-primary px-2 py-1 text-xs font-bold text-primary-foreground">
                  -{percent}% por {qty} u.
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Total por {qty} {qty === 1 ? "unidad" : "unidades"}: <strong>{money(total)}</strong>
            </p>

            {/* Cantidad */}
            <div className="mt-6">
              <label className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                Cantidad
              </label>
              {custom ? (
                <div className="mt-2 flex gap-2">
                  <input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-32 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCustom(false);
                      setQty(1);
                    }}
                    className="text-sm font-semibold text-muted-foreground hover:text-primary"
                  >
                    Volver a la lista
                  </button>
                </div>
              ) : (
                <select
                  value={qty}
                  onChange={(e) => {
                    if (e.target.value === "otro") setCustom(true);
                    else setQty(Number(e.target.value));
                  }}
                  className="mt-2 w-full max-w-[220px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "unidad" : "unidades"}
                    </option>
                  ))}
                  <option value="otro">Otro (personalizado)</option>
                </select>
              )}

              {tiers.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                  {tiers.map((t) => (
                    <li
                      key={t.units}
                      className={`rounded-md border px-2 py-1 ${
                        qty >= t.units
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {t.units}+ u. → -{t.percent}%
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                onClick={buyNow}
                disabled={loading}
                className="btn-base grad-urgente text-primary-foreground disabled:opacity-60"
              >
                {loading ? "Redirigiendo..." : "Comprar ya"}
              </button>
              <button
                onClick={() => {
                  cart.add(cartItem);
                  navigate({ to: "/carrito" });
                }}
                className="btn-base border border-border text-foreground hover:border-primary hover:text-primary"
              >
                Agregar al carrito
              </button>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <p className="text-center text-xs text-muted-foreground">
                Pagá con tarjeta, débito o dinero en cuenta vía MercadoPago.
              </p>
            </div>
          </div>
        </div>

        {/* Descripción */}
        <section className="mt-12 max-w-3xl">
          <h2 className="font-sans text-xl font-bold normal-case tracking-tight">Descripción</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
            {product.descripcion || "Producto importado original. Consultanos por más detalles."}
          </p>
        </section>

        {/* Reseñas */}
        <section className="mt-10 max-w-3xl">
          <h2 className="font-sans text-xl font-bold normal-case tracking-tight">
            Reseñas de compradores
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {REVIEWS.map((r) => (
              <div key={r.name} className="card-soft p-4">
                <Stars value={r.stars} />
                <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
                <p className="mt-2 text-xs font-semibold">{r.name}</p>
              </div>
            ))}
          </div>
        </section>

        <a
          className="btn-base mt-10 w-full bg-whatsapp text-whatsapp-foreground sm:w-auto sm:px-10"
          href={waLink(config, product.nombre)}
          target="_blank"
          rel="noreferrer"
        >
          Contactar por WhatsApp
        </a>
        <p className="mt-2 text-xs text-muted-foreground">
          Consultanos por stock, envíos o descuentos por cantidad.
        </p>
      </main>

      <SiteFooter config={config} />
    </div>
  );
}

export function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-amber">
      <span aria-hidden className="text-sm">
        {"★".repeat(Math.floor(value))}
        {value % 1 !== 0 ? "☆" : ""}
      </span>
      <span className="text-xs font-bold text-foreground">{value.toFixed(1)}</span>
    </div>
  );
}
