import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect, useRef } from "react";
import { CheckCircle2 } from "lucide-react";

import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { CheckoutFlow } from "@/components/CheckoutFlow";
import { REVIEWS, Stars } from "@/components/Social";
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
  galleryImages,
  isSuplemento,
  onImageError,
  isWhatsappOnly,
  isMate,
  hasMoq,
  moqGroupOf,
  meetsMoq,
  waOnlyReasonOf,
  WA_ONLY_CONFIG,
  type WaOnlyReason,
  type MoqInfo,
  money,
  priceOf,
  hasOffer,
  originalPriceOf,
  offerDiscountPct,
  tiersOf,
  unitPriceFor,
  waLink,
  sanitizeUrl,
  normCat,
  parseCategoryRules,
  findRuleForCat,
  transferPrice,
  transferDiscountPct,
  categoryDiscountForUnits,
  checkCategoryMins,
  type ProductVariant,
} from "@/lib/store";

/** Galería de imágenes interactiva con miniaturas clickeables. */
function ProductGallery({
  images,
  productName,
  selectedVariantImage,
}: {
  images: string[];
  productName: string;
  selectedVariantImage?: string | null;
}) {
  // Si hay imagen de variante, la ponemos primero; si no, usamos las del producto
  const allImages = selectedVariantImage
    ? [selectedVariantImage, ...images.filter((u) => u !== selectedVariantImage)]
    : images;
  const [activeIdx, setActiveIdx] = useState(0);

  // Resetear al cambiar variante
  useEffect(() => { setActiveIdx(0); }, [selectedVariantImage]);

  const current = allImages[activeIdx] ?? allImages[0] ?? "";

  return (
    <div className="flex flex-col gap-2">
      {/* Imagen principal */}
      <div className="mx-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-border bg-surface lg:sticky lg:top-24">
        <img
          key={current}
          src={imageUrl(current) || FALLBACK_IMAGE}
          alt={`${productName} — foto ${activeIdx + 1}`}
          decoding="async"
          referrerPolicy="no-referrer"
          className="aspect-square w-full bg-surface object-contain p-3 transition-opacity duration-200"
          onError={onImageError(current)}
        />
      </div>
      {/* Strip de miniaturas (solo si hay más de 1 foto) */}
      {allImages.length > 1 && (
        <div className="mx-auto flex max-w-[460px] gap-2 overflow-x-auto pb-1">
          {allImages.map((url, i) => (
            <button
              key={url + i}
              type="button"
              onClick={() => setActiveIdx(i)}
              aria-label={`Ver foto ${i + 1}`}
              className={[
                "shrink-0 h-16 w-16 rounded-lg border-2 overflow-hidden bg-surface transition-all",
                i === activeIdx
                  ? "border-primary shadow-md scale-105"
                  : "border-border opacity-60 hover:opacity-100 hover:border-primary/50",
              ].join(" ")}
            >
              <img
                src={imageUrl(url) || FALLBACK_IMAGE}
                alt={`Miniatura ${i + 1}`}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full object-contain p-0.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    const canonicalUrl = product?.id
      ? `https://teimportamosarg.com/producto/${product.id}`
      : "https://teimportamosarg.com/catalogo";

    // JSON-LD Product & Breadcrumb schema for Google Rich Results
    const price = product ? String(product.precio ?? "") : "";
    const category = product?.categoria?.trim();
    
    const productSchema = product
      ? {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.nombre,
          ...(image ? { image } : {}),
          ...(description ? { description } : {}),
          ...(category ? { category } : {}),
          brand: {
            "@type": "Brand",
            name: "Te importamos",
          },
          offers: {
            "@type": "Offer",
            priceCurrency: "ARS",
            ...(price ? { price } : {}),
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            url: canonicalUrl,
            seller: { "@type": "Organization", name: "Te importamos" },
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "AR",
              returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
            },
          },
        }
      : null;

    const breadcrumbSchema = product
      ? {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Inicio",
              item: "https://teimportamosarg.com/",
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "Catálogo",
              item: "https://teimportamosarg.com/catalogo",
            },
            ...(category
              ? [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: category,
                    item: `https://teimportamosarg.com/catalogo?categoria=${encodeURIComponent(category)}`,
                  },
                  {
                    "@type": "ListItem",
                    position: 4,
                    name: product.nombre,
                    item: canonicalUrl,
                  },
                ]
              : [
                  {
                    "@type": "ListItem",
                    position: 3,
                    name: product.nombre,
                    item: canonicalUrl,
                  },
                ]),
          ],
        }
      : null;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonicalUrl },
        { name: "twitter:card", content: image ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        ...(image
          ? [
              { property: "og:image", content: image },
              { property: "og:image:secure_url", content: image },
              { name: "twitter:image", content: image },
            ]
          : [
              { property: "og:image", content: "https://teimportamosarg.com/businessicon.jpg" },
              { property: "og:image:secure_url", content: "https://teimportamosarg.com/businessicon.jpg" },
              { name: "twitter:image", content: "https://teimportamosarg.com/businessicon.jpg" },
            ]),
      ],
      links: [
        { rel: "canonical", href: canonicalUrl },
      ],
      scripts: [
        ...(productSchema
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify(productSchema),
              },
            ]
          : []),
        ...(breadcrumbSchema
          ? [
              {
                type: "application/ld+json",
                children: JSON.stringify(breadcrumbSchema),
              },
            ]
          : []),
      ],
    };
  },
  component: ProductoPage,
});

function stripTrailingColor(name: string, color: string): string {
  const trimmedName = name.trim();
  const trimmedColor = color.trim();
  if (!trimmedColor) return trimmedName;

  if (trimmedName.toLowerCase().endsWith(trimmedColor.toLowerCase())) {
    let withoutColor = trimmedName.slice(0, trimmedName.length - trimmedColor.length).trimEnd();
    if (withoutColor.endsWith("-") || withoutColor.endsWith("—")) {
      withoutColor = withoutColor.slice(0, -1).trimEnd();
    }
    return withoutColor;
  }
  return trimmedName;
}

function ProductoPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, config } = data;
  const cart = useCart();

  const product = findProduct(products, id);

  const [qty, setQty] = useState(1);
  // qtyStr: valor de display del input — permite borrar y reescribir en mobile sin que
  // el campo salte a 1 en cada keystroke. Se sincroniza con qty en onBlur.
  const [qtyStr, setQtyStr] = useState("1");
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
  const waOnlyReason: WaOnlyReason | null = waOnlyReasonOf(productRec);
  // Retrocompatibilidad: esZapatilla para los guards de tipo_talles que ya existían
  const esZapatilla = waOnlyReason === "zapatillas";

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
    ? variants.some((v) => (v?.color ?? "").trim().toLowerCase() === defaultColor.toLowerCase())
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
        (variant) => (variant?.color ?? "").trim().toLowerCase() === defaultColor.toLowerCase(),
      ) ?? allVariants[0]
    : allVariants[0];

  const selectedVariant =
    (usesColors ? allVariants.find((variant) => String(variant.id) === selectedVariantId) : undefined) ??
    defaultVariant;

  const availableTalles = (selectedVariant && selectedVariant.talles_disponibles && selectedVariant.talles_disponibles.length > 0)
    ? selectedVariant.talles_disponibles
    : productTalles;

  const baseName = defaultColor
    ? stripTrailingColor(product.nombre ?? "Producto", defaultColor)
    : product.nombre ?? "Producto";
  const displayName = selectedVariant ? `${baseName} ${selectedVariant.color}`.trim() : product.nombre ?? "Producto";

  const isOffer = hasOffer(product);
  const offerPct = isOffer ? offerDiscountPct(product) : 0;
  const rawBasePrice = selectedVariant ? Number(selectedVariant.precio) : Number(product.precio ?? 0);
  const basePrice = isOffer
    ? (selectedVariant && selectedVariant.id !== "default_base"
        ? Math.round(rawBasePrice * (1 - offerPct / 100))
        : priceOf(product))
    : (selectedVariant ? Number(selectedVariant.precio) : priceOf(product));
  const origPrice = selectedVariant ? Number(selectedVariant.precio) : originalPriceOf(product);
  const isOfferDiscounted = isOffer && origPrice > basePrice;

  const displayNameWithTalle = selectedTalle ? `${displayName} (Talle: ${selectedTalle})` : displayName;
  const selectedImage = selectedVariant?.imagen_url || product.imagen_url;
  const catRules = useMemo(() => parseCategoryRules(config), [config]);
  const categoryRuleMatch = useMemo(() => {
    const category = normCat(product.categoria ?? "");
    return category ? findRuleForCat(category, catRules) : undefined;
  }, [product.categoria, catRules]);
  const categoryPercent = categoryRuleMatch?.rule.discountTiers?.length
    ? categoryDiscountForUnits(categoryRuleMatch.rule.discountTiers, qty)
    : 0;
  const percent = categoryPercent || discountFor(product, qty);
  const unit = categoryPercent > 0
    ? Math.round(basePrice * (1 - categoryPercent / 100))
    : unitPriceFor(product, qty, basePrice);
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

  // Buscar si este producto ya está en el carrito para inicializar y recordar la cantidad elegida
  const existingInCart = useMemo(() => {
    return cart.items.find(
      (i) =>
        i.id === cartItem.id ||
        (i.productId && String(i.productId) === String(product.id) && (!i.variantId || i.variantId === selectedVariant?.id)) ||
        i.nombre === displayNameWithTalle ||
        i.nombre === displayName,
    );
  }, [cart.items, cartItem.id, product.id, selectedVariant?.id, displayNameWithTalle, displayName]);

  const hasSyncedCartQty = useRef(false);
  useEffect(() => {
    if (existingInCart && existingInCart.qty > 0 && !hasSyncedCartQty.current) {
      hasSyncedCartQty.current = true;
      setQty(existingInCart.qty);
      setQtyStr(String(existingInCart.qty));
      if (![1, 3, 5, 10].includes(existingInCart.qty)) {
        setCustom(true);
      }
    }
  }, [existingInCart]);

  const suplemento = isSuplemento(product.categoria);
  const categoryMinViolation = checkCategoryMins(
    [{ nombre: product.nombre, categoria: product.categoria,
       moq_group: moqGroupOf(product as Record<string, unknown>) ?? undefined,
       qty, unitPrice: unit }],
    catRules,
  )[0];
  const bloqueaCompra = (suplemento && total < SUPLEMENTOS_MIN) || Boolean(categoryMinViolation);
  const minDialogTitle = categoryMinViolation
    ? `Compra mínima de ${categoryMinViolation.category}`
    : "Compra mínima de suplementos";
  const minDialogDescription = categoryMinViolation
    ? `Llevás ${categoryMinViolation.current} unidad${categoryMinViolation.current !== 1 ? "es" : ""}. Te faltan ${categoryMinViolation.min - categoryMinViolation.current} para alcanzar el mínimo de ${categoryMinViolation.min}.`
    : SUPLEMENTOS_MSG;

  // MOQ: usa el campo moq_group del producto (fuente de verdad v2).
  // hasMoq retorna MoqInfo|null. meetsMoq compara qty vs minUnits en tiempo real.
  const moqInfo: MoqInfo | null = hasMoq(product as Record<string, unknown>, catRules);
  const moqMet = meetsMoq(moqInfo, qty, basePrice);
  // Cuanto falta para alcanzar el minimo (mensaje reactivo)
  const moqMissing = moqInfo?.minUnits
    ? Math.max(0, moqInfo.minUnits - qty)
    : 0;

  const isOutOfStock = String(product.stock ?? "SI").trim().toUpperCase() === "NO";

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/catalogo"
            className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            ← Volver al catálogo
          </Link>
          {cart.count > 0 && (
            <Link
              to="/carrito"
              className="text-sm font-semibold text-primary hover:underline flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20"
            >
              🛒 Volver al carrito ({cart.count} u.) →
            </Link>
          )}
        </div>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:items-start">
          <ProductGallery
            images={galleryImages(product)}
            productName={product.nombre ?? "Producto"}
            selectedVariantImage={selectedVariant?.imagen_url}
          />

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[2px] text-muted-foreground">
              {product.categoria || "General"}
            </p>
            <h1 className="mt-2 font-sans text-[clamp(24px,6vw,36px)] font-bold normal-case tracking-tight">
              {displayName}
            </h1>

            {(consultar || (waOnlyReason && (WA_ONLY_CONFIG[waOnlyReason]?.hidePrice || unit <= 0)) || unit <= 0) ? (
              <p className="mt-4 text-sm font-semibold text-muted-foreground">
                Consultá el precio y disponibilidad por WhatsApp.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-col gap-1.5">
                  {isOfferDiscounted && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md bg-red-600 px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
                        🔥 Oferta del día -{offerPct}% OFF
                      </span>
                      <span className="text-sm text-muted-foreground line-through tabular-nums">
                        Antes {money(origPrice)}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-wrap items-baseline gap-2">
                    {percent > 0 && (
                      <span className="tabular-nums text-base text-muted-foreground line-through">
                        {money(basePrice)}
                      </span>
                    )}
                    <span className="tabular-nums text-3xl font-bold text-foreground">
                      {money(transferPrice(unit, transferDiscountPct(config)))}
                    </span>
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      {transferDiscountPct(config)}% OFF con Transferencia
                    </span>
                    {percent > 0 && (
                      <span className="text-xs font-bold text-primary">({percent}% OFF x volumen)</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    o <span className="font-semibold text-foreground/80">{money(unit)}</span> con Mercado Pago
                  </p>
                </div>

                {/* AVISO DE MÍNIMO DE COMPRA POR CATEGORÍA EN LA FICHA DEL PRODUCTO */}
                {(() => {
                  // hasMoq es la fuente de verdad: respeta moq_group, isMate con prioridad
                  // y match por categoría como fallback. Garantiza que:
                  //   - Mates → 10 u. (regla "mates", no "bazar")
                  //   - Bazar (no-mate) → 5 u. (regla "bazar")
                  //   - Tecnología → 5 u., etc.
                  const moqDisplay = hasMoq(product as Record<string, unknown>, catRules);

                  if (moqDisplay?.minUnits) {
                    const groupLabel = moqDisplay.group.charAt(0).toUpperCase() + moqDisplay.group.slice(1);
                    const minText = `${moqDisplay.minUnits} unidades`;
                    const mixMsg =
                      moqDisplay.group === "mates"
                        ? "Podés combinar distintos modelos de Mates en tu carrito hasta alcanzar el mínimo."
                        : "Podés armar surtido con distintos productos de esta categoría para alcanzar el mínimo.";
                    return (
                      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-foreground">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
                              Compra mínima para {groupLabel}: {minText}
                            </p>
                            <p className="mt-0.5 text-muted-foreground leading-relaxed text-[11px] sm:text-xs">
                              {mixMsg}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (moqDisplay?.minAmount) {
                    const groupLabel = moqDisplay.group.charAt(0).toUpperCase() + moqDisplay.group.slice(1);
                    return (
                      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:p-3.5 text-xs text-foreground">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">ℹ️</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-amber-700 dark:text-amber-400 text-xs sm:text-sm">
                              Compra mínima para {groupLabel}: {money(moqDisplay.minAmount)}
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

                {/* AVISO DE DESCUENTOS POR CANTIDAD (Categoría o Producto) */}
                {(() => {
                  const catNorm = normCat(product.categoria ?? "");
                  const ruleMatch = catNorm ? findRuleForCat(catNorm, catRules) : undefined;
                  const rule = ruleMatch?.rule;

                  if (rule?.discountTiers?.length && ruleMatch) {
                    const categoryName = ruleMatch.key.charAt(0).toUpperCase() + ruleMatch.key.slice(1);
                    return (
                      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs text-foreground">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">🎁</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-primary text-xs sm:text-sm">
                              Descuento por cantidad en {categoryName}:
                            </p>
                            <ul className="mt-1.5 space-y-1 text-muted-foreground text-[11px] sm:text-xs">
                              {(rule.discountTiers.some(t => t.units >= 20)
                                ? rule.discountTiers
                                : [...rule.discountTiers, { units: 20, percent: 12 }]
                              ).map((tier) => (
                                <li key={tier.units} className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">
                                    Llevando {tier.units} u. o más:
                                  </span>
                                  <span className="font-bold text-primary">{tier.percent}% OFF</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                              Podés combinar distintos productos de {categoryName} en tu carrito.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (tiers.length > 0) {
                    const catName = product.categoria ? product.categoria.trim() : "este producto";
                    return (
                      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs text-foreground">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">🎁</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-primary text-xs sm:text-sm">
                              Descuento por cantidad en {catName}:
                            </p>
                            <ul className="mt-1.5 space-y-1 text-muted-foreground text-[11px] sm:text-xs">
                              {tiers.map((tier) => (
                                <li key={tier.units} className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">
                                    Llevando {tier.units} u. o más:
                                  </span>
                                  <span className="font-bold text-primary">{tier.percent}% OFF</span>
                                </li>
                              ))}
                            </ul>
                            <p className="mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                              Descuento automático por volumen al agregar al carrito.
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
              </>
            )}

            {!consultar && !waOnlyReason && usesColors && (
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
                  {allVariants.map((variant) => {
                    const vPrice = Number(variant.precio);
                    const effPrice = isOffer ? Math.round(vPrice * (1 - offerPct / 100)) : vPrice;
                    return (
                      <option key={variant.id ?? variant.color} value={String(variant.id)}>
                        {variant.color} — {money(effPrice)}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Selector de Talle */}
            {!consultar && !waOnlyReason && hasTalles && (
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
            {!consultar && !waOnlyReason && (
              <div className="mt-6">
                {tiers.length > 0 && (
                  <p className="mb-1 text-xs font-semibold text-muted-foreground">
                    Llevá más, pagá menos!
                  </p>
                )}
                <label
                  htmlFor="qty-input"
                  className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground"
                >
                  Cantidad
                </label>
                <div className="mt-2 flex items-center gap-2">
                  {/* Botón – */}
                  <button
                    type="button"
                    id="qty-decrement"
                    aria-label="Reducir cantidad"
                    onClick={() => {
                      const next = Math.max(1, qty - 1);
                      setQty(next);
                      setQtyStr(String(next));
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-lg font-bold text-foreground transition hover:bg-muted active:scale-95"
                  >
                    −
                  </button>

                  {/* Campo numérico editable */}
                  <input
                    id="qty-input"
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={1}
                    value={qtyStr}
                    onChange={(e) => {
                      // Permitir campo vacío o número mientras el usuario escribe
                      const raw = e.target.value.replace(/[^0-9]/g, "");
                      setQtyStr(raw);
                      const parsed = parseInt(raw, 10);
                      if (!isNaN(parsed) && parsed >= 1) setQty(parsed);
                    }}
                    onBlur={() => {
                      // Al salir del campo, garantizar entero >= 1
                      const parsed = parseInt(qtyStr, 10);
                      const clamped = isNaN(parsed) || parsed < 1 ? 1 : parsed;
                      setQty(clamped);
                      setQtyStr(String(clamped));
                    }}
                    onFocus={(e) => e.target.select()}
                    className="h-10 w-20 rounded-lg border border-input bg-background px-3 text-center text-sm font-semibold outline-none focus:border-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />

                  {/* Botón + */}
                  <button
                    type="button"
                    id="qty-increment"
                    aria-label="Aumentar cantidad"
                    onClick={() => {
                      const next = qty + 1;
                      setQty(next);
                      setQtyStr(String(next));
                    }}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-input bg-background text-lg font-bold text-foreground transition hover:bg-muted active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              {consultar || waOnlyReason ? (
                <a
                  className="btn-base w-full bg-whatsapp text-whatsapp-foreground"
                  href={waOnlyReason
                    ? sanitizeUrl(`https://wa.me/5493418051515?text=${encodeURIComponent(WA_ONLY_CONFIG[waOnlyReason].waMsg(product.nombre ?? ""))}`)
                    : waLink(config, product.nombre)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {waOnlyReason ? WA_ONLY_CONFIG[waOnlyReason].btnText : "Consultar por WhatsApp"}
                </a>
              ) : showCheckout ? (
                <CheckoutFlow
                  items={[{ nombre: cartItem.nombre, qty, unitPrice: cartItem.unitPrice }]}
                  total={total}
                  onBack={() => setShowCheckout(false)}
                />
              ) : (
                <>
                  {/* Mensaje de progreso de MOQ (reactivo al qty) */}
                  {moqInfo && !moqMet && moqInfo.minUnits && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs">
                      <p className="font-bold text-amber-700 dark:text-amber-400">
                         Compra mínima de {moqInfo.group.charAt(0).toUpperCase() + moqInfo.group.slice(1)}
                      </p>
                      <p className="mt-0.5 text-muted-foreground">
                        Llevás {qty} unidad{qty !== 1 ? "es" : ""}. Te falta{moqMissing !== 1 ? "n" : ""}
                        {" "}{moqMissing} para alcanzar el mínimo de {moqInfo.minUnits}.
                      </p>
                    </div>
                  )}

                  {/* "Comprar ya": requiere cumplir el mínimo completo de la categoría */}
                  {(() => {
                    const moqBlocked = moqInfo != null && !moqMet;
                    const disabled = moqBlocked || bloqueaCompra;
                    return (
                      <button
                        type="button"
                        id="btn-comprar-ya"
                        disabled={disabled}
                        onClick={() => {
                          if (hasTalles && !selectedTalle) {
                            setTalleError(true);
                            return;
                          }
                          if (bloqueaCompra) {
                            setShowMin(true);
                            return;
                          }
                          setShowCheckout(true);
                        }}
                        className={`btn-base w-full transition-all font-semibold ${
                          disabled
                            ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground border border-border"
                            : "grad-urgente text-primary-foreground hover:shadow-md"
                        }`}
                      >
                        {hasTalles && !selectedTalle
                          ? "Elegí tu talle para comprar"
                          : moqInfo && !moqMet && moqInfo.minUnits
                          ? `Mínimo ${moqInfo.minUnits} unidades para comprar ya`
                          : bloqueaCompra
                          ? `Mínimo requerido para compra directa`
                          : "Comprar ya"}
                      </button>
                    );
                  })()}

                  {existingInCart && (
                    <div className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-1.5 text-center text-xs font-semibold text-primary">
                      ✓ Ya tenés {existingInCart.qty} {existingInCart.qty === 1 ? "unidad" : "unidades"} en tu carrito
                    </div>
                  )}

                  {/* "Agregar al carrito": permite armar el surtido en el carrito */}
                  <button
                    type="button"
                    id="btn-agregar-carrito"
                    onClick={() => {
                      if (hasTalles && !selectedTalle) {
                        setTalleError(true);
                        return;
                      }
                      if (existingInCart) {
                        cart.setQty(existingInCart.id, qty);
                      } else {
                        cart.add(cartItem);
                      }
                      navigate({ to: "/carrito" });
                    }}
                    className="btn-base w-full border border-border text-foreground hover:border-primary hover:text-primary transition-colors font-semibold"
                  >
                    {existingInCart ? "Actualizar cantidad en carrito" : "Agregar al carrito (armar surtido)"}
                  </button>

                  <p className="text-center text-xs text-muted-foreground">
                    Pagá con transferencia o con Mercado Pago.
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
        <section className="mt-12 max-w-4xl">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-sans text-xl sm:text-2xl font-bold normal-case tracking-tight">
                Reseñas de compradores mayoristas
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Experiencias reales de revendedores que compran en nuestro catálogo.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Clientes verificados
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {REVIEWS.map((r) => (
              <div key={r.name} className="card-soft p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${r.avatarBg} text-xs font-bold text-white shadow-xs`}>
                        {r.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground leading-none">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{r.location}</p>
                      </div>
                    </div>
                    <Stars value={r.stars} />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">“{r.text}”</p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground/80">
                  <span className="font-medium truncate max-w-[160px]">{r.role}</span>
                  <span className="shrink-0">{r.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <a
          className="btn-base mt-10 w-full bg-whatsapp text-whatsapp-foreground sm:w-auto sm:px-10"
          href={waLink(config, product.nombre)}
          target="_blank"
          rel="noopener noreferrer"
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
            <DialogTitle>{minDialogTitle}</DialogTitle>
            <DialogDescription>{minDialogDescription}</DialogDescription>
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
