import { Link } from "@tanstack/react-router";
import { LayoutGrid, ShoppingCart } from "lucide-react";
import { waLink } from "@/lib/store";
import type { SiteConfig } from "@/lib/store";
import { useCart } from "@/lib/cart";
import { HeaderAuth } from "@/components/HeaderAuth";

export function SiteHeader({ config }: { config: SiteConfig }) {
  const cart = useCart();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-2 px-3 py-2.5 sm:px-6 sm:py-3">
        <Link
          to="/"
          aria-label="Ir al inicio"
          className="flex shrink-0 items-center min-w-0"
        >
          <img
            src="/businessicon-header.jpg"
            alt="Te Importamos"
            className="h-8 w-auto max-w-[150px] object-contain object-left xs:max-w-[170px] sm:h-10 sm:max-w-none"
          />
        </Link>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
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
            to="/catalogo"
            aria-label="Ver catálogo"
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground hover:border-primary hover:text-primary md:hidden"
          >
            <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
            <span>Catálogo</span>
          </Link>
          <HeaderAuth />
          <Link
            to="/carrito"
            aria-label="Carrito"
            className="relative rounded-full border border-border p-2 text-foreground hover:border-primary hover:text-primary sm:p-2.5"
          >
            <ShoppingCart className="h-4 w-4" />
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
      {config["instagram"] && <p className="mt-1">{config["instagram"]}</p>}
    </footer>
  );
}
