import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { HowItWorks, ReviewsCarousel } from "@/components/Social";
import { storeQueryOptions } from "@/lib/store-query";
import { FALLBACK_IMAGE, imageUrl, isYes, money, toNumber, waLink, type SiteConfig } from "@/lib/store";

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
      <section className="border-b border-border bg-surface px-4 py-16 text-center sm:px-6 sm:py-24">
        <h1 className="mx-auto max-w-4xl text-[clamp(40px,12vw,84px)] leading-[0.95]">
          Importamos de todo
          <br />
          <span className="text-primary">para que revendas</span>
        </h1>
      </section>

      {/* OFERTAS DEL DÍA */}
      <section id="ofertas" className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <SectionHead title="Ofertas del día" />

          {banners.length > 0 && (
            <div className="no-scrollbar -mx-4 mb-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              {banners.map((b, i) => (
                <Link
                  key={i}
                  to="/combo/$index"
                  params={{ index: String(i) }}
                  className="relative min-w-[280px] snap-start overflow-hidden rounded-xl border border-border bg-card sm:min-w-[420px]"
                  style={{ aspectRatio: "16 / 10" }}
                >
                  <img
                    src={imageUrl(b.imagen_url) || FALLBACK_IMAGE}
                    alt={b.titulo ?? ""}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/25 to-transparent p-4">
                    <span className="mb-2 self-start rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase text-primary-foreground">
                      Combo en oferta
                    </span>
                    <h3 className="text-lg text-white">{b.titulo}</h3>
                    {toNumber(b.precio) > 0 && (
                      <p className="font-mono text-base font-bold text-white">
                        {money(b.precio)}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
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
      <section id="mas-vendidos" className="bg-surface px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
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
              className="btn-base grad-urgente w-full text-primary-foreground sm:w-auto sm:px-12"
            >
              Ver más
            </Link>
          </div>
        </div>
      </section>

      {/* NOSOTROS */}
      <section id="nosotros" className="border-y border-border px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-sans text-[clamp(24px,6vw,38px)] font-semibold uppercase tracking-tight text-foreground/90">
            Importamos para que vos revendas
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[15px] text-muted-foreground sm:text-base">
            Somos un equipo dedicado a traer productos importados de tecnología, bazar,
            indumentaria y mucho más
          </p>
          <a href="#contacto" className="btn-base grad-urgente mt-8 text-primary-foreground">
            Emprendé hoy
          </a>

          <ReviewsCarousel />
        </div>
      </section>

      <HowItWorks />

      {/* CONTACTO */}
      <section id="contacto" className="bg-surface px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-[1180px]">
          <SectionHead
            title="Contactanos"
            sub="Escribinos por el formulario o directo por WhatsApp. Respondemos rápido."
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <ContactForm config={config} />
            <div className="card-soft flex flex-col gap-4 p-6">
              <h3 className="font-sans text-lg font-bold normal-case tracking-normal">
                Grupo mayorista de WhatsApp
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

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-7">
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
