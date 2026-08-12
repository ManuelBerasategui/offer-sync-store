import { Link } from "@tanstack/react-router";
import { waLink } from "@/lib/store";
import type { SiteConfig } from "@/lib/store";
import { useCart } from "@/lib/cart";

export function SiteHeader({ config }: { config: SiteConfig }) {
  const cart = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
        <Link to="/" className="min-w-0 font-display text-[21px] normal-case tracking-normal">
          <span className="text-foreground">Te</span>
          <span className="text-primary">importamos</span>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
          <nav className="mr-1 hidden items-center gap-6 text-sm font-semibold md:flex">
            <Link to="/" hash="ofertas" className="text-muted-foreground hover:text-primary">
              Ofertas
            </Link>
            <Link to="/catalogo" className="text-muted-foreground hover:text-primary">
              Catálogo
            </Link>
            <Link to="/" hash="nosotros" className="text-muted-foreground hover:text-primary">
              Nosotros
            </Link>
            <Link to="/" hash="contacto" className="text-muted-foreground hover:text-primary">
              Contacto
            </Link>
          </nav>
          <Link
            to="/carrito"
            className="relative rounded-full border border-border px-3 py-2 text-xs font-bold uppercase text-foreground hover:border-primary hover:text-primary"
          >
            Carrito
            {cart.count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {cart.count}
              </span>
            )}
          </Link>
          <a
            className="btn-base hidden bg-whatsapp px-4 py-2.5 text-xs text-whatsapp-foreground sm:inline-flex"
            href={waLink(config)}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter({ config }: { config: SiteConfig }) {
  return (
    <footer className="border-t border-border bg-surface px-4 py-10 text-center text-[13px] text-muted-foreground">
      <p className="mb-1 font-display text-base text-foreground">Te importamos</p>
      <p>Productos importados · Envíos a todo el país</p>
      {config['instagram'] && <p className="mt-1">{config['instagram']}</p>}
    </footer>
  );
}
