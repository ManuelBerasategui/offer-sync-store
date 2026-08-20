import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FALLBACK_IMAGE,
  SUPLEMENTOS_MIN,
  SUPLEMENTOS_MSG,
  discountFor,
  findProduct,
  imageUrl,
  isSuplemento,
  onImageError,
  isWhatsappOnly,
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
  {
    name: "Martina G.",
    stars: 5,
    text: "Excelente servicio, me llegó todo perfecto. Sigo trabajando con ellos.",
  },
  {
    name: "Nicolás P.",
    stars: 4.5,
    text: "Muy buena calidad y respondieron todas mis dudas al toque.",
  },
  {
    name: "Julieta R.",
    stars: 5,
    text: "Compré por mayor para revender y se vendió todo en una semana.",
  },
];

function ProductoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, config } = data;
  const cart = useCart();

  const product = findProduct(products, id);

  const [qty, setQty] = useState(1);
  const [custom, setCustom] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showMin, setShowMin] = useState(false);

  const tiers = useMemo(() => (product ? tiersOf(product) : []), [product]);
  const variants = product?.variants ?? [];
  const [selectedVariantId, setSelectedVariantId] = useState("");

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

  const consultar = isWhatsappOnly(product);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId);
  const basePrice = selectedVariant ? Number(selectedVariant.precio) : priceOf(product);
  const selectedImage = selectedVariant?.imagen_url || product.imagen_url;
  const percent = discountFor(product, qty);
  const unit = unitPriceFor(product, qty, basePrice);
  const total = unit * qty;

  const cartItem = {
    id: selectedVariant
      ? `${String(product.id ?? product.nombre ?? "")}:${selectedVariant.id}`
      : String(product.id ?? product.nombre ?? ""),
    productId: product.id ? String(product.id) : undefined,
    nombre: selectedVariant ? `${product.nombre ?? "Producto"} — ${selectedVariant.color}` : product.nombre ?? "Producto",
    qty,
    unitPrice: Math.round(unit),
    basePrice,
    variantId: selectedVariant?.id,
    variantColor: selectedVariant?.color,
    imagen: imageUrl(selectedImage),
    categoria: product.categoria ?? "",
  };

  const suplemento = isSuplemento(product.categoria);
  const bloqueaCompra = suplemento && total < SUPLEMENTOS_MIN;

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
        <Link
          to="/catalogo"
          className="text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          ← Volver al catálogo
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-xl border border-border bg-surface">
            <img
              src={imageUrl(selectedImage) || FALLBACK_IMAGE}
              alt={product.nombre ?? "Producto"}
              referrerPolicy="no-referrer"
              className="aspect-square w-full bg-surface object-contain p-3"
              onError={onImageError(selectedImage)}
            />
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
              {product.categoria || "General"}
            </p>
            <h1 className="mt-2 font-sans text-[clamp(24px,6vw,36px)] font-bold normal-case tracking-tight">
              {product.nombre}
            </h1>

            {consultar ? (
              <p className="mt-4 text-sm font-semibold text-muted-foreground">
                Consultá el precio y disponibilidad por WhatsApp.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-baseline gap-2">
                  {percent > 0 && (
                    <span className="tabular-nums text-base text-muted-foreground line-through">
                      {money(priceOf(product))}
                    </span>
                  )}
                  <span className="tabular-nums text-3xl font-bold text-foreground">
                    {money(unit)}
                  </span>
                  {percent > 0 && (
                    <span className="text-xs font-bold text-primary">-{percent}%</span>
                  )}
                </div>
              </>
            )}

            {!consultar && variants.length > 0 && (
              <div className="mt-6">
                <label
                  htmlFor="color"
                  className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground"
                >
                  Color
                </label>
                <select
                  id="color"
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="mt-2 w-full max-w-[320px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  <option value="">Elegí un color</option>
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.color} — {money(variant.precio)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Cantidad */}
            {!consultar && (
              <div className="mt-6">
                {tiers.length > 0 && (
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Llevá más, pagá menos!
                  </p>
                )}
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
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {consultar ? (
                <a
                  className="btn-base w-full bg-whatsapp text-whatsapp-foreground"
                  href={waLink(config, product.nombre)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Consultar por WhatsApp
                </a>
              ) : showCheckout ? (
                <CheckoutFlow
                  items={[{ nombre: cartItem.nombre, qty, unitPrice: cartItem.unitPrice }]}
                  total={total}
                />
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (variants.length > 0 && !selectedVariant) return;
                      if (bloqueaCompra) setShowMin(true);
                      else setShowCheckout(true);
                    }}
                    disabled={variants.length > 0 && !selectedVariant}
                    className="btn-base w-full grad-urgente text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {variants.length > 0 && !selectedVariant ? "Elegí un color para comprar" : "Comprar ya"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (variants.length > 0 && !selectedVariant) return;
                      cart.add(cartItem);
                      navigate({ to: "/carrito" });
                    }}
                    disabled={variants.length > 0 && !selectedVariant}
                    className="btn-base w-full border border-border text-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Agregar al carrito
                  </button>
                  <p className="text-center text-xs text-muted-foreground">
                    Pagá con tarjeta, débito o dinero en cuenta vía MercadoPago.
                  </p>
                </>
              )}
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

      <Dialog open={showMin} onOpenChange={setShowMin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compra mínima de suplementos</DialogTitle>
            <DialogDescription>{SUPLEMENTOS_MSG}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => {
                cart.add(cartItem);
                navigate({ to: "/carrito" });
              }}
              className="btn-base grad-urgente text-primary-foreground"
            >
              Agregar al carrito
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
