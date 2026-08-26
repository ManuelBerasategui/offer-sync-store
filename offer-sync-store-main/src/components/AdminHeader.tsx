import { Link } from "@tanstack/react-router";
import { Package, ShoppingBag, Settings, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

interface AdminHeaderProps {
  title: string;
  subtitle?: string;
  currentRoute: "productos" | "ordenes" | "configuracion";
  actions?: ReactNode;
}

export function AdminHeader({ title, subtitle, currentRoute, actions }: AdminHeaderProps) {
  const tabs = [
    {
      id: "productos",
      label: "Productos y Ofertas",
      mobileLabel: "Productos",
      href: "/admin/productos" as const,
      icon: Package,
    },
    {
      id: "ordenes",
      label: "Órdenes Pagadas",
      mobileLabel: "Órdenes",
      href: "/admin/ordenes" as const,
      icon: ShoppingBag,
    },
    {
      id: "configuracion",
      label: "Configuración",
      mobileLabel: "Config.",
      href: "/admin/configuracion" as const,
      icon: Settings,
    },
  ];

  return (
    <header className="mb-6 space-y-4 sm:mb-8">
      {/* Fila Superior: Volver a la tienda + Badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Volver a la tienda</span>
        </Link>
        <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-primary border border-primary/20">
          ⚙️ Panel Admin
        </span>
      </div>

      {/* Título y Acciones Principales */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Navegación por Pestañas Responsiva */}
      <nav className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1 shadow-xs no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentRoute === tab.id;
          return (
            <Link
              key={tab.id}
              to={tab.href}
              className={`flex flex-1 min-w-[90px] sm:min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold transition-all sm:px-4 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
