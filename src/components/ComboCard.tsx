import { Link } from "@tanstack/react-router";

import {
  FALLBACK_IMAGE,
  thumbnailUrl,
  onImageError,
  money,
  toNumber,
  transferPrice,
  transferDiscountPct,
  type Banner,
  type SiteConfig,
} from "@/lib/store";

/** Tarjeta de combo (banner). `index` es la posición en `banners` y arma el link a /combo/$index. */
export function ComboCard({
  banner: b,
  index,
  config,
  className = "",
}: {
  banner: Banner;
  index: number;
  config: SiteConfig;
  className?: string;
}) {
  const basePrice = toNumber(b.precio);
  const discPct = transferDiscountPct(config);
  const tPrice = transferPrice(basePrice, discPct);

  return (
    <Link
      to="/combo/$index"
      params={{ index: String(index) }}
      className={`group/card relative flex flex-col overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-2 hover:ring-primary/30 ${className}`}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface flex items-center justify-center">
        <img
          src={thumbnailUrl(b.imagen_url, "md") || FALLBACK_IMAGE}
          alt={b.titulo ?? ""}
          width={380}
          height={380}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover transition-transform duration-300 group-hover/card:scale-105"
          onError={onImageError(b.imagen_url)}
        />
        {Array.isArray(b.quantity_tiers) && b.quantity_tiers.length > 0 && (
          <span className="absolute bottom-2 left-2 rounded-md bg-background/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-primary border border-primary/30 shadow-xs">
            🎁 Descuento x cantidad
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 border-t border-border bg-card p-3.5 sm:p-4">
        <h3 className="font-bold text-sm sm:text-base text-foreground leading-snug group-hover/card:text-primary transition-colors line-clamp-1">
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
}
