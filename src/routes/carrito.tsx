import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Minus, Plus, Tag, X, Sparkles } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { storeQueryOptions } from "@/lib/store-query";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/hooks/useAuth";
import { validatePromoCoupon } from "@/lib/products.functions";
import {
  FALLBACK_IMAGE,
  imageUrl,
  SUPLEMENTOS_MIN,
  isSuplemento,
  isMate,
  moqGroupOf,
  findProduct,
  money,
  priceOf,
  waLink,
  parseCategoryRules,
  categoryDiscountForUnits,
  checkCategoryMins,
  normCat,
  findRuleForCat,
} from "@/lib/store";

/**
 * Input de cantidad para el carrito con buffer de display.
 * Permite borrar el campo y escribir números multi-dígito en mobile
 * sin que el valor salte a 1 en cada keystroke.
 */
function CartQtyInput({
  itemId,
  qty,
  nombre,
  onDecrease,
  onIncrease,
  onSetQty,
}: {
  itemId: string;
  qty: number;
  nombre: string;
  onDecrease: () => void;
  onIncrease: () => void;
  onSetQty: (q: number) => void;
}) {
  const [display, setDisplay] = useState(String(qty));

  return (
    <div className="flex shrink-0 items-center rounded-md border border-input bg-background">
      <button
        type="button"
        onClick={() => {
          onDecrease();
          setDisplay(String(Math.max(1, qty - 1)));
        }}
        disabled={qty <= 1}
        className="flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Quitar una unidad de ${nombre}`}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={display}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          setDisplay(raw);
          const parsed = parseInt(raw, 10);
          if (!isNaN(parsed) && parsed >= 1) onSetQty(parsed);
        }}
        onBlur={() => {
          const parsed = parseInt(display, 10);
          const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;
          setDisplay(String(clamped));
          onSetQty(clamped);
        }}
        onFocus={(e) => e.target.select()}
        className="h-8 w-10 border-x border-input bg-background text-center text-xs outline-none focus:border-primary"
        aria-label={`Cantidad de ${nombre}`}
      />
      <button
        type="button"
        onClick={() => {
          onIncrease();
          setDisplay(String(qty + 1));
        }}
        className="flex h-8 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={`Agregar una unidad de ${nombre}`}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}

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
  const { user, session } = useAuth();

  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  const couponPct = appliedCoupon?.discountPct ?? 0;
  const couponDiscountAmount = couponPct > 0 ? Math.round(cart.total * (couponPct / 100)) : 0;

  async function handleApplyCoupon(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Ingresá un código promocional.");
      return;
    }
    if (!user) {
      setCouponError("Debés iniciar sesión con tu cuenta para reclamar el cupón.");
      return;
    }
    setCouponLoading(true);
    setCouponError("");
    setCouponSuccess("");
    try {
      const res = await validatePromoCoupon({
        data: {
          code,
          userId: user.id,
          email: user.email ?? "",
          token: session?.access_token,
        },
      });
      if (!res.valid || res.error) {
        setCouponError(res.error || "El código no es válido.");
        setAppliedCoupon(null);
      } else {
        const validCode = res.code || code;
        const disc = res.discountPct || 5;
        setAppliedCoupon({ code: validCode, discountPct: disc });
        setCouponSuccess(`¡Descuento aplicado! (${disc}% OFF)`);
        setCouponError("");
      }
    } catch {
      setCouponError("Error al validar el cupón.");
    } finally {
      setCouponLoading(false);
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponSuccess("");
    setCouponError("");
  }

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
  const matesRuleMatch = findRuleForCat(normCat("Mates"), catRules);
  const matesUnits = cartItemsWithCat.reduce((sum, item) => {
    const prod = item.productId ? findProduct(products, item.productId) : undefined;
    const mg = prod ? moqGroupOf(prod as Record<string, unknown>) : null;
    return sum + (mg === "mates" ? item.qty : 0);
  }, 0);
  const matesDiscountPct = matesRuleMatch
    ? categoryDiscountForUnits(matesRuleMatch.rule.discountTiers, matesUnits)
    : 0;

  const dynamicViolations = checkCategoryMins(
    cartItemsWithCat.map((i) => {
      const prod = i.productId ? findProduct(products, i.productId) : undefined;
      const moq_group = prod ? (moqGroupOf(prod as Record<string, unknown>) ?? undefined) : undefined;
      return { nombre: i.nombre, categoria: i.categoria, moq_group, qty: i.qty, unitPrice: i.unitPrice };
    }),
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
          category: "Suplementación",
          type: "amount" as const,
          min: minSuplementos,
          current: totalSuplementos,
        }
      : null;

  const minViolations = suplementosViolation
    ? [suplementosViolation, ...dynamicViolations]
    : dynamicViolations;

  const hasViolations = minViolations.length > 0;

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[900px] px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-bold tracking-tight">Tu carrito</h1>

        {cart.items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <p className="text-muted-foreground">Tu carrito está vacío.</p>
            <Link to="/catalogo" className="btn-base grad-urgente mt-4 inline-block text-primary-foreground">
              Ver catálogo
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 divide-y divide-border rounded-xl border border-border bg-card">
              {cartItemsWithCat.map((i) => {
                const prod = findProduct(products, i.productId || i.id || i.nombre);
                const isSupp = isSuplemento(i.categoria, i.nombre);

                return (
                  <li
                    key={i.id}
                    className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
                  >
                    {/* Img + Title + tags - Clickeable para ir al detalle del producto */}
                    {prod?.id ? (
                      <Link
                        to="/producto/$id"
                        params={{ id: String(prod.id) }}
                        className="flex min-w-0 flex-1 items-center gap-3 group cursor-pointer"
                      >
                        <img
                          src={imageUrl(prod.imagen_url) || FALLBACK_IMAGE}
                          alt={i.nombre}
                          className="h-12 w-12 shrink-0 rounded-lg object-contain bg-surface p-1 border border-border/50 sm:h-14 sm:w-14 transition-transform group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold sm:text-base text-foreground group-hover:text-primary transition-colors">
                            {i.nombre}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {isSupp && (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                Suplementación
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            {i.basePrice && i.unitPrice < i.basePrice && (
                              <span className="line-through text-[11px] opacity-75">{money(i.basePrice)}</span>
                            )}
                            <span className="font-semibold text-foreground">{money(i.unitPrice)} c/u</span>
                            {i.basePrice && i.unitPrice < i.basePrice && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {Math.round(((i.basePrice - i.unitPrice) / i.basePrice) * 100)}% OFF x cantidad
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <img
                          src={imageUrl(prod?.imagen_url) || FALLBACK_IMAGE}
                          alt={i.nombre}
                          className="h-12 w-12 shrink-0 rounded-lg object-contain bg-surface p-1 border border-border/50 sm:h-14 sm:w-14"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold sm:text-base">{i.nombre}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                            {isSupp && (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                Suplementación
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
                            {i.basePrice && i.unitPrice < i.basePrice && (
                              <span className="line-through text-[11px] opacity-75">{money(i.basePrice)}</span>
                            )}
                            <span className="font-semibold text-foreground">{money(i.unitPrice)} c/u</span>
                            {i.basePrice && i.unitPrice < i.basePrice && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                {Math.round(((i.basePrice - i.unitPrice) / i.basePrice) * 100)}% OFF x cantidad
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Qty stepper + subtotal + remove */}
                    <div className="flex shrink-0 items-center justify-between gap-3 sm:justify-end">
                      <CartQtyInput
                        key={i.id}
                        itemId={i.id}
                        qty={i.qty}
                        nombre={i.nombre}
                        onDecrease={() => cart.setQty(i.id, i.qty - 1)}
                        onIncrease={() => cart.setQty(i.id, i.qty + 1)}
                        onSetQty={(q) => cart.setQty(i.id, q)}
                      />
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

            {/* Sección de Cupón Promocional */}
            <div className="mt-4 rounded-xl border border-primary/20 bg-card p-4 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Código de descuento
                </span>
              </div>

              {!user ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg bg-surface p-3 text-xs">
                  <span className="text-muted-foreground">
                    💡 ¿Tenés un cupón de descuento? Iniciá sesión con tu cuenta para canjearlo.
                  </span>
                  <Link
                    to="/auth"
                    search={{ mode: "login" }}
                    className="shrink-0 font-bold text-primary hover:underline"
                  >
                    Iniciar sesión →
                  </Link>
                </div>
              ) : appliedCoupon ? (
                <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        ¡Cupón {appliedCoupon.code} aplicado!
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {appliedCoupon.discountPct}% OFF adicional en el total de tu pedido
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Quitar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ingresá tu código de descuento"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="input-base font-mono uppercase text-xs tracking-wider"
                    />
                    <button
                      type="submit"
                      disabled={couponLoading || !couponInput.trim()}
                      className="btn-base bg-primary text-primary-foreground text-xs font-bold px-4 hover:opacity-90 disabled:opacity-50"
                    >
                      {couponLoading ? "Validando..." : "Aplicar"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs font-semibold text-destructive mt-1">⚠️ {couponError}</p>
                  )}
                  {couponSuccess && (
                    <p className="text-xs font-semibold text-emerald-600 mt-1">✓ {couponSuccess}</p>
                  )}
                </form>
              )}
            </div>

            {/* Resumen de totales simplificado — el precio final se muestra al elegir método de pago */}
            <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-card p-5">
              {matesUnits > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-primary/10 px-3 py-2 text-xs">
                  <span className="font-semibold text-foreground">
                    Mates: {matesUnits} unidad{matesUnits !== 1 ? "es" : ""}
                  </span>
                  <span className="font-bold text-primary">
                    {matesDiscountPct > 0 ? `${matesDiscountPct}% OFF aplicado` : "5% OFF desde 5 unidades"}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Subtotal de lista:</span>
                <span className="tabular-nums font-semibold text-foreground">{money(cart.total)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold">
                  <span>Descuento ({appliedCoupon.discountPct}% OFF):</span>
                  <span className="tabular-nums">-{money(couponDiscountAmount)}</span>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                El precio final según tu método de pago se muestra en el checkout ↓
              </p>
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
                          ? `Llevás ${money(v.current)} en ${v.category}. Necesitás agregar ${money(v.min - v.current)} más.`
                          : (() => { const miss = v.min - v.current; return `Llevás ${v.current} unidad${v.current !== 1 ? "es" : ""} de ${v.category}. Te falta${miss !== 1 ? "n" : ""} ${miss} para alcanzar el mínimo de ${v.min}.`; })()}
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
                <CheckoutFlow items={items} total={cart.total} appliedCoupon={appliedCoupon} />
              )}
            </div>

            <a
              className="btn-base mt-3 w-full bg-whatsapp text-whatsapp-foreground"
              href={waLink(config)}
              target="_blank"
              rel="noopener noreferrer"
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
