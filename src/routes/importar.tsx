import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  Link2,
  MessageCircle,
} from "lucide-react";

import { SiteChrome } from "@/components/SiteChrome";
import { ScreenshotQuote } from "@/components/ScreenshotQuote";
import { storeQueryOptions } from "@/lib/store-query";
import { sanitizeUrl, waLink } from "@/lib/store";
import { SITE_URL } from "@/lib/constants";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/importar")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(storeQueryOptions);
  },
  head: () => ({
    meta: [
      { title: "Importar un producto de China — Te Importamos" },
      {
        name: "description",
        content:
          "Cotizá tu importación desde Alibaba puesta en Argentina: guía paso a paso para encontrar precio y peso, y cotización al instante.",
      },
      { property: "og:title", content: "Importar un producto — Te Importamos" },
      { property: "og:url", content: `${SITE_URL}/importar` },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/importar` }],
  }),
  component: ImportarPage,
});

type Screen = "metodo" | "captura" | "guia" | "link";

const GUIDE_STEPS: { title: string; text: string; art: ReactNode }[] = [
  {
    title: "Abrí el producto",
    text: "Entrá a la publicación en Alibaba. Arriba de todo ves los precios por rango de cantidad.",
    art: <GuideArtPrice />,
  },
  {
    title: "Elegí el precio de tu cantidad",
    text: "El precio cambia según cuántas unidades comprás. Tomá el del rango que corresponde a tu cantidad: ese es el precio FOB por unidad.",
    art: <GuideArtTiers />,
  },
  {
    title: "Buscá el peso",
    text: 'Bajá hasta "Packaging & delivery" (Embalaje y entrega). Ahí figura el peso bruto por unidad (Gross weight). Lo cargás en la calculadora y ella lo multiplica por la cantidad.',
    art: <GuideArtWeight />,
  },
];

function ImportarPage() {
  const { data } = useSuspenseQuery(storeQueryOptions);
  const config = data.config ?? {};

  const [screen, setScreen] = useState<Screen>("metodo");
  const [guideStep, setGuideStep] = useState(0);
  const [link, setLink] = useState("");
  const [qty, setQty] = useState("");
  const [linkError, setLinkError] = useState("");

  function goTo(next: Screen, metodo?: string) {
    if (metodo) track("import_method_selected", { metodo });
    setScreen(next);
    window.scrollTo(0, 0);
  }

  function nextGuideStep() {
    const next = guideStep + 1;
    track("import_guide_step", { paso: next + 1 });
    setGuideStep(next);
    window.scrollTo(0, 0);
  }

  function sendLink() {
    const raw = link.trim();
    let parsed: URL | null = null;
    try {
      parsed = new URL(raw);
    } catch {
      parsed = null;
    }
    if (!parsed || parsed.protocol !== "https:") {
      setLinkError("Pegá el link completo del producto (empieza con https://).");
      return;
    }
    const units = Math.max(0, Math.floor(Number(qty) || 0));
    if (!units) {
      setLinkError("Indicá cuántas unidades querés traer.");
      return;
    }
    setLinkError("");
    const msg = `Hola! Quiero cotizar la importación de este producto:\n${parsed.href}\nCantidad: ${units} unidades`;
    track("import_link_whatsapp", {
      dominio: parsed.hostname.slice(0, 60),
      cantidad: units,
    });
    const href = sanitizeUrl(waLink(config, msg));
    if (href !== "#") window.open(href, "_blank", "noopener,noreferrer");
  }

  const step = GUIDE_STEPS[guideStep];

  return (
    <SiteChrome config={config}>
      <main className="min-h-[80vh] bg-background px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-xl">
          {screen !== "metodo" && (
            <button
              type="button"
              onClick={() => {
                if (screen === "guia" && guideStep > 0) {
                  setGuideStep(guideStep - 1);
                } else {
                  setGuideStep(0);
                  setScreen("metodo");
                }
              }}
              className="mb-5 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
          )}

          {screen === "metodo" && (
            <>
              <Tag>Importar</Tag>
              <h1 className="text-[clamp(30px,9vw,44px)] leading-[0.95]">
                ¿Cómo querés <span className="text-primary">cotizar?</span>
              </h1>
              <p className="mt-3 mb-6 text-sm text-muted-foreground">
                Te damos el precio puesto en Argentina, con flete e impuestos incluidos.
              </p>

              <BigOption
                icon={<ClipboardList className="h-7 w-7" />}
                title="Ya tengo el precio y el peso"
                sub="Cargalos en la calculadora y cotizá al instante"
                to="/calculadora"
                onClick={() => track("import_method_selected", { metodo: "datos" })}
              />
              <BigOption
                icon={<HelpCircle className="h-7 w-7" />}
                title="No sé qué precio o peso poner"
                sub="Subí una captura de Alibaba y lo leemos por vos"
                onClick={() => goTo("captura", "captura")}
              />
              <BigOption
                icon={<Link2 className="h-7 w-7" />}
                title="Tengo el link de Alibaba"
                sub="Mandanos el link y te cotizamos por WhatsApp"
                onClick={() => goTo("link", "link")}
              />
            </>
          )}

          {screen === "captura" && (
            <>
              <Tag>Captura de Alibaba</Tag>
              <h2 className="text-[clamp(24px,7vw,34px)]">Subí una captura del producto</h2>
              <p className="mt-2 mb-5 text-sm text-muted-foreground">
                Sacá una captura de la publicación donde se vean los precios por cantidad (y el
                peso, si aparece). Leemos los datos y te armamos la cotización.
              </p>
              <ScreenshotQuote
                onShowGuide={() => {
                  setGuideStep(2);
                  goTo("guia", "guia_peso");
                }}
              />
              <button
                type="button"
                onClick={() => {
                  setGuideStep(0);
                  goTo("guia", "guia");
                }}
                className="mt-5 w-full text-center text-sm font-semibold text-primary"
              >
                Prefiero buscar los datos yo: ver la guía de 3 pasos
              </button>
            </>
          )}

          {screen === "guia" && step && (
            <>
              <div className="mb-4 flex gap-1.5">
                {GUIDE_STEPS.map((s, i) => (
                  <span
                    key={s.title}
                    className={`h-1.5 flex-1 rounded-full ${i <= guideStep ? "bg-primary" : "bg-border"}`}
                  />
                ))}
              </div>
              <Tag>
                Paso {guideStep + 1} de {GUIDE_STEPS.length}
              </Tag>
              <h2 className="text-[clamp(24px,7vw,34px)]">{step.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              <div className="my-5 overflow-hidden rounded-xl border border-border bg-white p-3">
                {step.art}
              </div>
              {guideStep < GUIDE_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={nextGuideStep}
                  className="btn-base grad-urgente w-full text-primary-foreground"
                >
                  Siguiente
                </button>
              ) : (
                <Link
                  to="/calculadora"
                  onClick={() => track("import_guide_completed")}
                  className="btn-base grad-urgente block w-full text-center text-primary-foreground"
                >
                  Cargar mis datos en la calculadora
                </Link>
              )}
            </>
          )}

          {screen === "link" && (
            <>
              <Tag>Link de Alibaba</Tag>
              <h2 className="text-[clamp(24px,7vw,34px)]">Pegá el link del producto</h2>
              <p className="mt-2 mb-5 text-sm text-muted-foreground">
                Te respondemos por WhatsApp con el precio puesto en Argentina.
              </p>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Link del producto
              </label>
              <input
                type="url"
                inputMode="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://www.alibaba.com/product-detail/..."
                maxLength={2000}
                className="mb-4 h-12 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary"
              />
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted-foreground">
                ¿Cuántas unidades querés traer?
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                placeholder="Ej: 300"
                className="mb-4 h-12 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-primary"
              />
              {linkError && (
                <p className="mb-3 text-sm font-medium text-destructive">{linkError}</p>
              )}
              <button
                type="button"
                onClick={sendLink}
                className="btn-base grad-urgente inline-flex w-full items-center justify-center gap-2 text-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </button>
              <button
                type="button"
                onClick={() => goTo("captura", "captura_desde_link")}
                className="mt-4 w-full text-center text-sm font-semibold text-primary"
              >
                ¿Preferís el precio ahora? Subí una captura del producto
              </button>
            </>
          )}
        </div>
      </main>
    </SiteChrome>
  );
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="mb-3 inline-block rounded-md border border-primary/20 bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-widest text-primary">
      {children}
    </span>
  );
}

function BigOption({
  icon,
  title,
  sub,
  to,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  to?: "/calculadora";
  onClick?: () => void;
}) {
  const className =
    "group mb-3 flex w-full items-center gap-4 rounded-2xl border-2 border-border bg-card p-4 text-left shadow-xs transition-all hover:border-primary active:scale-[0.99]";
  const content = (
    <>
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-black uppercase leading-tight text-foreground">
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

/* Ilustraciones de la guía: esquemas de una publicación de Alibaba (colores fijos, simulan una captura). */
const INK = "#222";
const ACCENT = "#EA5B0C";

function GuideArtPrice() {
  return (
    <svg viewBox="0 0 300 170" className="h-auto w-full" fill="none" stroke={INK} strokeWidth={2}>
      <rect x="5" y="5" width="290" height="160" />
      <rect x="15" y="18" width="110" height="110" />
      <path d="M30 110l30-35 25 25 15-15 20 25" />
      <line x1="140" y1="25" x2="280" y2="25" />
      <line x1="140" y1="40" x2="250" y2="40" />
      <rect x="138" y="60" width="145" height="40" stroke={ACCENT} strokeWidth={3} />
      <g stroke="none" fontFamily="Arial">
        <text x="146" y="78" fontSize="11" fill={INK}>
          US$ 4,50 - 5,20
        </text>
        <text x="146" y="93" fontSize="9" fill="#666">
          100 - 499 piezas
        </text>
        <text x="140" y="125" fontSize="12" fill={ACCENT} fontWeight="900">
          PRECIO FOB
        </text>
      </g>
    </svg>
  );
}

function GuideArtTiers() {
  return (
    <svg viewBox="0 0 300 150" className="h-auto w-full" fill="none" stroke={INK} strokeWidth={2}>
      <rect x="5" y="5" width="290" height="140" />
      <rect x="15" y="20" width="85" height="60" />
      <rect x="108" y="20" width="85" height="60" stroke={ACCENT} strokeWidth={3} />
      <rect x="201" y="20" width="85" height="60" />
      <g fontFamily="Arial" stroke="none" fill={INK} fontSize="10">
        <text x="24" y="42">
          2-99 pzs
        </text>
        <text x="117" y="42">
          100-499 pzs
        </text>
        <text x="210" y="42">
          500+ pzs
        </text>
        <text x="24" y="65" fontSize="13">
          US$ 5,20
        </text>
        <text x="117" y="65" fontSize="13">
          US$ 4,50
        </text>
        <text x="210" y="65" fontSize="13">
          US$ 3,90
        </text>
      </g>
      <path d="M150 85v25" />
      <path d="M143 103l7 8 7-8" />
      <text
        x="150"
        y="132"
        textAnchor="middle"
        fontSize="12"
        fill={ACCENT}
        stroke="none"
        fontFamily="Arial"
        fontWeight="900"
      >
        TU CANTIDAD = TU PRECIO
      </text>
    </svg>
  );
}

function GuideArtWeight() {
  return (
    <svg viewBox="0 0 300 160" className="h-auto w-full" fill="none" stroke={INK} strokeWidth={2}>
      <rect x="5" y="5" width="290" height="150" />
      <text
        x="15"
        y="28"
        fontSize="11"
        fill={INK}
        stroke="none"
        fontFamily="Arial"
        fontWeight="900"
      >
        PACKAGING &amp; DELIVERY
      </text>
      <line x1="15" y1="45" x2="285" y2="45" />
      <g fontFamily="Arial" stroke="none" fill="#555" fontSize="10">
        <text x="15" y="65">
          Selling units:
        </text>
        <text x="160" y="65">
          Single item
        </text>
        <text x="15" y="85">
          Package size:
        </text>
        <text x="160" y="85">
          20 x 15 x 8 cm
        </text>
      </g>
      <rect x="10" y="94" width="280" height="24" stroke={ACCENT} strokeWidth={3} />
      <g fontFamily="Arial" stroke="none" fill={INK} fontSize="10">
        <text x="15" y="110">
          Gross weight:
        </text>
        <text x="160" y="110">
          0,150 kg
        </text>
      </g>
      <text
        x="15"
        y="142"
        fontSize="11"
        fill={ACCENT}
        stroke="none"
        fontFamily="Arial"
        fontWeight="900"
      >
        PESO POR UNIDAD: 0,150 KG
      </text>
    </svg>
  );
}
