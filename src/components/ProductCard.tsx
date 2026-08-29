import { Link } from "@tanstack/react-router";
import {
  FALLBACK_IMAGE,
  hasOffer,
  imageUrl,
  onImageError,
  isWhatsappOnly,
  waOnlyReasonOf,
  isYes,
  money,
  tiersOf,
  transferPrice,
  transferDiscountPct,
  toNumber,
  waLink,
} from "@/lib/store";
import type { Product, SiteConfig } from "@/lib/store";

export function ProductCard({ p, config }: { p: Product; config?: SiteConfig }) {
  const offer = hasOffer(p);
  const consultar = isWhatsappOnly(p);
  const waOnlyReason = waOnlyReasonOf(p as unknown as Record<string, unknown>);
  // Vapers no tienen precio — ocultar. Zapatillas/remeras sí tienen precio — mostrar.
  const hidePrice = waOnlyReason === "vapers";
  const tiers = tiersOf(p);
  const maxTier = tiers.length > 0 ? tiers[tiers.length - 1] : null;
  // El tercer tramo global (20+ u → 12%) aplica a TODOS los productos con precio.
  // maxPercent es 12 como mínimo universal; más si hay tiers propios por encima de 12%.
  const maxPercent = (!hidePrice && !consultar) ? Math.max(maxTier?.percent ?? 12, 12) : null;

  const basePrice = offer ? toNumber(p.precio_oferta) : toNumber(p.precio);
  const discPct = transferDiscountPct(config);
  const tPrice = transferPrice(basePrice, discPct);

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
          className="h-full w-full object-contain p-2"
          onError={onImageError(p.imagen_url)}
        />
      </Link>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[1px] text-muted-foreground">
          {p.categoria || "General"}
        </p>
        <Link
          to="/producto/$id"
          params={{ id: String(p.id ?? p.nombre ?? "") }}
          className="font-sans text-[15px] font-semibold normal-case leading-snug tracking-normal hover:text-primary line-clamp-2"
        >
          {p.nombre}
        </Link>

        <div className="mt-auto pt-2">
          {(hidePrice || consultar) ? (
            <span className="text-sm font-semibold text-muted-foreground">Consultá el precio</span>
          ) : (
            <div>
              <div className="flex flex-col">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span className="tabular-nums text-lg font-bold text-foreground">
                    {money(tPrice)}
                  </span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                    {discPct}% OFF Transf.
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  o <span className="font-semibold text-foreground/80">{money(basePrice)}</span> con tarjeta / MP
                </p>
              </div>

              {maxPercent !== null && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                  🎁 Hasta {maxPercent}% OFF x mayor
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
      </div>
    </div>
  );
}
