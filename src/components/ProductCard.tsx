import { Link } from "@tanstack/react-router";
import {
  FALLBACK_IMAGE,
  hasOffer,
  imageUrl,
  isWhatsappOnly,
  isYes,
  money,
  waLink,
} from "@/lib/store";
import type { Product, SiteConfig } from "@/lib/store";

export function ProductCard({ p, config }: { p: Product; config?: SiteConfig }) {
  const offer = hasOffer(p);
  const consultar = isWhatsappOnly(p);

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-[0_10px_30px_-18px_oklch(0_0_0/0.35)]">
      <Link
        to="/producto/$id"
        params={{ id: String(p.id ?? p.nombre ?? "") }}
        className="relative block aspect-square bg-surface"
      >
        {offer && !consultar && (
          <span className="absolute left-2 top-2 z-10 rounded-md bg-primary px-2 py-1 text-[10px] font-bold uppercase text-primary-foreground">
            Oferta
          </span>
        )}
        {isYes(p.destacado) && (
          <span className="absolute right-2 top-2 z-10 rounded-md border border-border bg-background px-2 py-1 text-[10px] font-bold text-foreground">
            Top
          </span>
        )}
        <img
          src={imageUrl(p.imagen_url) || FALLBACK_IMAGE}
          alt={p.nombre ?? "Producto"}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
          {p.categoria || "General"}
        </p>
        <Link
          to="/producto/$id"
          params={{ id: String(p.id ?? p.nombre ?? "") }}
          className="font-sans text-[15px] font-semibold normal-case leading-snug tracking-normal hover:text-primary"
        >
          {p.nombre}
        </Link>

        <div className="mt-auto pt-2">
          {consultar ? (
            <span className="text-sm font-semibold text-muted-foreground">Consultá el precio</span>
          ) : (
            <div className="flex items-baseline gap-2">
              <span className="tabular-nums text-lg font-bold text-foreground">
                {money(offer ? p.precio_oferta : p.precio)}
              </span>
              {offer && (
                <span className="tabular-nums text-xs text-muted-foreground line-through">
                  {money(p.precio)}
                </span>
              )}
            </div>
          )}
        </div>

        <Link
          to="/producto/$id"
          params={{ id: String(p.id ?? p.nombre ?? "") }}
          className="btn-base mt-2 w-full bg-foreground px-3 py-2.5 text-[11px] text-background"
        >
          Ver producto
        </Link>

        {consultar && (
          <a
            className="btn-base mt-2 w-full bg-whatsapp px-3 py-2.5 text-[11px] text-whatsapp-foreground"
            href={waLink(config ?? {}, p.nombre)}
            target="_blank"
            rel="noreferrer"
          >
            Consultar por WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
