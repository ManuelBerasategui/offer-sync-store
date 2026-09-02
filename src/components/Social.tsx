import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Star, CheckCircle2, Quote } from "lucide-react";

export const REVIEWS = [
  {
    name: "Martina G.",
    location: "Rosario, Santa Fe",
    role: "Revendedora de Bazar & Mates",
    stars: 5,
    date: "Hace 3 días",
    text: "La atención de los chicos es impecable. Me mostraron fotos reales de todo el stock antes de cerrar el pedido y al otro día ya estaba despachado. Súper prolijos.",
    avatarBg: "from-orange-500 to-amber-600",
  },
  {
    name: "Nicolás P.",
    location: "Córdoba Capital",
    role: "Emprendedor Tech",
    stars: 5,
    date: "Hace 1 semana",
    text: "Compré un surtido de 10 parlantes y auriculares JBL. El margen de reventa que te queda es excelente y las cajas llegaron selladas y en perfecto estado.",
    avatarBg: "from-blue-500 to-indigo-600",
  },
  {
    name: "Julieta R.",
    location: "CABA, Buenos Aires",
    role: "Tienda de Perfumería",
    stars: 5,
    date: "Hace 2 semanas",
    text: "Excelente predisposición para asesorar y armar pedidos surtidos. Los perfumes árabes son 100% originales con todos sus sellos. Muy recomendables.",
    avatarBg: "from-emerald-500 to-teal-600",
  },
  {
    name: "Federico A.",
    location: "Mendoza",
    role: "Comprador Mayorista",
    stars: 5,
    date: "Hace 2 semanas",
    text: "Ya es la cuarta vez que les compro y siempre cumplen al pie de la letra con los tiempos. Te pasan el código de seguimiento de Correo Argentino al toque.",
    avatarBg: "from-purple-500 to-pink-600",
  },
  {
    name: "Camila V.",
    location: "Mar del Plata",
    role: "Revendedora de Indumentaria",
    stars: 5,
    date: "Hace 3 semanas",
    text: "Tenía dudas porque era mi primera compra grande y me respondieron todo con mucha paciencia. Llegó todo embalado de diez y la calidad es tremenda.",
    avatarBg: "from-rose-500 to-red-600",
  },
  {
    name: "Gonzalo M.",
    location: "San Miguel de Tucumán",
    role: "Local de Accesorios",
    stars: 5,
    date: "Hace 1 mes",
    text: "Da gusto trabajar con gente seria. Precios reales de importador, cero vueltas para coordinar y en dos días ya tenía las encomiendas en el local.",
    avatarBg: "from-amber-500 to-orange-600",
  },
];

export function Stars({ value }: { value: number }) {
  const full = Math.floor(value);
  const hasHalf = value % 1 !== 0;

  return (
    <div className="flex items-center gap-1" aria-label={`${value} estrellas de 5`}>
      <div className="flex items-center text-amber-400">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Star
            key={idx}
            className={`h-4 w-4 ${idx < full
                ? "fill-amber-400 text-amber-400"
                : idx === full && hasHalf
                  ? "fill-amber-400/50 text-amber-400"
                  : "fill-muted/30 text-muted-foreground/30"
              }`}
          />
        ))}
      </div>
      <span className="ml-1 text-xs font-bold text-foreground">{value.toFixed(1)}</span>
    </div>
  );
}

export function ReviewsCarousel() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = () => setActive((prev) => (prev + 1) % REVIEWS.length);
  const prev = () => setActive((prev) => (prev - 1 + REVIEWS.length) % REVIEWS.length);

  useEffect(() => {
    if (isPaused) return;
    timerRef.current = setInterval(next, 5000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused]);

  const current = REVIEWS[active]!;

  return (
    <div
      className="mx-auto mt-12 max-w-2xl px-2"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Tarjeta principal con animación suave y diseño glass */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-card/90 backdrop-blur-sm p-6 sm:p-8 text-left shadow-lg transition-all duration-300">
        <Quote className="absolute right-6 top-6 h-12 w-12 text-primary/10 -rotate-12 pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar circular con iniciales y gradiente */}
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${current.avatarBg} text-sm font-black text-white shadow-sm ring-2 ring-background`}
            >
              {current.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-sm sm:text-base text-foreground">{current.name}</p>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Verificado
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {current.role} · <span className="opacity-80">{current.location}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-0.5">
            <Stars value={current.stars} />
            <span className="text-[10px] text-muted-foreground">{current.date}</span>
          </div>
        </div>

        {/* Texto de la reseña */}
        <p className="mt-4 text-sm sm:text-[15px] leading-relaxed text-foreground/90 font-medium min-h-[56px] flex items-center">
          “{current.text}”
        </p>

        {/* Barra de progreso interactiva del slider */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            {REVIEWS.map((r, idx) => (
              <button
                key={r.name}
                aria-label={`Ver opinión de ${r.name}`}
                onClick={() => setActive(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${idx === active
                    ? "w-8 bg-primary shadow-xs"
                    : "w-2 bg-muted-foreground/25 hover:bg-muted-foreground/40"
                  }`}
              />
            ))}
          </div>

          {/* Flechas prev / next */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Opinión anterior"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover hover:border-primary/50 text-foreground transition-all active:scale-95"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Siguiente opinión"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover hover:border-primary/50 text-foreground transition-all active:scale-95"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
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
    text: "Pagás a través de MercadoPago (Checkout Pro) o por transferencia bancaria.",
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
