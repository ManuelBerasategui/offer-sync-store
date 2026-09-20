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
  isCamiseta,
  isLongSleeve,
  JERSEY_PLAYER_TIERS,
  JERSEY_FAN_TIERS,
  JERSEY_PLAYER_ML_TIERS,
  JERSEY_FAN_ML_TIERS,
  calcJerseyUnitPrice,
  type Product,
  type ProductVariant,
  type SiteConfig,
} from "@/lib/store";

// ─────────────────────────────────────────────────────────────────────────────
// Sanitización segura de texto libre (CWE-79 / Snyk XSS)
// Elimina cualquier tag HTML y caracteres de control sin usar new RegExp dinámico.
// ─────────────────────────────────────────────────────────────────────────────

/** Strip HTML tags and control characters from a user-supplied string (XSS-safe). */
function sanitizeText(raw: string): string {
  // Static literal pattern — no dynamic RegExp construction (avoids ReDoS, CWE-400)
  return raw
    .replace(/<[^>]*>/g, "")          // strip HTML tags
    .replace(/[&<>"'`]/g, (c) => {    // escape remaining HTML special chars
      switch (c) {
        case "&": return "&amp;";
        case "<": return "&lt;";
        case ">": return "&gt;";
        case '"': return "&quot;";
        case "'": return "&#x27;";
        case "`": return "&#x60;";
        default:  return c;
      }
    })
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // strip control chars
    .trim()
    .slice(0, 200); // hard max 200 chars
}


function JerseyProductUI({
  product,
  talles,
  config,
}: {
  product: Product;
  talles: string[];
  config: SiteConfig;
}) {
  const productName = product.nombre ?? "Camiseta";
  const cart = useCart();
  const navigate = useNavigate();
  const [selectedTalle, setSelectedTalle] = useState(talles[0] ?? "S");
  const [talleError, setTalleError] = useState(false);
  const [version, setVersion] = useState<"fan" | "player">("fan");
  const [badge, setBadge] = useState<"no" | "yes">("no");
  // Cantidad personalizada (mínimo 10 u. según la escala mayorista)
  const [qty, setQty] = useState(10);
  const [qtyStr, setQtyStr] = useState("10");
  const [showCheckout, setShowCheckout] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);

  // Detección manga larga: usa los tiers ML si el nombre del producto lo incluye
  const isML = isLongSleeve(productName);

  const tiers = isML
    ? (version === "player" ? JERSEY_PLAYER_ML_TIERS : JERSEY_FAN_ML_TIERS)
    : (version === "player" ? JERSEY_PLAYER_TIERS    : JERSEY_FAN_TIERS);

  // Determinar dinámicamente qué tramo mayorista aplica según la cantidad elegida
  const activeTier = [...tiers]
    .sort((a, b) => b.qty - a.qty)
    .find((t) => qty >= t.qty) ?? tiers[0]!;

  // Siguiente tramo para informar al usuario cuánto le falta para ahorrar más
  const nextTier = [...tiers]
    .sort((a, b) => a.qty - b.qty)
    .find((t) => t.qty > qty);

  // Tipo de cambio USD→ARS desde la clave real del config en Supabase
  const usdRate = Number(config["dolar_cotizacion"] ?? 0);

  // Aumento por badge (+1 USD por unidad convertido a ARS) con recargo del 7% (+7% estándar de la tienda)
  const badgeExtraArs = badge === "yes" ? (usdRate > 0 ? Math.round(1 * 1.07 * usdRate) : 0) : 0;

  // Costo adicional por talle extra (3XL / 4XL) (+1 USD por unidad convertido a ARS) con recargo del 7%
  const isExtraSize = selectedTalle === "3XL" || selectedTalle === "4XL";
  const extraSizeArs = isExtraSize ? (usdRate > 0 ? Math.round(1 * 1.07 * usdRate) : 0) : 0;

  // Precio unitario final en ARS con todos los extras aplicados (+7% estándar de lista de la tienda)
  const unitArs = usdRate > 0
    ? Math.round(activeTier.unitUsd * 1.07 * usdRate) + extraSizeArs + badgeExtraArs
    : null;

  // Total final para la cantidad exacta solicitada
  const totalArs = unitArs !== null ? unitArs * qty : null;

  // Nombre enriquecido con opciones para el carrito, orden y mails de compra/venta
  const fullItemName = `${productName} (Talle: ${selectedTalle || "S"} - ${version === "player" ? "Versión Jugador (Personalizado Nombre y Número)" : "Versión Fan (Sin personalizar)"}${badge === "yes" ? " - Con Badge" : ""})`;

  const phone = (config["whatsapp_individual"] ?? config["whatsapp_numero"] ?? "5493418051515").replace(/\D/g, "");

  /** Abre WhatsApp para coordinar el badge deseado y cerrar la venta */
  function handleBadgeWhatsApp() {
    const talleStr = selectedTalle || talles[0] || "S";
    const versionStr = version === "player" ? "Jugador (Personalizado Nombre y Número)" : "Fan (Sin personalizar)";
    const priceStr = unitArs !== null ? ` — $${unitArs.toLocaleString("es-AR")} c/u` : "";
    const totalStr = totalArs !== null ? ` — Total: $${totalArs.toLocaleString("es-AR")}` : "";
    const msg = `Hola! Quiero que tenga el siguiente badge para la camiseta: ${productName}\n• Talle: ${talleStr}\n• Versión: ${versionStr}\n• Cantidad: ${qty} unidades${priceStr}${totalStr}`;
    const href = sanitizeUrl(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  }

  /** Selecciona badge y abre WhatsApp para coordinar el modelo deseado */
  function handleSelectBadgeYes() {
    setBadge("yes");
    handleBadgeWhatsApp();
  }

  /** Arma el mensaje de WhatsApp con todos los datos del pedido */
  function buildWaMessage() {
    const talleStr = selectedTalle || talles[0] || "S";
    const versionStr = version === "player" ? "Jugador (Personalizado Nombre y Número)" : "Fan (Sin personalizar)";
    const badgeStr = badge === "yes" ? "Sí (con badge oficial)" : "No";
    const qtyStr = String(qty);
    const priceStr = unitArs !== null ? ` — $${unitArs.toLocaleString("es-AR")} c/u` : "";
    const totalStr = totalArs !== null ? ` — Total: $${totalArs.toLocaleString("es-AR")}` : "";
    return `Hola! Quiero hacer un pedido de camisetas:\n🏷️ Producto: ${productName}\n📐 Talle: ${talleStr}\n⚽ Versión: ${versionStr}\n🏅 Badge: ${badgeStr}\n📦 Cantidad: ${qtyStr} unidades${priceStr}${totalStr}`;
  }

  function handleWhatsApp() {
    const talleToUse = selectedTalle || talles[0] || "S";
    if (!selectedTalle) {
      setSelectedTalle(talleToUse);
    }
    const msg = buildWaMessage();
    const href = sanitizeUrl(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
  }

  function handleBuyNow() {
    if (qty < 10) return; // mínimo 10 unidades
    const talleToUse = selectedTalle || talles[0] || "S";
    if (!selectedTalle) {
      setSelectedTalle(talleToUse);
    }
    setShowCheckout(true);
  }

  function handleAddToCart() {
    const talleToUse = selectedTalle || talles[0] || "S";
    if (!selectedTalle) {
      setSelectedTalle(talleToUse);
    }
    const currentQty = Math.max(10, parseInt(qtyStr, 10) || qty || 10);
    const fullItem = `${productName} (Talle: ${talleToUse} - ${version === "player" ? "Versión Jugador (Personalizado Nombre y Número)" : "Versión Fan (Sin personalizar)"}${badge === "yes" ? " - Con Badge" : ""})`;

    const { unitArs: calculatedUnit, baseArs: calculatedBase } = calcJerseyUnitPrice({
      qty: currentQty,
      version,
      isExtraSize,
      badge,
      usdRate,
      isLongSleeve: isML,
    });
    const finalUnit = calculatedUnit > 0 ? calculatedUnit : (unitArs ?? 0);
    const finalBase = calculatedBase > 0 ? calculatedBase : (unitArs ?? 0);

    cart.add({
      id: `${product.id}-${version}-${talleToUse}-${badge}`,
      productId: String(product.id),
      nombre: fullItem,
      unitPrice: finalUnit,
      basePrice: finalBase,
      qty: currentQty,
      imagen: product.imagen_url ? imageUrl(product.imagen_url) : undefined,
      categoria: product.categoria ?? "Camisetas",
    });
    setAddedToCart(true);
    void navigate({ to: "/carrito" });
  }

  if (showCheckout) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold text-foreground">Completar compra de camisetas</p>
          <button
            type="button"
            onClick={() => setShowCheckout(false)}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold"
          >
            ← Volver a opciones
          </button>
        </div>
        <CheckoutFlow
          items={[{
            nombre: fullItemName,
            qty: qty,
            unitPrice: unitArs ?? 0,
            productId: product.id,
          }]}
          total={totalArs ?? 0}
          onBack={() => setShowCheckout(false)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header de Precio y Mínimo Mayorista ── */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4 sm:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className="rounded-full bg-primary/20 text-primary px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide border border-primary/30">
                ⚡ Mínimo 10 u. Mayorista
              </span>
              {activeTier.qty > 10 && (
                <span className="rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-bold">
                  🔥 Tramo {activeTier.qty}+ u. aplicado
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight tabular-nums">
                {unitArs !== null ? `$${unitArs.toLocaleString("es-AR")}` : "—"}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-muted-foreground">/ unidad</span>
            </div>
            {totalArs !== null && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Total por <span className="font-bold text-foreground">{qty} u.</span>: <span className="font-bold text-primary">${totalArs.toLocaleString("es-AR")}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Selector de Talle ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
            Talle *
          </label>
          {selectedTalle && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              Seleccionado: {selectedTalle}
            </span>
          )}
        </div>
        {talles.length === 0 ? (
          <p className="text-xs font-semibold text-destructive">Sin talles disponibles en este momento.</p>
        ) : (
          <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2">
            {talles.map((t) => {
              const isXtra = t === "3XL" || t === "4XL";
              const isSelected = selectedTalle === t;
              const extraPrice = usdRate > 0 ? Math.round(1 * 1.07 * usdRate) : 0;
              const extraLabel = extraPrice > 0 ? `+$${extraPrice.toLocaleString("es-AR")}` : "+1 USD";
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setSelectedTalle(t); setTalleError(false); }}
                  className={[
                    "h-12 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center relative active:scale-95",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/30"
                      : "bg-background text-foreground border-border hover:border-primary/50 hover:bg-muted/50",
                  ].join(" ")}
                >
                  <span className="text-sm font-black">{t}</span>
                  {isXtra && (
                    <span className={`text-[9px] font-semibold leading-none mt-0.5 ${isSelected ? "text-primary-foreground/90" : "text-amber-600 dark:text-amber-400"}`}>
                      {extraLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
        {talleError && (
          <p className="mt-2 text-xs font-semibold text-destructive">⚠️ Por favor elegí tu talle antes de continuar.</p>
        )}
      </div>

      {/* ── Selector Nombre y Número ── */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground block mb-2">
          Personalización (Nombre y Número)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Fan */}
          <button
            type="button"
            id="jersey-version-fan"
            onClick={() => setVersion("fan")}
            className={[
              "w-full rounded-xl p-3.5 text-left transition-all border flex items-start justify-between gap-3 active:scale-[0.99]",
              version === "fan"
                ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary"
                : "bg-background border-border hover:border-primary/40",
            ].join(" ")}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">👕</span>
                <span className="text-sm font-bold text-foreground">Versión Fan</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Sin nombre ni número (lisa)</p>
              <p className="text-[11px] font-bold text-primary mt-1.5">Desde $18.50 USD</p>
            </div>
            <div className={`mt-1 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${version === "fan" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {version === "fan" && <span className="text-xs">✓</span>}
            </div>
          </button>

          {/* Jugador */}
          <button
            type="button"
            id="jersey-version-player"
            onClick={() => setVersion("player")}
            className={[
              "w-full rounded-xl p-3.5 text-left transition-all border flex items-start justify-between gap-3 active:scale-[0.99]",
              version === "player"
                ? "bg-primary/10 border-primary shadow-sm ring-1 ring-primary"
                : "bg-background border-border hover:border-primary/40",
            ].join(" ")}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <span className="text-sm font-bold text-foreground">Versión Jugador</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Personalizado (Nombre y Número)</p>
              <p className="text-[11px] font-bold text-primary mt-1.5">Desde $20.50 USD</p>
            </div>
            <div className={`mt-1 h-5 w-5 shrink-0 rounded-full border flex items-center justify-center ${version === "player" ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
              {version === "player" && <span className="text-xs">✓</span>}
            </div>
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/60">
          {version === "player"
            ? "✏️ Versión Jugador — luego de mandar el comprobante indicanos cómo la querés personalizar"
            : "👕 Versión Fan — camiseta lisa sin personalización"}
        </p>
      </div>

      {/* ── Selector Badge ── */}
      <div>
        <label className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground block mb-2">
          Badge / Parche Oficial
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Sin Badge */}
          <button
            type="button"
            id="jersey-badge-no"
            onClick={() => setBadge("no")}
            className={[
              "h-16 rounded-xl border-2 p-2.5 font-bold transition-all flex items-center gap-2.5 active:scale-[0.98]",
              badge === "no"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-background text-foreground hover:border-primary/40",
            ].join(" ")}
          >
            <span className="text-2xl shrink-0">🚫</span>
            <div className="text-left">
              <span className="block text-xs font-bold leading-tight">Sin Badge</span>
              <span className="block text-[10px] font-normal text-muted-foreground mt-0.5">Versión lisa</span>
            </div>
          </button>

          {/* Agregar Badge */}
          <button
            type="button"
            id="jersey-badge-yes"
            onClick={handleSelectBadgeYes}
            className={[
              "h-16 rounded-xl border-2 p-2.5 font-bold transition-all flex items-center gap-2.5 active:scale-[0.98]",
              badge === "yes"
                ? "border-primary bg-primary/10 text-primary shadow-sm"
                : "border-border bg-background text-foreground hover:border-primary/40",
            ].join(" ")}
          >
            <span className="text-2xl shrink-0">🏆</span>
            <div className="text-left">
              <span className="block text-xs font-bold leading-tight">Con Badge</span>
              <span className="block text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {usdRate > 0 ? `+${money(Math.round(1 * 1.07 * usdRate))}` : "+US$1.00"}
              </span>
            </div>
          </button>
        </div>
        {badge === "yes" && (
          <div className="mt-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-300">
            <p className="font-bold flex items-center gap-1.5">
              <span>✓</span> Badge seleccionado (+{usdRate > 0 ? money(Math.round(1 * 1.07 * usdRate)) : "US$1.00"} c/u)
            </p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-400">
              Para coordinar qué badge querés y cerrar la venta, lo coordinamos directamente por WhatsApp.
            </p>
            <button
              type="button"
              onClick={handleBadgeWhatsApp}
              className="mt-2 inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 underline hover:opacity-80"
            >
              Abrir WhatsApp para coordinar el badge →
            </button>
          </div>
        )}
      </div>

      {/* ── Selector de Cantidad interactivo (permite ej: 15 u.) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="jersey-qty-input" className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
            Cantidad a pedir
          </label>
          <span className="text-xs text-primary font-bold">
            Mínimo 10 unidades
          </span>
        </div>

        {/* Quick select pills */}
        <div className="grid grid-cols-4 gap-1.5 mb-2.5">
          {[10, 20, 50, 100].map((quickQty) => (
            <button
              key={quickQty}
              type="button"
              onClick={() => {
                setQty(quickQty);
                setQtyStr(String(quickQty));
              }}
              className={`py-1.5 rounded-lg text-xs font-bold border transition active:scale-95 ${
                qty === quickQty
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/50 border-border text-foreground hover:border-primary/40"
              }`}
            >
              {quickQty} u.
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="jersey-qty-minus"
            onClick={() => {
              const next = Math.max(10, qty - 1);
              setQty(next);
              setQtyStr(String(next));
            }}
            disabled={qty <= 10}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-xl font-bold hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95"
          >
            -
          </button>
          <input
            id="jersey-qty-input"
            type="number"
            min={10}
            max={5000}
            value={qtyStr}
            onChange={(e) => {
              const val = e.target.value;
              setQtyStr(val);
              const num = parseInt(val, 10);
              if (!isNaN(num) && num >= 1) {
                setQty(num);
              }
            }}
            onBlur={() => {
              const num = parseInt(qtyStr, 10);
              const valid = isNaN(num) || num < 10 ? 10 : num;
              setQty(valid);
              setQtyStr(String(valid));
            }}
            className="h-11 flex-1 rounded-xl border border-input bg-background text-center text-lg font-black focus:border-primary outline-none"
          />
          <button
            type="button"
            id="jersey-qty-plus"
            onClick={() => {
              const next = qty + 1;
              setQty(next);
              setQtyStr(String(next));
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-input bg-background text-xl font-bold hover:bg-muted transition active:scale-95"
          >
            +
          </button>
        </div>
        {nextTier && (
          <p className="mt-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-xl p-2.5">
            💡 Llevás <span className="font-bold text-foreground">{qty} u.</span> (tramo <span className="font-bold text-foreground">{activeTier.qty}+ u.</span>)
            {" — "}¡Sumando <span className="font-bold text-primary">{nextTier.qty - qty} u. más</span> accedés al precio de {nextTier.qty} u.!
          </p>
        )}
      </div>

      {/* ── Escala de Precios por Tramo (Mobile Friendly) ── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
            Escala de precios por volumen
          </label>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            Tocá cualquier tramo para seleccionarlo
          </span>
        </div>
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border bg-card shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-3 bg-muted/60 px-3.5 py-2 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
            <span>Tramo</span>
            <span className="text-center">Precio c/u</span>
            <span className="text-right">Total tramo</span>
          </div>
          {/* Rows */}
          {tiers.map((tier) => {
            const isTierActive = activeTier.qty === tier.qty;
            const arsBaseUnit = usdRate > 0 ? Math.round(tier.unitUsd * 1.07 * usdRate) : null;
            const arsUnitWithExtras = arsBaseUnit !== null ? arsBaseUnit + extraSizeArs + badgeExtraArs : null;
            const arsTotalForTier = arsUnitWithExtras !== null ? arsUnitWithExtras * tier.qty : null;
            return (
              <button
                key={tier.qty}
                type="button"
                id={`jersey-tier-${tier.qty}`}
                onClick={() => {
                  setQty(tier.qty);
                  setQtyStr(String(tier.qty));
                }}
                className={[
                  "w-full grid grid-cols-3 px-3.5 py-2.5 text-left transition-colors items-center active:bg-muted",
                  isTierActive
                    ? "bg-primary/10 font-bold"
                    : "hover:bg-muted/40",
                ].join(" ")}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs sm:text-sm font-bold ${isTierActive ? "text-primary" : "text-foreground"}`}>
                    {tier.qty} u.
                  </span>
                  {isTierActive && (
                    <span className="text-[9px] sm:text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-bold leading-none">
                      ✓
                    </span>
                  )}
                </div>
                <div className={`text-center text-xs sm:text-sm tabular-nums font-semibold ${isTierActive ? "text-primary" : "text-foreground"}`}>
                  {arsUnitWithExtras !== null ? `$${arsUnitWithExtras.toLocaleString("es-AR")}` : "—"}
                </div>
                <div className={`text-right text-xs sm:text-sm tabular-nums font-bold ${isTierActive ? "text-primary font-black" : "text-foreground"}`}>
                  {arsTotalForTier !== null ? `$${arsTotalForTier.toLocaleString("es-AR")}` : "—"}
                </div>
              </button>
            );
          })}
        </div>
        {usdRate <= 0 && (
          <p className="mt-1.5 text-[11px] text-amber-600 font-semibold">
            ⚠️ Consultá el precio en ARS por WhatsApp.
          </p>
        )}
      </div>

      {/* ── Resumen de Selección (Order Summary Card) ── */}
      {selectedTalle && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs shadow-sm">
          <p className="font-extrabold text-primary text-xs uppercase tracking-wider mb-2.5">
            📋 Resumen de tu selección:
          </p>
          <div className="grid grid-cols-2 gap-2 text-foreground mb-3">
            <div className="bg-background/80 rounded-lg p-2 border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Talle</span>
              <span className="font-bold text-xs">{selectedTalle} {isExtraSize && "(+1 USD)"}</span>
            </div>
            <div className="bg-background/80 rounded-lg p-2 border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Versión</span>
              <span className="font-bold text-xs">{version === "player" ? "Jugador (Personalizado)" : "Fan"}</span>
            </div>
            <div className="bg-background/80 rounded-lg p-2 border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Badge</span>
              <span className="font-bold text-xs">{badge === "yes" ? "Con Badge 🏆" : "Sin Badge"}</span>
            </div>
            <div className="bg-background/80 rounded-lg p-2 border border-border/50">
              <span className="text-[10px] text-muted-foreground block">Cantidad</span>
              <span className="font-bold text-xs">{qty} unidades</span>
            </div>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-primary/20">
            <div>
              <span className="text-[11px] text-muted-foreground block">Precio unitario</span>
              <span className="font-bold text-sm text-foreground">
                {unitArs !== null ? `$${unitArs.toLocaleString("es-AR")}` : "—"}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-muted-foreground block">Total estimado</span>
              <span className="font-black text-base sm:text-lg text-primary">
                {totalArs !== null ? `$${totalArs.toLocaleString("es-AR")}` : "—"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Acciones de Compra y Contacto ── */}
      {badge === "yes" ? (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-800 dark:text-emerald-300">
            <p className="font-bold flex items-center gap-1.5 text-sm text-emerald-900 dark:text-emerald-200">
              <span>💬</span> Los pedidos con Badge se coordinan y cierran por WhatsApp
            </p>
            <p className="mt-1 text-emerald-700 dark:text-emerald-400 leading-relaxed">
              Te confirmamos modelos de parches disponibles, precio final y método de pago directamente por chat para asegurar que recibas el parche exacto.
            </p>
          </div>
          <button
            type="button"
            id="btn-jersey-whatsapp-badge"
            onClick={handleBadgeWhatsApp}
            className="btn-base w-full bg-whatsapp text-whatsapp-foreground flex items-center justify-center gap-2 font-bold hover:opacity-90 transition-opacity py-3.5 text-base shadow-md active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Coordinar pedido con Badge por WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setBadge("no")}
            className="text-xs text-muted-foreground hover:text-foreground text-center underline py-1 transition-colors"
          >
            ← Comprar sin badge directamente por la web
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {/* Aviso de mínimo cuando qty < 10 */}
          {qty < 10 && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-3 text-xs">
              <p className="font-bold text-destructive">⚠️ Mínimo 10 unidades</p>
              <p className="mt-0.5 text-muted-foreground">
                Llevás {qty} {qty === 1 ? "unidad" : "unidades"}. Necesitás al menos {10 - qty} más para poder comprar.
              </p>
            </div>
          )}

          {/* Comprar ya */}
          <button
            type="button"
            id="btn-jersey-comprar-ya"
            disabled={qty < 10}
            onClick={handleBuyNow}
            className={`btn-base w-full font-bold transition-all text-base py-3.5 shadow-sm active:scale-[0.98] ${
              qty < 10
                ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground border border-border"
                : "grad-urgente text-primary-foreground hover:shadow-md"
            }`}
          >
            {qty < 10
              ? `Mínimo 10 unidades (tenés ${qty})`
              : `Comprar ya (${qty} u. — $${(totalArs ?? 0).toLocaleString("es-AR")})`
            }
          </button>

          {/* Agregar al carrito */}
          <button
            type="button"
            id="btn-jersey-add-cart"
            disabled={qty < 10}
            onClick={qty < 10 ? undefined : handleAddToCart}
            className={`btn-base w-full font-bold transition py-3 active:scale-[0.98] ${
              qty < 10
                ? "opacity-40 cursor-not-allowed border border-border text-muted-foreground"
                : "border-2 border-primary text-primary hover:bg-primary/10"
            }`}
          >
            {addedToCart ? "✓ ¡Agregado al carrito!" : `🛒 Agregar al carrito (${qty} u.)`}
          </button>

          {/* CTA WhatsApp */}
          <button
            type="button"
            id="btn-jersey-whatsapp"
            onClick={handleWhatsApp}
            className="btn-base w-full bg-whatsapp text-whatsapp-foreground flex items-center justify-center gap-2 font-semibold hover:opacity-90 transition-opacity py-3 active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            Consultar / Pedir por WhatsApp
          </button>
        </div>
      )}
      <p className="text-center text-xs text-muted-foreground -mt-1">
        Te confirmamos disponibilidad y precio final en ARS.
      </p>
    </div>
  );
}

/** Galería de imágenes interactiva con miniaturas clickeables. */
function ProductGallery({
  images,
  productName,
  selectedVariantImage,
}: {
  images: string[];
  productName: string;
  selectedVariantImage?: string | null | undefined;
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

  // Detección de categoría camisetas
  const isCamisetaProd = isCamiseta(product?.categoria, product?.nombre);

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

            {!isCamisetaProd && ((consultar || (waOnlyReason && (WA_ONLY_CONFIG[waOnlyReason]?.hidePrice || unit <= 0)) || unit <= 0) ? (
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
                    const allTiers = rule.discountTiers.some(t => t.units >= 20)
                      ? rule.discountTiers
                      : [...rule.discountTiers, { units: 20, percent: 12 }];
                    const activeCatTier = [...allTiers].sort((a, b) => b.units - a.units).find(t => qty >= t.units);
                    const nextCatTier = [...allTiers].sort((a, b) => a.units - b.units).find(t => t.units > qty);
                    return (
                      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/10 p-3 sm:p-3.5 text-xs text-foreground">
                        <div className="flex items-start gap-2.5">
                          <span className="text-base shrink-0 mt-0.5">🎁</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-primary text-xs sm:text-sm">
                              Descuento por cantidad en {categoryName}:
                            </p>
                            <ul className="mt-1.5 space-y-1 text-muted-foreground text-[11px] sm:text-xs">
                              {allTiers.map((tier) => (
                                <li key={tier.units} className="flex items-center gap-1.5">
                                  <span className="font-semibold text-foreground">
                                    Llevando {tier.units} u. o más:
                                  </span>
                                  <span className="font-bold text-primary">{tier.percent}% OFF</span>
                                </li>
                              ))}
                            </ul>
                            {nextCatTier ? (
                              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1">
                                <span className="shrink-0">💡</span>
                                <span>
                                  Llevá <strong className="text-foreground">{nextCatTier.units - qty} unidad{nextCatTier.units - qty !== 1 ? "es" : ""} más</strong> para activar el <strong className="text-primary">{nextCatTier.percent}% OFF</strong>. Podés combinar distintos productos de {categoryName}.
                                </span>
                              </p>
                            ) : (
                              <p className="mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                                Podés combinar distintos productos de {categoryName} en tu carrito.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (tiers.length > 0) {
                    const catName = product.categoria ? product.categoria.trim() : "este producto";
                    const activeProdTier = [...tiers].sort((a, b) => b.units - a.units).find(t => qty >= t.units);
                    const nextProdTier = [...tiers].sort((a, b) => a.units - b.units).find(t => t.units > qty);
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
                            {nextProdTier ? (
                              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-start gap-1">
                                <span className="shrink-0">💡</span>
                                <span>
                                  Llevá <strong className="text-foreground">{nextProdTier.units - qty} unidad{nextProdTier.units - qty !== 1 ? "es" : ""} más</strong> para activar el <strong className="text-primary">{nextProdTier.percent}% OFF</strong> automático.
                                </span>
                              </p>
                            ) : (
                              <p className="mt-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                                Descuento automático por volumen al agregar al carrito.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
              </>
            ))}

            {/* ── Bloque estándar de colores/talle/cantidad: solo para productos NO camiseta ── */}
            {!isCamisetaProd && !consultar && !waOnlyReason && usesColors && (
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

            {/* Selector de Talle (productos estándar) */}
            {!isCamisetaProd && !consultar && !waOnlyReason && hasTalles && (
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

            {/* ── UI especial Camisetas ── */}
            {isCamisetaProd && (
              <div className="mt-6">
                <JerseyProductUI
                  product={product}
                  talles={availableTalles.length > 0 ? availableTalles : ["S", "M", "L", "XL", "XXL", "3XL", "4XL"]}
                  config={config}
                />
              </div>
            )}

            {/* Cantidad (solo productos estándar) */}
            {!isCamisetaProd && !consultar && !waOnlyReason && (
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

            {/* ── Botones de acción: solo para productos NO camiseta ── */}
            {!isCamisetaProd && (
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
            )}
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
