import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Minus, Plus } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import {
  FALLBACK_IMAGE,
  SUPLEMENTOS_MIN,
  isSuplemento,
  money,
  priceOf,
  waLink,
  parseCategoryRules,
  checkCategoryMins,
  normCat,
  findProduct,
  transferPrice,
  transferDiscountPct,
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
  const { products, config } = data;
  const cart = useCart();

  // Garantizar que la categoría esté resuelta para cada ítem (usando el producto de la DB como fallback si i.categoria viene vacío)
  const cartItemsWithCat = useMemo(() => {
    return cart.items.map((i) => {
      const prod = findProduct(products, i.productId || i.id || i.nombre);
      const cat = i.categoria || prod?.categoria || "";
      return {
        ...i,
        categoria: cat,
      };
    });
  }, [cart.items, products]);

  const items = cartItemsWithCat.map((i) => ({ nombre: i.nombre, qty: i.qty, unitPrice: i.unitPrice, productId: i.productId }));

  // Mínimos por categoría (dinámicos o estáticos)
  const catRules = parseCategoryRules(config);

  // Violaciones de reglas dinámicas generales (excluyendo suplementos para evitar duplicación)
  const dynamicViolations = checkCategoryMins(
    cartItemsWithCat.map((i: { categoria?: string; qty: number; unitPrice: number }) => ({
      ...(i.categoria !== undefined ? { categoria: i.categoria } : {}),
      qty: i.qty,
      unitPrice: i.unitPrice,
    })),
    catRules,
  ).filter((v) => normCat(v.category) !== normCat("Suplementos"));

  // Verificación directa e inquebrantable para Suplementos ($250.000)
  const totalSuplementos = cartItemsWithCat
    .filter((i: { categoria?: string; nombre?: string }) => isSuplemento(i.categoria, i.nombre))
    .reduce((sum: number, i: { qty: number; unitPrice: number }) => sum + i.qty * i.unitPrice, 0);

  const minSuplementos = catRules[normCat("Suplementos")]?.minAmount || SUPLEMENTOS_MIN;
  const suplementosViolation =
    totalSuplementos > 0 && totalSuplementos < minSuplementos
      ? {
          category: "Suplementos",
          type: "amount" as const,
          min: minSuplementos,
          current: totalSuplementos,
        }
      : null;

  const minViolations = [
    ...(suplementosViolation ? [suplementosViolation] : []),
    ...dynamicViolations,
  ];
  const hasViolations = minViolations.length > 0;

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
              {cart.items.map((i) => {
                const product = findProduct(products, i.productId || i.id || i.nombre);
                const basePrice = i.basePrice ?? (product ? priceOf(product) : i.unitPrice);
                // Muestra el descuento real según precio base vs precio de línea (funciona con descuentos de categoría también)
                const percent =
                  basePrice > 0 && i.unitPrice < basePrice
                    ? Math.round((1 - i.unitPrice / basePrice) * 100)
                    : 0;

                const validProdId = i.productId || (product?.id ? String(product.id) : undefined);

                return (
                  <li
                    key={i.id}
                    className="card-soft flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
                  >
                    {/* Image + name/price — full width on mobile, flexible on desktop */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {validProdId ? (
                        <Link
                          to="/producto/$id"
                          params={{ id: validProdId }}
                          className="shrink-0 transition-opacity hover:opacity-80"
                        >
                          <img
                            src={i.imagen || FALLBACK_IMAGE}
                            alt={i.nombre}
                            referrerPolicy="no-referrer"
                            className="h-16 w-16 rounded-lg object-cover"
                            onError={(e) => {
                              e.currentTarget.src = FALLBACK_IMAGE;
                            }}
                          />
                        </Link>
                      ) : (
                        <img
                          src={i.imagen || FALLBACK_IMAGE}
                          alt={i.nombre}
                          referrerPolicy="no-referrer"
                          className="h-16 w-16 rounded-lg object-cover shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_IMAGE;
                          }}
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        {validProdId ? (
                          <Link
                            to="/producto/$id"
                            params={{ id: validProdId }}
                            className="block truncate text-sm font-semibold hover:text-primary transition-colors"
                          >
                            {i.nombre}
                          </Link>
                        ) : (
                          <span className="block truncate text-sm font-semibold">
                            {i.nombre}
                          </span>
                        )}
                        <p className="tabular-nums text-sm text-muted-foreground">
                          {percent > 0 ? (
                            <>
                              <span className="mr-1 text-xs line-through">{money(basePrice)}</span>
                              <span className="font-semibold text-foreground">{money(i.unitPrice)}</span> c/u{" "}
                              <span className="text-[11px] font-bold text-primary">(-{percent}%)</span>
                            </>
                          ) : (
                            <>{money(i.unitPrice)} c/u</>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Qty stepper + subtotal + remove — own row on mobile so nothing gets squeezed */}
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <div className="flex shrink-0 items-center rounded-md border border-input bg-background">
                        <button
                          type="button"
                          onClick={() => cart.setQty(i.id, i.qty - 1)}
                          disabled={i.qty <= 1}
                          className="flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Quitar una unidad de ${i.nombre}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={i.qty}
                          onChange={(e) => {
                            const digits = e.target.value.replace(/\D/g, "");
                            cart.setQty(i.id, digits ? Number(digits) : 1);
                          }}
                          className="h-8 w-8 border-x border-input bg-background text-center text-xs outline-none focus:border-primary"
                          aria-label={`Cantidad de ${i.nombre}`}
                        />
                        <button
                          type="button"
                          onClick={() => cart.setQty(i.id, i.qty + 1)}
                          className="flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
                          aria-label={`Agregar una unidad de ${i.nombre}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <p className="w-20 shrink-0 text-right tabular-nums text-sm font-bold sm:w-24">
                        {money(i.unitPrice * i.qty)}
                      </p>

                      <button
                        onClick={() => cart.remove(i.id)}
                        className="shrink-0 text-xs font-semibold text-muted-foreground hover:text-destructive"
                      >
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-[1px] text-muted-foreground">
                    Total con Transferencia
                  </span>
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {transferDiscountPct(config)}% OFF
                  </span>
                </div>
                <span className="tabular-nums text-2xl font-bold text-foreground">
                  {money(transferPrice(cart.total, transferDiscountPct(config)))}
                </span>
              </div>
              <div className="flex items-baseline justify-between border-t border-border/60 pt-2 text-xs text-muted-foreground">
                <span>Total con tarjeta o Mercado Pago:</span>
                <span className="font-semibold tabular-nums text-foreground/80">{money(cart.total)}</span>
              </div>
            </div>

            <div className="mt-4">
              {hasViolations ? (
                <div className="space-y-4">
                  {minViolations.map((v, idx) => (
                    <div key={idx} className="card-soft border border-amber-500/30 bg-amber-500/5 p-5">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                        ⚠️ {v.type === "amount"
                          ? `El pedido mínimo en ${v.category} es de ${money(v.min)}`
                          : `El pedido mínimo en ${v.category} es de ${v.min} unidad${v.min !== 1 ? "es" : ""}`}
                      </p>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {v.type === "amount"
                          ? `Llevas ${money(v.current)} en ${v.category}. Necesitás agregar ${money(v.min - v.current)} más.`
                          : `Llevas ${v.current} unidad${v.current !== 1 ? "es" : ""} de ${v.category}. Necesitás agregar ${v.min - v.current} más.`}
                      </p>
                      <Link
                        to="/catalogo"
                        className="btn-base grad-urgente mt-4 text-primary-foreground"
                      >
                        Seguir comprando
                      </Link>
                    </div>
                  ))}
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
