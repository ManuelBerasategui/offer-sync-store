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
  normCat,
  parseCategoryRules,
  findRuleForCat,
  type ProductVariant,
} from "@/lib/store";

export const Route = createFileRoute("/producto/$id")({
  loader: async ({ context, params }) => {
    const data = await context.queryClient.ensureQueryData(storeQueryOptions);
    const product = findProduct(data.products, params.id);
    return { product };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product;
    const title = product?.nombre ? `${product.nombre} — Te importamos` : "Producto — Te importamos";
    const rawDesc = product?.descripcion?.replace(/[\r\n]+/g, " ").trim() || "";
    const description = rawDesc
      ? rawDesc.length > 160
        ? rawDesc.slice(0, 157) + "..."
        : rawDesc
      : "Comprá online productos importados originales con descuentos por cantidad y envíos a todo el país.";
    const image = product?.imagen_url ? imageUrl(product.imagen_url) : undefined;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
    };
  },
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
  const [selectedTalle, setSelectedTalle] = useState("");
  const [talleError, setTalleError] = useState(false);

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

  const productRec = product as Record<string, unknown>;
  const rawTipo = String(productRec["tipo_talles"] ?? "NINGUNO").toUpperCase();
  const hasTalles = rawTipo === "ZAPATILLAS" || rawTipo === "ROPA";

  const consultar = isWhatsappOnly(product);
  const rawDefaultColor = product.color_predeterminado;
  const defaultColor = (rawDefaultColor == null || rawDefaultColor === "null") ? "" : String(rawDefaultColor).trim();

  const rawTalles = productRec["talles_disponibles"];
  const productTalles: string[] = Array.isArray(rawTalles)
    ? (rawTalles as string[])
    : typeof rawTalles === "string"
      ? rawTalles.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  const hasDefaultInVariants = defaultColor
    ? variants.some((v) => v.color.trim().toLowerCase() === defaultColor.toLowerCase())
    : false;

  const allVariants: ProductVariant[] = useMemo(() => {
    if (!defaultColor) return variants;
    if (hasDefaultInVariants) return variants;
    const defaultVar: ProductVariant = {
      id: "default_base",
      product_id: String(product.id ?? ""),
      color: defaultColor,
      precio: priceOf(product),
      stock: product.stock ?? null,
      imagen_url: product.imagen_url ?? null,
      talles_disponibles: productTalles,
    };
    return [defaultVar, ...variants];
  }, [defaultColor, variants, hasDefaultInVariants, product, productTalles]);

  const usesColors = allVariants.length > 0;
  const defaultVariant = defaultColor
    ? allVariants.find(
        (variant) => variant.color.trim().toLowerCase() === defaultColor.toLowerCase(),
      ) ?? allVariants[0]
    : allVariants[0];

  const selectedVariant =
    (usesColors ? allVariants.find((variant) => String(variant.id) === selectedVariantId) : undefined) ??
    defaultVariant;

  const availableTalles = (selectedVariant && selectedVariant.talles_disponibles && selectedVariant.talles_disponibles.length > 0)
    ? selectedVariant.talles_disponibles
    : productTalles;

  const baseName = defaultColor
    ? (product.nombre ?? "Producto")
        .replace(new RegExp(`(?:\\s*[-—]?\\s*)${escapeRegExp(defaultColor)}\\s*$`, "i"), "")
        .trim()
    : product.nombre ?? "Producto";
  const displayName = selectedVariant ? `${baseName} ${selectedVariant.color}`.trim() : product.nombre ?? "Producto";

  const displayNameWithTalle = selectedTalle ? `${displayName} (Talle: ${selectedTalle})` : displayName;
  const basePrice = selectedVariant ? Number(selectedVariant.precio) : priceOf(product);
  const selectedImage = selectedVariant?.imagen_url || product.imagen_url;
  const percent = discountFor(product, qty);
  const unit = unitPriceFor(product, qty, basePrice);
  const total = unit * qty;

  const cartItem = {
    id: `${String(product.id ?? product.nombre ?? "")}:${selectedVariant?.id === "default_base" ? "" : (selectedVariant?.id ?? "")}:${selectedTalle ?? ""}`,
    productId: product.id ? String(product.id) : undefined,
    nombre: displayNameWithTalle,
    qty,
    unitPrice: Math.round(unit),
    basePrice,
    variantId: selectedVariant?.id === "default_base" ? undefined : selectedVariant?.id,
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
              {displayName}
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

                {/* AVISO DE MÍNIMO DE COMPRA POR CATEGORÍA EN LA FICHA DEL PRODUCTO */}
                {(() => {
                  const catRules = parseCategoryRules(config);
                  const catNorm = normCat(product.categoria ?? "");
                  const ruleMatch = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
                  const rule = ruleMatch?.rule;
                  const hasDynMin = rule?.minAmount || rule?.minUnits;

                  if (hasDynMin && ruleMatch) {
                    const categoryName = ruleMatch.key.charAt(0).toUpperCase() + ruleMatch.key.slice(1);
                    const minText = rule.minAmount ? money(rule.minAmount) : `${rule.minUnits} unidades`;
                    return (
                      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-foreground">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
                              Compra mínima para {categoryName}: {minText}
                            </p>
                            <p className="mt-0.5 text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
                              Podés combinar distintos productos de esta categoría en tu carrito hasta alcanzar el mínimo.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (isSuplemento(product.categoria, product.nombre)) {
                    return (
                      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-foreground">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
                              Compra mínima para Suplementos: {money(SUPLEMENTOS_MIN)}
                            </p>
                            <p className="mt-0.5 text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
                              Podés combinar distintos suplementos en tu carrito hasta alcanzar los {money(SUPLEMENTOS_MIN)}.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}

                {/* AVISO DE DESCUENTOS POR CANTIDAD DE CATEGORÍA */}
                {(() => {
                  const catRules = parseCategoryRules(config);
                  const catNorm = normCat(product.categoria ?? "");
                  const ruleMatch = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
                  const rule = ruleMatch?.rule;
                  if (!rule?.discountTiers?.length || !ruleMatch) return null;

                  const categoryName = ruleMatch.key.charAt(0).toUpperCase() + ruleMatch.key.slice(1);
                  return (
                    <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs text-foreground">
                      <div className="flex items-start gap-2.5">
                        <span className="text-base shrink-0 mt-0.5">🎁</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-primary text-xs sm:text-sm">
                            Descuento por cantidad en {categoryName}:
                          </p>
                          <ul className="mt-1 space-y-0.5 text-muted-foreground text-[11px] sm:text-xs">
                            {rule.discountTiers.map((tier) => (
                              <li key={tier.units} className="flex items-center gap-1.5">
                                <span className="font-semibold text-foreground">
                                  Llevando {tier.units} u. o más:
                                </span>
                                <span className="font-bold text-primary">{tier.percent}% OFF</span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
                            Podés combinar distintos productos de {categoryName} en tu carrito.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </>
            )}

            {!consultar && usesColors && (
              <div className="mt-6">
                <label
                  htmlFor="color"
                  className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground"
                >
                  Elegir color
                </label>
                <select
                  id="color"
                  value={selectedVariant?.id ?? ""}
                  onChange={(e) => {
                    setSelectedVariantId(e.target.value);
                    setSelectedTalle("");
                    setTalleError(false);
                  }}
                  className="mt-2 w-full max-w-[320px] rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                >
                  {allVariants.map((variant) => (
                    <option key={variant.id ?? variant.color} value={String(variant.id)}>
                      {variant.color} — {money(variant.precio)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Selector de Talle */}
            {!consultar && hasTalles && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                    Elegí tu talle {rawTipo === "ZAPATILLAS" ? "(Zapatillas)" : "(Ropa)"} *
                  </label>
                  {selectedTalle && (
                    <span className="text-xs font-bold text-emerald-600">Talle: {selectedTalle}</span>
                  )}
                </div>
                {availableTalles.length === 0 ? (
                  <p className="text-xs font-semibold text-destructive">Sin talles con stock disponible en este momento.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableTalles.map((talle: string) => {
                      const isSelected = selectedTalle === talle;
                      return (
                        <button
                          key={talle}
                          type="button"
                          onClick={() => {
                            setSelectedTalle(talle);
                            setTalleError(false);
                          }}
                          className={`h-10 min-w-11 rounded-lg px-3 text-xs font-bold transition-all border ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-sm scale-105"
                              : "bg-background text-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {talle}
                        </button>
                      );
                    })}
                  </div>
                )}
                {talleError && (
                  <p className="mt-2 text-xs font-semibold text-destructive">
                    ⚠️ Por favor elegí tu talle antes de continuar.
                  </p>
                )}
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
                      if (hasTalles && !selectedTalle) {
                        setTalleError(true);
                        return;
                      }
                      if (bloqueaCompra) setShowMin(true);
                      else setShowCheckout(true);
                    }}
                    className="btn-base w-full grad-urgente text-primary-foreground transition-all hover:shadow-md"
                  >
                    {hasTalles && !selectedTalle
                      ? "Elegí tu talle para comprar"
                      : "Comprar ya"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (hasTalles && !selectedTalle) {
                        setTalleError(true);
                        return;
                      }
                      cart.add(cartItem);
                      navigate({ to: "/carrito" });
                    }}
                    className="btn-base w-full border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
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
