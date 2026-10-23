import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { Flame, ArrowRight, MessageCircle, Mail, Instagram, Tag, ChevronLeft, ChevronRight, Truck, ShieldCheck, CreditCard } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { ComboCard } from "@/components/ComboCard";
import { HomeQuiz } from "@/components/HomeQuiz";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { HowItWorks, ReviewsCarousel } from "@/components/Social";
import { SectionHead } from "@/components/SectionHead";
import { storeQueryOptions } from "@/lib/store-query";
import {
  FALLBACK_IMAGE, imageUrl, thumbnailUrl, hasOffer,
  onImageError, isYes, money, toNumber, waLink, sanitizeUrl, type SiteConfig,
  parseCategoryRules, normCat, transferPrice, transferDiscountPct, orderedCategories,
  findRuleForCat, type CategoryRule, isNfcGoogle, isHiddenCategory,
  rankBestSellers, HOME_BEST_SELLERS,
} from "@/lib/store";
import { SITE_URL } from "@/lib/constants";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Te importamos — Ofertas del día en productos importados" },
      {
        name: "description",
        content:
          "Importamos de todo para que revendas: tecnología, bazar y perfumes con precio de importador. Comprá online con envíos a todo el país.",
      },
      { property: "og:title", content: "Te importamos — Precio de importador" },
      {
        property: "og:description",
        content:
          "Ofertas del día en productos importados originales. Comprá online, ideal para revender.",
      },
      { property: "og:image", content: `${SITE_URL}/businessicon.jpg` },
      { property: "og:image:secure_url", content: `${SITE_URL}/businessicon.jpg` },
      { name: "twitter:image", content: `${SITE_URL}/businessicon.jpg` },
      { property: "og:url", content: `${SITE_URL}/` },
    ],
    links: [
      { rel: "canonical", href: `${SITE_URL}/` },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, banners, config } = data;

  const combosScrollRef = useRef<HTMLDivElement>(null);
  const ofertasScrollRef = useRef<HTMLDivElement>(null);
  // Se muestran 4 combos; el resto aparece con "Ver más" (menos invasivo en móvil)
  const COMBOS_VISIBLES = 4;
  const [showAllCombos, setShowAllCombos] = useState(false);
  const visibleCombos = showAllCombos ? banners : banners.slice(0, COMBOS_VISIBLES);

  const scrollCombos = (dir: "left" | "right") => {
    const el = combosScrollRef.current;
    if (!el) return;
    const scrollAmount = 380;
    el.scrollBy({
      left: dir === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Flechas del carrusel de productos en oferta (en PC no se puede deslizar con el dedo)
  const scrollOfertas = (dir: "left" | "right") => {
    const el = ofertasScrollRef.current;
    if (!el) return;
    const amount = Math.max(276, Math.round(el.clientWidth * 0.8));
    el.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };

  const ofertasDelDia = products.filter((p) => hasOffer(p));

  // Más vendidos: mismo ranking que el catálogo (rankBestSellers), así los 3 de la home son
  // siempre los primeros de "Más vendidos" en el catálogo
  const masVendidos = rankBestSellers(products).ranked.slice(0, HOME_BEST_SELLERS);

  // Fotos del hero (PC): ofertas y más vendidos con imagen, sin repetir
  const heroProducts: typeof products = [];
  const heroSeen = new Set<string>();
  for (const p of [...ofertasDelDia, ...masVendidos, ...products]) {
    if (heroProducts.length >= 4) break;
    const id = String(p.id ?? p.nombre ?? "");
    if (!p.imagen_url || heroSeen.has(id)) continue;
    heroSeen.add(id);
    heroProducts.push(p);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-surface to-surface px-4 pt-10 pb-8 sm:px-6 sm:pt-16 sm:pb-14">
        {/* Decorative color wash & difuminados suaves */}
        <div aria-hidden className="pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

        <div
          className={`relative mx-auto grid max-w-[1180px] items-center gap-10 ${
            heroProducts.length >= 4 ? "lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-14" : ""
          }`}
        >
          <div className="text-center">
            {/* Badge superior: oscuro/neutro, NO naranja */}
            <span className="mb-4 sm:mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/60">
              <Flame className="h-3 w-3 opacity-70" />
              Precios de Importador
            </span>

            {/* Título: pregunta de entrada del cuestionario */}
            <h1 className="mx-auto max-w-4xl text-[clamp(36px,11vw,72px)] leading-[0.95]">
              ¿Qué querés <span className="text-primary">hacer?</span>
            </h1>
            <p className="mx-auto mt-3 mb-6 max-w-md text-sm text-muted-foreground sm:mb-8 sm:text-base">
              Elegí una opción y te llevamos al camino más corto.
            </p>

            {/* Cuestionario: importar / mayorista / minorista → rubro del catálogo */}
            <HomeQuiz categories={orderedCategories(products)} hasCombos={banners.length > 0} />

            {/* Confianza: datos reales del negocio, sin números inventados */}
            <ul className="mx-auto mt-5 flex max-w-xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-muted-foreground sm:text-[13px]">
              <li className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <Truck className="h-4 w-4 shrink-0 text-primary" /> Envíos a todo el país
              </li>
              <li className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" /> Productos originales
              </li>
              <li className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                <CreditCard className="h-4 w-4 shrink-0 text-primary" /> Mercado Pago o transferencia
              </li>
            </ul>

            {/* Aviso mínimos — gris puro, sin ámbar */}
            <div className="mt-3 text-center">
              <a
                href="#minimos"
                className="text-[11px] font-medium text-muted-foreground/80 transition-colors hover:text-muted-foreground active:scale-95"
              >
                Aplican mínimos de compra según categoría. <span className="font-bold">Ver ↓</span>
              </a>
            </div>
          </div>

          {/* PC: fotos de productos reales, para que se vea qué vendemos */}
          {heroProducts.length >= 4 && (
            <div className="hidden grid-cols-2 gap-3 lg:grid" aria-label="Algunos de nuestros productos">
              {heroProducts.map((p, i) => (
                <Link
                  key={String(p.id ?? i)}
                  to="/producto/$id"
                  params={{ id: String(p.id ?? p.nombre ?? "") }}
                  onClick={() => track("home_hero_producto", { producto: p.nombre })}
                  className={`group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md ${
                    i % 2 === 1 ? "translate-y-6" : ""
                  }`}
                >
                  <img
                    src={thumbnailUrl(p.imagen_url, "md") || FALLBACK_IMAGE}
                    alt={p.nombre ?? "Producto"}
                    width={320}
                    height={320}
                    referrerPolicy="no-referrer"
                    className="aspect-square w-full bg-surface object-contain p-3"
                    onError={onImageError(p.imagen_url)}
                  />
                  <p className="truncate border-t border-border px-3 py-2 text-xs font-semibold text-foreground">
                    {p.nombre}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>


      {/* MÁS VENDIDOS */}
      <section id="mas-vendidos" className="relative overflow-hidden bg-gradient-to-b from-surface via-surface to-primary/5 px-4 pt-14 pb-10 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1180px]">
          <SectionHead title="Más vendidos" sub="Los tres productos que más salen esta semana." />

          {masVendidos.length > 0 && (
            <div className="relative -mx-4 sm:mx-0">
              <div
                // En PC entran las 3 tarjetas: centradas (antes quedaban pegadas a la izquierda)
                className={`no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-0 lg:justify-center lg:overflow-visible ${masVendidos.length === 1 ? "justify-center" : ""
                  }`}
              >
                {masVendidos.map((p, i) => (
                  <div
                    key={p.id ?? i}
                    className={`snap-center shrink-0 ${masVendidos.length === 1
                        ? "w-full max-w-[300px]"
                        : "w-[72vw] max-w-[280px] sm:w-[260px]"
                      }`}
                  >
                    <ProductCard p={p} config={config} index={i} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* OFERTAS DEL DÍA */}
      <section id="ofertas" className="relative overflow-hidden px-4 pt-6 pb-12 sm:px-6 sm:pt-12 sm:pb-16">
        <div aria-hidden className="pointer-events-none absolute -top-16 right-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1180px]">
          <SectionHead
            title={
              <>
                Ofertas <span className="text-primary">del día</span>
              </>
            }
            sub="Precios exclusivos que renovamos todos los días. Válidos solo por hoy."
          />

          {banners.length > 0 && (
            <div className="mb-8">
              <div className="mb-3.5 flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2.5 flex-1">
                  <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                    Combos
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                </div>
              </div>

              <div className="relative group -mx-4 sm:mx-0">
                {banners.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollCombos("left");
                      }}
                      aria-label="Deslizar hacia la izquierda"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground shadow-md hover:bg-surface hover:border-primary transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        scrollCombos("right");
                      }}
                      aria-label="Deslizar hacia la derecha"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground shadow-md hover:bg-surface hover:border-primary transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}

                {/* Móvil: grilla de 2 columnas. Desde sm: carrusel horizontal con flechas */}
                <div
                  ref={combosScrollRef}
                  className={`no-scrollbar px-4 sm:px-0 ${
                    banners.length === 1
                      ? "flex justify-center"
                      : "grid grid-cols-2 gap-2.5 sm:flex sm:gap-4 sm:overflow-x-auto sm:scroll-smooth"
                  }`}
                >
                  {visibleCombos.map((b, i) => (
                    <ComboCard
                      key={i}
                      banner={b}
                      index={i}
                      config={config}
                      className={
                        banners.length === 1
                          ? "w-full max-w-[440px] shrink-0"
                          : "min-w-0 sm:w-[360px] sm:shrink-0"
                      }
                    />
                  ))}
                </div>
                {/* Hint that there's more to scroll on wider screens when multiple banners exist */}
                {banners.length > 1 && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-background to-transparent sm:block" />
                )}
              </div>
              {banners.length > COMBOS_VISIBLES && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      track("home_combos_ver_mas", { abrir: !showAllCombos });
                      setShowAllCombos((v) => !v);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-card px-5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
                  >
                    {showAllCombos
                      ? "Ver menos"
                      : `Ver más combos (${banners.length - COMBOS_VISIBLES})`}
                  </button>
                </div>
              )}
            </div>
          )}

          {ofertasDelDia.length > 0 && (
            <div className="mt-8">
              {banners.length > 0 && (
                <div className="mb-3.5 flex items-center gap-2.5">
                  <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                    Productos
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
                </div>
              )}
              <div className="relative -mx-4 sm:mx-0">
                {ofertasDelDia.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollOfertas("left")}
                      aria-label="Ver productos anteriores"
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground shadow-md hover:bg-surface hover:border-primary transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollOfertas("right")}
                      aria-label="Ver más productos"
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-20 hidden sm:flex h-9 w-9 items-center justify-center rounded-full border border-border/80 bg-background/95 backdrop-blur-xs text-foreground shadow-md hover:bg-surface hover:border-primary transition-all active:scale-95 cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                <div
                  ref={ofertasScrollRef}
                  className={`no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-0 ${ofertasDelDia.length === 1 ? "justify-center" : ""
                    }`}
                >
                  {ofertasDelDia.map((p, i) => (
                    <div
                      key={p.id ?? i}
                      className={`snap-center shrink-0 ${ofertasDelDia.length === 1
                          ? "w-full max-w-[300px]"
                          : "w-[72vw] max-w-[280px] sm:w-[260px]"
                        }`}
                    >
                      <ProductCard p={p} config={config} index={i} />
                    </div>
                  ))}
                </div>
                {ofertasDelDia.length > 1 && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-background to-transparent sm:block" />
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Link
              to="/catalogo"
              className="btn-base grad-urgente group inline-flex w-full items-center justify-center gap-2 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:px-12"
            >
              Ver todo el catálogo
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* MÍNIMOS DE COMPRA */}
      {(() => {
        const catRules = parseCategoryRules(config);

        // Mapeo canónico ordenado de las categorías con compra mínima
        const canonicalCategories = [
          { key: "tecnologia", label: "Tecnología", defaultDesc: "5 unidades", icon: "🎧" },
          { key: "perfumes arabes", label: "Perfumes Árabes", defaultDesc: "5 unidades", icon: "🧴" },
          { key: "perfumes disenador", label: "Perfumes Diseñador", defaultDesc: "3 unidades", icon: "💎" },
          { key: "bazar", label: "Bazar", defaultDesc: "5 unidades", icon: "🏪" },
          { key: "mates", label: "Mates", defaultDesc: "10 unidades", icon: "🧉" },
          { key: "camisetas", label: "Camisetas", defaultDesc: "10 unidades", icon: "👕" },
          { key: "suplementos", label: "Suplementación", defaultDesc: "$250.000", icon: "⚡" },
          { key: "zapatillas", label: "Zapatillas", defaultDesc: "3 unidades", icon: "👟" },
        ];

        const minItems: { key: string; label: string; desc: string; icon: string }[] = [];
        const seenKeys = new Set<string>();

        for (const cat of canonicalCategories) {
          const rule = catRules[cat.key];
          let desc = cat.defaultDesc;
          if (rule?.minUnits) {
            desc = `${rule.minUnits} unidades`;
          } else if (rule?.minAmount) {
            desc = `${money(rule.minAmount)}`;
          }
          minItems.push({ key: cat.key, label: cat.label, desc, icon: cat.icon });
          seenKeys.add(cat.key);
        }

        // Nombre visible de una clave del admin ("nfc_google" → "NFC Google")
        const minLabel = (key: string) => {
          const text = key.replace(/_/g, " ").trim();
          if (isNfcGoogle(text)) return "NFC Google";
          return text.charAt(0).toUpperCase() + text.slice(1);
        };

        // Agregar cualquier otra categoría que el admin configure con mínimo
        for (const [key, rule] of Object.entries(catRules)) {
          const norm = normCat(key);
          if (seenKeys.has(norm)) continue;
          if (norm === "perfumes" || norm === "perfume") continue;
          if (isHiddenCategory(norm)) continue;

          if (rule.minUnits) {
            seenKeys.add(norm);
            const label = minLabel(key);
            minItems.push({ key: norm, label, desc: `${rule.minUnits} unidades`, icon: "📦" });
          } else if (rule.minAmount) {
            seenKeys.add(norm);
            const label = minLabel(key);
            minItems.push({ key: norm, label, desc: `${money(rule.minAmount)}`, icon: "💰" });
          }
        }

        if (minItems.length === 0) return null;

        // Categoría real del catálogo para cada mínimo, con la misma asociación que usa el carrito
        // (findRuleForCat). Si no hay productos de esa categoría, la tarjeta queda sin link.
        const realCats = orderedCategories(products);
        const catalogCatFor = (key: string) => {
          // Las claves del admin pueden venir con guion bajo ("nfc_google" ↔ categoría "NFC Google")
          const keys = [...new Set([key, key.replace(/_/g, " ")])];
          for (const k of keys) {
            const matches = realCats.filter(
              (c) => findRuleForCat(normCat(c), { [k]: {} as CategoryRule })?.key === k,
            );
            const found = matches.find((c) => normCat(c) === k) ?? matches[0];
            if (found) return found;
          }
          return undefined;
        };
        // NFC Google es un solo producto: la tarjeta lleva directo a ese producto (con stock primero)
        const nfcCandidates = products.filter((p) => isNfcGoogle(p.nombre));
        const nfcProduct = nfcCandidates.find((p) => isYes(p.stock)) ?? nfcCandidates[0];
        const productFor = (key: string) =>
          nfcProduct && isNfcGoogle(key.replace(/_/g, " ")) ? nfcProduct : undefined;

        return (
          <section id="minimos" className="px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-[1180px]">
              <SectionHead
                title={
                  <>
                    Mínimos <span className="text-primary">de compra</span>
                  </>
                }
                sub="En algunas categorías hay un mínimo. Podés combinar productos de la misma categoría para llegar."
              />
              <div className="rounded-2xl border border-border bg-card/60 p-3 sm:p-5">
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-4">
                  {minItems.map((it) => {
                    const product = productFor(it.key) ?? productFor(it.label);
                    const target = catalogCatFor(it.key);
                    const content = (
                      <>
                        <span className="text-xl shrink-0">{it.icon}</span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight text-foreground break-words">{it.label}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{it.desc}</p>
                        </div>
                      </>
                    );
                    const base =
                      "flex items-center gap-2.5 rounded-xl border border-border bg-card/70 px-3 py-2.5 shadow-2xs";
                    const linkClass = `${base} transition-all hover:border-primary hover:shadow-sm active:scale-[0.99]`;
                    if (product) {
                      return (
                        <Link
                          key={it.label}
                          to="/producto/$id"
                          params={{ id: String(product.id ?? product.nombre ?? "") }}
                          onClick={() =>
                            track("minimos_categoria_click", {
                              categoria: it.label,
                              producto: product.nombre,
                            })
                          }
                          className={linkClass}
                        >
                          {content}
                        </Link>
                      );
                    }
                    return target ? (
                      <Link
                        key={it.label}
                        to="/catalogo"
                        search={{ cat: target }}
                        onClick={() => track("minimos_categoria_click", { categoria: target })}
                        className={linkClass}
                      >
                        {content}
                      </Link>
                    ) : (
                      <div key={it.label} className={base}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        );
      })()}


      {/* NOSOTROS */}
      <section id="nosotros" className="relative overflow-hidden border-y border-border px-4 py-16 text-center sm:px-6">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-2xl">
          <SectionHead
            align="center"
            title={
              <>
                Importamos para que <span className="text-primary">vos revendas</span>
              </>
            }
            sub="Somos un equipo dedicado a traer productos importados de tecnología, bazar, perfumes y mucho más."
          />
          <a href="#contacto" className="btn-base grad-urgente group mt-1 inline-flex items-center gap-2 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
            Emprendé hoy
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>

          <ReviewsCarousel />
        </div>
      </section>

      <div className="bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent">
        <HowItWorks />
      </div>

      {/* CONTACTO */}
      <section id="contacto" className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-surface to-surface px-4 py-14 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute -top-16 right-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1180px]">
          <SectionHead
            title="Contactanos"
            sub="Escribinos por el formulario o directo por WhatsApp. Respondemos rápido."
          />
          <div className="grid items-start gap-8 lg:grid-cols-2">
            <ContactForm config={config} />
            <div className="card-soft flex flex-col gap-4 border-l-4 border-primary p-6 shadow-sm">
              {/* Si hay link al grupo, la tarjeta invita al grupo; si no, a escribir directo */}
              <h3 className="font-sans text-lg font-bold normal-case tracking-normal">
                {config["whatsapp_grupo"] ? "Grupo mayorista de WhatsApp" : "Escribinos por WhatsApp"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {config["whatsapp_grupo"]
                  ? "Sumate al grupo para recibir las listas de precios y las ofertas antes que nadie."
                  : "Consultanos precios, stock y envíos. Te respondemos rápido."}
              </p>
              {config["whatsapp_grupo"] && (
                <a
                  className="btn-base bg-whatsapp text-whatsapp-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  href={sanitizeUrl(config["whatsapp_grupo"])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Entrar al grupo
                </a>
              )}
              <a
                className={
                  config["whatsapp_grupo"]
                    ? "btn-base border border-primary/30 text-foreground transition-colors duration-200 hover:bg-primary/5"
                    : "btn-base bg-whatsapp text-whatsapp-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                }
                href={waLink(config)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {config["whatsapp_grupo"] ? "Escribirnos directo" : "Abrir WhatsApp"}
              </a>
              <div className="mt-1 space-y-2 text-sm text-muted-foreground">
                {config["whatsapp_individual"] && (
                  <p className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    {formatWhatsapp(config["whatsapp_individual"])}
                  </p>
                )}
                {config["email"] && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    {config["email"]}
                  </p>
                )}
                {config["instagram"] && (
                  <p className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-primary" />
                    {config["instagram"]}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter config={config} />
    </div>
  );
}

/** "5493418051515" → "+54 9 341 805 1515" (solo para mostrar; el link usa el número limpio). */
function formatWhatsapp(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  const m = digits.match(/^549(\d{3})(\d{3})(\d{4})$/);
  return m ? `+54 9 ${m[1]} ${m[2]} ${m[3]}` : raw;
}

function ContactForm({ config }: { config: SiteConfig }) {
  const [nombre, setNombre] = useState("");
  const [contacto, setContacto] = useState("");
  const [mensaje, setMensaje] = useState("");

  const phone = (config['whatsapp_individual'] ?? "").replace(/\D/g, "");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = encodeURIComponent(
      `Hola! Soy ${nombre}.\nContacto: ${contacto}\n${mensaje}`,
    );
    window.open(sanitizeUrl(`https://wa.me/${phone}?text=${text}`), "_blank", "noopener,noreferrer");
  };

  const inputClass =
    "rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15";

  return (
    <form className="card-soft flex flex-col gap-4 p-6 shadow-sm" onSubmit={onSubmit}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
          Nombre
        </span>
        <input
          className={inputClass}
          required
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
          Email o WhatsApp
        </span>
        <input
          className={inputClass}
          required
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
          Mensaje
        </span>
        <textarea
          className={`${inputClass} min-h-28`}
          required
          placeholder="Contanos qué estás buscando..."
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
        />
      </label>
      <button type="submit" className="btn-base grad-urgente text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
        Enviar mensaje
      </button>
    </form>
  );
}
