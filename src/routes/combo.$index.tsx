import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Minus, Plus } from "lucide-react";

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
import type { ComboQuantityTier } from "@/lib/store";

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
      { property: "og:image", content: "https://teimportamosarg.com/businessicon.jpg" },
      { property: "og:image:secure_url", content: "https://teimportamosarg.com/businessicon.jpg" },
      { name: "twitter:image", content: "https://teimportamosarg.com/businessicon.jpg" },
      { property: "og:url", content: "https://teimportamosarg.com/" },
    ],
    links: [
      { rel: "canonical", href: "https://teimportamosarg.com/" },
    ],
  }),
  component: ComboPage,
});

/** Dado un array de tramos y una cantidad, devuelve el precio fijo aplicable (o null si no hay tramo). */
function priceForQty(tiers: ComboQuantityTier[], qty: number): number | null {
  const sorted = [...tiers].sort((a, b) => b.units - a.units); // mayor a menor
  for (const tier of sorted) {
    if (qty >= tier.units) return tier.price;
  }
  return null;
}

function ComboPage() {
  const { index } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { banners, config } = data;
  const cart = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [qty, setQty] = useState(1);

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

  // Tiers de precio por cantidad (precio fijo en ARS, sin descuento por transferencia)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTiers = banner.quantity_tiers ?? (banner as any).link;
  const tiers: ComboQuantityTier[] | null = useMemo(() => {
    if (Array.isArray(rawTiers) && rawTiers.length > 0) return rawTiers;
    if (typeof rawTiers === "string" && rawTiers.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(rawTiers);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch { /* ignorar */ }
    }
    return null;
  }, [rawTiers]);

  // Precio unitario en lista según cantidad elegida
  const unitListPrice = useMemo(() => {
    if (tiers) {
      const tierPrice = priceForQty(tiers, qty);
      if (tierPrice !== null) return tierPrice;
    }
    return basePrice;
  }, [tiers, qty, basePrice]);

  // Precio con descuento por transferencia
  const unitTransferPrice = transferPrice(unitListPrice, discPct);

  // Total
  const totalListPrice = unitListPrice * qty;
  const totalTransferPrice = unitTransferPrice * qty;

  const item = {
    id: `combo-${index}`,
    nombre: banner.titulo ?? "Combo",
    qty,
    unitPrice: Math.round(unitListPrice),
    basePrice: Math.round(basePrice),
    imagen: banner.imagen_url || imageUrl(banner.imagen_url),
  };

  const sortedTiers = useMemo(() => {
    return tiers ? [...tiers].sort((a, b) => a.units - b.units) : [];
  }, [tiers]);

  const activeTier = useMemo(() => {
    if (!tiers) return null;
    const sortedDesc = [...tiers].sort((a, b) => b.units - a.units);
    return sortedDesc.find((t) => qty >= t.units) ?? null;
  }, [tiers, qty]);

  const nextTier = useMemo(() => {
    if (!tiers) return null;
    return sortedTiers.find((t) => t.units > qty) ?? null;
  }, [tiers, sortedTiers, qty]);

  const unitSavings = basePrice > unitListPrice ? basePrice - unitListPrice : 0;
  const totalSavings = unitSavings * qty;
  const savingsPct =
    basePrice > 0 && unitSavings > 0 ? Math.round((unitSavings / basePrice) * 100) : 0;

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
        <Link to="/" className="text-sm font-semibold text-muted-foreground hover:text-primary">
          ← Volver al inicio
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
          <div className="mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center overflow-hidden rounded-2xl border border-border bg-surface lg:sticky lg:top-24">
            <img
              src={imageUrl(banner.imagen_url) || FALLBACK_IMAGE}
              alt={banner.titulo ?? "Combo en oferta"}
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
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
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {unitSavings > 0 && (
                      <span className="tabular-nums text-lg sm:text-xl text-muted-foreground line-through opacity-75">
                        {money(qty > 1 ? transferPrice(basePrice * qty, discPct) : transferPrice(basePrice, discPct))}
                      </span>
                    )}
                    <span className="tabular-nums text-3xl sm:text-4xl font-extrabold text-foreground">
                      {qty > 1 ? money(totalTransferPrice) : money(unitTransferPrice)}
                    </span>
                    <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                      {discPct}% OFF Transferencia
                    </span>
                    {savingsPct > 0 && (
                      <span className="rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary border border-primary/20">
                        🎁 {savingsPct}% OFF x Cantidad
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground">
                    o{" "}
                    {unitSavings > 0 && (
                      <span className="line-through opacity-75 mr-1">{money(basePrice * qty)}</span>
                    )}
                    <span className="font-semibold text-foreground/80">
                      {qty > 1 ? money(totalListPrice) : money(unitListPrice)}
                    </span>{" "}
                    con Mercado Pago
                    {qty > 1 && (
                      <span className="ml-1 text-muted-foreground">
                        ({money(unitListPrice)} c/u)
                      </span>
                    )}
                  </p>

                  {totalSavings > 0 && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-1.5 border border-emerald-500/20">
                      <span>🎉</span>
                      <span>
                        ¡Ahorrás {money(totalSavings)} en total por llevar {qty} unidades ({money(unitSavings)} menos por unidad)!
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bloque 🎁 Descuentos por cantidad interactivo */}
            {tiers && sortedTiers.length > 0 && (
              <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 p-4 text-xs text-foreground">
                <div className="flex items-start gap-2.5">
                  <span className="text-xl shrink-0 mt-0.5">🎁</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-primary text-sm">
                        Descuentos por cantidad en este Combo:
                      </p>
                      <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        Tocá un tramo para seleccionarlo
                      </span>
                    </div>

                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      {sortedTiers.map((tier) => {
                        const isCurrentActive = activeTier?.units === tier.units;
                        const isReached = qty >= tier.units;
                        const tierSavings = basePrice > tier.price ? basePrice - tier.price : 0;
                        const tierPct =
                          basePrice > 0 && tierSavings > 0
                            ? Math.round((tierSavings / basePrice) * 100)
                            : 0;

                        return (
                          <button
                            key={tier.units}
                            type="button"
                            onClick={() => setQty(tier.units)}
                            className={`flex flex-col text-left p-2.5 rounded-lg border transition-all cursor-pointer ${
                              isCurrentActive
                                ? "border-primary bg-primary/15 shadow-xs ring-2 ring-primary/40"
                                : isReached
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-border/70 bg-surface/60 hover:border-primary/50 hover:bg-surface"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="font-bold text-foreground text-xs">
                                Llevando {tier.units} u. o más
                              </span>
                              {isCurrentActive ? (
                                <span className="rounded bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                                  ✓ APLICADO
                                </span>
                              ) : isReached ? (
                                <span className="rounded bg-emerald-600/20 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                  alcanzado
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium text-muted-foreground">
                                  Faltan {tier.units - qty} u.
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-baseline gap-1.5">
                              <span className="font-extrabold text-sm text-primary">
                                {money(tier.price)}{" "}
                                <span className="text-[10px] font-normal text-muted-foreground">c/u</span>
                              </span>
                              {tierPct > 0 && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                  -{tierPct}% OFF
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {nextTier && (
                      <p className="mt-2.5 text-[11px] text-muted-foreground flex items-center gap-1">
                        <span>💡</span>
                        <span>
                          Llevá <strong className="text-foreground">{nextTier.units - qty} unidad{nextTier.units - qty !== 1 ? "es" : ""} más</strong> para pagar <strong className="text-primary">{money(nextTier.price)} c/u</strong>.
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Selector de Cantidad */}
            {basePrice > 0 && (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                    Cantidad
                  </label>
                  {qty > 1 && (
                    <span className="text-xs font-semibold text-muted-foreground">
                      Subtotal: <strong className="text-foreground">{money(totalListPrice)}</strong>
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
                    aria-label="Reducir cantidad"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="min-w-[2rem] text-center text-lg font-bold tabular-nums">{qty}</span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => q + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-foreground hover:border-primary hover:text-primary transition-colors"
                    aria-label="Aumentar cantidad"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-primary font-semibold">
                    {money(unitListPrice)} c/u
                  </span>
                  {activeTier && (
                    <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      Precio tramo activo
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {showCheckout ? (
                <CheckoutFlow
                  items={[{ nombre: item.nombre, qty, unitPrice: item.unitPrice }]}
                  total={item.unitPrice * qty}
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
              rel="noopener noreferrer"
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
