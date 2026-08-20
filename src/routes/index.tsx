import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Flame, Truck, ShieldCheck, Percent, ArrowRight, MessageCircle, Mail, Instagram } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { HowItWorks, ReviewsCarousel } from "@/components/Social";
import { storeQueryOptions } from "@/lib/store-query";
import {
  FALLBACK_IMAGE, imageUrl,
  onImageError, isYes, money, toNumber, waLink, type SiteConfig
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
          "Importamos de todo para que revendas: tecnología, bazar e indumentaria con precio de importador. Comprá online con envíos a todo el país.",
      },
      { property: "og:title", content: "Te importamos — Precio de importador" },
      {
        property: "og:description",
        content:
          "Ofertas del día en productos importados originales. Comprá online, ideal para revender.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, banners, config } = data;

  const ofertasDelDia = products.filter((p) => isYes(p.oferta)).slice(0, 3);
  const top = products.filter((p) => isYes(p.destacado));
  const masVendidos = (top.length ? top : products).slice(0, 3);


  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/[0.07] via-surface to-surface px-4 py-16 text-center sm:px-6 sm:py-24">
        {/* decorative color wash — reemplaza el fondo plano */}
        <div aria-hidden className="pointer-events-none absolute -top-28 -left-20 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />

        <span className="relative mb-5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary ring-1 ring-primary/20">
          <Flame className="h-3.5 w-3.5" />
          Precio de importador, todos los días
        </span>

        <h1 className="relative mx-auto max-w-4xl text-[clamp(40px,12vw,84px)] leading-[0.95]">
          Importamos de todo
          <br />
          <span className="text-primary">para que revendas</span>
        </h1>

        <div className="relative mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Truck className="h-4 w-4 text-primary" />
            Envíos a todo el país
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Productos originales
          </span>
          <span className="inline-flex items-center gap-2">
            <Percent className="h-4 w-4 text-primary" />
            Precio de importador
          </span>
        </div>
      </section>

      {/* OFERTAS DEL DÍA */}
      <section id="ofertas" className="relative overflow-hidden px-4 py-14 sm:px-6">
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
            <div className="relative -mx-4 mb-6 sm:mx-0">
              <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:px-0">
                {banners.map((b, i) => (
                  <Link
                    key={i}
                    to="/combo/$index"
                    params={{ index: String(i) }}
                    className="group relative min-w-[280px] snap-start overflow-hidden rounded-xl border border-primary/15 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/30 sm:min-w-[420px]"
                    style={{ aspectRatio: "16 / 10" }}
                  >
                    <img
                      src={imageUrl(b.imagen_url) || FALLBACK_IMAGE}
                      alt={b.titulo ?? ""}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={onImageError(b.imagen_url)}
                    />
                    <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4">
                      <span className="mb-2 inline-flex w-fit items-center gap-1 self-start rounded-full grad-urgente px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                        <Flame className="h-3 w-3" />
                        Combo en oferta
                      </span>
                      <h3 className="text-lg font-bold text-white sm:text-xl">{b.titulo}</h3>
                      {toNumber(b.precio) > 0 && (
                        <p className="tabular-nums mt-1.5 w-fit rounded-md bg-white px-2 py-0.5 text-base font-bold text-foreground">
                          {money(b.precio)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {/* Hint that there's more to scroll on wider screens where cards don't peek off-edge */}
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-background to-transparent sm:block" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {ofertasDelDia.map((p, i) => (
              <div key={p.id ?? i} className={i === 2 ? "col-span-2 lg:col-span-1" : undefined}>
                <ProductCard p={p} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MÁS VENDIDOS */}
      <section id="mas-vendidos" className="relative overflow-hidden bg-gradient-to-b from-surface via-surface to-primary/5 px-4 py-14 sm:px-6">
        <div aria-hidden className="pointer-events-none absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative mx-auto max-w-[1180px]">
          <SectionHead title="Más vendidos" sub="Los tres productos que más salen esta semana." />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {masVendidos.map((p, i) => (
              <div key={p.id ?? i} className={i === 2 ? "col-span-2 lg:col-span-1" : undefined}>
                <ProductCard p={p} />
              </div>
            ))}
          </div>
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
            indumentaria y mucho más
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
                  href={config['whatsapp_grupo']}
                  target="_blank"
                  rel="noreferrer"
                >
                  Entrar al grupo
                </a>
              )}
              <a
                className="btn-base border border-primary/30 text-foreground transition-colors duration-200 hover:bg-primary/5"
                href={waLink(config)}
                target="_blank"
                rel="noreferrer"
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

function SectionHead({ title, sub }: { title: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-7">
      <div className="mb-3 h-1 w-10 rounded-full bg-primary" />
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
    window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
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
