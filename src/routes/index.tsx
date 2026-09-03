import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, ArrowRight, MessageCircle, Mail, Instagram, Tag } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { HowItWorks, ReviewsCarousel } from "@/components/Social";
import { storeQueryOptions } from "@/lib/store-query";
import {
  FALLBACK_IMAGE, imageUrl, hasOffer,
  onImageError, isYes, money, toNumber, waLink, sanitizeUrl, type SiteConfig,
  parseCategoryRules, normCat, transferPrice, transferDiscountPct,
} from "@/lib/store";

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
      { property: "og:image", content: "https://teimportamosarg.com/businessicon.jpg" },
      { property: "og:image:secure_url", content: "https://teimportamosarg.com/businessicon.jpg" },
      { name: "twitter:image", content: "https://teimportamosarg.com/businessicon.jpg" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, banners, config } = data;

  const ofertasDelDia = products.filter((p) => hasOffer(p));

  // Más vendidos: toma hasta 3 productos con ventas reales esta semana (ordenados de mayor a menor).
  // Si hay menos de 3, rellena los cupos restantes con productos marcados como 'destacado' (sin repetir).
  // Si aún faltan, completa con los primeros productos del catálogo.
  const conVentas = [...products]
    .filter((p) => (p.ventas_semana ?? 0) > 0)
    .sort((a, b) => (b.ventas_semana ?? 0) - (a.ventas_semana ?? 0));

  const masVendidos: typeof products = [];
  const seenIds = new Set<string>();

  // 1. Agregar los que tienen ventas reales (hasta 3)
  for (const p of conVentas) {
    if (masVendidos.length >= 3) break;
    const id = String(p.id ?? p.nombre ?? "");
    if (!seenIds.has(id)) {
      seenIds.add(id);
      masVendidos.push(p);
    }
  }

  // 2. Rellenar con destacados si hay menos de 3
  if (masVendidos.length < 3) {
    const destacados = products.filter((p) => isYes(p.destacado));
    for (const p of destacados) {
      if (masVendidos.length >= 3) break;
      const id = String(p.id ?? p.nombre ?? "");
      if (!seenIds.has(id)) {
        seenIds.add(id);
        masVendidos.push(p);
      }
    }
  }

  // 3. Fallback con catálogo general si aún faltan
  if (masVendidos.length < 3) {
    for (const p of products) {
      if (masVendidos.length >= 3) break;
      const id = String(p.id ?? p.nombre ?? "");
      if (!seenIds.has(id)) {
        seenIds.add(id);
        masVendidos.push(p);
      }
    }
  }


  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-surface to-surface px-4 pt-10 pb-8 text-center sm:px-6 sm:pt-20 sm:pb-16">
        {/* Decorative color wash & difuminados suaves */}
        <div aria-hidden className="pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

        {/* Badge superior: oscuro/neutro, NO naranja */}
        <span className="relative mb-4 sm:mb-6 inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.06] px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-foreground/60">
          <Flame className="h-3 w-3 opacity-70" />
          Precios de Importador
        </span>

        {/* Título */}
        <h1 className="relative mx-auto max-w-4xl text-[clamp(40px,12vw,84px)] leading-[0.95]">
          Importamos
          <br />
          <span className="text-primary">para que revendas</span>
        </h1>

        {/* Línea horizontal divisoria tipo hr */}
        <hr className="relative mx-auto mt-5 sm:mt-7 w-28 sm:w-40 border-t border-border/70" />

        {/* Beneficios sin iconos, centrados con espacio */}
        <div className="relative mx-auto mt-4 sm:mt-5 flex items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm font-medium text-muted-foreground/90">
          <span>Envíos a todo el país</span>
          <span aria-hidden className="text-muted-foreground/40">•</span>
          <span>Productos originales</span>
        </div>

        {/* CTA — naranja exclusivo aquí, máxima jerarquía */}
        <div className="relative mt-6 sm:mt-8 flex flex-col items-center gap-2.5 sm:gap-3">
          <a
            href="/catalogo"
            className="btn-base grad-urgente inline-flex items-center justify-center gap-2 px-10 py-3.5 text-base font-black uppercase tracking-wide text-primary-foreground shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-95"
          >
            Ver Catálogo Mayorista
          </a>

          {/* Aviso mínimos — gris puro, sin ámbar */}
          <a
            href="#minimos"
            className="text-[11px] font-medium text-muted-foreground/80 transition-colors hover:text-muted-foreground active:scale-95"
          >
            Aplican mínimos de compra según categoría. <span className="font-bold">Ver ↓</span>
          </a>
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
              <div className="mb-3.5 flex items-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20">
                  Combos
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 to-transparent" />
              </div>

              <div className="relative -mx-4 sm:mx-0">
                <div
                  className={`no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-0 ${banners.length === 1 ? "justify-center" : ""
                    }`}
                >
                  {banners.map((b, i) => {
                    const basePrice = toNumber(b.precio);
                    const discPct = transferDiscountPct(config);
                    const tPrice = transferPrice(basePrice, discPct);

                    return (
                      <Link
                        key={i}
                        to="/combo/$index"
                        params={{ index: String(i) }}
                        className={`group relative flex flex-col snap-center overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/30 ${banners.length === 1
                            ? "w-full max-w-[440px]"
                            : "w-[85vw] max-w-[380px] sm:w-[360px] shrink-0"
                          }`}
                      >
                        {/* Contenedor de la foto adaptado a la imagen */}
                        <div className="relative aspect-square w-full overflow-hidden bg-surface flex items-center justify-center">
                          <img
                            src={imageUrl(b.imagen_url) || FALLBACK_IMAGE}
                            alt={b.titulo ?? ""}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            onError={onImageError(b.imagen_url)}
                          />
                        </div>

                        {/* Footer con título y precios bien legibles */}
                        <div className="flex flex-1 flex-col justify-between gap-2 border-t border-border bg-card p-3.5 sm:p-4">
                          <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
                            {b.titulo}
                          </h3>

                          {basePrice > 0 && (
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="tabular-nums text-base sm:text-lg font-bold text-primary">
                                  {money(tPrice)}
                                </span>
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                  {discPct}% OFF Transf.
                                </span>
                              </div>
                              <span className="text-[11px] text-muted-foreground">
                                o <span className="font-semibold text-foreground/80">{money(basePrice)}</span> con Mercado Pago
                              </span>
                            </div>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {/* Hint that there's more to scroll on wider screens when multiple banners exist */}
                {banners.length > 1 && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-background to-transparent sm:block" />
                )}
              </div>
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
                <div
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
                      <ProductCard p={p} config={config} />
                    </div>
                  ))}
                </div>
                {ofertasDelDia.length > 1 && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-background to-transparent sm:block" />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MÁS VENDIDOS */}
      <section id="mas-vendidos" className="relative overflow-hidden bg-gradient-to-b from-surface via-surface to-primary/5 px-4 py-14 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1180px]">
          <SectionHead title="Más vendidos" sub="Los tres productos que más salen esta semana." />

          {masVendidos.length > 0 && (
            <div className="relative -mx-4 sm:mx-0">
              <div
                className={`no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-0 ${masVendidos.length === 1 ? "justify-center" : ""
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
                    <ProductCard p={p} config={config} />
                  </div>
                ))}
              </div>
              {masVendidos.length > 1 && (
                <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-surface to-transparent sm:block" />
              )}
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <Link
              to="/catalogo"
              className="btn-base grad-urgente group inline-flex w-full items-center justify-center gap-2 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:px-12"
            >
              Ver más
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
          { key: "mates", label: "Mates", defaultDesc: "10 unidades", icon: "🧉" },
          { key: "suplementos", label: "Suplementación", defaultDesc: "$250.000", icon: "⚡" },
          { key: "zapatillas", label: "Zapatillas", defaultDesc: "3 unidades", icon: "👟" },
        ];

        const minItems: { label: string; desc: string; icon: string }[] = [];
        const seenKeys = new Set<string>();

        for (const cat of canonicalCategories) {
          const rule = catRules[cat.key];
          let desc = cat.defaultDesc;
          if (rule?.minUnits) {
            desc = `${rule.minUnits} unidades`;
          } else if (rule?.minAmount) {
            desc = `${money(rule.minAmount)}`;
          }
          minItems.push({ label: cat.label, desc, icon: cat.icon });
          seenKeys.add(cat.key);
        }

        // Agregar cualquier otra categoría que el admin configure con mínimo
        for (const [key, rule] of Object.entries(catRules)) {
          const norm = normCat(key);
          if (seenKeys.has(norm)) continue;
          if (norm === "perfumes" || norm === "perfume") continue;

          if (rule.minUnits) {
            seenKeys.add(norm);
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            minItems.push({ label, desc: `${rule.minUnits} unidades`, icon: "📦" });
          } else if (rule.minAmount) {
            seenKeys.add(norm);
            const label = key.charAt(0).toUpperCase() + key.slice(1);
            minItems.push({ label, desc: `${money(rule.minAmount)}`, icon: "💰" });
          }
        }

        if (minItems.length === 0) return null;

        return (
          <section id="minimos" className="px-4 py-10 sm:px-6">
            <div className="mx-auto max-w-[1180px]">
              <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/5 via-amber-500/[0.03] to-transparent p-5 sm:p-7">
                <div className="mb-4">
                  <h2 className="font-sans text-base sm:text-lg font-bold tracking-tight">Mínimos de compra por categoría</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Para ciertas categorías aplicamos un mínimo de compra. Podés combinar productos de la misma categoría para llegar al mínimo.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
                  {minItems.map((it) => (
                    <div key={it.label} className="flex items-center gap-2.5 rounded-xl border border-border bg-card/70 px-3 py-2.5 shadow-2xs">
                      <span className="text-xl shrink-0">{it.icon}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-foreground">{it.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{it.desc}</p>
                      </div>
                    </div>
                  ))}
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
          <h2 className="font-sans text-[clamp(24px,6vw,38px)] font-semibold uppercase tracking-tight text-foreground/90">
            Importamos para que vos revendas
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground sm:text-base">
            Somos un equipo dedicado a traer productos importados de tecnología, bazar,
            perfumes y mucho más
          </p>
          <a href="#contacto" className="btn-base grad-urgente group mt-8 inline-flex items-center gap-2 text-primary-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg">
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
          <div className="grid gap-8 lg:grid-cols-2">
            <ContactForm config={config} />
            <div className="card-soft flex flex-col gap-4 border-l-4 border-primary p-6 shadow-sm">
              <h3 className="font-sans text-lg font-bold normal-case tracking-normal">
                Grupo mayorista de WhatsApp
              </h3>
              <p className="text-sm text-muted-foreground">
                Sumate al grupo para recibir las listas de precios y las ofertas antes que nadie.
              </p>
              {config['whatsapp_grupo'] && (
                <a
                  className="btn-base bg-whatsapp text-whatsapp-foreground transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                  href={sanitizeUrl(config['whatsapp_grupo'])}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Entrar al grupo
                </a>
              )}
              <a
                className="btn-base border border-primary/30 text-foreground transition-colors duration-200 hover:bg-primary/5"
                href={waLink(config)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Escribirnos directo
              </a>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                {config['whatsapp_individual'] && (
                  <p className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-primary" />
                    +{config['whatsapp_individual']}
                  </p>
                )}
                {config['email'] && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    {config['email']}
                  </p>
                )}
                {config['instagram'] && (
                  <p className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-primary" />
                    {config['instagram']}
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

function SectionHead({ title, sub, icon }: { title: React.ReactNode; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="mb-7">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-1 w-10 rounded-full bg-primary" />
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <h2 className="text-[clamp(24px,7vw,40px)]">{title}</h2>
      {sub && <p className="mt-2 max-w-md text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
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
