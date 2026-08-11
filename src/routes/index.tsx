import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Countdown } from "@/components/Countdown";
import { ProductCard } from "@/components/ProductCard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import {
  FALLBACK_IMAGE,
  imageUrl,
  isYes,
  waLink,
  type SiteConfig,
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
          "Ofertas del día y los más vendidos en tecnología, bazar e indumentaria importada. Precio de importador, envíos a todo el país.",
      },
      { property: "og:title", content: "Te importamos — Precio de importador" },
      {
        property: "og:description",
        content:
          "Ofertas del día en productos importados originales. Ideal para revender. Envíos a todo el país.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, banners, config } = data;

  const offers = products.filter((p) => isYes(p.oferta));
  const ofertasDelDia = (offers.length ? offers : products).slice(0, 3);
  const top = products.filter((p) => isYes(p.destacado));
  const masVendidos = (top.length ? top : products).slice(0, 3);
  const heroImg =
    imageUrl(ofertasDelDia[0]?.imagen_url) ||
    "https://images.unsplash.com/photo-1607082349566-187342175e2f?q=80&w=800";

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      {/* HERO */}
      <section className="border-b border-border px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto grid max-w-[1180px] items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-muted-foreground">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
              Ofertas terminan en <Countdown offerEnd={config['oferta_fin']} />
            </div>
            <h1 className="text-[clamp(38px,10vw,68px)]">
              Stock limitado.
              <br />
              <span className="text-grad">Precio de importador.</span>
            </h1>
            <p className="mt-4 max-w-lg text-[15px] text-muted-foreground sm:text-base">
              Productos importados originales para revender o para vos. Renovamos ofertas todos
              los días: el que llega primero, se lo lleva.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#ofertas" className="btn-base grad-urgente text-primary-foreground">
                Ver ofertas del día ↓
              </a>
              <Link
                to="/catalogo"
                className="btn-base border border-border text-foreground hover:border-primary hover:text-primary"
              >
                Ver catálogo
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px] font-semibold text-muted-foreground">
              <span>✅ Productos originales</span>
              <span>🚚 Envíos a todo el país</span>
              <span>🔁 Ideal para revender</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[420px]">
            <img
              src={heroImg}
              alt="Producto destacado importado"
              className="aspect-square w-full rounded-2xl border border-border object-cover"
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
            <div className="absolute -bottom-4 left-2 rounded-xl border border-border bg-card px-4 py-3 text-[13px] font-extrabold leading-tight">
              <span className="font-display text-xl text-primary">{offers.length}</span> productos
              <br />
              en oferta hoy
            </div>
          </div>
        </div>
      </section>

      {/* OFERTAS DEL DÍA — 3 bloques */}
      <section id="ofertas" className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <SectionHead
            eyebrow="Se renueva cada día"
            title="Ofertas del día"
            sub="Cargalas desde tu planilla de Google Sheets: se actualizan solas acá."
          />

          {banners.length > 0 && (
            <div className="no-scrollbar -mx-4 mb-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {banners.map((b, i) => (
                <a
                  key={i}
                  href={b.link || "/catalogo"}
                  className="relative min-w-[280px] snap-start overflow-hidden rounded-lg border border-border bg-card sm:min-w-[360px]"
                  style={{ aspectRatio: "16 / 10" }}
                >
                  <img
                    src={imageUrl(b.imagen_url) || FALLBACK_IMAGE}
                    alt={b.titulo ?? ""}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/20 to-transparent p-4">
                    <span className="grad-urgente mb-2 self-start rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase text-primary-foreground">
                      Oferta del día
                    </span>
                    <h3 className="text-lg">{b.titulo}</h3>
                    <p className="text-[13px] text-muted-foreground">{b.subtitulo}</p>
                  </div>
                </a>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {ofertasDelDia.map((p, i) => (
              <div key={p.id ?? i} className={i === 2 ? "col-span-2 lg:col-span-1" : undefined}>
                <ProductCard p={p} config={config} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MÁS VENDIDOS — 3 bloques + VER MÁS */}
      <section id="mas-vendidos" className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <SectionHead
            eyebrow="Lo que más se lleva la gente"
            title="Más vendidos"
            sub="Los tres productos que más salen esta semana."
          />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {masVendidos.map((p, i) => (
              <div key={p.id ?? i} className={i === 2 ? "col-span-2 lg:col-span-1" : undefined}>
                <ProductCard p={p} config={config} />
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Link to="/catalogo" className="btn-base grad-urgente w-full text-primary-foreground sm:w-auto sm:px-12">
              Ver más
            </Link>
          </div>
        </div>
      </section>

      {/* NOSOTROS */}
      <section
        id="nosotros"
        className="border-y border-border bg-surface px-4 py-16 text-center sm:px-6"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="font-sans text-[clamp(26px,6vw,40px)] font-semibold uppercase tracking-tight text-foreground/95">
            Importamos para que vos revendas
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground sm:text-base">
            Somos un equipo dedicado a traer productos importados de tecnología, bazar,
            indumentaria y mucho más
          </p>
          <a href="#contacto" className="btn-base grad-urgente mt-8 text-primary-foreground">
            Emprendé hoy
          </a>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <SectionHead
            eyebrow="Hablemos"
            title="Contactanos"
            sub="Escribinos por el formulario o directo por WhatsApp. Respondemos rápido."
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <ContactForm config={config} />
            <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6">
              <h3 className="font-sans text-lg font-extrabold normal-case tracking-normal">
                📦 Grupo mayorista de WhatsApp
              </h3>
              <p className="text-sm text-muted-foreground">
                Sumate al grupo para recibir las listas de precios y las ofertas antes que nadie.
              </p>
              {config['whatsapp_grupo'] && (
                <a
                  className="btn-base bg-whatsapp text-whatsapp-foreground"
                  href={config['whatsapp_grupo']}
                  target="_blank"
                  rel="noreferrer"
                >
                  Entrar al grupo
                </a>
              )}
              <a
                className="btn-base border border-border text-foreground"
                href={waLink(config)}
                target="_blank"
                rel="noreferrer"
              >
                Escribirnos directo
              </a>
              <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                {config['whatsapp_individual'] && <p>WhatsApp: +{config['whatsapp_individual']}</p>}
                {config['email'] && <p>Email: {config['email']}</p>}
                {config['instagram'] && <p>Instagram: {config['instagram']}</p>}
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter config={config} />
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-7">
      <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-amber">
        <span className="grad-urgente h-0.5 w-4 rounded" />
        {eyebrow}
      </p>
      <h2 className="text-[clamp(26px,7vw,42px)]">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{sub}</p>
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
    "rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary";

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
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
      <button type="submit" className="btn-base grad-urgente text-primary-foreground">
        Enviar mensaje
      </button>
    </form>
  );
}
