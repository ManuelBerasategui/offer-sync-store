import { Link } from "@tanstack/react-router";
import { FALLBACK_IMAGE, hasOffer, imageUrl, isYes, money } from "@/lib/store";
import type { Product } from "@/lib/store";

export function ProductCard({ p }: { p: Product; config?: unknown }) {
  const offer = hasOffer(p);

  return (
    <Link
      to="/producto/$id"
      params={{ id: String(p.id ?? "") }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-[0_10px_30px_-18px_oklch(0_0_0/0.35)]"
    >
      <div className="relative aspect-square bg-surface">
        {offer && (
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
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
          {p.categoria || "General"}
        </p>
        <h3 className="font-sans text-[15px] font-semibold normal-case leading-snug tracking-normal">
          {p.nombre}
        </h3>
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="font-mono text-lg font-bold text-foreground">
            {money(offer ? p.precio_oferta : p.precio)}
          </span>
          {offer && (
            <span className="font-mono text-xs text-muted-foreground line-through">
              {money(p.precio)}
            </span>
          )}
        </div>
        <span className="btn-base mt-2 w-full bg-foreground px-3 py-2.5 text-[11px] text-background">
          Ver producto
        </span>
      </div>
    </Link>
  );
}
