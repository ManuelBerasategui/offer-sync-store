import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

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

  const PAGE_SIZE = 24;
  const [page, setPage] = useState(1);

  // Resetear página al cambiar cualquier filtro
  useEffect(() => { setPage(1); }, [search, cat, sort, onlyTop, onlyOffers]);

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

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const paginated = list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-[13px] font-bold transition-colors ${
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="min-h-screen">
      <SiteHeader config={config} />

      <main className="mx-auto max-w-[1180px] px-4 py-10 sm:px-6">
        <p className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[2px] text-amber">
          <span className="grad-urgente h-0.5 w-4 rounded" />
          Todo el stock
        </p>
        <h1 className="text-[clamp(28px,8vw,46px)]">Catálogo completo</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Buscá, filtrá por categoría y ordená por precio o por más vendidos.
        </p>

        <div className="sticky top-[57px] z-30 -mx-4 mt-6 space-y-3 bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-lg border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />

          <div className="no-scrollbar -mx-4 grid grid-rows-2 grid-flow-col auto-cols-max gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex sm:flex-wrap sm:overflow-visible sm:px-0">
            <button className={chip(cat === "todas")} onClick={() => setCat("todas")}>
              Todas
            </button>
            {cats.map((c) => (
              <button key={c} className={chip(cat === c)} onClick={() => setCat(c)}>
                {c}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button className={chip(onlyTop)} onClick={() => setOnlyTop((v) => !v)}>
              ★ Más vendidos
            </button>
            <button className={chip(onlyOffers)} onClick={() => setOnlyOffers((v) => !v)}>
              % Ofertas
            </button>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="ml-auto rounded-lg border border-input bg-card px-3 py-2.5 text-[13px] font-semibold outline-none focus:border-primary"
            >
              <option value="destacado">Más vendidos primero</option>
              <option value="precio_asc">Precio: menor a mayor</option>
              <option value="precio_desc">Precio: mayor a menor</option>
              <option value="nombre">Nombre A-Z</option>
            </select>
          </div>
        </div>

        <p className="mb-4 mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {list.length} producto{list.length === 1 ? "" : "s"}
          {totalPages > 1 && (
            <span className="ml-2 font-normal text-muted-foreground/70">
              — Página {page} de {totalPages}
            </span>
          )}
        </p>

        {list.length ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {paginated.map((p, i) => (
                <ProductCard key={p.id ?? i} p={p} config={config} />
              ))}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-1.5 flex-wrap">
                <button
                  onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === 1}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                  .reduce<(number | "...")[]>((acc, n, idx, arr) => {
                    if (idx > 0 && (arr[idx - 1] as number) < n - 1) acc.push("...");
                    acc.push(n);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} className="px-1 text-muted-foreground text-xs">…</span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => { setPage(item as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                        className={`rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                          page === item
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={page === totalPages}
                  className="rounded-lg border border-border px-3.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Siguiente →
                </button>
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
