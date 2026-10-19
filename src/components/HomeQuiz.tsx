import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowLeft, ChevronRight, Package, ShoppingBag, Store } from "lucide-react";

import { track } from "@/lib/analytics";

type Perfil = "mayorista" | "minorista";

/**
 * Cuestionario de entrada de la home: en 1 o 2 toques lleva al visitante a lo que busca
 * (importar un producto, o el rubro del catálogo que le interesa) en vez del catálogo general.
 */
export function HomeQuiz({ categories, hasCombos }: { categories: string[]; hasCombos: boolean }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  function choosePerfil(p: Perfil) {
    track("home_quiz_answer", { respuesta: p });
    setPerfil(p);
  }

  if (!perfil) {
    return (
      <div className="mx-auto w-full max-w-md text-left">
        <QuizOption
          icon={<Package className="h-7 w-7" />}
          title="Importar un producto"
          sub="Cotizá tu importación desde China al instante"
          to="/importar"
          onClick={() => track("home_quiz_answer", { respuesta: "importar" })}
        />
        <QuizOption
          icon={<Store className="h-7 w-7" />}
          title="Comprar por mayor para revender"
          sub="Precios de importador por rubro"
          onClick={() => choosePerfil("mayorista")}
        />
        <QuizOption
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Comprar para mí"
          sub="Productos listos para comprar"
          onClick={() => choosePerfil("minorista")}
        />
      </div>
    );
  }

  const rubro = (r: string) => track("home_quiz_rubro", { perfil, rubro: r });
  const chip =
    "flex min-h-[52px] items-center justify-center rounded-xl border-2 border-border bg-card px-3 py-2.5 text-center text-sm font-bold text-foreground shadow-xs transition-all hover:border-primary active:scale-[0.98]";

  return (
    <div className="mx-auto w-full max-w-md text-left">
      <button
        type="button"
        onClick={() => setPerfil(null)}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>
      <p className="mb-3 text-base font-black uppercase text-foreground">¿Qué rubro te interesa?</p>
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          to="/catalogo"
          search={{ ver: "ofertas" }}
          onClick={() => rubro("ofertas")}
          className={`${chip} border-primary/40 text-primary`}
        >
          🔥 Ofertas del día
        </Link>
        {hasCombos && (
          <Link
            to="/catalogo"
            search={{ ver: "combos" }}
            onClick={() => rubro("combos")}
            className={chip}
          >
            Combos
          </Link>
        )}
        {categories.map((c) => (
          <Link
            key={c}
            to="/catalogo"
            search={{ cat: c }}
            onClick={() => rubro(c)}
            className={chip}
          >
            {c}
          </Link>
        ))}
        <Link
          to="/catalogo"
          onClick={() => rubro("todo")}
          className={`${chip} col-span-2 text-muted-foreground`}
        >
          Ver todo el catálogo
        </Link>
      </div>
    </div>
  );
}

function QuizOption({
  icon,
  title,
  sub,
  to,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  to?: "/importar";
  onClick: () => void;
}) {
  const className =
    "group mb-3 flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left shadow-sm transition-all hover:border-primary active:scale-[0.99]";
  const content = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black uppercase leading-tight text-foreground">
          {title}
        </span>
        <span className="mt-0.5 block text-[13px] text-muted-foreground">{sub}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
    </>
  );
  return to ? (
    <Link to={to} onClick={onClick} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}
