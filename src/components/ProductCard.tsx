import { FALLBACK_IMAGE, hasOffer, imageUrl, isYes, money, waLink } from "@/lib/store";
import type { Product, SiteConfig } from "@/lib/store";

export function ProductCard({ p, config }: { p: Product; config: SiteConfig }) {
  const offer = hasOffer(p);

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary">
      <div className="relative aspect-square bg-background">
        {offer && (
          <span className="grad-urgente absolute left-2 top-2 z-10 rounded-md px-2 py-1 text-[10px] font-extrabold uppercase text-primary-foreground">
            Oferta
          </span>
        )}
        {isYes(p.destacado) && (
          <span className="absolute right-2 top-2 z-10 rounded-md border border-amber bg-background px-2 py-1 text-[10px] font-extrabold text-amber">
            ★ Top
          </span>
        )}
        <img
          src={imageUrl(p.imagen_url) || FALLBACK_IMAGE}
          alt={p.nombre ?? "Producto"}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <p className="text-[10px] font-bold uppercase tracking-[1px] text-muted-foreground">
          {p.categoria || "General"}
        </p>
        <h3 className="font-sans text-[15px] font-bold normal-case leading-snug tracking-normal">
          {p.nombre}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-mono text-lg font-bold text-primary">
            {money(offer ? p.precio_oferta : p.precio)}
          </span>
          {offer && (
            <span className="font-mono text-xs text-muted-foreground line-through">
              {money(p.precio)}
            </span>
          )}
        </div>
        <a
          className="btn-base mt-2 w-full bg-whatsapp px-3 py-2.5 text-[11px] text-whatsapp-foreground active:scale-[0.98]"
          href={waLink(config, p.nombre)}
          target="_blank"
          rel="noreferrer"
        >
          Consultar por WhatsApp
        </a>
      </div>
    </article>
  );
}
