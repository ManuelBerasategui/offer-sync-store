import { useEffect, useState } from "react";

const REVIEWS = [
  {
    name: "Martina G.",
    stars: 5,
    text: "Excelente servicio, me llegó todo perfecto. Sigo trabajando con ellos.",
  },
  {
    name: "Nicolás P.",
    stars: 4.5,
    text: "Muy buena atención y precios reales de importador. Ya hice tres pedidos.",
  },
  {
    name: "Julieta R.",
    stars: 4,
    text: "Compré por mayor para revender y se vendió todo en una semana.",
  },
  {
    name: "Federico A.",
    stars: 5,
    text: "Los productos son originales y el envío llegó antes de lo previsto.",
  },
];

export function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  return (
    <div className="flex items-center gap-1.5">
      <span aria-hidden className="text-sm tracking-[2px] text-amber">
        {"★".repeat(full)}
        {value % 1 !== 0 ? "☆" : ""}
      </span>
      <span className="text-xs font-bold text-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

export function ReviewsCarousel() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % REVIEWS.length), 4500);
    return () => clearInterval(t);
  }, []);

  const r = REVIEWS[i]!;

  return (
    <div className="mx-auto mt-12 max-w-xl">
      <div className="card-soft min-h-[150px] p-6 text-left">
        <Stars value={r.stars} />
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/90">“{r.text}”</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[1px] text-muted-foreground">
          {r.name} · Cliente verificado
        </p>
      </div>
      <div className="mt-4 flex justify-center gap-2">
        {REVIEWS.map((rev, idx) => (
          <button
            key={rev.name}
            aria-label={`Ver reseña de ${rev.name}`}
            onClick={() => setI(idx)}
            className={`h-2 rounded-full transition-all ${
              idx === i ? "w-6 bg-primary" : "w-2 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Elegís tus productos",
    text: "Navegás el catálogo, ves precios por unidad y los descuentos por cantidad.",
  },
  {
    n: "02",
    title: "Comprás online",
    text: "Pagás con tarjeta, débito o dinero en cuenta a través de MercadoPago.",
  },
  {
    n: "03",
    title: "Preparamos el pedido",
    text: "Controlamos cada producto y te confirmamos el despacho el mismo día.",
  },
  {
    n: "04",
    title: "Recibís y revendés",
    text: "Enviamos a todo el país. Vos ponés tu precio y te queda el margen.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8 text-center">
          <h2 className="font-sans text-[clamp(24px,6vw,36px)] font-semibold uppercase tracking-tight">
            Cómo trabajar con nosotros
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
            Cuatro pasos simples para arrancar a revender productos importados.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="card-soft p-5">
              <span className="font-mono text-xs font-bold text-primary">{s.n}</span>
              <h3 className="mt-2 font-sans text-base font-bold normal-case tracking-normal">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
