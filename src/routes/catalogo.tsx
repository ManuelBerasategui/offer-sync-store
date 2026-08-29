import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search, ArrowDownUp, Flame, Star, X, Loader2 } from "lucide-react";

import { ProductCard } from "@/components/ProductCard";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { storeQueryOptions } from "@/lib/store-query";
import { categoriesOf, isYes, priceOf } from "@/lib/store";

type Sort = "destacado" | "precio_asc" | "precio_desc" | "nombre";

export const Route = createFileRoute("/catalogo")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Catálogo completo — Te importamos" },
      {
        name: "description",
        content:
          "Buscá y filtrá todo el catálogo de productos importados: tecnología, bazar, indumentaria y más. Ordená por precio o por más vendidos.",
      },
      { property: "og:title", content: "Catálogo completo — Te importamos" },
      {
        property: "og:description",
        content:
          "Todo el stock de productos importados con búsqueda, filtros por categoría y orden por precio.",
      },
    ],
  }),
  component: Catalogo,
});

function Catalogo() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const { products, config } = data;

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("todas");
  const [sort, setSort] = useState<Sort>("destacado");
  const [onlyTop, setOnlyTop] = useState(false);
  const [onlyOffers, setOnlyOffers] = useState(false);

  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Resetear cantidad visible al cambiar cualquier filtro
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, cat, sort, onlyTop, onlyOffers]);

  const cats = useMemo(() => {
    const all = categoriesOf(products);
    // Categorías que queremos ver primero (en este orden)
    const PINNED_FIRST = ["Bazar", "Zapatillas", "Tecnología"];
    // Categorías que queremos ver al final
    const PINNED_LAST = ["Vapers"];
    const pinned = PINNED_FIRST.filter((c) => all.includes(c));
    const last = PINNED_LAST.filter((c) => all.includes(c));
    const rest = all.filter((c) => !PINNED_FIRST.includes(c) && !PINNED_LAST.includes(c));
    return [...pinned, ...rest, ...last];
  }, [products]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (cat !== "todas" && (p.categoria ?? "").trim() !== cat) return false;
      if (q && !(p.nombre ?? "").toLowerCase().includes(q)) return false;
      if (onlyTop && (p.ventas_semana ?? 0) <= 0 && !isYes(p.destacado)) return false;
      if (onlyOffers && !isYes(p.oferta)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "precio_asc") return priceOf(a) - priceOf(b);
      if (sort === "precio_desc") return priceOf(b) - priceOf(a);
      if (sort === "nombre") return (a.nombre ?? "").localeCompare(b.nombre ?? "");
      // "destacado": ordena por ventas semanales reales, luego por flag destacado como desempate
      const ventasB = (b.ventas_semana ?? 0) - (a.ventas_semana ?? 0);
      if (ventasB !== 0) return ventasB;
      return (isYes(b.destacado) ? 1 : 0) - (isYes(a.destacado) ? 1 : 0);
    });
  }, [products, search, cat, sort, onlyTop, onlyOffers]);

  const visibleProducts = useMemo(() => {
    return list.slice(0, visibleCount);
  }, [list, visibleCount]);

  const hasMore = visibleCount < list.length;

  // IntersectionObserver para carga infinita suave
  useEffect(() => {
    if (!hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && !isLoadingMore) {
          setIsLoadingMore(true);
          // Breve delay para renderizado suave y feedback visual
          setTimeout(() => {
            setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, list.length));
            setIsLoadingMore(false);
          }, 150);
        }
      },
      {
        rootMargin: "350px 0px", // Detectar antes de llegar al último elemento
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, list.length]);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3 py-1 text-xs font-semibold sm:px-3.5 sm:py-1.5 sm:text-xs transition-all whitespace-nowrap inline-flex items-center gap-1 ${
      active
        ? "border-primary bg-primary text-primary-foreground shadow-xs font-bold"
        : "border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-border"
    }`;

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-3.5 py-5 sm:px-6 sm:py-8">
        <div className="mb-3">
          <p className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[2px] text-amber">
            <span className="grad-urgente h-0.5 w-3.5 rounded" />
            Todo el stock
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">Catálogo completo</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            Buscá, filtrá por categoría y ordená por precio o más vendidos.
          </p>
        </div>

        {/* Panel compacto de búsqueda y filtros sticky */}
        <div className="sticky top-[57px] z-30 -mx-3.5 mb-3 bg-background/95 px-3.5 py-2 backdrop-blur-md border-b border-border/40 shadow-xs sm:mx-0 sm:px-0 sm:border-0 sm:shadow-none">
          <div className="space-y-2">
            {/* Fila 1: Búsqueda + Selector de orden en una sola línea */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar producto..."
                  className="h-8.5 sm:h-9.5 w-full rounded-lg border border-input bg-card pl-8 pr-7 text-xs sm:text-sm outline-none focus:border-primary transition-colors"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="relative shrink-0">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="h-8.5 sm:h-9.5 rounded-lg border border-input bg-card pl-2.5 pr-6 text-[11px] sm:text-xs font-semibold outline-none focus:border-primary appearance-none cursor-pointer"
                >
                  <option value="destacado">⭐ Más vendidos</option>
                  <option value="precio_asc">💵 Menor precio</option>
                  <option value="precio_desc">💰 Mayor precio</option>
                  <option value="nombre">🔤 Nombre A-Z</option>
                </select>
                <ArrowDownUp className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            {/* Fila 2: Chips de categorías y filtros en una sola línea con scroll horizontal suave */}
            <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-0.5 -mx-3.5 px-3.5 sm:mx-0 sm:px-0 sm:flex-wrap">
              <button className={chip(cat === "todas" && !onlyOffers && !onlyTop)} onClick={() => { setCat("todas"); setOnlyOffers(false); setOnlyTop(false); }}>
                Todas
              </button>
              <button className={chip(onlyOffers)} onClick={() => setOnlyOffers((v) => !v)}>
                <Flame className={`h-3 w-3 ${onlyOffers ? "text-primary-foreground" : "text-red-500"}`} />
                Ofertas
              </button>
              <button className={chip(onlyTop)} onClick={() => setOnlyTop((v) => !v)}>
                <Star className={`h-3 w-3 ${onlyTop ? "text-primary-foreground" : "text-amber-500"}`} />
                Más vendidos
              </button>
              {cats.map((c) => (
                <button key={c} className={chip(cat === c)} onClick={() => setCat(c)}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
          <span>
            {list.length ? `Mostrando ${visibleProducts.length} de ${list.length} ${list.length === 1 ? "producto" : "productos"}` : "0 productos"}
          </span>
        </div>

        {list.length ? (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
              {visibleProducts.map((p, i) => (
                <ProductCard key={p.id ?? i} p={p} config={config} />
              ))}
            </div>

            {/* Sentinel para IntersectionObserver */}
            {hasMore && <div ref={sentinelRef} className="h-6 w-full" />}

            {/* Indicador de carga */}
            {isLoadingMore && (
              <div className="my-8 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-xs font-medium text-muted-foreground">Cargando más productos...</p>
              </div>
            )}

            {/* Mensaje de fin de catálogo */}
            {!hasMore && list.length > PAGE_SIZE && (
              <div className="mt-10 flex items-center justify-center gap-3 text-xs font-semibold text-muted-foreground/60">
                <span className="h-px w-12 bg-border/60" />
                <span>Fin del catálogo</span>
                <span className="h-px w-12 bg-border/60" />
              </div>
            )}
          </>
        ) : (
          <div className="py-16 text-center text-sm text-muted-foreground">
            No encontramos productos con esos filtros. Probá otra búsqueda o cambiá de categoría.
          </div>
        )}

        <div className="mt-10 flex justify-center">
          <Link to="/" className="btn-base border border-border text-foreground">
            ← Volver al inicio
          </Link>
        </div>
      </main>

      <SiteFooter config={config} />
    </div>
  );
}
